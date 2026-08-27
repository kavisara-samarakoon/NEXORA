# NEXORA development milestones

These labels summarize repository development milestones. They do not imply a
public deployment, published package, or production release.

The latest stable development tag is
[`v0.36.0-api-smoke-testing-foundation`](https://github.com/kavisara-samarakoon/NEXORA/tree/v0.36.0-api-smoke-testing-foundation).
Older headings retain the wording used when each milestone was recorded.

## In progress — v0.37.0 API Smoke CI foundation

- Added `.github/workflows/api-smoke-ci.yml` to start the default backend on
  localhost in GitHub Actions, wait for health, and run the existing
  `scripts/api-smoke-test.sh` reviewer flow. Backend smoke logs are uploaded as
  a retained artifact for debugging. CodeQL remains manual-only. This workflow
  and documentation milestone changes no Java runtime code, Java tests,
  frontend code, dependency manifests, or database migrations, and makes no
  production-readiness claim.

## Completed tooling milestone — v0.36.0 API smoke testing foundation

- Added `scripts/api-smoke-test.sh`, `scripts/README.md`, and reviewer-guide
  links for repeatable checks of the documented public, CSRF/auth, protected,
  Sentinel, and shared-error flow. The script uses generated fake credentials,
  masks tokens, keeps cookies temporary, blocks non-local targets by default,
  and requires no `jq`. This local script/documentation milestone changes no
  runtime code, dependencies, migrations, workflows, or production status.

## Completed documentation milestone — v0.35.0 API contract documentation foundation

- Added `docs/api/API_CONTRACT.md` and
  `docs/api/REVIEWER_API_TESTING.md`, with concise links from the root and
  backend READMEs. The source-aligned documents cover public/protected routes,
  auth/CSRF/refresh flow, shared errors, profiles, localhost curl review, and
  honest security/operations limits. This documentation-only milestone changes
  no runtime code, dependencies, migrations, workflows, or production status.

## Completed backend milestone — v0.34.0 API error contract foundation

- Added a shared safe error response/factory across targeted auth, CSRF/origin,
  rate-limit, Wishlist, Sentinel, and notification-preference failures.
  Existing `error`, `message`, and rate-limit `retryAfterSeconds` fields remain
  compatible; safe status, path, and UTC timestamp metadata are additive. No
  raw requests, secrets, tokens, cookies, credentials, datasource URLs,
  exception classes, or stack traces are exposed. A REST-only fallback safely
  normalizes otherwise unexpected controller failures. Authentication/session
  behavior and production readiness are unchanged.

## Completed backend milestone — v0.33.0 runtime observability foundation

- Expanded `GET /api/health` with safe runtime mode, sanitized profile,
  allowlisted provider, timing, uptime, and bounded configuration summaries,
  plus one safe application-ready startup line. No secrets, credentials,
  datasource URLs, cookies, tokens, API keys, or raw environment values are
  exposed. This adds no dependency, migration, workflow, external monitoring,
  deployment, or production-readiness claim.

## Completed backend milestone — v0.32.0 production profile safety foundation

- Added production-profile startup checks that fail closed for unsafe core auth
  secrets, refresh/CSRF cookie settings, CSRF enablement, and trusted origins.
  Default and `dev` behavior remain unchanged. This backend safety foundation
  changes no API, migration, dependency, workflow, or deployment configuration
  and makes no production-readiness claim.

## Completed frontend milestone — v0.31.0 frontend accessibility review

- Improved keyboard navigation, labels, ARIA semantics, focus visibility,
  reduced-motion behavior, UX-state announcements, and text readability in the
  primary Next.js frontend. This accessibility polish changes no backend, API,
  security posture, deployment readiness, or production status.

## Completed frontend milestone — v0.30.0 product UX quality polish

- Improved loading, empty, error, fallback, unavailable, and authentication-
  required states in the primary Next.js interface. This frontend-focused
  milestone changes no backend, API, security, deployment readiness, or
  production status.

## Completed frontend milestone — v0.29.0 mobile responsive UI polish

- Refined the primary Next.js interface across mobile, tablet, and small-screen
  layouts while preserving its Liquid Glass identity and v0.28 motion polish.
  This frontend-only milestone changes no backend, API, security, deployment,
  or production-readiness state.

## Completed frontend milestone — v0.28.0 premium UI motion polish

- Refining the primary Next.js interface with CSS-first motion tokens, layered
  atmosphere, reveal timing, interaction feedback, and reduced-motion support
  without changing product behavior or production readiness.

## Completed documentation milestone — v0.27.0 repository presentation polish

- Improved repository-level documentation, reviewer navigation, maturity
  wording, and roadmap clarity without changing runtime behavior or production
  readiness.

## Completed backend milestone — v0.26.0 auth security event retention foundation

- Added configurable local/development retention cleanup for safe auth security
  events without adding a public event API, dashboard, monitoring system, or
  production compliance claim.

## Unreleased — v0.25.0 auth abuse controls foundation

- Added process-local authentication abuse controls for repeated auth-route
  attempts with safe 429 responses and auth security-event recording, without
  claiming production distributed rate limiting.

## Unreleased — v0.24.0 auth security events foundation

- Added a safe authentication security-event recording foundation for
  register, login, refresh, logout, and auth-route rejection visibility without
  storing raw credentials or claiming production monitoring readiness.

## Unreleased — v0.23.0 auth production policy plan

- Added an authentication, session, CSRF, CORS, and cookie production-policy
  plan without changing local runtime behavior or claiming production
  readiness.

## Unreleased — v0.22.0 dev container foundation

- Added optional local devcontainer onboarding and improved Docker PostgreSQL
  developer documentation without adding production deployment or application
  container release images.

## Unreleased — v0.21.0 security CI hardening

- Added repository security hardening with manual CodeQL-ready/dependency-review evaluation,
  improved security workflow documentation, and clearer security policy guidance.

## Unreleased — v0.20.0 Sentinel AI safety controls

- Added Sentinel AI safety controls with in-memory per-user rate limiting,
  provider fallback classification, provider health tracking, and configurable
  prompt/answer limits.

## Unreleased — v0.19.0 Sentinel contextual insights

- Added bounded backend-generated NEXORA context summaries for Sentinel
  wishlist, deals, giveaways, and price guidance without conversation
  persistence or autonomous actions.

## Unreleased — v0.18.0 Gemini provider foundation

- Added optional backend-only Gemini provider behind Sentinel gateway with local
  fallback and no message persistence.

## Unreleased — v0.17.0 AI gateway foundation

- Added authenticated Sentinel AI gateway foundation with a local deterministic
  provider and no external AI calls.

## Unreleased — v0.16.0 notification preferences foundation

- Added authenticated notification preferences foundation with account-scoped
  API, PostgreSQL/in-memory storage, and Wishlist UI controls.

## Unreleased — v0.15.0 price-history visualization polish

- Added price-history visualization polish with compact card summaries, trend
  indicators, and recent snapshot timeline.

## Unreleased — wishlist price-history foundation

- Added wishlist price-history foundation with persisted snapshots, personal
  history API, and simple frontend history display.

## Unreleased — auth CSRF/trusted-origin foundation

- Added auth CSRF/trusted-origin hardening foundation for refresh-cookie browser
  flows.

## Unreleased — frontend refresh-session foundation

- Added frontend refresh-session foundation with memory-first access tokens,
  session bootstrap, backend logout, and refresh-cookie consumption.

## Unreleased — backend refresh-token/session foundation

- Added backend refresh-token/session foundation with hashed server-side refresh
  sessions, refresh rotation, logout, and HttpOnly cookie issuance.

## Unreleased — auth/session hardening plan

- Added auth/session hardening plan for refresh-token, HttpOnly-cookie, logout,
  revocation, and account-safety roadmap.

## Unreleased — Dependabot policy polish

- Suppressed routine major version-update PRs while keeping grouped minor and
  patch dependency maintenance active.

## Unreleased — security scanning CI foundation

- Added lightweight security CI, weekly Dependabot configuration, and a
  repository security policy without requiring GitHub Advanced Security.

## Unreleased — PostgreSQL CI integration validation

- Added PostgreSQL `dev`-profile integration validation for Flyway migrations,
  JPA schema startup, required tables, and seed data in backend CI.

## Unreleased — wishlist price input polish

- Polished wishlist target-price input normalization and validation, including
  common trailing-dollar formats.

## Unreleased — local PostgreSQL infrastructure

- Added a PostgreSQL 16 Docker Compose service with safe local defaults, a
  health check, and named-volume persistence.
- Kept backend/frontend application containers and production deployment out of
  scope.

## Unreleased — CI foundation

- Added independent GitHub Actions workflows for backend Maven tests and
  frontend dependency installation, lint, and production builds.
- Kept deployment, PostgreSQL integration services, container builds, and
  release automation out of scope.

## v0.6.0-email-notification-foundation

- Added an optional account-aware email notification sender.
- Added a mockable Spring mail gateway and safe configuration defaults.
- Kept notifications and external email delivery disabled by default.

## v0.5.0-notification-foundation

- Added target-reached notification requests, dispatching, and a log provider.
- Isolated sender failures from persisted alert-event creation.

## v0.4.0-real-price-provider

- Added an opt-in CheapShark wishlist price snapshot provider.
- Added conservative title and store matching to reduce incorrect updates.

## v0.3.0-price-refresh-foundation

- Added an opt-in scheduled workflow for active personal wishlist alerts.
- Added transition-only target-reached event creation and refresh summaries.

## v0.2.0-alert-intelligence-mvp

- Added wishlist alert settings and current-versus-target evaluation.
- Added persisted alert history in the PostgreSQL `dev` profile.
- Added frontend evaluation and recent-event displays.
