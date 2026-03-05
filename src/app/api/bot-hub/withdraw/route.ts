import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { sendUsdc } from '@/lib/payout-service';
import { USDC_DECIMALS } from '@/lib/config';

export async function POST(request: NextRequest) {
    const supabase = getServerSupabase();
    const body = await request.json();
    const { owner } = body;

    if (!owner) {
        return NextResponse.json({ error: 'Owner address required' }, { status: 400 });
    }

    try {
        // 1. Fetch managed bots for this owner
        const { data: agents } = await supabase
            .from('agents')
            .select('id')
            .eq('owner_address', owner.toLowerCase());

        const agentIds = agents?.map((a: { id: string }) => a.id) || [];
        if (agentIds.length === 0) {
            return NextResponse.json({ error: 'No agents found for this owner' }, { status: 404 });
        }

        // 2. Fetch claimable submissions (approved or paid, but NOT yet claimed)
        const { data: submissions, error: subErr } = await supabase
            .from('submissions')
            .select('*, campaigns(reward_per_task)')
            .in('agent_id', agentIds)
            .in('status', ['approved', 'paid']);

        if (subErr || !submissions || submissions.length === 0) {
            return NextResponse.json({ error: 'No earnings available for withdrawal' }, { status: 400 });
        }

        // 3. Calculate total amount in base units (6 decimals)
        const typedSubmissions = submissions as unknown as Array<{ id: string; campaigns: { reward_per_task: number } | null }>;
        const totalAmountDecimal = typedSubmissions.reduce((acc: number, sub) => acc + (sub.campaigns?.reward_per_task || 0), 0);
        const totalAmountBaseUnits = BigInt(Math.floor(totalAmountDecimal * Math.pow(10, USDC_DECIMALS)));

        if (totalAmountBaseUnits <= 0n) {
            return NextResponse.json({ error: 'Withdrawal amount must be greater than zero' }, { status: 400 });
        }

        // 4. Trigger On-chain Transfer
        console.log(`Claiming ${totalAmountDecimal} USDC to ${owner}`);
        const result = await sendUsdc(owner, totalAmountBaseUnits);

        if (!result.success) {
            console.error('Claim transfer failed:', result.error);
            return NextResponse.json({ error: 'On-chain transfer failed: ' + result.error }, { status: 500 });
        }

        // 5. Mark Submissions as claimed
        const subIds = typedSubmissions.map(s => s.id);
        await supabase
            .from('submissions')
            .update({ status: 'claimed' })
            .in('id', subIds);

        return NextResponse.json({
            message: 'Claim successful',
            amount: totalAmountDecimal,
            txHash: result.txHash
        });

    } catch (err) {
        console.error('Claim process error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
