"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  dealFilters,
  type DealFilter,
  type DealStatus,
  type GameDeal,
} from "@/data/deals";
import type { WishlistItem } from "@/data/wishlist";
import { ProductFeedRetry } from "@/components/ProductFeedNotice";
import RequestIdSupportText from "@/components/RequestIdSupportText";
import UxStatePanel, { UxSkeleton } from "@/components/UxStatePanel";
import { getExternalDeals, type DealsResult } from "@/lib/api";
import { normalizeAuthError } from "@/lib/auth";
import { hasAvailableDealRating } from "@/lib/deal-rating";
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
import styles from "@/components/DealsProduct.module.css";

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


function statusClass(status: DealStatus) {
  if (status === "Deep discount") return "hot";
  if (status === "Strong discount" || status === "Current offer") return "good";
  if (status === "Free offer") return "free";
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
    lowestEver: "Not established",
    discount: deal.discount,
    status: isFree ? "free-now" : deal.discountValue >= 50 ? "price-drop" : "tracking",
    priority: deal.discountValue >= 80 ? "high" : deal.discountValue >= 50 ? "medium" : "low",
    alertActive: true,
  };
}

const STATUS_TONE_CLASS = {
  hot: styles.statusHot,
  good: styles.statusGood,
  free: styles.statusFree,
  neutral: styles.statusNeutral,
} as const;

const SAVE_TONE_CLASS = {
  success: styles.saveSuccess,
  auth: styles.saveAuth,
  error: styles.saveError,
} as const;

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
  const dealUrl = safeCheapSharkDealUrl(deal.dealUrl);
  const hasRating = hasAvailableDealRating(deal.rating, deal.stars);
  const titleId = `deal-title-${dealStateKey("curated", deal).replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={styles.cardAccent} aria-hidden="true" />
      <div className={styles.cardHeader}>
        <span className={styles.store}>{deal.store}</span>
        <span className={styles.discount}>{deal.discount}</span>
      </div>

      <h2 className={styles.cardTitle} id={titleId}>{deal.title}</h2>
      <p className={styles.category}>{deal.category}</p>

      <div
        className={styles.rating}
        aria-label={hasRating ? `${deal.rating} out of 5 stars` : "Rating unavailable"}
      >
        {hasRating ? (
          <>
            <span aria-hidden="true">{deal.stars}</span>
            <span>{deal.rating}</span>
          </>
        ) : (
          <span>Rating unavailable</span>
        )}
        <span className={`${styles.status} ${STATUS_TONE_CLASS[statusClass(deal.status)]}`}>
          {deal.status}
        </span>
      </div>

      <div className={styles.prices}>
        <del>{deal.priceOld}</del>
        <strong className={deal.priceNew === "FREE" ? styles.priceFree : undefined}>
          {deal.priceNew}
        </strong>
      </div>

      <div className={styles.actions}>
        <button
          className={isSaved ? `${styles.saveButton} ${styles.saveButtonSaved}` : styles.saveButton}
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
          className={alertIsSet ? `${styles.alertButton} ${styles.alertButtonActive}` : styles.alertButton}
          type="button"
          aria-pressed={alertIsSet}
          aria-label={`${alertIsSet ? "Remove" : "Mark"} page-only alert preview for ${deal.title}`}
          title="Page-only preview; no alert is saved and no notification will be sent"
          onClick={() => onToggleAlert(deal.id)}
        >
          <span aria-hidden="true">🔔</span>
          {alertIsSet ? "Marked on page" : "Preview alert"}
        </button>
        {dealUrl ? (
          <a
            className={`${styles.viewButton} ${styles.viewButtonActive}`}
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
            className={styles.viewButton}
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
          className={`${styles.saveMessage} ${SAVE_TONE_CLASS[saveMessage.tone]}`}
          role={saveMessage.tone === "error" ? "alert" : "status"}
        >
          <span aria-hidden="true">
            {saveMessage.tone === "success" ? "✓" : saveMessage.tone === "auth" ? "🔐" : "!"}
          </span>
          <span className={styles.saveMessageCopy}>
            <strong>
              {saveMessage.tone === "success" ? "Wishlist updated" : saveMessage.tone === "auth" ? "Sign in required" : "Deal not saved"}
            </strong>
            <small>{saveMessage.text}</small>
            {saveMessage.tone !== "success" ? (
              <RequestIdSupportText requestId={saveMessage.requestId} />
            ) : null}
          </span>
          {saveMessage.tone === "auth" && (
            <span className={styles.authLinks}>
              <Link href="/login?returnTo=%2Fdeals">Login</Link>
              <Link href="/register?returnTo=%2Fdeals">Register</Link>
            </span>
          )}
        </div>
      )}
    </article>
  );
}

const NETWORK_LIVE_TONE_CLASS = {
  active: styles.networkLiveActive,
  loading: styles.networkLiveLoading,
  fallback: styles.networkLiveFallback,
  curated: styles.networkLiveCurated,
} as const;

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
  const stateKey = isExternalLive ? "active" : isExternalLoading ? "loading" : isExternalFallback ? "fallback" : "curated";
  const stateLabel = isExternalLive
    ? "External"
    : isExternalLoading
      ? "Loading"
      : isExternalFallback
        ? "Fallback"
        : "Curated";

  const items = [
    {
      label: "Price Sync",
      value: isExternalLive ? "CheapShark via backend · may be cached" : isExternalLoading ? "Requesting external offers" : isExternalFallback ? "Curated fallback active" : "Curated NEXORA feed",
      badge: stateLabel,
    },
    {
      label: "Data Source",
      value: isExternalLive ? "External deal API" : isCuratedApi ? "Spring Boot curated data" : "Static curated dataset",
      badge: isExternalLive ? "External" : isCuratedApi ? "API" : "Static",
    },
    {
      label: "Freshness",
      value: isExternalLive ? "Provider response time is not exposed" : "Curated sample data",
      badge: isExternalLive ? "May be cached" : "Sample",
    },
    {
      label: "Alert control",
      value: "Page-only preview · no notification",
      badge: "Preview",
    },
  ] as const;

  return (
    <aside className={styles.network} aria-labelledby="deal-network-title">
      <div className={styles.networkHeader}>
        <span className={styles.networkHeaderIcon} aria-hidden="true" />
        <div>
          <span>Feed source</span>
          <h2 id="deal-network-title" className={styles.networkTitle}>Deal Feed Status</h2>
        </div>
        <span className={`${styles.networkLive} ${NETWORK_LIVE_TONE_CLASS[stateKey]}`}>
          <span aria-hidden="true" /> {stateLabel}
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

    </aside>
  );
}

function DealSearchQuery({ onSearch }: { onSearch: (title: string) => void }) {
  const searchParams = useSearchParams();
  const requestedTitle = (searchParams.get("title") ?? "").trim().slice(0, 80);

  useEffect(() => {
    if (!requestedTitle) return;

    let active = true;
    // Let Strict Mode's setup/cleanup replay finish before starting a request.
    queueMicrotask(() => {
      if (active) onSearch(requestedTitle);
    });
    return () => {
      active = false;
    };
  }, [onSearch, requestedTitle]);

  return null;
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
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    let focusFrame: number | undefined;

    if (window.location.hash === "#deal-search") {
      const input = document.getElementById("deal-search");
      if (input instanceof HTMLInputElement) {
        focusFrame = window.requestAnimationFrame(() => {
          input.scrollIntoView({ behavior: "smooth", block: "center" });
          input.focus({ preventScroll: true });
        });
      }
    }

    return () => {
      mounted.current = false;
      if (focusFrame !== undefined) window.cancelAnimationFrame(focusFrame);
    };
  }, []);

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
      if (activeFilter === "Free offers") return deal.priceValue === 0;
      return deal.store === activeFilter;
    });
  }, [activeFilter, searchQuery, visibleDeals]);

  const loadExternalDeals = useCallback(async (title: string) => {
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
    if (!mounted.current || currentRequest !== requestVersion.current) return;

    if (result.source === "external-api") {
      setExternalDeals(result.deals);
      setExternalStatus("ready");
    } else {
      setExternalDeals([]);
      setExternalStatus("fallback");
    }
  }, []);

  const searchExternalTitle = useCallback((title: string) => {
    setMode("external");
    setExternalTitle(title);
    void loadExternalDeals(title);
  }, [loadExternalDeals]);

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
    ? "External offers · may be cached"
    : isExternalFallback
      ? "External offers unavailable — showing fallback preview"
      : isExternalLoading
        ? "Loading external offers — curated deals remain available"
        : "Curated NEXORA deals";

  return (
    <>
      <Suspense fallback={null}>
        <DealSearchQuery onSearch={searchExternalTitle} />
      </Suspense>
      <div className={styles.overview}>
        <section className={styles.routeHero} aria-labelledby="deals-title">
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowLine} aria-hidden="true" />
            {isExternalReady ? "External offers · may be cached" : "Curated intelligence"}
          </p>
          <h1 id="deals-title" className={styles.title}>Game Deals Intelligence</h1>
          <p className={styles.lede}>
            Compare NEXORA&apos;s curated deal set or request current external
            offers on demand. External results may be cached because the API does not expose
            freshness metadata.
          </p>
          <div className={styles.statsRow} aria-label="Deal statistics">
            <div className={styles.stat}>
              <strong className={styles.statValue}>{visibleDeals.length}</strong>
              <span className={styles.statLabel}>Feed entries</span>
            </div>
            <div className={styles.stat}>
              <strong className={styles.statValue}>{deepDiscountCount}</strong>
              <span className={styles.statLabel}>50%+ off</span>
            </div>
            <div className={styles.stat}>
              <strong className={styles.statValue}>{freeCount}</strong>
              <span className={styles.statLabel}>Free now</span>
            </div>
          </div>
        </section>

        <section
          className={isExternalFallback ? `${styles.sourcePanel} ${styles.sourcePanelWarning}` : styles.sourcePanel}
          aria-label="Deal source selection"
        >
          <div className={styles.sourceTop}>
            <div className={styles.modeSwitch} role="group" aria-label="Choose deal source">
              <button
                className={mode === "curated" ? `${styles.modeButton} ${styles.modeButtonActive}` : styles.modeButton}
                type="button"
                aria-pressed={mode === "curated"}
                onClick={() => selectMode("curated")}
              >
                Curated Deals
              </button>
              <button
                className={mode === "external" ? `${styles.modeButton} ${styles.modeButtonActive}` : styles.modeButton}
                type="button"
                aria-pressed={mode === "external"}
                disabled={isExternalLoading}
                onClick={() => selectMode("external")}
              >
                {isExternalLoading ? "Loading External Offers…" : "External Offers"}
              </button>
            </div>
            <div className={styles.sourceStatus} role="status">
              <span className={styles.sourceStatusDot} aria-hidden="true" />
              <strong>{sourceLabel}</strong>
            </div>
          </div>

          {mode === "external" && (
            <form className={styles.liveSearch} onSubmit={submitExternalSearch}>
              <label htmlFor="external-deal-title">Search external offers</label>
              <div className={styles.liveSearchRow}>
                <input
                  id="external-deal-title"
                  type="search"
                  value={externalTitle}
                  maxLength={80}
                  placeholder="Game title, e.g. elden"
                  disabled={isExternalLoading}
                  onChange={(event) => setExternalTitle(event.target.value)}
                />
                <button className={styles.primaryButton} type="submit" disabled={isExternalLoading}>
                  {isExternalLoading ? "Searching…" : "Search external offers"}
                </button>
                {activeExternalTitle && (
                  <button className={styles.ghostButton} type="button" disabled={isExternalLoading} onClick={clearExternalSearch}>
                    Clear external search
                  </button>
                )}
              </div>
            </form>
          )}

          {isExternalFallback && (
            <UxStatePanel
              className="ux-state--inline deals-mode-panel__warning"
              description="The external provider route could not be reached. NEXORA is showing its bundled curated preview; retry makes another external request."
              role="status"
              title="Curated fallback active"
              tone="fallback"
            >
              <button className="ux-state__action" type="button" onClick={() => void loadExternalDeals(externalTitle)}>
                Retry external offers
              </button>
            </UxStatePanel>
          )}
        </section>
        <DealNetworkStatus curatedSource={source} externalStatus={externalStatus} mode={mode} />
      </div>

      <section className={styles.filterPanel} aria-label="Search and filter displayed deals">
        <div className={styles.searchField}>
          <span className={styles.searchIcon} aria-hidden="true">
            <svg viewBox="0 0 20 20" width="16" height="16" focusable="false">
              <circle cx="9" cy="9" r="5.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M13.2 13.2 17 17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <label className="sr-only" htmlFor="deal-search">Filter displayed deals</label>
          <input
            id="deal-search"
            type="search"
            placeholder={isExternalReady ? "Filter loaded external offers…" : "Search curated deals, stores, games…"}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {searchQuery && (
            <button className={styles.searchClear} type="button" aria-label="Clear displayed deal filter" onClick={() => setSearchQuery("")}>
              <span aria-hidden="true">×</span>
            </button>
          )}
        </div>
        <div className={styles.chips} aria-label="Deal filters">
          {dealFilters.map((filter) => (
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

      <section className={styles.resultsMain} aria-label={isExternalReady ? "External game offers" : "Curated game deals"}>
        {authChecked && !authToken && (
          <UxStatePanel
            className="ux-state--compact deals-auth-notice"
            description="Browsing and page-only alert previews remain available without an account. Sign in to save a deal and manage real price-alert settings from Wishlist."
            title="Sign in to save deals"
            tone="auth"
          >
            <Link className="ux-state__action" href="/login?returnTo=%2Fdeals">Sign in</Link>
            <Link className="ux-state__action ux-state__action--quiet" href="/register?returnTo=%2Fdeals">Register</Link>
          </UxStatePanel>
        )}
        {wishlistSyncWarning && (
          <UxStatePanel
            className="ux-state--compact deals-wishlist-sync-warning"
            description={(
              <>
                {wishlistSyncWarning.text} Deal browsing still works; saved markers describe only the last successful account sync and may be incomplete until a later sync succeeds.
                <RequestIdSupportText requestId={wishlistSyncWarning.requestId} />
              </>
            )}
            role="status"
            title="Saved-deal sync unavailable"
            tone="unavailable"
          />
        )}
        <div className={styles.resultsBar}>
          <span><strong>{filteredDeals.length}</strong> displayed deals</span>
          <span>{sourceLabel}</span>
        </div>
        <div className={styles.grid} aria-busy={isExternalLoading}>
          {isExternalLoading && (
            <UxStatePanel
              className="ux-state--grid"
              description={<>Waiting for the external provider response. Bundled curated deals remain visible below while this manual request finishes.<UxSkeleton lines={2} /></>}
              role="status"
              title="Loading external offers"
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
                ? <>The external feed returned no displayed offers for “{activeExternalTitle}”. This result does not establish that every store has no matching deal; try another title or load the full feed.</>
                : "The external feed returned no displayed offers for this request. This does not establish global store availability; switch to Curated Deals to keep browsing NEXORA’s bundled set."}
              role="status"
              title="No external offers found"
              tone="empty"
            >
              {activeExternalTitle ? <button className="ux-state__action" type="button" onClick={clearExternalSearch}>Load all external offers</button> : null}
              <button className="ux-state__action ux-state__action--quiet" type="button" onClick={() => selectMode("curated")}>View curated deals</button>
            </UxStatePanel>
          )}
          {!isExternalReady && visibleDeals.length === 0 && !isExternalLoading && (
            <UxStatePanel className="ux-state--grid deals-empty" tone="empty" role="status"
              title="No curated deals available"
              description="This feed has no deals to display right now. Check again or browse external offers, which may be cached.">
              <ProductFeedRetry label="deals" />
              <button className="ux-state__action" type="button" onClick={() => selectMode("external")}>Browse external offers</button>
            </UxStatePanel>
          )}
          {visibleDeals.length > 0 && filteredDeals.length === 0 && (
            <UxStatePanel
              className="ux-state--grid deals-empty"
              description={<>No deals in the currently displayed set match {searchQuery.trim() ? <>“{searchQuery.trim()}” and </> : null}the <strong>{activeFilter}</strong> filter. This filtered view does not describe every store listing; reset it to show the full loaded set.</>}
              role="status"
              title="No matching deal signals"
              tone="empty"
            >
              <button className="ux-state__action" type="button" onClick={resetFilters}>Reset search and filters</button>
            </UxStatePanel>
          )}
        </div>
      </section>
    </>
  );
}
