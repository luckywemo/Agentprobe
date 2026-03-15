-- Telemetry logs for live agent activity feeds
CREATE TABLE IF NOT EXISTS telemetry_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    log_type TEXT DEFAULT 'info',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_campaign ON telemetry_logs(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_agent ON telemetry_logs(agent_id, created_at DESC);
