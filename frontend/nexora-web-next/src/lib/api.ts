import {
  deals as fallbackDeals,
  type DealStatus,
  type DealStore,
  type GameDeal,
} from "@/data/deals";
import {
  giveaways as fallbackGiveaways,
  type Giveaway,
  type GiveawayPlatform,
  type GiveawayTag,
} from "@/data/giveaways";
import {
  wishlistItems as fallbackWishlistItems,
  type WishlistItem,
  type WishlistPriority,
  type WishlistStatus,
  type WishlistStore,
} from "@/data/wishlist";

const DEFAULT_API_BASE_URL = "http://localhost:8080";
const DEAL_STORES: readonly DealStore[] = [
  "Steam",
  "Epic Games",
  "GOG",
  "Humble",
  "Ubisoft",
];
const DEAL_STATUSES: readonly DealStatus[] = [
  "Historical Low",
  "Lowest Ever",
  "Great Deal",
  "Good Price",
  "Free Weekend",
  "Average",
];
const GIVEAWAY_PLATFORMS: readonly GiveawayPlatform[] = [
  "steam",
  "epic",
  "gog",
  "prime",
];
const GIVEAWAY_PLATFORM_LABELS: readonly Giveaway["platformLabel"][] = [
  "Steam",
  "Epic Games",
  "GOG",
  "Prime Gaming",
];
const GIVEAWAY_TAGS: readonly GiveawayTag[] = [
  "ending-soon",
  "new",
  "popular",
];
const WISHLIST_STORES: readonly WishlistStore[] = [
  "Steam",
  "Epic Games",
  "GOG",
];
const WISHLIST_STATUSES: readonly WishlistStatus[] = [
  "price-drop",
  "free-now",
  "tracking",
];
const WISHLIST_PRIORITIES: readonly WishlistPriority[] = [
  "high",
  "medium",
  "low",
];

export type DealsResult = {
  deals: readonly GameDeal[];
  source: "api" | "fallback";
};

export type GiveawaysResult = {
  giveaways: readonly Giveaway[];
  source: "api" | "fallback";
};

export type WishlistResult = {
  wishlistItems: readonly WishlistItem[];
  source: "api" | "fallback";
};

function isGameDeal(value: unknown): value is GameDeal {
  if (typeof value !== "object" || value === null) return false;

  const deal = value as Record<string, unknown>;

  return (
    typeof deal.id === "number" &&
    DEAL_STORES.includes(deal.store as DealStore) &&
    typeof deal.discount === "string" &&
    typeof deal.discountValue === "number" &&
    typeof deal.title === "string" &&
    typeof deal.priceOld === "string" &&
    typeof deal.priceNew === "string" &&
    typeof deal.priceValue === "number" &&
    typeof deal.rating === "number" &&
    typeof deal.stars === "string" &&
    typeof deal.category === "string" &&
    DEAL_STATUSES.includes(deal.status as DealStatus)
  );
}

function isGiveaway(value: unknown): value is Giveaway {
  if (typeof value !== "object" || value === null) return false;

  const giveaway = value as Record<string, unknown>;

  return (
    typeof giveaway.id === "number" &&
    GIVEAWAY_PLATFORMS.includes(giveaway.platform as GiveawayPlatform) &&
    GIVEAWAY_PLATFORM_LABELS.includes(
      giveaway.platformLabel as Giveaway["platformLabel"],
    ) &&
    typeof giveaway.title === "string" &&
    typeof giveaway.genre === "string" &&
    typeof giveaway.timer === "string" &&
    typeof giveaway.daysRemaining === "number" &&
    typeof giveaway.claimed === "number" &&
    giveaway.status === "live" &&
    GIVEAWAY_TAGS.includes(giveaway.tag as GiveawayTag) &&
    typeof giveaway.originalPrice === "string"
  );
}

function isWishlistItem(value: unknown): value is WishlistItem {
  if (typeof value !== "object" || value === null) return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "number" &&
    typeof item.title === "string" &&
    WISHLIST_STORES.includes(item.store as WishlistStore) &&
    typeof item.currentPrice === "string" &&
    typeof item.targetPrice === "string" &&
    typeof item.lowestEver === "string" &&
    (typeof item.discount === "string" || item.discount === null) &&
    WISHLIST_STATUSES.includes(item.status as WishlistStatus) &&
    typeof item.alertActive === "boolean" &&
    WISHLIST_PRIORITIES.includes(item.priority as WishlistPriority)
  );
}

export async function getDeals(): Promise<DealsResult> {
  const apiBaseUrl = (
    process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
  ).replace(/\/+$/, "");

  try {
    const response = await fetch(`${apiBaseUrl}/api/deals`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`Deals API returned ${response.status}`);
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data) || !data.every(isGameDeal)) {
      throw new Error("Deals API returned an unexpected response");
    }

    return { deals: data, source: "api" };
  } catch {
    return { deals: fallbackDeals, source: "fallback" };
  }
}

export async function getGiveaways(): Promise<GiveawaysResult> {
  const apiBaseUrl = (
    process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
  ).replace(/\/+$/, "");

  try {
    const response = await fetch(`${apiBaseUrl}/api/giveaways`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`Giveaways API returned ${response.status}`);
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data) || !data.every(isGiveaway)) {
      throw new Error("Giveaways API returned an unexpected response");
    }

    return { giveaways: data, source: "api" };
  } catch {
    return { giveaways: fallbackGiveaways, source: "fallback" };
  }
}

export async function getWishlist(): Promise<WishlistResult> {
  const apiBaseUrl = (
    process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
  ).replace(/\/+$/, "");

  try {
    const response = await fetch(`${apiBaseUrl}/api/wishlist`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`Wishlist API returned ${response.status}`);
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data) || !data.every(isWishlistItem)) {
      throw new Error("Wishlist API returned an unexpected response");
    }

    return { wishlistItems: data, source: "api" };
  } catch {
    return { wishlistItems: fallbackWishlistItems, source: "fallback" };
  }
}
