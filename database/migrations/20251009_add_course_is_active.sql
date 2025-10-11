-- Migration: Add is_active column to courses table
-- Date: 2025-10-09
-- Purpose: Enable course deactivation as a safe alternative to deletion
-- Feature: Course Deactivation System

-- Step 1: Check if column already exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'courses' 
        AND column_name = 'is_active'
    ) THEN
        RAISE NOTICE 'Column is_active already exists in courses table';
    ELSE
        RAISE NOTICE 'Adding is_active column to courses table...';
    END IF;
END $$;

-- Step 2: Add is_active column with default value TRUE
ALTER TABLE courses 
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Step 3: Set existing courses to active (if any exist)
UPDATE courses 
SET is_active = TRUE 
WHERE is_active IS NULL;

-- Step 4: Create index for filtering active/inactive courses
CREATE INDEX IF NOT EXISTS idx_courses_is_active 
    ON courses(is_active);

-- Step 5: Create composite index for common queries (category + active status)
CREATE INDEX IF NOT EXISTS idx_courses_category_active 
    ON courses(category_id, is_active);

-- Step 6: Verify the changes
DO $$
BEGIN
    RAISE NOTICE 'Verifying is_active column...';
END $$;

SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'courses' 
    AND column_name = 'is_active';

-- Step 7: Show index information
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename = 'courses'
    AND indexname LIKE '%active%';

-- Step 8: Show count of active vs inactive courses
SELECT 
    is_active,
    COUNT(*) as count
FROM courses
GROUP BY is_active
ORDER BY is_active DESC;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE 'Added is_active column to courses table';
    RAISE NOTICE 'Created indexes: idx_courses_is_active, idx_courses_category_active';
    RAISE NOTICE 'All existing courses set to active (is_active = TRUE)';
    RAISE NOTICE '';
    RAISE NOTICE 'Course Deactivation System is now ready!';
END $$;

