
import express from 'express';
import { courseController } from '../controllers/courseController';
import { authenticateToken } from '../middleware/auth';
import { body, param } from 'express-validator';

const router = express.Router();

/**
 * @swagger
 * /api/courses/{courseId}/download/{pdfId}:
 *   get:
 *     summary: Download a PDF from a course (checks access and expiry)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: The course ID
 *       - in: path
 *         name: pdfId
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
 *         description: No access or course expired
 *       404:
 *         description: Course or PDF not found
 */
router.get(
  '/:courseId/download/:pdfId',
  authenticateToken,
  courseController.downloadCoursePDF
);

/**
 * @swagger
 * /api/courses/{courseId}/pdfs/{pdfId}/thumbnail:
 *   get:
 *     summary: Get thumbnail image for a PDF (public access)
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: The course ID
 *       - in: path
 *         name: pdfId
 *         required: true
 *         schema:
 *           type: string
 *         description: The PDF ID
 *     responses:
 *       200:
 *         description: Thumbnail image
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Course, PDF, or thumbnail not found
 */
router.get(
  '/:courseId/pdfs/:pdfId/thumbnail',
  courseController.serveThumbnail
);

/**
 * @swagger
 * /api/courses/{courseId}/pdfs/{pdfId}/preview:
 *   get:
 *     summary: Get preview/demo PDF (accessible without purchase)
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: The course ID
 *       - in: path
 *         name: pdfId
 *         required: true
 *         schema:
 *           type: string
 *         description: The PDF ID
 *     responses:
 *       200:
 *         description: Demo PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: PDF is not available for preview
 *       404:
 *         description: Course or PDF not found
 */
router.get(
  '/:courseId/pdfs/:pdfId/preview',
  courseController.servePreviewPDF
);

/**
 * @swagger
 * /api/courses/my:
 *   get:
 *     summary: Get all courses purchased by the user (My Courses)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of purchased courses
 *       401:
 *         description: Unauthorized
 */
router.get('/my', authenticateToken, courseController.getMyCourses);

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Get all courses
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: List of all courses
 */
router.get('/', courseController.getAllCourses);

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Get course by ID
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The course ID
 *     responses:
 *       200:
 *         description: Course details
 *       404:
 *         description: Course not found
 */
router.get(
  '/:id',
  param('id').isString().notEmpty(),
  courseController.getCourse
);

/**
 * @swagger
 * /api/courses/payment/initiate:
 *   post:
 *     summary: Initiate payment for course purchase
 *     tags: [Courses, Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *             properties:
 *               courseId:
 *                 type: string
 *                 description: ID of the course to purchase
 *     responses:
 *       200:
 *         description: Payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactionId:
 *                   type: string
 *                 paymentUrl:
 *                   type: string
 *                 paymentParams:
 *                   type: object
 *                 merchantKey:
 *                   type: string
 *       400:
 *         description: Invalid input or course already purchased
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 *       503:
 *         description: Payment service not configured
 */
router.post(
  '/payment/initiate',
  authenticateToken,
  body('courseId').isString().notEmpty().withMessage('courseId is required'),
  courseController.purchaseCourse
);

/**
 * @swagger
 * /api/courses/payment/callback:
 *   post:
 *     summary: PayU payment webhook callback
 *     tags: [Payment]
 *     description: This endpoint receives payment status updates from PayU
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Payment callback processed
 *       400:
 *         description: Invalid callback data
 *       404:
 *         description: Transaction not found
 */
router.post(
  '/payment/callback',
  courseController.handlePaymentCallback
);

/**
 * @swagger
 * /api/courses/payment/status/{transactionId}:
 *   get:
 *     summary: Get payment transaction status
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Payment status retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not your transaction
 *       404:
 *         description: Transaction not found
 */
router.get(
  '/payment/status/:transactionId',
  authenticateToken,
  courseController.getPaymentStatus
);

/**
 * @swagger
 * /api/courses/purchase:
 *   post:
 *     summary: Purchase a course (DEPRECATED - use /payment/initiate)
 *     deprecated: true
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *             properties:
 *               courseId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment initiated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/purchase',
  authenticateToken,
  body('courseId').isString().notEmpty(),
  courseController.purchaseCourse
);

/**
 * @swagger
 * /api/courses/{courseId}/thumbnail:
 *   get:
 *     summary: Get course thumbnail image
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: The course ID
 *     responses:
 *       200:
 *         description: Course thumbnail image
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Course not found or no thumbnail
 */
router.get('/:courseId/thumbnail', courseController.serveCourseThumbnail);

export default router;
