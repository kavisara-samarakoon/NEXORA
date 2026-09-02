export type ProtectionStatus = "ok" | "warn" | "planned";
export type ProtectionIcon =
  | "key"
  | "lock"
  | "device"
  | "eye"
  | "tls"
  | "bolt"
  | "redirect"
  | "gateway";

export type ProtectionItem = {
  id: number;
  icon: ProtectionIcon;
  label: string;
  description: string;
  status: string;
  statusType: ProtectionStatus;
};

export type TimelineEvent = {
  id: number;
  icon: "check" | "warning" | "key" | "lock" | "mail";
  title: string;
  detail: string;
  time: string;
  type: "success" | "warn" | "info";
};

export type SecurityStatusData = {
  securityScore: number;
  status: string;
  activeSessions: number;
  protectedApis: number;
  alertCount: number;
  accountProtection: readonly ProtectionItem[];
  networkProtection: readonly ProtectionItem[];
};

export const accountProtection = [
  {
    id: 1,
    icon: "key",
    label: "Password capability",
    description: "Static capability example — no password state is read",
    status: "Preview",
    statusType: "warn",
  },
  {
    id: 2,
    icon: "lock",
    label: "MFA capability",
    description: "Authenticator setup is not connected in this preview",
    status: "Planned",
    statusType: "warn",
  },
  {
    id: 3,
    icon: "device",
    label: "Session capability",
    description: "Sample session layout — not current device activity",
    status: "Static sample",
    statusType: "warn",
  },
  {
    id: 4,
    icon: "eye",
    label: "Account signal capability",
    description: "Example account signal — monitoring is not connected",
    status: "Not connected",
    statusType: "warn",
  },
] satisfies readonly ProtectionItem[];

export const networkProtection = [
  {
    id: 1,
    icon: "tls",
    label: "HTTPS / TLS planning",
    description: "Deployment transport configuration requires a separate review",
    status: "Planned",
    statusType: "planned",
  },
  {
    id: 2,
    icon: "bolt",
    label: "Rate Limiting",
    description: "Production-scale request controls require a separate design",
    status: "Planned",
    statusType: "planned",
  },
  {
    id: 3,
    icon: "redirect",
    label: "Safe Redirects",
    description: "Store redirect validation is a planned capability",
    status: "Planned",
    statusType: "planned",
  },
  {
    id: 4,
    icon: "gateway",
    label: "API Gateway",
    description: "A deployed gateway is not connected to this local preview",
    status: "Planned",
    statusType: "planned",
  },
] satisfies readonly ProtectionItem[];

export const securityStatus = {
  securityScore: 0,
  status: "Preview",
  activeSessions: 0,
  protectedApis: 0,
  alertCount: 0,
  accountProtection,
  networkProtection,
} satisfies SecurityStatusData;

export const securityTimeline = [
  {
    id: 1,
    icon: "check",
    title: "Sample desktop session",
    detail: "Example device · Example location",
    time: "Static demo entry",
    type: "success",
  },
  {
    id: 2,
    icon: "check",
    title: "Sample mobile session",
    detail: "Example mobile device · Example location",
    time: "Static demo entry",
    type: "success",
  },
  {
    id: 3,
    icon: "warning",
    title: "Demo security event",
    detail: "Example account signal · No real detection occurred",
    time: "Static demo entry",
    type: "warn",
  },
  {
    id: 4,
    icon: "key",
    title: "Example password event",
    detail: "Capability preview · Not account history",
    time: "Static demo entry",
    type: "info",
  },
  {
    id: 5,
    icon: "lock",
    title: "Example MFA event",
    detail: "Capability preview · No authenticator is linked",
    time: "Static demo entry",
    type: "info",
  },
  {
    id: 6,
    icon: "mail",
    title: "Example account signal",
    detail: "Static demo entry · Not a verification record",
    time: "Static demo entry",
    type: "success",
  },
] satisfies readonly TimelineEvent[];
