"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  dealFilters,
  type DealFilter,
  type DealStatus,
  type GameDeal,
} from "@/data/deals";
import type { WishlistItem } from "@/data/wishlist";
import RequestIdSupportText from "@/components/RequestIdSupportText";
import UxStatePanel, { UxSkeleton } from "@/components/UxStatePanel";
import { getExternalDeals, type DealsResult } from "@/lib/api";
import { normalizeAuthError } from "@/lib/auth";
import {
  AUTH_STATE_EVENT,
  clearAuthToken,
  ensureAuthToken,
  readAuthToken,
} from "@/lib/auth-client";
import {
  addMyWishlistItem,
  getMyWishlist,
  normalizeUserWishlistError,
  withWishlistAuthRetry,
  type AddWishlistItemPayload,
} from "@/lib/user-wishlist";

type DealsMode = "curated" | "external";
type ExternalDealsStatus = "idle" | "loading" | "ready" | "fallback";
type SaveMessage = {
  tone: "auth" | "error" | "success";
  text: string;
  requestId?: string | null;
};
type RequestSupportMessage = {
  text: string;
  requestId: string | null;
};

function protectedWishlistError(error: unknown) {
  const wishlistError = normalizeUserWishlistError(error);
  if (wishlistError.code !== "unknown_error") return wishlistError;

  const authError = normalizeAuthError(error);
  return authError.code === "unknown_error" ? wishlistError : authError;
}

const networkActivity = [35, 58, 42, 75, 52, 90, 68, 45, 82, 60, 38, 72];
const dealNetworkIcons = {
  sync: "🔄",
  globe: "🌐",
  database: "💾",
  shield: "🛡️",
} as const;

function storeClass(store: GameDeal["store"]) {
  if (store === "Steam") return "steam";
  if (store === "Epic Games") return "epic";
  if (store === "GOG") return "gog";
  if (store === "Humble") return "humble";
  if (store === "Ubisoft") return "ubisoft";
  return "external";
}

function statusClass(status: DealStatus) {
  if (status === "Historical Low" || status === "Lowest Ever") return "hot";
  if (status === "Great Deal" || status === "Good Price") return "good";
  if (status === "Free Weekend") return "free";
  return "neutral";
}

function safeCheapSharkDealUrl(value: string | null | undefined) {
  if (typeof value !== "string" || !value.trim()) return null;

  const candidate = value.trim();
  try {
    const url = new URL(candidate);
    const isCheapSharkRedirect =
      url.protocol === "https:" &&
      url.hostname === "www.cheapshark.com" &&
      !url.port &&
      !url.username &&
      !url.password &&
      url.pathname === "/redirect" &&
      Boolean(url.searchParams.get("dealID")?.trim());
    return isCheapSharkRedirect ? candidate : null;
  } catch {
    return null;
  }
}

function dealStateKey(scope: "curated" | "external", deal: GameDeal) {
  return `${scope}:${deal.id}:${deal.title}`;
}

function normalizedWishlistValue(value: string) {
  return value.trim().toLowerCase();
}

function findMatchingWishlistItem(
  deal: GameDeal,
  wishlistItems: readonly WishlistItem[],
): WishlistItem | undefined {
  const normalizedTitle = normalizedWishlistValue(deal.title);
  const normalizedStore = normalizedWishlistValue(deal.store);
  const identityMatches = wishlistItems.filter(
    (item) =>
      normalizedWishlistValue(item.title) === normalizedTitle &&
      normalizedWishlistValue(item.store) === normalizedStore,
  );

  // Prefer the exact observed price, but keep title + store as the stable
  // identity when a live provider changes its price between refreshes.
  const normalizedPrice = normalizedWishlistValue(deal.priceNew);
  return identityMatches.find(
    (item) => normalizedWishlistValue(item.currentPrice) === normalizedPrice,
  ) ?? identityMatches[0];
}

function wishlistPayloadFor(deal: GameDeal): AddWishlistItemPayload {
  const isFree = deal.priceNew === "FREE" || deal.priceValue === 0;

  return {
    title: deal.title,
    store: deal.store,
    currentPrice: deal.priceNew,
    targetPrice: deal.priceNew,
    lowestEver: deal.priceNew,
    discount: deal.discount,
    status: isFree ? "free-now" : deal.discountValue >= 50 ? "price-drop" : "tracking",
    priority: deal.discountValue >= 80 ? "high" : deal.discountValue >= 50 ? "medium" : "low",
    alertActive: true,
  };
}

function DealCard({
  deal,
  alertIsSet,
  isSaved,
  isSaving,
  saveMessage,
  onSave,
  onToggleAlert,
}: {
  deal: GameDeal;
  alertIsSet: boolean;
  isSaved: boolean;
  isSaving: boolean;
  saveMessage?: SaveMessage;
  onSave: (deal: GameDeal) => void;
  onToggleAlert: (dealId: number) => void;
}) {
  const color = storeClass(deal.store);
  const dealUrl = safeCheapSharkDealUrl(deal.dealUrl);
  const titleId = `deal-title-${dealStateKey("curated", deal).replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <article className={`deals-card deals-card--${color}`} aria-labelledby={titleId}>
      <div className={`deals-card__accent deals-card__accent--${color}`} />
      <div className="deals-card__header">
        <span className={`deals-card__store deals-card__store--${color}`}>
          {deal.store}
        </span>
        <span className="deals-card__discount">{deal.discount}</span>
      </div>

      <h2 className="deals-card__title" id={titleId}>{deal.title}</h2>
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
          className={isSaved ? "deals-card__save deals-card__save--saved" : "deals-card__save"}
          type="button"
          disabled={isSaving || isSaved}
          aria-busy={isSaving}
          aria-label={isSaved ? `${deal.title} is saved to your wishlist` : isSaving ? `Saving ${deal.title} to your wishlist` : `Save ${deal.title} to your wishlist`}
          onClick={() => onSave(deal)}
        >
          <span aria-hidden="true">{isSaved ? "✓" : "♡"}</span>
          {isSaved ? "Saved" : isSaving ? "Saving…" : "Save to Wishlist"}
        </button>
        <button
          className={alertIsSet ? "deals-card__alert deals-card__alert--active" : "deals-card__alert"}
          type="button"
          aria-pressed={alertIsSet}
          aria-label={`${alertIsSet ? "Remove" : "Set"} local alert for ${deal.title}`}
          onClick={() => onToggleAlert(deal.id)}
        >
          <span aria-hidden="true">🔔</span>
          {alertIsSet ? "Alert Set" : "Set Alert"}
        </button>
        {dealUrl ? (
          <a
            className={`deals-card__view deals-card__view--${color} deals-card__view--active`}
            href={dealUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            aria-label={`View ${deal.title} deal from ${deal.store} in a new tab`}
          >
            <span aria-hidden="true">↗</span>
            View Deal
          </a>
        ) : (
          <button
            className={`deals-card__view deals-card__view--${color}`}
            type="button"
            disabled
            aria-label={`View deal for ${deal.title} unavailable for this curated preview`}
            title="Store redirects are planned for curated deals"
          >
            <span aria-hidden="true">↗</span>
            View Deal
          </button>
        )}
      </div>
      {saveMessage && (
        <div
          className={`deals-card__save-message deals-card__save-message--${saveMessage.tone}`}
          role={saveMessage.tone === "error" ? "alert" : "status"}
        >
          <span className="deals-card__save-message-icon" aria-hidden="true">
            {saveMessage.tone === "success" ? "✓" : saveMessage.tone === "auth" ? "🔐" : "!"}
          </span>
          <span className="deals-card__save-message-copy">
            <strong>
              {saveMessage.tone === "success" ? "Wishlist updated" : saveMessage.tone === "auth" ? "Sign in required" : "Deal not saved"}
            </strong>
            <small>{saveMessage.text}</small>
            {saveMessage.tone !== "success" ? (
              <RequestIdSupportText requestId={saveMessage.requestId} />
            ) : null}
          </span>
          {saveMessage.tone === "auth" && (
            <span className="deals-card__auth-links">
              <Link href="/login">Login</Link>
              <Link href="/register">Register</Link>
            </span>
          )}
        </div>
      )}
    </article>
  );
}

function DealNetworkStatus({
  curatedSource,
  externalStatus,
  mode,
}: {
  curatedSource: DealsResult["source"];
  externalStatus: ExternalDealsStatus;
  mode: DealsMode;
}) {
  const isExternalLive = mode === "external" && externalStatus === "ready";
  const isExternalLoading = mode === "external" && externalStatus === "loading";
  const isExternalFallback = mode === "external" && externalStatus === "fallback";
  const isCuratedApi = curatedSource === "api";
  const stateLabel = isExternalLive
    ? "Live"
    : isExternalLoading
      ? "Loading"
      : isExternalFallback
        ? "Fallback"
        : "Curated";
  const items = [
    {
      label: "Price Sync",
      value: isExternalLive ? "CheapShark via backend" : isExternalLoading ? "Requesting live deals" : isExternalFallback ? "Curated fallback active" : "Curated NEXORA feed",
      badge: stateLabel,
      tone: "orange",
      icon: "sync",
    },
    {
      label: "Data Source",
      value: isExternalLive ? "External deal API" : isCuratedApi ? "Spring Boot curated data" : "Static curated dataset",
      badge: isExternalLive ? "External" : isCuratedApi ? "API" : "Static",
      tone: "blue",
      icon: "globe",
    },
    {
      label: "Persistence",
      value: isExternalLive ? "Live results are not stored" : "Curated fallback ready",
      badge: isExternalLive ? "Session" : "Ready",
      tone: "green",
      icon: "database",
    },
    {
      label: "Access",
      value: "Public deals endpoint",
      badge: "Public",
      tone: "purple",
      icon: "shield",
    },
  ] as const;

  return (
    <aside className="deals-network" aria-labelledby="deal-network-title">
      <div className="deals-network__header">
        <span className="deals-network__header-icon" aria-hidden="true">📡</span>
        <div>
          <span>System telemetry</span>
          <h2 id="deal-network-title">Deal Network Status</h2>
        </div>
        <span className={`deals-network__live deals-network__live--${isExternalLive ? "active" : isExternalLoading ? "loading" : isExternalFallback ? "fallback" : "curated"}`}>
          <span aria-hidden="true" /> {stateLabel}
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
          <strong>{stateLabel}</strong>
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
  const [mode, setMode] = useState<DealsMode>("curated");
  const [externalStatus, setExternalStatus] = useState<ExternalDealsStatus>("idle");
  const [externalDeals, setExternalDeals] = useState<readonly GameDeal[]>([]);
  const [externalTitle, setExternalTitle] = useState("");
  const [activeExternalTitle, setActiveExternalTitle] = useState("");
  const [activeFilter, setActiveFilter] = useState<DealFilter>("All Stores");
  const [searchQuery, setSearchQuery] = useState("");
  const [alerts, setAlerts] = useState<Set<string>>(() => new Set());
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [savingDeals, setSavingDeals] = useState<Set<string>>(() => new Set());
  const [savedDeals, setSavedDeals] = useState<Set<string>>(() => new Set());
  const [savedWishlistItems, setSavedWishlistItems] = useState<readonly WishlistItem[]>([]);
  const [wishlistSyncWarning, setWishlistSyncWarning] = useState<RequestSupportMessage | null>(null);
  const [saveMessages, setSaveMessages] = useState<Record<string, SaveMessage>>({});
  const savingDealKeys = useRef(new Set<string>());
  const previousAuthToken = useRef<string | null>(null);
  const requestVersion = useRef(0);

  useEffect(() => {
    let active = true;

    async function refreshToken() {
      let token = readAuthToken();
      try {
        token = token ?? await ensureAuthToken();
      } catch (error) {
        if (!active) return;
        const details = normalizeAuthError(error);
        setAuthToken(null);
        setAuthChecked(true);
        setWishlistSyncWarning({
          text: details.message,
          requestId: details.requestId,
        });
        return;
      }

      if (!active) return;
      if (previousAuthToken.current !== token) {
        previousAuthToken.current = token;
        setSavedDeals(new Set());
        setSavedWishlistItems([]);
        setSaveMessages({});
        setWishlistSyncWarning(null);
      }
      setAuthToken(token);
      setAuthChecked(true);
    }

    function handleAuthChange() {
      void refreshToken();
    }

    void refreshToken();
    window.addEventListener("storage", handleAuthChange);
    window.addEventListener(AUTH_STATE_EVENT, handleAuthChange);

    return () => {
      active = false;
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener(AUTH_STATE_EVENT, handleAuthChange);
    };
  }, []);

  useEffect(() => {
    if (!authChecked || !authToken) return;

    let active = true;
    const token = authToken;

    async function syncSavedWishlist() {
      setWishlistSyncWarning(null);
      try {
        const result = await withWishlistAuthRetry(token, getMyWishlist);
        if (!active) return;
        setAuthToken(result.token);
        setSavedWishlistItems(result.value);
      } catch (error) {
        if (!active) return;
        const details = protectedWishlistError(error);
        if (details.status === 401) {
          clearAuthToken();
          setAuthToken(null);
          setSavedWishlistItems([]);
          setWishlistSyncWarning({
            text: "Please sign in again to sync saved deals.",
            requestId: details.requestId,
          });
          return;
        }
        setWishlistSyncWarning({
          text: details.message,
          requestId: details.requestId,
        });
      }
    }

    void syncSavedWishlist();
    return () => {
      active = false;
    };
  }, [authChecked, authToken, externalDeals, externalStatus, mode]);

  const visibleDeals = mode === "external" && externalStatus === "ready" ? externalDeals : deals;
  const isExternalReady = mode === "external" && externalStatus === "ready";
  const isExternalLoading = mode === "external" && externalStatus === "loading";
  const isExternalFallback = mode === "external" && externalStatus === "fallback";
  const displayedDealScope = isExternalReady ? "external" : "curated";
  const syncedSavedDealKeys = useMemo(
    () => new Set(
      visibleDeals
        .filter((deal) => findMatchingWishlistItem(deal, savedWishlistItems))
        .map((deal) => dealStateKey(displayedDealScope, deal)),
    ),
    [displayedDealScope, savedWishlistItems, visibleDeals],
  );
  const filteredDeals = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return visibleDeals.filter((deal) => {
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
  }, [activeFilter, searchQuery, visibleDeals]);

  async function loadExternalDeals(title: string) {
    const currentRequest = ++requestVersion.current;
    const normalizedTitle = title.trim();
    setExternalStatus("loading");
    setActiveExternalTitle(normalizedTitle);
    setActiveFilter("All Stores");
    setSearchQuery("");

    const result = await getExternalDeals({
      pageSize: 12,
      title: normalizedTitle || undefined,
    });
    if (currentRequest !== requestVersion.current) return;

    if (result.source === "external-api") {
      setExternalDeals(result.deals);
      setExternalStatus("ready");
    } else {
      setExternalDeals([]);
      setExternalStatus("fallback");
    }
  }

  function selectMode(nextMode: DealsMode) {
    if (nextMode === "curated") {
      requestVersion.current += 1;
      setMode("curated");
      setActiveFilter("All Stores");
      setSearchQuery("");
      return;
    }

    setMode("external");
    void loadExternalDeals(externalTitle);
  }

  function submitExternalSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadExternalDeals(externalTitle);
  }

  function clearExternalSearch() {
    setExternalTitle("");
    void loadExternalDeals("");
  }

  function toggleAlert(dealId: number) {
    const scope = mode === "external" && externalStatus === "ready" ? "external" : "curated";
    const key = `${scope}:${dealId}`;
    setAlerts((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function saveDeal(deal: GameDeal) {
    const key = dealStateKey(displayedDealScope, deal);
    if (
      savingDealKeys.current.has(key) ||
      savedDeals.has(key) ||
      syncedSavedDealKeys.has(key)
    ) return;

    let token: string | null;
    try {
      token = await ensureAuthToken();
    } catch (error) {
      const details = normalizeAuthError(error);
      setAuthChecked(true);
      setSaveMessages((current) => ({
        ...current,
        [key]: {
          tone: "error",
          text: details.message,
          requestId: details.requestId,
        },
      }));
      return;
    }

    if (!token) {
      setAuthToken(null);
      setAuthChecked(true);
      setSaveMessages((current) => ({
        ...current,
        [key]: {
          tone: "auth",
          text: "Sign in, then use Save to Wishlist again for this deal.",
        },
      }));
      return;
    }

    setAuthToken(token);
    savingDealKeys.current.add(key);
    setSavingDeals((current) => new Set(current).add(key));
    setSaveMessages((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });

    try {
      const result = await withWishlistAuthRetry(
        token,
        (activeToken) => addMyWishlistItem(activeToken, wishlistPayloadFor(deal)),
      );
      const savedItem = result.value;
      setAuthToken(result.token);
      setSavedDeals((current) => new Set(current).add(key));
      setSavedWishlistItems((current) =>
        current.some((item) => item.id === savedItem.id)
          ? current
          : [...current, savedItem],
      );
      setSaveMessages((current) => ({
        ...current,
        [key]: {
          tone: "success",
          text: `${savedItem.title} was saved to your personal wishlist.`,
        },
      }));
    } catch (error) {
      const details = protectedWishlistError(error);
      if (details.status === 409) {
        setSavedDeals((current) => new Set(current).add(key));
        setSaveMessages((current) => ({
          ...current,
          [key]: {
            tone: "success",
            text: `${deal.title} is already in your personal wishlist.`,
          },
        }));
        return;
      }
      if (details.status === 401) {
        clearAuthToken();
        setAuthToken(null);
      }
      setSaveMessages((current) => ({
        ...current,
        [key]: {
          tone: details.status === 401 ? "auth" : "error",
          text: details.status === 401
            ? "Your session ended. Sign in again, then retry this save."
            : `${details.message} You can retry from this card.`,
          requestId: details.requestId,
        },
      }));
    } finally {
      savingDealKeys.current.delete(key);
      setSavingDeals((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }

  function resetFilters() {
    setActiveFilter("All Stores");
    setSearchQuery("");
  }

  const deepDiscountCount = visibleDeals.filter((deal) => deal.discountValue >= 50).length;
  const freeCount = visibleDeals.filter((deal) => deal.priceValue === 0).length;
  const sourceLabel = isExternalReady
    ? "Live external deals"
    : isExternalFallback
      ? "Live deals unavailable — showing curated fallback"
      : isExternalLoading
        ? "Loading live external deals — curated deals remain available"
        : "Curated NEXORA deals";

  return (
    <>
      <section className="deals-hero" aria-labelledby="deals-title">
        <div className="deals-hero__orb deals-hero__orb--orange" />
        <div className="deals-hero__orb deals-hero__orb--blue" />
        <div className="deals-hero__scanlines" />
        <div className="deals-hero__content">
          <div className="deals-hero__copy">
            <div className="deals-hero__tag"><span aria-hidden="true" /> {isExternalReady ? "Live external deals" : "Curated intelligence"}</div>
            <h1 id="deals-title">
              <span className="page-title-emoji" aria-hidden="true">🔥</span>
              <span>Game Deals Intelligence</span>
            </h1>
            <p>
              Compare NEXORA&apos;s curated deal set or request current external
              offers on demand. Curated deals remain ready whenever live data is unavailable.
            </p>
          </div>
          <div className="deals-hero__stats" aria-label="Deal statistics">
            <div><strong>{visibleDeals.length}</strong><span>Active deals</span></div>
            <div><strong>{deepDiscountCount}</strong><span>50%+ off</span></div>
            <div><strong>{freeCount}</strong><span>Free now</span></div>
          </div>
        </div>
      </section>

      <section className={`deals-mode-panel deals-mode-panel--${isExternalFallback ? "warning" : mode}`} aria-label="Deal source selection">
        <div className="deals-mode-panel__topline">
          <div className="deals-mode-switch" role="group" aria-label="Choose deal source">
            <button
              className={mode === "curated" ? "deals-mode-switch__button deals-mode-switch__button--active" : "deals-mode-switch__button"}
              type="button"
              aria-pressed={mode === "curated"}
              onClick={() => selectMode("curated")}
            >
              Curated Deals
            </button>
            <button
              className={mode === "external" ? "deals-mode-switch__button deals-mode-switch__button--active" : "deals-mode-switch__button"}
              type="button"
              aria-pressed={mode === "external"}
              disabled={isExternalLoading}
              onClick={() => selectMode("external")}
            >
              {isExternalLoading ? "Loading Live Deals…" : "Live External Deals"}
            </button>
          </div>
          <div className="deals-mode-panel__status" role="status">
            <span aria-hidden="true" />
            <strong>{sourceLabel}</strong>
          </div>
        </div>

        {mode === "external" && (
          <form className="deals-live-search" onSubmit={submitExternalSearch}>
            <label htmlFor="external-deal-title">Search the live external feed</label>
            <div>
              <input
                id="external-deal-title"
                type="search"
                value={externalTitle}
                maxLength={80}
                placeholder="Game title, e.g. elden"
                disabled={isExternalLoading}
                onChange={(event) => setExternalTitle(event.target.value)}
              />
              <button type="submit" disabled={isExternalLoading}>
                {isExternalLoading ? "Searching…" : "Search live deals"}
              </button>
              {activeExternalTitle && (
                <button className="deals-live-search__clear" type="button" disabled={isExternalLoading} onClick={clearExternalSearch}>
                  Clear live search
                </button>
              )}
            </div>
          </form>
        )}

        {isExternalFallback && (
          <UxStatePanel
            className="ux-state--inline deals-mode-panel__warning"
            description="The external feed could not be reached. NEXORA is still showing its bundled curated deal set."
            role="status"
            title="Curated fallback active"
            tone="fallback"
          >
            <button className="ux-state__action" type="button" onClick={() => void loadExternalDeals(externalTitle)}>
              Retry live feed
            </button>
          </UxStatePanel>
        )}
      </section>

      <section className="deals-filter-panel" aria-label="Search and filter displayed deals">
        <div className="deals-search">
          <span className="page-search-icon" aria-hidden="true">🔍</span>
          <label className="sr-only" htmlFor="deal-search">Filter displayed deals</label>
          <input
            id="deal-search"
            type="search"
            placeholder={isExternalReady ? "Filter loaded live deals…" : "Search curated deals, stores, games…"}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {searchQuery && (
            <button type="button" aria-label="Clear displayed deal filter" onClick={() => setSearchQuery("")}>
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
        <section aria-label={isExternalReady ? "Live external game deals" : "Curated game deals"}>
          {authChecked && !authToken && (
            <UxStatePanel
              className="ux-state--compact deals-auth-notice"
              description="Browsing and local alert toggles remain available. An account is required only to save a deal to your personal wishlist."
              title="Sign in to save deals"
              tone="auth"
            >
              <Link className="ux-state__action" href="/login">Sign in</Link>
              <Link className="ux-state__action ux-state__action--quiet" href="/register">Register</Link>
            </UxStatePanel>
          )}
          {wishlistSyncWarning && (
            <UxStatePanel
              className="ux-state--compact deals-wishlist-sync-warning"
              description={(
                <>
                  {wishlistSyncWarning.text} Deal browsing still works; saved markers may be incomplete until sync succeeds.
                  <RequestIdSupportText requestId={wishlistSyncWarning.requestId} />
                </>
              )}
              role="status"
              title="Saved-deal sync unavailable"
              tone="unavailable"
            />
          )}
          <div className="deals-results-bar">
            <span><strong>{filteredDeals.length}</strong> deals detected</span>
            <span>{sourceLabel}</span>
          </div>
          <div className="deals-grid" aria-busy={isExternalLoading}>
            {isExternalLoading && (
              <UxStatePanel
                className="ux-state--grid"
                description={<>Requesting current external offers. Curated deals remain visible below while the request finishes.<UxSkeleton lines={2} /></>}
                role="status"
                title="Loading live external deals"
                tone="loading"
              />
            )}
            {filteredDeals.map((deal) => (
              <DealCard
                deal={deal}
                alertIsSet={alerts.has(`${displayedDealScope}:${deal.id}`)}
                isSaved={
                  savedDeals.has(dealStateKey(displayedDealScope, deal)) ||
                  syncedSavedDealKeys.has(dealStateKey(displayedDealScope, deal))
                }
                isSaving={savingDeals.has(dealStateKey(displayedDealScope, deal))}
                key={dealStateKey(displayedDealScope, deal)}
                saveMessage={saveMessages[dealStateKey(displayedDealScope, deal)]}
                onSave={saveDeal}
                onToggleAlert={toggleAlert}
              />
            ))}
            {isExternalReady && externalDeals.length === 0 && (
              <UxStatePanel
                className="ux-state--grid deals-empty"
                description={activeExternalTitle
                  ? <>The external feed returned no offers for “{activeExternalTitle}”. Try another title or load the full feed.</>
                  : "The external feed returned no offers. Switch to Curated Deals to keep browsing NEXORA’s bundled set."}
                role="status"
                title="No live external deals found"
                tone="empty"
              >
                {activeExternalTitle ? <button className="ux-state__action" type="button" onClick={clearExternalSearch}>Load all live deals</button> : null}
                <button className="ux-state__action ux-state__action--quiet" type="button" onClick={() => selectMode("curated")}>View curated deals</button>
              </UxStatePanel>
            )}
            {visibleDeals.length > 0 && filteredDeals.length === 0 && (
              <UxStatePanel
                className="ux-state--grid deals-empty"
                description={<>No displayed deals match {searchQuery.trim() ? <>“{searchQuery.trim()}” and </> : null}the <strong>{activeFilter}</strong> filter. Reset the view to show every available deal.</>}
                role="status"
                title="No matching deal signals"
                tone="empty"
              >
                <button className="ux-state__action" type="button" onClick={resetFilters}>Reset search and filters</button>
              </UxStatePanel>
            )}
          </div>
        </section>
        <DealNetworkStatus curatedSource={source} externalStatus={externalStatus} mode={mode} />
      </div>
    </>
  );
}
