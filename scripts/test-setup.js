#!/usr/bin/env node

// CS Compass Setup Test Script

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing CS Compass Setup...\n');

// Check if required files exist
const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'src/index.ts',
  'src/config/database.ts',
  'database/schema.sql',
  'env.example'
];

console.log('📁 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check if node_modules exists
console.log('\n📦 Checking dependencies...');
if (fs.existsSync(path.join(__dirname, '..', 'node_modules'))) {
  console.log('✅ node_modules exists');
} else {
  console.log('❌ node_modules missing - run npm install');
  allFilesExist = false;
}

// Check if .env exists
console.log('\n🔧 Checking environment configuration...');
if (fs.existsSync(path.join(__dirname, '..', '.env'))) {
  console.log('✅ .env file exists');
} else {
  console.log('⚠️  .env file missing - copy from env.example and configure');
}

// Check TypeScript compilation
console.log('\n🔨 Testing TypeScript compilation...');
const { execSync } = require('child_process');

try {
  execSync('npx tsc --noEmit', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe'
  });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('❌ TypeScript compilation failed');
  console.log(error.stdout?.toString() || error.message);
  allFilesExist = false;
}

console.log('\n' + '='.repeat(50));

if (allFilesExist) {
  console.log('🎉 Setup test completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Copy env.example to .env and configure your settings');
  console.log('2. Run ./scripts/setup-db.sh to set up the database');
  console.log('3. Run npm run dev to start the development server');
} else {
  console.log('❌ Setup test failed. Please fix the issues above.');
  process.exit(1);
}
