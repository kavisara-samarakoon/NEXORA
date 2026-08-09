/**
 * Settings — Premium "Account Control Center" page.
 *
 * Features:
 * - Cyber-themed page header with animated gradient title
 * - Profile summary glass card with avatar initials
 * - Settings sections: Profile, Notifications, Security, Connected Platforms, Appearance
 * - Toggle-style UI controls (static demo state)
 * - Connected platform cards (Steam, Epic, GOG, Prime Gaming)
 * - Account System Status side panel
 * - Demo disclaimer banner
 *
 * All data is static. Backend persistence will be added later.
 */

/* ── Static toggle states (demo only, not wired to state) ── */
const PROFILE_FIELDS = [
  { label: 'Display Name', value: 'Kavisara', icon: '👤' },
  { label: 'Email', value: 'gamer@nexora.gg', icon: '📧' },
  { label: 'Language', value: 'English (US)', icon: '🌐' },
  { label: 'Timezone', value: 'Asia/Colombo (UTC+5:30)', icon: '🕐' },
]

const NOTIFICATION_ITEMS = [
  { label: 'Deal Alerts', desc: 'Get notified when a tracked game drops in price', on: true },
  { label: 'Giveaway Reminders', desc: 'Alerts before free game claim windows close', on: true },
  { label: 'Price Drop Notifications', desc: 'Push notifications for wishlist price drops', on: true },
  { label: 'Weekly Digest Email', desc: 'Summary of weekly deals and giveaways', on: false },
  { label: 'Security Alerts', desc: 'Login attempts and session change notifications', on: true },
]

const SECURITY_PREFS = [
  { label: 'Two-Factor Authentication', desc: 'Protect with authenticator app', on: true },
  { label: 'Login Notifications', desc: 'Alert on new device sign-ins', on: true },
  { label: 'Auto Session Timeout', desc: 'End sessions after 30 min inactivity', on: false },
  { label: 'API Key Visibility', desc: 'Mask API keys in dashboard', on: true },
]

const CONNECTED_PLATFORMS = [
  { name: 'Steam', key: 'steam', connected: true, username: '@kavisara_steam' },
  { name: 'Epic Games', key: 'epic', connected: true, username: '@kavisara_epic' },
  { name: 'GOG', key: 'gog', connected: false, username: '' },
  { name: 'Prime Gaming', key: 'prime', connected: false, username: '' },
]

const APPEARANCE_ITEMS = [
  { label: 'Dark Mode', desc: 'Use dark theme across the interface', on: true },
  { label: 'Liquid Glass Effects', desc: 'Enable glassmorphism and blur effects', on: true },
  { label: 'Accent Color: NEXORA Orange', desc: 'Primary accent for interactive elements', on: true },
  { label: 'Compact Mode', desc: 'Reduce padding and card sizes', on: false },
  { label: 'Animations', desc: 'Enable micro-animations and transitions', on: true },
]

function Settings() {
  return (
    <div className="nx-content">
      {/* ═══════════ PAGE HEADER ═══════════ */}
      <div className="st-header">
        {/* Decorative orbs */}
        <div className="st-header__orb st-header__orb--orange" />
        <div className="st-header__orb st-header__orb--purple" />

        {/* Scanlines */}
        <div className="st-header__scanlines" />

        <div className="st-header__inner">
          <div className="st-header__text">
            <div className="st-header__tag">
              <span className="st-header__tag-dot" />
              <span>ACCOUNT CONTROL</span>
            </div>
            <h1 className="st-header__title">
              ⚙️ <span>Account Control Center</span>
            </h1>
            <p className="st-header__desc">
              Profile preferences, notification settings, security options,
              and future connected platform management — all in one place.
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════ DEMO DISCLAIMER ═══════════ */}
      <div className="st-disclaimer">
        <span className="st-disclaimer__icon">ℹ️</span>
        <div className="st-disclaimer__text">
          <strong>Frontend Settings Demo</strong> — Toggles and fields are
          visual-only. Backend persistence for account settings will be added
          in a future sprint.
        </div>
      </div>

      {/* ═══════════ MAIN CONTENT AREA ═══════════ */}
      <div className="st-layout">
        {/* ── Left content ── */}
        <div className="st-content">

          {/* ── Profile Summary Card ── */}
          <div className="st-profile">
            <div className="st-profile__avatar">
              <span className="st-profile__initials">KS</span>
            </div>
            <div className="st-profile__info">
              <h2 className="st-profile__name">Kavisara</h2>
              <span className="st-profile__type">Demo User</span>
              <span className="st-profile__status">
                <span className="st-profile__status-dot" />
                Secure Demo Profile
              </span>
            </div>
            <button className="st-profile__edit-btn">✏️ Edit Profile</button>
          </div>

          {/* ── Profile Preferences ── */}
          <section>
            <div className="st-section-header">
              <h2 className="st-section-header__title">👤 Profile Preferences</h2>
            </div>
            <div className="st-fields">
              {PROFILE_FIELDS.map((field) => (
                <div key={field.label} className="st-field">
                  <span className="st-field__icon">{field.icon}</span>
                  <div className="st-field__info">
                    <span className="st-field__label">{field.label}</span>
                    <span className="st-field__value">{field.value}</span>
                  </div>
                  <button className="st-field__edit">Edit</button>
                </div>
              ))}
            </div>
          </section>

          {/* ── Notification Preferences ── */}
          <section>
            <div className="st-section-header">
              <h2 className="st-section-header__title">🔔 Notification Preferences</h2>
            </div>
            <div className="st-toggles">
              {NOTIFICATION_ITEMS.map((item) => (
                <div key={item.label} className="st-toggle-row">
                  <div className="st-toggle-row__info">
                    <span className="st-toggle-row__label">{item.label}</span>
                    <span className="st-toggle-row__desc">{item.desc}</span>
                  </div>
                  <div className={`st-toggle ${item.on ? 'st-toggle--on' : ''}`}>
                    <div className="st-toggle__track">
                      <div className="st-toggle__thumb" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Security Preferences ── */}
          <section>
            <div className="st-section-header">
              <h2 className="st-section-header__title">🔐 Security Preferences</h2>
            </div>
            <div className="st-toggles">
              {SECURITY_PREFS.map((item) => (
                <div key={item.label} className="st-toggle-row">
                  <div className="st-toggle-row__info">
                    <span className="st-toggle-row__label">{item.label}</span>
                    <span className="st-toggle-row__desc">{item.desc}</span>
                  </div>
                  <div className={`st-toggle ${item.on ? 'st-toggle--on' : ''}`}>
                    <div className="st-toggle__track">
                      <div className="st-toggle__thumb" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Connected Platforms ── */}
          <section>
            <div className="st-section-header">
              <h2 className="st-section-header__title">🔗 Connected Platforms</h2>
            </div>
            <div className="st-platforms">
              {CONNECTED_PLATFORMS.map((p) => (
                <div key={p.key} className={`st-platform st-platform--${p.key}`}>
                  <div className={`st-platform__accent st-platform__accent--${p.key}`} />
                  <div className="st-platform__info">
                    <span className="st-platform__name">{p.name}</span>
                    {p.connected ? (
                      <span className="st-platform__user">{p.username}</span>
                    ) : (
                      <span className="st-platform__unlinked">Not connected</span>
                    )}
                  </div>
                  <span className={`st-platform__badge ${p.connected ? 'st-platform__badge--linked' : 'st-platform__badge--unlinked'}`}>
                    {p.connected ? 'Linked' : 'Connect'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Appearance & Liquid Glass Theme ── */}
          <section>
            <div className="st-section-header">
              <h2 className="st-section-header__title">🎨 Appearance & Liquid Glass Theme</h2>
            </div>
            <div className="st-toggles">
              {APPEARANCE_ITEMS.map((item) => (
                <div key={item.label} className="st-toggle-row">
                  <div className="st-toggle-row__info">
                    <span className="st-toggle-row__label">{item.label}</span>
                    <span className="st-toggle-row__desc">{item.desc}</span>
                  </div>
                  <div className={`st-toggle ${item.on ? 'st-toggle--on' : ''}`}>
                    <div className="st-toggle__track">
                      <div className="st-toggle__thumb" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Danger Zone ── */}
          <section>
            <div className="st-danger">
              <div className="st-danger__header">
                <h2 className="st-danger__title">⚠️ Danger Zone</h2>
                <p className="st-danger__desc">Irreversible actions — proceed with caution.</p>
              </div>
              <div className="st-danger__actions">
                <button className="st-danger__btn">Delete Account</button>
                <button className="st-danger__btn">Clear All Data</button>
              </div>
            </div>
          </section>
        </div>

        {/* ── Account System Status panel ── */}
        <aside className="st-network">
          <div className="st-network__header">
            <span className="st-network__icon">📡</span>
            <h3 className="st-network__title">Account System Status</h3>
            <span className="st-network__live">
              <span className="st-network__live-dot" />
              DEMO
            </span>
          </div>

          <div className="st-network__items">
            {/* Profile */}
            <div className="st-network__item">
              <div className="st-network__item-icon st-network__item-icon--orange">
                👤
              </div>
              <div className="st-network__item-info">
                <span className="st-network__item-label">Profile</span>
                <span className="st-network__item-value">Demo Mode</span>
              </div>
              <span className="st-network__item-badge st-network__item-badge--demo">
                DEMO
              </span>
            </div>

            {/* Notifications */}
            <div className="st-network__item">
              <div className="st-network__item-icon st-network__item-icon--blue">
                🔔
              </div>
              <div className="st-network__item-info">
                <span className="st-network__item-label">Notifications</span>
                <span className="st-network__item-value">UI Ready</span>
              </div>
              <span className="st-network__item-badge st-network__item-badge--ready">
                READY
              </span>
            </div>

            {/* Platform Links */}
            <div className="st-network__item">
              <div className="st-network__item-icon st-network__item-icon--purple">
                🔗
              </div>
              <div className="st-network__item-info">
                <span className="st-network__item-label">Platform Links</span>
                <span className="st-network__item-value">
                  Future backend support
                </span>
              </div>
              <span className="st-network__item-badge st-network__item-badge--future">
                FUTURE
              </span>
            </div>

            {/* Security */}
            <div className="st-network__item">
              <div className="st-network__item-icon st-network__item-icon--green">
                🛡️
              </div>
              <div className="st-network__item-info">
                <span className="st-network__item-label">Security</span>
                <span className="st-network__item-value">
                  Planned session controls
                </span>
              </div>
              <span className="st-network__item-badge st-network__item-badge--planned">
                PLANNED
              </span>
            </div>
          </div>

          {/* Quick account info */}
          <div className="st-network__account">
            <div className="st-network__account-label">Account Overview</div>
            <div className="st-network__account-rows">
              <div className="st-network__account-row">
                <span className="st-network__account-key">Account Type</span>
                <span className="st-network__account-val">Demo</span>
              </div>
              <div className="st-network__account-row">
                <span className="st-network__account-key">Member Since</span>
                <span className="st-network__account-val">2025</span>
              </div>
              <div className="st-network__account-row">
                <span className="st-network__account-key">Linked Platforms</span>
                <span className="st-network__account-val">2 / 4</span>
              </div>
              <div className="st-network__account-row">
                <span className="st-network__account-key">Active Alerts</span>
                <span className="st-network__account-val">4</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Settings
