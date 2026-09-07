# NEXORA project status

**Current stage:** Local/development MVP. NEXORA is not documented as a deployed
or production-ready service.

The latest stable development milestone is
`v0.73.0-release-commit-helper-foundation`. No next milestone has started.

The completed and tagged v0.73 milestone added only the local
`scripts/release/commit-milestone.sh` helper for reviewed milestone work. It
refuses `main` and a non-empty index, stages only explicitly approved repository
files, verifies the staged set, and requires exact typed confirmation before
committing. It does not push, open or merge PRs, tag, deploy, reset, stash, or
amend. There are no backend/frontend source, workflow/CI, dependency, OpenAPI
YAML, or production/deployment behavior changes. NEXORA remains not
production-ready.

The possible v0.74 candidate is
`v0.74.0-backend-default-deny-route-policy-foundation`; it has not started and
is not active.

The completed and tagged v0.72 milestone bounds outbound CheapShark/external-
deals provider calls to four concurrent calls per backend process. Admission
uses an immediate permit check, so saturated unique-key requests do not wait
for capacity: stale same-key data is preferred, followed by the existing local
catalog fallback. The v0.68 cache maximum, expired-entry cleanup, LRU eviction,
same-key single-flight, and provider-failure fallback behavior remain intact.

The public `GET /api/deals/external` path, query parameters, HTTP behavior, and
JSON response shape remain unchanged, and OpenAPI YAML is unchanged. This adds
no frontend, dependency, workflow, script, distributed limiter, deployment, or
production capability. NEXORA remains not production-ready.

The completed v0.71 milestone added local release helper scripts only: guarded
milestone branch creation, the common validation stack, PR creation/check
watching, and an explicitly confirmed merge-and-annotated-tag flow with
final-state output.
It changes no backend/frontend application behavior, workflow/CI behavior,
dependencies, OpenAPI YAML, or production/deployment behavior. Human diff and
PR review remain required; v0.73 adds an optional explicitly approved,
confirmed local staging-and-commit step. NEXORA remains not production-ready.

The completed `v0.70.0-backend-health-version-semantics-foundation` milestone
adds `observabilityContractMilestone` to `/api/health` and retains
`milestone` as a legacy alias; both carry the v0.33 health-contract baseline,
not the current repository release. This is additive and backward-compatible.
The endpoint and runtime health behavior, existing JSON fields, auth, deals,
Wishlist, Sentinel, notifications, production-profile guards, dependencies,
workflows, and scripts are unchanged. The frontend only accepts the optional
field, with no visible change. OpenAPI YAML is updated solely for the additive
field, and NEXORA remains not production-ready.

The v0.42 API Smoke CI resilience foundation added bounded Maven dependency
prefetch retries, batch/no-transfer-progress Maven output, fail-fast backend-
process checks during health polling, and tail-based smoke-log diagnostics. The
smoke script and API behavior remained unchanged, with no backend Java
implementation or test, frontend, dependency, migration, OpenAPI YAML, or
CodeQL workflow changes.

The v0.41 auth cookie security foundation added focused endpoint and property
tests plus reviewer-friendly documentation for refresh-cookie issuance,
rotation, clearing and raw-token non-disclosure; the readable CSRF
double-submit cookie; and the `SameSite=None`/`Secure` safety rule. Existing
implementation behavior remained unchanged, with no frontend, dependency,
database migration, or workflow changes.

The v0.40 backend security headers foundation added explicit browser-facing
HTTP security headers and cache-control behavior through the existing Spring
Security filter chain, with focused backend tests for public and auth-sensitive
responses. It changed no frontend code, dependency manifests, database
migrations, or GitHub Actions workflows.

The v0.39 OpenAPI contract validation foundation added a Python
standard-library checker for the hand-maintained OpenAPI path, operation,
schema, security, shared-error, and localhost markers, plus a GitHub Actions
workflow that runs the check on pull requests and pushes to `main`. It changed
no Java runtime code, Java tests, frontend code, dependency manifests, or
database migrations.

The v0.38 OpenAPI contract foundation added the hand-maintained OpenAPI 3.1
route/schema contract and its maintenance guide. It changed no runtime code,
dependencies, migrations, or workflows and added no Swagger/OpenAPI runtime
tooling.

The v0.37 API Smoke CI foundation added a pull-request and `main` quality gate
that starts the default backend locally, waits for `/api/health`, runs the
existing smoke script, and uploads backend logs for debugging. It changed no
Java runtime code, Java tests, frontend code, dependency manifests, or database
migrations.

The v0.36 API smoke testing foundation added a local reviewer script that
checks public routes, CSRF/authentication, protected account routes, Sentinel
insight, and shared error-contract fields with generated fake account data,
masked token output, and temporary cookies. It changed no backend or frontend
behavior, dependencies, database migrations, or GitHub workflows.

The v0.35 API contract documentation foundation added a source-aligned backend
contract and a localhost-only reviewer testing guide for public/protected
routes, request/response shapes, authentication, CSRF/origin checks, refresh
cookies, shared errors, profiles, and known limitations. It changed no runtime
behavior or production readiness.

The v0.34 API error contract foundation standardizes targeted authentication,
CSRF/origin, rate-limit, personal Wishlist, Sentinel gateway, and notification-
preference failures. Existing `error`, `message`, and applicable
`retryAfterSeconds` fields remain compatible, while responses add HTTP status,
the request URI path without query data, and a UTC timestamp. The contract does
not expose raw requests, secrets, tokens, cookies, credentials, datasource
URLs, exception classes, or stack traces. Authentication/session behavior,
routes, validation rules, and production readiness are unchanged. A narrow,
lowest-priority REST fallback safely normalizes otherwise unexpected controller
failures without replacing domain-specific responses.

The v0.33 runtime observability foundation expands the public backend health
response with safe runtime/data modes, sanitized profiles, allowlisted provider
names, UTC timing, uptime, and bounded configuration checks. One application-
ready log line summarizes the same safe labels. Neither path exposes raw
configuration, secrets, credentials, datasource URLs, database identities,
cookies, tokens, API keys, or full environment data. This is not external
dependency monitoring, metrics, tracing, alerting, managed logging, or a
production-readiness claim.

The v0.70 clarification explicitly names that v0.33 baseline as
`observabilityContractMilestone`. The original `milestone` key remains as a
legacy alias and is not current-release metadata.

The v0.32 production-profile safety foundation adds an early backend startup
guard for the `prod` and `production` profiles. It fails closed when core auth
secrets are missing, short, coupled, local defaults, or obvious placeholders;
when refresh/CSRF cookie protections are unsafe; when CSRF is disabled; or when
trusted origins are missing, wildcard, local/development, or non-HTTPS. Default
and `dev` behavior remain unchanged. This is not a deployment, complete
production configuration, security assurance, or production-readiness claim.

The v0.31 frontend accessibility review is a focused polish milestone for the
primary Next.js interface. It improves keyboard navigation, form labels and
helper associations, ARIA semantics, focus visibility, reduced-motion coverage,
UX-state announcements, and secondary-text readability while preserving the
v0.28 visual identity, v0.29 responsive work, and v0.30 UX states. It changes no
backend, API contract, security posture, deployment readiness, or production
status and makes no production claim.

The v0.30 product UX quality polish was a frontend presentation milestone. It
improves loading, empty, error, fallback, unavailable, authentication-required,
helper, and inline-feedback states in the primary Next.js interface while
preserving the v0.28 motion and v0.29 responsive polish. It changes no backend,
API contract, security posture, deployment readiness, or production status and
makes no production claim. Local, demo, preview, fallback, and planned states
remain explicitly labelled.

The v0.29 mobile responsive UI polish improved mobile, tablet, and small-screen
layouts without changing routes, data flow, backend behavior, or the retained
Vite prototype. Keyboard focus remains visible, and non-essential animation,
including the v0.30 loading shimmer, respects reduced-motion preferences.

The v0.27 repository presentation work was documentation-only. The
[reviewer overview](PROJECT_OVERVIEW.md) and [roadmap](ROADMAP.md) improve
navigation and evaluation without changing the technical or production
readiness of the project. The latest stable development milestone is
`v0.73.0-release-commit-helper-foundation`.

## Completed foundations

- Next.js App Router frontend with responsive feature pages and typed fallbacks.
- Reviewer-facing frontend source labels distinguish local API-connected data
  from bundled static fallback preview states without changing data behavior.
- A compact dashboard reviewer path and reusable key-page source notice improve
  local navigation clarity without adding route, API, or auth logic.
- A dashboard accessibility review aid documents existing keyboard focus,
  skip-link, disabled-preview, and reduced-motion foundations without claiming
  formal conformance.
- A public-safe dashboard evidence summary and source notices on Wishlist and
  Sentinel improve portfolio review without exposing additional user or system
  data.
- A dashboard screenshot-safe review checklist documents capture boundaries
  without adding a runtime mode, masking identity, or changing account data.
- Frontend truthfulness polish marks Settings and Security content as static
  preview/sample data and removes live-looking counts and telemetry claims.
- Spring Boot REST API with validation, security, and profile-based services.
- Production-like profile persistence guard that requires the existing `dev`
  database-backed profile instead of allowing in-memory demo stores.
- JWT registration, login, and authenticated account lookup.
- PostgreSQL, Flyway V1–V10, and JPA-backed data in the `dev` profile.
- Public demo wishlist and isolated authenticated personal wishlists.
- Wishlist alert configuration, evaluation, transition events, and history UI.
- Bounded account-scoped Wishlist alert-event history: latest 50 returned,
  latest 100 retained per account in local-demo memory, and bounded latest
  lookup in the database-backed `dev` path.
- CheapShark external deals, redirect links, bounded process-local caching,
  same-key load sharing, four-call process-local provider admission, and
  stale/local fallback.
- Opt-in wishlist price refresh scheduler with stored and CheapShark providers.
- Wishlist price-history foundation with PostgreSQL and in-memory snapshots, an
  owner-scoped Bearer API, and a compact on-demand frontend history view.
- Price-history visualization polish with card-level summaries, a direction
  indicator, a CSS-only trend strip, and a five-entry recent snapshot timeline.
- Disabled-by-default notification dispatcher with log and optional email
  providers.
- Authenticated notification preferences with owner-scoped Bearer GET/PATCH
  APIs, PostgreSQL/in-memory storage, safe defaults, Wishlist UI controls, and
  email/target-reached preference enforcement before outbound alert dispatch.
- Authenticated Sentinel AI gateway with a deterministic local default/fallback
  and an optional backend-only Gemini REST provider that is disabled by default.
  Sentinel can use bounded backend-generated owner-scoped Wishlist,
  price-history, alert, public deal, and giveaway summaries. Frontend exchanges
  are transient, and NEXORA persists no conversation data. Sentinel also has
  local-development safety controls: in-memory per-user rate limiting, safe
  provider fallback classification, process-local provider health/failure
  tracking, and configurable bounded context-prompt and answer limits.
- Backend tests plus frontend lint and production-build checks.
- GitHub Actions validation for backend Maven tests and primary frontend
  dependency installation, lint, and production build.
- API Smoke CI validation that starts the default backend on localhost, waits
  for health, runs the reviewer smoke script, validates request correlation
  response headers, and retains backend logs.
- Request correlation response headers with safe client-value validation, UUID
  fallback generation, request-scoped MDC data, local console correlation, safe
  unexpected-error logging, safe request-completion summaries, and focused
  backend coverage. Trusted-origin CORS exposes only the safe response request
  ID to browser JavaScript, not authentication, cookie, CSRF, or secret-bearing
  headers.
- Shared frontend API configuration and selected frontend error/support request-
  ID metadata for local backend-log correlation.
- Primary-frontend dashboard visibility for safe local backend health metadata
  and a bounded unavailable-backend state.
- A hand-maintained OpenAPI 3.1 route/schema contract with explicit local-only,
  security, shared-error, and maintenance boundaries.
- API Contract CI validation that uses the Python standard library to check the
  hand-maintained contract's expected routes, operations, schema/security/error
  markers, and localhost-only server assumption.
- Reviewer Tooling CI validation for the local preflight script's Bash syntax,
  executable mode, repository-root run, and absolute-path run from `/tmp`.
- Backend response hardening through explicit content-type, framing, referrer,
  permissions-policy, and cache-control headers with focused MockMvc coverage.
- Focused auth-cookie coverage for readable CSRF double-submit behavior,
  HttpOnly refresh issuance/rotation/clearing, raw-token non-disclosure, and
  the `SameSite=None`/`Secure` configuration rule.
- GitHub Actions PostgreSQL 16 service validation for the backend `dev` profile,
  Flyway V1–V10, JPA schema validation, required tables, and seed data.
- Weekly Dependabot checks for GitHub Actions, backend Maven, and primary
  frontend npm dependencies.
- Lightweight security CI for high-severity production npm auditing and backend
  Maven dependency-tree visibility with retained artifacts, plus a repository
  security policy.
- Manual CodeQL-ready workflow for scoped Java and JavaScript/TypeScript analysis,
  using a manual Maven build for Java. Automatic CodeQL upload is disabled while
  private-repository code scanning is unavailable.
- Advisory Dependency Review workflow for pull requests to `main`, retaining
  `fail-on-severity: high` as the intended evaluation threshold while the
  repository lacks the required GitHub security capability for enforcement.
- [Repository security hardening guide](security/repository-security-hardening.md)
  covering implemented workflows and the GitHub security settings that remain
  manual or plan-dependent.
- [Historical auth/session hardening design plan](security/auth-session-hardening-plan.md)
  recording the migration path for refresh-token rotation, HttpOnly-cookie
  sessions, logout, account safety, and linked-account readiness. Its core local
  refresh-session phases are implemented; later production hardening remains.
- [Auth production-policy plan](security/auth-production-policy-plan.md)
  defining required production secret, persistent-store, cookie, CSRF, CORS,
  origin/proxy, session lifecycle, testing, monitoring, and go/no-go decisions.
  v0.32 implements only its first bounded startup guard for core auth settings;
  the broader policy remains unimplemented.
- Production-profile startup safety validation for strong independent JWT and
  refresh-token hash secrets, secure refresh/CSRF cookie settings, enabled
  CSRF, a scoped refresh cookie, and exact HTTPS non-local trusted origins.
  Errors identify properties without printing configured secret values.
- Lightweight runtime observability through an additive public health summary
  and one safe application-ready log line. Unknown profiles/providers are not
  echoed, and reported modes make no database/provider connectivity claim.
- A shared safe API error response/factory for targeted auth, browser request
  protection, Wishlist, Sentinel, and notification-preference failures,
  preserving established codes/messages and rate-limit retry metadata.
- Backend refresh-token/session foundation with hashed tokens, profile-based
  in-memory/PostgreSQL storage, rotation, logout revocation, and HttpOnly cookie
  issuance while preserving the existing Bearer access-token response.
- Frontend refresh-session foundation with memory-first access tokens, global
  cookie-backed session bootstrap, serialized refresh/retry, backend logout,
  and cleanup of legacy `localStorage` tokens. Protected APIs still use Bearer
  access tokens.
- Local-development auth CSRF/trusted-origin foundation with a `SecureRandom`
  double-submit cookie/header token, explicit trusted `Origin`/`Referer`
  validation, restricted credentialed CORS headers, and one bounded frontend
  CSRF retry. Cookie-sensitive auth POST routes are covered; Bearer APIs remain
  unchanged.
- Safe auth security-event recording for register, login, refresh, logout, and
  auth-route rejection metadata. The default profile retains at most 500 events
  in memory and resets on restart; the `dev` profile persists safe metadata in
  Flyway V10 `auth_security_events`. Passwords, submitted identifiers, tokens,
  cookies, token hashes, raw request context, and secrets are not recorded.
- Configurable local auth security-event cleanup is disabled by default and
  uses a 30-day default age cutoff, safely bounded from 1 to 3,650 days. When an
  owner enables it, a daily UTC task prunes only old safe metadata. The
  in-memory store remains capped at 500 events and resets on restart; the `dev`
  store deletes old rows from the existing Flyway V10 table.
- Local-development auth abuse controls use a thread-safe fixed window. Login
  and registration keys combine the operation with a digest of the normalized
  candidate account identifier; refresh, logout, and repeated CSRF/origin
  rejection retain their existing shared operation subjects. Limited requests
  receive the existing safe `429` with `Retry-After`/`retryAfterSeconds`, and
  `AUTH_RATE_LIMITED` events contain only a typed reason code with no user ID or
  request data. Counters reset on backend restart and do not coordinate across
  processes.
- Local PostgreSQL 16 Docker Compose setup with safe example values, health
  checks, and persistent named-volume storage.
- Optional local devcontainer foundation with Java 17, Maven, Node.js 20, npm,
  Git, Docker CLI access, forwarded development ports, and no automatic service
  startup. Host-native development and the PostgreSQL-only Compose setup remain
  supported.

## Active limitations

- The default backend profile stores accounts and personal wishlist changes only
  in memory; restarting it clears that state.
- Production-like persistence currently reuses the `dev` database profile; a
  complete production configuration and deployment design remain future work.
- Runtime health/startup summaries report configuration mode and process uptime
  only; they do not probe dependencies or supply production monitoring.
- The frontend health panel reflects one local `/api/health` response. It is not
  a production dashboard, centralized logging or tracing system, alerting
  service, uptime SLA, or deployed dependency probe.
- Shared error metadata improves local diagnosis but is not centralized error
  reporting, tracing, production monitoring, or incident response.
- CheapShark is a third-party dependency with incomplete game/store coverage.
- External-deals cache, in-flight loads, and provider request budget are
  process-local, not a distributed cache or distributed rate limiter.
- Scheduled price refresh is `dev`-profile, single-process, and disabled by
  default.
- Email delivery requires explicit SMTP configuration plus enabled account
  email and target-reached preferences. No credentials are committed and no
  verified-recipient workflow exists.
- Notification delivery has no persistent status, retries, outbox, or
  asynchronous after-commit processing.
- The Wishlist page has notification preference controls, but no provider,
  recipient, or delivery-status management UI.
- Access tokens are memory-first and legacy `localStorage` tokens are removed.
  The production-profile startup gate rejects unsafe local auth settings, but
  the browser session lifecycle still lacks a reviewed, deployed production
  cookie, CORS, origin, proxy, and persistent-store configuration.
- Sentinel has bounded backend-generated contextual summaries with an optional
  backend-only Gemini provider disabled by default and deterministic local
  fallback. Its rate windows and provider-health counters are in-memory only and
  reset on restart. It has no conversation persistence or autonomous actions.
- Price-history visualization is a compact card-level view; full analytics,
  aggregation, retention policy, and advanced charts are still not implemented.
- The price-history foundation reuses the existing stored/CheapShark provider
  options. It adds no external data provider and no Steam, Epic, or GOG account
  linking.
- The visualization polish uses the existing owner-scoped Bearer API and adds no
  chart dependency, backend migration, AI, deployment, or authentication change.

## Production-readiness gaps

- No deployed production environment or production operations guide.
- No production metrics, tracing, centralized/managed logging, dashboards,
  alerting, SLOs, on-call ownership, or incident-response integration. The
  v0.33 safe summaries do not close these gaps.
- No deployment or continuous-delivery pipeline.
- No backend/frontend production application images or production container
  workflow. Compose runs local PostgreSQL only, and the optional devcontainer
  is local developer tooling rather than a release image.
- Repository secret scanning, push protection, private vulnerability reporting,
  code-scanning availability/alert policy, and required-check enforcement depend on GitHub
  repository settings and are not asserted as enabled by repository files.
- No full Maven vulnerability scanner; the current Maven check and artifact are
  dependency-resolution visibility only.
- The backend/frontend refresh-session and local CSRF/trusted-origin foundations
  exist, and v0.32 fails closed on a bounded set of unsafe production-profile
  auth settings. v0.64 prevents production-like startup with in-memory demo
  stores by requiring the existing `dev` database profile, but a complete
  production persistence configuration, CSRF/origin/proxy behavior, deployed
  CORS/cookie topology, session-family reuse handling, and complete revocation/
  session-management UX are not implemented.
- The local auth security-event cleanup mechanism is not a production
  retention/privacy/compliance policy and supplies no production access-control,
  integrity, request-context enrichment, dashboard, monitoring, alerting, SIEM,
  or incident-response process. The route-level auth abuse
  foundation is not a distributed limiter, credential-stuffing/bot strategy,
  monitoring or alerting system, privacy/retention policy, or incident-response
  workflow. Account verification and password recovery remain incomplete.
- No distributed scheduler locking or multi-instance coordination.
- No durable notification delivery workflow or delivery observability.
- No Sentinel autonomous actions, conversation persistence, streaming,
  production privacy review, safety evaluation, moderation pipeline,
  production-grade distributed rate limiting, abuse monitoring, provider-key
  management beyond local environment variables, cost controls, or production
  AI observability.

## Recommended next milestones

1. Review GitHub private vulnerability reporting, secret scanning/push
   protection, Dependabot alerts/security updates, code-scanning alerts, and
   branch rules in repository settings; evaluate a stable Maven vulnerability
   scanner without making external-feed availability a mandatory gate.
2. Review a production application-container strategy only after deployment,
   operations, networking, and secret-management requirements are defined.
3. Select a deployment topology and formally review the auth production-policy
   plan before replacing the v0.64 `dev`-profile persistence bridge with a
   complete production configuration, then implement the reviewed HTTPS/cookie/
   CORS/proxy/no-origin rules and complete session reuse/revocation behavior.
4. Define account verification, password recovery, production distributed
   authentication abuse controls and credential-stuffing/bot defenses,
   additional audit events, approved production event
   retention/privacy/access-control/integrity rules, monitoring, alert
   thresholds, and incident-response workflows.
5. Define verified recipients, durable delivery state, retry/outbox processing,
   and provider operational policy.
6. Extend the compact price-history view only after defining aggregation,
   retention, and advanced-chart requirements.
7. Define privacy, safety, evaluation, moderation, managed provider-key,
   cost-control, streaming, and observability requirements before expanding the
   Gemini foundation into a production AI workflow.
