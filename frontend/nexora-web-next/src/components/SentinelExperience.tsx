import SentinelChat from "@/components/SentinelChat";
import {
  sentinelCapabilities,
  sentinelSystemStatus,
  type SentinelCapability,
} from "@/data/sentinel";

function CapabilityIcon({ icon }: { icon: SentinelCapability["icon"] }) {
  if (icon === "gamepad") return <svg viewBox="0 0 24 24"><path d="M7 8h10a5 5 0 0 1 4.8 6.4l-1 3.5a2.8 2.8 0 0 1-4.6 1.2L14 17h-4l-2.2 2.1a2.8 2.8 0 0 1-4.6-1.2l-1-3.5A5 5 0 0 1 7 8Z" /><path d="M7 11v4M5 13h4M16 12h.01M19 14h.01" /></svg>;
  if (icon === "deal") return <svg viewBox="0 0 24 24"><path d="M20 13 13 20l-9-9V4h7zM8 8h.01" /></svg>;
  if (icon === "shield") return <svg viewBox="0 0 24 24"><path d="M12 3 5 7v5c0 4 2.7 7.1 7 9 4.3-1.9 7-5 7-9V7zM9 12l2 2 4-4" /></svg>;
  return <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>;
}

function SentinelSystemStatus() {
  return (
    <aside className="sn-status" aria-labelledby="sentinel-status-title">
      <div className="sn-status__header">
        <span className="sn-status__header-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 16a10 10 0 0 1 14 0M8 12a6 6 0 0 1 8 0M11 8a2 2 0 0 1 2 0M12 20h.01" /></svg></span>
        <div><span>Assistant telemetry</span><h2 id="sentinel-status-title">Sentinel System Status</h2></div>
        <span className="sn-status__live"><span aria-hidden="true" /> Demo</span>
      </div>

      <div className="sn-status__items">
        {sentinelSystemStatus.map((item) => (
          <div className="sn-status__item" key={item.label}>
            <span className={`sn-status__item-icon sn-status__item-icon--${item.tone}`} aria-hidden="true">
              {item.icon === "bot" && <svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="13" rx="3" /><path d="M12 3v4M9 12h.01M15 12h.01M9 16h6" /></svg>}
              {item.icon === "network" && <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>}
              {item.icon === "spark" && <svg viewBox="0 0 24 24"><path d="m12 2 1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5zM19 17l.6 2.4L22 20l-2.4.6L19 23l-.6-2.4L16 20l2.4-.6z" /></svg>}
              {item.icon === "lock" && <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>}
            </span>
            <span className="sn-status__item-copy"><strong>{item.label}</strong><small>{item.value}</small></span>
            <span className={`sn-status__badge sn-status__badge--${item.tone}`}>{item.badge}</span>
          </div>
        ))}
      </div>

      <div className="sn-status__about">
        <div className="sn-status__section-label"><span>About Sentinel</span><strong>Preview</strong></div>
        <div><span>Version</span><strong>0.1.0-demo</strong></div>
        <div><span>Model</span><strong>Planned: Gemini</strong></div>
        <div><span>Conversations</span><strong>Static only</strong></div>
        <div><span>Response time</span><strong>N/A (Demo)</strong></div>
      </div>

      <div className="sn-status__network" aria-hidden="true">
        <span /><span /><span /><span /><span />
        <i /><i /><i /><i />
      </div>
    </aside>
  );
}

export default function SentinelExperience() {
  return (
    <>
      <section className="sn-hero" aria-labelledby="sentinel-title">
        <div className="sn-hero__orb sn-hero__orb--blue" />
        <div className="sn-hero__orb sn-hero__orb--orange" />
        <div className="sn-hero__scanlines" />
        <div className="sn-hero__content">
          <div className="sn-hero__tag"><span aria-hidden="true" /> AI assistant</div>
          <h1 id="sentinel-title"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="7" width="16" height="13" rx="3" /><path d="M12 3v4M9 12h.01M15 12h.01M9 16h6" /></svg><span>NEXORA Sentinel</span></h1>
          <p>AI assistant for game discovery, deal guidance and account safety — powered by intelligent conversation.</p>
        </div>
      </section>

      <div className="sn-disclaimer">
        <span aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg></span>
        <p><strong>Static AI Preview</strong> — The conversation below uses sample messages and local interface state. No message is sent, stored, or processed by an AI service.</p>
      </div>

      <div className="sn-layout">
        <div className="sn-content">
          <SentinelChat />
          <section className="sn-capability-section" aria-labelledby="sentinel-capabilities-title">
            <div className="sn-section-heading"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m12 2 1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5z" /></svg></span><div><small>Knowledge modules</small><h2 id="sentinel-capabilities-title">Sentinel Capabilities</h2></div></div>
            <div className="sn-capabilities">
              {sentinelCapabilities.map((capability) => (
                <article className={`sn-capability sn-capability--${capability.tone}`} key={capability.id}>
                  <div className={`sn-capability__accent sn-capability__accent--${capability.tone}`} />
                  <span className={`sn-capability__icon sn-capability__icon--${capability.tone}`} aria-hidden="true"><CapabilityIcon icon={capability.icon} /></span>
                  <div><h3>{capability.title}</h3><p>{capability.description}</p></div>
                </article>
              ))}
            </div>
          </section>
        </div>
        <SentinelSystemStatus />
      </div>
    </>
  );
}
