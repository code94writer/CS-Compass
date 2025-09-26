import { Pool } from 'pg';
import pool from '../config/database';
import { Course } from '../types';

class UserCourseModel {
  async purchaseCourse(userId: string, courseId: string, amount: number, paymentId: string, expiryDate?: Date): Promise<any> {
    const query = `
      INSERT INTO user_courses (user_id, course_id, amount, payment_id, expiry_date, status)
      VALUES ($1, $2, $3, $4, $5, 'completed')
      RETURNING *;
    `;
    const values = [userId, courseId, amount, paymentId, expiryDate || null];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async getUserCourses(userId: string): Promise<Course[]> {
    const query = `
      SELECT c.* FROM courses c
      INNER JOIN user_courses uc ON c.id = uc.course_id
      WHERE uc.user_id = $1 AND (uc.expiry_date IS NULL OR uc.expiry_date > NOW())
      ORDER BY uc.purchase_date DESC;
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }

  async hasAccess(userId: string, courseId: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM user_courses
      WHERE user_id = $1 AND course_id = $2
        AND (expiry_date IS NULL OR expiry_date > NOW())
        AND status = 'completed'
      LIMIT 1;
    `;
  const { rowCount } = await pool.query(query, [userId, courseId]);
  return (rowCount || 0) > 0;
  }
}

export default new UserCourseModel();
