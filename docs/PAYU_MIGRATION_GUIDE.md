# PayU Integration - Migration Guide for Existing Installations

## Overview

This guide helps you migrate from the old payment system to the new PayU integration.

## What's Changed

### Old System
- Direct payment ID submission
- No payment verification
- Immediate course access
- No transaction tracking
- Security vulnerabilities

### New System
- Complete PayU integration
- Server-side verification
- Secure payment flow
- Full transaction history
- Idempotency protection
- Audit trail

## Migration Steps

### Step 1: Backup Your Database

**IMPORTANT:** Always backup before making changes!

```bash
# Backup PostgreSQL database
pg_dump -U postgres cs_compass > backup_$(date +%Y%m%d_%H%M%S).sql

# Or using the database URL
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Update Environment Variables

Add PayU configuration to your `.env` file:

```env
# PayU Configuration
PAYU_MERCHANT_KEY=your_merchant_key
PAYU_SALT=your_salt
PAYU_BASE_URL=https://test.payu.in  # Use https://secure.payu.in for production

# Optional: Custom callback URLs
# PAYU_SUCCESS_URL=https://yourdomain.com/api/courses/payment/callback
# PAYU_FAILURE_URL=https://yourdomain.com/api/courses/payment/callback
# PAYU_CANCEL_URL=https://yourdomain.com/api/courses/payment/callback

# Ensure SERVER_URL is set (required for default callbacks)
SERVER_URL=https://yourdomain.com
```

### Step 3: Run Database Migration

```bash
# Run the migration to create payment_transactions table
npm run migrate

# Verify the table was created
psql -U postgres -d cs_compass -c "\d payment_transactions"
```

### Step 4: Update Dependencies (if needed)

The integration uses existing dependencies, but verify they're installed:

```bash
npm install
```

### Step 5: Update Client Code

#### Old Code (DEPRECATED):
```javascript
// Old way - directly submitting payment ID
const response = await fetch('/api/courses/purchase', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    courseId: 'course-id',
    amount: 999,
    paymentId: 'some-payment-id',  // ❌ Insecure
    expiryDate: '2025-12-31'
  })
});
```

#### New Code (RECOMMENDED):
```javascript
// Step 1: Initiate payment
const initiateResponse = await fetch('/api/courses/payment/initiate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    courseId: 'course-id'
  })
});

const { data } = await initiateResponse.json();

// Step 2: Create and submit PayU form
const form = document.createElement('form');
form.method = 'POST';
form.action = data.paymentUrl;

// Add all payment parameters
Object.entries(data.paymentParams).forEach(([key, value]) => {
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = key;
  input.value = value;
  form.appendChild(input);
});

// Add merchant key
const keyInput = document.createElement('input');
keyInput.type = 'hidden';
keyInput.name = 'key';
keyInput.value = data.merchantKey;
form.appendChild(keyInput);

document.body.appendChild(form);
form.submit();

// Step 3: Check payment status (after callback)
const statusResponse = await fetch(`/api/courses/payment/status/${data.transactionId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Step 6: Backward Compatibility

The old `/api/courses/purchase` endpoint still works but now initiates PayU payment instead of directly creating a purchase. Update your client code to use the new flow.

**Migration Path:**
1. Keep old endpoint for backward compatibility
2. Update frontend to use new endpoints
3. Monitor usage of old endpoint
4. Deprecate old endpoint after migration complete

### Step 7: Migrate Existing Transactions (Optional)

If you want to migrate existing `user_courses` records to `payment_transactions`:

```sql
-- Create payment transaction records for existing purchases
INSERT INTO payment_transactions (
  transaction_id,
  user_id,
  course_id,
  amount,
  currency,
  status,
  payu_payment_id,
  initiated_at,
  completed_at,
  created_at,
  updated_at
)
SELECT 
  'MIGRATED_' || id,  -- Generate transaction ID
  user_id,
  course_id,
  amount,
  'INR',
  'success',  -- Mark as successful
  payment_id,  -- Old payment ID
  purchase_date,
  purchase_date,
  created_at,
  updated_at
FROM user_courses
WHERE status = 'completed'
AND NOT EXISTS (
  SELECT 1 FROM payment_transactions pt 
  WHERE pt.user_id = user_courses.user_id 
  AND pt.course_id = user_courses.course_id
);
```

### Step 8: Test the Integration

1. **Test Payment Initiation:**
   ```bash
   curl -X POST http://localhost:3000/api/courses/payment/initiate \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"courseId":"COURSE_ID"}'
   ```

2. **Complete a Test Payment:**
   - Use the test page: `docs/payu-payment-example.html`
   - Or manually submit the form to PayU

3. **Verify Database:**
   ```sql
   -- Check payment transactions
   SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 5;
   
   -- Check user courses
   SELECT * FROM user_courses ORDER BY created_at DESC LIMIT 5;
   ```

4. **Check Logs:**
   ```bash
   tail -f logs/combined.log | grep -i payment
   ```

### Step 9: Update Frontend Application

If you have a separate frontend application:

1. **Update API calls** to use new endpoints
2. **Implement PayU form submission** logic
3. **Add payment status polling** for better UX
4. **Handle payment callbacks** (redirect URLs)
5. **Update error handling** for new error responses

Example React component:

```jsx
import { useState } from 'react';

function CoursePayment({ courseId, token }) {
  const [loading, setLoading] = useState(false);
  
  const handlePayment = async () => {
    setLoading(true);
    
    try {
      // Initiate payment
      const response = await fetch('/api/courses/payment/initiate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ courseId })
      });
      
      const { data } = await response.json();
      
      // Create and submit PayU form
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = data.paymentUrl;
      
      // Add payment parameters
      Object.entries(data.paymentParams).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });
      
      // Add merchant key
      const keyInput = document.createElement('input');
      keyInput.type = 'hidden';
      keyInput.name = 'key';
      keyInput.value = data.merchantKey;
      form.appendChild(keyInput);
      
      document.body.appendChild(form);
      form.submit();
      
    } catch (error) {
      console.error('Payment initiation failed:', error);
      setLoading(false);
    }
  };
  
  return (
    <button onClick={handlePayment} disabled={loading}>
      {loading ? 'Processing...' : 'Buy Now'}
    </button>
  );
}
```

### Step 10: Production Deployment

1. **Update environment variables** on production server
2. **Run migration** on production database
3. **Deploy updated code**
4. **Test with small real payment**
5. **Monitor logs** for any issues
6. **Set up alerts** for payment failures

## Rollback Plan

If you need to rollback:

### Step 1: Restore Database Backup
```bash
psql -U postgres cs_compass < backup_YYYYMMDD_HHMMSS.sql
```

### Step 2: Revert Code Changes
```bash
git revert <commit-hash>
# or
git checkout <previous-tag>
```

### Step 3: Restart Server
```bash
npm run start
```

## Monitoring After Migration

### Key Metrics to Monitor

1. **Payment Success Rate**
   ```sql
   SELECT 
     status,
     COUNT(*) as count,
     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
   FROM payment_transactions
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY status;
   ```

2. **Failed Payments**
   ```sql
   SELECT 
     transaction_id,
     user_id,
     course_id,
     amount,
     error_message,
     created_at
   FROM payment_transactions
   WHERE status = 'failed'
   AND created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```

3. **Webhook Delivery**
   ```sql
   SELECT 
     COUNT(*) as total_initiated,
     COUNT(CASE WHEN status != 'initiated' THEN 1 END) as callbacks_received,
     ROUND(COUNT(CASE WHEN status != 'initiated' THEN 1 END) * 100.0 / COUNT(*), 2) as callback_rate
   FROM payment_transactions
   WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

### Set Up Alerts

Monitor for:
- High failure rate (>10%)
- Stuck transactions (initiated >1 hour ago)
- Webhook delivery issues
- Hash verification failures

## Common Migration Issues

### Issue 1: "Payment service is not configured"
**Solution:** Check environment variables are set correctly and restart server

### Issue 2: Old client code still using `/purchase` endpoint
**Solution:** Update client code to use new endpoints, or keep backward compatibility

### Issue 3: Webhooks not being received
**Solution:** Ensure callback URLs are publicly accessible and HTTPS is enabled

### Issue 4: Hash verification failures
**Solution:** Verify PAYU_SALT is correct with no extra spaces

## Support During Migration

### Pre-Migration Checklist
- [ ] Database backup completed
- [ ] Environment variables configured
- [ ] Migration script tested on staging
- [ ] Client code updated
- [ ] Rollback plan documented
- [ ] Team notified of changes

### Post-Migration Checklist
- [ ] Migration completed successfully
- [ ] Test payment completed
- [ ] Webhooks working
- [ ] Monitoring set up
- [ ] Logs reviewed
- [ ] No errors in production
- [ ] Old backup can be archived

## Timeline Recommendation

**Week 1:**
- Set up PayU test account
- Configure test environment
- Test integration thoroughly

**Week 2:**
- Update client code
- Test on staging environment
- Prepare production credentials

**Week 3:**
- Deploy to production
- Monitor closely
- Fix any issues

**Week 4:**
- Verify all payments working
- Archive old code
- Document lessons learned

## Questions?

Refer to:
- `docs/PAYU_INTEGRATION.md` - Complete integration guide
- `docs/PAYU_QUICK_START.md` - Quick start guide
- `docs/PAYU_IMPLEMENTATION_SUMMARY.md` - Implementation details
- PayU Documentation: https://docs.payu.in/

