"use client";

import { useMemo, useState } from "react";
import {
  giveawayFilters,
  giveaways,
  type Giveaway,
  type GiveawayFilter,
  type GiveawayTag,
} from "@/data/giveaways";

const platformAvailability = [
  { name: "Steam", value: 85, platform: "steam" },
  { name: "Epic Games", value: 72, platform: "epic" },
  { name: "GOG", value: 45, platform: "gog" },
  { name: "Prime", value: 60, platform: "prime" },
] as const;

function tagDetails(
  tag: GiveawayTag,
): { label: string; icon: "clock" | "spark" | "flame" } {
  if (tag === "ending-soon") return { label: "Ending soon", icon: "clock" };
  if (tag === "new") return { label: "New", icon: "spark" };
  return { label: "Popular", icon: "flame" };
}

function TagIcon({ icon }: { icon: "clock" | "spark" | "flame" }) {
  if (icon === "clock") {
    return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
  }

  if (icon === "spark") {
    return <svg viewBox="0 0 24 24"><path d="m12 2 1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5zM19 17l.6 2.4L22 20l-2.4.6L19 23l-.6-2.4L16 20l2.4-.6z" /></svg>;
  }

  return <svg viewBox="0 0 24 24"><path d="M13 3s1 4-2 6c-2-3-5-2-5-2s-2 3-1 7c1 5 5 7 8 7 5 0 8-4 7-9-1-4-5-6-5-6s1 4-2 5c1-5 0-8 0-8Z" /></svg>;
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
  const tag = tagDetails(giveaway.tag);
  const isEndingSoon = giveaway.daysRemaining < 2;
  const progressTone = giveaway.claimed >= 80 ? "hot" : giveaway.claimed >= 50 ? "warm" : "cool";

  return (
    <article className={`ga-card ga-card--${giveaway.platform}`}>
      <div className={`ga-card__accent ga-card__accent--${giveaway.platform}`} />
      <div className="ga-card__header">
        <span className={`ga-card__platform ga-card__platform--${giveaway.platform}`}>
          {giveaway.platformLabel}
        </span>
        <span className={`ga-card__tag ga-card__tag--${giveaway.tag}`}>
          <TagIcon icon={tag.icon} />
          {tag.label}
        </span>
      </div>

      <h2>{giveaway.title}</h2>
      <p className="ga-card__genre">{giveaway.genre}</p>
      <div className="ga-card__price">
        <strong>Free</strong>
        <del>{giveaway.originalPrice}</del>
      </div>

      <div className={`ga-card__timer${isEndingSoon ? " ga-card__timer--urgent" : ""}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
        <span>{giveaway.timer} remaining</span>
        <span className="ga-card__status"><span aria-hidden="true" /> Live</span>
      </div>

      <div className="ga-card__progress">
        <div><span>Claimed</span><strong>{giveaway.claimed}%</strong></div>
        <div
          className="ga-card__progress-track"
          role="progressbar"
          aria-label={`${giveaway.title} claim progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={giveaway.claimed}
        >
          <span className={`ga-card__progress-fill ga-card__progress-fill--${progressTone}`} style={{ width: `${giveaway.claimed}%` }} />
        </div>
      </div>

      {guideIsOpen && (
        <div className="ga-card__guide" role="status">
          Open {giveaway.platformLabel}, sign in, and claim this title before the window closes.
        </div>
      )}

      <div className="ga-card__actions">
        <button
          className={`ga-card__claim ga-card__claim--${giveaway.platform}`}
          type="button"
          aria-expanded={guideIsOpen}
          onClick={() => onToggleGuide(giveaway.id)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h12v16H8zM4 8h4M4 12h4M4 16h4M11 8h6M11 12h6M11 16h4" /></svg>
          Claim guide
        </button>
        <button
          className={reminderIsSet ? "ga-card__reminder ga-card__reminder--active" : "ga-card__reminder"}
          type="button"
          aria-pressed={reminderIsSet}
          onClick={() => onToggleReminder(giveaway.id)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
          {reminderIsSet ? "Reminder set" : "Add reminder"}
        </button>
      </div>
    </article>
  );
}

function GiveawayNetworkStatus() {
  const items = [
    { label: "Giveaway Sync", value: "Demo mode", badge: "Demo", tone: "orange", icon: "sync" },
    { label: "Data Source", value: "Static dataset", badge: "Static", tone: "blue", icon: "globe" },
    { label: "Claim Links", value: "Safe redirects planned", badge: "Planned", tone: "green", icon: "link" },
    { label: "Alerts", value: "Local reminders active", badge: "Local", tone: "purple", icon: "bell" },
  ] as const;

  return (
    <aside className="ga-network" aria-labelledby="giveaway-network-title">
      <div className="ga-network__header">
        <span className="ga-network__header-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 16a10 10 0 0 1 14 0M8 12a6 6 0 0 1 8 0M11 8a2 2 0 0 1 2 0M12 20h.01" /></svg>
        </span>
        <div><span>Drop telemetry</span><h2 id="giveaway-network-title">Giveaway Network Status</h2></div>
        <span className="ga-network__live"><span aria-hidden="true" /> Demo</span>
      </div>

      <div className="ga-network__items">
        {items.map((item) => (
          <div className="ga-network__item" key={item.label}>
            <span className={`ga-network__item-icon ga-network__item-icon--${item.tone}`} aria-hidden="true">
              {item.icon === "sync" && <svg viewBox="0 0 24 24"><path d="M20 7h-6V1M4 17h6v6M20 7a9 9 0 0 0-15 3M4 17a9 9 0 0 0 15-3" /></svg>}
              {item.icon === "globe" && <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>}
              {item.icon === "link" && <svg viewBox="0 0 24 24"><path d="m9 15 6-6M7 18H6a4 4 0 0 1 0-8h3M17 6h1a4 4 0 0 1 0 8h-3" /></svg>}
              {item.icon === "bell" && <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>}
            </span>
            <span className="ga-network__item-copy"><strong>{item.label}</strong><small>{item.value}</small></span>
            <span className={`ga-network__badge ga-network__badge--${item.tone}`}>{item.badge}</span>
          </div>
        ))}
      </div>

      <div className="ga-network__platforms">
        <div className="ga-network__platforms-label"><span>Platform availability</span><strong>Live</strong></div>
        <div className="ga-network__platform-rows">
          {platformAvailability.map((platform) => (
            <div className="ga-network__platform-row" key={platform.name}>
              <span>{platform.name}</span>
              <div><span className={`ga-network__platform-fill ga-network__platform-fill--${platform.platform}`} style={{ width: `${platform.value}%` }} /></div>
              <strong>{platform.value}%</strong>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default function GiveawaysExplorer() {
  const [activeFilter, setActiveFilter] = useState<GiveawayFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [reminders, setReminders] = useState<Set<number>>(() => new Set());
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
      if (activeFilter === "Ending Soon") return giveaway.daysRemaining < 2;
      if (activeFilter === "New") return giveaway.tag === "new";
      if (activeFilter === "Popular") return giveaway.tag === "popular";
      return giveaway.platformLabel === activeFilter;
    });
  }, [activeFilter, searchQuery]);

  function toggleReminder(giveawayId: number) {
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

  const endingSoonCount = giveaways.filter((giveaway) => giveaway.daysRemaining < 2).length;
  const platformCount = new Set(giveaways.map((giveaway) => giveaway.platform)).size;

  return (
    <>
      <section className="ga-hero" aria-labelledby="giveaways-title">
        <div className="ga-hero__orb ga-hero__orb--blue" />
        <div className="ga-hero__orb ga-hero__orb--orange" />
        <div className="ga-hero__scanlines" />
        <div className="ga-hero__content">
          <div className="ga-hero__copy">
            <div className="ga-hero__tag"><span aria-hidden="true" /> Live tracking</div>
            <h1 id="giveaways-title">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v11H4zM3 6h18v4H3zM12 6v15M12 6H8.5a2.5 2.5 0 1 1 0-5C11 1 12 6 12 6Zm0 0h3.5a2.5 2.5 0 1 0 0-5C13 1 12 6 12 6Z" /></svg>
              <span>Live Giveaway Intelligence</span>
            </h1>
            <p>
              Track free game drops, claim windows, and safe store redirects
              across every major platform — never miss a free title again.
            </p>
          </div>
          <div className="ga-hero__stats" aria-label="Giveaway statistics">
            <div><strong>{giveaways.length}</strong><span>Live now</span></div>
            <div><strong>{endingSoonCount}</strong><span>Ending soon</span></div>
            <div><strong>{platformCount}</strong><span>Platforms</span></div>
          </div>
        </div>
      </section>

      <section className="ga-filter-panel" aria-label="Search and filter giveaways">
        <div className="ga-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
          <label className="sr-only" htmlFor="giveaway-search">Search giveaways</label>
          <input
            id="giveaway-search"
            type="search"
            placeholder="Search giveaways, platforms, genres…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {searchQuery && (
            <button type="button" aria-label="Clear search" onClick={() => setSearchQuery("")}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          )}
        </div>
        <div className="ga-chips" aria-label="Giveaway filters">
          {giveawayFilters.map((filter) => (
            <button
              className={activeFilter === filter ? "ga-chip ga-chip--active" : "ga-chip"}
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

      <div className="ga-layout">
        <section aria-label="Available game giveaways">
          <div className="ga-results-bar">
            <span><strong>{filteredGiveaways.length}</strong> live drops detected</span>
            <span>Static intelligence feed</span>
          </div>
          <div className="ga-grid">
            {filteredGiveaways.map((giveaway) => (
              <GiveawayCard
                giveaway={giveaway}
                reminderIsSet={reminders.has(giveaway.id)}
                guideIsOpen={openGuide === giveaway.id}
                key={giveaway.id}
                onToggleGuide={(giveawayId) => setOpenGuide((current) => current === giveawayId ? null : giveawayId)}
                onToggleReminder={toggleReminder}
              />
            ))}
            {filteredGiveaways.length === 0 && (
              <div className="ga-empty">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16a10 10 0 0 1 14 0M8 12a6 6 0 0 1 8 0M11 8a2 2 0 0 1 2 0M12 20h.01" /></svg>
                <h2>No drops found</h2>
                <p>No giveaways match your current search and filters.</p>
                <button type="button" onClick={resetFilters}>Reset filters</button>
              </div>
            )}
          </div>
        </section>
        <GiveawayNetworkStatus />
      </div>
    </>
  );
}
