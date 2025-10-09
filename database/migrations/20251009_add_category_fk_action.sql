-- Migration: Add ON DELETE RESTRICT to category_id foreign key in courses table
-- Date: 2025-10-09
-- Issue: category_id foreign key has no ON DELETE action specified
-- Fix: Add ON DELETE RESTRICT to prevent category deletion if courses exist

-- Step 1: Check current foreign key constraint
DO $$
BEGIN
    RAISE NOTICE 'Current category_id foreign key constraint:';
END $$;

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
    AND kcu.column_name = 'category_id';

-- Step 2: Drop the existing foreign key constraint
ALTER TABLE courses 
    DROP CONSTRAINT IF EXISTS courses_category_id_fkey;

-- Step 3: Add the foreign key constraint with ON DELETE RESTRICT
ALTER TABLE courses 
    ADD CONSTRAINT courses_category_id_fkey 
    FOREIGN KEY (category_id) 
    REFERENCES categories(id) 
    ON DELETE RESTRICT;

-- Step 4: Verify the new constraint
DO $$
BEGIN
    RAISE NOTICE 'Updated category_id foreign key constraint:';
END $$;

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
    AND kcu.column_name = 'category_id';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE 'The category_id foreign key now has ON DELETE RESTRICT.';
    RAISE NOTICE 'Categories with associated courses cannot be deleted.';
END $$;

