# NEXORA Backend API Contract

## Scope and status

This document describes the backend HTTP contract implemented by the Spring
Boot application in `backend/nexora-api`. It is intended for reviewers,
lecturers, repository visitors, and future developers.

The human-readable contract was established by the completed
`v0.35.0-api-contract-documentation-foundation` milestone. The completed v0.38
milestone added a hand-maintained OpenAPI companion, and the completed v0.39
milestone added lightweight structural validation around it.
`v0.51.0-reviewer-local-preflight-foundation` is the latest stable development
milestone while `v0.52.0-reviewer-preflight-ci-foundation` is in progress.
This is documentation for a local/development MVP, not a
production API specification or availability commitment.

Authoritative implementation sources include the controllers under
`backend/nexora-api/src/main/java/com/nexora/api`,
[`AuthSecurityConfig`](../../backend/nexora-api/src/main/java/com/nexora/api/config/AuthSecurityConfig.java),
request/response records, exception handlers, and endpoint tests. If this
document and runtime source diverge, the runtime source is authoritative and
the documentation should be corrected.

## Local base URL and maturity

| Item | Value |
| --- | --- |
| Local base URL | `http://localhost:8080` |
| Content type | JSON unless the successful response has no body |
| Authentication | Bearer JWT access token for protected endpoints |
| Browser auth protection | CSRF cookie/header match plus trusted origin/referrer checks on cookie-sensitive auth POST routes |
| Default storage | In-memory local/demo services; state resets when the backend restarts |
| Optional persisted mode | PostgreSQL through the Spring `dev` profile |
| API versioning | No version prefix is currently implemented |
| OpenAPI schema | [`openapi.yaml`](openapi.yaml) is hand-maintained and guarded by the local checker plus API Contract CI; no Swagger/OpenAPI runtime dependency or generated contract is provided |

“Foundation” means the behavior exists and is testable in local development.
It does not imply production-scale security, support, uptime, or operations.

## Public and protected access

The implemented route groups are defined by `AuthSecurityConfig`:

- Public GET routes include `/api`, `/api/health`, `/api/auth/csrf`, the
  catalog/demo routes, dashboard summary, security status, and Sentinel
  status/demo.
- Register, login, refresh, and logout are public from a Bearer-authentication
  perspective, but their POST requests are protected by the browser
  CSRF/origin guard when that guard is enabled.
- `/api/auth/me` and every `/api/me/**` route require a valid Bearer access
  token.
- CORS allows configured trusted origins with credentials. Local defaults are
  `http://localhost:3000` and `http://localhost:5173`.

“Public” means no Bearer token is required. It does not mean the endpoint is a
production public service.

## Authentication model

1. `POST /api/auth/register` or `POST /api/auth/login` returns an
   `AuthResponse` containing:
   - `token`: JWT access token;
   - `tokenType`: currently `Bearer`; and
   - `user`: `id`, `email`, `username`, and `displayName`.
2. Protected calls send `Authorization: Bearer <ACCESS_TOKEN>`.
3. The access token identifies the current account. Protected wishlist,
   notification-preference, and Sentinel routes derive ownership from the
   authenticated principal; they do not accept a client-supplied user ID.
4. `POST /api/auth/refresh` rotates a valid refresh session and returns a new
   `AuthResponse`.
5. `POST /api/auth/logout` revokes the presented refresh session when present,
   clears the refresh cookie, and returns `204 No Content`.

Access tokens and refresh cookies are credentials. Do not put them in URLs,
logs, screenshots, issues, or committed files.

## CSRF and trusted-origin protection

The cookie-sensitive auth routes are:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

The reviewer/browser flow is:

1. Call `GET /api/auth/csrf`.
2. Retain the issued CSRF cookie and read `csrfToken` from the JSON response.
3. Send the same value in the configured header, locally
   `X-NEXORA-CSRF: <CSRF_TOKEN>`, on an auth POST request.
4. Allow the client to send the CSRF cookie with that request.
5. Browser requests with an `Origin`, or a `Referer` when `Origin` is absent,
   must match a configured trusted origin. The local Next.js origin is
   `http://localhost:3000`.

The CSRF token cookie is intentionally readable by browser JavaScript for the
double-submit comparison. Local defaults use path `/api/auth`, `SameSite=Lax`,
two-hour expiry, and `Secure=false` for local HTTP. These defaults are not
production settings. Missing, mismatched, or untrusted browser request context
returns `csrf_failed` with HTTP 403. Repeated rejection attempts can return the
process-local auth `rate_limited` response.

| CSRF cookie attribute | Local default/behavior |
| --- | --- |
| Name | `nexora_csrf_token` |
| Path | `/api/auth` |
| Max-Age | `7200` seconds |
| HttpOnly | `false` intentionally, so the frontend can perform the double-submit flow |
| Secure | `false` for local HTTP only |
| SameSite | `Lax` |
| Header relationship | Cookie value must match `X-NEXORA-CSRF` on guarded auth POST routes |

## Refresh-session cookie model

Successful register/login responses and successful refresh responses issue the
opaque refresh token as a cookie. The default cookie contract is:

| Refresh cookie attribute | Local default/behavior |
| --- | --- |
| Name | `nexora_refresh_token` |
| Path | `/api/auth` |
| Max-Age | `604800` seconds |
| HttpOnly | `true` |
| Secure | `false` for local HTTP only |
| SameSite | `Lax` |
| Clear behavior | Logout sends the same name/path/security attributes with `Max-Age=0` and an empty value |

The raw refresh token is not returned in JSON. The server stores only its
HMAC-SHA256 hash. Refresh sessions are in memory by default and PostgreSQL-
backed in the `dev` profile. Rotation invalidates the prior token; logout clears
the cookie. `SameSite=None` is rejected for either auth cookie unless
`Secure=true`. Cookie attributes are configurable, and the v0.32 production
profile guard requires secure refresh/CSRF cookies and rejects other core unsafe
production settings. That guard is a startup safety foundation, not a complete
production session design.

## Cross-cutting request correlation header

Backend success and error responses include:

```text
X-NEXORA-Request-ID: <safe-request-id>
```

Clients may omit this header. When supplied, its value is trimmed and reused
only if it matches `^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$`; invalid values are
replaced with a generated UUID rather than causing a client error. Request IDs
must not contain secrets, tokens, cookies, email addresses, or personal data.

The request ID is response-header metadata only. It is returned for successful
and failed requests but is not added to endpoint DTOs or the shared JSON error
body. The hand-maintained `openapi.yaml` is intentionally unchanged for this
focused milestone.

The local [`api-smoke-test.sh`](../../scripts/api-smoke-test.sh) captures
response headers internally and validates this contract across public,
CSRF/authentication, protected, and established error responses. It checks
generated values with a UUID-style pattern, exactly echoes one safe incoming
value, and confirms `requestId` remains absent from shared error JSON. Full
response headers and sensitive cookie or authorization values are not printed.

The primary Next.js frontend can read the response header as optional internal
request-error metadata through its shared API client helper. Selected frontend
error/support states may display that response-header value as a quiet support
line for local backend-log correlation. Success states and client-only
validation errors do not display it. The frontend does not send a generated
request ID by default, add the ID to JSON body expectations, store it, or log
response headers. `requestId` remains absent from JSON response bodies.

Local backend console logs include the same request-scoped value through the
`nexora.request_id` MDC key and use `no-request-id` outside an HTTP request.
When the global fallback handles an unexpected API exception, it logs only the
HTTP method, request URI path without query data, status 500, and the exception
stack trace. It does not read or log request headers, cookies, tokens, query
strings, parameters, or request bodies. This local logging foundation does not
change the response contract: `requestId` remains absent from JSON bodies, and
the hand-maintained `openapi.yaml` remains unchanged.

The same local correlation filter emits one safe completion summary after each
API request and before clearing MDC. The summary message includes only the HTTP
method, request URI path without query data, response status, and non-negative
`durationMs`. The request ID is supplied only by the existing MDC console
pattern, not duplicated in the message or added to a JSON body. Request and
response headers, cookies, Authorization data, tokens, CSRF values, query
strings, parameters, and request/response bodies are not logged. The OpenAPI
YAML remains unchanged.

This section is the formal request-correlation contract. The copyable manual
flow is in the
[`REVIEWER_API_TESTING.md` request correlation debugging runbook](REVIEWER_API_TESTING.md#request-correlation-debugging-runbook),
while [`api-smoke-test.sh`](../../scripts/api-smoke-test.sh) provides automated
coverage. This documentation-only runbook needs no `openapi.yaml` change.

## Standard error response contract

Targeted API failures and the REST-only unexpected-error fallback use the v0.34
shared contract:

```json
{
  "error": "validation_failed",
  "message": "Request validation failed",
  "status": 400,
  "path": "/api/auth/register",
  "timestampUtc": "2026-08-26T12:34:56Z",
  "retryAfterSeconds": null
}
```

| Field | Contract |
| --- | --- |
| `error` | Stable machine-readable error code. Existing codes are retained for compatibility. |
| `message` | Safe, human-readable explanation. It is not an exception dump. |
| `status` | Integer HTTP response status. |
| `path` | Request URI path only; query-string values are excluded. |
| `timestampUtc` | UTC ISO-8601 timestamp produced when the error response is created. |
| `retryAfterSeconds` | Numeric retry delay for rate limits; nullable and may serialize as `null` for other errors. |

Common implemented codes include `authentication_required`,
`authentication_failed`, `account_conflict`, `csrf_failed`, `rate_limited`,
`rate_limit_exceeded`, `validation_failed`, `wishlist_item_not_found`, and
`internal_error`.

The contract does not expose stack traces, exception class names or causes,
raw request bodies, authorization headers, JWTs, refresh tokens, CSRF tokens,
cookies, passwords, API keys, datasource URLs, database credentials, SMTP
details, or raw environment values.

Malformed JSON and constraint failures use safe validation messages in the
domain handlers that define them. Field validation may identify the field and
constraint, but never includes the rejected value. Otherwise-unexpected REST
controller failures use `internal_error`, HTTP 500, and the fixed message
`An unexpected API error occurred`.

## Rate-limit response contract

Auth browser-route limits use `rate_limited`. Sentinel insight uses
`rate_limit_exceeded`. Both return HTTP 429, a `Retry-After` response header,
and the matching body field:

```json
{
  "error": "rate_limited",
  "message": "Too many authentication attempts. Please wait before trying again.",
  "status": 429,
  "path": "/api/auth/login",
  "timestampUtc": "2026-08-26T12:34:56Z",
  "retryAfterSeconds": 60
}
```

These counters are process-local, reset when the backend restarts, and are not
distributed production rate limiting.

## Runtime health and status endpoints

| Method | Path | Access | Purpose | Request | Success response | Common errors | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/api` | Public | Basic API welcome metadata | None | `200`; `message`, `frontend`, `status` | `internal_error` for unexpected failure | Local foundation message, not a readiness probe. |
| GET | `/api/health` | Public | Safe runtime/configuration summary | None | `200`; `status`, `service`, `milestone`, runtime/data modes, sanitized profiles/providers, UTC times, uptime, and checks | `internal_error` for unexpected failure | Reports configuration mode and process uptime, not external dependency health. |
| GET | `/api/dashboard/summary` | Public | Aggregate public deal/giveaway/demo-wishlist counts and display status | None | `200`; `DashboardSummary` | `internal_error` for unexpected failure | `databaseStatus` is environment-aware presentation text. |
| GET | `/api/security/status` | Public | Static security-center demo data | None | `200`; score/counts and protection-item lists | `internal_error` for unexpected failure | This response is demo presentation data, not a live security assessment or compliance report. |
| GET | `/api/sentinel/status` | Public | Safe Sentinel provider-foundation status | None | `200`; `aiStatus`, `backend`, `geminiApi`, `privacy` | `internal_error` for unexpected failure | Provider wording reflects configuration; messages are not persisted. |
| GET | `/api/sentinel/demo` | Public | Static Sentinel preview content and capability/status cards | None | `200`; messages, suggestions, capabilities, system status | `internal_error` for unexpected failure | Demo content does not perform wishlist actions. |

The health response currently uses milestone label
`v0.33.0-runtime-observability-foundation`; later documentation and smoke-CI
milestones, including v0.38, do not change that runtime field.

## Public catalog and demo endpoints

| Method | Path | Access | Purpose | Request | Success response | Common errors | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/deals` | Public | Return active curated deals | None | `200`; array of `Deal` records | `internal_error` for unexpected failure | Default profile uses local demo data; `dev` uses active PostgreSQL records. |
| GET | `/api/deals/external` | Public | Fetch/map external CheapShark deals | Optional query: `title` max 80 chars, `pageSize` minimum 1, `upperPrice` greater than 0 | `200`; array of `Deal` records | Safe fallback normally returns `200`; otherwise `internal_error` | Page size is clamped to configured maximum. Provider/cache failure falls back to curated deals. |
| GET | `/api/giveaways` | Public | Return active giveaways | None | `200`; array of `Giveaway` records | `internal_error` for unexpected failure | Default profile uses local demo data; `dev` uses active PostgreSQL records. |
| GET | `/api/wishlist` | Public | Return the public demo/global wishlist catalog | None | `200`; array of `WishlistItem` records | `internal_error` for unexpected failure | Separate from account-owned `/api/me/wishlist`. It must not be treated as a personal account response. |

Primary catalog response fields are:

- `Deal`: `id`, `store`, discount labels/value, title, old/new prices,
  numeric price/rating, stars, category, status, and optional `dealUrl`.
- `Giveaway`: `id`, platform values, title, genre, timer/day count, claimed
  percentage, status, tag, and original price.
- `WishlistItem`: identity/title/store and price labels, status, alert flag,
  priority, and `alertEvaluation` (`targetReached`, `state`, `message`).

## Authentication endpoints

| Method | Path | Access | Purpose | Request body | Success response | Common errors | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/auth/csrf` | Public | Issue a CSRF token and matching readable cookie | None | `200`; `{ "csrfToken": "..." }` plus CSRF `Set-Cookie` | `internal_error` | Fetch before browser-style auth POST requests. |
| POST | `/api/auth/register` | Public; CSRF/origin guarded | Create a local account and session | `email`, `username`, `displayName`, `password` | `201`; `AuthResponse` plus refresh `Set-Cookie` | `validation_failed`, `account_conflict`, `csrf_failed`, `rate_limited`, `internal_error` | Email must be valid; username is 3–50 chars; display name max 100; password 8–72 chars and subject to the existing UTF-8 byte limit. |
| POST | `/api/auth/login` | Public; CSRF/origin guarded | Authenticate by email or username | `emailOrUsername`, `password` | `200`; `AuthResponse` plus refresh `Set-Cookie` | `validation_failed`, `authentication_failed`, `csrf_failed`, `rate_limited`, `internal_error` | Identifier max 320 chars; password max 72 chars. |
| POST | `/api/auth/refresh` | Public; CSRF/origin guarded | Rotate refresh session and issue a new access token | None; uses refresh and CSRF cookies/header | `200`; `AuthResponse` plus rotated refresh `Set-Cookie` | `authentication_failed`, `csrf_failed`, `rate_limited`, `internal_error` | Prior refresh token becomes invalid after rotation. |
| POST | `/api/auth/logout` | Public; CSRF/origin guarded | Revoke the presented refresh session and clear cookie | None | `204`; empty body plus clearing `Set-Cookie` | `csrf_failed`, `rate_limited`, `internal_error` | Safe when no active refresh session is present. |
| GET | `/api/auth/me` | Protected | Return current account-safe fields | None | `200`; `id`, `email`, `username`, `displayName` | `authentication_required`, `internal_error` | Requires `Authorization: Bearer <ACCESS_TOKEN>`. |

Example request shapes:

```json
{
  "email": "reviewer@example.com",
  "username": "reviewer_user",
  "displayName": "Reviewer",
  "password": "ChangeMeLocalOnly123!"
}
```

```json
{
  "emailOrUsername": "reviewer@example.com",
  "password": "ChangeMeLocalOnly123!"
}
```

The values above are local demonstration values, not shared or production
credentials.

## Protected user wishlist endpoints

All routes in this section require `Authorization: Bearer <ACCESS_TOKEN>` and
derive the user ID from that token.

| Method | Path | Access | Purpose | Request body/query | Success response | Common errors | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/me/wishlist` | Protected | List active items owned by the current account | None | `200`; array of `WishlistItem` | `authentication_required`, `internal_error` | Account-scoped; public demo items are not mixed into this response. |
| GET | `/api/me/wishlist/alert-events` | Protected | List target-reached alert history newest first | None | `200`; array of `WishlistAlertEventResponse` | `authentication_required`, `internal_error` | History is account-scoped. |
| GET | `/api/me/wishlist/{id}/price-history` | Protected | Return recent price snapshots for an owned active item | Optional `limit`, default 30, range 1–90 | `200`; array of `WishlistPriceHistoryPoint` | `authentication_required`, `validation_failed`, `wishlist_item_not_found`, `internal_error` | Missing, deleted, or another account’s item is reported as not found. |
| POST | `/api/me/wishlist` | Protected | Add a personal wishlist item | `AddWishlistItemRequest` | `201`; `WishlistItem` | `authentication_required`, `validation_failed`, `internal_error` | Re-saving the same active title/store for one user returns the existing item. |
| PATCH | `/api/me/wishlist/{id}/alert` | Protected | Update one or more alert settings | `targetPrice`, `alertActive`, and/or `priority` | `200`; updated `WishlistItem` | `authentication_required`, `validation_failed`, `wishlist_item_not_found`, `internal_error` | At least one field is required; priority is `high`, `medium`, or `low`. |
| DELETE | `/api/me/wishlist/{id}` | Protected | Soft-delete an owned active item | None | `204`; empty body | `authentication_required`, `wishlist_item_not_found`, `internal_error` | Another account’s item is indistinguishable from a missing item. |

`AddWishlistItemRequest` requires `title`, `store`, `currentPrice`, and
`targetPrice` (each max 255 characters). Optional fields are `lowestEver`,
`discount`, `status`, `alertActive`, and `priority`. Status, when provided, is
`price-drop`, `free-now`, or `tracking`; priority is `high`, `medium`, or `low`.

Alert-event responses contain event/item IDs, item/store and price labels,
evaluation state, target-reached flag, message, and creation time. Price-history
responses contain snapshot/item IDs, item/store, price label and optional
numeric amount/currency, source, and observation time.

## Protected notification preference endpoints

| Method | Path | Access | Purpose | Request body | Success response | Common errors | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/me/notification-preferences` | Protected | Get current account preferences, creating defaults when absent | None | `200`; five boolean preference fields | `authentication_required`, `internal_error` | Defaults: email false; in-app, target-reached, price-drop, and free-game true. |
| PATCH | `/api/me/notification-preferences` | Protected | Partially update current account preferences | One or more of `emailEnabled`, `inAppEnabled`, `targetReachedEnabled`, `priceDropEnabled`, `freeGameEnabled` | `200`; complete updated preference response | `authentication_required`, `validation_failed`, `internal_error` | Empty updates and malformed/unknown input are rejected. This configures preferences; it does not promise production delivery. |

## Protected Sentinel insight endpoint

| Method | Path | Access | Purpose | Request body | Success response | Common errors | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/me/sentinel/insight` | Protected | Produce bounded guidance using account-scoped backend context | `message` and optional `context` | `200`; `SentinelInsightResponse` | `authentication_required`, `validation_failed`, `rate_limit_exceeded`, `internal_error` | `message` trims to 1–500 chars. Context is `general`, `wishlist`, `deals`, or `security`; omitted context resolves to general. |

The response contains `mode`, normalized `provider`, resolved `context`, title,
answer, recommendation/safety/action lists, safe `fallbackReason`, and
`createdAt`. The default provider is deterministic local mode. Gemini is
backend-only and opt-in. Conversations are not saved, and this endpoint does
not autonomously change wishlist or account data.

## Default local mode behavior

With no active Spring profile:

- the backend starts without a datasource;
- public deal, giveaway, and public wishlist catalogs use local demo data;
- accounts, refresh sessions, personal wishlists, alert events, price history,
  notification preferences, and auth security events are in memory;
- restarting the backend clears that in-memory account/personal state;
- external CheapShark deals remain available on demand with cache and curated
  fallback;
- price refresh scheduling and notification delivery are disabled by default;
- the stored price provider, log notification adapter, and local Sentinel
  provider are the safe defaults; and
- `/api/health` reports `local-demo` and `in-memory-demo`.

This mode is designed for controlled local review, not durable hosting.

## Dev/PostgreSQL profile behavior

With `--spring.profiles.active=dev` (or the equivalent Maven profile argument):

- PostgreSQL datasource auto-configuration, Spring Data JPA, and Flyway V1–V10
  are enabled;
- catalog, account, refresh-session, auth-security-event, personal wishlist,
  alert-event, price-history, and notification-preference data use their
  PostgreSQL-backed development implementations;
- JPA validates the migrated schema with `ddl-auto=validate` rather than
  creating or changing it;
- the optional price-refresh scheduler can be enabled explicitly; and
- `/api/health` reports `dev-postgres` and `postgres-dev` without disclosing
  datasource connection details.

The `dev` profile is a local integration profile. It is not a production data
architecture or operations plan.

## Security and privacy limitations

- Local JWT, cookie, trusted-origin, and database defaults are development-only.
- The API has no account verification, password recovery, comprehensive session
  management UI, or complete account-wide revocation policy.
- CSRF/origin rules are a focused local browser-auth foundation. Reverse-proxy,
  forwarded-header, and production CORS/cookie decisions remain incomplete.
- Auth and Sentinel rate limits are process-local and reset on restart.
- `/api/security/status` is static demo content and must not be used as evidence
  of a real account or infrastructure security state.
- `/api/health` is public and deliberately bounded, but it is not a database,
  provider, mail, or external availability probe.
- Notification preferences do not imply durable delivery, retries, an outbox,
  or verified email recipients.
- Sentinel is experimental, has no conversation persistence, and has no
  production AI moderation or observability pipeline.
- No endpoint should be used with real personal data or credentials during
  public review.

## What is intentionally not production-ready

This contract does not make NEXORA production-ready. The project still needs,
among other decisions:

- an approved deployment topology and production datastore/session-store;
- managed secrets and credential rotation;
- reviewed HTTPS, reverse-proxy, forwarded-header, CORS, and cookie settings;
- distributed rate limiting and abuse protection;
- production monitoring, metrics, tracing, managed logging, alerting, and
  incident response;
- backups, restore tests, rollback procedures, and availability objectives;
- account verification, recovery, support, privacy, and retention policies;
- production provider reliability, notification-delivery, and AI safety
  controls; and
- full OpenAPI lint/schema validation, generated clients, Swagger UI/runtime
  docs, or hosted documentation only after their maintenance, security, and
  deployment boundaries are deliberately reviewed.

The hand-maintained [`openapi.yaml`](openapi.yaml) complements this explanatory
contract and is guarded by
[`openapi-contract-check.py`](../../scripts/openapi-contract-check.py) plus
[`API Contract CI`](../../.github/workflows/api-contract-ci.yml).
This document remains the detailed explanatory, source-aligned contract; see
[`OPENAPI_CONTRACT.md`](OPENAPI_CONTRACT.md) for the machine-readable
contract's scope and limitations. For a local copyable walkthrough, see
[`REVIEWER_API_TESTING.md`](REVIEWER_API_TESTING.md). For a repeatable safe
subset of that flow, run the repository's
[`api-smoke-test.sh`](../../scripts/api-smoke-test.sh) after starting the
backend.
