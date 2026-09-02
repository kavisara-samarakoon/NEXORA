# NEXORA development milestones

These labels summarize repository development milestones. They do not imply a
public deployment, published package, or production release.

The latest stable development tag is
[`v0.54.0-frontend-data-source-transparency-foundation`](https://github.com/kavisara-samarakoon/NEXORA/tree/v0.54.0-frontend-data-source-transparency-foundation).
Older headings retain the wording used when each milestone was recorded.

## In progress — v0.55.0 Frontend Reviewer Navigation Polish foundation

- Adds a reusable page source notice to the deals, giveaways, and security
  pages, a six-route reviewer path panel to the dashboard, and safer static
  local-preview wording in the topbar and sidebar. This frontend presentation
  milestone changes no backend/API contract, OpenAPI YAML,
  auth/session/CSRF/CORS behavior, dependencies, workflows, scripts, or retained
  Vite frontend. It does not display or read secrets, tokens, cookies, CSRF
  values, Authorization data, request IDs, raw exceptions, private data, or
  local paths, and it does not make NEXORA production-ready.

## Completed frontend milestone — v0.54.0 Frontend Data Source Transparency foundation

- Adds a primary-dashboard data-source summary that distinguishes local backend
  API results from bundled static fallback previews, plus compact source notices
  on the deals, giveaways, and security pages. The labels are local reviewer
  visibility only and do not provide production monitoring. This milestone
  changes no backend/API contract, OpenAPI YAML, auth/session/CSRF/CORS behavior,
  dependencies, workflows, scripts, or retained Vite frontend. It does not read
  or display secrets, tokens, cookies, CSRF values, Authorization data, request
  IDs, response headers, browser storage, or raw exceptions, and it does not
  make NEXORA production-ready.

## Completed frontend milestone — v0.53.0 Frontend Backend Health Visibility foundation

- Adds a compact panel to the primary Next.js dashboard for the existing public
  `/api/health` response. It displays safe local status, service, runtime mode,
  data mode, auth-production-guard check, active profiles, and checked time,
  with a generic startup hint when the backend is unavailable. The panel reads
  no response headers, credentials, browser storage, cookies, tokens, CSRF
  values, request IDs, or raw failure messages. This frontend and documentation
  milestone changes no backend runtime behavior, API contract, OpenAPI YAML,
  auth/session/CSRF/CORS behavior, dependency manifests, workflows, or scripts
  and does not make NEXORA production-ready.

## Completed CI milestone — v0.52.0 Reviewer Preflight CI foundation

- Adds `.github/workflows/reviewer-tooling-ci.yml` to validate the reviewer
  preflight script's Bash syntax, executable mode, repository-root invocation,
  and absolute-path invocation from `/tmp`. GitHub Actions sets up Java 17,
  Python 3.12, and Node.js 20 for the script's expected tool checks. The
  workflow does not start services, run tests, install dependencies, run the
  API smoke test, read secrets, or prove production readiness. This CI/tooling
  and documentation milestone changes no backend or frontend runtime code,
  tests, dependency manifests, database migrations, OpenAPI YAML, existing
  smoke/OpenAPI scripts, reviewer preflight script, or API behavior.

## Completed tooling milestone — v0.51.0 Reviewer Local Preflight foundation

- Adds `scripts/reviewer-local-preflight.sh` to check required local tools and
  repository paths before review, with warnings when optional frontend tools
  are missing or outdated. It does not start services, run tests, install
  dependencies, access the network, read secrets, or make NEXORA production-
  ready. This local tooling and documentation milestone changes no backend or
  frontend runtime code, tests, dependency manifests, database migrations,
  OpenAPI YAML, GitHub Actions workflows, existing smoke/OpenAPI scripts, or API
  behavior.

## Completed documentation milestone — v0.50.0 Request Correlation Reviewer Runbook foundation

- Adds a manual reviewer runbook for capturing generated request IDs and
  matching them to backend console logs, safely echoing an incoming ID,
  correlating an established error response, and confirming `requestId` remains
  absent from JSON bodies. This documentation-only milestone changes no backend
  or frontend runtime code, tests, dependency manifests, database migrations,
  OpenAPI YAML, GitHub Actions workflows, smoke script, or API behavior and does
  not make NEXORA production-ready.

## Completed backend milestone — v0.49.0 Backend Safe Request Summary Logging foundation

- Adds one safe local API request-completion summary from the existing
  correlation filter with method, URI path, status, and `durationMs` only. The
  request ID remains supplied by the MDC console pattern. No request/response
  headers, cookies, Authorization data, tokens, CSRF values, query strings,
  parameters, or request/response bodies are logged, and the JSON contract is
  unchanged. This local/development foundation changes no frontend, dependency
  manifest, migration, OpenAPI YAML, workflow, or auth/session/CSRF/CORS
  behavior and does not make NEXORA production-ready.

## Completed backend milestone — v0.48.0 Backend Request Correlation Logging foundation

- Adds `nexora.request_id` MDC output with a `no-request-id` fallback to the
  local console pattern and safely logs unexpected API errors with method, URI
  path, status 500, and the exception stack trace. API response bodies remain
  unchanged and contain no `requestId` field. The handler does not log request
  headers, cookies, tokens, query strings, parameters, or request bodies. This
  local/development foundation changes no frontend, dependency manifest,
  migration, OpenAPI YAML, workflow, or auth/session/CSRF/CORS behavior and does
  not make NEXORA production-ready.

## Completed frontend milestone — v0.47.0 Frontend Request Error Observability foundation

- Retains response-only `requestId` metadata in normalized authentication,
  Wishlist, Sentinel, and notification-preference errors and displays the safe
  request ID in selected frontend error/support states. The frontend does not
  generate or send request ID headers by default, read request IDs from JSON
  bodies, or display or log tokens, cookies, CSRF values, Authorization headers,
  or raw response headers. Token storage and auth/CSRF behavior remain unchanged.
  This milestone changes no backend/API body behavior, dependency manifests,
  migrations, OpenAPI YAML, or workflows and makes no production-readiness
  claim.

## Completed frontend milestone — v0.46.0 Frontend API Client Safety foundation

- Adds a shared primary-frontend API helper that centralizes the local fallback
  and browser-visible `NEXT_PUBLIC_API_BASE_URL` handling, normalizes API paths,
  and reads trimmed `X-NEXORA-Request-ID` response headers as optional internal
  request-error metadata. The frontend does not generate or send request ID
  headers by default, add them to JSON bodies, or log headers. Access-token
  storage, refresh-cookie handling, CSRF behavior, and token/header logging
  remain unchanged. This milestone changes no backend/API behavior, dependency
  manifests, migrations, OpenAPI YAML, or workflows and makes no production-
  readiness claim.

## Completed frontend milestone — v0.45.0 Frontend Dependency Health foundation

- Records the primary Next.js frontend dependency-health baseline with Next.js
  16.3.2 and React 19.2.8 plus reproducible `npm ci`, lint, production build,
  and high-severity production-dependency audit validation. This milestone does
  not change backend/API behavior or production readiness.

## Completed tooling milestone — v0.44.0 Request Correlation Smoke Coverage foundation

- Extends `scripts/api-smoke-test.sh` with temporary response-header capture,
  UUID-style generated `X-NEXORA-Request-ID` validation across success and
  auth/error responses, and exact echo validation for a safe incoming request
  ID. The smoke flow also confirms the shared error JSON still has no
  `requestId` field. This local/development MVP milestone changes no backend
  Java implementation or tests, frontend code, dependency manifests, database
  migrations, OpenAPI YAML, GitHub Actions workflows, or auth/session/CSRF/CORS
  behavior, and makes no production-readiness claim.

## Completed backend milestone — v0.43.0 Request Correlation Observability foundation

- Adds `X-NEXORA-Request-ID` to backend success and error responses, reuses
  safe client-supplied values, generates UUID fallbacks for missing or invalid
  values, and exposes the selected value during request processing under the
  `nexora.request_id` request attribute and MDC key. Focused tests cover
  generated, echoed, replaced, authentication-error, browser-guard-error, and
  MDC lifecycle behavior. The ID remains response-header metadata only:
  `ApiErrorResponse` and all other JSON body shapes are unchanged. This
  milestone adds no frontend changes, dependencies, database migrations,
  OpenAPI YAML edits, or workflow changes and makes no production-readiness
  claim.

## Completed CI milestone — v0.42.0 API Smoke CI Resilience foundation

- Improves API Smoke CI with bounded Maven dependency warm-up retries,
  batch/no-transfer-progress Maven mode, backend-process early-exit detection
  during health polling, and tail-based `backend-smoke.log` diagnostics. This
  reduces transient Maven Central HTTP 429 impact without hiding persistent
  dependency-resolution or startup failures. It changes no backend Java
  implementation or tests, frontend code, dependency manifests, database
  migrations, or OpenAPI YAML. CodeQL remains manual-only, and no
  production-readiness claim is made.

## Completed test milestone — v0.41.0 Auth Cookie Security foundation

- Adds focused tests for the readable, path-scoped CSRF double-submit cookie;
  refresh-cookie `HttpOnly`, path, `SameSite`, lifetime, raw-token
  non-disclosure and rotation behavior; logout clearing with matching
  attributes; and the rule that `SameSite=None` requires `Secure` for both
  cookie types. This tests-and-documentation milestone changes no runtime
  implementation, frontend code, dependency manifests, database migrations, or
  workflows. CodeQL remains manual-only, and no production-readiness claim is
  made.

## Completed backend milestone — v0.40.0 Backend Security Headers foundation

- Configures Spring Security to send `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, a restrictive
  `Permissions-Policy`, and cache-control headers suitable for auth-sensitive
  API responses. Focused backend tests cover a public health response and the
  auth CSRF bootstrap response. This milestone adds no dependencies, frontend
  changes, database migrations, or workflow changes. CodeQL remains
  manual-only, and no production-readiness claim is made.

## Completed CI milestone — v0.39.0 OpenAPI contract validation foundation

- Added `scripts/openapi-contract-check.py` and
  `.github/workflows/api-contract-ci.yml` to check the expected route/operation
  counts, endpoint and operation-ID markers, schemas, security schemes, shared
  `ApiErrorResponse`, and localhost-only server assumptions. The checker uses
  only the Python standard library and installs no Swagger/OpenAPI runtime
  dependency. This script/workflow/documentation milestone changes no Java
  runtime code, Java tests, frontend code, dependency manifests, or database
  migrations. CodeQL remains manual-only, and no production-readiness claim is
  made.

## Completed documentation milestone — v0.38.0 OpenAPI contract foundation

- Added the hand-maintained `docs/api/openapi.yaml` OpenAPI 3.1 route/schema
  contract and `docs/api/OPENAPI_CONTRACT.md` maintenance and relationship
  guide, with aligned links and milestone status across the API documentation.
  This documentation-only work adds no Swagger/OpenAPI runtime dependency and
  changes no Java runtime code, Java tests, frontend code, dependency manifests,
  database migrations, or GitHub workflows. It makes no production-readiness
  claim.

## Completed CI milestone — v0.37.0 API Smoke CI foundation

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
