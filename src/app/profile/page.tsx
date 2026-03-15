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
    const [uploading, setUploading] = useState(false);
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
                window.dispatchEvent(new Event('profileUpdated'));
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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userId) return;

        setUploading(true);
        setMessage(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId);

        try {
            const res = await fetch('/api/profile/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (res.ok && data.url) {
                setAvatarUrl(data.url);
                setMessage({ type: 'success', text: 'Avatar uploaded successfully! Click Save Profile to apply.' });
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to upload avatar' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An error occurred during upload' });
        } finally {
            setUploading(false);
            // Reset input so the same file can be selected again if needed
            if (e.target) e.target.value = '';
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
                        <input
                            type="file"
                            id="avatar-upload"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                        />
                        <div
                            className={`relative group cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                            onClick={() => document.getElementById('avatar-upload')?.click()}
                        >
                            <div className="w-32 h-32 rounded-full border-2 border-white/10 overflow-hidden bg-zinc-800 flex items-center justify-center text-4xl shadow-2xl transition-all group-hover:scale-105 group-hover:border-white/30">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{displayName?.[0]?.toUpperCase() || userId[0].toUpperCase()}</span>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <span className="text-[10px] font-black uppercase tracking-tighter text-white">Change</span>
                                </div>
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
                            <div className="flex justify-between items-end mb-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Avatar Image URL</label>
                                {avatarUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setAvatarUrl('')}
                                        className="text-[9px] font-bold text-zinc-600 hover:text-red-400 transition-colors uppercase"
                                    >
                                        Clear Avatar
                                    </button>
                                )}
                            </div>
                            <input
                                id="avatar-url-input"
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
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 overflow-hidden group relative">
                                <div className="flex justify-between items-start">
                                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Managed Wallet</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(walletAddress);
                                            // Optional: simple toast or temporary text change
                                        }}
                                        className="p-1 hover:bg-white/10 rounded transition-colors"
                                        title="Copy to clipboard"
                                    >
                                        <span className="text-[10px] opacity-60">📋</span>
                                    </button>
                                </div>
                                <p className="font-mono text-xs text-zinc-400 truncate">{walletAddress}</p>
                            </div>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl text-center text-sm font-bold animate-in border ${message.type === 'success'
                            ? 'bg-[var(--success)]/5 text-[var(--success)] border-[var(--success)]/10'
                            : 'bg-[var(--danger)]/5 text-[var(--danger)] border-[var(--danger)]/10'
                            }`}>
                            {message.type === 'success' ? '✓ ' : '✕ '}{message.text}
                        </div>
                    )}

                    <button
                        disabled={saving}
                        className="w-full py-4 bg-white text-black font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-xl hover:shadow-white/10"
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
