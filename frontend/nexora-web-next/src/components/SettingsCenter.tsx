"use client";

import Link from "next/link";
import UxStatePanel from "@/components/UxStatePanel";
import { useCinematicSceneControls } from "./CinematicSceneControls";
import { normalizeAuthError, type AuthUser } from "@/lib/auth";
import { AUTH_STATE_EVENT, readCurrentUser } from "@/lib/auth-client";
import { useEffect, useMemo, useState } from "react";
import {
  accountOverview,
  accountSystemStatus,
  appearancePreferences,
  connectedPlatforms,
  notificationPreferences,
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
              <span className="st-setting-pill" aria-label={`${item.label}: ${item.statusLabel ?? "Preview"}`}>
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
  const allPreferences = [...notificationPreferences, ...securityPreferences, ...appearancePreferences];
  const [authState, setAuthState] = useState<SettingsAuthState>({ status: "loading" });
  const [preferences, setPreferences] = useState<Record<string, boolean>>(
    Object.fromEntries(allPreferences.map((item) => [item.id, item.enabled])),
  );
  const [preferenceMessage, setPreferenceMessage] = useState<string | null>(null);
  const { motionPaused, toggleMotion } = useCinematicSceneControls();

  const displayedPreferences = useMemo(
    () => ({ ...preferences, animations: !motionPaused }),
    [motionPaused, preferences],
  );

  useEffect(() => {
    let active = true;

    async function refreshAuthState() {
      try {
        const user = await readCurrentUser();
        if (!active) return;
        setAuthState(user ? { status: "authenticated", user } : { status: "anonymous" });
      } catch (error) {
        if (!active) return;
        setAuthState({ status: "unavailable", message: normalizeAuthError(error).message });
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
        value: "Authenticated local demo session",
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
        badge: "Active",
        tone: "green",
      },
      {
        label: "Notifications",
        value: "Preview controls only",
        badge: "Preview",
        tone: "orange",
      },
      {
        label: "Platform Links",
        value: "Coming soon",
        badge: "Preview",
        tone: "purple",
      },
      {
        label: "Security",
        value: "Local session active",
        badge: "Local",
        tone: "blue",
      },
    ];
  }, [signedInUser]);

  const overviewRows = useMemo(() => {
    if (!signedInUser) return accountOverview;

    return [
      { label: "Account Type", value: "Local demo account" },
      { label: "Display Name", value: signedInUser.displayName },
      { label: "Username", value: `@${signedInUser.username}` },
      { label: "Email", value: signedInUser.email },
      { label: "Saved Settings", value: "Preview only" },
    ];
  }, [signedInUser]);

  function togglePreference(id: string) {
    const item = allPreferences.find((preference) => preference.id === id);
    if (!item || item.interactive === false) return;

    if (id === "animations") {
      const nextAnimationsEnabled = motionPaused;
      toggleMotion();
      setPreferenceMessage(
        nextAnimationsEnabled
          ? "Animations are enabled for this browser."
          : "Animations are paused for this browser.",
      );
      return;
    }

    setPreferences((current) => ({ ...current, [id]: !current[id] }));
    setPreferenceMessage(
      isSignedIn
        ? "Preference updated for this screen. Persistent account settings are not connected yet."
        : "Preference updated for this guest preview only.",
    );
  }

  const heroTitle = isSignedIn ? "Account Control Center" : "Settings Preview";
  const heroTag = isSignedIn ? "Signed-in account" : "Settings preview";
  const heroDescription = isSignedIn
    ? `Viewing the active local demo session for ${signedInUser.displayName}. Profile identity is loaded from the authentication service.`
    : "Explore account preferences and platform layouts in guest mode. Sign in to show your current account identity.";

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

      <UxStatePanel title="Manage saved notification preferences" tone="auth"
        description={isSignedIn
          ? "Your signed-in account can review wishlist notification preferences from the Wishlist workspace."
          : "Sign in to review account-linked notification choices from the Wishlist workspace."}
      >
        <Link className="ux-state__action" href="/wishlist#notification-preferences">Open wishlist preferences</Link>
      </UxStatePanel>

      <div className="st-disclaimer">
        <span aria-hidden="true">ℹ️</span>
        <p>
          {isSignedIn ? (
            <>
              <strong>Signed-in local demo account</strong> — Identity details are loaded from the active authentication session. Preference toggles below remain preview-only until persistent settings workflows are connected.
            </>
          ) : authState.status === "loading" ? (
            <>
              <strong>Checking account session</strong> — NEXORA is checking whether a local demo account is signed in.
            </>
          ) : authState.status === "unavailable" ? (
            <>
              <strong>Account status unavailable</strong> — {authState.message}
            </>
          ) : (
            <>
              <strong>Guest settings preview</strong> — Sign in to show the current account identity. Preference toggles affect this screen only until persistent settings workflows are connected.
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
                <span>{signedInUser ? initialsFor(signedInUser) : "DP"}</span>
                <i />
              </div>
              <div className="st-profile__copy">
                <small>{isSignedIn ? "Active local account" : "Guest preview"}</small>
                <h2 id="profile-title">{signedInUser?.displayName ?? "Guest Preview"}</h2>
                <p>
                  {signedInUser ? `@${signedInUser.username}` : "Example identity"}
                  <span>•</span>
                  {signedInUser?.email ?? "Not signed in"}
                </p>
              </div>
              <button
                className="st-outline-button"
                type="button"
                disabled
                aria-label="Edit profile unavailable in this demo build"
                title="Profile editing is not connected in this demo build"
              >
                ✏️ Edit Profile
              </button>
            </div>
            <div className="st-profile__fields">
              {profileRows.map((field) => (
                <div className="st-profile-field" key={field.id}>
                  <span className="st-profile-field__icon" aria-hidden="true"><SettingsGlyph name={field.icon} /></span>
                  <div><small>{field.label}</small><strong>{field.value}</strong></div>
                  <button type="button" disabled aria-label={`Edit ${field.label} unavailable in this demo build`} title="Editing is not connected in this demo build">Edit</button>
                </div>
              ))}
            </div>
          </section>

          <section className="st-card" aria-labelledby="notifications-title">
            <SectionHeading id="notifications-title" icon="bell" eyebrow={isSignedIn ? "Account preview" : "Preview controls"} title="Notification Preferences" />
            <p className="st-section-note">
              {isSignedIn
                ? "Notification preferences are managed from Wishlist when account notification workflows are available."
                : "Notification controls are shown here as account capability status. Use Wishlist for alert preferences when signed in."}
            </p>
            <PreferenceRows items={notificationPreferences} values={displayedPreferences} onToggle={togglePreference} />
          </section>

          <section className="st-card" aria-labelledby="security-preferences-title">
            <SectionHeading id="security-preferences-title" icon="shield" eyebrow="Capability preview" title="Security Preferences" />
            <p className="st-section-note">Security controls below show planned account-protection capabilities. They are not interactive in this demo build.</p>
            <PreferenceRows items={securityPreferences} values={displayedPreferences} onToggle={togglePreference} />
          </section>

          <section className="st-card" aria-labelledby="platforms-title">
            <SectionHeading id="platforms-title" icon="globe" eyebrow="External network" title="Connected Platforms" />
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
                    <p>{platform.account ?? "Planned — not connected"}</p>
                  </div>
                  <span className={`st-platform__state${platform.connected ? " st-platform__state--connected" : ""}`}>
                    <i aria-hidden="true" /> {platform.connected ? "Demo linked" : "Planned"}
                  </span>
                  <button type="button" disabled aria-label={`${platform.connected ? "Manage" : "Connect"} ${platform.name} unavailable in this demo build`} title="Platform management is not connected in this demo build">
                    {platform.connected ? "Demo only" : "Planned"}
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="st-card" aria-labelledby="appearance-title">
            <SectionHeading id="appearance-title" icon="monitor" eyebrow="Interface system" title="Appearance & Liquid Glass Theme" />
            <PreferenceRows items={appearancePreferences} values={displayedPreferences} onToggle={togglePreference} />
          </section>

          <section className="st-card st-danger" aria-labelledby="danger-title">
            <div className="st-danger__heading">
              <span aria-hidden="true">⚠️</span>
              <div><small>Restricted actions</small><h2 id="danger-title">Danger Zone</h2></div>
            </div>
            <div className="st-danger__actions">
              <div><strong>Clear NEXORA Data</strong><p>Unavailable in this demo build. This control does not change account data.</p></div>
              <button type="button" disabled aria-label="Clear NEXORA data unavailable in this demo build" title="This demo build does not clear account data">Clear Data</button>
              <div><strong>Delete Account</strong><p>Unavailable in this demo build. Account deletion needs a separate verified backend workflow.</p></div>
              <button type="button" disabled aria-label="Delete account unavailable in this demo build" title="Account deletion is not connected in this demo build">Delete Account</button>
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
