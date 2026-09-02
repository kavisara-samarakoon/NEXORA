import type { Metadata } from "next";
import GiveawaysExplorer from "@/components/GiveawaysExplorer";
import PageSourceNotice from "@/components/PageSourceNotice";
import SentinelButton from "@/components/SentinelButton";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { getGiveaways } from "@/lib/api";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Giveaway Intelligence",
  description: "Review free game giveaway entries, claim windows, and platform guidance with NEXORA Giveaway Intelligence.",
  path: "/giveaways",
  keywords: ["free games", "game giveaways", "Epic Games giveaways", "Prime Gaming"],
});

export default async function GiveawaysPage() {
  const { giveaways, source } = await getGiveaways();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-shell">
        <Topbar />
        <main className="dashboard giveaways-page nx-page-reveal" id="main-content" tabIndex={-1}>
          <PageSourceNotice
            label="Giveaways data"
            endpoint="/api/giveaways"
            source={source}
          />
          <GiveawaysExplorer giveaways={giveaways} source={source} />
        </main>
      </div>
      <SentinelButton />
    </div>
  );
}
