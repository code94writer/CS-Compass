
import pool from '../config/database';
import { User } from '../types';

export class UserModel {
  static async create(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    try {
      const query = `
        INSERT INTO users (email, mobile, password, is_verified, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const values = [userData.email, userData.mobile, userData.password, userData.is_verified, userData.role];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error('Error creating user: ' + (error as Error).message);
    }
  }

  static async findByEmail(email: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await pool.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error('Error finding user by email: ' + (error as Error).message);
    }
  }

  static async findByMobile(mobile: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE mobile = $1';
      const result = await pool.query(query, [mobile]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error('Error finding user by mobile: ' + (error as Error).message);
    }
  }

  static async findById(id: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error('Error finding user by id: ' + (error as Error).message);
    }
  }

  static async updateVerificationStatus(id: string, isVerified: boolean): Promise<User | null> {
    try {
      const query = 'UPDATE users SET is_verified = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
      const result = await pool.query(query, [isVerified, id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error('Error updating verification status: ' + (error as Error).message);
    }
  }

  static async updatePassword(id: string, password: string): Promise<User | null> {
    try {
      const query = 'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
      const result = await pool.query(query, [password, id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error('Error updating password: ' + (error as Error).message);
    }
  }

  static async update(id: string, updateData: Partial<User>): Promise<User | null> {
    try {
      const fields = Object.keys(updateData).filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at');
      if (fields.length === 0) return null;
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      const values = [id, ...fields.map(field => updateData[field as keyof User])];
      const query = `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`;
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error('Error updating user: ' + (error as Error).message);
    }
  }
}
