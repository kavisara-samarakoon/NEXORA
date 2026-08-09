import type { Metadata } from "next";
import SentinelButton from "@/components/SentinelButton";
import SentinelExperience from "@/components/SentinelExperience";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export const metadata: Metadata = {
  title: "NEXORA Sentinel",
  description: "Preview NEXORA's AI assistant for games, deals, and account safety.",
};

export default function SentinelPage() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-shell">
        <Topbar />
        <main className="dashboard sentinel-page">
          <SentinelExperience />
        </main>
      </div>
      <SentinelButton />
    </div>
  );
}
