-- Migration: Add Managed Bot capabilities
-- 1. Create Bot Type Enum
DO $$ BEGIN
    CREATE TYPE bot_type AS ENUM ('testing', 'social', 'user_custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Modify Agents Table
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS owner_id UUID,
ADD COLUMN IF NOT EXISTS is_managed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS type bot_type DEFAULT 'testing',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'working', 'paused')),
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"min_reward": 0, "auto_claim": true}',
ADD COLUMN IF NOT EXISTS encrypted_private_key TEXT;

-- 3. Add Index for Matchmaking
CREATE INDEX IF NOT EXISTS idx_agents_matchmaking ON agents(type, is_managed, status) 
WHERE is_managed = TRUE AND status = 'idle';
