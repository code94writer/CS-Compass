import pool from '../config/database';
import { Purchase } from '../types';

export enum PurchaseStatus {
  Pending = 'pending',
  Completed = 'completed',
  Failed = 'failed',
  Refunded = 'refunded',
}

export class PurchaseModel {
  static async create(purchaseData: Omit<Purchase, 'id' | 'created_at' | 'updated_at'>): Promise<Purchase> {
    try {
      const query = `
        INSERT INTO purchases (user_id, pdf_id, amount, payment_id, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const values = [purchaseData.user_id, purchaseData.pdf_id, purchaseData.amount, purchaseData.payment_id, purchaseData.status];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error('Error creating purchase: ' + (error as Error).message);
    }
  }

  static async findByUserId(userId: string): Promise<Purchase[]> {
    try {
      const query = `
        SELECT p.*, pdf.title, pdf.file_url 
        FROM purchases p 
        JOIN pdfs pdf ON p.pdf_id = pdf.id 
        WHERE p.user_id = $1 
        ORDER BY p.created_at DESC
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw new Error('Error finding purchases by user: ' + (error as Error).message);
    }
  }

  static async findByPaymentId(paymentId: string): Promise<Purchase | null> {
    try {
      const query = 'SELECT * FROM purchases WHERE payment_id = $1';
      const result = await pool.query(query, [paymentId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error('Error finding purchase by paymentId: ' + (error as Error).message);
    }
  }

  static async updateStatus(paymentId: string, status: PurchaseStatus): Promise<Purchase | null> {
    try {
      const query = 'UPDATE purchases SET status = $1, updated_at = NOW() WHERE payment_id = $2 RETURNING *';
      const result = await pool.query(query, [status, paymentId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error('Error updating purchase status: ' + (error as Error).message);
    }
  }

  static async hasUserPurchased(userId: string, pdfId: string): Promise<boolean> {
    try {
      const query = 'SELECT id FROM purchases WHERE user_id = $1 AND pdf_id = $2 AND status = $3';
      const result = await pool.query(query, [userId, pdfId, PurchaseStatus.Completed]);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error('Error checking user purchase: ' + (error as Error).message);
    }
  }

  static async getPurchaseStats(): Promise<{ total_purchases: number; total_revenue: number; unique_customers: number }> {
    try {
      const query = `
        SELECT 
          COUNT(*)::int as total_purchases,
          COALESCE(SUM(amount), 0)::float as total_revenue,
          COUNT(DISTINCT user_id)::int as unique_customers
        FROM purchases 
        WHERE status = 'completed'
      `;
      const result = await pool.query(query);
      return result.rows[0];
    } catch (error) {
      throw new Error('Error getting purchase stats: ' + (error as Error).message);
    }
  }
}
