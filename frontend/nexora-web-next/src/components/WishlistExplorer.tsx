"use client";

import { useMemo, useState } from "react";
import {
  wishlistFilters,
  type WishlistFilter,
  type WishlistItem,
  type WishlistPriority,
  type WishlistStatus,
} from "@/data/wishlist";
import type { WishlistResult } from "@/lib/api";

const wishlistNetworkIcons = {
  bolt: "⚡",
  globe: "🌐",
  mail: "📬",
  shield: "🛡️",
} as const;

function statusDetails(status: WishlistStatus) {
  if (status === "price-drop") return { label: "Price drop", icon: "down" } as const;
  if (status === "free-now") return { label: "Free now", icon: "gift" } as const;
  return { label: "Tracking", icon: "signal" } as const;
}

function priorityLabel(priority: WishlistPriority) {
  if (priority === "medium") return "Med";
  return priority;
}

function StatusIcon({ icon }: { icon: "down" | "gift" | "signal" }) {
  if (icon === "down") return <span aria-hidden="true">↓</span>;
  if (icon === "gift") return <span aria-hidden="true">🎁</span>;
  return <span aria-hidden="true">📡</span>;
}

function WishlistCard({
  alertIsActive,
  item,
  onToggleAlert,
}: {
  alertIsActive: boolean;
  item: WishlistItem;
  onToggleAlert: (itemId: number) => void;
}) {
  const status = statusDetails(item.status);
  const storeClass = item.store.toLowerCase().replace(" games", "");

  return (
    <article className={`wl-card wl-card--${storeClass}`}>
      <div className={`wl-card__accent wl-card__accent--${storeClass}`} />
      <div className="wl-card__header">
        <span className={`wl-card__store wl-card__store--${storeClass}`}>{item.store}</span>
        <span className={`wl-card__priority wl-card__priority--${item.priority}`}>
          {priorityLabel(item.priority)}
        </span>
      </div>

      <h2>{item.title}</h2>
      <div className="wl-card__status-row">
        <span className={`wl-card__status wl-card__status--${item.status}`}>
          <StatusIcon icon={status.icon} />
          {status.label}
        </span>
        <span className={alertIsActive ? "wl-card__alert wl-card__alert--on" : "wl-card__alert"}>
          <span aria-hidden="true" />
          {alertIsActive ? "Alert on" : "Alert paused"}
        </span>
      </div>

      {item.discount && <span className="wl-card__discount">{item.discount}</span>}

      <div className="wl-card__prices" aria-label={`${item.title} price information`}>
        <div><span>Current</span><strong className={item.currentPrice === "FREE" ? "wl-card__price--free" : undefined}>{item.currentPrice}</strong></div>
        <div><span>Target</span><strong className="wl-card__price--target">{item.targetPrice}</strong></div>
        <div><span>Lowest</span><strong>{item.lowestEver}</strong></div>
      </div>

      <div className="wl-card__actions">
        <button
          className={`wl-card__view wl-card__view--${storeClass}`}
          type="button"
          disabled
          title="Store redirects are planned for a later migration"
        >
          <span aria-hidden="true">↗</span>
          View Deal
        </button>
        <button
          className={alertIsActive ? "wl-card__edit wl-card__edit--active" : "wl-card__edit"}
          type="button"
          aria-pressed={alertIsActive}
          onClick={() => onToggleAlert(item.id)}
        >
          <span aria-hidden="true">✏️</span>
          {alertIsActive ? "Pause Alert" : "Enable Alert"}
        </button>
        <button className="wl-card__remove" type="button" disabled aria-label={`Remove ${item.title}`} title="Removal is planned for a later migration">
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </article>
  );
}

function WishlistAlertPanel({
  alerts,
  source,
  wishlistItems,
}: {
  alerts: Record<number, boolean>;
  source: WishlistResult["source"];
  wishlistItems: readonly WishlistItem[];
}) {
  const isApiSource = source === "api";
  const activeAlerts = wishlistItems.filter((item) => alerts[item.id]).length;
  const pausedAlerts = wishlistItems.length - activeAlerts;
  const priceDrops = wishlistItems.filter((item) => item.status === "price-drop").length;
  const freeNow = wishlistItems.filter((item) => item.status === "free-now").length;
  const storeCounts = [
    { store: "Steam", count: wishlistItems.filter((item) => item.store === "Steam").length, tone: "steam" },
    { store: "Epic", count: wishlistItems.filter((item) => item.store === "Epic Games").length, tone: "epic" },
    { store: "GOG", count: wishlistItems.filter((item) => item.store === "GOG").length, tone: "gog" },
  ] as const;
  const maxStoreCount = Math.max(1, ...storeCounts.map((store) => store.count));

  const items = [
    { label: "Alert Engine", value: "Local demo state", badge: "Demo", tone: "orange", icon: "bolt" },
    { label: "Data Source", value: isApiSource ? "Spring Boot" : "Static dataset", badge: isApiSource ? "API" : "Static", tone: "blue", icon: "globe" },
    { label: "Notification Queue", value: "Backend support later", badge: "Future", tone: "purple", icon: "mail" },
    { label: "Security", value: "Account-safe alerts planned", badge: "Planned", tone: "green", icon: "shield" },
  ] as const;

  return (
    <aside className="wl-network" aria-labelledby="wishlist-alert-title">
      <div className="wl-network__header">
        <span className="wl-network__header-icon" aria-hidden="true">📡</span>
        <div><span>Alert telemetry</span><h2 id="wishlist-alert-title">Wishlist Alert Status</h2></div>
        <span className="wl-network__live"><span aria-hidden="true" /> Demo</span>
      </div>

      <div className="wl-network__items">
        {items.map((item) => (
          <div className="wl-network__item" key={item.label}>
            <span className={`wl-network__item-icon wl-network__item-icon--${item.tone}`} aria-hidden="true">
              {wishlistNetworkIcons[item.icon]}
            </span>
            <span className="wl-network__item-copy"><strong>{item.label}</strong><small>{item.value}</small></span>
            <span className={`wl-network__badge wl-network__badge--${item.tone}`}>{item.badge}</span>
          </div>
        ))}
      </div>

      <div className="wl-network__summary">
        <div className="wl-network__section-label"><span>Alert summary</span><strong>Local</strong></div>
        <div className="wl-network__summary-rows">
          <div><span className="wl-network__dot wl-network__dot--active" /><span>Active alerts</span><strong>{activeAlerts}</strong></div>
          <div><span className="wl-network__dot wl-network__dot--paused" /><span>Paused</span><strong>{pausedAlerts}</strong></div>
          <div><span className="wl-network__dot wl-network__dot--drop" /><span>Price drops</span><strong>{priceDrops}</strong></div>
          <div><span className="wl-network__dot wl-network__dot--free" /><span>Free now</span><strong>{freeNow}</strong></div>
        </div>
      </div>

      <div className="wl-network__stores">
        <div className="wl-network__section-label"><span>Tracked stores</span><strong>{storeCounts.length}</strong></div>
        <div className="wl-network__store-rows">
          {storeCounts.map((store) => (
            <div key={store.store}>
              <span>{store.store}</span>
              <div><span className={`wl-network__store-fill wl-network__store-fill--${store.tone}`} style={{ width: `${(store.count / maxStoreCount) * 100}%` }} /></div>
              <strong>{store.count}</strong>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default function WishlistExplorer({ wishlistItems, source }: WishlistResult) {
  const [activeFilter, setActiveFilter] = useState<WishlistFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [alerts, setAlerts] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(wishlistItems.map((item) => [item.id, item.alertActive])),
  );

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return wishlistItems.filter((item) => {
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.store.toLowerCase().includes(query);

      if (!matchesSearch) return false;
      if (activeFilter === "All") return true;
      if (activeFilter === "Price Drop") return item.status === "price-drop";
      if (activeFilter === "Free Now") return item.status === "free-now";
      if (activeFilter === "High Priority") return item.priority === "high";
      return item.store === activeFilter;
    });
  }, [activeFilter, searchQuery, wishlistItems]);

  function toggleAlert(itemId: number) {
    setAlerts((current) => ({ ...current, [itemId]: !current[itemId] }));
  }

  function resetFilters() {
    setActiveFilter("All");
    setSearchQuery("");
  }

  const priceDropCount = wishlistItems.filter((item) => item.status === "price-drop").length;
  const freeCount = wishlistItems.filter((item) => item.status === "free-now").length;

  return (
    <>
      <section className="wl-hero" aria-labelledby="wishlist-title">
        <div className="wl-hero__orb wl-hero__orb--orange" />
        <div className="wl-hero__orb wl-hero__orb--blue" />
        <div className="wl-hero__scanlines" />
        <div className="wl-hero__content">
          <div className="wl-hero__copy">
            <div className="wl-hero__tag"><span aria-hidden="true" /> Smart alerts</div>
            <h1 id="wishlist-title">
              <span className="page-title-emoji" aria-hidden="true">📋</span>
              <span>Smart Wishlist Control</span>
            </h1>
            <p>
              Track wanted games, price drops, and free giveaways — get
              intelligent alerts and safe store redirects in one command center.
            </p>
          </div>
          <div className="wl-hero__stats" aria-label="Wishlist summary">
            <div><strong>{wishlistItems.length}</strong><span>Wishlist items</span></div>
            <div><strong>{priceDropCount}</strong><span>Price drops</span></div>
            <div><strong>{freeCount}</strong><span>Free alerts</span></div>
            <div className="wl-hero__protected"><strong aria-hidden="true">🛡️</strong><span>Protected</span></div>
          </div>
        </div>
      </section>

      <section className="wl-filter-panel" aria-label="Search and filter wishlist">
        <div className="wl-search">
          <span className="page-search-icon" aria-hidden="true">🔍</span>
          <label className="sr-only" htmlFor="wishlist-search">Search wishlist</label>
          <input
            id="wishlist-search"
            type="search"
            placeholder="Search wishlist, stores, games…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {searchQuery && (
            <button type="button" aria-label="Clear search" onClick={() => setSearchQuery("")}>
              <span aria-hidden="true">×</span>
            </button>
          )}
        </div>
        <div className="wl-chips" aria-label="Wishlist filters">
          {wishlistFilters.map((filter) => (
            <button
              className={activeFilter === filter ? "wl-chip wl-chip--active" : "wl-chip"}
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

      <div className="wl-layout">
        <section aria-label="Tracked wishlist games">
          <div className="wl-results-bar">
            <span><strong>{filteredItems.length}</strong> tracked games</span>
            <span>{source === "api" ? "Backend intelligence feed" : "Static fallback feed"}</span>
          </div>
          <div className="wl-grid">
            {filteredItems.map((item) => (
              <WishlistCard alertIsActive={alerts[item.id]} item={item} key={item.id} onToggleAlert={toggleAlert} />
            ))}
            {filteredItems.length === 0 && (
              <div className="wl-empty">
                <span aria-hidden="true">📡</span>
                <h2>No wishlist signals found</h2>
                <p>No games match your current search and filters.</p>
                <button type="button" onClick={resetFilters}>Reset filters</button>
              </div>
            )}
          </div>
        </section>
        <WishlistAlertPanel alerts={alerts} source={source} wishlistItems={wishlistItems} />
      </div>
    </>
  );
}
