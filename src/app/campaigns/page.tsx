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
        <div className="page-container animate-in" style={{ paddingBottom: '100px' }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem', marginTop: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Campaigns</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>Browse and manage testing campaigns</p>
                </div>
                <Link href="/campaigns/create" className="btn btn-primary" style={{
                    background: 'white',
                    color: 'black',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <span style={{ fontSize: '1.25rem' }}>+</span> Create Campaign
                </Link>
            </div>

            {/* Search and Filters */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Search campaigns..."
                        style={{
                            width: '100%',
                            padding: '0.875rem 1rem 0.875rem 3rem',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '0.9375rem'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn" style={{ background: 'white', color: 'black', borderRadius: '10px', padding: '0.5rem 1.25rem', fontWeight: 700 }}>All</button>
                    <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', borderRadius: '10px', padding: '0.5rem 1.25rem' }}>Active</button>
                    <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', borderRadius: '10px', padding: '0.5rem 1.25rem' }}>Completed</button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }} />
                </div>
            ) : campaigns.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '24px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>📋</div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Campaigns Found</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>Launch your first campaign to get started with AI testing.</p>
                    <Link href="/campaigns/create" className="btn btn-primary" style={{ background: 'white', color: 'black' }}>
                        Launch Campaign
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {campaigns.map((campaign) => {
                        const totalTasks = campaign.tasks?.reduce((sum, t) => sum + t.max_completions, 0) || 0;
                        const completedTasks = campaign.tasks?.reduce((sum, t) => sum + t.completions_count, 0) || 0;
                        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                        const isActive = campaign.status === 'active';

                        return (
                            <div key={campaign.id} className="card" style={{
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--border)',
                                borderRadius: '24px',
                                padding: '2.5rem',
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr',
                                gap: '2rem',
                                transition: 'transform 0.2s, border-color 0.2s',
                                cursor: 'pointer'
                            }} onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }} onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}>
                                {/* Left Side: Content */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{campaign.name}</h3>
                                        <div style={{
                                            fontSize: '0.625rem',
                                            fontWeight: 800,
                                            padding: '0.25rem 0.6rem',
                                            borderRadius: '100px',
                                            border: '1px solid #22C55E',
                                            color: '#22C55E',
                                            textTransform: 'uppercase'
                                        }}>
                                            {campaign.status}
                                        </div>
                                    </div>

                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.5rem', lineHeight: 1.6, maxWidth: '600px' }}>
                                        {campaign.description || 'Verified agent testing for decentralised applications on Base.'}
                                    </p>

                                    <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2rem' }}>
                                        Security
                                    </div>

                                    {/* Stats Row */}
                                    <div style={{ display: 'flex', gap: '2.5rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total Budget</div>
                                            <div style={{ fontWeight: 800, fontSize: '1.125rem' }}>$ {campaign.remaining_budget} <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>USDC</span></div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Per Task</div>
                                            <div style={{ fontWeight: 800, fontSize: '1.125rem' }}>📈 {campaign.reward_per_task} <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>USDC</span></div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Progress</div>
                                            <div style={{ fontWeight: 800, fontSize: '1.125rem' }}>✔️ {completedTasks}/{totalTasks}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Deadline</div>
                                            <div style={{ fontWeight: 800, fontSize: '1.125rem' }}>🕒 {isActive ? 'Running' : 'Ended'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Progress and Action */}
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2.5rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>Completion</span>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 800 }}>{Math.round(progress)}%</span>
                                        </div>
                                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden' }}>
                                            <div style={{ width: `${progress}%`, height: '100%', background: 'white', borderRadius: '100px' }} />
                                        </div>
                                    </div>

                                    <Link href={`/campaigns/${campaign.id}`} style={{ textDecoration: 'none' }}>
                                        <button className="btn btn-secondary" style={{
                                            width: '100%',
                                            padding: '1rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)',
                                            background: 'transparent',
                                            color: 'white',
                                            fontWeight: 700
                                        }}>
                                            View Details
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
