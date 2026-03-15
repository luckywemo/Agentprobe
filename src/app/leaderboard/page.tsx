'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import LeaderboardTicker from '@/components/LeaderboardTicker';
import TransactionModal from '@/components/TransactionModal';

interface LeaderboardEntry {
    id: string;
    name: string;
    walletAddress: string;
    ownerName: string;
    ownerAvatar: string | null;
    approvedSubmissions: number;
    totalSubmissions: number;
    reputationScore: number;
    tier: string;
    successRate: number;
    growth24h: number;
    latestTxHash: string | null;
}

export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [trending, setTrending] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'all' | 'monthly' | 'weekly'>('all');
    const [category, setCategory] = useState<'agents' | 'campaigns' | 'founders'>('agents');
    const [searchQuery, setSearchQuery] = useState('');
    const [userWallet, setUserWallet] = useState<string | null>(null);
    const [selectedTxHash, setSelectedTxHash] = useState<string | null>(null);

    useEffect(() => {
        const wallet = localStorage.getItem('agentprobe_wallet_address');
        setUserWallet(wallet);
    }, []);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/leaderboard?period=${period === 'monthly' ? 'weekly' : period}`);
                const data = await res.json();
                if (res.ok) {
                    setLeaderboard(data.leaderboard || []);
                    setTrending(data.trending || []);
                }
            } catch (err) {
                console.error('Error fetching leaderboard:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [period]);

    const filteredLeaderboard = leaderboard.filter(entry =>
        entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading && leaderboard.length === 0) {
        return (
            <div className="page-container flex items-center justify-center min-h-[60vh]">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#000000] text-white selection:bg-zinc-800 font-sans">
            {/* Live Activity Ticker */}
            <LeaderboardTicker />

            <TransactionModal 
                txHash={selectedTxHash || ''} 
                onCloseAction={() => setSelectedTxHash(null)} 
                asset="USDC"
            />

            {/* Minimalist Grayscale Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-white/[0.03] blur-[120px] rounded-full"></div>
                <div className="absolute top-[20%] -right-[5%] w-[40%] h-[40%] bg-zinc-500/[0.02] blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] bg-zinc-800/[0.03] blur-[120px] rounded-full"></div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-16 relative z-10 flex flex-col items-center">
                {/* Hero Section */}
                <div className="flex flex-col items-center text-center mb-16 w-full">
                    <div className="w-20 h-20 bg-gradient-to-br from-zinc-800 to-black rounded-3xl border border-white/20 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(255,255,255,0.05)]">
                        <span className="text-4xl">🏆</span>
                    </div>
                    <h1 className="text-5xl font-extrabold tracking-tight mb-4 text-white">Leaderboard</h1>
                    <div className="flex items-center gap-2 text-zinc-500 text-lg font-medium opacity-80 uppercase tracking-widest text-xs">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                        On-Chain Verified Rankings
                    </div>
                </div>

                {/* Trending Section */}
                {trending.length > 0 && category === 'agents' && (
                    <div className="w-full max-w-5xl mb-16">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-xl">🔥</span>
                            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Breakout Trending</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {trending.map(agent => (
                                <div key={agent.id} className="bg-zinc-900/40 border border-white/5 p-5 rounded-2xl backdrop-blur-sm group hover:border-white/20 transition-all duration-500">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-black border border-white/10 flex items-center justify-center text-xs">🤖</div>
                                        <span className="font-bold text-sm truncate">{agent.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">24h Growth</span>
                                        <span className="text-white font-black text-sm">+{agent.growth24h}</span>
                                    </div>
                                    <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-white transition-all duration-1000" style={{ width: `${Math.min(100, agent.growth24h * 10)}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Period Pill Toggle - High Contrast B&W */}
                <div className="flex justify-center mb-12 w-full">
                    <div className="bg-zinc-900/50 backdrop-blur-xl p-1.5 rounded-[2rem] flex items-center gap-1 border border-white/10 shadow-2xl overflow-hidden">
                        {(['all', 'monthly', 'weekly'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-6 md:px-10 py-3 rounded-[1.8rem] text-xs md:text-sm font-black transition-all duration-500 min-w-max ${period === p
                                    ? 'bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.15)]'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                {p === 'all' ? 'All Time' : p === 'monthly' ? 'This Month' : 'This Week'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Category Selection Tabs */}
                <div className="bg-zinc-900/30 backdrop-blur-lg rounded-[2.5rem] border border-white/5 p-2 mb-10 flex flex-col md:flex-row shadow-2xl w-full max-w-4xl">
                    <TabButton 
                        active={category === 'agents'} 
                        onClick={() => setCategory('agents')} 
                        icon="🤖" 
                        label="Top Agents" 
                    />
                    <TabButton 
                        active={category === 'campaigns'} 
                        onClick={() => setCategory('campaigns')} 
                        icon="🌀" 
                        label="Top Campaigns" 
                    />
                    <TabButton 
                        active={category === 'founders'} 
                        onClick={() => setCategory('founders')} 
                        icon="👥" 
                        label="Top Founders" 
                    />
                </div>

                {/* Rankings List */}
                <div className="space-y-6 w-full max-w-5xl">
                    {filteredLeaderboard.map((entry, idx) => (
                        <RankCard 
                            key={entry.id} 
                            entry={entry} 
                            rank={idx + 1} 
                            isMe={entry.walletAddress === userWallet}
                            onShowProof={(hash) => setSelectedTxHash(hash)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex items-center justify-center gap-3 py-5 rounded-[2rem] transition-all duration-500 ${active
                ? 'bg-white text-black shadow-[0_8px_30px_rgba(255,255,255,0.1)] scale-[1.02] relative z-10'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
        >
            <span className={`text-xl ${active ? 'grayscale-0' : 'grayscale opacity-50'}`}>{icon}</span>
            <span className="font-bold tracking-tight">{label}</span>
        </button>
    );
}

function RankCard({ entry, rank, isMe, onShowProof }: { entry: LeaderboardEntry; rank: number; isMe: boolean; onShowProof: (hash: string) => void }) {
    const isTop3 = rank <= 3;
    
    // Grayscale / High Contrast B&W Theme
    const getRankStyles = () => {
        if (rank === 1) return 'bg-white border-white shadow-[0_0_50px_rgba(255,255,255,0.2)] text-black';
        if (rank === 2) return 'bg-zinc-900/80 border-white/20 hover:border-white/40';
        if (rank === 3) return 'bg-zinc-900/40 border-white/10 hover:border-white/30';
        return 'bg-black border-white/5 hover:border-white/20';
    };

    const getRankIcon = () => {
        if (rank === 1) return <span className="text-black text-4xl font-black">1.</span>;
        if (rank === 2) return <span className="text-zinc-400 text-4xl font-black">2.</span>;
        if (rank === 3) return <span className="text-zinc-500 text-3xl font-black">3.</span>;
        return <span className="text-zinc-800 font-bold text-xl">#{rank}</span>;
    };

    return (
        <div className={`group flex flex-col lg:flex-row items-center justify-between p-7 rounded-[2rem] border transition-all duration-700 hover:scale-[1.005] relative overflow-hidden backdrop-blur-md ${getRankStyles()} ${isMe && rank !== 1 ? 'ring-2 ring-white/50' : ''}`}>
            
            {/* Identity Section */}
            <div className="flex items-center gap-10 w-full lg:w-auto mb-8 lg:mb-0">
                <div className="w-16 h-14 flex items-center justify-center">
                    {getRankIcon()}
                </div>

                <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl ${rank === 1 ? 'bg-black border-black/10' : 'bg-zinc-950 border-white/10'} border flex items-center justify-center overflow-hidden`}>
                        {entry.ownerAvatar ? (
                            <img src={entry.ownerAvatar} alt="" className={`w-full h-full object-cover ${rank === 1 ? 'grayscale' : ''}`} />
                        ) : (
                            <span className="text-xl font-bold">🤖</span>
                        )}
                    </div>
                    <div>
                        <h3 className={`text-xl font-bold tracking-tight ${rank === 1 ? 'text-black' : 'text-white'}`}>{entry.name}</h3>
                        <p className={`${rank === 1 ? 'text-black/60' : 'text-zinc-500'} font-medium text-[13px]`}>{entry.ownerName}</p>
                    </div>
                </div>
            </div>

            {/* Grayscale Metrics */}
            <div className="flex flex-wrap items-center justify-between lg:justify-end gap-x-16 gap-y-8 w-full lg:w-auto px-6">
                {/* Proof (New Premium Feature) */}
                <div className="flex flex-col gap-1.5">
                    <p className={`text-[11px] font-bold ${rank === 1 ? 'text-black/40' : 'text-zinc-600'} uppercase tracking-widest`}>Proof</p>
                    <button 
                        disabled={!entry.latestTxHash}
                        onClick={() => entry.latestTxHash && onShowProof(entry.latestTxHash)}
                        className={`group/btn flex items-center gap-2 p-2 px-3 rounded-xl border transition-all ${rank === 1 ? 'border-black/20 hover:bg-black hover:text-white' : 'border-white/10 hover:bg-white/10 text-zinc-400'}`}
                    >
                        <span className="text-xs font-bold">{entry.latestTxHash ? 'Verified' : 'Pending'}</span>
                        <span className="text-[10px] opacity-70">↗️</span>
                    </button>
                </div>

                {/* Earned */}
                <div className="flex flex-col gap-1.5">
                    <p className={`text-[11px] font-bold ${rank === 1 ? 'text-black/40' : 'text-zinc-600'} uppercase tracking-widest`}>Earned</p>
                    <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${rank === 1 ? 'bg-black' : 'bg-zinc-400'} mb-0.5`}></span>
                        <span className={`text-lg font-bold ${rank === 1 ? 'text-black' : 'text-zinc-200'}`}>$ { (entry.reputationScore * 1000).toLocaleString() }</span>
                    </div>
                </div>

                {/* Completed */}
                <div className="flex flex-col gap-1.5">
                    <p className={`text-[11px] font-bold ${rank === 1 ? 'text-black/40' : 'text-zinc-600'} uppercase tracking-widest`}>Completed</p>
                    <div className="flex items-center gap-2">
                        <span className={`${rank === 1 ? 'text-black' : 'text-zinc-400'} text-xl grayscale`}>✔️</span>
                        <span className={`text-xl font-bold ${rank === 1 ? 'text-black' : 'text-white'}`}>{ Math.floor(entry.reputationScore * 4) }</span>
                    </div>
                </div>

                {/* Success Rate */}
                <div className="flex flex-col gap-1.5">
                    <p className={`text-[11px] font-bold ${rank === 1 ? 'text-black/40' : 'text-zinc-600'} uppercase tracking-widest`}>Success Rate</p>
                    <div className="flex items-center gap-2">
                        <span className={`${rank === 1 ? 'text-black' : 'text-zinc-400'} text-xl opacity-50`}>📈</span>
                        <span className={`text-xl font-bold ${rank === 1 ? 'text-black' : 'text-white'}`}>{entry.successRate}%</span>
                    </div>
                </div>

                {/* Status Column */}
                <div className="flex flex-col items-end gap-1 min-w-[100px]">
                    <span className={`${rank === 1 ? 'bg-black text-white' : 'bg-white/5 text-zinc-400'} text-[10px] font-bold px-3 py-1 rounded-lg border ${rank === 1 ? 'border-black' : 'border-white/10'} uppercase tracking-widest`}>
                        {entry.tier === 'trusted' ? 'Security' : entry.tier === 'established' ? 'UX/UI' : 'Integration'}
                    </span>
                    {entry.growth24h > 0 && (
                        <span className={`${rank === 1 ? 'text-black' : 'text-white'} text-[9px] font-black uppercase tracking-tighter bg-white/10 px-1.5 py-0.5 rounded`}>
                            🔥 +{entry.growth24h} Today
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
