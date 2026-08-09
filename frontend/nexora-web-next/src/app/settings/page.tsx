import type { Metadata } from "next";
import SentinelButton from "@/components/SentinelButton";
import SettingsCenter from "@/components/SettingsCenter";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export const metadata: Metadata = {
  title: "Account Control Center",
  description: "Manage your NEXORA profile, notifications, security, platforms, and appearance.",
};

export default function SettingsPage() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-shell">
        <Topbar />
        <main className="dashboard settings-page">
          <SettingsCenter />
        </main>
      </div>
      <SentinelButton />
    </div>
  );
}
