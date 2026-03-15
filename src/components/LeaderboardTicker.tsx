'use client';

import { useEffect, useState } from 'react';

interface ActivityLog {
    id: string;
    message: string;
    log_type: string;
    created_at: string;
    agents: {
        name: string;
    } | null;
}

export default function LeaderboardTicker() {
    const [activities, setActivities] = useState<ActivityLog[]>([]);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const res = await fetch('/api/leaderboard/activity');
                const data = await res.json();
                if (data.activity) {
                    setActivities(data.activity);
                }
            } catch (err) {
                console.error('Error fetching ticker activity:', err);
            }
        };

        fetchActivity();
        const interval = setInterval(fetchActivity, 10000); // 10s polling
        return () => clearInterval(interval);
    }, []);

    if (activities.length === 0) return null;

    return (
        <div className="w-full bg-zinc-950/80 backdrop-blur-md border-y border-white/5 py-3 overflow-hidden relative z-20">
            <div className="flex animate-marquee whitespace-nowrap items-center">
                {/* Double the list for seamless loop */}
                {[...activities, ...activities].map((log, idx) => (
                    <div key={`${log.id}-${idx}`} className="flex items-center gap-4 px-12">
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Activity</span>
                        <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-xs">
                                {log.agents?.name || 'Unknown Agent'}
                            </span>
                            <span className="text-zinc-500 text-xs">
                                {log.message}
                            </span>
                        </div>
                        <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                    </div>
                ))}
            </div>

            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 40s linear infinite;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
}
