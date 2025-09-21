import pool from '../config/database';
import { Category } from '../types';

export class CategoryModel {
  static async create(categoryData: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
    try {
      const query = `
        INSERT INTO categories (name, description)
        VALUES ($1, $2)
        RETURNING *
      `;
      const values = [categoryData.name, categoryData.description];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error('Error creating category: ' + (error as Error).message);
    }
  }

  static async findAll(): Promise<Category[]> {
    try {
      const query = 'SELECT * FROM categories ORDER BY name ASC';
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error('Error finding categories: ' + (error as Error).message);
    }
  }

  static async findById(id: string): Promise<Category | null> {
    try {
      const query = 'SELECT * FROM categories WHERE id = $1';
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error('Error finding category by id: ' + (error as Error).message);
    }
  }

  static async findByName(name: string): Promise<Category | null> {
    try {
      const query = 'SELECT * FROM categories WHERE name = $1';
      const result = await pool.query(query, [name]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error('Error finding category by name: ' + (error as Error).message);
    }
  }

  static async update(id: string, updateData: Partial<Category>): Promise<Category | null> {
    try {
      const fields = Object.keys(updateData).filter(key => key !== 'id' && key !== 'created_at');
      if (fields.length === 0) return null;
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      const values = [id, ...fields.map(field => updateData[field as keyof Category])];
      const query = `UPDATE categories SET ${setClause} WHERE id = $1 RETURNING *`;
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error('Error updating category: ' + (error as Error).message);
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM categories WHERE id = $1';
      const result = await pool.query(query, [id]);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      throw new Error('Error deleting category: ' + (error as Error).message);
    }
  }
}
