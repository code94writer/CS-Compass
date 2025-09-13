import Razorpay from 'razorpay';
import { RazorpayOrder } from '../types';

class RazorpayService {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }

  async createOrder(amount: number, receipt: string): Promise<RazorpayOrder> {
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: 'INR',
      receipt: receipt,
      payment_capture: 1,
    };

    try {
      const order = await this.razorpay.orders.create(options);
      return {
        id: order.id,
        amount: typeof order.amount === 'string' ? parseInt(order.amount) : order.amount,
        currency: order.currency || 'INR',
        receipt: order.receipt || receipt,
        status: order.status || 'created',
      };
    } catch (error) {
      throw new Error(`Failed to create Razorpay order: ${error}`);
    }
  }

  async verifyPayment(paymentId: string, orderId: string, signature: string): Promise<boolean> {
    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      throw new Error(`Failed to verify payment: ${error}`);
    }
  }

  async getPaymentDetails(paymentId: string): Promise<any> {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      throw new Error(`Failed to fetch payment details: ${error}`);
    }
  }

  async refundPayment(paymentId: string, amount?: number): Promise<any> {
    try {
      const refundOptions: any = {
        payment_id: paymentId,
      };

      if (amount) {
        refundOptions.amount = amount * 100; // Convert to paise
      }

      const refund = await this.razorpay.payments.refund(paymentId, refundOptions);
      return refund;
    } catch (error) {
      throw new Error(`Failed to process refund: ${error}`);
    }
  }
}

export default new RazorpayService();
