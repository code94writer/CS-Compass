-- Data Integrity Check for Payment Tables
-- Run this BEFORE applying migration 20260109_add_payment_fk_constraint.sql
-- This script checks for data issues that would prevent foreign key constraint creation

\echo '========================================='
\echo 'Payment Tables Data Integrity Check'
\echo '========================================='
\echo ''

-- 1. Table Statistics
\echo '1. TABLE STATISTICS'
\echo '-------------------'
SELECT 
    'user_courses' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT payment_id) as unique_payment_ids,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_purchases,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_purchases,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_purchases
FROM user_courses
UNION ALL
SELECT 
    'payment_transactions' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT payu_payment_id) as unique_payment_ids,
    COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_payments,
    COUNT(CASE WHEN status = 'initiated' THEN 1 END) as initiated_payments,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments;

\echo ''
\echo '2. ORPHANED RECORDS CHECK'
\echo '-------------------------'
\echo 'Checking for user_courses with payment_id not in payment_transactions...'

SELECT 
    COUNT(*) as orphaned_count
FROM user_courses uc
LEFT JOIN payment_transactions pt ON uc.payment_id = pt.payu_payment_id
WHERE pt.payu_payment_id IS NULL;

\echo ''
\echo 'Details of orphaned records (if any):'
SELECT 
    uc.id,
    uc.payment_id,
    uc.user_id,
    uc.course_id,
    uc.amount,
    uc.purchase_date,
    uc.status,
    'ORPHANED - No matching payment_transaction' as issue
FROM user_courses uc
LEFT JOIN payment_transactions pt ON uc.payment_id = pt.payu_payment_id
WHERE pt.payu_payment_id IS NULL
LIMIT 10;

\echo ''
\echo '3. DUPLICATE PAYU_PAYMENT_ID CHECK'
\echo '-----------------------------------'
\echo 'Checking for duplicate payu_payment_ids in payment_transactions...'

SELECT 
    COUNT(*) as duplicate_groups
FROM (
    SELECT payu_payment_id, COUNT(*) as cnt
    FROM payment_transactions 
    WHERE payu_payment_id IS NOT NULL
    GROUP BY payu_payment_id 
    HAVING COUNT(*) > 1
) duplicates;

\echo ''
\echo 'Details of duplicate payu_payment_ids (if any):'
SELECT 
    payu_payment_id,
    COUNT(*) as occurrence_count,
    array_agg(transaction_id ORDER BY created_at) as transaction_ids,
    array_agg(status ORDER BY created_at) as statuses,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM payment_transactions 
WHERE payu_payment_id IS NOT NULL
GROUP BY payu_payment_id 
HAVING COUNT(*) > 1
LIMIT 10;

\echo ''
\echo '4. NULL PAYU_PAYMENT_ID CHECK'
\echo '------------------------------'
\echo 'Checking payment_transactions with NULL payu_payment_id...'

SELECT 
    status,
    COUNT(*) as count
FROM payment_transactions
WHERE payu_payment_id IS NULL
GROUP BY status
ORDER BY count DESC;

\echo ''
\echo '5. LINKAGE VERIFICATION'
\echo '-----------------------'
\echo 'Verifying how many user_courses can be linked to payment_transactions...'

SELECT 
    'Total user_courses' as metric,
    COUNT(*) as count
FROM user_courses
UNION ALL
SELECT 
    'Linkable to payment_transactions' as metric,
    COUNT(*) as count
FROM user_courses uc
INNER JOIN payment_transactions pt ON uc.payment_id = pt.payu_payment_id
UNION ALL
SELECT 
    'NOT linkable (orphaned)' as metric,
    COUNT(*) as count
FROM user_courses uc
LEFT JOIN payment_transactions pt ON uc.payment_id = pt.payu_payment_id
WHERE pt.payu_payment_id IS NULL;

\echo ''
\echo '6. PAYMENT_ID FORMAT CHECK'
\echo '--------------------------'
\echo 'Checking payment_id formats in user_courses...'

SELECT 
    CASE 
        WHEN payment_id ~ '^[0-9]+$' THEN 'Numeric (PayU mihpayid format)'
        WHEN payment_id ~ '^pay_' THEN 'Razorpay format (pay_*)'
        WHEN payment_id ~ '^LEGACY_' THEN 'Legacy/Manual entry'
        ELSE 'Other format'
    END as payment_id_format,
    COUNT(*) as count,
    MIN(LENGTH(payment_id)) as min_length,
    MAX(LENGTH(payment_id)) as max_length
FROM user_courses
GROUP BY 
    CASE 
        WHEN payment_id ~ '^[0-9]+$' THEN 'Numeric (PayU mihpayid format)'
        WHEN payment_id ~ '^pay_' THEN 'Razorpay format (pay_*)'
        WHEN payment_id ~ '^LEGACY_' THEN 'Legacy/Manual entry'
        ELSE 'Other format'
    END
ORDER BY count DESC;

\echo ''
\echo '7. RECENT TRANSACTIONS CHECK'
\echo '----------------------------'
\echo 'Recent payment_transactions (last 10):'

SELECT 
    transaction_id,
    payu_payment_id,
    status,
    amount,
    created_at,
    CASE 
        WHEN payu_payment_id IS NULL THEN '⚠️  NULL payu_payment_id'
        WHEN EXISTS (SELECT 1 FROM user_courses WHERE payment_id = pt.payu_payment_id) THEN '✓ Linked to user_course'
        ELSE '⚠️  Not linked to user_course'
    END as link_status
FROM payment_transactions pt
ORDER BY created_at DESC
LIMIT 10;

\echo ''
\echo '8. CONSTRAINT READINESS SUMMARY'
\echo '================================'

DO $$
DECLARE
    orphaned_count INTEGER;
    duplicate_count INTEGER;
    total_user_courses INTEGER;
    linkable_count INTEGER;
BEGIN
    -- Count orphaned records
    SELECT COUNT(*) INTO orphaned_count
    FROM user_courses uc
    LEFT JOIN payment_transactions pt ON uc.payment_id = pt.payu_payment_id
    WHERE pt.payu_payment_id IS NULL;
    
    -- Count duplicates
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT payu_payment_id, COUNT(*) as cnt
        FROM payment_transactions 
        WHERE payu_payment_id IS NOT NULL
        GROUP BY payu_payment_id 
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- Count total and linkable
    SELECT COUNT(*) INTO total_user_courses FROM user_courses;
    SELECT COUNT(*) INTO linkable_count
    FROM user_courses uc
    INNER JOIN payment_transactions pt ON uc.payment_id = pt.payu_payment_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║           MIGRATION READINESS ASSESSMENT                   ║';
    RAISE NOTICE '╠════════════════════════════════════════════════════════════╣';
    RAISE NOTICE '║ Total user_courses records:        %                      ║', LPAD(orphaned_count::text, 10);
    RAISE NOTICE '║ Linkable to payment_transactions:  %                      ║', LPAD(linkable_count::text, 10);
    RAISE NOTICE '║ Orphaned records:                  %                      ║', LPAD(orphaned_count::text, 10);
    RAISE NOTICE '║ Duplicate payu_payment_ids:        %                      ║', LPAD(duplicate_count::text, 10);
    RAISE NOTICE '╠════════════════════════════════════════════════════════════╣';
    
    IF orphaned_count = 0 AND duplicate_count = 0 THEN
        RAISE NOTICE '║ Status: ✓ READY FOR MIGRATION                             ║';
        RAISE NOTICE '║                                                            ║';
        RAISE NOTICE '║ All data integrity checks passed!                          ║';
        RAISE NOTICE '║ You can safely run the migration:                          ║';
        RAISE NOTICE '║   npm run migrate                                          ║';
    ELSE
        RAISE NOTICE '║ Status: ⚠️  ACTION REQUIRED BEFORE MIGRATION               ║';
        RAISE NOTICE '║                                                            ║';
        IF orphaned_count > 0 THEN
            RAISE NOTICE '║ ⚠️  Found % orphaned user_courses records              ║', orphaned_count;
            RAISE NOTICE '║    These must be fixed before adding FK constraint        ║';
        END IF;
        IF duplicate_count > 0 THEN
            RAISE NOTICE '║ ⚠️  Found % duplicate payu_payment_id values           ║', duplicate_count;
            RAISE NOTICE '║    These must be resolved before adding unique index      ║';
        END IF;
        RAISE NOTICE '║                                                            ║';
        RAISE NOTICE '║ See docs/PAYMENT_FK_MIGRATION_GUIDE.md for solutions       ║';
    END IF;
    
    RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
END $$;

\echo ''
\echo 'Check complete! Review the results above.'
\echo ''
\echo 'Next steps:'
\echo '  - If READY: Run "npm run migrate" to apply the foreign key constraint'
\echo '  - If ACTION REQUIRED: Fix data issues first (see PAYMENT_FK_MIGRATION_GUIDE.md)'
\echo '  - Always backup before migration: pg_dump -U postgres cs_compass > backup.sql'
\echo ''

