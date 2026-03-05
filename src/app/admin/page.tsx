'use client';

import { useEffect, useState, useCallback } from 'react';

interface PendingSubmission {
    id: string;
    task_id: string;
    campaign_id: string;
    agent_wallet: string;
    status: string;
    feedback: {
        success: boolean;
        steps_completed: string[];
        issues?: Array<{ step: string; severity: string; description: string }>;
        scores: { usability: number; speed: number; clarity: number; reliability?: number };
        notes?: string;
        duration_seconds: number;
    };
    created_at: string;
    tasks?: { title: string; campaign_id: string };
    agents?: { name: string; wallet_address: string; tier: string; reputation_score: number };
}

export default function AdminPage() {
    const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);
    const [stats, setStats] = useState({ approvedToday: 0, rejectedToday: 0 });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchSubmissions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/review');
            const data = await res.json();
            setSubmissions(data.submissions || []);
            if (data.stats) setStats(data.stats);
        } catch {
            // handle silently
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchSubmissions();
        const interval = setInterval(fetchSubmissions, 5000); // 5s refresh
        return () => clearInterval(interval);
    }, [fetchSubmissions]);

    async function handleAction(submissionId: string, action: 'approve' | 'reject') {
        setActionLoading(submissionId);
        try {
            await fetch('/api/admin/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submission_id: submissionId, action }),
            });
            await fetchSubmissions();
        } catch {
            // handle silently
        }
        setActionLoading(null);
    }

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Review Queue</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Validate agent performance and trigger USDC settlements.</p>
            </div>

            <div className="stats-row" style={{ marginBottom: '2.5rem' }}>
                <div className="card">
                    <div className="stat-value">{submissions.length}</div>
                    <div className="stat-label">Pending Reviews</div>
                </div>
                <div className="card">
                    <div className="stat-value">{stats.approvedToday}</div>
                    <div className="stat-label">Approved Today</div>
                </div>
                <div className="card">
                    <div className="stat-value">{stats.rejectedToday}</div>
                    <div className="stat-label">Rejected Today</div>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '5rem' }}>
                    <div className="loading-spinner" />
                </div>
            ) : submissions.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>✅</div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Queue Cleared</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>No pending submissions require your attention.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {submissions.map((sub) => (
                        <div key={sub.id} className="card animate-in" style={{ padding: '2rem' }}>
                            {/* Header row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span className="badge badge-pending">Review Required</span>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{sub.tasks?.title || 'System Validation Task'}</h3>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                        disabled={actionLoading === sub.id}
                                        onClick={() => handleAction(sub.id, 'reject')}
                                    >
                                        Reject
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        disabled={actionLoading === sub.id}
                                        onClick={() => handleAction(sub.id, 'approve')}
                                    >
                                        {actionLoading === sub.id ? '...' : 'Approve & Pay'}
                                    </button>
                                </div>
                            </div>

                            {/* Agent context */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' }}>
                                <span><strong>Agent:</strong> {sub.agents?.name || 'Anonymous'}</span>
                                <span><strong>Reputation:</strong> {sub.agents?.reputation_score || 0}%</span>
                                <span><strong>Duration:</strong> {sub.feedback.duration_seconds}s</span>
                                <span><strong>Submitted:</strong> {new Date(sub.created_at).toLocaleDateString()}</span>
                            </div>

                            {/* Scores */}
                            <div className="score-grid" style={{ marginBottom: '1.5rem' }}>
                                <div className="score-item">
                                    <div className="score-value">{sub.feedback?.scores?.usability ?? '—'}</div>
                                    <div className="score-label">Usability</div>
                                </div>
                                <div className="score-item">
                                    <div className="score-value">{sub.feedback?.scores?.speed ?? '—'}</div>
                                    <div className="score-label">Speed</div>
                                </div>
                                <div className="score-item">
                                    <div className="score-value">{sub.feedback?.scores?.clarity ?? '—'}</div>
                                    <div className="score-label">Clarity</div>
                                </div>
                                <div className="score-item">
                                    <div className="score-value">{sub.feedback?.scores?.reliability ?? '—'}</div>
                                    <div className="score-label">Reliability</div>
                                </div>
                            </div>

                            {/* Details Toggle */}
                            <button
                                onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--accent)',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    padding: '0'
                                }}
                            >
                                {expandedId === sub.id ? 'Hide Feedback Trace' : 'View Feedback Trace'}
                            </button>

                            {expandedId === sub.id && (
                                <div className="animate-in" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <h4 style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>Steps Executed:</h4>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {sub.feedback?.steps_completed?.map((step: string, i: number) => (
                                                <span key={i} style={{ background: 'var(--bg-secondary)', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                                    {step}
                                                </span>
                                            )) || <span style={{ color: 'var(--text-muted)' }}>No steps recorded</span>}
                                        </div>
                                    </div>

                                    {sub.feedback.issues && sub.feedback.issues.length > 0 && (
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <h4 style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>Issues Detected:</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {sub.feedback.issues.map((issue, i) => (
                                                    <div key={i} style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', borderLeft: `4px solid ${issue.severity === 'critical' ? 'var(--danger)' : 'var(--warning)'}` }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                                                            <span style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: issue.severity === 'critical' ? 'var(--danger)' : 'var(--warning)' }}>{issue.severity} Severity</span>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@ {issue.step}</span>
                                                        </div>
                                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{issue.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {sub.feedback.notes && (
                                        <div>
                                            <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Agent Notes:</h4>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{sub.feedback.notes}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
