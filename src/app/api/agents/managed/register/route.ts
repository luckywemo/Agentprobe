import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

/**
 * POST /api/agents/managed/register
 * Creates a managed bot for a user.
 * The system generates the wallet and manages execution.
 */
export async function POST(request: NextRequest) {
    const supabase = getServerSupabase();

    try {
        const body = await request.json();
        const { name, type, preferences, owner_id, owner_address } = body;

        if (!name || !type || (!owner_id && !owner_address)) {
            return NextResponse.json(
                { error: 'Missing required fields: name, type, and owner identification' },
                { status: 400 }
            );
        }

        // --- NEW: UUID Logic ---
        let internalOwnerId = owner_id;

        // If owner_id is a username (not a UUID), lookup the internal UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner_id || '');

        // lookup internal owner and their slots
        const { data: userData } = await supabase
            .from('users')
            .select('id, bot_slots')
            .or(`id.eq.${owner_id},user_id.eq.${owner_id},wallet_address.eq.${owner_address}`)
            .single();

        if (userData) {
            internalOwnerId = userData.id;
            const slots = userData.bot_slots || 1;

            // Check how many agents they already have
            const { count, error: countError } = await supabase
                .from('agents')
                .select('*', { count: 'exact', head: true })
                .eq('owner_id', internalOwnerId);

            if (!countError && count !== null && count >= slots) {
                return NextResponse.json(
                    { error: `Bot slot limit reached (${slots}). Increase your reputation to unlock more slots.` },
                    { status: 403 }
                );
            }
        } else {
            // Background fallback: if no user is found, we might be in early dev
            internalOwnerId = null;
        }

        // 1. Generate Managed Wallet
        const privateKey = generatePrivateKey();
        const account = privateKeyToAccount(privateKey);
        const walletAddress = account.address;

        // 2. Generate API key (standard for all agents)
        const rawKey = uuidv4();
        const apiKey = `ap_${createHash('sha256').update(rawKey).digest('hex').slice(0, 32)}`;

        // 3. Insert into Database
        // Note: For production, privateKey should be encrypted before storage.
        // Storing as plain text for the prototype demo.
        const { data: agent, error } = await supabase
            .from('agents')
            .insert({
                name,
                wallet_address: walletAddress.toLowerCase(),
                api_key: apiKey,
                owner_id: internalOwnerId,
                owner_address: owner_address?.toLowerCase(),
                is_managed: true,
                type: type || 'testing',
                status: 'idle',
                preferences: preferences || { min_reward: 0, auto_claim: true },
                capabilities: [type],
                encrypted_private_key: privateKey, // Saving as-is for the demo version
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating managed agent:', error);
            // If the column owner_id or is_managed is missing (migration not run yet), this will fail.
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(
            {
                message: 'Managed bot created successfully',
                agent_id: agent.id,
                wallet_address: walletAddress,
                api_key: apiKey,
                // Do NOT return the private key to the frontend for managed bots.
            },
            { status: 201 }
        );
    } catch (err) {
        console.error('Registration error:', err);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
