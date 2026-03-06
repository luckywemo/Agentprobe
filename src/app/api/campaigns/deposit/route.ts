import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';
import { CampaignVaultABI } from '@/lib/contract-abi';
import { CAMPAIGN_VAULT_ADDRESS, USDC_DECIMALS } from '@/lib/config';

// Initialize Supabase admin client to read encrypted keys
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
    try {
        const { userId, depositAmount, rewardAmount } = await req.json();

        if (!userId || !depositAmount || !rewardAmount) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // 1. Get user's wallet info
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('encrypted_private_key')
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

        const depositParsed = parseUnits(depositAmount.toString(), USDC_DECIMALS);
        const rewardParsed = parseUnits(rewardAmount.toString(), USDC_DECIMALS);

        // 3. Execute the deposit transaction to create the campaign
        const txHash = await walletClient.writeContract({
            address: CAMPAIGN_VAULT_ADDRESS as `0x${string}`,
            abi: CampaignVaultABI,
            functionName: 'createCampaign',
            args: [depositParsed, rewardParsed],
        });

        return NextResponse.json({ txHash, success: true });

    } catch (error: any) {
        console.error('Deposit API error:', error);
        return NextResponse.json({ error: error.message || 'Deposit transaction failed' }, { status: 500 });
    }
}
