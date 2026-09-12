"use client";

import { formatCount } from "../lib/homeFeed";
import { useHomeScene } from "./HomeSceneProvider";
import styles from "./cinematic.module.css";

export default function CinematicHomeControls({ className }: { className?: string }) {
  const { status, data, motionPaused, toggleMotion, soundOn, toggleSound } = useHomeScene();
  const { summary } = data;

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
      ) : (
        <p className={styles.syncPending} role="status">
          <span aria-hidden="true" />
          {status === "loading" ? "Syncing discovery" : "Sync pending"}
        </p>
      )}

      <div className={styles.controlGroup}>
        <button
          type="button"
          aria-pressed={soundOn}
          className={soundOn ? `${styles.controlButton} ${styles.controlOn}` : styles.controlButton}
          onClick={toggleSound}
        >
          <span className={styles.controlDot} aria-hidden="true" />
          {soundOn ? "Sound on" : "Sound off"}
        </button>

        <button
          type="button"
          aria-pressed={motionPaused}
          className={
            motionPaused ? `${styles.controlButton} ${styles.controlOn}` : styles.controlButton
          }
          onClick={toggleMotion}
        >
          {motionPaused ? "Resume motion" : "Pause motion"}
        </button>
      </div>
    </div>
  );
}
