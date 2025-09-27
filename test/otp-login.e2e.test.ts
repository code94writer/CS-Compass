import request from 'supertest';
import app from '../src/index';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

describe('OTP Login Flow', () => {
  const validPhone = `8178540527`; // Use a fixed valid phone number for testing

  it('should register user with phone', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ mobile: validPhone, password: 'TestPassword123' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('userId');
  });

  it('should send OTP to registered phone', async () => {
    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({ mobile: validPhone });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/OTP sent successfully/);
  });

  it('should fail OTP login with wrong code', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ mobile: validPhone, code: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid or expired OTP/);
  });

  it('should login with correct OTP', async () => {
    // Send OTP
    await request(app)
      .post('/api/auth/send-otp')
      .send({ mobile: validPhone });
    // Get OTP from DB (bypass for test)
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'cs_compass',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    });
    const result = await pool.query('SELECT code FROM otps WHERE mobile = $1 ORDER BY created_at DESC LIMIT 1', [validPhone]);
    const otp = result.rows[0]?.code;
    expect(otp).toBeDefined();
    // Verify OTP
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ mobile: validPhone, code: otp });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.mobile).toBe(validPhone);
  });
});
