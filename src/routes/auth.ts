import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('mobile').isMobilePhone('any'),
  body('password').isLength({ min: 8 }),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

const sendOTPValidation = [
  body('mobile').isMobilePhone('any'),
];

const verifyOTPValidation = [
  body('mobile').isMobilePhone('any'),
  body('code').isLength({ min: 6, max: 6 }).isNumeric(),
];

const updateProfileValidation = [
  body('email').optional().isEmail().normalizeEmail(),
];

// Routes
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);
router.post('/send-otp', sendOTPValidation, AuthController.sendOTP);
router.post('/verify-otp', verifyOTPValidation, AuthController.verifyOTP);
router.get('/profile', authenticateToken, AuthController.getProfile);
router.put('/profile', authenticateToken, updateProfileValidation, AuthController.updateProfile);
router.post('/logout', authenticateToken, AuthController.logout);

export default router;
