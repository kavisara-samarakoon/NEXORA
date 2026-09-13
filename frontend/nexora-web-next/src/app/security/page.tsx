import type { Metadata } from "next";
import CinematicTopNav from "@/components/CinematicTopNav";
import ProductFeedNotice from "@/components/ProductFeedNotice";
import SecurityCenter from "@/components/SecurityCenter";
import SentinelButton from "@/components/SentinelButton";
import { getSecurityStatus } from "@/lib/api";
import { createPageMetadata } from "@/lib/metadata";
import styles from "@/components/SecurityProduct.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Cyber Security Command Center",
  description: "Review gaming account protection, API safeguards, security activity, and network status in the NEXORA command center.",
  path: "/security",
  keywords: ["gaming account security", "cybersecurity dashboard", "account protection", "network security"],
});

export default async function SecurityPage() {
  const { securityStatus, source } = await getSecurityStatus();

  return (
    <div className={styles.scene}>
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      <CinematicTopNav className={styles.productHeader} />

      <main className={`${styles.stage} nx-page-reveal`} id="main-content" tabIndex={-1}>
        <div className={styles.noticeArea}>
          <ProductFeedNotice
            label="Security"
            source={source}
          />
        </div>

        <SecurityCenter securityStatus={securityStatus} source={source} />
      </main>

      <SentinelButton />
    </div>
  );
}
