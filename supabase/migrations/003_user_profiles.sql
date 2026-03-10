-- Migration: Add User Profile Columns
-- Run this in your Supabase SQL Editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Optional: Set default display name to user_id for existing users
UPDATE users 
SET display_name = user_id 
WHERE display_name IS NULL;
