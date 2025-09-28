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
}

export default VideoModel;
