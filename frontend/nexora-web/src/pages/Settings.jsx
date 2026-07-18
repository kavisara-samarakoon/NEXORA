/**
 * Settings — User preferences and app configuration.
 *
 * Placeholder page with static sample content.
 * Backend integration will be added later.
 */

const SETTINGS_SECTIONS = [
  {
    id: 'profile',
    title: '👤 Profile',
    items: [
      { label: 'Display Name', value: 'GamerX_2024', type: 'text' },
      { label: 'Email', value: 'gamer@nexora.gg', type: 'text' },
      { label: 'Language', value: 'English (US)', type: 'text' },
    ],
  },
  {
    id: 'notifications',
    title: '🔔 Notifications',
    items: [
      { label: 'Deal Alerts', value: true, type: 'toggle' },
      { label: 'Giveaway Reminders', value: true, type: 'toggle' },
      { label: 'Price Drop Notifications', value: true, type: 'toggle' },
      { label: 'Weekly Digest Email', value: false, type: 'toggle' },
    ],
  },
  {
    id: 'appearance',
    title: '🎨 Appearance',
    items: [
      { label: 'Theme', value: 'Dark Mode', type: 'text' },
      { label: 'Accent Color', value: 'NEXORA Orange', type: 'text' },
      { label: 'Compact Mode', value: false, type: 'toggle' },
    ],
  },
]

function Settings() {
  return (
    <div className="nx-content">
      {/* Page header */}
      <div className="nx-page-header">
        <div className="nx-page-header__text">
          <h1 className="nx-page-header__title">
            ⚙️ <span>Settings</span>
          </h1>
          <p className="nx-page-header__desc">
            Customize your NEXORA experience. Manage your profile, notification
            preferences, and display settings.
          </p>
        </div>
      </div>

      {/* Settings sections */}
      {SETTINGS_SECTIONS.map((section) => (
        <div key={section.id} className="nx-glass-card">
          <h3 className="nx-placeholder-card__title" style={{ marginBottom: '20px' }}>
            {section.title}
          </h3>

          <div className="nx-settings-list">
            {section.items.map((item, index) => (
              <div key={index} className="nx-settings-item">
                <div className="nx-settings-item__info">
                  <span className="nx-settings-item__label">{item.label}</span>
                </div>

                {item.type === 'toggle' ? (
                  <div className={`nx-toggle ${item.value ? 'nx-toggle--on' : ''}`}>
                    <div className="nx-toggle__track">
                      <div className="nx-toggle__thumb" />
                    </div>
                  </div>
                ) : (
                  <span className="nx-settings-item__value">{item.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Danger zone */}
      <div className="nx-glass-card nx-glass-card--accent-red">
        <h3 className="nx-placeholder-card__title">⚠️ Danger Zone</h3>
        <p className="nx-placeholder-card__meta" style={{ marginBottom: '16px' }}>
          Irreversible actions — proceed with caution.
        </p>
        <div className="nx-filter-row">
          <button className="nx-filter-chip nx-filter-chip--danger">Delete Account</button>
          <button className="nx-filter-chip nx-filter-chip--danger">Clear All Data</button>
        </div>
      </div>
    </div>
  )
}

export default Settings
