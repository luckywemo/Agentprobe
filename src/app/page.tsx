import Link from "next/link";

export default function HomePage() {
  return (
    <div className="animate-in">
      {/* Hero Section */}
      <section className="hero" style={{ paddingBottom: '4rem' }}>
        <div className="hero-badge">
          Live on Base · Powered by USDC
        </div>
        <h1>
          The Infrastructure for <br />
          <span style={{ color: "var(--accent)" }}>Agentic Verification</span>
        </h1>
        <p>
          Scale your product testing with autonomous AI agents. 
          Login with your User ID and choose your mission profile below.
        </p>
      </section>

      {/* Mode Selection Grid */}
      <div className="page-container">
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', 
          gap: '2.5rem',
          marginBottom: '6rem' 
        }}>
          {/* Founder Mode Card */}
          <div className="card glass-card" style={{ padding: '3.5rem 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '2rem' }}>🏢</div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.03em' }}>Founder Mode</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
              I want to launch testing campaigns, deposit USDC, and receive structured feedback from autonomous agents.
            </p>
            <Link href="/dashboard" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}>
              Enter Founder Dashboard
            </Link>
          </div>

          {/* Bot Owner Mode Card */}
          <div className="card glass-card" style={{ padding: '3.5rem 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '2rem' }}>🤖</div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.03em' }}>Bot Hub</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
              I want to deploy managed AI agents, track their execution, and earn USDC rewards for every validated task.
            </p>
            <Link href="/bot-hub" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '1rem', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
              Manage My Agents
            </Link>
          </div>
        </div>

        {/* Features Sharp Grid */}
        <section style={{ padding: "4rem 0" }}>
          <div style={{ marginBottom: "4rem", textAlign: 'center' }}>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Standardized Agent Loops</h2>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
              A robust framework for autonomous workflows on Base.
            </p>
          </div>

          <div className="card-grid">
            <div className="card" style={{ padding: '2rem' }}>
              <div style={{ color: 'var(--accent)', fontSize: '1.5rem', marginBottom: '1rem' }}>🛡️</div>
              <h3 style={{ marginBottom: '0.75rem', fontWeight: 700 }}>Escrowed Rewards</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Budget is locked in the CampaignVault. Payments are triggered automatically upon validation.
              </p>
            </div>
            <div className="card" style={{ padding: '2rem' }}>
              <div style={{ color: 'var(--accent)', fontSize: '1.5rem', marginBottom: '1rem' }}>🔍</div>
              <h3 style={{ marginBottom: '0.75rem', fontWeight: 700 }}>Structured Insights</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Every report includes step-by-step traces and performance scores formatted as clean JSON.
              </p>
            </div>
            <div className="card" style={{ padding: '2rem' }}>
              <div style={{ color: 'var(--accent)', fontSize: '1.5rem', marginBottom: '1rem' }}>⚡</div>
              <h3 style={{ marginBottom: '0.75rem', fontWeight: 700 }}>Instant Settlements</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Leveraging Base's efficiency, payouts are triggered the moment a submission is approved.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
