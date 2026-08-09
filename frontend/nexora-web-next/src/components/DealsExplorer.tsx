"use client";

import { useMemo, useState } from "react";
import {
  dealFilters,
  deals,
  type DealFilter,
  type DealStatus,
  type GameDeal,
} from "@/data/deals";

const networkActivity = [35, 58, 42, 75, 52, 90, 68, 45, 82, 60, 38, 72];

function storeClass(store: GameDeal["store"]) {
  return store.toLowerCase().replace(" games", "");
}

function statusClass(status: DealStatus) {
  if (status === "Historical Low" || status === "Lowest Ever") return "hot";
  if (status === "Great Deal" || status === "Good Price") return "good";
  if (status === "Free Weekend") return "free";
  return "neutral";
}

function DealCard({
  deal,
  alertIsSet,
  onToggleAlert,
}: {
  deal: GameDeal;
  alertIsSet: boolean;
  onToggleAlert: (dealId: number) => void;
}) {
  const color = storeClass(deal.store);

  return (
    <article className={`deals-card deals-card--${color}`}>
      <div className={`deals-card__accent deals-card__accent--${color}`} />
      <div className="deals-card__header">
        <span className={`deals-card__store deals-card__store--${color}`}>
          {deal.store}
        </span>
        <span className="deals-card__discount">{deal.discount}</span>
      </div>

      <h2 className="deals-card__title">{deal.title}</h2>
      <p className="deals-card__category">{deal.category}</p>

      <div className="deals-card__rating" aria-label={`${deal.rating} out of 5 stars`}>
        <span className="deals-card__stars" aria-hidden="true">{deal.stars}</span>
        <span className="deals-card__rating-number">{deal.rating}</span>
        <span className={`deals-card__status deals-card__status--${statusClass(deal.status)}`}>
          {deal.status}
        </span>
      </div>

      <div className="deals-card__prices">
        <del>{deal.priceOld}</del>
        <strong className={deal.priceNew === "FREE" ? "deals-card__price--free" : undefined}>
          {deal.priceNew}
        </strong>
      </div>

      <div className="deals-card__actions">
        <button
          className={alertIsSet ? "deals-card__alert deals-card__alert--active" : "deals-card__alert"}
          type="button"
          aria-pressed={alertIsSet}
          onClick={() => onToggleAlert(deal.id)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
          </svg>
          {alertIsSet ? "Alert set" : "Set alert"}
        </button>
        <button
          className={`deals-card__view deals-card__view--${color}`}
          type="button"
          aria-disabled="true"
          title="Store redirects are planned for a later migration"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 4h6v6M20 4 10 14M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
          </svg>
          View deal
        </button>
      </div>
    </article>
  );
}

function DealNetworkStatus() {
  const items = [
    { label: "Price Sync", value: "Demo mode", badge: "Demo", tone: "orange", icon: "sync" },
    { label: "Data Source", value: "Static dataset", badge: "Static", tone: "blue", icon: "globe" },
    { label: "Cache", value: "Ready for backend", badge: "Ready", tone: "green", icon: "database" },
    { label: "Security", value: "Safe redirects planned", badge: "Planned", tone: "purple", icon: "shield" },
  ] as const;

  return (
    <aside className="deals-network" aria-labelledby="deal-network-title">
      <div className="deals-network__header">
        <span className="deals-network__header-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 16a10 10 0 0 1 14 0M8 12a6 6 0 0 1 8 0M11 8a2 2 0 0 1 2 0M12 20h.01" /></svg>
        </span>
        <div>
          <span>System telemetry</span>
          <h2 id="deal-network-title">Deal Network Status</h2>
        </div>
        <span className="deals-network__live"><span aria-hidden="true" /> Demo</span>
      </div>

      <div className="deals-network__items">
        {items.map((item) => (
          <div className="deals-network__item" key={item.label}>
            <span className={`deals-network__item-icon deals-network__item-icon--${item.tone}`} aria-hidden="true">
              {item.icon === "sync" && <svg viewBox="0 0 24 24"><path d="M20 7h-6V1M4 17h6v6M20 7a9 9 0 0 0-15 3M4 17a9 9 0 0 0 15-3" /></svg>}
              {item.icon === "globe" && <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>}
              {item.icon === "database" && <svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" /></svg>}
              {item.icon === "shield" && <svg viewBox="0 0 24 24"><path d="M12 3 5 7v5c0 4 2.7 7.1 7 9 4.3-1.9 7-5 7-9V7zM9 12l2 2 4-4" /></svg>}
            </span>
            <span className="deals-network__item-copy">
              <strong>{item.label}</strong>
              <small>{item.value}</small>
            </span>
            <span className={`deals-network__badge deals-network__badge--${item.tone}`}>
              {item.badge}
            </span>
          </div>
        ))}
      </div>

      <div className="deals-network__graph">
        <div className="deals-network__graph-label">
          <span>Network activity</span>
          <strong>Stable</strong>
        </div>
        <div className="deals-network__bars" aria-hidden="true">
          {networkActivity.map((height, index) => (
            <span
              key={`${height}-${index}`}
              style={{ height: `${height}%`, animationDelay: `${index * 60}ms` }}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

export default function DealsExplorer() {
  const [activeFilter, setActiveFilter] = useState<DealFilter>("All Stores");
  const [searchQuery, setSearchQuery] = useState("");
  const [alerts, setAlerts] = useState<Set<number>>(() => new Set());

  const filteredDeals = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return deals.filter((deal) => {
      const matchesSearch =
        !normalizedQuery ||
        deal.title.toLowerCase().includes(normalizedQuery) ||
        deal.store.toLowerCase().includes(normalizedQuery) ||
        deal.category.toLowerCase().includes(normalizedQuery);

      if (!matchesSearch) return false;
      if (activeFilter === "All Stores") return true;
      if (activeFilter === "Under $10") return deal.priceValue < 10;
      if (activeFilter === "50%+ Off") return deal.discountValue >= 50;
      if (activeFilter === "Free Weekend") return deal.status === "Free Weekend";
      return deal.store === activeFilter;
    });
  }, [activeFilter, searchQuery]);

  function toggleAlert(dealId: number) {
    setAlerts((current) => {
      const next = new Set(current);
      if (next.has(dealId)) next.delete(dealId);
      else next.add(dealId);
      return next;
    });
  }

  function resetFilters() {
    setActiveFilter("All Stores");
    setSearchQuery("");
  }

  const deepDiscountCount = deals.filter((deal) => deal.discountValue >= 50).length;
  const freeCount = deals.filter((deal) => deal.priceValue === 0).length;

  return (
    <>
      <section className="deals-hero" aria-labelledby="deals-title">
        <div className="deals-hero__orb deals-hero__orb--orange" />
        <div className="deals-hero__orb deals-hero__orb--blue" />
        <div className="deals-hero__scanlines" />
        <div className="deals-hero__content">
          <div className="deals-hero__copy">
            <div className="deals-hero__tag"><span aria-hidden="true" /> Intel active</div>
            <h1 id="deals-title">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3s1 4-2 6c-2-3-5-2-5-2s-2 3-1 7c1 5 5 7 8 7 5 0 8-4 7-9-1-4-5-6-5-6s1 4-2 5c1-5 0-8 0-8Z" /></svg>
              <span>Game Deals Intelligence</span>
            </h1>
            <p>
              Real-time price tracking, discount intelligence, and safe store
              redirects — all in one command center. Never overpay again.
            </p>
          </div>
          <div className="deals-hero__stats" aria-label="Deal statistics">
            <div><strong>{deals.length}</strong><span>Active deals</span></div>
            <div><strong>{deepDiscountCount}</strong><span>50%+ off</span></div>
            <div><strong>{freeCount}</strong><span>Free now</span></div>
          </div>
        </div>
      </section>

      <section className="deals-filter-panel" aria-label="Search and filter deals">
        <div className="deals-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
          <label className="sr-only" htmlFor="deal-search">Search deals</label>
          <input
            id="deal-search"
            type="search"
            placeholder="Search deals, stores, games…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {searchQuery && (
            <button type="button" aria-label="Clear search" onClick={() => setSearchQuery("")}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          )}
        </div>
        <div className="deals-chips" aria-label="Deal filters">
          {dealFilters.map((filter) => (
            <button
              className={activeFilter === filter ? "deals-chip deals-chip--active" : "deals-chip"}
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

      <div className="deals-layout">
        <section aria-label="Available game deals">
          <div className="deals-results-bar">
            <span><strong>{filteredDeals.length}</strong> deals detected</span>
            <span>Static intelligence feed</span>
          </div>
          <div className="deals-grid">
            {filteredDeals.map((deal) => (
              <DealCard
                deal={deal}
                alertIsSet={alerts.has(deal.id)}
                key={deal.id}
                onToggleAlert={toggleAlert}
              />
            ))}
            {filteredDeals.length === 0 && (
              <div className="deals-empty">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16a10 10 0 0 1 14 0M8 12a6 6 0 0 1 8 0M11 8a2 2 0 0 1 2 0M12 20h.01" /></svg>
                <h2>No signals found</h2>
                <p>No deals match your current search and filters.</p>
                <button type="button" onClick={resetFilters}>Reset filters</button>
              </div>
            )}
          </div>
        </section>
        <DealNetworkStatus />
      </div>
    </>
  );
}
