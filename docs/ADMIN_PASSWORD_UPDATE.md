# Admin Password Update API Documentation

## Overview

This document describes the implementation of the Admin Password Update API with OTP verification and the resolution of the admin login issue.

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Root Cause Analysis](#root-cause-analysis)
3. [Solution Implementation](#solution-implementation)
4. [API Endpoints](#api-endpoints)
5. [Testing](#testing)
6. [Security Considerations](#security-considerations)

---

## Problem Statement

### Issue 1: Admin Login Failure
The admin login was failing with the following credentials:
- Email: `admin@cscompass.com`
- Password: `admin123`

The `isPasswordValid` check was returning `false` at line 207 in `authController.ts`.

### Issue 2: No Password Update Mechanism
There was no secure way for admins to update their passwords.

---

## Root Cause Analysis

### Investigation Process

1. **Created diagnostic script** (`scripts/test-admin-password.ts`) to test password hashing
2. **Findings**:
   - The password hash in the database: `$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi`
   - This hash did NOT match the password "admin123"
   - `bcrypt.compare('admin123', dbHash)` returned `false`

### Root Cause

The password hash stored in the database was either:
- For a different password
- Corrupted during database initialization
- Generated with incompatible bcrypt settings

### Resolution

Created `scripts/fix-admin-password.ts` to:
1. Generate a correct bcrypt hash for "admin123" using 12 salt rounds
2. Update the database with the correct hash
3. Verify the hash works correctly

**Result**: Admin login now works successfully with credentials:
- Email: `admin@cscompass.com`
- Password: `admin123`

---

## Solution Implementation

### New API Endpoints

Two new endpoints were added to enable secure admin password updates:

#### 1. Request Password Update (Send OTP)
**Endpoint**: `POST /api/auth/admin/request-password-update`

**Purpose**: Initiates the password update process by sending an OTP to the admin's registered mobile number.

**Request Body**:
```json
{
  "emailOrPhone": "admin@cscompass.com"
}
```

**Response** (Success):
```json
{
  "message": "OTP sent successfully to your registered mobile number",
  "mobile": "+1234567890"
}
```

**Features**:
- Validates that the user exists and is an admin
- Rate limiting: Maximum 5 OTP requests in 5 minutes
- Security: Returns generic message if user doesn't exist (prevents user enumeration)
- OTP expires in 5 minutes

#### 2. Update Password with OTP
**Endpoint**: `POST /api/auth/admin/update-password`

**Purpose**: Updates the admin password after OTP verification.

**Request Body**:
```json
{
  "emailOrPhone": "admin@cscompass.com",
  "otp": "123456",
  "newPassword": "NewSecurePass123!"
}
```

**Response** (Success):
```json
{
  "message": "Password updated successfully. You can now login with your new password."
}
```

**Features**:
- Verifies OTP is valid and not expired
- Validates new password meets security requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- Hashes password with bcrypt (12 salt rounds)
- Marks OTP as used after successful update

### Code Changes

#### 1. Controller Methods (`src/controllers/authController.ts`)

Added two new static methods to `AuthController`:
- `requestAdminPasswordUpdate()` - Lines 316-377
- `updateAdminPassword()` - Lines 379-454

#### 2. Validation Rules (`src/routes/auth.ts`)

Added validation schemas:
- `requestAdminPasswordUpdateValidation` - Lines 82-93
- `updateAdminPasswordValidation` - Lines 95-112

#### 3. Routes (`src/routes/auth.ts`)

Added two new routes with Swagger documentation:
- `POST /api/auth/admin/request-password-update` - Line 423
- `POST /api/auth/admin/update-password` - Line 473

### Utility Scripts

Created several utility scripts for testing and maintenance:

1. **`scripts/test-admin-password.ts`**
   - Diagnoses password hash issues
   - Compares database hash with test password
   - Generates correct hash if mismatch found

2. **`scripts/fix-admin-password.ts`**
   - Resets admin password to "admin123"
   - Generates and verifies bcrypt hash
   - Updates database with correct hash

3. **`scripts/get-latest-otp.ts`**
   - Retrieves the latest OTP for testing
   - Shows OTP status (valid/expired/used)

4. **`scripts/test-admin-login.sh`**
   - Automated testing script for all endpoints
   - Tests login with email and phone
   - Tests password update flow

---

## API Endpoints

### Complete Flow Example

#### Step 1: Request Password Update
```bash
curl -X POST "http://localhost:3000/api/auth/admin/request-password-update" \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrPhone": "admin@cscompass.com"
  }'
```

**Response**:
```json
{
  "message": "OTP sent successfully to your registered mobile number",
  "mobile": "+1234567890"
}
```

**Note**: In development, check server console for OTP (Twilio may not be configured).

#### Step 2: Update Password with OTP
```bash
curl -X POST "http://localhost:3000/api/auth/admin/update-password" \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrPhone": "admin@cscompass.com",
    "otp": "123456",
    "newPassword": "NewSecurePass123!"
  }'
```

**Response**:
```json
{
  "message": "Password updated successfully. You can now login with your new password."
}
```

#### Step 3: Login with New Password
```bash
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrPhone": "admin@cscompass.com",
    "password": "NewSecurePass123!"
  }'
```

**Response**:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "0b3db11f-5948-49a9-8b9d-666dd379a677",
    "email": "admin@cscompass.com",
    "mobile": "+1234567890",
    "role": "admin"
  }
}
```

---

## Testing

### Manual Testing Results

All tests passed successfully:

✅ **Test 1**: Admin login with email and password
- Credentials: `admin@cscompass.com` / `admin123`
- Result: Login successful, JWT token received

✅ **Test 2**: Admin login with phone number
- Credentials: `+1234567890` / `admin123`
- Result: Login successful, JWT token received

✅ **Test 3**: Request password update
- Input: `admin@cscompass.com`
- Result: OTP sent successfully

✅ **Test 4**: Update password with OTP
- Input: Valid OTP + new password
- Result: Password updated successfully

✅ **Test 5**: Login with new password
- Result: Login successful with new credentials

✅ **Test 6**: Password validation
- Tested invalid passwords (too short, missing requirements)
- Result: Proper validation errors returned

### Running Tests

```bash
# Test admin password hash
npm run ts-node scripts/test-admin-password.ts

# Fix admin password (reset to admin123)
npm run ts-node scripts/fix-admin-password.ts

# Get latest OTP for testing
npm run ts-node scripts/get-latest-otp.ts

# Run automated API tests (requires server running)
./scripts/test-admin-login.sh
```

---

## Security Considerations

### Implemented Security Measures

1. **OTP Verification**
   - OTPs expire after 5 minutes
   - OTPs are single-use (marked as used after verification)
   - Rate limiting: Maximum 5 OTP requests per 5 minutes

2. **Password Security**
   - Bcrypt hashing with 12 salt rounds
   - Strong password requirements enforced
   - Passwords never logged or exposed in responses

3. **User Enumeration Prevention**
   - Generic messages when user doesn't exist
   - Same response time regardless of user existence

4. **Role-Based Access**
   - Only admin users can use password update endpoint
   - Student users must use OTP login

5. **Input Validation**
   - Email and phone number format validation
   - OTP format validation (6 digits)
   - Password strength validation

### Best Practices

1. **In Production**:
   - Ensure Twilio is properly configured for OTP delivery
   - Use environment variables for sensitive configuration
   - Enable HTTPS for all API endpoints
   - Implement additional rate limiting at API gateway level

2. **Monitoring**:
   - Log all password update attempts
   - Monitor for suspicious OTP request patterns
   - Alert on multiple failed OTP verifications

3. **Maintenance**:
   - Regularly clean up expired OTPs from database
   - Rotate JWT secrets periodically
   - Review and update password requirements as needed

---

## Troubleshooting

### Issue: OTP not received

**Cause**: Twilio not configured or invalid phone number

**Solution**:
1. Check server console for OTP in development
2. Verify Twilio credentials in `.env`
3. Ensure phone number is in E.164 format

### Issue: Password validation fails

**Cause**: New password doesn't meet requirements

**Solution**: Ensure password has:
- At least 8 characters
- One uppercase letter
- One lowercase letter
- One number
- One special character

### Issue: OTP expired

**Cause**: OTP is valid for only 5 minutes

**Solution**: Request a new OTP

---

## Summary

✅ **Task 1 Completed**: Admin Password Update API implemented with OTP verification
✅ **Task 2 Completed**: Admin login issue diagnosed and fixed

The implementation follows security best practices and integrates seamlessly with the existing authentication system.

