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
  const [loadState, setLoadState] = useState<NotificationPreferenceLoadState>("idle");
  const [savedPreferences, setSavedPreferences] =
    useState<NotificationPreferences | null>(null);
  const [draftPreferences, setDraftPreferences] =
    useState<NotificationPreferences | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<ItemMessage | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      const sessionRevision = readAuthSessionRevision();
      setLoadState("loading");
      setMessage(null);

      try {
        const result = await withNotificationPreferenceAuthRetry(
          authToken,
          getMyNotificationPreferences,
        );
        if (!active) return;
        assertAuthSessionRevision(result.sessionRevision);
        onTokenChanged(result.token);
        setSavedPreferences(result.value);
        setDraftPreferences(result.value);
        setLoadState("ready");
      } catch (error) {
        if (!active) return;
        if (isAuthSessionInvalidatedError(error) || sessionRevision !== readAuthSessionRevision()) return;
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
    setIsSaving(true);
    setMessage(null);
    try {
      const result = await withNotificationPreferenceAuthRetry(
        authToken,
        (activeToken) => updateMyNotificationPreferences(
          activeToken,
          draftPreferences,
        ),
      );
      assertAuthSessionRevision(result.sessionRevision);
      onTokenChanged(result.token);
      setSavedPreferences(result.value);
      setDraftPreferences(result.value);
      setMessage({ kind: "success", text: "Preferences saved to your account." });
    } catch (error) {
      if (isAuthSessionInvalidatedError(error) || sessionRevision !== readAuthSessionRevision()) return;
      const details = normalizeNotificationPreferenceError(error);
      if (details.status === 401) {
        onAuthenticationRequired();
        return;
      }
      setMessage({
        kind: "error",
        text: details.message,
        requestId: details.requestId,
      });
    } finally {
      setIsSaving(false);
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
