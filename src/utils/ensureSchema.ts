import pool from '../config/database';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

/**
 * Checks if the required tables exist in the database. If not, runs schema.sql to create them.
 */
export async function ensureDatabaseSchema() {
  // List of required tables (add more as needed)
  const requiredTables = ['users', 'categories', 'pdfs', 'otps', 'courses', 'videos', 'user_courses', 'payment_transactions', 'user_sessions'];
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

      // Fix admin password after schema creation
      await fixAdminPassword(client);
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

/**
 * Ensures the admin user has a properly hashed password
 */
async function fixAdminPassword(client: any) {
  try {
    const password = 'admin123';
    const email = 'admin@cscompass.com';

    // Generate correct hash with 12 rounds
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update the admin user's password
    await client.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2 AND role = $3',
      [hashedPassword, email, 'admin']
    );

    console.log('Admin password initialized successfully.');
  } catch (err) {
    console.error('Error fixing admin password:', err);
    // Don't throw - this is not critical enough to stop the app
  }
}
