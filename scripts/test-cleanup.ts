/**
 * Test Script for Cleanup Functionality
 * 
 * This script tests the cleanup utility functions to ensure they work correctly.
 * Run with: npx ts-node scripts/test-cleanup.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { 
  cleanupExpiredOTPs, 
  cleanupOldTransactions, 
  runAllCleanupTasks,
  getCleanupStats 
} from '../src/utils/cleanup';
import logger from '../src/config/logger';

async function testCleanup() {
  console.log('='.repeat(60));
  console.log('Testing Cleanup Functionality');
  console.log('='.repeat(60));
  console.log();

  try {
    // 1. Get cleanup statistics before cleanup
    console.log('📊 Step 1: Getting cleanup statistics...');
    const statsBefore = await getCleanupStats();
    console.log('Statistics before cleanup:');
    console.log(`  - Expired OTPs: ${statsBefore.expiredOTPs}`);
    console.log(`  - Old Transactions: ${statsBefore.oldTransactions}`);
    console.log();

    // 2. Test individual cleanup functions
    console.log('🧹 Step 2: Testing individual cleanup functions...');
    
    console.log('  - Cleaning up expired OTPs...');
    const otpsDeleted = await cleanupExpiredOTPs();
    console.log(`    ✅ Deleted ${otpsDeleted} expired OTPs`);
    
    console.log('  - Cleaning up old transactions...');
    const txDeleted = await cleanupOldTransactions();
    console.log(`    ✅ Deleted ${txDeleted} old transactions`);
    console.log();

    // 3. Get cleanup statistics after cleanup
    console.log('📊 Step 3: Getting cleanup statistics after cleanup...');
    const statsAfter = await getCleanupStats();
    console.log('Statistics after cleanup:');
    console.log(`  - Expired OTPs: ${statsAfter.expiredOTPs}`);
    console.log(`  - Old Transactions: ${statsAfter.oldTransactions}`);
    console.log();

    // 4. Test runAllCleanupTasks
    console.log('🚀 Step 4: Testing runAllCleanupTasks...');
    const result = await runAllCleanupTasks();
    console.log('Cleanup result:');
    console.log(`  - Success: ${result.success}`);
    console.log(`  - OTPs Deleted: ${result.otpsDeleted}`);
    console.log(`  - Transactions Deleted: ${result.transactionsDeleted}`);
    console.log();

    // 5. Summary
    console.log('='.repeat(60));
    console.log('✅ All cleanup tests completed successfully!');
    console.log('='.repeat(60));
    console.log();
    console.log('Summary:');
    console.log(`  - Expired OTPs before: ${statsBefore.expiredOTPs}`);
    console.log(`  - Expired OTPs after: ${statsAfter.expiredOTPs}`);
    console.log(`  - Old transactions before: ${statsBefore.oldTransactions}`);
    console.log(`  - Old transactions after: ${statsAfter.oldTransactions}`);
    console.log();

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup test:', error);
    logger.error('Cleanup test failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Run the test
testCleanup();

