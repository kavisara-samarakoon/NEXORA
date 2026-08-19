import {
  type WishlistItem,
  type WishlistPriority,
  type WishlistStatus,
} from "@/data/wishlist";

const DEFAULT_API_BASE_URL = "http://localhost:8080";
const WISHLIST_REQUEST_TIMEOUT_MS = 8000;
const WISHLIST_STATUSES: readonly WishlistStatus[] = ["price-drop", "free-now", "tracking"];
const WISHLIST_PRIORITIES: readonly WishlistPriority[] = ["high", "medium", "low"];

export type AddWishlistItemPayload = {
  title: string;
  store: string;
  currentPrice: string;
  targetPrice: string;
  lowestEver?: string;
  discount?: string | null;
  status?: WishlistStatus;
  alertActive?: boolean;
  priority?: WishlistPriority;
};

export type UserWishlistError = {
  status: number | null;
  code: "authentication_required" | "validation_failed" | "not_found" | "service_unavailable" | "invalid_response" | "request_failed" | "unknown_error";
  message: string;
};

export class UserWishlistRequestError extends Error {
  readonly details: UserWishlistError;

  constructor(details: UserWishlistError) {
    super(details.message);
    this.name = "UserWishlistRequestError";
    this.details = details;
  }
}

function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

function isWishlistItem(value: unknown): value is WishlistItem {
  if (typeof value !== "object" || value === null) return false;

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "number" &&
    Number.isInteger(item.id) &&
    item.id > 0 &&
    typeof item.title === "string" &&
    typeof item.store === "string" &&
    item.store.trim().length > 0 &&
    typeof item.currentPrice === "string" &&
    typeof item.targetPrice === "string" &&
    typeof item.lowestEver === "string" &&
    (typeof item.discount === "string" || item.discount === null) &&
    WISHLIST_STATUSES.includes(item.status as WishlistStatus) &&
    typeof item.alertActive === "boolean" &&
    WISHLIST_PRIORITIES.includes(item.priority as WishlistPriority)
  );
}

function responseError(status: number): UserWishlistRequestError {
  if (status === 401) {
    return new UserWishlistRequestError({
      status,
      code: "authentication_required",
      message: "Please sign in again.",
    });
  }

  if (status === 400) {
    return new UserWishlistRequestError({
      status,
      code: "validation_failed",
      message: "Please check the wishlist details.",
    });
  }

  if (status === 404) {
    return new UserWishlistRequestError({
      status,
      code: "not_found",
      message: "That wishlist item could not be found.",
    });
  }

  return new UserWishlistRequestError({
    status,
    code: "request_failed",
    message: "The wishlist request could not be completed. Please try again.",
  });
}

async function wishlistRequest(path: string, token: string, init: RequestInit): Promise<Response> {
  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(WISHLIST_REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new UserWishlistRequestError({
      status: null,
      code: "service_unavailable",
      message: "Cannot reach the NEXORA wishlist service.",
    });
  }

  if (!response.ok) throw responseError(response.status);
  return response;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function invalidResponseError(): UserWishlistRequestError {
  return new UserWishlistRequestError({
    status: null,
    code: "invalid_response",
    message: "The wishlist service returned an unexpected response.",
  });
}

export async function getMyWishlist(token: string): Promise<WishlistItem[]> {
  const response = await wishlistRequest("/api/me/wishlist", token, { method: "GET" });
  const data = await readJson(response);

  if (!Array.isArray(data) || !data.every(isWishlistItem)) throw invalidResponseError();
  return data;
}

export async function addMyWishlistItem(
  token: string,
  payload: AddWishlistItemPayload,
): Promise<WishlistItem> {
  const response = await wishlistRequest("/api/me/wishlist", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);

  if (!isWishlistItem(data)) throw invalidResponseError();
  return data;
}

export async function deleteMyWishlistItem(token: string, id: number): Promise<void> {
  await wishlistRequest(`/api/me/wishlist/${encodeURIComponent(id)}`, token, { method: "DELETE" });
}

export function normalizeUserWishlistError(error: unknown): UserWishlistError {
  if (error instanceof UserWishlistRequestError) return error.details;

  return {
    status: null,
    code: "unknown_error",
    message: "Something went wrong with your wishlist. Please try again.",
  };
}
