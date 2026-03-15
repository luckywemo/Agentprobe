import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// POST /api/telemetry — Agent sends a status update
export async function POST(request: NextRequest) {
    const supabase = getServerSupabase();

    try {
        const body = await request.json();
        const { campaign_id, agent_id, task_id, message, log_type } = body;

        if (!campaign_id || !agent_id || !message) {
            return NextResponse.json(
                { error: 'Missing required fields: campaign_id, agent_id, message' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('telemetry_logs')
            .insert({
                campaign_id,
                agent_id,
                task_id: task_id || null,
                message,
                log_type: log_type || 'info',
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ log: data }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}

// GET /api/telemetry?campaign_id=xxx — Founder polls for live updates
export async function GET(request: NextRequest) {
    const supabase = getServerSupabase();
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaign_id');

    if (!campaignId) {
        return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('telemetry_logs')
        .select('*, agents(name)')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: data || [] });
}
