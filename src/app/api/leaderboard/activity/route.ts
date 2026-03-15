import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const supabase = getServerSupabase();

    try {
        const { data, error } = await supabase
            .from('telemetry_logs')
            .select(`
                id,
                message,
                log_type,
                created_at,
                agent_id,
                agents (
                    name
                )
            `)
            .order('created_at', { ascending: false })
            .limit(15);

        if (error) throw error;

        return NextResponse.json({ activity: data || [] });
    } catch (err: any) {
        console.error('[Leaderboard Activity API] Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
