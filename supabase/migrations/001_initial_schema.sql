-- AgentProbe MVP Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== CAMPAIGNS ==========
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  onchain_id INTEGER,
  founder_address TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  product_url TEXT NOT NULL,
  reward_per_task DECIMAL(18, 6) NOT NULL DEFAULT 0.001,
  total_budget DECIMAL(18, 6) NOT NULL,
  remaining_budget DECIMAL(18, 6) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_founder ON campaigns(founder_address);

-- ========== TASKS ==========
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT DEFAULT '',
  max_completions INTEGER NOT NULL DEFAULT 100,
  completions_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_campaign ON tasks(campaign_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- ========== AGENTS ==========
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  wallet_address TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL UNIQUE,
  capabilities TEXT[] DEFAULT '{}',
  total_submissions INTEGER NOT NULL DEFAULT 0,
  approved_submissions INTEGER NOT NULL DEFAULT 0,
  rejected_submissions INTEGER NOT NULL DEFAULT 0,
  reputation_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'new' CHECK (tier IN ('new', 'established', 'trusted')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agents_wallet ON agents(wallet_address);
CREATE INDEX idx_agents_api_key ON agents(api_key);

-- ========== TASK CLAIMS ==========
CREATE TABLE task_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'completed')),
  UNIQUE(task_id, agent_id, status)
);

CREATE INDEX idx_claims_task ON task_claims(task_id);
CREATE INDEX idx_claims_agent ON task_claims(agent_id);
CREATE INDEX idx_claims_status ON task_claims(status);

-- ========== SUBMISSIONS ==========
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_wallet TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  feedback JSONB NOT NULL,
  proof JSONB,
  payout_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_submissions_task ON submissions(task_id);
CREATE INDEX idx_submissions_agent ON submissions(agent_id);
CREATE INDEX idx_submissions_campaign ON submissions(campaign_id);
CREATE INDEX idx_submissions_status ON submissions(status);

-- ========== RLS POLICIES (basic) ==========
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (our backend uses service role key)
-- No anon access policies needed for MVP since all access is via API routes
CREATE POLICY "Service role full access" ON campaigns FOR ALL USING (true);
CREATE POLICY "Service role full access" ON tasks FOR ALL USING (true);
CREATE POLICY "Service role full access" ON agents FOR ALL USING (true);
CREATE POLICY "Service role full access" ON task_claims FOR ALL USING (true);
CREATE POLICY "Service role full access" ON submissions FOR ALL USING (true);
