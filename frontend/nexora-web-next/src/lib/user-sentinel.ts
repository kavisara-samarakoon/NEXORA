import { ensureAuthToken, readAuthToken } from "@/lib/auth-client";

const DEFAULT_API_BASE_URL = "http://localhost:8080";
const SENTINEL_REQUEST_TIMEOUT_MS = 10000;

export type SentinelInsightContext = "general" | "wishlist" | "deals" | "security";

export type SentinelInsightRequest = {
  message: string;
  context?: SentinelInsightContext;
};

export type SentinelProviderFallbackReason =
  | "gemini_not_configured"
  | "gemini_non_success_response"
  | "gemini_invalid_response"
  | "gemini_timeout_or_network"
  | "gemini_configuration_invalid"
  | "gemini_unavailable"
  | "unknown";

export type SentinelInsightResponse = {
  mode: "local-foundation" | "local-fallback" | "gemini-provider-foundation";
  provider: "local" | "gemini";
  context: SentinelInsightContext;
  title: string;
  answer: string;
  recommendations: string[];
  safetyNotes: string[];
  nextActions: string[];
  fallbackReason: SentinelProviderFallbackReason | null;
  createdAt: string;
};

export type SentinelInsightError = {
  status: number | null;
  code:
    | "authentication_required"
    | "validation_failed"
    | "rate_limit_exceeded"
    | "service_unavailable"
    | "invalid_response"
    | "request_failed"
    | "unknown_error";
  message: string;
};

export class SentinelInsightRequestError extends Error {
  readonly details: SentinelInsightError;

  constructor(details: SentinelInsightError) {
    super(details.message);
    this.name = "SentinelInsightRequestError";
    this.details = details;
  }
}

function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(
    (item) => typeof item === "string" && item.trim().length > 0,
  );
}

function isSentinelInsightContext(value: unknown): value is SentinelInsightContext {
  return value === "general" || value === "wishlist" || value === "deals" || value === "security";
}

function isSentinelProviderFallbackReason(
  value: unknown,
): value is SentinelProviderFallbackReason {
  return value === "gemini_not_configured" ||
    value === "gemini_non_success_response" ||
    value === "gemini_invalid_response" ||
    value === "gemini_timeout_or_network" ||
    value === "gemini_configuration_invalid" ||
    value === "gemini_unavailable" ||
    value === "unknown";
}

function isSentinelInsightResponse(value: unknown): value is SentinelInsightResponse {
  if (typeof value !== "object" || value === null) return false;

  const response = value as Record<string, unknown>;
  const hasValidProviderMode =
    ((response.mode === "local-foundation" || response.mode === "local-fallback") &&
      response.provider === "local") ||
    (response.mode === "gemini-provider-foundation" && response.provider === "gemini");
  const hasValidFallbackReason = response.mode === "local-fallback"
    ? isSentinelProviderFallbackReason(response.fallbackReason)
    : response.fallbackReason === null;
  return (
    hasValidProviderMode &&
    hasValidFallbackReason &&
    isSentinelInsightContext(response.context) &&
    typeof response.title === "string" &&
    response.title.trim().length > 0 &&
    typeof response.answer === "string" &&
    response.answer.trim().length > 0 &&
    isStringList(response.recommendations) &&
    isStringList(response.safetyNotes) &&
    isStringList(response.nextActions) &&
    typeof response.createdAt === "string" &&
    response.createdAt.trim().length > 0
  );
}

function responseError(status: number): SentinelInsightRequestError {
  if (status === 401) {
    return new SentinelInsightRequestError({
      status,
      code: "authentication_required",
      message: "Please sign in again to use the Sentinel gateway preview.",
    });
  }
  if (status === 400) {
    return new SentinelInsightRequestError({
      status,
      code: "validation_failed",
      message: "Enter a message between 1 and 500 characters using a supported context.",
    });
  }
  if (status === 429) {
    return new SentinelInsightRequestError({
      status,
      code: "rate_limit_exceeded",
      message: "Sentinel request limit reached. Please wait before trying again.",
    });
  }
  return new SentinelInsightRequestError({
    status,
    code: "request_failed",
    message: "The Sentinel gateway could not complete this request. Please try again.",
  });
}

export async function requestSentinelInsight(
  token: string,
  payload: SentinelInsightRequest,
): Promise<SentinelInsightResponse> {
  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}/api/me/sentinel/insight`, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(SENTINEL_REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new SentinelInsightRequestError({
      status: null,
      code: "service_unavailable",
      message: "Cannot reach the local Sentinel gateway.",
    });
  }

  if (!response.ok) throw responseError(response.status);

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!isSentinelInsightResponse(data)) {
    throw new SentinelInsightRequestError({
      status: null,
      code: "invalid_response",
      message: "The Sentinel gateway returned an unexpected response.",
    });
  }
  return data;
}

export function normalizeSentinelInsightError(error: unknown): SentinelInsightError {
  if (error instanceof SentinelInsightRequestError) return error.details;

  return {
    status: null,
    code: "unknown_error",
    message: "The Sentinel gateway could not complete this request. Check the local backend, then try again.",
  };
}

export async function withSentinelAuthRetry<T>(
  token: string,
  request: (activeToken: string) => Promise<T>,
): Promise<{ value: T; token: string }> {
  try {
    return { value: await request(token), token };
  } catch (error) {
    if (normalizeSentinelInsightError(error).status !== 401) throw error;

    const currentToken = readAuthToken();
    const refreshedToken = currentToken && currentToken !== token
      ? currentToken
      : await ensureAuthToken({ forceRefresh: true });
    if (!refreshedToken) throw error;

    return {
      value: await request(refreshedToken),
      token: refreshedToken,
    };
  }
}
