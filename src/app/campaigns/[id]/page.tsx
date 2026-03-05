'use client';

import { useEffect, useState, use } from 'react';
import type { Submission } from '@/lib/supabase';

interface CampaignDetail {
    id: string;
    name: string;
    description: string;
    product_url: string;
    reward_per_task: number;
    total_budget: number;
    remaining_budget: number;
    status: string;
    created_at: string;
    tasks: {
        id: string;
        title: string;
        instructions: string;
        max_completions: number;
        completions_count: number;
        status: string;
    }[];
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'submissions'>('overview');

    const fetchCampaignData = async () => {
        try {
            // Fetch campaign details
            const campRes = await fetch(`/api/campaigns?status=all`);
            const campData = await campRes.json();
            const c = campData.campaigns?.find((c: CampaignDetail) => c.id === resolvedParams.id);
            if (c) setCampaign(c);

            // Fetch submissions
            const subRes = await fetch(`/api/campaigns/${resolvedParams.id}/submissions`);
            const subData = await subRes.json();
            setSubmissions(subData.submissions || []);
        } catch (err) {
            console.error('Error fetching campaign details:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaignData();

        // 5-second polling to track real-time agent work
        const interval = setInterval(fetchCampaignData, 5000);
        return () => clearInterval(interval);
    }, [resolvedParams.id]);

    if (loading) {
        return (
            <div className="page-container" style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="loading-spinner" />
            </div>
        );
    }

    if (!campaign) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <div className="icon">🔍</div>
                    <h3>Campaign not found</h3>
                </div>
            </div>
        );
    }

    const totalTasks = campaign.tasks?.reduce((sum, t) => sum + t.max_completions, 0) || 0;
    const completedTasks = campaign.tasks?.reduce((sum, t) => sum + t.completions_count, 0) || 0;

    return (
        <div className="page-container animate-in">
            <div className="page-header" style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.04em' }}>{campaign.name}</h1>
                    <span className={`badge ${campaign.status === 'active' ? 'badge-success' : 'badge-pending'}`}>
                        {campaign.status}
                    </span>
                </div>
                <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', maxWidth: '700px' }}>
                    {campaign.description || 'Campaign details and agent performance metrics.'}
                </p>
            </div>

            {/* Pro-Tech Stats Grid */}
            <div className="stats-row" style={{ marginBottom: '3rem' }}>
                <div className="card">
                    <div className="stat-value" style={{ color: 'var(--success)' }}>{completedTasks}</div>
                    <div className="stat-label">Tasks Completed</div>
                </div>
                <div className="card">
                    <div className="stat-value">{totalTasks - completedTasks}</div>
                    <div className="stat-label">Remaining</div>
                </div>
                <div className="card">
                    <div className="stat-value" style={{ color: 'var(--accent)' }}>${campaign.remaining_budget}</div>
                    <div className="stat-label">USDC Available</div>
                </div>
                <div className="card">
                    <div className="stat-value">{campaign.reward_per_task}</div>
                    <div className="stat-label">USDC Per Task</div>
                </div>
            </div>

            {/* Navigation Tabs (Sharp) */}
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--border)' }}>
                {(['overview', 'submissions'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                            padding: '1rem 0',
                            cursor: 'pointer',
                            borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Overview tab */}
            {activeTab === 'overview' && (
                <div className="animate-in">
                    <div className="card" style={{ marginBottom: '2rem', background: 'var(--bg-secondary)', borderStyle: 'dashed' }}>
                        <h3 className="form-label" style={{ marginBottom: '1rem' }}>Product Target</h3>
                        <a
                            href={campaign.product_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ width: 'fit-content' }}
                        >
                            Visit Product URL →
                        </a>
                    </div>

                    <h3 className="form-label" style={{ marginBottom: '1.5rem' }}>Active Tasks ({campaign.tasks?.length || 0})</h3>
                    <div className="card-grid">
                        {campaign.tasks?.map((task) => (
                            <div key={task.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <h4 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{task.title}</h4>
                                    <span className={`badge ${task.status === 'open' ? 'badge-success' : 'badge-pending'}`} style={{ fontSize: '0.625rem' }}>
                                        {task.status}
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', flex: 1, lineHeight: 1.6 }}>
                                    {task.instructions || 'Standard verification workflow.'}
                                </p>

                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 'auto' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                        <span>PROGRESS</span>
                                        <span style={{ color: 'var(--text-secondary)' }}>{task.completions_count} / {task.max_completions}</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div
                                            style={{
                                                height: '100%',
                                                width: `${(task.completions_count / task.max_completions) * 100}%`,
                                                background: 'var(--accent)',
                                                borderRadius: '3px',
                                                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Submissions tab */}
            {activeTab === 'submissions' && (
                <div className="animate-in">
                    {submissions.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '5rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>📋</div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Waiting for Data</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>Agents haven&apos;t submitted any traces for this campaign yet.</p>
                        </div>
                    ) : (
                        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                <thead style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <tr>
                                        <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600 }}>Agent Wallet</th>
                                        <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600 }}>Status</th>
                                        <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600 }}>Performance</th>
                                        <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600 }}>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions.map((sub) => (
                                        <tr key={sub.id} style={{ borderTop: '1px solid var(--border)' }}>
                                            <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {sub.agent_wallet.slice(0, 10)}...
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem' }}>
                                                <span className={`badge ${sub.status === 'approved' ? 'badge-success' : sub.status === 'rejected' ? 'badge-danger' : 'badge-pending'}`}>
                                                    {sub.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <div style={{ background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                                                        <span style={{ color: 'var(--text-muted)' }}>UX:</span> <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{sub.feedback.scores.usability}</span>
                                                    </div>
                                                    <div style={{ background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                                                        <span style={{ color: 'var(--text-muted)' }}>SPD:</span> <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{sub.feedback.scores.speed}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)' }}>
                                                {new Date(sub.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
