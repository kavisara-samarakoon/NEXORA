# NEXORA development milestones

These labels summarize completed repository milestones. They do not imply a
public deployment, published package, or production release.

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
