"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AddWishlistItemForm from "@/components/AddWishlistItemForm";
import { ProductFeedRetry } from "@/components/ProductFeedNotice";
import RequestIdSupportText from "@/components/RequestIdSupportText";
import UxStatePanel, { UxSkeleton } from "@/components/UxStatePanel";
import {
  wishlistFilters,
  type WishlistAlertEvaluation,
  type WishlistAlertEvent,
  type WishlistFilter,
  type WishlistItem,
  type WishlistPriceHistoryPoint,
  type WishlistPriority,
  type WishlistStatus,
} from "@/data/wishlist";
import type { WishlistResult } from "@/lib/api";
import { normalizeAuthError } from "@/lib/auth";
import {
  AUTH_STATE_EVENT,
  clearAuthToken,
  ensureAuthToken,
  assertAuthSessionRevision,
  isAuthSessionInvalidatedError,
  readAuthSessionRevision,
} from "@/lib/auth-client";
import { normalizeTargetPriceInput } from "@/lib/target-price";
import { wishlistCardIdentity } from "@/lib/wishlist-card-identity";
import NotificationPreferencesPanel from "@/components/NotificationPreferencesPanel";
import {
  deleteMyWishlistItem,
  getMyWishlist,
  getMyWishlistAlertEvents,
  getMyWishlistPriceHistory,
  normalizeUserWishlistError,
  updateMyWishlistAlert,
  withWishlistAuthRetry,
  type UpdateWishlistAlertPayload,
} from "@/lib/user-wishlist";

type WishlistView = "checking" | "public" | "personal" | "offline";
type ItemMessage = {
  kind: "success" | "error";
  text: string;
  requestId?: string | null;
};
type PriceHistoryState = "idle" | "loading" | "loaded" | "unavailable";
type NumericPriceHistoryPoint = WishlistPriceHistoryPoint & { priceAmount: number };

const PRICE_HISTORY_REQUEST_LIMIT = 15;
const PRICE_HISTORY_TIMELINE_LIMIT = 5;
function protectedWishlistError(error: unknown) {
  const wishlistError = normalizeUserWishlistError(error);
  if (wishlistError.code !== "unknown_error") return wishlistError;

  const authError = normalizeAuthError(error);
  return authError.code === "unknown_error" ? wishlistError : authError;
}

const wishlistPriorities: readonly WishlistPriority[] = ["high", "medium", "low"];

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

function alertEvaluationFor(item: WishlistItem): WishlistAlertEvaluation {
  if (item.alertEvaluation) return item.alertEvaluation;
  if (!item.alertActive) {
    return {
      targetReached: false,
      state: "paused",
      message: "Alert is paused.",
    };
  }
  return {
    targetReached: false,
    state: "not-evaluable",
    message: "Alert status will appear after backend evaluation.",
  };
}

function evaluationIcon(state: WishlistAlertEvaluation["state"]) {
  if (state === "target-reached") return "✓";
  if (state === "watching") return "↗";
  if (state === "paused") return "Ⅱ";
  return "?";
}

function formatAlertEventTime(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Recent";

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function priceHistorySourceLabel(source: string) {
  const knownSources: Record<string, string> = {
    "wishlist-create": "Added to wishlist",
    "price-refresh": "Price refresh",
    "stored-provider": "Stored provider",
    "cheapshark-provider": "CheapShark",
  };
  if (knownSources[source]) return knownSources[source];

  const readable = source.replace(/[-_]+/g, " ").trim();
  return readable
    ? readable.charAt(0).toUpperCase() + readable.slice(1)
    : "Price snapshot";
}

function priceHistorySourceTone(source: string) {
  if (source === "wishlist-create") return "added";
  if (source === "cheapshark-provider") return "external";
  if (source === "stored-provider") return "stored";
  return "refresh";
}

function numericPriceHistory(
  priceHistory: readonly WishlistPriceHistoryPoint[],
): NumericPriceHistoryPoint[] {
  return priceHistory.filter(
    (point): point is NumericPriceHistoryPoint => point.priceAmount !== null,
  );
}

function priceHistoryTrend(
  points: readonly NumericPriceHistoryPoint[],
  snapshotCount: number,
) {
  if (points.length === 0) {
    return { label: "Non-numeric history", tone: "neutral" } as const;
  }
  if (points.length === 1) {
    return {
      label: snapshotCount === 1 ? "New snapshot" : "Not enough data",
      tone: "new",
    } as const;
  }

  const firstPrice = points[0].priceAmount;
  const latestPrice = points[points.length - 1].priceAmount;
  if (latestPrice < firstPrice) return { label: "Down", tone: "down" } as const;
  if (latestPrice > firstPrice) return { label: "Up", tone: "up" } as const;
  return { label: "Flat", tone: "flat" } as const;
}

function priceHistoryBarHeight(amount: number, lowest: number, highest: number) {
  if (lowest === highest) return 58;
  return 22 + ((amount - lowest) / (highest - lowest)) * 78;
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

function PriceHistoryPanel({
  itemId,
  itemTitle,
  onLoad,
  points,
  state,
}: {
  itemId: number;
  itemTitle: string;
  onLoad: () => void;
  points: readonly WishlistPriceHistoryPoint[];
  state: PriceHistoryState;
}) {
  const headingId = `wishlist-price-history-${itemId}`;
  const numericPoints = numericPriceHistory(points);
  const latestPoint = points.at(-1);
  const lowestPoint = numericPoints.reduce<NumericPriceHistoryPoint | null>(
    (lowest, point) => !lowest || point.priceAmount < lowest.priceAmount ? point : lowest,
    null,
  );
  const highestPoint = numericPoints.reduce<NumericPriceHistoryPoint | null>(
    (highest, point) => !highest || point.priceAmount > highest.priceAmount ? point : highest,
    null,
  );
  const trend = priceHistoryTrend(numericPoints, points.length);
  const timelinePoints = points.slice(-PRICE_HISTORY_TIMELINE_LIMIT).reverse();
  const lowestAmount = lowestPoint?.priceAmount ?? 0;
  const highestAmount = highestPoint?.priceAmount ?? 0;

  return (
    <section
      className={`wl-card__price-history wl-card__price-history--${state}`}
      aria-labelledby={headingId}
    >
      <div className="wl-card__price-history-header">
        <div>
          <span>Price intelligence</span>
          <strong id={headingId}>Recent price history</strong>
        </div>
        {state === "loaded" && points.length > 0 && (
          <span className={`wl-card__history-trend wl-card__history-trend--${trend.tone}`}>
            {trend.label}
          </span>
        )}
      </div>

      {state === "idle" && (
        <div className="wl-card__history-state wl-card__history-state--idle">
          <p>See recent snapshots and how this price is moving.</p>
          <button type="button" aria-label={`View price history for ${itemTitle}`} onClick={onLoad}>View history</button>
        </div>
      )}

      {state === "loading" && (
        <div className="wl-card__history-state wl-card__history-state--loading" role="status" aria-busy="true">
          <div aria-hidden="true"><span /><span /><span /></div>
          <p><strong>Loading price history</strong><small>Waiting for recent snapshots stored for this account item.</small></p>
        </div>
      )}

      {state === "unavailable" && (
        <div className="wl-card__history-state wl-card__history-state--error" role="status">
          <p><strong>Price history unavailable</strong><small>The account history route could not be reached. This item and its alert settings remain available; retry is manual.</small></p>
          <button type="button" aria-label={`Retry price history for ${itemTitle}`} onClick={onLoad}>Retry history</button>
        </div>
      )}

      {state === "loaded" && points.length === 0 && (
        <div className="wl-card__history-state wl-card__history-state--empty" role="status">
          <strong>No snapshots yet</strong>
          <p>No snapshots are stored for this account item. This is an account-history state, not a statement about every store price.</p>
        </div>
      )}

      {state === "loaded" && latestPoint && (
        <div className="wl-card__history-content">
          <p className="sr-only" role="status">Price history loaded for {itemTitle} with {points.length} snapshots.</p>
          <dl className="wl-card__history-stats">
            <div><dt>Latest</dt><dd>{latestPoint.priceLabel}</dd></div>
            <div><dt>Lowest</dt><dd>{lowestPoint?.priceLabel ?? "—"}</dd></div>
            <div><dt>Highest</dt><dd>{highestPoint?.priceLabel ?? "—"}</dd></div>
            <div><dt>Snapshots</dt><dd>{points.length}</dd></div>
            <div>
              <dt>Last observed</dt>
              <dd><time dateTime={latestPoint.observedAt}>{formatAlertEventTime(latestPoint.observedAt)}</time></dd>
            </div>
          </dl>

          <div className="wl-card__history-visual">
            <div className="wl-card__history-visual-heading">
              <span>Observed trend</span>
              <strong>{trend.label}</strong>
            </div>
            {numericPoints.length === 0 ? (
              <p>These snapshots use labels such as TBA, so a numeric trend is not available.</p>
            ) : (
              <div
                className={numericPoints.length === 1
                  ? "wl-card__history-bars wl-card__history-bars--single"
                  : "wl-card__history-bars"}
                role="img"
                aria-label={numericPoints.length === 1
                  ? `One numeric price snapshot: ${numericPoints[0].priceLabel}`
                  : `${numericPoints.length} numeric price snapshots, trending ${trend.label.toLowerCase()}`}
              >
                {numericPoints.map((point) => (
                  <span
                    aria-hidden="true"
                    key={point.id}
                    style={{
                      height: `${priceHistoryBarHeight(
                        point.priceAmount,
                        lowestAmount,
                        highestAmount,
                      )}%`,
                    }}
                    title={`${point.priceLabel} · ${formatAlertEventTime(point.observedAt)}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="wl-card__history-timeline">
            <div className="wl-card__history-timeline-heading">
              <strong>Recent snapshots</strong>
              <span>Newest first</span>
            </div>
            <ol aria-label="Recent price snapshots, newest first">
              {timelinePoints.map((point) => (
                <li key={point.id}>
                  <span className="wl-card__history-timeline-dot" aria-hidden="true" />
                  <div>
                    <strong>{point.priceLabel}</strong>
                    <time dateTime={point.observedAt}>
                      {formatAlertEventTime(point.observedAt)}
                    </time>
                  </div>
                  <span className={`wl-card__history-source wl-card__history-source--${priceHistorySourceTone(point.source)}`}>
                    {priceHistorySourceLabel(point.source)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}

function WishlistCard({
  alertIsActive,
  authToken,
  canManage,
  isDeleting,
  isUpdating,
  item,
  message,
  onDelete,
  onAuthenticationRequired,
  onTokenChanged,
  onUpdateAlert,
}: {
  alertIsActive: boolean;
  authToken: string | null;
  canManage: boolean;
  isDeleting: boolean;
  isUpdating: boolean;
  item: WishlistItem;
  message?: ItemMessage;
  onDelete: (item: WishlistItem) => void;
  onAuthenticationRequired: () => void;
  onTokenChanged: (token: string) => void;
  onUpdateAlert: (
    item: WishlistItem,
    payload: UpdateWishlistAlertPayload,
    successMessage: string,
  ) => Promise<void>;
}) {
  const status = statusDetails(item.status);
  const alertEvaluation = alertEvaluationFor(item);
  const storeClass = wishlistStoreClass(item.store);
  const [targetPrice, setTargetPrice] = useState(item.targetPrice);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<WishlistPriceHistoryPoint[]>([]);
  const [priceHistoryState, setPriceHistoryState] = useState<PriceHistoryState>("idle");
  const titleId = `wishlist-item-title-${item.id}`;
  const targetHelpId = `wishlist-target-price-help-${item.id}`;
  const settingsMessageId = `wishlist-settings-message-${item.id}`;

  async function loadPriceHistory() {
    const sessionRevision = readAuthSessionRevision();
    if (!authToken || priceHistoryState === "loading") return;
    setPriceHistoryState("loading");

    try {
      const result = await withWishlistAuthRetry(
        authToken,
        (activeToken) => getMyWishlistPriceHistory(
          activeToken,
          item.id,
          PRICE_HISTORY_REQUEST_LIMIT,
        ),
      );
      assertAuthSessionRevision(result.sessionRevision);
      onTokenChanged(result.token);
      setPriceHistory(result.value);
      setPriceHistoryState("loaded");
    } catch (error) {
      if (isAuthSessionInvalidatedError(error) || sessionRevision !== readAuthSessionRevision()) return;
      const details = protectedWishlistError(error);
      if (details.status === 401) {
        onAuthenticationRequired();
        return;
      }
      setPriceHistoryState("unavailable");
    }
  }

  function handleTargetPriceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTargetPrice = normalizeTargetPriceInput(targetPrice);

    if (!normalizedTargetPrice) {
      setValidationMessage("Enter a valid price such as $15.00 or FREE.");
      return;
    }

    setValidationMessage(null);
    setTargetPrice(normalizedTargetPrice);
    void onUpdateAlert(
      item,
      { targetPrice: normalizedTargetPrice },
      `Target price for ${item.title} was updated.`,
    );
  }

  return (
    <article className={`wl-card wl-card--${storeClass}`} aria-busy={isDeleting || isUpdating} aria-labelledby={titleId}>
      <div className={`wl-card__accent wl-card__accent--${storeClass}`} />
      <div className="wl-card__header">
        <span className={`wl-card__store wl-card__store--${storeClass}`}>{item.store}</span>
        <span className={`wl-card__priority wl-card__priority--${item.priority}`}>
          {priorityLabel(item.priority)}
        </span>
      </div>

      <h2 id={titleId}>{item.title}</h2>
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

      <div
        className={`wl-card__evaluation wl-card__evaluation--${alertEvaluation.state}`}
        aria-label={`Alert evaluation: ${alertEvaluation.message}`}
      >
        <span aria-hidden="true">{evaluationIcon(alertEvaluation.state)}</span>
        <strong>{alertEvaluation.message}</strong>
      </div>

      {canManage && (
        <div className="wl-card__alert-settings">
          <form className="wl-card__target-form" onSubmit={handleTargetPriceSubmit}>
            <label htmlFor={`wishlist-target-price-${item.id}`}>Target price</label>
            <div>
              <input
                id={`wishlist-target-price-${item.id}`}
                type="text"
                maxLength={255}
                value={targetPrice}
                disabled={isUpdating}
                aria-describedby={`${targetHelpId} ${settingsMessageId}`}
                aria-invalid={Boolean(validationMessage)}
                onChange={(event) => {
                  setTargetPrice(event.target.value);
                  if (validationMessage) setValidationMessage(null);
                }}
              />
              <button type="submit" aria-label={`Save target price for ${item.title}`} disabled={isUpdating}>Save</button>
            </div>
            <small className="sr-only" id={targetHelpId}>Use a price such as $15.00 or FREE.</small>
          </form>
          <label className="wl-card__priority-field" htmlFor={`wishlist-priority-${item.id}`}>
            <span>Priority<span className="sr-only"> for {item.title}</span></span>
            <select
              id={`wishlist-priority-${item.id}`}
              value={item.priority}
              disabled={isUpdating}
              onChange={(event) => void onUpdateAlert(
                item,
                { priority: event.target.value as WishlistPriority },
                `Priority for ${item.title} was updated.`,
              )}
            >
              {wishlistPriorities.map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {canManage && (
        <PriceHistoryPanel
          itemId={item.id}
          itemTitle={item.title}
          onLoad={() => void loadPriceHistory()}
          points={priceHistory}
          state={priceHistoryState}
        />
      )}

      <div className="wl-card__actions">
        <Link
          className={`wl-card__view wl-card__view--${storeClass}`}
          style={{
            display: "inline-flex",
            minHeight: 44,
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            border: "1px solid var(--nx-glass-border-strong)",
            borderRadius: 999,
            font: "inherit",
            fontWeight: 700,
          }}
          href={`/deals?title=${encodeURIComponent(item.title)}#deal-search`}
          aria-label={`Find current deals for ${item.title}`}
          title={`Search current external offers for ${item.title}`}
        >
          <span aria-hidden="true">↗</span>
          View Deal
        </Link>
        {canManage && (
          <button
            className={alertIsActive ? "wl-card__edit wl-card__edit--active" : "wl-card__edit"}
            type="button"
            aria-pressed={alertIsActive}
            aria-label={`${alertIsActive ? "Pause" : "Enable"} alert for ${item.title}`}
            disabled={isUpdating}
            onClick={() => void onUpdateAlert(
              item,
              { alertActive: !alertIsActive },
              `Alert for ${item.title} was ${alertIsActive ? "paused" : "enabled"}.`,
            )}
            title="Update this alert setting"
          >
            <span aria-hidden="true">{isUpdating ? "…" : "✏️"}</span>
            {isUpdating ? "Saving" : alertIsActive ? "Pause Alert" : "Enable Alert"}
          </button>
        )}
        <button
          className="wl-card__remove"
          type="button"
          disabled={!canManage || isDeleting || isUpdating}
          aria-label={`Remove ${item.title}`}
          title={canManage ? `Remove ${item.title} from your personal wishlist` : "Sign in to manage personal wishlist items"}
          onClick={() => onDelete(item)}
        >
          <span aria-hidden="true">{isDeleting ? "…" : "✕"}</span>
        </button>
      </div>
      <small
        className={validationMessage || message?.kind === "error"
          ? "wl-card__settings-message wl-card__settings-message--error"
          : message?.kind === "success"
            ? "wl-card__settings-message wl-card__settings-message--success"
            : "wl-card__settings-message"}
        id={settingsMessageId}
        role={validationMessage || message?.kind === "error" ? "alert" : isUpdating || message?.kind === "success" ? "status" : undefined}
      >
        {validationMessage
          || (isUpdating ? "Saving alert settings…" : message?.text)
          || (canManage ? "Alert settings sync with your account." : "Sign in to manage alert settings.")}
      </small>
      {!validationMessage && message?.kind === "error" ? (
        <RequestIdSupportText requestId={message.requestId} />
      ) : null}
    </article>
  );
}

function WishlistAlertPanel({
  alertEvents,
  alertEventsLoading,
  alertEventsMessage,
  alerts,
  authToken,
  onAuthenticationRequired,
  onTokenChanged,
  source,
  view,
  wishlistItems,
}: {
  alertEvents: readonly WishlistAlertEvent[];
  alertEventsLoading: boolean;
  alertEventsMessage: string | null;
  alerts: Record<number, boolean>;
  authToken: string | null;
  onAuthenticationRequired: () => void;
  onTokenChanged: (token: string) => void;
  source: WishlistResult["source"];
  view: WishlistView;
  wishlistItems: readonly WishlistItem[];
}) {
  const activeAlerts = wishlistItems.filter((item) => alerts[item.id]).length;
  const pausedAlerts = wishlistItems.length - activeAlerts;
  const targetsReached = wishlistItems.filter(
    (item) => item.alertEvaluation?.targetReached,
  ).length;
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
    { label: "Alert Evaluation", value: view === "personal" ? "Computed by the backend" : "Evaluation preview", badge: view === "personal" ? "API" : "Public", tone: "orange", icon: "bolt" },
    { label: "Data Source", value: dataSource.value, badge: dataSource.badge, tone: "blue", icon: "globe" },
    { label: "Notification Queue", value: "Delivery planned for later", badge: "Future", tone: "purple", icon: "mail" },
    { label: "Security", value: view === "personal" ? "JWT account access" : "Public preview data", badge: view === "personal" ? "Auth" : "Public", tone: "green", icon: "shield" },
  ] as const;

  return (
    <aside className="wl-network" aria-labelledby="wishlist-alert-title">
      <div className="wl-network__header">
        <span className="wl-network__header-icon" aria-hidden="true">📡</span>
        <div><span>Alert telemetry</span><h2 id="wishlist-alert-title">Wishlist Alert Status</h2></div>
        <span className={`wl-network__live wl-network__live--${view === "personal" ? "personal" : "preview"}`}><span aria-hidden="true" /> {view === "personal" ? "Saved" : "Preview"}</span>
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
        <div className="wl-network__section-label"><span>Alert summary</span><strong>{view === "personal" ? "Account" : "Preview"}</strong></div>
        <div className="wl-network__summary-rows">
          <div><span className="wl-network__dot wl-network__dot--reached" /><span>Targets reached</span><strong>{targetsReached}</strong></div>
          <div><span className="wl-network__dot wl-network__dot--active" /><span>Active alerts</span><strong>{activeAlerts}</strong></div>
          <div><span className="wl-network__dot wl-network__dot--paused" /><span>Paused</span><strong>{pausedAlerts}</strong></div>
          <div><span className="wl-network__dot wl-network__dot--drop" /><span>Price drops</span><strong>{priceDrops}</strong></div>
          <div><span className="wl-network__dot wl-network__dot--free" /><span>Free now</span><strong>{freeNow}</strong></div>
        </div>
      </div>

      {view === "personal" && authToken && (
        <NotificationPreferencesPanel
          authToken={authToken}
          onAuthenticationRequired={onAuthenticationRequired}
          onTokenChanged={onTokenChanged}
        />
      )}

      <section className="wl-alert-history" aria-labelledby="wishlist-alert-history-title">
        <div className="wl-alert-history__header">
          <span id="wishlist-alert-history-title">Recent alert events</span>
          {view === "personal" && alertEvents.length > 0 && (
            <strong>{alertEvents.length}</strong>
          )}
        </div>

        {view === "checking" && (
          <UxStatePanel
            className="ux-state--compact wl-alert-history__empty"
            description={<>Waiting for the account session and recent alert events.<UxSkeleton lines={2} /></>}
            role="status"
            title="Loading alert history"
            tone="loading"
          />
        )}
        {view === "public" && (
          <UxStatePanel
            className="ux-state--compact wl-alert-history__empty"
            description="Alert history belongs to a personal account and is not included in the public preview."
            title="Sign in to view alert history"
            tone="auth"
          >
            <Link className="ux-state__action" href="/login?returnTo=%2Fwishlist">Sign in</Link>
          </UxStatePanel>
        )}
        {view === "offline" && (
          <UxStatePanel
            className="ux-state--compact wl-alert-history__empty"
            description="The account wishlist service could not be reached. Separate public preview items remain available, but they do not include personal alert history."
            role="status"
            title="Alert history unavailable"
            tone="unavailable"
          />
        )}
        {view === "personal" && alertEventsMessage && (
          <UxStatePanel
            className="ux-state--compact wl-alert-history__empty wl-alert-history__empty--warning"
            description={<>{alertEventsMessage} Personal wishlist items remain available, and this notice does not start an automatic retry.</>}
            role="status"
            title="Alert history unavailable"
            tone="unavailable"
          />
        )}
        {view === "personal" && alertEventsLoading && alertEvents.length === 0 && !alertEventsMessage && (
          <UxStatePanel
            className="ux-state--compact wl-alert-history__empty"
            description={<>Waiting for recent target-reached events stored with this account.<UxSkeleton lines={2} /></>}
            role="status"
            title="Loading alert history"
            tone="loading"
          />
        )}
        {view === "personal" && !alertEventsLoading && alertEvents.length === 0 && !alertEventsMessage && (
          <UxStatePanel
            className="ux-state--compact wl-alert-history__empty"
            description="No target-reached events are stored for this account view. Events can appear after an active account alert reaches its saved target."
            title="No target-reached events yet"
            tone="empty"
          />
        )}
        {view === "personal" && alertEvents.length > 0 && (
          <ol className="wl-alert-history__list">
            {alertEvents.slice(0, 4).map((event) => (
              <li className="wl-alert-history__item" key={event.id}>
                <div>
                  <strong>{event.itemTitle}</strong>
                  <span>{event.store}</span>
                </div>
                <p>{event.message}</p>
                <div className="wl-alert-history__prices">
                  <span>Current <strong>{event.currentPrice}</strong></span>
                  <span>Target <strong>{event.targetPrice}</strong></span>
                </div>
                <time className="wl-alert-history__meta" dateTime={event.createdAt}>
                  {formatAlertEventTime(event.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>

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
  const [alertEvents, setAlertEvents] = useState<WishlistAlertEvent[]>([]);
  const [alertEventsLoading, setAlertEventsLoading] = useState(false);
  const [alertEventsMessage, setAlertEventsMessage] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Record<number, boolean>>(() => alertsFor(wishlistItems));
  const [serviceMessage, setServiceMessage] = useState<string | null>(null);
  const [operationMessage, setOperationMessage] = useState<ItemMessage | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(() => new Set());
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(() => new Set());
  const [itemMessages, setItemMessages] = useState<Record<number, ItemMessage>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [personalWishlistRevision, setPersonalWishlistRevision] = useState(0);
  const alertEventsRequestVersion = useRef(0);

  useEffect(() => {
    let active = true;
    let requestVersion = 0;

    async function refreshWishlist() {
      setView("checking");
      const currentVersion = ++requestVersion;
      let token: string | null;

      try {
        token = await ensureAuthToken();
      } catch (error) {
        if (!active || currentVersion !== requestVersion) return;
        setAuthToken(null);
        setPersonalItems([]);
        setAlertEvents([]);
        setAlertEventsLoading(false);
        setAlertEventsMessage(null);
        setAlerts(alertsFor(wishlistItems));
        setServiceMessage(normalizeAuthError(error).message);
        setView("offline");
        return;
      }

      if (!token) {
        if (!active || currentVersion !== requestVersion) return;
        alertEventsRequestVersion.current += 1;
        setAuthToken(null);
        setPersonalItems([]);
        setAlertEvents([]);
        setAlertEventsLoading(false);
        setAlertEventsMessage(null);
        setAlerts(alertsFor(wishlistItems));
        setServiceMessage(null);
        setOperationMessage(null);
        setItemMessages({});
        setView("public");
        return;
      }

      if (!active || currentVersion !== requestVersion) return;
      setAuthToken(token);
      setServiceMessage(null);
      setAlertEvents([]);
      setAlertEventsMessage(null);
      setAlertEventsLoading(true);
      setView("checking");

      const sessionRevision = readAuthSessionRevision();
      const eventRequestVersion = ++alertEventsRequestVersion.current;
      const [wishlistResult, alertEventsResult] = await Promise.allSettled([
        withWishlistAuthRetry(token, getMyWishlist),
        withWishlistAuthRetry(token, getMyWishlistAlertEvents),
      ]);
      if (!active || currentVersion !== requestVersion) return;

      if (sessionRevision !== readAuthSessionRevision()) return;
      if ([wishlistResult, alertEventsResult].some((result) =>
        result.status === "rejected" && isAuthSessionInvalidatedError(result.reason))) return;

      if (wishlistResult.status === "rejected") {
        const details = protectedWishlistError(wishlistResult.reason);
        setAlertEvents([]);
        setAlertEventsLoading(false);
        setAlertEventsMessage(null);

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
        return;
      }

      if (alertEventsResult.status === "rejected") {
        const details = protectedWishlistError(alertEventsResult.reason);

        if (details.status === 401) {
          clearAuthToken();
          setAuthToken(null);
          setPersonalItems([]);
          setAlertEvents([]);
          setAlertEventsLoading(false);
          setServiceMessage(details.message);
          setView("public");
          return;
        }

        setAlertEvents([]);
        setAlertEventsMessage(
          "Alert history could not be loaded. Your wishlist is still available.",
        );
      } else if (eventRequestVersion === alertEventsRequestVersion.current) {
        setAlertEvents(alertEventsResult.value.value);
        setAlertEventsMessage(null);
      }

      if (eventRequestVersion === alertEventsRequestVersion.current) {
        setAlertEventsLoading(false);
      }
      const activeToken = alertEventsResult.status === "fulfilled"
        ? alertEventsResult.value.token
        : wishlistResult.value.token;
      setAuthToken(activeToken);
      setPersonalItems(wishlistResult.value.value);
      setAlerts(alertsFor(wishlistResult.value.value));
      setOperationMessage(null);
      setItemMessages({});
      setPersonalWishlistRevision((current) => current + 1);
      setView("personal");
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

  const handleAuthenticationRequired = useCallback(() => {
    alertEventsRequestVersion.current += 1;
    clearAuthToken();
    setAuthToken(null);
    setPersonalItems([]);
    setAlertEvents([]);
    setAlertEventsLoading(false);
    setAlertEventsMessage(null);
    setAlerts(alertsFor(wishlistItems));
    setUpdatingIds(new Set());
    setItemMessages({});
    setServiceMessage("Please sign in again.");
    setView("public");
  }, [wishlistItems]);

  async function refreshAlertEvents(token: string) {
    const sessionRevision = readAuthSessionRevision();
    const requestVersion = ++alertEventsRequestVersion.current;
    setAlertEventsLoading(true);
    setAlertEventsMessage(null);

    try {
      const result = await withWishlistAuthRetry(token, getMyWishlistAlertEvents);
      if (requestVersion !== alertEventsRequestVersion.current) return;
      assertAuthSessionRevision(result.sessionRevision);
      setAuthToken(result.token);
      setAlertEvents(result.value);
    } catch (error) {
      if (requestVersion !== alertEventsRequestVersion.current) return;
      if (isAuthSessionInvalidatedError(error) || sessionRevision !== readAuthSessionRevision()) return;
      const details = protectedWishlistError(error);
      if (details.status === 401) {
        handleAuthenticationRequired();
      } else {
        setAlertEventsMessage(
          "Alert history could not be refreshed. Your wishlist changes were saved.",
        );
      }
    } finally {
      if (requestVersion === alertEventsRequestVersion.current) {
        setAlertEventsLoading(false);
      }
    }
  }

  function handleItemAdded(item: WishlistItem) {
    setPersonalItems((current) => [item, ...current]);
    setAlerts((current) => ({ ...current, [item.id]: item.alertActive }));
    setOperationMessage(null);
    setItemMessages((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    resetFilters();
    if (authToken) void refreshAlertEvents(authToken);
  }

  async function handleAlertUpdate(
    item: WishlistItem,
    payload: UpdateWishlistAlertPayload,
    successMessage: string,
  ) {
    const sessionRevision = readAuthSessionRevision();
    if (view !== "personal" || !authToken || updatingIds.has(item.id)) return;

    setUpdatingIds((current) => new Set(current).add(item.id));
    setItemMessages((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });

    try {
      const result = await withWishlistAuthRetry(
        authToken,
        (activeToken) => updateMyWishlistAlert(activeToken, item.id, payload),
      );
      assertAuthSessionRevision(result.sessionRevision);
      const updatedItem = result.value;
      setAuthToken(result.token);
      setPersonalItems((current) => current.map((candidate) =>
        candidate.id === updatedItem.id ? updatedItem : candidate));
      setAlerts((current) => ({ ...current, [updatedItem.id]: updatedItem.alertActive }));
      setItemMessages((current) => ({
        ...current,
        [updatedItem.id]: { kind: "success", text: successMessage },
      }));
      void refreshAlertEvents(result.token);
    } catch (error) {
      if (isAuthSessionInvalidatedError(error) || sessionRevision !== readAuthSessionRevision()) return;
      const details = protectedWishlistError(error);
      if (details.status === 401) {
        handleAuthenticationRequired();
      } else {
        setItemMessages((current) => ({
          ...current,
          [item.id]: {
            kind: "error",
            text: details.message,
            requestId: details.requestId,
          },
        }));
      }
    } finally {
      setUpdatingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }

  async function handleDelete(item: WishlistItem) {
    const sessionRevision = readAuthSessionRevision();
    if (view !== "personal" || !authToken || deletingIds.has(item.id)) return;

    setDeletingIds((current) => new Set(current).add(item.id));
    setOperationMessage(null);

    try {
      const result = await withWishlistAuthRetry(
        authToken,
        (activeToken) => deleteMyWishlistItem(activeToken, item.id),
      );
      assertAuthSessionRevision(result.sessionRevision);
      setAuthToken(result.token);
      setPersonalItems((current) => current.filter((candidate) => candidate.id !== item.id));
      setAlerts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      setItemMessages((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      setOperationMessage({ kind: "success", text: `${item.title} was removed from your personal wishlist.` });
    } catch (error) {
      if (isAuthSessionInvalidatedError(error) || sessionRevision !== readAuthSessionRevision()) return;
      const details = protectedWishlistError(error);
      if (details.status === 401) {
        handleAuthenticationRequired();
      } else {
        setOperationMessage({
          kind: "error",
          text: `${details.message} The item was not removed.`,
          requestId: details.requestId,
        });
      }
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }

  const priceDropCount = displayedItems.filter((item) => item.status === "price-drop").length;
  const freeCount = displayedItems.filter((item) => item.status === "free-now").length;
  const isPersonal = view === "personal";
  const heroTag = isPersonal ? "Personal wishlist" : view === "offline" ? "Wishlist service offline" : "Public wishlist preview";
  const heroCopy = isPersonal
    ? "See backend-computed alert status and recent target events while managing alert settings. Notification delivery is planned for later."
    : view === "offline"
      ? "The personal wishlist service is unavailable, so the separate public preview remains visible for local review."
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

      <section
        className={`wl-access-banner wl-access-banner--${view}`}
        role={view === "checking" || view === "offline" ? "status" : undefined}
        aria-atomic={view === "checking" || view === "offline" ? true : undefined}
      >
        <div>
          <strong>
            {isPersonal ? "Personal wishlist" : view === "offline" ? "Personal wishlist unavailable — showing public preview" : view === "checking" ? "Loading your personal wishlist" : "Public wishlist preview"}
          </strong>
          <span>
            {isPersonal
              ? "Alert settings, computed evaluations, and recent history update with your account. The public demo wishlist remains the page fallback."
              : view === "offline"
                ? serviceMessage || "Cannot reach the NEXORA wishlist service."
                : view === "checking"
                  ? "The public preview remains available while NEXORA waits for the local session and account wishlist response."
                  : serviceMessage || "Sign in to manage your personal wishlist."}
          </span>
        </div>
        {view === "public" && (
          <nav className="wl-access-banner__actions" aria-label="Wishlist account actions">
            <Link href="/login?returnTo=%2Fwishlist">Sign in</Link>
            <Link href="/register?returnTo=%2Fwishlist">Register</Link>
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
          onTokenChanged={setAuthToken}
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
            <button type="button" aria-label="Clear wishlist search" onClick={() => setSearchQuery("")}>
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

      {operationMessage && (
        <UxStatePanel
          className="ux-state--compact wl-operation-message"
          description={(
            <>
              {operationMessage.text}
              {operationMessage.kind === "error" ? (
                <RequestIdSupportText requestId={operationMessage.requestId} />
              ) : null}
            </>
          )}
          role={operationMessage.kind === "error" ? "alert" : "status"}
          title={operationMessage.kind === "error" ? "Wishlist action failed" : "Wishlist updated"}
          tone={operationMessage.kind === "error" ? "error" : "success"}
        />
      )}

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
                authToken={authToken}
                canManage={isPersonal}
                isDeleting={deletingIds.has(item.id)}
                isUpdating={updatingIds.has(item.id)}
                item={item}
                message={itemMessages[item.id]}
                key={wishlistCardIdentity(
                  {
                    accountRevision: personalWishlistRevision,
                    source,
                    view,
                  },
                  item,
                )}
                onAuthenticationRequired={handleAuthenticationRequired}
                onDelete={(candidate) => void handleDelete(candidate)}
                onTokenChanged={setAuthToken}
                onUpdateAlert={handleAlertUpdate}
              />
            ))}
            {view === "checking" && (
              <UxStatePanel className="ux-state--grid wl-empty" title="Loading your wishlist" tone="loading" role="status"
                description="Checking your session and saved games…" />
            )}
            {!isPersonal && view !== "checking" && displayedItems.length === 0 && (
              <UxStatePanel className="ux-state--grid wl-empty" title="No preview wishlist entries" tone="empty" role="status"
                description="The public preview has no games to display. Sign in to create your own wishlist.">
                <Link className="ux-state__action" href="/login?returnTo=%2Fwishlist">Sign in</Link>
                <ProductFeedRetry label="wishlist preview" />
              </UxStatePanel>
            )}
            {isPersonal && displayedItems.length === 0 && (
              <UxStatePanel
                className="ux-state--grid wl-empty"
                description="No items are stored in this personal account view. Add a game above to create the first one; public preview items are separate and are not copied automatically."
                role="status"
                title="Your personal wishlist is empty"
                tone="empty"
              >
                <a className="ux-state__action" href="#add-personal-wishlist-item">Add your first game</a>
              </UxStatePanel>
            )}
            {displayedItems.length > 0 && filteredItems.length === 0 && (
              <UxStatePanel
                className="ux-state--grid wl-empty"
                description={<>No displayed games match {searchQuery.trim() ? <>“{searchQuery.trim()}” and </> : null}the <strong>{activeFilter}</strong> filter in this {isPersonal ? "personal wishlist" : "public preview"}. This does not change or describe items outside the current view.</>}
                role="status"
                title="No matching wishlist signals"
                tone="empty"
              >
                <button className="ux-state__action" type="button" onClick={resetFilters}>Reset search and filters</button>
              </UxStatePanel>
            )}
          </div>
        </section>
        <WishlistAlertPanel
          alertEvents={alertEvents}
          alertEventsLoading={alertEventsLoading}
          alertEventsMessage={alertEventsMessage}
          alerts={alerts}
          authToken={authToken}
          onAuthenticationRequired={handleAuthenticationRequired}
          onTokenChanged={setAuthToken}
          source={source}
          view={view}
          wishlistItems={displayedItems}
        />
      </div>
    </>
  );
}
