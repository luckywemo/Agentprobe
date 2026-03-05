import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testBotFeedback() {
    console.log('--- STARTING BOT FEEDBACK TEST ---');

    // 1. Create a unique campaign for this test
    const founderAddress = '0x' + Math.random().toString(16).substring(2, 42);
    console.log(`1. Creating unique campaign for founder: ${founderAddress}...`);

    const createRes = await fetch(`${BASE_URL}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            founder_address: founderAddress,
            name: `Feedback Test-${Math.random().toString(36).substring(7)}`,
            description: 'Testing bot results and reciprocal feedback flow',
            product_url: 'https://test-feedback.com',
            reward_per_task: 0.1,
            total_budget: 1.0,
            onchain_id: Math.floor(Math.random() * 100000),
            tasks: [{ title: 'Feedback Verification Task', instructions: 'Generate bot evaluation' }]
        })
    });

    const createData = await createRes.json();
    if (!createRes.ok) throw new Error(`Create failed: ${JSON.stringify(createData)}`);
    const campaignId = createData.campaign.id;
    const taskId = createData.tasks[0]?.id;
    console.log(`Campaign/Task created: ${campaignId}/${taskId}`);

    // 2. Register a UNIQUE agent for this test run
    const ownerAddress = '0x' + Math.random().toString(16).substring(2, 42);
    const uniqueAgentName = `FeedbackBot-${Math.random().toString(36).substring(7)}`;

    console.log(`2. Registering unique agent: ${uniqueAgentName} for owner ${ownerAddress}...`);
    const regRes = await fetch(`${BASE_URL}/api/agents/managed/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: uniqueAgentName,
            type: 'testing',
            owner_address: ownerAddress
        })
    });
    const regData = await regRes.json();
    if (!regRes.ok) throw new Error(`Registration failed: ${regData.error}`);
    const agentId = regData.agent_id;
    console.log(`Agent registered. ID: ${agentId}`);

    // 3. Trigger Combined Matching & Execution (GET /api/bot-hub/execute?agentId=...)
    console.log(`3. Triggering matching & execution for agent ${agentId}...`);
    const execRes = await fetch(`${BASE_URL}/api/bot-hub/execute?agentId=${agentId}`);
    const execData = await execRes.json();

    if (!execRes.ok) throw new Error(`Execution trigger failed: ${JSON.stringify(execData)}`);
    console.log('Execution started/completed:', execData.message);

    // The execution usually takes ~8s in simulation.
    // Wait for it to finish if the API didn't block (it usually blocks in our demo version)
    console.log('Verifying submission fields...');

    // 4. Verify submission fields
    const subRes = await fetch(`${BASE_URL}/api/admin/review?founder=${founderAddress}`);
    const subData = await subRes.json();
    const submission = subData.submissions.find(s => s.task_id === taskId);

    if (!submission) throw new Error('Submission not found after execution');

    console.log('Submission ID:', submission.id);
    console.log('BOT RESULT SUMMARY:', submission.task_result_summary);
    console.log('BOT EVALUATION:', submission.bot_feedback_for_campaign);

    if (!submission.task_result_summary || !submission.bot_feedback_for_campaign) {
        throw new Error('New feedback fields (task_result_summary or bot_feedback_for_campaign) are missing or empty!');
    }

    console.log('--- BOT FEEDBACK TEST PASSED ---');
}

testBotFeedback().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
