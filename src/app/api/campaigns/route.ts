import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { triggerMatchmaking } from '@/lib/matchmaking-service';

// GET /api/campaigns — List active campaigns (for agents)
export async function GET(request: NextRequest) {
    const supabase = getServerSupabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const founder = searchParams.get('founder');

    let query = supabase
        .from('campaigns')
        .select('*, tasks(*)');

    if (status !== 'all') {
        query = query.eq('status', status);
    }

    if (founder) {
        query = query.eq('founder_address', founder.toLowerCase());
    }

    console.log('[API] Fetching campaigns...', { status, founder });
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error('[API] Supabase error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[API] Campaigns found:', data?.length);
    return NextResponse.json({ campaigns: data });
}

// POST /api/campaigns — Create a new campaign
export async function POST(request: NextRequest) {
    const supabase = getServerSupabase();

    try {
        const body = await request.json();
        const {
            founder_address,
            name,
            description,
            product_url,
            reward_per_task,
            total_budget,
            onchain_id,
            tasks,
        } = body;

        // Basic validation
        if (!founder_address || !name || !product_url || !reward_per_task || !total_budget) {
            return NextResponse.json(
                { error: 'Missing required fields: founder_address, name, product_url, reward_per_task, total_budget' },
                { status: 400 }
            );
        }

        // Insert campaign
        const { data: campaign, error: campaignError } = await supabase
            .from('campaigns')
            .insert({
                founder_address: founder_address.toLowerCase(),
                name,
                description: description || '',
                product_url,
                reward_per_task: parseFloat(reward_per_task),
                total_budget: parseFloat(total_budget),
                remaining_budget: parseFloat(total_budget),
                onchain_id: onchain_id ?? null,
                status: onchain_id !== null && onchain_id !== undefined ? 'active' : 'draft',
            })
            .select()
            .single();

        if (campaignError) {
            return NextResponse.json({ error: campaignError.message }, { status: 500 });
        }

        // Insert tasks if provided
        if (tasks && Array.isArray(tasks) && tasks.length > 0) {
            const taskRows = tasks.map((t: { title: string; instructions: string; max_completions?: number }) => ({
                campaign_id: campaign.id,
                title: t.title,
                instructions: t.instructions || '',
                max_completions: t.max_completions || 100,
                completions_count: 0,
                status: 'active',
            }));


            const { error: tasksError } = await supabase.from('tasks').insert(taskRows);
            if (tasksError) {
                return NextResponse.json({ error: tasksError.message }, { status: 500 });
            }

            // Trigger Matchmaking for the new tasks
            // We run this in the background (no await) or await if we want immediate feedback
            // For now, let's await to ensure the demo shows the result.
            await triggerMatchmaking(campaign.id);
        }

        return NextResponse.json({ campaign }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
