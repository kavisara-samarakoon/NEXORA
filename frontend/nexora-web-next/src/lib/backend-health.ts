import { buildApiUrl } from "@/lib/api-client";

export type BackendHealth = {
  status: string;
  service: string;
  milestone: string;
  version: string;
  runtimeMode: string;
  activeProfiles: readonly string[];
  dataMode: string;
  externalProviders: Record<string, string>;
  checks: Record<string, string>;
  uptimeSeconds: number;
  timestampUtc: string;
};

export type BackendHealthResult =
  | {
      source: "api";
      health: BackendHealth;
      checkedAtUtc: string;
    }
  | {
      source: "unavailable";
      health: null;
      checkedAtUtc: string;
      message: string;
    };

const BACKEND_HEALTH_UNAVAILABLE_MESSAGE =
  "Backend health is unavailable. Start the local backend and retry the dashboard.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;

  const normalized = value.trim();
  return normalized ? normalized.slice(0, 160) : fallback;
}

function normalizeStringList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([key, item]) => [key.slice(0, 80), item.trim().slice(0, 160)])
      .filter(([key, item]) => Boolean(key && item)),
  );
}

function normalizeBackendHealth(value: unknown): BackendHealth {
  const health = isRecord(value) ? value : {};

  return {
    status: normalizeString(health.status, "not reported"),
    service: normalizeString(health.service, "Not reported"),
    milestone: normalizeString(health.milestone, "not reported"),
    version: normalizeString(health.version, "not reported"),
    runtimeMode: normalizeString(health.runtimeMode, "not reported"),
    activeProfiles: normalizeStringList(health.activeProfiles),
    dataMode: normalizeString(health.dataMode, "not reported"),
    externalProviders: normalizeStringRecord(health.externalProviders),
    checks: normalizeStringRecord(health.checks),
    uptimeSeconds:
      typeof health.uptimeSeconds === "number" &&
      Number.isFinite(health.uptimeSeconds) &&
      health.uptimeSeconds >= 0
        ? health.uptimeSeconds
        : 0,
    timestampUtc: normalizeString(health.timestampUtc, "not reported"),
  };
}

function unavailableResult(): BackendHealthResult {
  return {
    source: "unavailable",
    health: null,
    checkedAtUtc: new Date().toISOString(),
    message: BACKEND_HEALTH_UNAVAILABLE_MESSAGE,
  };
}

export async function getBackendHealth(): Promise<BackendHealthResult> {
  try {
    const response = await fetch(buildApiUrl("/api/health"), {
      cache: "no-store",
      credentials: "omit",
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) return unavailableResult();

    const data: unknown = await response.json();

    return {
      source: "api",
      health: normalizeBackendHealth(data),
      checkedAtUtc: new Date().toISOString(),
    };
  } catch {
    return unavailableResult();
  }
}
