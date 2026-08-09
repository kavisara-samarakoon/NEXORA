"use client";

import { useMemo, useState } from "react";
import {
  wishlistFilters,
  wishlistItems,
  type WishlistFilter,
  type WishlistItem,
  type WishlistPriority,
  type WishlistStatus,
} from "@/data/wishlist";

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
  if (icon === "down") {
    return <svg viewBox="0 0 24 24"><path d="M12 4v16M5 13l7 7 7-7" /></svg>;
  }
  if (icon === "gift") {
    return <svg viewBox="0 0 24 24"><path d="M4 10h16v11H4zM3 6h18v4H3zM12 6v15M12 6H8.5a2.5 2.5 0 1 1 0-5C11 1 12 6 12 6Zm0 0h3.5a2.5 2.5 0 1 0 0-5C13 1 12 6 12 6Z" /></svg>;
  }
  return <svg viewBox="0 0 24 24"><path d="M5 16a10 10 0 0 1 14 0M8 12a6 6 0 0 1 8 0M11 8a2 2 0 0 1 2 0M12 20h.01" /></svg>;
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
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4 10 14M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></svg>
          View deal
        </button>
        <button
          className={alertIsActive ? "wl-card__edit wl-card__edit--active" : "wl-card__edit"}
          type="button"
          aria-pressed={alertIsActive}
          onClick={() => onToggleAlert(item.id)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" /></svg>
          {alertIsActive ? "Pause alert" : "Enable alert"}
        </button>
        <button className="wl-card__remove" type="button" disabled aria-label={`Remove ${item.title}`} title="Removal is planned for a later migration">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>
    </article>
  );
}

function WishlistAlertPanel({ alerts }: { alerts: Record<number, boolean> }) {
  const activeAlerts = wishlistItems.filter((item) => alerts[item.id]).length;
  const pausedAlerts = wishlistItems.length - activeAlerts;
  const priceDrops = wishlistItems.filter((item) => item.status === "price-drop").length;
  const freeNow = wishlistItems.filter((item) => item.status === "free-now").length;
  const storeCounts = [
    { store: "Steam", count: wishlistItems.filter((item) => item.store === "Steam").length, tone: "steam" },
    { store: "Epic", count: wishlistItems.filter((item) => item.store === "Epic Games").length, tone: "epic" },
    { store: "GOG", count: wishlistItems.filter((item) => item.store === "GOG").length, tone: "gog" },
  ] as const;
  const maxStoreCount = Math.max(...storeCounts.map((store) => store.count));

  const items = [
    { label: "Alert Engine", value: "Local demo state", badge: "Demo", tone: "orange", icon: "bolt" },
    { label: "Data Source", value: "Static dataset", badge: "Static", tone: "blue", icon: "globe" },
    { label: "Notification Queue", value: "Backend support later", badge: "Future", tone: "purple", icon: "mail" },
    { label: "Security", value: "Account-safe alerts planned", badge: "Planned", tone: "green", icon: "shield" },
  ] as const;

  return (
    <aside className="wl-network" aria-labelledby="wishlist-alert-title">
      <div className="wl-network__header">
        <span className="wl-network__header-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 16a10 10 0 0 1 14 0M8 12a6 6 0 0 1 8 0M11 8a2 2 0 0 1 2 0M12 20h.01" /></svg>
        </span>
        <div><span>Alert telemetry</span><h2 id="wishlist-alert-title">Wishlist Alert Status</h2></div>
        <span className="wl-network__live"><span aria-hidden="true" /> Demo</span>
      </div>

      <div className="wl-network__items">
        {items.map((item) => (
          <div className="wl-network__item" key={item.label}>
            <span className={`wl-network__item-icon wl-network__item-icon--${item.tone}`} aria-hidden="true">
              {item.icon === "bolt" && <svg viewBox="0 0 24 24"><path d="m13 2-9 12h8l-1 8 9-12h-8z" /></svg>}
              {item.icon === "globe" && <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>}
              {item.icon === "mail" && <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>}
              {item.icon === "shield" && <svg viewBox="0 0 24 24"><path d="M12 3 5 7v5c0 4 2.7 7.1 7 9 4.3-1.9 7-5 7-9V7zM9 12l2 2 4-4" /></svg>}
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

export default function WishlistExplorer() {
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
  }, [activeFilter, searchQuery]);

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
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM9 4v16M12 8h4M12 12h4M12 16h3" /></svg>
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
            <div className="wl-hero__protected"><strong><svg viewBox="0 0 24 24"><path d="M12 3 5 7v5c0 4 2.7 7.1 7 9 4.3-1.9 7-5 7-9V7zM9 12l2 2 4-4" /></svg></strong><span>Protected</span></div>
          </div>
        </div>
      </section>

      <section className="wl-filter-panel" aria-label="Search and filter wishlist">
        <div className="wl-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
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
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
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
            <span>Static intelligence feed</span>
          </div>
          <div className="wl-grid">
            {filteredItems.map((item) => (
              <WishlistCard alertIsActive={alerts[item.id]} item={item} key={item.id} onToggleAlert={toggleAlert} />
            ))}
            {filteredItems.length === 0 && (
              <div className="wl-empty">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16a10 10 0 0 1 14 0M8 12a6 6 0 0 1 8 0M11 8a2 2 0 0 1 2 0M12 20h.01" /></svg>
                <h2>No wishlist signals found</h2>
                <p>No games match your current search and filters.</p>
                <button type="button" onClick={resetFilters}>Reset filters</button>
              </div>
            )}
          </div>
        </section>
        <WishlistAlertPanel alerts={alerts} />
      </div>
    </>
  );
}
