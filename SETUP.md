# CS Compass - Setup Guide

This guide will help you set up the CS Compass PDF marketplace backend from scratch.

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v12 or higher) - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)

## External Services Setup

### 1. Razorpay Setup (Optional)
1. Create a Razorpay account at [razorpay.com](https://razorpay.com)
2. Go to Settings > API Keys
3. Generate API keys and note down:
   - Key ID
   - Key Secret

### 2. Twilio Setup (Optional)
1. Create a Twilio account at [twilio.com](https://twilio.com)
2. Get a phone number for SMS
3. Note down your:
   - Account SID
   - Auth Token
   - Phone number (with country code)

## Installation Steps

### 1. Clone and Setup Project
```bash
# Navigate to your project directory
cd "/Users/vipin/Desktop/CS Compass/CS-Compass"

# Install dependencies
npm install

# Test the setup
npm run test-setup
```

### 2. Environment Configuration
```bash
# Copy environment template
cp env.example .env

# Edit the .env file with your configuration
nano .env
```

Update the `.env` file with your actual values:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cs_compass
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_EXPIRES_IN=7d

# Razorpay Configuration (Optional)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# File Upload Configuration
MAX_FILE_SIZE=50000000
ALLOWED_FILE_TYPES=application/pdf
```

### 3. Database Setup
```bash
# Make sure PostgreSQL is running
sudo service postgresql start  # Linux
brew services start postgresql  # macOS

# Run the database setup script
npm run setup-db

# Or manually:
# createdb cs_compass
# psql -d cs_compass -f database/schema.sql
```

### 4. Start the Application
```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

## Verification

### 1. Check Server Status
Visit `http://localhost:3000` in your browser. You should see:
```json
{
  "message": "CS Compass API",
  "version": "1.0.0",
  "endpoints": {
    "auth": "/api/auth",
    "pdfs": "/api/pdfs",
    "payments": "/api/payments",
    "admin": "/api/admin"
  }
}
```

### 2. Test Health Endpoint
Visit `http://localhost:3000/health` to check server health.

### 3. Test Authentication
```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "mobile": "+1234567890",
    "password": "Test123!@#"
  }'

# Send OTP
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "+1234567890"
  }'
```

## Default Admin Account

After running the database setup, you'll have a default admin account:
- **Email**: admin@cscompass.com
- **Password**: admin123
- **Mobile**: +1234567890

⚠️ **Important**: Change the default password after first login!

## API Testing

### Using curl
```bash
# Get all PDFs
curl http://localhost:3000/api/pdfs

# Get PDF by ID
curl http://localhost:3000/api/pdfs/{pdf-id}

# Login and get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@cscompass.com", "password": "admin123"}' | \
  jq -r '.token')

# Use token for authenticated requests
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/auth/profile
```

### Using Postman
1. Import the API collection (create one based on the endpoints)
2. Set up environment variables for base URL and tokens
3. Test all endpoints systematically

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Check database credentials in `.env`
   - Verify database exists: `psql -l | grep cs_compass`

2. **TypeScript Compilation Errors**
   - Run `npm run test-setup` to check for issues
   - Ensure all dependencies are installed: `npm install`

3. **File Upload Errors**
   - Ensure uploads/local/ and uploads/thumbnails/ directories exist
   - Check file permissions on upload directories
   - Verify disk space is available

4. **Razorpay Payment Errors**
   - Verify API keys are correct
   - Check if test mode is enabled
   - Ensure webhook URLs are configured

5. **Twilio SMS Errors**
   - Verify account credentials
   - Check phone number format (include country code)
   - Ensure account has sufficient balance

### Logs and Debugging

```bash
# View application logs
npm run dev

# Check database connection
psql -d cs_compass -c "SELECT version();"

# Verify upload directories exist
ls -la uploads/local uploads/thumbnails
```

## Production Deployment

### 1. Environment Setup
- Set `NODE_ENV=production`
- Use strong, unique secrets
- Configure production database
- Set up proper logging

### 2. Security Considerations
- Use HTTPS in production
- Set up proper CORS policies
- Implement rate limiting
- Regular security updates

### 3. Monitoring
- Set up application monitoring
- Database performance monitoring
- Error tracking and logging
- Uptime monitoring

## Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Review the logs for error messages
3. Verify all external services are properly configured
4. Ensure all environment variables are set correctly

For additional help, create an issue in the repository or contact the development team.

## Next Steps

After successful setup:

1. **Frontend Development**: Create a React/Vue.js frontend
2. **Mobile App**: Develop mobile applications
3. **Analytics**: Add user analytics and reporting
4. **Testing**: Implement comprehensive test suite
5. **Documentation**: Create API documentation with Swagger

---

**Happy Coding! 🚀**
