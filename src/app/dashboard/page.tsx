'use client';

import { useEffect, useState } from 'react';
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

    async function fetchData() {
        if (!walletAddress) return;
        setLoading(true);
        try {
            // Fetch founder's campaigns
            const campRes = await fetch(`/api/campaigns?founder=${walletAddress}`);
            const campData = await campRes.json();
            setCampaigns(campData.campaigns || []);

            // Fetch founder's pending reviews
            const subRes = await fetch(`/api/admin/review?founder=${walletAddress}`);
            const subData = await subRes.json();
            setSubmissions(subData.submissions || []);

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
    }

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
        }
    }, [walletAddress]);

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
                                onChange={(e) => setRoleInput(e.target.value as any)}
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

    const totalEscrowed = campaigns.reduce((acc, c) => acc + c.total_budget, 0);
    const activeTasks = campaigns.length;

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header" style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.04em' }}>Founder Dashboard</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage your campaigns and review agent performance.</p>
                </div>
                <Link href="/campaigns/create" className="btn btn-primary">+ Create New Campaign</Link>
            </div>

            {/* Wallet & Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginBottom: '3rem' }}>
                {/* Managed Wallet Card */}
                <div className="card glass-card" style={{ padding: '2rem', border: '1px solid var(--accent)', background: 'rgba(0, 82, 255, 0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>🏦</span>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Managed Platform Wallet</h3>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                        This is your inbuilt wallet. Deposit **USDC on Base** to fund your campaigns.
                    </p>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{walletAddress}</span>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(walletAddress!);
                                alert('Wallet address copied to clipboard!');
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '0.5rem' }}
                            title="Copy Address"
                        >
                            📋
                        </button>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem' }}>
                        {parseFloat(balance).toFixed(2)} USDC
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <strong>Network:</strong> Base Mainnet
                    </div>
                </div>

                {/* Stats Row */}
                <div className="stats-row" style={{ height: '100%' }}>
                    <div className="card">
                        <div className="stat-value">{campaigns.length}</div>
                        <div className="stat-label">Total Campaigns</div>
                    </div>
                    <div className="card">
                        <div className="stat-value">{submissions.length}</div>
                        <div className="stat-label">Pending Reviews</div>
                    </div>
                    <div className="card">
                        <div className="stat-value">
                            ${campaigns.reduce((sum, c) => sum + (c.remaining_budget || 0), 0).toFixed(2)}
                        </div>
                        <div className="stat-label">Remaining Budget</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                {/* Campaigns List */}
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Your Campaigns</h2>
                    {loading ? (
                        <div className="card glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                            <div className="loading-spinner" />
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="card glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You haven't launched any campaigns yet.</p>
                            <Link href="/campaigns/create" className="btn btn-secondary">Create Your First Campaign</Link>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {campaigns.map(camp => (
                                <div key={camp.id} className="card glass-card animate-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem' }}>
                                    <div>
                                        <h3 style={{ fontWeight: 700, fontSize: '1.125rem' }}>{camp.name}</h3>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                            Reward: ${camp.reward_per_task} per task · Status: <span style={{ color: camp.status === 'active' ? 'var(--accent)' : 'var(--warning)' }}>{camp.status}</span>
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 600, fontSize: '1rem' }}>${camp.remaining_budget.toFixed(2)}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Budget Left</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Reviews Sidebar */}
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Review Hub</h2>
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
                                            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{sub.feedback.scores.usability}/10</div>
                                            <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>UX Score</div>
                                        </div>
                                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{sub.feedback.duration_seconds}s</div>
                                            <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Speed</div>
                                        </div>
                                    </div>
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
                                            {actionLoading === sub.id ? '...' : 'Approve'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
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
