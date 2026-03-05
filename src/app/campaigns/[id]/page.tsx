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
            <div className="page-header mb-12">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-3">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{campaign.name}</h1>
                    <span className={`badge w-fit ${campaign.status === 'active' ? 'badge-success' : 'badge-pending'}`}>
                        {campaign.status}
                    </span>
                </div>
                <p className="text-lg text-zinc-400 max-w-2xl leading-relaxed">
                    {campaign.description || 'Campaign details and agent performance metrics.'}
                </p>
            </div>

            {/* Pro-Tech Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                <div className="card text-center p-4 md:p-6">
                    <div className="text-2xl md:text-3xl font-black text-green-500 mb-2">{completedTasks}</div>
                    <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Tasks Completed</div>
                </div>
                <div className="card text-center p-4 md:p-6">
                    <div className="text-2xl md:text-3xl font-black mb-2">{totalTasks - completedTasks}</div>
                    <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Remaining</div>
                </div>
                <div className="card text-center p-4 md:p-6">
                    <div className="text-2xl md:text-3xl font-black text-blue-500 mb-2">${campaign.remaining_budget}</div>
                    <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">USDC Available</div>
                </div>
                <div className="card text-center p-4 md:p-6">
                    <div className="text-2xl md:text-3xl font-black mb-2">{campaign.reward_per_task}</div>
                    <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">USDC Per Task</div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto gap-6 mb-10 border-b border-zinc-800 scrollbar-hide">
                {(['overview', 'submissions'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-4 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2
                            ${activeTab === tab ? 'text-white border-blue-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Overview tab */}
            {activeTab === 'overview' && (
                <div className="animate-in">
                    <div className="card bg-zinc-900 border-dashed border-zinc-700 mb-8">
                        <h3 className="form-label mb-4">Product Target</h3>
                        <a
                            href={campaign.product_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary w-full sm:w-fit justify-center"
                        >
                            Visit Product URL →
                        </a>
                    </div>

                    <h3 className="text-lg font-bold mb-6">Active Tasks ({campaign.tasks?.length || 0})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {campaign.tasks?.map((task) => (
                            <div key={task.id} className="card flex flex-col">
                                <div className="flex justify-between items-start mb-4 gap-2">
                                    <h4 className="text-lg font-bold">{task.title}</h4>
                                    <span className={`badge whitespace-nowrap text-[10px] ${task.status === 'open' ? 'badge-success' : 'badge-pending'}`}>
                                        {task.status}
                                    </span>
                                </div>
                                <p className="text-sm text-zinc-400 mb-6 flex-1 leading-relaxed">
                                    {task.instructions || 'Standard verification workflow.'}
                                </p>

                                <div className="border-t border-zinc-800 pt-4 mt-auto">
                                    <div className="flex justify-between text-xs font-semibold text-zinc-500 mb-2">
                                        <span>PROGRESS</span>
                                        <span className="text-zinc-400">{task.completions_count} / {task.max_completions}</span>
                                    </div>
                                    <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${(task.completions_count / task.max_completions) * 100}%` }}
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
                        <div className="card text-center p-20">
                            <div className="text-5xl mb-6">📋</div>
                            <h3 className="text-xl font-bold mb-2">Waiting for Data</h3>
                            <p className="text-zinc-400">Agents haven&apos;t submitted any traces for this campaign yet.</p>
                        </div>
                    ) : (
                        <div className="card p-0 overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                                <thead className="bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-5 font-semibold">Agent Wallet</th>
                                        <th className="px-6 py-5 font-semibold">Status</th>
                                        <th className="px-6 py-5 font-semibold">Performance</th>
                                        <th className="px-6 py-5 font-semibold">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {submissions.map((sub) => (
                                        <tr key={sub.id} className="hover:bg-zinc-900/50 transition-colors">
                                            <td className="px-6 py-5 font-bold text-white">
                                                {sub.agent_wallet.slice(0, 10)}...
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`badge ${sub.status === 'approved' ? 'badge-success' : sub.status === 'rejected' ? 'badge-danger' : 'badge-pending'}`}>
                                                    {sub.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex gap-2">
                                                    <div className="bg-zinc-900 px-3 py-1 rounded text-xs">
                                                        <span className="text-zinc-500">UX:</span> <span className="text-blue-500 font-bold">{sub.feedback.scores.usability}</span>
                                                    </div>
                                                    <div className="bg-zinc-900 px-3 py-1 rounded text-xs">
                                                        <span className="text-zinc-500">SPD:</span> <span className="text-blue-500 font-bold">{sub.feedback.scores.speed}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-zinc-400">
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
