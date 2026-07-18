/**
 * Giveaways — Browse all active and upcoming giveaways.
 *
 * Placeholder page with static sample content.
 * Backend integration will be added later.
 */

const SAMPLE_GIVEAWAYS = [
  {
    id: 1,
    title: 'Star Wars Jedi: Survivor',
    platform: 'Epic Games',
    endsIn: '2d 14h 32m',
    status: 'live',
  },
  {
    id: 2,
    title: 'Terraria',
    platform: 'Steam',
    endsIn: '5d 08h 15m',
    status: 'live',
  },
  {
    id: 3,
    title: 'Celeste',
    platform: 'GOG',
    endsIn: '1d 02h 45m',
    status: 'live',
  },
  {
    id: 4,
    title: 'Hollow Knight: Silksong',
    platform: 'Steam',
    endsIn: 'Starts Jul 25',
    status: 'upcoming',
  },
  {
    id: 5,
    title: 'Dead Cells',
    platform: 'Epic Games',
    endsIn: 'Starts Jul 28',
    status: 'upcoming',
  },
]

function Giveaways() {
  return (
    <div className="nx-content">
      {/* Page header */}
      <div className="nx-page-header">
        <div className="nx-page-header__text">
          <h1 className="nx-page-header__title">
            🎁 <span>Giveaways</span>
          </h1>
          <p className="nx-page-header__desc">
            Claim free games before they expire! NEXORA aggregates giveaways
            from every major platform so you never miss out.
          </p>
        </div>

        <div className="nx-page-stats">
          <div className="nx-page-stat">
            <span className="nx-page-stat__number nx-page-stat__number--blue">7</span>
            <span className="nx-page-stat__label">Live Now</span>
          </div>
          <div className="nx-page-stat">
            <span className="nx-page-stat__number nx-page-stat__number--orange">3</span>
            <span className="nx-page-stat__label">Upcoming</span>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="nx-glass-card">
        <div className="nx-filter-row">
          <button className="nx-filter-chip nx-filter-chip--active">All</button>
          <button className="nx-filter-chip">🟢 Live</button>
          <button className="nx-filter-chip">🕐 Upcoming</button>
          <button className="nx-filter-chip">📦 Claimed</button>
        </div>
      </div>

      {/* Giveaway list */}
      <div className="nx-grid nx-grid--3">
        {SAMPLE_GIVEAWAYS.map((g) => (
          <div key={g.id} className="nx-glass-card nx-glass-card--hoverable">
            <div className="nx-placeholder-card__header">
              <span className="nx-placeholder-card__badge">{g.platform}</span>
              <span className={`nx-placeholder-card__status nx-placeholder-card__status--${g.status}`}>
                {g.status === 'live' ? '● Live' : '○ Upcoming'}
              </span>
            </div>
            <h3 className="nx-placeholder-card__title">{g.title}</h3>
            <p className="nx-placeholder-card__meta">
              {g.status === 'live' ? `⏱ Ends in ${g.endsIn}` : `📅 ${g.endsIn}`}
            </p>
            {g.status === 'live' && (
              <button className="nx-placeholder-card__action-btn">Claim Now →</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Giveaways
