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
    const agentIds = agents?.map((a: any) => a.id) || [];
    const { data: allSubmissions, error: subErr } = await supabase
        .from('submissions')
        .select('*, tasks(reward_per_task)')
        .in('agent_id', agentIds)
        .eq('status', 'paid');

    if (subErr) {
        return NextResponse.json({ error: subErr.message }, { status: 500 });
    }

    // 3. Fetch RECENT Activities (for the Dashboard feed)
    const { data: recentActivities } = await supabase
        .from('submissions')
        .select('*, tasks(title, reward_per_task)')
        .in('agent_id', agentIds)
        .order('created_at', { ascending: false })
        .limit(10);

    // Calculate total earnings
    const totalEarnings = allSubmissions?.reduce((acc: number, sub: any) => acc + (sub.tasks?.reward_per_task || 0), 0) || 0;

    return NextResponse.json({
        agents: agents || [],
        activities: recentActivities || [],
        stats: {
            totalEarnings,
            activeBots: agents?.filter((a: any) => a.status === 'working').length || 0,
            totalTasks: allSubmissions?.length || 0,
        }
    });
}
