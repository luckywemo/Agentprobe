import { NextRequest, NextResponse } from 'next/server';
import { createAttestation } from '@/lib/eas';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { agentWallet, campaignId, score, feedback } = body;

        if (!agentWallet || !campaignId || score === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields: agentWallet, campaignId, score' },
                { status: 400 }
            );
        }

        const txHash = await createAttestation(
            agentWallet,
            campaignId,
            Math.min(100, Math.max(0, Math.round(score))),
            feedback || ''
        );

        return NextResponse.json({ success: true, txHash }, { status: 201 });
    } catch (error: unknown) {
        console.error('[EAS] Attestation creation failed:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: `Attestation failed: ${message}` }, { status: 500 });
    }
}
