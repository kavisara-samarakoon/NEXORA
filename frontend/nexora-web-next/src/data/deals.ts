export type KnownDealStore = "Steam" | "Epic Games" | "GOG" | "Humble" | "Ubisoft";
export type DealStore = string;
export type DealStatus =
  | "Deep discount"
  | "Strong discount"
  | "Current offer"
  | "Observed offer"
  | "Free offer";

export type DealSortBy = "DealRating" | "Savings" | "Price" | "Title" | "Recent";

export type DealStoreOption = {
  id: string;
  name: string;
};

export type GameDeal = {
  id: number;
  store: DealStore;
  discount: string;
  discountValue: number;
  title: string;
  priceOld: string;
  priceNew: string;
  priceValue: number;
  rating: number;
  stars: string;
  category: string;
  status: DealStatus;
  dealUrl?: string | null;
  thumbUrl?: string | null;
  currency?: string;
  gameId?: string | null;
  externalDealId?: string | null;
  steamAppId?: string | null;
  metacriticScore?: number | null;
  source?: string | null;
  observedAtUtc?: string | null;
};

export type LiveDealsCatalog = {
  deals: readonly GameDeal[];
  source: "cheapshark" | "unavailable";
  sourceAttribution: string;
  sourceUrl: string | null;
  currency: string;
  cacheState: "live" | "cached" | "stale" | "fallback" | "unavailable";
  lastRefreshedAtUtc: string | null;
  availableStores: readonly DealStoreOption[];
  notice: string | null;
};

type CuratedGameDeal = Omit<GameDeal, "store"> & { store: KnownDealStore };

export const dealFilters = [
  "All Stores",
  "Steam",
  "Epic Games",
  "GOG",
  "Humble",
  "Ubisoft",
  "Under $10",
  "50%+ Off",
  "Free offers",
] as const;

export const dealSortOptions: readonly { value: DealSortBy; label: string }[] = [
  { value: "DealRating", label: "Deal Rating" },
  { value: "Savings", label: "Biggest Savings" },
  { value: "Price", label: "Price" },
  { value: "Title", label: "Title" },
  { value: "Recent", label: "Most Recent" },
];

export type DealFilter = (typeof dealFilters)[number];

export const deals = [
  {
    id: 1,
    store: "Steam",
    discount: "-75%",
    discountValue: 75,
    title: "Elden Ring: Shadow of the Erdtree",
    priceOld: "$39.99",
    priceNew: "$9.99",
    priceValue: 9.99,
    rating: 4.8,
    stars: "★★★★★",
    category: "Action RPG",
    status: "Strong discount",
  },
  {
    id: 2,
    store: "Epic Games",
    discount: "-60%",
    discountValue: 60,
    title: "Cyberpunk 2077: Phantom Liberty",
    priceOld: "$29.99",
    priceNew: "$11.99",
    priceValue: 11.99,
    rating: 4.6,
    stars: "★★★★☆",
    category: "RPG",
    status: "Strong discount",
  },
  {
    id: 3,
    store: "Humble",
    discount: "-85%",
    discountValue: 85,
    title: "Hades II — Early Access",
    priceOld: "$29.99",
    priceNew: "$4.49",
    priceValue: 4.49,
    rating: 4.9,
    stars: "★★★★★",
    category: "Roguelike",
    status: "Deep discount",
  },
  {
    id: 4,
    store: "GOG",
    discount: "-50%",
    discountValue: 50,
    title: "Baldur's Gate 3",
    priceOld: "$59.99",
    priceNew: "$29.99",
    priceValue: 29.99,
    rating: 4.9,
    stars: "★★★★★",
    category: "RPG",
    status: "Current offer",
  },
  {
    id: 5,
    store: "Steam",
    discount: "-40%",
    discountValue: 40,
    title: "Starfield: Shattered Space",
    priceOld: "$69.99",
    priceNew: "$41.99",
    priceValue: 41.99,
    rating: 3.8,
    stars: "★★★★☆",
    category: "Sci-Fi RPG",
    status: "Current offer",
  },
  {
    id: 6,
    store: "Ubisoft",
    discount: "-70%",
    discountValue: 70,
    title: "Assassin's Creed Mirage",
    priceOld: "$49.99",
    priceNew: "$14.99",
    priceValue: 14.99,
    rating: 4.2,
    stars: "★★★★☆",
    category: "Action",
    status: "Strong discount",
  },
  {
    id: 7,
    store: "Epic Games",
    discount: "-100%",
    discountValue: 100,
    title: "GTA V: Premium Edition",
    priceOld: "$29.99",
    priceNew: "FREE",
    priceValue: 0,
    rating: 4.5,
    stars: "★★★★★",
    category: "Open World",
    status: "Free offer",
  },
  {
    id: 8,
    store: "Steam",
    discount: "-55%",
    discountValue: 55,
    title: "Ghost of Tsushima: Director's Cut",
    priceOld: "$59.99",
    priceNew: "$26.99",
    priceValue: 26.99,
    rating: 4.7,
    stars: "★★★★★",
    category: "Action Adventure",
    status: "Current offer",
  },
] satisfies readonly CuratedGameDeal[];
