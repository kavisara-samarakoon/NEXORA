import type { Metadata } from "next";
import CinematicTopNav from "@/components/CinematicTopNav";
import GiveawaysExplorer from "@/components/GiveawaysExplorer";
import ProductFeedNotice from "@/components/ProductFeedNotice";
import SentinelButton from "@/components/SentinelButton";
import { getGiveaways } from "@/lib/api";
import { createPageMetadata } from "@/lib/metadata";
import styles from "@/components/GiveawaysProduct.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Giveaway Intelligence",
  description:
    "Review free game giveaway entries, claim windows, and platform guidance with NEXORA Giveaway Intelligence.",
  path: "/giveaways",
  keywords: ["free games", "game giveaways", "Epic Games giveaways", "Prime Gaming"],
});

export default async function GiveawaysPage() {
  const { giveaways, source } = await getGiveaways();

  return (
    <div className={styles.scene}>
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      <CinematicTopNav className={styles.productHeader} />

      <main className={styles.stage} id="main-content" tabIndex={-1}>
        <div className={styles.noticeArea}>
          <ProductFeedNotice label="Giveaways" source={source} />
        </div>
        <GiveawaysExplorer giveaways={giveaways} source={source} />
      </main>

      <SentinelButton />
    </div>
  );
}
