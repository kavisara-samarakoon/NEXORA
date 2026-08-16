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
  securityStatus as fallbackSecurityStatus,
  type ProtectionIcon,
  type ProtectionItem,
  type ProtectionStatus,
  type SecurityStatusData,
} from "@/data/security";
import {
  sentinelDemo as fallbackSentinelDemo,
  sentinelStatus as fallbackSentinelStatus,
  type ChatMessage,
  type ChatMessageSegment,
  type SentinelCapability,
  type SentinelDemoData,
  type SentinelStatus,
  type SentinelSystemStatusItem,
} from "@/data/sentinel";
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
const PROTECTION_ICONS: readonly ProtectionIcon[] = [
  "key",
  "lock",
  "device",
  "eye",
  "tls",
  "bolt",
  "redirect",
  "gateway",
];
const PROTECTION_STATUSES: readonly ProtectionStatus[] = [
  "ok",
  "warn",
  "planned",
];
const SENTINEL_CAPABILITY_ICONS: readonly SentinelCapability["icon"][] = [
  "gamepad",
  "deal",
  "shield",
  "lock",
];
const SENTINEL_TONES: readonly SentinelCapability["tone"][] = [
  "blue",
  "orange",
  "green",
  "purple",
];
const SENTINEL_STATUS_ICONS: readonly SentinelSystemStatusItem["icon"][] = [
  "bot",
  "network",
  "spark",
  "lock",
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

export type SecurityStatusResult = {
  securityStatus: SecurityStatusData;
  source: "api" | "fallback";
};

export type SentinelResult = {
  demo: SentinelDemoData;
  status: SentinelStatus;
  source: "api" | "fallback";
};

export type DashboardSummary = {
  activeDealsCount: number;
  activeGiveawaysCount: number;
  wishlistItemsCount: number;
  activePriceAlertsCount: number;
  bestDiscountValue: number;
  bestDiscountTitle: string;
  databaseStatus: string;
  sentinelStatus: string;
};

export type DashboardSummaryResult = {
  dashboardSummary: DashboardSummary | null;
  source: "api" | "fallback";
};

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isDashboardSummary(value: unknown): value is DashboardSummary {
  if (typeof value !== "object" || value === null) return false;

  const summary = value as Record<string, unknown>;

  return (
    isNonNegativeInteger(summary.activeDealsCount) &&
    isNonNegativeInteger(summary.activeGiveawaysCount) &&
    isNonNegativeInteger(summary.wishlistItemsCount) &&
    isNonNegativeInteger(summary.activePriceAlertsCount) &&
    isNonNegativeInteger(summary.bestDiscountValue) &&
    typeof summary.bestDiscountTitle === "string" &&
    typeof summary.databaseStatus === "string" &&
    typeof summary.sentinelStatus === "string"
  );
}

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

function isProtectionItem(value: unknown): value is ProtectionItem {
  if (typeof value !== "object" || value === null) return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "number" &&
    PROTECTION_ICONS.includes(item.icon as ProtectionIcon) &&
    typeof item.label === "string" &&
    typeof item.description === "string" &&
    typeof item.status === "string" &&
    PROTECTION_STATUSES.includes(item.statusType as ProtectionStatus)
  );
}

function isSecurityStatus(value: unknown): value is SecurityStatusData {
  if (typeof value !== "object" || value === null) return false;

  const securityStatus = value as Record<string, unknown>;

  return (
    typeof securityStatus.securityScore === "number" &&
    securityStatus.securityScore >= 0 &&
    securityStatus.securityScore <= 100 &&
    typeof securityStatus.status === "string" &&
    typeof securityStatus.activeSessions === "number" &&
    typeof securityStatus.protectedApis === "number" &&
    typeof securityStatus.alertCount === "number" &&
    Array.isArray(securityStatus.accountProtection) &&
    securityStatus.accountProtection.every(isProtectionItem) &&
    Array.isArray(securityStatus.networkProtection) &&
    securityStatus.networkProtection.every(isProtectionItem)
  );
}

function isChatMessageSegment(value: unknown): value is ChatMessageSegment {
  if (typeof value !== "object" || value === null) return false;

  const segment = value as Record<string, unknown>;

  return (
    typeof segment.text === "string" &&
    (segment.emphasis === undefined || typeof segment.emphasis === "boolean")
  );
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;

  const message = value as Record<string, unknown>;

  return (
    typeof message.id === "number" &&
    (message.role === "user" || message.role === "ai") &&
    Array.isArray(message.segments) &&
    message.segments.every(isChatMessageSegment)
  );
}

function isSentinelCapability(value: unknown): value is SentinelCapability {
  if (typeof value !== "object" || value === null) return false;

  const capability = value as Record<string, unknown>;

  return (
    typeof capability.id === "number" &&
    SENTINEL_CAPABILITY_ICONS.includes(
      capability.icon as SentinelCapability["icon"],
    ) &&
    typeof capability.title === "string" &&
    typeof capability.description === "string" &&
    SENTINEL_TONES.includes(capability.tone as SentinelCapability["tone"])
  );
}

function isSentinelSystemStatusItem(
  value: unknown,
): value is SentinelSystemStatusItem {
  if (typeof value !== "object" || value === null) return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.label === "string" &&
    typeof item.value === "string" &&
    typeof item.badge === "string" &&
    SENTINEL_TONES.includes(item.tone as SentinelSystemStatusItem["tone"]) &&
    SENTINEL_STATUS_ICONS.includes(
      item.icon as SentinelSystemStatusItem["icon"],
    )
  );
}

function isSentinelStatus(value: unknown): value is SentinelStatus {
  if (typeof value !== "object" || value === null) return false;

  const status = value as Record<string, unknown>;

  return (
    typeof status.aiStatus === "string" &&
    typeof status.backend === "string" &&
    typeof status.geminiApi === "string" &&
    typeof status.privacy === "string"
  );
}

function isSentinelDemo(value: unknown): value is SentinelDemoData {
  if (typeof value !== "object" || value === null) return false;

  const demo = value as Record<string, unknown>;

  return (
    Array.isArray(demo.messages) &&
    demo.messages.every(isChatMessage) &&
    Array.isArray(demo.suggestions) &&
    demo.suggestions.every((suggestion) => typeof suggestion === "string") &&
    Array.isArray(demo.capabilities) &&
    demo.capabilities.every(isSentinelCapability) &&
    Array.isArray(demo.systemStatus) &&
    demo.systemStatus.every(isSentinelSystemStatusItem)
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

export async function getDashboardSummary(): Promise<DashboardSummaryResult> {
  const apiBaseUrl = (
    process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
  ).replace(/\/+$/, "");

  try {
    const response = await fetch(`${apiBaseUrl}/api/dashboard/summary`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`Dashboard summary API returned ${response.status}`);
    }

    const data: unknown = await response.json();

    if (!isDashboardSummary(data)) {
      throw new Error("Dashboard summary API returned an unexpected response");
    }

    return { dashboardSummary: data, source: "api" };
  } catch {
    return { dashboardSummary: null, source: "fallback" };
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

export async function getSecurityStatus(): Promise<SecurityStatusResult> {
  const apiBaseUrl = (
    process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
  ).replace(/\/+$/, "");

  try {
    const response = await fetch(`${apiBaseUrl}/api/security/status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`Security status API returned ${response.status}`);
    }

    const data: unknown = await response.json();

    if (!isSecurityStatus(data)) {
      throw new Error("Security status API returned an unexpected response");
    }

    return { securityStatus: data, source: "api" };
  } catch {
    return { securityStatus: fallbackSecurityStatus, source: "fallback" };
  }
}

export async function getSentinel(): Promise<SentinelResult> {
  const apiBaseUrl = (
    process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
  ).replace(/\/+$/, "");

  try {
    const [statusResponse, demoResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/api/sentinel/status`, {
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      }),
      fetch(`${apiBaseUrl}/api/sentinel/demo`, {
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      }),
    ]);

    if (!statusResponse.ok || !demoResponse.ok) {
      throw new Error(
        `Sentinel API returned status ${statusResponse.status}/${demoResponse.status}`,
      );
    }

    const [statusData, demoData]: [unknown, unknown] = await Promise.all([
      statusResponse.json(),
      demoResponse.json(),
    ]);

    if (!isSentinelStatus(statusData) || !isSentinelDemo(demoData)) {
      throw new Error("Sentinel API returned an unexpected response");
    }

    return { demo: demoData, status: statusData, source: "api" };
  } catch {
    return {
      demo: fallbackSentinelDemo,
      status: fallbackSentinelStatus,
      source: "fallback",
    };
  }
}
