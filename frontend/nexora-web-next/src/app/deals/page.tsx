import type { Metadata } from "next";
import DataSourceBadge from "@/components/DataSourceBadge";
import DealsExplorer from "@/components/DealsExplorer";
import SentinelButton from "@/components/SentinelButton";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { getDeals } from "@/lib/api";
import { getFrontendDataSourceDetails } from "@/lib/data-source";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Game Deals Intelligence",
  description: "Compare curated PC game discounts, pricing signals, and store offers with NEXORA Game Deals Intelligence.",
  path: "/deals",
  keywords: ["game deals", "PC game discounts", "Steam deals", "game price tracking"],
});

export default async function DealsPage() {
  const { deals, source } = await getDeals();
  const { detail } = getFrontendDataSourceDetails(source);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-shell">
        <Topbar />
        <main className="dashboard deals-page nx-page-reveal" id="main-content" tabIndex={-1}>
          <aside className="data-source-notice" aria-label="Deals data source">
            <div className="data-source-notice__copy">
              <strong>Deals data</strong>
              <code>/api/deals</code>
            </div>
            <DataSourceBadge source={source} />
            <p className="data-source-note">{detail}</p>
          </aside>
          <DealsExplorer deals={deals} source={source} />
        </main>
      </div>
      <SentinelButton />
    </div>
  );
}
