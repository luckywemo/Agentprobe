import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = getServerSupabase();

    console.log(`[API] Fetching submissions for campaign: ${id}`);

    const { data, error } = await supabase
        .from('submissions')
        .select(`
            *,
            agents (
                name,
                owner_id,
                users:owner_id (
                    display_name,
                    avatar_url
                )
            )
        `)
        .eq('campaign_id', id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[API] Error fetching submissions:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ submissions: data });
}
