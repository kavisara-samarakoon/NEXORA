/**
 * HeroSection — The main banner with headline, subtitle and CTA buttons.
 *
 * No props needed — content is static for now.
 */

function HeroSection() {
  return (
    <section className="nx-hero">
      <div className="nx-hero__tag">
        <span className="nx-hero__tag-dot" />
        Live Platform
      </div>

      <h1 className="nx-hero__headline">
        Every Game. Every Deal.{' '}
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
    </section>
  )
}

export default HeroSection
