import { getServerSupabase } from './supabase';
import { executeClaimedTask } from './execution-service';

/**
 * MatchmakingService
 * Logic to pair idle managed bots with available tasks.
 */
export async function triggerMatchmaking(campaignId: string) {
    const supabase = getServerSupabase();

    // 1. Get Campaign and Its Tasks
    const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*, tasks(*)')
        .eq('id', campaignId)
        .single();

    if (campaignError || !campaign) {
        console.error('[Matchmaking] Campaign not found:', campaignError);
        return;
    }

    const tasks = campaign.tasks || [];
    if (tasks.length === 0) return;

    // 2. Find Eligible Managed Bots
    // Filter: Managed, Idle, and matching Campaign Reward
    const { data: idleAgents, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .eq('is_managed', true)
        .eq('status', 'idle');

    if (agentsError || !idleAgents || idleAgents.length === 0) {
        console.log('[Matchmaking] No idle managed agents available.');
        return;
    }

    console.log(`[Matchmaking] Attempting to match ${idleAgents.length} agents to ${tasks.length} tasks...`);

    for (const task of tasks) {
        // Find agents that meet the min_reward criteria
        const eligibleAgents = idleAgents.filter(agent => {
            const preferences = agent.preferences || {};
            const minReward = preferences.min_reward || 0;
            return campaign.reward_per_task >= minReward;
        });

        if (eligibleAgents.length === 0) continue;

        // For MVP, we'll assign the task to the first available eligible agent
        // In a real system, we might distribute tasks or handle multiple claims
        const selectedAgent = eligibleAgents[0];

        console.log(`[Matchmaking] Matching Agent ${selectedAgent.name} to Task ${task.title}`);

        // 3. Create Task Claim
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24h timeout

        const { error: claimError } = await supabase
            .from('task_claims')
            .insert({
                task_id: task.id,
                agent_id: selectedAgent.id,
                status: 'active',
                expires_at: expiresAt.toISOString(),
            });

        if (claimError) {
            console.error('[Matchmaking] Failed to create claim:', claimError);
            continue;
        }

        // 4. Update Agent Status to 'working'
        await supabase
            .from('agents')
            .update({ status: 'working' })
            .eq('id', selectedAgent.id);

        // 5. Trigger Automated Execution
        // We get the claim back to pass its ID
        const { data: claimData } = await supabase
            .from('task_claims')
            .select('id')
            .eq('task_id', task.id)
            .eq('agent_id', selectedAgent.id)
            .eq('status', 'active')
            .single();

        if (claimData) {
            // Run execution in the background
            executeClaimedTask(claimData.id);
        }

        // Remove from idle pool so they don't get double matched in this loop
        const index = idleAgents.indexOf(selectedAgent);
        if (index > -1) {
            idleAgents.splice(index, 1);
        }

        if (idleAgents.length === 0) break;
    }
}
