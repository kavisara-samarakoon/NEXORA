import type { Metadata } from "next";
import GiveawaysExplorer from "@/components/GiveawaysExplorer";
import SentinelButton from "@/components/SentinelButton";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export const metadata: Metadata = {
  title: "Live Giveaway Intelligence",
  description: "Track curated free game drops and claim windows with NEXORA.",
};

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
