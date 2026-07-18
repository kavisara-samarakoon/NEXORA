import { useState } from 'react'
import './App.css'

/* ── Components ── */
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import HeroSection from './components/HeroSection'
import GiveawayCard from './components/GiveawayCard'
import DealCard from './components/DealCard'
import SecurityPanel from './components/SecurityPanel'
import SentinelButton from './components/SentinelButton'

/* ── Data ── */
import GIVEAWAYS from './data/giveaways'
import DEALS from './data/deals'

/**
 * App — Root layout that composes all dashboard sections.
 *
 * Manages the mobile sidebar open/close state.
 * All data is imported from src/data/ and passed down via props.
 */
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

      {/* ── Sidebar ── */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* ── Main content area ── */}
      <main className="nx-main">
        <Topbar />

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
                />
              ))}
            </div>
          </section>

          {/* Bottom row: Best Deals + Security Panel */}
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

            {/* Security status */}
            <SecurityPanel />
          </div>
        </div>
      </main>

      {/* ── Floating AI button ── */}
      <SentinelButton />
    </div>
  )
}

export default App
