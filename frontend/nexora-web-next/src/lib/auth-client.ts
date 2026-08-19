"use client";

import { getCurrentUser, normalizeAuthError, type AuthUser } from "@/lib/auth";

const AUTH_TOKEN_STORAGE_KEY = "nexora.auth.access_token";
export const AUTH_STATE_EVENT = "nexora:auth-state-change";

export function saveAuthToken(token: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    window.dispatchEvent(new Event(AUTH_STATE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function readAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    // The token is already inaccessible when browser storage is blocked.
  } finally {
    window.dispatchEvent(new Event(AUTH_STATE_EVENT));
  }
}

export async function readCurrentUser(): Promise<AuthUser | null> {
  const token = readAuthToken();
  if (!token) return null;

  try {
    return await getCurrentUser(token);
  } catch (error) {
    if (normalizeAuthError(error).status === 401) {
      clearAuthToken();
      return null;
    }
    throw error;
  }
}

export function logout(): void {
  clearAuthToken();
}
