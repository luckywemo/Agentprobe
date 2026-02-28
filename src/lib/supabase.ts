import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// --- Supabase Mock Implementation (Persistent for Dev/Demo) ---
const isMock = !supabaseUrl || supabaseUrl.includes('your-project');

// Persistent in-memory store
const _global = global as any;
if (!_global.mockData) {
    _global.mockData = {
        agents: [],
        campaigns: [
            {
                id: 'demo-campaign-id',
                name: 'AgentProbe Demo Campaign',
                description: 'Verifying the integration between agents and verified product feedback.',
                product_url: 'http://localhost:3001',
                reward_per_task: 0.001,
                total_budget: 1,
                remaining_budget: 1,
                status: 'active',
                created_at: new Date().toISOString()
            }
        ],
        tasks: [
            {
                id: 'demo-task-id',
                campaign_id: 'demo-campaign-id',
                title: 'Perform System Audit',
                instructions: 'Check the landing page for responsive design and click all primary buttons.',
                max_completions: 100,
                completions_count: 0,
                status: 'active'
            }
        ],
        submissions: [],
        task_claims: [],
    };
}

const createMockClient = () => {
    const createChain = (table: string) => {
        const chain: any = {
            _filters: {} as Record<string, any>,
            _limit: null as number | null,
            _single: false,
            _nested: [] as string[],
            _count: null as string | null,

            select(query = '*', options?: { count?: string; head?: boolean }) {
                if (query.includes('tasks(*)')) this._nested.push('tasks');
                if (query.includes('campaigns(*)')) this._nested.push('campaigns');
                if (options?.count) this._count = options.count;
                return this;
            },
            eq(col: string, val: any) {
                this._filters[col] = { op: 'eq', val };
                return this;
            },
            gte(col: string, val: any) {
                this._filters[col] = { op: 'gte', val };
                return this;
            },
            order() { return this; },
            limit(n: number) { this._limit = n; return this; },
            single() { this._single = true; return this; },

            async then(resolve: any) {
                let data = [...(_global.mockData[table] || [])];
                for (const [col, filter] of Object.entries(this._filters)) {
                    const { op, val } = filter as any;
                    if (op === 'eq') data = data.filter((row: any) => row[col] === val);
                    if (op === 'gte') data = data.filter((row: any) => row[col] >= val);
                }
                const count = data.length;
                if (this._nested.length > 0) {
                    data = data.map((row: any) => {
                        const enriched = { ...row };
                        if (this._nested.includes('tasks') && table === 'campaigns') {
                            enriched.tasks = _global.mockData.tasks?.filter((t: any) => t.campaign_id === row.id) || [];
                        }
                        if (this._nested.includes('campaigns') && table === 'tasks') {
                            enriched.campaigns = _global.mockData.campaigns?.find((c: any) => c.id === row.campaign_id) || null;
                        }
                        return enriched;
                    });
                }
                let resultData = data;
                if (this._single) resultData = data[0] || null;
                else if (this._limit) resultData = data.slice(0, this._limit);

                return resolve({ data: resultData, error: null, count: this._count ? count : null });
            },

            insert(values: any) {
                const newRows = Array.isArray(values) ? values : [values];
                const inserted = newRows.map(r => ({
                    id: Math.random().toString(36).slice(2, 10),
                    created_at: new Date().toISOString(),
                    ...r
                }));
                if (!_global.mockData[table]) _global.mockData[table] = [];
                _global.mockData[table].push(...inserted);

                // Return a chain that resolves to the first inserted row
                const subChain = createChain(table);
                subChain.then = (resolve: any) => resolve({ data: inserted[0], error: null });
                return subChain;
            },

            update(values: any) {
                const updateChain = createChain(table);
                updateChain.then = async (resolve: any) => {
                    let updatedRow = null;
                    // Apply filters to find the row(s) to update
                    let data = [...(_global.mockData[table] || [])];
                    let filteredIndices: number[] = [];
                    for (let i = 0; i < data.length; i++) {
                        let match = true;
                        for (const [col, filter] of Object.entries(updateChain._filters)) {
                            const { op, val } = filter as any;
                            if (op === 'eq' && data[i][col] !== val) match = false;
                            if (op === 'gte' && data[i][col] < val) match = false;
                        }
                        if (match) {
                            filteredIndices.push(i);
                        }
                    }

                    if (filteredIndices.length > 0) {
                        // For simplicity, update the first matched row if single is requested, or all if not.
                        // Supabase update typically returns the updated rows.
                        if (updateChain._single) {
                            const index = filteredIndices[0];
                            _global.mockData[table][index] = { ..._global.mockData[table][index], ...values };
                            updatedRow = _global.mockData[table][index];
                        } else {
                            // Update all matched rows
                            const updatedRows = filteredIndices.map(index => {
                                _global.mockData[table][index] = { ..._global.mockData[table][index], ...values };
                                return _global.mockData[table][index];
                            });
                            updatedRow = updatedRows; // Return array of updated rows
                        }
                    }
                    return resolve({ data: updatedRow, error: null });
                };
                return updateChain;
            }
        };
        return chain;
    };

    return new Proxy({}, {
        get(_, prop: string) {
            if (prop === 'from') {
                return (table: string) => createChain(table);
            }
            return null;
        }
    });
};

// Client-side Supabase client (anon key)
export const supabase = isMock ? (createMockClient() as any) : createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (service role key — full access)
export function getServerSupabase() {
    console.log('[Supabase] Initializing server client...', {
        url: supabaseUrl ? 'SET' : 'MISSING',
        hasAnonKey: !!supabaseAnonKey,
        hasServiceKey: !!supabaseServiceKey,
        isMock
    });
    if (isMock) return createMockClient() as any;
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
