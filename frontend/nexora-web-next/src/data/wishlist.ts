export type WishlistStore = string;
export type WishlistStatus = "price-drop" | "free-now" | "tracking";
export type WishlistPriority = "high" | "medium" | "low";
export const wishlistAlertEvaluationStates = [
  "target-reached",
  "watching",
  "paused",
  "not-evaluable",
] as const;
export type WishlistAlertEvaluationState = (typeof wishlistAlertEvaluationStates)[number];

export type WishlistAlertEvaluation = {
  targetReached: boolean;
  state: WishlistAlertEvaluationState;
  message: string;
};

export type WishlistAlertEvent = {
  id: number;
  wishlistItemId: number;
  itemTitle: string;
  store: WishlistStore;
  currentPrice: string;
  targetPrice: string;
  evaluationState: WishlistAlertEvaluationState;
  targetReached: boolean;
  message: string;
  createdAt: string;
};

export type WishlistPriceHistoryPoint = {
  id: number;
  wishlistItemId: number;
  itemTitle: string;
  store: WishlistStore;
  priceLabel: string;
  priceAmount: number | null;
  currency: string | null;
  source: string;
  observedAt: string;
};

export type WishlistItem = {
  id: number;
  title: string;
  store: WishlistStore;
  currentPrice: string;
  targetPrice: string;
  lowestEver: string;
  discount: string | null;
  status: WishlistStatus;
  alertActive: boolean;
  priority: WishlistPriority;
  alertEvaluation?: WishlistAlertEvaluation;
};

export const wishlistFilters = [
  "All",
  "Price Drop",
  "Free Now",
  "High Priority",
  "Steam",
  "Epic Games",
  "GOG",
] as const;

export type WishlistFilter = (typeof wishlistFilters)[number];

export const wishlistItems = [
  {
    id: 1,
    title: "Ghost of Tsushima: Director's Cut",
    store: "Steam",
    currentPrice: "$39.99",
    targetPrice: "$24.99",
    lowestEver: "$29.99",
    discount: "-25%",
    status: "price-drop",
    alertActive: true,
    priority: "high",
    alertEvaluation: {
      targetReached: false,
      state: "watching",
      message: "Still above target price.",
    },
  },
  {
    id: 2,
    title: "Persona 5 Royal",
    store: "Steam",
    currentPrice: "$29.99",
    targetPrice: "$19.99",
    lowestEver: "$29.99",
    discount: "-50%",
    status: "price-drop",
    alertActive: true,
    priority: "high",
    alertEvaluation: {
      targetReached: false,
      state: "watching",
      message: "Still above target price.",
    },
  },
  {
    id: 3,
    title: "Monster Hunter Wilds",
    store: "Epic Games",
    currentPrice: "$69.99",
    targetPrice: "$44.99",
    lowestEver: "$59.99",
    discount: null,
    status: "tracking",
    alertActive: true,
    priority: "medium",
    alertEvaluation: {
      targetReached: false,
      state: "watching",
      message: "Still above target price.",
    },
  },
  {
    id: 4,
    title: "The Witcher 4",
    store: "GOG",
    currentPrice: "TBA",
    targetPrice: "$49.99",
    lowestEver: "—",
    discount: null,
    status: "tracking",
    alertActive: true,
    priority: "low",
    alertEvaluation: {
      targetReached: false,
      state: "not-evaluable",
      message: "Price cannot be evaluated yet.",
    },
  },
  {
    id: 5,
    title: "Hollow Knight: Silksong",
    store: "Steam",
    currentPrice: "FREE",
    targetPrice: "$0.00",
    lowestEver: "FREE",
    discount: "-100%",
    status: "free-now",
    alertActive: false,
    priority: "high",
    alertEvaluation: {
      targetReached: false,
      state: "paused",
      message: "Alert is paused.",
    },
  },
  {
    id: 6,
    title: "Starfield: Shattered Space",
    store: "Steam",
    currentPrice: "$41.99",
    targetPrice: "$29.99",
    lowestEver: "$41.99",
    discount: "-40%",
    status: "price-drop",
    alertActive: true,
    priority: "medium",
    alertEvaluation: {
      targetReached: false,
      state: "watching",
      message: "Still above target price.",
    },
  },
  {
    id: 7,
    title: "Baldur's Gate 3",
    store: "GOG",
    currentPrice: "$59.99",
    targetPrice: "$39.99",
    lowestEver: "$47.99",
    discount: null,
    status: "tracking",
    alertActive: false,
    priority: "low",
    alertEvaluation: {
      targetReached: false,
      state: "paused",
      message: "Alert is paused.",
    },
  },
  {
    id: 8,
    title: "Dead Cells: Return to Castlevania",
    store: "Epic Games",
    currentPrice: "FREE",
    targetPrice: "$0.00",
    lowestEver: "FREE",
    discount: "-100%",
    status: "free-now",
    alertActive: false,
    priority: "high",
    alertEvaluation: {
      targetReached: false,
      state: "paused",
      message: "Alert is paused.",
    },
  },
] satisfies readonly WishlistItem[];
