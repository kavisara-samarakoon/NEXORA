"use client";

import { useMemo, useState } from "react";
import {
  giveawayFilters,
  type Giveaway,
  type GiveawayFilter,
  type GiveawayTag,
} from "@/data/giveaways";
import type { GiveawaysResult } from "@/lib/api";

const platformAvailability = [
  { name: "Steam", value: 85, platform: "steam" },
  { name: "Epic Games", value: 72, platform: "epic" },
  { name: "GOG", value: 45, platform: "gog" },
  { name: "Prime", value: 60, platform: "prime" },
] as const;
const giveawayNetworkIcons = {
  sync: "🔄",
  globe: "🌐",
  link: "🔗",
  bell: "🔔",
} as const;

function tagDetails(
  tag: GiveawayTag,
): { label: string; icon: "clock" | "spark" | "flame" } {
  if (tag === "ending-soon") return { label: "Ending soon", icon: "clock" };
  if (tag === "new") return { label: "New", icon: "spark" };
  return { label: "Popular", icon: "flame" };
}

function TagIcon({ icon }: { icon: "clock" | "spark" | "flame" }) {
  if (icon === "clock") return <span aria-hidden="true">⏰</span>;
  if (icon === "spark") return <span aria-hidden="true">✨</span>;
  return <span aria-hidden="true">🔥</span>;
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
        <span aria-hidden="true">⏱️</span>
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
          <span aria-hidden="true">📋</span>
          Claim Guide
        </button>
        <button
          className={reminderIsSet ? "ga-card__reminder ga-card__reminder--active" : "ga-card__reminder"}
          type="button"
          aria-pressed={reminderIsSet}
          onClick={() => onToggleReminder(giveaway.id)}
        >
          <span aria-hidden="true">🔔</span>
          {reminderIsSet ? "Reminder Set" : "Add Reminder"}
        </button>
      </div>
    </article>
  );
}

function GiveawayNetworkStatus({ source }: { source: GiveawaysResult["source"] }) {
  const isApiSource = source === "api";
  const items = [
    { label: "Giveaway Sync", value: isApiSource ? "Backend API" : "Demo mode", badge: isApiSource ? "Live" : "Demo", tone: "orange", icon: "sync" },
    { label: "Data Source", value: isApiSource ? "Spring Boot" : "Static dataset", badge: isApiSource ? "API" : "Static", tone: "blue", icon: "globe" },
    { label: "Claim Links", value: "Safe redirects planned", badge: "Planned", tone: "green", icon: "link" },
    { label: "Alerts", value: "Local reminders active", badge: "Local", tone: "purple", icon: "bell" },
  ] as const;

  return (
    <aside className="ga-network" aria-labelledby="giveaway-network-title">
      <div className="ga-network__header">
        <span className="ga-network__header-icon" aria-hidden="true">📡</span>
        <div><span>Drop telemetry</span><h2 id="giveaway-network-title">Giveaway Network Status</h2></div>
        <span className="ga-network__live">
          <span aria-hidden="true" /> {isApiSource ? "Live" : "Demo"}
        </span>
      </div>

      <div className="ga-network__items">
        {items.map((item) => (
          <div className="ga-network__item" key={item.label}>
            <span className={`ga-network__item-icon ga-network__item-icon--${item.tone}`} aria-hidden="true">
              {giveawayNetworkIcons[item.icon]}
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

export default function GiveawaysExplorer({ giveaways, source }: GiveawaysResult) {
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
  }, [activeFilter, giveaways, searchQuery]);

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
              <span className="page-title-emoji" aria-hidden="true">🎁</span>
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
          <span className="page-search-icon" aria-hidden="true">🔍</span>
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
              <span aria-hidden="true">×</span>
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
            <span>{source === "api" ? "Backend intelligence feed" : "Static fallback feed"}</span>
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
                <span aria-hidden="true">📡</span>
                <h2>No drops found</h2>
                <p>No giveaways match your current search and filters.</p>
                <button type="button" onClick={resetFilters}>Reset filters</button>
              </div>
            )}
          </div>
        </section>
        <GiveawayNetworkStatus source={source} />
      </div>
    </>
  );
}
