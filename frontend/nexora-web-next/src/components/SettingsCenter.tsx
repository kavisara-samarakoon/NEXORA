"use client";

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
            <strong>{item.label}</strong>
            <span>{item.description}</span>
          </div>
          <button
            className={`st-switch${values[item.id] ? " st-switch--active" : ""}`}
            type="button"
            role="switch"
            aria-checked={values[item.id]}
            aria-label={`${item.label}: ${values[item.id] ? "on" : "off"}`}
            onClick={() => onToggle(item.id)}
          >
            <span />
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
    setPreferenceMessage("Demo preference updated in this browser view. It was not saved to an account.");
  }

  return (
    <>
      <section className="st-hero" aria-labelledby="settings-title">
        <div className="st-hero__orb st-hero__orb--orange" />
        <div className="st-hero__orb st-hero__orb--purple" />
        <div className="st-hero__scanlines" />
        <div className="st-hero__content">
          <div className="st-hero__tag"><span aria-hidden="true" /> Account control</div>
          <h1 id="settings-title"><span className="page-title-emoji" aria-hidden="true">⚙️</span><strong>Account Control Center</strong></h1>
          <p>Profile preferences, notification settings, security options, and future connected platform management — all in one place.</p>
        </div>
      </section>

      <div className="st-disclaimer">
        <span aria-hidden="true">ℹ️</span>
        <p><strong>Frontend Settings Demo</strong> — Toggles and fields are visual-only. Persistent account settings will be connected to the future NEXORA backend.</p>
      </div>

      {preferenceMessage ? <p className="ux-inline-status st-demo-feedback" role="status">{preferenceMessage}</p> : null}

      <div className="st-layout">
        <div className="st-content">
          <section className="st-card st-profile" aria-labelledby="profile-title">
            <div className="st-profile__identity">
              <div className="st-profile__avatar"><span>KS</span><i aria-hidden="true" /></div>
              <div className="st-profile__copy">
                <small>Static demo profile</small>
                <h2 id="profile-title">Kavisara</h2>
                <p>Demo User <span>•</span> NEXORA Member</p>
              </div>
              <button className="st-outline-button" type="button" disabled title="Profile editing requires the future backend">✏️ Edit Profile</button>
            </div>
            <div className="st-profile__fields">
              {profileFields.map((field) => (
                <div className="st-profile-field" key={field.id}>
                  <span className="st-profile-field__icon" aria-hidden="true"><SettingsGlyph name={field.icon} /></span>
                  <div><small>{field.label}</small><strong>{field.value}</strong></div>
                  <button type="button" disabled title="Editing requires the future backend">Edit</button>
                </div>
              ))}
            </div>
          </section>

          <section className="st-card" aria-labelledby="notifications-title">
            <SectionHeading id="notifications-title" icon="bell" eyebrow="Signal routing" title="Notification Preferences" />
            <PreferenceRows items={notificationPreferences} values={preferences} onToggle={togglePreference} />
          </section>

          <section className="st-card" aria-labelledby="security-preferences-title">
            <SectionHeading id="security-preferences-title" icon="shield" eyebrow="Account hardening" title="Security Preferences" />
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
                  <span className={`st-platform__mark st-platform__mark--${platform.id}`}>{platform.shortName}</span>
                  <div className="st-platform__copy">
                    <h3>{platform.name}</h3>
                    <p>{platform.account ?? "Not connected"}</p>
                  </div>
                  <span className={`st-platform__state${platform.connected ? " st-platform__state--connected" : ""}`}>
                    <i aria-hidden="true" /> {platform.connected ? "Linked" : "Connect"}
                  </span>
                  <button type="button" disabled title="Platform management requires the future backend">
                    {platform.connected ? "Manage" : "Connect"}
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
              <div><strong>Clear NEXORA Data</strong><p>Unavailable in this static settings demo. No account data is changed here.</p></div>
              <button type="button" disabled title="This static demo does not store account data">Clear Data</button>
              <div><strong>Delete Account</strong><p>Unavailable in this static settings demo and requires a separate verified backend workflow.</p></div>
              <button type="button" disabled title="Account deletion requires the future backend">Delete Account</button>
            </div>
          </section>
        </div>

        <aside className="st-status" aria-labelledby="account-status-title">
          <div className="st-status__header">
            <span className="st-status__header-icon" aria-hidden="true">📡</span>
            <div><span>Account telemetry</span><h2 id="account-status-title">Account System Status</h2></div>
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
            <div className="st-overview__label"><span>Account overview</span><strong>NX-01</strong></div>
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
