'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Campaign } from '@/lib/supabase';

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<(Campaign & { tasks?: { id: string; title: string; completions_count: number; max_completions: number }[] })[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCampaigns = async () => {
        try {
            const res = await fetch('/api/campaigns?status=all');
            const data = await res.json();
            setCampaigns(data.campaigns || []);
        } catch (err) {
            console.error('Marketplace fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
        const interval = setInterval(fetchCampaigns, 8000); // 8s refresh
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="page-container animate-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.04em' }}>Marketplace</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>Discover and fund decentralized testing cycles.</p>
                </div>
                <Link href="/campaigns/create" className="btn btn-primary">
                    New Campaign
                </Link>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '5rem' }}>
                    <div className="loading-spinner" />
                </div>
            ) : campaigns.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '5rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>📋</div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Active Markets</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>Be the first to secure your product with autonomous agents.</p>
                    <Link href="/campaigns/create" className="btn btn-primary">
                        Launch Campaign
                    </Link>
                </div>
            ) : (
                <div className="card-grid">
                    {campaigns.map((campaign) => {
                        const totalTasks = campaign.tasks?.reduce((sum, t) => sum + t.max_completions, 0) || 0;
                        const completedTasks = campaign.tasks?.reduce((sum, t) => sum + t.completions_count, 0) || 0;
                        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                        const isActive = campaign.status === 'active';

                        return (
                            <Link
                                key={campaign.id}
                                href={`/campaigns/${campaign.id}`}
                                style={{ textDecoration: 'none' }}
                                className="card-link"
                            >
                                <div className="card h-full" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                        <span className={`badge ${isActive ? 'badge-success' : 'badge-pending'}`}>
                                            {campaign.status}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>
                                            {campaign.reward_per_task} USDC / TASK
                                        </span>
                                    </div>

                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                                        {campaign.name}
                                    </h3>

                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6, flex: 1 }}>
                                        {campaign.description?.slice(0, 140) || 'Verified agent testing for onchain applications.'}
                                        {campaign.description && campaign.description.length > 140 ? '...' : ''}
                                    </p>

                                    {/* Metrics Footer */}
                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: 'auto' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                            <span>PROGRESS</span>
                                            <span style={{ color: 'var(--text-secondary)' }}>{completedTasks}/{totalTasks} TASKS</span>
                                        </div>
                                        <div style={{ height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden', marginBottom: '1.25rem' }}>
                                            <div
                                                style={{
                                                    height: '100%',
                                                    width: `${progress}%`,
                                                    background: 'var(--accent)',
                                                    borderRadius: '2px',
                                                    transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                                                }}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                {campaign.tasks?.length || 0} WORKFLOWS
                                            </span>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                ${campaign.remaining_budget} <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.75rem' }}>LEFT</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
