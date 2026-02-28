import { createWalletClient, http, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { CampaignVaultABI } from '@/lib/contract-abi';
import { CAMPAIGN_VAULT_ADDRESS, CHAIN_ID, IS_TESTNET } from '@/lib/config';

/**
 * PayoutService
 * Handles the onchain transaction to trigger USDC payouts for approved submissions.
 * This runs on the server side using the PAYOUT_WALLET_PRIVATE_KEY.
 */
export async function processPayout(campaignId: number, agentWallet: string, submissionId: string) {
    const privateKey = process.env.PAYOUT_WALLET_PRIVATE_KEY as `0x${string}`;

    if (!privateKey) {
        console.error('PAYOUT_WALLET_PRIVATE_KEY is not set');
        return { success: false, error: 'Internal configuration error' };
    }

    if (CAMPAIGN_VAULT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        console.warn('CAMPAIGN_VAULT_ADDRESS is not set. Skipping onchain payout.');
        return { success: false, error: 'Contract address not configured' };
    }

    const account = privateKeyToAccount(privateKey);
    const chain = IS_TESTNET ? baseSepolia : base;

    const client = createWalletClient({
        account,
        chain,
        transport: http(),
    }).extend(publicActions);

    try {
        // submissionId in DB is UUID, contract expects bytes32. 
        // We convert it to a 32-byte hash to ensure uniqueness onchain.
        const submissionHash = submissionId.startsWith('0x')
            ? (submissionId as `0x${string}`)
            : `0x${submissionId.replace(/-/g, '')}`.padEnd(66, '0') as `0x${string}`;

        console.log(`Triggering payout for campaign ${campaignId}, agent ${agentWallet}, sub ${submissionId}`);

        const { request } = await client.simulateContract({
            account,
            address: CAMPAIGN_VAULT_ADDRESS,
            abi: CampaignVaultABI,
            functionName: 'payout',
            args: [BigInt(campaignId), agentWallet as `0x${string}`, submissionHash],
        });

        const hash = await client.writeContract(request);

        // Wait for transaction to be mined
        const receipt = await client.waitForTransactionReceipt({ hash });

        return {
            success: true,
            txHash: hash,
            blockNumber: receipt.blockNumber
        };
    } catch (error) {
        console.error('Payout failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * sendUsdc
 * Directly transfers USDC from the platform wallet to a destination.
 * Used for treasury withdrawals.
 */
export async function sendUsdc(to: string, amount: bigint) {
    const privateKey = process.env.PAYOUT_WALLET_PRIVATE_KEY as `0x${string}`;
    if (!privateKey) return { success: false, error: 'Internal configuration error' };

    const account = privateKeyToAccount(privateKey);
    const chain = IS_TESTNET ? baseSepolia : base;
    const usdcAddress = getUsdcAddress();

    const client = createWalletClient({
        account,
        chain,
        transport: http(),
    }).extend(publicActions);

    try {
        console.log(`Sending ${amount} units of USDC to ${to}`);
        
        // standard ERC20 transfer abi
        const abi = [{
            "inputs": [{"name": "to", "type": "address"}, {"name": "value", "type": "uint256"}],
            "name": "transfer",
            "outputs": [{"name": "success", "type": "bool"}],
            "type": "function"
        }];

        const { request } = await client.simulateContract({
            account,
            address: usdcAddress,
            abi,
            functionName: 'transfer',
            args: [to as `0x${string}`, amount],
        });

        const hash = await client.writeContract(request);
        const receipt = await client.waitForTransactionReceipt({ hash });

        return { success: true, txHash: hash, blockNumber: receipt.blockNumber };
    } catch (error) {
        console.error('Transfer failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
