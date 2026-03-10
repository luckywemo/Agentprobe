import { NextRequest, NextResponse } from 'next/server';
import { processExpiredCampaigns } from '@/lib/auto-payout-service';

/**
 * GET /api/admin/auto-payout
 * Endpoint to manually (or via cron) trigger the processing of expired campaigns.
 * Replaces manual review for time-limited campaigns.
 */
export async function GET(request: NextRequest) {
    try {
        // In a production app, we'd check for a secret API key or admin session here
        // const authHeader = request.headers.get('authorization');
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) ...

        const result = await processExpiredCampaigns();

        return NextResponse.json(result);
    } catch (error) {
        console.error('[API/Auto-Payout] Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
