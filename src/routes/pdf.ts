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
  body('course_id').notEmpty().trim(),
  body('price').isFloat({ min: 0 }),
];

const updatePDFValidation = [
  body('title').optional().trim(),
  body('description').optional().trim(),
  body('course_id').optional().trim(),
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
/**
 * @swagger
 * /api/pdfs:
 *   get:
 *     summary: Get all PDFs (public)
 *     tags: [PDFs]
 *     responses:
 *       200:
 *         description: List of PDFs
 */
router.get('/', PDFController.getAllPDFs);
/**
 * @swagger
 * /api/pdfs/{id}:
 *   get:
 *     summary: Get PDF by ID (public)
 *     tags: [PDFs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The PDF ID
 *     responses:
 *       200:
 *         description: PDF details
 *       404:
 *         description: PDF not found
 */
router.get('/:id', PDFController.getPDFById);
/**
 * @swagger
 * /api/pdfs/{id}/preview:
 *   get:
 *     summary: Get PDF preview (public)
 *     tags: [PDFs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The PDF ID
 *     responses:
 *       200:
 *         description: PDF preview
 *       404:
 *         description: PDF not found
 */
router.get('/:id/preview', PDFController.getPDFPreview);

// Admin-only routes (authentication + admin role required)
/**
 * @swagger
 * /api/pdfs/upload:
 *   post:
 *     summary: Upload a PDF (admin only)
 *     tags: [PDFs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               pdf:
 *                 type: string
 *                 format: binary
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *               course_id:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: PDF uploaded
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /api/pdfs/{id}:
 *   put:
 *     summary: Update a PDF (admin only)
 *     tags: [PDFs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The PDF ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               course_id:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: PDF updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: PDF not found
 */
router.put('/:id', authenticateToken, requireAdmin, updatePDFValidation, PDFController.updatePDF);
/**
 * @swagger
 * /api/pdfs/{id}:
 *   delete:
 *     summary: Delete a PDF (admin only)
 *     tags: [PDFs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The PDF ID
 *     responses:
 *       200:
 *         description: PDF deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: PDF not found
 */
router.delete('/:id', authenticateToken, requireAdmin, PDFController.deletePDF);
/**
 * @swagger
 * /api/pdfs/{id}/download:
 *   get:
 *     summary: Download a PDF (user purchase required)
 *     tags: [PDFs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The PDF ID
 *     responses:
 *       200:
 *         description: PDF file (watermarked)
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: No access or purchase required
 *       404:
 *         description: PDF not found
 */
router.get('/:id/download', authenticateToken, PDFController.downloadPDF);
/**
 * @swagger
 * /api/pdfs/user/purchases:
 *   get:
 *     summary: Get all PDFs purchased by the user
 *     tags: [PDFs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of purchased PDFs
 *       401:
 *         description: Unauthorized
 */
router.get('/user/purchases', authenticateToken, PDFController.getUserPurchases);


export default router;
