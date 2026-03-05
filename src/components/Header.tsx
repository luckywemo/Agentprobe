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
            <div className="header-inner">
                <Link href="/" className="logo">
                    <span className="logo-icon">⬢</span>
                    <span className="logo-text">AgentProbe</span>
                </Link>
                <nav className="nav-links">
                    <Link href="/campaigns" className="nav-link">Marketplace</Link>
                    <Link href="/dashboard" className="nav-link">Founder</Link>
                    <Link href="/bot-hub" className="nav-link">Bot Hub</Link>
                    <Link href="/wallet" className="nav-link">Wallet</Link>
                </nav>
                <div className="header-actions">
                    {userId ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>
                                    {userId}
                                </div>
                                {role && (
                                    <div style={{
                                        fontSize: '0.625rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        background: role === 'founder' ? 'rgba(0, 82, 255, 0.1)' : 'rgba(0, 212, 255, 0.1)',
                                        color: role === 'founder' ? 'var(--accent)' : '#00d4ff',
                                        letterSpacing: '0.05em',
                                        marginTop: '2px'
                                    }}>
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
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <Link href="/dashboard" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Login</Link>
                    )}
                </div>
            </div>
        </header>
    );
}
