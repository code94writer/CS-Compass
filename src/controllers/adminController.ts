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

      // Check if any PDFs use this category
      const pdfs = await PDFModel.findAll(1, 0, category.name);
      if (pdfs.length > 0) {
        res.status(400).json({ 
          error: 'Cannot delete category. PDFs are using this category.' 
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
        uploaded_by: uploadedBy
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
}
