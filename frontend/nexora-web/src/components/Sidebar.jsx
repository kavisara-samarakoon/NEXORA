/**
 * Sidebar — Left navigation panel with NEXORA branding.
 *
 * Props:
 *   isOpen      (boolean) — whether the sidebar is visible on mobile
 *   onClose     (function) — callback to close the sidebar
 */

/* Navigation items — kept here because they belong to the sidebar */
const NAV_ITEMS = [
  { icon: '🏠', label: 'Dashboard', active: true },
  { icon: '🔥', label: 'Deals', badge: '24' },
  { icon: '🎁', label: 'Giveaways', badge: '7' },
  { icon: '📋', label: 'Wishlist' },
  { icon: '🔔', label: 'Alerts' },
  { icon: '📊', label: 'Analytics' },
]

const NAV_SYSTEM = [
  { icon: '🛡️', label: 'Security' },
  { icon: '⚙️', label: 'Settings' },
]

function Sidebar({ isOpen, onClose }) {
  return (
    <aside className={`nx-sidebar ${isOpen ? 'nx-sidebar--open' : ''}`}>
      {/* Brand */}
      <div className="nx-sidebar__brand">
        <div className="nx-sidebar__logo">N</div>
        <div>
          <div className="nx-sidebar__title">NEXORA</div>
          <div className="nx-sidebar__subtitle">Game Hub</div>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="nx-sidebar__nav">
        <span className="nx-sidebar__section-label">Main Menu</span>

        {NAV_ITEMS.map((item) => (
          <a
            key={item.label}
            href="#"
            className={`nx-sidebar__link ${item.active ? 'nx-sidebar__link--active' : ''}`}
            onClick={(e) => { e.preventDefault(); onClose(); }}
          >
            <span className="nx-sidebar__link-icon">{item.icon}</span>
            {item.label}
            {item.badge && <span className="nx-sidebar__badge">{item.badge}</span>}
          </a>
        ))}

        <span className="nx-sidebar__section-label">System</span>

        {NAV_SYSTEM.map((item) => (
          <a
            key={item.label}
            href="#"
            className="nx-sidebar__link"
            onClick={(e) => { e.preventDefault(); onClose(); }}
          >
            <span className="nx-sidebar__link-icon">{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>

      {/* Footer */}
      <div className="nx-sidebar__footer">
        <a href="#" className="nx-sidebar__link" onClick={(e) => e.preventDefault()}>
          <span className="nx-sidebar__link-icon">❓</span>
          Help &amp; Support
        </a>
      </div>
    </aside>
  )
}

export default Sidebar
