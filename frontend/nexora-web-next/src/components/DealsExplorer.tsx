"use client";

import { useMemo, useState } from "react";
import {
  dealFilters,
  type DealFilter,
  type DealStatus,
  type GameDeal,
} from "@/data/deals";
import type { DealsResult } from "@/lib/api";

const networkActivity = [35, 58, 42, 75, 52, 90, 68, 45, 82, 60, 38, 72];
const dealNetworkIcons = {
  sync: "🔄",
  globe: "🌐",
  database: "💾",
  shield: "🛡️",
} as const;

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
          <span aria-hidden="true">🔔</span>
          {alertIsSet ? "Alert Set" : "Set Alert"}
        </button>
        <button
          className={`deals-card__view deals-card__view--${color}`}
          type="button"
          aria-disabled="true"
          title="Store redirects are planned for a later migration"
        >
          <span aria-hidden="true">↗</span>
          View Deal
        </button>
      </div>
    </article>
  );
}

function DealNetworkStatus({ source }: { source: DealsResult["source"] }) {
  const isApiSource = source === "api";
  const items = [
    { label: "Price Sync", value: isApiSource ? "Backend API" : "Demo mode", badge: isApiSource ? "Live" : "Demo", tone: "orange", icon: "sync" },
    { label: "Data Source", value: isApiSource ? "Spring Boot" : "Static dataset", badge: isApiSource ? "API" : "Static", tone: "blue", icon: "globe" },
    { label: "Cache", value: isApiSource ? "Fresh response" : "Fallback ready", badge: "Ready", tone: "green", icon: "database" },
    { label: "Security", value: "Safe redirects planned", badge: "Planned", tone: "purple", icon: "shield" },
  ] as const;

  return (
    <aside className="deals-network" aria-labelledby="deal-network-title">
      <div className="deals-network__header">
        <span className="deals-network__header-icon" aria-hidden="true">📡</span>
        <div>
          <span>System telemetry</span>
          <h2 id="deal-network-title">Deal Network Status</h2>
        </div>
        <span className="deals-network__live">
          <span aria-hidden="true" /> {isApiSource ? "Live" : "Demo"}
        </span>
      </div>

      <div className="deals-network__items">
        {items.map((item) => (
          <div className="deals-network__item" key={item.label}>
            <span className={`deals-network__item-icon deals-network__item-icon--${item.tone}`} aria-hidden="true">
              {dealNetworkIcons[item.icon]}
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

export default function DealsExplorer({ deals, source }: DealsResult) {
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
  }, [activeFilter, deals, searchQuery]);

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
              <span className="page-title-emoji" aria-hidden="true">🔥</span>
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
          <span className="page-search-icon" aria-hidden="true">🔍</span>
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
              <span aria-hidden="true">×</span>
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
            <span>{source === "api" ? "Backend intelligence feed" : "Static fallback feed"}</span>
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
                <span aria-hidden="true">📡</span>
                <h2>No signals found</h2>
                <p>No deals match your current search and filters.</p>
                <button type="button" onClick={resetFilters}>Reset filters</button>
              </div>
            )}
          </div>
        </section>
        <DealNetworkStatus source={source} />
      </div>
    </>
  );
}
