# NEXORA API

Spring Boot REST API for NEXORA's game deals, giveaways, authentication,
personal wishlist, price-alert, and notification foundations.

**Status:** Local/development backend · PostgreSQL persistence is opt-in through
the `dev` profile · Not documented as production-ready

## Requirements

- Java 17 or newer
- Maven 3.9 or newer
- PostgreSQL when using the `dev` profile

## Profiles

| Profile | Storage and behavior |
| --- | --- |
| Default | Starts without a datasource. Public catalog data is local demo data; accounts, refresh sessions, personal wishlists, alert history, price history, and notification preferences are held in memory. CheapShark external deals remain available on demand. |
| `dev` | Enables PostgreSQL, Flyway V1–V10, Spring Data JPA, persisted catalog/account/refresh-session/auth-security-event/wishlist/alert/price-history/notification-preference data, and the optional wishlist refresh scheduler. |
| `prod` / `production` | Activates auth safety checks and requires `dev` persistence; starting this profile alone is rejected. |
| `hosted-demo` | Composes `dev` + `production`; requires external PostgreSQL, secrets, exact HTTPS origins and `PORT`, with secure cookies and CSRF enforced. |

The default profile is useful for UI development and tests. Restarting it
clears accounts and personal wishlist changes. The `dev` profile validates JPA
mappings against the migrated schema with `ddl-auto=validate`; Hibernate does
not create or modify tables.

### Hosted demo on Render / Neon

Use [`.env.hosted-demo.example`](.env.hosted-demo.example) as a provider-variable
checklist; Spring Boot does not load this file automatically. Enter real values
in Render's environment settings. The [hosted setup guide](../../docs/deployment/production-demo-deployment-plan.md)
covers Neon's direct JDBC endpoint, TLS, Flyway validation, and Vercel origins.

Render settings: **Docker** service, root `backend/nexora-api`, Dockerfile
`./Dockerfile`, context `.`, health path `/api/health`. Leave Docker Command
unset to use the image's Java 17 startup command. The [Dockerfile](Dockerfile)
builds with Maven, runs the jar as a non-root user, and defaults to `hosted-demo`;
missing hosted configuration fails startup. Its build context excludes env
files and generated artifacts. Existing CI/tests remain separate from packaging.

### Backend security headers

The Spring Security filter chain explicitly applies these headers to API
responses:

- `X-Content-Type-Options: nosniff` prevents content-type sniffing;
- `X-Frame-Options: DENY` prevents the API response from being framed;
- `Referrer-Policy: no-referrer` avoids sending referrer information; and
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(),
  usb=(), fullscreen=()` disables browser capabilities the API does not need.

Spring Security's cache-control writer also emits `Cache-Control` with
`no-cache`, `no-store`, `max-age=0`, and `must-revalidate`, together with
`Pragma: no-cache` and `Expires: 0`. This keeps auth-sensitive responses such as
the CSRF bootstrap response from being cached. These headers complement the
existing authentication, custom CSRF/browser request guard, abuse controls,
and shared error contract; they do not change CORS, authentication, or CSRF
validation behavior.

### Request correlation observability

Every backend response includes `X-NEXORA-Request-ID`. A client-supplied value
is trimmed and reused only when it is 8–128 characters, starts with an ASCII
letter or digit, and otherwise contains only ASCII letters, digits, `.`, `_`,
`:`, or `-`. Missing, blank, oversized, whitespace-containing, control-
character-containing, or otherwise unsafe values are replaced with a generated
UUID; they do not cause the API request to be rejected.

The selected value is available to backend processing as the request attribute
and MDC key `nexora.request_id`, and the MDC entry is removed when processing
finishes. It is returned as a header on success and error responses, not added
to JSON bodies. Request IDs must never contain secrets, authorization values,
tokens, cookies, email addresses, or other personal data.

This is a lightweight local/development debugging aid. It does not provide
distributed tracing, centralized logs, metrics, dashboards, alerting, or
production monitoring.

### Production-profile startup guard

The v0.32 safety guard runs before normal application singletons when any active
profile is exactly `prod` or `production`. It collects unsafe settings into one
startup exception, names the affected properties, and never includes configured
secret values. It requires:

- independent externally supplied JWT and refresh-token hash secret values of
  at least 48 bytes, with local defaults and obvious local/test/placeholders
  rejected;
- `NEXORA_REFRESH_TOKEN_COOKIE_SECURE=true` and the existing `/api/auth`
  refresh-cookie scope;
- `NEXORA_AUTH_CSRF_ENABLED=true` and
  `NEXORA_AUTH_CSRF_COOKIE_SECURE=true`; and
- one or more exact HTTPS trusted origins with no wildcard, localhost,
  loopback/any-address host, or common local development port.

Partial guard configuration only; PostgreSQL settings are also required. For
the hosted demo use the complete template linked above:

```text
SPRING_PROFILES_ACTIVE=production,dev
NEXORA_JWT_SECRET=<strong external secret of at least 48 bytes>
NEXORA_REFRESH_TOKEN_HASH_SECRET=<separate strong external secret of at least 48 bytes>
NEXORA_REFRESH_TOKEN_COOKIE_SECURE=true
NEXORA_AUTH_CSRF_COOKIE_SECURE=true
NEXORA_AUTH_CSRF_ENABLED=true
NEXORA_AUTH_TRUSTED_ORIGINS=https://your-frontend-domain.example
```

Do not use the placeholder values above as configuration. The guard is a safety
foundation, not a production profile implementation: production still needs a
persistent database/session-store decision, managed secrets, HTTPS and reviewed
proxy behavior, deployment and rollback procedures, monitoring, incident
response, and broader operational hardening. Default and `dev` behavior remain
unchanged.

## Quick start

From `backend/nexora-api`:

```bash
mvn test
mvn spring-boot:run
```

The API starts at [http://localhost:8080](http://localhost:8080). Check
[http://localhost:8080/api/health](http://localhost:8080/api/health) for the
service health response.

### API contract documentation

The source-aligned [backend API contract](../../docs/api/API_CONTRACT.md)
documents public/protected routes, request/response records, local default and
`dev` PostgreSQL modes, authentication, CSRF/origin checks, refresh cookies,
and the shared error contract. A hand-maintained
[OpenAPI 3.1 contract](../../docs/api/openapi.yaml) provides a structured route
and schema reference, with scope and maintenance guidance in the
[OpenAPI contract guide](../../docs/api/OPENAPI_CONTRACT.md). The
[reviewer API testing guide](../../docs/api/REVIEWER_API_TESTING.md) provides a
localhost-only curl walkthrough without requiring `jq`, PostgreSQL, or optional
providers.

For a quicker repeatable check, run the repository's local-only
[`api-smoke-test.sh`](../../scripts/api-smoke-test.sh) after starting the
backend. The [scripts guide](../../scripts/README.md) documents its prerequisites,
environment controls, covered routes, and safe failure behavior. The manual
reviewer guide remains the detailed learning and troubleshooting path.

The OpenAPI file is documentation/contract only. These documents do not add
Swagger UI or runtime generation, change backend behavior, or imply production
readiness.

### Runtime health and startup summary

`GET /api/health` preserves the existing `UP` / `NEXORA API` fields and adds:

- the v0.33 milestone label;
- `local-demo`, `dev-postgres`, or `production` runtime mode;
- sanitized active-profile labels, using `default` when none are active and
  `custom` instead of echoing unknown names;
- `in-memory-demo` or `postgres-dev` data mode without datasource details;
- allowlisted effective Sentinel, notification, and price-refresh provider
  names;
- UTC startup/check instants and non-negative process uptime seconds; and
- safe configuration summaries for the application, profile, production auth
  guard, database mode, and optional providers.

An application-ready listener logs one summary line built only from those safe
derived fields. Neither response nor log includes or exposes JWT/refresh
secrets, cookies, CSRF values, trusted-origin values, database URLs or
credentials, Gemini keys/base URLs, SMTP credentials, tokens, or the full
environment.
Provider/configuration labels are not live external dependency checks.

This is lightweight local runtime observability, not Actuator, metrics,
distributed tracing, centralized logging, alerting, dashboards, or production
monitoring. Prometheus, Grafana, OpenTelemetry, managed logging, and operational
response remain future work, and NEXORA remains not production-ready.

### Shared API error contract

Version 0.34 routes targeted auth, browser CSRF/origin, local rate-limit,
personal Wishlist, Sentinel gateway, and notification-preference failures
through one safe error factory. A lowest-priority REST-only fallback maps
otherwise unexpected controller failures to `internal_error` without exposing
exception details. The backward-compatible JSON shape is:

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

`error` and `message` remain available with their existing meanings. The path
contains only the request URI path, never its query string. Rate-limit errors
retain both `Retry-After` and a numeric `retryAfterSeconds`. The shared metadata
does not include request bodies, secrets, tokens, cookies, credentials,
datasource URLs, exception class names, causes, or stack traces.

This is an API consistency and safety foundation. It does not change routes,
authentication/session behavior, validation rules, business logic, or
production readiness.

The same commands can run inside the repository's optional development
container, which provides Java 17 and Maven without changing the host-native
workflow. PostgreSQL can still be supplied by the existing local Compose file.
See the
[devcontainer guide](../../docs/development/dev-container-foundation.md) for
container-to-host database connection guidance. This is local tooling, not a
backend release image.

## PostgreSQL development setup

Local defaults:

| Setting | Default |
| --- | --- |
| Database | `nexora_db` |
| Username | `nexora_user` |
| Password | `nexora_password` |
| JDBC URL | `jdbc:postgresql://localhost:5432/nexora_db` |

Use the Docker Compose option or the manual PostgreSQL option below. Both expose
the same local database values expected by the backend.

### Docker Compose option

From the repository root:

```bash
docker compose \
  --env-file devops/docker/postgres.env.example \
  -f devops/docker/postgres.compose.yml \
  up -d
```

Check that the database is healthy:

```bash
docker compose -f devops/docker/postgres.compose.yml ps
```

The named volume preserves local data across `down` and subsequent `up`
commands. To stop the service and permanently reset this Compose database:

```bash
docker compose -f devops/docker/postgres.compose.yml down -v
```

See the [Docker README](../../devops/docker/README.md) for log, stop, reset, and
customization details. The Compose file runs PostgreSQL only; it does not
containerize this API or the frontend.

### Manual PostgreSQL option

Create the role and database with a PostgreSQL administrator account:

```sql
CREATE USER nexora_user WITH PASSWORD 'nexora_password';
CREATE DATABASE nexora_db OWNER nexora_user;
```

### Start the backend

After either PostgreSQL option is ready, start the persisted profile with the
matching environment values:

```bash
export NEXORA_JWT_SECRET="$(openssl rand -base64 48)"
export NEXORA_REFRESH_TOKEN_HASH_SECRET="$(openssl rand -base64 48)"
export NEXORA_DB_URL=jdbc:postgresql://localhost:5432/nexora_db
export NEXORA_DB_USERNAME=nexora_user
export NEXORA_DB_PASSWORD=nexora_password
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Flyway migrations live in `src/main/resources/db/migration` and are applied
during backend startup before JPA validates the schema. In `dev`, public catalog
endpoints return active rows only. `GET /api/wishlist` additionally requires
`user_id IS NULL`, keeping personal rows out of the public response.

## Endpoint reference

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api` | API welcome response |
| `GET` | `/api/health` | Safe application runtime/configuration summary; no secret or connection details |
| `GET` | `/api/dashboard/summary` | Deal, giveaway, wishlist, database, and Sentinel summary |
| `GET` | `/api/deals` | Curated active deals: local demo data or PostgreSQL in `dev` |
| `GET` | `/api/deals/external` | On-demand CheapShark deals mapped to the NEXORA deal contract |
| `GET` | `/api/giveaways` | Active giveaways: local demo data or PostgreSQL in `dev` |
| `GET` | `/api/wishlist` | Public demo/global wishlist items only |
| `GET` | `/api/security/status` | Demo security summary |
| `GET` | `/api/sentinel/status` | Sentinel integration status |
| `GET` | `/api/sentinel/demo` | Sentinel demo messages and capabilities |
| `POST` | `/api/me/sentinel/insight` | Return authenticated Sentinel guidance through the local default or optional backend Gemini provider; no persistence |
| `GET` | `/api/auth/csrf` | Issue a browser-readable CSRF token and matching cookie |
| `POST` | `/api/auth/register` | Register, return a JWT access token, and issue a refresh cookie |
| `POST` | `/api/auth/login` | Log in, return a JWT access token, and issue a refresh cookie |
| `POST` | `/api/auth/refresh` | Rotate a valid refresh session and return a fresh `AuthResponse` |
| `POST` | `/api/auth/logout` | Revoke the refresh session, clear its cookie, and return `204` |
| `GET` | `/api/auth/me` | Return the authenticated account's safe fields |
| `GET` | `/api/me/wishlist` | List the authenticated user's active wishlist items |
| `POST` | `/api/me/wishlist` | Add an item to the authenticated user's wishlist |
| `PATCH` | `/api/me/wishlist/{id}/alert` | Update target price, alert state, or priority for an owned item |
| `DELETE` | `/api/me/wishlist/{id}` | Soft-delete an owned active item |
| `GET` | `/api/me/wishlist/alert-events` | Return target-reached history newest first |
| `GET` | `/api/me/wishlist/{id}/price-history` | Return up to 30 recent price snapshots for an owned active item; accepts `limit=1..90` |
| `GET` | `/api/me/notification-preferences` | Return the authenticated user's notification preferences, creating defaults on first access |
| `PATCH` | `/api/me/notification-preferences` | Update one or more authenticated-user notification preferences |

Protected endpoints derive ownership from the JWT principal. They do not accept
a client-supplied user ID.

## Authentication

Authentication uses BCrypt password hashes and stateless HS256 JWT access
tokens. Register and login still return the existing
`AuthResponse(token, tokenType, user)` JSON contract, so current Bearer clients
remain compatible. They now also create a server-side refresh session and issue
its opaque token as an HttpOnly cookie.

### Auth cookie security

Only an HMAC-SHA256 token hash is stored. The raw refresh token is generated
independently with `SecureRandom`, is never returned in JSON, and is sent only
through the cookie. The default profile keeps refresh sessions in memory;
`dev` persists them in the Flyway-managed `auth_sessions` table. The refresh
cookie is `HttpOnly`, scoped to `/api/auth`, uses `SameSite=Lax`, and has a
seven-day maximum age by default. Successful refresh rotates both the
server-side session and cookie value; logout revokes the session and clears the
same cookie with `Max-Age=0` and matching security attributes.

The four cookie-sensitive auth POST routes—register, login, refresh, and
logout—require a token from `GET /api/auth/csrf`. The endpoint returns
`{"csrfToken":"..."}` and sets the same value in the non-HttpOnly
`nexora_csrf_token` cookie. Clients must echo the value through
`X-NEXORA-CSRF`. Tokens are generated with `SecureRandom`, are not stored by the
backend or database, and are never refresh tokens. The CSRF cookie is scoped to
`/api/auth`, uses `SameSite=Lax`, and has a two-hour maximum age by default. It
is intentionally not `HttpOnly` because the double-submit browser flow must
read and echo it. Requests with an `Origin`
must match the configured trusted-origin allowlist; a `Referer` is checked when
`Origin` is absent. Local curl/test requests may omit both origin headers only
when the cookie/header token pair is valid.

Fetch a CSRF token and retain its cookie before using an auth POST route:

```bash
curl -sS http://localhost:8080/api/auth/csrf \
  -c /tmp/nexora-auth-cookies.txt
export NEXORA_CSRF_TOKEN='<csrfToken-from-response>'
```

Register and capture a token:

```bash
curl -sS -X POST http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -H "X-NEXORA-CSRF: ${NEXORA_CSRF_TOKEN}" \
  -b /tmp/nexora-auth-cookies.txt \
  -c /tmp/nexora-auth-cookies.txt \
  -d '{"email":"player@example.com","username":"player_one","displayName":"Player One","password":"change-me-123"}'
```

Log in with an email or username:

```bash
curl -sS -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -H "X-NEXORA-CSRF: ${NEXORA_CSRF_TOKEN}" \
  -b /tmp/nexora-auth-cookies.txt \
  -c /tmp/nexora-auth-cookies.txt \
  -d '{"emailOrUsername":"player@example.com","password":"change-me-123"}'
```

Use the returned token for protected requests:

```bash
export NEXORA_TOKEN='<token-from-register-or-login>'
curl -sS http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer ${NEXORA_TOKEN}"
```

Rotate the refresh token and receive the unchanged access-token response:

```bash
curl -sS -X POST http://localhost:8080/api/auth/refresh \
  -H "X-NEXORA-CSRF: ${NEXORA_CSRF_TOKEN}" \
  -b /tmp/nexora-auth-cookies.txt \
  -c /tmp/nexora-auth-cookies.txt
```

Log out the current refresh session. The endpoint is idempotent, clears the
cookie, and returns `204 No Content` even when the cookie is missing or invalid:

```bash
curl -sS -X POST http://localhost:8080/api/auth/logout \
  -H "X-NEXORA-CSRF: ${NEXORA_CSRF_TOKEN}" \
  -b /tmp/nexora-auth-cookies.txt \
  -c /tmp/nexora-auth-cookies.txt
```

Refresh tokens rotate on every successful refresh. The previous record is
revoked, its reuse returns `401`, and logout revokes the current record.
`SameSite=None` is rejected for either cookie unless `Secure=true`. Both cookies
use `Secure=false` only for localhost/non-HTTPS development defaults; the
`prod`/`production` startup guard requires secure refresh and CSRF cookies.

The bundled JWT and refresh-token hash secrets are local-only. Override
`NEXORA_JWT_SECRET` and `NEXORA_REFRESH_TOKEN_HASH_SECRET` in every shared or
deployed environment. A `prod`/`production` startup additionally rejects those
defaults, secrets shorter than 48 bytes, and obvious placeholder values. The
primary frontend now uses the refresh endpoint for
session bootstrap, keeps access tokens in memory, and continues to send Bearer
headers to protected APIs. Spring Security's general-purpose CSRF support stays
disabled because these APIs are stateless; the focused auth-route guard runs
before controller work and validates the double-submit token and trusted origin.
This is a local-development foundation. Its origin, cookie, no-origin client,
proxy, and error-handling policies still require production review.

### Auth security event foundation

Authentication paths record best-effort security-event metadata for register,
login, refresh, logout, and CSRF/origin rejection outcomes. Events contain only
an event type, outcome, nullable internal user ID, safe reason code, the fixed
`auth` source, and UTC occurrence/creation timestamps.

The default profile retains only the newest 500 events in memory, and those
events disappear on backend restart. The `dev` profile persists the same safe
metadata in Flyway V10 `auth_security_events`. Event-store failures are
suppressed with a metadata-only warning so they do not block otherwise
successful authentication flows or alter existing API responses.

Configurable retention cleanup is available for this safe metadata. It is
disabled by default, defaults to 30 retention days, and checks once daily at
03:00 UTC when enabled. The cutoff is calculated in UTC. The in-memory store
removes matching events while retaining its existing 500-event maximum and
restart-reset behavior; the `dev` PostgreSQL store deletes matching rows from
the existing V10 table. Cleanup failures are suppressed and logged without
exception messages, so cleanup cannot break authentication behavior.

The event schema and service do not accept or store submitted passwords,
failed-login email/username values, JWT access tokens, refresh tokens, refresh
token hashes, CSRF tokens, cookies, request origins, IP addresses, user agents,
API/provider keys, SMTP credentials, or database credentials. There is no
public security-event API or frontend UI. Retention cleanup reads only the
event timestamp and deletes only these safe event rows; it does not add or
collect request data.

This is local observability and cleanup, not production monitoring or a
retention/privacy/compliance policy. Enabling cleanup is a local owner decision.
Approved production retention periods, privacy/access policy, integrity
protection, request-context minimization, aggregation, alert thresholds,
dashboards, SIEM integration, monitoring, and incident response remain future
work. The
[auth production-policy plan](../../docs/security/auth-production-policy-plan.md)
tracks those requirements.

### Auth abuse-control foundation

Register, login, refresh, logout, and repeated CSRF/origin rejection attempts
use thread-safe, fixed-window counters before expensive auth work. Login and
registration keys combine the typed operation with a SHA-256 digest of the
normalized candidate identifier; other operations use a shared subject.
The keys retain no raw submitted identifiers, passwords, tokens, cookies, IP
addresses, or credentials.

Auth counters and Sentinel's per-user rate windows each retain at most 10,000
entries per process. Each enabled check removes expired windows first; admitting
a new key at capacity evicts the oldest inserted window, with insertion order
breaking time ties. Updating or rejecting an existing key does not extend its
window or refresh its eviction order. Both retain their existing configured
window duration (60 seconds by default, bounded to 1–3,600 seconds), attempt
limits, and `Retry-After` calculations. Cleanup and admission are synchronized;
there are no cleanup threads or new environment variables. An evicted key
starts a fresh window on its next request, so these memory safeguards do not
provide reliable abuse protection under deliberate key churn.

After a purpose reaches its configured attempts per window, the API returns
`429 Too Many Requests`, sets `Retry-After`, and returns:

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

Each limited request records a best-effort `AUTH_RATE_LIMITED` event with only a
typed route reason code and a null user ID. Event-store failure remains
suppressed and does not replace the safe 429 behavior or break normal auth
flows. These controls are process-local safeguards: they reset on restart and
are neither distributed nor production-grade. Production still requires a distributed rate limiter,
bot/credential-stuffing strategy, monitoring, alerting, privacy/retention
policy, and incident-response workflow. No public abuse-control API or frontend
behavior was added.

The external-deals cache already caps query entries at 128 with TTL cleanup;
provider calls have a four-call process-local concurrency budget. The `!dev`
account, refresh-session, wishlist, price-history, and notification-preference
stores remain demo persistence, without a global retention cap. Evicting those
records would discard user state. The `hosted-demo` profile includes `dev` and
uses PostgreSQL for those stores. These safeguards do not add a distributed
production cache or session layer.

## Personal wishlist

The personal wishlist supports listing, adding, alert-setting updates, and soft
deletion. Repeated saves of the same active title and store for one user return
the existing item instead of creating another active row. Public demo wishlist
items remain separate.

```bash
curl -sS -X POST http://localhost:8080/api/me/wishlist \
  -H "Authorization: Bearer ${NEXORA_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Hades II","store":"Steam","currentPrice":"$29.99","targetPrice":"$19.99","status":"tracking","alertActive":true,"priority":"high"}'
```

Alert updates may contain any combination of `targetPrice`, `alertActive`, and
`priority`, but at least one field is required. Priorities are `high`, `medium`,
or `low`.

## Alert evaluation and history

Every wishlist response includes an `alertEvaluation` computed from the current
price, target price, and alert state.

| State | Meaning |
| --- | --- |
| `target-reached` | Active alert whose current price is at or below the target |
| `watching` | Active alert whose current price remains above the target |
| `paused` | Inactive alert |
| `not-evaluable` | Active alert with an unparseable current or target price |

Dollar-prefixed, trailing-dollar, and plain numeric values, comma-separated
prices, and `FREE` are supported. Comparisons use decimal arithmetic.

Target-reached events are created when a new active item is already reached or
when an alert changes from not reached to reached. The opt-in refresh job can
also create an event on that transition. Repeated operations while already
reached do not create duplicate events. Public or inactive items do not create
personal alert history.

In the `dev` profile, Flyway V6 persists event snapshots in
`wishlist_alert_events`. The default profile keeps equivalent demo history in
memory.

## Wishlist price history

Creating a personal wishlist item records its initial current-price snapshot.
When the optional price refresh workflow changes an item's current price, it
records another snapshot with the selected provider as its source. Consecutive
snapshots with the same label and parsed value are skipped; changing only the
target price, alert state, or priority does not add history.

`GET /api/me/wishlist/{id}/price-history` requires the existing Bearer access
token and returns an owned active item's recent points oldest-to-newest for
chart-friendly display. The default limit is 30 and the accepted range is
1–90. `FREE` is represented as numeric `0.00` USD. Unparseable labels such as
`TBA` remain available while `priceAmount` and `currency` are `null`.

Flyway V8 persists these snapshots in `wishlist_price_history` for the `dev`
profile. The database-free default profile keeps equivalent process-local
history. Soft-deleted items and another user's items return the existing
wishlist not-found response, and public demo rows do not expose history.

## CheapShark external deals

`GET /api/deals/external` calls the public CheapShark API on demand and maps
results into the NEXORA deal response. `GET /api/deals` remains the independent
curated/database-backed endpoint.

| Query parameter | Behavior |
| --- | --- |
| `title` | Optional title search, trimmed and limited to 80 characters |
| `pageSize` | Defaults to 12; valid from 1 to the configured maximum of 24 |
| `upperPrice` | Optional positive maximum price in USD |

Successful deal responses are cached in memory for five minutes by default;
the store directory is cached for six hours. Stale cached data is used when a
refresh fails. With no valid external result, the endpoint returns the current
local/database deal catalog rather than failing. Cache state is process-local
and is not persisted or shared across instances.

Valid CheapShark `dealID` values produce browser redirect URLs. The backend does
not follow those URLs. Curated/database deals return `dealUrl: null`.

The external deals feed remains request-driven; it has no background catalog
sync. The wishlist scheduler described below is a separate workflow.

## Wishlist price refresh

The `dev` profile contains a scheduled refresh foundation for active,
user-owned items with enabled alerts. It is disabled by default:

```properties
nexora.wishlist.price-refresh.enabled=false
nexora.wishlist.price-refresh.fixed-delay-ms=3600000
nexora.wishlist.price-refresh.provider=stored
nexora.wishlist.price-refresh.cheapshark.enabled=false
nexora.wishlist.price-refresh.cheapshark.page-size=8
nexora.wishlist.price-refresh.cheapshark.match-store=true
```

The stored provider is the safe default and makes no external request. A run
updates `currentPrice` only when a provider returns a changed, nonblank value,
then re-evaluates the alert. It records an event only for a not-reached to
target-reached transition, records a price-history point only for a changed
current price, and logs scanned, refreshed, event-created, and skipped counts.

Enable the CheapShark snapshot provider with:

```properties
nexora.wishlist.price-refresh.provider=cheapshark
```

The legacy-compatible `nexora.wishlist.price-refresh.cheapshark.enabled=true`
flag also selects it. Provider selection does not enable the scheduler; set
`nexora.wishlist.price-refresh.enabled=true` separately.

CheapShark matching is conservative. Exact normalized titles and mapped store
matches rank highest; only limited, safe multi-word contains matches are
accepted. The provider uses `salePrice`, formats zero as `FREE`, skips malformed
or negative prices, and returns no snapshot for an uncertain match. Store or
provider failures are isolated to the affected item.

Coverage is not guaranteed for every game or store. Scheduling is single-process
and has no distributed lock or multi-instance coordination.

## Notification delivery

Notification dispatch is disabled by default, and the log provider sends
nothing externally:

```properties
nexora.notifications.enabled=false
nexora.notifications.provider=log
```

In the persisted `dev` workflow, a target-reached event is saved and flushed
before its notification request is dispatched. Disabled notifications return
without calling the sender. Sender and dispatcher failures are caught so they
cannot roll back event creation.

The log provider records prepared alert details in application logs only. It
does not send email, SMS, push, Slack, or Discord messages.

### Email provider foundation

Select the email provider explicitly:

```properties
nexora.notifications.enabled=true
nexora.notifications.provider=email
nexora.notifications.email.from=no-reply@nexora.local
nexora.notifications.email.subject-prefix=[NEXORA Alert]
nexora.notifications.email.fail-on-missing-recipient=false
```

`EmailNotificationSender` resolves the active account through the existing
`UserAccountStore`, then builds a target-reached subject and plain-text body.
Missing users and blank addresses are logged and skipped by default.

`MailGateway` isolates delivery from notification composition.
`SpringMailGateway` delegates to Spring's `JavaMailSender` when Spring mail is
configured. No SMTP host or credentials are committed. The application still
starts when `provider=email` is selected without SMTP configuration; a delivery
attempt fails at the gateway and is contained by the dispatcher.

Typical Spring mail environment variables include `SPRING_MAIL_HOST`,
`SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, and `SPRING_MAIL_PASSWORD`. Supply
real values through an appropriate local secret or deployment configuration,
not this repository.

### Notification preferences

Authenticated users can read and partially update their account-scoped
preferences through `GET` and `PATCH /api/me/notification-preferences`. Both are
Bearer APIs under `/api/me/**`; they do not use the cookie-auth CSRF flow and do
not accept a client-supplied user ID.

Email is disabled by default. In-app, target-reached, price-drop, and free-game
intent are enabled by default. The default profile stores preferences in memory
and loses them on restart. Flyway V9 adds `notification_preferences` for the
PostgreSQL `dev` profile, with one row per user and cascade cleanup.

This milestone stores notification intent only. The current dispatcher is not
yet preference-aware, and there is no verified-recipient workflow, persisted
delivery status, retry, outbox, or asynchronous after-commit delivery. Email
still requires explicit SMTP configuration and remains a local foundation.

### Sentinel AI gateway foundation

`POST /api/me/sentinel/insight` is an authenticated Bearer endpoint for the
Sentinel gateway architecture. It accepts a message of 1–500 trimmed characters
and an optional `general`, `wishlist`, `deals`, or `security` context. An omitted
context defaults to `general`; unsupported contexts are rejected safely.

Version 0.18 keeps the deterministic local implementation as the default and
adds an optional backend-only Gemini REST provider. Gemini activates only when
`NEXORA_SENTINEL_AI_PROVIDER=gemini` and `GOOGLE_API_KEY` or `GEMINI_API_KEY` is
available; `GOOGLE_API_KEY` takes precedence. A missing key, timeout, network
failure, non-success response, malformed body, or empty answer returns a clearly
labeled local fallback rather than a provider error.

Version 0.19 adds server-generated contextual summaries before provider routing.
Wishlist context contains at most five owner-scoped active items, three recent
alert events, and three price-history points for each of the first three items.
Deals context contains at most five public deals ordered by discount. General
context contains high-level wishlist/alert/deal/giveaway counts and at most five
live giveaways; security context intentionally receives no private account,
credential, session, or risk data. Rendered provider context is redacted,
normalized, and capped at 3,500 characters with an explicit truncation marker.

Version 0.20 adds local-development safety and usage controls. The insight
endpoint uses a configurable in-memory fixed-window limit keyed by authenticated
user ID (12 requests per 60 seconds by default). Safe Gemini failures are
classified in `fallbackReason`, and process-local health metadata tracks only
Gemini success/fallback timestamps, the last safe fallback reason, consecutive
failures, and aggregate success/fallback counts. It never records a user
message, rendered prompt, response, or API key. Context-prompt and answer
character limits are configurable and clamped to safe bounds; their existing
3,500- and 4,000-character defaults are preserved.

The API key is sent only through Gemini's backend `x-goog-api-key` request
header. It is never placed in a URL or response and must not be committed. The
Gemini request sets provider storage off, uses a strict system instruction, and
passes the validated, trimmed message plus the bounded contextual summary.
Context does not include access/refresh tokens, API keys, email addresses, or a
raw database dump; defensive prompt rendering also redacts accidental
token/key/email-like values. Gemini supplies only the bounded answer text;
recommendations, safety notes, and next actions remain deterministic backend
content.

Neither provider stores prompts, summaries, or responses in NEXORA. The
endpoint cannot mutate wishlist, deal, notification, account, or security state. Public
`GET /api/sentinel/status` and `GET /api/sentinel/demo` remain available and
report whether Gemini is configured. These controls are process-local and reset
on backend restart; they are not distributed rate limiting or production AI
observability. This remains a local foundation without production privacy
review, safety evaluation, moderation, abuse monitoring, managed provider
secrets, cost controls, streaming, conversation persistence, or autonomous
actions. Version 0.20 adds no database migration.

## Configuration reference

| Property or variable | Default | Purpose |
| --- | --- | --- |
| `NEXORA_DB_URL` | `jdbc:postgresql://localhost:5432/nexora_db` | `dev` datasource URL |
| `NEXORA_DB_USERNAME` | `nexora_user` | `dev` datasource username |
| `NEXORA_DB_PASSWORD` | `nexora_password` | `dev` datasource password |
| `NEXORA_JWT_SECRET` | Local-only fallback | JWT signing secret |
| `NEXORA_JWT_EXPIRATION_MINUTES` | `60` | Access-token lifetime |
| `NEXORA_REFRESH_TOKEN_HASH_SECRET` | Local-only fallback | HMAC secret for stored refresh-token hashes |
| `NEXORA_REFRESH_TOKEN_COOKIE_NAME` | `nexora_refresh_token` | Refresh-cookie name |
| `NEXORA_REFRESH_TOKEN_EXPIRATION_DAYS` | `7` | Refresh-session and cookie lifetime |
| `NEXORA_REFRESH_TOKEN_COOKIE_SECURE` | `false` | Require HTTPS for the cookie; enable outside local HTTP |
| `NEXORA_REFRESH_TOKEN_COOKIE_SAME_SITE` | `Lax` | Refresh-cookie `SameSite` value |
| `NEXORA_REFRESH_TOKEN_COOKIE_PATH` | `/api/auth` | Refresh-cookie request path |
| `NEXORA_AUTH_CSRF_ENABLED` | `true` | Enable the focused auth-route CSRF/origin guard |
| `NEXORA_AUTH_CSRF_COOKIE_NAME` | `nexora_csrf_token` | Browser-readable CSRF cookie name |
| `NEXORA_AUTH_CSRF_HEADER_NAME` | `X-NEXORA-CSRF` | Required matching request header |
| `NEXORA_AUTH_CSRF_COOKIE_SECURE` | `false` | Require HTTPS for the CSRF cookie; enable outside local HTTP |
| `NEXORA_AUTH_CSRF_COOKIE_SAME_SITE` | `Lax` | CSRF-cookie `SameSite` value |
| `NEXORA_AUTH_CSRF_COOKIE_PATH` | `/api/auth` | CSRF-cookie request path |
| `NEXORA_AUTH_CSRF_EXPIRATION_MINUTES` | `120` | CSRF token-cookie lifetime |
| `NEXORA_AUTH_TRUSTED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Comma-separated auth/CORS origin allowlist |
| `NEXORA_AUTH_ABUSE_CONTROLS_ENABLED` | `true` | Enable process-local auth-route fixed-window controls |
| `NEXORA_AUTH_ABUSE_WINDOW_SECONDS` | `60` | Shared auth-attempt window, safely clamped from 1 to 3,600 seconds |
| `NEXORA_AUTH_ABUSE_REGISTER_MAX_ATTEMPTS` | `10` | Register attempts per process/window, safely clamped from 1 to 10,000 |
| `NEXORA_AUTH_ABUSE_LOGIN_MAX_ATTEMPTS` | `20` | Login attempts per process/window, safely clamped from 1 to 10,000 |
| `NEXORA_AUTH_ABUSE_REFRESH_MAX_ATTEMPTS` | `30` | Refresh attempts per process/window, safely clamped from 1 to 10,000 |
| `NEXORA_AUTH_ABUSE_LOGOUT_MAX_ATTEMPTS` | `30` | Logout attempts per process/window, safely clamped from 1 to 10,000 |
| `NEXORA_AUTH_ABUSE_REJECTION_MAX_ATTEMPTS` | `30` | CSRF/origin rejections per process/window, safely clamped from 1 to 10,000 |
| `NEXORA_AUTH_SECURITY_EVENTS_CLEANUP_ENABLED` | `false` | Enable local daily cleanup of old safe auth security events |
| `NEXORA_AUTH_SECURITY_EVENTS_RETENTION_DAYS` | `30` | Local event age cutoff, safely clamped from 1 to 3,650 days |
| `nexora.external-deals.enabled` | `true` | Enable on-demand CheapShark deal lookup |
| `nexora.external-deals.timeout-seconds` | `5` | External request timeout |
| `nexora.external-deals.default-page-size` | `12` | Default external result count |
| `nexora.external-deals.max-page-size` | `24` | Maximum external result count |
| `nexora.external-deals.cache.deals-ttl-seconds` | `300` | Deal cache lifetime |
| `nexora.external-deals.cache.stores-ttl-seconds` | `21600` | Store cache lifetime |
| `nexora.wishlist.price-refresh.enabled` | `false` | Enable the `dev` scheduler |
| `nexora.wishlist.price-refresh.fixed-delay-ms` | `3600000` | Delay after each run |
| `nexora.wishlist.price-refresh.provider` | `stored` | Select `stored` or `cheapshark` snapshots |
| `nexora.notifications.enabled` | `false` | Enable notification dispatch |
| `nexora.notifications.provider` | `log` | Select `log` or `email` sender |
| `NEXORA_SENTINEL_AI_PROVIDER` | `local` | Select `local` or opt-in `gemini` Sentinel routing |
| `GOOGLE_API_KEY` / `GEMINI_API_KEY` | Empty | Backend-only Gemini key; `GOOGLE_API_KEY` takes precedence |
| `NEXORA_GEMINI_MODEL` | `gemini-3.6-flash` | Gemini model name |
| `NEXORA_GEMINI_BASE_URL` | Google Gemini `v1beta` API | Local/test override for the Gemini REST base URL |
| `NEXORA_GEMINI_TIMEOUT_MS` | `8000` | Gemini connect/request timeout |
| `NEXORA_GEMINI_MAX_OUTPUT_TOKENS` | `512` | Bounded output-token request limit |
| `NEXORA_GEMINI_TEMPERATURE` | `0.2` | Bounded generation temperature |
| `NEXORA_SENTINEL_RATE_LIMIT_ENABLED` | `true` | Enable process-local per-user Sentinel insight limiting |
| `NEXORA_SENTINEL_RATE_LIMIT_WINDOW_SECONDS` | `60` | Fixed rate-limit window, safely clamped from 1 to 3,600 seconds |
| `NEXORA_SENTINEL_RATE_LIMIT_MAX_REQUESTS` | `12` | Requests allowed per user/window, safely clamped from 1 to 1,000 |
| `NEXORA_SENTINEL_MAX_CONTEXT_PROMPT_CHARACTERS` | `3500` | Rendered context-summary limit, safely clamped from 256 to 10,000 characters |
| `NEXORA_SENTINEL_MAX_ANSWER_CHARACTERS` | `4000` | Gemini answer limit, safely clamped from 256 to 16,000 characters |

See `src/main/resources/application.properties` for the complete safe defaults.

## Frontend connection and CORS

The Next.js frontend uses `NEXT_PUBLIC_API_BASE_URL`, which defaults to
`http://localhost:8080`. The backend allows credentialed local `/api/**`
browser requests from these explicit origins:

- `http://localhost:3000` — Next.js development server
- `http://localhost:5173` — retained Vite prototype

The same configured allowlist drives credentialed CORS and the auth trusted-
origin guard. Allowed request headers are limited to `Content-Type`,
`Authorization`, and the configured CSRF header. This supports local HttpOnly
refresh-cookie and CSRF flows only; it is not a reviewed production CORS,
proxy, or origin policy.

## Build and verification

```bash
mvn test
mvn spring-boot:run
mvn clean package
```

Run the packaged application with:

```bash
java -jar target/nexora-api-0.0.1-SNAPSHOT.jar
```

The repository's `Backend CI` GitHub Actions workflow uses Temurin Java 17 for
pushes to `main` and pull requests targeting `main`. One job runs the normal
database-free `mvn test` suite. A separate job starts a PostgreSQL 16 service
and explicitly runs `PostgresDevProfileIntegrationTests` to confirm the `dev`
profile connects, applies Flyway V1–V10, validates the JPA schema, and exposes
the expected tables and seed data.

The PostgreSQL integration test is enabled only when
`NEXORA_POSTGRES_INTEGRATION_TESTS=true`, so local `mvn test` does not require a
database.

The separate `Security CI` workflow runs `mvn -q -DskipTests dependency:tree`
to verify dependency resolution and provide a lightweight dependency baseline.
This is not a Maven vulnerability scan; a dedicated scanner remains future
work.

With a compatible local PostgreSQL instance running, execute it explicitly:

```bash
NEXORA_POSTGRES_INTEGRATION_TESTS=true \
NEXORA_DB_URL=jdbc:postgresql://localhost:5432/nexora_db \
NEXORA_DB_USERNAME=nexora_user \
NEXORA_DB_PASSWORD=nexora_password \
NEXORA_JWT_SECRET=local-integration-test-secret-at-least-thirty-two-bytes \
NEXORA_REFRESH_TOKEN_HASH_SECRET=local-integration-refresh-hash-secret-at-least-thirty-two-bytes \
mvn test -Dtest=PostgresDevProfileIntegrationTests
```

## Current limitations

- No live production deployment, continuous-delivery pipeline, or hosted
  operational runbook has been validated.
- Backend CI does not build application containers. CodeQL remains manual-only
  until code scanning is enabled/available, while Security CI still does not
  include a full Maven vulnerability scanner.
- Docker Compose provides local PostgreSQL only. The Render Dockerfile provides
  backend packaging; no frontend image or CI container-publishing workflow is
  provided. The optional devcontainer supplies a local toolchain only.
- The production-profile guard fails closed for a bounded set of unsafe auth
  secrets, cookies, and origins. It does not provide persistent production
  stores or a complete browser-session design. The full CORS/cookie/origin/proxy
  policy is not reviewed, and session-family reuse response is intentionally
  basic.
- The runtime health endpoint and startup summary expose safe configuration
  labels only. They do not provide database/provider probes, metrics, tracing,
  managed log collection, alerting, incident response, or production uptime
  evidence.
- Authentication still has no account verification, password recovery, roles,
  OAuth, production distributed rate limiting, credential-stuffing/bot defense,
  session list, or revoke-all workflow. The local abuse counters reset on
  restart and do not coordinate across backend processes.
- Auth security-event cleanup is disabled by default and is only a local
  scheduling/storage mechanism. It does not define a production retention,
  privacy, access-control, integrity, monitoring, compliance, or
  incident-response policy.
- The default profile is ephemeral; the `dev` profile requires PostgreSQL,
  either from Docker Compose or a compatible manual installation.
- External data and caches are process-local, and CheapShark coverage is not
  complete.
- Scheduled refresh has no distributed lock or production multi-instance
  guarantees.
- Price-history storage and the personal history API are a foundation, not a
  complete price analytics, aggregation, or charting system.
- Account-scoped notification preferences exist, but dispatcher enforcement,
  durable delivery state, retry/outbox, and asynchronous after-commit behavior
  are not implemented.
- Email delivery requires explicit SMTP configuration.
- Sentinel has bounded backend-generated wishlist, price-history, alert, deal,
  and giveaway summaries with an optional backend-only Gemini provider that is
  disabled by default, deterministic local default/fallback behavior, in-memory
  per-user rate limiting, safe fallback classification, process-local health
  counters, and configurable prompt/answer limits. There is no conversation
  persistence, autonomous action, streaming, production privacy/safety review,
  moderation pipeline, distributed rate limiting, production AI observability,
  abuse monitoring, provider-key management beyond local environment variables,
  or cost control.
