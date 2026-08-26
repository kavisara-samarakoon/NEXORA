# NEXORA

[![Backend CI](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/frontend-ci.yml)
[![Security CI](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/security-ci.yml/badge.svg)](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/security-ci.yml)

NEXORA is a full-stack game-deal intelligence MVP that combines discovery,
personal price tracking, alert history, account-scoped workflows, and a bounded
Sentinel assistant in one locally runnable project.

> **Project status:** Local/development MVP for learning, portfolio review, and
> controlled evaluation. NEXORA is not deployed and is not production-ready.
> The latest stable development milestone is
> [`v0.34.0-api-error-contract-foundation`](https://github.com/kavisara-samarakoon/NEXORA/tree/v0.34.0-api-error-contract-foundation).

Reviewer links: [project overview](docs/PROJECT_OVERVIEW.md) ·
[project status](docs/PROJECT_STATUS.md) · [roadmap](docs/ROADMAP.md) ·
[API contract](docs/api/API_CONTRACT.md) ·
[reviewer API testing](docs/api/REVIEWER_API_TESTING.md) ·
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
  trusted origins retain unsafe local values.
- Experimental capabilities are labelled honestly. Local foundations are not
  presented as production operations or compliance controls.

## Current MVP scope and maturity

| Area | Current capability | Maturity |
| --- | --- | --- |
| Deals and giveaways | Browse, search, filter, sort, and inspect catalogue records | Implemented MVP |
| Authentication | Register, sign in, rotate sessions, sign out, and inspect the current account | Local security foundation |
| Wishlist | Save and remove games with account ownership boundaries | Implemented MVP |
| Price targets and alerts | Set thresholds, generate alerts, and review delivery/read state | Implemented MVP |
| Price history | Record and query snapshots used by deal and alert workflows | Implemented foundation |
| Price refresh | Run manual or scheduled refresh through stored or optional external providers | Optional foundation |
| Notifications | Store preferences and optionally deliver through SMTP | Optional foundation |
| Sentinel | Use deterministic local responses or optional Gemini responses with bounded context | Experimental foundation |
| Auth security events | Record bounded safe metadata, local abuse decisions, and optional retention cleanup | Local security foundation |
| Runtime observability | Public safe runtime summary and one bounded startup summary line | Local observability foundation |
| API error contract | Shared safe error shape across auth, wishlist, Sentinel, and notification preferences | Backend foundation |

“Foundation” means the capability is implemented and testable for local
development; it does not imply production-scale operations.

## Architecture overview

| Layer | Implementation |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript, and CSS in `frontend/nexora-web-next` |
| Backend | Spring Boot REST API with Spring Security, validation, JPA, and scheduling |
| Default backend profile | Database-free demo catalogs plus in-memory accounts and personal wishlist state |
| `dev` backend profile | PostgreSQL, Flyway V1–V10, and JPA-backed catalog, account, refresh-session, auth-security-event, wishlist, alert, price-history, and notification-preference data |
| External data | CheapShark for live deals and optional wishlist price snapshots |
| Delivery adapters | Log notification sender by default; optional Spring mail gateway |
| Continuous integration | GitHub Actions for backend tests, PostgreSQL validation, frontend lint/build, dependency checks, manual CodeQL-ready scanning, and pull-request dependency review |

The public `GET /api/wishlist` contract remains separate from authenticated
personal wishlist endpoints under `/api/me/wishlist`.

## Security-first design notes

- Auth security events use typed safe metadata and exclude raw credentials,
  submitted identifiers, tokens, cookies, IP addresses, user agents, and raw
  origin/referrer values.
- Security-event recording and configured cleanup are best-effort so event-store
  failures do not break normal authentication behavior.
- Auth abuse controls are process-local and reset on restart; they are not
  distributed production rate limiting.
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
3. Run the backend tests and frontend lint/build commands in
   [Verification](#verification).
4. Start the local stack and follow the demo flow below.
5. Review [SECURITY.md](SECURITY.md),
   [development milestones](RELEASES.md), and the
   [roadmap](docs/ROADMAP.md) for limitations and next steps.

## Local demo flow

1. Browse and filter deals and giveaways without an account.
2. Register a local account and sign in through the cookie-based browser flow.
3. Add a game to the wishlist, set a target price, and inspect price history.
4. Review generated alerts and notification preferences.
5. Try Sentinel in deterministic local mode; optional providers can be
   configured separately.

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
fail-closed check of core authentication configuration. It rejects missing,
short, coupled, local-default, or obvious placeholder JWT and refresh-token hash
secrets; insecure refresh/CSRF cookies; disabled CSRF protection; an unsafe
refresh-cookie path; and missing, wildcard, local, development-port, or
non-HTTPS trusted origins. Failure messages identify property names without
printing configured secret values.

An illustrative environment checklist is:

```text
SPRING_PROFILES_ACTIVE=production
NEXORA_JWT_SECRET=<strong external secret of at least 48 bytes>
NEXORA_REFRESH_TOKEN_HASH_SECRET=<separate strong external secret of at least 48 bytes>
NEXORA_REFRESH_TOKEN_COOKIE_SECURE=true
NEXORA_AUTH_CSRF_COOKIE_SECURE=true
NEXORA_AUTH_CSRF_ENABLED=true
NEXORA_AUTH_TRUSTED_ORIGINS=https://your-frontend-domain.example
```

These are placeholders, not deployable values. The guard does not create a
production configuration, select persistent storage, configure HTTPS or a
reverse proxy, or make NEXORA production-ready. Default and `dev` startup keep
their existing local-development behavior.

### Runtime observability foundation

Version 0.33 expands `GET /api/health` with a safe milestone, sanitized active
profile labels, derived runtime/data modes, allowlisted provider names, UTC
startup/check times, process uptime, and configuration-level check summaries.
Application startup also writes one bounded line containing the same safe mode
and provider labels.

The endpoint and log never include raw property values, secrets, credentials,
datasource URLs, database identities, cookies, tokens, API keys, or full system
environment data. These summaries report application configuration mode; they
do not test external dependency availability or provide production monitoring.
Prometheus, Grafana, OpenTelemetry, managed logging, alerting, dashboards, and
operational response remain future deployment decisions.

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

## Continuous integration

GitHub Actions validates both primary applications on pushes to `main` and pull
requests targeting `main`:

| Workflow | Validation |
| --- | --- |
| `backend-ci.yml` | Runs database-free backend tests and a separate PostgreSQL 16 job that validates the `dev` profile, Flyway migrations, and JPA schema |
| `frontend-ci.yml` | Sets up Node.js 20 with npm caching, then runs `npm ci`, lint, and build in `frontend/nexora-web-next` |
| `security-ci.yml` | Audits primary frontend production dependencies at high severity, retains the JSON report, and exports the backend Maven dependency tree |
| `codeql.yml` | Manual CodeQL-ready workflow for backend Java and primary frontend JavaScript/TypeScript; automatic upload is disabled while private-repository code scanning is unavailable |
| `dependency-review.yml` | Reviews dependency changes on pull requests to `main` and rejects newly introduced high or critical known vulnerabilities |

The frontend workflow does not build the retained Vite prototype. Backend CI
keeps the normal test suite database-free and runs PostgreSQL validation in a
separate service-backed job. Dependabot checks GitHub Actions, backend Maven,
and primary frontend npm dependencies weekly. Routine major version-update PRs
are intentionally suppressed; major upgrades are planned manually, while
Dependabot security alerts and eligible security updates remain visible. CI
does not deploy NEXORA. Dependency Review works best with the dependency graph
enabled; secret scanning, push protection, alert policy, and required checks are
repository settings rather than claims made by these workflow files.

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
here.

## Release milestones

The latest stable development milestone is
[`v0.34.0-api-error-contract-foundation`](https://github.com/kavisara-samarakoon/NEXORA/tree/v0.34.0-api-error-contract-foundation).
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
  values, but complete cookie/CORS/origin/proxy policy, persistent production
  session storage, revocation controls, account verification, recovery, and
  operational auditing remain incomplete.
- The v0.33 health/startup summaries are lightweight local visibility, not
  production dependency probes, metrics, tracing, log aggregation, alerting, or
  an uptime guarantee.
- Scheduled refresh is single-process and has no distributed lock or production
  scheduling guarantees.
- CheapShark coverage and conservative title/store matching cannot resolve every
  game or store.
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
