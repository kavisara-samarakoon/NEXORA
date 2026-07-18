import HeroSection from '../components/HeroSection'
import GiveawayCard from '../components/GiveawayCard'
import DealCard from '../components/DealCard'
import SecurityPanel from '../components/SecurityPanel'
import NetworkStatus from '../components/NetworkStatus'

/* ── Data ── */
import GIVEAWAYS from '../data/giveaways'
import DEALS from '../data/deals'

/**
 * Dashboard — The main landing page of NEXORA.
 *
 * Displays the hero section, live giveaways, best deals,
 * and the security / network status panels.
 */
function Dashboard() {
  return (
    <div className="nx-content">
      {/* Hero banner */}
      <HeroSection />

      {/* Live Giveaways */}
      <section>
        <div className="nx-section-header">
          <h2 className="nx-section-header__title">🎁 Live Giveaways</h2>
          <a href="#" className="nx-section-header__more" onClick={(e) => e.preventDefault()}>
            View All →
          </a>
        </div>

        <div className="nx-grid nx-grid--3">
          {GIVEAWAYS.map((g) => (
            <GiveawayCard
              key={g.id}
              platform={g.platform}
              platformLabel={g.platformLabel}
              title={g.title}
              meta={g.meta}
              timer={g.timer}
              claimed={g.claimed}
            />
          ))}
        </div>
      </section>

      {/* Best Deals — full width */}
      <section>
        <div className="nx-section-header">
          <h2 className="nx-section-header__title">🔥 Best Deals</h2>
          <a href="#" className="nx-section-header__more" onClick={(e) => e.preventDefault()}>
            View All →
          </a>
        </div>

        <div className="nx-grid nx-grid--3">
          {DEALS.map((d) => (
            <DealCard
              key={d.id}
              store={d.store}
              discount={d.discount}
              title={d.title}
              priceOld={d.priceOld}
              priceNew={d.priceNew}
              rating={d.rating}
              stars={d.stars}
            />
          ))}
        </div>
      </section>

      {/* Bottom row: Security + Network */}
      <div className="nx-bottom-row">
        <SecurityPanel />
        <NetworkStatus />
      </div>
    </div>
  )
}

export default Dashboard
