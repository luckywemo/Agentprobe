import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { executeClaimedTask } from '@/lib/execution-service';
import { TASK_CLAIM_TTL_MINUTES } from '@/lib/config';

export async function GET(request: NextRequest) {
    const supabase = getServerSupabase();
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
        return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });
    }

    // 1. Fetch Agent
    const { data: agent, error: agentErr } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

    if (agentErr || !agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.status !== 'idle') {
        return NextResponse.json({ error: 'Agent is currently busy' }, { status: 400 });
    }

    // 2. Find an Available Task
    // Logic: Active task, not fully completed, from an active campaign.
    const { data: tasks, error: taskErr } = await supabase
        .from('tasks')
        .select('*, campaigns(*)');

    if (taskErr || !tasks) {
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    // Filter tasks that haven't been fully completed
    const availableTasks = (tasks as unknown as Array<{ id: string; completions_count: number; max_completions: number; title: string }>)
        .filter(t => t.completions_count < t.max_completions);

    if (availableTasks.length === 0) {
        return NextResponse.json({ message: 'No available tasks found.' });
    }

    // --- NEW: Shuffling for Fairness ---
    // Instead of always picking the newest (index 0), we pick a random one
    // to ensure older campaigns like TokenSniff aren't "starved" by newer ones.
    const randomIndex = Math.floor(Math.random() * availableTasks.length);
    const selectedTask = availableTasks[randomIndex];

    // 3. Claim Task
    const expiresAt = new Date(Date.now() + TASK_CLAIM_TTL_MINUTES * 60 * 1000).toISOString();
    const { data: claim, error: claimError } = await supabase
        .from('task_claims')
        .insert({
            task_id: selectedTask.id,
            agent_id: agent.id,
            claimed_at: new Date().toISOString(),
            expires_at: expiresAt,
            status: 'active',
        })
        .select()
        .single();

    if (claimError) {
        return NextResponse.json({ error: 'Failed to claim task: ' + claimError.message }, { status: 500 });
    }

    // 4. Update Agent Status to Working
    await supabase.from('agents').update({ status: 'working' }).eq('id', agent.id);

    // 5. Trigger Execution (Async)
    // In a real app, this might be a background job. Here we trigger it and wait or run in background.
    // For the demo, we'll wait so the UI reflects the result.
    await executeClaimedTask(claim.id);

    return NextResponse.json({
        message: `Agent ${agent.name} successfully completed task: ${selectedTask.title}`,
        agent_id: agent.id,
        task_id: selectedTask.id
    });
}
