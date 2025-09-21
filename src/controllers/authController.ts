import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { UserModel } from '../models/User';
import { OTPModel } from '../models/OTP';
import { AuthUtils } from '../utils/auth';
import TwilioService from '../services/twilio';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  // Register with email and password
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, mobile, password } = req.body;

      // Check if user already exists (only if field is present)
      if (email) {
        const existingUserByEmail = await UserModel.findByEmail(email);
        if (existingUserByEmail) {
          res.status(400).json({ error: 'User with this email already exists' });
          return;
        }
      }
      if (mobile) {
        const existingUserByMobile = await UserModel.findByMobile(mobile);
        if (existingUserByMobile) {
          res.status(400).json({ error: 'User with this mobile number already exists' });
          return;
        }
      }

      // Validate password
      const passwordValidation = AuthUtils.validatePassword(password);
      if (!passwordValidation.isValid) {
        res.status(400).json({ error: 'Password validation failed', details: passwordValidation.errors });
        return;
      }

      // Hash password
      const hashedPassword = await AuthUtils.hashPassword(password);

      // Create user (allow null for email or mobile)
      const user = await UserModel.create({
        email: email || null,
        mobile: mobile || null,
        password: hashedPassword,
        is_verified: false,
        role: 'student',
      });

      // Generate OTP and send only if mobile is present
      if (mobile) {
        const otp = AuthUtils.generateOTP();
        await OTPModel.create({
          mobile,
          code: otp,
          expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
          is_used: false,
        });
        // Send OTP via SMS
        await TwilioService.sendOTP(mobile, otp);
      }

      res.status(201).json({
        message: 'User registered successfully.' + (mobile ? ' Please verify your mobile number with the OTP sent.' : ''),
        userId: user.id,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Login with email/phone and password
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { emailOrPhone, password } = req.body;

      // Determine if input is email or phone
      const isEmail = emailOrPhone.includes('@');
      let user: any = null;

      if (isEmail) {
        // Find user by email
        user = await UserModel.findByEmail(emailOrPhone);
      } else {
        // Find user by mobile
        user = await UserModel.findByMobile(emailOrPhone);
      }

      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Check if user has password (not OTP-only user)
      if (!user.password) {
        res.status(401).json({ error: 'Please use OTP login for this account' });
        return;
      }

      // Verify password
      const isPasswordValid = await AuthUtils.comparePassword(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Check if user is verified (disabled for local/dev)
      // if (!user.is_verified) {
      //   res.status(401).json({ error: 'Please verify your mobile number first' });
      //   return;
      // }

      // Generate JWT token
      const token = AuthUtils.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // OTP functionality disabled - users must use email/phone + password login only

  // Get current user profile
  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await UserModel.findById(req.user!.id);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          is_verified: user.is_verified,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update user profile
  static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      const userId = req.user!.id;

      // Check if email is already taken by another user
      if (email) {
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          res.status(400).json({ error: 'Email already taken' });
          return;
        }
      }

      // Update user
      const updatedUser = await UserModel.update(userId, { email });
      if (!updatedUser) {
        res.status(404).json({ error: 'User not found or no changes provided' });
        return;
      }
      res.json({
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          mobile: updatedUser.mobile,
          role: updatedUser.role,
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Logout (client-side token removal)
  static async logout(req: AuthRequest, res: Response): Promise<void> {
    res.json({ message: 'Logout successful' });
  }
}
