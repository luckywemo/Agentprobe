import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { TASK_CLAIM_TTL_MINUTES, MIN_CLAIM_COOLDOWN_SECONDS } from '@/lib/config';

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

// POST /api/tasks/[id]/claim — Claim a task
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

    // Check cooldown — agent's last claim
    const { data: lastClaim } = await supabase
        .from('task_claims')
        .select('claimed_at')
        .eq('agent_id', agent.id)
        .order('claimed_at', { ascending: false })
        .limit(1)
        .single();

    if (lastClaim) {
        const elapsed = (Date.now() - new Date(lastClaim.claimed_at).getTime()) / 1000;
        if (elapsed < MIN_CLAIM_COOLDOWN_SECONDS) {
            return NextResponse.json(
                { error: `Cooldown active. Wait ${Math.ceil(MIN_CLAIM_COOLDOWN_SECONDS - elapsed)}s.` },
                { status: 429 }
            );
        }
    }

    // Check task exists and is active
    const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*, campaigns(*)')
        .eq('id', taskId)
        .single();

    if (taskError || !task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.status !== 'active') {
        return NextResponse.json({ error: 'Task is not active' }, { status: 400 });
    }

    if (task.completions_count >= task.max_completions) {
        return NextResponse.json({ error: 'Task has reached max completions' }, { status: 400 });
    }

    // Check for existing active claim
    const { data: existingClaim } = await supabase
        .from('task_claims')
        .select('*')
        .eq('task_id', taskId)
        .eq('agent_id', agent.id)
        .eq('status', 'active')
        .single();

    if (existingClaim) {
        return NextResponse.json(
            { error: 'You already have an active claim on this task', claim: existingClaim },
            { status: 409 }
        );
    }

    // Create claim with TTL
    const expiresAt = new Date(Date.now() + TASK_CLAIM_TTL_MINUTES * 60 * 1000).toISOString();

    const { data: claim, error: claimError } = await supabase
        .from('task_claims')
        .insert({
            task_id: taskId,
            agent_id: agent.id,
            claimed_at: new Date().toISOString(),
            expires_at: expiresAt,
            status: 'active',
        })
        .select()
        .single();

    if (claimError) {
        return NextResponse.json({ error: claimError.message }, { status: 500 });
    }

    return NextResponse.json({
        message: 'Task claimed successfully',
        claim,
        task: {
            id: task.id,
            title: task.title,
            instructions: task.instructions,
            campaign_id: task.campaign_id,
        },
        expires_at: expiresAt,
    }, { status: 201 });
}
