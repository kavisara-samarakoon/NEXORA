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
        {pending ? "Checking for an updated feed…" : attempted ? "Check complete. The current feed status is shown above." : ""}
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
  return (
    <aside className={styles.notice} aria-label={`${label} source`}>
      <div role="status">
        <strong>{source === "api" ? `${label} feed loaded` : `${label} feed unavailable`}</strong>
        <p>{source === "api"
          ? "Loaded from NEXORA. Preview sections are labelled separately."
          : "Showing the bundled preview because the feed could not be loaded. Preview prices, availability, and status may be out of date."}</p>
      </div>
      {source === "fallback" ? <ProductFeedRetry label={label.toLowerCase()} /> : null}
    </aside>
  );
}
