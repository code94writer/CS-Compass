# PayU Payment Gateway Integration Guide

## Overview

This document describes the PayU payment gateway integration for handling course purchases in the CS Compass application.

## Table of Contents

1. [Architecture](#architecture)
2. [Setup & Configuration](#setup--configuration)
3. [Payment Flow](#payment-flow)
4. [API Endpoints](#api-endpoints)
5. [Security Features](#security-features)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

## Architecture

### Components

1. **PayU Service** (`src/services/payu.ts`)
   - Handles PayU API integration
   - Generates and verifies SHA-512 hashes
   - Creates payment requests
   - Validates payment responses

2. **Payment Transaction Model** (`src/models/PaymentTransaction.ts`)
   - Manages payment transaction database operations
   - Tracks payment status and history
   - Implements idempotency checks

3. **Course Controller** (`src/controllers/courseController.ts`)
   - `purchaseCourse`: Initiates payment
   - `handlePaymentCallback`: Processes PayU webhooks
   - `getPaymentStatus`: Retrieves transaction status

4. **Database Schema** (`database/migrations/20250108_create_payment_transactions.sql`)
   - `payment_transactions` table stores all transaction data
   - Indexed for performance
   - Includes audit trail fields

## Setup & Configuration

### 1. Environment Variables

Add the following to your `.env` file:

```env
# PayU Configuration
PAYU_MERCHANT_KEY=your_merchant_key_here
PAYU_SALT=your_salt_here
PAYU_BASE_URL=https://test.payu.in

# Optional: Custom callback URLs
PAYU_SUCCESS_URL=https://yourdomain.com/api/courses/payment/callback
PAYU_FAILURE_URL=https://yourdomain.com/api/courses/payment/callback
PAYU_CANCEL_URL=https://yourdomain.com/api/courses/payment/callback

# Server URL (required for default callback URLs)
SERVER_URL=https://yourdomain.com
```

### 2. PayU Credentials

**Test Environment:**
- URL: `https://test.payu.in`
- Get test credentials from PayU dashboard

**Production Environment:**
- URL: `https://secure.payu.in`
- Use production merchant key and salt

### 3. Database Migration

Run the migration to create the `payment_transactions` table:

```bash
npm run migrate
```

## Payment Flow

### 1. Initiate Payment

**Client → Server:**
```
POST /api/courses/payment/initiate
Authorization: Bearer <token>
Content-Type: application/json

{
  "courseId": "course-uuid"
}
```

**Server Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN1704672000123456",
    "paymentUrl": "https://test.payu.in/_payment",
    "paymentParams": {
      "txnid": "TXN1704672000123456",
      "amount": "999.00",
      "productinfo": "Course Name",
      "firstname": "John",
      "email": "john@example.com",
      "phone": "9876543210",
      "surl": "https://yourdomain.com/api/courses/payment/callback",
      "furl": "https://yourdomain.com/api/courses/payment/callback",
      "hash": "generated-sha512-hash",
      "udf1": "user-id",
      "udf2": "course-id"
    },
    "merchantKey": "your-merchant-key",
    "course": {
      "id": "course-uuid",
      "name": "Course Name",
      "price": 1000,
      "discount": 10,
      "finalAmount": 999
    }
  }
}
```

### 2. Client Submits Payment Form

The client creates an HTML form and submits it to PayU:

```html
<form method="POST" action="https://test.payu.in/_payment">
  <input type="hidden" name="key" value="merchant-key" />
  <input type="hidden" name="txnid" value="TXN1704672000123456" />
  <input type="hidden" name="amount" value="999.00" />
  <input type="hidden" name="productinfo" value="Course Name" />
  <input type="hidden" name="firstname" value="John" />
  <input type="hidden" name="email" value="john@example.com" />
  <input type="hidden" name="phone" value="9876543210" />
  <input type="hidden" name="surl" value="callback-url" />
  <input type="hidden" name="furl" value="callback-url" />
  <input type="hidden" name="hash" value="generated-hash" />
  <input type="hidden" name="udf1" value="user-id" />
  <input type="hidden" name="udf2" value="course-id" />
  <button type="submit">Pay Now</button>
</form>
```

### 3. PayU Processes Payment

User completes payment on PayU's secure page.

### 4. PayU Callback

PayU redirects back to your callback URL with payment status:

```
POST /api/courses/payment/callback
Content-Type: application/x-www-form-urlencoded

mihpayid=403993715527447077
mode=CC
status=success
txnid=TXN1704672000123456
amount=999.00
hash=response-hash
...
```

### 5. Server Verifies & Updates

The server:
1. Verifies the hash signature
2. Updates transaction status
3. Creates `user_courses` entry if successful
4. Returns response to PayU

### 6. Check Payment Status

Client can poll for status:

```
GET /api/courses/payment/status/TXN1704672000123456
Authorization: Bearer <token>
```

## API Endpoints

### POST /api/courses/payment/initiate

Initiates a payment transaction.

**Authentication:** Required  
**Rate Limit:** Standard

**Request Body:**
```json
{
  "courseId": "string (required)"
}
```

**Response:**
- `200`: Payment initiated successfully
- `400`: Invalid input or course already purchased
- `401`: Unauthorized
- `404`: Course not found
- `503`: Payment service not configured

### POST /api/courses/payment/callback

Receives PayU webhook callbacks.

**Authentication:** None (verified via hash)  
**Rate Limit:** None (webhook endpoint)

**Request:** Form-urlencoded PayU response

**Response:**
- `200`: Callback processed
- `400`: Invalid callback data
- `404`: Transaction not found

### GET /api/courses/payment/status/:transactionId

Retrieves payment transaction status.

**Authentication:** Required  
**Rate Limit:** Standard

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN1704672000123456",
    "status": "success",
    "amount": 999,
    "currency": "INR",
    "payuPaymentId": "403993715527447077",
    "course": {
      "id": "course-uuid",
      "name": "Course Name"
    },
    "initiatedAt": "2024-01-08T10:00:00Z",
    "completedAt": "2024-01-08T10:05:00Z"
  }
}
```

## Security Features

### 1. Hash Verification

All PayU requests and responses are verified using SHA-512 hashes:

**Request Hash:**
```
key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
```

**Response Hash:**
```
salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
```

### 2. Idempotency

Prevents duplicate payments using idempotency keys:
```
SHA256(userId|courseId|timestamp)
```

### 3. Server-Side Validation

- All payment data is validated server-side
- Client-submitted amounts are ignored
- Course prices are fetched from database

### 4. SQL Injection Prevention

- All queries use parameterized statements
- Input validation on all endpoints

### 5. Rate Limiting

- Standard rate limits on payment initiation
- No rate limit on webhook (verified via hash)

### 6. Authentication & Authorization

- JWT authentication required for initiation and status check
- User can only view their own transactions

### 7. Audit Trail

All transactions logged with:
- IP address
- User agent
- Complete PayU response
- Timestamps

## Testing

### Test Mode Setup

1. Set `PAYU_BASE_URL=https://test.payu.in`
2. Use test merchant credentials
3. Use test card numbers provided by PayU

### Test Cards

PayU provides test cards for different scenarios:
- **Success:** Use test cards from PayU documentation
- **Failure:** Use specific test cards for failure scenarios

### Manual Testing Flow

1. **Initiate Payment:**
   ```bash
   curl -X POST http://localhost:3000/api/courses/payment/initiate \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"courseId": "COURSE_UUID"}'
   ```

2. **Submit to PayU:** Use the returned payment parameters

3. **Check Status:**
   ```bash
   curl http://localhost:3000/api/courses/payment/status/TXN_ID \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### Webhook Testing

Use tools like ngrok to expose local server for webhook testing:

```bash
ngrok http 3000
# Update PAYU_SUCCESS_URL to ngrok URL
```

## Troubleshooting

### Payment Initiation Fails

**Error:** "Payment service is not configured"
- **Solution:** Check environment variables are set correctly

**Error:** "Course already purchased"
- **Solution:** User already has access to the course

### Hash Verification Fails

**Error:** "Payment verification failed"
- **Cause:** Incorrect salt or hash calculation
- **Solution:** 
  - Verify `PAYU_SALT` matches PayU dashboard
  - Check hash generation logic
  - Ensure no extra spaces in parameters

### Webhook Not Received

- **Check:** Callback URL is publicly accessible
- **Check:** No firewall blocking PayU IPs
- **Check:** Server is running and endpoint is active

### Transaction Stuck in "Initiated"

- **Cause:** User didn't complete payment or webhook failed
- **Solution:** 
  - Check PayU dashboard for transaction status
  - Manually update transaction if needed
  - Implement status polling on client side

### Duplicate Payments

- **Prevention:** Idempotency key prevents duplicates
- **Check:** Look for transactions with same idempotency_key

## Production Checklist

- [ ] Update `PAYU_BASE_URL` to production URL
- [ ] Use production merchant key and salt
- [ ] Set proper `SERVER_URL` for callbacks
- [ ] Enable HTTPS for all endpoints
- [ ] Set up monitoring for failed payments
- [ ] Configure proper logging
- [ ] Test webhook delivery
- [ ] Set up payment reconciliation process
- [ ] Configure backup/disaster recovery
- [ ] Review rate limits
- [ ] Set up alerts for payment failures

## Support

For PayU-specific issues:
- PayU Documentation: https://docs.payu.in/
- PayU Support: support@payu.in

For integration issues:
- Check logs in `logs/combined.log`
- Review transaction in `payment_transactions` table
- Contact development team

