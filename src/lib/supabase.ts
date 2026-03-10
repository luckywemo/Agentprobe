import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client-side Supabase client (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (service role key — full access)
export function getServerSupabase() {
    console.log('[Supabase] Initializing server client...', {
        url: supabaseUrl ? 'SET' : 'MISSING',
        hasAnonKey: !!supabaseAnonKey,
        hasServiceKey: !!supabaseServiceKey,
    });
    return createClient(supabaseUrl, supabaseServiceKey);
}

// ---- Types ----

export interface Campaign {
    id: string;
    onchain_id: number | null;
    founder_address: string;
    name: string;
    description: string;
    product_url: string;
    reward_per_task: number; // in USDC (float, e.g. 0.001)
    total_budget: number;
    remaining_budget: number;
    status: 'draft' | 'active' | 'paused' | 'closed';
    ends_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Task {
    id: string;
    campaign_id: string;
    title: string;
    instructions: string;
    max_completions: number;
    completions_count: number;
    status: 'active' | 'paused' | 'completed';
    created_at: string;
}

export interface Agent {
    id: string;
    name: string;
    wallet_address: string;
    api_key: string;
    capabilities: string[];
    total_submissions: number;
    approved_submissions: number;
    rejected_submissions: number;
    reputation_score: number;
    tier: 'new' | 'established' | 'trusted';
    created_at: string;
}

export interface Submission {
    id: string;
    task_id: string;
    campaign_id: string;
    agent_id: string;
    agent_wallet: string;
    status: 'pending' | 'approved' | 'rejected' | 'paid';
    feedback: {
        success: boolean;
        steps_completed: string[];
        issues?: Array<{ step: string; severity: string; description: string }>;
        scores: { usability: number; speed: number; clarity: number; reliability?: number };
        notes?: string;
        duration_seconds: number;
        logs?: Array<{ timestamp: string; action: string; result: string; error?: string }>;
    };
    proof?: {
        type: string;
        data: Record<string, unknown>;
    };
    payout_tx_hash: string | null;
    created_at: string;
    reviewed_at: string | null;
}

export interface TaskClaim {
    id: string;
    task_id: string;
    agent_id: string;
    claimed_at: string;
    expires_at: string;
    status: 'active' | 'expired' | 'completed';
}
