export type GiveawayPlatform = "steam" | "epic" | "gog" | "prime";
export type GiveawayTag = "ending-soon" | "new" | "popular";

export type Giveaway = {
  id: number;
  platform: GiveawayPlatform;
  platformLabel: "Steam" | "Epic Games" | "GOG" | "Prime Gaming";
  title: string;
  genre: string;
  timer: string;
  daysRemaining: number;
  claimed: number;
  status: "live";
  tag: GiveawayTag;
  originalPrice: string;
};

export const giveawayFilters = [
  "All",
  "Steam",
  "Epic Games",
  "GOG",
  "Prime Gaming",
  "Ending Soon",
  "New",
  "Popular",
] as const;

export type GiveawayFilter = (typeof giveawayFilters)[number];

export const giveaways = [
  {
    id: 1,
    platform: "steam",
    platformLabel: "Steam",
    title: "Cyber Shadow",
    genre: "Action · Platformer · Indie",
    timer: "2d 14h 32m",
    daysRemaining: 2,
    claimed: 78,
    status: "live",
    tag: "popular",
    originalPrice: "$19.99",
  },
  {
    id: 2,
    platform: "epic",
    platformLabel: "Epic Games",
    title: "Star Wars Battlefront II",
    genre: "Action · Shooter · Multiplayer",
    timer: "5d 06h 12m",
    daysRemaining: 5,
    claimed: 45,
    status: "live",
    tag: "new",
    originalPrice: "$39.99",
  },
  {
    id: 3,
    platform: "gog",
    platformLabel: "GOG",
    title: "Shadow Warrior 2",
    genre: "FPS · Action · Open World",
    timer: "1d 03h 45m",
    daysRemaining: 1,
    claimed: 91,
    status: "live",
    tag: "ending-soon",
    originalPrice: "$29.99",
  },
  {
    id: 4,
    platform: "prime",
    platformLabel: "Prime Gaming",
    title: "Fallout 76",
    genre: "RPG · Survival · Open World",
    timer: "6d 18h 00m",
    daysRemaining: 6,
    claimed: 32,
    status: "live",
    tag: "new",
    originalPrice: "$39.99",
  },
  {
    id: 5,
    platform: "epic",
    platformLabel: "Epic Games",
    title: "Dead Cells",
    genre: "Roguelike · Action · Indie",
    timer: "0d 08h 22m",
    daysRemaining: 0,
    claimed: 95,
    status: "live",
    tag: "ending-soon",
    originalPrice: "$24.99",
  },
  {
    id: 6,
    platform: "steam",
    platformLabel: "Steam",
    title: "Hollow Knight",
    genre: "Metroidvania · Indie · Adventure",
    timer: "4d 11h 50m",
    daysRemaining: 4,
    claimed: 62,
    status: "live",
    tag: "popular",
    originalPrice: "$14.99",
  },
  {
    id: 7,
    platform: "gog",
    platformLabel: "GOG",
    title: "The Witcher: Enhanced Edition",
    genre: "RPG · Action · Story Rich",
    timer: "3d 09h 15m",
    daysRemaining: 3,
    claimed: 88,
    status: "live",
    tag: "popular",
    originalPrice: "$9.99",
  },
  {
    id: 8,
    platform: "prime",
    platformLabel: "Prime Gaming",
    title: "Celeste",
    genre: "Platformer · Indie · Difficult",
    timer: "7d 00h 00m",
    daysRemaining: 7,
    claimed: 18,
    status: "live",
    tag: "new",
    originalPrice: "$19.99",
  },
] satisfies readonly Giveaway[];
