import pool from '../config/database';
import { PDF } from '../types';

export class PDFModel {
  static async create(pdfData: Omit<PDF, 'id' | 'created_at' | 'updated_at'>): Promise<PDF> {
    try {
      const query = `
        INSERT INTO pdfs (title, description, course_id, file_url, thumbnail_url, file_size, is_active, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const values = [
        pdfData.title,
        pdfData.description,
        pdfData.course_id,
        pdfData.file_url,
        pdfData.thumbnail_url,
        pdfData.file_size,
        pdfData.is_active,
        pdfData.uploaded_by
      ];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error('Error creating PDF: ' + (error as Error).message);
    }
  }

  static async findAll(limit: number = 10, offset: number = 0, course_id?: string): Promise<PDF[]> {
    try {
      let query = 'SELECT * FROM pdfs WHERE is_active = true';
      const values: any[] = [];
      if (course_id) {
        query += ' AND course_id = $1';
        values.push(course_id);
        query += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
        values.push(limit, offset);
      } else {
        query += ' ORDER BY created_at DESC LIMIT $1 OFFSET $2';
        values.push(limit, offset);
      }
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error('Error finding PDFs: ' + (error as Error).message);
    }
  }

  static async findById(id: string): Promise<PDF | null> {
    try {
      const query = 'SELECT * FROM pdfs WHERE id = $1';
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error('Error finding PDF by id: ' + (error as Error).message);
    }
  }

  static async findByUserId(userId: string): Promise<PDF[]> {
    try {
      const query = 'SELECT * FROM pdfs WHERE uploaded_by = $1 ORDER BY created_at DESC';
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw new Error('Error finding PDFs by user: ' + (error as Error).message);
    }
  }

  static async update(id: string, updateData: Partial<PDF>): Promise<PDF | null> {
    try {
      const fields = Object.keys(updateData).filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at');
      if (fields.length === 0) return null;
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      const values = [id, ...fields.map(field => updateData[field as keyof PDF])];
      const query = `UPDATE pdfs SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`;
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error('Error updating PDF: ' + (error as Error).message);
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM pdfs WHERE id = $1';
      const result = await pool.query(query, [id]);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      throw new Error('Error deleting PDF: ' + (error as Error).message);
    }
  }

  static async search(searchTerm: string, limit: number = 10, offset: number = 0): Promise<PDF[]> {
    try {
      const query = `
        SELECT * FROM pdfs 
        WHERE is_active = true 
        AND (title ILIKE $1 OR description ILIKE $1)
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `;
      const result = await pool.query(query, [`%${searchTerm}%`, limit, offset]);
      return result.rows;
    } catch (error) {
      throw new Error('Error searching PDFs: ' + (error as Error).message);
    }
  }
}
