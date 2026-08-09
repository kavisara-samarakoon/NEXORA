import type { Metadata } from "next";
import DealsExplorer from "@/components/DealsExplorer";
import SentinelButton from "@/components/SentinelButton";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export const metadata: Metadata = {
  title: "Game Deals Intelligence",
  description: "Track curated game discounts and pricing intelligence with NEXORA.",
};

export default function DealsPage() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-shell">
        <Topbar />
        <main className="dashboard deals-page">
          <DealsExplorer />
        </main>
      </div>
      <SentinelButton />
    </div>
  );
}
