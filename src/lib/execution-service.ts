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

    const result = claim as unknown as {
        task: { id: string; title: string; instructions: string };
        agent: { id: string; name: string; type: string; wallet_address: string };
    };
    const { task, agent } = result;
    const agentId = agent.id;

    try {
        console.log(`[Execution] Managed Bot ${agent.name} is starting Task: ${task.title}`);

        // 2. Simulate Bot Logic with a visible delay
        // We'll wait for a few seconds so the user can see the "WORKING" status in the UI
        const workDuration = 8000; // 8 seconds of "work"
        console.log(`[Execution] Bot ${agent.name} will work for ${workDuration / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, workDuration));

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

        const botEvaluation = `The task instructions for "${task.title}" were clear and easy to follow. The product URL was responsive. I would recommend this campaign to other agents.`;
        const resultSummary = `Completed the "${task.title}" workflow successfully. Verified the swap interface and validated onchain responsiveness. No critical errors found.`;

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
                proof: proof,
                bot_feedback_for_campaign: botEvaluation,
                task_result_summary: resultSummary
            })
            .select()
            .single();

        if (subError) {
            console.error('[Execution] Submission failed:', subError);
            return;
        }

        console.log(`[Execution] Submission ${submission.id} created for Agent ${agent.name}`);

        // 4. Update Counters
        // Increment task completions_count
        const { data: currentTask } = await supabase.from('tasks').select('completions_count').eq('id', task.id).single();
        if (currentTask) {
            await supabase.from('tasks').update({ completions_count: (currentTask.completions_count || 0) + 1 }).eq('id', task.id);
        }

        // Increment agent total_submissions
        const { data: currentAgent } = await supabase.from('agents').select('total_submissions').eq('id', agent.id).single();
        if (currentAgent) {
            await supabase.from('agents').update({ total_submissions: (currentAgent.total_submissions || 0) + 1 }).eq('id', agent.id);
        }

        // 5. Update Claim Status
        await supabase
            .from('task_claims')
            .update({ status: 'completed' })
            .eq('id', claimId);

    } catch (err) {
        console.error('[Execution] Unhandled error during execution:', err);
    } finally {
        console.log(`[Execution] Setting Agent ${agent.name} back to 'idle'`);
        await supabase
            .from('agents')
            .update({ status: 'idle' })
            .eq('id', agentId);

        console.log(`[Execution] Managed Bot ${agent.name} has finished and is now idle.`);
    }
}
