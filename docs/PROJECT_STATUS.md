# NEXORA project status

**Current stage:** Local/development MVP. NEXORA is not documented as a deployed
or production-ready service.

The v0.27 repository presentation work is documentation-only. The
[reviewer overview](PROJECT_OVERVIEW.md) and [roadmap](ROADMAP.md) improve
navigation and evaluation without changing the technical or production
readiness of the project. The latest stable development milestone remains
`v0.26.0-auth-security-event-retention-foundation`.

## Completed foundations

- Next.js App Router frontend with responsive feature pages and typed fallbacks.
- Spring Boot REST API with validation, security, and profile-based services.
- JWT registration, login, and authenticated account lookup.
- PostgreSQL, Flyway V1–V10, and JPA-backed data in the `dev` profile.
- Public demo wishlist and isolated authenticated personal wishlists.
- Wishlist alert configuration, evaluation, transition events, and history UI.
- CheapShark external deals, redirect links, caching, and local fallback.
- Opt-in wishlist price refresh scheduler with stored and CheapShark providers.
- Wishlist price-history foundation with PostgreSQL and in-memory snapshots, an
  owner-scoped Bearer API, and a compact on-demand frontend history view.
- Price-history visualization polish with card-level summaries, a direction
  indicator, a CSS-only trend strip, and a five-entry recent snapshot timeline.
- Disabled-by-default notification dispatcher with log and optional email
  providers.
- Authenticated notification preferences with owner-scoped Bearer GET/PATCH
  APIs, PostgreSQL/in-memory storage, safe defaults, and Wishlist UI controls.
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
- Dependency Review workflow for pull requests to `main`, configured to reject
  newly introduced high or critical known vulnerabilities.
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
  This is a completed planning artifact, not an implemented production control.
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
- Local-development auth abuse controls use a thread-safe fixed window and only
  five route/purpose keys for register, login, refresh, logout, and repeated
  CSRF/origin rejection attempts. Limited requests receive a safe `429` with
  `Retry-After`/`retryAfterSeconds`, and `AUTH_RATE_LIMITED` events contain only
  a typed reason code with no user ID or request data. Counters reset on backend
  restart and do not coordinate across processes.
- Local PostgreSQL 16 Docker Compose setup with safe example values, health
  checks, and persistent named-volume storage.
- Optional local devcontainer foundation with Java 17, Maven, Node.js 20, npm,
  Git, Docker CLI access, forwarded development ports, and no automatic service
  startup. Host-native development and the PostgreSQL-only Compose setup remain
  supported.

## Active limitations

- The default backend profile stores accounts and personal wishlist changes only
  in memory; restarting it clears that state.
- CheapShark is a third-party dependency with incomplete game/store coverage.
- Scheduled price refresh is `dev`-profile, single-process, and disabled by
  default.
- Email delivery requires explicit SMTP configuration. Email preference is
  opt-in, but no credentials are committed and no verified-recipient workflow
  exists.
- Notification delivery has no persistent status, retries, outbox, or
  asynchronous after-commit processing.
- The Wishlist page has notification preference controls, but no provider,
  recipient, or delivery-status management UI.
- Access tokens are memory-first and legacy `localStorage` tokens are removed,
  but the browser session lifecycle still depends on local-development cookie
  CSRF, trusted-origin, and CORS settings rather than a reviewed production
  configuration.
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
  exist, and their target production policy is documented. Production
  fail-closed configuration, CSRF/origin/proxy behavior, CORS/cookie settings,
  session-family reuse handling, and complete revocation/session-management UX
  are not implemented.
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
   plan before implementing fail-closed production configuration,
   HTTPS/cookie/CORS/proxy/no-origin rules, and complete session reuse/revocation
   behavior.
4. Define account verification, password recovery, production distributed
   authentication abuse controls and credential-stuffing/bot defenses,
   additional audit events, approved production event
   retention/privacy/access-control/integrity rules, monitoring, alert
   thresholds, and incident-response workflows.
5. Define verified recipients, dispatcher preference enforcement, durable
   delivery state, and retry/outbox processing.
6. Extend the compact price-history view only after defining aggregation,
   retention, and advanced-chart requirements.
7. Define privacy, safety, evaluation, moderation, managed provider-key,
   cost-control, streaming, and observability requirements before expanding the
   Gemini foundation into a production AI workflow.
