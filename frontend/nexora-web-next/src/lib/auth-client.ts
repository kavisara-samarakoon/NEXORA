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

export function startAuthSession(response: AuthResponse): void {
  currentAccessToken = response.token;
  currentUser = response.user;
  sessionBootstrapComplete = true;
  sessionVersion += 1;
  removeLegacyStoredToken();
  dispatchAuthStateEvent();
}

export function saveAuthToken(token: string): void {
  currentAccessToken = token;
  currentUser = null;
  sessionBootstrapComplete = true;
  sessionVersion += 1;
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

  startAuthSession(response);
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
  try {
    if (refreshPromise) {
      await refreshPromise.catch(() => null);
    }
    await logoutSession();
  } finally {
    clearAuthToken();
  }
}
