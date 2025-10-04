
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { UserModel } from '../models/User';
import { UserSessionModel } from '../models/UserSession';
import { OTPModel } from '../models/OTP';
import { AuthUtils } from '../utils/auth';
import TwilioService from '../services/twilio';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  // ...existing code...

  // Send OTP for login
  static async sendOtp(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const { mobile } = req.body;
      // Check if user exists, if not, create
      let user = await UserModel.findByMobile(mobile);
      if (!user) {
        // Auto-register user with minimal info
        user = await UserModel.create({
          email: '',
          mobile,
          password: '',
          is_verified: false,
          role: 'student',
        });
      }
      // Rate limit: max 5 OTPs in 5 minutes
      const recentCount = await OTPModel.getRecentOTPCount(mobile, 5);
      if (recentCount >= 5) {
        res.status(429).json({ error: 'Too many OTP requests. Please try again later.' });
        return;
      }
      const otp = AuthUtils.generateOTP();
      await OTPModel.create({
        mobile,
        code: otp,
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
        is_used: false,
      });
      await TwilioService.sendOTP(mobile, otp);
      res.json({ message: 'OTP sent successfully' });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Verify OTP and login
  static async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const { mobile, code } = req.body;
      const user = await UserModel.findByMobile(mobile);
      if (!user) {
        res.status(404).json({ error: 'User with this mobile number does not exist' });
        return;
      }
      const otpRecord = await OTPModel.findByMobileAndCode(mobile, code);
      if (!otpRecord) {
        res.status(400).json({ error: 'Invalid or expired OTP' });
        return;
      }
      await OTPModel.markAsUsed(otpRecord.id);
      // Optionally, mark user as verified
      await UserModel.updateVerificationStatus(user.id, true);
      // Generate JWT token
      const token = AuthUtils.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });
      // Store session token for single-device login
      await UserSessionModel.upsertSession(user.id, token);
      res.json({
        message: 'OTP verified successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
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
      console.log(user);

      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }


      // Only admins can login with password, users (students) must use OTP
      if (user.role === 'admin') {
        if (!user.password) {
          res.status(401).json({ error: 'Admin account does not have a password set' });
          return;
        }
        // Verify password
        const isPasswordValid = await AuthUtils.comparePassword(password, user.password);
        console.log(password, user.password, isPasswordValid);
        if (!isPasswordValid) {
          res.status(401).json({ error: 'Invalid credentials' });
          return;
        }
      } else {
        // For students/users, password login is disabled
        res.status(401).json({ error: 'Please use OTP login for this account' });
        return;
      }

      // Check if user is verified (disabled for local/dev)
      // if (!user.is_verified) {
      //   res.status(401).json({ error: 'Please verify your mobile number first' });
      //   return;
      // }

      const token = AuthUtils.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });
      // Store session token for single-device login
      await UserSessionModel.upsertSession(user.id, token);
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

  // Request admin password update - sends OTP
  static async requestAdminPasswordUpdate(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { emailOrPhone } = req.body;

      // Determine if input is email or phone
      const isEmail = emailOrPhone.includes('@');
      let user: any = null;

      if (isEmail) {
        user = await UserModel.findByEmail(emailOrPhone);
      } else {
        user = await UserModel.findByMobile(emailOrPhone);
      }

      if (!user) {
        // Don't reveal if user exists or not for security
        res.status(200).json({ message: 'If an admin account exists with this contact, an OTP has been sent.' });
        return;
      }

      // Only allow admins to update password via this endpoint
      if (user.role !== 'admin') {
        res.status(200).json({ message: 'If an admin account exists with this contact, an OTP has been sent.' });
        return;
      }

      // Check if admin has a mobile number
      if (!user.mobile) {
        res.status(400).json({ error: 'Admin account does not have a mobile number registered. Please contact support.' });
        return;
      }

      // Rate limit: max 5 OTPs in 5 minutes
      const recentCount = await OTPModel.getRecentOTPCount(user.mobile, 5);
      if (recentCount >= 5) {
        res.status(429).json({ error: 'Too many OTP requests. Please try again later.' });
        return;
      }

      // Generate and send OTP
      const otp = AuthUtils.generateOTP();
      await OTPModel.create({
        mobile: user.mobile,
        code: otp,
        expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        is_used: false,
      });

      await TwilioService.sendOTP(user.mobile, otp);

      res.json({
        message: 'OTP sent successfully to your registered mobile number',
        mobile: user.mobile // Return masked mobile for confirmation
      });
    } catch (error) {
      console.error('Request admin password update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update admin password with OTP verification
  static async updateAdminPassword(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { emailOrPhone, otp, newPassword } = req.body;

      // Determine if input is email or phone
      const isEmail = emailOrPhone.includes('@');
      let user: any = null;

      if (isEmail) {
        user = await UserModel.findByEmail(emailOrPhone);
      } else {
        user = await UserModel.findByMobile(emailOrPhone);
      }

      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Only allow admins to update password via this endpoint
      if (user.role !== 'admin') {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Check if admin has a mobile number
      if (!user.mobile) {
        res.status(400).json({ error: 'Admin account does not have a mobile number registered' });
        return;
      }

      // Verify OTP
      const otpRecord = await OTPModel.findByMobileAndCode(user.mobile, otp);
      if (!otpRecord) {
        res.status(400).json({ error: 'Invalid or expired OTP' });
        return;
      }

      // Validate new password
      const passwordValidation = AuthUtils.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          error: 'Password validation failed',
          details: passwordValidation.errors
        });
        return;
      }

      // Hash the new password
      const hashedPassword = await AuthUtils.hashPassword(newPassword);

      // Update password in database
      await UserModel.updatePassword(user.id, hashedPassword);

      // Mark OTP as used
      await OTPModel.markAsUsed(otpRecord.id);

      res.json({
        message: 'Password updated successfully. You can now login with your new password.'
      });
    } catch (error) {
      console.error('Update admin password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
