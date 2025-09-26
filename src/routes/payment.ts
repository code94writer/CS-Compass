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

/**
 * @swagger
 * /api/payments/create-order:
 *   post:
 *     summary: Create a new payment order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pdfId
 *             properties:
 *               pdfId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/create-order', authenticateToken, createOrderValidation, PaymentController.createOrder);
/**
 * @swagger
 * /api/payments/verify:
 *   post:
 *     summary: Verify a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentId
 *               - orderId
 *               - signature
 *             properties:
 *               paymentId:
 *                 type: string
 *               orderId:
 *                 type: string
 *               signature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verified
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/verify', authenticateToken, verifyPaymentValidation, PaymentController.verifyPayment);
/**
 * @swagger
 * /api/payments/status/{paymentId}:
 *   get:
 *     summary: Get payment status
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The payment ID
 *     responses:
 *       200:
 *         description: Payment status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment not found
 */
router.get('/status/:paymentId', authenticateToken, PaymentController.getPaymentStatus);
/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     summary: Get payment history for user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of payments
 *       401:
 *         description: Unauthorized
 */
router.get('/history', authenticateToken, PaymentController.getPaymentHistory);
/**
 * @swagger
 * /api/payments/refund/{purchaseId}:
 *   post:
 *     summary: Refund a payment (admin)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: purchaseId
 *         required: true
 *         schema:
 *           type: string
 *         description: The purchase ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Payment refunded
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Purchase not found
 */
router.post('/refund/:purchaseId', authenticateToken, requireAdmin, refundValidation, PaymentController.refundPayment);
/**
 * @swagger
 * /api/payments/stats:
 *   get:
 *     summary: Get payment stats (admin)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment stats
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authenticateToken, requireAdmin, PaymentController.getPaymentStats);

export default router;
