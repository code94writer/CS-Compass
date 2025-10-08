import crypto from 'crypto';
import logger from '../config/logger';
import {
  PayUConfig,
  PayUPaymentRequest,
  PayUPaymentResponse,
  PaymentStatus,
} from '../types';

/**
 * PayU Payment Gateway Service
 * Handles payment initiation, hash generation, and webhook verification
 */
class PayUService {
  private config: PayUConfig | null = null;
  private isConfigured: boolean = false;

  constructor() {
    const merchantKey = process.env.PAYU_MERCHANT_KEY;
    const merchantSalt = process.env.PAYU_SALT;
    const baseUrl = process.env.PAYU_BASE_URL;
    const successUrl = process.env.PAYU_SUCCESS_URL;
    const failureUrl = process.env.PAYU_FAILURE_URL;
    const cancelUrl = process.env.PAYU_CANCEL_URL;

    if (merchantKey && merchantSalt && baseUrl) {
      this.config = {
        merchantKey,
        merchantSalt,
        baseUrl,
        successUrl: successUrl || `${process.env.SERVER_URL || 'http://localhost:3000'}/api/courses/payment/success`,
        failureUrl: failureUrl || `${process.env.SERVER_URL || 'http://localhost:3000'}/api/courses/payment/failure`,
        cancelUrl: cancelUrl || `${process.env.SERVER_URL || 'http://localhost:3000'}/api/courses/payment/cancel`,
      };
      this.isConfigured = true;
      logger.info('PayU service enabled. Payment features are active.');
      console.log('PayU service enabled. Payment features are active.');
    } else {
      this.isConfigured = false;
      logger.warn('PayU service disabled. Payment features will be disabled. Please configure PAYU_MERCHANT_KEY, PAYU_SALT, and PAYU_BASE_URL in environment variables.');
      console.warn('PayU service disabled. Payment features will be disabled.');
    }
  }

  /**
   * Check if PayU service is configured
   */
  isEnabled(): boolean {
    return this.isConfigured;
  }

  /**
   * Get PayU configuration
   */
  getConfig(): PayUConfig | null {
    return this.config;
  }

  /**
   * Generate SHA-512 hash for PayU payment request
   * Hash format: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
   */
  generatePaymentHash(params: {
    txnid: string;
    amount: string;
    productinfo: string;
    firstname: string;
    email: string;
    udf1?: string;
    udf2?: string;
    udf3?: string;
    udf4?: string;
    udf5?: string;
  }): string {
    if (!this.isConfigured || !this.config) {
      throw new Error('PayU service not configured. Please configure payment credentials.');
    }

    const {
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      udf1 = '',
      udf2 = '',
      udf3 = '',
      udf4 = '',
      udf5 = '',
    } = params;

    // PayU hash format
    const hashString = `${this.config.merchantKey}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${this.config.merchantSalt}`;

    logger.debug('Generating PayU hash', { hashString: hashString.replace(this.config.merchantSalt, '***SALT***') });

    const hash = crypto.createHash('sha512').update(hashString).digest('hex');
    return hash;
  }

  /**
   * Verify hash from PayU response
   * Reverse hash format: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
   */
  verifyResponseHash(response: PayUPaymentResponse): boolean {
    if (!this.isConfigured || !this.config) {
      throw new Error('PayU service not configured. Please configure payment credentials.');
    }

    const {
      status,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      udf1 = '',
      udf2 = '',
      udf3 = '',
      udf4 = '',
      udf5 = '',
      hash: receivedHash,
    } = response;

    // Reverse hash format for response verification
    const hashString = `${this.config.merchantSalt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${this.config.merchantKey}`;

    logger.debug('Verifying PayU response hash', { 
      hashString: hashString.replace(this.config.merchantSalt, '***SALT***'),
      receivedHash: receivedHash.substring(0, 20) + '...'
    });

    const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex');

    const isValid = calculatedHash === receivedHash;
    
    if (!isValid) {
      logger.error('PayU hash verification failed', {
        txnid,
        status,
        calculatedHash: calculatedHash.substring(0, 20) + '...',
        receivedHash: receivedHash.substring(0, 20) + '...',
      });
    }

    return isValid;
  }

  /**
   * Create payment request parameters
   */
  createPaymentRequest(params: {
    transactionId: string;
    amount: number;
    productInfo: string;
    firstName: string;
    email: string;
    phone: string;
    userId?: string;
    courseId?: string;
  }): PayUPaymentRequest {
    if (!this.isConfigured || !this.config) {
      throw new Error('PayU service not configured. Please configure payment credentials.');
    }

    const {
      transactionId,
      amount,
      productInfo,
      firstName,
      email,
      phone,
      userId = '',
      courseId = '',
    } = params;

    // Convert amount to string with 2 decimal places
    console.log('Amount string: ', amount, typeof amount);
    const amountStr = amount.toFixed(2);
    console.log('Amount string: ', amountStr);

    // Generate hash
    const hash = this.generatePaymentHash({
      txnid: transactionId,
      amount: amountStr,
      productinfo: productInfo,
      firstname: firstName,
      email,
      udf1: userId,
      udf2: courseId,
    });

    const paymentRequest: PayUPaymentRequest = {
      txnid: transactionId,
      amount: amountStr,
      productinfo: productInfo,
      firstname: firstName,
      email,
      phone,
      surl: this.config.successUrl,
      furl: this.config.failureUrl,
      curl: this.config.cancelUrl,
      udf1: userId,
      udf2: courseId,
      hash,
    };

    logger.info('PayU payment request created', {
      transactionId,
      amount: amountStr,
      email,
      phone,
    });

    return paymentRequest;
  }

  /**
   * Get payment URL for redirection
   */
  getPaymentUrl(): string {
    if (!this.isConfigured || !this.config) {
      throw new Error('PayU service not configured. Please configure payment credentials.');
    }

    return `${this.config.baseUrl}/_payment`;
  }

  /**
   * Map PayU status to internal payment status
   */
  mapPayUStatus(payuStatus: string): PaymentStatus {
    const statusMap: { [key: string]: PaymentStatus } = {
      'success': 'success',
      'pending': 'pending',
      'failed': 'failed',
      'failure': 'failed',
      'cancel': 'cancelled',
      'cancelled': 'cancelled',
      'timeout': 'timeout',
      'dropped': 'cancelled',
      'bounced': 'failed',
      'userCancelled': 'cancelled',
    };

    const normalizedStatus = payuStatus.toLowerCase();
    return statusMap[normalizedStatus] || 'failed';
  }

  /**
   * Validate payment response from PayU
   */
  validatePaymentResponse(response: PayUPaymentResponse): {
    isValid: boolean;
    status: PaymentStatus;
    error?: string;
  } {
    try {
      // Verify hash
      const isHashValid = this.verifyResponseHash(response);
      
      if (!isHashValid) {
        logger.error('PayU payment response hash validation failed', {
          txnid: response.txnid,
          mihpayid: response.mihpayid,
        });
        return {
          isValid: false,
          status: 'failed',
          error: 'Payment verification failed. Invalid signature.',
        };
      }

      // Map status
      const status = this.mapPayUStatus(response.status);

      // Check for errors
      if (response.error || response.error_Message) {
        logger.warn('PayU payment response contains error', {
          txnid: response.txnid,
          error: response.error || response.error_Message,
        });
      }

      logger.info('PayU payment response validated', {
        txnid: response.txnid,
        mihpayid: response.mihpayid,
        status,
      });

      return {
        isValid: true,
        status,
        error: response.error || response.error_Message,
      };
    } catch (error) {
      logger.error('Error validating PayU payment response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        txnid: response.txnid,
      });
      return {
        isValid: false,
        status: 'failed',
        error: 'Payment validation error',
      };
    }
  }

  /**
   * Generate unique transaction ID
   */
  generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `TXN${timestamp}${random}`;
  }

  /**
   * Generate idempotency key for duplicate prevention
   */
  generateIdempotencyKey(userId: string, courseId: string, timestamp: number): string {
    const data = `${userId}|${courseId}|${timestamp}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

export default new PayUService();

