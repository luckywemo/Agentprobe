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

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Balance Cards */}
                <div className="flex flex-col gap-6 lg:w-2/5">
                    <div className="card glass-card relative overflow-hidden p-8">
                        <div className="absolute -top-2 -right-2 text-7xl opacity-5">💎</div>
                        <h3 className="text-sm font-bold text-zinc-500 uppercase mb-4 tracking-wider">ETH Balance</h3>
                        <div className="text-4xl font-extrabold mb-1">
                            {loading ? '...' : balances?.eth || '0.00'} <span className="text-lg font-semibold">ETH</span>
                        </div>
                        <div className="text-xs text-zinc-500">Base Network Native</div>
                    </div>

                    <div className="card glass-card relative overflow-hidden p-8 border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
                        <div className="absolute -top-2 -right-2 text-7xl opacity-5">💵</div>
                        <h3 className="text-sm font-bold text-zinc-500 uppercase mb-4 tracking-wider">USDC Balance</h3>
                        <div className="text-4xl font-extrabold text-blue-500 mb-1">
                            {loading ? '...' : balances?.usdc || '0.00'} <span className="text-lg font-semibold text-white">USDC</span>
                        </div>
                        <div className="text-xs text-zinc-500">Circle Bridged USDC (Base)</div>
                    </div>

                    <div className="card glass-card p-6">
                        <h4 className="text-xs font-bold uppercase text-zinc-500 mb-3 tracking-wider">Your Managed Address</h4>
                        <div className="bg-white/5 p-3 rounded-md text-xs sm:text-sm font-mono flex justify-between items-center break-all">
                            <span className="truncate mr-2">{balances?.address || walletAddress}</span>
                            <button 
                                onClick={() => navigator.clipboard.writeText(balances?.address || walletAddress || '')}
                                className="bg-transparent border-none text-blue-500 cursor-pointer hover:text-white transition-colors"
                            >
                                📋
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500 mt-3 italic">
                            Deposit assets here to fund campaigns or pay gas fees.
                        </p>
                    </div>
                </div>

                {/* Transfer Form */}
                <div className="card glass-card p-8 lg:w-3/5">
                    <h3 className="text-2xl font-bold mb-8">Send Funds</h3>
                    
                    <form onSubmit={handleSend} className="flex flex-col gap-6">
                        <div className="form-group">
                            <label className="block text-sm font-bold mb-2">Recipient Address</label>
                            <input 
                                type="text"
                                className="input-field w-full"
                                placeholder="0x..."
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                required
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="form-group sm:w-1/3">
                                <label className="block text-sm font-bold mb-2">Asset</label>
                                <select 
                                    className="input-field w-full appearance-none"
                                    value={asset}
                                    onChange={(e) => setAsset(e.target.value as 'ETH' | 'USDC')}
                                >
                                    <option value="USDC">USDC</option>
                                    <option value="ETH">ETH</option>
                                </select>
                            </div>
                            <div className="form-group sm:w-2/3">
                                <label className="block text-sm font-bold mb-2">Amount</label>
                                <input 
                                    type="number"
                                    step="any"
                                    className="input-field w-full"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
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
