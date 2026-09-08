# NEXORA development milestones

These labels summarize repository development milestones. They do not imply a
public deployment, published package, or production release.

The latest stable development tag is
`v0.74.0-backend-default-deny-route-policy-foundation`.
Work in progress is
`v0.75.0-production-demo-deployment-planning-foundation`. The v0.76 candidate is
`v0.76.0-backend-hosted-environment-configuration-foundation`; it has not
started and is not an active milestone.
Older headings retain the wording used when each milestone was recorded.

## In-progress documentation milestone — v0.75.0 Production Demo Deployment Planning foundation

`v0.75.0-production-demo-deployment-planning-foundation` defines the planning
boundary for a future fully functional hosted portfolio/demo MVP.

- Documents the hosted-demo goal and scope, frontend/backend/PostgreSQL
  requirements, existing environment-variable categories, secret handling,
  HTTPS cookie/CORS/session decisions, live API smoke testing, browser QA,
  readiness gates, rollback, public wording, and non-production limitations.
- Defines “fully functional” as the primary frontend, backend, auth, persistent
  database, personal Wishlist, public deals/fallback, and Sentinel demo and
  authenticated insight flows working online. It does not define production
  SaaS readiness or select a hosting platform.
- Changes no backend/frontend source, script/workflow, dependency, endpoint,
  query parameter, JSON response shape, or OpenAPI YAML. It adds no Docker,
  environment, cloud, or runtime deployment configuration and completes no live
  deployment. NEXORA remains not production-ready.

## Completed backend milestone — v0.74.0 Backend Default-Deny Route Policy foundation

`v0.74.0-backend-default-deny-route-policy-foundation` is the completed, tagged,
latest stable development milestone. It hardens the backend authorization
default without changing the API contract.

- Replaces broad public subtree matching with an explicit method-aware
  allowlist for the existing intended public routes, retains authentication for
  `/api/auth/me` and all `/api/me/**` routes, and denies every unmatched request
  by default.
- Ensures unexpected future routes, unknown API routes, unlisted subpaths, and
  unlisted methods do not become public automatically. Existing public and
  protected endpoint behavior remains intact.
- Changes no endpoint path, query parameter, JSON response shape, CSRF/session,
  credentialed CORS, request-ID, frontend, dependency, workflow/script, or
  OpenAPI YAML behavior. It adds no production/deployment capability, and
  NEXORA remains not production-ready.

## Completed tooling milestone — v0.73.0 Release Commit Helper foundation

`v0.73.0-release-commit-helper-foundation` is a completed, tagged development
milestone. It added a local milestone commit helper only.

- Shows the current branch, working-tree status, diff summary, and whitespace
  check before staging. It stages only explicitly approved repository files,
  verifies the complete staged set, and requires exact typed confirmation
  before creating a commit.
- Refuses `main`, pre-existing staged changes, missing or escaping file paths,
  an empty change set, whitespace errors, and an empty post-stage diff. It does
  not automatically reset staged files when confirmation is cancelled.
- Does not push, open or merge a PR, create a tag, delete a branch, or deploy.
  It also does not reset, stash, or amend. Backend/frontend source, GitHub
  workflows and CI behavior, dependencies, and OpenAPI YAML are unchanged. No
  production/deployment capability is added, and NEXORA remains not
  production-ready.

## Completed backend milestone — v0.72.0 Backend External Provider Request Budget foundation

`v0.72.0-backend-external-provider-request-budget-foundation` is a completed,
tagged development milestone.

- Bounds CheapShark/external-deals provider admission to four concurrent calls
  per backend process with immediate, non-blocking capacity checks. Permits are
  released after provider success, failure, exception, or interruption.
- Preserves the v0.68 bounded cache, expired-entry cleanup, LRU eviction, and
  same-key single-flight behavior. Saturated unique-key requests prefer stale
  same-key data and otherwise return the existing local catalog fallback.
- Keeps `GET /api/deals/external`, its query parameters, public access, HTTP
  behavior, and JSON response shape unchanged. No frontend, dependency,
  workflow, script, OpenAPI YAML, distributed limiter, deployment, or production
  capability is added. NEXORA remains not production-ready.

## Completed tooling milestone — v0.71.0 Project Release Workflow Tooling foundation

`v0.71.0-project-release-workflow-tooling-foundation` is a completed development
milestone.

- Adds transparent local helpers for milestone branch creation, the common
  validation stack, PR creation/check watching, and explicitly confirmed merge,
  branch deletion, annotated tagging, and final-state verification.
- Keeps staging, committing, diff review, PR review, and the typed merge/tag
  decision under human control. The helpers use existing local tools and add no
  dependencies or GitHub Actions workflows.
- Changes no backend/frontend application behavior, CI/workflow behavior,
  OpenAPI YAML, deployment, or production behavior. NEXORA remains not
  production-ready.

## Completed backend milestone — v0.70.0 Backend Health Version Semantics foundation

`v0.70.0-backend-health-version-semantics-foundation` is the latest stable
development milestone.

- Adds `observabilityContractMilestone` to `GET /api/health` with the existing
  `v0.33.0-runtime-observability-foundation` contract-baseline value.
- Retains `milestone` as a backward-compatible legacy alias with the same value;
  neither field represents the current repository release tag.
- Preserves the endpoint, HTTP behavior, runtime modes, sanitized profiles,
  providers, checks, timing fields, and existing JSON fields. The frontend
  parser accepts the additive field while tolerating older backends, with no
  new dashboard display.
- OpenAPI YAML changes only to describe the additive health field. Auth, deals,
  Wishlist, Sentinel, notifications, production-profile guards, dependencies,
  workflows, scripts, deployment, and production behavior are unchanged.
  NEXORA remains not production-ready.

## Completed backend milestone — v0.69.0 Backend Wishlist Alert History Lifecycle foundation

`v0.69.0-backend-wishlist-alert-history-lifecycle-foundation` completed the
bounded Wishlist alert-history lifecycle foundation.

- Returns at most the latest 50 authenticated, account-scoped Wishlist alert
  events in newest-first order without changing the response array or event
  object shape.
- Retains at most the latest 100 in-memory events per account in local-demo
  mode, deterministically evicting the oldest, and uses a user-scoped bounded
  recent lookup for the database-backed `dev` profile.
- Preserves Wishlist ownership, event creation, notification preference
  enforcement, endpoint paths, shared errors, and existing fallback behavior.
- This is bounded recent history, not archival or audit-log retention. It adds
  no background database deletion job, production retention/backup policy,
  migration, dependency, distributed storage, frontend, workflow, script, or
  OpenAPI YAML change. NEXORA remains not production-ready.

## Completed backend milestone — v0.68.0 Backend External Deals Resource Bounds foundation

`v0.68.0-backend-external-deals-resource-bounds-foundation` is the latest stable
development milestone.

- Bounds the in-process external-deals response cache to a fixed maximum and
  removes expired entries during cache reads and insertions.
- Uses deterministic least-recently-used eviction after expired-entry cleanup
  and shares concurrent same-key provider loads to reduce cache-miss traffic
  amplification. Per-key in-flight state is removed after success or failure.
- Preserves CheapShark integration, stale-cache/local fallback behavior, the
  public endpoint, query parameters, status behavior, and response shape.
- This backend resilience milestone changes no frontend, dependency, migration,
  OpenAPI YAML, workflow, script, auth/session/CSRF/CORS/request-ID, Wishlist,
  notification, Sentinel, health, or production-profile behavior. It adds no
  distributed cache or rate limiter, and NEXORA remains not production-ready.

## Completed CI milestone — v0.67.0 CI Node 24 Action Runtime Compatibility foundation

`v0.67.0-ci-node24-action-runtime-compatibility-foundation` is the latest stable
development milestone.

- Updates official GitHub Actions majors to current Node 24-compatible action
  runtimes without changing workflow triggers, jobs, commands, working
  directories, concurrency, artifacts, or permissions.
- Keeps the backend CI Java version at 17 and the frontend CI/reviewer toolchain
  Node.js version at 20. The GitHub action runtime update does not change either
  application runtime or its tested toolchain version.
- Dependency Review remains advisory with `continue-on-error: true`,
  `fail-on-severity: high`, pull-request-only execution, and read-only
  permissions because the repository capability limitation is unchanged.
- This is workflow/tooling maintenance only. Frontend/backend source and runtime
  behavior, dependencies, API endpoint paths and JSON response shapes, OpenAPI
  YAML, and scripts are unchanged. No production, deployment, Docker, cloud,
  Redis, provider, or runtime feature is added, and NEXORA remains not
  production-ready.

## Completed frontend milestone — v0.66.0 Frontend Sentinel Responsive Clearance foundation

`v0.66.0-frontend-sentinel-responsive-clearance-foundation` is the latest stable
development milestone.

- Post-v0.65 browser QA confirmed that the fixed Sentinel launcher obstructed
  Backend Health and Data Source Transparency content at 768px and overlapped a
  Settings toggle at 390px, where it could intercept the intended tap.
- Suppresses the floating launcher with CSS at viewport widths up to and
  including 768px. Sentinel remains available through the existing responsive
  navigation, desktop launcher behavior above 768px is unchanged, and the
  dedicated `/sentinel` route retains its existing no-launcher behavior.
- This frontend clearance milestone changes no backend, API, auth/session/CSRF/
  CORS/request-ID, Wishlist, notification-preference, Sentinel gateway, runtime-
  health, endpoint, or API JSON response behavior. Dependencies, OpenAPI YAML,
  workflows, and scripts are unchanged; no deployment or runtime feature is
  added, and NEXORA remains not production-ready.

## Completed security milestone — v0.65.0 Security CI Dependency Review Policy Alignment foundation

- GitHub CI validation proved that enforceable Dependency Review is currently
  unsupported by this repository's GitHub security configuration. Dependency
  Review therefore remains advisory with intentional `continue-on-error: true`
  and must not be represented as a rejecting or merge-blocking control.
- Retains `fail-on-severity: high` as the intended threshold when the action can
  evaluate dependency changes, plus pull-request-only execution, read-only
  permissions, and job-summary reporting. Enforceable use is deferred until the
  required GitHub Dependency Graph and repository security capability are
  available; no security product is claimed as enabled.
- The production npm audit gate and Maven dependency-tree visibility remain
  separate CI controls. No new action, tool, dependency, suppression, or allow
  list is added.
- This is a CI-policy and documentation milestone only. Application runtime,
  frontend/backend source behavior, endpoint paths, API JSON response shapes,
  dependencies, migrations, OpenAPI YAML, and scripts are unchanged. No
  deployment, cloud, Docker, Redis, provider, or runtime feature is added, and
  NEXORA remains not production-ready.

## Completed backend milestone — v0.64.0 Backend Production Profile Persistence Guard foundation

- Adds an early backend startup guard for the production-like `prod` and
  `production` profiles. Either profile without the existing `dev` database-
  backed persistence profile fails closed instead of selecting in-memory demo
  accounts, sessions, preferences, catalogs, security events, or wishlists.
- Default local/demo startup and existing `dev` database-backed behavior remain
  unchanged. `prod,dev` and `production,dev` pass this persistence guard and
  continue through the existing production-profile configuration safety checks.
- Endpoint paths, API JSON response shapes, frontend behavior, auth/session/
  CSRF/CORS/request-ID/AuthAbuse/NotificationDispatcher behavior, dependencies,
  migrations, OpenAPI YAML, workflows, and scripts are unchanged. No production
  deployment, Docker or cloud setup, Redis, distributed storage, runtime network
  call, or new provider is added. Production readiness is improved, but NEXORA
  is still not production-ready.

## Completed backend milestone — v0.63.0 Backend Auth Abuse Limit Keying foundation

- Changes login and registration abuse limits from operation-global buckets to
  scoped buckets containing the operation and a SHA-256 digest of the trimmed,
  case-normalized candidate account identifier. Repeated attempts for the same
  subject remain limited, while an unrelated subject does not consume that
  window; raw identifiers and credentials are not stored in limiter keys.
- Existing configured limits and windows, safe 429 error shape, endpoint paths,
  and auth success/failure behavior remain unchanged. The counter remains an
  in-memory, process-local, best-effort local control that resets on restart.
- Frontend behavior, auth tokens, refresh sessions, CSRF, CORS, request-ID
  behavior, dependencies, migrations, OpenAPI YAML, workflows, and scripts are
  unchanged. No distributed rate limiter, CAPTCHA, DDoS protection, or bot
  protection is added, and production readiness is unchanged.

## Completed backend milestone — v0.62.0 Backend Notification Preference Enforcement foundation

- Enforces the current account's saved `emailEnabled` and
  `targetReachedEnabled` preferences after a target-reached wishlist alert event
  is recorded and before the existing outbound dispatcher is invoked. Either
  disabled value suppresses dispatch; both enabled values preserve dispatch.
  The existing default, which has email disabled, remains fail-safe.
- Existing alert event/history recording and global notification provider
  configuration semantics remain unchanged. Preference lookup or dispatch
  failure does not undo the already recorded event and does not log exception
  contents.
- API JSON response shapes and frontend behavior are unchanged. No
  delivery/read-state fields, notification outbox, retry worker, scheduler, or
  provider is added. Dependencies, migrations, OpenAPI YAML, workflows,
  scripts, auth/session/CSRF/CORS/request-ID behavior, and production readiness
  are unchanged.

## Completed backend milestone — v0.61.0 Backend CORS Request-ID Exposure foundation

- Exposes only the safe `X-NEXORA-Request-ID` response header through CORS so
  browser JavaScript on an existing trusted frontend origin can read the
  backend correlation value. Existing allowed origins, methods, request
  headers, and credential behavior remain unchanged.
- Focused tests verify the exposure header, the response request-ID header,
  preserved trusted-origin/preflight behavior, and the exclusion of
  Authorization, Cookie, Set-Cookie, and CSRF headers from the exposed-header
  list.
- Request-ID generation and validation, API JSON bodies, auth/session/CSRF
  behavior, frontend UI behavior, dependencies, migrations, OpenAPI YAML,
  workflows, and scripts remain unchanged. No tokens, secrets, or private data
  are exposed, and production readiness is unchanged.

## Completed frontend milestone — v0.60.0 Frontend UI Truthfulness and Layout Polish foundation

- Fixes primary-frontend register alignment and fixed Sentinel-button spacing,
  removes the redundant Sentinel button from its destination page, and clarifies
  small UI semantics and accessibility labels.
- Replaces personal-looking Settings samples, fabricated-looking security
  telemetry, hardcoded navigation counts, and live-looking decorative labels
  with explicit static-preview, demo, sample, planned, or not-connected wording.
  Settings remains a static preview and is not connected to the signed-in
  account. Security values are local samples, not real account signals,
  production monitoring, or uptime evidence.
- This frontend/documentation-only milestone changes no backend or API behavior,
  authentication/session/CSRF/CORS behavior, frontend fetch or fallback
  behavior, dependency manifest, workflow, script, retained Vite frontend, or
  OpenAPI YAML. It adds no runtime feature flags, storage access, polling,
  timers, retries, masking, or network calls, and it does not change production
  readiness.

## Completed frontend milestone — v0.59.0 Frontend Screenshot-Safe Reviewer Mode Polish foundation

- Adds dashboard screenshot-safe review guidance and documents public-safe
  capture rules for portfolio, GitHub, lecturer, and reviewer screenshots. This
  frontend/documentation milestone adds no runtime screenshot mode, feature
  flags, masking logic, storage access, polling, auto-refresh, timers, retry
  loops, or new network calls. It changes no backend/API contract, OpenAPI YAML,
  frontend API/fallback behavior, auth/session/CSRF/CORS behavior, AuthStatus,
  dependencies, workflows, scripts, retained Vite frontend, or request-ID
  presentation. It does not display or read secrets, tokens, cookies, CSRF
  values, Authorization data, request IDs beyond existing support text, raw
  exceptions, private data, environment values, local paths, emails, or API
  keys. It does not make NEXORA production-ready, WCAG-certified, or
  employment-ready.

## Completed frontend milestone — v0.58.0 Frontend Empty Loading Error State Polish foundation

- Polishes reviewer-facing loading, fallback, empty, unavailable, and retry
  wording across the primary Next.js frontend and adds a compact dashboard state
  review aid. This frontend/documentation state-clarity milestone changes no
  backend/API contract, OpenAPI YAML, frontend API/fallback behavior,
  auth/session/CSRF/CORS behavior, dependencies, workflows, scripts, retained
  Vite frontend, or request-ID presentation. It adds no polling, auto-refresh,
  timers, new network calls, or retry loops. It does not display or read secrets,
  tokens, cookies, CSRF values, Authorization data, request IDs beyond existing
  support text, raw exceptions, private data, environment values, local paths,
  emails, or API keys, and it does not make NEXORA production-ready.

## Completed frontend milestone — v0.57.0 Frontend Portfolio Evidence Polish foundation

- Adds a public-safe dashboard portfolio evidence panel, adds existing-source
  notices to the Wishlist and Sentinel evidence pages, and documents safe
  screenshot and evidence boundaries. This frontend/documentation presentation
  milestone changes no backend/API contract, OpenAPI YAML, frontend API/fallback
  behavior, auth/session/CSRF/CORS behavior, dependencies, workflows, scripts,
  retained Vite frontend, or request-ID presentation. It does not display or
  read secrets, tokens, cookies, CSRF values, Authorization data, request IDs,
  raw exceptions, private data, environment values, local paths, emails, or API
  keys, and it does not make NEXORA production-ready.

## Completed frontend milestone — v0.56.0 Frontend Accessibility Review foundation

- Adds a compact dashboard accessibility review panel, improves page source
  notice semantics and reviewer-navigation link labels, and clarifies disabled
  local-preview control wording. This frontend accessibility-review milestone
  changes no backend/API contract, OpenAPI YAML, auth/session/CSRF/CORS behavior,
  dependencies, workflows, scripts, retained Vite frontend, API/fallback
  behavior, or request-ID presentation. It does not display or read secrets,
  tokens, cookies, CSRF values, Authorization data, raw exceptions, private
  data, environment values, or local filesystem paths. It does not claim a
  formal WCAG audit or make NEXORA production-ready.

## Completed frontend milestone — v0.55.0 Frontend Reviewer Navigation Polish foundation

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
