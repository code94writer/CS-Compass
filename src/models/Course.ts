import { Pool } from 'pg';
import pool from '../config/database';
import { Course, CourseContent, Offer } from '../types';

class CourseModel {
  async createCourse(course: Course): Promise<Course> {
    const query = `
      INSERT INTO courses 
        (name, description, category_id, about_creator, price, discount, offer, expiry, created_by)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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

  async getAllCourses(): Promise<Course[]> {
    const query = 'SELECT * FROM courses ORDER BY created_at DESC';
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

  // Add more methods as needed (delete, etc.)
}

export default new CourseModel();
