"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { normalizeAuthError, type AuthUser } from "@/lib/auth";
import {
  AUTH_STATE_EVENT,
  logout,
  readCurrentUser,
} from "@/lib/auth-client";

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: AuthUser }
  | { status: "unavailable"; message: string };

function initialsFor(user: AuthUser): string {
  const initials = user.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (initials || user.username.slice(0, 2)).toUpperCase();
}

export default function AuthStatus() {
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function refreshAuthState() {
      try {
        const user = await readCurrentUser();
        if (!active) return;
        setAuthState(user ? { status: "authenticated", user } : { status: "anonymous" });
      } catch (error) {
        if (!active) return;
        setAuthState({
          status: "unavailable",
          message: normalizeAuthError(error).message,
        });
      }
    }

    function handleAuthChange() {
      void refreshAuthState();
    }

    void refreshAuthState();
    window.addEventListener("storage", handleAuthChange);
    window.addEventListener(AUTH_STATE_EVENT, handleAuthChange);

    return () => {
      active = false;
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener(AUTH_STATE_EVENT, handleAuthChange);
    };
  }, []);

  if (authState.status === "loading") {
    return (
      <div className="auth-status auth-status--loading" role="status" aria-busy="true" aria-label="Checking local account session">
        <span className="auth-status__pulse" aria-hidden="true" />
        <span>Checking session</span>
      </div>
    );
  }

  if (authState.status === "authenticated") {
    const { user } = authState;
    return (
      <div className="auth-status auth-status--authenticated">
        <Link className="auth-status__identity" href="/settings" aria-label={`Open settings for ${user.displayName}`}>
          <span className="auth-status__avatar" aria-hidden="true">{initialsFor(user)}</span>
          <span className="auth-status__user-copy">
            <strong>{user.displayName}</strong>
            <small>@{user.username}</small>
          </span>
        </Link>
        <button
          className="auth-status__logout"
          type="button"
          disabled={isLoggingOut}
          onClick={() => {
            setIsLoggingOut(true);
            void logout()
              .catch(() => {
                // Local state is cleared even when the backend is unavailable.
              })
              .finally(() => {
                setAuthState({ status: "anonymous" });
                setIsLoggingOut(false);
              });
          }}
        >
          {isLoggingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    );
  }

  if (authState.status === "unavailable") {
    return (
      <div
        className="auth-status auth-status--unavailable"
        role="status"
        aria-label={`Local account status unavailable. ${authState.message}`}
        title={authState.message}
      >
        <span className="auth-status__unavailable-copy">Session unavailable</span>
        <Link href="/login">Sign in</Link>
      </div>
    );
  }

  return (
    <nav className="auth-status auth-status--anonymous" aria-label="Account">
      <Link className="auth-status__login" href="/login">Sign in</Link>
      <Link className="auth-status__register" href="/register">Create account</Link>
    </nav>
  );
}
