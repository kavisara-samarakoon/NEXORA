import type { GameDeal } from "@/data/deals";
import type { Giveaway as ApiGiveaway } from "@/data/giveaways";
import type {
  ProtectionItem,
  SecurityStatusData,
} from "@/data/security";
import type { DashboardSummary } from "@/lib/api";

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

function mapSecurityIcon(icon: ProtectionItem["icon"]): SecurityItem["icon"] {
  if (icon === "tls" || icon === "key" || icon === "lock") return "lock";
  if (icon === "gateway" || icon === "redirect" || icon === "device") {
    return "network";
  }
  if (icon === "eye" || icon === "bolt") return "warning";
  return "sentinel";
}

export function mapDashboardSecurityItems(
  securityStatus: SecurityStatusData,
): SecurityItem[] {
  return [
    ...securityStatus.accountProtection,
    ...securityStatus.networkProtection,
  ]
    .slice(0, 4)
    .map((item, index) => {
      const icon = mapSecurityIcon(item.icon);
      const statusType = item.statusType === "ok" ? "ok" : "warn";
      const tone =
        statusType === "warn"
          ? "orange"
          : icon === "lock"
            ? "green"
            : icon === "network"
              ? "blue"
              : icon === "warning"
                ? "orange"
                : "purple";

      return {
        id: index + 1,
        icon,
        tone,
        label: item.label,
        value: "Static capability preview — not live security telemetry",
        status: "Preview",
        statusType: "warn",
      };
    });
}

export function mapDashboardNetworkItems(
  summary: DashboardSummary,
): NetworkItem[] {
  void summary;

  return networkItems.map((item) => ({
    ...item,
    status: "degraded",
  }));
}

export const securityItems = [
  {
    id: 1,
    icon: "lock",
    tone: "green",
    label: "Transport security capability",
    value: "Static sample — deployment transport is not measured",
    status: "Preview",
    statusType: "warn",
  },
  {
    id: 2,
    icon: "network",
    tone: "blue",
    label: "Network protection capability",
    value: "Not connected to live security telemetry",
    status: "Preview",
    statusType: "warn",
  },
  {
    id: 3,
    icon: "warning",
    tone: "orange",
    label: "Traffic protection capability",
    value: "Static capability preview only",
    status: "Planned",
    statusType: "warn",
  },
  {
    id: 4,
    icon: "sentinel",
    tone: "purple",
    label: "Sentinel safety guidance",
    value: "Local preview — no live threat scanning",
    status: "Preview",
    statusType: "warn",
  },
] satisfies readonly SecurityItem[];

export const networkItems = [
  {
    id: 1,
    name: "Deal feed preview",
    latency: "Not measured",
    uptime: "Not measured",
    uptimeValue: 0,
    status: "degraded",
  },
  {
    id: 2,
    name: "Giveaway feed preview",
    latency: "Not measured",
    uptime: "Not measured",
    uptimeValue: 0,
    status: "degraded",
  },
  {
    id: 3,
    name: "Price alert preview",
    latency: "Not measured",
    uptime: "Not measured",
    uptimeValue: 0,
    status: "degraded",
  },
  {
    id: 4,
    name: "Sentinel capability preview",
    latency: "Not measured",
    uptime: "Not measured",
    uptimeValue: 0,
    status: "degraded",
  },
] satisfies readonly NetworkItem[];
