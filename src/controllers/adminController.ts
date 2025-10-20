import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PDFModel } from '../models/PDF';
import { CategoryModel } from '../models/Category';
import { UserModel } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import pool from '../config/database';
import CourseModel from '../models/Course';
import VideoModel from '../models/Video';
import path from 'path';
import { generateThumbnail } from '../services/pdfThumbnail';
import { ensureLocalFolders } from '../services/pdfLocal';

export class AdminController {
  // Get all PDFs for admin management
  static async getAllPDFs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, category, status } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = 'SELECT * FROM pdfs';
      const values: any[] = [];
      let paramCount = 0;

      const conditions = [];
      
      if (category) {
        paramCount++;
        conditions.push(`category = $${paramCount}`);
        values.push(category);
      }

      if (status) {
        paramCount++;
        conditions.push(`is_active = $${paramCount}`);
        values.push(status === 'active');
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      values.push(Number(limit), offset);

      const result = await pool.query(query, values);
      const pdfs = result.rows;

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM pdfs';
      if (conditions.length > 0) {
        countQuery += ' WHERE ' + conditions.join(' AND ');
      }
      const countResult = await pool.query(countQuery, values.slice(0, -2));
      const total = parseInt(countResult.rows[0].count);

      res.json({
        pdfs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Get admin PDFs error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get all users
  static async getAllUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, role } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = 'SELECT id, email, mobile, is_verified, role, created_at FROM users';
      const values: any[] = [];
      let paramCount = 0;

      if (role) {
        paramCount++;
        query += ` WHERE role = $${paramCount}`;
        values.push(role);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      values.push(Number(limit), offset);

      const result = await pool.query(query, values);
      const users = result.rows;

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM users';
      if (role) {
        countQuery += ' WHERE role = $1';
      }
      const countResult = await pool.query(countQuery, role ? [role] : []);
      const total = parseInt(countResult.rows[0].count);

      res.json({
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Get admin users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }



  // Create category
  static async createCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

  const { name, description, parent_id } = req.body;

      // Check if category already exists
      const existingCategory = await CategoryModel.findByName(name);
      if (existingCategory) {
        res.status(400).json({ error: 'Category already exists' });
        return;
      }

  const category = await CategoryModel.create({ name, description, parent_id });

      res.status(201).json({
        message: 'Category created successfully',
        category,
      });
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update category
  static async updateCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
  const { id } = req.params;
  const { name, description, parent_id } = req.body;

      const category = await CategoryModel.findById(id);
      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

  const updatedCategory = await CategoryModel.update(id, { name, description, parent_id });

      res.json({
        message: 'Category updated successfully',
        category: updatedCategory,
      });
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete category
  static async deleteCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const category = await CategoryModel.findById(id);
      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      // Check if any courses use this category
      const coursesQuery = await pool.query(
        'SELECT COUNT(*) FROM courses WHERE category_id = $1',
        [id]
      );
      const courseCount = parseInt(coursesQuery.rows[0].count);

      if (courseCount > 0) {
        res.status(400).json({
          error: `Cannot delete category. ${courseCount} course(s) are using this category.`
        });
        return;
      }

      // Also check if this category has child categories
      const childCategoriesQuery = await pool.query(
        'SELECT COUNT(*) FROM categories WHERE parent_id = $1',
        [id]
      );
      const childCount = parseInt(childCategoriesQuery.rows[0].count);

      if (childCount > 0) {
        res.status(400).json({
          error: `Cannot delete category. ${childCount} child categor${childCount === 1 ? 'y' : 'ies'} exist under this category.`
        });
        return;
      }

      await CategoryModel.delete(id);

      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get dashboard statistics
  static async getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Get total users
      const usersResult = await pool.query('SELECT COUNT(*) FROM users');
      const totalUsers = parseInt(usersResult.rows[0].count);

      // Get total PDFs
      const pdfsResult = await pool.query('SELECT COUNT(*) FROM pdfs');
      const totalPDFs = parseInt(pdfsResult.rows[0].count);

      // Get total courses
      const coursesResult = await pool.query('SELECT COUNT(*) FROM courses');
      const totalCourses = parseInt(coursesResult.rows[0].count);

      // Get total revenue from course purchases
      const revenueResult = await pool.query(`
        SELECT SUM(amount) as total_revenue
        FROM user_courses
        WHERE status = 'completed'
      `);
      const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue || 0);

      // Get recent course purchases
      const recentPurchases = await pool.query(`
        SELECT uc.*, u.email as user_email, c.name as course_name
        FROM user_courses uc
        JOIN users u ON uc.user_id = u.id
        JOIN courses c ON uc.course_id = c.id
        ORDER BY uc.created_at DESC
        LIMIT 5
      `);

      // Get monthly revenue (last 6 months)
      const monthlyRevenue = await pool.query(`
        SELECT
          DATE_TRUNC('month', created_at) as month,
          SUM(amount) as revenue
        FROM user_courses
        WHERE status = 'completed'
        AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
      `);

      res.json({
        stats: {
          totalUsers,
          totalPDFs,
          totalCourses,
          totalRevenue,
        },
        recentPurchases: recentPurchases.rows,
        monthlyRevenue: monthlyRevenue.rows,
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Create course (admin only)
  static async createCourse(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { name, description, category_id, aboutCreator, price, discount, offer, expiry } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const course = await CourseModel.createCourse({
        name,
        description,
        category_id,
        aboutCreator,
        price,
        discount,
        offer,
        expiry,
        createdBy: userId
      });

      res.status(201).json({
        message: 'Course created successfully',
        course,
      });
    } catch (error) {
      console.error('Create course error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update course (admin only)
  static async updateCourse(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const course = await CourseModel.getCourseById(id);
      if (!course) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }

      const updatedCourse = await CourseModel.updateCourse(id, updates);

      res.json({
        message: 'Course updated successfully',
        course: updatedCourse,
      });
    } catch (error) {
      console.error('Update course error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Deactivate course (admin only)
  static async deactivateCourse(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const course = await CourseModel.getCourseById(id);
      if (!course) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }

      if (course.is_active === false) {
        res.status(400).json({ error: 'Course is already deactivated' });
        return;
      }

      const deactivatedCourse = await CourseModel.deactivateCourse(id);

      res.json({
        message: 'Course deactivated successfully. It is now hidden from public listings.',
        course: deactivatedCourse,
      });
    } catch (error) {
      console.error('Deactivate course error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Reactivate course (admin only)
  static async reactivateCourse(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const course = await CourseModel.getCourseById(id);
      if (!course) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }

      if (course.is_active === true) {
        res.status(400).json({ error: 'Course is already active' });
        return;
      }

      const reactivatedCourse = await CourseModel.reactivateCourse(id);

      res.json({
        message: 'Course reactivated successfully. It is now visible in public listings.',
        course: reactivatedCourse,
      });
    } catch (error) {
      console.error('Reactivate course error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Upload PDF to course (admin only)
  static async uploadCoursePDF(req: AuthRequest, res: Response): Promise<void> {
    try {
      ensureLocalFolders();

      if (!req.file) {
        res.status(400).json({ error: 'No PDF file uploaded' });
        return;
      }

      const { courseId } = req.params;

      // Verify course exists
      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }

      const file = req.file;
      const pdfPath = file.path;
      const fileName = path.basename(pdfPath);
      const fileSize = file.size;
      const uploadedBy = req.user?.id || 'unknown';

      // Generate thumbnail
      const thumbName = fileName.replace(/\.pdf$/i, '');
      const thumbnailRelPath = await generateThumbnail(pdfPath, thumbName);

      // Save to DB
      const pdfData = {
        title: req.body.title || fileName,
        description: req.body.description || '',
        course_id: courseId,
        file_url: `uploads/local/${fileName}`,
        thumbnail_url: thumbnailRelPath,
        file_size: fileSize,
        is_active: true,
        uploaded_by: uploadedBy,
        pdf_type: (req.body.pdf_type === 'demo' ? 'demo' : 'full') as 'demo' | 'full'
      };

      const pdf = await PDFModel.create(pdfData);

      res.status(201).json({
        message: 'PDF uploaded successfully',
        pdf,
      });
    } catch (error) {
      console.error('Upload course PDF error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Add video to course (admin only)
  static async addCourseVideo(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { courseId } = req.params;
      const { title, video_url, description } = req.body;

      // Verify course exists
      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }

      const video = await VideoModel.create({
        course_id: courseId,
        title,
        video_url,
        description,
        is_active: true
      });

      res.status(201).json({
        message: 'Video added successfully',
        video,
      });
    } catch (error) {
      console.error('Add course video error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update video in course (admin only)
  static async updateCourseVideo(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { courseId, videoId } = req.params;
      const updates = req.body;

      // Verify course exists
      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }

      // Verify video exists and belongs to course
      const video = await VideoModel.findById(videoId);
      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      if (video.course_id !== courseId) {
        res.status(400).json({ error: 'Video does not belong to this course' });
        return;
      }

      const updatedVideo = await VideoModel.update(videoId, updates);

      res.json({
        message: 'Video updated successfully',
        video: updatedVideo,
      });
    } catch (error) {
      console.error('Update course video error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get all purchases for a course (admin only)
  static async getCoursePurchases(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;

      // Verify course exists
      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }

      // Get all purchases for this course
      const query = `
        SELECT
          uc.*,
          u.email as user_email,
          u.mobile as user_mobile,
          u.id as user_id
        FROM user_courses uc
        JOIN users u ON uc.user_id = u.id
        WHERE uc.course_id = $1
        ORDER BY uc.created_at DESC
      `;

      const result = await pool.query(query, [courseId]);

      res.json({
        message: 'Course purchases retrieved successfully',
        course: {
          id: course.id,
          name: course.name
        },
        purchases: result.rows,
        total: result.rows.length
      });
    } catch (error) {
      console.error('Get course purchases error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update PDF metadata (admin only)
  static async updateCoursePDF(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { courseId, pdfId } = req.params;
      const { title, description, pdf_type } = req.body;

      // Verify course exists
      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }

      // Verify PDF exists and belongs to the course
      const pdf = await PDFModel.findById(pdfId);
      if (!pdf) {
        res.status(404).json({ error: 'PDF not found' });
        return;
      }

      if (pdf.course_id !== courseId) {
        res.status(400).json({ error: 'PDF does not belong to this course' });
        return;
      }

      // Prepare update data
      const updateData: Partial<{ title: string; description: string; pdf_type: 'demo' | 'full' }> = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (pdf_type !== undefined && (pdf_type === 'demo' || pdf_type === 'full')) {
        updateData.pdf_type = pdf_type;
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({ error: 'No valid fields to update' });
        return;
      }

      // Update PDF
      const updatedPdf = await PDFModel.update(pdfId, updateData);

      res.json({
        message: 'PDF updated successfully',
        pdf: updatedPdf,
      });
    } catch (error) {
      console.error('Update course PDF error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete PDF (admin only)
  static async deleteCoursePDF(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { courseId, pdfId } = req.params;

      // Verify course exists
      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }

      // Verify PDF exists and belongs to the course
      const pdf = await PDFModel.findById(pdfId);
      if (!pdf) {
        res.status(404).json({ error: 'PDF not found' });
        return;
      }

      if (pdf.course_id !== courseId) {
        res.status(400).json({ error: 'PDF does not belong to this course' });
        return;
      }

      // Delete physical files
      const fs = await import('fs/promises');
      const pathModule = await import('path');

      try {
        // Delete PDF file
        const pdfFilePath = pathModule.resolve(pdf.file_url);
        await fs.unlink(pdfFilePath);
      } catch (fileError) {
        console.warn('Failed to delete PDF file:', fileError);
        // Continue even if file deletion fails
      }

      try {
        // Delete thumbnail file
        if (pdf.thumbnail_url) {
          const thumbnailPath = pathModule.resolve(pdf.thumbnail_url);
          await fs.unlink(thumbnailPath);
        }
      } catch (thumbError) {
        console.warn('Failed to delete thumbnail file:', thumbError);
        // Continue even if thumbnail deletion fails
      }

      // Delete from database
      const deleted = await PDFModel.delete(pdfId);

      if (!deleted) {
        res.status(500).json({ error: 'Failed to delete PDF from database' });
        return;
      }

      res.json({
        message: 'PDF and associated files deleted successfully',
        pdfId: pdfId,
      });
    } catch (error) {
      console.error('Delete course PDF error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Upload or update course thumbnail
   * POST /api/admin/courses/:courseId/thumbnail
   */
  static async uploadCourseThumbnail(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;

      // Verify course exists
      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }

      // Check if file was uploaded
      if (!req.file) {
        res.status(400).json({ error: 'No image file uploaded' });
        return;
      }

      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        res.status(400).json({
          error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed'
        });
        return;
      }

      // Import image processor
      const imageProcessor = (await import('../services/imageProcessor')).default;

      // Validate image
      const isValid = await imageProcessor.isValidImage(req.file.buffer);
      if (!isValid) {
        res.status(400).json({ error: 'Invalid image file' });
        return;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomNum = Math.floor(Math.random() * 1000000000);
      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `${timestamp}-${randomNum}-course-thumbnail${ext}`;
      const thumbnailPath = path.join('uploads', 'course-thumbnails', filename);

      // Process and save image
      await imageProcessor.processAndSaveImage(
        req.file.buffer,
        thumbnailPath,
        {
          maxWidth: 800,
          maxHeight: 600,
          quality: 85,
          format: 'jpeg'
        }
      );

      // Delete old thumbnail if exists
      if (course.thumbnail_url) {
        const oldThumbnailPath = path.resolve(course.thumbnail_url);
        await imageProcessor.deleteImage(oldThumbnailPath);
      }

      // Update course with new thumbnail URL
      const updatedCourse = await CourseModel.updateCourse(courseId, {
        thumbnail_url: thumbnailPath
      });

      res.status(200).json({
        message: 'Course thumbnail uploaded successfully',
        course: updatedCourse
      });
    } catch (error) {
      console.error('Upload course thumbnail error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Delete course thumbnail
   * DELETE /api/admin/courses/:courseId/thumbnail
   */
  static async deleteCourseThumbnail(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;

      // Verify course exists
      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }

      if (!course.thumbnail_url) {
        res.status(404).json({ error: 'Course has no thumbnail' });
        return;
      }

      // Delete thumbnail file
      const imageProcessor = (await import('../services/imageProcessor')).default;
      const thumbnailPath = path.resolve(course.thumbnail_url);
      await imageProcessor.deleteImage(thumbnailPath);

      // Update course to remove thumbnail URL
      await CourseModel.updateCourse(courseId, {
        thumbnail_url: null as any
      });

      res.status(200).json({
        message: 'Course thumbnail deleted successfully',
        courseId
      });
    } catch (error) {
      console.error('Delete course thumbnail error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get platform statistics
   * GET /api/admin/statistics
   * Returns count of active courses, active users, non-active users, and total revenue
   */
  static async getStatistics(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Get count of active courses
      const activeCoursesResult = await pool.query(
        'SELECT COUNT(*) FROM courses WHERE is_active = true'
      );
      const activeCourses = parseInt(activeCoursesResult.rows[0].count);

      // Get count of active users (verified users)
      const activeUsersResult = await pool.query(
        'SELECT COUNT(*) FROM users WHERE is_verified = true'
      );
      const activeUsers = parseInt(activeUsersResult.rows[0].count);

      // Get count of non-active users (unverified users)
      const nonActiveCourseResult = await pool.query(
        'SELECT COUNT(*) FROM courses WHERE is_active = false'
      );
      const nonActiveCourses = parseInt(nonActiveCourseResult.rows[0].count);

      // Get total revenue (sum of all completed course purchases)
      const totalRevenueResult = await pool.query(`
        SELECT COALESCE(SUM(amount), 0) as total_revenue
        FROM user_courses
        WHERE status = 'completed'
      `);
      const totalRevenue = parseFloat(totalRevenueResult.rows[0].total_revenue);

      res.status(200).json({
        success: true,
        data: {
          activeCourses,
          activeUsers,
          nonActiveCourses,
          totalRevenue,
        },
        message: 'Statistics retrieved successfully',
      });
    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get comprehensive deep analytics
   * GET /api/admin/analytics/deep
   * Returns detailed analytics across all platform metrics
   */
  static async getDeepAnalytics(req: AuthRequest, res: Response): Promise<void> {
    try {
      // ============ COURSE METRICS ============
      const courseMetrics = await pool.query(`
        SELECT
          COUNT(*) as total_courses,
          COUNT(*) FILTER (WHERE is_active = true) as active_courses,
          COUNT(*) FILTER (WHERE is_active = false) as inactive_courses,
          COUNT(DISTINCT id) FILTER (WHERE id IN (
            SELECT DISTINCT course_id FROM user_courses WHERE status = 'completed'
          )) as courses_with_purchases,
          COALESCE(AVG(price), 0) as average_course_price
        FROM courses
      `);
      const coursesWithoutPurchases = 
        parseInt(courseMetrics.rows[0].total_courses) - 
        parseInt(courseMetrics.rows[0].courses_with_purchases);

      // Get most popular course
      const mostPopularCourseResult = await pool.query(`
        SELECT c.id, c.name, COUNT(uc.id) as purchase_count
        FROM courses c
        LEFT JOIN user_courses uc ON c.id = uc.course_id AND uc.status = 'completed'
        GROUP BY c.id, c.name
        ORDER BY purchase_count DESC
        LIMIT 1
      `);
      const mostPopularCourse = mostPopularCourseResult.rows[0] || null;

      // Average sales per course
      const avgSalesResult = await pool.query(`
        SELECT COALESCE(AVG(purchase_count), 0) as avg_sales
        FROM (
          SELECT course_id, COUNT(*) as purchase_count
          FROM user_courses
          WHERE status = 'completed'
          GROUP BY course_id
        ) as course_sales
      `);

      // ============ USER METRICS ============
      const userMetrics = await pool.query(`
        SELECT
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE is_verified = true) as verified_users,
          COUNT(*) FILTER (WHERE is_verified = false) as unverified_users,
          COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
          COUNT(*) FILTER (WHERE role = 'student') as student_users
        FROM users
      `);

      const usersWithPurchasesResult = await pool.query(`
        SELECT COUNT(DISTINCT user_id) as users_with_purchases
        FROM user_courses
        WHERE status = 'completed'
      `);

      // ============ CONTENT METRICS ============
      const contentMetrics = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM pdfs) as total_pdfs,
          (SELECT COUNT(*) FROM pdfs WHERE is_active = true) as active_pdfs,
          (SELECT COUNT(*) FROM pdfs WHERE pdf_type = 'demo') as demo_pdfs,
          (SELECT COUNT(*) FROM pdfs WHERE pdf_type = 'full') as full_pdfs,
          (SELECT COUNT(*) FROM videos) as total_videos,
          (SELECT COUNT(*) FROM videos WHERE is_active = true) as active_videos
      `);

      // Content quality metrics
      const contentQualityMetrics = await pool.query(`
        SELECT
          COUNT(DISTINCT c.id) FILTER (WHERE c.id IN (SELECT DISTINCT course_id FROM pdfs)) as courses_with_pdfs,
          COUNT(DISTINCT c.id) FILTER (WHERE c.id IN (SELECT DISTINCT course_id FROM videos)) as courses_with_videos,
          COUNT(DISTINCT c.id) FILTER (WHERE 
            c.id IN (SELECT DISTINCT course_id FROM pdfs) AND 
            c.id IN (SELECT DISTINCT course_id FROM videos)
          ) as courses_with_both
        FROM courses c
      `);

      const avgContentPerCourse = await pool.query(`
        SELECT
          COALESCE(AVG(pdf_count), 0) as avg_pdfs_per_course,
          COALESCE(AVG(video_count), 0) as avg_videos_per_course
        FROM (
          SELECT
            c.id,
            (SELECT COUNT(*) FROM pdfs WHERE course_id = c.id) as pdf_count,
            (SELECT COUNT(*) FROM videos WHERE course_id = c.id) as video_count
          FROM courses c
        ) as content_counts
      `);

      // ============ REVENUE METRICS ============
      const revenueMetrics = await pool.query(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as total_revenue,
          COALESCE(SUM(amount) FILTER (WHERE status = 'refunded'), 0) as total_refunds,
          COALESCE(AVG(amount) FILTER (WHERE status = 'completed'), 0) as average_order_value,
          COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND created_at >= CURRENT_DATE), 0) as revenue_today,
          COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND created_at >= DATE_TRUNC('week', CURRENT_DATE)), 0) as revenue_this_week,
          COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) as revenue_this_month
        FROM user_courses
      `);

      const netRevenue = 
        parseFloat(revenueMetrics.rows[0].total_revenue) - 
        parseFloat(revenueMetrics.rows[0].total_refunds);

      // ============ TRANSACTION METRICS ============
      const transactionMetrics = await pool.query(`
        SELECT
          COUNT(*) as total_transactions,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_transactions,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_transactions,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_transactions,
          COUNT(*) FILTER (WHERE status = 'refunded') as refunded_transactions
        FROM user_courses
      `);

      const totalTxn = parseInt(transactionMetrics.rows[0].total_transactions);
      const completedTxn = parseInt(transactionMetrics.rows[0].completed_transactions);
      const successRate = totalTxn > 0 ? ((completedTxn / totalTxn) * 100).toFixed(2) : 0;

      // Purchases today
      const purchasesTodayResult = await pool.query(`
        SELECT COUNT(*) as purchases_today
        FROM user_courses
        WHERE status = 'completed' AND created_at >= CURRENT_DATE
      `);

      // ============ PAYMENT GATEWAY METRICS ============
      const paymentModeMetrics = await pool.query(`
        SELECT
          payment_mode,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount
        FROM payment_transactions
        WHERE status = 'success'
        GROUP BY payment_mode
        ORDER BY count DESC
      `);

      // ============ USER GROWTH METRICS ============
      const userGrowthMetrics = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as new_users_today,
          COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)) as new_users_this_week,
          COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as new_users_this_month
        FROM users
      `);

      // ============ CATEGORY METRICS ============
      const categoryMetrics = await pool.query(`
        SELECT
          COUNT(*) as total_categories,
          COUNT(*) FILTER (WHERE parent_id IS NULL) as top_level_categories,
          COUNT(*) FILTER (WHERE parent_id IS NOT NULL) as sub_categories,
          COUNT(DISTINCT id) FILTER (WHERE id IN (
            SELECT DISTINCT category_id FROM courses
          )) as categories_with_courses
        FROM categories
      `);

      // ============ COMPILE RESPONSE ============
      res.status(200).json({
        success: true,
        data: {
          courses: {
            totalCourses: parseInt(courseMetrics.rows[0].total_courses),
            activeCourses: parseInt(courseMetrics.rows[0].active_courses),
            inactiveCourses: parseInt(courseMetrics.rows[0].inactive_courses),
            coursesWithPurchases: parseInt(courseMetrics.rows[0].courses_with_purchases),
            coursesWithoutPurchases,
            averageCoursePrice: parseFloat(courseMetrics.rows[0].average_course_price).toFixed(2),
            averageSalesPerCourse: parseFloat(avgSalesResult.rows[0].avg_sales).toFixed(2),
            mostPopularCourse: mostPopularCourse ? {
              id: mostPopularCourse.id,
              name: mostPopularCourse.name,
              purchaseCount: parseInt(mostPopularCourse.purchase_count)
            } : null
          },
          users: {
            totalUsers: parseInt(userMetrics.rows[0].total_users),
            verifiedUsers: parseInt(userMetrics.rows[0].verified_users),
            unverifiedUsers: parseInt(userMetrics.rows[0].unverified_users),
            adminUsers: parseInt(userMetrics.rows[0].admin_users),
            studentUsers: parseInt(userMetrics.rows[0].student_users),
            usersWithPurchases: parseInt(usersWithPurchasesResult.rows[0].users_with_purchases)
          },
          userGrowth: {
            newUsersToday: parseInt(userGrowthMetrics.rows[0].new_users_today),
            newUsersThisWeek: parseInt(userGrowthMetrics.rows[0].new_users_this_week),
            newUsersThisMonth: parseInt(userGrowthMetrics.rows[0].new_users_this_month)
          },
          content: {
            totalPDFs: parseInt(contentMetrics.rows[0].total_pdfs),
            activePDFs: parseInt(contentMetrics.rows[0].active_pdfs),
            demoPDFs: parseInt(contentMetrics.rows[0].demo_pdfs),
            fullPDFs: parseInt(contentMetrics.rows[0].full_pdfs),
            totalVideos: parseInt(contentMetrics.rows[0].total_videos),
            activeVideos: parseInt(contentMetrics.rows[0].active_videos)
          },
          contentQuality: {
            coursesWithPDFs: parseInt(contentQualityMetrics.rows[0].courses_with_pdfs),
            coursesWithVideos: parseInt(contentQualityMetrics.rows[0].courses_with_videos),
            coursesWithBoth: parseInt(contentQualityMetrics.rows[0].courses_with_both),
            averagePDFsPerCourse: parseFloat(avgContentPerCourse.rows[0].avg_pdfs_per_course).toFixed(2),
            averageVideosPerCourse: parseFloat(avgContentPerCourse.rows[0].avg_videos_per_course).toFixed(2)
          },
          revenue: {
            totalRevenue: parseFloat(revenueMetrics.rows[0].total_revenue).toFixed(2),
            totalRefunds: parseFloat(revenueMetrics.rows[0].total_refunds).toFixed(2),
            netRevenue: netRevenue.toFixed(2),
            averageOrderValue: parseFloat(revenueMetrics.rows[0].average_order_value).toFixed(2),
            revenueToday: parseFloat(revenueMetrics.rows[0].revenue_today).toFixed(2),
            revenueThisWeek: parseFloat(revenueMetrics.rows[0].revenue_this_week).toFixed(2),
            revenueThisMonth: parseFloat(revenueMetrics.rows[0].revenue_this_month).toFixed(2)
          },
          transactions: {
            totalTransactions: parseInt(transactionMetrics.rows[0].total_transactions),
            completedTransactions: parseInt(transactionMetrics.rows[0].completed_transactions),
            pendingTransactions: parseInt(transactionMetrics.rows[0].pending_transactions),
            failedTransactions: parseInt(transactionMetrics.rows[0].failed_transactions),
            refundedTransactions: parseInt(transactionMetrics.rows[0].refunded_transactions),
            successRate: parseFloat(successRate as string),
            purchasesToday: parseInt(purchasesTodayResult.rows[0].purchases_today)
          },
          paymentModes: paymentModeMetrics.rows.map(row => ({
            mode: row.payment_mode || 'Unknown',
            count: parseInt(row.count),
            totalAmount: parseFloat(row.total_amount).toFixed(2)
          })),
          categories: {
            totalCategories: parseInt(categoryMetrics.rows[0].total_categories),
            topLevelCategories: parseInt(categoryMetrics.rows[0].top_level_categories),
            subCategories: parseInt(categoryMetrics.rows[0].sub_categories),
            categoriesWithCourses: parseInt(categoryMetrics.rows[0].categories_with_courses)
          }
        },
        message: 'Deep analytics retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get deep analytics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
