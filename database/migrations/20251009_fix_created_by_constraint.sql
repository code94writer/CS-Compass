-- Migration: Fix created_by constraint in courses table
-- Date: 2025-10-09
-- Issue: created_by field is NOT NULL but has ON DELETE SET NULL (contradictory)
-- Fix: Remove NOT NULL constraint to allow ON DELETE SET NULL to work properly

-- Step 1: Check current constraint
DO $$
BEGIN
    RAISE NOTICE 'Current created_by column definition:';
END $$;

SELECT 
    column_name, 
    is_nullable, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'courses' 
  AND column_name = 'created_by';

-- Step 2: Alter the column to allow NULL values
ALTER TABLE courses 
    ALTER COLUMN created_by DROP NOT NULL;

-- Step 3: Verify the change
DO $$
BEGIN
    RAISE NOTICE 'Updated created_by column definition:';
END $$;

SELECT 
    column_name, 
    is_nullable, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'courses' 
  AND column_name = 'created_by';

-- Step 4: Verify foreign key constraint with ON DELETE action
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
    AND rc.constraint_schema = tc.table_schema
WHERE tc.table_name = 'courses' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'created_by';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE 'The created_by column now allows NULL values and ON DELETE SET NULL will work correctly.';
END $$;

