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

export const accountProtection = [
  {
    id: 1,
    icon: "key",
    label: "Password Security",
    description: "Strong password detected — last changed 45 days ago",
    status: "Secure",
    statusType: "ok",
  },
  {
    id: 2,
    icon: "lock",
    label: "MFA Ready",
    description: "Two-factor authentication via authenticator app",
    status: "Enabled",
    statusType: "ok",
  },
  {
    id: 3,
    icon: "device",
    label: "Session Control",
    description: "2 active sessions across your devices",
    status: "Review",
    statusType: "warn",
  },
  {
    id: 4,
    icon: "eye",
    label: "Suspicious Login Detection",
    description: "Monitors sign-ins from unknown devices and locations",
    status: "Active",
    statusType: "ok",
  },
] satisfies readonly ProtectionItem[];

export const networkProtection = [
  {
    id: 1,
    icon: "tls",
    label: "HTTPS / TLS",
    description: "All API traffic encrypted with TLS 1.3",
    status: "Planned",
    statusType: "planned",
  },
  {
    id: 2,
    icon: "bolt",
    label: "Rate Limiting",
    description: "Request throttling to prevent API abuse",
    status: "Planned",
    statusType: "planned",
  },
  {
    id: 3,
    icon: "redirect",
    label: "Safe Redirects",
    description: "Validated store URLs to prevent phishing redirects",
    status: "Planned",
    statusType: "planned",
  },
  {
    id: 4,
    icon: "gateway",
    label: "API Gateway",
    description: "Centralized gateway with auth, logging, and routing",
    status: "Planned",
    statusType: "planned",
  },
] satisfies readonly ProtectionItem[];

export const securityTimeline = [
  {
    id: 1,
    icon: "check",
    title: "Login from MacBook Pro",
    detail: "Chrome · Colombo, LK",
    time: "2 hours ago",
    type: "success",
  },
  {
    id: 2,
    icon: "check",
    title: "Login from iPhone 15",
    detail: "Safari · Colombo, LK",
    time: "1 day ago",
    type: "success",
  },
  {
    id: 3,
    icon: "warning",
    title: "Unknown device blocked",
    detail: "Firefox · London, UK — flagged by geo-fence",
    time: "3 days ago",
    type: "warn",
  },
  {
    id: 4,
    icon: "key",
    title: "Password changed",
    detail: "Password strength: Strong",
    time: "45 days ago",
    type: "info",
  },
  {
    id: 5,
    icon: "lock",
    title: "MFA enabled",
    detail: "Authenticator app linked",
    time: "60 days ago",
    type: "info",
  },
  {
    id: 6,
    icon: "mail",
    title: "Email verified",
    detail: "gamer@nexora.gg confirmed",
    time: "90 days ago",
    type: "success",
  },
] satisfies readonly TimelineEvent[];
