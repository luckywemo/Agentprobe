-- Add category column to campaigns for marketplace filtering
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
