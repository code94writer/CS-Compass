# PayU Integration - Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will help you quickly set up and test the PayU payment integration.

## Prerequisites

- Node.js and npm installed
- PostgreSQL database running
- PayU test account (get from https://test.payu.in)

## Step 1: Configure Environment Variables

Add these to your `.env` file:

```env
# PayU Test Configuration
PAYU_MERCHANT_KEY=your_test_merchant_key
PAYU_SALT=your_test_salt
PAYU_BASE_URL=https://test.payu.in

# Server URL (for callbacks)
SERVER_URL=http://localhost:3000
```

**Where to get credentials:**
1. Sign up at https://test.payu.in
2. Go to Dashboard → Settings → API Keys
3. Copy Merchant Key and Salt

## Step 2: Run Database Migration

```bash
npm run migrate
```

This creates the `payment_transactions` table.

## Step 3: Start the Server

```bash
npm run dev
```

Server should start on http://localhost:3000

## Step 4: Test the Integration

### Option A: Using the Test Page (Recommended)

1. Open `docs/payu-payment-example.html` in your browser
2. Enter your API URL: `http://localhost:3000`
3. Get a JWT token by logging in:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@cscompass.com","password":"admin123"}'
   ```
4. Copy the token from the response
5. Get a course ID from your database
6. Click "Initiate Payment"
7. You'll be redirected to PayU test page
8. Use test card: `5123456789012346`, CVV: `123`, Expiry: any future date

### Option B: Using cURL

**1. Initiate Payment:**
```bash
curl -X POST http://localhost:3000/api/courses/payment/initiate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"courseId":"YOUR_COURSE_ID"}'
```

**2. Copy the response and create an HTML form:**
```html
<form method="POST" action="https://test.payu.in/_payment">
  <!-- Fill in values from the response -->
  <input type="hidden" name="key" value="..." />
  <input type="hidden" name="txnid" value="..." />
  <input type="hidden" name="amount" value="..." />
  <!-- ... other fields ... -->
  <button type="submit">Pay Now</button>
</form>
```

**3. Check Payment Status:**
```bash
curl http://localhost:3000/api/courses/payment/status/TRANSACTION_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Step 5: Test Webhook (Optional)

For local testing, use ngrok to expose your server:

```bash
# Install ngrok
npm install -g ngrok

# Expose port 3000
ngrok http 3000

# Update .env with ngrok URL
SERVER_URL=https://your-ngrok-url.ngrok.io
```

Restart your server and test again. PayU will now be able to send webhooks to your local machine.

## Common Test Scenarios

### Test Successful Payment
- Use card: `5123456789012346`
- CVV: `123`
- Expiry: Any future date
- Expected: Payment status = "success"

### Test Failed Payment
- Use card: `4111111111111111` (if provided by PayU)
- Expected: Payment status = "failed"

### Test Duplicate Payment
1. Initiate payment for a course
2. Complete the payment
3. Try to initiate payment for same course again
4. Expected: Error "You already have access to this course"

## Verify Everything Works

### 1. Check Database
```sql
-- View all transactions
SELECT * FROM payment_transactions ORDER BY created_at DESC;

-- View successful purchases
SELECT * FROM user_courses WHERE status = 'completed';
```

### 2. Check Logs
```bash
tail -f logs/combined.log
```

Look for:
- "Payment initiated"
- "Payment callback received"
- "Payment callback processed"
- "Course purchase completed successfully"

### 3. Test API Endpoints

**Health Check:**
```bash
curl http://localhost:3000/health
```

**Get My Courses (after successful payment):**
```bash
curl http://localhost:3000/api/courses/my \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### "Payment service is not configured"
- Check `.env` file has `PAYU_MERCHANT_KEY` and `PAYU_SALT`
- Restart the server after adding environment variables

### "Hash verification failed"
- Verify `PAYU_SALT` is correct (no extra spaces)
- Check PayU dashboard for correct salt value

### Webhook not received
- Use ngrok for local testing
- Check `SERVER_URL` is set correctly
- Verify callback URL is publicly accessible

### Transaction stuck in "initiated"
- User didn't complete payment
- Check PayU dashboard for actual status
- Use status check endpoint to verify

## Next Steps

### For Development
1. Review the code in `src/services/payu.ts`
2. Check `src/controllers/courseController.ts` for payment flow
3. Read `docs/PAYU_INTEGRATION.md` for detailed documentation

### For Production
1. Get production credentials from PayU
2. Update `PAYU_BASE_URL` to `https://secure.payu.in`
3. Set proper `SERVER_URL` with HTTPS
4. Review `docs/PAYU_IMPLEMENTATION_SUMMARY.md` for deployment checklist
5. Test with small real payment first

## Quick Reference

### Environment Variables
```env
PAYU_MERCHANT_KEY=required
PAYU_SALT=required
PAYU_BASE_URL=required (test: https://test.payu.in, prod: https://secure.payu.in)
SERVER_URL=required (for callbacks)
```

### API Endpoints
- `POST /api/courses/payment/initiate` - Start payment
- `POST /api/courses/payment/callback` - PayU webhook
- `GET /api/courses/payment/status/:txnId` - Check status

### Database Tables
- `payment_transactions` - All payment records
- `user_courses` - Successful purchases

### Test Credentials
- Card: `5123456789012346`
- CVV: `123`
- Expiry: Any future date
- Name: Any name

## Support

- **Documentation:** `docs/PAYU_INTEGRATION.md`
- **Implementation Details:** `docs/PAYU_IMPLEMENTATION_SUMMARY.md`
- **Test Page:** `docs/payu-payment-example.html`
- **PayU Docs:** https://docs.payu.in/

## Success Checklist

- [ ] Environment variables configured
- [ ] Database migration completed
- [ ] Server starts without errors
- [ ] Can initiate payment
- [ ] Can complete test payment
- [ ] Webhook received and processed
- [ ] Transaction status updated
- [ ] User course access granted
- [ ] Can view purchased courses

If all items are checked, your PayU integration is working correctly! 🎉

