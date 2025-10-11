import { Pool } from 'pg';
import pool from '../config/database';
import { Course, CourseContent, Offer } from '../types';

class CourseModel {
  async createCourse(course: Course): Promise<Course> {
    const query = `
      INSERT INTO courses
        (name, description, category_id, about_creator, price, discount, offer, expiry, thumbnail_url, created_by)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const values = [
      course.name,
      course.description,
      course.category_id,
      course.aboutCreator,
      course.price,
      course.discount,
      course.offer ? JSON.stringify(course.offer) : null,
      course.expiry,
      course.thumbnail_url || null,
      course.createdBy
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async getCourseById(id: string): Promise<Course | null> {
    const query = 'SELECT * FROM courses WHERE id = $1';
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  async getAllCourses(includeInactive: boolean = false): Promise<Course[]> {
    let query = 'SELECT * FROM courses';

    // Filter out inactive courses by default (for public-facing queries)
    if (!includeInactive) {
      query += ' WHERE is_active = TRUE';
    }

    query += ' ORDER BY created_at DESC';

    const { rows } = await pool.query(query);
    return rows;
  }

  async updateCourse(id: string, updates: Partial<Course>): Promise<Course | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Build dynamic update query
    if (updates.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }
    if (updates.category_id !== undefined) {
      fields.push(`category_id = $${paramCount++}`);
      values.push(updates.category_id);
    }
    if (updates.aboutCreator !== undefined) {
      fields.push(`about_creator = $${paramCount++}`);
      values.push(updates.aboutCreator);
    }
    if (updates.price !== undefined) {
      fields.push(`price = $${paramCount++}`);
      values.push(updates.price);
    }
    if (updates.discount !== undefined) {
      fields.push(`discount = $${paramCount++}`);
      values.push(updates.discount);
    }
    if (updates.offer !== undefined) {
      fields.push(`offer = $${paramCount++}`);
      values.push(updates.offer ? JSON.stringify(updates.offer) : null);
    }
    if (updates.expiry !== undefined) {
      fields.push(`expiry = $${paramCount++}`);
      values.push(updates.expiry);
    }
    if (updates.thumbnail_url !== undefined) {
      fields.push(`thumbnail_url = $${paramCount++}`);
      values.push(updates.thumbnail_url);
    }
    if (updates.is_active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(updates.is_active);
    }

    if (fields.length === 0) {
      return null; // No fields to update
    }

    values.push(id);
    const query = `
      UPDATE courses
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *;
    `;

    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  }

  async deactivateCourse(id: string): Promise<Course | null> {
    const query = `
      UPDATE courses
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  async reactivateCourse(id: string): Promise<Course | null> {
    const query = `
      UPDATE courses
      SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  async searchCourses(searchTerm: string, includeInactive: boolean = false): Promise<Course[]> {
    let query = `
      SELECT c.* FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE (c.name ILIKE $1 OR c.description ILIKE $1 OR cat.name ILIKE $1)
    `;

    // Filter out inactive courses by default
    if (!includeInactive) {
      query += ' AND c.is_active = TRUE';
    }

    query += ' ORDER BY c.created_at DESC';

    const { rows } = await pool.query(query, [`%${searchTerm}%`]);
    return rows;
  }

  // Add more methods as needed (delete, etc.)
}

export default new CourseModel();
