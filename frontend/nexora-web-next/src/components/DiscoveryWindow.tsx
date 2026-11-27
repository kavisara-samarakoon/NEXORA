"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { isExternalHref } from "../lib/homeFeed";
import { useHomeScene } from "./HomeSceneProvider";
import styles from "./cinematic.module.css";

type TabKey = "deals" | "giveaways";

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "deals", label: "Deals" },
  { key: "giveaways", label: "Giveaways" },
];

function Arrow() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" focusable="false">
      <path
        d="M4 10h11M10 5l5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ItemLink({ href, fallbackHref, children }: {
  href: string | null;
  fallbackHref: string;
  children: ReactNode;
}) {
  if (href && isExternalHref(href)) {
    return (
      <a className={styles.itemLink} href={href} target="_blank" rel="noopener noreferrer">
        {children}
        <Arrow />
      </a>
    );
  }

  return (
    <Link className={styles.itemLink} href={href ?? fallbackHref}>
      {children}
      <Arrow />
    </Link>
  );
}

function Skeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <span className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
      <span className={`${styles.skeletonLine} ${styles.skeletonWide}`} />
      <span className={`${styles.skeletonLine} ${styles.skeletonMid}`} />
    </div>
  );
}

export default function DiscoveryWindow() {
  const { status, data, errors, reload } = useHomeScene();
  const tabRefs = useRef<Partial<Record<TabKey, HTMLButtonElement>>>({});
  const [activeTab, setActiveTab] = useState<TabKey>("deals");
  const hasPreview =
    status === "ready" && !errors[activeTab] &&
    Boolean(activeTab === "deals" ? data.deal : data.giveaway);

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const nextTab = activeTab === "deals" ? "giveaways" : "deals";
    setActiveTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  const renderBody = () => {
    if (status === "loading") return <Skeleton />;

    const failed = activeTab === "deals" ? errors.deals : errors.giveaways;
    if (failed || status === "error") {
      return (
        <>
          <p className={styles.stateTitle}>Discovery on standby</p>
          <p className={styles.stateText}>
            We can’t load {activeTab} right now. Refresh when you’re ready.
          </p>
          <button type="button" className={styles.retry} onClick={reload}>
            Refresh discovery
            <Arrow />
          </button>
        </>
      );
    }

    if (activeTab === "deals") {
      const deal = data.deal;
      if (!deal) {
        return (
          <>
            <p className={styles.stateTitle}>Room for your next discovery</p>
            <p className={styles.stateText}>
              No deals to preview yet. Explore the catalog with your own search.
            </p>
            <Link className={styles.retry} href="/deals">
              Explore deals
              <Arrow />
            </Link>
          </>
        );
      }

      return (
        <>
          <div className={styles.itemMeta}>
            <span>{deal.store ?? "Store not listed"}</span>
            {deal.discountPercent !== null ? (
              <span className={styles.discount}>−{deal.discountPercent}%</span>
            ) : null}
          </div>

          <h3 className={styles.itemTitle}>{deal.title}</h3>

          {deal.salePrice || deal.normalPrice ? (
            <div className={styles.priceRow}>
              {deal.salePrice ? <span className={styles.salePrice}>{deal.salePrice}</span> : null}
              {deal.normalPrice && deal.normalPrice !== deal.salePrice ? (
                <span className={styles.oldPrice}>{deal.normalPrice}</span>
              ) : null}
            </div>
          ) : null}

          <ItemLink href={deal.href} fallbackHref="/deals">
            View deal
          </ItemLink>
        </>
      );
    }

    const giveaway = data.giveaway;
    if (!giveaway) {
      return (
        <>
          <p className={styles.stateTitle}>Between discoveries</p>
          <p className={styles.stateText}>
            No giveaways to preview yet. You can check again on the giveaways page.
          </p>
          <Link className={styles.retry} href="/giveaways">
            Explore giveaways
            <Arrow />
          </Link>
        </>
      );
    }

    return (
      <>
        <div className={styles.itemMeta}>
          <span>{giveaway.platform ?? "Platform not listed"}</span>
          {giveaway.worth ? (
            <span className={styles.discount}>
              {giveaway.status === "sample" ? "Sample list price" : "Listed value"} {giveaway.worth}
            </span>
          ) : null}
        </div>

        <h3 className={styles.itemTitle}>{giveaway.title}</h3>

        <p className={styles.stateText}>
          {giveaway.status === "sample" ? "Unverified sample" : "Unverified entry"}. No verified claim destination.
        </p>

        <Link className={styles.itemLink} href="/giveaways">
          {giveaway.status === "sample" ? "Explore giveaway samples" : "View giveaway details"}
          <Arrow />
        </Link>
      </>
    );
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Discovery window</h2>
        <span className={hasPreview ? styles.pulse : styles.standbyDot} aria-hidden="true" />
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Discovery window feed">
        {TABS.map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              ref={(element) => { tabRefs.current[tab.key] = element ?? undefined; }}
              type="button"
              role="tab"
              id={`discovery-tab-${tab.key}`}
              aria-selected={selected}
              aria-controls="discovery-panel"
              tabIndex={selected ? 0 : -1}
              className={selected ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => setActiveTab(tab.key)}
              onKeyDown={onTabKeyDown}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        id="discovery-panel"
        role="tabpanel"
        aria-labelledby={`discovery-tab-${activeTab}`}
        aria-live="polite"
        aria-busy={status === "loading"}
        className={styles.panelBody}
      >
        {renderBody()}
      </div>
    </div>
  );
}
