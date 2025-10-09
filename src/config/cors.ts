import { CorsOptions } from 'cors';
import logger from './logger';

/**
 * CORS Configuration for CS Compass API
 * 
 * This configuration handles Cross-Origin Resource Sharing (CORS) for the application
 * with environment-specific settings for development and production.
 * 
 * Development: Allows all origins for easier testing
 * Production: Restricts to specific whitelisted origins for security
 */

/**
 * PayU Payment Gateway Domains
 * These domains need to be whitelisted for payment callbacks and webhooks
 */
const PAYU_DOMAINS = [
  'https://test.payu.in',        // PayU Test Environment
  'https://secure.payu.in',      // PayU Production Environment
  'https://info.payu.in',        // PayU Information/Webhook Server
  'https://payu.in',             // PayU Main Domain
];

/**
 * Get allowed origins based on environment
 */
const getAllowedOrigins = (): string[] => {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    // Development: Allow common development origins
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:4200',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      ...PAYU_DOMAINS,
    ];
  }

  // Production: Use environment variable or default whitelist
  const envOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || [];
  
  const defaultProductionOrigins = [
    'https://api.civilservicescompass.com',              // Backend API
    'https://cs-compass-app-w5stn.ondigitalocean.app',  // Production Frontend
    'http://localhost:3000',                              // Local development (for testing)
  ];

  // Combine environment origins, default origins, and PayU domains
  const allOrigins = [
    ...new Set([
      ...envOrigins,
      ...defaultProductionOrigins,
      ...PAYU_DOMAINS,
    ])
  ];

  logger.info('CORS allowed origins configured', { 
    environment: process.env.NODE_ENV,
    originsCount: allOrigins.length,
    origins: allOrigins 
  });

  return allOrigins;
};

/**
 * CORS origin validation function
 * Validates incoming requests against the allowed origins list
 */
const corsOriginValidator = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Allow requests with no origin (like mobile apps, Postman, or same-origin)
  if (!origin) {
    logger.debug('CORS: Request with no origin header - allowing');
    return callback(null, true);
  }

  const allowedOrigins = getAllowedOrigins();

  // Development: Allow all origins for easier testing
  if (isDevelopment) {
    logger.debug('CORS: Development mode - allowing origin', { origin });
    return callback(null, true);
  }

  // Production: Check against whitelist
  if (allowedOrigins.includes(origin)) {
    logger.debug('CORS: Origin allowed', { origin });
    return callback(null, true);
  }

  // Log rejected origins for security monitoring
  logger.warn('CORS: Origin rejected', { 
    origin,
    allowedOrigins,
    environment: process.env.NODE_ENV 
  });
  
  return callback(new Error('Not allowed by CORS'));
};

/**
 * CORS Configuration Options
 */
export const corsOptions: CorsOptions = {
  // Origin validation
  origin: corsOriginValidator,

  // Allow credentials (cookies, authorization headers, etc.)
  credentials: true,

  // Allowed HTTP methods
  methods: [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'PATCH',
    'OPTIONS',
    'HEAD',
  ],

  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-CSRF-Token',
    'X-API-Key',
  ],

  // Exposed headers (headers that the client can access)
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'X-Request-Id',
    'X-Response-Time',
  ],

  // Preflight request cache duration (in seconds)
  // 24 hours = 86400 seconds
  maxAge: 86400,

  // Success status for preflight requests
  optionsSuccessStatus: 200,

  // Allow preflight to pass to next handler
  preflightContinue: false,
};

/**
 * Log CORS configuration on startup
 */
export const logCorsConfiguration = (): void => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const allowedOrigins = getAllowedOrigins();

  logger.info('=== CORS Configuration ===', {
    environment: process.env.NODE_ENV || 'development',
    mode: isDevelopment ? 'PERMISSIVE (Development)' : 'RESTRICTIVE (Production)',
    allowedOriginsCount: allowedOrigins.length,
    allowedOrigins: allowedOrigins,
    credentialsEnabled: corsOptions.credentials,
    allowedMethods: corsOptions.methods,
    allowedHeaders: corsOptions.allowedHeaders,
    payuDomainsIncluded: PAYU_DOMAINS,
  });

  if (isDevelopment) {
    logger.warn('⚠️  CORS is in DEVELOPMENT mode - All origins are allowed');
  } else {
    logger.info('✅ CORS is in PRODUCTION mode - Only whitelisted origins are allowed');
  }
};

export default corsOptions;

