import {
  accountProtection,
  networkProtection,
  securityTimeline,
  type ProtectionIcon,
  type ProtectionItem,
  type TimelineEvent,
} from "@/data/security";

function ProtectionIconGraphic({ icon }: { icon: ProtectionIcon }) {
  if (icon === "key") return <svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8M15 8l2 2M17 6l2 2" /></svg>;
  if (icon === "lock" || icon === "tls") return <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>;
  if (icon === "device") return <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>;
  if (icon === "eye") return <svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
  if (icon === "bolt") return <svg viewBox="0 0 24 24"><path d="m13 2-9 12h8l-1 8 9-12h-8z" /></svg>;
  if (icon === "redirect") return <svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4 10 14M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></svg>;
  return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>;
}

function TimelineIcon({ icon }: { icon: TimelineEvent["icon"] }) {
  if (icon === "check") return <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>;
  if (icon === "warning") return <svg viewBox="0 0 24 24"><path d="m12 3 10 18H2zM12 9v5M12 18h.01" /></svg>;
  if (icon === "key") return <ProtectionIconGraphic icon="key" />;
  if (icon === "lock") return <ProtectionIconGraphic icon="lock" />;
  return <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
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
          {planned ? (
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
          ) : (
            <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
          )}
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
          <svg viewBox="0 0 24 24"><path d="M12 21a9 9 0 1 0-9-9" /><path d="M3 4v5h5M12 7v5l3 2" /></svg>
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

function SecurityOperations() {
  const operations = [
    { label: "Auth Layer", value: "Demo mode", badge: "Demo", tone: "green", icon: "lock" },
    { label: "API Security", value: "Protection planned", badge: "Planned", tone: "orange", icon: "shield" },
    { label: "Monitoring", value: "Interface ready", badge: "Ready", tone: "blue", icon: "chart" },
    { label: "Incident Response", value: "Backend support later", badge: "Future", tone: "purple", icon: "alert" },
  ] as const;

  return (
    <aside className="sc-operations" aria-labelledby="security-operations-title">
      <div className="sc-operations__header">
        <span className="sc-operations__header-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 16a10 10 0 0 1 14 0M8 12a6 6 0 0 1 8 0M11 8a2 2 0 0 1 2 0M12 20h.01" /></svg></span>
        <div><span>Defense telemetry</span><h2 id="security-operations-title">Security Ops Status</h2></div>
        <span className="sc-operations__live"><span aria-hidden="true" /> Demo</span>
      </div>
      <div className="sc-operations__items">
        {operations.map((item) => (
          <div className="sc-operations__item" key={item.label}>
            <span className={`sc-operations__item-icon sc-operations__item-icon--${item.tone}`} aria-hidden="true">
              {item.icon === "lock" && <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>}
              {item.icon === "shield" && <svg viewBox="0 0 24 24"><path d="M12 3 5 7v5c0 4 2.7 7.1 7 9 4.3-1.9 7-5 7-9V7zM9 12l2 2 4-4" /></svg>}
              {item.icon === "chart" && <svg viewBox="0 0 24 24"><path d="M4 20V9M10 20V4M16 20v-7M22 20V7" /></svg>}
              {item.icon === "alert" && <svg viewBox="0 0 24 24"><path d="m12 3 10 18H2zM12 9v5M12 18h.01" /></svg>}
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
            <circle cx="60" cy="60" r="50" className="sc-score__value" pathLength="100" />
          </svg>
          <div><strong>92%</strong><span>Secure</span></div>
        </div>
        <div className="sc-score__legend"><span><i /> Identity</span><span><i /> Network</span><span><i /> Monitor</span></div>
      </div>
    </aside>
  );
}

export default function SecurityCenter() {
  return (
    <>
      <section className="sc-hero" aria-labelledby="security-title">
        <div className="sc-hero__orb sc-hero__orb--green" />
        <div className="sc-hero__orb sc-hero__orb--blue" />
        <div className="sc-hero__scanlines" />
        <div className="sc-hero__content">
          <div className="sc-hero__copy">
            <div className="sc-hero__tag"><span aria-hidden="true" /> Defense active</div>
            <h1 id="security-title"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 7v5c0 4 2.7 7.1 7 9 4.3-1.9 7-5 7-9V7zM9 12l2 2 4-4" /></svg><span>Cyber Security Command Center</span></h1>
            <p>Account protection, API safety, session monitoring, and secure game platform access — your digital perimeter in one command center.</p>
          </div>
          <div className="sc-hero__stats" aria-label="Security summary">
            <div><strong>92%</strong><span>Security score</span></div>
            <div><strong>2</strong><span>Active sessions</span></div>
            <div><strong>4</strong><span>Protected APIs</span></div>
            <div><strong>1</strong><span>Alert detected</span></div>
          </div>
        </div>
      </section>

      <div className="sc-disclaimer">
        <span aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg></span>
        <p><strong>Frontend Security Demo</strong> — This interface demonstrates planned security controls. Authentication, encryption, and session management require future backend implementation.</p>
      </div>

      <div className="sc-layout">
        <div className="sc-content">
          <ProtectionSection badge="3/4 secure" items={accountProtection} title="Account Protection" />
          <ProtectionSection badge="Roadmap" items={networkProtection} planned title="API & Network Protection" />
          <SecurityTimeline />
        </div>
        <SecurityOperations />
      </div>
    </>
  );
}
