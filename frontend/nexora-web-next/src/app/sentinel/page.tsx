import type { Metadata } from "next";
import CinematicTopNav from "@/components/CinematicTopNav";
import ProductFeedNotice from "@/components/ProductFeedNotice";
import SentinelExperience from "@/components/SentinelExperience";
import { getSentinel } from "@/lib/api";
import { createPageMetadata } from "@/lib/metadata";
import styles from "@/components/SentinelProduct.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "NEXORA Sentinel",
  description: "Preview NEXORA Sentinel, an AI assistant concept for game discovery, deal guidance, giveaways, and account safety.",
  path: "/sentinel",
  keywords: ["gaming AI assistant", "game recommendations", "deal assistant", "account safety guidance"],
});

export default async function SentinelPage() {
  const sentinel = await getSentinel();

  return (
    <div className={styles.scene}>
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      <CinematicTopNav className={styles.productHeader} />

      <main className={`${styles.stage} nx-page-reveal`} id="main-content" tabIndex={-1}>
        <div className={styles.noticeArea}>
          <ProductFeedNotice
            label="Sentinel"
            source={sentinel.source}
          />
        </div>

        <SentinelExperience {...sentinel} />
      </main>
    </div>
  );
}
