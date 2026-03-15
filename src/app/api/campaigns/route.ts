import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { triggerMatchmaking } from '@/lib/matchmaking-service';

// GET /api/campaigns — List campaigns with filtering, sorting, pagination
export async function GET(request: NextRequest) {
    const supabase = getServerSupabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const founder = searchParams.get('founder');
    const category = searchParams.get('category');
    const sort = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

    let query = supabase
        .from('campaigns')
        .select('*, tasks(*)', { count: 'exact' });

    if (status !== 'all') {
        query = query.eq('status', status);
    }

    // Default: Filter out deleted campaigns
    query = query.eq('is_deleted', false);

    // Default: Filter out expired campaigns for 'active' status
    if (status === 'active') {
        query = query.or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`);
    }

    if (founder) {
        query = query.eq('founder_address', founder.toLowerCase());
    }

    // Category filter
    if (category && category !== 'all') {
        query = query.eq('category', category);
    }

    // Sorting
    switch (sort) {
        case 'reward_desc':
            query = query.order('reward_per_task', { ascending: false });
            break;
        case 'ending_soon':
            query = query.order('ends_at', { ascending: true, nullsFirst: false });
            break;
        case 'oldest':
            query = query.order('created_at', { ascending: true });
            break;
        case 'newest':
        default:
            query = query.order('created_at', { ascending: false });
            break;
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    console.log('[API] Fetching campaigns...', { status, founder, category, sort, page, limit });
    const { data, error, count } = await query;

    if (error) {
        console.error('[API] Supabase error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[API] Campaigns found:', data?.length);
    return NextResponse.json({
        campaigns: data,
        total: count || 0,
        page,
        limit,
    });
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
        const endsAt = body.ends_at
            ? new Date(body.ends_at).toISOString()
            : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

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
                ends_at: endsAt,
                is_deleted: false,
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


            const { data: createdTasks, error: tasksError } = await supabase
                .from('tasks')
                .insert(taskRows)
                .select();

            if (tasksError) {
                return NextResponse.json({ error: tasksError.message }, { status: 500 });
            }

            // Trigger Matchmaking for the new tasks
            await triggerMatchmaking(campaign.id);

            return NextResponse.json({ campaign, tasks: createdTasks }, { status: 201 });
        }

        return NextResponse.json({ campaign, tasks: [] }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
