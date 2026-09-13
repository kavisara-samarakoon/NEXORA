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
  { id: "display-name", label: "Display Name", value: "Guest Preview", icon: "user" },
  { id: "email", label: "Email", value: "Sign in to view account email", icon: "mail" },
  { id: "language", label: "Language", value: "Browser default", icon: "globe" },
  { id: "timezone", label: "Timezone", value: "Local device timezone", icon: "clock" },
] satisfies readonly ProfileField[];

export const notificationPreferences = [
  { id: "deal-alerts", label: "Deal Alerts", description: "Get notified when a tracked game drops in price", enabled: true },
  { id: "giveaway-reminders", label: "Giveaway Reminders", description: "Alerts before free game claim windows close", enabled: true },
  { id: "price-drops", label: "Price Drop Notifications", description: "Push notifications for wishlist price drops", enabled: true },
  { id: "weekly-digest", label: "Weekly Digest Email", description: "Summary of weekly deals and giveaways", enabled: false },
  { id: "security-alerts", label: "Security Alerts", description: "Login attempts and session change notifications", enabled: true },
] satisfies readonly Preference[];

export const securityPreferences = [
  { id: "two-factor", label: "Two-Factor Authentication", description: "Preview-only control; authenticator setup is planned for a later release", enabled: false },
  { id: "login-notifications", label: "Login Notifications", description: "Preview-only control; sign-in alert delivery is planned for a later release", enabled: false },
  { id: "session-timeout", label: "Auto Session Timeout", description: "Preview-only control; inactivity enforcement is planned for a later release", enabled: false },
  { id: "sensitive-value-reminder", label: "Sensitive Value Reminder", description: "Reminder that secrets should never be shown in the interface", enabled: true },
] satisfies readonly Preference[];

export const connectedPlatforms: readonly ConnectedPlatform[] = [
  { id: "steam", name: "Steam", shortName: "ST", connected: false },
  { id: "epic", name: "Epic Games", shortName: "EP", connected: false },
  { id: "gog", name: "GOG", shortName: "GG", connected: false },
  { id: "prime", name: "Prime Gaming", shortName: "PG", connected: false },
];

export const appearancePreferences = [
  { id: "dark-mode", label: "Dark Mode", description: "Use NEXORA's low-light interface", enabled: true },
  { id: "glass-effects", label: "Liquid Glass Effects", description: "Enable translucent panels and ambient glow", enabled: true },
  { id: "orange-accent", label: "Accent Color: NEXORA Orange", description: "Use the NEXORA orange accent for primary controls", enabled: true },
  { id: "compact-mode", label: "Compact Mode", description: "Reduce spacing and card density", enabled: false },
  { id: "animations", label: "Animations", description: "Show interface transitions and status pulses", enabled: true },
] satisfies readonly Preference[];

export const accountSystemStatus = [
  { label: "Profile", value: "Guest preview", badge: "Preview", tone: "blue" },
  { label: "Notifications", value: "Preference preview", badge: "Preview", tone: "green" },
  { label: "Platform Links", value: "Coming soon", badge: "Soon", tone: "orange" },
  { label: "Security", value: "Coming soon", badge: "Soon", tone: "purple" },
] as const;

export const accountOverview = [
  { label: "Account Type", value: "Guest mode" },
  { label: "Member Since", value: "Sign in to view" },
  { label: "Linked Platforms", value: "Coming soon" },
  { label: "Active Alerts", value: "Preview only" },
] as const;
