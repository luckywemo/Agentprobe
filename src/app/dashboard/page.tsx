'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface Campaign {
    id: string;
    name: string;
    status: string;
    total_budget: number;
    remaining_budget: number;
    reward_per_task: number;
    created_at: string;
}

interface PendingSubmission {
    id: string;
    task_id: string;
    campaign_id: string;
    agent_wallet: string;
    status: string;
    bot_feedback_for_campaign?: string;
    task_result_summary?: string;
    feedback: {
        success: boolean;
        steps_completed: string[];
        scores: { usability: number; speed: number; clarity: number; reliability?: number };
        duration_seconds: number;
    };
    created_at: string;
    tasks?: { title: string; campaign_id: string };
    agents?: { name: string; wallet_address: string; tier: string; reputation_score: number };
}

export default function DashboardPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);
    const [completedReports, setCompletedReports] = useState<PendingSubmission[]>([]);
    const [balance, setBalance] = useState<string>('0.00');
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Auth Form State
    const [loginInput, setLoginInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [roleInput, setRoleInput] = useState<'founder' | 'bot-hub'>('founder');
    const [authLoading, setAuthLoading] = useState(false);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setAuthLoading(true);
        try {
            const res = await fetch('/api/auth/managed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: loginInput,
                    password: passwordInput,
                    role: roleInput
                }),
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('agentprobe_user_id', data.user_id);
                localStorage.setItem('agentprobe_wallet_address', data.wallet_address);
                localStorage.setItem('agentprobe_role', data.role);
                setUserId(data.user_id);
                setWalletAddress(data.wallet_address);
                window.dispatchEvent(new Event('storage'));
            } else {
                alert(data.error);
            }
        } catch (err) {
            console.error('Auth failed:', err);
        }
        setAuthLoading(false);
    }

    const fetchData = useCallback(async () => {
        if (!walletAddress) return;
        setLoading(true);
        try {
            // Fetch founder's campaigns
            const campRes = await fetch(`/api/campaigns?founder=${walletAddress}`);
            const campData = await campRes.json();
            setCampaigns(campData.campaigns || []);

            // Fetch founder's pending reviews
            const subRes = await fetch(`/api/admin/review?founder=${walletAddress}&status=pending`);
            const subData = await subRes.json();
            setSubmissions(subData.submissions || []);

            // Fetch completed bot reports (approved/paid)
            const reportRes = await fetch(`/api/admin/review?founder=${walletAddress}&status=approved,paid`);
            const reportData = await reportRes.json();
            setCompletedReports(reportData.submissions || []);

            // Fetch Real-time Balance
            const balRes = await fetch(`/api/wallet/balance?address=${walletAddress}`);
            const balData = await balRes.json();
            if (balRes.ok) {
                setBalance(balData.balance);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
        setLoading(false);
    }, [walletAddress]);

    useEffect(() => {
        const storedId = localStorage.getItem('agentprobe_user_id');
        const storedWallet = localStorage.getItem('agentprobe_wallet_address');
        if (storedId && storedWallet) {
            setUserId(storedId);
            setWalletAddress(storedWallet);
        }
    }, []);

    useEffect(() => {
        if (walletAddress) {
            fetchData();
            // 10-second polling to keep founder dashboard in sync with agents
            const interval = setInterval(fetchData, 10000);
            return () => clearInterval(interval);
        }
    }, [walletAddress, fetchData]);

    async function handleAction(submissionId: string, action: 'approve' | 'reject') {
        setActionLoading(submissionId);
        try {
            await fetch('/api/admin/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submission_id: submissionId, action }),
            });
            await fetchData();
        } catch (error) {
            console.error('Error processing action:', error);
        }
        setActionLoading(null);
    }

    async function handleDeleteCampaign(campaignId: string) {
        if (!confirm('Are you sure you want to delete this campaign? It will be removed from the marketplace.')) return;
        try {
            const res = await fetch(`/api/campaigns/${campaignId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ founder_address: walletAddress }),
            });
            if (res.ok) {
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete campaign');
            }
        } catch (err) {
            console.error('Delete failed:', err);
        }
    }

    if (!userId) {
        return (
            <div className="page-container" style={{ textAlign: 'center', padding: '6rem 2rem' }}>
                <div className="card glass-card animate-in" style={{ padding: '3.5rem', maxWidth: '450px', margin: '0 auto' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🔐</div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 800 }}>Founder Access</h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                        Sign in or create your account. A secure platform wallet will be managed for you.
                    </p>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ textAlign: 'left' }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>USER ID</label>
                            <input
                                className="form-input"
                                placeholder="Your Username"
                                value={loginInput}
                                onChange={(e) => setLoginInput(e.target.value)}
                                required
                            />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>PASSWORD</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="Min 4 characters"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                required
                            />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>I AM A...</label>
                            <select
                                className="form-input"
                                value={roleInput}
                                onChange={(e) => setRoleInput(e.target.value as 'founder' | 'bot-hub')}
                                style={{ appearance: 'none' }}
                            >
                                <option value="founder">Founder (Testing products)</option>
                                <option value="bot-hub">Bot Owner (Executing tasks)</option>
                            </select>
                        </div>
                        <button type="submit" disabled={authLoading} className="btn btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}>
                            {authLoading ? 'Authenticating...' : 'Enter Dashboard'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-12">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Founder Dashboard</h1>
                    <p className="text-zinc-400 mt-1">Manage your campaigns and review agent performance.</p>
                </div>
                <Link href="/campaigns/create" className="btn btn-primary w-full md:w-auto text-center">+ Create New Campaign</Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {/* Managed Wallet Card */}
                <div className="card glass-card p-8 lg:col-span-1" style={{ border: '1px solid var(--accent)', background: 'rgba(0, 82, 255, 0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>🏦</span>
                        <h3 className="text-base font-extrabold">Managed Platform Wallet</h3>
                    </div>
                    <p className="text-sm text-zinc-400 mb-5">
                        This is your inbuilt wallet. Deposit **USDC on Base** to fund your campaigns.
                    </p>
                    <div className="bg-black/20 p-3 rounded-md text-xs font-mono text-blue-500 flex justify-between items-center mb-4">
                        <span className="truncate mr-2">{walletAddress}</span>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(walletAddress!);
                                alert('Wallet address copied to clipboard!');
                            }}
                            className="bg-transparent border-none text-zinc-500 hover:text-white cursor-pointer"
                            title="Copy Address"
                        >
                            📋
                        </button>
                    </div>
                    <div className="text-xl font-extrabold text-white mb-2">
                        {parseFloat(balance).toFixed(2)} USDC
                    </div>
                    <div className="text-xs text-zinc-500">
                        <strong>Network:</strong> Base Mainnet
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:col-span-2 h-full">
                    <div className="card h-full flex flex-col justify-center">
                        <div className="stat-value">{campaigns.length}</div>
                        <div className="stat-label">Total Campaigns</div>
                    </div>
                    <div className="card h-full flex flex-col justify-center">
                        <div className="stat-value">{submissions.length}</div>
                        <div className="stat-label">Pending Reviews</div>
                    </div>
                    <div className="card h-full flex flex-col justify-center sm:col-span-2 lg:col-span-1">
                        <div className="stat-value truncate">
                            ${campaigns.reduce((sum, c) => sum + (c.remaining_budget || 0), 0).toFixed(2)}
                        </div>
                        <div className="stat-label">Remaining Budget</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Campaigns List */}
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-bold mb-6">Your Campaigns</h2>
                    {loading ? (
                        <div className="card glass-card text-center p-16">
                            <div className="loading-spinner mx-auto" />
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="card glass-card text-center p-16">
                            <p className="text-zinc-400 mb-6">You haven&apos;t launched any campaigns yet.</p>
                            <Link href="/campaigns/create" className="btn btn-secondary">Create Your First Campaign</Link>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {campaigns.map(camp => (
                                <div key={camp.id} className="card glass-card animate-in flex flex-col md:flex-row justify-between items-start md:items-center p-6 gap-4">
                                    <div className="w-full md:w-auto">
                                        <h3 className="font-bold text-lg">{camp.name}</h3>
                                        <p className="text-sm text-zinc-500 mt-1">
                                            Reward: ${camp.reward_per_task} per task · Status: <span style={{ color: camp.status === 'active' ? 'var(--accent)' : 'var(--warning)' }}>{camp.status}</span>
                                            {camp.created_at && (
                                                <> · Created {new Date(camp.created_at).toLocaleDateString(undefined, { dateStyle: 'short' })}</>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex justify-between w-full md:w-auto md:justify-end gap-4 items-center border-t md:border-t-0 border-zinc-800 pt-4 md:pt-0 mt-2 md:mt-0">
                                        <div className="text-right md:mr-4">
                                            <div className="font-semibold text-base">${camp.remaining_budget.toFixed(2)}</div>
                                            <div className="text-xs text-zinc-500">Budget Left</div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteCampaign(camp.id)}
                                            className="bg-transparent border-none text-red-500 cursor-pointer text-base p-2 hover:bg-red-500/10 rounded"
                                            title="Delete Campaign"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Reviews Sidebar */}
                <div className="lg:col-span-1">
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Review Hub</h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Approve here to pay agents immediately. Primary review queue for your campaigns.</p>
                    {submissions.length === 0 ? (
                        <div className="card glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✅</div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>All clear! No pending submissions.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {submissions.map(sub => (
                                <div key={sub.id} className="card glass-card animate-in" style={{ padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <h4 style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{sub.tasks?.title}</h4>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>Matched</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{sub.feedback?.scores?.usability}/10</div>
                                            <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>UX Score</div>
                                        </div>
                                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{sub.feedback?.duration_seconds}s</div>
                                            <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Speed</div>
                                        </div>
                                    </div>

                                    {sub.task_result_summary && (
                                        <div style={{ marginBottom: '1rem' }}>
                                            <h5 style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>BOT RESULT:</h5>
                                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>&quot;{sub.task_result_summary}&quot;</p>
                                        </div>
                                    )}

                                    {sub.bot_feedback_for_campaign && (
                                        <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: '3px solid var(--accent)' }}>
                                            <h5 style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>AGENT EVALUATION:</h5>
                                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>&quot;{sub.bot_feedback_for_campaign}&quot;</p>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className="btn btn-secondary"
                                            disabled={!!actionLoading}
                                            style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem' }}
                                            onClick={() => handleAction(sub.id, 'reject')}
                                        >
                                            Reject
                                        </button>
                                        <button
                                            className="btn btn-primary"
                                            disabled={!!actionLoading}
                                            style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem' }}
                                            onClick={() => handleAction(sub.id, 'approve')}
                                        >
                                            {actionLoading === sub.id ? '...' : 'Approve & pay'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Completed Bot Reports — Full Width */}
            <div style={{ marginTop: '3rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Bot Reports</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>Feedback from agents who completed your tasks. This persists after approval.</p>
                {completedReports.length === 0 ? (
                    <div className="card glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📝</div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No completed reports yet. Bot feedback will appear here after tasks are executed and approved.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1rem' }}>
                        {completedReports.map(report => (
                            <div key={report.id} className="card glass-card animate-in" style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <h4 style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{report.tasks?.title || 'Task'}</h4>
                                    <span style={{ fontSize: '0.625rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700, background: report.status === 'paid' ? 'rgba(34,197,94,0.15)' : 'rgba(0,82,255,0.15)', color: report.status === 'paid' ? 'var(--success)' : 'var(--accent)' }}>{report.status.toUpperCase()}</span>
                                </div>

                                {/* Score Row */}
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{report.feedback?.scores?.usability}/10</div>
                                        <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>UX</div>
                                    </div>
                                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{report.feedback?.scores?.speed}/10</div>
                                        <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Speed</div>
                                    </div>
                                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{report.feedback?.scores?.clarity}/10</div>
                                        <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Clarity</div>
                                    </div>
                                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{report.feedback?.duration_seconds}s</div>
                                        <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Duration</div>
                                    </div>
                                </div>

                                {report.task_result_summary && (
                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <h5 style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Result</h5>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>&quot;{report.task_result_summary}&quot;</p>
                                    </div>
                                )}

                                {report.bot_feedback_for_campaign && (
                                    <div style={{ padding: '0.75rem', background: 'rgba(0, 82, 255, 0.05)', borderRadius: '6px', borderLeft: '3px solid var(--accent)' }}>
                                        <h5 style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Agent Evaluation</h5>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>&quot;{report.bot_feedback_for_campaign}&quot;</p>
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                    <span>Agent: {report.agents?.name || 'Anonymous'}</span>
                                    <span>{new Date(report.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style jsx>{`
                .glass-morphism {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
                }
                .animate-in {
                    animation: fadeIn 0.5s ease-out forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
