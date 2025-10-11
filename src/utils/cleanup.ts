/**
 * Cleanup Utility Module
 * Handles automatic cleanup of expired OTPs and old payment transactions
 * 
 * This module provides cleanup functions that are triggered:
 * 1. On application startup
 * 2. Before relevant API operations (OTP creation, payment initiation)
 * 3. Periodically via setInterval (every 6-12 hours)
 */

import { OTPModel } from '../models/OTP';
import PaymentTransactionModel from '../models/PaymentTransaction';
import logger from '../config/logger';

/**
 * Cleanup expired OTPs
 * Deletes OTPs where expires_at < NOW()
 */
export async function cleanupExpiredOTPs(): Promise<number> {
  try {
    logger.info('Starting OTP cleanup...');
    
    await OTPModel.cleanupExpired();
    
    // Get count of deleted records (approximate)
    // Since cleanupExpired doesn't return count, we'll log success
    logger.info('OTP cleanup completed successfully');
    
    return 0; // OTPModel.cleanupExpired doesn't return count
  } catch (error) {
    logger.error('Failed to cleanup expired OTPs', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Don't throw - we don't want cleanup failures to crash the app
    return 0;
  }
}

/**
 * Cleanup old payment transactions
 * Deletes transactions older than specified days with status 'failed', 'pending', etc.
 * 
 * @param daysOld - Number of days old (default: from env or 90)
 */
export async function cleanupOldTransactions(daysOld?: number): Promise<number> {
  try {
    // Get retention days from environment or use default
    const retentionDays = daysOld || 
      parseInt(process.env.OLD_TRANSACTION_RETENTION_DAYS || '90');
    
    logger.info('Starting payment transaction cleanup...', {
      retentionDays,
    });
    
    const deletedCount = await PaymentTransactionModel.cleanupOldTransactions(retentionDays);
    
    logger.info('Payment transaction cleanup completed', {
      deletedCount,
      retentionDays,
    });
    
    return deletedCount;
  } catch (error) {
    logger.error('Failed to cleanup old transactions', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      daysOld,
    });
    
    // Don't throw - we don't want cleanup failures to crash the app
    return 0;
  }
}

/**
 * Run all cleanup tasks
 * Executes both OTP and transaction cleanup
 */
export async function runAllCleanupTasks(): Promise<{
  otpsDeleted: number;
  transactionsDeleted: number;
  success: boolean;
}> {
  const startTime = Date.now();
  
  logger.info('=== Starting all cleanup tasks ===');
  
  try {
    // Run cleanups in parallel for efficiency
    const [otpsDeleted, transactionsDeleted] = await Promise.all([
      cleanupExpiredOTPs(),
      cleanupOldTransactions(),
    ]);
    
    const duration = Date.now() - startTime;
    
    logger.info('=== All cleanup tasks completed ===', {
      otpsDeleted,
      transactionsDeleted,
      durationMs: duration,
    });
    
    return {
      otpsDeleted,
      transactionsDeleted,
      success: true,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('=== Cleanup tasks failed ===', {
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: duration,
    });
    
    return {
      otpsDeleted: 0,
      transactionsDeleted: 0,
      success: false,
    };
  }
}

/**
 * Setup periodic cleanup using setInterval
 * Runs cleanup tasks at specified interval
 * 
 * @param intervalHours - Interval in hours (default: from env or 6)
 * @returns NodeJS.Timeout - The interval timer (can be cleared if needed)
 */
export function setupPeriodicCleanup(intervalHours?: number): NodeJS.Timeout {
  // Get interval from environment or use default
  const hours = intervalHours || 
    parseInt(process.env.CLEANUP_INTERVAL_HOURS || '6');
  
  const intervalMs = hours * 60 * 60 * 1000; // Convert hours to milliseconds
  
  logger.info('Setting up periodic cleanup', {
    intervalHours: hours,
    intervalMs,
    nextRunAt: new Date(Date.now() + intervalMs).toISOString(),
  });
  
  // Run cleanup periodically
  const timer = setInterval(async () => {
    logger.info('Periodic cleanup triggered');
    await runAllCleanupTasks();
  }, intervalMs);
  
  // Ensure the timer doesn't prevent the process from exiting
  timer.unref();
  
  return timer;
}

/**
 * Cleanup on application startup
 * Should be called once when the application starts
 */
export async function cleanupOnStartup(): Promise<void> {
  logger.info('Running cleanup on application startup...');
  
  try {
    await runAllCleanupTasks();
    logger.info('Startup cleanup completed successfully');
  } catch (error) {
    logger.error('Startup cleanup failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't throw - we don't want startup cleanup to prevent app from starting
  }
}

/**
 * Cleanup before OTP creation
 * Lightweight cleanup that runs before creating new OTPs
 * Only cleans up expired OTPs to keep the table lean
 */
export async function cleanupBeforeOTPCreation(): Promise<void> {
  try {
    // Only cleanup OTPs, not transactions (to keep it fast)
    await cleanupExpiredOTPs();
  } catch (error) {
    // Log but don't throw - we don't want cleanup to block OTP creation
    logger.warn('Cleanup before OTP creation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Cleanup before payment initiation
 * Lightweight cleanup that runs before initiating payments
 * Only cleans up old failed transactions to keep the table lean
 */
export async function cleanupBeforePayment(): Promise<void> {
  try {
    // Only cleanup old transactions, not OTPs (to keep it fast)
    // Use shorter retention for this cleanup (30 days)
    await cleanupOldTransactions(30);
  } catch (error) {
    // Log but don't throw - we don't want cleanup to block payment
    logger.warn('Cleanup before payment failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get cleanup statistics
 * Returns counts of records that would be cleaned up (without actually deleting)
 */
export async function getCleanupStats(): Promise<{
  expiredOTPs: number;
  oldTransactions: number;
}> {
  try {
    const pool = (await import('../config/database')).default;
    
    // Count expired OTPs
    const otpResult = await pool.query(
      'SELECT COUNT(*) FROM otps WHERE expires_at < NOW()'
    );
    const expiredOTPs = parseInt(otpResult.rows[0].count);
    
    // Count old transactions
    const retentionDays = parseInt(process.env.OLD_TRANSACTION_RETENTION_DAYS || '90');
    const txResult = await pool.query(
      `SELECT COUNT(*) FROM payment_transactions
       WHERE status IN ('initiated', 'pending', 'failed', 'cancelled', 'timeout')
       AND created_at < NOW() - INTERVAL '1 day' * $1`,
      [retentionDays]
    );
    const oldTransactions = parseInt(txResult.rows[0].count);
    
    return {
      expiredOTPs,
      oldTransactions,
    };
  } catch (error) {
    logger.error('Failed to get cleanup stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return {
      expiredOTPs: 0,
      oldTransactions: 0,
    };
  }
}

