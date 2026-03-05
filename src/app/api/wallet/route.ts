import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, formatUnits, parseUnits, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { getUsdcAddress, IS_TESTNET } from '@/lib/config';
import { getServerSupabase } from '@/lib/supabase';

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
 * Executes a transfer of ETH or USDC from the user's managed wallet.
 * Body: { from: string, to: string, amount: string, asset: 'ETH' | 'USDC', userId: string }
 */
export async function POST(request: NextRequest) {
    try {
        const { to, amount, asset, userId } = await request.json();

        if (!to || !amount || !asset || !userId) {
            return NextResponse.json({ error: 'Missing required fields: to, amount, asset, userId' }, { status: 400 });
        }

        const supabase = getServerSupabase();
        
        // Fetch the user's specific private key
        const { data: user, error: fetchErr } = await supabase
            .from('users')
            .select('encrypted_private_key')
            .eq('user_id', userId.toLowerCase().trim())
            .single();

        if (fetchErr || !user || !user.encrypted_private_key) {
            console.error('Failed to fetch user private key:', fetchErr);
            return NextResponse.json({ error: 'Failed to access wallet credentials' }, { status: 401 });
        }

        const privateKey = user.encrypted_private_key.startsWith('0x') 
            ? user.encrypted_private_key 
            : `0x${user.encrypted_private_key}`;

        const account = privateKeyToAccount(privateKey as `0x${string}`);
        const chain = IS_TESTNET ? baseSepolia : base;

        const client = createWalletClient({
            account,
            chain,
            transport: http(),
        }).extend(publicActions);

        let txHash;

        if (asset === 'ETH') {
            const amountWei = parseUnits(amount, 18);
            console.log(`Sending ${amountWei} wei to ${to} from ${account.address}`);
            
            txHash = await client.sendTransaction({
                account,
                to: to as `0x${string}`,
                value: amountWei,
            });
            
            await client.waitForTransactionReceipt({ hash: txHash });
            
        } else if (asset === 'USDC') {
            const amountBase = parseUnits(amount, 6);
            const usdcAddress = getUsdcAddress();
            console.log(`Sending ${amountBase} USDC to ${to} from ${account.address}`);

            const abi = [{
                "inputs": [{ "name": "to", "type": "address" }, { "name": "value", "type": "uint256" }],
                "name": "transfer",
                "outputs": [{ "name": "success", "type": "bool" }],
                "type": "function"
            }];

            const { request } = await client.simulateContract({
                account,
                address: usdcAddress,
                abi,
                functionName: 'transfer',
                args: [to as `0x${string}`, amountBase],
            });

            txHash = await client.writeContract(request);
            await client.waitForTransactionReceipt({ hash: txHash });
            
        } else {
            return NextResponse.json({ error: 'Invalid asset' }, { status: 400 });
        }

        return NextResponse.json({ success: true, txHash });

    } catch (error) {
        console.error('Wallet transfer API error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Transfer failed' }, { status: 500 });
    }
}
