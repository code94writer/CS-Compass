-- Migration: Add thumbnail_url field to courses table
-- This field stores the path to the course thumbnail image

-- Add thumbnail_url column
ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Create index for quick filtering
CREATE INDEX IF NOT EXISTS idx_courses_thumbnail_url ON courses(thumbnail_url);

