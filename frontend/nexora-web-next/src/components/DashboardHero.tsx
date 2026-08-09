const heroStats = [
  { value: "12,847", label: "Deals tracked", tone: "orange" },
  { value: "342", label: "Free games now", tone: "blue" },
  { value: "98.7%", label: "Platform uptime", tone: "green" },
] as const;

export default function DashboardHero() {
  return (
    <section className="dashboard-hero" aria-labelledby="dashboard-title">
      <div className="dashboard-hero__orb dashboard-hero__orb--orange" />
      <div className="dashboard-hero__orb dashboard-hero__orb--blue" />
      <div className="dashboard-hero__orb dashboard-hero__orb--cyan" />

      <div className="dashboard-hero__content">
        <div className="dashboard-hero__tag">
          <span aria-hidden="true" />
          Live platform
        </div>
        <h1 id="dashboard-title">
          Every Game. Every Deal.
          <span>One Place.</span>
        </h1>
        <p>
          Track the best game deals, discover free giveaways, manage your
          wishlists and set price-drop alerts — all powered by the NEXORA
          Sentinel AI engine.
        </p>
        <div className="dashboard-hero__actions" aria-label="Dashboard shortcuts">
          <button type="button" className="dashboard-button dashboard-button--primary" disabled>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M13 3s1 4-2 6c-2-3-5-2-5-2s-2 3-1 7c1 5 5 7 8 7 5 0 8-4 7-9-1-4-5-6-5-6s1 4-2 5c1-5 0-8 0-8Z" />
            </svg>
            Explore deals
          </button>
          <button type="button" className="dashboard-button dashboard-button--outline" disabled>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 10h16v11H4zM3 6h18v4H3zM12 6v15M12 6H8.5a2.5 2.5 0 1 1 0-5C11 1 12 6 12 6Zm0 0h3.5a2.5 2.5 0 1 0 0-5C13 1 12 6 12 6Z" />
            </svg>
            View giveaways
          </button>
        </div>
      </div>

      <div className="dashboard-hero__stats" aria-label="Platform statistics">
        {heroStats.map((stat) => (
          <div className="hero-stat" key={stat.label}>
            <strong className={`hero-stat__value hero-stat__value--${stat.tone}`}>
              {stat.value}
            </strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
