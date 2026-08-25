import type { Metadata } from "next";
import SentinelButton from "@/components/SentinelButton";
import SettingsCenter from "@/components/SettingsCenter";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Account Control Center",
  description: "Explore NEXORA profile preferences, notifications, security controls, connected gaming platforms, and appearance settings.",
  path: "/settings",
  keywords: ["NEXORA settings", "gaming profile", "notification preferences", "connected gaming platforms"],
});

export default function SettingsPage() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-shell">
        <Topbar />
        <main className="dashboard settings-page nx-page-reveal">
          <SettingsCenter />
        </main>
      </div>
      <SentinelButton />
    </div>
  );
}
