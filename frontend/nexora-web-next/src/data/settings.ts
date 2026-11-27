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
  interactive?: boolean;
  statusLabel?: string;
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
  {
    id: "deal-alerts",
    label: "Wishlist Price Alerts",
    description: "Persisted price-alert settings and notification choices are managed from Wishlist",
    enabled: true,
    interactive: false,
    statusLabel: "Wishlist",
  },
  {
    id: "giveaway-reminders",
    label: "Giveaway Reminders",
    description: "No persisted giveaway-reminder or notification workflow exists in v0.90",
    enabled: false,
    interactive: false,
    statusLabel: "Planned",
  },
  {
    id: "price-drops",
    label: "Price Drop Notifications",
    description: "Account notification delivery preferences are managed from Wishlist",
    enabled: true,
    interactive: false,
    statusLabel: "Wishlist",
  },
  {
    id: "weekly-digest",
    label: "Weekly Digest Email",
    description: "Email digest delivery is planned for a later release",
    enabled: false,
    interactive: false,
    statusLabel: "Soon",
  },
  {
    id: "security-alerts",
    label: "Security Alerts",
    description: "Security notification delivery is planned for a later release",
    enabled: false,
    interactive: false,
    statusLabel: "Soon",
  },
] satisfies readonly Preference[];

export const securityPreferences = [
  {
    id: "two-factor",
    label: "Two-Factor Authentication",
    description: "Authenticator setup is planned for a later release",
    enabled: false,
    interactive: false,
    statusLabel: "Soon",
  },
  {
    id: "login-notifications",
    label: "Login Notifications",
    description: "Sign-in alert delivery is planned for a later release",
    enabled: false,
    interactive: false,
    statusLabel: "Soon",
  },
  {
    id: "session-timeout",
    label: "Auto Session Timeout",
    description: "Inactivity timeout enforcement is planned for a later release",
    enabled: false,
    interactive: false,
    statusLabel: "Soon",
  },
  {
    id: "sensitive-value-reminder",
    label: "Sensitive Value Reminder",
    description: "NEXORA never asks you to paste passwords, tokens, or private keys into the interface",
    enabled: true,
    interactive: false,
    statusLabel: "Active",
  },
] satisfies readonly Preference[];

export const connectedPlatforms: readonly ConnectedPlatform[] = [
  { id: "steam", name: "Steam", shortName: "ST", connected: false },
  { id: "epic", name: "Epic Games", shortName: "EP", connected: false },
  { id: "gog", name: "GOG", shortName: "GG", connected: false },
  { id: "prime", name: "Prime Gaming", shortName: "PG", connected: false },
];

export const appearancePreferences = [
  {
    id: "dark-mode",
    label: "Dark Mode",
    description: "Display-only: NEXORA uses a dark interface palette across all routes",
    enabled: true,
    interactive: false,
    statusLabel: "Active",
  },
  {
    id: "glass-effects",
    label: "Liquid Glass Effects",
    description: "Device-local: toggle translucent glass blur across NEXORA surfaces",
    enabled: true,
    interactive: true,
  },
  {
    id: "orange-accent",
    label: "NEXORA Orange Accent",
    description: "Display-only: brand accent used across primary actions",
    enabled: true,
    interactive: false,
    statusLabel: "Brand",
  },
  {
    id: "compact-mode",
    label: "Compact Mode",
    description: "Device-local: tighten card spacing in this browser",
    enabled: false,
    interactive: true,
  },
  {
    id: "animations",
    label: "Animations",
    description: "Device-local: pause or resume cinematic motion in this browser",
    enabled: true,
    interactive: true,
  },
] satisfies readonly Preference[];

export const accountSystemStatus = [
  { label: "Profile", value: "Guest preview", badge: "Preview", tone: "blue" },
  { label: "Notifications", value: "Managed in Wishlist", badge: "Wishlist", tone: "green" },
  { label: "Platform Links", value: "Coming soon", badge: "Soon", tone: "orange" },
  { label: "Security", value: "Coming soon", badge: "Soon", tone: "purple" },
] as const;

export const accountOverview = [
  { label: "Account Type", value: "Guest mode" },
  { label: "Member Since", value: "Sign in to view" },
  { label: "Linked Platforms", value: "Coming soon" },
  { label: "Active Alerts", value: "Managed in Wishlist" },
] as const;
