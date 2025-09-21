import { Router } from 'express';
import { body } from 'express-validator';
import { PDFController } from '../controllers/pdfController';
import { authenticateToken, optionalAuth, requireAdmin } from '../middleware/auth';
import S3Service from '../services/s3';

const router = Router();

// Validation rules
const uploadPDFValidation = [
  body('title').notEmpty().trim(),
  body('description').optional().trim(),
  body('category').notEmpty().trim(),
  body('price').isFloat({ min: 0 }),
];

const updatePDFValidation = [
  body('title').optional().trim(),
  body('description').optional().trim(),
  body('category').optional().trim(),
  body('price').optional().isFloat({ min: 0 }),
  body('is_active').optional().isBoolean(),
];

const createOrderValidation = [
  body('pdfId').isUUID(),
];

const verifyPaymentValidation = [
  body('paymentId').notEmpty(),
  body('orderId').notEmpty(),
  body('signature').notEmpty(),
];

// Public routes (no authentication required)
router.get('/', PDFController.getAllPDFs);
router.get('/:id', PDFController.getPDFById);
router.get('/:id/preview', PDFController.getPDFPreview);

// Admin-only routes (authentication + admin role required)
router.post('/upload', 
  authenticateToken, 
  requireAdmin,
  S3Service.upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  uploadPDFValidation,
  PDFController.uploadPDF
);

router.put('/:id', authenticateToken, requireAdmin, updatePDFValidation, PDFController.updatePDF);
router.delete('/:id', authenticateToken, requireAdmin, PDFController.deletePDF);
router.get('/:id/download', authenticateToken, PDFController.downloadPDF);
router.get('/user/purchases', authenticateToken, PDFController.getUserPurchases);


export default router;
