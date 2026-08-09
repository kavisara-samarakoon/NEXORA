import SentinelButton from "@/components/SentinelButton";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

const systemSignals = [
  { label: "Network", value: "Protected", tone: "blue" },
  { label: "Vault", value: "Synchronized", tone: "orange" },
  { label: "Sentinel", value: "Standing by", tone: "blue" },
] as const;

export default function Home() {
  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-shell">
        <Topbar />

        <main className="dashboard">
          <section className="hero-panel" aria-labelledby="dashboard-title">
            <div className="hero-panel__glow hero-panel__glow--orange" />
            <div className="hero-panel__glow hero-panel__glow--blue" />

            <div className="hero-panel__content">
              <div className="eyebrow">
                <span className="status-dot" aria-hidden="true" />
                Command center online
              </div>
              <h1 id="dashboard-title">
                Your gaming world,
                <span> connected.</span>
              </h1>
              <p>
                Welcome to the new NEXORA experience. Your unified dashboard is
                ready for the modules arriving next.
              </p>
            </div>

            <div className="signal-grid" aria-label="System overview">
              {systemSignals.map((signal) => (
                <div className="signal-card" key={signal.label}>
                  <span
                    className={`signal-card__pulse signal-card__pulse--${signal.tone}`}
                    aria-hidden="true"
                  />
                  <span className="signal-card__label">{signal.label}</span>
                  <strong>{signal.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-section" aria-labelledby="overview-title">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Overview</span>
                <h2 id="overview-title">Your space at a glance</h2>
              </div>
              <span className="live-indicator">
                <span aria-hidden="true" /> Live system
              </span>
            </div>

            <div className="placeholder-grid">
              <article className="glass-panel placeholder-card placeholder-card--wide">
                <div className="placeholder-card__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 5h16v14H4zM4 10h16M9 10v9" />
                  </svg>
                </div>
                <div>
                  <span className="placeholder-card__meta">Workspace</span>
                  <h3>Your dashboard is taking shape</h3>
                  <p>
                    Future NEXORA modules will surface here as the migration
                    continues.
                  </p>
                </div>
                <div className="skeleton-lines" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </article>

              <article className="glass-panel placeholder-card">
                <div className="placeholder-card__icon placeholder-card__icon--blue" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3l8 4v5c0 4.5-3.4 7.7-8 9-4.6-1.3-8-4.5-8-9V7z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <span className="placeholder-card__meta">System status</span>
                  <h3>Secure by design</h3>
                  <p>The base interface is online and ready to expand.</p>
                </div>
              </article>
            </div>
          </section>
        </main>
      </div>

      <SentinelButton />
    </div>
  );
}
