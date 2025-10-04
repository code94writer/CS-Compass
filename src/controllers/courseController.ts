// ...existing code...
import { Request, Response, NextFunction } from 'express';
import { ValidationError, validationResult } from 'express-validator';
import CourseModel from '../models/Course';
import UserCourseModel from '../models/UserCourse';
import { ResponseHelper } from '../utils/response';

import { Course } from '../types';

class CourseController {

  async createCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.validationError(res, JSON.stringify(errors.array()));
      }
      // @ts-ignore
      const user = req.user || { id: req.body.createdBy };
      const { name, description, category_id, aboutCreator, price, discount, offer, expiry } = req.body;
      if (!category_id) {
        return ResponseHelper.validationError(res, 'category_id is required');
      }
      const course: Course = {
        name,
        description,
        category_id,
        aboutCreator,
        price,
        discount,
        offer,
        expiry,
        createdBy: user.id
      };
      const created = await CourseModel.createCourse(course);
      return ResponseHelper.success(res, created, 'Course created successfully');
    } catch (err) {
      return next(err);
    }
  }

  async getCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const course = await CourseModel.getCourseById(id);
      if (!course) return ResponseHelper.notFound(res, 'Course not found');
      // Fetch PDFs and videos for this course
      const [pdfs, videos] = await Promise.all([
        (await import('../models/PDF')).PDFModel.findAll(100, 0, id),
        (await import('../models/Video')).default.findByCourseId(id)
      ]);
      return ResponseHelper.success(res, { ...course, pdfs, videos });
    } catch (err) {
      return next(err);
    }
  }

  async getAllCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const courses = await CourseModel.getAllCourses();
      // For each course, fetch PDFs and videos
      const results = await Promise.all(courses.map(async (course: any) => {
        const [pdfs, videos] = await Promise.all([
          (await import('../models/PDF')).PDFModel.findAll(100, 0, course.id),
          (await import('../models/Video')).default.findByCourseId(course.id)
        ]);
        return { ...course, pdfs, videos };
      }));
      return ResponseHelper.success(res, results);
    } catch (err) {
      return next(err);
    }
  }

  async updateCourse(req: Request, res: Response, next: NextFunction) {
    // Implement as needed
    return ResponseHelper.error(res, 'Not implemented', 501);
  }

  async deleteCourse(req: Request, res: Response, next: NextFunction) {
    // Implement as needed
    return ResponseHelper.error(res, 'Not implemented', 501);
  }

  async purchaseCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.validationError(res, JSON.stringify(errors.array()));
      }
      // @ts-ignore
      const user = req.user || { id: req.body.userId };
      const { courseId, amount, paymentId, expiryDate } = req.body;
      const purchase = await UserCourseModel.purchaseCourse(
        user.id,
        courseId,
        amount,
        paymentId,
        expiryDate
      );
      return ResponseHelper.success(res, purchase, 'Course purchased successfully');
    } catch (err) {
      return next(err);
    }
  }

  // Get all courses purchased by the user (My Courses)
  async getMyCourses(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const user = req.user || { id: req.body.userId };
      const courses = await UserCourseModel.getUserCourses(user.id);
      return ResponseHelper.success(res, courses);
    } catch (err) {
      return next(err);
    }
  }

  // Download a PDF from a course (checks access and expiry)
  async downloadCoursePDF(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const user = req.user || { id: req.body.userId };
      const { courseId, pdfId } = req.params;
      // Check if user has access to the course
      const hasAccess = await UserCourseModel.hasAccess(user.id, courseId);
      if (!hasAccess) {
        return ResponseHelper.error(res, 'No access or course expired', 403);
      }
      // Find the PDF and check if it belongs to the course
      const pdf = await (await import('../models/PDF')).PDFModel.findById(pdfId);
      if (!pdf) return ResponseHelper.notFound(res, 'PDF not found');
      if (pdf.course_id !== courseId) {
        return ResponseHelper.error(res, 'PDF not part of this course', 404);
      }
      // Read PDF file (local only for now)
      const fs = await import('fs/promises');
      const path = await import('path');
      // file_url already contains the full path (e.g., "uploads/local/filename.pdf")
      const filePath = path.resolve(pdf.file_url);
      let pdfBuffer;
      try {
        pdfBuffer = await fs.readFile(filePath);
      } catch (e) {
        return ResponseHelper.error(res, 'PDF file not found', 404);
      }
      // Watermark with user mobile (if available)
      let mobile = user.mobile || 'User';
      if (!mobile && user.id) {
        // Try to get user mobile from DB
        const { UserModel } = await import('../models/User');
        const dbUser = await UserModel.findById(user.id);
        if (dbUser) mobile = dbUser.mobile;
      }
      const PDFWatermarkService = (await import('../services/pdfWatermark')).default;
      const watermarked = await PDFWatermarkService.addWatermark(pdfBuffer, mobile);

      // Set proper headers for binary PDF data
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdf.title}.pdf"`);
      res.setHeader('Content-Length', watermarked.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Use res.end() for binary data instead of res.send()
      return res.end(watermarked, 'binary');
    } catch (err) {
      return next(err);
    }
  }
}
  export const courseController = new CourseController();

