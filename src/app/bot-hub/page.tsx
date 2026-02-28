'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Agent {
    id: string;
    name: string;
    wallet_address: string;
    status: string;
    type: string;
    reputation_score: number;
    approved_submissions: number;
}

interface HubStats {
    totalEarnings: number;
    activeBots: number;
    totalTasks: number;
}

export default function BotHubPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [stats, setStats] = useState<HubStats>({ totalEarnings: 0, activeBots: 0, totalTasks: 0 });
    const [balance, setBalance] = useState<string>('0.00');
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

    async function fetchHubData() {
        if (!walletAddress) return;
        setLoading(true);
        try {
            // 1. Fetch Hub Stats & Agents
            const hubRes = await fetch(`/api/bot-hub?owner=${walletAddress}`);
            const hubData = await hubRes.json();
            setAgents(hubData.agents || []);
            setActivities(hubData.activities || []);
            setStats(hubData.stats || { totalEarnings: 0, activeBots: 0, totalTasks: 0 });

            // 2. Fetch Real-time Wallet Balance
            const balRes = await fetch(`/api/wallet/balance?address=${walletAddress}`);
            const balData = await balRes.json();
            if (balRes.ok) {
                setBalance(balData.balance);
            }
        } catch (error) {
            console.error('Error fetching hub data:', error);
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
            setNewName(`Bot-${userId}-${Math.floor(Math.random() * 1000)}`);
            fetchHubData();
        }
    }, [walletAddress, userId]);

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

    async function handleWithdraw() {
        if (stats.totalEarnings <= 0 || !walletAddress) return;
        setActionLoading('withdrawing');
        try {
            const res = await fetch('/api/bot-hub/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner: walletAddress }),
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Successfully withdrew $${data.amount} USDC! Tx: ${data.txHash}`);
                await fetchHubData();
            } else {
                alert(`Withdrawal failed: ${data.error}`);
            }
        } catch (err) {
            console.error('Withdrawal error:', err);
            alert('An unexpected error occurred during withdrawal.');
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
                                onChange={(e) => setRoleInput(e.target.value as any)}
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

            {/* Wallet & Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginBottom: '3rem' }}>
                {/* Managed Wallet Card for Bot Hub */}
                <div className="card glass-card" style={{ padding: '2rem', border: '1px solid #00d4ff', background: 'rgba(0, 212, 255, 0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>🤖</span>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Managed Platform Wallet</h3>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                        Your inbuilt wallet. You may need a small amount of **USDC on Base** to register certain highly-capable bots.
                    </p>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', color: '#00d4ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{walletAddress}</span>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(walletAddress!);
                                alert('Wallet address copied!');
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '0.5rem' }}
                        >
                            📋
                        </button>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <strong>Network:</strong> Base Mainnet
                    </div>
                </div>

                <div className="stats-row" style={{ height: '100%' }}>
                    <div className="card glass-card">
                        <div className="stat-value">{stats.activeBots}</div>
                        <div className="stat-label">Active Agents</div>
                    </div>
                    <div className="card glass-card">
                        <div className="stat-value">{stats.totalTasks}</div>
                        <div className="stat-label">Jobs Completed</div>
                    </div>
                    <div className="card glass-card">
                        <div className="stat-value">${stats.totalEarnings.toFixed(2)}</div>
                        <div className="stat-label">Total Earnings (USDC)</div>
                    </div>
                </div>
            </div>

            {/* Deployment Modal */}
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
                            <div style={{ padding: '1.5rem', background: 'rgba(0,82,255,0.05)', borderRadius: '8px', border: '1px solid var(--border-accent)', marginBottom: '2rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.5rem' }}>INBUILT WALLET</div>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                    The system will generate a secure, private wallet for this bot. You can fund it with gas (ETH) and USDC directly from this hub after deployment.
                                </p>
                            </div>
                            <button type="submit" disabled={!!actionLoading} className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>
                                {actionLoading ? 'Initializing...' : 'Confirm Deployment'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Stats Row */}
            <div className="stats-row" style={{ marginBottom: '3rem' }}>
                <div className="card glass-card">
                    <div className="stat-value">${stats.totalEarnings.toFixed(2)}</div>
                    <div className="stat-label">Total Earnings (USDC)</div>
                </div>
                <div className="card glass-card">
                    <div className="stat-value">{stats.activeBots}</div>
                    <div className="stat-label">Active Agents</div>
                </div>
                <div className="card glass-card">
                    <div className="stat-value">{stats.totalTasks}</div>
                    <div className="stat-label">Jobs Completed</div>
                </div>
                <div className="card glass-card">
                    <div className="stat-value">84%</div>
                    <div className="stat-label">Avg. Reputation</div>
                </div>
            </div>

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
                            <button className="btn btn-secondary" onClick={() => alert('Agent deployment form coming soon!')}>Deploy First Agent</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {agents.map(agent => (
                                <div key={agent.id} className="card glass-card animate-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            background: 'var(--bg-secondary)',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.5rem',
                                            border: '1px solid var(--border)'
                                        }}>
                                            {agent.type === 'testing' ? '🧪' : agent.type === 'social' ? '💬' : '🤖'}
                                        </div>
                                        <div>
                                            <h3 style={{ fontWeight: 700, fontSize: '1.125rem' }}>{agent.name}</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                                    {agent.wallet_address.slice(0, 6)}...{agent.wallet_address.slice(-4)}
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(agent.wallet_address);
                                                        alert('Address copied to clipboard!');
                                                    }}
                                                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.7rem', padding: '0 4px' }}
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: agent.status === 'idle' ? 'var(--text-secondary)' : 'var(--accent)' }}>
                                                {agent.status.toUpperCase()}
                                            </div>
                                            <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>STATUS</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{agent.reputation_score}%</div>
                                            <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>REPUTATION</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                className="btn btn-secondary"
                                                style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                                                onClick={async () => {
                                                    setActionLoading(true);
                                                    await fetch(`/api/bot-hub/execute?agentId=${agent.id}`);
                                                    await fetchHubData();
                                                    setActionLoading(false);
                                                }}
                                            >
                                                Sync & Work
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

                {/* Treasury Sidebar */}
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Treasury</h2>
                    <div className="card glass-card" style={{ padding: '2rem' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>PERSONAL BALANCE</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{parseFloat(balance).toFixed(2)} USDC</div>
                        </div>
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--accent)', marginBottom: '0.25rem', fontWeight: 700 }}>AVAILABLE TO WITHDRAW</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
                                ${stats.totalEarnings.toFixed(2)}
                            </div>
                        </div>
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '1rem' }}
                            disabled={stats.totalEarnings <= 0 || !!actionLoading}
                            onClick={handleWithdraw}
                        >
                            {actionLoading ? 'Processing...' : 'Withdraw to Wallet'}
                        </button>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>
                            Transfers are settled on Base Mainnet.
                        </p>
                    </div>

                    <div className="card glass-card" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem' }}>Resource Health</h4>
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                <span>Gas (ETH)</span>
                                <span style={{ color: 'var(--success)' }}>Optimal</span>
                            </div>
                            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                                <div style={{ height: '100%', width: '92%', background: 'var(--success)', borderRadius: '2px' }} />
                            </div>
                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                <span>Memory Status</span>
                                <span style={{ color: 'var(--success)' }}>Healthy</span>
                            </div>
                            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                                <div style={{ height: '100%', width: '78%', background: 'var(--accent)', borderRadius: '2px' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
