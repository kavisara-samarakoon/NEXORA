import SentinelChat from "@/components/SentinelChat";
import type { SentinelCapability, SentinelStatus } from "@/data/sentinel";
import type { SentinelResult } from "@/lib/api";

function CapabilityIcon({ icon }: { icon: SentinelCapability["icon"] }) {
  if (icon === "gamepad") return "🎮";
  if (icon === "deal") return "💰";
  if (icon === "shield") return "🛡️";
  return "🔐";
}

function statusValue(label: string, status: SentinelStatus) {
  if (label === "AI Status") return status.aiStatus;
  if (label === "Backend") return status.backend;
  if (label === "Provider") return null;
  if (label === "Gemini API") return status.geminiApi;
  if (label === "Privacy") return status.privacy;
  return null;
}

function SentinelSystemStatus({
  source,
  status,
  systemStatus,
}: Pick<SentinelResult, "source" | "status"> & {
  systemStatus: SentinelResult["demo"]["systemStatus"];
}) {
  return (
    <aside className="sn-status" aria-labelledby="sentinel-status-title">
      <div className="sn-status__header">
        <span className="sn-status__header-icon" aria-hidden="true">📡</span>
        <div><span>Assistant telemetry</span><h2 id="sentinel-status-title">Sentinel System Status</h2></div>
        <span className={`sn-status__live sn-status__live--${source === "api" ? "api" : "demo"}`}><span aria-hidden="true" /> {source === "api" ? "API" : "Demo"}</span>
      </div>

      <div className="sn-status__items">
        {systemStatus.map((item) => (
          <div className="sn-status__item" key={item.label}>
            <span className={`sn-status__item-icon sn-status__item-icon--${item.tone}`} aria-hidden="true">
              {item.icon === "bot" && "🤖"}
              {item.icon === "network" && "🌐"}
              {item.icon === "spark" && "✨"}
              {item.icon === "lock" && "🔒"}
            </span>
            <span className="sn-status__item-copy"><strong>{item.label}</strong><small>{statusValue(item.label, status) ?? item.value}</small></span>
            <span className={`sn-status__badge sn-status__badge--${item.tone}`}>{item.badge}</span>
          </div>
        ))}
      </div>

      <div className="sn-status__about">
        <div className="sn-status__section-label"><span>About Sentinel</span><strong>Preview</strong></div>
        <div><span>Version</span><strong>0.20 safety controls</strong></div>
        <div><span>Provider</span><strong>{status.geminiApi === "Gemini Enabled" ? "Gemini opt-in" : "Local default"}</strong></div>
        <div><span>Conversations</span><strong>Not persisted</strong></div>
        <div><span>External AI</span><strong>{status.geminiApi}</strong></div>
      </div>

      <div className="sn-status__network" aria-hidden="true">
        <span /><span /><span /><span /><span />
        <i /><i /><i /><i />
      </div>
    </aside>
  );
}

export default function SentinelExperience({
  demo,
  source,
  status,
}: SentinelResult) {
  const { capabilities, messages, suggestions, systemStatus } = demo;

  return (
    <>
      <section className="sn-hero" aria-labelledby="sentinel-title">
        <div className="sn-hero__orb sn-hero__orb--blue" />
        <div className="sn-hero__orb sn-hero__orb--orange" />
        <div className="sn-hero__scanlines" />
        <div className="sn-hero__content">
          <div className="sn-hero__tag"><span aria-hidden="true" /> Contextual insight foundation</div>
          <h1 id="sentinel-title"><span className="page-title-emoji" aria-hidden="true">🤖</span><span>NEXORA Sentinel</span></h1>
          <p>Backend-routed guidance using bounded NEXORA summaries, a safe local default, and optional Gemini.</p>
        </div>
      </section>

      <div className="sn-disclaimer">
        <span aria-hidden="true">ℹ️</span>
        <p><strong>Contextual Gateway Preview</strong> — Static samples remain public. Signed-in requests can use bounded backend summaries for Wishlist, Deals, Giveaways, alerts, and prices. NEXORA does not save conversations, and provider failures return a local fallback.</p>
      </div>

      <div className="sn-layout">
        <div className="sn-content">
          <SentinelChat messages={messages} suggestions={suggestions} />
          <section className="sn-capability-section" aria-labelledby="sentinel-capabilities-title">
            <div className="sn-section-heading"><span aria-hidden="true">⚡</span><div><small>Knowledge modules</small><h2 id="sentinel-capabilities-title">Sentinel Capabilities</h2></div></div>
            <div className="sn-capabilities">
              {capabilities.map((capability) => (
                <article className={`sn-capability sn-capability--${capability.tone}`} key={capability.id}>
                  <div className={`sn-capability__accent sn-capability__accent--${capability.tone}`} />
                  <span className={`sn-capability__icon sn-capability__icon--${capability.tone}`} aria-hidden="true"><CapabilityIcon icon={capability.icon} /></span>
                  <div><h3>{capability.title}</h3><p>{capability.description}</p></div>
                </article>
              ))}
            </div>
          </section>
        </div>
        <SentinelSystemStatus source={source} status={status} systemStatus={systemStatus} />
      </div>
    </>
  );
}
