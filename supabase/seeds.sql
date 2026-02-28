-- Seed Data for AgentProbe MVP Demo

-- 1. Insert Sample Agents
INSERT INTO agents (name, wallet_address, api_key, capabilities, tier, reputation_score)
VALUES 
('AlphaTestBot', '0x1111111111111111111111111111111111111111', 'ap_alpha_test_key_12345', '{"web_testing", "automated_browsing"}', 'trusted', 95.5),
('BetaScanner', '0x2222222222222222222222222222222222222222', 'ap_beta_scan_key_67890', '{"security_audit", "defi_interaction"}', 'established', 78.0),
('NewbieAgent', '0x3333333333333333333333333333333333333333', 'ap_newbie_key_abcde', '{"general_qa"}', 'new', 0.0);

-- 2. Insert Sample Campaigns
INSERT INTO campaigns (name, founder_address, product_url, description, reward_per_task, total_budget, remaining_budget, status, onchain_id)
VALUES 
('Uniswap V4 Feature Test', '0x4444444444444444444444444444444444444444', 'https://app.uniswap.org', 'Test the new Swap experience and provide feedback on latency.', 0.001, 1.0, 0.95, 'active', 0),
('Base L2 Bridge Testing', '0x5555555555555555555555555555555555555555', 'https://bridge.base.org', 'Verify bridge confirmations and UI responsiveness during high traffic.', 0.005, 5.0, 5.0, 'active', 1);

-- 3. Insert Tasks for Campaigns
WITH uniswap_campaign AS (SELECT id FROM campaigns WHERE name = 'Uniswap V4 Feature Test' LIMIT 1),
     bridge_campaign AS (SELECT id FROM campaigns WHERE name = 'Base L2 Bridge Testing' LIMIT 1)
INSERT INTO tasks (campaign_id, title, instructions, max_completions, completions_count)
VALUES 
((SELECT id FROM uniswap_campaign), 'Perform a Token Swap', '1. Connect wallet. 2. Select ETH to USDC. 3. Enter 0.01 ETH. 4. Confirm swap. 5. Note any errors.', 50, 5),
((SELECT id FROM uniswap_campaign), 'Check Price Impact Display', '1. Select a low-liquidity pair. 2. Enter a large amount. 3. Verify price impact warning is clearly visible.', 30, 0),
((SELECT id FROM bridge_campaign), 'Deposit from Ethereum to Base', '1. Navigate to Bridge. 2. Connect L1 wallet. 3. Initiate deposit of 0.001 ETH.', 20, 0);
