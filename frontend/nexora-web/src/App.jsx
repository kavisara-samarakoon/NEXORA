import { useState } from 'react'
import './App.css'

/* ──────────────────────────────────────────────
   STATIC SAMPLE DATA
   ────────────────────────────────────────────── */

const NAV_ITEMS = [
  { icon: '🏠', label: 'Dashboard',   active: true },
  { icon: '🔥', label: 'Deals',       badge: '24' },
  { icon: '🎁', label: 'Giveaways',   badge: '7' },
  { icon: '📋', label: 'Wishlist' },
  { icon: '🔔', label: 'Alerts' },
  { icon: '📊', label: 'Analytics' },
]

const NAV_SYSTEM = [
  { icon: '🛡️', label: 'Security' },
  { icon: '⚙️', label: 'Settings' },
]

const GIVEAWAYS = [
  {
    id: 1,
    platform: 'steam',
    platformLabel: 'Steam',
    title: 'Cyber Shadow',
    meta: 'Action · Platformer · Indie',
    timer: '2d 14h 32m left',
  },
  {
    id: 2,
    platform: 'epic',
    platformLabel: 'Epic Games',
    title: 'Star Wars Battlefront II',
    meta: 'Action · Shooter · Multiplayer',
    timer: '5d 06h 12m left',
  },
  {
    id: 3,
    platform: 'gog',
    platformLabel: 'GOG',
    title: 'Shadow Warrior 2',
    meta: 'FPS · Action · Open World',
    timer: '1d 03h 45m left',
  },
]

const DEALS = [
  {
    id: 1,
    store: 'Steam Store',
    discount: '-75%',
    title: 'Elden Ring: Shadow of the Erdtree',
    priceOld: '$39.99',
    priceNew: '$9.99',
    rating: 4.8,
    stars: '★★★★★',
  },
  {
    id: 2,
    store: 'Epic Games',
    discount: '-60%',
    title: 'Cyberpunk 2077: Phantom Liberty',
    priceOld: '$29.99',
    priceNew: '$11.99',
    rating: 4.6,
    stars: '★★★★☆',
  },
  {
    id: 3,
    store: 'Humble Bundle',
    discount: '-85%',
    title: 'Hades II - Early Access',
    priceOld: '$29.99',
    priceNew: '$4.49',
    rating: 4.9,
    stars: '★★★★★',
  },
]

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

/* ──────────────────────────────────────────────
   APP COMPONENT
   ────────────────────────────────────────────── */

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="nx-layout">
      {/* ── Mobile hamburger ── */}
      <button
        className="nx-hamburger"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div className="nx-overlay nx-overlay--visible" onClick={closeSidebar} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`nx-sidebar ${sidebarOpen ? 'nx-sidebar--open' : ''}`}>
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
              onClick={(e) => { e.preventDefault(); closeSidebar(); }}
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
              onClick={(e) => { e.preventDefault(); closeSidebar(); }}
            >
              <span className="nx-sidebar__link-icon">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="nx-sidebar__footer">
          <a href="#" className="nx-sidebar__link" onClick={(e) => e.preventDefault()}>
            <span className="nx-sidebar__link-icon">❓</span>
            Help &amp; Support
          </a>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="nx-main">
        {/* Top Bar */}
        <header className="nx-topbar">
          <div className="nx-topbar__search">
            <span className="nx-topbar__search-icon">🔍</span>
            <input
              className="nx-topbar__search-input"
              type="text"
              placeholder="Search games, deals, giveaways..."
            />
          </div>
          <div className="nx-topbar__actions">
            <button className="nx-topbar__icon-btn" aria-label="Notifications">
              🔔
              <span className="nx-topbar__notif-dot" />
            </button>
            <button className="nx-topbar__icon-btn" aria-label="Messages">💬</button>
            <div className="nx-topbar__avatar">KS</div>
          </div>
        </header>

        {/* Scrollable page content */}
        <div className="nx-content">
          {/* ── HERO ── */}
          <section className="nx-hero">
            <div className="nx-hero__tag">
              <span className="nx-hero__tag-dot" />
              Live Platform
            </div>
            <h1 className="nx-hero__headline">
              Every Game. Every Deal.{' '}
              <span>One Place.</span>
            </h1>
            <p className="nx-hero__subtitle">
              Track the best game deals, discover free giveaways, manage your
              wishlists and set price-drop alerts — all powered by the NEXORA
              Sentinel AI engine.
            </p>
            <div className="nx-hero__actions">
              <button className="nx-btn nx-btn--primary">🔥 Explore Deals</button>
              <button className="nx-btn nx-btn--outline">🎁 View Giveaways</button>
            </div>
          </section>

          {/* ── LIVE GIVEAWAYS ── */}
          <section>
            <div className="nx-section-header">
              <h2 className="nx-section-header__title">🎁 Live Giveaways</h2>
              <a href="#" className="nx-section-header__more" onClick={(e) => e.preventDefault()}>
                View All →
              </a>
            </div>

            <div className="nx-grid nx-grid--3">
              {GIVEAWAYS.map((g) => (
                <div className="nx-giveaway-card" key={g.id}>
                  <span className="nx-giveaway-card__free-tag">FREE</span>
                  <span
                    className={`nx-giveaway-card__platform nx-giveaway-card__platform--${g.platform}`}
                  >
                    {g.platformLabel}
                  </span>
                  <h3 className="nx-giveaway-card__title">{g.title}</h3>
                  <p className="nx-giveaway-card__meta">{g.meta}</p>
                  <div className="nx-giveaway-card__timer">
                    <span className="nx-giveaway-card__timer-icon">⏱️</span>
                    {g.timer}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── BOTTOM ROW: BEST DEALS + SECURITY ── */}
          <div className="nx-bottom-row">
            {/* Best Deals */}
            <section>
              <div className="nx-section-header">
                <h2 className="nx-section-header__title">🔥 Best Deals</h2>
                <a href="#" className="nx-section-header__more" onClick={(e) => e.preventDefault()}>
                  View All →
                </a>
              </div>

              <div className="nx-grid nx-grid--2">
                {DEALS.map((d) => (
                  <div className="nx-deal-card" key={d.id}>
                    <div className="nx-deal-card__header">
                      <span className="nx-deal-card__store">{d.store}</span>
                      <span className="nx-deal-card__discount">{d.discount}</span>
                    </div>
                    <h3 className="nx-deal-card__title">{d.title}</h3>
                    <div className="nx-deal-card__prices">
                      <span className="nx-deal-card__price-old">{d.priceOld}</span>
                      <span className="nx-deal-card__price-new">{d.priceNew}</span>
                    </div>
                    <div className="nx-deal-card__rating">
                      <span className="nx-deal-card__stars">{d.stars}</span>
                      {d.rating}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Security Panel */}
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
          </div>
        </div>
      </main>

      {/* ── SENTINEL FLOATING BUTTON ── */}
      <button className="nx-sentinel" aria-label="Open NEXORA Sentinel AI Chat">
        <span className="nx-sentinel__icon">🤖</span>
        NEXORA Sentinel
      </button>
    </div>
  )
}

export default App
