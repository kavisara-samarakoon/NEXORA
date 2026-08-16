import type { GameDeal } from "@/data/deals";
import type { Giveaway as ApiGiveaway } from "@/data/giveaways";

export type Platform = "steam" | "epic" | "gog";

function isDashboardPlatform(
  platform: ApiGiveaway["platform"],
): platform is Platform {
  return platform === "steam" || platform === "epic" || platform === "gog";
}

export type Giveaway = {
  id: number;
  platform: Platform;
  platformLabel: string;
  title: string;
  genre: string;
  timer: string;
  claimed: number;
};

export type Deal = {
  id: number;
  store: string;
  discount: string;
  title: string;
  priceOld: string;
  priceNew: string;
  rating: number;
  stars: number;
  status: string;
};

export type SecurityItem = {
  id: number;
  icon: "lock" | "network" | "warning" | "sentinel";
  tone: "green" | "blue" | "orange" | "purple";
  label: string;
  value: string;
  status: string;
  statusType: "ok" | "warn";
};

export type NetworkItem = {
  id: number;
  name: string;
  latency: string;
  uptime: string;
  uptimeValue: number;
  status: "online" | "degraded";
};

export const dashboardGiveaways = [
  {
    id: 1,
    platform: "steam",
    platformLabel: "Steam",
    title: "Cyber Shadow",
    genre: "Action · Platformer · Indie",
    timer: "2d 14h 32m",
    claimed: 78,
  },
  {
    id: 2,
    platform: "epic",
    platformLabel: "Epic Games",
    title: "Star Wars Battlefront II",
    genre: "Action · Shooter · Multiplayer",
    timer: "5d 06h 12m",
    claimed: 45,
  },
  {
    id: 3,
    platform: "gog",
    platformLabel: "GOG",
    title: "Shadow Warrior 2",
    genre: "FPS · Action · Open World",
    timer: "1d 03h 45m",
    claimed: 91,
  },
] satisfies readonly Giveaway[];

export const dashboardDeals = [
  {
    id: 1,
    store: "Steam",
    discount: "-75%",
    title: "Elden Ring: Shadow of the Erdtree",
    priceOld: "$39.99",
    priceNew: "$9.99",
    rating: 4.8,
    stars: 5,
    status: "Historical low",
  },
  {
    id: 2,
    store: "Epic Games",
    discount: "-60%",
    title: "Cyberpunk 2077: Phantom Liberty",
    priceOld: "$29.99",
    priceNew: "$11.99",
    rating: 4.6,
    stars: 4,
    status: "Great deal",
  },
  {
    id: 3,
    store: "Humble",
    discount: "-85%",
    title: "Hades II — Early Access",
    priceOld: "$29.99",
    priceNew: "$4.49",
    rating: 4.9,
    stars: 5,
    status: "Lowest ever",
  },
] satisfies readonly Deal[];

export function mapDashboardDeals(deals: readonly GameDeal[]): Deal[] {
  return deals.slice(0, 3).map((deal) => ({
    id: deal.id,
    store: deal.store,
    discount: deal.discount,
    title: deal.title,
    priceOld: deal.priceOld,
    priceNew: deal.priceNew,
    rating: deal.rating,
    stars: Math.min(
      5,
      Array.from(deal.stars).filter((star) => star === "★").length,
    ),
    status: deal.status,
  }));
}

export function mapDashboardGiveaways(
  giveaways: readonly ApiGiveaway[],
): Giveaway[] {
  const dashboardItems: Giveaway[] = [];

  for (const giveaway of giveaways) {
    if (!isDashboardPlatform(giveaway.platform)) {
      continue;
    }

    dashboardItems.push({
      id: giveaway.id,
      platform: giveaway.platform,
      platformLabel: giveaway.platformLabel,
      title: giveaway.title,
      genre: giveaway.genre,
      timer: giveaway.timer,
      claimed: giveaway.claimed,
    });

    if (dashboardItems.length === 3) break;
  }

  return dashboardItems;
}

export const securityItems = [
  {
    id: 1,
    icon: "lock",
    tone: "green",
    label: "SSL / TLS Encryption",
    value: "All connections encrypted",
    status: "Secure",
    statusType: "ok",
  },
  {
    id: 2,
    icon: "network",
    tone: "blue",
    label: "Network Firewall",
    value: "3 threats blocked today",
    status: "Active",
    statusType: "ok",
  },
  {
    id: 3,
    icon: "warning",
    tone: "orange",
    label: "DDoS Protection",
    value: "Monitoring 12 endpoints",
    status: "Warning",
    statusType: "warn",
  },
  {
    id: 4,
    icon: "sentinel",
    tone: "purple",
    label: "AI Threat Detection",
    value: "Sentinel scanning active",
    status: "Online",
    statusType: "ok",
  },
] satisfies readonly SecurityItem[];

export const networkItems = [
  {
    id: 1,
    name: "Deal Aggregator",
    latency: "24ms",
    uptime: "99.98%",
    uptimeValue: 99.98,
    status: "online",
  },
  {
    id: 2,
    name: "Giveaway Tracker",
    latency: "31ms",
    uptime: "99.95%",
    uptimeValue: 99.95,
    status: "online",
  },
  {
    id: 3,
    name: "Price Alert Engine",
    latency: "18ms",
    uptime: "100%",
    uptimeValue: 100,
    status: "online",
  },
  {
    id: 4,
    name: "Sentinel AI Core",
    latency: "142ms",
    uptime: "99.87%",
    uptimeValue: 99.87,
    status: "degraded",
  },
] satisfies readonly NetworkItem[];
