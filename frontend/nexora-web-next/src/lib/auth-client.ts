"use client";

import {
  AuthRequestError,
  getCurrentUser,
  logoutSession,
  normalizeAuthError,
  refreshSession,
  type AuthResponse,
  type AuthUser,
} from "@/lib/auth";

const AUTH_TOKEN_STORAGE_KEY = "nexora.auth.access_token";
export const AUTH_REFRESH_COOKIE_QUARANTINE_KEY = "nexora.auth.refresh-cookie-quarantine.v1";
export const AUTH_STATE_EVENT = "nexora:auth-state-change";

let currentAccessToken: string | null = null;
let currentUser: AuthUser | null = null;
let refreshPromise: Promise<string | null> | null = null;
let logoutPromise: Promise<void> | null = null;
let authCookieTransitionPromise: Promise<void> | null = null;
let credentialTransitionGeneration = 0;
let credentialRequestInFlight = false;
let obsoleteCredentialCookiePending = false;
let credentialCookieCleanupFailure: { error: AuthRequestError; generation: number } | null = null;
let quarantineRecoveryPromise: Promise<void> | null = null;
let quarantineOriginRevision: number | null = null;
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

function cookieTrustStorageError(): AuthRequestError {
  return new AuthRequestError({
    status: null,
    code: "storage_unavailable",
    message: "Authentication is unavailable because browser storage cannot verify refresh-cookie trust. Please try again.",
  });
}

function retainCookieQuarantine(): void {
  obsoleteCredentialCookiePending = true;
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(AUTH_REFRESH_COOKIE_QUARANTINE_KEY, "1");
  } catch {
    // Storage remains unavailable; this runtime continues to fail closed.
  }
}

function readCookieQuarantine(): boolean {
  if (typeof window === "undefined") return obsoleteCredentialCookiePending;
  try {
    return window.localStorage.getItem(AUTH_REFRESH_COOKIE_QUARANTINE_KEY) !== null
      || obsoleteCredentialCookiePending;
  } catch {
    retainCookieQuarantine();
    throw cookieTrustStorageError();
  }
}

function markCookieQuarantine(): void {
  obsoleteCredentialCookiePending = true;
  try {
    if (typeof window === "undefined") throw cookieTrustStorageError();
    window.localStorage.setItem(AUTH_REFRESH_COOKIE_QUARANTINE_KEY, "1");
    if (window.localStorage.getItem(AUTH_REFRESH_COOKIE_QUARANTINE_KEY) !== "1") throw cookieTrustStorageError();
    quarantineOriginRevision = readAuthSessionRevision();
  } catch {
    throw cookieTrustStorageError();
  }
}

function clearCookieQuarantine(): void {
  try {
    if (typeof window === "undefined") throw cookieTrustStorageError();
    window.localStorage.removeItem(AUTH_REFRESH_COOKIE_QUARANTINE_KEY);
    if (window.localStorage.getItem(AUTH_REFRESH_COOKIE_QUARANTINE_KEY) !== null) throw cookieTrustStorageError();
    obsoleteCredentialCookiePending = false;
    credentialCookieCleanupFailure = null;
    quarantineOriginRevision = null;
  } catch {
    // Removal may have succeeded before its verification read failed. Restore
    // the durable guard before rolling back an unaccepted credential session.
    retainCookieQuarantine();
    throw cookieTrustStorageError();
  }
}

function applyAuthSession(response: AuthResponse, preserveSession: boolean, committed?: () => void): void {
  currentAccessToken = response.token;
  currentUser = response.user;
  sessionBootstrapComplete = true;
  sessionVersion += 1;
  if (!preserveSession) {
    authSessionRevision += 1;
    credentialTransitionGeneration += 1;
  }
  removeLegacyStoredToken();
  const committedVersion = sessionVersion;
  try {
    committed?.();
  } catch (error) {
    if (sessionVersion === committedVersion) clearLocalAuthSession();
    throw error;
  }
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
  credentialTransitionGeneration += 1;
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

function clearLocalAuthSession(): void {
  currentAccessToken = null;
  currentUser = null;
  sessionBootstrapComplete = true;
  sessionVersion += 1;
  authSessionRevision += 1;
  removeLegacyStoredToken();
  dispatchAuthStateEvent();
}

export function clearAuthToken(): void {
  credentialTransitionGeneration += 1;
  clearLocalAuthSession();
}

async function refreshAccessToken(): Promise<string | null> {
  if (readCookieQuarantine()) throw new AuthSessionInvalidatedError();
  const versionAtStart = sessionVersion;
  const response = await refreshSession();

  // A marker written by another tab during the request also bars application
  // of this response. Recovery is separate so it cannot await its own refresh.
  if (readCookieQuarantine()) {
    if (!credentialRequestInFlight) invalidateQuarantinedLocalSession();
    throw new AuthSessionInvalidatedError();
  }

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
  let quarantined: boolean;
  try {
    quarantined = readCookieQuarantine();
  } catch (error) {
    invalidateQuarantinedLocalSession();
    throw error;
  }
  if (quarantined && !credentialRequestInFlight) {
    await recoverCookieQuarantine();
    return null;
  }
  if (!options.forceRefresh && currentAccessToken) return currentAccessToken;
  if (!options.forceRefresh && sessionBootstrapComplete) return null;

  // An unaccepted credential cookie must never be consumed by refresh while
  // its request or required expiry is still pending/uncertain.
  if (credentialRequestInFlight || obsoleteCredentialCookiePending) {
    if (!options.forceRefresh && !credentialCookieCleanupFailure) return null;
    throw credentialCookieCleanupFailure?.error ?? new AuthSessionInvalidatedError();
  }

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  try {
    return await refreshPromise;
  } catch (error) {
    let quarantinedNow: boolean;
    try {
      quarantinedNow = readCookieQuarantine();
    } catch (storageError) {
      invalidateQuarantinedLocalSession();
      throw storageError;
    }
    if (quarantinedNow && !credentialRequestInFlight) {
      await recoverCookieQuarantine();
      return null;
    }
    throw error;
  }
}

export async function readCurrentUser(): Promise<AuthUser | null> {
  let quarantined: boolean;
  try {
    quarantined = readCookieQuarantine();
  } catch (error) {
    invalidateQuarantinedLocalSession();
    throw error;
  }
  if (quarantined && !credentialRequestInFlight) await recoverCookieQuarantine();
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

// Publish a non-rejecting barrier before invoking work, including reentrant
// auth-event handlers. Every cookie response and its cleanup precede the next
// transition's dispatch; failures cannot poison the shared queue.
function queueAuthCookieTransition<T>(request: () => Promise<T>): Promise<T> {
  const previous = authCookieTransitionPromise;
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  authCookieTransitionPromise = barrier;
  return (async () => {
    try {
      if (previous) await previous;
      return await request();
    } finally {
      if (authCookieTransitionPromise === barrier) authCookieTransitionPromise = null;
      release();
    }
  })();
}

type AuthCredentialTransition<T> = {
  value: T;
  transitionId: number;
  sessionRevision: number;
};

export function assertAuthCredentialTransition(
  transition: { transitionId: number; sessionRevision: number },
): void {
  if (transition.transitionId !== credentialTransitionGeneration) throw new AuthSessionInvalidatedError();
  assertAuthSessionRevision(transition.sessionRevision);
}

function recordCredentialCookieCleanupFailure(error: unknown): AuthRequestError {
  const details = normalizeAuthError(error);
  const failure = new AuthRequestError({
    status: details.status,
    code: details.code,
    message: details.code === "storage_unavailable" ? details.message
      : "The previous sign-in could not be safely cleared. Please try again.",
  }, details.requestId);
  credentialCookieCleanupFailure = { error: failure, generation: credentialTransitionGeneration };
  return failure;
}

async function clearObsoleteCredentialCookie(): Promise<void> {
  try {
    // A refresh already dispatched before credentials must also settle before
    // expiry. New refresh work is blocked while credential ownership is unclear.
    if (refreshPromise) await refreshPromise.catch(() => null);
    await logoutSession();
    clearCookieQuarantine();
  } catch (error) {
    throw recordCredentialCookieCleanupFailure(error);
  }
}

function invalidateQuarantinedLocalSession(): void {
  // Preserve an explicit newer local session while retiring an older cookie.
  if (quarantineOriginRevision !== null && authSessionRevision > quarantineOriginRevision) return;
  sessionBootstrapComplete = true;
  if (currentAccessToken || currentUser) clearLocalAuthSession();
}

function recoverCookieQuarantine(): Promise<void> {
  if (quarantineRecoveryPromise) return quarantineRecoveryPromise;
  const operation = queueAuthCookieTransition(async () => {
    if (readCookieQuarantine()) await clearObsoleteCredentialCookie();
  }).finally(() => {
    if (quarantineRecoveryPromise === operation) quarantineRecoveryPromise = null;
  });
  // Publish before invalidation emits reentrant auth-state reads.
  quarantineRecoveryPromise = operation;
  invalidateQuarantinedLocalSession();
  return operation;
}

export function commitAuthCredentialTransition(result: AuthCredentialTransition<AuthResponse>): void {
  assertAuthCredentialTransition(result);
  // Clear only after the authoritative in-memory commit, before auth events or
  // navigation can initiate bootstrap. Storage failure rolls this commit back.
  applyAuthSession(result.value, false, clearCookieQuarantine);
}

export function withAuthCredentialTransition<T>(
  request: () => Promise<T>,
  accept: (result: AuthCredentialTransition<T>) => void,
): Promise<AuthCredentialTransition<T>> {
  // Logical submission supersedes older continuations immediately, even while
  // waiting for logout or a credential response to settle.
  const transitionId = ++credentialTransitionGeneration;
  return queueAuthCookieTransition(async () => {
    let transition = { transitionId, sessionRevision: readAuthSessionRevision() };
    assertAuthCredentialTransition(transition);
    if (readCookieQuarantine()) {
      invalidateQuarantinedLocalSession();
      transition = { transitionId, sessionRevision: readAuthSessionRevision() };
      // Attempts already waiting when cleanup failed must report that failure,
      // not silently retry it or dispatch credentials with an obsolete cookie.
      try {
        if (credentialCookieCleanupFailure && transitionId <= credentialCookieCleanupFailure.generation) {
          throw credentialCookieCleanupFailure.error;
        }
        await clearObsoleteCredentialCookie();
      } catch (error) {
        assertAuthCredentialTransition(transition);
        throw error;
      }
      assertAuthCredentialTransition(transition);
    }
    credentialRequestInFlight = true;
    try {
      markCookieQuarantine();
      // A prior refresh can still install its cookie after its access-token
      // write is invalidated. Settle that response before dispatching credentials.
      if (refreshPromise) {
        await refreshPromise.catch(() => null);
        assertAuthCredentialTransition(transition);
      }
      let value: T;
      try {
        value = await request();
      } catch (error) {
        // A successful HTTP response with an invalid auth body may already
        // have installed its cookie even though submitCredentials rejects it.
        const details = normalizeAuthError(error);
        if (details.status !== null && details.status >= 400) {
          // Backend credential rejections cannot issue a refresh cookie.
          clearCookieQuarantine();
        } else if (details.code === "invalid_response") {
          if (!logoutPromise) {
            try { await clearObsoleteCredentialCookie(); } catch { /* Retained below and for queued callers. */ }
          }
        }
        assertAuthCredentialTransition(transition);
        if (credentialCookieCleanupFailure) throw credentialCookieCleanupFailure.error;
        throw error;
      }
      try {
        assertAuthCredentialTransition(transition);
      } catch (error) {
        obsoleteCredentialCookiePending = true;
        // A queued explicit logout already owns expiry before later credentials.
        // Calling logout() here would wait on this slot and deadlock the queue.
        if (!logoutPromise) {
          try { await clearObsoleteCredentialCookie(); } catch { /* Retained for the authoritative caller. */ }
        }
        throw error;
      }
      const result = { value, ...transition };
      // Commit synchronously before releasing the cookie slot. Returning first
      // leaves a gap in which a new attempt can obsolete an uncommitted cookie.
      accept(result);
      return result;
    } finally {
      credentialRequestInFlight = false;
    }
  });
}

export function logout(): Promise<void> {
  if (logoutPromise) return logoutPromise;

  const logoutVersion = sessionVersion + 1;
  const pendingRefresh = refreshPromise;
  const operation = queueAuthCookieTransition(async () => {
    try {
      if (pendingRefresh) await pendingRefresh.catch(() => null);
      await logoutSession();
      clearCookieQuarantine();
    } catch (error) {
      if (obsoleteCredentialCookiePending) recordCredentialCookieCleanupFailure(error);
      throw error;
    } finally {
      // Cleanup belongs to this logout, not a new logical boundary: credentials
      // submitted after its initial invalidation may proceed once it settles.
      if (sessionVersion === logoutVersion) clearLocalAuthSession();
      if (logoutPromise === operation) logoutPromise = null;
    }
  });
  // Publish the barrier before invalidation emits a synchronous auth event.
  logoutPromise = operation;
  void operation.catch(() => undefined);
  clearAuthToken();
  return operation;
}
