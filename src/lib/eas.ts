import { createPublicClient, createWalletClient, http, encodePacked, keccak256 } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// EAS contract addresses on Base (predeploys)
const EAS_CONTRACT = '0x4200000000000000000000000000000000000021' as const;
const SCHEMA_REGISTRY = '0x4200000000000000000000000000000000000020' as const;

// Our schema: "address agent, string campaignId, uint8 score, string feedback"
// You should register this schema once on Base via the SchemaRegistry.
// For now we'll use a placeholder schema UID that you can replace after registration.
const SCHEMA_UID = process.env.EAS_SCHEMA_UID || '0x0000000000000000000000000000000000000000000000000000000000000000';

// Minimal EAS ABI for attestation
const EAS_ABI = [
    {
        name: 'attest',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
            {
                name: 'request',
                type: 'tuple',
                components: [
                    { name: 'schema', type: 'bytes32' },
                    {
                        name: 'data',
                        type: 'tuple',
                        components: [
                            { name: 'recipient', type: 'address' },
                            { name: 'expirationTime', type: 'uint64' },
                            { name: 'revocable', type: 'bool' },
                            { name: 'refUID', type: 'bytes32' },
                            { name: 'data', type: 'bytes' },
                            { name: 'value', type: 'uint256' },
                        ],
                    },
                ],
            },
        ],
        outputs: [{ name: '', type: 'bytes32' }],
    },
    {
        name: 'getAttestation',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'uid', type: 'bytes32' }],
        outputs: [
            {
                name: '',
                type: 'tuple',
                components: [
                    { name: 'uid', type: 'bytes32' },
                    { name: 'schema', type: 'bytes32' },
                    { name: 'time', type: 'uint64' },
                    { name: 'expirationTime', type: 'uint64' },
                    { name: 'revocationTime', type: 'uint64' },
                    { name: 'refUID', type: 'bytes32' },
                    { name: 'recipient', type: 'address' },
                    { name: 'attester', type: 'address' },
                    { name: 'revocable', type: 'bool' },
                    { name: 'data', type: 'bytes' },
                ],
            },
        ],
    },
] as const;

const publicClient = createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

function getWalletClient() {
    const pk = process.env.PLATFORM_PRIVATE_KEY;
    if (!pk) throw new Error('PLATFORM_PRIVATE_KEY not set');
    const account = privateKeyToAccount(pk as `0x${string}`);
    return createWalletClient({
        account,
        chain: base,
        transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
    });
}

/**
 * Create an onchain attestation for an agent's completed work.
 */
export async function createAttestation(
    agentWallet: string,
    campaignId: string,
    score: number,
    feedback: string = ''
): Promise<string> {
    const walletClient = getWalletClient();

    // Encode the attestation data
    const encodedData = encodePacked(
        ['address', 'string', 'uint8', 'string'],
        [agentWallet as `0x${string}`, campaignId, score, feedback]
    );

    const txHash = await walletClient.writeContract({
        address: EAS_CONTRACT,
        abi: EAS_ABI,
        functionName: 'attest',
        args: [
            {
                schema: SCHEMA_UID as `0x${string}`,
                data: {
                    recipient: agentWallet as `0x${string}`,
                    expirationTime: 0n,
                    revocable: false,
                    refUID: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
                    data: encodedData,
                    value: 0n,
                },
            },
        ],
    });

    return txHash;
}

/**
 * Calculate an agent's reputation from their Supabase submission history.
 * This is a lightweight, off-chain aggregation (no EAS read needed for MVP).
 * Once attestations are live, this can be replaced with on-chain reads.
 */
export function calculateReputation(
    totalSubmissions: number,
    approvedSubmissions: number,
    rejectedSubmissions: number
): { score: number; tier: string; label: string } {
    if (totalSubmissions === 0) {
        return { score: 0, tier: 'unrated', label: 'Unrated' };
    }

    const successRate = approvedSubmissions / totalSubmissions;
    const score = Math.round(successRate * 100);

    let tier: string;
    let label: string;

    if (score >= 90 && approvedSubmissions >= 10) {
        tier = 'elite';
        label = '◆ Elite';
    } else if (score >= 75 && approvedSubmissions >= 5) {
        tier = 'trusted';
        label = '◇ Trusted';
    } else if (score >= 50) {
        tier = 'established';
        label = '○ Established';
    } else {
        tier = 'new';
        label = '· New';
    }

    return { score, tier, label };
}

export { EAS_CONTRACT, SCHEMA_REGISTRY, SCHEMA_UID, publicClient };
