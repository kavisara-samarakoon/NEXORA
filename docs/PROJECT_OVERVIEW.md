# NEXORA project overview

## Project identity

NEXORA is a full-stack game-deal intelligence MVP. It brings deal and giveaway
discovery, personal wishlists, price targets, alert history, notification
preferences, and a bounded Sentinel assistant into one locally runnable
project.

The project is built for software-engineering learning, academic evaluation,
portfolio review, and continued local development. It is not deployed and is
not production-ready. The latest stable development milestone is
`v0.70.0-backend-health-version-semantics-foundation`.
Work is in progress on
`v0.71.0-project-release-workflow-tooling-foundation`.

v0.71 adds local release helper scripts and their operating guide. It preserves
human review and typed confirmation for risky operations and changes no backend
or frontend application behavior, workflow/CI behavior, dependencies, OpenAPI
YAML, or production/deployment behavior. The v0.72 candidate is the backend
external provider request budget foundation. NEXORA remains not
production-ready.

v0.70 adds `observabilityContractMilestone` to `/api/health` and preserves the
existing `milestone` key as a legacy alias. Both identify the v0.33 health and
runtime-observability contract baseline rather than the current project
release. Existing runtime health behavior and JSON fields remain unchanged; the
frontend parser tolerates the additive field without new UI. OpenAPI YAML is
updated only for that field. No auth, deals, Wishlist, Sentinel, notification,
production-profile, dependency, workflow, script, deployment, or production
behavior changes are included. NEXORA remains not production-ready.

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
| Deal and giveaway discovery | Curated data with typed fallbacks, filtering, and optional live CheapShark access with bounded process-local caching |
| Accounts and sessions | Registration, login, refresh rotation, logout, and current-account lookup |
| Personal wishlist | Account-owned add, update, alert configuration, and removal flows |
| Price intelligence | Price targets, evaluation transitions, history snapshots, and compact history views |
| Alert history | Account-scoped generated target-reached events with history metadata |
| Notifications | Stored account preferences enforced before disabled-by-default log/email dispatch foundations |
| Sentinel | Authenticated deterministic local responses or optional backend-only Gemini responses |
| Backend health visibility | Primary dashboard surfaces safe local reachability, runtime/data modes, auth-guard state, and active profiles |
| Frontend data-source transparency | Primary dashboard and key-page notices expose safe API, static fallback, external-provider, and unavailable labels for reviewer clarity |
| Reviewer navigation polish | Dashboard reviewer path and cleaner reusable source notices guide local review across primary frontend pages |
| Accessibility review aid | Primary dashboard summarizes keyboard focus, skip-link, disabled-preview, and reduced-motion foundations for local reviewers |
| Portfolio evidence summary | Primary dashboard presents public-safe frontend, API, security, workflow, and validation evidence without a readiness claim |
| Frontend state explanations | Primary frontend gives reviewers safe interpretations of loading, bundled fallback, displayed-empty, unavailable, and manual retry states |
| Screenshot-safe review guidance | Primary dashboard documents public capture pages, cropping boundaries, private-identity avoidance, and accurate local-MVP claims |

## Architecture summary

| Layer | Responsibility |
| --- | --- |
| Next.js frontend | Primary responsive interface, browser session bootstrap, API integration, typed public-data fallbacks, backend health visibility, source labels, reviewer navigation, accessibility, state-review and screenshot-safe aids, and public-safe portfolio evidence summary |
| Spring Boot backend | REST endpoints, validation, authentication, ownership rules, provider gateways, and scheduled foundations |
| Default profile | Database-free local demo with in-memory account and feature stores |
| `dev` profile | PostgreSQL persistence validated by Flyway V1–V10 and JPA schema checks |
| Production-like profile guard | `prod`/`production` requires the existing `dev` persistent profile and otherwise fails startup closed |
| Optional providers | CheapShark price/deal data, SMTP email delivery, and Gemini Sentinel responses |
| CI | Backend tests, PostgreSQL integration validation, frontend lint/build, reviewer preflight validation, advisory Dependency Review, separate npm audit and Maven dependency-tree checks, and manual CodeQL-ready analysis |

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

These controls are local/development foundations. Login and registration abuse
buckets combine the operation with a digest of the normalized candidate account
identifier, keeping repeated attempts scoped without retaining the raw
identifier in the key. The counters remain process-local and in-memory; they
are not distributed rate limiting, CAPTCHA, DDoS protection, bot protection, or
production-grade abuse prevention. Event recording and cleanup are best-effort,
and retention is not a production privacy or compliance policy. See
[SECURITY.md](../SECURITY.md) and the
[auth production-policy plan](security/auth-production-policy-plan.md) for the
remaining decisions.

The completed v0.64 persistence guard prevents `prod` or `production` from
starting with in-memory demo persistence. `prod,dev` and `production,dev` reuse
the existing database-backed stores, while default local/demo and `dev` startup
remain unchanged. This improves production safety but is not a complete
production configuration or production-readiness claim.

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
- Official GitHub action majors are maintained on Node 24-compatible releases;
  this action runtime is separate from the preserved Java 17 and Node.js 20
  application validation inputs.
- GitHub CI proved that enforceable Dependency Review is unsupported by the
  repository's current GitHub security configuration. It therefore remains
  advisory through intentional `continue-on-error: true`, with
  `fail-on-severity: high` retained as the intended threshold when evaluation
  is available. It is not a rejecting or merge-blocking control; enforcement is
  deferred until the required Dependency Graph and repository security
  capability are available. Read-only permissions and job-summary reporting
  remain, while npm audit and the Maven dependency tree stay separate controls.
- Reviewer Tooling CI checks the read-only local preflight from the repository
  root and `/tmp`, improving setup and reviewer confidence without starting
  services, installing dependencies, or making a production-readiness claim.
- The primary dashboard safely surfaces selected `/api/health` labels or generic
  local startup guidance when the backend is unavailable. It is not production
  monitoring or a deployment health check.
- Health contract metadata explicitly identifies its v0.33 observability
  baseline; it does not claim to report the current repository release.
- The primary dashboard and deals, giveaways, and security pages expose safe
  source labels so reviewers can distinguish API-connected data from bundled
  fallback previews. These UI labels do not change the underlying API contract.
- The dashboard includes a public-safe suggested reviewer path, and the key-page
  source notices use one reusable compact layout. This guidance adds no API,
  auth, or route-selection behavior.
- A small dashboard accessibility aid highlights keyboard focus, skip-link,
  disabled-preview, and reduced-motion foundations for local review. It is not
  a formal WCAG audit or compliance claim.
- The dashboard includes a public-safe portfolio evidence summary. Dashboard,
  deals, giveaways, Wishlist, security, and Sentinel pages are suitable for
  reviewer screenshots when browser account/profile areas and private user
  content are cropped. Terminal paths, environment files, credentials, and
  provider keys must remain outside captures.
- The primary frontend explains loading, bundled fallback, displayed-empty,
  unavailable, and retry states with reviewer-safe wording. Retry controls are
  manual and add no polling, timers, or background refresh; the dashboard aid
  is not production monitoring.
- The primary dashboard includes screenshot-safe review guidance for public
  project captures. Dashboard, Deals, Giveaways, Wishlist, Security, and
  Sentinel screenshots are local MVP evidence, not proof of production
  deployment, monitoring, privacy controls, accessibility certification, or
  broader readiness.
- The primary frontend labels Settings as a static preview unrelated to the
  signed-in account and labels Security metrics and decorative activity as
  samples rather than live account telemetry or production monitoring. The
  v0.60 work changes presentation only, not API or authentication behavior.
- The backend CORS policy exposes only `X-NEXORA-Request-ID` to browser
  JavaScript on an existing trusted frontend origin. It does not expose
  Authorization, Cookie, Set-Cookie, CSRF values, tokens, secrets, or private
  data, and it does not change API JSON bodies or frontend UI behavior.
- Target-reached wishlist events are recorded before the backend checks saved
  email and target-reached preferences for outbound dispatch. Disabled choices
  suppress dispatch without removing history; this adds no delivery/read-state
  fields, outbox, retry worker, scheduler, or notification provider.
- Login and registration abuse-limit windows are scoped by operation and a
  normalized candidate-identifier digest, preventing unrelated candidate
  subjects from sharing one bucket while preserving same-subject limits and
  the existing safe 429 response contract.
- Production-like profiles fail closed unless the existing `dev` database-
  backed persistence profile is active; this adds no deployment, Docker or
  cloud setup, Redis, distributed storage, runtime network call, or provider.
- CodeQL remains manual-only while private-repository code scanning is
  unavailable.

## Current limitations

- No production deployment, continuous-delivery pipeline, application release
  images, operations guide, backups, or disaster-recovery workflow.
- Default-profile account and personal data are in memory and reset on restart.
- Production-like persistence currently reuses the `dev` database profile; a
  full production profile and deployment topology remain future work.
- Schedulers, auth abuse counters, and Sentinel safety counters do not
  coordinate across processes.
- Notification delivery has no durable outbox, retry policy, verified-recipient
  flow, or production observability.
- External deal matching has provider coverage and title/store matching limits;
  its bounded cache and same-key load sharing remain process-local rather than
  distributed infrastructure.
- Settings is a static preview; its controls are not saved or enforced and are
  not connected to the signed-in account.
- Security scores, sessions, events, and capability states on the current page
  are local samples, not real account telemetry, uptime, or monitoring.
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
