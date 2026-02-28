import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { getUsdcAddress, IS_TESTNET } from '@/lib/config';

/**
 * GET /api/wallet/balance?address=0x...
 * Fetches the USDC balance for a given wallet address on Base Mainnet or Sepolia.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address || !address.startsWith('0x')) {
        return NextResponse.json({ error: 'Valid wallet address required' }, { status: 400 });
    }

    try {
        const chain = IS_TESTNET ? baseSepolia : base;
        const usdcAddress = getUsdcAddress();

        const client = createPublicClient({
            chain,
            transport: http(),
        });

        // ERC20 balanceOf ABI
        const abi = [{
            "inputs": [{ "name": "account", "type": "address" }],
            "name": "balanceOf",
            "outputs": [{ "name": "balance", "type": "uint256" }],
            "type": "function"
        }];

        const balance = await client.readContract({
            address: usdcAddress,
            abi,
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
        }) as bigint;

        return NextResponse.json({
            balance: formatUnits(balance, 6),
            symbol: 'USDC',
            address
        });
    } catch (error) {
        console.error('Failed to fetch balance:', error);
        return NextResponse.json({ error: 'Failed to fetch onchain balance' }, { status: 500 });
    }
}
