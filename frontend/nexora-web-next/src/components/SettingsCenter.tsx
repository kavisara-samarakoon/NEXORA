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
  if (name === "user") return <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
  if (name === "mail") return <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>;
  if (name === "globe") return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>;
  if (name === "clock") return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
  if (name === "bell") return <svg viewBox="0 0 24 24"><path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7ZM10 20h4" /></svg>;
  if (name === "shield") return <svg viewBox="0 0 24 24"><path d="M12 3 5 7v5c0 4 2.7 7.1 7 9 4.3-1.9 7-5 7-9V7zM9 12l2 2 4-4" /></svg>;
  if (name === "eye") return <svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
  if (name === "monitor") return <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>;
  return <svg viewBox="0 0 24 24"><path d="m12 2 1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5zM19 17l.6 2.4L22 20l-2.4.6L19 23l-.6-2.4L16 20l2.4-.6z" /></svg>;
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

  function togglePreference(id: string) {
    setPreferences((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <>
      <section className="st-hero" aria-labelledby="settings-title">
        <div className="st-hero__orb st-hero__orb--orange" />
        <div className="st-hero__orb st-hero__orb--blue" />
        <div className="st-hero__grid" />
        <div className="st-hero__content">
          <div className="st-hero__tag"><span aria-hidden="true" /> Account control</div>
          <h1 id="settings-title">Account Control Center</h1>
          <p>Profile preferences, notification settings, security options, and future connected platform management — all in one place.</p>
        </div>
      </section>

      <div className="st-disclaimer">
        <span aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg></span>
        <p><strong>Frontend Settings Demo</strong> — Toggles and fields are visual-only. Persistent account settings will be connected to the future NEXORA backend.</p>
      </div>

      <div className="st-layout">
        <div className="st-content">
          <section className="st-card st-profile" aria-labelledby="profile-title">
            <div className="st-profile__identity">
              <div className="st-profile__avatar"><span>KS</span><i aria-hidden="true" /></div>
              <div className="st-profile__copy">
                <small>Secure demo profile</small>
                <h2 id="profile-title">Kavisara</h2>
                <p>Demo User <span>•</span> NEXORA Member</p>
              </div>
              <button className="st-outline-button" type="button" disabled title="Profile editing requires the future backend">Edit Profile</button>
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
                <article className={`st-platform${platform.connected ? " st-platform--connected" : ""}`} key={platform.id}>
                  <span className={`st-platform__mark st-platform__mark--${platform.id}`}>{platform.shortName}</span>
                  <div className="st-platform__copy">
                    <h3>{platform.name}</h3>
                    <p>{platform.account ?? "Not connected"}</p>
                  </div>
                  <span className={`st-platform__state${platform.connected ? " st-platform__state--connected" : ""}`}>
                    <i aria-hidden="true" /> {platform.connected ? "Linked" : "Offline"}
                  </span>
                  <button type="button" disabled title="Platform management requires the future backend">
                    {platform.connected ? "Manage" : "Connect"}
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="st-card" aria-labelledby="appearance-title">
            <SectionHeading id="appearance-title" icon="monitor" eyebrow="Interface system" title="Appearance & Theme" />
            <PreferenceRows items={appearancePreferences} values={preferences} onToggle={togglePreference} />
          </section>

          <section className="st-card st-danger" aria-labelledby="danger-title">
            <div className="st-danger__heading">
              <span aria-hidden="true">!</span>
              <div><small>Restricted actions</small><h2 id="danger-title">Danger Zone</h2></div>
            </div>
            <div className="st-danger__actions">
              <div><strong>Clear NEXORA Data</strong><p>Remove local alerts, wishlist entries, and demo preferences.</p></div>
              <button type="button" disabled title="This static demo does not store account data">Clear Data</button>
              <div><strong>Delete Account</strong><p>Permanently remove your profile after backend verification.</p></div>
              <button type="button" disabled title="Account deletion requires the future backend">Delete Account</button>
            </div>
          </section>
        </div>

        <aside className="st-status" aria-labelledby="account-status-title">
          <div className="st-status__header">
            <span className="st-status__header-icon" aria-hidden="true"><SettingsGlyph name="user" /></span>
            <div><span>Account telemetry</span><h2 id="account-status-title">System Status</h2></div>
            <span className="st-status__live"><i aria-hidden="true" /> Online</span>
          </div>
          <div className="st-status__items">
            {accountSystemStatus.map((item) => (
              <div className="st-status__item" key={item.label}>
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
