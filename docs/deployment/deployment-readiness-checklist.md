# NEXORA hosted-demo deployment readiness checklist

## How to use this checklist

This is a planning gate for a future fully functional hosted demo. v0.75 adds no
deployment configuration and completes no live deployment. Every checked item
must link to current evidence, an owner, and an observation date. “Not
applicable” requires a written reason; it must not conceal a failed security,
persistence, or browser requirement.

## Repository state

- [ ] Candidate source commit and intended milestone/tag are recorded.
- [ ] Working tree and staging area are clean for the candidate build.
- [ ] The deployed frontend and backend artifacts trace to the same reviewed
  repository state.
- [ ] Diff scope contains only approved implementation/deployment changes.
- [ ] No secret, environment file, local database, cookie jar, generated report,
  build output, or personal data is tracked.
- [ ] Release notes and rollback target are reviewed.

## CI state

- [ ] Required backend, frontend, security, reviewer-tooling, and contract checks
  pass for the candidate commit.
- [ ] Advisory checks are described accurately and are not presented as gates.
- [ ] Dependency and action findings are triaged without suppressing failures
  merely to deploy the demo.
- [ ] CI logs and retained artifacts are checked for credentials/private values.
- [ ] No deployment workflow is assumed; deployment authorization remains a
  separate explicit action.

## Backend readiness

- [ ] Hosted Java version, start command, port binding, HTTPS/proxy boundary,
  graceful shutdown, and restart behavior are documented and tested.
- [ ] The reviewed database-backed profile starts; production guards pass
  without local defaults or placeholder values.
- [ ] `GET /api/health` works as the current safe application-health summary and
  is not misrepresented as a complete dependency/availability probe.
- [ ] Public method/path allowlisting and terminal default deny are retained.
- [ ] `/api/auth/me` and `/api/me/**` remain authenticated and account-scoped.
- [ ] Request-ID, shared error, security-header, provider-timeout, cache,
  single-flight, request-budget, and fallback behavior are verified.
- [ ] Log access, redaction, retention, and restart/takedown ownership are set.

## Frontend readiness

- [ ] The primary Next.js application builds with the reviewed public API and
  canonical site origins.
- [ ] No secret or private backend/database address exists in `NEXT_PUBLIC_*`,
  the client bundle, source maps, metadata, or rendered HTML.
- [ ] Direct navigation and refresh work for every primary route.
- [ ] Register, login, refresh/session restore, Wishlist, preferences, Sentinel,
  logout, and post-logout states work against the hosted API.
- [ ] Loading, empty, fallback, unavailable, retry, and validation states remain
  truthful and usable.
- [ ] HTTPS assets, metadata, responsive layouts, keyboard focus, and
  reduced-motion behavior pass browser QA.

## Database readiness

- [ ] Persistent PostgreSQL service, region/network boundary, compatible version,
  capacity, connection limits, and owner are approved.
- [ ] Backend access uses a least-privilege identity and encrypted transport
  verified using the selected service's actual settings.
- [ ] Flyway migration ownership is single and explicit; migrations and JPA
  validation pass on a disposable candidate database first.
- [ ] Backup schedule, retention, encryption, deletion/export process, and restore
  test are documented and evidenced.
- [ ] Application rollback and database recovery are treated separately.
- [ ] Synthetic smoke data can be removed or its retention limitation is public.

## Security readiness

- [ ] The topology decisions in the auth production-policy plan are resolved for
  this hosted demo.
- [ ] HTTPS is enforced end-to-end through the documented proxy boundary.
- [ ] Exact trusted origins, credentialed CORS, CSRF cookie/header checks,
  HttpOnly refresh cookie, Secure flags, SameSite policy, narrow paths, rotation,
  and logout clearing pass browser tests.
- [ ] Unknown routes, unlisted subpaths, and unexpected methods fail closed.
- [ ] Local/process-only abuse controls and provider budgets are described as
  limitations, not distributed protection.
- [ ] Security settings, public access, logs, backups, retention, incident owner,
  takedown process, and vulnerability response have named owners.
- [ ] Public review uses synthetic data and avoids real credentials or personal
  information.

## Secrets readiness

- [ ] JWT signing, refresh-token hashing, database, and any provider credentials
  are generated independently and stored only in the hosting secret facility.
- [ ] Secrets are environment-specific, least-privilege, access-controlled, and
  unavailable to frontend/public build variables.
- [ ] Local defaults, example values, localhost origins, wildcards, and copied
  credentials are absent from the hosted configuration.
- [ ] Build logs, runtime logs, artifacts, screenshots, browser output, support
  channels, and repository history contain no secret values.
- [ ] Rotation, revocation, expiry, incident response, access review, and owners
  are documented and tested where possible.
- [ ] Optional provider/SMTP credentials are absent when those providers are
  disabled.

## Live smoke readiness

- [ ] Approved HTTPS frontend/API candidate URLs and deployment identity are
  recorded.
- [ ] A generated synthetic account and non-sensitive test dataset are ready.
- [ ] The full [live smoke-test plan](live-smoke-test-plan.md) passes.
- [ ] Public routes, CSRF/auth/session, protected routes, Wishlist lifecycle,
  preferences, Sentinel, request IDs, CORS, and fallback behavior are covered.
- [ ] Reports contain statuses and safe request IDs only—not tokens, cookies,
  credentials, private bodies, or raw provider errors.
- [ ] Test data cleanup/retention and a go/no-go owner are recorded.

## Browser QA readiness

- [ ] Current desktop and narrow/mobile browser coverage is recorded.
- [ ] Direct route loads, refreshes, navigation, authentication, session expiry,
  logout, and protected-route transitions pass.
- [ ] Browser console/network review shows no mixed content, CORS failures,
  cookie rejection, redirect loops, raw exceptions, or credential leakage.
- [ ] Public fallback and unavailable states are labelled accurately.
- [ ] Accessibility foundations receive keyboard, focus, reduced-motion, label,
  and obstruction review without claiming formal certification.
- [ ] Screenshots follow the public-safe capture rules and exclude account,
  browser, terminal, secret, and private-data surfaces.

## Documentation and public wording readiness

- [ ] README, project status, roadmap, releases, API/security documentation, and
  deployment docs agree on the deployed state and limitations.
- [ ] The public link is called a “hosted portfolio/demo MVP,” not a production
  SaaS service.
- [ ] Wording makes no uptime, support, security-certification, compliance,
  privacy, data-durability, user, revenue, or production-readiness claim.
- [ ] Enabled/disabled providers, fallback behavior, synthetic-data guidance,
  data retention/deletion limits, and owner/contact path are visible.
- [ ] The source commit, review date, and known limitations are current.
- [ ] A takedown/disable procedure exists if the demo becomes unsafe or stale.

## Known non-production limitations

- [ ] Record that auth abuse limits, external-deals cache/budget, Sentinel limits,
  and relevant schedulers are process-local and reset or duplicate by instance.
- [ ] Record that production-like persistence currently reuses the `dev` profile
  bridge pending a separate hosted-environment configuration milestone.
- [ ] Record incomplete account verification/recovery and complete session
  administration/revocation boundaries.
- [ ] Record missing distributed coordination, formal monitoring/alerting,
  incident automation, tested disaster recovery, privacy/compliance program,
  and operational support commitments.
- [ ] Record third-party provider availability, coverage, privacy, cost, and
  fallback limitations.
- [ ] State that passing this checklist supports a controlled hosted portfolio
  demo only and does not make NEXORA production-ready.

## Decision

- [ ] All blocking items are complete with evidence.
- [ ] Remaining limitations are accepted specifically for a controlled hosted
  demo and are published accurately.
- [ ] Deployment and rollback owners give an explicit go/no-go decision.
- [ ] Public release remains paused if auth, persistence, secrets, CORS/cookies,
  migration, rollback, or core browser flows are unresolved.
