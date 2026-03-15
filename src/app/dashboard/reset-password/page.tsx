'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        // Just verify we have a session (the magic link provides one)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setError('Invalid or expired reset session. Please request a new link.');
            }
        });
    }, []);

    async function handleReset(e: React.FormEvent) {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            // 1. Update Supabase Auth Password
            const { error: authError } = await supabase.auth.updateUser({
                password: password
            });

            if (authError) throw authError;

            // 2. Update our legacy password_hash in the users table
            // We use the auth session to identify the user
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const res = await fetch('/api/profile/update-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        supabase_id: user.id,
                        new_password: password
                    }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Failed to update legacy password');
                }
            }

            setMessage('Password updated successfully! Redirecting to login...');
            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Reset failed');
        }
        setLoading(false);
    }

    return (
        <div className="page-container" style={{ textAlign: 'center', padding: '100px 2rem', minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
            <div className="glass-noise-moving"></div>

            <div className="card animate-in" style={{ background: 'rgba(255,255,255,0.02)', padding: '3.5rem', maxWidth: '500px', width: '100%', borderRadius: '24px', border: '1px solid var(--border)', backdropFilter: 'blur(10px)' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>Set New Password</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>
                    Choose a secure password for your AgentProbe account.
                </p>

                {error && <div style={{ color: '#ff4444', background: 'rgba(255, 68, 68, 0.1)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{error}</div>}
                {message && <div style={{ color: '#44ff44', background: 'rgba(68, 255, 68, 0.1)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{message}</div>}

                <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
                    <div>
                        <label className="form-label">New Password</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="Min 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>
                    <div>
                        <label className="form-label">Confirm Password</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="Repeat new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '1.25rem', marginTop: '1rem' }}>
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
