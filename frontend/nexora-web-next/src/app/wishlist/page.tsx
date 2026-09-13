import type { Metadata } from "next";
import CinematicTopNav from "@/components/CinematicTopNav";
import ProductFeedNotice from "@/components/ProductFeedNotice";
import SentinelButton from "@/components/SentinelButton";
import WishlistExplorer from "@/components/WishlistExplorer";
import { getWishlist } from "@/lib/api";
import { createPageMetadata } from "@/lib/metadata";
import styles from "@/components/WishlistProduct.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Smart Wishlist Control",
  description: "Organize wanted games, target prices, tracked stores, and local price alerts with NEXORA Smart Wishlist Control.",
  path: "/wishlist",
  keywords: ["gaming wishlist", "game price alerts", "game price tracker", "wanted games"],
});

export default async function WishlistPage() {
  const { wishlistItems, source } = await getWishlist();

  return (
    <div className={styles.scene}>
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      <CinematicTopNav className={styles.productHeader} />

      <main className={`${styles.stage} nx-page-reveal`} id="main-content" tabIndex={-1}>
        <div className={styles.noticeArea}>
          <ProductFeedNotice
            label="Wishlist"
            source={source}
          />
        </div>

        <WishlistExplorer wishlistItems={wishlistItems} source={source} />
      </main>

      <SentinelButton />
    </div>
  );
}
