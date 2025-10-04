import bcrypt from 'bcrypt';
import pool from '../src/config/database';

async function fixAdminPassword() {
  console.log('🔧 Fixing Admin Password...\n');

  const password = 'admin123';
  const email = 'admin@cscompass.com';

  try {
    // Generate correct hash with 12 rounds (matching current code)
    console.log('Generating bcrypt hash for "admin123" with 12 rounds...');
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log(`Generated hash: ${hashedPassword}\n`);

    // Verify the hash works
    const isValid = await bcrypt.compare(password, hashedPassword);
    console.log(`Hash verification: ${isValid ? '✅ Valid' : '❌ Invalid'}\n`);

    if (!isValid) {
      console.error('❌ Generated hash is invalid! Aborting.');
      await pool.end();
      return;
    }

    // Update the database
    console.log(`Updating password for ${email}...`);
    const result = await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2 RETURNING id, email, role',
      [hashedPassword, email]
    );

    if (result.rows.length > 0) {
      console.log('✅ Password updated successfully!');
      console.log(`   User ID: ${result.rows[0].id}`);
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   Role: ${result.rows[0].role}`);
      console.log('\n📝 Admin credentials:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
    } else {
      console.log('❌ Admin user not found! Creating new admin user...');
      
      const insertResult = await pool.query(
        'INSERT INTO users (email, mobile, password, is_verified, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role',
        [email, '+1234567890', hashedPassword, true, 'admin']
      );
      
      console.log('✅ Admin user created successfully!');
      console.log(`   User ID: ${insertResult.rows[0].id}`);
      console.log(`   Email: ${insertResult.rows[0].email}`);
      console.log(`   Mobile: +1234567890`);
      console.log(`   Role: ${insertResult.rows[0].role}`);
      console.log('\n📝 Admin credentials:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

fixAdminPassword().catch(console.error);

