import type { Metadata } from "next";
import DashboardHero from "@/components/DashboardHero";
import DealCard from "@/components/DealCard";
import GiveawayCard from "@/components/GiveawayCard";
import SentinelButton from "@/components/SentinelButton";
import Sidebar from "@/components/Sidebar";
import StatusPanels from "@/components/StatusPanels";
import Topbar from "@/components/Topbar";
import { dashboardDeals, dashboardGiveaways } from "@/data/dashboard";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Gaming Dashboard",
  description: "Discover game deals, live giveaways, platform intelligence, and network status from the NEXORA dashboard.",
  path: "/",
  keywords: ["gaming dashboard", "game discovery", "game deals", "free games"],
});

export default function Home() {
  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-shell">
        <Topbar />

        <main className="dashboard dashboard-home">
          <DashboardHero />

          <section className="dashboard-section" aria-labelledby="giveaways-title">
            <div className="section-heading">
              <div>
                <span className="section-kicker section-kicker--blue">Live drops</span>
                <h2 id="giveaways-title">Free right now</h2>
              </div>
              <button className="section-heading__action" type="button" disabled>
                View all <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="dashboard-card-grid">
              {dashboardGiveaways.map((giveaway) => (
                <GiveawayCard giveaway={giveaway} key={giveaway.id} />
              ))}
            </div>
          </section>

          <section className="dashboard-section" aria-labelledby="deals-title">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Curated savings</span>
                <h2 id="deals-title">Best deals</h2>
              </div>
              <button className="section-heading__action section-heading__action--orange" type="button" disabled>
                View all <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="dashboard-card-grid">
              {dashboardDeals.map((deal) => (
                <DealCard deal={deal} key={deal.id} />
              ))}
            </div>
          </section>

          <StatusPanels />
        </main>
      </div>

      <SentinelButton />
    </div>
  );
}
