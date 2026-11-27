"use client";

import { useState } from "react";
import styles from "@/components/DealsProduct.module.css";

export function safeDealArtworkUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const candidate = value.trim();
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export default function DealArtwork({
  title,
  thumbUrl,
  variant = "card",
}: {
  title: string;
  thumbUrl?: string | null;
  variant?: "card" | "modal";
}) {
  const safeThumb = safeDealArtworkUrl(thumbUrl);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(safeThumb) && failedUrl !== safeThumb;

  if (variant === "modal") {
    if (!showImage || !safeThumb) return null;
    return (
      <div className={styles.modalMedia}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={safeThumb}
          alt={`${title} cover artwork`}
          className={styles.modalMediaImg}
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(safeThumb)}
        />
      </div>
    );
  }

  return (
    <div className={styles.cardMedia}>
      {showImage && safeThumb ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={safeThumb}
          alt={`${title} cover artwork`}
          className={styles.cardMediaImg}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(safeThumb)}
        />
      ) : (
        <>
          <div className={styles.cardMediaArt} aria-hidden="true" />
          <span className={styles.artworkCaption}>Artwork unavailable</span>
        </>
      )}
    </div>
  );
}
