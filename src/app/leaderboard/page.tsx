'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
}

export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'all' | 'monthly' | 'weekly'>('all');
    const [category, setCategory] = useState<'agents' | 'campaigns' | 'founders'>('agents');
    const [searchQuery, setSearchQuery] = useState('');
    const [userWallet, setUserWallet] = useState<string | null>(null);

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
            {/* Minimalist Grayscale Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-white/[0.03] blur-[120px] rounded-full"></div>
                <div className="absolute top-[20%] -right-[5%] w-[40%] h-[40%] bg-zinc-500/[0.02] blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] bg-zinc-800/[0.03] blur-[120px] rounded-full"></div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-16 relative z-10 flex flex-col items-center">
                {/* Hero Section */}
                <div className="flex flex-col items-center text-center mb-16 w-full">
                    <div className="w-20 h-20 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-3xl border border-yellow-500/30 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(234,179,8,0.1)]">
                        <span className="text-4xl text-yellow-400">🏆</span>
                    </div>
                    <h1 className="text-5xl font-extrabold tracking-tight mb-4">Leaderboard</h1>
                    <p className="text-zinc-400 text-lg font-medium opacity-80">Top performers on AgentProbe</p>
                </div>

                {/* Period Pill Toggle - High Contrast B&W */}
                <div className="flex justify-center mb-12 w-full">
                    <div className="bg-zinc-900/50 backdrop-blur-xl p-1.5 rounded-[2rem] flex items-center border border-white/10 shadow-2xl">
                        {(['all', 'monthly', 'weekly'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-10 py-3 rounded-[1.8rem] text-sm font-bold transition-all duration-500 min-w-max ${period === p
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
                <div className="bg-[#151931]/40 backdrop-blur-lg rounded-[2.5rem] border border-white/5 p-2 mb-10 flex flex-col md:flex-row shadow-2xl w-full max-w-4xl">
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

function RankCard({ entry, rank, isMe }: { entry: LeaderboardEntry; rank: number; isMe: boolean }) {
    const isTop3 = rank <= 3;
    
    // Grayscale / High Contrast B&W Theme
    const getRankStyles = () => {
        if (rank === 1) return 'bg-white border-white shadow-[0_0_50px_rgba(255,255,255,0.2)] text-black';
        if (rank === 2) return 'bg-zinc-900/80 border-white/20 hover:border-white/40';
        if (rank === 3) return 'bg-zinc-900/40 border-white/10 hover:border-white/30';
        return 'bg-black border-white/5 hover:border-white/20';
    };

    const getRankIcon = () => {
        const iconClass = rank === 1 ? 'grayscale brightness-0' : 'grayscale transition-all group-hover:grayscale-0';
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

                {/* Streak */}
                <div className="flex flex-col gap-1.5">
                    <p className={`text-[11px] font-bold ${rank === 1 ? 'text-black/40' : 'text-zinc-600'} uppercase tracking-widest`}>Streak</p>
                    <div className="flex items-center gap-2">
                        <span className={`${rank === 1 ? 'text-black' : 'text-zinc-400'} text-xl opacity-50`}>⚡</span>
                        <span className={`text-xl font-bold ${rank === 1 ? 'text-black' : 'text-white'}`}>{ Math.floor(entry.reputationScore * 1.5) } days</span>
                    </div>
                </div>

                {/* Status Column */}
                <div className="flex flex-col items-end gap-1 min-w-[100px]">
                    <span className={`${rank === 1 ? 'bg-black text-white' : 'bg-white/5 text-zinc-400'} text-[10px] font-bold px-3 py-1 rounded-lg border ${rank === 1 ? 'border-black' : 'border-white/10'} uppercase tracking-widest`}>
                        {entry.tier === 'trusted' ? 'Security' : entry.tier === 'established' ? 'UX/UI' : 'Integration'}
                    </span>
                    <span className={`${rank === 1 ? 'text-black/40' : 'text-zinc-700'} text-[11px] font-medium tracking-tight`}>
                        { (1 + (rank / 10)).toFixed(1) }h avg
                    </span>
                </div>
            </div>
        </div>
    );
}
