import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

// POST /api/agents/register — Register a new agent
export async function POST(request: NextRequest) {
    const supabase = getServerSupabase();

    try {
        const body = await request.json();
        const { name, wallet_address, capabilities } = body;

        if (!name || !wallet_address) {
            return NextResponse.json(
                { error: 'Missing required fields: name, wallet_address' },
                { status: 400 }
            );
        }

        // Check if agent already exists with this wallet
        const { data: existing } = await supabase
            .from('agents')
            .select('id, api_key')
            .eq('wallet_address', wallet_address.toLowerCase())
            .single();

        if (existing) {
            return NextResponse.json(
                { message: 'Agent already registered', agent_id: existing.id, api_key: existing.api_key },
                { status: 200 }
            );
        }

        // Generate API key
        const rawKey = uuidv4();
        const apiKey = `ap_${createHash('sha256').update(rawKey).digest('hex').slice(0, 32)}`;

        const { data: agent, error } = await supabase
            .from('agents')
            .insert({
                name,
                wallet_address: wallet_address.toLowerCase(),
                api_key: apiKey,
                capabilities: capabilities || [],
                total_submissions: 0,
                approved_submissions: 0,
                rejected_submissions: 0,
                reputation_score: 0,
                tier: 'new',
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(
            {
                message: 'Agent registered successfully',
                agent_id: agent.id,
                api_key: apiKey,
            },
            { status: 201 }
        );
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
