import type { Metadata } from "next";
import CinematicTopNav from "@/components/CinematicTopNav";
import SentinelButton from "@/components/SentinelButton";
import SettingsCenter from "@/components/SettingsCenter";
import { createPageMetadata } from "@/lib/metadata";
import styles from "@/components/SettingsProduct.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Account Control Center",
  description: "Explore NEXORA profile preferences, notifications, security controls, connected gaming platforms, and appearance settings.",
  path: "/settings",
  keywords: ["NEXORA settings", "gaming profile", "notification preferences", "connected gaming platforms"],
});

export default function SettingsPage() {
  return (
    <div className={styles.scene}>
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      <CinematicTopNav className={styles.productHeader} />

      <main className={`${styles.stage} nx-page-reveal`} id="main-content" tabIndex={-1}>
        <SettingsCenter />
      </main>

      <SentinelButton />
    </div>
  );
}
