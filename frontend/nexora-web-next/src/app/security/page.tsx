import type { Metadata } from "next";
import SecurityCenter from "@/components/SecurityCenter";
import SentinelButton from "@/components/SentinelButton";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export const metadata: Metadata = {
  title: "Cyber Security Command Center",
  description: "Review NEXORA account, API, and network protection status.",
};

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
