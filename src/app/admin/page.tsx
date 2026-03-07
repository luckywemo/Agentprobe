'use client';

import { useEffect, useState, useCallback } from 'react';

const ADMIN_PASSWORD_KEY = 'agentprobe_admin_password';

interface PendingSubmission {
    id: string;
    task_id: string;
    campaign_id: string;
    agent_wallet: string;
    status: string;
    feedback: {
        success: boolean;
        steps_completed: string[];
        issues?: Array<{ step: string; severity: string; description: string }>;
        scores: { usability: number; speed: number; clarity: number; reliability?: number };
        notes?: string;
        duration_seconds: number;
    };
    created_at: string;
    tasks?: { title: string; campaign_id: string };
    agents?: { name: string; wallet_address: string; tier: string; reputation_score: number };
}

interface PlatformStats {
    totalUsers: number;
    founderCount: number;
    botHubCount: number;
    managedBotsCount: number;
    uniqueBotOwners: number;
    totalCampaigns: number;
    recentActivities: Array<{ id: string; type: string; status: string; created_at: string; agent_id: string; campaign_id: string }>;
}

interface AdminCampaign {
    id: string;
    name: string;
    status: string;
    founder_address: string;
    reward_per_task: number;
    total_budget: number;
    remaining_budget: number;
    created_at: string;
    updated_at: string;
    is_deleted?: boolean;
}

function getAdminHeaders(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const secret = sessionStorage.getItem(ADMIN_SECRET_KEY);
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (secret) h['Admin-Secret'] = secret;
    return h;
}

export default function AdminPage() {
    const [adminPassword, setAdminPassword] = useState('');
    const [adminUnlocked, setAdminUnlocked] = useState(false);
    const [invalidPassword, setInvalidPassword] = useState(false);
    const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
    const [adminCampaigns, setAdminCampaigns] = useState<AdminCampaign[]>([]);
    const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);
    const [stats, setStats] = useState({ approvedToday: 0, rejectedToday: 0 });
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchAdminData = useCallback(async (showInvalidOn403 = false) => {
        setStatsLoading(true);
        setInvalidPassword(false);
        try {
            const headers = getAdminHeaders();
            const [statsRes, campaignsRes] = await Promise.all([
                fetch('/api/admin/stats', { headers }),
                fetch('/api/admin/campaigns', { headers }),
            ]);
            if (statsRes.ok) {
                const data = await statsRes.json();
                setPlatformStats(data);
                setAdminUnlocked(true);
            } else if (statsRes.status === 403) {
                setPlatformStats(null);
                if (showInvalidOn403) setInvalidPassword(true);
            }
            if (campaignsRes.ok) {
                const data = await campaignsRes.json();
                setAdminCampaigns(data.campaigns || []);
            }
        } catch {
            setPlatformStats(null);
        }
        setStatsLoading(false);
    }, []);

    const fetchSubmissions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/review');
            const data = await res.json();
            setSubmissions(data.submissions || []);
            if (data.stats) setStats(data.stats);
        } catch {
            // handle silently
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchAdminData();
    }, [fetchAdminData]);

    useEffect(() => {
        fetchSubmissions();
        const interval = setInterval(fetchSubmissions, 5000);
        return () => clearInterval(interval);
    }, [fetchSubmissions]);

    function handleLogin() {
        if (adminPassword.trim()) {
            sessionStorage.setItem(ADMIN_PASSWORD_KEY, adminPassword.trim());
            setInvalidPassword(false);
            fetchAdminData(true);
        }
    }

    async function handleDeleteCampaign(id: string) {
        if (!confirm('Delete this campaign? It will be soft-deleted from the marketplace.')) return;
        setActionLoading(id);
        try {
            const res = await fetch(`/api/campaigns/${id}`, {
                method: 'DELETE',
                headers: getAdminHeaders(),
                body: JSON.stringify({}),
            });
            if (res.ok) {
                fetchAdminData();
            } else {
                const data = await res.json();
                alert(data.error || 'Delete failed');
            }
        } catch (e) {
            alert('Delete failed');
        }
        setActionLoading(null);
    }

    async function handleAction(submissionId: string, action: 'approve' | 'reject') {
        setActionLoading(submissionId);
        try {
            await fetch('/api/admin/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submission_id: submissionId, action }),
            });
            await fetchSubmissions();
        } catch {
            // handle silently
        }
        setActionLoading(null);
    }

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Admin</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Platform overview, campaigns, and backup review queue.</p>
            </div>

            {/* Admin password (when server requires it) */}
            {!adminUnlocked && !statsLoading && (
                <div className="card glass-card mb-8 p-6">
                    <h3 className="text-lg font-bold mb-2">Admin login</h3>
                    <p className="text-sm text-zinc-500 mb-4">Enter the admin password to view platform stats and manage campaigns.</p>
                    {invalidPassword && (
                        <p className="text-sm text-red-500 mb-3">Invalid password. Please try again.</p>
                    )}
                    <div className="flex gap-3 flex-wrap">
                        <input
                            type="password"
                            placeholder="Admin password"
                            value={adminPassword}
                            onChange={(e) => {
                                setAdminPassword(e.target.value);
                                setInvalidPassword(false);
                            }}
                            className="form-input flex-1 min-w-[200px]"
                        />
                        <button type="button" onClick={handleLogin} className="btn btn-primary">Login</button>
                    </div>
                </div>
            )}

            {/* Platform stats */}
            {(platformStats || statsLoading) && (
                <section className="mb-10">
                    <h2 className="text-xl font-bold mb-4">Platform overview</h2>
                    {statsLoading ? (
                        <div className="card p-8 text-center"><div className="loading-spinner mx-auto" /></div>
                    ) : platformStats && (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                                <div className="card p-4">
                                    <div className="text-2xl font-black">{platformStats.totalUsers}</div>
                                    <div className="text-xs text-zinc-500 font-semibold uppercase mt-1">Total users</div>
                                </div>
                                <div className="card p-4">
                                    <div className="text-2xl font-black">{platformStats.founderCount}</div>
                                    <div className="text-xs text-zinc-500 font-semibold uppercase mt-1">Founders</div>
                                </div>
                                <div className="card p-4">
                                    <div className="text-2xl font-black">{platformStats.botHubCount}</div>
                                    <div className="text-xs text-zinc-500 font-semibold uppercase mt-1">Bot Hub users</div>
                                </div>
                                <div className="card p-4">
                                    <div className="text-2xl font-black">{platformStats.managedBotsCount}</div>
                                    <div className="text-xs text-zinc-500 font-semibold uppercase mt-1">Managed bots</div>
                                </div>
                                <div className="card p-4">
                                    <div className="text-2xl font-black">{platformStats.uniqueBotOwners}</div>
                                    <div className="text-xs text-zinc-500 font-semibold uppercase mt-1">Bot owners</div>
                                </div>
                                <div className="card p-4">
                                    <div className="text-2xl font-black">{platformStats.totalCampaigns}</div>
                                    <div className="text-xs text-zinc-500 font-semibold uppercase mt-1">Campaigns</div>
                                </div>
                            </div>
                            {platformStats.recentActivities.length > 0 && (
                                <div className="card p-6 mb-6">
                                    <h3 className="font-bold mb-3">Recent activity</h3>
                                    <ul className="space-y-2 max-h-48 overflow-y-auto text-sm">
                                        {platformStats.recentActivities.map((a) => (
                                            <li key={a.id} className="flex justify-between items-center py-1 border-b border-zinc-800 last:border-0">
                                                <span className="text-zinc-400">Submission</span>
                                                <span className="badge badge-pending">{a.status}</span>
                                                <span className="text-zinc-500 text-xs">{new Date(a.created_at).toLocaleString()}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </section>
            )}

            {/* All campaigns (admin) */}
            {adminCampaigns.length > 0 && (
                <section className="mb-10">
                    <h2 className="text-xl font-bold mb-4">All campaigns</h2>
                    <div className="card overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800">
                                    <th className="p-3 font-semibold">Name</th>
                                    <th className="p-3 font-semibold">Status</th>
                                    <th className="p-3 font-semibold">Founder</th>
                                    <th className="p-3 font-semibold">Reward</th>
                                    <th className="p-3 font-semibold">Budget</th>
                                    <th className="p-3 font-semibold">Created</th>
                                    <th className="p-3 font-semibold">Updated</th>
                                    <th className="p-3 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {adminCampaigns.map((c) => (
                                    <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                                        <td className="p-3 font-medium">{c.name}</td>
                                        <td className="p-3"><span className="badge badge-pending">{c.status}</span></td>
                                        <td className="p-3 text-zinc-400 font-mono text-xs truncate max-w-[120px]" title={c.founder_address}>{c.founder_address}</td>
                                        <td className="p-3">${c.reward_per_task}</td>
                                        <td className="p-3">${c.remaining_budget} / ${c.total_budget}</td>
                                        <td className="p-3 text-zinc-500">{c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</td>
                                        <td className="p-3 text-zinc-500">{c.updated_at ? new Date(c.updated_at).toLocaleString() : '—'}</td>
                                        <td className="p-3">
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteCampaign(c.id)}
                                                disabled={!!actionLoading}
                                                className="text-red-500 hover:underline text-xs"
                                            >
                                                {actionLoading === c.id ? '...' : 'Delete'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* Review Queue */}
            <section>
                <h2 className="text-xl font-bold mb-4">Review queue</h2>
                <p className="text-sm text-zinc-500 mb-4">Backup queue. Same approve action triggers USDC payout.</p>
                <div className="stats-row" style={{ marginBottom: '1.5rem' }}>
                    <div className="card">
                        <div className="stat-value">{submissions.length}</div>
                        <div className="stat-label">Pending Reviews</div>
                    </div>
                    <div className="card">
                        <div className="stat-value">{stats.approvedToday}</div>
                        <div className="stat-label">Approved Today</div>
                    </div>
                    <div className="card">
                        <div className="stat-value">{stats.rejectedToday}</div>
                        <div className="stat-label">Rejected Today</div>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <div className="loading-spinner" />
                    </div>
                ) : submissions.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Queue cleared</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>No pending submissions.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {submissions.map((sub) => (
                            <div key={sub.id} className="card animate-in" style={{ padding: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span className="badge badge-pending">Review Required</span>
                                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{sub.tasks?.title || 'System Validation Task'}</h3>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                            disabled={actionLoading === sub.id}
                                            onClick={() => handleAction(sub.id, 'reject')}
                                        >Reject</button>
                                        <button
                                            className="btn btn-primary"
                                            disabled={actionLoading === sub.id}
                                            onClick={() => handleAction(sub.id, 'approve')}
                                        >
                                            {actionLoading === sub.id ? '...' : 'Approve & Pay'}
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' }}>
                                    <span><strong>Agent:</strong> {sub.agents?.name || 'Anonymous'}</span>
                                    <span><strong>Reputation:</strong> {sub.agents?.reputation_score || 0}%</span>
                                    <span><strong>Duration:</strong> {sub.feedback.duration_seconds}s</span>
                                    <span><strong>Submitted:</strong> {new Date(sub.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="score-grid" style={{ marginBottom: '1.5rem' }}>
                                    <div className="score-item"><div className="score-value">{sub.feedback?.scores?.usability ?? '—'}</div><div className="score-label">Usability</div></div>
                                    <div className="score-item"><div className="score-value">{sub.feedback?.scores?.speed ?? '—'}</div><div className="score-label">Speed</div></div>
                                    <div className="score-item"><div className="score-value">{sub.feedback?.scores?.clarity ?? '—'}</div><div className="score-label">Clarity</div></div>
                                    <div className="score-item"><div className="score-value">{sub.feedback?.scores?.reliability ?? '—'}</div><div className="score-label">Reliability</div></div>
                                </div>
                                <button
                                    onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, padding: 0 }}
                                >
                                    {expandedId === sub.id ? 'Hide Feedback Trace' : 'View Feedback Trace'}
                                </button>
                                {expandedId === sub.id && (
                                    <div className="animate-in" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <h4 style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>Steps Executed:</h4>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                {sub.feedback?.steps_completed?.map((step: string, i: number) => (
                                                    <span key={i} style={{ background: 'var(--bg-secondary)', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{step}</span>
                                                )) || <span style={{ color: 'var(--text-muted)' }}>No steps recorded</span>}
                                            </div>
                                        </div>
                                        {sub.feedback.issues && sub.feedback.issues.length > 0 && (
                                            <div style={{ marginBottom: '1.5rem' }}>
                                                <h4 style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>Issues Detected:</h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                    {sub.feedback.issues.map((issue, i) => (
                                                        <div key={i} style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', borderLeft: `4px solid ${issue.severity === 'critical' ? 'var(--danger)' : 'var(--warning)'}` }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                                                                <span style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: issue.severity === 'critical' ? 'var(--danger)' : 'var(--warning)' }}>{issue.severity}</span>
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@ {issue.step}</span>
                                                            </div>
                                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{issue.description}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {sub.feedback.notes && (
                                            <div>
                                                <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Agent Notes:</h4>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{sub.feedback.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
