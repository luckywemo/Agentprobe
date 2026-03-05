import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// DELETE /api/campaigns/[id] — Soft-delete a campaign
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = getServerSupabase();

    console.log(`[API] Soft-deleting campaign: ${id}`);

    const { error } = await supabase
        .from('campaigns')
        .update({ is_deleted: true })
        .eq('id', id);

    if (error) {
        console.error('[API] Delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Campaign deleted successfully' });
}
