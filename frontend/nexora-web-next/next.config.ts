import type { NextConfig } from "next";

function getApiProxyOrigin(): string | null {
  const configuredOrigin = process.env.NEXORA_API_BASE_URL?.trim();
  if (!configuredOrigin) {
    if (process.env.NEXT_PUBLIC_API_BASE_URL?.trim() === "/") {
      throw new Error("NEXORA_API_BASE_URL is required for same-origin API routing.");
    }
    return null;
  }

  let backend: URL;
  try {
    backend = new URL(configuredOrigin);
  } catch {
    throw new Error("NEXORA_API_BASE_URL must be an absolute HTTP(S) origin.");
  }

  if (
    !["http:", "https:"].includes(backend.protocol) ||
    backend.username || backend.password ||
    backend.pathname !== "/" || backend.search || backend.hash
  ) {
    throw new Error("NEXORA_API_BASE_URL must be an HTTP(S) origin without credentials, path, query, or fragment.");
  }

  const localHosts = ["localhost", "127.0.0.1", "[::1]"];
  if (backend.protocol !== "https:" && !localHosts.includes(backend.hostname)) {
    throw new Error("NEXORA_API_BASE_URL must use HTTPS except for local development.");
  }

  const frontendOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL?.trim(),
    ...[process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
      .filter(Boolean).map((host) => `https://${host}`),
    ...localHosts.map((host) => `http://${host}:${process.env.PORT || "3000"}`),
  ].filter((origin): origin is string => Boolean(origin));

  if (frontendOrigins.some((origin) => new URL(origin).origin === backend.origin)) {
    throw new Error("NEXORA_API_BASE_URL must target the backend, not the frontend (rewrite loop).");
  }

  return backend.origin;
}

const nextConfig: NextConfig = {
  rewrites() {
    const backendOrigin = getApiProxyOrigin();
    return backendOrigin
      ? [{ source: "/api/:path*", destination: `${backendOrigin}/api/:path*` }]
      : [];
  },
};

export default nextConfig;
