# NEXORA project status

**Current stage:** Local/development MVP. NEXORA is not documented as a deployed
or production-ready service.

## Completed foundations

- Next.js App Router frontend with responsive feature pages and typed fallbacks.
- Spring Boot REST API with validation, security, and profile-based services.
- JWT registration, login, and authenticated account lookup.
- PostgreSQL, Flyway V1–V9, and JPA-backed data in the `dev` profile.
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
  Flyway V1–V9, JPA schema validation, required tables, and seed data.
- Weekly Dependabot checks for GitHub Actions, backend Maven, and primary
  frontend npm dependencies.
- Lightweight security CI for high-severity production npm auditing and backend
  Maven dependency-resolution visibility, plus a repository security policy.
- [Auth/session hardening design plan](security/auth-session-hardening-plan.md)
  covering refresh-token rotation, HttpOnly-cookie sessions, logout, revocation,
  account safety, and linked-account readiness. This is a completed planning
  artifact, not an implemented control.
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
- Local PostgreSQL 16 Docker Compose setup with safe example values, health
  checks, and persistent named-volume storage.

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
- No backend/frontend application container images, production container
  workflow, or devcontainer. Compose currently runs local PostgreSQL only.
- No CodeQL/full code scanning, repository-configured secret scanning, or
  Dependency Review Action workflow.
- No full Maven vulnerability scanner; the current Maven check verifies
  dependency resolution only.
- The backend/frontend refresh-session and local CSRF/trusted-origin foundations
  exist, but production CSRF/origin/proxy policy, production CORS/cookie policy,
  session management, and complete revocation policy are not implemented.
- No complete rate limiting, account verification, password recovery, or
  security monitoring controls.
- No distributed scheduler locking or multi-instance coordination.
- No durable notification delivery workflow or delivery observability.
- No Sentinel autonomous actions, conversation persistence, streaming,
  production privacy review, safety evaluation, moderation pipeline,
  production-grade distributed rate limiting, abuse monitoring, provider-key
  management beyond local environment variables, cost controls, or production
  AI observability.

## Recommended next milestones

1. Evaluate CodeQL, secret scanning, dependency review, and a dedicated Maven
   vulnerability scanner without making plan-limited features mandatory.
2. Add optional backend/frontend development containerization without implying
   production deployment readiness.
3. Review and extend the local CSRF/trusted-origin foundation into a production
   CORS/cookie/proxy policy, then extend session management and revocation.
4. Define verified recipients, dispatcher preference enforcement, durable
   delivery state, and retry/outbox processing.
5. Extend the compact price-history view only after defining aggregation,
   retention, and advanced-chart requirements.
6. Define privacy, safety, evaluation, moderation, managed provider-key,
   cost-control, streaming, and observability requirements before expanding the
   Gemini foundation into a production AI workflow.
