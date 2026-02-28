import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { validateFeedback, checkSuspiciousFeedback } from '@/lib/validation';
import { MAX_SUBMISSIONS_PER_HOUR } from '@/lib/config';

// Helper: authenticate agent by API key
async function authenticateAgent(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const apiKey = authHeader.replace('Bearer ', '');
    const supabase = getServerSupabase();
    const { data } = await supabase
        .from('agents')
        .select('*')
        .eq('api_key', apiKey)
        .single();
    return data;
}

// POST /api/tasks/[id]/submit — Submit task completion + feedback
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: taskId } = await params;
    const agent = await authenticateAgent(request);
    if (!agent) {
        return NextResponse.json({ error: 'Unauthorized — provide Bearer API key' }, { status: 401 });
    }

    const supabase = getServerSupabase();

    // Rate limit: check submissions in last hour
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count } = await supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agent.id)
        .gte('created_at', oneHourAgo);

    if (count !== null && count >= MAX_SUBMISSIONS_PER_HOUR) {
        return NextResponse.json(
            { error: `Rate limit exceeded. Max ${MAX_SUBMISSIONS_PER_HOUR} submissions per hour.` },
            { status: 429 }
        );
    }

    // Check agent has active claim on this task
    const { data: claim } = await supabase
        .from('task_claims')
        .select('*')
        .eq('task_id', taskId)
        .eq('agent_id', agent.id)
        .eq('status', 'active')
        .single();

    if (!claim) {
        return NextResponse.json({ error: 'No active claim found for this task' }, { status: 400 });
    }

    // Check if claim expired
    if (new Date(claim.expires_at) < new Date()) {
        await supabase.from('task_claims').update({ status: 'expired' }).eq('id', claim.id);
        return NextResponse.json({ error: 'Claim has expired. Re-claim the task.' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { feedback, proof } = body;

        // Validate feedback schema
        const validation = validateFeedback(feedback);
        if (!validation.valid) {
            return NextResponse.json(
                { error: 'Invalid feedback schema', details: validation.errors },
                { status: 400 }
            );
        }

        // Check for suspicious patterns
        const suspiciousFlags = checkSuspiciousFeedback(feedback);

        // Get task/campaign info
        const { data: task } = await supabase
            .from('tasks')
            .select('*, campaigns(*)')
            .eq('id', taskId)
            .single();

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Determine auto-approval: established+ agents with no suspicious flags
        const autoApprove = agent.tier !== 'new' && suspiciousFlags.length === 0;

        // Create submission
        const { data: submission, error: subError } = await supabase
            .from('submissions')
            .insert({
                task_id: taskId,
                campaign_id: task.campaign_id,
                agent_id: agent.id,
                agent_wallet: agent.wallet_address,
                status: autoApprove ? 'approved' : 'pending',
                feedback,
                proof: proof || null,
                payout_tx_hash: null,
            })
            .select()
            .single();

        if (subError) {
            return NextResponse.json({ error: subError.message }, { status: 500 });
        }

        // Mark claim as completed
        await supabase.from('task_claims').update({ status: 'completed' }).eq('id', claim.id);

        // Increment completions count
        await supabase
            .from('tasks')
            .update({ completions_count: task.completions_count + 1 })
            .eq('id', taskId);

        // Update agent submission counts
        await supabase
            .from('agents')
            .update({
                total_submissions: agent.total_submissions + 1,
                ...(autoApprove ? { approved_submissions: agent.approved_submissions + 1 } : {}),
                reputation_score: autoApprove
                    ? Math.round(((agent.approved_submissions + 1) / (agent.total_submissions + 1)) * 100)
                    : Math.round((agent.approved_submissions / (agent.total_submissions + 1)) * 100),
            })
            .eq('id', agent.id);

        return NextResponse.json({
            message: autoApprove ? 'Submission approved (auto)' : 'Submission pending review',
            submission_id: submission.id,
            status: submission.status,
            warnings: validation.warnings,
            suspicious_flags: suspiciousFlags,
        }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
