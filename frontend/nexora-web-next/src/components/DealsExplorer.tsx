"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  dealFilters,
  dealSortOptions,
  type DealFilter,
  type DealSortBy,
  type DealStatus,
  type GameDeal,
  type LiveDealsCatalog,
} from "@/data/deals";
import type { WishlistItem } from "@/data/wishlist";
import DealArtwork from "@/components/DealArtwork";
import { ProductFeedRetry } from "@/components/ProductFeedNotice";
import RequestIdSupportText from "@/components/RequestIdSupportText";
import SentinelButton from "@/components/SentinelButton";
import UxStatePanel, { UxSkeleton } from "@/components/UxStatePanel";
import { getExternalDeals, getLiveDeals, type DealsResult } from "@/lib/api";
import { normalizeAuthError } from "@/lib/auth";
import { hasAvailableDealRating } from "@/lib/deal-rating";
import {
  AUTH_STATE_EVENT,
  AuthSessionInvalidatedError,
  assertAuthSessionRevision,
  isAuthSessionInvalidatedError,
  readAuthSessionRevision,
  clearAuthToken,
  ensureAuthToken,
  readAuthToken,
} from "@/lib/auth-client";
import {
  addMyWishlistItem,
  getMyWishlist,
  normalizeUserWishlistError,
  updateMyWishlistAlert,
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

function dealStateKey(scope: "curated" | "external", deal: GameDeal) {
  return `${scope}:${deal.gameId ?? deal.id}:${deal.externalDealId ?? deal.title}`;
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

function wishlistOperationKey(deal: GameDeal) {
  return JSON.stringify([
    normalizedWishlistValue(deal.title),
    normalizedWishlistValue(deal.store),
  ]);
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
    ...(deal.gameId ? { externalGameId: deal.gameId } : {}),
    ...(deal.externalDealId ? { externalDealId: deal.externalDealId } : {}),
    ...(deal.currency ? { currency: deal.currency } : {}),
    ...(deal.thumbUrl ? { thumbUrl: deal.thumbUrl } : {}),
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
  onFindOffers,
  onViewDetails,
}: {
  deal: GameDeal;
  alertIsSet: boolean;
  isSaved: boolean;
  isSaving: boolean;
  saveMessage?: SaveMessage;
  onSave: (deal: GameDeal) => void;
  onToggleAlert: (deal: GameDeal) => void;
  onFindOffers: (title: string) => void;
  onViewDetails?: (deal: GameDeal) => void;
}) {
  const dealUrl = safeCheapSharkDealUrl(deal.dealUrl);
  const hasRating = hasAvailableDealRating(deal.rating, deal.stars);
  const titleId = `deal-title-${dealStateKey("curated", deal).replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      {typeof DealArtwork === "function" ? (
        <DealArtwork title={deal.title} thumbUrl={deal.thumbUrl} />
      ) : (
        <div className={styles.cardMedia}>
          <div className={styles.cardMediaArt} aria-hidden="true" />
          <span className={styles.artworkCaption}>Artwork unavailable</span>
        </div>
      )}
      <div className={styles.cardHeader}>
        <span className={styles.store}>{deal.store}</span>
        <span className={styles.discount}>{deal.discount}</span>
      </div>

      <h2 className={styles.cardTitle} id={titleId}>{deal.title}</h2>
      <p className={styles.category}>
        {deal.category}
        {deal.currency ? ` · ${deal.currency}` : ""}
        {deal.metacriticScore ? ` · Metacritic ${deal.metacriticScore}` : ""}
      </p>

      <div className={styles.cardSignals}>
        <span
          className={styles.rating}
          role={hasRating ? "img" : undefined}
          aria-label={hasRating ? `${deal.rating} out of 5 stars` : undefined}
        >
          {hasRating ? (
            <span aria-hidden="true">{deal.stars} <span>{deal.rating}</span></span>
          ) : (
            "Rating unavailable"
          )}
        </span>
        <span className={`${styles.status} ${STATUS_TONE_CLASS[statusClass(deal.status)]}`}>
          {deal.status}
        </span>
      </div>

      <div className={styles.prices}>
        <strong className={deal.priceNew === "FREE" ? styles.priceFree : undefined}>
          {deal.priceNew}
        </strong>
        {deal.priceOld !== deal.priceNew && <del>{deal.priceOld}</del>}
      </div>

      <div className={styles.actions}>
        <button
          className={isSaved ? `${styles.saveButton} ${styles.saveButtonSaved}` : styles.saveButton}
          type="button"
          disabled={isSaving || isSaved}
          aria-busy={isSaving}
          aria-label={isSaved ? `Saved: ${deal.title} is in your wishlist` : isSaving ? `Saving… ${deal.title} to your wishlist` : `Save to Wishlist: ${deal.title}`}
          onClick={() => onSave(deal)}
        >
          <span aria-hidden="true">{isSaved ? "✓" : "♡"}</span>
          {isSaved ? "Saved" : isSaving ? "Saving…" : "Save to Wishlist"}
        </button>
        <button
          className={alertIsSet ? `${styles.alertButton} ${styles.alertButtonActive}` : styles.alertButton}
          type="button"
          disabled={isSaving}
          aria-busy={isSaving}
          aria-pressed={alertIsSet}
          aria-label={isSaving ? `Updating… wishlist alert for ${deal.title}` : `${alertIsSet ? "Pause alert" : "Enable alert"} for ${deal.title}`}
          title="Enable or pause a persisted wishlist alert; manage the target price in Wishlist"
          onClick={() => onToggleAlert(deal)}
        >
          <span aria-hidden="true">🔔</span>
          {isSaving ? "Updating…" : alertIsSet ? "Pause alert" : "Enable alert"}
        </button>
        {onViewDetails ? (
          <button
            className={styles.detailButton}
            type="button"
            aria-label={`Inspect deal details for ${deal.title}`}
            onClick={() => onViewDetails(deal)}
          >
            Deal Details
          </button>
        ) : null}
        {dealUrl ? (
          <a
            className={`${styles.viewButton} ${styles.viewButtonActive}`}
            href={dealUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            aria-label={`View Deal for ${deal.title} from ${deal.store} in a new tab`}
          >
            <span aria-hidden="true">↗</span>
            View Deal
          </a>
        ) : (
          <button
            className={`${styles.viewButton} ${styles.viewButtonActive}`}
            type="button"
            aria-label={`Find Current Offers for ${deal.title}`}
            title="Search External Offers for this game title"
            onClick={() => onFindOffers(deal.title)}
          >
            <span aria-hidden="true">↗</span>
            Find Current Offers
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
              {saveMessage.tone === "success" ? "Wishlist updated" : saveMessage.tone === "auth" ? "Sign in required" : "Wishlist update failed"}
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

function DealDetailModal({
  deal,
  liveCatalog,
  onClose,
}: {
  deal: GameDeal;
  liveCatalog: LiveDealsCatalog | null;
  onClose: () => void;
}) {
  const dealUrl = safeCheapSharkDealUrl(deal.dealUrl);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const observedAt = deal.observedAtUtc ?? liveCatalog?.lastRefreshedAtUtc ?? null;
  const isLiveDeal = deal.source === "cheapshark" || deal.category === "External Deal";

  return (
    <div
      className={styles.modalBackdrop}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={styles.modalDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deal-detail-title"
      >
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.modalEyebrow}>
              {isLiveDeal ? "Live Offer Details" : "Curated Sample Details"}
            </span>
            <h2 id="deal-detail-title" className={styles.modalTitle}>{deal.title}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.modalClose}
            aria-label="Close deal details"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <DealArtwork title={deal.title} thumbUrl={deal.thumbUrl} variant="modal" />

        <dl className={styles.modalGrid}>
          <div><dt>Store</dt><dd>{deal.store}</dd></div>
          <div><dt>Current Price</dt><dd>{deal.priceNew} ({deal.currency ?? "USD"})</dd></div>
          <div><dt>Original Price</dt><dd>{deal.priceOld}</dd></div>
          <div><dt>Discount</dt><dd>{deal.discount} ({deal.status})</dd></div>
          <div>
            <dt>Steam Rating</dt>
            <dd>{hasAvailableDealRating(deal.rating, deal.stars) ? `${deal.rating} / 5` : "Not supplied"}</dd>
          </div>
          <div>
            <dt>Metacritic</dt>
            <dd>{deal.metacriticScore ? `${deal.metacriticScore} / 100` : "Not supplied"}</dd>
          </div>
          <div>
            <dt>Stable Game ID</dt>
            <dd>{deal.gameId ?? "Curated entry"}</dd>
          </div>
          <div>
            <dt>Last Refreshed</dt>
            <dd>{isLiveDeal ? formatRefreshTimestamp(observedAt) : "Static sample"}</dd>
          </div>
        </dl>

        <p className={styles.modalAttribution}>
          {isLiveDeal ? (
            <>
              Offer data attributed to{" "}
              <a href="https://www.cheapshark.com" target="_blank" rel="noopener noreferrer">
                CheapShark
              </a>
              . Redirects pass through CheapShark&apos;s verified deal redirect before reaching {deal.store}.
            </>
          ) : (
            "This entry comes from NEXORA's local curated sample catalog, not a live store feed."
          )}
        </p>

        <div className={styles.modalActions}>
          {dealUrl ? (
            <a
              className={`${styles.viewButton} ${styles.viewButtonActive}`}
              href={dealUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
            >
              ↗ Open Offer on {deal.store}
            </a>
          ) : null}
          <button type="button" className={styles.ghostButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
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
  liveCatalog,
  mode,
}: {
  curatedSource: DealsResult["source"];
  externalStatus: ExternalDealsStatus;
  liveCatalog: LiveDealsCatalog | null;
  mode: DealsMode;
}) {
  const isExternalLive = mode === "external" && externalStatus === "ready";
  const isExternalLoading = mode === "external" && externalStatus === "loading";
  const isExternalFallback = mode === "external" && externalStatus === "fallback";
  const isCuratedApi = curatedSource === "api";
  const stateKey = isExternalLive ? "active" : isExternalLoading ? "loading" : isExternalFallback ? "fallback" : "curated";
  const cacheLabel = liveCatalog?.cacheState === "stale"
    ? "Stale cache"
    : liveCatalog?.cacheState === "cached"
      ? "Cached"
      : liveCatalog?.cacheState === "live"
        ? "Live"
        : "External";
  const stateLabel = isExternalLive
    ? cacheLabel
    : isExternalLoading
      ? "Loading"
      : isExternalFallback
        ? "Unavailable"
        : "Curated";

  const refreshedAt = liveCatalog?.lastRefreshedAtUtc ?? null;
  const items = [
    {
      label: "Price Sync",
      value: isExternalLive
        ? `CheapShark (${liveCatalog?.currency ?? "USD"}) · ${liveCatalog?.cacheState ?? "live"}`
        : isExternalLoading
          ? "Requesting live CheapShark offers"
          : isExternalFallback
            ? "Live provider unavailable"
            : "Curated NEXORA sample feed",
      badge: stateLabel,
    },
    {
      label: "Data Source",
      value: isExternalLive
        ? "CheapShark API (cheapshark.com)"
        : isCuratedApi
          ? "Spring Boot curated sample"
          : "Static sample dataset",
      badge: isExternalLive ? "CheapShark" : isCuratedApi ? "API" : "Sample",
    },
    {
      label: "Last Refresh",
      value: isExternalLive ? formatRefreshTimestamp(refreshedAt) : "Static sample data",
      badge: isExternalLive && refreshedAt ? "UTC" : "Sample",
    },
    {
      label: "Wishlist alerts",
      value: "Persisted account settings · delivery depends on notification configuration",
      badge: "Wishlist",
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

      <p className={styles.networkAttribution}>
        Live PC deal feeds are powered by{" "}
        <a href="https://www.cheapshark.com" target="_blank" rel="noopener noreferrer">
          CheapShark
        </a>{" "}
        in USD.
      </p>
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

export default function DealsExplorer({
  deals,
  source,
  initialLiveCatalog,
}: DealsResult & { initialLiveCatalog?: LiveDealsCatalog }) {
  const renderSessionRevision = readAuthSessionRevision();
  const initialCatalog = typeof initialLiveCatalog === "undefined" ? null : initialLiveCatalog;
  const initialHasLive = initialCatalog?.source === "cheapshark";
  const [mode, setMode] = useState<DealsMode>(initialHasLive ? "external" : "curated");
  const [externalStatus, setExternalStatus] = useState<ExternalDealsStatus>(
    initialHasLive ? "ready" : initialCatalog ? "fallback" : "idle",
  );
  const [externalDeals, setExternalDeals] = useState<readonly GameDeal[]>(
    initialHasLive && initialCatalog ? initialCatalog.deals : [],
  );
  const [liveCatalog, setLiveCatalog] = useState<LiveDealsCatalog | null>(initialCatalog);
  const [sortBy, setSortBy] = useState<DealSortBy>("DealRating");
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedDeal, setSelectedDeal] = useState<GameDeal | null>(null);
  const [externalTitle, setExternalTitle] = useState("");
  const [activeExternalTitle, setActiveExternalTitle] = useState("");
  const [activeFilter, setActiveFilter] = useState<DealFilter>("All Stores");
  const [searchQuery, setSearchQuery] = useState("");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [savingDeals, setSavingDeals] = useState<Set<string>>(() => new Set());
  const [savedWishlistItems, setSavedWishlistItems] = useState<readonly WishlistItem[]>([]);
  const [wishlistSyncWarning, setWishlistSyncWarning] = useState<RequestSupportMessage | null>(null);
  const [saveMessages, setSaveMessages] = useState<Record<string, SaveMessage>>({});
  const savingDealKeys = useRef(new Set<string>());
  const savedWishlistItemsRef = useRef<readonly WishlistItem[]>([]);
  const wishlistVersion = useRef(0);
  const [wishlistSyncRevision, setWishlistSyncRevision] = useState(0);

  const storeWishlistItems = useCallback((items: readonly WishlistItem[]) => {
    savedWishlistItemsRef.current = items;
    setSavedWishlistItems(items);
  }, []);
  const previousAuthRevision = useRef(renderSessionRevision);
  const wishlistLifetime = useRef<object | null>(null);
  const previousAuthToken = useRef<string | null>(null);
  const requestVersion = useRef(0);
  const mounted = useRef(false);
  const sourcePanelRef = useRef<HTMLElement | null>(null);

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
    wishlistLifetime.current = {};
    savingDealKeys.current = new Set();
    return () => {
      wishlistLifetime.current = null;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let version = 0;

    async function refreshToken() {
      const request = ++version;
      let token = readAuthToken();
      try {
        token = token ?? await ensureAuthToken();
      } catch (error) {
        if (!active || request !== version) return;
        const details = normalizeAuthError(error);
        setAuthToken(null);
        setAuthChecked(true);
        setWishlistSyncWarning({
          text: details.message,
          requestId: details.requestId,
        });
        return;
      }

      if (!active || request !== version) return;
      const revision = readAuthSessionRevision();
      const sessionChanged = previousAuthRevision.current !== revision;
      if (sessionChanged) {
        previousAuthRevision.current = revision;
        savingDealKeys.current = new Set();
        setSavingDeals(new Set());
      }
      if (sessionChanged || previousAuthToken.current !== token) {
        previousAuthToken.current = token;
        wishlistVersion.current += 1;
        storeWishlistItems([]);
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
  }, [storeWishlistItems]);

  useEffect(() => {
    if (!authChecked || !authToken) return;

    let active = true;
    const token = authToken;
    const version = wishlistVersion.current;
    const sessionRevision = renderSessionRevision;
    const isCurrent = () => active && sessionRevision === readAuthSessionRevision()
      && version === wishlistVersion.current && savingDealKeys.current.size === 0;

    async function syncSavedWishlist() {
      if (!isCurrent()) return;
      setWishlistSyncWarning(null);
      try {
        const result = await withWishlistAuthRetry(token, getMyWishlist, { sessionRevision, isCurrent });
        if (!isCurrent()) return;
        assertAuthSessionRevision(result.sessionRevision);
        setAuthToken(result.token);
        storeWishlistItems(result.value);
      } catch (error) {
        if (!isCurrent() || isAuthSessionInvalidatedError(error)) return;
        const details = protectedWishlistError(error);
        if (details.status === 401) {
          clearAuthToken();
          setAuthToken(null);
          storeWishlistItems([]);
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
  }, [authChecked, authToken, externalDeals, externalStatus, mode, renderSessionRevision, storeWishlistItems, wishlistSyncRevision]);

  const visibleDeals = mode === "external" && externalStatus === "ready" ? externalDeals : deals;
  const isExternalReady = mode === "external" && externalStatus === "ready";
  const isExternalLoading = mode === "external" && externalStatus === "loading";
  const isExternalFallback = mode === "external" && externalStatus === "fallback";
  const displayedDealScope = isExternalReady ? "external" : "curated";
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

  const loadLiveCatalog = useCallback(async (options: {
    title: string;
    sortBy: DealSortBy;
    storeId: string;
  }) => {
    const currentRequest = ++requestVersion.current;
    const normalizedTitle = options.title.trim();
    setExternalStatus("loading");
    setActiveExternalTitle(normalizedTitle);
    setActiveFilter("All Stores");
    setSearchQuery("");

    const catalog = await getLiveDeals({
      pageSize: 12,
      title: normalizedTitle || undefined,
      sortBy: options.sortBy,
      desc: options.sortBy === "Price" || options.sortBy === "Title" ? false : true,
      storeId: options.storeId || undefined,
    });
    if (!mounted.current || currentRequest !== requestVersion.current) return;

    setLiveCatalog(catalog);
    if (catalog.source === "cheapshark") {
      setExternalDeals(catalog.deals);
      setExternalStatus("ready");
    } else {
      setExternalDeals([]);
      setExternalStatus("fallback");
    }
  }, []);

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

  function findCurrentOffers(title: string) {
    searchExternalTitle(title);
    // The source panel exists in both modes, including while its input is disabled.
    sourcePanelRef.current?.scrollIntoView({ block: "center" });
    sourcePanelRef.current?.focus({ preventScroll: true });
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

  function handleSortChange(nextSort: DealSortBy) {
    setSortBy(nextSort);
    setMode("external");
    void loadLiveCatalog({ title: externalTitle, sortBy: nextSort, storeId: selectedStoreId });
  }

  function handleStoreFilterChange(nextStoreId: string) {
    setSelectedStoreId(nextStoreId);
    setMode("external");
    void loadLiveCatalog({ title: externalTitle, sortBy, storeId: nextStoreId });
  }

  function toggleDealAlert(deal: GameDeal) {
    return saveDeal(deal, true);
  }

  async function saveDeal(deal: GameDeal, changeAlert = false) {
    const key = dealStateKey(displayedDealScope, deal);
    const operationKey = wishlistOperationKey(deal);
    const lifetime = wishlistLifetime.current;
    const locks = savingDealKeys.current;
    const sessionRevision = renderSessionRevision;
    if (!lifetime || !mounted.current || sessionRevision !== readAuthSessionRevision()) return;
    if (locks.has(operationKey)) return;
    if (!changeAlert && findMatchingWishlistItem(deal, savedWishlistItemsRef.current)) return;

    // Save and Alert share a lock across feed scopes, acquired before auth awaits.
    locks.add(operationKey);
    const ownsLock = () => mounted.current && wishlistLifetime.current === lifetime
      && savingDealKeys.current === locks && locks.has(operationKey);
    const isCurrent = () => ownsLock() && sessionRevision === readAuthSessionRevision();
    wishlistVersion.current += 1;
    setSavingDeals((current) => new Set(current).add(operationKey));
    setSaveMessages((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });

    try {
      const token = await ensureAuthToken({ operation: { sessionRevision, isCurrent } });
      if (!isCurrent()) return;
      setAuthChecked(true);
      if (!token) {
        setAuthToken(null);
        storeWishlistItems([]);
        setSaveMessages((current) => ({
          ...current,
          [key]: {
            tone: "auth",
            text: "Sign in, then retry saving this deal or enabling its wishlist alert.",
          },
        }));
        return;
      }

      setAuthToken(token);
      const existingItem = findMatchingWishlistItem(deal, savedWishlistItemsRef.current);
      let postedItem: WishlistItem | undefined;
      const result = await withWishlistAuthRetry(token, async (activeToken) => {
        if (existingItem) {
          return changeAlert
            ? updateMyWishlistAlert(activeToken, existingItem.id, {
              alertActive: !existingItem.alertActive,
            })
            : existingItem;
        }

        try {
          // A successful idempotent POST may return an existing paused item.
          // Keep it across auth retry so a PATCH 401 does not repeat the POST.
          const item = postedItem ?? await addMyWishlistItem(activeToken, wishlistPayloadFor(deal));
          if (!isCurrent()) throw new AuthSessionInvalidatedError();
          postedItem = item;
          return changeAlert && !item.alertActive
            ? updateMyWishlistAlert(activeToken, item.id, { alertActive: true })
            : item;
        } catch (error) {
          if (!isCurrent()) throw new AuthSessionInvalidatedError();
          if (protectedWishlistError(error).status !== 409) throw error;
          // Another tab or a not-yet-completed sync may already have saved it.
          const items = await getMyWishlist(activeToken);
          if (!isCurrent()) throw new AuthSessionInvalidatedError();
          const item = findMatchingWishlistItem(deal, items);
          if (!item) throw error;
          return changeAlert && !item.alertActive
            ? updateMyWishlistAlert(activeToken, item.id, { alertActive: true })
            : item;
        }
      }, { sessionRevision, isCurrent });
      const currentToken = readAuthToken();
      if (!isCurrent() || !currentToken) return;
      assertAuthSessionRevision(result.sessionRevision);
      const savedItem = result.value;
      setAuthToken(currentToken);
      // Invalidate any GET started before this mutation completed.
      wishlistVersion.current += 1;
      const current = savedWishlistItemsRef.current;
      storeWishlistItems(current.some((item) => item.id === savedItem.id)
        ? current.map((item) => item.id === savedItem.id ? savedItem : item)
        : [...current, savedItem]);
      setSaveMessages((current) => ({
        ...current,
        [key]: {
          tone: "success",
          text: `${savedItem.title} is in your personal wishlist. Its wishlist alert is ${savedItem.alertActive ? "enabled" : "paused"}.`,
        },
      }));
    } catch (error) {
      if (!isCurrent() || isAuthSessionInvalidatedError(error)) return;
      setAuthChecked(true);
      const details = protectedWishlistError(error);
      if (details.status === 401) {
        clearAuthToken();
        setAuthToken(null);
        storeWishlistItems([]);
      }
      setSaveMessages((current) => ({
        ...current,
        [key]: {
          tone: details.status === 401 ? "auth" : "error",
          text: details.status === 401
            ? "Your session ended. Sign in again, then retry this wishlist update."
            : `${details.message} You can retry from this card.`,
          requestId: details.requestId,
        },
      }));
    } finally {
      const releaseUI = ownsLock();
      locks.delete(operationKey);
      if (releaseUI) {
        setSavingDeals((current) => {
          const next = new Set(current);
          next.delete(operationKey);
          return next;
        });
        // Reconcile after any sync suppressed during the operation or token retry.
        setWishlistSyncRevision((current) => current + 1);
      }
    }
  }

  function resetFilters() {
    setActiveFilter("All Stores");
    setSearchQuery("");
  }

  const deepDiscountCount = visibleDeals.filter((deal) => deal.discountValue >= 50).length;
  const freeCount = visibleDeals.filter((deal) => deal.priceValue === 0).length;
  const sourceLabel = isExternalReady
    ? `Live CheapShark offers (USD) · ${liveCatalog?.cacheState ?? "live"}`
    : isExternalFallback
      ? "Live offers unavailable — showing curated fallback preview"
      : isExternalLoading
        ? "Loading live offers — curated deals remain available"
        : "Curated NEXORA sample deals";

  return (
    <>
      <Suspense fallback={null}>
        <DealSearchQuery onSearch={searchExternalTitle} />
      </Suspense>
      {selectedDeal ? (
        <DealDetailModal
          deal={selectedDeal}
          liveCatalog={liveCatalog}
          onClose={() => setSelectedDeal(null)}
        />
      ) : null}
      <div className={styles.overview}>
        <section className={styles.routeHero} aria-labelledby="deals-title">
          <div className={styles.introduction}>
            <div className={styles.introCopy}>
              <p className={styles.eyebrow}>
                <span className={styles.eyebrowLine} aria-hidden="true" />
                {isExternalReady ? "Live CheapShark intelligence" : "Curated sample intelligence"}
              </p>
              <h1 id="deals-title" className={styles.title}>Game Deals Intelligence</h1>
              <p className={styles.lede}>
                Browse live PC store offers from CheapShark in USD with cover art, verified store
                redirects, sorting, and refresh timestamps, or switch to NEXORA&apos;s curated sample set.
              </p>
            </div>
            <div className={styles.sentinelPlacement}>
              <SentinelButton />
            </div>
          </div>
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
          ref={sourcePanelRef}
          tabIndex={-1}
          className={isExternalFallback ? `${styles.sourcePanel} ${styles.sourcePanelWarning}` : styles.sourcePanel}
          aria-label="Deal source selection"
        >
          <div className={styles.sourceTop}>
            <div className={styles.modeSwitch} role="group" aria-label="Choose deal source">
              <button
                className={mode === "external" ? `${styles.modeButton} ${styles.modeButtonActive}` : styles.modeButton}
                type="button"
                aria-pressed={mode === "external"}
                disabled={isExternalLoading}
                onClick={() => selectMode("external")}
              >
                {isExternalLoading ? "Loading Live Offers…" : "Live Offers"}
              </button>
              <button
                className={mode === "curated" ? `${styles.modeButton} ${styles.modeButtonActive}` : styles.modeButton}
                type="button"
                aria-pressed={mode === "curated"}
                onClick={() => selectMode("curated")}
              >
                Curated Sample
              </button>
            </div>
            <div className={styles.sourceStatus} role="status">
              <span className={styles.sourceStatusDot} aria-hidden="true" />
              <strong>{sourceLabel}</strong>
            </div>
          </div>

          {mode === "external" && (
            <form className={styles.liveSearch} onSubmit={submitExternalSearch}>
              <label htmlFor="external-deal-title">Search live CheapShark offers</label>
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
                  {isExternalLoading ? "Searching…" : "Search live offers"}
                </button>
                {activeExternalTitle && (
                  <button className={styles.ghostButton} type="button" disabled={isExternalLoading} onClick={clearExternalSearch}>
                    Clear live search
                  </button>
                )}
              </div>
              <div className={styles.liveControlsRow}>
                <label className={styles.selectControl} htmlFor="live-deal-sort">
                  <span>Sort by</span>
                  <select
                    id="live-deal-sort"
                    value={sortBy}
                    disabled={isExternalLoading}
                    onChange={(event) => handleSortChange(event.target.value as DealSortBy)}
                  >
                    {dealSortOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                {liveCatalog && liveCatalog.availableStores.length > 0 && (
                  <label className={styles.selectControl} htmlFor="live-deal-store">
                    <span>Store</span>
                    <select
                      id="live-deal-store"
                      value={selectedStoreId}
                      disabled={isExternalLoading}
                      onChange={(event) => handleStoreFilterChange(event.target.value)}
                    >
                      <option value="">All active stores</option>
                      {liveCatalog.availableStores.map((store) => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </label>
                )}
                <button
                  type="button"
                  className={styles.ghostButton}
                  disabled={isExternalLoading}
                  onClick={() => void loadLiveCatalog({ title: externalTitle, sortBy, storeId: selectedStoreId })}
                >
                  Refresh live feed
                </button>
              </div>
            </form>
          )}

          {isExternalFallback && (
            <UxStatePanel
              className="ux-state--inline deals-mode-panel__warning"
              description="The live CheapShark provider could not be reached. NEXORA is showing its curated sample preview separately; retry makes another live request."
              role="status"
              title="Live provider unavailable — curated fallback active"
              tone="fallback"
            >
              <button className="ux-state__action" type="button" onClick={() => void loadExternalDeals(externalTitle)}>
                Retry live offers
              </button>
            </UxStatePanel>
          )}
        </section>
        <DealNetworkStatus
          curatedSource={source}
          externalStatus={externalStatus}
          liveCatalog={liveCatalog}
          mode={mode}
        />
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
            placeholder={isExternalReady ? "Filter loaded live offers…" : "Search curated sample deals, stores, games…"}
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

      <section className={styles.resultsMain} aria-label={isExternalReady ? "Live game offers" : "Curated sample deals"}>
        {authChecked && !authToken && (
          <UxStatePanel
            className="ux-state--compact deals-auth-notice"
            description="Browse deals without an account. Sign in to save deals and enable or pause persisted wishlist alerts. Manage target prices in Wishlist."
            title="Sign in to save deals and manage alerts"
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
                {wishlistSyncWarning.text} Deal browsing still works; saved markers and alert settings describe only the last successful account sync and may be incomplete until a later sync succeeds.
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
              description={<>Waiting for the live CheapShark provider response.<UxSkeleton lines={2} /></>}
              role="status"
              title="Loading live offers"
              tone="loading"
            />
          )}
          {filteredDeals.map((deal) => (
            <DealCard
              deal={deal}
              alertIsSet={findMatchingWishlistItem(deal, savedWishlistItems)?.alertActive ?? false}
              isSaved={Boolean(findMatchingWishlistItem(deal, savedWishlistItems))}
              isSaving={savingDeals.has(wishlistOperationKey(deal))}
              key={dealStateKey(displayedDealScope, deal)}
              saveMessage={saveMessages[dealStateKey(displayedDealScope, deal)]}
              onSave={saveDeal}
              onToggleAlert={toggleDealAlert}
              onFindOffers={findCurrentOffers}
              onViewDetails={setSelectedDeal}
            />
          ))}
          {isExternalReady && externalDeals.length === 0 && (
            <UxStatePanel
              className="ux-state--grid deals-empty"
              description={activeExternalTitle
                ? <>CheapShark returned no displayed offers for “{activeExternalTitle}”. Try another title or load the full live feed.</>
                : "CheapShark returned no displayed offers for this filter combination. Reset filters or switch to Curated Sample."}
              role="status"
              title="No live offers found"
              tone="empty"
            >
              {activeExternalTitle ? <button className="ux-state__action" type="button" onClick={clearExternalSearch}>Load all live offers</button> : null}
              <button className="ux-state__action ux-state__action--quiet" type="button" onClick={() => selectMode("curated")}>View curated sample</button>
            </UxStatePanel>
          )}
          {!isExternalReady && visibleDeals.length === 0 && !isExternalLoading && (
            <UxStatePanel className="ux-state--grid deals-empty" tone="empty" role="status"
              title="No curated deals available"
              description="This feed has no deals to display right now. Check again or browse live CheapShark offers.">
              <ProductFeedRetry label="deals" />
              <button className="ux-state__action" type="button" onClick={() => selectMode("external")}>Browse live offers</button>
            </UxStatePanel>
          )}
          {visibleDeals.length > 0 && filteredDeals.length === 0 && (
            <UxStatePanel
              className="ux-state--grid deals-empty"
              description={<>No deals in the currently displayed set match {searchQuery.trim() ? <>“{searchQuery.trim()}” and </> : null}the <strong>{activeFilter}</strong> filter. Reset it to show the full loaded set.</>}
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
