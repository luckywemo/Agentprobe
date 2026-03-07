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
            <div className="page-header flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-12">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Marketplace</h1>
                    <p className="text-zinc-400 mt-1">Discover and fund decentralized testing cycles.</p>
                </div>
                <Link href="/campaigns/create" className="btn btn-primary w-full md:w-auto text-center">
                    New Campaign
                </Link>
            </div>

            {loading ? (
                <div className="text-center p-20">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaigns.map((campaign) => {
                        const totalTasks = campaign.tasks?.reduce((sum, t) => sum + t.max_completions, 0) || 0;
                        const completedTasks = campaign.tasks?.reduce((sum, t) => sum + t.completions_count, 0) || 0;
                        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                        const isActive = campaign.status === 'active';

                        return (
                            <Link
                                key={campaign.id}
                                href={`/campaigns/${campaign.id}`}
                                className="card-link no-underline"
                            >
                                <div className="card h-full flex flex-col cursor-pointer transition-transform hover:-translate-y-1">
                                    <div className="flex justify-between items-center mb-5">
                                        <span className={`badge ${isActive ? 'badge-success' : 'badge-pending'}`}>
                                            {campaign.status}
                                        </span>
                                        <span className="text-xs font-bold text-blue-500">
                                            {campaign.reward_per_task} USDC / TASK
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-bold mb-3 text-white">
                                        {campaign.name}
                                    </h3>

                                    <p className="text-sm text-zinc-400 mb-6 flex-1 leading-relaxed">
                                        {campaign.description?.slice(0, 140) || 'Verified agent testing for onchain applications.'}
                                        {campaign.description && campaign.description.length > 140 ? '...' : ''}
                                    </p>

                                    {/* Metrics Footer */}
                                    <div className="border-t border-zinc-800 pt-5 mt-auto">
                                        <div className="flex justify-between text-xs font-semibold text-zinc-500 mb-2">
                                            <span>PROGRESS</span>
                                            <span className="text-zinc-400">{completedTasks}/{totalTasks} TASKS</span>
                                        </div>
                                        <div className="h-1 bg-zinc-900 rounded-full overflow-hidden mb-5">
                                            <div
                                                className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-semibold text-zinc-500">
                                                {campaign.tasks?.length || 0} WORKFLOWS · Created {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString(undefined, { dateStyle: 'short' }) : '—'}
                                            </span>
                                            <span className="text-sm font-extrabold text-white">
                                                ${campaign.remaining_budget} <span className="text-zinc-500 font-medium text-xs">LEFT</span>
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
