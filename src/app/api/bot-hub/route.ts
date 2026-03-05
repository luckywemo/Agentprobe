import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const supabase = getServerSupabase();
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');

    if (!owner) {
        return NextResponse.json({ error: 'Owner address required' }, { status: 400 });
    }

    // 1. Fetch managed bots for this owner address
    const { data: agents, error: agentErr } = await supabase
        .from('agents')
        .select('*')
        .eq('is_managed', true)
        .eq('owner_address', owner.toLowerCase());

    if (agentErr) {
        return NextResponse.json({ error: agentErr.message }, { status: 500 });
    }

    // 2. Fetch all-time stats (for earnings)
    const agentIds = agents?.map((a: { id: string }) => a.id) || [];
    const { data: allSubmissions, error: subErr } = await supabase
        .from('submissions')
        .select('*, campaigns(reward_per_task)')
        .in('agent_id', agentIds);
    // Note: We count all submissions for "Total Tasks", 
    // but only "paid" for "Total Earnings" below.

    if (subErr) {
        return NextResponse.json({ error: subErr.message }, { status: 500 });
    }

    // 3. Fetch RECENT Activities (for the Dashboard feed)
    const { data: recentActivities } = await supabase
        .from('submissions')
        .select('*, tasks(title), campaigns(reward_per_task)')
        .in('agent_id', agentIds)
        .order('created_at', { ascending: false })
        .limit(10);

    // Type the submissions for calculation
    const typed = (allSubmissions || []) as unknown as Array<{
        id: string;
        status: string;
        created_at: string;
        campaigns: { reward_per_task: number } | null;
    }>;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    let totalEarnings = 0;
    let dailyEarnings = 0;
    let monthlyEarnings = 0;
    let claimableBalance = 0;

    for (const sub of typed) {
        const isPaidOrApproved = sub.status === 'paid' || sub.status === 'approved';
        // Include claimed in total earnings count but not claimable
        const isEarned = isPaidOrApproved || sub.status === 'claimed';
        if (!isEarned) continue;

        const reward = sub.campaigns?.reward_per_task || 0;
        totalEarnings += reward;

        // Claimable = approved or paid (not yet claimed)
        if (isPaidOrApproved) {
            claimableBalance += reward;
        }

        // Time-based buckets (all earned submissions)
        if (sub.created_at >= oneDayAgo) {
            dailyEarnings += reward;
        }
        if (sub.created_at >= thirtyDaysAgo) {
            monthlyEarnings += reward;
        }
    }

    return NextResponse.json({
        agents: agents || [],
        activities: recentActivities || [],
        stats: {
            totalEarnings,
            dailyEarnings,
            monthlyEarnings,
            claimableBalance,
            totalBots: agents?.length || 0,
            idleBots: agents?.filter((a: { status: string }) => a.status === 'idle').length || 0,
            workingBots: agents?.filter((a: { status: string }) => a.status === 'working').length || 0,
            totalTasks: (allSubmissions || []).length,
        }
    });
}
