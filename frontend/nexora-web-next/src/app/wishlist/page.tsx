import type { Metadata } from "next";
import SentinelButton from "@/components/SentinelButton";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import WishlistExplorer from "@/components/WishlistExplorer";

export const metadata: Metadata = {
  title: "Smart Wishlist Control",
  description: "Track wanted games and local price alerts with NEXORA.",
};

export default function WishlistPage() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-shell">
        <Topbar />
        <main className="dashboard wishlist-page">
          <WishlistExplorer />
        </main>
      </div>
      <SentinelButton />
    </div>
  );
}
