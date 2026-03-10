'use client';

import { useEffect, useState, useCallback } from 'react';
import TransactionModal from '@/components/TransactionModal';

interface Balances {
    eth: string;
    usdc: string;
    address: string;
}

export default function WalletPage() {
    const [balances, setBalances] = useState<Balances | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [asset, setAsset] = useState<'ETH' | 'USDC'>('USDC');
    const [txHash, setTxHash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedTab, setSelectedTab] = useState<'overview' | 'transactions' | 'withdraw'>('overview');
    const [showHistoryTx, setShowHistoryTx] = useState(false);
    const [selectedHistoryTx, setSelectedHistoryTx] = useState<string | null>(null);

    const [hubData, setHubData] = useState<{ agents: any[], activities: any[], stats: any } | null>(null);
    const [hubLoading, setHubLoading] = useState(false);

    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    const fetchBalances = useCallback(async () => {
        if (!walletAddress) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/wallet?address=${walletAddress}`);
            const data = await res.json();
            if (res.ok) {
                setBalances(data);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Failed to fetch balances');
        }
        setLoading(false);
    }, [walletAddress]);

    const fetchHubData = useCallback(async () => {
        if (!walletAddress) return;
        setHubLoading(true);
        try {
            const res = await fetch(`/api/agent-hub?owner=${walletAddress}`);
            const data = await res.json();
            if (res.ok) {
                setHubData(data);
            }
        } catch (err) {
            console.error('Failed to fetch hub data:', err);
        }
        setHubLoading(false);
    }, [walletAddress]);

    useEffect(() => {
        const storedWallet = localStorage.getItem('agentprobe_wallet_address');
        const storedId = localStorage.getItem('agentprobe_user_id');
        if (storedWallet) setWalletAddress(storedWallet);
        if (storedId) setUserId(storedId);
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && walletAddress) {
            fetchBalances();
            fetchHubData();
        }
    }, [fetchBalances, fetchHubData, mounted, walletAddress]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipient || !amount) return;

        setSending(true);
        setError(null);
        setTxHash(null);

        try {
            const res = await fetch('/api/wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: recipient, amount, asset, userId }),
            });
            const data = await res.json();

            if (res.ok) {
                setTxHash(data.txHash);
                setSelectedHistoryTx(data.txHash);
                setShowHistoryTx(true);
                setAmount('');
                setRecipient('');
                fetchBalances();
                fetchHubData();
                setSelectedTab('overview');
            } else {
                setError(data.error || 'Transfer failed');
            }
        } catch (err) {
            setError('Internal server error');
        }
        setSending(false);
    };

    if (!mounted || !walletAddress) {
        return (
            <div className="page-container" style={{ textAlign: 'center', padding: '10rem 2rem' }}>
                <div className="card glass-card animate-in" style={{ padding: '3.5rem', maxWidth: '450px', margin: '0 auto', border: '1px solid var(--border)', borderRadius: '24px' }}>
                    {!mounted ? (
                        <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                    ) : (
                        <>
                            <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🔐</div>
                            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 800 }}>Wallet Locked</h1>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Sign in to access your managed treasury and view transactions.</p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    const realStats = [
        { label: 'Total Earned', value: `$${hubData?.stats.totalEarnings.toLocaleString() || '0'}`, trend: 'All-time earnings', icon: '$', trendColor: 'white' },
        { label: 'Claimable', value: `$${hubData?.stats.claimableBalance.toLocaleString() || '0'}`, trend: 'Available to withdraw', icon: '↗', trendColor: 'white' },
        { label: 'Active Bots', value: hubData?.stats.workingBots.toString() || '0', trend: `${hubData?.stats.totalBots || 0} bots total`, icon: '🤖', trendColor: 'white' },
        { label: 'Total Tasks', value: hubData?.stats.totalTasks.toString() || '0', trend: 'Submissions made', icon: '✓', trendColor: 'white' }
    ];

    return (
        <div className="page-container animate-in" style={{ paddingBottom: '100px' }}>
            {/* Header */}
            <div style={{ marginBottom: '3rem', marginTop: '2rem' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Wallet</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>Manage your USDC balance and transactions</p>
            </div>

            {/* Main Balance Card */}
            <div className="card" style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)',
                borderRadius: '24px',
                padding: '2.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '2rem',
                marginBottom: '1.5rem'
            }}>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem'
                    }}>
                        💳
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>Managed Wallet Balance</div>
                        <div style={{ fontSize: '3rem', fontWeight: 800 }}>${parseFloat(balances?.usdc || '0').toLocaleString()}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.25rem' }}>USDC on Base</div>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '200px' }}>
                    <button onClick={() => setSelectedTab('withdraw')} className="btn" style={{ background: 'white', color: 'black', fontWeight: 800, padding: '0.8rem', borderRadius: '12px' }}>
                        Withdraw USDC
                    </button>
                    <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'white', fontWeight: 800, padding: '0.8rem', borderRadius: '12px' }}>
                        Deposit USDC
                    </button>
                    <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'white', fontWeight: 800, padding: '0.8rem', borderRadius: '12px' }}>
                        Export History
                    </button>
                </div>
            </div>

            {/* Wallet Address Bar */}
            <div className="card" style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '1rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '3rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>Wallet Address</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '1rem', color: 'white', opacity: 0.9 }}>
                        {balances?.address || walletAddress}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => navigator.clipboard.writeText(balances?.address || walletAddress || '')}
                        style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.125rem' }}
                        title="Copy Address"
                    >
                        📋
                    </button>
                    <a
                        href={`https://basescan.org/address/${balances?.address || walletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.125rem', textDecoration: 'none' }}
                        title="View on Basescan"
                    >
                        🔗
                    </a>
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                {realStats.map((stat, i) => (
                    <div key={i} className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '20px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>{stat.label}</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stat.value}</div>
                            <div style={{ fontSize: '0.75rem', color: stat.trendColor, fontWeight: 700, marginTop: '0.25rem' }}>{stat.trend}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                            {stat.icon}
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '16px', padding: '0.4rem', marginBottom: '3rem' }}>
                {['overview', 'transactions', 'withdraw'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setSelectedTab(tab as any)}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: '12px',
                            background: selectedTab === tab ? 'white' : 'transparent',
                            color: selectedTab === tab ? 'black' : 'white',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            transition: '0.2s',
                            textTransform: 'capitalize'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {(selectedTab === 'overview' || selectedTab === 'transactions') && (
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>
                        {selectedTab === 'overview' ? 'Recent Activity' : 'Transaction History'}
                    </h2>
                    {hubLoading ? (
                        <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4rem', textAlign: 'center' }}>
                            <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                        </div>
                    ) : hubData?.activities.length === 0 ? (
                        <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4rem', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-muted)' }}>No transactions found.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {hubData?.activities.map((tx: any) => (
                                <div key={tx.id}
                                    onClick={() => {
                                        if (tx.payout_tx_hash) {
                                            setSelectedHistoryTx(tx.payout_tx_hash);
                                            setShowHistoryTx(true);
                                        }
                                    }}
                                    className="card"
                                    style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '20px',
                                        padding: '1.25rem 1.5rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: tx.payout_tx_hash ? 'pointer' : 'default',
                                        transition: '0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            background: 'rgba(255,255,255,0.05)',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.25rem',
                                            color: tx.status === 'paid' || tx.status === 'claimed' || tx.status === 'approved' ? 'white' : 'var(--text-muted)'
                                        }}>
                                            {tx.status === 'paid' || tx.status === 'claimed' || tx.status === 'approved' ? '↙' : '↗'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'white' }}>
                                                {tx.status === 'paid' || tx.status === 'claimed' || tx.status === 'approved' ? 'Task reward' : 'Withdrawal'}
                                            </div>
                                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                                {tx.tasks?.title || 'Manual Transfer'} • {new Date(tx.created_at).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.125rem', fontWeight: 800, color: (tx.status === 'paid' || tx.status === 'claimed' || tx.status === 'approved') ? 'white' : 'var(--text-muted)' }}>
                                            {(tx.status === 'paid' || tx.status === 'claimed' || tx.status === 'approved') ? '+' : '-'}${tx.campaigns?.reward_per_task || '0'} USDC
                                        </div>
                                        <div style={{
                                            fontSize: '0.625rem',
                                            fontWeight: 800,
                                            padding: '0.2rem 0.6rem',
                                            background: tx.status === 'paid' || tx.status === 'claimed' ? 'rgba(255, 255, 255, 0.1)' : tx.status === 'approved' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255,255,255,0.05)',
                                            color: tx.status === 'paid' || tx.status === 'claimed' ? 'white' : tx.status === 'approved' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                                            borderRadius: '100px',
                                            display: 'inline-block',
                                            marginTop: '0.5rem',
                                            textTransform: 'uppercase'
                                        }}>
                                            {tx.status}
                                        </div>
                                        {!tx.payout_tx_hash && (tx.status === 'paid' || tx.status === 'approved') && (
                                            <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                                                Receipt pending...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {selectedTab === 'withdraw' && (
                <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '24px', padding: '2.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem' }}>Withdraw Funds</h2>
                    <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
                        <div style={{ textAlign: 'left' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Recipient Address</label>
                            <input
                                className="form-input"
                                placeholder="0x..."
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                                required
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Asset</label>
                                <select
                                    className="form-input"
                                    value={asset}
                                    onChange={(e) => setAsset(e.target.value as any)}
                                    style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                                >
                                    <option value="USDC">USDC</option>
                                    <option value="ETH">ETH</option>
                                </select>
                            </div>
                            <div style={{ flex: 2, textAlign: 'left' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Amount</label>
                                <input
                                    type="number"
                                    step="any"
                                    className="form-input"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                                    required
                                />
                            </div>
                        </div>

                        {error && <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{error}</div>}
                        {txHash && <div style={{ color: 'white', fontSize: '0.875rem' }}>Success! Tx: {txHash}</div>}

                        <button type="submit" disabled={sending} className="btn" style={{ background: 'white', color: 'black', fontWeight: 800, padding: '1rem', borderRadius: '12px', marginTop: '1rem' }}>
                            {sending ? 'Processing...' : `Withdraw ${amount || '0.00'} ${asset}`}
                        </button>
                    </form>
                </div>
            )}
            {showHistoryTx && selectedHistoryTx && (
                <TransactionModal
                    txHash={selectedHistoryTx}
                    onCloseAction={() => setShowHistoryTx(false)}
                    asset="USDC"
                />
            )}
        </div>
    );
}
