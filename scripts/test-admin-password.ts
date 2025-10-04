import bcrypt from 'bcrypt';
import pool from '../src/config/database';

async function testAdminPassword() {
  console.log('🔍 Testing Admin Password Hash...\n');

  const testPassword = 'admin123';
  const dbHash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

  // Test 1: Check if the database hash matches "admin123"
  console.log('Test 1: Checking if database hash matches "admin123"');
  const isMatch = await bcrypt.compare(testPassword, dbHash);
  console.log(`Password: ${testPassword}`);
  console.log(`Database Hash: ${dbHash}`);
  console.log(`Match Result: ${isMatch}\n`);

  // Test 2: Generate a new hash for "admin123" with 12 rounds (current code)
  console.log('Test 2: Generating new hash with 12 rounds (current code)');
  const newHash12 = await bcrypt.hash(testPassword, 12);
  console.log(`New Hash (12 rounds): ${newHash12}`);
  const newMatch12 = await bcrypt.compare(testPassword, newHash12);
  console.log(`Verification: ${newMatch12}\n`);

  // Test 3: Generate a new hash for "admin123" with 10 rounds (database)
  console.log('Test 3: Generating new hash with 10 rounds (database)');
  const newHash10 = await bcrypt.hash(testPassword, 10);
  console.log(`New Hash (10 rounds): ${newHash10}`);
  const newMatch10 = await bcrypt.compare(testPassword, newHash10);
  console.log(`Verification: ${newMatch10}\n`);

  // Test 4: Check what's actually in the database
  console.log('Test 4: Checking actual admin user in database');
  try {
    const result = await pool.query(
      "SELECT id, email, mobile, password, role FROM users WHERE email = 'admin@cscompass.com'"
    );
    
    if (result.rows.length > 0) {
      const admin = result.rows[0];
      console.log('Admin User Found:');
      console.log(`  ID: ${admin.id}`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Mobile: ${admin.mobile}`);
      console.log(`  Role: ${admin.role}`);
      console.log(`  Password Hash: ${admin.password}`);
      
      // Test the actual password from database
      if (admin.password) {
        const actualMatch = await bcrypt.compare(testPassword, admin.password);
        console.log(`  Password "admin123" matches: ${actualMatch}\n`);
        
        if (!actualMatch) {
          console.log('❌ Password does not match! Generating correct hash...');
          const correctHash = await bcrypt.hash(testPassword, 12);
          console.log(`\n✅ Correct hash for "admin123": ${correctHash}`);
          console.log('\nTo fix the database, run:');
          console.log(`UPDATE users SET password = '${correctHash}' WHERE email = 'admin@cscompass.com';`);
        } else {
          console.log('✅ Password matches correctly!');
        }
      }
    } else {
      console.log('❌ Admin user not found in database!');
      console.log('\nTo create admin user, run:');
      const correctHash = await bcrypt.hash(testPassword, 12);
      console.log(`INSERT INTO users (email, mobile, password, is_verified, role) VALUES ('admin@cscompass.com', '+1234567890', '${correctHash}', true, 'admin');`);
    }
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await pool.end();
  }
}

testAdminPassword().catch(console.error);

