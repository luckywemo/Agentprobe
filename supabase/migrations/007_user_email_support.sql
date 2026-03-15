-- Migration: Add Email column for Recovery & Identity
-- Run this in your Supabase SQL Editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Populate email for Google users who already logged in
-- For Google users, the user_id in our table is currently their email prefix or email
UPDATE users 
SET email = user_id || '@gmail.com' 
WHERE google_id IS NOT NULL AND email IS NULL AND user_id NOT LIKE '%@%';

-- Create index for email lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
