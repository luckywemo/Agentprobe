import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AgentProbe — Onchain AI Agent Testing Platform",
  description:
    "Fund testing campaigns, let AI agents test your product, get structured feedback — all on Base with USDC payments.",
  other: {
    "base:app_id": "69d292ec759b9a105ccd82f0",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={outfit.className}>
        <div className="glass-noise" />
        <Providers>
          <Header />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
