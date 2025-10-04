-- Migration: Convert S3 URLs to local paths
-- This migration updates any S3 URLs in the database to local file paths

-- Update PDFs table - convert S3 URLs to local paths
-- Pattern: Replace any S3 URLs (https://..., s3://..., mock://...) with local paths
UPDATE pdfs 
SET file_url = CASE 
  WHEN file_url LIKE 'http%' OR file_url LIKE 's3://%' OR file_url LIKE 'mock://%' THEN 
    'uploads/local/' || SUBSTRING(file_url FROM '[^/]+\.pdf$')
  ELSE 
    file_url
END
WHERE file_url LIKE 'http%' OR file_url LIKE 's3://%' OR file_url LIKE 'mock://%';

-- Update thumbnail URLs
UPDATE pdfs 
SET thumbnail_url = CASE 
  WHEN thumbnail_url LIKE 'http%' OR thumbnail_url LIKE 's3://%' OR thumbnail_url LIKE 'mock://%' THEN 
    'uploads/thumbnails/' || SUBSTRING(thumbnail_url FROM '[^/]+\.(jpg|jpeg|png|gif|webp)$')
  ELSE 
    thumbnail_url
END
WHERE thumbnail_url IS NOT NULL 
  AND (thumbnail_url LIKE 'http%' OR thumbnail_url LIKE 's3://%' OR thumbnail_url LIKE 'mock://%');

-- Note: This migration assumes that files have already been downloaded from S3 
-- and placed in the local uploads/local/ and uploads/thumbnails/ directories
-- with the same filenames as they had in S3.

