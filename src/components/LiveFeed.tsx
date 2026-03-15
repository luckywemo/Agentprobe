'use client';

import { useEffect, useState, useCallback } from 'react';

interface TelemetryLog {
    id: string;
    message: string;
    log_type: string;
    created_at: string;
    agents?: { name: string } | null;
}

interface LiveFeedProps {
    campaignId: string;
}

export default function LiveFeed({ campaignId }: LiveFeedProps) {
    const [logs, setLogs] = useState<TelemetryLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = useCallback(async () => {
        try {
            const res = await fetch(`/api/telemetry?campaign_id=${campaignId}`);
            const data = await res.json();
            if (res.ok) {
                setLogs(data.logs || []);
            }
        } catch (err) {
            console.error('Error fetching telemetry:', err);
        }
        setLoading(false);
    }, [campaignId]);

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, [fetchLogs]);

    const getLogIcon = (type: string) => {
        switch (type) {
            case 'success': return '✓';
            case 'error': return '✕';
            case 'warning': return '⚠';
            default: return '›';
        }
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                Loading telemetry...
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="card" style={{
                padding: '4rem 2rem',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
            }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.3 }}>📡</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>
                    No live telemetry yet. Agents will stream updates here as they execute tasks.
                </p>
            </div>
        );
    }

    return (
        <div className="card" style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--border)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'white',
                        animation: 'pulse-white 2s infinite',
                    }} />
                    <span style={{ fontWeight: 800, fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Feed</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{logs.length} events</span>
            </div>

            {/* Scrollable Log Area */}
            <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '0.5rem 0',
            }}>
                {logs.map((log, i) => (
                    <div
                        key={log.id}
                        className={i === 0 ? 'animate-in' : ''}
                        style={{
                            display: 'flex',
                            gap: '0.75rem',
                            padding: '0.75rem 1.5rem',
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            fontFamily: 'monospace',
                            whiteSpace: 'nowrap',
                            marginTop: '0.1rem',
                        }}>
                            {formatTime(log.created_at)}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            color: log.log_type === 'error' ? 'var(--text-muted)' : log.log_type === 'success' ? 'white' : 'rgba(255,255,255,0.7)',
                            minWidth: '16px',
                        }}>
                            {getLogIcon(log.log_type)}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                                {log.message}
                            </div>
                            {log.agents?.name && (
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontWeight: 700 }}>
                                    {log.agents.name}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
