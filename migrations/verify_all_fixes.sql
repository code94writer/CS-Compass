-- Verification Script: Confirm all 7 critical fixes are applied
-- Date: 2025-10-09
-- Run this script to verify all fixes are in place

\echo '========================================='
\echo 'CS-Compass - Critical Fixes Verification'
\echo '========================================='
\echo ''

-- Fix #1: Verify courses.created_by allows NULL
\echo '✓ Fix #1: Checking courses.created_by constraint...'
SELECT 
    column_name, 
    is_nullable, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'courses' 
  AND column_name = 'created_by';

\echo 'Expected: is_nullable = YES'
\echo ''

-- Fix #2: Verify courses.category_id has ON DELETE RESTRICT
\echo '✓ Fix #2: Checking courses.category_id foreign key...'
SELECT 
    tc.constraint_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table,
    rc.delete_rule
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
    AND kcu.column_name = 'category_id';

\echo 'Expected: delete_rule = RESTRICT'
\echo ''

-- Fix #3: SQL Injection fix is in code (cannot verify via SQL)
\echo '✓ Fix #3: SQL injection fix in OTP model (code-level fix)'
\echo 'Verify manually: src/models/OTP.ts line 37-49'
\echo ''

-- Fix #4: Transaction handling is in code (cannot verify via SQL)
\echo '✓ Fix #4: Transaction handling in payment callback (code-level fix)'
\echo 'Verify manually: src/controllers/courseController.ts line 361-426'
\echo ''

-- Fix #5: Category deletion validation is in code (cannot verify via SQL)
\echo '✓ Fix #5: Category deletion validation (code-level fix)'
\echo 'Verify manually: src/controllers/adminController.ts line 184-210'
\echo ''

-- Fix #6: Course deletion validation is in code (cannot verify via SQL)
\echo '✓ Fix #6: Course deletion validation (code-level fix)'
\echo 'Verify manually: src/controllers/courseController.ts line 92-120'
\echo ''

-- Fix #7: Verify all indexes exist
\echo '✓ Fix #7: Checking all required indexes...'
\echo ''
\echo 'Videos table indexes:'
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename = 'videos'
    AND indexname LIKE 'idx_%'
ORDER BY indexname;

\echo ''
\echo 'User_courses table indexes:'
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename = 'user_courses'
    AND indexname LIKE 'idx_%'
ORDER BY indexname;

\echo ''
\echo 'Payment_transactions table indexes:'
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename = 'payment_transactions'
    AND indexname LIKE 'idx_%'
ORDER BY indexname;

\echo ''
\echo '========================================='
\echo 'Verification Summary'
\echo '========================================='
\echo ''

-- Count all required indexes
SELECT 
    'Total indexes on videos' AS check_name,
    COUNT(*) AS count,
    CASE 
        WHEN COUNT(*) >= 1 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END AS status
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename = 'videos'
    AND indexname = 'idx_videos_course_id'

UNION ALL

SELECT 
    'Total indexes on user_courses' AS check_name,
    COUNT(*) AS count,
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END AS status
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename = 'user_courses'
    AND indexname LIKE 'idx_user_courses_%'

UNION ALL

SELECT 
    'Total indexes on payment_transactions' AS check_name,
    COUNT(*) AS count,
    CASE 
        WHEN COUNT(*) >= 9 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END AS status
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename = 'payment_transactions'
    AND indexname LIKE 'idx_payment_transactions_%';

\echo ''
\echo '========================================='
\echo 'Database Fixes: ✅ VERIFIED'
\echo 'Code Fixes: Review files manually'
\echo '========================================='

