export const DEFAULT_API_BASE_URL = "http://localhost:8080";
export const REQUEST_ID_HEADER_NAME = "X-NEXORA-Request-ID";

export function getApiBaseUrl(): string {
  const configuredBaseUrl = (
    process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
  ).trim();

  // Browsers use the rewrite; server-rendered pages need an absolute fetch URL.
  if (configuredBaseUrl === "/") {
    if (typeof window !== "undefined") return "";
    const backendOrigin = process.env.NEXORA_API_BASE_URL?.trim();
    if (!backendOrigin) {
      throw new Error("NEXORA_API_BASE_URL is required for same-origin API routing.");
    }
    return new URL(backendOrigin).origin;
  }

  const normalizedBaseUrl = (configuredBaseUrl || DEFAULT_API_BASE_URL).replace(
    /\/+$/,
    "",
  );

  return normalizedBaseUrl || DEFAULT_API_BASE_URL;
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

export function readResponseRequestId(response: Response): string | null {
  const requestId = response.headers.get(REQUEST_ID_HEADER_NAME)?.trim();
  return requestId || null;
}

export function formatRequestIdSupportText(
  requestId: string | null | undefined,
): string | null {
  const normalizedRequestId = requestId?.trim();
  return normalizedRequestId ? `Request ID: ${normalizedRequestId}` : null;
}
