import pool from '../src/config/database';

async function getLatestOTP() {
  try {
    const result = await pool.query(
      `SELECT mobile, code, expires_at, is_used, created_at 
       FROM otps 
       WHERE mobile = '+1234567890' 
       ORDER BY created_at DESC 
       LIMIT 1`
    );

    if (result.rows.length > 0) {
      const otp = result.rows[0];
      console.log('Latest OTP for +1234567890:');
      console.log(`  Code: ${otp.code}`);
      console.log(`  Expires At: ${otp.expires_at}`);
      console.log(`  Is Used: ${otp.is_used}`);
      console.log(`  Created At: ${otp.created_at}`);
      
      const now = new Date();
      const expiresAt = new Date(otp.expires_at);
      const isExpired = now > expiresAt;
      
      console.log(`  Status: ${isExpired ? '❌ Expired' : '✅ Valid'}`);
    } else {
      console.log('No OTP found for +1234567890');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

getLatestOTP().catch(console.error);

