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

        // Fetch all agents to compute trends and all-time stats
        const { data: allAgents, error: agentError } = await agentQuery;
        if (agentError) throw agentError;

        // Calculate 24h stats for TRENDING section
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const { data: recentWork, error: recentError } = await supabase
            .from('submissions')
            .select('agent_id, status, payout_tx_hash, created_at')
            .gte('created_at', twentyFourHoursAgo.toISOString())
            .order('created_at', { ascending: false });

        if (recentError) throw recentError;

        // Get latest transaction for EVERY agent (for proof feature)
        const { data: latestSubmissions, error: latestError } = await supabase
            .from('submissions')
            .select('agent_id, payout_tx_hash, created_at')
            .not('payout_tx_hash', 'is', null)
            .order('created_at', { ascending: false });

        if (latestError) throw latestError;

        const latestTxMap: Record<string, string> = {};
        latestSubmissions?.forEach(sub => {
            if (!latestTxMap[sub.agent_id]) latestTxMap[sub.agent_id] = sub.payout_tx_hash;
        });

        const dailyGrowth: Record<string, number> = {};
        recentWork?.forEach(work => {
            if (work.status === 'approved' || work.status === 'paid') {
                dailyGrowth[work.agent_id] = (dailyGrowth[work.agent_id] || 0) + 1;
            }
        });

        // Weekly processing
        if (period === 'weekly') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data: weeklySubs, error: subError } = await supabase
                .from('submissions')
                .select('agent_id, status')
                .gte('created_at', sevenDaysAgo.toISOString());

            if (subError) throw subError;

            const weeklyStats: Record<string, { approved: number, total: number }> = {};
            weeklySubs?.forEach(sub => {
                if (!weeklyStats[sub.agent_id]) weeklyStats[sub.agent_id] = { approved: 0, total: 0 };
                weeklyStats[sub.agent_id].total++;
                if (sub.status === 'approved' || sub.status === 'paid') weeklyStats[sub.agent_id].approved++;
            });

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
                    reputationScore: parseFloat(agent.reputation_score),
                    tier: agent.tier,
                    growth24h: dailyGrowth[agent.id] || 0,
                    latestTxHash: latestTxMap[agent.id] || null,
                    successRate: stats.total > 0
                        ? Math.round((stats.approved / stats.total) * 100)
                        : 0
                };
            })
            .sort((a, b) => b.approvedSubmissions - a.approvedSubmissions || b.reputationScore - a.reputationScore)
            .slice(0, 50);

            return NextResponse.json({ leaderboard: leaderboardData });
        }

        // All Time processing
        const leaderboardData = allAgents.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            walletAddress: agent.wallet_address,
            ownerName: agent.owner?.display_name || 'Anonymous',
            ownerAvatar: agent.owner?.avatar_url || null,
            approvedSubmissions: agent.approved_submissions,
            totalSubmissions: agent.total_submissions,
            reputationScore: parseFloat(agent.reputation_score),
            tier: agent.tier,
            growth24h: dailyGrowth[agent.id] || 0,
            latestTxHash: latestTxMap[agent.id] || null,
            successRate: agent.total_submissions > 0
                ? Math.round((agent.approved_submissions / agent.total_submissions) * 100)
                : 0
        }))
        .sort((a, b) => b.approvedSubmissions - a.approvedSubmissions || b.reputationScore - a.reputationScore)
        .slice(0, 50);

        // Calculate Trending (top 4 by growth in last 24h)
        const trending = [...leaderboardData]
            .filter(a => a.growth24h > 0)
            .sort((a, b) => b.growth24h - a.growth24h)
            .slice(0, 4);

        return NextResponse.json({ 
            leaderboard: leaderboardData,
            trending: trending
        });
    } catch (err: any) {
        console.error('[Leaderboard API] Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
