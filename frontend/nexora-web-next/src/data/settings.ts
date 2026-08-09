export type SettingsIcon =
  | "user"
  | "mail"
  | "globe"
  | "clock"
  | "bell"
  | "shield"
  | "eye"
  | "monitor"
  | "spark";

export type ProfileField = {
  id: string;
  label: string;
  value: string;
  icon: SettingsIcon;
};

export type Preference = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

export type ConnectedPlatform = {
  id: string;
  name: string;
  shortName: string;
  connected: boolean;
  account?: string;
};

export const profileFields = [
  { id: "display-name", label: "Display Name", value: "Kavisara", icon: "user" },
  { id: "email", label: "Email", value: "gamer@nexora.gg", icon: "mail" },
  { id: "language", label: "Language", value: "English (US)", icon: "globe" },
  { id: "timezone", label: "Timezone", value: "Asia/Colombo (UTC+5:30)", icon: "clock" },
] satisfies readonly ProfileField[];

export const notificationPreferences = [
  { id: "deal-alerts", label: "Deal Alerts", description: "Get notified when a tracked game drops in price", enabled: true },
  { id: "giveaway-reminders", label: "Giveaway Reminders", description: "Alerts before free game claim windows close", enabled: true },
  { id: "price-drops", label: "Price Drop Notifications", description: "Push notifications for wishlist price drops", enabled: true },
  { id: "weekly-digest", label: "Weekly Digest Email", description: "Summary of weekly deals and giveaways", enabled: false },
  { id: "security-alerts", label: "Security Alerts", description: "Login attempts and session change notifications", enabled: true },
] satisfies readonly Preference[];

export const securityPreferences = [
  { id: "two-factor", label: "Two-Factor Authentication", description: "Protect your account with an authenticator app", enabled: true },
  { id: "login-notifications", label: "Login Notifications", description: "Alert on new device sign-ins", enabled: true },
  { id: "session-timeout", label: "Auto Session Timeout", description: "End sessions after 30 minutes of inactivity", enabled: false },
  { id: "mask-api-keys", label: "API Key Visibility", description: "Mask API keys throughout the dashboard", enabled: true },
] satisfies readonly Preference[];

export const connectedPlatforms = [
  { id: "steam", name: "Steam", shortName: "ST", connected: true, account: "@kavisara_steam" },
  { id: "epic", name: "Epic Games", shortName: "EP", connected: true, account: "@kavisara_epic" },
  { id: "gog", name: "GOG", shortName: "GG", connected: false },
  { id: "prime", name: "Prime Gaming", shortName: "PG", connected: false },
] satisfies readonly ConnectedPlatform[];

export const appearancePreferences = [
  { id: "dark-mode", label: "Dark Mode", description: "Use NEXORA's low-light interface", enabled: true },
  { id: "glass-effects", label: "Liquid Glass Effects", description: "Enable translucent panels and ambient glow", enabled: true },
  { id: "orange-accent", label: "Accent Color: NEXORA Orange", description: "Use #FF7A00 for primary controls", enabled: true },
  { id: "compact-mode", label: "Compact Mode", description: "Reduce spacing and card density", enabled: false },
  { id: "animations", label: "Animations", description: "Show interface transitions and status pulses", enabled: true },
] satisfies readonly Preference[];

export const accountSystemStatus = [
  { label: "Profile", value: "Demo Mode", badge: "Demo", tone: "blue" },
  { label: "Notifications", value: "UI Ready", badge: "Ready", tone: "green" },
  { label: "Platform Links", value: "Future backend support", badge: "Future", tone: "orange" },
  { label: "Security", value: "Planned session controls", badge: "Planned", tone: "purple" },
] as const;

export const accountOverview = [
  { label: "Account Type", value: "Demo" },
  { label: "Member Since", value: "2025" },
  { label: "Linked Platforms", value: "2 / 4" },
  { label: "Active Alerts", value: "4" },
] as const;
