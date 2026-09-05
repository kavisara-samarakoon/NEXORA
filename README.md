# NEXORA

[![Backend CI](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/frontend-ci.yml)
[![Security CI](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/security-ci.yml/badge.svg)](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/security-ci.yml)
[![Reviewer Tooling CI](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/reviewer-tooling-ci.yml/badge.svg)](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/reviewer-tooling-ci.yml)

NEXORA is a full-stack game-deal intelligence MVP that combines discovery,
personal price tracking, alert history, account-scoped workflows, and a bounded
Sentinel assistant in one locally runnable project.

> **Project status:** Local/development MVP for learning, portfolio review, and
> controlled evaluation. NEXORA is not deployed and is not production-ready.
> The latest stable development milestone is
> `v0.70.0-backend-health-version-semantics-foundation`.
> No next milestone has started.

Reviewer links: [project overview](docs/PROJECT_OVERVIEW.md) ·
[project status](docs/PROJECT_STATUS.md) · [roadmap](docs/ROADMAP.md) ·
[API contract](docs/api/API_CONTRACT.md) ·
[OpenAPI contract](docs/api/openapi.yaml) ·
[OpenAPI guide](docs/api/OPENAPI_CONTRACT.md) ·
[reviewer API testing](docs/api/REVIEWER_API_TESTING.md) ·
[reviewer local preflight](scripts/reviewer-local-preflight.sh) ·
[API smoke test](scripts/api-smoke-test.sh) · [scripts guide](scripts/README.md) ·
[backend guide](backend/nexora-api/README.md) · [security policy](SECURITY.md) ·
[development milestones](RELEASES.md) ·
[auth production-policy plan](docs/security/auth-production-policy-plan.md)

## Why NEXORA exists

Game deals, giveaways, wishlists, and price targets are often spread across
unrelated services. NEXORA explores how those workflows can fit into one
coherent application while demonstrating a complete system: a responsive
client, authenticated API, persistence, background refresh foundations,
security controls, and testable optional integrations.

## What makes NEXORA different

- The useful local demo does not depend on paid or third-party services;
  PostgreSQL, Gemini, email, and live price refresh remain optional.
- Personal data paths are account-scoped, with explicit ownership checks for
  wishlists, alerts, notification preferences, and price targets.
- Security work is visible in the repository: browser auth controls,
  refresh-token rotation, safe auth security events, local abuse controls, and
  retention cleanup all have documented limits. The `prod` and `production`
  profiles also fail startup when core auth secrets, secure-cookie settings, or
  trusted origins retain unsafe local values, or when the existing `dev`
  database-backed persistence profile is absent.
- Experimental capabilities are labelled honestly. Local foundations are not
  presented as production operations or compliance controls.

## Current MVP scope and maturity

| Area | Current capability | Maturity |
| --- | --- | --- |
| Deals and giveaways | Browse, search, filter, and inspect catalogue records | Implemented MVP |
| Authentication | Register, sign in, rotate sessions, sign out, and inspect the current account | Local security foundation |
| Wishlist | Save and remove games with account ownership boundaries | Implemented MVP |
| Price targets and alerts | Set thresholds, generate alerts, and review generated alert history | Implemented MVP |
| Price history | Record and query snapshots used by deal and alert workflows | Implemented foundation |
| Price refresh | Run manual or scheduled refresh through stored or optional external providers | Optional foundation |
| Notifications | Store account preferences, enforce email and target-reached choices before dispatch, and optionally deliver through SMTP | Optional foundation |
| Sentinel | Use deterministic local responses or optional Gemini responses with bounded context | Experimental foundation |
| Auth security events | Record bounded safe metadata, local abuse decisions, and optional retention cleanup | Local security foundation |
| Runtime observability | Public safe runtime summary and one bounded startup summary line | Local observability foundation |
| Frontend backend health visibility | Dashboard panel for safe local `/api/health` reachability and mode/check labels | Reviewer visibility foundation |
| Frontend data-source transparency | Dashboard summary and key-page notices distinguish local backend API data from bundled static fallback previews | Reviewer visibility foundation |
| Frontend reviewer navigation | Dashboard reviewer path, reusable page source notices, and local-review status wording | Reviewer UX foundation |
| Frontend accessibility review | Dashboard review aid highlights keyboard focus, skip-link, disabled-preview, and reduced-motion foundations | Reviewer accessibility foundation |
| Frontend portfolio evidence | Dashboard evidence summary and source-labelled key pages support public-safe project review | Portfolio presentation foundation |
| Frontend state clarity | Reviewer-safe loading, fallback, empty, unavailable, and manual retry explanations across primary frontend workflows | Reviewer UX foundation |
| Screenshot-safe reviewer guidance | Dashboard checklist documents public-safe capture boundaries without changing runtime identity or privacy behavior | Portfolio review foundation |
| Frontend UI truthfulness | Layout fixes and explicit static-preview labels prevent demo settings, security samples, search, and decorative indicators from appearing live | Frontend polish foundation |
| Request correlation | Safe CORS-exposed response header, request-scoped MDC value, local console correlation, and safe unexpected-error logging | Local observability foundation |
| Frontend API client | Centralized public API base URL handling and response request-ID awareness | Frontend safety foundation |
| Frontend error observability | Selected error/support states expose safe response request-ID metadata | Local debugging foundation |
| API error contract | Shared safe error shape across auth, wishlist, Sentinel, and notification preferences | Backend foundation |
| OpenAPI contract | Hand-maintained OpenAPI 3.1 route and schema reference | Documentation foundation |
| Backend response security | Explicit browser-facing headers and no-cache behavior for sensitive API responses | Backend security foundation |
| Production-profile persistence guard | `prod`/`production` fail closed unless the existing `dev` database-backed profile is also active | Backend safety foundation |
| External-deals resource bounds | Bounded in-process response cache, expired-entry cleanup, and same-key provider-load sharing | Backend resilience foundation |

“Foundation” means the capability is implemented and testable for local
development; it does not imply production-scale operations.

## Architecture overview

| Layer | Implementation |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript, and CSS in `frontend/nexora-web-next` |
| Backend | Spring Boot REST API with Spring Security, validation, JPA, and scheduling |
| Default backend profile | Database-free demo catalogs plus in-memory accounts and personal wishlist state |
| `dev` backend profile | PostgreSQL, Flyway V1–V10, and JPA-backed catalog, account, refresh-session, auth-security-event, wishlist, alert, price-history, and notification-preference data |
| Production-like profile guard | `prod` or `production` requires `dev` so in-memory demo persistence cannot be selected |
| External data | CheapShark for live deals and optional wishlist price snapshots |
| Delivery adapters | Log notification sender by default; optional Spring mail gateway |
| Continuous integration | GitHub Actions for backend tests, PostgreSQL validation, local API smoke testing, OpenAPI contract checking, frontend lint/build, dependency checks, manual CodeQL-ready scanning, and pull-request dependency review |

The public `GET /api/wishlist` contract remains separate from authenticated
personal wishlist endpoints under `/api/me/wishlist`.

## Security-first design notes

- Auth security events use typed safe metadata and exclude raw credentials,
  submitted identifiers, tokens, cookies, IP addresses, user agents, and raw
  origin/referrer values.
- Security-event recording and configured cleanup are best-effort so event-store
  failures do not break normal authentication behavior.
- Auth abuse controls are process-local and reset on restart. Login and
  registration use operation-plus-candidate-identifier digest buckets so one
  candidate subject does not consume an unrelated subject's window. This is
  best-effort local throttling, not distributed rate limiting, bot protection,
  DDoS protection, or CAPTCHA.
- The opaque refresh cookie is `HttpOnly`, scoped to `/api/auth`, and
  `SameSite=Lax` by default. The CSRF cookie uses the same narrow path and
  SameSite default but is intentionally readable for the double-submit flow.
  `Secure=false` is a local HTTP default only; the production-profile guard
  requires both cookies to be secure.
- Backend API responses include `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and a restrictive
  `Permissions-Policy`. Spring Security also applies no-cache/no-store behavior
  to auth-sensitive responses.
- CodeQL remains manual-only because code scanning is not enabled for this
  private repository.
- Production still requires approved deployment, secret management, distributed
  abuse protection, monitoring, privacy/retention, access-control, and
  incident-response decisions.

See [SECURITY.md](SECURITY.md) and the
[auth production-policy plan](docs/security/auth-production-policy-plan.md) for
the boundary between current controls and future production requirements.

## Project structure

| Path | Purpose |
| --- | --- |
| `frontend/nexora-web-next` | Primary Next.js frontend |
| `frontend/nexora-web` | Earlier Vite prototype retained for reference |
| `backend/nexora-api` | Spring Boot API, tests, JPA entities, and Flyway migrations |
| `.github` | Backend, frontend, and security workflows plus Dependabot configuration |
| `docs` | Requirements, architecture, design, security, research, and project-status notes |
| `database` | Supporting schema and database-design workspace |
| `assets` | Shared logos, images, and UI references |
| `devops` | Local PostgreSQL Compose setup plus reserved deployment workspace |
| `.devcontainer` | Optional local Java 17, Maven, Node.js 20, npm, Git, and Docker CLI development environment |
| `research` | Final-year project and research material |

Repository workflow and settings guidance is in
[docs/security/repository-security-hardening.md](docs/security/repository-security-hardening.md).
Optional development-container onboarding is documented in
[docs/development/dev-container-foundation.md](docs/development/dev-container-foundation.md).

## Tech stack

- Next.js 16, React 19, TypeScript, and ESLint
- Java 17+, Spring Boot 4.1, Spring Security, Spring Data JPA, and Spring Mail
- PostgreSQL and Flyway for the `dev` profile
- Maven and npm
- CheapShark public API for external deal information

## Suggested evaluation path

1. Read the [reviewer overview](docs/PROJECT_OVERVIEW.md) for the problem,
   architecture, and scope in one place.
2. Scan the maturity matrix above and
   [current project status](docs/PROJECT_STATUS.md) to distinguish implemented
   features from local foundations.
3. On a fresh machine, run
   [`scripts/reviewer-local-preflight.sh`](scripts/reviewer-local-preflight.sh)
   before starting the backend or smoke test. It checks local readiness only
   and is not a production readiness check.
4. Run the backend tests and frontend lint/build commands in
   [Verification](#verification).
5. Start the local stack and follow the demo flow below.
6. Review [SECURITY.md](SECURITY.md),
   [development milestones](RELEASES.md), and the
   [roadmap](docs/ROADMAP.md) for limitations and next steps.

## Local demo flow

1. Follow the dashboard reviewer path, review the data-source, accessibility,
   portfolio evidence, state-review, and screenshot-safe review aids, and use
   the reusable source
   notices on deals, giveaways, and security. The state guide distinguishes
   loading, bundled fallback, displayed-empty, unavailable, and manual retry
   states; retry controls do not add polling or auto-refresh.
   Keyboard reviewers can confirm visible focus, the skip link, clearly named
   disabled preview controls, and reduced-motion support. These aids support
   local review; they are not production monitoring or a formal WCAG audit.
2. Register a local account and sign in through the cookie-based browser flow.
3. Add a game to the wishlist, set a target price, and inspect price history.
4. Review generated alerts and notification preferences.
5. Try Sentinel in deterministic local mode; optional providers can be
   configured separately.

### Public-safe portfolio captures

The dashboard `ScreenshotSafeReviewPanel` identifies Dashboard, Deals,
Giveaways, Wishlist, Security, and Sentinel as the clearest public-safe capture
pages. Crop browser tabs, the address bar, bookmarks, extensions, account menus,
and desktop notifications. Use an anonymous or safe demo account, or crop
signed-in account/profile areas before sharing.

Keep terminal usernames and local filesystem paths outside captures. Never show
`.env` files, API keys, tokens, cookies, passwords, CSRF values, Authorization
data, private user data, emails, or raw errors. Screenshots are local MVP
evidence only; they do not prove production deployment, monitoring, formal
accessibility certification, privacy guarantees, or production readiness.

## Local setup

NEXORA supports three local-development approaches:

- Install Java, Maven, Node.js, and npm directly on the host.
- Run the applications on the host and use Docker Compose for PostgreSQL only.
- Use the optional development container for the toolchain, with the existing
  PostgreSQL Compose service when persisted development data is needed.

Host-native requirements:

- Node.js 20.9 or newer and npm
- Java 17 or newer
- Maven 3.9 or newer
- PostgreSQL or Docker Compose when running the backend `dev` profile

Run the backend and frontend in separate terminals.

### Backend

```bash
cd backend/nexora-api
mvn test
mvn spring-boot:run
```

The default profile starts without PostgreSQL at
[http://localhost:8080](http://localhost:8080). Verify it at
[http://localhost:8080/api/health](http://localhost:8080/api/health).

For persisted development data, use either a manual PostgreSQL installation or
the local Docker setup described below, then run:

```bash
cd backend/nexora-api
export NEXORA_JWT_SECRET="$(openssl rand -base64 48)"
export NEXORA_REFRESH_TOKEN_HASH_SECRET="$(openssl rand -base64 48)"
export NEXORA_DB_URL=jdbc:postgresql://localhost:5432/nexora_db
export NEXORA_DB_USERNAME=nexora_user
export NEXORA_DB_PASSWORD=nexora_password
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### Docker PostgreSQL local setup

Docker Compose can start PostgreSQL without installing it directly on the host:

```bash
docker compose \
  --env-file devops/docker/postgres.env.example \
  -f devops/docker/postgres.compose.yml \
  up -d
```

The database uses the backend's existing local defaults at `localhost:5432`.
Flyway migrations run when the backend `dev` profile starts; Compose starts only
PostgreSQL. Stop it without deleting data using:

```bash
docker compose -f devops/docker/postgres.compose.yml down
```

Manual PostgreSQL setup remains available in the
[backend README](backend/nexora-api/README.md). Full Docker usage, logs, health,
and reset commands are in the
[Docker README](devops/docker/README.md).

### Optional development container

The repository includes an optional Java 17, Maven, Node.js 20, npm, Git, and
Docker CLI development environment. It forwards ports 3000, 8080, and 5432 but
does not install project dependencies or start PostgreSQL, the backend, or the
frontend automatically.

Use a Dev Containers-compatible editor or tool and follow the
[devcontainer guide](docs/development/dev-container-foundation.md). This is
local developer tooling, not a production application image or deployment
workflow. Host-native setup remains fully supported.

### Frontend

```bash
cd frontend/nexora-web-next
cp .env.example .env.local
npm ci
npm run lint
npm run build
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend | Backend origin; local default is `http://localhost:8080` |
| `NEXT_PUBLIC_SITE_URL` | Frontend | Frontend origin used for metadata; local default is `http://localhost:3000` |
| `NEXORA_DB_URL` | Backend `dev` | PostgreSQL JDBC URL |
| `NEXORA_DB_USERNAME` | Backend `dev` | PostgreSQL username |
| `NEXORA_DB_PASSWORD` | Backend `dev` | PostgreSQL password |
| `NEXORA_JWT_SECRET` | Backend | JWT signing secret; override the local-only default outside local development |
| `NEXORA_REFRESH_TOKEN_HASH_SECRET` | Backend | HMAC secret for stored refresh-token hashes; generate a separate local value |
| `NEXORA_JWT_EXPIRATION_MINUTES` | Backend | Access-token lifetime; default is 60 minutes |

### Production-profile safety foundation

When either `prod` or `production` is active, the backend performs an early,
fail-closed check of persistence selection before its existing core
authentication configuration checks. A production-like profile without the
existing `dev` database-backed profile is rejected instead of starting with
in-memory demo persistence. The auth checks continue to reject missing, short,
coupled, local-default, or obvious placeholder JWT and refresh-token hash
secrets; insecure refresh/CSRF cookies; disabled CSRF protection; an unsafe
refresh-cookie path; and missing, wildcard, local, development-port, or
non-HTTPS trusted origins. Failure messages do not print configured values.

An illustrative environment checklist is:

```text
SPRING_PROFILES_ACTIVE=production,dev
NEXORA_JWT_SECRET=<strong external secret of at least 48 bytes>
NEXORA_REFRESH_TOKEN_HASH_SECRET=<separate strong external secret of at least 48 bytes>
NEXORA_REFRESH_TOKEN_COOKIE_SECURE=true
NEXORA_AUTH_CSRF_COOKIE_SECURE=true
NEXORA_AUTH_CSRF_ENABLED=true
NEXORA_AUTH_TRUSTED_ORIGINS=https://your-frontend-domain.example
```

These are placeholders, not deployable values. The current safe combination
reuses the existing `dev` profile for PostgreSQL-backed stores; it is not a
redesign of production configuration. Default local/demo startup and existing
`dev` database-backed startup remain unchanged. This guard foundation adds no
production deployment, Docker or cloud setup, Redis, distributed storage, or
new provider, and it does not make NEXORA production-ready.

### Runtime observability foundation

Version 0.33 expands `GET /api/health` with a safe milestone, sanitized active
profile labels, derived runtime/data modes, allowlisted provider names, UTC
startup/check times, process uptime, and configuration-level check summaries.
Application startup also writes one bounded line containing the same safe mode
and provider labels.

The completed v0.70 semantics foundation keeps `milestone` as a backward-
compatible legacy alias and adds `observabilityContractMilestone`; both identify
the `v0.33.0-runtime-observability-foundation` health-contract baseline, not the
current repository release. Current release status remains in project and
release documentation rather than runtime metadata that would become stale.

The endpoint and log never include raw property values, secrets, credentials,
datasource URLs, database identities, cookies, tokens, API keys, or full system
environment data. These summaries report application configuration mode; they
do not test external dependency availability or provide production monitoring.
Prometheus, Grafana, OpenTelemetry, managed logging, alerting, dashboards, and
operational response remain future deployment decisions.

The primary Next.js dashboard includes a small reviewer-facing panel that reads
`GET /api/health` without credentials and displays safe reachability, service,
runtime mode, data mode, auth-guard check, active-profile, and checked-time
labels. It handles an unavailable local backend with generic guidance and does
not expose raw failures. This is local reviewer visibility only, not a
production-readiness or deployment-health check.

### Request correlation observability foundation

Version 0.43 adds `X-NEXORA-Request-ID` to backend success and error responses.
Clients may supply an identifier made only from the documented safe token
characters; the backend trims and reuses valid values and replaces missing or
unsafe values with a generated UUID. The same value is available during the
request under the internal MDC key `nexora.request_id`, then removed when the
request finishes.

Request IDs must not contain secrets, tokens, emails, or personal data. The
header is request-level local/development correlation only: it does not add a
JSON response field, distributed tracing, managed log aggregation, dashboards,
metrics, or production monitoring.

The completed v0.44 smoke coverage foundation makes the existing local API
smoke flow validate generated `X-NEXORA-Request-ID` values on public,
CSRF/authentication, and protected success responses. It also verifies exact
echoing of one safe incoming ID, requires generated IDs on established auth and
validation errors, and confirms the shared error JSON body still has no
`requestId` field.

The completed v0.61 CORS exposure foundation allows browser JavaScript on an
already trusted frontend origin to read only the safe `X-NEXORA-Request-ID`
response header. It does not expose Authorization, Cookie, Set-Cookie, CSRF
values, tokens, secrets, or private data. Request-ID generation and validation,
API JSON bodies, authentication/session/CSRF behavior, frontend UI behavior,
and production readiness are unchanged.

The completed v0.48 logging foundation adds the MDC value to every local
backend console line as `requestId=<safe-request-id>`, with `no-request-id` for
work outside an HTTP request. Unexpected API exceptions are logged at ERROR
with only the HTTP method, request URI path, status 500, and stack trace. The
handler does not log request headers, cookies, tokens, query strings, request
bodies, or parameters, and the API JSON response still has no `requestId` field.
Managed logging, tracing, dashboards, alerting, and production incident response
remain future deployment work.

The completed v0.49 foundation adds one local completion summary for each API
request from the existing correlation filter. Its message contains only the
HTTP method, request URI path without query data, response status, and a non-
negative `durationMs`; the request ID remains console metadata supplied by MDC.
The summary does not read or log headers, cookies, Authorization data, tokens,
CSRF values, query strings, parameters, request bodies, or response bodies.

The [request correlation debugging runbook](docs/api/REVIEWER_API_TESTING.md#request-correlation-debugging-runbook)
shows reviewers how to capture `X-NEXORA-Request-ID` and match it against the
backend console completion line. The ID remains absent from JSON bodies, no
sensitive request or response data is logged, and the runbook makes no
production monitoring claim.

### Frontend API client safety foundation

The completed v0.46 foundation centralizes the primary Next.js frontend's
browser-visible `NEXT_PUBLIC_API_BASE_URL` resolution and URL construction in a
small shared helper. The same helper reads trimmed `X-NEXORA-Request-ID`
response-header values as optional internal request-error metadata without
adding request IDs to JSON bodies, logging headers, or sending frontend-
generated request IDs.

Access tokens remain in module memory, refresh tokens remain browser-managed
HttpOnly cookies, and the existing CSRF cookie/header acquisition and one-retry
behavior are unchanged. The helper handles public configuration only and does
not expose credentials or secrets.

### Frontend request error observability foundation

The completed v0.47 foundation retains request IDs in normalized frontend
authentication, Wishlist, Sentinel, and notification-preference errors, then
shows the safe response-header value as a quiet support line in selected
backend error states. Login, registration, Sentinel gateway, personal Wishlist,
notification-preference, and saved-deal save/sync failures are covered; success
and client-only validation states do not display an ID.

The frontend does not generate or send `X-NEXORA-Request-ID` by default. It does
not store the ID, read it from JSON bodies, or display or log raw headers,
tokens, cookies, CSRF values, or Authorization data. Backend behavior and the
existing memory-first authentication and bounded CSRF retry model are unchanged.

### API error contract foundation

Version 0.34 standardizes targeted backend failures across authentication,
browser CSRF/origin checks, local rate limits, personal Wishlist operations,
Sentinel gateway requests, and notification preferences. Existing `error` and
`message` fields remain unchanged for client compatibility. Errors now also
include the HTTP `status`, request URI `path` without its query string, and a
UTC `timestampUtc`; rate-limit responses retain `retryAfterSeconds` and the
`Retry-After` header.

A lowest-priority REST-only fallback gives otherwise unexpected controller
failures the fixed `internal_error` code and a generic message without
serializing exception details. Domain-specific handlers retain priority.

The shared contract never includes request bodies, secrets, credentials,
tokens, cookies, datasource URLs, exception classes, or stack traces. It does
not alter authentication/session behavior, add production monitoring, or make
NEXORA production-ready.

Price refresh and notifications use safe defaults:

```properties
nexora.wishlist.price-refresh.enabled=false
nexora.wishlist.price-refresh.provider=stored
nexora.notifications.enabled=false
nexora.notifications.provider=log
```

CheapShark wishlist snapshots and the email provider must be selected
explicitly. Real email delivery additionally requires external Spring mail/SMTP
configuration; no SMTP credentials are committed.

The completed v0.62 preference-enforcement foundation records an existing
target-reached alert event before checking the account's saved notification
preferences. Outbound dispatcher invocation requires both `emailEnabled` and
`targetReachedEnabled`; either disabled value suppresses dispatch. The existing
default has email disabled, so an account without saved preferences does not
dispatch outbound notifications. Global notification configuration remains the
dispatcher's responsibility. API JSON shapes and alert-history fields are
unchanged, and no delivery/read-state fields, outbox, retry worker, scheduler,
or provider are added.

The completed v0.69 lifecycle foundation returns at most the latest 50
account-scoped Wishlist alert events in newest-first order. Local-demo mode
retains at most the latest 100 in-memory events per account, evicting the oldest
deterministically, while the database-backed `dev` path performs a bounded
recent-event query instead of loading the account's full history. This is not
archival or audit-log retention: no background database deletion job,
production retention/backup policy, or distributed storage was added.

## Continuous integration

GitHub Actions validates both primary applications on pushes to `main` and pull
requests targeting `main`:

| Workflow | Validation |
| --- | --- |
| `backend-ci.yml` | Runs database-free backend tests and a separate PostgreSQL 16 job that validates the `dev` profile, Flyway migrations, and JPA schema |
| `api-smoke-ci.yml` | Warms Maven dependencies with bounded retries, starts the default backend locally, waits for health, and runs the existing reviewer smoke script against localhost |
| `api-contract-ci.yml` | Runs the standard-library checker for the hand-maintained OpenAPI path, operation, schema, security, error, and localhost markers |
| `reviewer-tooling-ci.yml` | Validates the reviewer preflight script's Bash syntax, executable bit, and read-only behavior from both the repository root and `/tmp` |
| `frontend-ci.yml` | Sets up Node.js 20 with npm caching, then runs `npm ci`, lint, and build in `frontend/nexora-web-next` |
| `security-ci.yml` | Audits primary frontend production dependencies at high severity, retains the JSON report, and exports the backend Maven dependency tree |
| `codeql.yml` | Manual CodeQL-ready workflow for backend Java and primary frontend JavaScript/TypeScript; automatic upload is disabled while private-repository code scanning is unavailable |
| `dependency-review.yml` | Runs advisory pull-request dependency review with an intended high-severity threshold when repository support is available |

The completed v0.67 workflow/tooling milestone updated official GitHub action
majors to current Node 24-compatible releases. This action execution runtime is
separate from the application toolchains: backend validation remains on Java 17
and frontend validation remains on Node.js 20. Workflow triggers, commands,
permissions, and Dependency Review's advisory policy are unchanged.

The frontend workflow does not build the retained Vite prototype. Backend CI
keeps the normal test suite database-free and runs PostgreSQL validation in a
separate service-backed job. Dependabot checks GitHub Actions, backend Maven,
and primary frontend npm dependencies weekly. Routine major version-update PRs
are intentionally suppressed; major upgrades are planned manually, while
Dependabot security alerts and eligible security updates remain visible. CI
does not deploy NEXORA. Dependency Review works best with the dependency graph
enabled; secret scanning, push protection, alert policy, and required checks are
repository settings rather than claims made by these workflow files.

GitHub CI validation for v0.65 proved that enforceable Dependency Review is
currently unsupported by this repository's GitHub security configuration. The
workflow therefore remains advisory through intentional
`continue-on-error: true`; `fail-on-severity: high` remains the intended review
threshold when the action can evaluate dependency changes. Dependency Review
must not be treated as a rejecting or merge-blocking control. Enforceable use is
deferred until the required GitHub Dependency Graph and repository security
capability are available. Results use the job summary without write access for
pull-request comments. The production npm audit gate and Maven dependency-tree
visibility remain separate CI controls.

API Smoke CI runs [`scripts/api-smoke-test.sh`](scripts/api-smoke-test.sh)
against a backend started inside the GitHub Actions runner. It checks public
endpoints, auth/CSRF, protected endpoints, Sentinel insight, and shared API
error-contract behavior without targeting a deployed service. The v0.44 smoke
coverage also checks UUID-style generated request IDs, exact echoing of a safe
incoming request ID, and request ID presence on auth/error responses without
adding `requestId` to JSON bodies. Before startup, the workflow warms Maven
dependencies with bounded retries and uses Maven batch/no-transfer-progress
mode for cleaner logs. The health wait fails early if the Maven/backend process
exits and prints a bounded log tail;
`backend-smoke.log` is still uploaded for debugging. This reduces the impact of
transient Maven Central HTTP 429 responses without ignoring persistent
dependency-resolution or backend-startup failures.

API Contract CI runs
[`scripts/openapi-contract-check.py`](scripts/openapi-contract-check.py) against
the hand-maintained OpenAPI file. The lightweight checker verifies expected
paths and operations, schema/security/error markers, and localhost-only server
assumptions without installing an OpenAPI toolchain.

Reviewer Tooling CI sets up Java 17, Python 3.12, and Node.js 20 so
[`scripts/reviewer-local-preflight.sh`](scripts/reviewer-local-preflight.sh) can
verify its expected tools. It checks Bash syntax and executable mode, then runs
the read-only preflight from the repository root and from `/tmp` through its
absolute path. It does not start the backend or frontend, run tests, install
dependencies, run the API smoke test, read secrets, or prove production
readiness.

## API overview

| Area | Endpoints |
| --- | --- |
| Service | `GET /api`, `GET /api/health`, `GET /api/dashboard/summary` |
| Catalog | `GET /api/deals`, `GET /api/deals/external`, `GET /api/giveaways` |
| Public wishlist | `GET /api/wishlist` |
| Authentication | `GET /api/auth/csrf`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Personal wishlist | `GET/POST /api/me/wishlist`, `PATCH /api/me/wishlist/{id}/alert`, `DELETE /api/me/wishlist/{id}` |
| Alert history | `GET /api/me/wishlist/alert-events` |
| Notification preferences | `GET/PATCH /api/me/notification-preferences` |
| Sentinel | `GET /api/sentinel/status`, `GET /api/sentinel/demo`, authenticated `POST /api/me/sentinel/insight` |
| Security status | `GET /api/security/status` |

The full endpoint and configuration reference is in the
[backend README](backend/nexora-api/README.md). The source-aligned
[API contract](docs/api/API_CONTRACT.md) and copyable
[reviewer testing guide](docs/api/REVIEWER_API_TESTING.md) document access,
request/response, auth/CSRF, and shared error behavior without duplicating it
here. The hand-maintained [OpenAPI contract](docs/api/openapi.yaml) and its
[guide](docs/api/OPENAPI_CONTRACT.md) provide a complementary machine-readable
route/schema overview. Reviewers can run the local-only
[API smoke test](scripts/api-smoke-test.sh); its prerequisites and safety
controls are summarized in the [scripts guide](scripts/README.md), and API
Smoke CI runs that same script against a locally started backend.

## Release milestones

The latest stable development milestone is
`v0.70.0-backend-health-version-semantics-foundation`. No next milestone has
started. The completed v0.70 milestone adds the explicit
`observabilityContractMilestone` health field while retaining `milestone` as a
legacy alias with the same v0.33 contract-baseline value. The endpoint path,
status behavior, and existing JSON fields are unchanged. The primary frontend
parser accepts the additive field without displaying new UI and still tolerates
older backends. OpenAPI YAML changes only for the additive health field. Auth,
deals, Wishlist, Sentinel, notifications, production-profile guards,
dependencies, workflows, scripts, and runtime health behavior are unchanged,
and NEXORA remains not production-ready.

The recommended next candidate is
`v0.71.0-backend-external-provider-request-budget-foundation`; it has not
started and is not an active milestone.

The completed v0.67 milestone updated official GitHub action majors for Node 24
action-runtime compatibility without changing application toolchains or runtime
behavior.
Recent milestones progressively added browser auth hardening, safe auth security
events, local abuse controls, and local event-retention cleanup. Earlier
milestones established the deal, wishlist, alert, notification, refresh, and
Sentinel foundations.

See [RELEASES.md](RELEASES.md) for the full history. These tags mark repository
development progress, not production releases.

## Not production-ready

NEXORA is designed for local demonstration, academic evaluation, and portfolio
review. It is not a hosted production service and has no production
availability, scale, security-assurance, or compliance claim.

- No production deployment or continuous-delivery pipeline is documented yet.
- Docker Compose covers local PostgreSQL only. The optional devcontainer
  provides a local toolchain, not backend/frontend release images or a
  production container workflow.
- CI does not build application containers. CodeQL and pull-request Dependency
  Review workflows are included, while repository secret scanning/push
  protection remain owner-managed settings and Maven dependency output remains
  visibility rather than a full vulnerability scan.
- Access tokens are memory-first and the refresh token uses an HttpOnly cookie.
  The v0.32 production-profile gate rejects a narrow set of unsafe startup
  values, and the v0.64 guard prevents production-like profiles from selecting
  in-memory demo persistence. The accepted combination currently reuses the
  development database profile; complete production configuration, cookie/
  CORS/origin/proxy policy, revocation controls, account verification,
  recovery, and operational auditing remain incomplete.
- The v0.33 health/startup summaries are lightweight local visibility, not
  production dependency probes, metrics, tracing, log aggregation, alerting, or
  an uptime guarantee.
- Scheduled refresh is single-process and has no distributed lock or production
  scheduling guarantees.
- CheapShark coverage and conservative title/store matching cannot resolve every
  game or store.
- External-deals caching and same-key load sharing remain process-local; there is
  no distributed cache or distributed rate limiter.
- Notification preferences are account-scoped, but notifications have no
  persistent delivery status, retries, outbox, or asynchronous after-commit
  delivery.
- Email requires explicit SMTP configuration and has no verified-recipient
  workflow.
- Sentinel has an optional backend-only Gemini provider, bounded context, local
  safety controls, and deterministic fallback. It has no conversation
  persistence, autonomous actions, moderation pipeline, distributed rate
  limiting, or production AI observability.
- Price history has persisted snapshots and a compact visualization, but no
  production retention policy, aggregation, or advanced analytics.

## Roadmap

The milestone-based [project roadmap](docs/ROADMAP.md) separates near-term
polish, product UX, deployment preparation, production security requirements,
Sentinel expansion, and longer-term product exploration. No delivery dates or
production launch are promised.

## Verification

```bash
cd backend/nexora-api
mvn test
```

```bash
cd frontend/nexora-web-next
npm run lint
npm run build
```

```bash
git diff --check
```

NEXORA is presented as a portfolio and academic software-engineering project.
The repository demonstrates an end-to-end MVP and its tested foundations while
keeping production-readiness gaps explicit.
