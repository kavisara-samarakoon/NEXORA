import type { Metadata } from "next";
import SecurityCenter from "@/components/SecurityCenter";
import SentinelButton from "@/components/SentinelButton";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Cyber Security Command Center",
  description: "Review gaming account protection, API safeguards, security activity, and network status in the NEXORA command center.",
  path: "/security",
  keywords: ["gaming account security", "cybersecurity dashboard", "account protection", "network security"],
});

export default function SecurityPage() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-shell">
        <Topbar />
        <main className="dashboard security-page">
          <SecurityCenter />
        </main>
      </div>
      <SentinelButton />
    </div>
  );
}
