import {
  wishlistAlertEvaluationStates,
  type WishlistAlertEvaluation,
  type WishlistAlertEvaluationState,
  type WishlistAlertEvent,
  type WishlistItem,
  type WishlistPriceHistoryPoint,
  type WishlistPriority,
  type WishlistStatus,
} from "@/data/wishlist";
import { ensureAuthToken, readAuthToken } from "@/lib/auth-client";

const DEFAULT_API_BASE_URL = "http://localhost:8080";
const WISHLIST_REQUEST_TIMEOUT_MS = 8000;
const WISHLIST_STATUSES: readonly WishlistStatus[] = ["price-drop", "free-now", "tracking"];
const WISHLIST_PRIORITIES: readonly WishlistPriority[] = ["high", "medium", "low"];

function isWishlistAlertEvaluation(value: unknown): value is WishlistAlertEvaluation {
  if (typeof value !== "object" || value === null) return false;

  const evaluation = value as Record<string, unknown>;
  return (
    typeof evaluation.targetReached === "boolean" &&
    wishlistAlertEvaluationStates.includes(
      evaluation.state as WishlistAlertEvaluationState,
    ) &&
    typeof evaluation.message === "string" &&
    evaluation.message.trim().length > 0
  );
}

function isWishlistAlertEvent(value: unknown): value is WishlistAlertEvent {
  if (typeof value !== "object" || value === null) return false;

  const event = value as Record<string, unknown>;
  return (
    typeof event.id === "number" &&
    Number.isInteger(event.id) &&
    event.id > 0 &&
    typeof event.wishlistItemId === "number" &&
    Number.isInteger(event.wishlistItemId) &&
    event.wishlistItemId > 0 &&
    typeof event.itemTitle === "string" &&
    event.itemTitle.trim().length > 0 &&
    typeof event.store === "string" &&
    event.store.trim().length > 0 &&
    typeof event.currentPrice === "string" &&
    typeof event.targetPrice === "string" &&
    wishlistAlertEvaluationStates.includes(
      event.evaluationState as WishlistAlertEvaluationState,
    ) &&
    typeof event.targetReached === "boolean" &&
    typeof event.message === "string" &&
    event.message.trim().length > 0 &&
    typeof event.createdAt === "string" &&
    event.createdAt.trim().length > 0
  );
}

export function isWishlistPriceHistoryPoint(
  value: unknown,
): value is WishlistPriceHistoryPoint {
  if (typeof value !== "object" || value === null) return false;

  const point = value as Record<string, unknown>;
  return (
    typeof point.id === "number" &&
    Number.isInteger(point.id) &&
    point.id > 0 &&
    typeof point.wishlistItemId === "number" &&
    Number.isInteger(point.wishlistItemId) &&
    point.wishlistItemId > 0 &&
    typeof point.itemTitle === "string" &&
    point.itemTitle.trim().length > 0 &&
    typeof point.store === "string" &&
    point.store.trim().length > 0 &&
    typeof point.priceLabel === "string" &&
    point.priceLabel.trim().length > 0 &&
    (point.priceAmount === null ||
      (typeof point.priceAmount === "number" && Number.isFinite(point.priceAmount))) &&
    (point.currency === null || typeof point.currency === "string") &&
    typeof point.source === "string" &&
    point.source.trim().length > 0 &&
    typeof point.observedAt === "string" &&
    point.observedAt.trim().length > 0
  );
}

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

export type UpdateWishlistAlertPayload = {
  targetPrice?: string;
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
    WISHLIST_PRIORITIES.includes(item.priority as WishlistPriority) &&
    (item.alertEvaluation === undefined ||
      isWishlistAlertEvaluation(item.alertEvaluation))
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

export async function getMyWishlistAlertEvents(
  token: string,
): Promise<WishlistAlertEvent[]> {
  const response = await wishlistRequest(
    "/api/me/wishlist/alert-events",
    token,
    { method: "GET" },
  );
  const data = await readJson(response);

  if (!Array.isArray(data) || !data.every(isWishlistAlertEvent)) {
    throw invalidResponseError();
  }
  return data;
}

export async function getMyWishlistPriceHistory(
  token: string,
  id: number,
  limit = 5,
): Promise<WishlistPriceHistoryPoint[]> {
  const normalizedLimit = Number.isInteger(limit) && limit >= 1 && limit <= 90
    ? limit
    : 5;
  const response = await wishlistRequest(
    `/api/me/wishlist/${encodeURIComponent(id)}/price-history?limit=${normalizedLimit}`,
    token,
    { method: "GET" },
  );
  const data = await readJson(response);

  if (!Array.isArray(data) || !data.every(isWishlistPriceHistoryPoint)) {
    throw invalidResponseError();
  }
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

export async function updateMyWishlistAlert(
  token: string,
  id: number,
  payload: UpdateWishlistAlertPayload,
): Promise<WishlistItem> {
  const response = await wishlistRequest(
    `/api/me/wishlist/${encodeURIComponent(id)}/alert`,
    token,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
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

export async function withWishlistAuthRetry<T>(
  token: string,
  request: (activeToken: string) => Promise<T>,
): Promise<{ value: T; token: string }> {
  try {
    return { value: await request(token), token };
  } catch (error) {
    if (normalizeUserWishlistError(error).status !== 401) throw error;

    const currentToken = readAuthToken();
    const refreshedToken =
      currentToken && currentToken !== token
        ? currentToken
        : await ensureAuthToken({ forceRefresh: true });
    if (!refreshedToken) throw error;

    return {
      value: await request(refreshedToken),
      token: refreshedToken,
    };
  }
}
