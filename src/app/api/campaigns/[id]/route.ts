import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// DELETE /api/campaigns/[id]
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = getServerSupabase();

    const adminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET;
    const adminSecret = request.headers.get('Admin-Secret');
    const isAdminRequest = adminPassword ? adminSecret === adminPassword : false;

    let body: { founder_address?: string } = {};
    try {
        body = await request.json().catch(() => ({}));
    } catch {
        body = {};
    }

    const { data: campaign } = await supabase
        .from('campaigns')
        .select('founder_address')
        .eq('id', id)
        .single();

    const founderMatch = campaign && body.founder_address && campaign.founder_address === body.founder_address.toLowerCase();

    if (!isAdminRequest && !founderMatch) {
        return NextResponse.json(
            { error: 'Forbidden: admin secret or campaign founder required to delete' },
            { status: 403 }
        );
    }

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
