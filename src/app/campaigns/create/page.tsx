'use client';

import { useState, useEffect } from 'react';

interface TaskInput {
    title: string;
    instructions: string;
    max_completions: number;
}

export default function CreateCampaignPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        setUserId(localStorage.getItem('agentprobe_user_id'));
        setWalletAddress(localStorage.getItem('agentprobe_wallet_address'));
    }, []);

    const [step, setStep] = useState<'form' | 'approve' | 'deposit' | 'done'>('form');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [productUrl, setProductUrl] = useState('');
    const [rewardPerTask, setRewardPerTask] = useState('0.001');
    const [totalBudget, setTotalBudget] = useState('1');
    const [tasks, setTasks] = useState<TaskInput[]>([
        { title: '', instructions: '', max_completions: 100 },
    ]);
    const [error, setError] = useState('');
    const [campaignId, setCampaignId] = useState<string | null>(null);

    function addTask() {
        setTasks([...tasks, { title: '', instructions: '', max_completions: 100 }]);
    }

    function removeTask(index: number) {
        setTasks(tasks.filter((_, i) => i !== index));
    }

    function updateTask(index: number, field: keyof TaskInput, value: string | number) {
        setTasks(prev => prev.map((task, i) =>
            i === index ? { ...task, [field]: value } : task
        ));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        if (!userId || !walletAddress) {
            setError('Please login to your founder account first');
            return;
        }

        if (!name || !productUrl || !rewardPerTask || !totalBudget) {
            setError('Please fill in all required fields');
            return;
        }

        const validTasks = tasks.filter((t) => t.title.trim());
        if (validTasks.length === 0) {
            setError('Add at least one task');
            return;
        }

        setStep('approve');
        setIsPending(true);

        try {
            // Step 1: Approve USDC spending securely via backend
            const res = await fetch('/api/campaigns/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, amount: totalBudget }),
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Approval failed');

            // Set state for the UI before moving to deposit
            setIsPending(false);
            handleDeposit(); // Auto-proceed to deposit for better UX since it's backend-managed
            
        } catch (err: any) {
            setError(`Approval failed: ${err.message}`);
            setStep('form');
            setIsPending(false);
        }
    }

    async function handleDeposit() {
        setStep('deposit');
        setError('');
        setIsPending(true);

        try {
            // Step 2: Deposit into Smart Contract securely via backend
            const res = await fetch('/api/campaigns/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, depositAmount: totalBudget, rewardAmount: rewardPerTask }),
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Deposit failed');
            
            setIsPending(false);
            saveCampaignToDb(); // Auto-proceed to DB saving

        } catch (err: any) {
            setError(`Deposit failed: ${err.message}`);
            setStep('approve');
            setIsPending(false);
        }
    }

    async function saveCampaignToDb() {
        try {
            const validTasks = tasks.filter((t) => t.title.trim());
            const res = await fetch('/api/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    founder_address: walletAddress,
                    name,
                    description,
                    product_url: productUrl,
                    reward_per_task: rewardPerTask,
                    total_budget: totalBudget,
                    onchain_id: 0, // Will be updated once we read onchain events
                    tasks: validTasks,
                    ends_at: (window as any)._campaign_ends_at || null,
                }),
            });
            const data = await res.json();
            if (data.campaign) {
                setCampaignId(data.campaign.id);
                setStep('done');
            } else {
                setError(data.error || 'Failed to save campaign');
            }
        } catch (err) {
            setError(`Save failed: ${err}`);
        }
    }

    return (
        <div className="page-container" style={{ maxWidth: '800px' }}>
            <div className="page-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Launch Your Campaign</h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Define tasks for AI agents to test your product and set up rewards in USDC.</p>
            </div>

            {/* Progress indicator */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem', maxWidth: '400px', margin: '0 auto 3rem' }}>
                {(['form', 'approve', 'deposit', 'done'] as const).map((s, i) => (
                    <div
                        key={s}
                        style={{
                            flex: 1,
                            height: '4px',
                            borderRadius: '2px',
                            background:
                                step === s
                                    ? 'var(--accent)'
                                    : (['form', 'approve', 'deposit', 'done'].indexOf(step) > i)
                                        ? 'var(--success)'
                                        : 'var(--border)',
                            boxShadow: step === s ? '0 0 8px var(--accent-soft)' : 'none',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    />
                ))}
            </div>

            {error && (
                <div
                    style={{
                        background: 'rgba(239, 68, 68, 0.05)',
                        border: '1px solid var(--danger)',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        color: 'var(--danger)',
                        marginBottom: '2rem',
                        fontSize: '0.875rem',
                        fontWeight: 600
                    }}
                >
                    {error}
                </div>
            )}

            {step === 'form' && (
                <form onSubmit={handleSubmit} className="animate-in">
                    <div className="card" style={{ marginBottom: '2rem', padding: '2.5rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 700 }}>Campaign Details</h3>
                        <div className="form-group">
                            <label className="form-label">Campaign Name *</label>
                            <input
                                className="form-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Uniswap V4 Swap Flow Test"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Product URL *</label>
                            <input
                                className="form-input"
                                value={productUrl}
                                onChange={(e) => setProductUrl(e.target.value)}
                                placeholder="https://app.yourproduct.com"
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Reward per Task (USDC) *</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    step="0.001"
                                    min="0.001"
                                    value={rewardPerTask}
                                    onChange={(e) => setRewardPerTask(e.target.value)}
                                />
                                <div className="form-hint">Min: 0.001 USDC</div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Total Budget (USDC) *</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={totalBudget}
                                    onChange={(e) => setTotalBudget(e.target.value)}
                                />
                                <div className="form-hint">
                                    ≈ {Math.floor(parseFloat(totalBudget) / parseFloat(rewardPerTask))} tasks
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Campaign Duration</label>
                            <select
                                className="form-input"
                                onChange={(e) => {
                                    const days = parseInt(e.target.value);
                                    if (days > 0) {
                                        const date = new Date();
                                        date.setDate(date.getDate() + days);
                                        (window as any)._campaign_ends_at = date.toISOString();
                                    } else {
                                        (window as any)._campaign_ends_at = null;
                                    }
                                }}
                            >
                                <option value="0">Indefinite (Until budget runs out)</option>
                                <option value="1">24 Hours</option>
                                <option value="3">3 Days</option>
                                <option value="7">7 Days</option>
                                <option value="30">30 Days</option>
                            </select>
                            <div className="form-hint">Campaign will automatically end after this period.</div>
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: '2rem', padding: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Test Tasks</h3>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={addTask}>
                                + Add Task
                            </button>
                        </div>

                        {tasks.map((task, index) => (
                            <div
                                key={index}
                                style={{
                                    padding: '1rem',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    marginBottom: '0.75rem',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Task {index + 1}</span>
                                    {tasks.length > 1 && (
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => removeTask(index)}>
                                            Remove
                                        </button>
                                    )}
                                </div>
                                <div className="form-group">
                                    <input
                                        className="form-input"
                                        placeholder="Task title (e.g. Complete a token swap)"
                                        value={task.title}
                                        onChange={(e) => updateTask(index, 'title', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <textarea
                                        className="form-textarea"
                                        placeholder="Step-by-step instructions for the agent..."
                                        value={task.instructions}
                                        onChange={(e) => updateTask(index, 'instructions', e.target.value)}
                                        style={{ minHeight: '80px' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Max Completions</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        min="1"
                                        value={task.max_completions}
                                        onChange={(e) => updateTask(index, 'max_completions', parseInt(e.target.value))}
                                        style={{ maxWidth: '150px' }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1.25rem' }}>
                        Continue to Deposit →
                    </button>
                </form>
            )}

            {step === 'approve' && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💳</div>
                    <h3>Step 1: Approve USDC</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.75rem 0 1.5rem' }}>
                        Approving your managed wallet to spend {totalBudget} USDC.
                    </p>
                    {isPending && (
                        <div>
                            <div className="loading-spinner" style={{ margin: '0 auto 1rem' }} />
                            <p style={{ color: 'var(--warning)' }}>Processing transaction on Base...</p>
                        </div>
                    )}
                </div>
            )}

            {step === 'deposit' && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏦</div>
                    <h3>Step 2: Create Campaign & Deposit</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.75rem 0 1.5rem' }}>
                        Depositing {totalBudget} USDC into the vault.
                    </p>
                    {isPending && (
                        <div>
                            <div className="loading-spinner" style={{ margin: '0 auto 1rem' }} />
                            <p style={{ color: 'var(--warning)' }}>Confirming deposit...</p>
                        </div>
                    )}
                </div>
            )}

            {step === 'done' && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎉</div>
                    <h3>Campaign Created!</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.75rem 0 1.5rem' }}>
                        Your campaign is now live. AI agents can discover and start testing.
                    </p>
                    {campaignId && (
                        <a href={`/campaigns/${campaignId}`} className="btn btn-primary">
                            View Campaign Dashboard →
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}
