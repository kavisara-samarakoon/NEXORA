/**
 * Wishlist — Track games you want and get notified on price drops.
 *
 * Placeholder page with static sample content.
 * Backend integration will be added later.
 */

const WISHLIST_ITEMS = [
  {
    id: 1,
    title: 'Ghost of Tsushima',
    currentPrice: '$39.99',
    targetPrice: '$24.99',
    lowestEver: '$29.99',
    tracking: true,
  },
  {
    id: 2,
    title: 'Persona 5 Royal',
    currentPrice: '$59.99',
    targetPrice: '$19.99',
    lowestEver: '$29.99',
    tracking: true,
  },
  {
    id: 3,
    title: 'Monster Hunter Wilds',
    currentPrice: '$69.99',
    targetPrice: '$44.99',
    lowestEver: '$59.99',
    tracking: false,
  },
  {
    id: 4,
    title: 'The Witcher 4',
    currentPrice: 'TBA',
    targetPrice: '$49.99',
    lowestEver: '—',
    tracking: true,
  },
]

function Wishlist() {
  return (
    <div className="nx-content">
      {/* Page header */}
      <div className="nx-page-header">
        <div className="nx-page-header__text">
          <h1 className="nx-page-header__title">
            📋 <span>Wishlist</span>
          </h1>
          <p className="nx-page-header__desc">
            Keep track of games you're eyeing. Set target prices and get
            instant alerts when they drop to your desired price.
          </p>
        </div>

        <div className="nx-page-stats">
          <div className="nx-page-stat">
            <span className="nx-page-stat__number nx-page-stat__number--orange">4</span>
            <span className="nx-page-stat__label">Wishlisted</span>
          </div>
          <div className="nx-page-stat">
            <span className="nx-page-stat__number nx-page-stat__number--blue">3</span>
            <span className="nx-page-stat__label">Tracking</span>
          </div>
        </div>
      </div>

      {/* Wishlist table */}
      <div className="nx-glass-card">
        <div className="nx-table-wrapper">
          <table className="nx-table">
            <thead>
              <tr>
                <th>Game</th>
                <th>Current Price</th>
                <th>Target Price</th>
                <th>Lowest Ever</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {WISHLIST_ITEMS.map((item) => (
                <tr key={item.id}>
                  <td className="nx-table__game-name">{item.title}</td>
                  <td>{item.currentPrice}</td>
                  <td className="nx-table__target">{item.targetPrice}</td>
                  <td>{item.lowestEver}</td>
                  <td>
                    <span className={`nx-table__status ${item.tracking ? 'nx-table__status--active' : 'nx-table__status--paused'}`}>
                      {item.tracking ? '🔔 Tracking' : '⏸ Paused'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tip card */}
      <div className="nx-glass-card nx-glass-card--accent-blue">
        <h3 className="nx-placeholder-card__title">💡 Pro Tip</h3>
        <p className="nx-placeholder-card__meta">
          Set a target price below the historical lowest and NEXORA will
          notify you via Discord, email, or push notification when it drops.
        </p>
      </div>
    </div>
  )
}

export default Wishlist
