/**
 * Deals — Browse and discover the best gaming deals.
 *
 * Placeholder page with static sample content.
 * Backend integration will be added later.
 */

/* Sample deal data for the placeholder */
const SAMPLE_DEALS = [
  {
    id: 1,
    title: 'Cyberpunk 2077: Ultimate Edition',
    store: 'Steam',
    discount: '-65%',
    priceOld: '$59.99',
    priceNew: '$20.99',
    category: 'RPG',
  },
  {
    id: 2,
    title: 'Elden Ring',
    store: 'Epic Games',
    discount: '-40%',
    priceOld: '$59.99',
    priceNew: '$35.99',
    category: 'Action RPG',
  },
  {
    id: 3,
    title: 'Hades II — Early Access',
    store: 'Steam',
    discount: '-20%',
    priceOld: '$29.99',
    priceNew: '$23.99',
    category: 'Roguelike',
  },
  {
    id: 4,
    title: 'Baldur\'s Gate 3',
    store: 'GOG',
    discount: '-30%',
    priceOld: '$59.99',
    priceNew: '$41.99',
    category: 'RPG',
  },
]

function Deals() {
  return (
    <div className="nx-content">
      {/* Page header */}
      <div className="nx-page-header">
        <div className="nx-page-header__text">
          <h1 className="nx-page-header__title">
            🔥 <span>Deals</span>
          </h1>
          <p className="nx-page-header__desc">
            Discover the hottest discounts across Steam, Epic Games, and GOG.
            We track price drops so you never miss a bargain.
          </p>
        </div>

        {/* Quick stats */}
        <div className="nx-page-stats">
          <div className="nx-page-stat">
            <span className="nx-page-stat__number nx-page-stat__number--orange">142</span>
            <span className="nx-page-stat__label">Active Deals</span>
          </div>
          <div className="nx-page-stat">
            <span className="nx-page-stat__number nx-page-stat__number--blue">24</span>
            <span className="nx-page-stat__label">New Today</span>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="nx-glass-card">
        <div className="nx-filter-row">
          <button className="nx-filter-chip nx-filter-chip--active">All Stores</button>
          <button className="nx-filter-chip">Steam</button>
          <button className="nx-filter-chip">Epic Games</button>
          <button className="nx-filter-chip">GOG</button>
          <button className="nx-filter-chip">Humble Bundle</button>
        </div>
      </div>

      {/* Deal list */}
      <div className="nx-grid nx-grid--2">
        {SAMPLE_DEALS.map((deal) => (
          <div key={deal.id} className="nx-glass-card nx-glass-card--hoverable">
            <div className="nx-placeholder-card__header">
              <span className="nx-placeholder-card__badge">{deal.store}</span>
              <span className="nx-placeholder-card__tag nx-placeholder-card__tag--orange">
                {deal.discount}
              </span>
            </div>
            <h3 className="nx-placeholder-card__title">{deal.title}</h3>
            <p className="nx-placeholder-card__meta">{deal.category}</p>
            <div className="nx-placeholder-card__footer">
              <span className="nx-placeholder-card__price-old">{deal.priceOld}</span>
              <span className="nx-placeholder-card__price-new">{deal.priceNew}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Deals
