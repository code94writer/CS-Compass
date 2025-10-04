import { Request, Response } from 'express';
import { CategoryModel } from '../models/Category';

export class CategoryController {
  // Get all categories (public endpoint)
  static async getAllCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await CategoryModel.findAll();
      res.json({
        success: true,
        data: categories,
        message: 'Categories retrieved successfully'
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to retrieve categories' 
      });
    }
  }

  // Get category by ID (public endpoint)
  static async getCategoryById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const category = await CategoryModel.findById(id);
      
      if (!category) {
        res.status(404).json({ 
          success: false,
          error: 'Category not found' 
        });
        return;
      }

      res.json({
        success: true,
        data: category,
        message: 'Category retrieved successfully'
      });
    } catch (error) {
      console.error('Get category by ID error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to retrieve category' 
      });
    }
  }
}

