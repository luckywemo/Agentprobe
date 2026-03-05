'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { wagmiConfig } from '@/lib/wagmi-config';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

// Suppress known wallet extension errors that crash the Next.js dev overlay
if (typeof window !== 'undefined') {
    const originalError = console.error;
    console.error = (...args) => {
        if (typeof args[0] === 'string' && args[0].includes('Hana - Failed running RPC transaction')) {
            return;
        }
        originalError.apply(console, args);
    };
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
