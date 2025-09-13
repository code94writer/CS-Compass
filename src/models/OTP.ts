import pool from '../config/database';
import { OTP } from '../types';

export class OTPModel {
  static async create(otpData: Omit<OTP, 'id' | 'created_at'>): Promise<OTP> {
    const query = `
      INSERT INTO otps (mobile, code, expires_at, is_used)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [otpData.mobile, otpData.code, otpData.expires_at, otpData.is_used];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByMobileAndCode(mobile: string, code: string): Promise<OTP | null> {
    const query = `
      SELECT * FROM otps 
      WHERE mobile = $1 AND code = $2 AND is_used = false AND expires_at > NOW()
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const result = await pool.query(query, [mobile, code]);
    return result.rows[0] || null;
  }

  static async markAsUsed(id: string): Promise<void> {
    const query = 'UPDATE otps SET is_used = true WHERE id = $1';
    await pool.query(query, [id]);
  }

  static async cleanupExpired(): Promise<void> {
    const query = 'DELETE FROM otps WHERE expires_at < NOW()';
    await pool.query(query);
  }

  static async getRecentOTPCount(mobile: string, minutes: number = 5): Promise<number> {
    const query = `
      SELECT COUNT(*) as count 
      FROM otps 
      WHERE mobile = $1 AND created_at > NOW() - INTERVAL '${minutes} minutes'
    `;
    const result = await pool.query(query, [mobile]);
    return parseInt(result.rows[0].count);
  }
}
