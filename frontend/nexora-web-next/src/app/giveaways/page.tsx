import type { Metadata } from "next";
import CinematicTopNav from "@/components/CinematicTopNav";
import GiveawaysExplorer from "@/components/GiveawaysExplorer";
import ProductFeedNotice from "@/components/ProductFeedNotice";
import SentinelButton from "@/components/SentinelButton";
import { getGiveaways, getLiveGiveaways } from "@/lib/api";
import { createPageMetadata } from "@/lib/metadata";
import styles from "@/components/GiveawaysProduct.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Giveaway Intelligence",
  description:
    "Browse live free game giveaways, eligibility instructions, claim windows, and verified claim destinations with NEXORA Giveaway Intelligence.",
  path: "/giveaways",
  keywords: ["free games", "game giveaways", "Epic Games giveaways", "Steam giveaways", "GamerPower"],
});

export default async function GiveawaysPage() {
  const [{ giveaways, source }, liveCatalog] = await Promise.all([
    getGiveaways(),
    getLiveGiveaways(),
  ]);

  return (
    <div className={styles.scene}>
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      <CinematicTopNav className={styles.productHeader} />

      <main className={`${styles.stage} nx-page-reveal`} id="main-content" tabIndex={-1}>
        {liveCatalog.source !== "gamerpower" && (
          <div className={styles.noticeArea}>
            <ProductFeedNotice label="Giveaways" source={source} />
          </div>
        )}
        <GiveawaysExplorer
          giveaways={giveaways}
          source={source}
          initialLiveCatalog={liveCatalog}
        />
      </main>

      <SentinelButton />
    </div>
  );
}
