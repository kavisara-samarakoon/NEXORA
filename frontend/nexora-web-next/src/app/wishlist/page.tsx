import type { Metadata } from "next";
import SentinelButton from "@/components/SentinelButton";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import WishlistExplorer from "@/components/WishlistExplorer";
import { getWishlist } from "@/lib/api";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Smart Wishlist Control",
  description: "Organize wanted games, target prices, tracked stores, and local price alerts with NEXORA Smart Wishlist Control.",
  path: "/wishlist",
  keywords: ["gaming wishlist", "game price alerts", "game price tracker", "wanted games"],
});

export default async function WishlistPage() {
  const { wishlistItems, source } = await getWishlist();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-shell">
        <Topbar />
        <main className="dashboard wishlist-page">
          <WishlistExplorer wishlistItems={wishlistItems} source={source} />
        </main>
      </div>
      <SentinelButton />
    </div>
  );
}
