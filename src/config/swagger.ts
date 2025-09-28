import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'CS Compass API',
    version: '1.0.0',
    description: 'A comprehensive PDF marketplace API for students and educators',
    contact: {
      name: 'CS Compass Team',
      email: 'support@cscompass.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url:
        process.env.NODE_ENV === 'production'
          ? process.env.SERVER_URL
          : 'http://localhost:3000',
      description:
        process.env.NODE_ENV === 'production'
          ? 'Production server'
          : 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Category: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique category identifier',
          },
          name: {
            type: 'string',
            description: 'Category name',
          },
          description: {
            type: 'string',
            description: 'Category description',
          },
          parent_id: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Parent category ID (null for top-level categories)',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Category creation timestamp',
          },
        },
        required: ['id', 'name', 'created_at'],
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique user identifier',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
          },
          mobile: {
            type: 'string',
            pattern: '^\\+[1-9]\\d{1,14}$',
            description: 'User mobile number in international format',
          },
          is_verified: {
            type: 'boolean',
            description: 'Whether the user email/mobile is verified',
          },
          role: {
            type: 'string',
            enum: ['student', 'admin'],
            description: 'User role',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'User creation timestamp',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'User last update timestamp',
          },
        },
        required: ['id', 'email', 'mobile', 'is_verified', 'role', 'created_at', 'updated_at'],
      },
      PDF: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique PDF identifier',
          },
          title: {
            type: 'string',
            description: 'PDF title',
          },
          description: {
            type: 'string',
            description: 'PDF description',
          },
          course_id: {
            type: 'string',
            format: 'uuid',
            description: 'Course ID (references Course)',
          },
          price: {
            type: 'number',
            format: 'float',
            minimum: 0,
            description: 'PDF price in INR',
          },
          file_url: {
            type: 'string',
            format: 'uri',
            description: 'PDF file URL',
          },
          thumbnail_url: {
            type: 'string',
            format: 'uri',
            description: 'PDF thumbnail URL',
          },
          file_size: {
            type: 'integer',
            minimum: 0,
            description: 'PDF file size in bytes',
          },
          is_active: {
            type: 'boolean',
            description: 'Whether the PDF is active for purchase',
          },
          uploaded_by: {
            type: 'string',
            format: 'uuid',
            description: 'User ID who uploaded the PDF',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'PDF creation timestamp',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'PDF last update timestamp',
          },
        },
        required: ['id', 'title', 'description', 'course_id', 'price', 'file_url', 'file_size', 'is_active', 'uploaded_by', 'created_at', 'updated_at'],
      },
      Video: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Unique video identifier' },
          course_id: { type: 'string', format: 'uuid', description: 'Course ID (references Course)' },
          title: { type: 'string', description: 'Video title' },
          video_url: { type: 'string', format: 'uri', description: 'Video URL' },
          description: { type: 'string', description: 'Video description' },
          is_active: { type: 'boolean', description: 'Whether the video is active' },
          created_at: { type: 'string', format: 'date-time', description: 'Video creation timestamp' },
          updated_at: { type: 'string', format: 'date-time', description: 'Video last update timestamp' },
        },
        required: ['id', 'course_id', 'title', 'video_url', 'is_active', 'created_at', 'updated_at'],
      },
      Course: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Unique course identifier' },
          name: { type: 'string', description: 'Course name' },
          description: { type: 'string', description: 'Course description' },
          category_id: { type: 'string', format: 'uuid', description: 'Category ID (references Category)' },
          aboutCreator: { type: 'string', description: 'About the creator' },
          price: { type: 'number', format: 'float', minimum: 0, description: 'Course price in INR' },
          discount: { type: 'number', format: 'float', description: 'Discount amount' },
          offer: { type: 'object', description: 'Offer details' },
          expiry: { type: 'string', format: 'date-time', description: 'Course expiry date' },
          createdBy: { type: 'string', format: 'uuid', description: 'User ID who created the course' },
          createdAt: { type: 'string', format: 'date-time', description: 'Course creation timestamp' },
          updatedAt: { type: 'string', format: 'date-time', description: 'Course last update timestamp' },
          pdfs: { type: 'array', items: { $ref: '#/components/schemas/PDF' }, description: 'PDFs in this course' },
          videos: { type: 'array', items: { $ref: '#/components/schemas/Video' }, description: 'Videos in this course' },
        },
        required: ['id', 'name', 'description', 'category_id', 'aboutCreator', 'price', 'createdBy', 'createdAt', 'updatedAt'],
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message',
          },
          message: {
            type: 'string',
            description: 'Detailed error message',
          },
          status: {
            type: 'integer',
            description: 'HTTP status code',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Error timestamp',
          },
        },
        required: ['error', 'status', 'timestamp'],
      },
      Success: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Success status',
          },
          message: {
            type: 'string',
            description: 'Success message',
          },
          data: {
            type: 'object',
            description: 'Response data',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Response timestamp',
          },
        },
        required: ['success', 'timestamp'],
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Paths to files containing OpenAPI definitions
};

export const swaggerSpec = swaggerJsdoc(options);
