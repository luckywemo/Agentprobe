import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { calculateReputation } from '@/lib/eas';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ agent: string }> }
) {
    const { agent: agentWallet } = await params;
    const supabase = getServerSupabase();

    if (!agentWallet) {
        return NextResponse.json({ error: 'Agent wallet address required' }, { status: 400 });
    }

    // Query the agent's submission history for reputation calculation
    const { data: agentData } = await supabase
        .from('agents')
        .select('id, name, wallet_address, reputation_score, approved_submissions')
        .eq('wallet_address', agentWallet.toLowerCase())
        .single();

    if (!agentData) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Fetch all submissions for this agent
    const { data: submissions } = await supabase
        .from('submissions')
        .select('status')
        .eq('agent_id', agentData.id);

    const total = submissions?.length || 0;
    const approved = submissions?.filter(s => s.status === 'approved' || s.status === 'paid' || s.status === 'claimed').length || 0;
    const rejected = submissions?.filter(s => s.status === 'rejected').length || 0;

    const reputation = calculateReputation(total, approved, rejected);

    return NextResponse.json({
        agent: {
            id: agentData.id,
            name: agentData.name,
            wallet: agentData.wallet_address,
        },
        reputation,
        stats: {
            totalSubmissions: total,
            approved,
            rejected,
            pending: total - approved - rejected,
        },
    });
}
