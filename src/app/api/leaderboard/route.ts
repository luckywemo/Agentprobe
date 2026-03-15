import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all'; // 'all' or 'weekly'
    const supabase = getServerSupabase();

    try {
        let agentQuery = supabase
            .from('agents')
            .select(`
                id,
                name,
                wallet_address,
                total_submissions,
                approved_submissions,
                reputation_score,
                tier,
                owner_id,
                owner:users!owner_id (
                    display_name,
                    avatar_url
                )
            `);

        // If weekly, we need to calculate rankings based on recent submissions
        if (period === 'weekly') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Fetch submission counts per agent for the last 7 days
            const { data: recentSubmissions, error: subError } = await supabase
                .from('submissions')
                .select('agent_id, status')
                .gte('created_at', sevenDaysAgo.toISOString());

            if (subError) throw subError;

            // Aggregate weekly stats
            const weeklyStats: Record<string, { approved: number, total: number }> = {};
            recentSubmissions?.forEach(sub => {
                if (!weeklyStats[sub.agent_id]) weeklyStats[sub.agent_id] = { approved: 0, total: 0 };
                weeklyStats[sub.agent_id].total++;
                if (sub.status === 'approved' || sub.status === 'paid') weeklyStats[sub.agent_id].approved++;
            });

            // Fetch all agents and then sort/filter in JS for the "weekly" view
            const { data: allAgents, error: agentError } = await agentQuery;
            if (agentError) throw agentError;

            const leaderboardData = allAgents.map((agent: any) => {
                const stats = weeklyStats[agent.id] || { approved: 0, total: 0 };
                return {
                    id: agent.id,
                    name: agent.name,
                    walletAddress: agent.wallet_address,
                    ownerName: agent.owner?.display_name || 'Anonymous',
                    ownerAvatar: agent.owner?.avatar_url || null,
                    approvedSubmissions: stats.approved,
                    totalSubmissions: stats.total,
                    reputationScore: agent.reputation_score,
                    tier: agent.tier,
                    successRate: stats.total > 0
                        ? Math.round((stats.approved / stats.total) * 100)
                        : 0
                };
            })
                .sort((a, b) => b.approvedSubmissions - a.approvedSubmissions || b.reputationScore - a.reputationScore)
                .slice(0, 50);

            return NextResponse.json({ leaderboard: leaderboardData });
        }

        // Default 'all' time ranking (using pre-aggregated columns)
        const { data: agents, error } = await agentQuery
            .order('approved_submissions', { ascending: false })
            .order('reputation_score', { ascending: false })
            .limit(50);

        if (error) throw error;

        const leaderboardData = agents.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            walletAddress: agent.wallet_address,
            ownerName: agent.owner?.display_name || 'Anonymous',
            ownerAvatar: agent.owner?.avatar_url || null,
            approvedSubmissions: agent.approved_submissions,
            totalSubmissions: agent.total_submissions,
            reputationScore: agent.reputation_score,
            tier: agent.tier,
            successRate: agent.total_submissions > 0
                ? Math.round((agent.approved_submissions / agent.total_submissions) * 100)
                : 0
        }));

        return NextResponse.json({ leaderboard: leaderboardData });
    } catch (err: any) {
        console.error('[Leaderboard API] Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
