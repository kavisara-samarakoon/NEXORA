# NEXORA

[![Backend CI](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/frontend-ci.yml)
[![Security CI](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/security-ci.yml/badge.svg)](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/security-ci.yml)

NEXORA is a secure, network-aware game deals, giveaways, wishlist, and alert
intelligence platform. It combines a Next.js interface with a Spring Boot API,
optional PostgreSQL persistence, and conservative CheapShark integrations.

**Status:** Local/development MVP · Core frontend and backend flows implemented ·
Not deployed as a production service

## What NEXORA does

- Presents curated game deals and giveaways with typed offline fallbacks.
- Retrieves live deal data and store redirect links from CheapShark on demand.
- Supports JWT registration, login, authenticated account lookup, and
  process-local abuse controls for repeated authentication attempts.
- Keeps personal wishlists separate from the public demo/global wishlist.
- Lets users save deals, configure price targets, and review alert evaluations.
- Records target-reached alert history for personal wishlist items.
- Provides opt-in foundations for scheduled price refresh and notification
  delivery.
- Includes Security and Sentinel experiences. Authenticated Sentinel requests
  use a backend-only local gateway with an optional Gemini provider, bounded
  context, safety limits, and deterministic local fallback.

## Key features

| Area | Current capability |
| --- | --- |
| Deals | Curated catalog plus optional live CheapShark mode and redirect URLs |
| Giveaways | API-backed listings with frontend fallback data |
| Authentication | BCrypt passwords, memory-first JWT access tokens, server-side refresh sessions, an HttpOnly refresh cookie, and local in-memory auth-route abuse controls |
| Wishlist | Public demo data plus authenticated, user-owned CRUD operations |
| Alert intelligence | Target evaluation, target-reached transitions, and event history |
| Price refresh | Disabled-by-default scheduler with stored or CheapShark snapshot providers |
| Notifications | Disabled-by-default log provider and optional email provider foundation |
| Sentinel | Authenticated backend-only local/Gemini gateway with bounded context, transient responses, safety limits, and local fallback |
| Frontend resilience | Response validation and typed fallbacks for public content pages |

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

See [RELEASES.md](RELEASES.md) for concise development milestones and
[docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) for the current readiness
assessment. See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance,
current controls, and known security limitations. Repository workflow and
settings guidance is in
[docs/security/repository-security-hardening.md](docs/security/repository-security-hardening.md).
Pre-deployment authentication, session, CSRF, CORS, cookie, and secret decisions
are tracked in the planning-only
[auth production-policy plan](docs/security/auth-production-policy-plan.md).
Optional development-container onboarding is documented in
[docs/development/dev-container-foundation.md](docs/development/dev-container-foundation.md).

Register, login, refresh, logout, and repeated CSRF/origin rejection attempts
have local fixed-window controls. Limited requests return `429` with a safe
`rate_limited` response and create a typed, best-effort auth security event.
The counters use only route/purpose keys: they do not store submitted
identifiers, passwords, tokens, cookies, IP addresses, user agents, raw
origins/referrers, or secrets. They are process-local, reset on restart, and are
not production-grade or distributed abuse protection.

Safe auth security events also have a configurable local retention-cleanup
foundation. Cleanup is disabled by default, uses a 30-day default retention
window, and runs daily in UTC only when an owner enables it. The in-memory store
remains capped at 500 events and resets on restart; the `dev` PostgreSQL store
can delete old rows from the existing Flyway V10 table. Cleanup handles only
the existing typed safe metadata and is not a production retention, privacy, or
compliance policy.

## Tech stack

- Next.js 16, React 19, TypeScript, and ESLint
- Java 17+, Spring Boot 4.1, Spring Security, Spring Data JPA, and Spring Mail
- PostgreSQL and Flyway for the `dev` profile
- Maven and npm
- CheapShark public API for external deal information

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
[backend README](backend/nexora-api/README.md).

## Release milestones

- `v0.2.0-alert-intelligence-mvp` — wishlist evaluation and alert history.
- `v0.3.0-price-refresh-foundation` — opt-in scheduled refresh workflow.
- `v0.4.0-real-price-provider` — conservative CheapShark wishlist matching.
- `v0.5.0-notification-foundation` — failure-isolated notification dispatch.
- `v0.6.0-email-notification-foundation` — optional account-aware email adapter.

These are development milestones, not claims of deployed production releases.

## Current limitations

- No production deployment or continuous-delivery pipeline is documented yet.
- Docker Compose covers local PostgreSQL only. The optional devcontainer
  provides a local toolchain, not backend/frontend release images or a
  production container workflow.
- CI does not build application containers. CodeQL and pull-request Dependency
  Review workflows are included, while repository secret scanning/push
  protection remain owner-managed settings and Maven dependency output remains
  visibility rather than a full vulnerability scan.
- Access tokens are memory-first and the refresh token uses an HttpOnly cookie,
  but production cookie/CORS/origin/proxy policy, complete revocation/session
  controls, account verification, recovery, and operational auditing remain
  incomplete.
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

1. Review the local refresh-session, cookie, CSRF, origin, and proxy foundations
   against defined production authentication requirements.
2. Review repository secret scanning/push protection and evaluate a reliable
   Maven vulnerability scanner.
3. Define a production application-container strategy only after deployment,
   operations, and secret-management requirements are established.
4. Add verified-recipient handling, persistent notification delivery status,
   and retry/outbox processing.
5. Add production-grade scheduling/locking and extend price-history analytics.
6. Define production Sentinel privacy, moderation, evaluation, cost-control,
   provider-key, and observability requirements before expanding AI use.

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
