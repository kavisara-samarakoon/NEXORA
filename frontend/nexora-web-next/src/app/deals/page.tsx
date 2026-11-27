import type { Metadata } from "next";
import CinematicTopNav from "@/components/CinematicTopNav";
import DealsExplorer from "@/components/DealsExplorer";
import ProductFeedNotice from "@/components/ProductFeedNotice";
import { getDeals, getLiveDeals } from "@/lib/api";
import { createPageMetadata } from "@/lib/metadata";
import styles from "@/components/DealsProduct.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Game Deals Intelligence",
  description: "Compare live PC game discounts, pricing signals, and store offers with NEXORA Game Deals Intelligence.",
  path: "/deals",
  keywords: ["game deals", "PC game discounts", "Steam deals", "game price tracking"],
});

export default async function DealsPage() {
  const [{ deals, source }, liveCatalog] = await Promise.all([
    getDeals(),
    getLiveDeals({ pageSize: 12 }),
  ]);

  return (
    <div className={styles.scene}>
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      <CinematicTopNav className={styles.productHeader} />

      <main className={`${styles.stage} nx-page-reveal`} id="main-content" tabIndex={-1}>
        {liveCatalog.source !== "cheapshark" && (
          <div className={styles.noticeArea}>
            <ProductFeedNotice label="Deals" source={source} />
          </div>
        )}
        <DealsExplorer deals={deals} source={source} initialLiveCatalog={liveCatalog} />
      </main>
    </div>
  );
}
