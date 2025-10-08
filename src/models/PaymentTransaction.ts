import pool from '../config/database';
import { PaymentTransaction, PaymentStatus, PayUPaymentResponse } from '../types';
import logger from '../config/logger';

/**
 * PaymentTransaction Model
 * Handles all database operations for payment transactions
 */
class PaymentTransactionModel {
  /**
   * Create a new payment transaction
   */
  async create(transaction: Omit<PaymentTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<PaymentTransaction> {
    try {
      const query = `
        INSERT INTO payment_transactions (
          transaction_id,
          user_id,
          course_id,
          amount,
          currency,
          status,
          hash,
          ip_address,
          user_agent,
          idempotency_key,
          initiated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        transaction.transaction_id,
        transaction.user_id,
        transaction.course_id,
        transaction.amount,
        transaction.currency || 'INR',
        transaction.status || 'initiated',
        transaction.hash,
        transaction.ip_address,
        transaction.user_agent,
        transaction.idempotency_key,
        transaction.initiated_at || new Date(),
      ];

      const result = await pool.query(query, values);
      
      logger.info('Payment transaction created', {
        transactionId: result.rows[0].transaction_id,
        userId: result.rows[0].user_id,
        courseId: result.rows[0].course_id,
        amount: result.rows[0].amount,
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating payment transaction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transaction,
      });
      throw new Error('Failed to create payment transaction: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Find transaction by transaction ID
   */
  async findByTransactionId(transactionId: string): Promise<PaymentTransaction | null> {
    try {
      const query = 'SELECT * FROM payment_transactions WHERE transaction_id = $1';
      const result = await pool.query(query, [transactionId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding transaction by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId,
      });
      throw new Error('Failed to find transaction: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Find transaction by PayU payment ID
   */
  async findByPayUPaymentId(payuPaymentId: string): Promise<PaymentTransaction | null> {
    try {
      const query = 'SELECT * FROM payment_transactions WHERE payu_payment_id = $1';
      const result = await pool.query(query, [payuPaymentId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding transaction by PayU payment ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        payuPaymentId,
      });
      throw new Error('Failed to find transaction: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Find transaction by idempotency key
   */
  async findByIdempotencyKey(idempotencyKey: string): Promise<PaymentTransaction | null> {
    try {
      const query = 'SELECT * FROM payment_transactions WHERE idempotency_key = $1';
      const result = await pool.query(query, [idempotencyKey]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding transaction by idempotency key', {
        error: error instanceof Error ? error.message : 'Unknown error',
        idempotencyKey,
      });
      throw new Error('Failed to find transaction: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Update transaction with PayU response
   */
  async updateWithPayUResponse(
    transactionId: string,
    response: PayUPaymentResponse,
    status: PaymentStatus
  ): Promise<PaymentTransaction | null> {
    try {
      const query = `
        UPDATE payment_transactions
        SET
          payu_payment_id = $1,
          payu_txn_id = $2,
          status = $3,
          payment_mode = $4,
          payment_source = $5,
          card_num = $6,
          name_on_card = $7,
          response_hash = $8,
          payu_response = $9,
          error_message = $10,
          error_code = $11,
          completed_at = $12,
          updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $13
        RETURNING *
      `;

      const values = [
        response.mihpayid,
        response.txnid,
        status,
        response.mode,
        response.payment_source || response.field9,
        response.cardnum,
        response.name_on_card,
        response.hash,
        JSON.stringify(response),
        response.error || response.error_Message,
        response.error ? 'PAYMENT_ERROR' : null,
        status === 'success' ? new Date() : null,
        transactionId,
      ];

      const result = await pool.query(query, values);

      logger.info('Payment transaction updated with PayU response', {
        transactionId,
        payuPaymentId: response.mihpayid,
        status,
      });

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating transaction with PayU response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId,
      });
      throw new Error('Failed to update transaction: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Update transaction status
   */
  async updateStatus(transactionId: string, status: PaymentStatus, errorMessage?: string): Promise<PaymentTransaction | null> {
    try {
      const query = `
        UPDATE payment_transactions
        SET
          status = $1,
          error_message = $2,
          completed_at = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $4
        RETURNING *
      `;

      const values = [
        status,
        errorMessage || null,
        status === 'success' ? new Date() : null,
        transactionId,
      ];

      const result = await pool.query(query, values);

      logger.info('Payment transaction status updated', {
        transactionId,
        status,
      });

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating transaction status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId,
        status,
      });
      throw new Error('Failed to update transaction status: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Get all transactions for a user
   */
  async findByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<PaymentTransaction[]> {
    try {
      const query = `
        SELECT * FROM payment_transactions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await pool.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding transactions by user ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw new Error('Failed to find transactions: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Get all transactions for a course
   */
  async findByCourseId(courseId: string, limit: number = 50, offset: number = 0): Promise<PaymentTransaction[]> {
    try {
      const query = `
        SELECT * FROM payment_transactions
        WHERE course_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await pool.query(query, [courseId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding transactions by course ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        courseId,
      });
      throw new Error('Failed to find transactions: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Get successful transaction for user and course
   */
  async findSuccessfulTransaction(userId: string, courseId: string): Promise<PaymentTransaction | null> {
    try {
      const query = `
        SELECT * FROM payment_transactions
        WHERE user_id = $1 AND course_id = $2 AND status = 'success'
        ORDER BY completed_at DESC
        LIMIT 1
      `;
      const result = await pool.query(query, [userId, courseId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding successful transaction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        courseId,
      });
      throw new Error('Failed to find transaction: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Check if user has already purchased course
   */
  async hasUserPurchasedCourse(userId: string, courseId: string): Promise<boolean> {
    try {
      const transaction = await this.findSuccessfulTransaction(userId, courseId);
      return transaction !== null;
    } catch (error) {
      logger.error('Error checking if user purchased course', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        courseId,
      });
      return false;
    }
  }

  /**
   * Delete old pending/failed transactions (cleanup)
   */
  async cleanupOldTransactions(daysOld: number = 30): Promise<number> {
    try {
      const query = `
        DELETE FROM payment_transactions
        WHERE status IN ('initiated', 'pending', 'failed', 'cancelled', 'timeout')
        AND created_at < NOW() - INTERVAL '${daysOld} days'
      `;
      const result = await pool.query(query);
      
      logger.info('Old transactions cleaned up', {
        deletedCount: result.rowCount,
        daysOld,
      });

      return result.rowCount || 0;
    } catch (error) {
      logger.error('Error cleaning up old transactions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        daysOld,
      });
      throw new Error('Failed to cleanup transactions: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
}

export default new PaymentTransactionModel();

