import { useState } from 'react'
import DEALS from '../data/deals'

/**
 * Deals — Premium "Game Deals Intelligence" page.
 *
 * Features:
 * - Cyber-themed page header with animated gradient title
 * - Search bar in a glass panel
 * - Filter chips for stores and deal types
 * - Responsive grid of premium deal cards with ratings + buttons
 * - "Deal Network Status" side panel
 *
 * All data is static. Backend integration will be added later.
 */

/* ── All available filter chips ── */
const FILTER_CHIPS = [
  'All Stores',
  'Steam',
  'Epic Games',
  'GOG',
  'Humble',
  'Ubisoft',
  'Under $10',
  '50%+ Off',
  'Free Weekend',
]

/* ── Helper: which store-colour class to use ── */
function storeColorClass(store) {
  switch (store) {
    case 'Steam':      return 'steam'
    case 'Epic Games':  return 'epic'
    case 'GOG':        return 'gog'
    case 'Humble':     return 'humble'
    case 'Ubisoft':    return 'ubisoft'
    default:           return 'steam'
  }
}

/* ── Helper: status badge colour ── */
function statusClass(status) {
  switch (status) {
    case 'Historical Low':
    case 'Lowest Ever':
      return 'deals-status--hot'
    case 'Great Deal':
    case 'Good Price':
      return 'deals-status--good'
    case 'Free Weekend':
      return 'deals-status--free'
    default:
      return 'deals-status--neutral'
  }
}

/* ── Helper: parse dollar price string to number ── */
function parsePrice(priceStr) {
  if (priceStr === 'FREE') return 0
  return parseFloat(priceStr.replace('$', ''))
}

/* ── Helper: parse discount string to number ── */
function parseDiscount(discountStr) {
  return Math.abs(parseInt(discountStr.replace('%', '').replace('-', ''), 10))
}

function Deals() {
  const [activeFilter, setActiveFilter] = useState('All Stores')
  const [searchQuery, setSearchQuery] = useState('')

  /* ── Filter deals based on active chip + search ── */
  const filteredDeals = DEALS.filter((deal) => {
    /* Search filter */
    if (
      searchQuery &&
      !deal.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !deal.store.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }

    /* Chip filter */
    switch (activeFilter) {
      case 'All Stores':
        return true
      case 'Under $10':
        return parsePrice(deal.priceNew) < 10
      case '50%+ Off':
        return parseDiscount(deal.discount) >= 50
      case 'Free Weekend':
        return deal.priceNew === 'FREE' || deal.status === 'Free Weekend'
      default:
        return deal.store === activeFilter
    }
  })

  return (
    <div className="nx-content">
      {/* ═══════════ PAGE HEADER ═══════════ */}
      <div className="deals-header">
        {/* Decorative orbs */}
        <div className="deals-header__orb deals-header__orb--orange" />
        <div className="deals-header__orb deals-header__orb--blue" />

        {/* Scanline decoration */}
        <div className="deals-header__scanlines" />

        <div className="deals-header__inner">
          <div className="deals-header__text">
            <div className="deals-header__tag">
              <span className="deals-header__tag-dot" />
              <span>INTEL ACTIVE</span>
            </div>
            <h1 className="deals-header__title">
              🔥 <span>Game Deals Intelligence</span>
            </h1>
            <p className="deals-header__desc">
              Real-time price tracking, discount intelligence, and safe store
              redirects — all in one command center. Never overpay again.
            </p>
          </div>

          {/* Quick stats */}
          <div className="deals-header__stats">
            <div className="deals-header__stat">
              <span className="deals-header__stat-number deals-header__stat-number--orange">
                {DEALS.length}
              </span>
              <span className="deals-header__stat-label">Active Deals</span>
            </div>
            <div className="deals-header__stat">
              <span className="deals-header__stat-number deals-header__stat-number--blue">
                {DEALS.filter((d) => parseDiscount(d.discount) >= 50).length}
              </span>
              <span className="deals-header__stat-label">50%+ Off</span>
            </div>
            <div className="deals-header__stat">
              <span className="deals-header__stat-number deals-header__stat-number--green">
                {DEALS.filter((d) => d.priceNew === 'FREE').length}
              </span>
              <span className="deals-header__stat-label">Free Now</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ SEARCH + FILTER PANEL ═══════════ */}
      <div className="deals-filter-panel">
        {/* Search row */}
        <div className="deals-search">
          <span className="deals-search__icon">🔍</span>
          <input
            className="deals-search__input"
            type="text"
            placeholder="Search deals, stores, games…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="deals-search__clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="deals-chips">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip}
              className={
                'deals-chip' +
                (activeFilter === chip ? ' deals-chip--active' : '')
              }
              onClick={() => setActiveFilter(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════ MAIN CONTENT AREA ═══════════ */}
      <div className="deals-layout">
        {/* ── Deal cards grid ── */}
        <div className="deals-grid">
          {filteredDeals.length === 0 && (
            <div className="deals-empty">
              <span className="deals-empty__icon">📡</span>
              <p className="deals-empty__text">
                No deals match your current filters.
              </p>
              <button
                className="deals-empty__reset"
                onClick={() => {
                  setActiveFilter('All Stores')
                  setSearchQuery('')
                }}
              >
                Reset Filters
              </button>
            </div>
          )}

          {filteredDeals.map((deal) => {
            const color = storeColorClass(deal.store)
            return (
              <div
                key={deal.id}
                className={`deals-card deals-card--${color}`}
              >
                {/* Accent bar at top */}
                <div className={`deals-card__accent deals-card__accent--${color}`} />

                {/* Card header: store + discount */}
                <div className="deals-card__header">
                  <span className={`deals-card__store deals-card__store--${color}`}>
                    {deal.store}
                  </span>
                  <span className="deals-card__discount">{deal.discount}</span>
                </div>

                {/* Title + category */}
                <h3 className="deals-card__title">{deal.title}</h3>
                <p className="deals-card__category">{deal.category}</p>

                {/* Rating row */}
                <div className="deals-card__rating">
                  <span className="deals-card__stars">{deal.stars}</span>
                  <span className="deals-card__rating-num">{deal.rating}</span>
                  <span className={`deals-card__status-badge ${statusClass(deal.status)}`}>
                    {deal.status}
                  </span>
                </div>

                {/* Price row */}
                <div className="deals-card__prices">
                  <span className="deals-card__price-old">{deal.priceOld}</span>
                  <span
                    className={
                      'deals-card__price-new' +
                      (deal.priceNew === 'FREE' ? ' deals-card__price-new--free' : '')
                    }
                  >
                    {deal.priceNew}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="deals-card__actions">
                  <button className="deals-card__btn deals-card__btn--alert">
                    🔔 Set Alert
                  </button>
                  <button className={`deals-card__btn deals-card__btn--view deals-card__btn--view-${color}`}>
                    ↗ View Deal
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Deal Network Status panel ── */}
        <aside className="deals-network">
          <div className="deals-network__header">
            <span className="deals-network__icon">📡</span>
            <h3 className="deals-network__title">Deal Network Status</h3>
            <span className="deals-network__live">
              <span className="deals-network__live-dot" />
              DEMO
            </span>
          </div>

          <div className="deals-network__items">
            {/* Price Sync */}
            <div className="deals-network__item">
              <div className="deals-network__item-icon deals-network__item-icon--orange">
                🔄
              </div>
              <div className="deals-network__item-info">
                <span className="deals-network__item-label">Price Sync</span>
                <span className="deals-network__item-value">Demo Mode</span>
              </div>
              <span className="deals-network__item-badge deals-network__item-badge--demo">
                DEMO
              </span>
            </div>

            {/* API Source */}
            <div className="deals-network__item">
              <div className="deals-network__item-icon deals-network__item-icon--blue">
                🌐
              </div>
              <div className="deals-network__item-info">
                <span className="deals-network__item-label">API Source</span>
                <span className="deals-network__item-value">Static Data</span>
              </div>
              <span className="deals-network__item-badge deals-network__item-badge--static">
                STATIC
              </span>
            </div>

            {/* Cache */}
            <div className="deals-network__item">
              <div className="deals-network__item-icon deals-network__item-icon--green">
                💾
              </div>
              <div className="deals-network__item-info">
                <span className="deals-network__item-label">Cache</span>
                <span className="deals-network__item-value">
                  Ready for future backend
                </span>
              </div>
              <span className="deals-network__item-badge deals-network__item-badge--ready">
                READY
              </span>
            </div>

            {/* Security */}
            <div className="deals-network__item">
              <div className="deals-network__item-icon deals-network__item-icon--purple">
                🛡️
              </div>
              <div className="deals-network__item-info">
                <span className="deals-network__item-label">Security</span>
                <span className="deals-network__item-value">
                  Safe redirect planned
                </span>
              </div>
              <span className="deals-network__item-badge deals-network__item-badge--planned">
                PLANNED
              </span>
            </div>
          </div>

          {/* Mini connection graph decoration */}
          <div className="deals-network__graph">
            <div className="deals-network__graph-label">Network Activity</div>
            <div className="deals-network__graph-bars">
              {[35, 58, 42, 75, 52, 90, 68, 45, 82, 60, 38, 72].map(
                (h, i) => (
                  <div
                    key={i}
                    className="deals-network__graph-bar"
                    style={{ '--bar-h': `${h}%`, '--bar-delay': `${i * 0.08}s` }}
                  />
                )
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Deals
