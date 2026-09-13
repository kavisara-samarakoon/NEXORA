export type ChatMessage = {
  id: number;
  role: "user" | "ai";
  segments: readonly ChatMessageSegment[];
};

export type ChatMessageSegment = {
  text: string;
  emphasis?: boolean;
};

export type SentinelCapability = {
  id: number;
  icon: "gamepad" | "deal" | "shield" | "lock";
  title: string;
  description: string;
  tone: "blue" | "orange" | "green" | "purple";
};

export type SentinelSystemStatusItem = {
  label: string;
  value: string;
  badge: string;
  tone: "blue" | "orange" | "green" | "purple";
  icon: "bot" | "network" | "spark" | "lock";
};

export type SentinelStatus = {
  aiStatus: string;
  backend: string;
  geminiApi: string;
  privacy: string;
};

export type SentinelDemoData = {
  messages: readonly ChatMessage[];
  suggestions: readonly string[];
  capabilities: readonly SentinelCapability[];
  systemStatus: readonly SentinelSystemStatusItem[];
};

export const sentinelMessages = [] satisfies readonly ChatMessage[];

export const sentinelSuggestions = [
  "Find co-op games under $15",
  "Compare Elden Ring prices",
  "Show free games this week",
  "Help me set a wishlist alert",
  "Is my gaming account secure?",
] as const;

export const sentinelCapabilities = [
  {
    id: 1,
    icon: "gamepad",
    title: "Game Discovery Assistant",
    description: "Find games by genre, price, platform, or play style across major stores.",
    tone: "blue",
  },
  {
    id: 2,
    icon: "deal",
    title: "Deal Recommendation Support",
    description: "Explore personalized deal suggestions, price insights, and sale guidance.",
    tone: "orange",
  },
  {
    id: 3,
    icon: "shield",
    title: "Account Safety Guidance",
    description: "Review session activity, password strength, and connected-platform safety.",
    tone: "green",
  },
  {
    id: 4,
    icon: "lock",
    title: "Cyber Security Awareness",
    description: "Learn about phishing, safe store redirects, and gaming-account best practices.",
    tone: "purple",
  },
] satisfies readonly SentinelCapability[];

export const sentinelSystemStatus = [
  { label: "Assistant", value: "Local NEXORA guidance", badge: "Local", tone: "blue", icon: "bot" },
  { label: "Backend", value: "Authenticated insight endpoint", badge: "API", tone: "orange", icon: "network" },
  { label: "Provider", value: "Local by default, external optional", badge: "Optional", tone: "purple", icon: "spark" },
  { label: "Privacy", value: "No chat history saved", badge: "Safe", tone: "green", icon: "lock" },
] satisfies readonly SentinelSystemStatusItem[];

export const sentinelStatus = {
  aiStatus: "Local NEXORA guidance",
  backend: "Authenticated insight endpoint",
  geminiApi: "External provider optional",
  privacy: "No chat history saved",
} satisfies SentinelStatus;

export const sentinelDemo = {
  messages: sentinelMessages,
  suggestions: sentinelSuggestions,
  capabilities: sentinelCapabilities,
  systemStatus: sentinelSystemStatus,
} satisfies SentinelDemoData;
