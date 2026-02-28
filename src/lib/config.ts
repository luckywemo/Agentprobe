// --- AgentProbe Configuration ---

// Base Mainnet USDC
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
// Base Sepolia USDC (for testing)
export const USDC_SEPOLIA_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;

// CampaignVault contract address (set after deployment)
export const CAMPAIGN_VAULT_ADDRESS = (process.env.NEXT_PUBLIC_CAMPAIGN_VAULT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

// USDC has 6 decimals
export const USDC_DECIMALS = 6;

// Default reward per task: 0.001 USDC = 1000 units (6 decimals)
export const DEFAULT_REWARD_PER_TASK = 1000n; // 0.001 USDC

// Task claim TTL in minutes
export const TASK_CLAIM_TTL_MINUTES = 15;

// Rate limiting
export const MAX_SUBMISSIONS_PER_HOUR = 5;
export const MIN_CLAIM_COOLDOWN_SECONDS = 60;

// Reputation tiers
export const REPUTATION_TIERS = {
  NEW: { min: 0, max: 50, label: 'New', maxTasksPerDay: 3 },
  ESTABLISHED: { min: 51, max: 80, label: 'Established', maxTasksPerDay: 20 },
  TRUSTED: { min: 81, max: 100, label: 'Trusted', maxTasksPerDay: 999 },
} as const;

// Chain config
export const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID === '84532' ? 84532 : 8453;
export const IS_TESTNET = CHAIN_ID === 84532;

export function getUsdcAddress(): `0x${string}` {
  return IS_TESTNET ? USDC_SEPOLIA_ADDRESS : USDC_ADDRESS;
}
