import { Router } from 'express';
import { body, param } from 'express-validator';
import { AdminController } from '../controllers/adminController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { localUpload } from '../services/pdfLocal';

const router = Router();

// Validation rules
const createCategoryValidation = [
  body('name').notEmpty().trim(),
  body('description').optional().trim(),
  body('parent_id').optional().isUUID().withMessage('parent_id must be a valid UUID or null'),
];

const updateCategoryValidation = [
  body('name').optional().trim(),
  body('description').optional().trim(),
  body('parent_id').optional().isUUID().withMessage('parent_id must be a valid UUID or null'),
];

// All admin routes require authentication and admin role
router.use(authenticateToken, requireAdmin);

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard stats
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 *       401:
 *         description: Unauthorized
 */
router.get('/dashboard', AdminController.getDashboardStats);

/**
 * @swagger
 * /api/admin/pdfs:
 *   get:
 *     summary: Get all PDFs (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of PDFs
 *       401:
 *         description: Unauthorized
 */
router.get('/pdfs', AdminController.getAllPDFs);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 */
router.get('/users', AdminController.getAllUsers);

/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     summary: Create a new category (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               parent_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Parent category ID (null for top-level)
 *     responses:
 *       201:
 *         description: Category created
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/categories', createCategoryValidation, AdminController.createCategory);
/**
 * @swagger
 * /api/admin/categories/{id}:
 *   put:
 *     summary: Update a category (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               parent_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Parent category ID (null for top-level)
 *     responses:
 *       200:
 *         description: Category updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
router.put('/categories/:id', updateCategoryValidation, AdminController.updateCategory);
/**
 * @swagger
 * /api/admin/categories/{id}:
 *   delete:
 *     summary: Delete a category (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The category ID
 *     responses:
 *       200:
 *         description: Category deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
router.delete('/categories/:id', AdminController.deleteCategory);

/**
 * @swagger
 * /api/admin/courses:
 *   post:
 *     summary: Create a new course (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - category_id
 *               - aboutCreator
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category_id:
 *                 type: string
 *               aboutCreator:
 *                 type: string
 *               price:
 *                 type: number
 *               discount:
 *                 type: number
 *               offer:
 *                 type: object
 *               expiry:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Course created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/courses',
  body('name').isString().notEmpty(),
  body('description').isString().notEmpty(),
  body('category_id').isString().notEmpty(),
  body('aboutCreator').isString().notEmpty(),
  body('price').isNumeric(),
  AdminController.createCourse
);

/**
 * @swagger
 * /api/admin/courses/{id}:
 *   put:
 *     summary: Update a course (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category_id:
 *                 type: string
 *               aboutCreator:
 *                 type: string
 *               price:
 *                 type: number
 *               discount:
 *                 type: number
 *               offer:
 *                 type: object
 *               expiry:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Course updated successfully
 *       404:
 *         description: Course not found
 *       401:
 *         description: Unauthorized
 */
router.put('/courses/:id', AdminController.updateCourse);

/**
 * @swagger
 * /api/admin/courses/{courseId}/pdfs:
 *   post:
 *     summary: Upload a PDF to a course (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: The course ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - pdf
 *               - title
 *             properties:
 *               pdf:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: PDF uploaded successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/courses/:courseId/pdfs',
  localUpload.single('pdf'),
  AdminController.uploadCoursePDF
);

/**
 * @swagger
 * /api/admin/courses/{courseId}/videos:
 *   post:
 *     summary: Add a video to a course (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: The course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - video_url
 *             properties:
 *               title:
 *                 type: string
 *               video_url:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Video added successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/courses/:courseId/videos',
  body('title').isString().notEmpty(),
  body('video_url').isString().notEmpty(),
  body('description').optional().isString(),
  AdminController.addCourseVideo
);

/**
 * @swagger
 * /api/admin/courses/{courseId}/videos/{videoId}:
 *   put:
 *     summary: Update a video in a course (admin only)
 *     tags: [Admin]
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
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: The video ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               video_url:
 *                 type: string
 *               description:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Video updated successfully
 *       404:
 *         description: Video not found
 *       401:
 *         description: Unauthorized
 */
router.put('/courses/:courseId/videos/:videoId', AdminController.updateCourseVideo);

/**
 * @swagger
 * /api/admin/courses/{courseId}/purchases:
 *   get:
 *     summary: Get all purchases for a course (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: The course ID
 *     responses:
 *       200:
 *         description: List of course purchases
 *       401:
 *         description: Unauthorized
 */
router.get('/courses/:courseId/purchases', AdminController.getCoursePurchases);

export default router;
