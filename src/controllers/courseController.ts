// ...existing code...
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import CourseModel from '../models/Course';
import UserCourseModel from '../models/UserCourse';
import PaymentTransactionModel from '../models/PaymentTransaction';
import { ResponseHelper } from '../utils/response';
import pool from '../config/database';
import PayUService from '../services/payu';
import logger from '../config/logger';
import { cleanupBeforePayment } from '../utils/cleanup';

import { Course, PayUPaymentResponse } from '../types';

class CourseController {

  async createCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.validationError(res, JSON.stringify(errors.array()));
      }
      // @ts-ignore
      const user = req.user || { id: req.body.createdBy };
      const { name, description, category_id, aboutCreator, price, discount, offer, expiry } = req.body;
      if (!category_id) {
        return ResponseHelper.validationError(res, 'category_id is required');
      }
      const course: Course = {
        name,
        description,
        category_id,
        aboutCreator,
        price,
        discount,
        offer,
        expiry,
        createdBy: user.id
      };
      const created = await CourseModel.createCourse(course);
      return ResponseHelper.success(res, created, 'Course created successfully');
    } catch (err) {
      return next(err);
    }
  }

  async getCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const course = await CourseModel.getCourseById(id);
      if (!course) return ResponseHelper.notFound(res, 'Course not found');
      
      // Check if user is authenticated and has purchased this course
      // @ts-ignore
      const user = req.user;
      let isPurchased = false;
      
      if (user && user.id) {
        isPurchased = await UserCourseModel.hasAccess(user.id, id);
      }
      
      // Fetch PDFs and videos for this course
      const [pdfs, videos] = await Promise.all([
        (await import('../models/PDF')).PDFModel.findAll(100, 0, id),
        (await import('../models/Video')).default.findByCourseId(id)
      ]);
      return ResponseHelper.success(res, { ...course, pdfs, videos, isPurchased });
    } catch (err) {
      return next(err);
    }
  }

  async getAllCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const courses = await CourseModel.getAllCourses();
      // For each course, fetch PDFs and videos
      const results = await Promise.all(courses.map(async (course: any) => {
        const [pdfs, videos] = await Promise.all([
          (await import('../models/PDF')).PDFModel.findAll(100, 0, course.id),
          (await import('../models/Video')).default.findByCourseId(course.id)
        ]);
        return { ...course, pdfs, videos };
      }));
      return ResponseHelper.success(res, results);
    } catch (err) {
      return next(err);
    }
  }

  async updateCourse(req: Request, res: Response, next: NextFunction) {
    // Implement as needed
    return ResponseHelper.error(res, 'Not implemented', 501);
  }

  async deleteCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Get course to verify it exists
      const course = await CourseModel.getCourseById(id);
      if (!course) return ResponseHelper.notFound(res, 'Course not found');

      // Check if course is already deactivated
      if (course.is_active === false) {
        return ResponseHelper.error(res,
          'Course is already deactivated. Use the reactivate endpoint to restore it.',
          400
        );
      }

      // Check for active purchases - if any exist, deactivate instead of delete
      const purchasesQuery = await pool.query(
        `SELECT COUNT(*) FROM user_courses
         WHERE course_id = $1 AND status = 'completed'`,
        [id]
      );
      const purchaseCount = parseInt(purchasesQuery.rows[0].count);

      // Check for pending payments
      const pendingPaymentsQuery = await pool.query(
        `SELECT COUNT(*) FROM payment_transactions
         WHERE course_id = $1 AND status IN ('initiated', 'pending')`,
        [id]
      );
      const pendingCount = parseInt(pendingPaymentsQuery.rows[0].count);

      // If there are purchases or pending payments, deactivate instead of delete
      if (purchaseCount > 0 || pendingCount > 0) {
        const deactivatedCourse = await CourseModel.deactivateCourse(id);

        logger.info('Course deactivated instead of deleted', {
          courseId: id,
          courseName: course.name,
          purchaseCount,
          pendingPaymentCount: pendingCount,
        });

        return ResponseHelper.success(res, {
          message: `Course deactivated successfully. ${purchaseCount} user(s) have purchased this course and ${pendingCount} payment(s) are pending. The course is now hidden from public listings but existing users retain access.`,
          course: deactivatedCourse,
          action: 'deactivated',
          reason: purchaseCount > 0 ? 'active_purchases' : 'pending_payments',
          stats: {
            purchases: purchaseCount,
            pendingPayments: pendingCount
          }
        });
      }

      // If no purchases or pending payments, proceed with actual deletion
      // This is a permanent operation and should be used with caution

      // Delete thumbnail file if exists
      if (course.thumbnail_url) {
        const imageProcessor = (await import('../services/imageProcessor')).default;
        const path = await import('path');
        const thumbnailPath = path.resolve(course.thumbnail_url);
        await imageProcessor.deleteImage(thumbnailPath);
      }

      // Delete all PDFs and their thumbnails associated with this course
      const { PDFModel } = await import('../models/PDF');
      const pdfs = await PDFModel.findAll(1000, 0, id);

      const fs = await import('fs/promises');
      const path = await import('path');

      for (const pdf of pdfs) {
        // Delete PDF file
        try {
          const pdfFilePath = path.resolve(pdf.file_url);
          await fs.unlink(pdfFilePath);
        } catch (e) {
          logger.warn(`Failed to delete PDF file: ${e}`);
        }

        // Delete PDF thumbnail
        if (pdf.thumbnail_url) {
          try {
            const thumbnailPath = path.resolve(pdf.thumbnail_url);
            await fs.unlink(thumbnailPath);
          } catch (e) {
            logger.warn(`Failed to delete PDF thumbnail: ${e}`);
          }
        }

        // Delete PDF from database
        await PDFModel.delete(pdf.id);
      }

      // Delete all videos associated with this course
      const VideoModel = (await import('../models/Video')).default;
      const videos = await VideoModel.findByCourseId(id);

      for (const video of videos) {
        await VideoModel.delete(video.id);
      }

      // Delete course from database
      await pool.query('DELETE FROM courses WHERE id = $1', [id]);

      logger.info('Course permanently deleted', {
        courseId: id,
        courseName: course.name,
      });

      return ResponseHelper.success(res, {
        message: 'Course and all associated content permanently deleted',
        courseId: id,
        action: 'deleted'
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Initiate payment for course purchase
   * This creates a payment transaction and returns PayU payment parameters
   */
  async purchaseCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.validationError(res, JSON.stringify(errors.array()));
      }

      // Cleanup old transactions before initiating new payment (non-blocking)
      cleanupBeforePayment().catch(err => {
        logger.warn('Transaction cleanup failed (non-critical)', { error: err });
      });

      // Check if PayU is configured
      if (!PayUService.isEnabled()) {
        return ResponseHelper.error(
          res,
          'Payment service is not configured. Please contact administrator.',
          503
        );
      }

      // @ts-ignore
      const user = req.user || { id: req.body.userId };
      const { courseId } = req.body;

      // Validate course exists
      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        return ResponseHelper.notFound(res, 'Course not found');
      }

      // Check if course is active
      if (course.is_active === false) {
        return ResponseHelper.error(res, 'This course is not available for purchase at this time.', 400);
      }

      // Check if course is free
      if (course.price === 0) {
        return ResponseHelper.error(res, 'This course is free. No payment required.', 400);
      }

      // Calculate final amount (apply discount if available)
      let finalAmount: number = Number(course.price);
      if (course.discount && course.discount > 0) {
        finalAmount = course.price - (course.price * course.discount / 100);
      }
      console.log('Final amount: ', finalAmount, typeof finalAmount, course.price, typeof course.price);

      // Check if user already has an active purchase
      const hasAccess = await UserCourseModel.hasAccess(user.id, courseId);
      if (hasAccess) {
        return ResponseHelper.error(res, 'You already have access to this course', 400);
      }

      // Generate unique transaction ID and idempotency key
      const timestamp = Date.now();
      const transactionId = PayUService.generateTransactionId();
      const idempotencyKey = PayUService.generateIdempotencyKey(user.id, courseId, timestamp);

      // Check for duplicate transaction (idempotency)
      const existingTransaction = await PaymentTransactionModel.findByIdempotencyKey(idempotencyKey);
      if (existingTransaction) {
        // Return existing transaction if it's still pending or successful
        if (existingTransaction.status === 'success') {
          return ResponseHelper.error(res, 'Payment already completed for this course', 400);
        }
        if (existingTransaction.status === 'initiated' || existingTransaction.status === 'pending') {
          // Return existing payment details
          const config = PayUService.getConfig();
          const paymentParams = PayUService.createPaymentRequest({
            transactionId: existingTransaction.transaction_id,
            amount: existingTransaction.amount,
            productInfo: course.name,
            firstName: user.email?.split('@')[0] || 'Student',
            email: user.email || `${user.id}@cscompass.com`,
            phone: user.mobile || '0000000000',
            userId: user.id,
            courseId: courseId,
          });

          return ResponseHelper.success(res, {
            transactionId: existingTransaction.transaction_id,
            paymentUrl: PayUService.getPaymentUrl(),
            paymentParams,
            merchantKey: config?.merchantKey,
          }, 'Payment already initiated. Please complete the payment.');
        }
      }

      // Get user details
      const { UserModel } = await import('../models/User');
      const dbUser = await UserModel.findById(user.id);

      const userEmail = dbUser?.email || user.email || `${user.id}@cscompass.com`;
      const userPhone = dbUser?.mobile || user.mobile || '0000000000';
      const userName = userEmail.split('@')[0] || 'Student';

      // Create payment request
      const paymentParams = PayUService.createPaymentRequest({
        transactionId,
        amount: finalAmount,
        productInfo: course.name,
        firstName: userName,
        email: userEmail,
        phone: userPhone,
        userId: user.id,
        courseId: courseId,
      });

      // Get client IP and user agent
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
                       req.socket.remoteAddress ||
                       'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // Create payment transaction record
      await PaymentTransactionModel.create({
        transaction_id: transactionId,
        user_id: user.id,
        course_id: courseId,
        amount: finalAmount,
        currency: 'INR',
        status: 'initiated',
        hash: paymentParams.hash,
        ip_address: ipAddress,
        user_agent: userAgent,
        idempotency_key: idempotencyKey,
        initiated_at: new Date(),
      });

      logger.info('Payment initiated', {
        transactionId,
        userId: user.id,
        courseId,
        amount: finalAmount,
        ipAddress,
      });

      const config = PayUService.getConfig();

      // Return payment parameters to client
      return ResponseHelper.success(res, {
        transactionId,
        paymentUrl: PayUService.getPaymentUrl(),
        paymentParams,
        merchantKey: config?.merchantKey,
        course: {
          id: course.id,
          name: course.name,
          price: course.price,
          discount: course.discount,
          finalAmount,
        },
      }, 'Payment initiated successfully. Please complete the payment.');

    } catch (err) {
      logger.error('Error initiating payment', {
        error: err instanceof Error ? err.message : 'Unknown error',
        userId: (req as any).user?.id,
        courseId: req.body.courseId,
      });
      return next(err);
    }
  }

  /**
   * Handle PayU payment webhook/callback
   * This endpoint receives payment status from PayU and updates transaction
   */
  async handlePaymentCallback(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('Payment callback received', {
        body: req.body,
        method: req.method,
      });

      // PayU sends data as form-urlencoded
      const payuResponse: PayUPaymentResponse = req.body;

      // Validate required fields
      if (!payuResponse.txnid || !payuResponse.status || !payuResponse.hash) {
        logger.error('Invalid PayU callback - missing required fields', { payuResponse });
        return ResponseHelper.error(res, 'Invalid payment callback data', 400);
      }

      // Find transaction
      const transaction = await PaymentTransactionModel.findByTransactionId(payuResponse.txnid);
      if (!transaction) {
        logger.error('Transaction not found for callback', { txnid: payuResponse.txnid });
        return ResponseHelper.notFound(res, 'Transaction not found');
      }

      // Prevent duplicate processing
      if (transaction.status === 'success') {
        logger.warn('Transaction already processed as successful', { txnid: payuResponse.txnid });
        return ResponseHelper.success(res, { status: 'already_processed' }, 'Payment already processed');
      }

      // Validate payment response
      const validation = PayUService.validatePaymentResponse(payuResponse);

      if (!validation.isValid) {
        logger.error('Payment validation failed', {
          txnid: payuResponse.txnid,
          error: validation.error,
        });

        // Update transaction as failed
        await PaymentTransactionModel.updateStatus(
          transaction.transaction_id,
          'failed',
          validation.error || 'Payment verification failed'
        );

        return ResponseHelper.error(res, validation.error || 'Payment verification failed', 400);
      }

      // Update transaction with PayU response and create user_course entry in a transaction
      // This ensures data consistency between payment_transactions and user_courses tables
      if (validation.status === 'success') {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Update payment transaction
          await PaymentTransactionModel.updateWithPayUResponse(
            transaction.transaction_id,
            payuResponse,
            validation.status
          );

          // Calculate expiry date (if course has expiry)
          const course = await CourseModel.getCourseById(transaction.course_id);
          let expiryDate: Date | undefined;

          if (course?.expiry) {
            expiryDate = new Date(course.expiry);
          }

          // Create user_course entry
          await UserCourseModel.purchaseCourse(
            transaction.user_id,
            transaction.course_id,
            transaction.amount,
            payuResponse.mihpayid,
            expiryDate
          );

          await client.query('COMMIT');

          logger.info('Course purchase completed successfully', {
            transactionId: transaction.transaction_id,
            userId: transaction.user_id,
            courseId: transaction.course_id,
            payuPaymentId: payuResponse.mihpayid,
          });

        } catch (error) {
          await client.query('ROLLBACK');

          logger.error('Error processing successful payment - TRANSACTION ROLLED BACK', {
            error: error instanceof Error ? error.message : 'Unknown error',
            transactionId: transaction.transaction_id,
            stack: error instanceof Error ? error.stack : undefined,
          });

          // Return error response since transaction was rolled back
          return ResponseHelper.error(res,
            'Payment successful but failed to grant course access. Please contact support with your transaction ID.',
            500,
            { transactionId: transaction.transaction_id }
          );
        } finally {
          client.release();
        }
      } else {
        // For non-successful payments, just update the transaction status
        await PaymentTransactionModel.updateWithPayUResponse(
          transaction.transaction_id,
          payuResponse,
          validation.status
        );
      }

      logger.info('Payment callback processed', {
        transactionId: transaction.transaction_id,
        status: validation.status,
        payuPaymentId: payuResponse.mihpayid,
      });

      // Return success response
      return ResponseHelper.success(res, {
        transactionId: transaction.transaction_id,
        status: validation.status,
        payuPaymentId: payuResponse.mihpayid,
      }, 'Payment processed successfully');

    } catch (err) {
      logger.error('Error processing payment callback', {
        error: err instanceof Error ? err.message : 'Unknown error',
        body: req.body,
      });
      return next(err);
    }
  }

  /**
   * Get payment status
   * Allows client to check the status of a payment transaction
   */
  async getPaymentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionId } = req.params;

      // @ts-ignore
      const user = req.user;

      // Find transaction
      const transaction = await PaymentTransactionModel.findByTransactionId(transactionId);

      if (!transaction) {
        return ResponseHelper.notFound(res, 'Transaction not found');
      }

      // Verify user owns this transaction
      if (transaction.user_id !== user.id) {
        return ResponseHelper.error(res, 'Unauthorized access to transaction', 403);
      }

      // Get course details
      const course = await CourseModel.getCourseById(transaction.course_id);

      return ResponseHelper.success(res, {
        transactionId: transaction.transaction_id,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        payuPaymentId: transaction.payu_payment_id,
        course: course ? {
          id: course.id,
          name: course.name,
        } : null,
        initiatedAt: transaction.initiated_at,
        completedAt: transaction.completed_at,
        errorMessage: transaction.error_message,
      });

    } catch (err) {
      logger.error('Error getting payment status', {
        error: err instanceof Error ? err.message : 'Unknown error',
        transactionId: req.params.transactionId,
      });
      return next(err);
    }
  }

  // Get all courses purchased by the user (My Courses)
  async getMyCourses(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const user = req.user || { id: req.body.userId };
      const courses = await UserCourseModel.getUserCourses(user.id);
      return ResponseHelper.success(res, courses);
    } catch (err) {
      return next(err);
    }
  }

  // Download a PDF from a course (checks access and expiry)
  async downloadCoursePDF(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const user = req.user || { id: req.body.userId };
      const { courseId, pdfId } = req.params;

      // Find the PDF and check if it belongs to the course
      const pdf = await (await import('../models/PDF')).PDFModel.findById(pdfId);
      if (!pdf) return ResponseHelper.notFound(res, 'PDF not found');
      if (pdf.course_id !== courseId) {
        return ResponseHelper.error(res, 'PDF not part of this course', 404);
      }

      // Check PDF type and access control
      // Demo PDFs can be accessed without purchase, full PDFs require course access
      if (pdf.pdf_type === 'full') {
        // For full PDFs, check if user has access to the course
        const hasAccess = await UserCourseModel.hasAccess(user.id, courseId);
        if (!hasAccess) {
          return ResponseHelper.error(res, 'No access or course expired. Purchase the course to access full PDFs.', 403);
        }
      }
      // If pdf_type is 'demo', allow access without purchase check
      // Read PDF file (local only for now)
      const fs = await import('fs/promises');
      const path = await import('path');
      // file_url already contains the full path (e.g., "uploads/local/filename.pdf")
      const filePath = path.resolve(pdf.file_url);
      let pdfBuffer;
      try {
        pdfBuffer = await fs.readFile(filePath);
      } catch (e) {
        return ResponseHelper.error(res, 'PDF file not found', 404);
      }
      // Watermark with user mobile (if available)
      let mobile = user.mobile || 'User';
      if (!mobile && user.id) {
        // Try to get user mobile from DB
        const { UserModel } = await import('../models/User');
        const dbUser = await UserModel.findById(user.id);
        if (dbUser) mobile = dbUser.mobile;
      }
      const PDFWatermarkService = (await import('../services/pdfWatermark')).default;
      const watermarked = await PDFWatermarkService.addWatermark(pdfBuffer, mobile);

      // Set proper headers for binary PDF data
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdf.title}.pdf"`);
      res.setHeader('Content-Length', watermarked.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Send buffer directly without encoding to prevent corruption
      return res.end(watermarked);
    } catch (err) {
      return next(err);
    }
  }

  // Serve thumbnail image for a PDF (public access)
  async serveThumbnail(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId, pdfId } = req.params;

      // Verify course exists
      const course = await CourseModel.getCourseById(courseId);
      if (!course) return ResponseHelper.notFound(res, 'Course not found');

      // Find the PDF and check if it belongs to the course
      const pdf = await (await import('../models/PDF')).PDFModel.findById(pdfId);
      if (!pdf) return ResponseHelper.notFound(res, 'PDF not found');
      if (pdf.course_id !== courseId) {
        return ResponseHelper.error(res, 'PDF not part of this course', 404);
      }

      // Check if thumbnail exists
      if (!pdf.thumbnail_url) {
        return ResponseHelper.error(res, 'Thumbnail not available', 404);
      }

      // Read thumbnail file
      const fs = await import('fs/promises');
      const path = await import('path');
      const thumbnailPath = path.resolve(pdf.thumbnail_url);

      let thumbnailBuffer;
      try {
        thumbnailBuffer = await fs.readFile(thumbnailPath);
      } catch (e) {
        return ResponseHelper.error(res, 'Thumbnail file not found', 404);
      }

      // Set proper headers for image
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', thumbnailBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

      return res.end(thumbnailBuffer);
    } catch (err) {
      return next(err);
    }
  }

  // Serve demo/preview PDF (accessible without purchase)
  async servePreviewPDF(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId, pdfId } = req.params;

      // Verify course exists
      const course = await CourseModel.getCourseById(courseId);
      if (!course) return ResponseHelper.notFound(res, 'Course not found');

      // Find the PDF and check if it belongs to the course
      const pdf = await (await import('../models/PDF')).PDFModel.findById(pdfId);
      if (!pdf) return ResponseHelper.notFound(res, 'PDF not found');
      if (pdf.course_id !== courseId) {
        return ResponseHelper.error(res, 'PDF not part of this course', 404);
      }

      // Check if this is a demo PDF
      if (pdf.pdf_type !== 'demo') {
        return ResponseHelper.error(res, 'This PDF is not available for preview. Purchase the course to access.', 403);
      }

      // Read PDF file
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.resolve(pdf.file_url);

      let pdfBuffer;
      try {
        pdfBuffer = await fs.readFile(filePath);
      } catch (e) {
        return ResponseHelper.error(res, 'PDF file not found', 404);
      }

      // Set proper headers for PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${pdf.title}-preview.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

      return res.end(pdfBuffer);
    } catch (err) {
      return next(err);
    }
  }

  // Serve course thumbnail image
  async serveCourseThumbnail(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId } = req.params;

      // Verify course exists
      const course = await CourseModel.getCourseById(courseId);
      if (!course) return ResponseHelper.notFound(res, 'Course not found');

      if (!course.thumbnail_url) {
        return ResponseHelper.notFound(res, 'Course has no thumbnail');
      }

      // Read and serve thumbnail
      const fs = await import('fs/promises');
      const path = await import('path');
      const thumbnailPath = path.resolve(course.thumbnail_url);

      let thumbnailBuffer;
      try {
        thumbnailBuffer = await fs.readFile(thumbnailPath);
      } catch (e) {
        return ResponseHelper.error(res, 'Thumbnail file not found', 404);
      }

      // Set proper headers for image
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Length', thumbnailBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

      return res.end(thumbnailBuffer);
    } catch (err) {
      return next(err);
    }
  }
}
  export const courseController = new CourseController();

