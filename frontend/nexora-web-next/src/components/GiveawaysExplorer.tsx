"use client";

import { useMemo, useState } from "react";
import { ProductFeedRetry } from "@/components/ProductFeedNotice";
import UxStatePanel from "@/components/UxStatePanel";
import {
  giveawayFilters,
  liveGiveawayPlatformFilters,
  liveGiveawayTypeFilters,
  type Giveaway,
  type GiveawayFilter,
  type LiveGiveaway,
  type LiveGiveawaysCatalog,
} from "@/data/giveaways";
import { getLiveGiveaways, type GiveawaysResult } from "@/lib/api";
import styles from "@/components/GiveawaysProduct.module.css";

type GiveawaysMode = "live" | "sample";

function safeGamerPowerDestinationUrl(value: string | null | undefined) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (host !== "www.gamerpower.com" && host !== "gamerpower.com") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function safeGiveawayMediaUrl(value: string | null | undefined) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function formatGiveawayDate(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatRefreshTimestamp(value: string | null | undefined) {
  if (!value) return "Not refreshed yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function LiveGiveawayCard({
  giveaway,
  guideIsOpen,
  reminderIsSet,
  onToggleGuide,
  onToggleReminder,
}: {
  giveaway: LiveGiveaway;
  guideIsOpen: boolean;
  reminderIsSet: boolean;
  onToggleGuide: (giveawayId: number) => void;
  onToggleReminder: (giveawayId: number) => void;
}) {
  const titleId = `live-giveaway-title-${giveaway.id}`;
  const guideId = `live-giveaway-guide-${giveaway.id}`;
  const claimUrl = safeGamerPowerDestinationUrl(giveaway.claimUrl);
  const mediaUrl = safeGiveawayMediaUrl(giveaway.thumbnailUrl ?? giveaway.imageUrl);
  const [imgFailedUrl, setImgFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(mediaUrl) && imgFailedUrl !== mediaUrl;

  const statusText = giveaway.status === "active"
    ? "Active"
    : giveaway.status === "expired"
      ? "Expired"
      : "Status unknown";

  const endSummary = giveaway.endsAtUtc
    ? giveaway.daysRemaining !== null && giveaway.status === "active"
      ? `Ends ${formatGiveawayDate(giveaway.endsAtUtc, "Unknown")} (${giveaway.daysRemaining}d left)`
      : `Ended ${formatGiveawayDate(giveaway.endsAtUtc, "Unknown")}`
    : "End date not supplied";

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={styles.cardAccent} aria-hidden="true" />
      {showImage && mediaUrl ? (
        <div className={styles.cardMedia}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl}
            alt={`${giveaway.title} cover artwork`}
            className={styles.cardMediaImg}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailedUrl(mediaUrl)}
          />
        </div>
      ) : null}

      <div className={styles.cardHeader}>
        <span className={styles.platform}>{giveaway.platformLabel}</span>
        <span className={styles.tag}>{giveaway.type}</span>
      </div>

      <h2 className={styles.cardTitle} id={titleId}>
        {giveaway.title}
      </h2>
      <p className={styles.genre}>
        {giveaway.rawPlatforms ?? giveaway.platformLabel}
        {giveaway.publishedAtUtc
          ? ` · Published ${formatGiveawayDate(giveaway.publishedAtUtc, "Unknown")}`
          : ""}
      </p>

      <div className={styles.priceRow}>
        <span className={styles.priceFree}>Free</span>
        <span className={styles.priceOriginal}>
          {giveaway.worth ? `Listed value ${giveaway.worth}` : "Value not supplied"}
        </span>
      </div>

      <div className={styles.timerRow}>
        <span
          className={
            giveaway.daysRemaining !== null && giveaway.daysRemaining <= 3 && giveaway.status === "active"
              ? `${styles.timerLabel} ${styles.timerUrgent}`
              : styles.timerLabel
          }
        >
          <span className={styles.timerDot} aria-hidden="true" />
          {endSummary}
        </span>
        <span
          className={
            giveaway.status === "active"
              ? styles.statusBadge
              : `${styles.statusBadge} ${styles.statusPreview}`
          }
        >
          {statusText}
        </span>
      </div>

      {guideIsOpen ? (
        <div className={styles.guidePanel} id={guideId} role="status">
          {giveaway.description ? <p className={styles.guideDesc}>{giveaway.description}</p> : null}
          {giveaway.instructions ? (
            <p className={styles.guideSteps}>
              <strong>Eligibility &amp; claim steps:</strong> {giveaway.instructions}
            </p>
          ) : (
            <p className={styles.guideSteps}>
              No additional eligibility instructions supplied. Verify requirements on GamerPower.
            </p>
          )}
        </div>
      ) : null}

      <div className={styles.actions}>
        {claimUrl ? (
          <a
            className={styles.claimLinkButton}
            href={claimUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open giveaway for ${giveaway.title} on GamerPower in a new tab`}
          >
            ↗ Open Giveaway
          </a>
        ) : null}
        <button
          className={guideIsOpen ? `${styles.claimButton} ${styles.claimButtonOpen}` : styles.claimButton}
          type="button"
          aria-controls={guideIsOpen ? guideId : undefined}
          aria-expanded={guideIsOpen}
          aria-label={`${guideIsOpen ? "Hide" : "Show"} eligibility and steps for ${giveaway.title}`}
          onClick={() => onToggleGuide(giveaway.id)}
        >
          {guideIsOpen ? "Hide details" : "Eligibility & steps"}
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
          available for this sample. Switch to Live Giveaways when GamerPower is reachable.
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

function GiveawayNetworkStatus({
  giveaways,
  liveCatalog,
  mode,
  source,
}: GiveawaysResult & {
  liveCatalog: LiveGiveawaysCatalog | null;
  mode: GiveawaysMode;
}) {
  const isLiveMode = mode === "live" && liveCatalog?.source === "gamerpower";
  const isApiSource = source === "api";
  const platformAvailability = useMemo(() => {
    if (isLiveMode && liveCatalog) {
      const total = Math.max(liveCatalog.giveaways.length, 1);
      const counts = new Map<string, number>();
      for (const item of liveCatalog.giveaways) {
        counts.set(item.platformLabel, (counts.get(item.platformLabel) ?? 0) + 1);
      }
      return Array.from(counts.entries())
        .slice(0, 5)
        .map(([name, count]) => ({
          platform: name,
          name,
          value: Math.round((count / total) * 100),
        }));
    }
    const totalEntries = Math.max(giveaways.length, 1);
    return Array.from(new Set(giveaways.map((item) => item.platform))).map((platform) => {
      const entries = giveaways.filter((item) => item.platform === platform);
      return {
        platform,
        name: entries[0]?.platformLabel ?? platform,
        value: Math.round((entries.length / totalEntries) * 100),
      };
    });
  }, [giveaways, isLiveMode, liveCatalog]);

  const items = [
    {
      label: "Data source",
      value: isLiveMode
        ? "GamerPower public API"
        : mode === "live"
          ? "GamerPower unavailable"
          : isApiSource
            ? "Seeded sample catalog"
            : "Bundled sample catalog",
      badge: isLiveMode ? "GamerPower" : mode === "live" ? "Unavailable" : "Sample",
    },
    {
      label: "Verification",
      value: isLiveMode ? "Provider destinations verified HTTPS" : "No live offer verification",
      badge: isLiveMode ? liveCatalog?.cacheState ?? "Live" : "Unverified",
    },
    {
      label: "Last refresh",
      value: isLiveMode
        ? formatRefreshTimestamp(liveCatalog?.lastRefreshedAtUtc)
        : "Static sample entries",
      badge: isLiveMode ? "UTC" : "Sample",
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
          <span>{isLiveMode ? "Live catalog" : "Catalog status"}</span>
          <h2 className={styles.networkTitle} id="giveaway-network-title">
            Giveaway data status
          </h2>
        </div>
        <span
          className={
            isLiveMode
              ? `${styles.networkLive} ${styles.networkLiveApi}`
              : `${styles.networkLive} ${styles.networkLiveDemo}`
          }
        >
          <span aria-hidden="true" />
          {isLiveMode ? "Live" : "Sample"}
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
          <strong>{isLiveMode ? "Live entries" : "Sample entries"}</strong>
        </div>
        <div className={styles.networkPlatformRows}>
          {platformAvailability.length === 0 ? (
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

      <p className={styles.networkAttribution}>
        Live giveaway intelligence provided by{" "}
        <a href="https://www.gamerpower.com" target="_blank" rel="noopener noreferrer">
          GamerPower.com
        </a>
        .
      </p>
    </aside>
  );
}

export default function GiveawaysExplorer({
  giveaways,
  source,
  initialLiveCatalog,
}: GiveawaysResult & { initialLiveCatalog?: LiveGiveawaysCatalog }) {
  const [liveCatalog, setLiveCatalog] = useState<LiveGiveawaysCatalog | null>(
    initialLiveCatalog ?? null,
  );
  const [mode, setMode] = useState<GiveawaysMode>(
    initialLiveCatalog?.source === "gamerpower" ? "live" : "sample",
  );
  const [isRefreshingLive, setIsRefreshingLive] = useState(false);
  const [activeFilter, setActiveFilter] = useState<GiveawayFilter>("All");
  const [livePlatformFilter, setLivePlatformFilter] = useState<string>("All");
  const [liveTypeFilter, setLiveTypeFilter] = useState<string>("All Types");
  const [searchQuery, setSearchQuery] = useState("");
  const [reminders, setReminders] = useState<Set<number>>(() => new Set());
  const [reminderMessage, setReminderMessage] = useState("");
  const [openGuide, setOpenGuide] = useState<number | null>(null);

  const isLiveMode = mode === "live" && liveCatalog?.source === "gamerpower";
  const liveGiveaways = useMemo(
    () => (isLiveMode ? liveCatalog.giveaways : []),
    [isLiveMode, liveCatalog],
  );

  const filteredLiveGiveaways = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return liveGiveaways.filter((item) => {
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.platformLabel.toLowerCase().includes(query) ||
        (item.rawPlatforms ?? "").toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query);
      if (!matchesSearch) return false;
      if (livePlatformFilter !== "All") {
        const raw = (item.rawPlatforms ?? "").toLowerCase();
        if (
          item.platformLabel !== livePlatformFilter &&
          !raw.includes(livePlatformFilter.toLowerCase())
        ) {
          return false;
        }
      }
      if (liveTypeFilter !== "All Types" && item.type !== liveTypeFilter) {
        return false;
      }
      return true;
    });
  }, [liveGiveaways, livePlatformFilter, liveTypeFilter, searchQuery]);

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

  async function refreshLiveFeed() {
    setIsRefreshingLive(true);
    try {
      const updated = await getLiveGiveaways();
      setLiveCatalog(updated);
      if (updated.source === "gamerpower") {
        setMode("live");
      }
    } finally {
      setIsRefreshingLive(false);
    }
  }

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
    setLivePlatformFilter("All");
    setLiveTypeFilter("All Types");
    setSearchQuery("");
  }

  const displayedCount = isLiveMode ? filteredLiveGiveaways.length : filteredGiveaways.length;
  const totalCount = isLiveMode ? liveGiveaways.length : giveaways.length;
  const verifiedLinksCount = isLiveMode ? liveGiveaways.length : 0;
  const platformCount = isLiveMode
    ? new Set(liveGiveaways.map((item) => item.platformLabel)).size
    : new Set(giveaways.map((giveaway) => giveaway.platform)).size;
  const sourceLabel = isLiveMode
    ? `Live GamerPower feed · ${liveCatalog?.cacheState ?? "live"}`
    : source === "api"
      ? "Backend sample data"
      : "Fallback sample data";

  return (
    <>
      <div className={styles.topGrid}>
        <section className={styles.routeHero} aria-labelledby="giveaways-title">
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowLine} aria-hidden="true" />
            {isLiveMode ? "Live GamerPower catalog" : source === "api" ? "Backend sample catalog" : "Fallback sample catalog"}
          </p>
          <h1 id="giveaways-title" className={styles.title}>
            Giveaway Intelligence
          </h1>
          <p className={styles.lede}>
            {isLiveMode ? (
              <>
                Explore active free game and DLC giveaways powered by{" "}
                <a
                  className={styles.inlineLink}
                  href="https://www.gamerpower.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GamerPower.com
                </a>
                , including claim instructions, end dates where supplied, and verified destination links.
              </>
            ) : (
              "Explore seeded examples of the giveaway catalog. Sample entries are not verified offers and do not include claim destinations, eligibility, or end dates."
            )}
          </p>
          <div className={styles.modeRow}>
            <div className={styles.modeSwitch} role="group" aria-label="Choose giveaway source">
              <button
                type="button"
                className={mode === "live" ? `${styles.modeButton} ${styles.modeButtonActive}` : styles.modeButton}
                aria-pressed={mode === "live"}
                disabled={isRefreshingLive}
                onClick={() => {
                  if (liveCatalog?.source === "gamerpower") {
                    setMode("live");
                  } else {
                    void refreshLiveFeed();
                  }
                }}
              >
                {isRefreshingLive ? "Refreshing…" : "Live Giveaways"}
              </button>
              <button
                type="button"
                className={mode === "sample" ? `${styles.modeButton} ${styles.modeButtonActive}` : styles.modeButton}
                aria-pressed={mode === "sample"}
                onClick={() => setMode("sample")}
              >
                Sample Fallback
              </button>
            </div>
            <button
              type="button"
              className={styles.refreshButton}
              disabled={isRefreshingLive}
              onClick={() => void refreshLiveFeed()}
            >
              {isRefreshingLive ? "Checking GamerPower…" : "Refresh live giveaways"}
            </button>
          </div>
          <div className={styles.statsRow} aria-label="Giveaway statistics">
            <div className={styles.stat}>
              <strong className={styles.statValue}>{totalCount}</strong>
              <span className={styles.statLabel}>{isLiveMode ? "Live entries" : "Sample entries"}</span>
            </div>
            <div className={styles.stat}>
              <strong className={styles.statValue}>{verifiedLinksCount}</strong>
              <span className={styles.statLabel}>Verified links</span>
            </div>
            <div className={styles.stat}>
              <strong className={styles.statValue}>{platformCount}</strong>
              <span className={styles.statLabel}>Platforms</span>
            </div>
          </div>
        </section>

        <GiveawayNetworkStatus
          giveaways={giveaways}
          liveCatalog={liveCatalog}
          mode={mode}
          source={source}
        />
      </div>

      {!isLiveMode ? (
        <UxStatePanel
          className="ux-state--compact giveaways-source-fallback"
          description={
            liveCatalog?.source === "unavailable" && liveCatalog.notice
              ? `${liveCatalog.notice} Unverified sample entries are shown separately below; they do not include verified claim links.`
              : source === "api"
                ? "The backend returned seeded demonstration entries. NEXORA does not verify their availability and provides no claim links or claim-window data in sample mode."
                : "The live feed is unavailable, so bundled sample entries are shown. They are not verified offers and include no claim links or claim-window data."
          }
          title={liveCatalog?.source === "unavailable" ? "Live giveaways unavailable — unverified sample catalog" : "Unverified sample catalog"}
          tone="fallback"
        />
      ) : null}

      {isLiveMode && liveCatalog?.cacheState === "stale" && liveCatalog.notice ? (
        <UxStatePanel
          className="ux-state--compact"
          description={liveCatalog.notice}
          title="Showing cached GamerPower giveaways"
          tone="fallback"
        />
      ) : null}

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
            placeholder="Search giveaways, platforms, types…"
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

        {isLiveMode ? (
          <>
            <div className={styles.chips} aria-label="Live giveaway platform filters">
              {liveGiveawayPlatformFilters.map((filter) => (
                <button
                  className={livePlatformFilter === filter ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                  type="button"
                  aria-pressed={livePlatformFilter === filter}
                  key={filter}
                  onClick={() => setLivePlatformFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
            <div className={styles.chips} aria-label="Live giveaway type filters">
              {liveGiveawayTypeFilters.map((typeFilter) => (
                <button
                  className={liveTypeFilter === typeFilter ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                  type="button"
                  aria-pressed={liveTypeFilter === typeFilter}
                  key={typeFilter}
                  onClick={() => setLiveTypeFilter(typeFilter)}
                >
                  {typeFilter}
                </button>
              ))}
            </div>
          </>
        ) : (
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
        )}
      </section>

      <section
        className={styles.resultsSection}
        aria-label={isLiveMode ? "Live giveaway entries" : "Giveaway sample entries"}
      >
        <div className={styles.resultsBar}>
          <span>
            <strong>{displayedCount}</strong> giveaway entries
          </span>
          <span>{sourceLabel}</span>
        </div>

        <div className={styles.grid}>
          {isLiveMode
            ? filteredLiveGiveaways.map((giveaway) => (
                <LiveGiveawayCard
                  giveaway={giveaway}
                  guideIsOpen={openGuide === giveaway.id}
                  reminderIsSet={reminders.has(giveaway.id)}
                  key={giveaway.id}
                  onToggleGuide={(giveawayId) =>
                    setOpenGuide((current) => (current === giveawayId ? null : giveawayId))
                  }
                  onToggleReminder={toggleReminder}
                />
              ))
            : filteredGiveaways.map((giveaway) => (
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

          {displayedCount === 0 ? (
            <div className={styles.stateSlot}>
              <UxStatePanel
                className="ux-state--grid giveaways-empty"
                description={
                  totalCount === 0
                    ? "The provider returned no displayed giveaway entries right now. Confirm current availability with each store or retry."
                    : (
                        <>
                          No entries in this displayed feed match{" "}
                          {searchQuery.trim() ? <>“{searchQuery.trim()}” and </> : null}
                          the active filter.
                        </>
                      )
                }
                role="status"
                title={totalCount === 0 ? "No giveaway entries available" : "No matching giveaways"}
                tone="empty"
              >
                {totalCount > 0 ? (
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
