"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styles from "./ProductFeedback.module.css";

export function ProductFeedRetry({ label }: { label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [attempted, setAttempted] = useState(false);

  return (
    <div className={styles.retry}>
      <button
        className="ux-state__action"
        type="button"
        disabled={pending}
        aria-busy={pending}
        onClick={() => {
          setAttempted(true);
          startTransition(() => router.refresh());
        }}
      >
        {pending ? "Checking…" : `Retry ${label}`}
      </button>
      <span role="status">
        {pending ? "Checking for updated data…" : attempted ? "Check complete. The current status is shown above." : ""}
      </span>
    </div>
  );
}

export default function ProductFeedNotice({
  label,
  source,
}: {
  label: string;
  source: "api" | "fallback";
}) {
  if (source === "api") return null;

  return (
    <aside className={styles.notice} aria-label={`${label} data status`}>
      <div role="status">
        <strong>{label} sample preview</strong>
        <p>
          Live data is temporarily unavailable, so NEXORA is keeping this screen usable with sample content.
          Prices, availability, and status may be outdated until the feed reconnects.
        </p>
      </div>
      <ProductFeedRetry label={label.toLowerCase()} />
    </aside>
  );
}
