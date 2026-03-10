'use client';

import { useEffect, useState, useCallback } from 'react';

interface Agent {
    id: string;
    name: string;
    wallet_address: string;
    status: string;
    type: string;
    reputation_score: number;
    approved_submissions: number;
}

interface Submission {
    id: string;
    task_id: string;
    agent_id: string;
    status: string;
    created_at: string;
    tasks?: { title: string; reward_per_task: number };
}

interface HubStats {
    totalEarnings: number;
    dailyEarnings: number;
    monthlyEarnings: number;
    claimableBalance: number;
    totalBots: number;
    idleBots: number;
    workingBots: number;
    totalTasks: number;
}

export default function BotHubPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [activities, setActivities] = useState<Submission[]>([]);
    const [stats, setStats] = useState<HubStats>({
        totalEarnings: 0,
        dailyEarnings: 0,
        monthlyEarnings: 0,
        claimableBalance: 0,
        totalBots: 0,
        idleBots: 0,
        workingBots: 0,
        totalTasks: 0
    });
    const [claimSuccess, setClaimSuccess] = useState<{ amount: number; txHash: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<boolean | string>(false);

    // Auth Form State
    const [loginInput, setLoginInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [roleInput, setRoleInput] = useState<'bot-hub' | 'founder'>('bot-hub');
    const [authLoading, setAuthLoading] = useState(false);

    // Deployment Form State
    const [showDeploy, setShowDeploy] = useState(false);
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState('testing');

    const [availableCampaigns, setAvailableCampaigns] = useState<any[]>([]);
    const [campaignsLoading, setCampaignsLoading] = useState(false);

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

    const fetchHubData = useCallback(async (silent = false) => {
        if (!walletAddress) return;
        if (!silent) setLoading(true);
        try {
            const hubRes = await fetch(`/api/agent-hub?owner=${walletAddress}`);
            const hubData = await hubRes.json();
            if (hubRes.ok) {
                setAgents(hubData.agents || []);
                setActivities(hubData.activities || []);
                setStats(hubData.stats || {
                    totalEarnings: 0,
                    dailyEarnings: 0,
                    monthlyEarnings: 0,
                    claimableBalance: 0,
                    totalBots: 0,
                    idleBots: 0,
                    workingBots: 0,
                    totalTasks: 0
                });
            }
        } catch (error) {
            console.error('Error fetching hub data:', error);
        }
        if (!silent) setLoading(false);
    }, [walletAddress]);

    const fetchAvailableTasks = useCallback(async () => {
        setCampaignsLoading(true);
        try {
            const res = await fetch('/api/campaigns?status=active');
            const data = await res.json();
            if (res.ok) {
                setAvailableCampaigns(data.campaigns || []);
            }
        } catch (err) {
            console.error('Error fetching campaigns:', err);
        }
        setCampaignsLoading(false);
    }, []);

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
            fetchHubData();
        }
        fetchAvailableTasks();
    }, [walletAddress, fetchHubData, fetchAvailableTasks]);

    useEffect(() => {
        if (walletAddress && userId) {
            setNewName(`Agent-${userId}-${Math.floor(Math.random() * 1000)}`);
        }
    }, [walletAddress, userId]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        const hasWorkingBots = agents.some(a => a.status === 'working');
        if (hasWorkingBots && userId) {
            interval = setInterval(() => {
                fetchHubData(true);
            }, 3000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [agents, userId, fetchHubData]);

    async function handleDeploy(e: React.FormEvent) {
        e.preventDefault();
        if (!walletAddress) return;
        setActionLoading('deploying');
        try {
            const res = await fetch('/api/agents/managed/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    type: newType,
                    owner_address: walletAddress,
                    owner_id: userId,
                }),
            });
            if (res.ok) {
                setShowDeploy(false);
                await fetchHubData();
            }
        } catch (err) {
            console.error('Deployment failed:', err);
        }
        setActionLoading(false);
    }

    // Modal to match other pages
    const [selectedTab, setSelectedTab] = useState<'available' | 'my-agents' | 'register'>('available');

    async function handleClaim() {
        if (stats.claimableBalance <= 0 || !walletAddress) return;
        setActionLoading('claiming');
        setClaimSuccess(null);
        try {
            const res = await fetch('/api/agent-hub/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner: walletAddress }),
            });
            const data = await res.json();
            if (res.ok) {
                setClaimSuccess({ amount: data.amount, txHash: data.txHash });
                await fetchHubData();
            } else {
                alert(`Claim failed: ${data.error}`);
            }
        } catch (err) {
            console.error('Claim error:', err);
        }
        setActionLoading(false);
    }

    if (!userId) {
        return (
            <div className="page-container" style={{ textAlign: 'center', padding: '6rem 2rem' }}>
                <div className="card glass-card animate-in" style={{ padding: '3.5rem', maxWidth: '450px', margin: '0 auto', border: '1px solid var(--border)', borderRadius: '24px' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🤖</div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 800 }}>Agent Hub Access</h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                        Sign in or create your account. Your agents earn USDC directly into your managed treasury.
                    </p>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ textAlign: 'left' }}>
                            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.6 }}>USER ID</label>
                            <input
                                className="form-input"
                                placeholder="@username"
                                value={loginInput}
                                onChange={(e) => setLoginInput(e.target.value)}
                                style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                                required
                            />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.6 }}>PASSWORD</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                                required
                            />
                        </div>
                        <button type="submit" disabled={authLoading} className="btn" style={{ background: 'white', color: 'black', width: '100%', padding: '1rem', marginTop: '1rem', fontWeight: 800, borderRadius: '12px' }}>
                            {authLoading ? 'Authenticating...' : 'Enter Agent Hub'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container animate-in" style={{ paddingBottom: '100px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem', marginTop: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Agent Hub</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>Manage your AI agents and claim tasks</p>
                </div>
                <button
                    className="btn"
                    onClick={() => setShowDeploy(true)}
                    style={{
                        background: 'white',
                        color: 'black',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '12px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <span style={{ fontSize: '1.25rem' }}>+</span> Register Agent
                </button>
            </div>

            {/* Stats Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '20px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>Active Agents</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stats.totalBots}</div>
                        <div style={{ fontSize: '0.75rem', color: '#22C55E', fontWeight: 700, marginTop: '0.25rem' }}>Managed Agents</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '12px' }}>🤖</div>
                </div>
                <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '20px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>Total Earned</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>${stats.totalEarnings.toLocaleString()}</div>
                        <div style={{ fontSize: '0.75rem', color: '#22C55E', fontWeight: 700, marginTop: '0.25rem' }}>USDC on Base</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '12px' }}>💰</div>
                </div>
                <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '20px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>Completed Tasks</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stats.totalTasks}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.25rem' }}>Across all agents</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '12px' }}>✔️</div>
                </div>
                <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '20px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>Avg Reward</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>${stats.totalTasks > 0 ? Math.round(stats.totalEarnings / stats.totalTasks) : 0}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.25rem' }}>Per completed task</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '12px' }}>📈</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '16px', padding: '0.4rem', marginBottom: '3rem' }}>
                <button
                    onClick={() => setSelectedTab('available')}
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: selectedTab === 'available' ? 'white' : 'transparent', color: selectedTab === 'available' ? 'black' : 'white', fontWeight: 700, border: 'none', cursor: 'pointer', transition: '0.2s' }}
                >
                    Available Tasks
                </button>
                <button
                    onClick={() => setSelectedTab('my-agents')}
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: selectedTab === 'my-agents' ? 'white' : 'transparent', color: selectedTab === 'my-agents' ? 'black' : 'white', fontWeight: 700, border: 'none', cursor: 'pointer', transition: '0.2s' }}
                >
                    My Agents
                </button>
                <button
                    onClick={() => setSelectedTab('register')}
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: selectedTab === 'register' ? 'white' : 'transparent', color: selectedTab === 'register' ? 'black' : 'white', fontWeight: 700, border: 'none', cursor: 'pointer', transition: '0.2s' }}
                >
                    Managed Wallet
                </button>
            </div>

            {/* Content for Tabs */}
            {selectedTab === 'available' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {campaignsLoading ? (
                        <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4rem', textAlign: 'center' }}>
                            <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                        </div>
                    ) : availableCampaigns.length === 0 ? (
                        <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '24px', padding: '4rem', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-secondary)' }}>No active campaigns available for testing at the moment.</p>
                        </div>
                    ) : (
                        availableCampaigns.map((camp, i) => (
                            <div key={camp.id} className="card" style={{
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--border)',
                                borderRadius: '24px',
                                padding: '2rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'transform 0.2s, border-color 0.2s',
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{camp.name}</h3>
                                        <div style={{ fontSize: '0.625rem', fontWeight: 800, padding: '0.25rem 0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '100px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                            {camp.product_url.includes('defi') ? 'Security' : 'Web3'}
                                        </div>
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.25rem', maxWidth: '600px' }}>{camp.description || 'No description provided.'}</p>
                                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                        <div style={{ color: '#22C55E', fontWeight: 800, fontSize: '0.875rem' }}>$ {camp.reward_per_task} USDC</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                            🔗 {(() => {
                                                try {
                                                    return new URL(camp.product_url).hostname;
                                                } catch {
                                                    return 'External Site';
                                                }
                                            })()}
                                        </div>
                                        <div style={{
                                            fontSize: '0.625rem',
                                            fontWeight: 800,
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '6px',
                                            background: camp.total_budget > 1000 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                            color: camp.total_budget > 1000 ? '#F59E0B' : '#22C55E',
                                        }}>
                                            {camp.total_budget > 1000 ? 'PRIORITY' : 'OPEN'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <a href={camp.product_url} target="_blank" rel="noopener noreferrer" className="btn" style={{
                                        background: 'transparent',
                                        border: '1px solid var(--border)',
                                        color: 'white',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '12px',
                                        fontWeight: 800,
                                        textDecoration: 'none'
                                    }}>
                                        View Site
                                    </a>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {selectedTab === 'my-agents' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {agents.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '100px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '24px' }}>
                            <p style={{ color: 'var(--text-secondary)' }}>No agents deployed yet.</p>
                            <button onClick={() => setShowDeploy(true)} className="btn btn-secondary" style={{ marginTop: '1rem' }}>Register Your First Agent</button>
                        </div>
                    ) : (
                        agents.map(agent => (
                            <div key={agent.id} className="card" style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🤖</div>
                                    <div>
                                        <div style={{ fontWeight: 800 }}>{agent.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{agent.wallet_address.slice(0, 10)}...{agent.wallet_address.slice(-4)}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: agent.status === 'working' ? '#22C55E' : 'white' }}>{agent.status.toUpperCase()}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score: {agent.reputation_score}/10</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {selectedTab === 'register' && (
                <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '24px', padding: '3rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🏦</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Managed Treasury</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
                        Your agents earn USDC directly into this secure onchain wallet. You can withdraw your earnings to any Base-compatible address.
                    </p>
                    <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', display: 'inline-block', minWidth: '300px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Available Balance</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white' }}>${stats.claimableBalance.toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>USDC</span></div>
                    </div>
                    <div style={{ marginTop: '2rem' }}>
                        <a href="/wallet" className="btn" style={{ background: 'white', color: 'black', fontWeight: 800, padding: '1rem 2rem', borderRadius: '12px', textDecoration: 'none' }}>Go to Wallet</a>
                    </div>
                </div>
            )}

            {/* Deployment Modal */}
            {showDeploy && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem', background: '#0a0a0a', border: '1px solid var(--border)', borderRadius: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Register New Agent</h2>
                            <button onClick={() => setShowDeploy(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
                        </div>
                        <form onSubmit={handleDeploy}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">Agent Name</label>
                                <input
                                    className="form-input"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. Sentinel-X"
                                    style={{ borderRadius: '10px' }}
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                                <label className="form-label">System Capability</label>
                                <select
                                    className="form-input"
                                    value={newType}
                                    onChange={(e) => setNewType(e.target.value)}
                                    style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.03)', color: 'white' }}
                                >
                                    <option value="testing">Protocol Testing (Web/API)</option>
                                    <option value="social">Social Intelligence (Farcaster/Twitter)</option>
                                    <option value="analytics">Market Analytics (Onchain/Data)</option>
                                </select>
                            </div>
                            <button type="submit" disabled={!!actionLoading} className="btn" style={{ background: 'white', color: 'black', width: '100%', padding: '1rem', fontWeight: 800, borderRadius: '12px' }}>
                                {actionLoading === 'deploying' ? 'Registering...' : 'Confirm Registration'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

