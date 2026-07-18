/**
 * NetworkStatus — Network Health / API Status monitoring cards.
 *
 * Displays live-looking status indicators for NEXORA's backend services.
 * No props needed — uses self-contained static sample data.
 */

const NETWORK_ITEMS = [
  {
    id: 1,
    name: 'Deal Aggregator API',
    latency: '24ms',
    uptime: '99.98%',
    status: 'online',
  },
  {
    id: 2,
    name: 'Giveaway Tracker',
    latency: '31ms',
    uptime: '99.95%',
    status: 'online',
  },
  {
    id: 3,
    name: 'Price Alert Engine',
    latency: '18ms',
    uptime: '100%',
    status: 'online',
  },
  {
    id: 4,
    name: 'Sentinel AI Core',
    latency: '142ms',
    uptime: '99.87%',
    status: 'degraded',
  },
]

function NetworkStatus() {
  return (
    <section className="nx-network">
      <div className="nx-section-header">
        <h2 className="nx-section-header__title">🌐 Network Health</h2>
        <span className="nx-network__live-badge">
          <span className="nx-network__live-dot" />
          All Systems Monitored
        </span>
      </div>

      <div className="nx-network__grid">
        {NETWORK_ITEMS.map((item) => (
          <div className="nx-network__card" key={item.id}>
            {/* Status indicator bar at top of card */}
            <div className={`nx-network__card-bar nx-network__card-bar--${item.status}`} />

            <div className="nx-network__card-header">
              <span className="nx-network__card-name">{item.name}</span>
              <span className={`nx-network__card-status nx-network__card-status--${item.status}`}>
                <span className="nx-network__card-status-dot" />
                {item.status === 'online' ? 'Online' : 'Degraded'}
              </span>
            </div>

            <div className="nx-network__card-metrics">
              <div className="nx-network__metric">
                <span className="nx-network__metric-label">Latency</span>
                <span className="nx-network__metric-value">{item.latency}</span>
              </div>
              <div className="nx-network__metric">
                <span className="nx-network__metric-label">Uptime</span>
                <span className="nx-network__metric-value">{item.uptime}</span>
              </div>
            </div>

            {/* Fake latency bar visualisation */}
            <div className="nx-network__bar-track">
              <div
                className={`nx-network__bar-fill nx-network__bar-fill--${item.status}`}
                style={{ width: item.uptime }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default NetworkStatus
