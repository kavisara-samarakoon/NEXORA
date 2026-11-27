import { withAuthSessionRetry, type AuthOperationValidity } from "@/lib/auth-client";
import { buildApiUrl, readResponseRequestId } from "@/lib/api-client";

const NOTIFICATION_PREFERENCE_TIMEOUT_MS = 8000;

export type NotificationPreferences = {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  targetReachedEnabled: boolean;
  priceDropEnabled: boolean;
  freeGameEnabled: boolean;
};

export type UpdateNotificationPreferencesPayload = Partial<NotificationPreferences>;

export type NotificationPreferenceError = {
  status: number | null;
  code:
    | "authentication_required"
    | "validation_failed"
    | "service_unavailable"
    | "invalid_response"
    | "request_failed"
    | "unknown_error";
  message: string;
  requestId: string | null;
};

type NotificationPreferenceRequestErrorDetails = Omit<
  NotificationPreferenceError,
  "requestId"
>;

export class NotificationPreferenceRequestError extends Error {
  readonly details: NotificationPreferenceRequestErrorDetails;
  readonly requestId: string | null;

  constructor(
    details: NotificationPreferenceRequestErrorDetails,
    requestId: string | null = null,
  ) {
    super(details.message);
    this.name = "NotificationPreferenceRequestError";
    this.details = details;
    this.requestId = requestId;
  }
}

function isNotificationPreferences(value: unknown): value is NotificationPreferences {
  if (typeof value !== "object" || value === null) return false;

  const preferences = value as Record<string, unknown>;
  return (
    typeof preferences.emailEnabled === "boolean" &&
    typeof preferences.inAppEnabled === "boolean" &&
    typeof preferences.targetReachedEnabled === "boolean" &&
    typeof preferences.priceDropEnabled === "boolean" &&
    typeof preferences.freeGameEnabled === "boolean"
  );
}

function responseError(
  status: number,
  requestId: string | null,
): NotificationPreferenceRequestError {
  if (status === 401) {
    return new NotificationPreferenceRequestError(
      {
        status,
        code: "authentication_required",
        message: "Please sign in again.",
      },
      requestId,
    );
  }
  if (status === 400) {
    return new NotificationPreferenceRequestError(
      {
        status,
        code: "validation_failed",
        message: "The notification preferences could not be validated.",
      },
      requestId,
    );
  }
  return new NotificationPreferenceRequestError(
    {
      status,
      code: "request_failed",
      message: "Notification preferences could not be saved. Please try again.",
    },
    requestId,
  );
}

async function preferenceRequest(
  token: string,
  init: RequestInit,
): Promise<NotificationPreferences> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl("/api/me/notification-preferences"), {
      ...init,
      cache: "no-store",
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(NOTIFICATION_PREFERENCE_TIMEOUT_MS),
    });
  } catch {
    throw new NotificationPreferenceRequestError({
      status: null,
      code: "service_unavailable",
      message: "Cannot reach the notification preference service.",
    });
  }

  if (!response.ok) {
    throw responseError(response.status, readResponseRequestId(response));
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!isNotificationPreferences(data)) {
    throw new NotificationPreferenceRequestError({
      status: null,
      code: "invalid_response",
      message: "The notification preference service returned an unexpected response.",
    });
  }
  return data;
}

export function getMyNotificationPreferences(
  token: string,
): Promise<NotificationPreferences> {
  return preferenceRequest(token, { method: "GET" });
}

export function updateMyNotificationPreferences(
  token: string,
  payload: UpdateNotificationPreferencesPayload,
): Promise<NotificationPreferences> {
  return preferenceRequest(token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function normalizeNotificationPreferenceError(
  error: unknown,
): NotificationPreferenceError {
  if (error instanceof NotificationPreferenceRequestError) {
    return { ...error.details, requestId: error.requestId };
  }

  return {
    status: null,
    code: "unknown_error",
    message: "Something went wrong with notification preferences. Please try again.",
    requestId: null,
  };
}

export function withNotificationPreferenceAuthRetry<T>(
  token: string,
  request: (activeToken: string) => Promise<T>,
  operation?: AuthOperationValidity,
): Promise<{ value: T; token: string; sessionRevision: number }> {
  return withAuthSessionRetry(
    token,
    request,
    (error) => normalizeNotificationPreferenceError(error).status === 401,
    operation,
  );
}
