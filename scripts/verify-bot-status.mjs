/**
 * Verification script to check if bot status correctly transitions to 'working'
 * and stays there for the duration of the simulated delay.
 */
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function verifyBotStatus() {
    console.log('🔍 Starting Verification: Bot Status Transition');

    // 1. Register a fresh test agent
    const testOwner = `test-owner-${Date.now()}`;
    const testOwnerAddress = `0xTest${Math.random().toString(16).slice(2, 10)}`;

    console.log(`🤖 Registering fresh test agent for ${testOwner}...`);
    const regRes = await fetch(`${BASE_URL}/api/agents/managed/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'StatusTester-Bot',
            type: 'testing',
            owner_id: testOwner,
            owner_address: testOwnerAddress
        })
    });

    const regData = await regRes.json();
    if (!regRes.ok) {
        console.error('❌ Registration failed:', regData.error);
        return;
    }

    const idleAgent = { id: regData.agent_id, name: 'StatusTester-Bot' };
    console.log(`✅ Fresh idle agent registered: ${idleAgent.id}`);

    // 2. Create a test campaign for this bot to work on
    console.log('📢 Creating test campaign...');
    const campRes = await fetch(`${BASE_URL}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Status Verification Campaign',
            founder_address: testOwnerAddress,
            product_url: 'https://test.env',
            reward_per_task: 0.1,
            total_budget: 1,
            onchain_id: 999, // Force active
            tasks: [
                { title: 'Verify UI State', instructions: 'Check for the status indicator.' }
            ]
        })
    });

    if (!campRes.ok) {
        console.error('❌ Campaign creation failed:', await campRes.text());
        return;
    }
    console.log('✅ Test campaign created.');

    const OWNER_QUERY = `owner=${testOwnerAddress}`;

    if (!idleAgent) {
        console.log('❌ No idle agent found. Please deploy one first.');
        return;
    }

    console.log(`✅ Found idle agent: ${idleAgent.name} (${idleAgent.id})`);

    // 3. Trigger execution (Sync & Work) without awaiting
    console.log('🚀 Triggering execution...');
    const startTime = Date.now();
    const executePromise = fetch(`${BASE_URL}/api/bot-hub/execute?agentId=${idleAgent.id}`)
        .then(async r => {
            const duration = (Date.now() - startTime) / 1000;
            const data = await r.json();
            console.log(`📥 Execution Trigger Response (${duration}s):`, data);
            return data;
        });

    // 4. Immediately check status
    console.log('⏳ Checking status after 2 seconds...');
    await new Promise(r => setTimeout(r, 2000));

    const checkRes = await fetch(`${BASE_URL}/api/bot-hub?${OWNER_QUERY}`);
    const checkData = await checkRes.json();
    console.log('📋 Current Agents State:', JSON.stringify(checkData.agents, null, 2));

    const workingAgent = checkData.agents.find(a => a.id === idleAgent.id);

    if (workingAgent && workingAgent.status === 'working') {
        console.log('✅ SUCCESS: Agent status is "working" as expected.');
    } else {
        console.log(`❌ FAILURE: Agent status is "${workingAgent?.status}"`);
    }

    // 4. Wait for it to finish and check again
    console.log('🕒 Waiting for execution to complete (8s)...');
    await executePromise;

    const finalRes = await fetch(`${BASE_URL}/api/bot-hub?${OWNER_QUERY}`);
    const finalData = await finalRes.json();
    const finalAgent = finalData.agents.find(a => a.id === idleAgent.id);

    if (finalAgent && finalAgent.status === 'idle') {
        console.log('✅ SUCCESS: Agent returned to "idle" status.');
    } else {
        console.log(`❌ FAILURE: Agent status is still "${finalAgent?.status}"`);
    }
}

verifyBotStatus();
