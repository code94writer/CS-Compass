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

// Dashboard
router.get('/dashboard', AdminController.getDashboardStats);

// PDF management
router.get('/pdfs', AdminController.getAllPDFs);

// User management
router.get('/users', AdminController.getAllUsers);

// Purchase management
router.get('/purchases', AdminController.getAllPurchases);

// Category management
router.post('/categories', createCategoryValidation, AdminController.createCategory);
router.put('/categories/:id', updateCategoryValidation, AdminController.updateCategory);
router.delete('/categories/:id', AdminController.deleteCategory);

export default router;
