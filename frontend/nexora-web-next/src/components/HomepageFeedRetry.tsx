"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function HomepageFeedRetry({
  feed,
  className,
}: {
  feed: "deals" | "giveaways";
  className: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      aria-busy={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Retrying" : "Retry"} {feed} <span aria-hidden="true">→</span>
    </button>
  );
}
