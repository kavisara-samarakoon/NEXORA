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
    label: "Deal Alerts",
    description: "Managed from Wishlist when account notification preferences are available",
    enabled: true,
    interactive: false,
    statusLabel: "Wishlist",
  },
  {
    id: "giveaway-reminders",
    label: "Giveaway Reminders",
    description: "Managed from Wishlist when account notification preferences are available",
    enabled: true,
    interactive: false,
    statusLabel: "Wishlist",
  },
  {
    id: "price-drops",
    label: "Price Drop Notifications",
    description: "Managed from Wishlist when account notification preferences are available",
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
    description: "NEXORA is currently designed as a dark-first gaming interface",
    enabled: true,
    interactive: false,
    statusLabel: "On",
  },
  {
    id: "glass-effects",
    label: "Liquid Glass Effects",
    description: "Glass surfaces are part of the current NEXORA visual system",
    enabled: true,
    interactive: false,
    statusLabel: "Theme",
  },
  {
    id: "orange-accent",
    label: "NEXORA Orange Accent",
    description: "Primary brand accent used across core actions",
    enabled: true,
    interactive: false,
    statusLabel: "Brand",
  },
  {
    id: "compact-mode",
    label: "Compact Mode",
    description: "Density controls are planned for a later release",
    enabled: false,
    interactive: false,
    statusLabel: "Soon",
  },
  {
    id: "animations",
    label: "Animations",
    description: "Pause or resume cinematic motion for this browser",
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
