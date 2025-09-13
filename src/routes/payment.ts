import { Router } from 'express';
import { body } from 'express-validator';
import { PaymentController } from '../controllers/paymentController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Validation rules
const createOrderValidation = [
  body('pdfId').isUUID(),
];

const verifyPaymentValidation = [
  body('paymentId').notEmpty(),
  body('orderId').notEmpty(),
  body('signature').notEmpty(),
];

const refundValidation = [
  body('amount').optional().isFloat({ min: 0 }),
];

// Payment routes
router.post('/create-order', authenticateToken, createOrderValidation, PaymentController.createOrder);
router.post('/verify', authenticateToken, verifyPaymentValidation, PaymentController.verifyPayment);
router.get('/status/:paymentId', authenticateToken, PaymentController.getPaymentStatus);
router.get('/history', authenticateToken, PaymentController.getPaymentHistory);

// Admin payment routes
router.post('/refund/:purchaseId', authenticateToken, requireAdmin, refundValidation, PaymentController.refundPayment);
router.get('/stats', authenticateToken, requireAdmin, PaymentController.getPaymentStats);

export default router;
