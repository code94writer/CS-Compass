import pool from '../config/database';

export class UserSessionModel {
  static async upsertSession(userId: string, token: string): Promise<void> {
    const query = `
      INSERT INTO user_sessions (user_id, token, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET token = $2, updated_at = NOW();
    `;
    await pool.query(query, [userId, token]);
  }

  static async getToken(userId: string): Promise<string | null> {
    const query = 'SELECT token FROM user_sessions WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows[0]?.token || null;
  }

  static async deleteSession(userId: string): Promise<void> {
    const query = 'DELETE FROM user_sessions WHERE user_id = $1';
    await pool.query(query, [userId]);
  }
}
