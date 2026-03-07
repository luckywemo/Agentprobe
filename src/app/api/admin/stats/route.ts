import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

function requireAdmin(request: NextRequest): boolean {
    const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET;
    if (!password) return true;
    return request.headers.get('Admin-Secret') === password;
}

/**
 * GET /api/admin/stats
 * Platform overview: users, bot owners, managed bots, campaigns, recent activities.
 * Requires Admin-Secret header if ADMIN_SECRET is set.
 */
export async function GET(request: NextRequest) {
    if (!requireAdmin(request)) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabase = getServerSupabase();

    try {
        const [usersResult, agentsResult, campaignsResult, submissionsResult] = await Promise.all([
            supabase.from('users').select('id, role'),
            supabase.from('agents').select('id, is_managed, owner_address'),
            supabase.from('campaigns').select('id, created_at'),
            supabase.from('submissions').select('id, status, created_at, agent_id, campaign_id').order('created_at', { ascending: false }).limit(50),
        ]);

        const users = (usersResult.data || []) as { id: string; role: string }[];
        const agents = (agentsResult.data || []) as { id: string; is_managed?: boolean; owner_address?: string }[];
        const campaigns = campaignsResult.data || [];
        const submissions = submissionsResult.data || [];

        const totalUsers = users.length;
        const founderCount = users.filter((u) => u.role === 'founder').length;
        const botHubCount = users.filter((u) => u.role === 'bot-hub').length;
        const managedBots = agents.filter((a) => a.is_managed === true);
        const uniqueBotOwners = new Set(managedBots.map((a) => a.owner_address).filter(Boolean)).size;

        const recentActivities = (submissions as { id: string; status: string; created_at: string; agent_id: string; campaign_id: string }[])
            .slice(0, 20)
            .map((s) => ({
                id: s.id,
                type: 'submission',
                status: s.status,
                created_at: s.created_at,
                agent_id: s.agent_id,
                campaign_id: s.campaign_id,
            }));

        return NextResponse.json({
            totalUsers,
            founderCount,
            botHubCount,
            managedBotsCount: managedBots.length,
            uniqueBotOwners,
            totalCampaigns: campaigns.length,
            recentActivities,
        });
    } catch (err) {
        console.error('[Admin Stats]', err);
        return NextResponse.json({ error: 'Failed to load admin stats' }, { status: 500 });
    }
}
