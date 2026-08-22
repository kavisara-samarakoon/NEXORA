# NEXORA project status

**Current stage:** Local/development MVP. NEXORA is not documented as a deployed
or production-ready service.

## Completed foundations

- Next.js App Router frontend with responsive feature pages and typed fallbacks.
- Spring Boot REST API with validation, security, and profile-based services.
- JWT registration, login, and authenticated account lookup.
- PostgreSQL, Flyway V1–V6, and JPA-backed data in the `dev` profile.
- Public demo wishlist and isolated authenticated personal wishlists.
- Wishlist alert configuration, evaluation, transition events, and history UI.
- CheapShark external deals, redirect links, caching, and local fallback.
- Opt-in wishlist price refresh scheduler with stored and CheapShark providers.
- Disabled-by-default notification dispatcher with log and optional email
  providers.
- Backend tests plus frontend lint and production-build checks.
- GitHub Actions validation for backend Maven tests and primary frontend
  dependency installation, lint, and production build.
- GitHub Actions PostgreSQL 16 service validation for the backend `dev` profile,
  Flyway V1–V6, JPA schema validation, required tables, and seed data.
- Weekly Dependabot checks for GitHub Actions, backend Maven, and primary
  frontend npm dependencies.
- Lightweight security CI for high-severity production npm auditing and backend
  Maven dependency-resolution visibility, plus a repository security policy.
- [Auth/session hardening design plan](security/auth-session-hardening-plan.md)
  covering refresh-token rotation, HttpOnly-cookie sessions, logout, revocation,
  account safety, and linked-account readiness. This is a completed planning
  artifact, not an implemented control.
- Local PostgreSQL 16 Docker Compose setup with safe example values, health
  checks, and persistent named-volume storage.

## Active limitations

- The default backend profile stores accounts and personal wishlist changes only
  in memory; restarting it clears that state.
- CheapShark is a third-party dependency with incomplete game/store coverage.
- Scheduled price refresh is `dev`-profile, single-process, and disabled by
  default.
- Email delivery requires explicit SMTP configuration. No credentials are
  committed, and no verified-recipient or preference workflow exists.
- Notification delivery has no persistent status, retries, outbox, or
  asynchronous after-commit processing.
- The frontend has no notification-provider or preference settings UI.
- Browser `localStorage` access-token storage is temporary and not suitable as a
  final production session design.
- Sentinel is a demo/status experience, not a real Gemini or other AI
  integration.
- Long-term price history and price-history charts are not implemented.

## Production-readiness gaps

- No deployed production environment or production operations guide.
- No deployment or continuous-delivery pipeline.
- No backend/frontend application container images, production container
  workflow, or devcontainer. Compose currently runs local PostgreSQL only.
- No CodeQL/full code scanning, repository-configured secret scanning, or
  Dependency Review Action workflow.
- No full Maven vulnerability scanner; the current Maven check verifies
  dependency resolution only.
- No refresh-token/HttpOnly-cookie authentication lifecycle.
- No complete rate limiting, account verification, password recovery, token
  revocation, or security monitoring controls.
- No distributed scheduler locking or multi-instance coordination.
- No durable notification delivery workflow or delivery observability.

## Recommended next milestones

1. Evaluate CodeQL, secret scanning, dependency review, and a dedicated Maven
   vulnerability scanner without making plan-limited features mandatory.
2. Add optional backend/frontend development containerization without implying
   production deployment readiness.
3. Review the auth/session hardening plan, then implement the backend
   refresh-token/session foundation on a dedicated branch.
4. Add notification preferences, verified recipients, durable delivery state,
   and retry/outbox processing.
5. Add price history storage and frontend visualization.
6. Define privacy, safety, and evaluation requirements before any real Sentinel
   AI integration.
