import {
  networkItems,
  securityItems,
  type SecurityItem,
} from "@/data/dashboard";

function SecurityIcon({ icon }: Pick<SecurityItem, "icon">) {
  if (icon === "lock") {
    return <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>;
  }

  if (icon === "network") {
    return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>;
  }

  if (icon === "warning") {
    return <svg viewBox="0 0 24 24"><path d="m12 3 10 18H2zM12 9v5M12 18h.01" /></svg>;
  }

  return <svg viewBox="0 0 24 24"><path d="M12 3 5 7v5c0 4 2.7 7.1 7 9 4.3-1.9 7-5 7-9V7zM9 12h.01M15 12h.01M10 16h4" /></svg>;
}

export default function StatusPanels() {
  return (
    <div className="status-panels">
      <section className="status-panel" aria-labelledby="security-title">
        <div className="status-panel__heading">
          <div className="status-panel__heading-icon status-panel__heading-icon--orange" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 3 5 7v5c0 4 2.7 7.1 7 9 4.3-1.9 7-5 7-9V7z" /><path d="m9 12 2 2 4-4" /></svg>
          </div>
          <div>
            <span>Protection layer</span>
            <h2 id="security-title">Cyber security status</h2>
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
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
            </div>
            <div>
              <span>Service monitor</span>
              <h2 id="network-title">Network health</h2>
            </div>
          </div>
          <span className="network-live"><span aria-hidden="true" /> Monitored</span>
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
