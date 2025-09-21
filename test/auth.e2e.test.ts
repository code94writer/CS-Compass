import request from 'supertest';
import app from '../src/index';

describe('Auth API (register & login)', () => {
  const validEmail = `testuser${Date.now()}@example.com`;
  const validPhone = `98765${Math.floor(100000 + Math.random() * 899999)}`;
  const validPassword = 'TestPassword123';

  it('should register with email only', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: validEmail, password: validPassword });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('userId');
  });

  it('should register with phone only', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ mobile: validPhone, password: validPassword });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('userId');
  });

  it('should not register with missing email and phone', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: validPassword });
    expect(res.status).toBe(400);
    expect(res.body.details[0].msg).toMatch(/Either email or mobile is required/);
  });

  it('should not register with invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bademail', password: validPassword });
    expect(res.status).toBe(400);
    expect(res.body.details[0].msg).toMatch(/Invalid email format/);
  });

  it('should not register with invalid phone', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ mobile: '12345', password: validPassword });
    expect(res.status).toBe(400);
    expect(res.body.details[0].msg).toMatch(/Mobile number must be a valid Indian number/);
  });

  it('should login with email', async () => {
    // Register first
    await request(app)
      .post('/api/auth/register')
      .send({ email: validEmail, password: validPassword });
    // Login
    const res = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: validEmail, password: validPassword });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(validEmail);
  });

  it('should login with phone', async () => {
    // Register first
    await request(app)
      .post('/api/auth/register')
      .send({ mobile: validPhone, password: validPassword });
    // Login
    const res = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: validPhone, password: validPassword });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.mobile).toBe(validPhone);
  });

  it('should not login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: validEmail, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('should not login with missing emailOrPhone', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: validPassword });
    expect(res.status).toBe(400);
    expect(res.body.details[0].msg).toMatch(/Email or phone number is required/);
  });

  it('should not login with missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: validEmail });
    expect(res.status).toBe(400);
    expect(res.body.details[0].msg).toMatch(/Password is required/);
  });
});
