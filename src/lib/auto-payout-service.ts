import { getServerSupabase } from './supabase';
import { processPayout } from './payout-service';

/**
 * processExpiredCampaigns
 * Identifies campaigns that have passed their 'ends_at' date and are still 'active'.
 * Triggers payouts for all 'approved' submissions and then closes the campaign.
 */
export async function processExpiredCampaigns() {
    const supabase = getServerSupabase();
    const now = new Date().toISOString();

    console.log(`[Auto-Payout] Checking for expired campaigns at ${now}...`);

    // 1. Find active campaigns that have expired
    const { data: expiredCampaigns, error: campErr } = await supabase
        .from('campaigns')
        .select('*, tasks(*)')
        .eq('status', 'active')
        .eq('is_deleted', false)
        .lt('ends_at', now);

    if (campErr) {
        console.error('[Auto-Payout] Error fetching expired campaigns:', campErr);
        return { success: false, error: campErr.message };
    }

    if (!expiredCampaigns || expiredCampaigns.length === 0) {
        console.log('[Auto-Payout] No expired campaigns found.');
        return { success: true, processedCount: 0 };
    }

    console.log(`[Auto-Payout] Found ${expiredCampaigns.length} expired campaigns.`);

    const results = [];

    for (const campaign of expiredCampaigns) {
        console.log(`[Auto-Payout] Processing campaign: ${campaign.name} (${campaign.id})`);

        // 2. Find all 'approved' submissions for this campaign
        // These are submissions that passed review (manual or auto) but haven't been 'paid' yet.
        const { data: approvedSubmissions, error: subErr } = await supabase
            .from('submissions')
            .select('*')
            .eq('campaign_id', campaign.id)
            .eq('status', 'approved');

        if (subErr) {
            console.error(`[Auto-Payout] Error fetching submissions for campaign ${campaign.id}:`, subErr);
            continue;
        }

        console.log(`[Auto-Payout] Found ${approvedSubmissions?.length || 0} approved submissions to pay.`);

        let payoutCount = 0;
        let failureCount = 0;

        if (approvedSubmissions && approvedSubmissions.length > 0) {
            for (const submission of approvedSubmissions) {
                // If onchain_id is null, we can't pay via vault
                if (campaign.onchain_id === null) {
                    console.warn(`[Auto-Payout] Campaign ${campaign.id} has no onchain_id. Skipping payout.`);
                    continue;
                }

                const payoutResult = await processPayout(
                    campaign.onchain_id,
                    submission.agent_wallet,
                    submission.id
                );

                if (payoutResult.success) {
                    payoutCount++;
                    // Update submission to 'paid'
                    await supabase
                        .from('submissions')
                        .update({
                            status: 'paid',
                            payout_tx_hash: payoutResult.txHash
                        })
                        .eq('id', submission.id);
                } else {
                    failureCount++;
                    console.error(`[Auto-Payout] Payout failed for submission ${submission.id}:`, payoutResult.error);
                }
            }
        }

        // 3. Mark campaign as 'closed'
        await supabase
            .from('campaigns')
            .update({ status: 'closed' })
            .eq('id', campaign.id);

        results.push({
            campaignId: campaign.id,
            campaignName: campaign.name,
            payoutsTriggered: payoutCount,
            payoutsFailed: failureCount
        });
    }

    return {
        success: true,
        processedCount: expiredCampaigns.length,
        details: results
    };
}
