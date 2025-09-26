import { Router } from 'express';
import { body } from 'express-validator';
import { AdminController } from '../controllers/adminController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Validation rules
const createCategoryValidation = [
  body('name').notEmpty().trim(),
  body('description').optional().trim(),
];

const updateCategoryValidation = [
  body('name').optional().trim(),
  body('description').optional().trim(),
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
 * /api/admin/purchases:
 *   get:
 *     summary: Get all purchases (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of purchases
 *       401:
 *         description: Unauthorized
 */
router.get('/purchases', AdminController.getAllPurchases);

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

export default router;
