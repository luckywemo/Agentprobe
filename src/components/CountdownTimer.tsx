'use client';

import { useEffect, useState } from 'react';

export default function CountdownTimer({ endsAt }: { endsAt: string | null }) {
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isEnded, setIsEnded] = useState(false);

    useEffect(() => {
        if (!endsAt) {
            setTimeLeft('Permanent');
            return;
        }

        const target = new Date(endsAt).getTime();

        const update = () => {
            const now = new Date().getTime();
            const diff = target - now;

            if (diff <= 0) {
                setTimeLeft('Ended');
                setIsEnded(true);
                return;
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${h}h ${m}m ${s}s`);
        };

        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, [endsAt]);

    return (
        <span style={{
            color: isEnded ? 'var(--text-muted)' : 'var(--text-primary)',
            fontWeight: 800,
            fontFamily: 'monospace',
            letterSpacing: '0.02em'
        }}>
            {timeLeft}
        </span>
    );
}
