-- Migration: Gmail Auth & Bot Scaling
-- 1. Add Auth & Scaling Columns to Users Table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS bot_slots INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS slots_unlocked_at TIMESTAMPTZ[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS reputation_milestones INTEGER DEFAULT 0;

-- 2. Create Index for Google ID lookup
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Note: Ensure you have enabled Google Provider in Supabase Auth Dashboard
-- AND added the redirect URL: http://localhost:3000/api/auth/callback
