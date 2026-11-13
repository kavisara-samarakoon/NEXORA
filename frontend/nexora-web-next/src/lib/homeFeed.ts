import { buildApiUrl } from "@/lib/api-client";

/**
 * NEXORA — homepage feed adapter.
 *
 * This is the ONLY file that knows how the homepage talks to your API.
 * Nothing here changes the backend, invents endpoints, or fakes content.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ADAPTER SECTION 1 — endpoints
 * If your app already has typed helpers (e.g. `getDeals()` from
 * `src/lib/api.ts`), keep this file and replace the three functions in
 * ADAPTER SECTION 3 with calls to those helpers. The mapping helpers below
 * still work because they read plain JSON objects.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const HOME_FEED_ENDPOINTS = {
  deals: "/api/deals?limit=1",
  giveaways: "/api/giveaways?limit=1",
  summary: "/api/dashboard/summary",
} as const;

export const HOME_FEED_REQUEST_TIMEOUT_MS = 5_000;

/* ─── Types ──────────────────────────────────────────────────────────── */

export interface DiscoveryDeal {
  id: string;
  title: string;
  store: string | null;
  salePrice: string | null;
  normalPrice: string | null;
  discountPercent: number | null;
  href: string | null;
}

export interface DiscoveryGiveaway {
  id: string;
  title: string;
  platform: string | null;
  worth: string | null;
  status: string | null;
  href: string | null;
}

export interface HomeSummary {
  deals: number | null;
  giveaways: number | null;
  stores: number | null;
  wishlistItems: number | null;
  activePriceAlerts: number | null;
  bestDiscountPercent: number | null;
  bestDiscountTitle: string | null;
  databaseStatus: string | null;
  sentinelStatus: string | null;
}

export interface HomeFeedData {
  deal: DiscoveryDeal | null;
  giveaway: DiscoveryGiveaway | null;
  summary: HomeSummary;
}

export interface HomeFeedErrors {
  deals: boolean;
  giveaways: boolean;
  summary: boolean;
}

export interface HomeFeedResult {
  data: HomeFeedData;
  errors: HomeFeedErrors;
}

export const EMPTY_HOME_FEED: HomeFeedData = {
  deal: null,
  giveaway: null,
  summary: {
    deals: null,
    giveaways: null,
    stores: null,
    wishlistItems: null,
    activePriceAlerts: null,
    bestDiscountPercent: null,
    bestDiscountTitle: null,
    databaseStatus: null,
    sentinelStatus: null,
  },
};

/* ─── Safe JSON readers (no `any`, no assumptions) ───────────────────── */

type Rec = Record<string, unknown>;

function asRecord(value: unknown): Rec | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Rec)
    : null;
}

function asText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readText(record: Rec, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = asText(record[key]);
    if (value !== null) return value;
  }
  return null;
}

function readRaw(record: Rec, keys: readonly string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return null;
}

const LIST_KEYS = [
  "items",
  "data",
  "results",
  "deals",
  "giveaways",
  "records",
  "content",
] as const;

/** Finds the first object in a payload that may be an array or a wrapper. */
function firstItem(payload: unknown, depth = 0): Rec | null {
  if (depth > 3) return null;
  if (Array.isArray(payload)) return asRecord(payload[0]);

  const record = asRecord(payload);
  if (!record) return null;

  for (const key of LIST_KEYS) {
    const value = record[key];
    if (Array.isArray(value)) return asRecord(value[0]);
    if (asRecord(value)) {
      const nested = firstItem(value, depth + 1);
      if (nested) return nested;
    }
  }
  return null;
}

/* ─── Formatting (derived only from values the API actually returned) ── */

function formatPrice(value: unknown): string | null {
  const text = asText(value);
  if (text && /[^\d.,\s-]/.test(text)) return text; // already carries a currency symbol/code

  const amount = asNumber(value);
  if (amount === null || amount < 0) return null;
  if (amount === 0) return "Free";

  // ADAPTER SECTION 2 — currency.
  // Change "USD" here if your API returns another currency.
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDiscount(value: unknown): number | null {
  const amount = asNumber(value);
  if (amount === null) return null;
  const rounded = Math.round(Math.abs(amount));
  return rounded > 0 && rounded <= 100 ? rounded : null;
}

/* ─── Mapping ────────────────────────────────────────────────────────── */

export function mapDeal(raw: Rec | null): DiscoveryDeal | null {
  if (!raw) return null;
  const title = readText(raw, ["title", "name", "gameName", "internalName", "dealTitle"]);
  if (!title) return null;

  return {
    id: readText(raw, ["id", "dealId", "dealID", "uuid", "slug"]) ?? title,
    title,
    store: readText(raw, ["store", "storeName", "shop", "platform", "source", "provider"]),
    salePrice: formatPrice(
      readRaw(raw, ["priceNew", "salePrice", "currentPrice", "dealPrice", "priceValue", "price"]),
    ),
    normalPrice: formatPrice(
      readRaw(raw, ["priceOld", "normalPrice", "originalPrice", "retailPrice", "listPrice", "regularPrice"]),
    ),
    discountPercent: formatDiscount(
      readRaw(raw, [
        "discountValue",
        "discountPercent",
        "discountPercentage",
        "percentOff",
        "discount",
        "savings",
      ]),
    ),
    href: readText(raw, ["dealUrl", "url", "link", "href", "storeUrl"]),
  };
}

export function mapGiveaway(raw: Rec | null): DiscoveryGiveaway | null {
  if (!raw) return null;
  const title = readText(raw, ["title", "name", "gameName", "giveawayTitle"]);
  if (!title) return null;

  return {
    id: readText(raw, ["id", "giveawayId", "uuid", "slug"]) ?? title,
    title,
    platform: readText(raw, [
      "platformLabel",
      "platform",
      "platforms",
      "store",
      "storeName",
      "type",
      "source",
    ]),
    worth: formatPrice(
      readRaw(raw, ["originalPrice", "worth", "value", "retailPrice", "normalPrice"]),
    ),
    status: readText(raw, ["status"]),
    href: readText(raw, ["url", "openGiveawayUrl", "giveawayUrl", "link", "href"]),
  };
}

export function mapSummary(payload: unknown): HomeSummary {
  const root = asRecord(payload) ?? {};
  const flattened: Rec = {
    ...root,
    ...(asRecord(root.summary) ?? {}),
    ...(asRecord(root.data) ?? {}),
    ...(asRecord(root.counts) ?? {}),
    ...(asRecord(root.totals) ?? {}),
  };

  const count = (keys: readonly string[]): number | null => {
    const value = asNumber(readRaw(flattened, keys));
    return value !== null && value >= 0 ? Math.round(value) : null;
  };

  return {
    deals: count([
      "activeDealsCount",
      "deals",
      "dealCount",
      "dealsCount",
      "totalDeals",
      "activeDeals",
    ]),
    giveaways: count([
      "activeGiveawaysCount",
      "giveaways",
      "giveawayCount",
      "giveawaysCount",
      "totalGiveaways",
      "activeGiveaways",
    ]),
    stores: count(["stores", "storeCount", "storesCount", "totalStores", "activeStores", "shops"]),
    wishlistItems: count(["wishlistItemsCount", "wishlistItems", "wishlistCount"]),
    activePriceAlerts: count([
      "activePriceAlertsCount",
      "activePriceAlerts",
      "priceAlertsCount",
    ]),
    bestDiscountPercent: count(["bestDiscountValue", "bestDiscountPercent"]),
    bestDiscountTitle: readText(flattened, ["bestDiscountTitle"]),
    databaseStatus: readText(flattened, ["databaseStatus"]),
    sentinelStatus: readText(flattened, ["sentinelStatus"]),
  };
}

export type HomeSummaryAvailability = "loading" | "available" | "incomplete" | "unavailable";

export function getHomeSummaryAvailability(
  status: "loading" | "ready" | "error",
  summaryFailed: boolean,
  summary: HomeSummary,
): HomeSummaryAvailability {
  if (status === "loading") return "loading";
  if (status === "error" || summaryFailed) return "unavailable";
  return summary.deals !== null && summary.giveaways !== null ? "available" : "incomplete";
}

/* ─────────────────────────────────────────────────────────────────────
 * ADAPTER SECTION 3 — transport
 * Replace the bodies of these three functions if you already have API
 * helpers. They must resolve to the raw JSON payload, or throw on failure.
 * ───────────────────────────────────────────────────────────────────── */

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const requestUrl = buildApiUrl(url);
  const timeoutSignal = AbortSignal.timeout(HOME_FEED_REQUEST_TIMEOUT_MS);
  const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  const response = await fetch(requestUrl, {
    signal: requestSignal,
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Request failed: ${requestUrl} (${response.status})`);
  return (await response.json()) as unknown;
}

async function fetchDealsPayload(signal?: AbortSignal) {
  return getJson(HOME_FEED_ENDPOINTS.deals, signal);
}

async function fetchGiveawaysPayload(signal?: AbortSignal) {
  return getJson(HOME_FEED_ENDPOINTS.giveaways, signal);
}

async function fetchSummaryPayload(signal?: AbortSignal) {
  return getJson(HOME_FEED_ENDPOINTS.summary, signal);
}

/* ─── Public entry point ─────────────────────────────────────────────── */

/**
 * Loads everything the cinematic homepage needs in one pass.
 * Each source fails independently so one broken feed never blanks the page.
 */
export async function loadHomeFeed(signal?: AbortSignal): Promise<HomeFeedResult> {
  const [dealsResult, giveawaysResult, summaryResult] = await Promise.allSettled([
    fetchDealsPayload(signal),
    fetchGiveawaysPayload(signal),
    fetchSummaryPayload(signal),
  ]);

  return {
    data: {
      deal: dealsResult.status === "fulfilled" ? mapDeal(firstItem(dealsResult.value)) : null,
      giveaway:
        giveawaysResult.status === "fulfilled"
          ? mapGiveaway(firstItem(giveawaysResult.value))
          : null,
      summary:
        summaryResult.status === "fulfilled"
          ? mapSummary(summaryResult.value)
          : EMPTY_HOME_FEED.summary,
    },
    errors: {
      deals: dealsResult.status === "rejected",
      giveaways: giveawaysResult.status === "rejected",
      summary: summaryResult.status === "rejected",
    },
  };
}

/** Formats a count for the bottom strip. Never invents a number. */
export function formatCount(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

export function isExternalHref(href: string | null): boolean {
  return typeof href === "string" && /^https?:\/\//i.test(href);
}
