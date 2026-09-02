import Link from "next/link";
import type { DashboardSummary } from "@/lib/api";

const heroStats = [
  { value: "Preview", label: "Deals feed", tone: "orange" },
  { value: "Sample", label: "Giveaways", tone: "blue" },
  { value: "Local", label: "Review mode", tone: "green" },
] as const;

export default function DashboardHero({
  summary = null,
}: {
  summary?: DashboardSummary | null;
}) {
  const stats = summary
    ? [
        { value: summary.activeDealsCount.toLocaleString(), label: "Deals tracked", tone: "orange" },
        { value: summary.activeGiveawaysCount.toLocaleString(), label: "Live giveaways", tone: "blue" },
        { value: summary.activePriceAlertsCount.toLocaleString(), label: "Active alerts", tone: "green" },
      ]
    : heroStats;

  return (
    <section className="dashboard-hero" aria-labelledby="dashboard-title">
      <div className="dashboard-hero__orb dashboard-hero__orb--orange" />
      <div className="dashboard-hero__orb dashboard-hero__orb--blue" />
      <div className="dashboard-hero__orb dashboard-hero__orb--cyan" />

      <div className="dashboard-hero__content">
        <div className="dashboard-hero__tag">
          <span aria-hidden="true" />
          {summary ? "Backend API" : "Local preview"}
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

      <div className="dashboard-hero__stats" aria-label={summary ? "Backend dashboard statistics" : "Preview dashboard statistics"}>
        {stats.map((stat) => (
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
