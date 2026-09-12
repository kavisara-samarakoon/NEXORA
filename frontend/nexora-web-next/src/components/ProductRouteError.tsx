"use client";

import Link from "next/link";
import { useTransition } from "react";
import UxStatePanel from "@/components/UxStatePanel";
import styles from "./ProductFeedback.module.css";

export default function ProductRouteError({ retry }: { retry: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <main className={styles.state} id="main-content" tabIndex={-1}>
      <h1>This page could not be loaded</h1>
      <UxStatePanel
        title="Please try again"
        description="A temporary problem interrupted this page. Retry to load it again, or open another section."
        tone="error"
        role="alert"
      >
        <button className="ux-state__action" type="button" disabled={pending} aria-busy={pending}
          onClick={() => startTransition(() => retry())}>
          {pending ? "Retrying…" : "Try again"}
        </button>
        <Link className="ux-state__action" href="/deals">Browse deals</Link>
      </UxStatePanel>
    </main>
  );
}
