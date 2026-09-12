"use client";

import Link from "next/link";
import UxStatePanel from "@/components/UxStatePanel";
import { useState } from "react";
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
      {items.map((item) => (
        <div className="st-preference" key={item.id}>
          <div className="st-preference__copy">
            <strong id={`setting-${item.id}-label`}>{item.label}</strong>
            <span id={`setting-${item.id}-description`}>{item.description}</span>
          </div>
          <button
            className={`st-switch${values[item.id] ? " st-switch--active" : ""}`}
            type="button"
            role="switch"
            aria-checked={values[item.id]}
            aria-labelledby={`setting-${item.id}-label`}
            aria-describedby={`setting-${item.id}-description`}
            onClick={() => onToggle(item.id)}
          >
            <span aria-hidden="true" />
          </button>
        </div>
      ))}
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
  const [preferences, setPreferences] = useState<Record<string, boolean>>(
    Object.fromEntries(allPreferences.map((item) => [item.id, item.enabled])),
  );
  const [preferenceMessage, setPreferenceMessage] = useState<string | null>(null);

  function togglePreference(id: string) {
    setPreferences((current) => ({ ...current, [id]: !current[id] }));
    setPreferenceMessage("Preview preference updated for this rendered view only. No account setting was saved.");
  }

  return (
    <>
      <section className="st-hero" aria-labelledby="settings-title">
        <div className="st-hero__orb st-hero__orb--orange" />
        <div className="st-hero__orb st-hero__orb--purple" />
        <div className="st-hero__scanlines" />
        <div className="st-hero__content">
          <div className="st-hero__tag"><span aria-hidden="true" /> Settings preview</div>
          <h1 id="settings-title"><span className="page-title-emoji" aria-hidden="true">⚙️</span><strong>Static Settings Preview</strong></h1>
          <p>Explore sample profile, preference, and platform layouts without changing the signed-in account.</p>
        </div>
      </section>

      <UxStatePanel title="Manage saved notification preferences" tone="auth"
        description="Your account’s saved notification choices are available in Wishlist. Sign in there to view or update them.">
        <Link className="ux-state__action" href="/wishlist#notification-preferences">Open wishlist preferences</Link>
      </UxStatePanel>

      <div className="st-disclaimer">
        <span aria-hidden="true">ℹ️</span>
        <p><strong>Static settings preview</strong> — This sample profile is not the signed-in account. Toggles affect this rendered preview only and are not saved or enforced. Profile editing, platform management, and persistent account settings remain unavailable.</p>
      </div>

      {preferenceMessage ? <p className="ux-inline-status st-demo-feedback" role="status">{preferenceMessage}</p> : null}

      <div className="st-layout">
        <div className="st-content">
          <section className="st-card st-profile" aria-labelledby="profile-title">
            <div className="st-profile__identity">
              <div className="st-profile__avatar" aria-hidden="true"><span>DP</span><i /></div>
              <div className="st-profile__copy">
                <small>Static demo profile</small>
                <h2 id="profile-title">Demo Player</h2>
                <p>Example identity <span>•</span> Not the signed-in profile</p>
              </div>
              <button className="st-outline-button" type="button" disabled aria-label="Edit profile unavailable in this static settings preview" title="Profile editing is not connected in this preview">✏️ Edit Profile</button>
            </div>
            <div className="st-profile__fields">
              {profileFields.map((field) => (
                <div className="st-profile-field" key={field.id}>
                  <span className="st-profile-field__icon" aria-hidden="true"><SettingsGlyph name={field.icon} /></span>
                  <div><small>{field.label}</small><strong>{field.value}</strong></div>
                  <button type="button" disabled aria-label={`Edit ${field.label} unavailable in this static settings preview`} title="Editing is not connected in this preview">Edit</button>
                </div>
              ))}
            </div>
          </section>

          <section className="st-card" aria-labelledby="notifications-title">
            <SectionHeading id="notifications-title" icon="bell" eyebrow="Demo controls" title="Notification Preferences" />
            <p className="st-section-note">Static settings preview only — these choices are not saved or enforced.</p>
            <PreferenceRows items={notificationPreferences} values={preferences} onToggle={togglePreference} />
          </section>

          <section className="st-card" aria-labelledby="security-preferences-title">
            <SectionHeading id="security-preferences-title" icon="shield" eyebrow="Capability preview" title="Security Preferences" />
            <p className="st-section-note">Demo controls only — they do not represent active account protection.</p>
            <PreferenceRows items={securityPreferences} values={preferences} onToggle={togglePreference} />
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
                  <button type="button" disabled aria-label={`${platform.connected ? "Manage" : "Connect"} ${platform.name} unavailable in this static settings preview`} title="Platform management is not connected in this preview">
                    {platform.connected ? "Demo only" : "Planned"}
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="st-card" aria-labelledby="appearance-title">
            <SectionHeading id="appearance-title" icon="monitor" eyebrow="Interface system" title="Appearance & Liquid Glass Theme" />
            <PreferenceRows items={appearancePreferences} values={preferences} onToggle={togglePreference} />
          </section>

          <section className="st-card st-danger" aria-labelledby="danger-title">
            <div className="st-danger__heading">
              <span aria-hidden="true">⚠️</span>
              <div><small>Restricted actions</small><h2 id="danger-title">Danger Zone</h2></div>
            </div>
            <div className="st-danger__actions">
              <div><strong>Clear NEXORA Data</strong><p>Unavailable in this static settings preview. This control does not change account data.</p></div>
              <button type="button" disabled aria-label="Clear NEXORA data unavailable in this static settings preview" title="This static preview does not clear account data">Clear Data</button>
              <div><strong>Delete Account</strong><p>Unavailable in this static settings preview. Account deletion needs a separate verified backend workflow.</p></div>
              <button type="button" disabled aria-label="Delete account unavailable in this static settings preview" title="Account deletion is not connected in this preview">Delete Account</button>
            </div>
          </section>
        </div>

        <aside className="st-status" aria-labelledby="account-status-title">
          <div className="st-status__header">
            <span className="st-status__header-icon" aria-hidden="true">📡</span>
            <div><span>Preview summary</span><h2 id="account-status-title">Settings Preview Status</h2></div>
            <span className="st-status__live st-status__live--demo"><i aria-hidden="true" /> Demo</span>
          </div>
          <div className="st-status__items">
            {accountSystemStatus.map((item) => (
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
            <div className="st-overview__label"><span>Demo account overview</span><strong>Sample</strong></div>
            {accountOverview.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}
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
