"use client";

import Link from "next/link";
import NotificationPreferencesPanel from "@/components/NotificationPreferencesPanel";
import RequestIdSupportText from "@/components/RequestIdSupportText";
import UxStatePanel from "@/components/UxStatePanel";
import { normalizeAuthError, updateDisplayName, type AuthUser } from "@/lib/auth";
import {
  assertAuthSessionRevision,
  AUTH_STATE_EVENT,
  clearAuthToken,
  isAuthSessionInvalidatedError,
  readAuthSessionRevision,
  readAuthToken,
  readCurrentUser,
  updateSignedInUserCache,
  withAuthSessionRetry,
} from "@/lib/auth-client";
import {
  getServerDevicePreferencesSnapshot,
  isDevicePreferenceId,
  readStoredDevicePreferencesSnapshot,
  setDevicePreferenceFlag,
  toggleDeviceMotionPause,
  subscribeDevicePreferences,
} from "@/lib/device-preferences";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  accountOverview,
  accountSystemStatus,
  appearancePreferences,
  connectedPlatforms,
  profileFields,
  securityPreferences,
  type Preference,
  type SettingsIcon,
} from "@/data/settings";

type SettingsAuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: AuthUser }
  | { status: "unavailable"; message: string };

type ProfileRow = {
  id: string;
  label: string;
  value: string;
  icon: SettingsIcon;
};

type StatusRow = {
  label: "Profile" | "Notifications" | "Platform Links" | "Security";
  value: string;
  badge: string;
  tone: "blue" | "orange" | "purple" | "green";
};

function SettingsGlyph({ name }: { name: SettingsIcon }) {
  if (name === "user") return "👤";
  if (name === "mail") return "📧";
  if (name === "globe") return "🌐";
  if (name === "clock") return "🕒";
  if (name === "bell") return "🔔";
  if (name === "shield") return "🔐";
  if (name === "eye") return "👁️";
  if (name === "monitor") return "🎨";
  return "✨";
}

const accountStatusIcons = {
  Profile: "👤",
  Notifications: "🔔",
  "Platform Links": "🔗",
  Security: "🛡️",
} as const;

function initialsFor(user: AuthUser): string {
  const initials = user.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (initials || user.username.slice(0, 2)).toUpperCase();
}

function PreferenceRows({
  items,
  values,
  onToggle,
}: {
  items: readonly Preference[];
  values: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="st-preferences">
      {items.map((item) => {
        const isInteractive = item.interactive !== false;
        const checked = values[item.id] ?? item.enabled;

        return (
          <div className={`st-preference${isInteractive ? "" : " st-preference--readonly"}`} key={item.id}>
            <div className="st-preference__copy">
              <strong id={`setting-${item.id}-label`}>{item.label}</strong>
              <span id={`setting-${item.id}-description`}>{item.description}</span>
            </div>

            {isInteractive ? (
              <button
                className={`st-switch${checked ? " st-switch--active" : ""}`}
                type="button"
                role="switch"
                aria-checked={checked}
                aria-labelledby={`setting-${item.id}-label`}
                aria-describedby={`setting-${item.id}-description`}
                onClick={() => onToggle(item.id)}
              >
                <span aria-hidden="true" />
              </button>
            ) : (
              <span className="st-setting-pill">
                <span>{item.statusLabel ?? "Preview"}</span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionHeading({ id, icon, eyebrow, title }: { id: string; icon: SettingsIcon; eyebrow: string; title: string }) {
  return (
    <div className="st-section-heading">
      <span className="st-section-heading__icon" aria-hidden="true"><SettingsGlyph name={icon} /></span>
      <div><small>{eyebrow}</small><h2 id={id}>{title}</h2></div>
    </div>
  );
}

export default function SettingsCenter() {
  const consumerSessionRevision = readAuthSessionRevision();
  const consumerLifetimeRef = useRef({ active: false });
  const consumerLifetime = consumerLifetimeRef.current;
  const displayNameOpOwner = useRef<object | null>(null);
  const allPreferences = [...securityPreferences, ...appearancePreferences];
  const [authState, setAuthState] = useState<SettingsAuthState>({ status: "loading" });
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(allPreferences.map((item) => [item.id, item.enabled])),
  );
  const devicePreferences = useSyncExternalStore(
    subscribeDevicePreferences,
    readStoredDevicePreferencesSnapshot,
    getServerDevicePreferencesSnapshot,
  );
  const compactSaved = devicePreferences.compactMode;
  const glassSaved = devicePreferences.glassEffects;
  const [preferenceMessage, setPreferenceMessage] = useState<string | null>(null);
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    kind: "success" | "error";
    text: string;
    requestId?: string | null;
  } | null>(null);
  const { motionPaused, reducedMotion } = devicePreferences;

  useEffect(() => {
    const lifetime = { active: true };
    consumerLifetimeRef.current = lifetime;
    return () => {
      lifetime.active = false;
      displayNameOpOwner.current = null;
    };
  }, []);

  const displayedPreferences = useMemo(
    () => ({
      ...preferences,
      "compact-mode": compactSaved,
      "glass-effects": glassSaved,
      animations: !motionPaused,
    }),
    [compactSaved, glassSaved, motionPaused, preferences],
  );

  useEffect(() => {
    let active = true;
    let requestVersion = 0;

    async function refreshAuthState() {
      const version = ++requestVersion;
      const sessionRevision = readAuthSessionRevision();
      try {
        const user = await readCurrentUser();
        if (!active || version !== requestVersion || sessionRevision !== readAuthSessionRevision()) return;

        if (user) {
          const token = readAuthToken();
          setAuthToken(token);
          setAuthState(token
            ? { status: "authenticated", user }
            : { status: "anonymous" });
          if (!token) {
            setEditingDisplayName(false);
            setDisplayNameDraft("");
            setDisplayNameSaving(false);
            displayNameOpOwner.current = null;
          }
        } else {
          setAuthToken(null);
          setAuthState({ status: "anonymous" });
          setEditingDisplayName(false);
          setDisplayNameDraft("");
          setDisplayNameSaving(false);
          displayNameOpOwner.current = null;
        }
      } catch (error) {
        if (!active || version !== requestVersion || sessionRevision !== readAuthSessionRevision()) return;
        setAuthToken(null);
        setAuthState({ status: "unavailable", message: normalizeAuthError(error).message });
        setEditingDisplayName(false);
        setDisplayNameSaving(false);
        displayNameOpOwner.current = null;
      }
    }

    function handleAuthChange() {
      displayNameOpOwner.current = null;
      setDisplayNameSaving(false);
      setProfileMessage(null);
      void refreshAuthState();
    }

    void refreshAuthState();
    window.addEventListener("storage", handleAuthChange);
    window.addEventListener(AUTH_STATE_EVENT, handleAuthChange);

    return () => {
      active = false;
      requestVersion += 1;
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener(AUTH_STATE_EVENT, handleAuthChange);
    };
  }, []);

  const signedInUser = authState.status === "authenticated" ? authState.user : null;
  const isSignedIn = signedInUser !== null;

  const profileRows = useMemo<ProfileRow[]>(() => {
    if (!signedInUser) return profileFields;

    return [
      {
        id: "display-name",
        label: "Display Name",
        value: signedInUser.displayName,
        icon: "user",
      },
      {
        id: "username",
        label: "Username",
        value: `@${signedInUser.username}`,
        icon: "user",
      },
      {
        id: "email",
        label: "Email",
        value: signedInUser.email,
        icon: "mail",
      },
      {
        id: "session",
        label: "Session",
        value: "Authenticated account session",
        icon: "shield",
      },
    ];
  }, [signedInUser]);

  const statusRows = useMemo<readonly StatusRow[]>(() => {
    if (!signedInUser) return accountSystemStatus;

    return [
      {
        label: "Profile",
        value: `Signed in as @${signedInUser.username}`,
        badge: "Account",
        tone: "green",
      },
      {
        label: "Notifications",
        value: "Account preferences saved",
        badge: "Account",
        tone: "green",
      },
      {
        label: "Platform Links",
        value: "Planned integration",
        badge: "Planned",
        tone: "purple",
      },
      {
        label: "Security",
        value: "Cookie + Bearer auth active",
        badge: "Active",
        tone: "blue",
      },
    ];
  }, [signedInUser]);

  const overviewRows = useMemo(() => {
    if (!signedInUser) return accountOverview;

    return [
      { label: "Account Type", value: "Registered account" },
      { label: "Display Name", value: signedInUser.displayName },
      { label: "Username", value: `@${signedInUser.username}` },
      { label: "Email", value: signedInUser.email },
      { label: "Device UI Settings", value: "Browser localStorage" },
    ];
  }, [signedInUser]);

  function openDisplayNameEditor() {
    if (!signedInUser) return;
    setDisplayNameDraft(signedInUser.displayName);
    setProfileMessage(null);
    setEditingDisplayName(true);
  }

  async function handleDisplayNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lifetime = consumerLifetimeRef.current;
    const sessionRevision = consumerSessionRevision;
    if (
      !lifetime.active ||
      sessionRevision !== readAuthSessionRevision() ||
      !authToken ||
      !signedInUser ||
      displayNameSaving
    ) {
      return;
    }

    const trimmed = displayNameDraft.trim();
    if (trimmed.length === 0 || trimmed.length > 100) {
      setProfileMessage({
        kind: "error",
        text: "Display name must be between 1 and 100 characters.",
      });
      return;
    }

    const opOwner = {};
    displayNameOpOwner.current = opOwner;
    const isCurrent = () =>
      lifetime.active &&
      displayNameOpOwner.current === opOwner &&
      sessionRevision === readAuthSessionRevision();

    setDisplayNameSaving(true);
    setProfileMessage(null);

    try {
      const result = await withAuthSessionRetry(
        authToken,
        (activeToken) => updateDisplayName(activeToken, trimmed),
        (error) => normalizeAuthError(error).status === 401,
        { sessionRevision, isCurrent },
      );
      if (!isCurrent()) return;
      assertAuthSessionRevision(result.sessionRevision);
      const cached = updateSignedInUserCache(result.value, result.sessionRevision);
      if (!cached || !isCurrent()) return;

      setAuthToken(result.token);
      setAuthState({ status: "authenticated", user: result.value });
      setEditingDisplayName(false);
      setProfileMessage({
        kind: "success",
        text: `Display name updated to "${result.value.displayName}" and saved to your account.`,
      });
    } catch (error) {
      if (
        !isCurrent() ||
        isAuthSessionInvalidatedError(error) ||
        sessionRevision !== readAuthSessionRevision()
      ) {
        return;
      }
      const details = normalizeAuthError(error);
      if (details.status === 401) {
        clearAuthToken();
        setAuthToken(null);
        setAuthState({ status: "anonymous" });
        setEditingDisplayName(false);
      } else {
        setProfileMessage({
          kind: "error",
          text: details.message,
          requestId: details.requestId,
        });
      }
    } finally {
      if (displayNameOpOwner.current === opOwner) {
        displayNameOpOwner.current = null;
      }
      if (lifetime.active && sessionRevision === readAuthSessionRevision()) {
        setDisplayNameSaving(false);
      }
    }
  }

  function togglePreference(id: string) {
    const item = allPreferences.find((preference) => preference.id === id);
    if (!item || item.interactive === false) return;

    if (id === "animations") {
      const nextAnimationsEnabled = motionPaused;
      const persisted = toggleDeviceMotionPause();
      setPreferenceMessage(
        persisted
          ? nextAnimationsEnabled
            ? reducedMotion
              ? "Device-local setting saved. Your system reduced motion preference is still active."
              : "Device-local setting saved: animations enabled in this browser."
            : "Device-local setting saved: animations paused in this browser."
          : `Device-local setting applied for this session only (${item.label} ${nextAnimationsEnabled ? "enabled" : "paused"}); browser storage could not persist it across reloads.`,
      );
      return;
    }

    if (isDevicePreferenceId(id)) {
      const currentValue = id === "compact-mode" ? compactSaved : glassSaved;
      const nextValue = !currentValue;
      const { persisted } = setDevicePreferenceFlag(id, nextValue);
      setPreferenceMessage(
        persisted
          ? `Device-local preference saved in this browser: ${item.label} ${nextValue ? "enabled" : "disabled"}.`
          : `Device-local preference applied for this session only (${item.label} ${nextValue ? "enabled" : "disabled"}); browser storage could not persist it across reloads.`,
      );
      return;
    }

    setPreferences((current) => {
      const nextValue = !current[id];
      const next = { ...current, [id]: nextValue };
      setPreferenceMessage(
        `Session preference updated: ${item.label} ${nextValue ? "enabled" : "disabled"}.`,
      );
      return next;
    });
  }

  const handleNotificationAuthenticationRequired = useCallback(() => {
    if (!consumerLifetime.active || consumerSessionRevision !== readAuthSessionRevision()) {
      return;
    }
    clearAuthToken();
    setAuthToken(null);
    setAuthState({ status: "anonymous" });
  }, [consumerLifetime, consumerSessionRevision]);

  const heroTitle = isSignedIn ? "Account Control Center" : "Settings Preview";
  const heroTag = isSignedIn ? "Signed-in account" : "Settings preview";
  const heroDescription = isSignedIn
    ? `Managing account identity, saved notifications, and device-local interface preferences for ${signedInUser.displayName}.`
    : "Explore device-local appearance settings and inspect account controls. Sign in to edit your profile and saved notification preferences.";

  return (
    <>
      <section className="st-hero" aria-labelledby="settings-title">
        <div className="st-hero__orb st-hero__orb--orange" />
        <div className="st-hero__orb st-hero__orb--purple" />
        <div className="st-hero__scanlines" />
        <div className="st-hero__content">
          <div className="st-hero__tag"><span aria-hidden="true" /> {heroTag}</div>
          <h1 id="settings-title"><span className="page-title-emoji" aria-hidden="true">⚙️</span><strong>{heroTitle}</strong></h1>
          <p>{heroDescription}</p>
        </div>
      </section>

      {!isSignedIn && authState.status !== "loading" && (
        <UxStatePanel
          title="Sign in to manage notification preferences"
          tone="auth"
          description="Account-linked notification preferences can be loaded and saved directly from Settings after you sign in."
        >
          <Link className="ux-state__action" href="/login?returnTo=%2Fsettings">Sign in</Link>
          <Link className="ux-state__action ux-state__action--quiet" href="/register?returnTo=%2Fsettings">Register</Link>
        </UxStatePanel>
      )}

      <div className="st-disclaimer">
        <span aria-hidden="true">ℹ️</span>
        <p>
          {isSignedIn ? (
            <>
              <strong>Signed-in account</strong> — Display name and notification preferences persist to your account. Appearance toggles (animations, glass blur, compact mode) persist locally in this browser. Controls marked Planned or Unsupported do not alter backend data.
            </>
          ) : authState.status === "loading" ? (
            <>
              <strong>Checking account session</strong> — NEXORA is checking your authentication session.
            </>
          ) : authState.status === "unavailable" ? (
            <>
              <strong>Account status unavailable</strong> — {authState.message}
            </>
          ) : (
            <>
              <strong>Guest settings view</strong> — Browser-local appearance toggles work immediately. Sign in to edit your account display name and saved notification preferences.
            </>
          )}
        </p>
      </div>

      {preferenceMessage ? <p className="ux-inline-status st-demo-feedback" role="status">{preferenceMessage}</p> : null}

      <div className="st-layout">
        <div className="st-content">
          <section className="st-card st-profile" aria-labelledby="profile-title">
            <div className="st-profile__identity">
              <div className="st-profile__avatar" aria-hidden="true">
                <span>{signedInUser ? initialsFor(signedInUser) : "GP"}</span>
                <i />
              </div>
              <div className="st-profile__copy">
                <small>{isSignedIn ? "Account persisted identity" : "Guest view"}</small>
                <h2 id="profile-title">{signedInUser?.displayName ?? "Guest Preview"}</h2>
                <p>
                  {signedInUser ? `@${signedInUser.username}` : "Not signed in"}
                  <span>•</span>
                  {signedInUser?.email ?? "Sign in to load email"}
                </p>
              </div>
              {isSignedIn ? (
                <button
                  className={editingDisplayName ? "st-outline-button st-outline-button--active" : "st-outline-button"}
                  type="button"
                  onClick={() => (editingDisplayName ? setEditingDisplayName(false) : openDisplayNameEditor())}
                >
                  {editingDisplayName ? "Cancel edit" : "Edit Display Name"}
                </button>
              ) : (
                <Link className="st-outline-button" href="/login?returnTo=%2Fsettings">
                  Sign in to edit
                </Link>
              )}
            </div>

            {isSignedIn && editingDisplayName && (
              <form className="st-profile-edit" onSubmit={(event) => void handleDisplayNameSubmit(event)}>
                <label htmlFor="settings-display-name">Account display name (persisted in backend)</label>
                <div className="st-profile-edit__row">
                  <input
                    id="settings-display-name"
                    type="text"
                    maxLength={100}
                    required
                    value={displayNameDraft}
                    onChange={(event) => setDisplayNameDraft(event.target.value)}
                  />
                  <div className="st-profile-edit__actions">
                    <button className="st-outline-button st-outline-button--active" type="submit" disabled={displayNameSaving}>
                      {displayNameSaving ? "Saving…" : "Save Display Name"}
                    </button>
                    <button
                      className="st-outline-button"
                      type="button"
                      disabled={displayNameSaving}
                      onClick={() => setEditingDisplayName(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}

            {profileMessage && (
              <p className="ux-inline-status st-demo-feedback" role={profileMessage.kind === "error" ? "alert" : "status"}>
                {profileMessage.text}
                {profileMessage.kind === "error" ? (
                  <RequestIdSupportText requestId={profileMessage.requestId} />
                ) : null}
              </p>
            )}

            <div className="st-profile__fields">
              {profileRows.map((field) => (
                <div className="st-profile-field" key={field.id}>
                  <span className="st-profile-field__icon" aria-hidden="true"><SettingsGlyph name={field.icon} /></span>
                  <div><small>{field.label}</small><strong>{field.value}</strong></div>
                  {isSignedIn && field.id === "display-name" ? (
                    <button type="button" onClick={openDisplayNameEditor}>
                      Edit
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      aria-label={`${field.label} is read-only`}
                      title="Immutable identity field"
                    >
                      Read-only
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="st-card" aria-labelledby="notifications-title">
            <SectionHeading
              id="notifications-title"
              icon="bell"
              eyebrow={isSignedIn ? "Account controls" : "Account preferences"}
              title="Notification Preferences"
            />
            <p className="st-section-note">
              {isSignedIn
                ? "Review and save the notification preferences stored with your NEXORA account."
                : "Sign in to load and manage notification preferences stored with your NEXORA account."}
            </p>

            {isSignedIn && authToken ? (
              <NotificationPreferencesPanel
                authToken={authToken}
                onAuthenticationRequired={handleNotificationAuthenticationRequired}
                onTokenChanged={setAuthToken}
              />
            ) : authState.status === "loading" ? (
              <UxStatePanel
                title="Loading account preferences"
                tone="loading"
                role="status"
                description="NEXORA is checking the current account session before loading notification preferences."
              />
            ) : authState.status === "unavailable" ? (
              <UxStatePanel
                title="Notification preferences unavailable"
                tone="unavailable"
                role="status"
                description={authState.message}
              />
            ) : (
              <UxStatePanel
                title="Sign in to manage notification preferences"
                tone="auth"
                description="Saved notification preferences belong to your account and are unavailable in guest preview mode."
              >
                <Link className="ux-state__action" href="/login?returnTo=%2Fsettings">Sign in</Link>
              </UxStatePanel>
            )}
          </section>

          <section className="st-card" aria-labelledby="security-preferences-title">
            <SectionHeading id="security-preferences-title" icon="shield" eyebrow="Planned controls" title="Security Preferences" />
            <p className="st-section-note">Planned: additional account-protection workflows (two-factor authentication and session timeout policies) are not yet implemented.</p>
            <PreferenceRows items={securityPreferences} values={displayedPreferences} onToggle={togglePreference} />
          </section>

          <section className="st-card" aria-labelledby="platforms-title">
            <SectionHeading id="platforms-title" icon="globe" eyebrow="Planned integrations" title="Connected Platforms" />
            <div className="st-platforms">
              {connectedPlatforms.map((platform) => (
                <article
                  className={`st-platform st-platform--${platform.id}${platform.connected ? " st-platform--connected" : ""}`}
                  key={platform.id}
                >
                  <span className={`st-platform__accent st-platform__accent--${platform.id}`} aria-hidden="true" />
                  <span className={`st-platform__mark st-platform__mark--${platform.id}`} aria-hidden="true">{platform.shortName}</span>
                  <div className="st-platform__copy">
                    <h3>{platform.name}</h3>
                    <p>{platform.account ?? "Planned — external account linking not yet implemented"}</p>
                  </div>
                  <span className={`st-platform__state${platform.connected ? " st-platform__state--connected" : ""}`}>
                    <i aria-hidden="true" /> {platform.connected ? "Linked" : "Planned"}
                  </span>
                  <button type="button" disabled aria-label={`${platform.name} linking is planned`} title="Platform account linking is planned for a later release">
                    Planned
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="st-card" aria-labelledby="appearance-title">
            <SectionHeading id="appearance-title" icon="monitor" eyebrow="Device-local & display" title="Appearance & Liquid Glass Theme" />
            <PreferenceRows items={appearancePreferences} values={displayedPreferences} onToggle={togglePreference} />
          </section>

          <section className="st-card st-danger" aria-labelledby="danger-title">
            <div className="st-danger__heading">
              <span aria-hidden="true">⚠️</span>
              <div><small>Unsupported actions</small><h2 id="danger-title">Danger Zone</h2></div>
            </div>
            <div className="st-danger__actions">
              <div><strong>Clear NEXORA Data</strong><p>Unsupported: no bulk account-data purge endpoint exists yet.</p></div>
              <button type="button" disabled aria-label="Clear NEXORA data unsupported" title="Bulk account data deletion is not supported yet">Unsupported</button>
              <div><strong>Delete Account</strong><p>Unsupported: self-service account deletion requires a dedicated verification workflow.</p></div>
              <button type="button" disabled aria-label="Delete account unsupported" title="Self-service account deletion is not supported yet">Unsupported</button>
            </div>
          </section>
        </div>

        <aside className="st-status" aria-labelledby="account-status-title">
          <div className="st-status__header">
            <span className="st-status__header-icon" aria-hidden="true">📡</span>
            <div>
              <span>{isSignedIn ? "Session summary" : "Preview summary"}</span>
              <h2 id="account-status-title">{isSignedIn ? "Account Session Status" : "Account Status"}</h2>
            </div>
            <span className="st-status__live st-status__live--demo">
              <i aria-hidden="true" /> {isSignedIn ? "Active" : "Preview"}
            </span>
          </div>
          <div className="st-status__items">
            {statusRows.map((item) => (
              <div className="st-status__item" key={item.label}>
                <span className={`st-status__item-icon st-status__item-icon--${item.tone}`} aria-hidden="true">
                  {accountStatusIcons[item.label]}
                </span>
                <div><strong>{item.label}</strong><small>{item.value}</small></div>
                <span className={`st-status__badge st-status__badge--${item.tone}`}>{item.badge}</span>
              </div>
            ))}
          </div>
          <div className="st-overview">
            <div className="st-overview__label">
              <span>{isSignedIn ? "Account overview" : "Guest account overview"}</span>
              <strong>{isSignedIn ? "Live session" : "Sample"}</strong>
            </div>
            {overviewRows.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}
          </div>
          <div className="st-status__network" aria-hidden="true">
            <span /><span /><span /><span /><span />
            <i /><i /><i /><i />
          </div>
        </aside>
      </div>
    </>
  );
}
