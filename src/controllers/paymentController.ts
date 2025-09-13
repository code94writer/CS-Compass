import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PDFModel } from '../models/PDF';
import { PurchaseModel } from '../models/Purchase';
import RazorpayService from '../services/razorpay';
import { AuthRequest } from '../middleware/auth';

export class PaymentController {
  // Create payment order
  static async createOrder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { pdfId } = req.body;
      const userId = req.user!.id;

      // Get PDF details
      const pdf = await PDFModel.findById(pdfId);
      if (!pdf) {
        res.status(404).json({ error: 'PDF not found' });
        return;
      }

      // Check if user already purchased this PDF
      const hasPurchased = await PurchaseModel.hasUserPurchased(userId, pdfId);
      if (hasPurchased) {
        res.status(400).json({ error: 'You have already purchased this PDF' });
        return;
      }

      // Create purchase record
      const purchase = await PurchaseModel.create({
        user_id: userId,
        pdf_id: pdfId,
        amount: pdf.price,
        payment_id: '', // Will be updated after order creation
        status: 'pending',
      });

      // Create Razorpay order
      const order = await RazorpayService.createOrder(
        pdf.price,
        `purchase_${purchase.id}`
      );

      // Update purchase with payment ID
      await PurchaseModel.updateStatus(order.id, 'pending');

      res.json({
        message: 'Order created successfully',
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt,
        },
        purchaseId: purchase.id,
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Verify payment
  static async verifyPayment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { paymentId, orderId, signature } = req.body;

      // Verify payment with Razorpay
      const isValid = await RazorpayService.verifyPayment(paymentId, orderId, signature);
      if (!isValid) {
        res.status(400).json({ error: 'Payment verification failed' });
        return;
      }

      // Get payment details
      const paymentDetails = await RazorpayService.getPaymentDetails(paymentId);
      
      // Update purchase status
      const purchase = await PurchaseModel.findByPaymentId(orderId);
      if (!purchase) {
        res.status(404).json({ error: 'Purchase record not found' });
        return;
      }

      await PurchaseModel.updateStatus(orderId, 'completed');

      res.json({
        message: 'Payment verified successfully',
        purchase: {
          id: purchase.id,
          amount: purchase.amount,
          status: 'completed',
        },
      });
    } catch (error) {
      console.error('Verify payment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get payment status
  static async getPaymentStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;

      const purchase = await PurchaseModel.findByPaymentId(paymentId);
      if (!purchase) {
        res.status(404).json({ error: 'Purchase not found' });
        return;
      }

      res.json({
        purchase: {
          id: purchase.id,
          amount: purchase.amount,
          status: purchase.status,
          created_at: purchase.created_at,
        },
      });
    } catch (error) {
      console.error('Get payment status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get user's payment history
  static async getPaymentHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const purchases = await PurchaseModel.findByUserId(req.user!.id);
      
      res.json({
        purchases: purchases.map((purchase: any) => ({
          id: purchase.id,
          amount: purchase.amount,
          status: purchase.status,
          title: purchase.title,
          file_url: purchase.file_url,
          created_at: purchase.created_at,
        })),
      });
    } catch (error) {
      console.error('Get payment history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Refund payment (admin only)
  static async refundPayment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { purchaseId } = req.params;
      const { amount } = req.body;

      const purchase = await PurchaseModel.findByPaymentId(purchaseId);
      if (!purchase) {
        res.status(404).json({ error: 'Purchase not found' });
        return;
      }

      if (purchase.status !== 'completed') {
        res.status(400).json({ error: 'Only completed purchases can be refunded' });
        return;
      }

      // Process refund with Razorpay
      const refund = await RazorpayService.refundPayment(
        purchase.payment_id,
        amount || purchase.amount
      );

      // Update purchase status
      await PurchaseModel.updateStatus(purchase.payment_id, 'refunded');

      res.json({
        message: 'Refund processed successfully',
        refund: {
          id: refund.id,
          amount: refund.amount,
          status: refund.status,
        },
      });
    } catch (error) {
      console.error('Refund payment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get payment statistics (admin only)
  static async getPaymentStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await PurchaseModel.getPurchaseStats();
      
      res.json({
        stats: {
          total_purchases: parseInt(stats.total_purchases),
          total_revenue: parseFloat(stats.total_revenue),
          unique_customers: parseInt(stats.unique_customers),
        },
      });
    } catch (error) {
      console.error('Get payment stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
