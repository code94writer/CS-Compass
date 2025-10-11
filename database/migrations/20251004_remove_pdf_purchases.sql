-- Migration: Remove direct PDF purchases and price from PDFs
-- PDFs are now only accessible through course purchases

-- 1. Drop the purchases table (handles direct PDF purchases)
DROP TABLE IF EXISTS purchases CASCADE;

-- 2. Remove price column from pdfs table
ALTER TABLE pdfs DROP COLUMN IF EXISTS price;

-- 3. Drop indexes related to purchases (if they exist)
DROP INDEX IF EXISTS idx_purchases_user_id;
DROP INDEX IF EXISTS idx_purchases_pdf_id;
DROP INDEX IF EXISTS idx_purchases_status;
DROP INDEX IF EXISTS idx_purchases_payment_id;

-- 4. Drop the index on pdfs.category_id if it still exists (was removed in previous migration)
DROP INDEX IF EXISTS idx_pdfs_category_id;

