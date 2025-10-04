# CS Compass - PDF Marketplace for Students

A comprehensive web application backend for students to browse, purchase, and download educational PDFs with watermarking functionality.

## Features

### Student Features
- **Authentication**: Login with email/password or OTP via SMS
- **Browse PDFs**: View available PDFs by category with search functionality
- **Purchase PDFs**: Secure payment processing with Razorpay
- **Download PDFs**: Download purchased PDFs with mobile number watermark
- **Purchase History**: View all purchased PDFs

### Admin Features
- **PDF Management**: Upload, update, and delete PDFs
- **User Management**: View and manage user accounts
- **Payment Management**: View transactions and process refunds
- **Category Management**: Create and manage PDF categories
- **Dashboard**: Analytics and statistics

### Security Features
- **PDF Watermarking**: Both visible and invisible watermarks
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Comprehensive request validation
- **File Upload Security**: Secure local file handling

## Tech Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL
- **File Storage**: Local file system
- **Payment**: Razorpay
- **SMS**: Twilio
- **PDF Processing**: pdf-lib
- **Authentication**: JWT

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Razorpay account (optional)
- Twilio account (optional)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cs-compass
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=cs_compass
   DB_USER=postgres
   DB_PASSWORD=your_password

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=7d

   # Razorpay Configuration
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret

   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   ```

4. **Set up the database**
   ```bash
   # Create database
   createdb cs_compass
   
   # Run schema
   psql -d cs_compass -f database/schema.sql
   ```

5. **Build and run**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/send-otp` - Send OTP to mobile
- `POST /api/auth/verify-otp` - Verify OTP
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/logout` - Logout

### PDFs
- `GET /api/pdfs` - Get all PDFs (public)
- `GET /api/pdfs/:id` - Get PDF details (public)
- `GET /api/pdfs/:id/preview` - Get PDF preview (public)
- `POST /api/pdfs/upload` - Upload PDF (admin)
- `PUT /api/pdfs/:id` - Update PDF (admin)
- `DELETE /api/pdfs/:id` - Delete PDF (admin)
- `GET /api/pdfs/:id/download` - Download PDF (authenticated)
- `GET /api/pdfs/user/purchases` - Get user purchases

### Payments
- `POST /api/payments/create-order` - Create payment order
- `POST /api/payments/verify` - Verify payment
- `GET /api/payments/status/:paymentId` - Get payment status
- `GET /api/payments/history` - Get payment history
- `POST /api/payments/refund/:purchaseId` - Refund payment (admin)
- `GET /api/payments/stats` - Get payment statistics (admin)

### Admin
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/pdfs` - Get all PDFs for management
- `GET /api/admin/users` - Get all users
- `GET /api/admin/purchases` - Get all purchases
- `POST /api/admin/categories` - Create category
- `PUT /api/admin/categories/:id` - Update category
- `DELETE /api/admin/categories/:id` - Delete category

## Database Schema

The application uses the following main tables:
- `users` - User accounts and authentication
- `pdfs` - PDF files and metadata
- `purchases` - Purchase transactions
- `categories` - PDF categories
- `otps` - OTP verification codes

## Security Considerations

1. **Authentication**: JWT tokens with expiration
2. **Authorization**: Role-based access control
3. **Input Validation**: Comprehensive validation using express-validator
4. **Rate Limiting**: Protection against brute force attacks
5. **File Security**: Secure file upload and storage
6. **PDF Watermarking**: Protection against unauthorized distribution

## Development

### Project Structure
```
src/
├── config/          # Database and app configuration
├── controllers/     # Request handlers
├── middleware/      # Custom middleware
├── models/          # Database models
├── routes/          # API routes
├── services/        # External service integrations
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── index.ts         # Application entry point
```

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests (to be implemented)

## Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set up production environment variables**

3. **Deploy to your preferred platform** (Heroku, AWS, DigitalOcean, etc.)

4. **Set up database** (PostgreSQL instance)

5. **Ensure upload directories exist** on the server

## Database Migrations (Automated)

- All database schema changes are managed with [node-pg-migrate](https://github.com/salsita/node-pg-migrate).
- Migrations are run automatically on every install and before the server starts (see `prestart` and `postinstall` scripts in `package.json`).
- To create a new migration after a schema change:
  1. Run: `npm run migrate:create <migration-name>`
  2. Edit the generated file in `database/migrations/` to define your schema changes (up/down SQL).
  3. Deploy or start the app—migrations will be applied automatically.
- No manual migration steps are needed for production or development.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support, email support@cscompass.com or create an issue in the repository.
