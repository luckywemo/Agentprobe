// CampaignVault ABI
export const CampaignVaultABI = [
    {
        type: 'constructor',
        inputs: [{ name: '_usdc', type: 'address', internalType: 'address' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'usdc',
        inputs: [],
        outputs: [{ name: '', type: 'address', internalType: 'contract IERC20' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'nextCampaignId',
        inputs: [],
        outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'campaigns',
        inputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
        outputs: [
            { name: 'founder', type: 'address', internalType: 'address' },
            { name: 'balance', type: 'uint256', internalType: 'uint256' },
            { name: 'rewardPerTask', type: 'uint256', internalType: 'uint256' },
            { name: 'active', type: 'bool', internalType: 'bool' },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'paidSubmissions',
        inputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
        outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'createCampaign',
        inputs: [
            { name: 'deposit', type: 'uint256', internalType: 'uint256' },
            { name: 'rewardPerTask', type: 'uint256', internalType: 'uint256' },
        ],
        outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'payout',
        inputs: [
            { name: 'campaignId', type: 'uint256', internalType: 'uint256' },
            { name: 'agent', type: 'address', internalType: 'address' },
            { name: 'submissionId', type: 'bytes32', internalType: 'bytes32' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'closeCampaign',
        inputs: [{ name: 'campaignId', type: 'uint256', internalType: 'uint256' }],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'owner',
        inputs: [],
        outputs: [{ name: '', type: 'address', internalType: 'address' }],
        stateMutability: 'view',
    },
    {
        type: 'event',
        name: 'CampaignCreated',
        inputs: [
            { name: 'id', type: 'uint256', indexed: true, internalType: 'uint256' },
            { name: 'founder', type: 'address', indexed: false, internalType: 'address' },
            { name: 'deposit', type: 'uint256', indexed: false, internalType: 'uint256' },
            { name: 'rewardPerTask', type: 'uint256', indexed: false, internalType: 'uint256' },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'Payout',
        inputs: [
            { name: 'campaignId', type: 'uint256', indexed: true, internalType: 'uint256' },
            { name: 'agent', type: 'address', indexed: true, internalType: 'address' },
            { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
            { name: 'submissionId', type: 'bytes32', indexed: false, internalType: 'bytes32' },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'CampaignClosed',
        inputs: [
            { name: 'id', type: 'uint256', indexed: true, internalType: 'uint256' },
            { name: 'refunded', type: 'uint256', indexed: false, internalType: 'uint256' },
        ],
        anonymous: false,
    },
] as const;

// Standard ERC20 ABI for USDC approve
export const ERC20ABI = [
    {
        type: 'function',
        name: 'approve',
        inputs: [
            { name: 'spender', type: 'address', internalType: 'address' },
            { name: 'amount', type: 'uint256', internalType: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'allowance',
        inputs: [
            { name: 'owner', type: 'address', internalType: 'address' },
            { name: 'spender', type: 'address', internalType: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'balanceOf',
        inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
        outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'decimals',
        inputs: [],
        outputs: [{ name: '', type: 'uint8', internalType: 'uint8' }],
        stateMutability: 'view',
    },
] as const;
