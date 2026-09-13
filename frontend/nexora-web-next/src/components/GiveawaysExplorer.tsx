"use client";

import { useMemo, useState } from "react";
import { ProductFeedRetry } from "@/components/ProductFeedNotice";
import UxStatePanel from "@/components/UxStatePanel";
import {
  giveawayFilters,
  type Giveaway,
  type GiveawayFilter,
} from "@/data/giveaways";
import type { GiveawaysResult } from "@/lib/api";
import styles from "@/components/GiveawaysProduct.module.css";

function GiveawayCard({
  giveaway,
  reminderIsSet,
  guideIsOpen,
  onToggleGuide,
  onToggleReminder,
}: {
  giveaway: Giveaway;
  reminderIsSet: boolean;
  guideIsOpen: boolean;
  onToggleGuide: (giveawayId: number) => void;
  onToggleReminder: (giveawayId: number) => void;
}) {
  const titleId = `giveaway-title-${giveaway.id}`;
  const guideId = `giveaway-guide-${giveaway.id}`;

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={styles.cardAccent} aria-hidden="true" />

      <div className={styles.cardHeader}>
        <span className={styles.platform}>{giveaway.platformLabel}</span>
        <span className={styles.tag}>Sample</span>
      </div>

      <h2 className={styles.cardTitle} id={titleId}>
        {giveaway.title}
      </h2>
      <p className={styles.genre}>{giveaway.genre}</p>

      <div className={styles.priceRow}>
        <span className={styles.priceFree}>Sample entry</span>
        <span className={styles.priceOriginal}>Sample list price {giveaway.originalPrice}</span>
      </div>

      <div className={styles.timerRow}>
        <span className={styles.timerLabel}>
          <span className={styles.timerDot} aria-hidden="true" />
          {giveaway.timer}
        </span>
        <span className={`${styles.statusBadge} ${styles.statusPreview}`}>
          Unverified sample
        </span>
      </div>

      {guideIsOpen ? (
        <div className={styles.guidePanel} id={guideId} role="status">
          No verified claim destination, eligibility, region, entitlement type, or end date is
          available for this sample. Verified claim links are future work.
        </div>
      ) : null}

      <div className={styles.actions}>
        <button
          className={guideIsOpen ? `${styles.claimButton} ${styles.claimButtonOpen}` : styles.claimButton}
          type="button"
          aria-controls={guideIsOpen ? guideId : undefined}
          aria-expanded={guideIsOpen}
          aria-label={`${guideIsOpen ? "Hide" : "Show"} availability note for ${giveaway.title}`}
          onClick={() => onToggleGuide(giveaway.id)}
        >
          Availability note
        </button>
        <button
          className={
            reminderIsSet
              ? `${styles.reminderButton} ${styles.reminderButtonActive}`
              : styles.reminderButton
          }
          type="button"
          aria-pressed={reminderIsSet}
          aria-label={`${reminderIsSet ? "Remove" : "Mark"} page-only preview reminder for ${giveaway.title}`}
          title="Page-only preview; no reminder is saved and no notification will be sent"
          onClick={() => onToggleReminder(giveaway.id)}
        >
          {reminderIsSet ? "Marked on page" : "Preview reminder"}
        </button>
      </div>
    </article>
  );
}

function GiveawayNetworkStatus({ source, giveaways }: GiveawaysResult) {
  const isApiSource = source === "api";
  const platformAvailability = useMemo(() => {
    const totalEntries = Math.max(giveaways.length, 1);
    return Array.from(new Set(giveaways.map((item) => item.platform))).map((platform) => {
      const entries = giveaways.filter((item) => item.platform === platform);
      return {
        platform,
        name: entries[0]?.platformLabel ?? platform,
        value: Math.round((entries.length / totalEntries) * 100),
      };
    });
  }, [giveaways]);

  const items = [
    {
      label: "Sample source",
      value: isApiSource ? "Seeded backend catalog" : "Bundled fallback catalog",
      badge: "Sample",
    },
    {
      label: "Verification",
      value: "No live offer verification",
      badge: "Unverified",
    },
    {
      label: "Claim links",
      value: "No verified destinations",
      badge: "Planned",
    },
    {
      label: "Reminders",
      value: "Page-only preview control",
      badge: "Preview",
    },
  ] as const;

  return (
    <aside className={styles.network} aria-labelledby="giveaway-network-title">
      <div className={styles.networkHeader}>
        <span className={styles.networkHeaderIcon} aria-hidden="true" />
        <div className={styles.networkHeaderCopy}>
          <span>Sample catalog</span>
          <h2 className={styles.networkTitle} id="giveaway-network-title">
            Giveaway data status
          </h2>
        </div>
        <span
          className={
            isApiSource
              ? `${styles.networkLive} ${styles.networkLiveApi}`
              : `${styles.networkLive} ${styles.networkLiveDemo}`
          }
        >
          <span aria-hidden="true" />
          Sample
        </span>
      </div>

      <div className={styles.networkItems}>
        {items.map((item) => (
          <div className={styles.networkItem} key={item.label}>
            <span className={styles.networkItemIcon} aria-hidden="true" />
            <span className={styles.networkItemCopy}>
              <strong>{item.label}</strong>
              <small>{item.value}</small>
            </span>
            <span className={styles.networkBadge}>{item.badge}</span>
          </div>
        ))}
      </div>

      <div className={styles.networkPlatforms}>
        <div className={styles.networkPlatformsLabel}>
          <span>Platform distribution</span>
          <strong>Sample entries</strong>
        </div>
        <div className={styles.networkPlatformRows}>
          {giveaways.length === 0 ? (
            <p className={styles.networkEmptyNote}>No platform entries in this feed.</p>
          ) : null}
          {platformAvailability.map((platform) => (
            <div className={styles.networkPlatformRow} key={platform.platform}>
              <span>{platform.name}</span>
              <div>
                <span className={styles.networkPlatformFill} style={{ width: `${platform.value}%` }} />
              </div>
              <strong>{platform.value}%</strong>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default function GiveawaysExplorer({ giveaways, source }: GiveawaysResult) {
  const [activeFilter, setActiveFilter] = useState<GiveawayFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [reminders, setReminders] = useState<Set<number>>(() => new Set());
  const [reminderMessage, setReminderMessage] = useState("");
  const [openGuide, setOpenGuide] = useState<number | null>(null);

  const filteredGiveaways = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return giveaways.filter((giveaway) => {
      const matchesSearch =
        !query ||
        giveaway.title.toLowerCase().includes(query) ||
        giveaway.platformLabel.toLowerCase().includes(query) ||
        giveaway.genre.toLowerCase().includes(query);

      if (!matchesSearch) return false;
      if (activeFilter === "All") return true;
      return giveaway.platformLabel === activeFilter;
    });
  }, [activeFilter, giveaways, searchQuery]);

  function toggleReminder(giveawayId: number) {
    const reminderAlreadySet = reminders.has(giveawayId);
    setReminderMessage(
      reminderAlreadySet
        ? "Preview reminder removed."
        : "Reminder marked for this page only. It is not saved and will not send a notification.",
    );
    setReminders((current) => {
      const next = new Set(current);
      if (next.has(giveawayId)) next.delete(giveawayId);
      else next.add(giveawayId);
      return next;
    });
  }

  function resetFilters() {
    setActiveFilter("All");
    setSearchQuery("");
  }

  const platformCount = new Set(giveaways.map((giveaway) => giveaway.platform)).size;
  const sourceLabel = source === "api" ? "Backend sample data" : "Fallback sample data";

  return (
    <>
      <div className={styles.topGrid}>
        <section className={styles.routeHero} aria-labelledby="giveaways-title">
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowLine} aria-hidden="true" />
            {source === "api" ? "Backend sample catalog" : "Fallback sample catalog"}
          </p>
          <h1 id="giveaways-title" className={styles.title}>
            Giveaway Intelligence
          </h1>
          <p className={styles.lede}>
            Explore seeded examples of a future giveaway catalog. These entries are not verified
            offers and do not include claim destinations, eligibility, regions, entitlement types,
            or end dates.
          </p>
          <div className={styles.statsRow} aria-label="Giveaway statistics">
            <div className={styles.stat}>
              <strong className={styles.statValue}>{giveaways.length}</strong>
              <span className={styles.statLabel}>Sample entries</span>
            </div>
            <div className={styles.stat}>
              <strong className={styles.statValue}>0</strong>
              <span className={styles.statLabel}>Verified links</span>
            </div>
            <div className={styles.stat}>
              <strong className={styles.statValue}>{platformCount}</strong>
              <span className={styles.statLabel}>Platforms</span>
            </div>
          </div>
        </section>

        <GiveawayNetworkStatus giveaways={giveaways} source={source} />
      </div>

      <UxStatePanel
        className="ux-state--compact giveaways-source-fallback"
        description={source === "api"
          ? "The backend returned seeded demonstration entries. NEXORA does not verify their availability and provides no claim links or claim-window data in v0.90."
          : "The backend could not be reached, so bundled sample entries are shown. They are not verified offers and include no claim links or claim-window data."}
        title={source === "api" ? "Unverified sample catalog" : "Fallback sample catalog"}
        tone="fallback"
      />

      {reminderMessage ? (
        <p className={styles.inlineStatus} role="status">
          {reminderMessage}
        </p>
      ) : null}

      <section className={styles.filterPanel} aria-label="Search and filter giveaways">
        <div className={styles.searchField}>
          <span className={styles.searchIcon} aria-hidden="true">
            🔍
          </span>
          <label className="sr-only" htmlFor="giveaway-search">
            Search giveaways
          </label>
          <input
            id="giveaway-search"
            type="search"
            placeholder="Search giveaways, platforms, genres…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {searchQuery ? (
            <button
              className={styles.searchClear}
              type="button"
              aria-label="Clear giveaway search"
              onClick={() => setSearchQuery("")}
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>

        <div className={styles.chips} aria-label="Giveaway filters">
          {giveawayFilters.map((filter) => (
            <button
              className={activeFilter === filter ? `${styles.chip} ${styles.chipActive}` : styles.chip}
              type="button"
              aria-pressed={activeFilter === filter}
              key={filter}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.resultsSection} aria-label="Giveaway sample entries">
        <div className={styles.resultsBar}>
          <span>
            <strong>{filteredGiveaways.length}</strong> giveaway entries
          </span>
          <span>{sourceLabel}</span>
        </div>

        <div className={styles.grid}>
          {filteredGiveaways.map((giveaway) => (
            <GiveawayCard
              giveaway={giveaway}
              reminderIsSet={reminders.has(giveaway.id)}
              guideIsOpen={openGuide === giveaway.id}
              key={giveaway.id}
              onToggleGuide={(giveawayId) =>
                setOpenGuide((current) => (current === giveawayId ? null : giveawayId))
              }
              onToggleReminder={toggleReminder}
            />
          ))}

          {filteredGiveaways.length === 0 ? (
            <div className={styles.stateSlot}>
              <UxStatePanel
                className="ux-state--grid giveaways-empty"
                description={
                  giveaways.length === 0
                    ? source === "api"
                      ? "The backend feed returned no displayed giveaway entries. This does not prove that no real-world promotions exist; confirm current availability with each store."
                      : "No bundled local demo entries are available. This does not prove that stores have no active real-world promotions."
                    : (
                        <>
                          No entries in this displayed feed match{" "}
                          {searchQuery.trim() ? <>“{searchQuery.trim()}” and </> : null}
                          the <strong>{activeFilter}</strong> filter. This filtered view does not describe
                          every real-world promotion.
                        </>
                      )
                }
                role="status"
                title={giveaways.length === 0 ? "No giveaway entries available" : "No matching giveaways"}
                tone="empty"
              >
                {giveaways.length > 0 ? (
                  <button className="ux-state__action" type="button" onClick={resetFilters}>
                    Reset search and filters
                  </button>
                ) : (
                  <ProductFeedRetry label="giveaways" />
                )}
              </UxStatePanel>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
