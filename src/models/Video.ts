import pool from '../config/database';

export interface Video {
  id: string;
  course_id: string;
  title: string;
  video_url: string;
  description?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class VideoModel {
  static async create(video: Omit<Video, 'id' | 'created_at' | 'updated_at'>): Promise<Video> {
    const query = `
      INSERT INTO videos (course_id, title, video_url, description, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [
      video.course_id,
      video.title,
      video.video_url,
      video.description || null,
      video.is_active
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async findByCourseId(courseId: string): Promise<Video[]> {
    const query = 'SELECT * FROM videos WHERE course_id = $1 AND is_active = true ORDER BY created_at DESC';
    const { rows } = await pool.query(query, [courseId]);
    return rows;
  }

  static async findById(id: string): Promise<Video | null> {
    const query = 'SELECT * FROM videos WHERE id = $1';
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  static async update(id: string, updates: Partial<Video>): Promise<Video | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.title !== undefined) {
      fields.push(`title = $${paramCount++}`);
      values.push(updates.title);
    }
    if (updates.video_url !== undefined) {
      fields.push(`video_url = $${paramCount++}`);
      values.push(updates.video_url);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }
    if (updates.is_active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(updates.is_active);
    }

    if (fields.length === 0) {
      return null;
    }

    values.push(id);
    const query = `
      UPDATE videos
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *;
    `;

    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM videos WHERE id = $1';
    const { rowCount } = await pool.query(query, [id]);
    return (rowCount || 0) > 0;
  }
}

export default VideoModel;
