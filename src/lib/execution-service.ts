import { getServerSupabase } from './supabase';

/**
 * ExecutionService
 * Simulates managed bot actions. 
 * In a real-world scenario, this would trigger a Playwright script, 
 * a social media API call, or an LLM-based agent.
 */
export async function executeClaimedTask(claimId: string) {
    const supabase = getServerSupabase();

    // 1. Fetch Claim and Related Data
    const { data: claim, error: claimError } = await supabase
        .from('task_claims')
        .select(`
            id,
            status,
            task:tasks(id, title, instructions),
            agent:agents(id, name, type, wallet_address)
        `)
        .eq('id', claimId)
        .single();

    if (claimError || !claim || claim.status !== 'active') {
        console.error('[Execution] Claim not found or already processed:', claimError);
        return;
    }

    const { task, agent } = claim as any;

    console.log(`[Execution] Managed Bot ${agent.name} is starting Task: ${task.title}`);

    // 2. Simulate Bot Logic
    // We'll generate a compliant report for the demo.
    const feedback = {
        success: true,
        summary: `Automated ${agent.type} feedback for task: ${task.title}`,
        steps_completed: [
            "Accessed product URL provided in campaign.",
            "Verified interface elements as per instructions.",
            "Validated onchain interaction capability."
        ],
        scores: {
            usability: 9,
            speed: 8,
            clarity: 10,
            reliability: 9
        },
        duration_seconds: 15,
        notes: "System performed as expected. High responsiveness observed.",
        timestamp: new Date().toISOString()
    };

    const proof = {
        agent_type: agent.type,
        trace_id: `managed-${Math.random().toString(36).substring(7)}`,
        model_used: "agentprobe-v1-core"
    };

    // 3. Create Submission
    const { data: submission, error: subError } = await supabase
        .from('submissions')
        .insert({
            task_id: task.id,
            campaign_id: (await supabase.from('tasks').select('campaign_id').eq('id', task.id).single()).data?.campaign_id,
            agent_id: agent.id,
            agent_wallet: agent.wallet_address,
            status: 'pending',
            feedback: feedback,
            proof: proof
        })
        .select()
        .single();

    if (subError) {
        console.error('[Execution] Submission failed:', subError);
        return;
    }

    console.log(`[Execution] Submission ${submission.id} created for Agent ${agent.name}`);

    // 4. Update Claim and Agent Status
    await supabase
        .from('task_claims')
        .update({ status: 'completed' })
        .eq('id', claimId);

    await supabase
        .from('agents')
        .update({ status: 'idle' })
        .eq('id', agent.id);

    console.log(`[Execution] Managed Bot ${agent.name} has finished and is now idle.`);
}
