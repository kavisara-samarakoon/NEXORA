# NEXORA

[![Backend CI](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/frontend-ci.yml)
[![Security CI](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/security-ci.yml/badge.svg)](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/security-ci.yml)
[![CodeQL](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/codeql.yml/badge.svg)](https://github.com/kavisara-samarakoon/NEXORA/actions/workflows/codeql.yml)

NEXORA is a secure, network-aware game deals, giveaways, wishlist, and alert
intelligence platform. It combines a Next.js interface with a Spring Boot API,
optional PostgreSQL persistence, and conservative CheapShark integrations.

**Status:** Local/development MVP · Core frontend and backend flows implemented ·
Not deployed as a production service

## What NEXORA does

- Presents curated game deals and giveaways with typed offline fallbacks.
- Retrieves live deal data and store redirect links from CheapShark on demand.
- Supports JWT registration, login, and authenticated account lookup.
- Keeps personal wishlists separate from the public demo/global wishlist.
- Lets users save deals, configure price targets, and review alert evaluations.
- Records target-reached alert history for personal wishlist items.
- Provides opt-in foundations for scheduled price refresh and notification
  delivery.
- Includes Security and Sentinel demo/status experiences. Sentinel is not a
  real AI or Gemini integration yet.

## Key features

| Area | Current capability |
| --- | --- |
| Deals | Curated catalog plus optional live CheapShark mode and redirect URLs |
| Giveaways | API-backed listings with frontend fallback data |
| Authentication | BCrypt passwords and stateless HS256 JWT access tokens |
| Wishlist | Public demo data plus authenticated, user-owned CRUD operations |
| Alert intelligence | Target evaluation, target-reached transitions, and event history |
| Price refresh | Disabled-by-default scheduler with stored or CheapShark snapshot providers |
| Notifications | Disabled-by-default log provider and optional email provider foundation |
| Frontend resilience | Response validation and typed fallbacks for public content pages |

## Architecture overview

| Layer | Implementation |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript, and CSS in `frontend/nexora-web-next` |
| Backend | Spring Boot REST API with Spring Security, validation, JPA, and scheduling |
| Default backend profile | Database-free demo catalogs plus in-memory accounts and personal wishlist state |
| `dev` backend profile | PostgreSQL, Flyway V1–V6, and JPA-backed catalog, account, wishlist, and alert data |
| External data | CheapShark for live deals and optional wishlist price snapshots |
| Delivery adapters | Log notification sender by default; optional Spring mail gateway |
| Continuous integration | GitHub Actions for backend tests, PostgreSQL validation, frontend lint/build, dependency checks, CodeQL, and pull-request dependency review |

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
| `research` | Final-year project and research material |

See [RELEASES.md](RELEASES.md) for concise development milestones and
[docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) for the current readiness
assessment. See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance,
current controls, and known security limitations. Repository workflow and
settings guidance is in
[docs/security/repository-security-hardening.md](docs/security/repository-security-hardening.md).

## Tech stack

- Next.js 16, React 19, TypeScript, and ESLint
- Java 17+, Spring Boot 4.1, Spring Security, Spring Data JPA, and Spring Mail
- PostgreSQL and Flyway for the `dev` profile
- Maven and npm
- CheapShark public API for external deal information

## Local setup

Requirements:

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

### Frontend

```bash
cd frontend/nexora-web-next
cp .env.example .env.local
npm install
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
| `codeql.yml` | Analyzes backend Java and primary frontend JavaScript/TypeScript on `main`, pull requests, and weekly |
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
| Authentication | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Personal wishlist | `GET/POST /api/me/wishlist`, `PATCH /api/me/wishlist/{id}/alert`, `DELETE /api/me/wishlist/{id}` |
| Alert history | `GET /api/me/wishlist/alert-events` |
| Demo/status | `GET /api/security/status`, `GET /api/sentinel/status`, `GET /api/sentinel/demo` |

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
- Docker Compose covers local PostgreSQL only; there are no backend/frontend
  application images, production container workflow, or devcontainer.
- CI does not build application containers. CodeQL and pull-request Dependency
  Review workflows are included, while repository secret scanning/push
  protection remain owner-managed settings and Maven dependency output remains
  visibility rather than a full vulnerability scan.
- Browser `localStorage` token storage is temporary and not production-grade;
  there is no refresh-token or HttpOnly-cookie lifecycle.
- Security hardening such as rate limiting, account verification, recovery,
  token revocation, and operational auditing is incomplete.
- Scheduled refresh is single-process and has no distributed lock or production
  scheduling guarantees.
- CheapShark coverage and conservative title/store matching cannot resolve every
  game or store.
- Notifications have no preference UI, persistent delivery status, retries,
  outbox, or asynchronous after-commit delivery.
- Email requires explicit SMTP configuration and has no verified-recipient
  workflow.
- Sentinel remains a demo/status experience; there is no real AI or Gemini
  integration.
- Price history charts and long-term price history storage are not implemented.

## Roadmap

1. Harden authentication and move browser sessions to an approved secure token
   lifecycle.
2. Review repository secret scanning/push protection and evaluate a reliable
   Maven vulnerability scanner, then add optional application containerization.
3. Add persistent notification delivery status, retry/outbox processing, and
   user preferences.
4. Add production-grade scheduling/locking and price history.
5. Evaluate a real Sentinel AI integration with explicit privacy and safety
   controls.

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
