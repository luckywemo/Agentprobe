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
            <div className="page-header flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-12">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Bot Hub</h1>
                    <p className="text-zinc-400 mt-1">Command center for your autonomous agent fleet.</p>
                </div>
                <button
                    className="btn btn-primary w-full md:w-auto text-center"
                    onClick={() => setShowDeploy(true)}
                >
                    + Deploy New Agent
                </button>
            </div>

            {/* Earnings & Claim Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {/* Claimable Earnings Card */}
                <div className="card glass-card p-8 lg:col-span-1" style={{ border: '1px solid #00d4ff', background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.05), rgba(0, 82, 255, 0.05))' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>💰</span>
                        <h3 className="text-base font-extrabold">Claimable Earnings</h3>
                    </div>

                    <div className="text-center py-6 mb-4">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Ready to Claim</div>
                        <div className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                            ${stats.claimableBalance.toFixed(2)}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">USDC</div>
                    </div>

                    <button
                        className="btn btn-primary w-full p-3 text-sm font-bold"
                        disabled={stats.claimableBalance <= 0 || !!actionLoading}
                        onClick={handleClaim}
                    >
                        {actionLoading === 'claiming' ? 'Claiming...' : `Claim $${stats.claimableBalance.toFixed(2)} to Wallet`}
                    </button>

                    {claimSuccess && (
                        <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                            <div className="text-xs font-bold text-green-500 mb-1">✅ Claimed ${claimSuccess.amount.toFixed(4)} USDC</div>
                            <div className="text-[10px] text-zinc-500 font-mono break-all">Tx: {claimSuccess.txHash}</div>
                        </div>
                    )}

                    <div className="mt-5 bg-black/20 p-3 rounded-md text-xs font-mono text-cyan-400 flex justify-between items-center">
                        <span className="truncate mr-2">{walletAddress}</span>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(walletAddress!);
                            }}
                            className="bg-transparent border-none text-zinc-500 hover:text-white cursor-pointer text-sm"
                        >
                            📋
                        </button>
                    </div>
                </div>

                {/* Fleet Overview Metrics */}
                <div className="card glass-card grid grid-cols-2 md:grid-cols-4 gap-4 p-6 lg:col-span-2 content-center h-full">
                    <div className="text-center border-b md:border-b-0 border-r-0 md:border-r border-zinc-800 p-2 pb-4 md:pb-2">
                        <div className="text-3xl font-black">{stats.totalBots}</div>
                        <div className="text-[10px] text-zinc-400 font-bold uppercase mt-1">Total Agents</div>
                    </div>
                    <div className="text-center border-b md:border-b-0 md:border-r border-zinc-800 p-2 pb-4 md:pb-2">
                        <div className={`text-3xl font-black ${stats.workingBots > 0 ? 'text-blue-500 pulse-text' : ''}`}>
                            {stats.workingBots}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-bold uppercase mt-1">Active / Working</div>
                    </div>
                    <div className="text-center border-r-0 md:border-r border-zinc-800 p-2 pt-4 md:pt-2">
                        <div className="text-3xl font-black">{stats.idleBots}</div>
                        <div className="text-[10px] text-zinc-400 font-bold uppercase mt-1">Idle / Ready</div>
                    </div>
                    <div className="text-center p-2 pt-4 md:pt-2">
                        <div className="text-3xl font-black">{stats.totalTasks}</div>
                        <div className="text-[10px] text-zinc-400 font-bold uppercase mt-1">Tasks Completed</div>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Agent Fleet List */}
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-bold mb-6">Your Agent Fleet</h2>
                    {loading ? (
                        <div className="card glass-card text-center p-16">
                            <div className="loading-spinner mx-auto" />
                        </div>
                    ) : agents.length === 0 ? (
                        <div className="card glass-card text-center p-16">
                            <p className="text-zinc-400 mb-6">No managed agents found under your account.</p>
                            <button className="btn btn-secondary" onClick={() => setShowDeploy(true)}>Deploy First Agent</button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {agents.map(agent => (
                                <div key={agent.id} className="card glass-card animate-in flex flex-col md:flex-row justify-between items-start md:items-center p-6 gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl border relative shrink-0
                                            ${agent.status === 'working' ? 'bg-blue-500/10 border-blue-500' : 'bg-zinc-900 border-zinc-800'}`}>
                                            {agent.type === 'testing' ? '🧪' : agent.type === 'social' ? '💬' : '🤖'}
                                            {agent.status === 'working' && (
                                                <div className="pulse-circle absolute -top-1 -right-1" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">{agent.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs text-zinc-500 font-mono">
                                                    {agent.wallet_address.slice(0, 6)}...{agent.wallet_address.slice(-4)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex w-full md:w-auto justify-between md:justify-end gap-6 items-center border-t md:border-t-0 border-zinc-800 pt-4 md:pt-0">
                                        <div className="text-center md:text-right">
                                            <div className={`font-extrabold text-xs flex items-center gap-2 ${agent.status === 'idle' ? 'text-zinc-500' : 'text-blue-500'}`}>
                                                {agent.status === 'working' && <span className="pulse-inner-dot" />}
                                                {agent.status.toUpperCase()}
                                            </div>
                                            <div className="text-[10px] text-zinc-500 mt-1">STATUS</div>
                                        </div>
                                        <button
                                            className="btn btn-secondary text-xs px-4 py-2"
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
                            ))}
                        </div>
                    )}

                    {/* Recent Activities Feed */}
                    <div className="mt-12">
                        <h2 className="text-2xl font-bold mb-6">Recent Activities</h2>
                        {activities.length === 0 ? (
                            <div className="card glass-card text-center p-12 text-zinc-500">
                                <p>No recent activity detected for your fleet.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {activities.map((activity) => (
                                    <div key={activity.id} className={`card glass-card p-5 flex justify-between items-center border-l-4 ${activity.status === 'paid' ? 'border-l-green-500' : activity.status === 'rejected' ? 'border-l-red-500' : 'border-l-blue-500'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="text-xl shrink-0">
                                                {activity.status === 'paid' ? '💰' : activity.status === 'rejected' ? '❌' : '⏳'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm md:text-base truncate max-w-[150px] sm:max-w-xs">{activity.tasks?.title || 'Unknown Task'}</div>
                                                <div className="text-xs text-zinc-500 mt-1">
                                                    {new Date(activity.created_at).toLocaleDateString()} • {agents.find(a => a.id === activity.agent_id)?.name || 'Managed Agent'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className={`text-[10px] md:text-xs font-extrabold uppercase ${activity.status === 'paid' ? 'text-green-500' : 'text-zinc-500'}`}>
                                                {activity.status}
                                            </div>
                                            {activity.tasks?.reward_per_task && (
                                                <div className="text-xs md:text-sm font-semibold mt-1">
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
                <div className="lg:col-span-1">
                    <h2 className="text-2xl font-bold mb-6">Earnings Summary</h2>
                    <div className="card glass-card p-6">
                        <div className="flex flex-col gap-5">
                            {/* Today */}
                            <div className="p-4 bg-cyan-500/5 rounded-xl border border-cyan-500/10">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest">Today</span>
                                    <span className="text-[10px] text-zinc-500">Last 24h</span>
                                </div>
                                <div className="text-2xl font-black">${stats.dailyEarnings.toFixed(4)}</div>
                                <div className="text-[10px] text-zinc-500 mt-1">USDC earned</div>
                            </div>

                            {/* This Month */}
                            <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest">This Month</span>
                                    <span className="text-[10px] text-zinc-500">Last 30d</span>
                                </div>
                                <div className="text-2xl font-black">${stats.monthlyEarnings.toFixed(4)}</div>
                                <div className="text-[10px] text-zinc-500 mt-1">USDC earned</div>
                            </div>

                            {/* All-Time */}
                            <div className="p-4 bg-white/5 rounded-xl border border-zinc-800">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest">All-Time</span>
                                    <span className="text-[10px] text-zinc-500">Lifetime</span>
                                </div>
                                <div className="text-2xl font-black">${stats.totalEarnings.toFixed(4)}</div>
                                <div className="text-[10px] text-zinc-500 mt-1">USDC earned</div>
                            </div>
                        </div>
                    </div>

                    <div className="card glass-card mt-6 p-6 bg-black/10">
                        <h4 className="text-sm font-bold mb-2">Auto-Matching</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">
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

