import {
  securityTimeline,
  type ProtectionIcon,
  type ProtectionItem,
  type TimelineEvent,
} from "@/data/security";
import type { SecurityStatusResult } from "@/lib/api";

function ProtectionIconGraphic({ icon }: { icon: ProtectionIcon }) {
  if (icon === "key") return "🔑";
  if (icon === "lock") return "🔐";
  if (icon === "tls") return "🔒";
  if (icon === "device") return "💻";
  if (icon === "eye") return "👁️";
  if (icon === "bolt") return "⚡";
  if (icon === "redirect") return "↗️";
  return "🌐";
}

function TimelineIcon({ icon }: { icon: TimelineEvent["icon"] }) {
  if (icon === "check") return "✅";
  if (icon === "warning") return "⚠️";
  if (icon === "key") return "🔑";
  if (icon === "lock") return "🔐";
  return "📧";
}

function ProtectionSection({
  badge,
  items,
  planned = false,
  title,
}: {
  badge: string;
  items: readonly ProtectionItem[];
  planned?: boolean;
  title: string;
}) {
  return (
    <section className="sc-section">
      <div className="sc-section__heading">
        <span className={planned ? "sc-section__icon sc-section__icon--planned" : "sc-section__icon"} aria-hidden="true">
          {planned ? "🌐" : "🔐"}
        </span>
        <div><span>{planned ? "Network perimeter" : "Identity perimeter"}</span><h2>{title}</h2></div>
        <span className={planned ? "sc-section__badge sc-section__badge--planned" : "sc-section__badge"}>{badge}</span>
      </div>
      <div className="sc-protection-grid">
        {items.map((item) => (
          <article className={planned ? "sc-protection-card sc-protection-card--planned" : "sc-protection-card"} key={item.id}>
            <span className={planned ? "sc-protection-card__icon sc-protection-card__icon--planned" : "sc-protection-card__icon"} aria-hidden="true">
              <ProtectionIconGraphic icon={item.icon} />
            </span>
            <div className="sc-protection-card__copy">
              <div><h3>{item.label}</h3><span className={`sc-protection-card__status sc-protection-card__status--${item.statusType}`}>{item.status}</span></div>
              <p>{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SecurityTimeline() {
  return (
    <section className="sc-section" aria-labelledby="security-timeline-title">
      <div className="sc-section__heading">
        <span className="sc-section__icon sc-section__icon--blue" aria-hidden="true">
          📍
        </span>
        <div><span>Audit stream</span><h2 id="security-timeline-title">Security Activity Timeline</h2></div>
        <span className="sc-section__live"><span aria-hidden="true" /> Monitored</span>
      </div>
      <div className="sc-timeline">
        {securityTimeline.map((event) => (
          <article className="sc-timeline__event" key={event.id}>
            <div className="sc-timeline__rail"><span className={`sc-timeline__dot sc-timeline__dot--${event.type}`} /></div>
            <span className={`sc-timeline__icon sc-timeline__icon--${event.type}`} aria-hidden="true"><TimelineIcon icon={event.icon} /></span>
            <div className="sc-timeline__copy"><div><h3>{event.title}</h3><time>{event.time}</time></div><p>{event.detail}</p></div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SecurityOperations({
  securityScore,
  source,
  status,
}: {
  securityScore: number;
  source: SecurityStatusResult["source"];
  status: string;
}) {
  const isApiSource = source === "api";
  const operations = [
    { label: "Auth Layer", value: "Demo mode", badge: "Demo", tone: "green", icon: "lock" },
    { label: "API Security", value: "Protection planned", badge: "Planned", tone: "orange", icon: "shield" },
    { label: "Monitoring", value: isApiSource ? "Backend status API" : "Interface ready", badge: isApiSource ? "API" : "Ready", tone: "blue", icon: "chart" },
    { label: "Incident Response", value: "Backend support later", badge: "Future", tone: "purple", icon: "alert" },
  ] as const;

  return (
    <aside className="sc-operations" aria-labelledby="security-operations-title">
      <div className="sc-operations__header">
        <span className="sc-operations__header-icon" aria-hidden="true">📡</span>
        <div><span>Defense telemetry</span><h2 id="security-operations-title">Security Ops Status</h2></div>
        <span className="sc-operations__live sc-operations__live--demo"><span aria-hidden="true" /> Demo</span>
      </div>
      <div className="sc-operations__items">
        {operations.map((item) => (
          <div className="sc-operations__item" key={item.label}>
            <span className={`sc-operations__item-icon sc-operations__item-icon--${item.tone}`} aria-hidden="true">
              {item.icon === "lock" && "🔐"}
              {item.icon === "shield" && "🔒"}
              {item.icon === "chart" && "📊"}
              {item.icon === "alert" && "🚨"}
            </span>
            <span className="sc-operations__item-copy"><strong>{item.label}</strong><small>{item.value}</small></span>
            <span className={`sc-operations__badge sc-operations__badge--${item.tone}`}>{item.badge}</span>
          </div>
        ))}
      </div>
      <div className="sc-score">
        <div className="sc-score__heading"><span>Overall protection</span><strong>Excellent</strong></div>
        <div className="sc-score__ring">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <defs><linearGradient id="security-score-gradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#58F5A5" /><stop offset="100%" stopColor="#00D4FF" /></linearGradient></defs>
            <circle cx="60" cy="60" r="50" className="sc-score__track" />
            <circle cx="60" cy="60" r="50" className="sc-score__value" pathLength="100" style={{ strokeDasharray: `${securityScore} 100` }} />
          </svg>
          <div><strong>{securityScore}%</strong><span>{status}</span></div>
        </div>
        <div className="sc-score__legend"><span><i /> Identity</span><span><i /> Network</span><span><i /> Monitor</span></div>
      </div>
    </aside>
  );
}

export default function SecurityCenter({ securityStatus, source }: SecurityStatusResult) {
  const {
    accountProtection,
    activeSessions,
    alertCount,
    networkProtection,
    protectedApis,
    securityScore,
    status,
  } = securityStatus;
  const secureAccountItems = accountProtection.filter(
    (item) => item.statusType === "ok",
  ).length;

  return (
    <>
      <section className="sc-hero" aria-labelledby="security-title">
        <div className="sc-hero__orb sc-hero__orb--green" />
        <div className="sc-hero__orb sc-hero__orb--blue" />
        <div className="sc-hero__scanlines" />
        <div className="sc-hero__content">
          <div className="sc-hero__copy">
            <div className="sc-hero__tag"><span aria-hidden="true" /> Defense active</div>
            <h1 id="security-title"><span className="page-title-emoji" aria-hidden="true">🛡️</span><span>Cyber Security Command Center</span></h1>
            <p>Account protection, API safety, session monitoring, and secure game platform access — your digital perimeter in one command center.</p>
          </div>
          <div className="sc-hero__stats" aria-label="Security summary">
            <div><strong>{securityScore}%</strong><span>Security score</span></div>
            <div><strong>{activeSessions}</strong><span>Active sessions</span></div>
            <div><strong>{protectedApis}</strong><span>Protected APIs</span></div>
            <div><strong>{alertCount}</strong><span>{alertCount === 1 ? "Alert detected" : "Alerts detected"}</span></div>
          </div>
        </div>
      </section>

      <div className="sc-disclaimer">
        <span aria-hidden="true">ℹ️</span>
        <p><strong>Authentication foundation active</strong> — Basic account registration, login, and access-token identity are connected. The remaining security controls shown here are roadmap demonstrations, not production guarantees.</p>
      </div>

      <div className="sc-layout">
        <div className="sc-content">
          <ProtectionSection badge={`${secureAccountItems}/${accountProtection.length} secure`} items={accountProtection} title="Account Protection" />
          <ProtectionSection badge="Roadmap" items={networkProtection} planned title="API & Network Protection" />
          <SecurityTimeline />
        </div>
        <SecurityOperations securityScore={securityScore} source={source} status={status} />
      </div>
    </>
  );
}
