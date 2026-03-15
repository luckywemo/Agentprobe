'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Campaign } from '@/lib/supabase';
import CountdownTimer from '@/components/CountdownTimer';

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<(Campaign & { category?: string; tasks?: { id: string; title: string; completions_count: number; max_completions: number }[] })[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters & Pagination state
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('active');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [sortFilter, setSortFilter] = useState<string>('newest');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchCampaigns = async (
        status = statusFilter,
        category = categoryFilter,
        sort = sortFilter,
        targetPage = 1,
        append = false,
        silent = false
    ) => {
        if (!silent && !append) setLoading(true);
        if (append) setLoadingMore(true);

        try {
            const params = new URLSearchParams({
                status,
                category,
                sort,
                page: targetPage.toString(),
                limit: '12'
            });

            const res = await fetch(`/api/campaigns?${params.toString()}`);
            const data = await res.json();

            const fetched = data.campaigns || [];
            if (append) {
                setCampaigns(prev => {
                    // avoid duplicates if same id arrives
                    const existingIds = new Set(prev.map((c) => c.id));
                    const newItems = fetched.filter((c: any) => !existingIds.has(c.id));
                    return [...prev, ...newItems];
                });
            } else {
                setCampaigns(fetched);
            }

            setHasMore(data.total > targetPage * 12);
        } catch (err) {
            console.error('Marketplace fetch error:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleFilterChange = (setter: any, value: any) => {
        setter(value);
        setPage(1);
        fetchCampaigns(
            setter === setStatusFilter ? value : statusFilter,
            setter === setCategoryFilter ? value : categoryFilter,
            setter === setSortFilter ? value : sortFilter,
            1,
            false
        );
    };

    const loadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchCampaigns(statusFilter, categoryFilter, sortFilter, nextPage, true);
    };

    const triggerAutoPayout = async () => {
        try {
            await fetch('/api/admin/auto-payout');
        } catch (err) {
            console.error('Auto-payout trigger error:', err);
        }
    };

    useEffect(() => {
        fetchCampaigns(statusFilter, categoryFilter, sortFilter, 1, false);
        triggerAutoPayout();
        const interval = setInterval(() => {
            // Silently refresh the first page so it doesn't jump UI or duplicate rows badly
            fetchCampaigns(statusFilter, categoryFilter, sortFilter, 1, false, true);
            triggerAutoPayout();
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="page-container animate-in" style={{ paddingBottom: '100px', position: 'relative', overflow: 'hidden' }}>
            <div className="glass-noise-moving"></div>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem', marginTop: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Campaigns</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>Browse and manage testing campaigns</p>
                </div>
                <Link href="/campaigns/create" className="btn btn-primary hover-lift" style={{
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '3rem', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '300px', display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }} className="scrollbar-hide">
                    {['all', 'ux', 'security', 'e2e', 'performance', 'general'].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => handleFilterChange(setCategoryFilter, cat)}
                            style={{
                                padding: '0.5rem 1.25rem',
                                borderRadius: '100px',
                                fontSize: '0.875rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                background: categoryFilter === cat ? 'white' : 'rgba(255,255,255,0.05)',
                                color: categoryFilter === cat ? 'black' : 'var(--text-muted)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                        value={sortFilter}
                        onChange={(e) => handleFilterChange(setSortFilter, e.target.value)}
                        style={{
                            padding: '0.625rem 1rem',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border)',
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            outline: 'none',
                        }}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="reward_desc">Highest Reward</option>
                        <option value="ending_soon">Ending Soon</option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
                        style={{
                            padding: '0.625rem 1rem',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border)',
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            outline: 'none',
                        }}
                    >
                        <option value="active">Active Only</option>
                        <option value="all">All Campaigns</option>
                        <option value="closed">Completed Only</option>
                    </select>
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
                    {campaigns.map((campaign, idx) => {
                        const totalTasks = campaign.tasks?.reduce((sum, t) => sum + t.max_completions, 0) || 0;
                        const completedTasks = campaign.tasks?.reduce((sum, t) => sum + t.completions_count, 0) || 0;
                        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                        const isActive = campaign.status === 'active';

                        return (
                            <div key={campaign.id} className={`card animate-stagger stagger-${(idx % 5) + 1} hover-lift`} style={{
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--border)',
                                borderRadius: '24px',
                                padding: '2.5rem',
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr',
                                gap: '2rem',
                                cursor: 'pointer'
                            }}>
                                {/* Left Side: Content */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{campaign.name}</h3>
                                        <div className={`badge ${isActive ? 'badge-success' : 'badge-danger'} ${isActive ? 'animate-pulse-subtle' : ''}`}>
                                            {campaign.status}
                                        </div>
                                    </div>

                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.5rem', lineHeight: 1.6, maxWidth: '600px' }}>
                                        {campaign.description || 'Verified agent testing for decentralised applications on Base.'}
                                    </p>

                                    <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2rem', textTransform: 'uppercase' }}>
                                        {campaign.category || 'General'}
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
                                            <div style={{ fontWeight: 800, fontSize: '1.125rem' }}>🕒 <CountdownTimer endsAt={campaign.ends_at} /></div>
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
                                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{
                                                width: `${progress}%`,
                                                height: '100%',
                                                background: progress === 100 ? 'var(--success)' : 'var(--info)',
                                                borderRadius: '100px',
                                                boxShadow: `0 0 10px ${progress === 100 ? 'var(--success)' : 'var(--info)'}44`
                                            }} />
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

                    {hasMore && (
                        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                            <button
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="btn"
                                style={{
                                    padding: '0.75rem 2rem',
                                    borderRadius: '100px',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    border: '1px solid var(--border)',
                                    fontWeight: 700,
                                    cursor: loadingMore ? 'not-allowed' : 'pointer',
                                    opacity: loadingMore ? 0.5 : 1
                                }}
                            >
                                {loadingMore ? 'Loading...' : 'Load More Campaigns'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
