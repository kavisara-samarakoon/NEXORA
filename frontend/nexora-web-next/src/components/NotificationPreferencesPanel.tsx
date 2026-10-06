"use client";

import { type FormEvent, useEffect, useState } from "react";
import {
  assertAuthSessionRevision,
  isAuthSessionInvalidatedError,
  readAuthSessionRevision,
} from "@/lib/auth-client";
import RequestIdSupportText from "@/components/RequestIdSupportText";
import UxStatePanel, { UxSkeleton } from "@/components/UxStatePanel";
import {
  getMyNotificationPreferences,
  normalizeNotificationPreferenceError,
  updateMyNotificationPreferences,
  withNotificationPreferenceAuthRetry,
  type NotificationPreferences,
} from "@/lib/user-notification-preferences";

type ItemMessage = {
  kind: "success" | "error";
  text: string;
  requestId?: string | null;
};

type NotificationPreferenceLoadState = "idle" | "loading" | "ready" | "error";

// Consumers can remount during token refresh while a save is still pending.
// Keep snapshot invalidation and successful mutation delivery across mounts.
const preferenceDataGeneration = { current: 0 };
const preferenceMutationListeners = new Set<(
  preferences: NotificationPreferences,
  sessionRevision: number,
) => void>();
const pendingPreferenceSaves = new Set<number>();
const preferenceSaveListeners = new Set<(
  pending: boolean,
  sessionRevision: number,
  failure?: ItemMessage,
) => void>();

const notificationPreferenceFields = [
  {
    key: "emailEnabled",
    label: "Email alerts",
    description: "Opt in to the future configured email channel.",
  },
  {
    key: "inAppEnabled",
    label: "In-app / log alerts",
    description: "Keep local product-side notification signals enabled.",
  },
  {
    key: "targetReachedEnabled",
    label: "Target reached",
    description: "Notify when a tracked price reaches its target.",
  },
  {
    key: "priceDropEnabled",
    label: "Price drops",
    description: "Keep price-drop notification intent enabled.",
  },
  {
    key: "freeGameEnabled",
    label: "Free games",
    description: "Keep free-game notification intent enabled.",
  },
] as const satisfies readonly {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}[];

export default function NotificationPreferencesPanel({
  authToken,
  onAuthenticationRequired,
  onTokenChanged,
}: {
  authToken: string;
  onAuthenticationRequired: () => void;
  onTokenChanged: (token: string) => void;
}) {
  const authSessionRevision = readAuthSessionRevision();
  const [loadState, setLoadState] = useState<NotificationPreferenceLoadState>("idle");
  const [savedPreferences, setSavedPreferences] =
    useState<NotificationPreferences | null>(null);
  const [draftPreferences, setDraftPreferences] =
    useState<NotificationPreferences | null>(null);
  const [isSaving, setIsSaving] = useState(() => pendingPreferenceSaves.has(authSessionRevision));
  const [message, setMessage] = useState<ItemMessage | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const sessionRevision = authSessionRevision;
    function applyPreferenceMutation(preferences: NotificationPreferences, mutationRevision: number) {
      if (mutationRevision !== sessionRevision || mutationRevision !== readAuthSessionRevision()) return;
      setSavedPreferences(preferences);
      setDraftPreferences(preferences);
      setLoadState("ready");
      setMessage({ kind: "success", text: "Preferences saved to your account." });
    }
    function applyPreferenceSaveState(pending: boolean, saveRevision: number, failure?: ItemMessage) {
      if (saveRevision !== sessionRevision || saveRevision !== readAuthSessionRevision()) return;
      setIsSaving(pending);
      if (failure) setMessage(failure);
    }
    preferenceMutationListeners.add(applyPreferenceMutation);
    preferenceSaveListeners.add(applyPreferenceSaveState);
    applyPreferenceSaveState(pendingPreferenceSaves.has(sessionRevision), sessionRevision);
    return () => {
      preferenceMutationListeners.delete(applyPreferenceMutation);
      preferenceSaveListeners.delete(applyPreferenceSaveState);
    };
  }, [authToken, authSessionRevision]);

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      const sessionRevision = readAuthSessionRevision();
      const dataGeneration = preferenceDataGeneration.current;
      setLoadState("loading");
      setMessage(null);

      try {
        const result = await withNotificationPreferenceAuthRetry(
          authToken,
          async (activeToken) => {
            try {
              return await getMyNotificationPreferences(activeToken);
            } catch (error) {
              // A superseded 401 must not trigger refresh and clear authentication.
              if (dataGeneration !== preferenceDataGeneration.current) {
                throw new Error("The notification preference snapshot was superseded.");
              }
              throw error;
            }
          },
        );
        if (!active) return;
        assertAuthSessionRevision(result.sessionRevision);
        if (dataGeneration !== preferenceDataGeneration.current) return;
        onTokenChanged(result.token);
        setSavedPreferences(result.value);
        setDraftPreferences(result.value);
        setLoadState("ready");
      } catch (error) {
        if (!active) return;
        if (isAuthSessionInvalidatedError(error) || sessionRevision !== readAuthSessionRevision()) return;
        if (dataGeneration !== preferenceDataGeneration.current) return;
        const details = normalizeNotificationPreferenceError(error);
        if (details.status === 401) {
          onAuthenticationRequired();
          return;
        }
        setLoadState("error");
        setMessage({
          kind: "error",
          text: details.message,
          requestId: details.requestId,
        });
      }
    }

    void loadPreferences();
    return () => {
      active = false;
    };
  }, [authToken, onAuthenticationRequired, onTokenChanged, retryKey]);

  const hasChanges = Boolean(draftPreferences && savedPreferences
    && notificationPreferenceFields.some(
      (field) => draftPreferences[field.key] !== savedPreferences[field.key],
    ));

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftPreferences || !hasChanges || isSaving) return;

    const sessionRevision = readAuthSessionRevision();
    // Acquire synchronously before dispatch: a remount or stale handler cannot
    // start another save in this session, including during an auth retry.
    if (pendingPreferenceSaves.has(sessionRevision)) return;
    pendingPreferenceSaves.add(sessionRevision);
    let saveFailure: ItemMessage | undefined;
    try {
      setIsSaving(true);
      setMessage(null);
      preferenceSaveListeners.forEach((listener) => listener(true, sessionRevision));
      const result = await withNotificationPreferenceAuthRetry(
        authToken,
        (activeToken) => updateMyNotificationPreferences(
          activeToken,
          draftPreferences,
        ),
      );
      assertAuthSessionRevision(result.sessionRevision);
      preferenceDataGeneration.current += 1;
      onTokenChanged(result.token);
      setSavedPreferences(result.value);
      setDraftPreferences(result.value);
      setLoadState("ready");
      setMessage({ kind: "success", text: "Preferences saved to your account." });
      preferenceMutationListeners.forEach((listener) => listener(result.value, result.sessionRevision));
    } catch (error) {
      if (isAuthSessionInvalidatedError(error) || sessionRevision !== readAuthSessionRevision()) return;
      const details = normalizeNotificationPreferenceError(error);
      if (details.status === 401) {
        onAuthenticationRequired();
        return;
      }
      saveFailure = {
        kind: "error",
        text: details.message,
        requestId: details.requestId,
      };
      setMessage(saveFailure);
    } finally {
      pendingPreferenceSaves.delete(sessionRevision);
      if (sessionRevision === readAuthSessionRevision()) setIsSaving(false);
      preferenceSaveListeners.forEach((listener) => listener(false, sessionRevision, saveFailure));
    }
  }

  return (
    <section className="wl-notification-preferences" id="notification-preferences" aria-labelledby="wishlist-notification-preferences-title">
      <div className="wl-notification-preferences__header">
        <div>
          <span>Account controls</span>
          <strong id="wishlist-notification-preferences-title">Notification preferences</strong>
        </div>
        <span className="wl-notification-preferences__badge">Account</span>
      </div>

      {loadState === "loading" && (
        <UxStatePanel
          className="ux-state--compact wl-notification-preferences__state"
          description={<>Waiting for notification preferences stored with this account.<UxSkeleton lines={3} /></>}
          role="status"
          title="Loading notification preferences"
          tone="loading"
        />
      )}

      {loadState === "error" && (
        <UxStatePanel
          className="ux-state--compact wl-notification-preferences__error"
          description={(
            <>
              {message?.text || "The account preference route could not be reached."} Wishlist items and alert settings remain available. Retry preferences starts one manual request.
              <RequestIdSupportText requestId={message?.requestId} />
            </>
          )}
          role="alert"
          title="Notification preferences unavailable"
          tone="unavailable"
        >
          <button className="ux-state__action" type="button" onClick={() => setRetryKey((current) => current + 1)}>
            Retry preferences
          </button>
        </UxStatePanel>
      )}

      {loadState === "ready" && draftPreferences && (
        <form aria-busy={isSaving} onSubmit={savePreferences}>
          <div className="wl-notification-preferences__rows">
            {notificationPreferenceFields.map((field) => (
              <label key={field.key}>
                <span className="wl-notification-preferences__copy">
                  <strong>{field.label}</strong>
                  <small>{field.description}</small>
                </span>
                <input
                  type="checkbox"
                  checked={draftPreferences[field.key]}
                  disabled={isSaving}
                  onChange={(event) => {
                    setDraftPreferences((current) => current
                      ? { ...current, [field.key]: event.target.checked }
                      : current);
                    setMessage(null);
                  }}
                />
                <span className="wl-notification-preferences__toggle" aria-hidden="true">
                  <span />
                </span>
              </label>
            ))}
          </div>

          <p className="wl-notification-preferences__notice">
            These controls save notification intent only. Email delivery is unavailable
            until local SMTP and a recipient workflow are configured; durable retries are not implemented.
          </p>

          <div className="wl-notification-preferences__actions">
            <span
              className={message?.kind === "error"
                ? "wl-notification-preferences__message wl-notification-preferences__message--error"
                : message?.kind === "success"
                  ? "wl-notification-preferences__message wl-notification-preferences__message--success"
                  : "wl-notification-preferences__message"}
              role={message?.kind === "error" ? "alert" : isSaving || message ? "status" : undefined}
            >
              {isSaving ? "Saving preferences to your account…" : message?.text || "Changes are saved only when you use Save."}
              {message?.kind === "error" ? (
                <RequestIdSupportText requestId={message.requestId} />
              ) : null}
            </span>
            <button type="submit" disabled={!hasChanges || isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
