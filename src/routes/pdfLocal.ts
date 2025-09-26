/**
 * @swagger
 * /api/pdfs/upload-local:
 *   post:
 *     summary: Upload a PDF to local storage (admin only)
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
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: PDF uploaded successfully
 *       400:
 *         description: Invalid input or missing file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 *
 * /api/pdfs/local:
 *   get:
 *     summary: Get all PDFs stored in local storage
 *     tags: [PDFs]
 *     responses:
 *       200:
 *         description: List of local PDFs
 *       500:
 *         description: Server error
 */
import { Router } from 'express';
import { body } from 'express-validator';
import { PDFLocalController } from '../controllers/pdfLocalController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { localUpload } from '../services/pdfLocal';

const router = Router();

const uploadLocalPDFValidation = [
  body('title').notEmpty().trim(),
  body('category').notEmpty().trim(),
  body('price').isFloat({ min: 0 }),
];

/**
 * @swagger
 * /api/pdfs/upload-local:
 *   post:
 *     summary: Upload a PDF to local storage (admin only)
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
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: PDF uploaded successfully
 *       400:
 *         description: Invalid input or missing file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post(
  '/upload-local',
  authenticateToken,
  requireAdmin,
  localUpload.single('pdf'),
  uploadLocalPDFValidation,
  PDFLocalController.uploadLocalPDF
);

/**
 * @swagger
 * /api/pdfs/local:
 *   get:
 *     summary: Get all PDFs stored in local storage
 *     tags: [PDFs]
 *     responses:
 *       200:
 *         description: List of local PDFs
 *       500:
 *         description: Server error
 */
router.get('/local', PDFLocalController.getLocalPDFs);

export default router;
