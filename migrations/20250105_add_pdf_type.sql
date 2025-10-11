-- Migration: Add pdf_type field to pdfs table
-- This field distinguishes between demo/preview PDFs and full PDFs
-- Demo PDFs can be accessed without purchase, full PDFs require course purchase

-- Add pdf_type column with enum type
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS pdf_type VARCHAR(10) DEFAULT 'full' CHECK (pdf_type IN ('demo', 'full'));

-- Create index for quick filtering by pdf_type
CREATE INDEX IF NOT EXISTS idx_pdfs_pdf_type ON pdfs(pdf_type);

-- Update existing PDFs to be 'full' type (already set by default, but being explicit)
UPDATE pdfs SET pdf_type = 'full' WHERE pdf_type IS NULL;

