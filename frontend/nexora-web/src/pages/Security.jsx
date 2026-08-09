/**
 * Security — Premium "Cyber Security Command Center" page.
 *
 * Features:
 * - Cyber-themed page header with animated gradient title
 * - Summary stat panel (Security Score, Active Sessions, Protected APIs, Alerts)
 * - Account Protection section with 4 security items
 * - API & Network Protection section with 4 planned items
 * - Security Activity Timeline with static events
 * - Security Operations Status side panel
 * - Demo disclaimer banner
 *
 * All data is static. Backend security will be added later.
 */

import { ACCOUNT_ITEMS, NETWORK_ITEMS, TIMELINE_EVENTS } from '../data/security'

/* ── Helper: status badge class ── */
function statusBadgeClass(type) {
  switch (type) {
    case 'ok':      return 'sc-item__badge--ok'
    case 'warn':    return 'sc-item__badge--warn'
    case 'planned': return 'sc-item__badge--planned'
    default:        return ''
  }
}

/* ── Helper: timeline event class ── */
function timelineClass(type) {
  switch (type) {
    case 'success': return 'sc-timeline__dot--success'
    case 'warn':    return 'sc-timeline__dot--warn'
    case 'info':    return 'sc-timeline__dot--info'
    default:        return ''
  }
}

function Security() {
  return (
    <div className="nx-content">
      {/* ═══════════ PAGE HEADER ═══════════ */}
      <div className="sc-header">
        {/* Decorative orbs */}
        <div className="sc-header__orb sc-header__orb--green" />
        <div className="sc-header__orb sc-header__orb--blue" />

        {/* Scanlines */}
        <div className="sc-header__scanlines" />

        <div className="sc-header__inner">
          <div className="sc-header__text">
            <div className="sc-header__tag">
              <span className="sc-header__tag-dot" />
              <span>DEFENSE ACTIVE</span>
            </div>
            <h1 className="sc-header__title">
              🛡️ <span>Cyber Security Command Center</span>
            </h1>
            <p className="sc-header__desc">
              Account protection, API safety, session monitoring, and secure
              game platform access — your digital perimeter in one command center.
            </p>
          </div>

          {/* Quick stats */}
          <div className="sc-header__stats">
            <div className="sc-header__stat">
              <span className="sc-header__stat-number sc-header__stat-number--green">
                92%
              </span>
              <span className="sc-header__stat-label">Security Score</span>
            </div>
            <div className="sc-header__stat">
              <span className="sc-header__stat-number sc-header__stat-number--blue">
                2
              </span>
              <span className="sc-header__stat-label">Active Sessions</span>
            </div>
            <div className="sc-header__stat">
              <span className="sc-header__stat-number sc-header__stat-number--orange">
                4
              </span>
              <span className="sc-header__stat-label">Protected APIs</span>
            </div>
            <div className="sc-header__stat">
              <span className="sc-header__stat-number sc-header__stat-number--red">
                1
              </span>
              <span className="sc-header__stat-label">Alerts Detected</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ DEMO DISCLAIMER ═══════════ */}
      <div className="sc-disclaimer">
        <span className="sc-disclaimer__icon">ℹ️</span>
        <div className="sc-disclaimer__text">
          <strong>Frontend Security Demo</strong> — This page demonstrates the
          planned security UI. Backend security implementation (auth, encryption,
          session management) will be added in a future sprint.
        </div>
      </div>

      {/* ═══════════ MAIN CONTENT AREA ═══════════ */}
      <div className="sc-layout">
        {/* ── Left content ── */}
        <div className="sc-content">

          {/* ── Account Protection ── */}
          <section>
            <div className="sc-section-header">
              <h2 className="sc-section-header__title">🔐 Account Protection</h2>
              <span className="sc-section-header__badge sc-section-header__badge--ok">
                3/4 Secure
              </span>
            </div>
            <div className="sc-items-grid">
              {ACCOUNT_ITEMS.map((item) => (
                <div key={item.id} className="sc-item">
                  <div className="sc-item__icon-box">
                    <span className="sc-item__icon">{item.icon}</span>
                  </div>
                  <div className="sc-item__info">
                    <div className="sc-item__top">
                      <span className="sc-item__label">{item.label}</span>
                      <span className={`sc-item__badge ${statusBadgeClass(item.statusType)}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="sc-item__desc">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── API & Network Protection ── */}
          <section>
            <div className="sc-section-header">
              <h2 className="sc-section-header__title">🌐 API & Network Protection</h2>
              <span className="sc-section-header__badge sc-section-header__badge--planned">
                Roadmap
              </span>
            </div>
            <div className="sc-items-grid">
              {NETWORK_ITEMS.map((item) => (
                <div key={item.id} className="sc-item sc-item--planned">
                  <div className="sc-item__icon-box sc-item__icon-box--planned">
                    <span className="sc-item__icon">{item.icon}</span>
                  </div>
                  <div className="sc-item__info">
                    <div className="sc-item__top">
                      <span className="sc-item__label">{item.label}</span>
                      <span className={`sc-item__badge ${statusBadgeClass(item.statusType)}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="sc-item__desc">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Security Activity Timeline ── */}
          <section>
            <div className="sc-section-header">
              <h2 className="sc-section-header__title">📍 Security Activity Timeline</h2>
            </div>
            <div className="sc-timeline">
              {TIMELINE_EVENTS.map((event) => (
                <div key={event.id} className="sc-timeline__event">
                  <div className="sc-timeline__line">
                    <span className={`sc-timeline__dot ${timelineClass(event.type)}`} />
                  </div>
                  <div className="sc-timeline__body">
                    <div className="sc-timeline__header">
                      <span className="sc-timeline__event-icon">{event.icon}</span>
                      <span className="sc-timeline__event-title">{event.title}</span>
                      <span className="sc-timeline__event-time">{event.time}</span>
                    </div>
                    <p className="sc-timeline__event-detail">{event.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Security Operations Status panel ── */}
        <aside className="sc-network">
          <div className="sc-network__header">
            <span className="sc-network__icon">📡</span>
            <h3 className="sc-network__title">Security Ops Status</h3>
            <span className="sc-network__live">
              <span className="sc-network__live-dot" />
              DEMO
            </span>
          </div>

          <div className="sc-network__items">
            {/* Auth Layer */}
            <div className="sc-network__item">
              <div className="sc-network__item-icon sc-network__item-icon--green">
                🔐
              </div>
              <div className="sc-network__item-info">
                <span className="sc-network__item-label">Auth Layer</span>
                <span className="sc-network__item-value">Demo Mode</span>
              </div>
              <span className="sc-network__item-badge sc-network__item-badge--demo">
                DEMO
              </span>
            </div>

            {/* API Security */}
            <div className="sc-network__item">
              <div className="sc-network__item-icon sc-network__item-icon--orange">
                🔒
              </div>
              <div className="sc-network__item-info">
                <span className="sc-network__item-label">API Security</span>
                <span className="sc-network__item-value">Planned</span>
              </div>
              <span className="sc-network__item-badge sc-network__item-badge--planned">
                PLANNED
              </span>
            </div>

            {/* Monitoring */}
            <div className="sc-network__item">
              <div className="sc-network__item-icon sc-network__item-icon--blue">
                📊
              </div>
              <div className="sc-network__item-info">
                <span className="sc-network__item-label">Monitoring</span>
                <span className="sc-network__item-value">UI Ready</span>
              </div>
              <span className="sc-network__item-badge sc-network__item-badge--ready">
                READY
              </span>
            </div>

            {/* Incident Response */}
            <div className="sc-network__item">
              <div className="sc-network__item-icon sc-network__item-icon--purple">
                🚨
              </div>
              <div className="sc-network__item-info">
                <span className="sc-network__item-label">Incident Response</span>
                <span className="sc-network__item-value">
                  Future backend support
                </span>
              </div>
              <span className="sc-network__item-badge sc-network__item-badge--future">
                FUTURE
              </span>
            </div>
          </div>

          {/* Security score ring */}
          <div className="sc-network__score">
            <div className="sc-network__score-label">Overall Score</div>
            <div className="sc-network__score-ring">
              <svg viewBox="0 0 120 120" className="sc-network__score-svg">
                <circle
                  cx="60" cy="60" r="50"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="8"
                />
                <circle
                  cx="60" cy="60" r="50"
                  fill="none"
                  stroke="url(#scoreGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${0.92 * 314} ${314}`}
                  strokeDashoffset="0"
                  transform="rotate(-90 60 60)"
                  className="sc-network__score-arc"
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#00D4FF" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="sc-network__score-value">92%</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Security
