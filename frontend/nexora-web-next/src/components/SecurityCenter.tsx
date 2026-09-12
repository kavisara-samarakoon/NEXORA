import {
  securityTimeline,
  type ProtectionIcon,
  type ProtectionItem,
  type TimelineEvent,
} from "@/data/security";
import UxStatePanel from "@/components/UxStatePanel";
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
  id,
  items,
  planned = false,
  title,
}: {
  badge: string;
  id: string;
  items: readonly ProtectionItem[];
  planned?: boolean;
  title: string;
}) {
  return (
    <section className="sc-section" aria-labelledby={id}>
      <div className="sc-section__heading">
        <span className={planned ? "sc-section__icon sc-section__icon--planned" : "sc-section__icon"} aria-hidden="true">
          {planned ? "🌐" : "🔐"}
        </span>
        <div><span>{planned ? "Network perimeter" : "Identity perimeter"}</span><h2 id={id}>{title}</h2></div>
        <span className={planned ? "sc-section__badge sc-section__badge--planned" : "sc-section__badge"}>{badge}</span>
      </div>
      <div className="sc-protection-grid">
        {items.length === 0 ? <UxStatePanel title="No capabilities listed" tone="empty"
          description="This feed has no capability entries for this section. It does not indicate your account’s protection status." /> : null}
        {items.map((item) => (
          <article className={planned ? "sc-protection-card sc-protection-card--planned" : "sc-protection-card"} key={item.id}>
            <span className={planned ? "sc-protection-card__icon sc-protection-card__icon--planned" : "sc-protection-card__icon"} aria-hidden="true">
              <ProtectionIconGraphic icon={item.icon} />
            </span>
            <div className="sc-protection-card__copy">
              <div><h3>{item.label}</h3><span className={`sc-protection-card__status sc-protection-card__status--${item.statusType}`}>{planned ? "Planned" : "Preview"}</span></div>
              <p>{planned
                ? "Capability preview — not connected to live network protection."
                : "Static capability preview — not connected to account telemetry."}</p>
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
        <div><span>Static sample</span><h2 id="security-timeline-title">Security Activity Preview</h2></div>
        <span className="sc-section__live"><span aria-hidden="true" /> Demo</span>
      </div>
      <div className="sc-timeline">
        {securityTimeline.map((event) => (
          <article className="sc-timeline__event" key={event.id}>
            <div className="sc-timeline__rail"><span className={`sc-timeline__dot sc-timeline__dot--${event.type}`} /></div>
            <span className={`sc-timeline__icon sc-timeline__icon--${event.type}`} aria-hidden="true"><TimelineIcon icon={event.icon} /></span>
            <div className="sc-timeline__copy"><div><h3>{event.title}</h3><span>{event.time}</span></div><p>{event.detail}</p></div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SecurityOperations({
  source,
}: {
  source: SecurityStatusResult["source"];
}) {
  const isApiSource = source === "api";
  const operations = [
    { label: "Auth layout", value: "Static capability preview", badge: "Demo", tone: "green", icon: "lock" },
    { label: "API protection", value: "Not connected", badge: "Planned", tone: "orange", icon: "shield" },
    { label: "Preview source", value: isApiSource ? "Local sample API payload" : "Bundled static sample", badge: "Preview", tone: "blue", icon: "chart" },
    { label: "Incident response", value: "Not connected", badge: "Planned", tone: "purple", icon: "alert" },
  ] as const;

  return (
    <aside className="sc-operations" aria-labelledby="security-operations-title">
      <div className="sc-operations__header">
        <span className="sc-operations__header-icon" aria-hidden="true">📡</span>
        <div><span>Capability preview</span><h2 id="security-operations-title">Security Demo Status</h2></div>
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
        <div className="sc-score__heading"><span>Interface summary</span><strong>Demo</strong></div>
        <div className="sc-score__ring">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <defs><linearGradient id="security-score-gradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#58F5A5" /><stop offset="100%" stopColor="#00D4FF" /></linearGradient></defs>
            <circle cx="60" cy="60" r="50" className="sc-score__track" />
          </svg>
          <div><strong>Demo</strong><span>Preview</span></div>
        </div>
        <div className="sc-score__legend"><span><i /> Identity layout</span><span><i /> Network plan</span><span><i /> Sample signal</span></div>
      </div>
    </aside>
  );
}

export default function SecurityCenter({ securityStatus, source }: SecurityStatusResult) {
  const {
    accountProtection,
    networkProtection,
  } = securityStatus;

  return (
    <>
      <section className="sc-hero" aria-labelledby="security-title">
        <div className="sc-hero__orb sc-hero__orb--green" />
        <div className="sc-hero__orb sc-hero__orb--blue" />
        <div className="sc-hero__scanlines" />
        <div className="sc-hero__content">
          <div className="sc-hero__copy">
            <div className="sc-hero__tag"><span aria-hidden="true" /> Security interface preview</div>
            <h1 id="security-title"><span className="page-title-emoji" aria-hidden="true">🛡️</span><span>Security Capability Preview</span></h1>
            <p>Review the connected authentication foundation alongside static examples of planned account, API, and network controls.</p>
          </div>
          <div className="sc-hero__stats" aria-label="Static security preview summary">
            <div><strong>Demo</strong><span>Demo score</span></div>
            <div><strong>Sample</strong><span>Session preview</span></div>
            <div><strong>Planned</strong><span>Capability preview</span></div>
            <div><strong>Static</strong><span>Example account signal</span></div>
          </div>
        </div>
      </section>

      <div className="sc-disclaimer">
        <span aria-hidden="true">ℹ️</span>
        <p><strong>Authentication foundation connected; telemetry not connected</strong> — Basic account registration, login, and access-token identity exist. Scores, sessions, activity entries, protection states, and operational panels on this page are static preview labels, not account facts, live monitoring, or production guarantees.</p>
      </div>

      <div className="sc-layout">
        <div className="sc-content">
          <ProtectionSection badge="Static preview" id="account-protection-title" items={accountProtection} title="Account Capability Preview" />
          <ProtectionSection badge="Roadmap" id="network-protection-title" items={networkProtection} planned title="API & Network Protection" />
          <SecurityTimeline />
        </div>
        <SecurityOperations source={source} />
      </div>
    </>
  );
}
