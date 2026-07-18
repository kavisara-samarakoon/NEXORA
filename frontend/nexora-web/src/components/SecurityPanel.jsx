/**
 * SecurityPanel — Displays the cyber security status dashboard.
 *
 * No props needed — security items are self-contained static data for now.
 */

const SECURITY_ITEMS = [
  {
    id: 1,
    icon: '🔒',
    iconStyle: 'green',
    label: 'SSL / TLS Encryption',
    value: 'All connections encrypted',
    status: 'Secure',
    statusType: 'ok',
  },
  {
    id: 2,
    icon: '🌐',
    iconStyle: 'blue',
    label: 'Network Firewall',
    value: '3 threats blocked today',
    status: 'Active',
    statusType: 'ok',
  },
  {
    id: 3,
    icon: '⚠️',
    iconStyle: 'orange',
    label: 'DDoS Protection',
    value: 'Monitoring 12 endpoints',
    status: 'Warning',
    statusType: 'warn',
  },
  {
    id: 4,
    icon: '🤖',
    iconStyle: 'purple',
    label: 'AI Threat Detection',
    value: 'Sentinel scanning active',
    status: 'Online',
    statusType: 'ok',
  },
]

function SecurityPanel() {
  return (
    <section className="nx-security">
      <h2 className="nx-security__title">
        <span className="nx-security__title-icon">🛡️</span>
        Cyber Security Status
      </h2>

      <div className="nx-security__items">
        {SECURITY_ITEMS.map((s) => (
          <div className="nx-security__item" key={s.id}>
            <div className={`nx-security__item-icon nx-security__item-icon--${s.iconStyle}`}>
              {s.icon}
            </div>
            <div className="nx-security__item-info">
              <div className="nx-security__item-label">{s.label}</div>
              <div className="nx-security__item-value">{s.value}</div>
            </div>
            <span className={`nx-security__item-status nx-security__item-status--${s.statusType}`}>
              {s.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default SecurityPanel
