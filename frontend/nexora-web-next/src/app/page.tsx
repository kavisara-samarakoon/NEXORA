import type { Metadata } from "next";
import Link from "next/link";
import BackendHealthPanel from "@/components/BackendHealthPanel";
import DataSourceSummaryPanel from "@/components/DataSourceSummaryPanel";
import DashboardHero from "@/components/DashboardHero";
import DealCard from "@/components/DealCard";
import GiveawayCard from "@/components/GiveawayCard";
import SentinelButton from "@/components/SentinelButton";
import Sidebar from "@/components/Sidebar";
import StatusPanels from "@/components/StatusPanels";
import Topbar from "@/components/Topbar";
import {
  dashboardDeals,
  dashboardGiveaways,
  mapDashboardNetworkItems,
  mapDashboardDeals,
  mapDashboardGiveaways,
  mapDashboardSecurityItems,
  networkItems,
  securityItems,
} from "@/data/dashboard";
import {
  getDashboardSummary,
  getDeals,
  getGiveaways,
  getSecurityStatus,
} from "@/lib/api";
import { getBackendHealth } from "@/lib/backend-health";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Gaming Dashboard",
  description: "Discover game deals, live giveaways, platform intelligence, and network status from the NEXORA dashboard.",
  path: "/",
  keywords: ["gaming dashboard", "game discovery", "game deals", "free games"],
});

export default async function Home() {
  const [
    summaryResult,
    dealsResult,
    giveawaysResult,
    securityResult,
    backendHealthResult,
  ] = await Promise.all([
    getDashboardSummary(),
    getDeals(),
    getGiveaways(),
    getSecurityStatus(),
    getBackendHealth(),
  ]);
  const deals =
    dealsResult.source === "api"
      ? mapDashboardDeals(dealsResult.deals)
      : dashboardDeals;
  const giveaways =
    giveawaysResult.source === "api"
      ? mapDashboardGiveaways(giveawaysResult.giveaways)
      : dashboardGiveaways;
  const dashboardSecurityItems =
    securityResult.source === "api"
      ? mapDashboardSecurityItems(securityResult.securityStatus)
      : securityItems;
  const dashboardNetworkItems =
    summaryResult.source === "api" && summaryResult.dashboardSummary
      ? mapDashboardNetworkItems(summaryResult.dashboardSummary)
      : networkItems;

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-shell">
        <Topbar />

        <main className="dashboard dashboard-home nx-page-reveal" id="main-content" tabIndex={-1}>
          <DashboardHero summary={summaryResult.dashboardSummary} />

          <BackendHealthPanel result={backendHealthResult} />

          <DataSourceSummaryPanel
            items={[
              {
                id: "backend-health",
                label: "Backend health",
                endpoint: "/api/health",
                source: backendHealthResult.source,
                note: "Local backend reachability and safe runtime labels.",
              },
              {
                id: "dashboard-summary",
                label: "Dashboard summary",
                endpoint: "/api/dashboard/summary",
                source: summaryResult.source,
                note: "Dashboard totals and network overview.",
              },
              {
                id: "deals",
                label: "Deals",
                endpoint: "/api/deals",
                source: dealsResult.source,
                note: "Deal cards shown on this dashboard.",
              },
              {
                id: "giveaways",
                label: "Giveaways",
                endpoint: "/api/giveaways",
                source: giveawaysResult.source,
                note: "Giveaway cards shown on this dashboard.",
              },
              {
                id: "security-status",
                label: "Security status",
                endpoint: "/api/security/status",
                source: securityResult.source,
                note: "Security and protection preview panels.",
              },
            ]}
          />

          <section className="dashboard-section" aria-labelledby="giveaways-title">
            <div className="section-heading">
              <h2 id="giveaways-title">🎁 {giveawaysResult.source === "api" ? "Giveaway Feed" : "Giveaway Preview"}</h2>
              <Link className="section-heading__action" href="/giveaways">
                View All <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="dashboard-card-grid">
              {giveaways.map((giveaway) => (
                <GiveawayCard giveaway={giveaway} key={giveaway.id} />
              ))}
            </div>
          </section>

          <section className="dashboard-section" aria-labelledby="deals-title">
            <div className="section-heading">
              <h2 id="deals-title">🔥 Best Deals</h2>
              <Link className="section-heading__action section-heading__action--orange" href="/deals">
                View All <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="dashboard-card-grid">
              {deals.map((deal) => (
                <DealCard deal={deal} key={deal.id} />
              ))}
            </div>
          </section>

          <StatusPanels
            security={dashboardSecurityItems}
            network={dashboardNetworkItems}
          />
        </main>
      </div>

      <SentinelButton />
    </div>
  );
}
