import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PDFModel } from '../models/PDF';
import { CategoryModel } from '../models/Category';
import { UserModel } from '../models/User';
import { PurchaseModel } from '../models/Purchase';
import { AuthRequest } from '../middleware/auth';
import pool from '../config/database';

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

  // Get all purchases
  static async getAllPurchases(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = `
        SELECT p.*, u.email as user_email, u.mobile as user_mobile, 
               pdf.title as pdf_title, pdf.price as pdf_price
        FROM purchases p
        JOIN users u ON p.user_id = u.id
        JOIN pdfs pdf ON p.pdf_id = pdf.id
      `;
      const values: any[] = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        query += ` WHERE p.status = $${paramCount}`;
        values.push(status);
      }

      query += ` ORDER BY p.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      values.push(Number(limit), offset);

      const result = await pool.query(query, values);
      const purchases = result.rows;

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM purchases p';
      if (status) {
        countQuery += ' WHERE p.status = $1';
      }
      const countResult = await pool.query(countQuery, status ? [status] : []);
      const total = parseInt(countResult.rows[0].count);

      res.json({
        purchases,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Get admin purchases error:', error);
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

      // Get total revenue
      const revenueResult = await pool.query(`
        SELECT SUM(amount) as total_revenue 
        FROM purchases 
        WHERE status = 'completed'
      `);
      const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue || 0);

      // Get recent purchases
      const recentPurchases = await pool.query(`
        SELECT p.*, u.email as user_email, pdf.title as pdf_title
        FROM purchases p
        JOIN users u ON p.user_id = u.id
        JOIN pdfs pdf ON p.pdf_id = pdf.id
        ORDER BY p.created_at DESC
        LIMIT 5
      `);

      // Get monthly revenue (last 6 months)
      const monthlyRevenue = await pool.query(`
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          SUM(amount) as revenue
        FROM purchases 
        WHERE status = 'completed' 
        AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
      `);

      res.json({
        stats: {
          totalUsers,
          totalPDFs,
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
}
