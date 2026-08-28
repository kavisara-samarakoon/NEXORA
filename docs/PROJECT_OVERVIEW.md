# NEXORA project overview

## Project identity

NEXORA is a full-stack game-deal intelligence MVP. It brings deal and giveaway
discovery, personal wishlists, price targets, alert history, notification
preferences, and a bounded Sentinel assistant into one locally runnable
project.

The project is built for software-engineering learning, academic evaluation,
portfolio review, and continued local development. It is not deployed and is
not production-ready. The latest stable development milestone is
[`v0.48.0-backend-request-correlation-logging-foundation`](https://github.com/kavisara-samarakoon/NEXORA/tree/v0.48.0-backend-request-correlation-logging-foundation).
The `v0.49.0-backend-safe-request-summary-logging-foundation` milestone remains
in progress until merged and tagged.

## Problem statement

Deal discovery, giveaways, personal wishlists, and price-alert decisions are
often fragmented across different services. NEXORA explores a single workflow
where a player can find an offer, save it, define a target, and later understand
why an alert was generated. The repository also demonstrates how those product
flows connect to authentication, persistence, provider boundaries, background
work, and security controls.

## Target users

- Players evaluating deals and tracking games in a personal local account.
- Lecturers and interviewers reviewing an end-to-end software-engineering
  project.
- Future collaborators studying the current boundaries before extending the
  product.

NEXORA does not claim active production users, commercial operation, or public
deployment.

## Current MVP capabilities

| Capability | Current scope |
| --- | --- |
| Deal and giveaway discovery | Curated data with typed fallbacks, filtering, and optional live CheapShark access |
| Accounts and sessions | Registration, login, refresh rotation, logout, and current-account lookup |
| Personal wishlist | Account-owned add, update, alert configuration, and removal flows |
| Price intelligence | Price targets, evaluation transitions, history snapshots, and compact history views |
| Alert history | Account-scoped generated events with read and delivery state |
| Notifications | Stored account preferences with disabled-by-default log/email delivery foundations |
| Sentinel | Authenticated deterministic local responses or optional backend-only Gemini responses |

## Architecture summary

| Layer | Responsibility |
| --- | --- |
| Next.js frontend | Primary responsive interface, browser session bootstrap, API integration, and typed public-data fallbacks |
| Spring Boot backend | REST endpoints, validation, authentication, ownership rules, provider gateways, and scheduled foundations |
| Default profile | Database-free local demo with in-memory account and feature stores |
| `dev` profile | PostgreSQL persistence validated by Flyway V1–V10 and JPA schema checks |
| Optional providers | CheapShark price/deal data, SMTP email delivery, and Gemini Sentinel responses |
| CI | Backend tests, PostgreSQL integration validation, frontend lint/build, dependency visibility, and manual CodeQL-ready analysis |

The primary frontend is `frontend/nexora-web-next`; the earlier Vite prototype
is retained only for reference. The default local workflow does not require
external provider credentials.

## Security foundations

Current local foundations include BCrypt password hashing, memory-first access
tokens, rotating server-side refresh sessions, an HttpOnly refresh cookie,
CSRF and trusted-origin checks, account ownership boundaries, route-level auth
abuse controls, and typed auth security events.

Auth security events exclude raw passwords, submitted identifiers, access and
refresh tokens, token hashes, CSRF tokens, cookies, IP addresses, user agents,
raw origin/referrer values, and provider or infrastructure secrets. The
in-memory store is bounded and resets on restart. Optional cleanup of old safe
events is disabled by default, uses a 30-day default, and can also prune the
development PostgreSQL store.

These controls are local/development foundations. Abuse counters are
process-local, event recording and cleanup are best-effort, and retention is
not a production privacy or compliance policy. See [SECURITY.md](../SECURITY.md)
and the [auth production-policy plan](security/auth-production-policy-plan.md)
for the remaining decisions.

## AI and Sentinel foundations

Sentinel is an authenticated backend gateway with deterministic local behavior
by default and an optional Gemini provider. Backend-generated context is
bounded and owner-scoped, responses are transient, and provider failures fall
back safely. Local rate windows, prompt and answer bounds, and provider health
tracking limit the experimental surface.

Sentinel has no conversation persistence, autonomous actions, production
moderation pipeline, distributed rate limiting, managed production key system,
cost controls, or production AI observability.

## Local development and testing quality

- Backend tests run without a database by default.
- A separate PostgreSQL 16 integration path validates the `dev` profile,
  migrations, JPA schema, tables, and seed data.
- The primary frontend is checked with ESLint and a production build.
- GitHub Actions cover backend, PostgreSQL, primary frontend, and lightweight
  dependency/security validation.
- CodeQL remains manual-only while private-repository code scanning is
  unavailable.

## Current limitations

- No production deployment, continuous-delivery pipeline, application release
  images, operations guide, backups, or disaster-recovery workflow.
- Default-profile account and personal data are in memory and reset on restart.
- Schedulers, auth abuse counters, and Sentinel safety counters do not
  coordinate across processes.
- Notification delivery has no durable outbox, retry policy, verified-recipient
  flow, or production observability.
- External deal matching has provider coverage and title/store matching limits.
- Production auth policy, privacy and retention rules, monitoring, alerting,
  access control, and incident response remain unresolved.

The detailed and current boundary is maintained in
[PROJECT_STATUS.md](PROJECT_STATUS.md).

## Next roadmap

The next work is milestone-based rather than date-based. It separates
repository and UX polish from deployment preparation, production security,
Sentinel evaluation, and longer-term product exploration. See
[ROADMAP.md](ROADMAP.md).

## How to evaluate the repository quickly

1. Read the main [README](../README.md) and the maturity matrix.
2. Review [PROJECT_STATUS.md](PROJECT_STATUS.md) for implemented foundations and
   active gaps.
3. Run `mvn test` in `backend/nexora-api`.
4. Run `npm run lint` and `npm run build` in
   `frontend/nexora-web-next`.
5. Start the backend and primary frontend, then browse deals, register a local
   account, add a wishlist item, set a price target, and inspect alert/history
   flows.
6. Review [SECURITY.md](../SECURITY.md), [RELEASES.md](../RELEASES.md), and the
   [roadmap](ROADMAP.md) before assessing production suitability.
