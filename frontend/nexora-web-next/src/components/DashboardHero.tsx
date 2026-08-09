import Link from "next/link";

const heroStats = [
  { value: "12,847", label: "Deals tracked", tone: "orange" },
  { value: "342", label: "Free games now", tone: "blue" },
  { value: "98.7%", label: "Uptime", tone: "green" },
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
          Every Game. Every Deal.<br />
          <span>One Place.</span>
        </h1>
        <p>
          Track the best game deals, discover free giveaways, manage your
          wishlists and set price-drop alerts — all powered by the NEXORA
          Sentinel AI engine.
        </p>
        <div className="dashboard-hero__actions" aria-label="Dashboard shortcuts">
          <Link href="/deals" className="dashboard-button dashboard-button--primary">
            <span aria-hidden="true">🔥</span>
            Explore Deals
          </Link>
          <Link href="/giveaways" className="dashboard-button dashboard-button--outline">
            <span aria-hidden="true">🎁</span>
            View Giveaways
          </Link>
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
