"use client";

import {
  getCurrentUser,
  logoutSession,
  normalizeAuthError,
  refreshSession,
  type AuthResponse,
  type AuthUser,
} from "@/lib/auth";

const AUTH_TOKEN_STORAGE_KEY = "nexora.auth.access_token";
export const AUTH_STATE_EVENT = "nexora:auth-state-change";

let currentAccessToken: string | null = null;
let currentUser: AuthUser | null = null;
let refreshPromise: Promise<string | null> | null = null;
let sessionBootstrapComplete = false;
let sessionVersion = 0;
// Unlike sessionVersion (which guards token writes), this changes only at an
// authentication boundary, so private requests can survive token rotation.
let authSessionRevision = 0;

function dispatchAuthStateEvent(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_STATE_EVENT));
  }
}

function removeLegacyStoredToken(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    // Memory-first authentication still works when browser storage is blocked.
  }
}

function applyAuthSession(response: AuthResponse, preserveSession: boolean): void {
  currentAccessToken = response.token;
  currentUser = response.user;
  sessionBootstrapComplete = true;
  sessionVersion += 1;
  if (!preserveSession) authSessionRevision += 1;
  removeLegacyStoredToken();
  dispatchAuthStateEvent();
}

export function startAuthSession(response: AuthResponse): void {
  // Explicit sign-in starts a new session even for the same account.
  applyAuthSession(response, false);
}

export function readAuthSessionRevision(): number {
  return authSessionRevision;
}

export class AuthSessionInvalidatedError extends Error {
  constructor() {
    super("The authentication session changed.");
    this.name = "AuthSessionInvalidatedError";
  }
}

export function isAuthSessionInvalidatedError(error: unknown): error is AuthSessionInvalidatedError {
  return error instanceof AuthSessionInvalidatedError;
}

export function assertAuthSessionRevision(revision: number): void {
  if (revision !== readAuthSessionRevision()) throw new AuthSessionInvalidatedError();
}

// Bind both attempts and their completions to the originating client session.
// Consumers also check the returned revision immediately before applying state.
export async function withAuthSessionRetry<T>(
  token: string,
  request: (activeToken: string) => Promise<T>,
  isAuthenticationError: (error: unknown) => boolean,
): Promise<{ value: T; token: string; sessionRevision: number }> {
  const sessionRevision = readAuthSessionRevision();
  async function attempt(activeToken: string) {
    assertAuthSessionRevision(sessionRevision);
    const value = await request(activeToken);
    assertAuthSessionRevision(sessionRevision);
    return { value, token: activeToken, sessionRevision };
  }

  try {
    return await attempt(token);
  } catch (error) {
    assertAuthSessionRevision(sessionRevision);
    if (!isAuthenticationError(error)) throw error;

    try {
      const currentToken = readAuthToken();
      const refreshedToken = currentToken && currentToken !== token
        ? currentToken
        : await ensureAuthToken({ forceRefresh: true });
      assertAuthSessionRevision(sessionRevision);
      if (!refreshedToken) throw error;
      return await attempt(refreshedToken);
    } catch (retryError) {
      assertAuthSessionRevision(sessionRevision);
      throw retryError;
    }
  }
}

export function saveAuthToken(token: string): void {
  currentAccessToken = token;
  currentUser = null;
  sessionBootstrapComplete = true;
  sessionVersion += 1;
  authSessionRevision += 1;
  removeLegacyStoredToken();
  dispatchAuthStateEvent();
}

export function readAuthToken(): string | null {
  return currentAccessToken;
}

export function clearAuthToken(): void {
  currentAccessToken = null;
  currentUser = null;
  sessionBootstrapComplete = true;
  sessionVersion += 1;
  authSessionRevision += 1;
  removeLegacyStoredToken();
  dispatchAuthStateEvent();
}

async function refreshAccessToken(): Promise<string | null> {
  const versionAtStart = sessionVersion;
  const response = await refreshSession();

  if (sessionVersion !== versionAtStart) {
    return currentAccessToken;
  }

  if (!response) {
    clearAuthToken();
    return null;
  }

  const sameUser = currentAccessToken !== null && currentUser?.id === response.user.id;
  applyAuthSession(response, sameUser);
  return response.token;
}

export async function ensureAuthToken(
  options: { forceRefresh?: boolean } = {},
): Promise<string | null> {
  removeLegacyStoredToken();
  if (!options.forceRefresh && currentAccessToken) return currentAccessToken;
  if (!options.forceRefresh && sessionBootstrapComplete) return null;

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function readCurrentUser(): Promise<AuthUser | null> {
  if (currentAccessToken && currentUser) return currentUser;

  let token = currentAccessToken;
  if (!token) {
    token = await ensureAuthToken();
    return token ? currentUser : null;
  }

  try {
    const user = await getCurrentUser(token);
    currentUser = user;
    return user;
  } catch (error) {
    if (normalizeAuthError(error).status === 401) {
      token = await ensureAuthToken({ forceRefresh: true });
      return token ? currentUser : null;
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  // Stop private requests immediately, including while cookie logout is pending.
  clearAuthToken();
  try {
    if (refreshPromise) {
      await refreshPromise.catch(() => null);
    }
    await logoutSession();
  } finally {
    clearAuthToken();
  }
}
