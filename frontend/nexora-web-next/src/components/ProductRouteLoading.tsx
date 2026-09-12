import Link from "next/link";
import UxStatePanel, { UxSkeleton } from "@/components/UxStatePanel";
import styles from "./ProductFeedback.module.css";

export default function ProductRouteLoading({ title }: { title: string }) {
  return (
    <main className={styles.state} id="main-content" tabIndex={-1}>
      <h1>{title}</h1>
      <UxStatePanel
        title={`Loading ${title.toLowerCase()}…`}
        description={<>Waiting for the latest feed. You can leave this page while it loads.<UxSkeleton /></>}
        tone="loading"
        role="status"
      />
      <Link className="ux-state__action" href="/settings">Open settings</Link>
    </main>
  );
}
