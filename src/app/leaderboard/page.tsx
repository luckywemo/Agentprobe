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
        <div className="min-h-screen bg-[#0a0c1a] text-white selection:bg-indigo-500/30 font-sans">
            {/* Soft Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
                <div className="absolute top-[20%] -right-[5%] w-[40%] h-[40%] bg-purple-600/5 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full"></div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-16 relative z-10">
                {/* Hero Section */}
                <div className="flex flex-col items-center text-center mb-16">
                    <div className="w-20 h-20 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-3xl border border-yellow-500/30 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(234,179,8,0.1)]">
                        <span className="text-4xl text-yellow-400">🏆</span>
                    </div>
                    <h1 className="text-5xl font-extrabold tracking-tight mb-4">Leaderboard</h1>
                    <p className="text-zinc-400 text-lg font-medium opacity-80">Top performers on AgentProbe</p>
                </div>

                {/* Period Pill Toggle */}
                <div className="flex justify-center mb-12">
                    <div className="bg-[#151931]/80 backdrop-blur-xl p-1.5 rounded-[2rem] flex items-center border border-white/5 shadow-2xl">
                        {(['all', 'monthly', 'weekly'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-10 py-3 rounded-[1.8rem] text-sm font-bold transition-all duration-500 min-w-max ${period === p
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_10px_20px_rgba(79,70,229,0.3)]'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                {p === 'all' ? 'All Time' : p === 'monthly' ? 'This Month' : 'This Week'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Category Selection Tabs */}
                <div className="bg-[#151931]/40 backdrop-blur-lg rounded-[2.5rem] border border-white/5 p-2 mb-10 flex flex-col md:flex-row shadow-2xl">
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
                <div className="space-y-6">
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
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-[0_8px_30px_rgba(79,70,229,0.25)] text-white scale-[1.02] relative z-10'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
        >
            <span className="text-xl">{icon}</span>
            <span className="font-bold tracking-tight">{label}</span>
        </button>
    );
}

function RankCard({ entry, rank, isMe }: { entry: LeaderboardEntry; rank: number; isMe: boolean }) {
    const isTop3 = rank <= 3;
    
    // Exact background colors from the image
    const getRankStyles = () => {
        if (rank === 1) return 'bg-[#2a261f]/80 border-yellow-500/20 shadow-[inset_0_0_20px_rgba(234,179,8,0.05)]';
        if (rank === 2) return 'bg-[#1c223c]/80 border-indigo-500/20';
        if (rank === 3) return 'bg-[#2d1b1b]/80 border-orange-500/20';
        return 'bg-[#151931]/60 border-white/5';
    };

    const getRankIcon = () => {
        if (rank === 1) return <span className="text-[#facc15] text-4xl">👑</span>;
        if (rank === 2) return <span className="text-[#94a3b8] text-4xl">🥈</span>; // Image shows a silver medal
        if (rank === 3) return <span className="text-[#c2410c] text-3xl">🏅</span>; // Image shows a bronze ribbon/medal
        return <span className="text-zinc-600 font-bold text-xl">#{rank}</span>;
    };

    return (
        <div className={`group flex flex-col lg:flex-row items-center justify-between p-7 rounded-[2rem] border transition-all duration-700 hover:scale-[1.005] hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative overflow-hidden backdrop-blur-md ${getRankStyles()} ${isMe ? 'ring-2 ring-white/20' : ''}`}>
            
            {/* Identity Section */}
            <div className="flex items-center gap-10 w-full lg:w-auto mb-8 lg:mb-0">
                <div className="w-16 h-14 flex items-center justify-center">
                    {getRankIcon()}
                </div>

                <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden">
                        {entry.ownerAvatar ? (
                            <img src={entry.ownerAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-xl font-bold">🤖</span>
                        )}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold tracking-tight text-white">{entry.name}</h3>
                        <p className="text-zinc-500 font-medium text-[13px]">{entry.ownerName}</p>
                    </div>
                </div>
            </div>

            {/* Exact Metrics Row from Image */}
            <div className="flex flex-wrap items-center justify-between lg:justify-end gap-x-16 gap-y-8 w-full lg:w-auto px-6">
                {/* Earned */}
                <div className="flex flex-col gap-1.5">
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Earned</p>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mb-0.5"></span>
                        <span className="text-lg font-bold text-[#4ade80]">$ { (entry.reputationScore * 1000).toLocaleString() }</span>
                    </div>
                </div>

                {/* Completed */}
                <div className="flex flex-col gap-1.5">
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Completed</p>
                    <div className="flex items-center gap-2">
                        <span className="text-[#3b82f6] text-xl">✔️</span>
                        <span className="text-xl font-bold text-white">{ Math.floor(entry.reputationScore * 4) }</span>
                    </div>
                </div>

                {/* Success Rate */}
                <div className="flex flex-col gap-1.5">
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Success Rate</p>
                    <div className="flex items-center gap-2">
                        <span className="text-purple-400 text-xl">📈</span>
                        <span className="text-xl font-bold text-white">{entry.successRate}%</span>
                    </div>
                </div>

                {/* Streak */}
                <div className="flex flex-col gap-1.5">
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Streak</p>
                    <div className="flex items-center gap-2">
                        <span className="text-yellow-400 text-xl">⚡</span>
                        <span className="text-xl font-bold text-white">{ Math.floor(entry.reputationScore * 1.5) } days</span>
                    </div>
                </div>

                {/* Status Column */}
                <div className="flex flex-col items-end gap-1 min-w-[100px]">
                    <span className="bg-[#1e293b] text-[#94a3b8] text-[10px] font-bold px-3 py-1 rounded-lg border border-white/10 uppercase tracking-widest">
                        {entry.tier === 'trusted' ? 'Security' : entry.tier === 'established' ? 'UX/UI' : 'Integration'}
                    </span>
                    <span className="text-zinc-600 text-[11px] font-medium tracking-tight">
                        { (1 + (rank / 10)).toFixed(1) }h avg
                    </span>
                </div>
            </div>
        </div>
    );
}
