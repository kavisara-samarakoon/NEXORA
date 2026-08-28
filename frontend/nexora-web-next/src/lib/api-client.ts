export const DEFAULT_API_BASE_URL = "http://localhost:8080";
export const REQUEST_ID_HEADER_NAME = "X-NEXORA-Request-ID";

export function getApiBaseUrl(): string {
  const configuredBaseUrl = (
    process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
  ).trim();
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
