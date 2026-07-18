/**
 * HeroSection — The main banner with headline, subtitle, CTA buttons,
 * and live stats counters for a premium dashboard feel.
 *
 * No props needed — content is static for now.
 */

function HeroSection() {
  return (
    <section className="nx-hero">
      {/* Decorative glow orbs (rendered via CSS ::before / ::after + extra divs) */}
      <div className="nx-hero__orb nx-hero__orb--orange" />
      <div className="nx-hero__orb nx-hero__orb--blue" />
      <div className="nx-hero__orb nx-hero__orb--cyan" />

      <div className="nx-hero__inner">
        <div className="nx-hero__text">
          <div className="nx-hero__tag">
            <span className="nx-hero__tag-dot" />
            Live Platform
          </div>

          <h1 className="nx-hero__headline">
            Every Game. Every Deal.<br />
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
        </div>

        {/* Live stat counters on the right side */}
        <div className="nx-hero__stats">
          <div className="nx-hero__stat">
            <span className="nx-hero__stat-number">12,847</span>
            <span className="nx-hero__stat-label">Deals Tracked</span>
          </div>
          <div className="nx-hero__stat">
            <span className="nx-hero__stat-number">342</span>
            <span className="nx-hero__stat-label">Free Games Now</span>
          </div>
          <div className="nx-hero__stat">
            <span className="nx-hero__stat-number">98.7%</span>
            <span className="nx-hero__stat-label">Uptime</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
