# NEXORA production demo deployment plan

## Status and purpose

This document is the completed planning foundation from the tagged, latest
stable milestone
`v0.75.0-production-demo-deployment-planning-foundation`.
Work in progress is
`v0.76.0-backend-hosted-environment-configuration-foundation`. The plan does not
select a hosting vendor or claim that NEXORA is deployed or production-ready.
v0.76 implements backend environment configuration only; it creates no
frontend, provider/cloud, or live deployment configuration.

The deployment goal is a public, fully functional hosted portfolio/demo MVP
that a reviewer can use through HTTPS without installing the project locally.

> A fully functional hosted demo means the primary frontend, backend API,
> authentication flow, PostgreSQL persistence, personal Wishlist workflow,
> public deals and fallback behavior, and Sentinel demo and authenticated
> insight flow work online as one reviewed experience. It does not mean NEXORA
> is ready to operate as a production SaaS service.

## Hosted demo MVP boundary

### In scope

- Host the primary Next.js application and Spring Boot API at stable HTTPS
  origins selected during implementation planning.
- Use persistent PostgreSQL-backed accounts, refresh sessions, personal
  Wishlist data, price history, alert events, notification preferences, and
  auth security events through the current database-backed profile.
- Preserve the intended public catalog, external-deal fallback, dashboard,
  security-status, Sentinel status/demo, CSRF, and account-scoped API flows.
- Configure exact frontend/API origin relationships, secure cookies, secrets,
  database access, health checks, logs, and rollback ownership.
- Validate the deployment with the live API and browser checklists before any
  public portfolio link is announced.
- Publish truthful demo wording, limitations, data-reset expectations, and a
  contact or takedown owner.

### Out of scope

- A production SaaS launch, paid service, uptime or support guarantee, service
  level objective, compliance claim, or claim of real customers.
- New product features, endpoint or response changes, schema changes, provider
  replacement, or frontend redesign.
- Dockerfiles, cloud manifests, infrastructure-as-code, CI/CD workflows, DNS or
  account creation, and live deployment during v0.75 or v0.76.
- Distributed caches, rate limiters, schedulers, session coordination, queues,
  monitoring platforms, incident automation, or multi-region operation.
- Enabling email or paid/credentialed providers unless separately approved with
  costs, privacy, failure handling, and secret ownership reviewed.

## Planned topology and ownership decisions

The implementation milestone must record the chosen frontend origin, API
origin, PostgreSQL boundary, HTTPS termination point, proxy behavior, deployment
owner, database owner, secret owner, and rollback operator. Prefer the smallest
topology that supports the browser cookie model and can be understood and
maintained by the project owner.

No provider is selected here. Candidate platforms must be evaluated using
their current documentation for runtime compatibility, region availability,
persistent storage, managed secrets, log redaction, TLS, backups, idle/restart
behavior, resource limits, and deletion/export procedures. Pricing and service
guarantees must not be inferred from this plan.

## Frontend hosting requirements

- Build and serve `frontend/nexora-web-next` using its current supported Node.js
  toolchain and build command; do not treat the retained Vite prototype as the
  deployed application.
- Supply `NEXT_PUBLIC_API_BASE_URL` with the selected HTTPS API origin and
  `NEXT_PUBLIC_SITE_URL` with the canonical HTTPS frontend origin at the stage
  required by the chosen host.
- Keep all `NEXT_PUBLIC_*` values public-safe. No credential, private hostname,
  or secret may be exposed through the frontend bundle.
- Support direct navigation and refresh for `/`, `/deals`, `/giveaways`,
  `/login`, `/register`, `/wishlist`, `/security`, `/sentinel`, and `/settings`.
- Record build artifact identity, deployment time, source commit, environment,
  and rollback target without embedding secrets.
- Verify HTTPS, asset loading, metadata URLs, responsive layouts, and browser
  fetches to the deployed API before publishing the URL.

## Backend hosting requirements

- Run the current Spring Boot application on a supported Java 17-or-newer
  runtime with `SPRING_PROFILES_ACTIVE=hosted-demo`. That profile composes the
  existing database-backed `dev` path with `production` safety validation.
- Supply the provider-assigned `PORT`. Proxy forwarding, TLS termination,
  request size/time limits, graceful shutdown, idle/restart behavior, outbound
  network access, and health-check semantics remain provider decisions before
  live deployment.
- Preserve the explicit public route allowlist, default-deny fallback,
  authenticated `/api/auth/me` and `/api/me/**` routes, safe error bodies,
  security headers, and `X-NEXORA-Request-ID` behavior.
- Configure unique external JWT and refresh-token hash secrets. Local defaults
  are prohibited in a shared hosted demo.
- Keep provider timeouts, bounded external-deals cache, same-key single-flight,
  four-call process-local provider budget, and stale/local fallback behavior.
- Keep optional Sentinel and email providers disabled unless their separate
  readiness checks pass. The deterministic local Sentinel provider is a valid
  hosted-demo mode.
- Define log access, retention, redaction review, process restart ownership, and
  a safe way to confirm the deployed artifact version.

## PostgreSQL hosting requirements

- Use a persistent PostgreSQL service compatible with the current migrations.
  The v0.76 `hosted-demo` profile activates the database-backed `dev` profile
  bridge plus production-like configuration validation; live persistence still
  requires v0.77 validation against a selected hosted PostgreSQL service.
- Restrict database network access to approved backend paths and use a
  least-privilege application identity.
- Require the selected service's supported encrypted connection mode and verify
  the JDBC/TLS settings rather than assuming encryption from the URL label.
- Run Flyway migrations once under controlled startup/deployment ownership and
  confirm JPA validation succeeds without schema auto-creation.
- Define backup schedule, retention, restore test, deletion, export, capacity,
  connection limits, and ownership before accepting persistent demo data.
- Use generated demo accounts only during validation. Never publish test
  credentials or retain avoidable personal data.

## Environment and secret requirements

The categories and placeholders are defined in
[environment-variable-plan.md](environment-variable-plan.md). Values must be
held by the selected hosting provider or an approved secret store, scoped by
environment, and available only to the component that needs them.

Before deployment, reviewers must confirm that no local default, localhost
origin, wildcard origin, example credential, or copied secret remains. The JWT
signing secret, refresh-token hash secret, database password, and any optional
provider credential must be independent where the implementation requires it.

## CORS, cookie, and session requirements

- Choose and document whether the frontend/API topology is same-site or
  cross-site before selecting cookie attributes.
- Use HTTPS throughout the browser flow. Both refresh and CSRF cookies must use
  `Secure=true`; keep their current narrow `/api/auth` path unless a separately
  reviewed topology requires otherwise.
- Prefer a compatible same-site topology and `SameSite=Lax`. Use
  `SameSite=None` only for an intentional cross-site design, with `Secure=true`
  and an explicit review of browser third-party-cookie behavior and CSRF risk.
- Configure `NEXORA_AUTH_TRUSTED_ORIGINS` with exact HTTPS frontend origins—no
  wildcard, localhost, or unreviewed preview origin.
- Preserve credentialed CORS, readable CSRF cookie plus matching request header,
  HttpOnly refresh cookie, refresh rotation, logout revocation/clearing, and
  memory-first frontend access tokens.
- Test a fresh session, reload-based refresh, rotation, logout, expired/revoked
  session behavior, and an untrusted origin. Do not infer success from login
  alone.

## API smoke-test requirements

- Execute the scenarios in [live-smoke-test-plan.md](live-smoke-test-plan.md)
  against the exact candidate frontend and API origins.
- Use a generated synthetic reviewer account and non-sensitive test content;
  keep cookies and tokens out of console transcripts and issue attachments.
- Capture pass/fail status, deployment identity, UTC time, and safe request IDs,
  but not bodies or headers containing private values.
- Confirm public, protected, CSRF, session, Wishlist, preference, Sentinel,
  request-ID, CORS, and external-deals fallback behavior.
- Remove the synthetic account/data when a safe supported process exists, or
  record the temporary retention limitation before public access.

## Browser QA requirements

- Test the primary routes on at least one current desktop browser and one
  narrow/mobile viewport, including direct URL loads and refreshes.
- Complete register, login, authenticated navigation, Wishlist mutation,
  notification-preference, Sentinel insight, logout, and post-logout access
  checks from the deployed frontend.
- Confirm loading, empty, fallback, unavailable, validation, retry, and session
  expiry states remain truthful and do not expose raw errors or credentials.
- Inspect browser network and console output for mixed content, CORS failures,
  cookie rejection, redirect loops, missing assets, and secret/private-data
  leakage.
- Repeat keyboard focus, reduced-motion, and responsive obstruction checks; this
  is QA, not a formal accessibility certification.

## Rollback considerations

- Identify the last known-good frontend artifact, backend artifact, source
  commit, and configuration revision before release.
- Separate application rollback from database recovery. Never assume a code
  rollback reverses a Flyway migration; use reviewed backups/forward fixes and
  restore procedures appropriate to the selected database service.
- Define triggers for rollback: failed health checks, auth/session breakage,
  migration failure, elevated safe error counts, unusable browser flows, or
  accidental exposure of sensitive values.
- Preserve the database when rolling application artifacts unless the incident
  procedure explicitly requires an approved restore. Test restoration before
  relying on it.
- Revoke and rotate affected credentials after suspected exposure; do not copy
  compromised values into tickets or logs.
- Keep a simple public disable/withdraw procedure for the portfolio link if the
  demo becomes unsafe or unmaintained.

## Public demo wording

Approved wording should stay close to:

> NEXORA is a hosted portfolio/demo MVP for controlled evaluation. It provides
> functional frontend, API, account, PostgreSQL-backed personal workflows, and
> bounded provider demonstrations. It is not a production SaaS service and
> carries no uptime, support, security-certification, privacy-compliance, or
> data-durability guarantee.

Do not call the demo “production-ready,” “enterprise,” “secure by default,”
“highly available,” or “zero downtime.” Publish the demo data policy, known
limitations, optional-provider status, and an owner/contact path alongside the
link.

## Production limitations that remain

- Current abuse limits, provider budgets, caches, and Sentinel rate limits are
  process-local and reset on restart.
- Production-like persistence still bridges through the `dev` profile. v0.76
  adds a strict hosted configuration path, but selected-provider PostgreSQL
  connectivity, migrations, persistence, backup, and restore remain unvalidated.
- Complete session administration, account verification/recovery, distributed
  coordination, monitoring/alerting, incident response, formal privacy and
  retention controls, tested disaster recovery, and operational support remain
  incomplete.
- Optional third-party providers have coverage, availability, privacy, cost,
  and failure-mode limits. Local fallback is not an availability guarantee.
- This plan creates no deployment, infrastructure, runtime configuration,
  production capability, or production-readiness claim.
