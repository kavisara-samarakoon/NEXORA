/**
 * Security — Account security overview and protection settings.
 *
 * Placeholder page with static sample content.
 * Backend integration will be added later.
 */

const SECURITY_ITEMS = [
  {
    id: 1,
    icon: '🔐',
    label: 'Two-Factor Auth',
    description: 'Protect your account with 2FA via authenticator app',
    status: 'Enabled',
    ok: true,
  },
  {
    id: 2,
    icon: '🔑',
    label: 'Password Strength',
    description: 'Last changed 45 days ago',
    status: 'Strong',
    ok: true,
  },
  {
    id: 3,
    icon: '📧',
    label: 'Email Verification',
    description: 'gamer@nexora.gg — verified',
    status: 'Verified',
    ok: true,
  },
  {
    id: 4,
    icon: '🌐',
    label: 'Active Sessions',
    description: '2 devices currently logged in',
    status: 'Review',
    ok: false,
  },
  {
    id: 5,
    icon: '🛡️',
    label: 'Login Alerts',
    description: 'Get notified of new sign-ins from unknown devices',
    status: 'Enabled',
    ok: true,
  },
]

const LOGIN_HISTORY = [
  { id: 1, device: 'MacBook Pro — Chrome', location: 'Colombo, LK', time: '2 hours ago', current: true },
  { id: 2, device: 'iPhone 15 — Safari', location: 'Colombo, LK', time: '1 day ago', current: false },
  { id: 3, device: 'Windows PC — Firefox', location: 'London, UK', time: '3 days ago', current: false },
]

function Security() {
  return (
    <div className="nx-content">
      {/* Page header */}
      <div className="nx-page-header">
        <div className="nx-page-header__text">
          <h1 className="nx-page-header__title">
            🛡️ <span>Security</span>
          </h1>
          <p className="nx-page-header__desc">
            Monitor and manage your account security. Keep your gaming assets
            and personal data safe with NEXORA's protection layers.
          </p>
        </div>

        <div className="nx-page-stats">
          <div className="nx-page-stat">
            <span className="nx-page-stat__number nx-page-stat__number--green">92%</span>
            <span className="nx-page-stat__label">Security Score</span>
          </div>
        </div>
      </div>

      {/* Security checklist */}
      <div className="nx-grid nx-grid--2">
        {SECURITY_ITEMS.map((item) => (
          <div key={item.id} className="nx-glass-card nx-glass-card--hoverable">
            <div className="nx-placeholder-card__header">
              <span className="nx-placeholder-card__icon-lg">{item.icon}</span>
              <span className={`nx-placeholder-card__status ${item.ok ? 'nx-placeholder-card__status--live' : 'nx-placeholder-card__status--upcoming'}`}>
                {item.status}
              </span>
            </div>
            <h3 className="nx-placeholder-card__title">{item.label}</h3>
            <p className="nx-placeholder-card__meta">{item.description}</p>
          </div>
        ))}
      </div>

      {/* Login history */}
      <div className="nx-glass-card">
        <h3 className="nx-placeholder-card__title" style={{ marginBottom: '20px' }}>
          📍 Recent Login History
        </h3>
        <div className="nx-table-wrapper">
          <table className="nx-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Location</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {LOGIN_HISTORY.map((entry) => (
                <tr key={entry.id}>
                  <td className="nx-table__game-name">{entry.device}</td>
                  <td>{entry.location}</td>
                  <td>{entry.time}</td>
                  <td>
                    <span className={`nx-table__status ${entry.current ? 'nx-table__status--active' : ''}`}>
                      {entry.current ? '● Current' : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Security
