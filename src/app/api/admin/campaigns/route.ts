import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

function requireAdmin(request: NextRequest): boolean {
    const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET;
    if (!password) return true;
    return request.headers.get('Admin-Secret') === password;
}

/**
 * GET /api/admin/campaigns
 * List all campaigns (including soft-deleted) with timestamps for admin.
 * Requires Admin-Secret header if ADMIN_SECRET is set.
 */
export async function GET(request: NextRequest) {
    if (!requireAdmin(request)) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabase = getServerSupabase();

    const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, status, founder_address, reward_per_task, total_budget, remaining_budget, created_at, updated_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[Admin Campaigns]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ campaigns: data || [] });
}
