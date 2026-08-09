import { useState } from 'react'
import GIVEAWAYS from '../data/giveaways'

/**
 * Giveaways — Premium "Live Giveaway Intelligence" page.
 *
 * Features:
 * - Cyber-themed page header with animated gradient title
 * - Search bar in a glass panel
 * - Filter chips for stores and giveaway types
 * - Responsive grid of premium giveaway cards with progress bars + buttons
 * - "Giveaway Network Status" side panel
 * - Empty state when no results match
 *
 * All data is static. Backend integration will be added later.
 */

/* ── All available filter chips ── */
const FILTER_CHIPS = [
  'All',
  'Steam',
  'Epic Games',
  'GOG',
  'Prime Gaming',
  'Ending Soon',
  'New',
  'Popular',
]

/* ── Helper: platform key for CSS classes ── */
function platformKey(platform) {
  switch (platform) {
    case 'steam': return 'steam'
    case 'epic':  return 'epic'
    case 'gog':   return 'gog'
    case 'prime':  return 'prime'
    default:       return 'steam'
  }
}

/* ── Helper: parse the timer string to check if ending soon (< 2 days) ── */
function isEndingSoon(timer) {
  const dayMatch = timer.match(/^(\d+)d/)
  if (!dayMatch) return true
  return parseInt(dayMatch[1], 10) < 2
}

/* ── Helper: claim progress bar colour ── */
function claimBarClass(claimed) {
  if (claimed >= 80) return 'ga-card__progress-fill--hot'
  if (claimed >= 50) return 'ga-card__progress-fill--warm'
  return 'ga-card__progress-fill--cool'
}

/* ── Helper: tag label ── */
function tagLabel(tag) {
  switch (tag) {
    case 'ending-soon': return '⏰ Ending Soon'
    case 'new':         return '✨ New'
    case 'popular':     return '🔥 Popular'
    default:            return ''
  }
}

/* ── Helper: tag CSS class ── */
function tagClass(tag) {
  switch (tag) {
    case 'ending-soon': return 'ga-card__tag--urgent'
    case 'new':         return 'ga-card__tag--new'
    case 'popular':     return 'ga-card__tag--popular'
    default:            return ''
  }
}

function Giveaways() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  /* ── Filter giveaways based on active chip + search ── */
  const filteredGiveaways = GIVEAWAYS.filter((g) => {
    /* Search filter */
    if (
      searchQuery &&
      !g.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !g.platformLabel.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !g.genre.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }

    /* Chip filter */
    switch (activeFilter) {
      case 'All':
        return true
      case 'Ending Soon':
        return isEndingSoon(g.timer)
      case 'New':
        return g.tag === 'new'
      case 'Popular':
        return g.tag === 'popular'
      default:
        return g.platformLabel === activeFilter
    }
  })

  return (
    <div className="nx-content">
      {/* ═══════════ PAGE HEADER ═══════════ */}
      <div className="ga-header">
        {/* Decorative orbs */}
        <div className="ga-header__orb ga-header__orb--blue" />
        <div className="ga-header__orb ga-header__orb--orange" />

        {/* Scanline decoration */}
        <div className="ga-header__scanlines" />

        <div className="ga-header__inner">
          <div className="ga-header__text">
            <div className="ga-header__tag">
              <span className="ga-header__tag-dot" />
              <span>LIVE TRACKING</span>
            </div>
            <h1 className="ga-header__title">
              🎁 <span>Live Giveaway Intelligence</span>
            </h1>
            <p className="ga-header__desc">
              Track free game drops, claim windows, and safe store redirects
              across every major platform — never miss a free title again.
            </p>
          </div>

          {/* Quick stats */}
          <div className="ga-header__stats">
            <div className="ga-header__stat">
              <span className="ga-header__stat-number ga-header__stat-number--blue">
                {GIVEAWAYS.filter((g) => g.status === 'live').length}
              </span>
              <span className="ga-header__stat-label">Live Now</span>
            </div>
            <div className="ga-header__stat">
              <span className="ga-header__stat-number ga-header__stat-number--orange">
                {GIVEAWAYS.filter((g) => isEndingSoon(g.timer)).length}
              </span>
              <span className="ga-header__stat-label">Ending Soon</span>
            </div>
            <div className="ga-header__stat">
              <span className="ga-header__stat-number ga-header__stat-number--green">
                {new Set(GIVEAWAYS.map((g) => g.platformLabel)).size}
              </span>
              <span className="ga-header__stat-label">Platforms</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ SEARCH + FILTER PANEL ═══════════ */}
      <div className="ga-filter-panel">
        {/* Search row */}
        <div className="ga-search">
          <span className="ga-search__icon">🔍</span>
          <input
            className="ga-search__input"
            type="text"
            placeholder="Search giveaways, platforms, genres…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="ga-search__clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="ga-chips">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip}
              className={
                'ga-chip' +
                (activeFilter === chip ? ' ga-chip--active' : '')
              }
              onClick={() => setActiveFilter(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════ MAIN CONTENT AREA ═══════════ */}
      <div className="ga-layout">
        {/* ── Giveaway cards grid ── */}
        <div className="ga-grid">
          {filteredGiveaways.length === 0 && (
            <div className="ga-empty">
              <span className="ga-empty__icon">📡</span>
              <p className="ga-empty__text">
                No giveaways match your current filters.
              </p>
              <button
                className="ga-empty__reset"
                onClick={() => {
                  setActiveFilter('All')
                  setSearchQuery('')
                }}
              >
                Reset Filters
              </button>
            </div>
          )}

          {filteredGiveaways.map((g) => {
            const pKey = platformKey(g.platform)
            return (
              <div
                key={g.id}
                className={`ga-card ga-card--${pKey}`}
              >
                {/* Accent bar at top */}
                <div className={`ga-card__accent ga-card__accent--${pKey}`} />

                {/* Card header: platform + tag */}
                <div className="ga-card__header">
                  <span className={`ga-card__platform ga-card__platform--${pKey}`}>
                    {g.platformLabel}
                  </span>
                  {g.tag && (
                    <span className={`ga-card__tag ${tagClass(g.tag)}`}>
                      {tagLabel(g.tag)}
                    </span>
                  )}
                </div>

                {/* Title + genre */}
                <h3 className="ga-card__title">{g.title}</h3>
                <p className="ga-card__genre">{g.genre}</p>

                {/* Free badge + original price */}
                <div className="ga-card__price-row">
                  <span className="ga-card__free-badge">FREE</span>
                  <span className="ga-card__original-price">{g.originalPrice}</span>
                </div>

                {/* Timer */}
                <div className={`ga-card__timer ${isEndingSoon(g.timer) ? 'ga-card__timer--urgent' : ''}`}>
                  <span className="ga-card__timer-icon">⏱</span>
                  <span>{g.timer} remaining</span>
                </div>

                {/* Claim progress */}
                <div className="ga-card__progress">
                  <div className="ga-card__progress-info">
                    <span>Claimed</span>
                    <span className="ga-card__progress-pct">{g.claimed}%</span>
                  </div>
                  <div className="ga-card__progress-track">
                    <div
                      className={`ga-card__progress-fill ${claimBarClass(g.claimed)}`}
                      style={{ width: `${g.claimed}%` }}
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="ga-card__actions">
                  <button className={`ga-card__btn ga-card__btn--claim ga-card__btn--claim-${pKey}`}>
                    📋 Claim Guide
                  </button>
                  <button className="ga-card__btn ga-card__btn--remind">
                    🔔 Add Reminder
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Giveaway Network Status panel ── */}
        <aside className="ga-network">
          <div className="ga-network__header">
            <span className="ga-network__icon">📡</span>
            <h3 className="ga-network__title">Giveaway Network Status</h3>
            <span className="ga-network__live">
              <span className="ga-network__live-dot" />
              DEMO
            </span>
          </div>

          <div className="ga-network__items">
            {/* Giveaway Sync */}
            <div className="ga-network__item">
              <div className="ga-network__item-icon ga-network__item-icon--orange">
                🔄
              </div>
              <div className="ga-network__item-info">
                <span className="ga-network__item-label">Giveaway Sync</span>
                <span className="ga-network__item-value">Demo Mode</span>
              </div>
              <span className="ga-network__item-badge ga-network__item-badge--demo">
                DEMO
              </span>
            </div>

            {/* API Source */}
            <div className="ga-network__item">
              <div className="ga-network__item-icon ga-network__item-icon--blue">
                🌐
              </div>
              <div className="ga-network__item-info">
                <span className="ga-network__item-label">API Source</span>
                <span className="ga-network__item-value">Static Data</span>
              </div>
              <span className="ga-network__item-badge ga-network__item-badge--static">
                STATIC
              </span>
            </div>

            {/* Claim Links */}
            <div className="ga-network__item">
              <div className="ga-network__item-icon ga-network__item-icon--green">
                🔗
              </div>
              <div className="ga-network__item-info">
                <span className="ga-network__item-label">Claim Links</span>
                <span className="ga-network__item-value">
                  Safe redirect planned
                </span>
              </div>
              <span className="ga-network__item-badge ga-network__item-badge--planned">
                PLANNED
              </span>
            </div>

            {/* Alerts */}
            <div className="ga-network__item">
              <div className="ga-network__item-icon ga-network__item-icon--purple">
                🔔
              </div>
              <div className="ga-network__item-info">
                <span className="ga-network__item-label">Alerts</span>
                <span className="ga-network__item-value">
                  Future backend notification support
                </span>
              </div>
              <span className="ga-network__item-badge ga-network__item-badge--future">
                FUTURE
              </span>
            </div>
          </div>

          {/* Platform availability mini-graph */}
          <div className="ga-network__platforms">
            <div className="ga-network__platforms-label">Platform Availability</div>
            <div className="ga-network__platform-rows">
              {[
                { name: 'Steam', pct: 85, color: 'steam' },
                { name: 'Epic Games', pct: 72, color: 'epic' },
                { name: 'GOG', pct: 45, color: 'gog' },
                { name: 'Prime', pct: 60, color: 'prime' },
              ].map((p) => (
                <div key={p.name} className="ga-network__platform-row">
                  <span className="ga-network__platform-name">{p.name}</span>
                  <div className="ga-network__platform-track">
                    <div
                      className={`ga-network__platform-fill ga-network__platform-fill--${p.color}`}
                      style={{ '--platform-pct': `${p.pct}%` }}
                    />
                  </div>
                  <span className="ga-network__platform-pct">{p.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Giveaways
