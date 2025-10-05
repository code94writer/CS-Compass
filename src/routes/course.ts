
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
 * /api/courses/purchase:
 *   post:
 *     summary: Purchase a course
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
 *               - amount
 *               - paymentId
 *             properties:
 *               courseId:
 *                 type: string
 *               amount:
 *                 type: number
 *               paymentId:
 *                 type: string
 *               expiryDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Course purchased
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/purchase',
  authenticateToken,
  body('courseId').isString().notEmpty(),
  body('amount').isNumeric(),
  body('paymentId').isString().notEmpty(),
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
