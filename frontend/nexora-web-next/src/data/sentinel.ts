export type ChatMessage = {
  id: number;
  role: "user" | "ai";
  segments: readonly { text: string; emphasis?: boolean }[];
};

export type SentinelCapability = {
  id: number;
  icon: "gamepad" | "deal" | "shield" | "lock";
  title: string;
  description: string;
  tone: "blue" | "orange" | "green" | "purple";
};

export const sentinelMessages = [
  {
    id: 1,
    role: "user",
    segments: [{ text: "Find me co-op games under $15" }],
  },
  {
    id: 2,
    role: "ai",
    segments: [
      { text: "I found " },
      { text: "12 co-op games", emphasis: true },
      { text: " under $15 across Steam and Epic Games. Top picks: " },
      { text: "It Takes Two ($9.99)", emphasis: true },
      { text: ", " },
      { text: "Deep Rock Galactic ($7.49)", emphasis: true },
      { text: ", and " },
      { text: "Stardew Valley ($11.99)", emphasis: true },
      { text: ". Want me to add any to your wishlist?" },
    ],
  },
  {
    id: 3,
    role: "user",
    segments: [{ text: "Add It Takes Two to my wishlist and set a price alert for $7" }],
  },
  {
    id: 4,
    role: "ai",
    segments: [
      { text: "Preview complete. " },
      { text: "It Takes Two", emphasis: true },
      { text: " would be added with a target price of " },
      { text: "$7.00", emphasis: true },
      { text: ". Live wishlist actions will require the future backend." },
    ],
  },
] satisfies readonly ChatMessage[];

export const sentinelSuggestions = [
  "Find RPGs under $20",
  "When is the next Steam sale?",
  "Free games this week",
  "Is my account secure?",
  "Compare Elden Ring prices",
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
  { label: "AI Status", value: "Demo Mode", badge: "Demo", tone: "blue", icon: "bot" },
  { label: "Backend", value: "Not Connected Yet", badge: "Offline", tone: "orange", icon: "network" },
  { label: "Gemini API", value: "Future Integration", badge: "Future", tone: "purple", icon: "spark" },
  { label: "Privacy", value: "No real messages saved", badge: "Safe", tone: "green", icon: "lock" },
] as const;
