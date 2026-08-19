const DEFAULT_API_BASE_URL = "http://localhost:8080";
const AUTH_REQUEST_TIMEOUT_MS = 8000;

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
};

export class AuthRequestError extends Error {
  readonly details: AuthError;

  constructor(details: AuthError) {
    super(details.message);
    this.name = "AuthRequestError";
    this.details = details;
  }
}

function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
  ).replace(/\/+$/, "");
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

function readErrorCode(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const code = (value as Record<string, unknown>).error;
  return typeof code === "string" ? code : null;
}

function responseError(status: number, value: unknown): AuthRequestError {
  const backendCode = readErrorCode(value);

  if (status === 401) {
    const message =
      backendCode === "authentication_required"
        ? "Your session is invalid or expired. Please sign in again."
        : "Invalid email, username, or password.";
    return new AuthRequestError({ status, code: backendCode || "unauthorized", message });
  }

  if (status === 409) {
    return new AuthRequestError({
      status,
      code: backendCode || "account_conflict",
      message: "That email or username is already registered.",
    });
  }

  if (status === 400) {
    return new AuthRequestError({
      status,
      code: backendCode || "validation_failed",
      message: "Please check the submitted details and try again.",
    });
  }

  return new AuthRequestError({
    status,
    code: backendCode || "request_failed",
    message:
      status >= 500
        ? "Authentication is temporarily unavailable. Please try again shortly."
        : "The authentication request could not be completed.",
  });
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
    response = await fetch(`${getApiBaseUrl()}${path}`, {
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
    throw responseError(response.status, data);
  }

  return data;
}

async function submitCredentials(
  path: "/api/auth/login" | "/api/auth/register",
  payload: LoginPayload | RegisterPayload,
): Promise<AuthResponse> {
  const data = await authRequest(path, {
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
  if (error instanceof AuthRequestError) return error.details;

  return {
    status: null,
    code: "unknown_error",
    message: "Something went wrong while authenticating. Please try again.",
  };
}
