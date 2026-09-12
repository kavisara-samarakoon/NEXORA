import type { Metadata } from "next";
import Link from "next/link";

import CinematicHomeControls from "../components/CinematicHomeControls";
import CinematicTopNav from "../components/CinematicTopNav";
import DiscoveryCoreMount from "../components/DiscoveryCoreMount";
import DiscoveryWindow from "../components/DiscoveryWindow";
import HomeSceneProvider from "../components/HomeSceneProvider";

import styles from "./page.module.css";

// Optional — delete this block if your layout already sets the homepage title.
export const metadata: Metadata = {
  title: "NEXORA — Every Game. Every Deal. One Place.",
  description:
    "Standout deals. Free discoveries. Your next great game starts here.",
};

export default function HomePage() {
  return (
    <HomeSceneProvider>
      <div className={styles.scene}>
        {/* Atmosphere layers — decorative only */}
        <div className={styles.atmosphere} aria-hidden="true" />
        <div className={styles.threads} aria-hidden="true" />
        <div className={styles.dust} aria-hidden="true" />
        <div className={styles.orbitField} aria-hidden="true">
          <span className={styles.orbitA} />
          <span className={styles.orbitB} />
        </div>
        <div className={styles.vignette} aria-hidden="true" />

        <CinematicTopNav className={styles.header} />

        <main id="main-content" className={styles.stage}>
          {/* The Discovery Core sits behind the copy on wide screens and
              takes its own row once the layout stacks. */}
          <div className={styles.core} aria-hidden="true">
            <DiscoveryCoreMount />
          </div>

          <section className={styles.hero}>
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowLine} aria-hidden="true" />
              Game deals intelligence
            </p>

            <h1 className={styles.headline}>
              Every Game.
              <br />
              Every Deal.
              <br />
              <span className={styles.headlineAccent}>One Place.</span>
            </h1>

            <p className={styles.lede}>
              Standout deals. Free discoveries. Your next great game starts here.
            </p>

            <div className={styles.ctaRow}>
              <Link href="/deals" className={styles.ctaPrimary}>
                <span>Explore deals</span>
                <svg
                  className={styles.ctaArrow}
                  viewBox="0 0 20 20"
                  width="18"
                  height="18"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M3 10h13M11 5l5 5-5 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>

              <Link href="/giveaways" className={styles.ctaSecondary}>
                <span>View giveaways</span>
                <svg
                  className={styles.ctaArrow}
                  viewBox="0 0 20 20"
                  width="18"
                  height="18"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M3 10h13M11 5l5 5-5 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          </section>

          <aside className={styles.window} aria-label="Discovery window">
            <DiscoveryWindow />
          </aside>

          <CinematicHomeControls className={styles.strip} />
        </main>
      </div>
    </HomeSceneProvider>
  );
}
