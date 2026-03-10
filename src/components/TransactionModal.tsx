'use client';

import { useState, useEffect } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { IS_TESTNET } from '@/lib/config';

interface TransactionModalProps {
    txHash: string;
    onCloseAction: () => void;
    asset?: 'ETH' | 'USDC'; // Optional hint
}

export default function TransactionModal({ txHash, onCloseAction, asset: assetHint }: TransactionModalProps) {
    const [txDetails, setTxDetails] = useState<any>(null);
    const [receipt, setReceipt] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchDetails() {
            try {
                const chain = IS_TESTNET ? baseSepolia : base;
                const client = createPublicClient({
                    chain,
                    transport: http(),
                });

                const [tx, rec] = await Promise.all([
                    client.getTransaction({ hash: txHash as `0x${string}` }),
                    client.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
                ]);

                setTxDetails(tx);
                setReceipt(rec);
            } catch (err: any) {
                console.error('Error fetching tx details:', err);
                setError(err.message || 'Failed to fetch transaction details');
            } finally {
                setLoading(false);
            }
        }

        if (txHash) fetchDetails();
    }, [txHash]);

    if (!txHash) return null;

    // Detect asset and decimals
    const isUSDC = assetHint === 'USDC' || (txDetails?.input && txDetails.input.length > 10); // Simple heuristic for contract calls
    const decimals = isUSDC ? 6 : 18;
    const symbol = isUSDC ? 'USDC' : 'ETH';
    const ethPrice = 2500;

    // For contract calls (USDC), the value in txDetails is often 0, 
    // we might need to parse the input or just use 0 for now as it's a "Sent" receipt.
    // In a real app we'd decode the ERC20 transfer data.
    const displayValue = isUSDC ? '0' : formatUnits(txDetails?.value || 0n, 18);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            padding: '1rem'
        }} onClick={onCloseAction}>
            <div style={{
                width: '100%',
                maxWidth: '440px',
                background: '#0a0a0a',
                border: '1px solid #1a1a1a',
                borderRadius: '24px',
                padding: '1.5rem',
                color: 'white',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                position: 'relative'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Sent {symbol}</h2>
                    <button onClick={onCloseAction} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
                </div>

                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>
                        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }} />
                        <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Fetching transaction details...</p>
                    </div>
                ) : error ? (
                    <div style={{ padding: '1rem', color: '#ff4444', fontSize: '0.9rem' }}>
                        Error: {error}
                        <button onClick={onCloseAction} style={{ display: 'block', marginTop: '1rem', color: 'white' }}>Close</button>
                    </div>
                ) : (
                    <>
                        {/* Status Section */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            <div>
                                <div style={{ color: '#aaa', marginBottom: '0.25rem' }}>Status</div>
                                <div style={{ color: '#00ff00', fontWeight: 600 }}>Confirmed</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <a
                                    href={`${IS_TESTNET ? 'https://sepolia.basescan.org' : 'https://basescan.org'}/tx/${txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#4488ff', textDecoration: 'none', display: 'block', marginBottom: '0.25rem' }}
                                >
                                    View on block explorer
                                </a>
                                <button
                                    onClick={() => navigator.clipboard.writeText(txHash)}
                                    style={{ background: 'none', border: 'none', color: '#4488ff', padding: 0, cursor: 'pointer' }}
                                >
                                    Copy transaction ID
                                </button>
                            </div>
                        </div>

                        {/* From/To Section */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid #1a1a1a', borderTop: '1px solid #1a1a1a', marginBottom: '1.5rem' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '0.5rem' }}>From</div>
                                <div style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {txDetails?.from?.slice(0, 8)}...{txDetails?.from?.slice(-6)}
                                </div>
                            </div>
                            <div style={{ margin: '0 1rem', color: '#333' }}>→</div>
                            <div style={{ flex: 1, textAlign: 'right' }}>
                                <div style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '0.5rem' }}>To</div>
                                <div style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {txDetails?.to?.slice(0, 8)}...{txDetails?.to?.slice(-6)}
                                </div>
                            </div>
                        </div>

                        {/* Transaction Detail Details */}
                        <div style={{ fontSize: '0.9rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Transaction</h3>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <span style={{ color: '#aaa' }}>Nonce</span>
                                <span>{txDetails?.nonce}</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <span style={{ color: '#aaa' }}>Amount</span>
                                <span>-{displayValue} {symbol}</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <span style={{ color: '#aaa' }}>Gas Limit (Units)</span>
                                <span>{txDetails?.gas?.toString()}</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <span style={{ color: '#aaa' }}>Gas price</span>
                                <span>{formatUnits(txDetails?.gasPrice || 0n, 9)} Gwei</span>
                            </div>

                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginTop: '1.5rem',
                                paddingTop: '1.5rem',
                                borderTop: '1px solid #1a1a1a'
                            }}>
                                <span style={{ fontSize: '1rem', fontWeight: 600 }}>Total Fee</span>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                                        {formatUnits(BigInt(receipt?.gasUsed || 0) * BigInt(receipt?.effectiveGasPrice || 0), 18)} ETH
                                    </div>
                                    <div style={{ color: '#aaa', fontSize: '0.8rem' }}>
                                        ${(parseFloat(formatUnits(BigInt(receipt?.gasUsed || 0) * BigInt(receipt?.effectiveGasPrice || 0), 18)) * ethPrice).toFixed(4)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', color: '#4488ff', fontSize: '0.9rem', cursor: 'pointer' }}>
                            Activity log <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>▼</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
