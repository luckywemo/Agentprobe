'use client';

import { useEffect, useState, useCallback } from 'react';

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

    const walletAddress = typeof window !== 'undefined' ? localStorage.getItem('agentprobe_wallet_address') : null;
    const userId = typeof window !== 'undefined' ? localStorage.getItem('agentprobe_user_id') : null;

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

    useEffect(() => {
        fetchBalances();
    }, [fetchBalances]);

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
                setAmount('');
                setRecipient('');
                fetchBalances();
            } else {
                setError(data.error || 'Transfer failed');
            }
        } catch (err) {
            setError('Internal server error');
        }
        setSending(false);
    };

    if (!walletAddress) {
        return (
            <div className="page-container" style={{ textAlign: 'center', padding: '10rem 2rem' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Wallet Not Found</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Please login to access your managed wallet.</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Wallet</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Manage your managed assets on Base network.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                {/* Balance Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card glass-card" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '5rem', opacity: 0.05 }}>💎</div>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>ETH Balance</h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                            {loading ? '...' : balances?.eth || '0.00'} <span style={{ fontSize: '1rem', fontWeight: 600 }}>ETH</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Base Network Native</div>
                    </div>

                    <div className="card glass-card" style={{ padding: '2rem', border: '1px solid rgba(0, 82, 255, 0.2)', background: 'linear-gradient(135deg, rgba(0, 82, 255, 0.05) 0%, rgba(0, 0, 0, 0) 100%)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '5rem', opacity: 0.05 }}>💵</div>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>USDC Balance</h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '0.25rem' }}>
                            {loading ? '...' : balances?.usdc || '0.00'} <span style={{ fontSize: '1rem', fontWeight: 600 }}>USDC</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Circle Bridged USDC (Base)</div>
                    </div>

                    <div className="card glass-card" style={{ padding: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Your Managed Address</h4>
                        <div style={{ 
                            background: 'rgba(255,255,255,0.03)', 
                            padding: '0.75rem', 
                            borderRadius: '6px', 
                            fontSize: '0.8125rem', 
                            fontFamily: 'monospace',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            wordBreak: 'break-all'
                        }}>
                            {balances?.address || walletAddress}
                            <button 
                                onClick={() => navigator.clipboard.writeText(balances?.address || walletAddress || '')}
                                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginLeft: '0.5rem' }}
                            >
                                📋
                            </button>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', fontStyle: 'italic' }}>
                            Deposit assets here to fund campaigns or pay gas fees.
                        </p>
                    </div>
                </div>

                {/* Transfer Form */}
                <div className="card glass-card" style={{ padding: '2.5rem' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>Send Funds</h3>
                    
                    <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Recipient Address</label>
                            <input 
                                type="text"
                                className="input-field"
                                placeholder="0x..."
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                style={{ width: '100%' }}
                                required
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Asset</label>
                                <select 
                                    className="input-field"
                                    value={asset}
                                    onChange={(e) => setAsset(e.target.value as 'ETH' | 'USDC')}
                                    style={{ width: '100%', appearance: 'none' }}
                                >
                                    <option value="USDC">USDC</option>
                                    <option value="ETH">ETH</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Amount</label>
                                <input 
                                    type="number"
                                    step="any"
                                    className="input-field"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    style={{ width: '100%' }}
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.875rem' }}>
                                Error: {error}
                            </div>
                        )}

                        {txHash && (
                            <div style={{ padding: '1rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', color: 'var(--success)', fontSize: '0.875rem' }}>
                                Success! Transaction sent.
                                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', fontFamily: 'monospace', wordBreak: 'break-all', opacity: 0.8 }}>
                                    Hash: {txHash}
                                </div>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="btn btn-primary" 
                            disabled={sending}
                            style={{ height: '3.5rem', fontSize: '1rem', fontWeight: 700, marginTop: '1rem' }}
                        >
                            {sending ? 'Processing Transaction...' : `Send ${amount || '0.00'} ${asset}`}
                        </button>

                        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Transactions on Base are fast and low-cost. 
                            Ensure you have a small amount of ETH for gas.
                        </div>
                    </form>
                </div>
            </div>

            <style jsx>{`
                .glass-card {
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
