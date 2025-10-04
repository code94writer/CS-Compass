import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

// Import configurations
import { swaggerSpec } from './config/swagger';
import logger from './config/logger';

// Import routes
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import courseRoutes from './routes/course';
import categoryRoutes from './routes/category';


// Import utilities
import { ResponseHelper } from './utils/response';

// Ensure DB schema
import { ensureDatabaseSchema } from './utils/ensureSchema';
import { runMigrations } from './utils/runMigrations';
import { ensureLocalFolders } from './services/pdfLocal';

const app = express();
const PORT = process.env.PORT || 3000;

// Run migrations and ensure tables exist before starting server
runMigrations()
  .then(() => ensureDatabaseSchema())
  .catch((err) => {
    logger.error('Failed to run migrations or ensure database schema', err);
    process.exit(1);
  });

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.ALLOWED_ORIGINS?.split(',') || ['https://api.civilservicescompass.com'])
    : ['http://localhost:3000', 'https://api.civilservicescompass.com', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate limiting with different limits for different endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 5 auth requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts',
    message: 'Too many authentication attempts from this IP, please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ 
  limit: process.env.MAX_REQUEST_SIZE || '10mb',
  verify: (req: any, res: any, buf: Buffer) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      res.status(400).json({
        success: false,
        error: 'Invalid JSON',
        message: 'Request body contains invalid JSON',
        timestamp: new Date().toISOString(),
      });
    }
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_REQUEST_SIZE || '10mb' 
}));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    },
  },
}));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'CS Compass API Documentation',
}));

// Health check endpoint
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      database: 'connected', // You can add actual DB health check here
      external_services: {
        twilio: 'disabled',
        razorpay: 'disabled',
      },
    },
  };
  
  logger.info('Health check requested', { healthCheck });
  ResponseHelper.success(res, healthCheck, 'Service is healthy');
});

// API routes with rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/categories', categoryRoutes);

// Root endpoint
app.get('/', (req, res) => {
  const apiInfo = {
    name: 'CS Compass API',
    version: '1.0.0',
    description: 'A comprehensive course marketplace API for students and educators',
    documentation: '/api-docs',
    endpoints: {
      auth: '/api/auth',
      courses: '/api/courses',
      categories: '/api/categories',
      admin: '/api/admin',
      health: '/health',
      docs: '/api-docs',
    },
    status: 'operational',
  };
  
  ResponseHelper.success(res, apiInfo, 'Welcome to CS Compass API');
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Route not found', { 
    method: req.method, 
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  ResponseHelper.notFound(res, `Cannot ${req.method} ${req.originalUrl}`);
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Global error handler', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  
  // Handle specific error types
  if (err.type === 'entity.parse.failed') {
    return ResponseHelper.error(res, 'Invalid JSON', 400, {
      message: 'Request body contains invalid JSON',
    });
  }
  
  if (err.type === 'entity.too.large') {
    return ResponseHelper.error(res, 'Payload too large', 413, {
      message: 'Request body is too large',
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ResponseHelper.unauthorized(res, 'Invalid token');
  }
  
  if (err.name === 'TokenExpiredError') {
    return ResponseHelper.unauthorized(res, 'Token expired');
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    return ResponseHelper.validationError(res, 'Validation failed', err.details);
  }
  
  // Database errors
  if (err.code === '23505') { // PostgreSQL unique violation
    return ResponseHelper.error(res, 'Resource already exists', 409, err);
  }
  
  if (err.code === '23503') { // PostgreSQL foreign key violation
    return ResponseHelper.error(res, 'Referenced resource not found', 400, err);
  }
  
  // Default error response
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  return ResponseHelper.error(res, message, statusCode, 
    process.env.NODE_ENV === 'development' ? err : undefined
  );
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
console.log("new changes")

// Ensure local upload folders exist
ensureLocalFolders();

// Start server
const server = app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  });
  const apidocurl = process.env.NODE_ENV === 'production' ? `${process.env.SERVER_URL}/api-docs` : `http://localhost:${PORT}/api-docs`;
  const healthurl = process.env.NODE_ENV === 'production' ? `${process.env.SERVER_URL}/health` : `http://localhost:${PORT}/health`;
  console.log('----------------------------------------');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 CS Compass API v1.0.0`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📖 API Documentation:  ${apidocurl}`);
  console.log(`🏥 Health Check: ${healthurl}`);
});

export default app;
