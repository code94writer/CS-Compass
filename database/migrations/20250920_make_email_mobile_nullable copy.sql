-- Migration: Fix email and mobile to be nullable and update empty strings to NULL
-- This migration is safe to run multiple times (idempotent)

BEGIN;

-- Step 1: Update existing empty strings to NULL
-- This prevents duplicate key violations on the unique constraint
UPDATE users SET email = NULL WHERE email = '';
UPDATE users SET mobile = NULL WHERE mobile = '';

-- Step 2: Make email and mobile columns nullable
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN mobile DROP NOT NULL;

-- Step 3: Verify the changes
DO $$
DECLARE
    empty_email_count INTEGER;
    empty_mobile_count INTEGER;
BEGIN
    -- Check for any remaining empty strings
    SELECT COUNT(*) INTO empty_email_count FROM users WHERE email = '';
    SELECT COUNT(*) INTO empty_mobile_count FROM users WHERE mobile = '';
    
    IF empty_email_count > 0 OR empty_mobile_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: Found % users with empty email and % users with empty mobile', 
            empty_email_count, empty_mobile_count;
    END IF;
    
    RAISE NOTICE 'Migration completed successfully';
    RAISE NOTICE 'Email and mobile columns are now nullable';
    RAISE NOTICE 'All empty strings have been converted to NULL';
END $$;

COMMIT;

