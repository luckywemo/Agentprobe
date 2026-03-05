import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testLifecycle() {
    console.log('--- STARTING E2E LIFECYCLE TEST ---');

    // 1. Create a campaign with a short expiry (10 seconds)
    console.log('1. Creating test campaign...');
    const endsAt = new Date(Date.now() + 10000).toISOString();
    const createRes = await fetch(`${BASE_URL}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            founder_address: '0x1234567890123456789012345678901234567890',
            name: 'Lifecycle Test Campaign',
            description: 'Testing expiry and deletion',
            product_url: 'https://test.com',
            reward_per_task: 0.1,
            total_budget: 1.0,
            onchain_id: 999,
            ends_at: endsAt,
            tasks: [{ title: 'Task 1', instructions: 'Verify lifecycle' }]
        })
    });

    const createData = await createRes.json();
    if (!createRes.ok) throw new Error(`Create failed: ${JSON.stringify(createData)}`);
    const campaignId = createData.campaign.id;
    console.log(`Campaign created: ${campaignId}`);

    // 2. Verify it shows in the marketplace
    console.log('2. Verifying in marketplace...');
    const marketRes = await fetch(`${BASE_URL}/api/campaigns?status=active`);
    const marketData = await marketRes.json();
    const found = marketData.campaigns.find(c => c.id === campaignId);
    if (!found) throw new Error('Campaign not found in marketplace');
    console.log('Found in marketplace.');

    // 3. Soft-delete the campaign
    console.log('3. Deleting campaign...');
    const delRes = await fetch(`${BASE_URL}/api/campaigns/${campaignId}`, { method: 'DELETE' });
    if (!delRes.ok) throw new Error('Delete failed');
    console.log('Deleted successfully.');

    // 4. Verify it's gone from marketplace
    console.log('4. Verifying disappearance from marketplace...');
    const marketRes2 = await fetch(`${BASE_URL}/api/campaigns?status=active`);
    const marketData2 = await marketRes2.json();
    const found2 = marketData2.campaigns.find(c => c.id === campaignId);
    if (found2) throw new Error('Campaign still found in marketplace after deletion');
    console.log('Successfully hidden from marketplace.');

    console.log('--- LIFECYCLE TEST PASSED ---');
}

testLifecycle().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
