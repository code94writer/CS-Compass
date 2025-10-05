# Production Database Migration Guide

## Migration: Fix Email/Mobile Nullable Issue

### Problem
- Users registering via phone number were getting `email = ''` (empty string)
- The UNIQUE constraint on email caused duplicate key violations when multiple phone-based users tried to register
- The error: `duplicate key value violates unique constraint "users_email_key"`

### Solution
This migration:
1. Converts existing empty strings to `NULL`
2. Makes `email` and `mobile` columns nullable
3. Allows multiple users to have `NULL` emails (PostgreSQL treats each NULL as unique)

---

## Pre-Deployment Checklist

### 1. **Backup Your Production Database**
```bash
# Create a backup before running any migration
pg_dump -h <prod-host> -U <prod-user> -d cs_compass > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql
```

### 2. **Check Current State**
```bash
# Connect to production database
psql -h <prod-host> -U <prod-user> -d cs_compass

# Check if columns are nullable
\d users

# Check for users with empty strings
SELECT COUNT(*) as empty_email_count FROM users WHERE email = '';
SELECT COUNT(*) as empty_mobile_count FROM users WHERE mobile = '';

# Exit
\q
```

### 3. **Review the Migration Script**
The migration file is located at:
```
database/migrations/20250920_fix_email_mobile_nullable.sql
```

---

## Deployment Steps

### Option 1: Direct SQL Execution (Recommended for small databases)

```bash
# Run the migration on production
psql -h <prod-host> -U <prod-user> -d cs_compass -f database/migrations/20250920_fix_email_mobile_nullable.sql
```

### Option 2: Manual Execution (For more control)

```bash
# Connect to production
psql -h <prod-host> -U <prod-user> -d cs_compass

# Copy and paste the contents of the migration file
# Or use \i command
\i database/migrations/20250920_fix_email_mobile_nullable.sql

# Verify the changes
\d users
SELECT id, email, mobile FROM users WHERE email IS NULL OR mobile IS NULL;

# Exit
\q
```

---

## Verification Steps

After running the migration, verify:

### 1. **Check Column Nullability**
```sql
\d users
```
Expected: `email` and `mobile` should NOT show "not null" in the Nullable column

### 2. **Check Data Integrity**
```sql
-- Should return 0 rows (no empty strings)
SELECT COUNT(*) FROM users WHERE email = '' OR mobile = '';

-- Check users with NULL values (should show phone-based users)
SELECT id, email, mobile, role FROM users WHERE email IS NULL;
```

### 3. **Test OTP Registration**
Try registering a new user via phone number to ensure it works without errors.

---

## Rollback Plan

If something goes wrong, you can rollback:

### 1. **Restore from Backup**
```bash
# Stop your application first
# Then restore the backup
psql -h <prod-host> -U <prod-user> -d cs_compass < backup_before_migration_YYYYMMDD_HHMMSS.sql
```

### 2. **Manual Rollback** (Not recommended - data loss)
```sql
BEGIN;

-- Revert NULL values to empty strings (will cause the original issue)
UPDATE users SET email = '' WHERE email IS NULL;
UPDATE users SET mobile = '' WHERE mobile IS NULL;

-- Make columns NOT NULL again
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ALTER COLUMN mobile SET NOT NULL;

COMMIT;
```
⚠️ **Warning**: Manual rollback will restore the original bug!

---

## Post-Deployment

### 1. **Deploy Code Changes**
Ensure you deploy the updated application code that uses `NULL` instead of empty strings:
- `src/types/index.ts` - Updated type definitions
- `src/controllers/authController.ts` - Updated sendOtp function
- `src/middleware/auth.ts` - Updated AuthRequest interface

### 2. **Monitor Logs**
Watch for any errors related to user registration:
```bash
# Monitor application logs
tail -f /path/to/app/logs/error.log
```

### 3. **Test Critical Flows**
- Phone-based OTP registration
- Email-based registration
- Login with email
- Login with phone + OTP

---

## Troubleshooting

### Issue: Migration fails with "duplicate key value violates unique constraint"
**Cause**: Multiple users already have empty string emails
**Solution**: The migration handles this by converting empty strings to NULL first

### Issue: Application still throws errors after migration
**Cause**: Code changes not deployed
**Solution**: Deploy the updated code from the fix

### Issue: Existing users can't login
**Cause**: Unlikely, but check if their email/mobile was accidentally set to NULL
**Solution**: Check the backup and restore specific user records if needed

---

## Migration History

| Date | Migration | Description |
|------|-----------|-------------|
| 2025-01-XX | `20250920_fix_email_mobile_nullable.sql` | Make email/mobile nullable and convert empty strings to NULL |

---

## Support

If you encounter any issues:
1. Check the application logs
2. Verify the database schema matches expectations
3. Ensure code changes are deployed
4. Restore from backup if necessary

