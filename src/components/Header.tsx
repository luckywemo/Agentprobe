'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function Header() {
    const [userId, setUserId] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        const updateAuth = () => {
            setUserId(localStorage.getItem('agentprobe_user_id'));
            setRole(localStorage.getItem('agentprobe_role'));
        };
        updateAuth();
        window.addEventListener('storage', updateAuth);
        return () => window.removeEventListener('storage', updateAuth);
    }, []);

    return (
        <header className="header">
            <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                <Link href="/" className="logo">
                    <span className="logo-icon" style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}>⬢</span>
                    <span className="logo-text">AgentProbe</span>
                </Link>
                <nav className="hidden md:flex gap-2">
                    <Link href="/dashboard" className="nav-link">Dashboard</Link>
                    <Link href="/campaigns" className="nav-link">Campaigns</Link>
                    <Link href="/agent-hub" className="nav-link">Agent Hub</Link>
                    <Link href="/wallet" className="nav-link">Wallet</Link>
                </nav>
                <div className="flex items-center gap-4">
                    {userId ? (
                        <div className="flex items-center gap-3 md:gap-5">
                            <div className="flex flex-col items-end">
                                <div className="text-sm font-bold truncate max-w-[80px] sm:max-w-xs">{userId}</div>
                                {role && (
                                    <div className={`text-[10px] font-extrabold uppercase px-1.5 py-[1px] rounded tracking-wide mt-0.5 ${role === 'founder' ? 'bg-white/10 text-white' : 'bg-white/20 text-white'}`}>
                                        {role === 'bot-hub' ? 'Bot Owner' : 'Founder'}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    localStorage.removeItem('agentprobe_user_id');
                                    localStorage.removeItem('agentprobe_wallet_address');
                                    localStorage.removeItem('agentprobe_role');
                                    window.location.href = '/';
                                }}
                                className="text-xs font-medium text-zinc-500 hover:text-white transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <Link href="/dashboard" className="btn btn-primary text-sm px-4 py-2" style={{ background: 'white', color: 'black' }}>Login</Link>
                    )}
                </div>
            </div>
            {/* Mobile Nav Bar underneath */}
            <div className="md:hidden flex overflow-x-auto gap-2 px-4 py-2 border-t border-zinc-900 bg-black text-sm whitespace-nowrap scrollbar-hide">
                <Link href="/campaigns" className="text-zinc-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-zinc-900 transition-colors">Marketplace</Link>
                <Link href="/dashboard" className="text-zinc-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-zinc-900 transition-colors">Founder</Link>
                <Link href="/agent-hub" className="text-zinc-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-zinc-900 transition-colors">Agent Hub</Link>
                <Link href="/wallet" className="text-zinc-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-zinc-900 transition-colors">Wallet</Link>
            </div>
        </header>
    );
}
