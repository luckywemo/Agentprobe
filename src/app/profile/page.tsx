'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ProfilePage() {
    const [id, setId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [role, setRole] = useState('');
    const [walletAddress, setWalletAddress] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const storedId = localStorage.getItem('agentprobe_id'); // We might need to store the internal UUID too
        const storedUserId = localStorage.getItem('agentprobe_user_id');

        if (storedUserId) {
            setUserId(storedUserId);
            fetchProfile(storedUserId);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchProfile = async (uId: string) => {
        try {
            // First we need the internal UUID. The login returns 'id' which is the UUID.
            // Let's assume the dashboard stores 'agentprobe_id' as the UUID.
            // If not, we might need to lookup by user_id string.
            // I'll update the login logic in the header/dashboard to store the UUID.

            const res = await fetch(`/api/profile?id=${localStorage.getItem('agentprobe_id')}`);
            if (res.ok) {
                const data = await res.json();
                setId(data.id);
                setDisplayName(data.display_name || '');
                setAvatarUrl(data.avatar_url || '');
                setRole(data.role);
                setWalletAddress(data.wallet_address);
            }
        } catch (err) {
            console.error('Fetch profile error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: localStorage.getItem('agentprobe_id'),
                    display_name: displayName,
                    avatar_url: avatarUrl
                }),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'A network error occurred' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="page-container flex items-center justify-center min-h-[60vh]">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    if (!userId) {
        return (
            <div className="page-container py-20 text-center">
                <h1 className="text-2xl font-bold mb-4">Please login to view your profile</h1>
                <Link href="/dashboard" className="btn btn-primary">Login</Link>
            </div>
        );
    }

    return (
        <div className="page-container animate-in py-10 max-w-2xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2">Profile Settings</h1>
                    <p className="text-zinc-400">Manage your identity on AgentProbe</p>
                </div>
                <Link href="/dashboard" className="text-sm font-bold text-zinc-500 hover:text-white transition-colors">
                    ← Back to Dashboard
                </Link>
            </div>

            <div className="card bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 backdrop-blur-xl">
                <form onSubmit={handleSave} className="space-y-8">
                    {/* Avatar Preview */}
                    <div className="flex flex-col items-center gap-4 py-4">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full border-2 border-white/10 overflow-hidden bg-zinc-800 flex items-center justify-center text-4xl shadow-2xl transition-transform group-hover:scale-105">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{displayName?.[0]?.toUpperCase() || userId[0].toUpperCase()}</span>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-zinc-500 font-medium">Avatar Preview</p>
                    </div>

                    <div className="grid gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Display Name</label>
                            <input
                                className="w-full bg-black/40 border border-zinc-800 rounded-xl px-5 py-3.5 focus:border-white/20 focus:outline-none transition-all placeholder:text-zinc-700"
                                placeholder="e.g. Satoshi Nakamoto"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Avatar Image URL</label>
                            <input
                                className="w-full bg-black/40 border border-zinc-800 rounded-xl px-5 py-3.5 focus:border-white/20 focus:outline-none transition-all placeholder:text-zinc-700 font-mono text-sm"
                                placeholder="https://example.com/avatar.png"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                            />
                        </div>

                        <div className="pt-4 grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Role</p>
                                <p className="font-bold text-sm capitalize">{role.replace('-', ' ')}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 overflow-hidden">
                                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Managed Wallet</p>
                                <p className="font-mono text-xs text-zinc-400 truncate">{walletAddress}</p>
                            </div>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl text-center text-sm font-bold animate-in ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {message.text}
                        </div>
                    )}

                    <button
                        disabled={saving}
                        className="w-full py-4 bg-white text-black font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {saving ? 'Saving Changes...' : 'Save Profile'}
                    </button>
                </form>
            </div>

            <style jsx>{`
                .animate-in {
                    animation: fadeIn 0.4s ease-out forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
