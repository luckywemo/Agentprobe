import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';
import { ERC20ABI } from '@/lib/contract-abi';
import { CAMPAIGN_VAULT_ADDRESS, getUsdcAddress, USDC_DECIMALS } from '@/lib/config';

// Initialize Supabase admin client to read encrypted keys
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
    try {
        const { userId, amount } = await req.json();

        if (!userId || !amount) {
            return NextResponse.json({ error: 'Missing userId or amount' }, { status: 400 });
        }

        // 1. Get user's wallet info from the db
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('encrypted_private_key, wallet_address')
            .eq('id', userId)
            .single();

        if (userError || !userData?.encrypted_private_key) {
            return NextResponse.json({ error: 'User wallet not found' }, { status: 404 });
        }

        // 2. Setup Viem wallet client
        const account = privateKeyToAccount(userData.encrypted_private_key as `0x${string}`);
        
        const walletClient = createWalletClient({
            account,
            chain: base,
            transport: http(),
        });

        const approveAmount = parseUnits(amount.toString(), USDC_DECIMALS);

        // 3. Execute the approve transaction
        const txHash = await walletClient.writeContract({
            address: getUsdcAddress(),
            abi: ERC20ABI,
            functionName: 'approve',
            args: [CAMPAIGN_VAULT_ADDRESS, approveAmount],
        });

        return NextResponse.json({ txHash, success: true });

    } catch (error: any) {
        console.error('Approve API error:', error);
        return NextResponse.json({ error: error.message || 'Approval transaction failed' }, { status: 500 });
    }
}
