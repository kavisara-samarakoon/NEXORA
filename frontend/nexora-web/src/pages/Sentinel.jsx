/**
 * Sentinel — NEXORA's AI-powered gaming assistant.
 *
 * Placeholder page with static sample content.
 * Backend integration will be added later.
 */

const SENTINEL_FEATURES = [
  {
    id: 1,
    icon: '🎯',
    title: 'Smart Deal Finder',
    description: 'Sentinel scans thousands of stores to find deals tailored to your gaming taste.',
  },
  {
    id: 2,
    icon: '🔔',
    title: 'Price Drop Alerts',
    description: 'Get instant notifications when wishlisted games hit your target price.',
  },
  {
    id: 3,
    icon: '🤖',
    title: 'Game Recommendations',
    description: 'AI-powered suggestions based on your play history and preferences.',
  },
  {
    id: 4,
    icon: '📊',
    title: 'Market Analysis',
    description: 'Historical price charts and predictions for upcoming sales events.',
  },
]

const RECENT_QUERIES = [
  { id: 1, query: 'Find RPGs under $20', time: '5 min ago' },
  { id: 2, query: 'When is the next Steam sale?', time: '2 hours ago' },
  { id: 3, query: 'Compare Elden Ring prices across stores', time: '1 day ago' },
]

function Sentinel() {
  return (
    <div className="nx-content">
      {/* Page header */}
      <div className="nx-page-header">
        <div className="nx-page-header__text">
          <h1 className="nx-page-header__title">
            🤖 <span>Sentinel AI</span>
          </h1>
          <p className="nx-page-header__desc">
            Your intelligent gaming companion. Sentinel uses machine learning
            to help you find the best deals, track prices, and discover new games.
          </p>
        </div>
      </div>

      {/* AI chat preview */}
      <div className="nx-glass-card nx-glass-card--accent-orange">
        <div className="nx-sentinel-preview">
          <div className="nx-sentinel-preview__bubble nx-sentinel-preview__bubble--user">
            Find me co-op games under $15
          </div>
          <div className="nx-sentinel-preview__bubble nx-sentinel-preview__bubble--ai">
            🤖 I found <strong>12 co-op games</strong> under $15 across Steam and Epic Games.
            Top picks: <strong>It Takes Two ($9.99)</strong>, <strong>Deep Rock Galactic ($7.49)</strong>,
            and <strong>Stardew Valley ($11.99)</strong>. Want me to add any to your wishlist?
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="nx-grid nx-grid--2">
        {SENTINEL_FEATURES.map((feature) => (
          <div key={feature.id} className="nx-glass-card nx-glass-card--hoverable">
            <span className="nx-placeholder-card__icon-lg">{feature.icon}</span>
            <h3 className="nx-placeholder-card__title">{feature.title}</h3>
            <p className="nx-placeholder-card__meta">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Recent queries */}
      <div className="nx-glass-card">
        <h3 className="nx-placeholder-card__title" style={{ marginBottom: '20px' }}>
          🕐 Recent Queries
        </h3>
        {RECENT_QUERIES.map((q) => (
          <div key={q.id} className="nx-recent-query">
            <span className="nx-recent-query__text">"{q.query}"</span>
            <span className="nx-recent-query__time">{q.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Sentinel
