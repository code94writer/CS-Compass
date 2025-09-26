import { Pool } from 'pg';
import pool from '../config/database';
import { Course, CourseContent, Offer } from '../types';

class CourseModel {
  async createCourse(course: Course): Promise<Course> {
    const query = `
      INSERT INTO courses 
        (name, description, contents, about_creator, price, discount, offer, expiry, created_by)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const values = [
      course.name,
      course.description,
      JSON.stringify(course.contents),
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

  // Add more methods as needed (update, delete, etc.)
}

export default new CourseModel();
