import { NavLink } from 'react-router-dom'

/**
 * Sidebar — Left navigation panel with NEXORA branding.
 *
 * Props:
 *   isOpen      (boolean) — whether the sidebar is visible on mobile
 *   onClose     (function) — callback to close the sidebar
 *
 * Uses NavLink from react-router-dom so the browser URL updates
 * and the active link gets highlighted automatically.
 */

/* Navigation items — each has a route path */
const NAV_ITEMS = [
  { icon: '🏠', label: 'Dashboard', path: '/' },
  { icon: '🔥', label: 'Deals', path: '/deals', badge: '24' },
  { icon: '🎁', label: 'Giveaways', path: '/giveaways', badge: '7' },
  { icon: '📋', label: 'Wishlist', path: '/wishlist' },
  { icon: '🛡️', label: 'Security', path: '/security' },
  { icon: '🤖', label: 'Sentinel', path: '/sentinel' },
]

const NAV_SYSTEM = [
  { icon: '⚙️', label: 'Settings', path: '/settings' },
]

function Sidebar({ isOpen, onClose }) {
  return (
    <aside className={`nx-sidebar ${isOpen ? 'nx-sidebar--open' : ''}`}>
      {/* Brand */}
      <div className="nx-sidebar__brand">
        <img
          src="/brand/nexora-logo.png"
          alt="NEXORA logo"
          className="nx-sidebar__logo"
        />
        <div>
          <div className="nx-sidebar__title">NEXORA</div>
          <div className="nx-sidebar__subtitle">Game Hub</div>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="nx-sidebar__nav">
        <span className="nx-sidebar__section-label">Main Menu</span>

        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `nx-sidebar__link ${isActive ? 'nx-sidebar__link--active' : ''}`
            }
            onClick={onClose}
          >
            <span className="nx-sidebar__link-icon">{item.icon}</span>
            {item.label}
            {item.badge && <span className="nx-sidebar__badge">{item.badge}</span>}
          </NavLink>
        ))}

        <span className="nx-sidebar__section-label">System</span>

        {NAV_SYSTEM.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) =>
              `nx-sidebar__link ${isActive ? 'nx-sidebar__link--active' : ''}`
            }
            onClick={onClose}
          >
            <span className="nx-sidebar__link-icon">{item.icon}</span>
            {item.label}
          </NavLink>
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
