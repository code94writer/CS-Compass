import pool from '../config/database';
import { Purchase } from '../types';

export class PurchaseModel {
  static async create(purchaseData: Omit<Purchase, 'id' | 'created_at' | 'updated_at'>): Promise<Purchase> {
    const query = `
      INSERT INTO purchases (user_id, pdf_id, amount, payment_id, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [purchaseData.user_id, purchaseData.pdf_id, purchaseData.amount, purchaseData.payment_id, purchaseData.status];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByUserId(userId: string): Promise<Purchase[]> {
    const query = `
      SELECT p.*, pdf.title, pdf.file_url 
      FROM purchases p 
      JOIN pdfs pdf ON p.pdf_id = pdf.id 
      WHERE p.user_id = $1 
      ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findByPaymentId(paymentId: string): Promise<Purchase | null> {
    const query = 'SELECT * FROM purchases WHERE payment_id = $1';
    const result = await pool.query(query, [paymentId]);
    return result.rows[0] || null;
  }

  static async updateStatus(paymentId: string, status: string): Promise<Purchase> {
    const query = 'UPDATE purchases SET status = $1, updated_at = NOW() WHERE payment_id = $2 RETURNING *';
    const result = await pool.query(query, [status, paymentId]);
    return result.rows[0];
  }

  static async hasUserPurchased(userId: string, pdfId: string): Promise<boolean> {
    const query = 'SELECT id FROM purchases WHERE user_id = $1 AND pdf_id = $2 AND status = $3';
    const result = await pool.query(query, [userId, pdfId, 'completed']);
    return result.rows.length > 0;
  }

  static async getPurchaseStats(): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_purchases,
        SUM(amount) as total_revenue,
        COUNT(DISTINCT user_id) as unique_customers
      FROM purchases 
      WHERE status = 'completed'
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }
}
