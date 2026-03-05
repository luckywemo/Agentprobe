import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits, parseUnits } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { getUsdcAddress, IS_TESTNET } from '@/lib/config';
import { getServerSupabase } from '@/lib/supabase';
import { sendUsdc, sendEth } from '@/lib/payout-service';

/**
 * GET /api/wallet?address=0x...
 * Fetches both ETH and USDC balances for a given address.
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

        // Fetch ETH balance
        const ethBalance = await client.getBalance({ address: address as `0x${string}` });

        // ERC20 balanceOf ABI for USDC
        const abi = [{
            "inputs": [{ "name": "account", "type": "address" }],
            "name": "balanceOf",
            "outputs": [{ "name": "balance", "type": "uint256" }],
            "type": "function"
        }];

        const usdcBalanceToken = await client.readContract({
            address: usdcAddress,
            abi,
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
        }) as bigint;

        return NextResponse.json({
            eth: formatUnits(ethBalance, 18),
            usdc: formatUnits(usdcBalanceToken, 6),
            address
        });
    } catch (error) {
        console.error('Failed to fetch wallet balances:', error);
        return NextResponse.json({ error: 'Failed to fetch onchain balances' }, { status: 500 });
    }
}

/**
 * POST /api/wallet
 * Executes a transfer of ETH or USDC.
 * Body: { from: string, to: string, amount: string, asset: 'ETH' | 'USDC' }
 * Security: This currently uses the system payout wallet. 
 * In a real app, this would use the private key associated with the 'from' address.
 */
export async function POST(request: NextRequest) {
    try {
        const { to, amount, asset } = await request.json();

        if (!to || !amount || !asset) {
            return NextResponse.json({ error: 'Missing required fields: to, amount, asset' }, { status: 400 });
        }

        let result;
        if (asset === 'ETH') {
            const amountWei = parseUnits(amount, 18);
            result = await sendEth(to, amountWei);
        } else if (asset === 'USDC') {
            const amountBase = parseUnits(amount, 6);
            result = await sendUsdc(to, amountBase);
        } else {
            return NextResponse.json({ error: 'Invalid asset' }, { status: 400 });
        }

        if (result.success) {
            return NextResponse.json({ success: true, txHash: result.txHash });
        } else {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }
    } catch (error) {
        console.error('Wallet transfer API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
