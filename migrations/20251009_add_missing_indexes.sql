-- Migration: Add missing database indexes for performance optimization
-- Date: 2025-10-09
-- Issue: Missing indexes on frequently queried columns
-- Fix: Add indexes on videos.course_id and composite indexes on user_courses

-- Step 1: Show current indexes before migration
DO $$
BEGIN
    RAISE NOTICE '=== Current Indexes (Before Migration) ===';
END $$;

SELECT 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename IN ('videos', 'user_courses', 'payment_transactions')
ORDER BY tablename, indexname;

-- Step 2: Add index for videos.course_id
-- This improves performance when fetching videos for a specific course
CREATE INDEX IF NOT EXISTS idx_videos_course_id 
    ON videos(course_id);

DO $$
BEGIN
    RAISE NOTICE '✅ Created index: idx_videos_course_id';
END $$;

-- Step 3: Add composite index on user_courses (user_id, status)
-- This improves performance when fetching a user''s courses filtered by status
CREATE INDEX IF NOT EXISTS idx_user_courses_user_status 
    ON user_courses(user_id, status);

DO $$
BEGIN
    RAISE NOTICE '✅ Created index: idx_user_courses_user_status';
END $$;

-- Step 4: Add composite index on user_courses (course_id, status)
-- This improves performance when checking course purchases and their status
CREATE INDEX IF NOT EXISTS idx_user_courses_course_status 
    ON user_courses(course_id, status);

DO $$
BEGIN
    RAISE NOTICE '✅ Created index: idx_user_courses_course_status';
END $$;

-- Step 5: Add index on user_courses.expiry_date for access checks
-- This improves performance when checking if course access has expired
CREATE INDEX IF NOT EXISTS idx_user_courses_expiry 
    ON user_courses(expiry_date) 
    WHERE expiry_date IS NOT NULL;

DO $$
BEGIN
    RAISE NOTICE '✅ Created index: idx_user_courses_expiry (partial index)';
END $$;

-- Step 6: Add index on payment_transactions.initiated_at for cleanup queries
-- This improves performance when cleaning up old transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_initiated_at 
    ON payment_transactions(initiated_at DESC);

DO $$
BEGIN
    RAISE NOTICE '✅ Created index: idx_payment_transactions_initiated_at';
END $$;

-- Step 7: Add composite index on payment_transactions (user_id, status)
-- This improves performance when fetching user's payment history
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_status 
    ON payment_transactions(user_id, status);

DO $$
BEGIN
    RAISE NOTICE '✅ Created index: idx_payment_transactions_user_status';
END $$;

-- Step 8: Show all indexes after migration
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== All Indexes (After Migration) ===';
END $$;

SELECT 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename IN ('videos', 'user_courses', 'payment_transactions')
ORDER BY tablename, indexname;

-- Step 9: Analyze tables to update statistics
ANALYZE videos;
ANALYZE user_courses;
ANALYZE payment_transactions;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE 'Added 6 new indexes for improved query performance:';
    RAISE NOTICE '  - idx_videos_course_id';
    RAISE NOTICE '  - idx_user_courses_user_status';
    RAISE NOTICE '  - idx_user_courses_course_status';
    RAISE NOTICE '  - idx_user_courses_expiry';
    RAISE NOTICE '  - idx_payment_transactions_initiated_at';
    RAISE NOTICE '  - idx_payment_transactions_user_status';
    RAISE NOTICE '';
    RAISE NOTICE 'Table statistics updated with ANALYZE command.';
END $$;

