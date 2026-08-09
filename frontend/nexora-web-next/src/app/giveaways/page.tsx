import type { Metadata } from "next";
import GiveawaysExplorer from "@/components/GiveawaysExplorer";
import SentinelButton from "@/components/SentinelButton";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Live Giveaway Intelligence",
  description: "Track free game giveaways, claim windows, and platform availability with NEXORA Live Giveaway Intelligence.",
  path: "/giveaways",
  keywords: ["free games", "game giveaways", "Epic Games giveaways", "Prime Gaming"],
});

export default function GiveawaysPage() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-shell">
        <Topbar />
        <main className="dashboard giveaways-page">
          <GiveawaysExplorer />
        </main>
      </div>
      <SentinelButton />
    </div>
  );
}
