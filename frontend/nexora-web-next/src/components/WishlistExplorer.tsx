"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AddWishlistItemForm from "@/components/AddWishlistItemForm";
import {
  wishlistFilters,
  type WishlistFilter,
  type WishlistItem,
  type WishlistPriority,
  type WishlistStatus,
} from "@/data/wishlist";
import type { WishlistResult } from "@/lib/api";
import { AUTH_STATE_EVENT, clearAuthToken, readAuthToken } from "@/lib/auth-client";
import {
  deleteMyWishlistItem,
  getMyWishlist,
  normalizeUserWishlistError,
} from "@/lib/user-wishlist";

type WishlistView = "checking" | "public" | "personal" | "offline";

const wishlistNetworkIcons = {
  bolt: "⚡",
  globe: "🌐",
  mail: "📬",
  shield: "🛡️",
} as const;

function alertsFor(items: readonly WishlistItem[]): Record<number, boolean> {
  return Object.fromEntries(items.map((item) => [item.id, item.alertActive]));
}

function statusDetails(status: WishlistStatus) {
  if (status === "price-drop") return { label: "Price drop", icon: "down" } as const;
  if (status === "free-now") return { label: "Free now", icon: "gift" } as const;
  return { label: "Tracking", icon: "signal" } as const;
}

function priorityLabel(priority: WishlistPriority) {
  if (priority === "medium") return "Med";
  return priority;
}

function wishlistStoreClass(store: string) {
  if (store === "Steam") return "steam";
  if (store === "Epic Games") return "epic";
  if (store === "GOG") return "gog";
  return "external";
}

function StatusIcon({ icon }: { icon: "down" | "gift" | "signal" }) {
  if (icon === "down") return <span aria-hidden="true">↓</span>;
  if (icon === "gift") return <span aria-hidden="true">🎁</span>;
  return <span aria-hidden="true">📡</span>;
}

function WishlistCard({
  alertIsActive,
  canDelete,
  isDeleting,
  item,
  onDelete,
  onToggleAlert,
}: {
  alertIsActive: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  item: WishlistItem;
  onDelete: (item: WishlistItem) => void;
  onToggleAlert: (itemId: number) => void;
}) {
  const status = statusDetails(item.status);
  const storeClass = wishlistStoreClass(item.store);

  return (
    <article className={`wl-card wl-card--${storeClass}`} aria-busy={isDeleting}>
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
          title="This toggle is local only; the backend alert engine is not connected yet"
        >
          <span aria-hidden="true">✏️</span>
          {alertIsActive ? "Pause Alert" : "Enable Alert"}
        </button>
        <button
          className="wl-card__remove"
          type="button"
          disabled={!canDelete || isDeleting}
          aria-label={`Remove ${item.title}`}
          title={canDelete ? `Remove ${item.title} from your personal wishlist` : "Sign in to manage personal wishlist items"}
          onClick={() => onDelete(item)}
        >
          <span aria-hidden="true">{isDeleting ? "…" : "✕"}</span>
        </button>
      </div>
      <small className="wl-card__local-note">Local alert toggle · alert engine later</small>
    </article>
  );
}

function WishlistAlertPanel({
  alerts,
  source,
  view,
  wishlistItems,
}: {
  alerts: Record<number, boolean>;
  source: WishlistResult["source"];
  view: WishlistView;
  wishlistItems: readonly WishlistItem[];
}) {
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
  const dataSource = view === "personal"
    ? { value: "Account wishlist API", badge: "Personal" }
    : { value: source === "api" ? "Public Spring Boot preview" : "Static public preview", badge: source === "api" ? "API" : "Static" };

  const items = [
    { label: "Alert Engine", value: "Local toggle only", badge: "Local", tone: "orange", icon: "bolt" },
    { label: "Data Source", value: dataSource.value, badge: dataSource.badge, tone: "blue", icon: "globe" },
    { label: "Notification Queue", value: "Alert engine later", badge: "Future", tone: "purple", icon: "mail" },
    { label: "Security", value: view === "personal" ? "JWT account access" : "Public preview data", badge: view === "personal" ? "Auth" : "Public", tone: "green", icon: "shield" },
  ] as const;

  return (
    <aside className="wl-network" aria-labelledby="wishlist-alert-title">
      <div className="wl-network__header">
        <span className="wl-network__header-icon" aria-hidden="true">📡</span>
        <div><span>Alert telemetry</span><h2 id="wishlist-alert-title">Wishlist Alert Status</h2></div>
        <span className="wl-network__live"><span aria-hidden="true" /> Local</span>
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
  const [view, setView] = useState<WishlistView>("checking");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [personalItems, setPersonalItems] = useState<WishlistItem[]>([]);
  const [alerts, setAlerts] = useState<Record<number, boolean>>(() => alertsFor(wishlistItems));
  const [serviceMessage, setServiceMessage] = useState<string | null>(null);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(() => new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    let requestVersion = 0;

    async function refreshWishlist() {
      const currentVersion = ++requestVersion;
      const token = readAuthToken();

      if (!token) {
        if (!active || currentVersion !== requestVersion) return;
        setAuthToken(null);
        setPersonalItems([]);
        setAlerts(alertsFor(wishlistItems));
        setServiceMessage(null);
        setOperationMessage(null);
        setView("public");
        return;
      }

      setAuthToken(token);
      setServiceMessage(null);
      setView("checking");

      try {
        const items = await getMyWishlist(token);
        if (!active || currentVersion !== requestVersion) return;
        setPersonalItems(items);
        setAlerts(alertsFor(items));
        setOperationMessage(null);
        setView("personal");
      } catch (error) {
        if (!active || currentVersion !== requestVersion) return;
        const details = normalizeUserWishlistError(error);

        if (details.status === 401) {
          clearAuthToken();
          setAuthToken(null);
          setServiceMessage(details.message);
          setView("public");
          return;
        }

        setServiceMessage(details.message);
        setAlerts(alertsFor(wishlistItems));
        setView("offline");
      }
    }

    function handleAuthChange() {
      void refreshWishlist();
    }

    void refreshWishlist();
    window.addEventListener("storage", handleAuthChange);
    window.addEventListener(AUTH_STATE_EVENT, handleAuthChange);

    return () => {
      active = false;
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener(AUTH_STATE_EVENT, handleAuthChange);
    };
  }, [refreshKey, wishlistItems]);

  const displayedItems = view === "personal" ? personalItems : wishlistItems;
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return displayedItems.filter((item) => {
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
  }, [activeFilter, displayedItems, searchQuery]);

  function resetFilters() {
    setActiveFilter("All");
    setSearchQuery("");
  }

  function handleAuthenticationRequired() {
    clearAuthToken();
    setAuthToken(null);
    setPersonalItems([]);
    setAlerts(alertsFor(wishlistItems));
    setServiceMessage("Please sign in again.");
    setView("public");
  }

  function handleItemAdded(item: WishlistItem) {
    setPersonalItems((current) => [item, ...current]);
    setAlerts((current) => ({ ...current, [item.id]: item.alertActive }));
    setOperationMessage(null);
    resetFilters();
  }

  async function handleDelete(item: WishlistItem) {
    if (view !== "personal" || !authToken || deletingIds.has(item.id)) return;

    setDeletingIds((current) => new Set(current).add(item.id));
    setOperationMessage(null);

    try {
      await deleteMyWishlistItem(authToken, item.id);
      setPersonalItems((current) => current.filter((candidate) => candidate.id !== item.id));
      setAlerts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      setOperationMessage(`${item.title} was removed from your personal wishlist.`);
    } catch (error) {
      const details = normalizeUserWishlistError(error);
      if (details.status === 401) {
        handleAuthenticationRequired();
      } else {
        setOperationMessage(details.message);
      }
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }

  function toggleAlert(itemId: number) {
    setAlerts((current) => ({ ...current, [itemId]: !current[itemId] }));
  }

  const priceDropCount = displayedItems.filter((item) => item.status === "price-drop").length;
  const freeCount = displayedItems.filter((item) => item.status === "free-now").length;
  const isPersonal = view === "personal";
  const heroTag = isPersonal ? "Personal wishlist" : view === "offline" ? "Wishlist service offline" : "Public wishlist preview";
  const heroCopy = isPersonal
    ? "Your games are stored with your NEXORA account. Price alerts remain a local UI preview for now."
    : view === "offline"
      ? "Wishlist service offline — showing the public preview so this page stays useful."
      : "Explore the public wishlist preview. Sign in to manage a wishlist stored with your NEXORA account.";

  return (
    <>
      <section className="wl-hero" aria-labelledby="wishlist-title">
        <div className="wl-hero__orb wl-hero__orb--orange" />
        <div className="wl-hero__orb wl-hero__orb--blue" />
        <div className="wl-hero__scanlines" />
        <div className="wl-hero__content">
          <div className="wl-hero__copy">
            <div className="wl-hero__tag"><span aria-hidden="true" /> {heroTag}</div>
            <h1 id="wishlist-title">
              <span className="page-title-emoji" aria-hidden="true">📋</span>
              <span>Smart Wishlist Control</span>
            </h1>
            <p>{heroCopy}</p>
          </div>
          <div className="wl-hero__stats" aria-label="Wishlist summary">
            <div><strong>{displayedItems.length}</strong><span>Wishlist items</span></div>
            <div><strong>{priceDropCount}</strong><span>Price drops</span></div>
            <div><strong>{freeCount}</strong><span>Free listings</span></div>
            <div className="wl-hero__protected"><strong aria-hidden="true">{isPersonal ? "🔐" : "👁️"}</strong><span>{isPersonal ? "Account" : "Preview"}</span></div>
          </div>
        </div>
      </section>

      <section className={`wl-access-banner wl-access-banner--${view}`} aria-live="polite">
        <div>
          <strong>
            {isPersonal ? "Personal wishlist" : view === "offline" ? "Wishlist service offline — showing public preview" : view === "checking" ? "Checking your account" : "Public wishlist preview"}
          </strong>
          <span>
            {isPersonal
              ? "Stored with your NEXORA account. The public demo wishlist remains the page fallback."
              : view === "offline"
                ? serviceMessage || "Cannot reach the NEXORA wishlist service."
                : view === "checking"
                  ? "The public preview remains available while your personal wishlist loads."
                  : serviceMessage || "Sign in to manage your personal wishlist."}
          </span>
        </div>
        {view === "public" && (
          <nav className="wl-access-banner__actions" aria-label="Wishlist account actions">
            <Link href="/login">Sign in</Link>
            <Link href="/register">Register</Link>
          </nav>
        )}
        {view === "offline" && (
          <button type="button" onClick={() => setRefreshKey((current) => current + 1)}>Retry personal wishlist</button>
        )}
      </section>

      {isPersonal && authToken && (
        <AddWishlistItemForm
          token={authToken}
          onAdded={handleItemAdded}
          onAuthenticationRequired={handleAuthenticationRequired}
        />
      )}

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

      {operationMessage && <p className="wl-operation-message" role="status">{operationMessage}</p>}

      <div className="wl-layout">
        <section aria-label={isPersonal ? "Personal wishlist games" : "Public wishlist preview games"}>
          <div className="wl-results-bar">
            <span><strong>{filteredItems.length}</strong> tracked games</span>
            <span>{isPersonal ? "Personal account feed" : source === "api" ? "Public backend preview" : "Static fallback preview"}</span>
          </div>
          <div className="wl-grid">
            {filteredItems.map((item) => (
              <WishlistCard
                alertIsActive={alerts[item.id] ?? item.alertActive}
                canDelete={isPersonal}
                isDeleting={deletingIds.has(item.id)}
                item={item}
                key={item.id}
                onDelete={(candidate) => void handleDelete(candidate)}
                onToggleAlert={toggleAlert}
              />
            ))}
            {isPersonal && displayedItems.length === 0 && (
              <div className="wl-empty">
                <span aria-hidden="true">➕</span>
                <h2>Your personal wishlist is empty</h2>
                <p>Add a game to start your account collection.</p>
                <a href="#add-personal-wishlist-item">Add your first game</a>
              </div>
            )}
            {displayedItems.length > 0 && filteredItems.length === 0 && (
              <div className="wl-empty">
                <span aria-hidden="true">📡</span>
                <h2>No wishlist signals found</h2>
                <p>No games match your current search and filters.</p>
                <button type="button" onClick={resetFilters}>Reset filters</button>
              </div>
            )}
          </div>
        </section>
        <WishlistAlertPanel alerts={alerts} source={source} view={view} wishlistItems={displayedItems} />
      </div>
    </>
  );
}
