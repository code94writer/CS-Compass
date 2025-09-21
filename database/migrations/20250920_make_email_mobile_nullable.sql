-- Migration: Make email and mobile nullable in users table
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN mobile DROP NOT NULL;
