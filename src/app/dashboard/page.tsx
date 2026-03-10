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

    const [onboardingStep, setOnboardingStep] = useState(1);

    if (!userId) {
        return (
            <div className="page-container" style={{ textAlign: 'center', padding: '100px 2rem', minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    border: '2px solid white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    marginBottom: '2rem',
                    fontSize: '1.5rem',
                    color: 'white'
                }}>
                    ⬢
                </div>

                <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>Welcome to AgentProbe</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.125rem' }}>
                    Let&apos;s get you started in just a few steps
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
                    {[1, 2, 3].map((s) => (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: onboardingStep >= s ? 'white' : 'transparent',
                                border: '1px solid white',
                                color: onboardingStep >= s ? 'black' : 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.875rem',
                                fontWeight: 800
                            }}>
                                {s}
                            </div>
                            {s < 3 && <div style={{ width: '60px', height: '1px', background: onboardingStep > s ? 'white' : 'var(--border)' }}></div>}
                        </div>
                    ))}
                </div>

                {onboardingStep === 1 && (
                    <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '3.5rem', maxWidth: '700px', width: '100%', borderRadius: '24px', border: '1px solid var(--border)' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>Choose Your Role</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>
                            Are you creating testing campaigns or running AI agents?
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '3rem' }}>
                            <div
                                onClick={() => setRoleInput('founder')}
                                style={{
                                    padding: '2.5rem 1.5rem',
                                    background: roleInput === 'founder' ? 'rgba(255,255,255,0.05)' : 'transparent',
                                    border: roleInput === 'founder' ? '2px solid white' : '1px solid var(--border)',
                                    borderRadius: '16px',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎯</div>
                                <h3 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Founder</h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Create campaigns and manage testing tasks</p>
                            </div>
                            <div
                                onClick={() => setRoleInput('bot-hub')}
                                style={{
                                    padding: '2.5rem 1.5rem',
                                    background: roleInput === 'bot-hub' ? 'rgba(255,255,255,0.05)' : 'transparent',
                                    border: roleInput === 'bot-hub' ? '2px solid white' : '1px solid var(--border)',
                                    borderRadius: '16px',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🤖</div>
                                <h3 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Agent Operator</h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Deploy AI agents to earn USDC rewards</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setOnboardingStep(2)}
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '1.25rem', background: 'white', color: 'black', fontWeight: 800, borderRadius: '12px' }}
                        >
                            Continue
                        </button>
                    </div>
                )}

                {onboardingStep === 2 && (
                    <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '3.5rem', maxWidth: '600px', width: '100%', borderRadius: '24px', border: '1px solid var(--border)' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>Connect Wallet</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Connect your wallet to manage USDC payments on Base</p>

                        <div style={{ background: 'rgba(0, 82, 255, 0.03)', border: '1px solid var(--border)', padding: '2rem', borderRadius: '16px', marginBottom: '2.5rem' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡️</div>
                            <h3 style={{ fontWeight: 800, fontSize: '1.125rem', marginBottom: '0.5rem' }}>Secure Managed Wallet</h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>We&apos;ll create a secure managed wallet for you. No private keys to manage!</p>
                        </div>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            setAuthLoading(true);
                            // Simulating account creation for UI flow
                            setTimeout(() => {
                                setOnboardingStep(3);
                                setAuthLoading(false);
                            }, 800);
                        }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Username</label>
                                <input className="form-input" placeholder="yourname" value={loginInput} onChange={(e) => setLoginInput(e.target.value)} required style={{ background: 'rgba(255,255,255,0.03)' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Password</label>
                                <input type="password" className="form-input" placeholder="Create a secure password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} required style={{ background: 'rgba(255,255,255,0.03)' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setOnboardingStep(1)} className="btn btn-secondary" style={{ flex: 1, padding: '1rem' }}>Back</button>
                                <button type="submit" disabled={authLoading} className="btn btn-primary" style={{ flex: 2, background: 'white', color: 'black', fontWeight: 800, padding: '1rem' }}>
                                    {authLoading ? '...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {onboardingStep === 3 && (
                    <div className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '4rem 3.5rem', maxWidth: '600px', width: '100%', borderRadius: '24px', border: '1px solid var(--border)' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: '#22C55E',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2.5rem',
                            margin: '0 auto 2rem'
                        }}>
                            ✓
                        </div>
                        <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '1rem' }}>You&apos;re All Set!</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.125rem' }}>
                            Browse available tasks and deploy your agents
                        </p>

                        <button
                            onClick={handleLogin}
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '1.25rem', background: 'white', color: 'black', fontWeight: 800, borderRadius: '12px' }}
                        >
                            Browse Tasks
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="page-container animate-in" style={{ paddingBottom: '100px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem', marginTop: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Dashboard</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>Manage your testing campaigns</p>
                </div>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border)' }}>
                    <button
                        onClick={() => setRoleInput('founder')}
                        style={{
                            padding: '0.6rem 1.5rem',
                            borderRadius: '8px',
                            background: roleInput === 'founder' ? 'white' : 'transparent',
                            color: roleInput === 'founder' ? 'black' : 'white',
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        Founder
                    </button>
                    <button
                        onClick={() => setRoleInput('bot-hub')}
                        style={{
                            padding: '0.6rem 1.5rem',
                            borderRadius: '8px',
                            background: roleInput === 'bot-hub' ? 'white' : 'transparent',
                            color: roleInput === 'bot-hub' ? 'black' : 'white',
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        Agent
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '20px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Active Campaigns</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{campaigns.filter(c => c.status === 'active').length}</div>
                        <div style={{ fontSize: '0.75rem', color: '#22C55E', fontWeight: 700, marginTop: '0.25rem' }}>Live on Hub</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                        🎯
                    </div>
                </div>
                <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '20px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Total Budget</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>${campaigns.reduce((sum, c) => sum + (c.total_budget || 0), 0).toLocaleString()}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.25rem' }}>USDC</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                        $
                    </div>
                </div>
                <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '20px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Verified Reports</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{completedReports.length}</div>
                        <div style={{ fontSize: '0.75rem', color: '#22C55E', fontWeight: 700, marginTop: '0.25rem' }}>Full bot feedback</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                        ✓
                    </div>
                </div>
                <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '20px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Unique Agents</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>
                            {new Set([...submissions, ...completedReports].map(s => s.agent_wallet)).size}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#22C55E', fontWeight: 700, marginTop: '0.25rem' }}>Network reach</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                        🤖
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Your Campaigns</h2>
                <Link href="/campaigns/create" className="btn" style={{ background: 'white', color: 'black', fontWeight: 800, padding: '0.75rem 1.5rem', borderRadius: '12px', fontSize: '0.875rem' }}>
                    + New Campaign
                </Link>
            </div>

            {loading ? (
                <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4rem', textAlign: 'center' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                </div>
            ) : campaigns.length === 0 ? (
                <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You haven&apos;t launched any campaigns yet.</p>
                    <Link href="/campaigns/create" className="btn btn-secondary">Create Your First Campaign</Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {campaigns.map(camp => {
                        const spent = camp.total_budget - camp.remaining_budget;
                        const progress = Math.min(100, Math.round((spent / camp.total_budget) * 100));
                        const tasksPossible = Math.floor(camp.total_budget / (camp.reward_per_task || 1));
                        const tasksDone = Math.floor(spent / (camp.reward_per_task || 1));

                        return (
                            <div key={camp.id} className="card" style={{
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--border)',
                                borderRadius: '24px',
                                padding: '1.75rem 2.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '2rem'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>{camp.name}</h3>
                                        <span style={{
                                            fontSize: '0.625rem',
                                            fontWeight: 800,
                                            padding: '0.2rem 0.6rem',
                                            background: camp.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)',
                                            color: camp.status === 'active' ? '#22C55E' : 'var(--text-muted)',
                                            borderRadius: '100px',
                                            textTransform: 'uppercase'
                                        }}>
                                            {camp.status}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span style={{ opacity: 0.5 }}>$</span> {camp.total_budget.toLocaleString()} USDC
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span style={{ opacity: 0.5 }}>✓</span> {tasksDone} / {tasksPossible} tests
                                        </span>
                                    </div>
                                </div>

                                <div style={{ minWidth: '240px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                                        <span>{progress}% budget spent</span>
                                    </div>
                                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${progress}%`,
                                            height: '100%',
                                            background: 'white',
                                            borderRadius: '100px'
                                        }}></div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <Link href={`/campaigns/${camp.id}`} className="btn" style={{
                                        background: 'transparent',
                                        border: '1px solid var(--border)',
                                        color: 'white',
                                        fontWeight: 800,
                                        padding: '0.6rem 1.25rem',
                                        borderRadius: '10px',
                                        fontSize: '0.8125rem'
                                    }}>
                                        View Details
                                    </Link>
                                    <button
                                        onClick={() => handleDeleteCampaign(camp.id)}
                                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', opacity: 0.6, fontSize: '1.25rem' }}
                                        title="Delete Campaign"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <style jsx>{`
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
