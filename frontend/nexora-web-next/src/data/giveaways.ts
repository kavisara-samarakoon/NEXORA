export type GiveawayPlatform = "steam" | "epic" | "gog" | "prime";
export type GiveawayTag = "sample";

export type Giveaway = {
  id: number;
  platform: GiveawayPlatform;
  platformLabel: "Steam" | "Epic Games" | "GOG" | "Prime Gaming";
  title: string;
  genre: string;
  timer: string;
  daysRemaining: number;
  claimed: number;
  status: "sample";
  tag: GiveawayTag;
  originalPrice: string;
};

export const giveawayFilters = [
  "All",
  "Steam",
  "Epic Games",
  "GOG",
  "Prime Gaming",
] as const;

export type GiveawayFilter = (typeof giveawayFilters)[number];

export const giveaways = [
  {
    id: 1,
    platform: "steam",
    platformLabel: "Steam",
    title: "Cyber Shadow",
    genre: "Action · Platformer · Indie",
    timer: "End date unverified",
    daysRemaining: 0,
    claimed: 0,
    status: "sample",
    tag: "sample",
    originalPrice: "$19.99",
  },
  {
    id: 2,
    platform: "epic",
    platformLabel: "Epic Games",
    title: "Star Wars Battlefront II",
    genre: "Action · Shooter · Multiplayer",
    timer: "End date unverified",
    daysRemaining: 0,
    claimed: 0,
    status: "sample",
    tag: "sample",
    originalPrice: "$39.99",
  },
  {
    id: 3,
    platform: "gog",
    platformLabel: "GOG",
    title: "Shadow Warrior 2",
    genre: "FPS · Action · Open World",
    timer: "End date unverified",
    daysRemaining: 0,
    claimed: 0,
    status: "sample",
    tag: "sample",
    originalPrice: "$29.99",
  },
  {
    id: 4,
    platform: "prime",
    platformLabel: "Prime Gaming",
    title: "Fallout 76",
    genre: "RPG · Survival · Open World",
    timer: "End date unverified",
    daysRemaining: 0,
    claimed: 0,
    status: "sample",
    tag: "sample",
    originalPrice: "$39.99",
  },
  {
    id: 5,
    platform: "epic",
    platformLabel: "Epic Games",
    title: "Dead Cells",
    genre: "Roguelike · Action · Indie",
    timer: "End date unverified",
    daysRemaining: 0,
    claimed: 0,
    status: "sample",
    tag: "sample",
    originalPrice: "$24.99",
  },
  {
    id: 6,
    platform: "steam",
    platformLabel: "Steam",
    title: "Hollow Knight",
    genre: "Metroidvania · Indie · Adventure",
    timer: "End date unverified",
    daysRemaining: 0,
    claimed: 0,
    status: "sample",
    tag: "sample",
    originalPrice: "$14.99",
  },
  {
    id: 7,
    platform: "gog",
    platformLabel: "GOG",
    title: "The Witcher: Enhanced Edition",
    genre: "RPG · Action · Story Rich",
    timer: "End date unverified",
    daysRemaining: 0,
    claimed: 0,
    status: "sample",
    tag: "sample",
    originalPrice: "$9.99",
  },
  {
    id: 8,
    platform: "prime",
    platformLabel: "Prime Gaming",
    title: "Celeste",
    genre: "Platformer · Indie · Difficult",
    timer: "End date unverified",
    daysRemaining: 0,
    claimed: 0,
    status: "sample",
    tag: "sample",
    originalPrice: "$19.99",
  },
] satisfies readonly Giveaway[];
