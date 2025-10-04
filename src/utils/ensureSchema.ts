import pool from '../config/database';
import fs from 'fs';
import path from 'path';

/**
 * Checks if the required tables exist in the database. If not, runs schema.sql to create them.
 */
export async function ensureDatabaseSchema() {
  // List of required tables (add more as needed)
  const requiredTables = ['users', 'categories', 'pdfs', 'otps', 'courses', 'videos', 'user_courses'];
  const client = await pool.connect();
  try {
    // Check if all required tables exist
    const res = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = ANY($1)
    `, [requiredTables]);
    if (res.rows.length < requiredTables.length) {
      // Some tables are missing, run schema.sql
      const schemaPath = path.join(__dirname, '../../database/schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      await client.query(schemaSql);
      console.log('Database schema created/updated.');
    } else {
      console.log('All required tables exist.');
    }
  } catch (err) {
    console.error('Error ensuring database schema:', err);
    throw err;
  } finally {
    client.release();
  }
}
