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
    const originalLog = console.log;

    // Silence common extension/SDK noise that isn't actionable for the app
    console.error = (...args) => {
        const msg = typeof args[0] === 'string' ? args[0] : '';
        if (
            msg.includes('Hana - Failed running RPC transaction') ||
            msg.includes('chrome.runtime.sendMessage') ||
            msg.includes('opfgelmcmbiajamepnmloijbpoleiama') ||
            msg.includes('Extension ID')
        ) {
            return;
        }
        originalError.apply(console, args);
    };

    // Also catch unhandled exceptions from these sources
    window.addEventListener('error', (event) => {
        if (event.message?.includes('chrome.runtime.sendMessage') || event.message?.includes('opfgelmcmbiajamepnmloijbpoleiama')) {
            event.stopImmediatePropagation();
            event.preventDefault();
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        const msg = event.reason?.message || '';
        if (msg.includes('chrome.runtime.sendMessage') || msg.includes('opfgelmcmbiajamepnmloijbpoleiama')) {
            event.stopImmediatePropagation();
            event.preventDefault();
        }
    });
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
