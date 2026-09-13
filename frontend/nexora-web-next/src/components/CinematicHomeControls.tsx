"use client";

import { formatCount, getHomeSummaryAvailability } from "../lib/homeFeed";
import CinematicSceneControls from "./CinematicSceneControls";
import { useHomeScene } from "./HomeSceneProvider";
import styles from "./cinematic.module.css";

export default function CinematicHomeControls({ className }: { className?: string }) {
  const { status, data, errors } = useHomeScene();
  const { summary } = data;
  const summaryAvailability = getHomeSummaryAvailability(status, errors.summary, summary);

  const metrics = [
    { label: "Deals", value: summary.deals },
    { label: "Giveaways", value: summary.giveaways },
    { label: "Stores", value: summary.stores },
  ].filter((metric) => status !== "loading" && metric.value !== null);

  return (
    <div className={`${styles.strip}${className ? ` ${className}` : ""}`}>
      <p className={styles.tagline}>Less searching. More playing.</p>

      {metrics.length > 0 ? (
        <dl className={styles.metrics}>
          {metrics.map((metric) => (
            <div key={metric.label} className={styles.metric}>
              <dt className={styles.metricLabel}>{metric.label}</dt>
              <dd className={styles.metricValue}>{formatCount(metric.value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {summaryAvailability !== "available" ? (
        <p className={styles.syncPending} role="status">
          <span aria-hidden="true" />
          {summaryAvailability === "loading"
            ? "Syncing discovery"
            : summaryAvailability === "incomplete"
              ? "Summary incomplete"
              : "Summary unavailable"}
        </p>
      ) : null}

      <CinematicSceneControls />
    </div>
  );
}
