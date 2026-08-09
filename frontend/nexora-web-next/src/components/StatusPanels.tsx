import {
  networkItems,
  securityItems,
  type SecurityItem,
} from "@/data/dashboard";

function SecurityIcon({ icon }: Pick<SecurityItem, "icon">) {
  if (icon === "lock") return "🔒";
  if (icon === "network") return "🌐";
  if (icon === "warning") return "⚠️";
  return "🤖";
}

export default function StatusPanels() {
  return (
    <div className="status-panels">
      <section className="status-panel" aria-labelledby="security-title">
        <div className="status-panel__heading">
          <div className="status-panel__heading-icon status-panel__heading-icon--orange" aria-hidden="true">
            🛡️
          </div>
          <div>
            <h2 id="security-title">Cyber Security Status</h2>
          </div>
        </div>

        <div className="security-list">
          {securityItems.map((item) => (
            <div className="security-row" key={item.id}>
              <span className={`security-row__icon security-row__icon--${item.tone}`} aria-hidden="true">
                <SecurityIcon icon={item.icon} />
              </span>
              <span className="security-row__copy">
                <strong>{item.label}</strong>
                <small>{item.value}</small>
              </span>
              <span className={`security-row__status security-row__status--${item.statusType}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="status-panel" aria-labelledby="network-title">
        <div className="status-panel__heading status-panel__heading--split">
          <div className="status-panel__title-group">
            <div className="status-panel__heading-icon status-panel__heading-icon--blue" aria-hidden="true">
              🌐
            </div>
            <div>
              <h2 id="network-title">Network Health</h2>
            </div>
          </div>
          <span className="network-live"><span aria-hidden="true" /> All Systems Monitored</span>
        </div>

        <div className="network-grid">
          {networkItems.map((item) => (
            <article className={`network-card network-card--${item.status}`} key={item.id}>
              <div className="network-card__topline">
                <strong>{item.name}</strong>
                <span><span aria-hidden="true" />{item.status === "online" ? "Online" : "Degraded"}</span>
              </div>
              <div className="network-card__metrics">
                <span><small>Latency</small><strong>{item.latency}</strong></span>
                <span><small>Uptime</small><strong>{item.uptime}</strong></span>
              </div>
              <div className="network-card__track" aria-hidden="true">
                <span style={{ width: `${item.uptimeValue}%` }} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
