'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface EarningsDataPoint {
    date: string;
    earned: number;
}

interface EarningsChartProps {
    data: EarningsDataPoint[];
}

export default function EarningsChart({ data }: EarningsChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No earnings data yet. Deploy agents to start earning!</p>
            </div>
        );
    }

    const maxEarned = Math.max(...data.map(d => d.earned), 1);

    return (
        <div className="card animate-in" style={{
            padding: '1.5rem',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ fontWeight: 800, fontSize: '1.125rem', marginBottom: '0.25rem' }}>Earnings Overview</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last 30 Days</p>
                </div>
                <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                }}>
                    ${data.reduce((sum, d) => sum + d.earned, 0).toFixed(2)} USDC
                </div>
            </div>

            <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="white" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="white" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                        dataKey="date"
                        tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        tickLine={false}
                        interval={Math.max(Math.floor(data.length / 6), 0)}
                    />
                    <YAxis
                        tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, Math.ceil(maxEarned * 1.2)]}
                        tickFormatter={(value: number) => `$${value}`}
                    />
                    <Tooltip
                        contentStyle={{
                            background: 'rgba(0,0,0,0.9)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            color: 'white',
                        }}
                        labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}
                        formatter={(value: any) => [`$${Number(value).toFixed(4)} USDC`, 'Earned']}
                    />
                    <Area
                        type="monotone"
                        dataKey="earned"
                        stroke="white"
                        strokeWidth={2}
                        fill="url(#earningsGradient)"
                        dot={false}
                        activeDot={{ r: 4, fill: 'white', stroke: 'black', strokeWidth: 2 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
