// ...existing code...
import { Request, Response, NextFunction } from 'express';
import { ValidationError, validationResult } from 'express-validator';
import CourseModel from '../models/Course';
import UserCourseModel from '../models/UserCourse';
import { ResponseHelper } from '../utils/response';
import pool from '../config/database';

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
    try {
      const { id } = req.params;

      // Get course to check if it has a thumbnail
      const course = await CourseModel.getCourseById(id);
      if (!course) return ResponseHelper.notFound(res, 'Course not found');

      // Delete thumbnail file if exists
      if (course.thumbnail_url) {
        const imageProcessor = (await import('../services/imageProcessor')).default;
        const path = await import('path');
        const thumbnailPath = path.resolve(course.thumbnail_url);
        await imageProcessor.deleteImage(thumbnailPath);
      }

      // Delete all PDFs and their thumbnails associated with this course
      const { PDFModel } = await import('../models/PDF');
      const pdfs = await PDFModel.findAll(1000, 0, id);

      const fs = await import('fs/promises');
      const path = await import('path');

      for (const pdf of pdfs) {
        // Delete PDF file
        try {
          const pdfFilePath = path.resolve(pdf.file_url);
          await fs.unlink(pdfFilePath);
        } catch (e) {
          console.warn(`Failed to delete PDF file: ${e}`);
        }

        // Delete PDF thumbnail
        if (pdf.thumbnail_url) {
          try {
            const thumbnailPath = path.resolve(pdf.thumbnail_url);
            await fs.unlink(thumbnailPath);
          } catch (e) {
            console.warn(`Failed to delete PDF thumbnail: ${e}`);
          }
        }

        // Delete PDF from database
        await PDFModel.delete(pdf.id);
      }

      // Delete all videos associated with this course
      const VideoModel = (await import('../models/Video')).default;
      const videos = await VideoModel.findByCourseId(id);

      for (const video of videos) {
        await VideoModel.delete(video.id);
      }

      // Delete course from database
      await pool.query('DELETE FROM courses WHERE id = $1', [id]);

      return ResponseHelper.success(res, {
        message: 'Course and all associated content deleted successfully',
        courseId: id
      });
    } catch (err) {
      return next(err);
    }
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

      // Find the PDF and check if it belongs to the course
      const pdf = await (await import('../models/PDF')).PDFModel.findById(pdfId);
      if (!pdf) return ResponseHelper.notFound(res, 'PDF not found');
      if (pdf.course_id !== courseId) {
        return ResponseHelper.error(res, 'PDF not part of this course', 404);
      }

      // Check PDF type and access control
      // Demo PDFs can be accessed without purchase, full PDFs require course access
      if (pdf.pdf_type === 'full') {
        // For full PDFs, check if user has access to the course
        const hasAccess = await UserCourseModel.hasAccess(user.id, courseId);
        if (!hasAccess) {
          return ResponseHelper.error(res, 'No access or course expired. Purchase the course to access full PDFs.', 403);
        }
      }
      // If pdf_type is 'demo', allow access without purchase check
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

      // Send buffer directly without encoding to prevent corruption
      return res.end(watermarked);
    } catch (err) {
      return next(err);
    }
  }

  // Serve thumbnail image for a PDF (public access)
  async serveThumbnail(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId, pdfId } = req.params;

      // Verify course exists
      const course = await CourseModel.getCourseById(courseId);
      if (!course) return ResponseHelper.notFound(res, 'Course not found');

      // Find the PDF and check if it belongs to the course
      const pdf = await (await import('../models/PDF')).PDFModel.findById(pdfId);
      if (!pdf) return ResponseHelper.notFound(res, 'PDF not found');
      if (pdf.course_id !== courseId) {
        return ResponseHelper.error(res, 'PDF not part of this course', 404);
      }

      // Check if thumbnail exists
      if (!pdf.thumbnail_url) {
        return ResponseHelper.error(res, 'Thumbnail not available', 404);
      }

      // Read thumbnail file
      const fs = await import('fs/promises');
      const path = await import('path');
      const thumbnailPath = path.resolve(pdf.thumbnail_url);

      let thumbnailBuffer;
      try {
        thumbnailBuffer = await fs.readFile(thumbnailPath);
      } catch (e) {
        return ResponseHelper.error(res, 'Thumbnail file not found', 404);
      }

      // Set proper headers for image
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', thumbnailBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

      return res.end(thumbnailBuffer);
    } catch (err) {
      return next(err);
    }
  }

  // Serve demo/preview PDF (accessible without purchase)
  async servePreviewPDF(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId, pdfId } = req.params;

      // Verify course exists
      const course = await CourseModel.getCourseById(courseId);
      if (!course) return ResponseHelper.notFound(res, 'Course not found');

      // Find the PDF and check if it belongs to the course
      const pdf = await (await import('../models/PDF')).PDFModel.findById(pdfId);
      if (!pdf) return ResponseHelper.notFound(res, 'PDF not found');
      if (pdf.course_id !== courseId) {
        return ResponseHelper.error(res, 'PDF not part of this course', 404);
      }

      // Check if this is a demo PDF
      if (pdf.pdf_type !== 'demo') {
        return ResponseHelper.error(res, 'This PDF is not available for preview. Purchase the course to access.', 403);
      }

      // Read PDF file
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.resolve(pdf.file_url);

      let pdfBuffer;
      try {
        pdfBuffer = await fs.readFile(filePath);
      } catch (e) {
        return ResponseHelper.error(res, 'PDF file not found', 404);
      }

      // Set proper headers for PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${pdf.title}-preview.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

      return res.end(pdfBuffer);
    } catch (err) {
      return next(err);
    }
  }

  // Serve course thumbnail image
  async serveCourseThumbnail(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId } = req.params;

      // Verify course exists
      const course = await CourseModel.getCourseById(courseId);
      if (!course) return ResponseHelper.notFound(res, 'Course not found');

      if (!course.thumbnail_url) {
        return ResponseHelper.notFound(res, 'Course has no thumbnail');
      }

      // Read and serve thumbnail
      const fs = await import('fs/promises');
      const path = await import('path');
      const thumbnailPath = path.resolve(course.thumbnail_url);

      let thumbnailBuffer;
      try {
        thumbnailBuffer = await fs.readFile(thumbnailPath);
      } catch (e) {
        return ResponseHelper.error(res, 'Thumbnail file not found', 404);
      }

      // Set proper headers for image
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Length', thumbnailBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

      return res.end(thumbnailBuffer);
    } catch (err) {
      return next(err);
    }
  }
}
  export const courseController = new CourseController();

