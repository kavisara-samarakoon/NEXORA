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
| Default | Starts without a datasource. Public catalog data is local demo data; accounts, refresh sessions, personal wishlists, alert history, and price history are held in memory. CheapShark external deals remain available on demand. |
| `dev` | Enables PostgreSQL, Flyway V1–V8, Spring Data JPA, persisted catalog/account/refresh-session/wishlist/alert/price-history data, and the optional wishlist refresh scheduler. |

The default profile is useful for UI development and tests. Restarting it
clears accounts and personal wishlist changes. The `dev` profile validates JPA
mappings against the migrated schema with `ddl-auto=validate`; Hibernate does
not create or modify tables.

## Quick start

From `backend/nexora-api`:

```bash
mvn test
mvn spring-boot:run
```

The API starts at [http://localhost:8080](http://localhost:8080). Check
[http://localhost:8080/api/health](http://localhost:8080/api/health) for the
service health response.

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
| `GET` | `/api/health` | Service health status |
| `GET` | `/api/dashboard/summary` | Deal, giveaway, wishlist, database, and Sentinel summary |
| `GET` | `/api/deals` | Curated active deals: local demo data or PostgreSQL in `dev` |
| `GET` | `/api/deals/external` | On-demand CheapShark deals mapped to the NEXORA deal contract |
| `GET` | `/api/giveaways` | Active giveaways: local demo data or PostgreSQL in `dev` |
| `GET` | `/api/wishlist` | Public demo/global wishlist items only |
| `GET` | `/api/security/status` | Demo security summary |
| `GET` | `/api/sentinel/status` | Sentinel integration status |
| `GET` | `/api/sentinel/demo` | Sentinel demo messages and capabilities |
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

Protected endpoints derive ownership from the JWT principal. They do not accept
a client-supplied user ID.

## Authentication

Authentication uses BCrypt password hashes and stateless HS256 JWT access
tokens. Register and login still return the existing
`AuthResponse(token, tokenType, user)` JSON contract, so current Bearer clients
remain compatible. They now also create a server-side refresh session and issue
its opaque token as an HttpOnly cookie.

Only an HMAC-SHA256 token hash is stored. The raw refresh token is generated
independently with `SecureRandom`, is never returned in JSON, and is sent only
through the cookie. The default profile keeps refresh sessions in memory;
`dev` persists them in the Flyway-managed `auth_sessions` table.

The four cookie-sensitive auth POST routes—register, login, refresh, and
logout—require a token from `GET /api/auth/csrf`. The endpoint returns
`{"csrfToken":"..."}` and sets the same value in the non-HttpOnly
`nexora_csrf_token` cookie. Clients must echo the value through
`X-NEXORA-CSRF`. Tokens are generated with `SecureRandom`, are not stored by the
backend or database, and are never refresh tokens. Requests with an `Origin`
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
revoked, its reuse returns `401`, and logout revokes the current record. The
cookie defaults to `HttpOnly`, `SameSite=Lax`, `Path=/api/auth`, a seven-day
maximum age, and `Secure=false` for local HTTP only.

The bundled JWT and refresh-token hash secrets are local-only. Override
`NEXORA_JWT_SECRET` and `NEXORA_REFRESH_TOKEN_HASH_SECRET` in every shared or
deployed environment. The primary frontend now uses the refresh endpoint for
session bootstrap, keeps access tokens in memory, and continues to send Bearer
headers to protected APIs. Spring Security's general-purpose CSRF support stays
disabled because these APIs are stateless; the focused auth-route guard runs
before controller work and validates the double-submit token and trusted origin.
This is a local-development foundation. Its origin, cookie, no-origin client,
proxy, and error-handling policies still require production review.

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

There are no notification preferences, verified-recipient workflow, persisted
delivery statuses, retries, outbox, or asynchronous after-commit delivery yet.

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
profile connects, applies Flyway V1–V8, validates the JPA schema, and exposes
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

- This repository does not document a production deployment,
  continuous-delivery pipeline, application-container build workflow, or
  operational runbook.
- Backend CI does not build application containers. Security CI does not yet
  include a full Maven vulnerability scanner or CodeQL analysis.
- Docker Compose provides local PostgreSQL only; there is no backend application
  image or production container workflow.
- The backend refresh-session foundation is not a complete production browser
  session design. Local CSRF/trusted-origin checks are implemented, but the
  production CORS/cookie/origin/proxy policy is not reviewed, and session-family
  reuse response is intentionally basic.
- Authentication still has no account verification, password recovery, roles,
  OAuth, complete rate limiting, session list, or revoke-all workflow.
- The default profile is ephemeral; the `dev` profile requires PostgreSQL,
  either from Docker Compose or a compatible manual installation.
- External data and caches are process-local, and CheapShark coverage is not
  complete.
- Scheduled refresh has no distributed lock or production multi-instance
  guarantees.
- Price-history storage and the personal history API are a foundation, not a
  complete price analytics, aggregation, or charting system.
- Notification delivery has no preference model, durable state, retry/outbox,
  or asynchronous after-commit behavior.
- Email delivery requires explicit SMTP configuration.
- Sentinel endpoints expose demo/status data only; no real AI or Gemini service
  is integrated.
