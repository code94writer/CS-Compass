# Copilot Instructions for CS Compass

## Project Overview
- **CS Compass** is a Node.js/TypeScript backend for a PDF marketplace (students/admins) with PostgreSQL, AWS S3 (optional), Razorpay, and Twilio integrations.
- Main features: authentication (JWT), PDF upload/purchase/download (with watermarking), payment, admin dashboard, and category management.

## Architecture & Key Patterns
- **Entry point:** `src/index.ts` (Express app, middleware, routes, error handling, Swagger docs)
- **Routes:**
  - `src/routes/` (auth, pdf, payment, admin)
  - Each route uses validation, authentication, and controller classes
- **Controllers:**
  - `src/controllers/` (business logic, calls models/services)
- **Models:**
  - `src/models/` (database access via `pg` pool, one class per table)
- **Services:**
  - `src/services/` (external integrations: S3, Razorpay, Twilio, PDF watermarking)
  - S3, Razorpay, Twilio are stubbed/disabled by default for local/dev
- **Middleware:**
  - `src/middleware/` (auth, validation, error handling)
- **Utils:**
  - `src/utils/` (auth helpers, response formatting)
- **Types:**
  - `src/types/` (all shared TypeScript types)

## Developer Workflows
- **Install:** `npm install`
- **Setup check:** `npm run test-setup` (runs `scripts/test-setup.js`)
- **Database:**
  - Setup: `npm run setup-db` (runs `scripts/setup-db.sh`)
  - Schema: `database/schema.sql`
- **Dev server:** `npm run dev` (nodemon, hot reload)
- **Build:** `npm run build` (outputs to `dist/`)
- **Start:** `npm start` (runs built JS)
- **Environment:** Copy `env.example` to `.env` and fill in secrets
- **API docs:** Swagger at `/api-docs` (see `src/config/swagger.ts`)

## Project-Specific Conventions
- **Validation:** All input validated with `express-validator` in routes, errors handled by middleware
- **Responses:** Use `ResponseHelper` (`src/utils/response.ts`) for all API responses (success, error, validation, not found, etc.)
- **Auth:** JWT required for most endpoints; admin routes require `requireAdmin` middleware
- **File Uploads:** Uses Multer; S3 is mocked/disabled by default (see `src/services/s3.ts`)
- **Payments:** Razorpay integration is stubbed/disabled by default (see `src/services/razorpay.ts`)
- **SMS/OTP:** Twilio integration is stubbed/disabled by default (see `src/services/twilio.ts`)
- **PDF Watermarking:** All downloads are watermarked with user mobile (see `src/services/pdfWatermark.ts`)
- **Logging:** Uses Winston (`src/config/logger.ts`), logs to `logs/` directory
- **Error Handling:** Centralized in Express error handler (see `src/index.ts`)

## Integration & External Services
- **S3, Razorpay, Twilio:**
  - Disabled by default for local/dev; enable by providing credentials in `.env`
  - All service methods log warnings if not configured
- **Database:** PostgreSQL, connection via `src/config/database.ts`
- **Swagger:** API docs auto-generated from route/controller JSDoc

## Examples & References
- See `src/routes/pdf.ts` for file upload, validation, and admin-only access
- See `src/controllers/pdfController.ts` for PDF upload/download logic and watermarking
- See `src/models/User.ts` for DB access pattern
- See `src/utils/auth.ts` for password/JWT helpers
- See `SETUP.md` for full setup, troubleshooting, and workflow details

## Special Notes
- **Do not assume S3, Razorpay, or Twilio are enabled unless `.env` is configured.**
- **Always use project response helpers and validation patterns.**
- **All new endpoints should be documented with Swagger JSDoc.**
- **Default admin: admin@cscompass.com / admin123 (see `database/schema.sql`)**
