import { buildApiUrl, readResponseRequestId } from "@/lib/api-client";

const AUTH_REQUEST_TIMEOUT_MS = 8000;
const AUTH_CSRF_HEADER_NAME = "X-NEXORA-CSRF";

let currentCsrfToken: string | null = null;
let csrfBootstrapPromise: Promise<string> | null = null;

export type AuthUser = {
  id: number;
  email: string;
  username: string;
  displayName: string;
};

export type AuthResponse = {
  token: string;
  tokenType: "Bearer";
  user: AuthUser;
};

export type LoginPayload = {
  emailOrUsername: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  username: string;
  displayName: string;
  password: string;
};

export type AuthError = {
  status: number | null;
  code: string;
  message: string;
  requestId: string | null;
};

type AuthRequestErrorDetails = Omit<AuthError, "requestId">;

export class AuthRequestError extends Error {
  readonly details: AuthRequestErrorDetails;
  readonly requestId: string | null;

  constructor(details: AuthRequestErrorDetails, requestId: string | null = null) {
    super(details.message);
    this.name = "AuthRequestError";
    this.details = details;
    this.requestId = requestId;
  }
}

function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== "object" || value === null) return false;

  const user = value as Record<string, unknown>;
  return (
    typeof user.id === "number" &&
    Number.isInteger(user.id) &&
    user.id > 0 &&
    typeof user.email === "string" &&
    typeof user.username === "string" &&
    typeof user.displayName === "string"
  );
}

function isAuthResponse(value: unknown): value is AuthResponse {
  if (typeof value !== "object" || value === null) return false;

  const response = value as Record<string, unknown>;
  return (
    typeof response.token === "string" &&
    response.token.length > 0 &&
    response.tokenType === "Bearer" &&
    isAuthUser(response.user)
  );
}

function isCsrfTokenResponse(value: unknown): value is { csrfToken: string } {
  if (typeof value !== "object" || value === null) return false;
  const token = (value as Record<string, unknown>).csrfToken;
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

function readErrorCode(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const code = (value as Record<string, unknown>).error;
  return typeof code === "string" ? code : null;
}

function responseError(
  status: number,
  value: unknown,
  requestId: string | null,
): AuthRequestError {
  const backendCode = readErrorCode(value);

  if (status === 401) {
    const message =
      backendCode === "authentication_required"
        ? "Your session is invalid or expired. Please sign in again."
        : "Invalid email, username, or password.";
    return new AuthRequestError(
      { status, code: backendCode || "unauthorized", message },
      requestId,
    );
  }

  if (status === 403) {
    return new AuthRequestError(
      {
        status,
        code: backendCode || "csrf_failed",
        message: "The authentication request could not be verified. Please try again.",
      },
      requestId,
    );
  }

  if (status === 409) {
    return new AuthRequestError(
      {
        status,
        code: backendCode || "account_conflict",
        message: "That email or username is already registered.",
      },
      requestId,
    );
  }

  if (status === 400) {
    return new AuthRequestError(
      {
        status,
        code: backendCode || "validation_failed",
        message: "Please check the submitted details and try again.",
      },
      requestId,
    );
  }

  return new AuthRequestError(
    {
      status,
      code: backendCode || "request_failed",
      message:
        status >= 500
          ? "Authentication is temporarily unavailable. Please try again shortly."
          : "The authentication request could not be completed.",
    },
    requestId,
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function authRequest(
  path: string,
  init: RequestInit,
): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl(path), {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new AuthRequestError({
      status: null,
      code: "service_unavailable",
      message: "Cannot reach the NEXORA authentication service. Check that the backend is running.",
    });
  }

  const data = await readJson(response);
  if (!response.ok) {
    throw responseError(
      response.status,
      data,
      readResponseRequestId(response),
    );
  }

  return data;
}

async function fetchCsrfToken(): Promise<string> {
  const data = await authRequest("/api/auth/csrf", {
    method: "GET",
    credentials: "include",
  });

  if (!isCsrfTokenResponse(data)) {
    throw new AuthRequestError({
      status: null,
      code: "invalid_response",
      message: "The authentication service returned an unexpected response.",
    });
  }

  currentCsrfToken = data.csrfToken;
  return data.csrfToken;
}

export function getCsrfToken(): Promise<string> {
  if (currentCsrfToken) return Promise.resolve(currentCsrfToken);

  if (!csrfBootstrapPromise) {
    csrfBootstrapPromise = fetchCsrfToken().finally(() => {
      csrfBootstrapPromise = null;
    });
  }

  return csrfBootstrapPromise;
}

async function stateChangingAuthRequest(
  path: "/api/auth/login" | "/api/auth/register" | "/api/auth/refresh" | "/api/auth/logout",
  init: Omit<RequestInit, "headers"> & { headers?: Record<string, string> },
): Promise<unknown> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const csrfToken = await getCsrfToken();
    try {
      return await authRequest(path, {
        ...init,
        credentials: "include",
        headers: {
          ...init.headers,
          [AUTH_CSRF_HEADER_NAME]: csrfToken,
        },
      });
    } catch (error) {
      if (attempt === 0 && normalizeAuthError(error).status === 403) {
        if (currentCsrfToken === csrfToken) {
          currentCsrfToken = null;
        }
        continue;
      }
      throw error;
    }
  }

  throw new AuthRequestError({
    status: 403,
    code: "csrf_failed",
    message: "The authentication request could not be verified. Please try again.",
  });
}

async function submitCredentials(
  path: "/api/auth/login" | "/api/auth/register",
  payload: LoginPayload | RegisterPayload,
): Promise<AuthResponse> {
  const data = await stateChangingAuthRequest(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!isAuthResponse(data)) {
    throw new AuthRequestError({
      status: null,
      code: "invalid_response",
      message: "The authentication service returned an unexpected response.",
    });
  }

  return data;
}

export function login(payload: LoginPayload): Promise<AuthResponse> {
  return submitCredentials("/api/auth/login", payload);
}

export function register(payload: RegisterPayload): Promise<AuthResponse> {
  return submitCredentials("/api/auth/register", payload);
}

export async function refreshSession(): Promise<AuthResponse | null> {
  let data: unknown;

  try {
    data = await stateChangingAuthRequest("/api/auth/refresh", {
      method: "POST",
    });
  } catch (error) {
    if (normalizeAuthError(error).status === 401) return null;
    throw error;
  }

  if (!isAuthResponse(data)) {
    throw new AuthRequestError({
      status: null,
      code: "invalid_response",
      message: "The authentication service returned an unexpected response.",
    });
  }

  return data;
}

export async function logoutSession(): Promise<void> {
  await stateChangingAuthRequest("/api/auth/logout", {
    method: "POST",
  });
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  const data = await authRequest("/api/auth/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!isAuthUser(data)) {
    throw new AuthRequestError({
      status: null,
      code: "invalid_response",
      message: "The authentication service returned an unexpected response.",
    });
  }

  return data;
}

export function normalizeAuthError(error: unknown): AuthError {
  if (error instanceof AuthRequestError) {
    return { ...error.details, requestId: error.requestId };
  }

  return {
    status: null,
    code: "unknown_error",
    message: "Something went wrong while authenticating. Please try again.",
    requestId: null,
  };
}
