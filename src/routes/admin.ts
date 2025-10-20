import { Router } from 'express';
import { body, param } from 'express-validator';
import { AdminController } from '../controllers/adminController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { localUpload, imageUpload } from '../services/pdfLocal';

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

// /**
//  * @swagger
//  * /api/admin/dashboard:
//  *   get:
//  *     summary: Get admin dashboard stats
//  *     tags: [Admin]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: Dashboard stats
//  *       401:
//  *         description: Unauthorized
//  */
// router.get('/dashboard', AdminController.getDashboardStats);

/**
 * @swagger
 * /api/admin/statistics:
 *   get:
 *     summary: Get platform statistics
 *     description: Returns comprehensive platform statistics including active courses count, active users count, non-active users count, and total revenue from course sales
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     activeCourses:
 *                       type: integer
 *                       description: Total count of active courses
 *                       example: 25
 *                     activeUsers:
 *                       type: integer
 *                       description: Total count of active (verified) users
 *                       example: 150
 *                     nonActiveUsers:
 *                       type: integer
 *                       description: Total count of non-active (unverified) users
 *                       example: 30
 *                     totalRevenue:
 *                       type: number
 *                       format: float
 *                       description: Total revenue from all completed course purchases
 *                       example: 125000.50
 *                 message:
 *                   type: string
 *                   example: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Unauthorized
 *       403:
 *         description: Forbidden - User does not have admin privileges
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Access denied. Admin role required.
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get('/statistics', AdminController.getStatistics);

/**
 * @swagger
 * /api/admin/analytics/deep:
 *   get:
 *     summary: Get comprehensive deep analytics
 *     description: Returns detailed analytics across all platform metrics including courses, users, content, revenue, transactions, payment modes, user growth, and categories
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deep analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     courses:
 *                       type: object
 *                       properties:
 *                         totalCourses:
 *                           type: integer
 *                           example: 30
 *                         activeCourses:
 *                           type: integer
 *                           example: 25
 *                         inactiveCourses:
 *                           type: integer
 *                           example: 5
 *                         coursesWithPurchases:
 *                           type: integer
 *                           example: 18
 *                         coursesWithoutPurchases:
 *                           type: integer
 *                           example: 12
 *                         averageCoursePrice:
 *                           type: string
 *                           example: "2500.00"
 *                         averageSalesPerCourse:
 *                           type: string
 *                           example: "4.72"
 *                         mostPopularCourse:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             purchaseCount:
 *                               type: integer
 *                     users:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: integer
 *                           example: 180
 *                         verifiedUsers:
 *                           type: integer
 *                           example: 150
 *                         unverifiedUsers:
 *                           type: integer
 *                           example: 30
 *                         adminUsers:
 *                           type: integer
 *                           example: 5
 *                         studentUsers:
 *                           type: integer
 *                           example: 175
 *                         usersWithPurchases:
 *                           type: integer
 *                           example: 85
 *                     userGrowth:
 *                       type: object
 *                       properties:
 *                         newUsersToday:
 *                           type: integer
 *                           example: 3
 *                         newUsersThisWeek:
 *                           type: integer
 *                           example: 12
 *                         newUsersThisMonth:
 *                           type: integer
 *                           example: 45
 *                     content:
 *                       type: object
 *                       properties:
 *                         totalPDFs:
 *                           type: integer
 *                           example: 120
 *                         activePDFs:
 *                           type: integer
 *                           example: 110
 *                         demoPDFs:
 *                           type: integer
 *                           example: 30
 *                         fullPDFs:
 *                           type: integer
 *                           example: 90
 *                         totalVideos:
 *                           type: integer
 *                           example: 85
 *                         activeVideos:
 *                           type: integer
 *                           example: 80
 *                     contentQuality:
 *                       type: object
 *                       properties:
 *                         coursesWithPDFs:
 *                           type: integer
 *                           example: 28
 *                         coursesWithVideos:
 *                           type: integer
 *                           example: 22
 *                         coursesWithBoth:
 *                           type: integer
 *                           example: 20
 *                         averagePDFsPerCourse:
 *                           type: string
 *                           example: "4.00"
 *                         averageVideosPerCourse:
 *                           type: string
 *                           example: "2.83"
 *                     revenue:
 *                       type: object
 *                       properties:
 *                         totalRevenue:
 *                           type: string
 *                           example: "125000.50"
 *                         totalRefunds:
 *                           type: string
 *                           example: "3000.00"
 *                         netRevenue:
 *                           type: string
 *                           example: "122000.50"
 *                         averageOrderValue:
 *                           type: string
 *                           example: "2500.00"
 *                         revenueToday:
 *                           type: string
 *                           example: "5000.00"
 *                         revenueThisWeek:
 *                           type: string
 *                           example: "25000.00"
 *                         revenueThisMonth:
 *                           type: string
 *                           example: "35000.00"
 *                     transactions:
 *                       type: object
 *                       properties:
 *                         totalTransactions:
 *                           type: integer
 *                           example: 95
 *                         completedTransactions:
 *                           type: integer
 *                           example: 85
 *                         pendingTransactions:
 *                           type: integer
 *                           example: 5
 *                         failedTransactions:
 *                           type: integer
 *                           example: 5
 *                         refundedTransactions:
 *                           type: integer
 *                           example: 2
 *                         successRate:
 *                           type: number
 *                           example: 89.47
 *                         purchasesToday:
 *                           type: integer
 *                           example: 2
 *                     paymentModes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           mode:
 *                             type: string
 *                             example: "UPI"
 *                           count:
 *                             type: integer
 *                             example: 45
 *                           totalAmount:
 *                             type: string
 *                             example: "67500.00"
 *                     categories:
 *                       type: object
 *                       properties:
 *                         totalCategories:
 *                           type: integer
 *                           example: 12
 *                         topLevelCategories:
 *                           type: integer
 *                           example: 4
 *                         subCategories:
 *                           type: integer
 *                           example: 8
 *                         categoriesWithCourses:
 *                           type: integer
 *                           example: 10
 *                 message:
 *                   type: string
 *                   example: Deep analytics retrieved successfully
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-10-20T10:18:00.000Z"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Unauthorized
 *       403:
 *         description: Forbidden - User does not have admin privileges
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Access denied. Admin role required.
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get('/analytics/deep', AdminController.getDeepAnalytics);

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
 * /api/admin/courses/{id}/deactivate:
 *   put:
 *     summary: Deactivate a course (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course deactivated successfully
 *       400:
 *         description: Course is already deactivated
 *       404:
 *         description: Course not found
 *       401:
 *         description: Unauthorized
 */
router.put('/courses/:id/deactivate', AdminController.deactivateCourse);

/**
 * @swagger
 * /api/admin/courses/{id}/reactivate:
 *   put:
 *     summary: Reactivate a course (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course reactivated successfully
 *       400:
 *         description: Course is already active
 *       404:
 *         description: Course not found
 *       401:
 *         description: Unauthorized
 */
router.put('/courses/:id/reactivate', AdminController.reactivateCourse);

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
 * /api/admin/courses/{courseId}/pdfs/{pdfId}:
 *   put:
 *     summary: Update PDF metadata (admin only)
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
 *         name: pdfId
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
 *               description:
 *                 type: string
 *               pdf_type:
 *                 type: string
 *                 enum: [demo, full]
 *     responses:
 *       200:
 *         description: PDF updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course or PDF not found
 */
router.put(
  '/courses/:courseId/pdfs/:pdfId',
  body('title').optional().isString(),
  body('description').optional().isString(),
  body('pdf_type').optional().isIn(['demo', 'full']),
  AdminController.updateCoursePDF
);

/**
 * @swagger
 * /api/admin/courses/{courseId}/pdfs/{pdfId}:
 *   delete:
 *     summary: Delete PDF and associated files (admin only)
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
 *         name: pdfId
 *         required: true
 *         schema:
 *           type: string
 *         description: The PDF ID
 *     responses:
 *       200:
 *         description: PDF deleted successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course or PDF not found
 */
router.delete(
  '/courses/:courseId/pdfs/:pdfId',
  AdminController.deleteCoursePDF
);

/**
 * @swagger
 * /api/admin/courses/{courseId}/thumbnail:
 *   post:
 *     summary: Upload or update course thumbnail (admin only)
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
 *             properties:
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Course thumbnail image (JPEG, PNG, or WebP)
 *     responses:
 *       200:
 *         description: Thumbnail uploaded successfully
 *       400:
 *         description: Invalid file type or missing file
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.post(
  '/courses/:courseId/thumbnail',
  imageUpload.single('thumbnail'),
  AdminController.uploadCourseThumbnail
);

/**
 * @swagger
 * /api/admin/courses/{courseId}/thumbnail:
 *   delete:
 *     summary: Delete course thumbnail (admin only)
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
 *         description: Thumbnail deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found or no thumbnail exists
 */
router.delete(
  '/courses/:courseId/thumbnail',
  AdminController.deleteCourseThumbnail
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
