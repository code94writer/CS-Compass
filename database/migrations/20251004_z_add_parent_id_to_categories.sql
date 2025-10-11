-- Migration: Add parent_id column to categories table for hierarchical categories
-- This allows categories to have parent-child relationships

-- Add parent_id column to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Create index for parent_id for better query performance
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

