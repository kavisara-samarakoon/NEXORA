import type { Metadata } from "next";
import SentinelButton from "@/components/SentinelButton";
import SentinelExperience from "@/components/SentinelExperience";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { getSentinel } from "@/lib/api";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "NEXORA Sentinel",
  description: "Preview NEXORA Sentinel, an AI assistant concept for game discovery, deal guidance, giveaways, and account safety.",
  path: "/sentinel",
  keywords: ["gaming AI assistant", "game recommendations", "deal assistant", "account safety guidance"],
});

export default async function SentinelPage() {
  const sentinel = await getSentinel();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-shell">
        <Topbar />
        <main className="dashboard sentinel-page nx-page-reveal">
          <SentinelExperience {...sentinel} />
        </main>
      </div>
      <SentinelButton />
    </div>
  );
}
