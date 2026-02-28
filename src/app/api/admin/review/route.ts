import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// GET /api/admin/review — List pending submissions
export async function GET(request: NextRequest) {
    const supabase = getServerSupabase();
    const { searchParams } = new URL(request.url);
    const founder = searchParams.get('founder');

    let query = supabase
        .from('submissions')
        .select('*, tasks(title, campaign_id), agents(name, wallet_address, tier, reputation_score)')
        .eq('status', 'pending');

    if (founder) {
        // Filter tasks by campaign_id where campaign has this founder_address
        // First, get those campaign IDs
        const { data: campaigns } = await supabase
            .from('campaigns')
            .select('id')
            .eq('founder_address', founder.toLowerCase());

        const campaignIds = campaigns?.map(c => c.id) || [];
        query = query.in('campaign_id', campaignIds);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
        console.error('[API/Review] Supabase Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[API/Review] Fetched ${data?.length || 0} pending submissions${founder ? ` for founder ${founder}` : ''}.`);
    return NextResponse.json({ submissions: data });
}

// POST /api/admin/review — Approve or reject a submission
export async function POST(request: NextRequest) {
    const supabase = getServerSupabase();

    try {
        const body = await request.json();
        const { submission_id, action } = body; // action: 'approve' | 'reject'

        if (!submission_id || !['approve', 'reject'].includes(action)) {
            return NextResponse.json(
                { error: 'Required: submission_id and action (approve/reject)' },
                { status: 400 }
            );
        }

        // Get submission
        const { data: submission, error: subErr } = await supabase
            .from('submissions')
            .select('*')
            .eq('id', submission_id)
            .single();

        if (subErr || !submission) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        if (submission.status !== 'pending') {
            return NextResponse.json({ error: `Submission already ${submission.status}` }, { status: 400 });
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        // Update submission status
        await supabase
            .from('submissions')
            .update({ status: newStatus, reviewed_at: new Date().toISOString() })
            .eq('id', submission_id);

        // If approved, trigger onchain payout
        let payoutResult = null;
        if (action === 'approve') {
            try {
                const { processPayout } = await import('@/lib/payout-service');

                // Fetch onchain_id from campaign
                const { data: campaign } = await supabase
                    .from('campaigns')
                    .select('onchain_id')
                    .eq('id', submission.campaign_id)
                    .single();

                if (campaign && campaign.onchain_id !== null) {
                    payoutResult = await processPayout(
                        campaign.onchain_id,
                        submission.agent_wallet,
                        submission.id
                    );

                    if (payoutResult.success) {
                        await supabase
                            .from('submissions')
                            .update({
                                status: 'paid',
                                payout_tx_hash: payoutResult.txHash
                            })
                            .eq('id', submission_id);
                    }
                }
            } catch (err) {
                console.error('Failed to process payout:', err);
            }
        }

        // Update agent stats
        const { data: agent } = await supabase
            .from('agents')
            .select('*')
            .eq('id', submission.agent_id)
            .single();

        if (agent) {
            const updates: Record<string, number | string> = {};
            if (action === 'approve') {
                updates.approved_submissions = agent.approved_submissions + 1;
            } else {
                updates.rejected_submissions = agent.rejected_submissions + 1;
            }
            // Recalculate reputation
            const newApproved = action === 'approve' ? agent.approved_submissions + 1 : agent.approved_submissions;
            const newTotal = agent.total_submissions; // already incremented on submit
            updates.reputation_score = newTotal > 0 ? Math.round((newApproved / newTotal) * 100) : 0;

            // Update tier
            if (updates.reputation_score >= 81) updates.tier = 'trusted';
            else if (updates.reputation_score >= 51) updates.tier = 'established';
            else updates.tier = 'new';

            await supabase.from('agents').update(updates).eq('id', agent.id);
        }

        return NextResponse.json({
            message: `Submission ${newStatus}`,
            submission_id,
            status: newStatus,
            // TODO: trigger payout if approved
            payout_pending: action === 'approve',
        });
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
