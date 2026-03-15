import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

/**
 * GET /api/profile?id=xxx
 * POST /api/profile
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const supabase = getServerSupabase();

    if (!id) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('users')
        .select('id, user_id, google_id, display_name, avatar_url, role, wallet_address, bot_slots, reputation_milestones, created_at')
        .or(`id.eq.${id},google_id.eq.${id}`)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('[Profile API] Fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
    const supabase = getServerSupabase();
    try {
        const body = await request.json();
        const { id, display_name, avatar_url } = body;

        if (!id) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('users')
            .update({
                display_name,
                avatar_url,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Profile updated successfully',
            user: data
        });
    } catch (err) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
