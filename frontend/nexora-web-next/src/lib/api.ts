import {
  deals as fallbackDeals,
  type DealStatus,
  type DealStore,
  type GameDeal,
} from "@/data/deals";

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

export type DealsResult = {
  deals: readonly GameDeal[];
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
