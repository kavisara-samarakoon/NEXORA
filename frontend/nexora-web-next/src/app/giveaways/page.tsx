import type { Metadata } from "next";
import DataSourceBadge from "@/components/DataSourceBadge";
import GiveawaysExplorer from "@/components/GiveawaysExplorer";
import SentinelButton from "@/components/SentinelButton";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { getGiveaways } from "@/lib/api";
import { getFrontendDataSourceDetails } from "@/lib/data-source";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Giveaway Intelligence",
  description: "Review free game giveaway entries, claim windows, and platform guidance with NEXORA Giveaway Intelligence.",
  path: "/giveaways",
  keywords: ["free games", "game giveaways", "Epic Games giveaways", "Prime Gaming"],
});

export default async function GiveawaysPage() {
  const { giveaways, source } = await getGiveaways();
  const { detail } = getFrontendDataSourceDetails(source);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-shell">
        <Topbar />
        <main className="dashboard giveaways-page nx-page-reveal" id="main-content" tabIndex={-1}>
          <aside
            className="data-source-notice"
            aria-label="Giveaways data source"
          >
            <div className="data-source-notice__copy">
              <strong>Giveaways data</strong>
              <code>/api/giveaways</code>
            </div>
            <DataSourceBadge source={source} />
            <p className="data-source-note">{detail}</p>
          </aside>
          <GiveawaysExplorer giveaways={giveaways} source={source} />
        </main>
      </div>
      <SentinelButton />
    </div>
  );
}
