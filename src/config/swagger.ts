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
          category_id: {
            type: 'string',
            format: 'uuid',
            description: 'Category ID (references Category)',
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
        required: ['id', 'title', 'description', 'category_id', 'price', 'file_url', 'file_size', 'is_active', 'uploaded_by', 'created_at', 'updated_at'],
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
