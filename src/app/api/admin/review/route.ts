import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// GET /api/admin/review — List pending submissions
export async function GET(request: NextRequest) {
    const supabase = getServerSupabase();
    const { searchParams } = new URL(request.url);
    const founder = searchParams.get('founder');
    const status = searchParams.get('status') || 'pending';

    let query = supabase
        .from('submissions')
        .select('*, tasks(title, campaign_id), agents(name, wallet_address, tier, reputation_score)');

    // Support multiple statuses via comma separation (e.g. status=approved,paid)
    if (status !== 'all') {
        const statuses = status.split(',');
        query = query.in('status', statuses);
    }

    if (founder) {
        // Filter tasks by campaign_id where campaign has this founder_address
        // First, get those campaign IDs
        const { data: campaigns } = await supabase
            .from('campaigns')
            .select('id')
            .eq('founder_address', founder.toLowerCase());

        const campaignIds = campaigns?.map((c: { id: string }) => c.id) || [];
        query = query.in('campaign_id', campaignIds);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
        console.error('[API/Review] Supabase Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate today's stats (since start of day)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayIso = startOfDay.toISOString();

    const { data: statsData } = await supabase
        .from('submissions')
        .select('status')
        .gte('reviewed_at', startOfDayIso)
        .in('status', ['approved', 'paid', 'rejected']);

    const approvedToday = statsData?.filter(s => ['approved', 'paid'].includes(s.status)).length || 0;
    const rejectedToday = statsData?.filter(s => s.status === 'rejected').length || 0;

    console.log(`[API/Review] Fetched ${data?.length || 0} submissions. Stats: A=${approvedToday}, R=${rejectedToday}`);
    return NextResponse.json({ 
        submissions: data,
        stats: {
            approvedToday,
            rejectedToday
        }
    });
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

        // If approved, trigger onchain payout and BUDGET DEDUCTION
        let payoutResult = null;
        if (action === 'approve') {
            try {
                // 1. Deduct Reward from Campaign Budget
                // We fetch the reward first to ensure we deduct the correct amount
                const { data: campData } = await supabase
                    .from('campaigns')
                    .select('reward_per_task, remaining_budget, onchain_id')
                    .eq('id', submission.campaign_id)
                    .single();

                if (campData) {
                    const newBudget = Math.max(0, (campData.remaining_budget || 0) - (campData.reward_per_task || 0));
                    await supabase
                        .from('campaigns')
                        .update({ remaining_budget: newBudget })
                        .eq('id', submission.campaign_id);
                }

                // 2. Trigger onchain payout
                const { processPayout } = await import('@/lib/payout-service');

                if (campData && campData.onchain_id !== null) {
                    payoutResult = await processPayout(
                        campData.onchain_id,
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
                console.error('Failed to process approval workflow:', err);
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
