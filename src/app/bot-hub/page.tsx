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
            // 1. Fetch Hub Stats & Agents
            const hubRes = await fetch(`/api/bot-hub?owner=${walletAddress}`);
            const hubData = await hubRes.json();
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

            // 2. Fetch Real-time Wallet Balance
            const balRes = await fetch(`/api/wallet/balance?address=${walletAddress}`);
            const balData = await balRes.json();
            if (balRes.ok) {
                // We keep the balance variable if it's used elsewhere, but let's check.
                // It was defined but lint said unused. Setting it here anyway.
                // setBalance(balData.balance);
            }
        } catch (error) {
            console.error('Error fetching hub data:', error);
        }
        if (!silent) setLoading(false);
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
            fetchHubData();
        }
    }, [walletAddress, fetchHubData]);

    // Set new bot name when wallet/user changes
    useEffect(() => {
        if (walletAddress && userId) {
            setNewName(`Bot-${userId}-${Math.floor(Math.random() * 1000)}`);
        }
    }, [walletAddress, userId]);

    // Auto-polling when bots are working
    useEffect(() => {
        let interval: NodeJS.Timeout;
        const hasWorkingBots = agents.some(a => a.status === 'working');

        if (hasWorkingBots && userId) {
            interval = setInterval(() => {
                fetchHubData(true);
            }, 3000); // Poll every 3 seconds while bots are busy
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

    async function handleClaim() {
        if (stats.claimableBalance <= 0 || !walletAddress) return;
        setActionLoading('claiming');
        setClaimSuccess(null);
        try {
            const res = await fetch('/api/bot-hub/withdraw', {
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
            alert('An unexpected error occurred while claiming.');
        }
        setActionLoading(false);
    }

    if (!userId) {
        return (
            <div className="page-container" style={{ textAlign: 'center', padding: '6rem 2rem' }}>
                <div className="card glass-card animate-in" style={{ padding: '3.5rem', maxWidth: '450px', margin: '0 auto' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🤖</div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 800 }}>Bot Hub Access</h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                        Sign in or create your account. Your bots earn USDC directly into your managed treasury.
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
                                onChange={(e) => setRoleInput(e.target.value as 'bot-hub' | 'founder')}
                                style={{ appearance: 'none' }}
                            >
                                <option value="bot-hub">Bot Owner (Executing tasks)</option>
                                <option value="founder">Founder (Testing products)</option>
                            </select>
                        </div>
                        <button type="submit" disabled={authLoading} className="btn btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}>
                            {authLoading ? 'Connecting to Fleet...' : 'Enter Bot Hub'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header" style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.04em' }}>Bot Hub</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Command center for your autonomous agent fleet.</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowDeploy(true)}
                >
                    + Deploy New Agent
                </button>
            </div>

            {/* Earnings & Claim Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 2fr', gap: '2rem', marginBottom: '3rem' }}>
                {/* Claimable Earnings Card */}
                <div className="card glass-card" style={{ padding: '2rem', border: '1px solid #00d4ff', background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.05), rgba(0, 82, 255, 0.05))' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>💰</span>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Claimable Earnings</h3>
                    </div>

                    <div style={{ textAlign: 'center', padding: '1.5rem 0', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Ready to Claim</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 900, background: 'linear-gradient(90deg, #00d4ff, #0052ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            ${stats.claimableBalance.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>USDC</div>
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.875rem', fontSize: '0.875rem', fontWeight: 700 }}
                        disabled={stats.claimableBalance <= 0 || !!actionLoading}
                        onClick={handleClaim}
                    >
                        {actionLoading === 'claiming' ? 'Claiming...' : `Claim $${stats.claimableBalance.toFixed(2)} to Wallet`}
                    </button>

                    {claimSuccess && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.25rem' }}>✅ Claimed ${claimSuccess.amount.toFixed(4)} USDC</div>
                            <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>Tx: {claimSuccess.txHash}</div>
                        </div>
                    )}

                    <div style={{ marginTop: '1.25rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', color: '#00d4ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{walletAddress}</span>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(walletAddress!);
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}
                        >
                            📋
                        </button>
                    </div>
                </div>

                {/* Fleet Overview Metrics */}
                <div className="card glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', padding: '1.5rem' }}>
                    <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)', padding: '0.5rem' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 900 }}>{stats.totalBots}</div>
                        <div style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Total Agents</div>
                    </div>
                    <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)', padding: '0.5rem' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: stats.workingBots > 0 ? 'var(--accent)' : 'inherit' }} className={stats.workingBots > 0 ? 'pulse-text' : ''}>
                            {stats.workingBots}
                        </div>
                        <div style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Active / Working</div>
                    </div>
                    <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)', padding: '0.5rem' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 900 }}>{stats.idleBots}</div>
                        <div style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Idle / Ready</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 900 }}>{stats.totalTasks}</div>
                        <div style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Tasks Completed</div>
                    </div>
                </div>
            </div>

            {/* Deployment Modal (Unchanged logic, just keeping structure) */}
            {showDeploy && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="card glass-card animate-in" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Deploy New Agent</h2>
                            <button onClick={() => setShowDeploy(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
                        </div>
                        <form onSubmit={handleDeploy}>
                            <div className="form-group">
                                <label className="form-label">Agent Name / User ID</label>
                                <input
                                    className="form-input"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. Bot-4421"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Agent Type</label>
                                <select
                                    className="form-input"
                                    value={newType}
                                    onChange={(e) => setNewType(e.target.value)}
                                    style={{ appearance: 'none' }}
                                >
                                    <option value="testing">Testing Bot (Web/API)</option>
                                    <option value="social">Social Bot (Farcaster/Twitter)</option>
                                    <option value="analytics">Analytics Bot (Onchain/Data)</option>
                                </select>
                            </div>
                            <button type="submit" disabled={!!actionLoading} className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>
                                {actionLoading ? 'Initializing...' : 'Confirm Deployment'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                {/* Agent Fleet List */}
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Your Agent Fleet</h2>
                    {loading ? (
                        <div className="card glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                            <div className="loading-spinner" />
                        </div>
                    ) : agents.length === 0 ? (
                        <div className="card glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>No managed agents found under your account.</p>
                            <button className="btn btn-secondary" onClick={() => setShowDeploy(true)}>Deploy First Agent</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {agents.map(agent => (
                                <div key={agent.id} className="card glass-card animate-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            background: agent.status === 'working' ? 'rgba(0, 82, 255, 0.1)' : 'var(--bg-secondary)',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.5rem',
                                            border: agent.status === 'working' ? '1px solid var(--accent)' : '1px solid var(--border)',
                                            position: 'relative'
                                        }}>
                                            {agent.type === 'testing' ? '🧪' : agent.type === 'social' ? '💬' : '🤖'}
                                            {agent.status === 'working' && (
                                                <div className="pulse-circle" style={{ position: 'absolute', top: -4, right: -4 }} />
                                            )}
                                        </div>
                                        <div>
                                            <h3 style={{ fontWeight: 700, fontSize: '1.125rem' }}>{agent.name}</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                                    {agent.wallet_address.slice(0, 6)}...{agent.wallet_address.slice(-4)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{
                                                fontWeight: 800,
                                                fontSize: '0.75rem',
                                                color: agent.status === 'idle' ? 'var(--text-secondary)' : 'var(--accent)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                {agent.status === 'working' && <span className="pulse-inner-dot" />}
                                                {agent.status.toUpperCase()}
                                            </div>
                                            <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>STATUS</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                className="btn btn-secondary"
                                                style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                                                disabled={agent.status !== 'idle' || !!actionLoading}
                                                onClick={async () => {
                                                    setActionLoading(agent.id);
                                                    await fetch(`/api/bot-hub/execute?agentId=${agent.id}`);
                                                    await fetchHubData(true);
                                                    setActionLoading(false);
                                                }}
                                            >
                                                {actionLoading === agent.id ? 'Syncing...' : 'Sync & Work'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Recent Activities Feed */}
                    <div style={{ marginTop: '3rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Recent Activities</h2>
                        {activities.length === 0 ? (
                            <div className="card glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                <p>No recent activity detected for your fleet.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {activities.map((activity) => (
                                    <div key={activity.id} className="card glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${activity.status === 'paid' ? 'var(--success)' : activity.status === 'rejected' ? 'var(--error)' : 'var(--accent)'}` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ fontSize: '1.25rem' }}>
                                                {activity.status === 'paid' ? '💰' : activity.status === 'rejected' ? '❌' : '⏳'}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{activity.tasks?.title || 'Unknown Task'}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {new Date(activity.created_at).toLocaleString()} • {agents.find(a => a.id === activity.agent_id)?.name || 'Managed Agent'}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 800,
                                                color: activity.status === 'paid' ? 'var(--success)' : 'var(--text-muted)',
                                                textTransform: 'uppercase'
                                            }}>
                                                {activity.status}
                                            </div>
                                            {activity.tasks?.reward_per_task && (
                                                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                                    {activity.status === 'paid' ? '+' : ''}{activity.tasks.reward_per_task} USDC
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Earnings Summary Sidebar */}
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Earnings Summary</h2>
                    <div className="card glass-card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* Today */}
                            <div style={{ padding: '1rem', background: 'rgba(0, 212, 255, 0.05)', borderRadius: '10px', border: '1px solid rgba(0, 212, 255, 0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today</span>
                                    <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Last 24h</span>
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>${stats.dailyEarnings.toFixed(4)}</div>
                                <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>USDC earned</div>
                            </div>

                            {/* This Month */}
                            <div style={{ padding: '1rem', background: 'rgba(0, 82, 255, 0.05)', borderRadius: '10px', border: '1px solid rgba(0, 82, 255, 0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>This Month</span>
                                    <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Last 30d</span>
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>${stats.monthlyEarnings.toFixed(4)}</div>
                                <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>USDC earned</div>
                            </div>

                            {/* All-Time */}
                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>All-Time</span>
                                    <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Lifetime</span>
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>${stats.totalEarnings.toFixed(4)}</div>
                                <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>USDC earned</div>
                            </div>
                        </div>
                    </div>

                    <div className="card glass-card" style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(0,0,0,0.1)' }}>
                        <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.5rem' }}>Auto-Matching</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            Managed bots automatically scan for compatible tasks every 5 minutes if they remain idle.
                        </p>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .pulse-text {
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.6; }
                    100% { opacity: 1; }
                }
                .pulse-circle {
                    width: 10px;
                    height: 10px;
                    background: var(--accent);
                    border-radius: 50%;
                    box-shadow: 0 0 0 rgba(0, 82, 255, 0.4);
                    animation: pulse-circle 2s infinite;
                }
                @keyframes pulse-circle {
                    0% { box-shadow: 0 0 0 0 rgba(0, 82, 255, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(0, 82, 255, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(0, 82, 255, 0); }
                }
                .pulse-inner-dot {
                    width: 6px;
                    height: 6px;
                    background: var(--accent);
                    border-radius: 50%;
                    display: inline-block;
                    animation: fade 1s infinite alternate;
                }
                @keyframes fade {
                    from { opacity: 0.3; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
}

