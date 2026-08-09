import { useState } from 'react'

/**
 * Wishlist — Premium "Smart Wishlist Control" page.
 *
 * Features:
 * - Cyber-themed page header with animated gradient title
 * - Summary stat panel (Wishlist Items, Price Drops, Free Alerts, Protected)
 * - Search bar in a glass panel
 * - Filter chips for stores and wishlist types
 * - Responsive grid of premium wishlist cards with alerts + buttons
 * - "Wishlist Alert Status" side panel
 * - Empty state when no results match
 *
 * All data is static. Backend integration will be added later.
 */

/* ── Static wishlist data ── */
const WISHLIST_ITEMS = [
  {
    id: 1,
    title: 'Ghost of Tsushima: DC',
    store: 'Steam',
    currentPrice: '$39.99',
    targetPrice: '$24.99',
    lowestEver: '$29.99',
    discount: '-25%',
    status: 'price-drop',
    alertActive: true,
    priority: 'high',
  },
  {
    id: 2,
    title: 'Persona 5 Royal',
    store: 'Steam',
    currentPrice: '$29.99',
    targetPrice: '$19.99',
    lowestEver: '$29.99',
    discount: '-50%',
    status: 'price-drop',
    alertActive: true,
    priority: 'high',
  },
  {
    id: 3,
    title: 'Monster Hunter Wilds',
    store: 'Epic Games',
    currentPrice: '$69.99',
    targetPrice: '$44.99',
    lowestEver: '$59.99',
    discount: '',
    status: 'tracking',
    alertActive: true,
    priority: 'medium',
  },
  {
    id: 4,
    title: 'The Witcher 4',
    store: 'GOG',
    currentPrice: 'TBA',
    targetPrice: '$49.99',
    lowestEver: '—',
    discount: '',
    status: 'tracking',
    alertActive: true,
    priority: 'low',
  },
  {
    id: 5,
    title: 'Hollow Knight: Silksong',
    store: 'Steam',
    currentPrice: 'FREE',
    targetPrice: '$0.00',
    lowestEver: 'FREE',
    discount: '-100%',
    status: 'free-now',
    alertActive: false,
    priority: 'high',
  },
  {
    id: 6,
    title: 'Starfield: Shattered Space',
    store: 'Steam',
    currentPrice: '$41.99',
    targetPrice: '$29.99',
    lowestEver: '$41.99',
    discount: '-40%',
    status: 'price-drop',
    alertActive: true,
    priority: 'medium',
  },
  {
    id: 7,
    title: 'Baldur\'s Gate 3',
    store: 'GOG',
    currentPrice: '$59.99',
    targetPrice: '$39.99',
    lowestEver: '$47.99',
    discount: '',
    status: 'tracking',
    alertActive: false,
    priority: 'low',
  },
  {
    id: 8,
    title: 'Dead Cells: Return to Castlevania',
    store: 'Epic Games',
    currentPrice: 'FREE',
    targetPrice: '$0.00',
    lowestEver: 'FREE',
    discount: '-100%',
    status: 'free-now',
    alertActive: false,
    priority: 'high',
  },
]

/* ── Filter chips ── */
const FILTER_CHIPS = [
  'All',
  'Price Drop',
  'Free Now',
  'High Priority',
  'Steam',
  'Epic Games',
  'GOG',
]

/* ── Helper: store key for CSS classes ── */
function storeKey(store) {
  switch (store) {
    case 'Steam':      return 'steam'
    case 'Epic Games': return 'epic'
    case 'GOG':        return 'gog'
    default:           return 'steam'
  }
}

/* ── Helper: status label + class ── */
function statusInfo(status) {
  switch (status) {
    case 'price-drop': return { label: '↓ Price Drop', cls: 'wl-card__status--drop' }
    case 'free-now':   return { label: '🎁 Free Now',  cls: 'wl-card__status--free' }
    case 'tracking':   return { label: '📡 Tracking',  cls: 'wl-card__status--tracking' }
    default:           return { label: '—',             cls: '' }
  }
}

/* ── Helper: priority badge ── */
function priorityInfo(priority) {
  switch (priority) {
    case 'high':   return { label: 'HIGH',   cls: 'wl-card__priority--high' }
    case 'medium': return { label: 'MED',    cls: 'wl-card__priority--med' }
    case 'low':    return { label: 'LOW',    cls: 'wl-card__priority--low' }
    default:       return { label: '',       cls: '' }
  }
}

function Wishlist() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  /* ── Filter items ── */
  const filtered = WISHLIST_ITEMS.filter((item) => {
    /* Search */
    if (
      searchQuery &&
      !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !item.store.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }

    /* Chip */
    switch (activeFilter) {
      case 'All':           return true
      case 'Price Drop':    return item.status === 'price-drop'
      case 'Free Now':      return item.status === 'free-now'
      case 'High Priority': return item.priority === 'high'
      case 'Steam':         return item.store === 'Steam'
      case 'Epic Games':    return item.store === 'Epic Games'
      case 'GOG':           return item.store === 'GOG'
      default:              return true
    }
  })

  /* ── Computed stats ── */
  const priceDrops = WISHLIST_ITEMS.filter((i) => i.status === 'price-drop').length
  const freeAlerts = WISHLIST_ITEMS.filter((i) => i.status === 'free-now').length

  return (
    <div className="nx-content">
      {/* ═══════════ PAGE HEADER ═══════════ */}
      <div className="wl-header">
        {/* Decorative orbs */}
        <div className="wl-header__orb wl-header__orb--orange" />
        <div className="wl-header__orb wl-header__orb--blue" />

        {/* Scanline decoration */}
        <div className="wl-header__scanlines" />

        <div className="wl-header__inner">
          <div className="wl-header__text">
            <div className="wl-header__tag">
              <span className="wl-header__tag-dot" />
              <span>SMART ALERTS</span>
            </div>
            <h1 className="wl-header__title">
              📋 <span>Smart Wishlist Control</span>
            </h1>
            <p className="wl-header__desc">
              Track wanted games, price drops, and free giveaways — get
              intelligent alerts and safe store redirects all in one command center.
            </p>
          </div>

          {/* Quick stats */}
          <div className="wl-header__stats">
            <div className="wl-header__stat">
              <span className="wl-header__stat-number wl-header__stat-number--orange">
                {WISHLIST_ITEMS.length}
              </span>
              <span className="wl-header__stat-label">Wishlist Items</span>
            </div>
            <div className="wl-header__stat">
              <span className="wl-header__stat-number wl-header__stat-number--blue">
                {priceDrops}
              </span>
              <span className="wl-header__stat-label">Price Drops</span>
            </div>
            <div className="wl-header__stat">
              <span className="wl-header__stat-number wl-header__stat-number--green">
                {freeAlerts}
              </span>
              <span className="wl-header__stat-label">Free Alerts</span>
            </div>
            <div className="wl-header__stat">
              <span className="wl-header__stat-number wl-header__stat-number--purple">
                🛡️
              </span>
              <span className="wl-header__stat-label">Protected</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ SEARCH + FILTER PANEL ═══════════ */}
      <div className="wl-filter-panel">
        <div className="wl-search">
          <span className="wl-search__icon">🔍</span>
          <input
            className="wl-search__input"
            type="text"
            placeholder="Search wishlist, stores, games…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="wl-search__clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="wl-chips">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip}
              className={
                'wl-chip' + (activeFilter === chip ? ' wl-chip--active' : '')
              }
              onClick={() => setActiveFilter(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════ MAIN CONTENT AREA ═══════════ */}
      <div className="wl-layout">
        {/* ── Wishlist cards grid ── */}
        <div className="wl-grid">
          {filtered.length === 0 && (
            <div className="wl-empty">
              <span className="wl-empty__icon">📡</span>
              <p className="wl-empty__text">
                No wishlist items match your current filters.
              </p>
              <button
                className="wl-empty__reset"
                onClick={() => {
                  setActiveFilter('All')
                  setSearchQuery('')
                }}
              >
                Reset Filters
              </button>
            </div>
          )}

          {filtered.map((item) => {
            const sKey = storeKey(item.store)
            const sInfo = statusInfo(item.status)
            const pInfo = priorityInfo(item.priority)
            return (
              <div key={item.id} className={`wl-card wl-card--${sKey}`}>
                {/* Accent bar */}
                <div className={`wl-card__accent wl-card__accent--${sKey}`} />

                {/* Header: store + priority */}
                <div className="wl-card__header">
                  <span className={`wl-card__store wl-card__store--${sKey}`}>
                    {item.store}
                  </span>
                  <span className={`wl-card__priority ${pInfo.cls}`}>
                    {pInfo.label}
                  </span>
                </div>

                {/* Title */}
                <h3 className="wl-card__title">{item.title}</h3>

                {/* Status + alert */}
                <div className="wl-card__status-row">
                  <span className={`wl-card__status ${sInfo.cls}`}>
                    {sInfo.label}
                  </span>
                  <span className={`wl-card__alert ${item.alertActive ? 'wl-card__alert--on' : 'wl-card__alert--off'}`}>
                    {item.alertActive ? '🔔 Alert On' : '🔕 Alert Off'}
                  </span>
                </div>

                {/* Discount badge (if any) */}
                {item.discount && (
                  <div className="wl-card__discount-badge">
                    {item.discount}
                  </div>
                )}

                {/* Prices grid */}
                <div className="wl-card__prices">
                  <div className="wl-card__price-col">
                    <span className="wl-card__price-label">Current</span>
                    <span className={`wl-card__price-value ${item.currentPrice === 'FREE' ? 'wl-card__price-value--free' : ''}`}>
                      {item.currentPrice}
                    </span>
                  </div>
                  <div className="wl-card__price-col">
                    <span className="wl-card__price-label">Target</span>
                    <span className="wl-card__price-value wl-card__price-value--target">
                      {item.targetPrice}
                    </span>
                  </div>
                  <div className="wl-card__price-col">
                    <span className="wl-card__price-label">Lowest</span>
                    <span className="wl-card__price-value">{item.lowestEver}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="wl-card__actions">
                  <button className={`wl-card__btn wl-card__btn--view wl-card__btn--view-${sKey}`}>
                    ↗ View Deal
                  </button>
                  <button className="wl-card__btn wl-card__btn--edit">
                    ✏️ Edit Alert
                  </button>
                  <button className="wl-card__btn wl-card__btn--remove">
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Wishlist Alert Status panel ── */}
        <aside className="wl-network">
          <div className="wl-network__header">
            <span className="wl-network__icon">📡</span>
            <h3 className="wl-network__title">Wishlist Alert Status</h3>
            <span className="wl-network__live">
              <span className="wl-network__live-dot" />
              DEMO
            </span>
          </div>

          <div className="wl-network__items">
            {/* Alert Engine */}
            <div className="wl-network__item">
              <div className="wl-network__item-icon wl-network__item-icon--orange">
                ⚡
              </div>
              <div className="wl-network__item-info">
                <span className="wl-network__item-label">Alert Engine</span>
                <span className="wl-network__item-value">Demo Mode</span>
              </div>
              <span className="wl-network__item-badge wl-network__item-badge--demo">
                DEMO
              </span>
            </div>

            {/* API Source */}
            <div className="wl-network__item">
              <div className="wl-network__item-icon wl-network__item-icon--blue">
                🌐
              </div>
              <div className="wl-network__item-info">
                <span className="wl-network__item-label">API Source</span>
                <span className="wl-network__item-value">Static Data</span>
              </div>
              <span className="wl-network__item-badge wl-network__item-badge--static">
                STATIC
              </span>
            </div>

            {/* Notification Queue */}
            <div className="wl-network__item">
              <div className="wl-network__item-icon wl-network__item-icon--purple">
                📬
              </div>
              <div className="wl-network__item-info">
                <span className="wl-network__item-label">Notification Queue</span>
                <span className="wl-network__item-value">
                  Future backend support
                </span>
              </div>
              <span className="wl-network__item-badge wl-network__item-badge--future">
                FUTURE
              </span>
            </div>

            {/* Security */}
            <div className="wl-network__item">
              <div className="wl-network__item-icon wl-network__item-icon--green">
                🛡️
              </div>
              <div className="wl-network__item-info">
                <span className="wl-network__item-label">Security</span>
                <span className="wl-network__item-value">
                  Account-safe alerts planned
                </span>
              </div>
              <span className="wl-network__item-badge wl-network__item-badge--planned">
                PLANNED
              </span>
            </div>
          </div>

          {/* Alert summary mini widget */}
          <div className="wl-network__summary">
            <div className="wl-network__summary-label">Alert Summary</div>
            <div className="wl-network__summary-rows">
              <div className="wl-network__summary-row">
                <span className="wl-network__summary-dot wl-network__summary-dot--active" />
                <span className="wl-network__summary-text">Active Alerts</span>
                <span className="wl-network__summary-count">
                  {WISHLIST_ITEMS.filter((i) => i.alertActive).length}
                </span>
              </div>
              <div className="wl-network__summary-row">
                <span className="wl-network__summary-dot wl-network__summary-dot--paused" />
                <span className="wl-network__summary-text">Paused</span>
                <span className="wl-network__summary-count">
                  {WISHLIST_ITEMS.filter((i) => !i.alertActive).length}
                </span>
              </div>
              <div className="wl-network__summary-row">
                <span className="wl-network__summary-dot wl-network__summary-dot--drop" />
                <span className="wl-network__summary-text">Price Drops</span>
                <span className="wl-network__summary-count">{priceDrops}</span>
              </div>
              <div className="wl-network__summary-row">
                <span className="wl-network__summary-dot wl-network__summary-dot--free" />
                <span className="wl-network__summary-text">Free Now</span>
                <span className="wl-network__summary-count">{freeAlerts}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Wishlist
