# NEXORA v0.92 Hosted Browser QA Evidence

- Status: Pending
- Latest released milestone: `v0.91.0-hosted-demo-readiness-foundation`
- Active milestone: v0.92 — Real Hosted Deployment Execution
- Branch: `feature/real-hosted-deployment-execution`
- Candidate source commit SHA: Pending
- Backend commit/deployment ID: Pending
- Frontend commit/deployment ID: Pending
- Render backend URL: Pending/redacted
- Vercel frontend URL: Pending/redacted
- Neon database target: Pending/redacted
- Deployment environment: Private synthetic hosted demo
- Tester / UTC validation time: Pending
- Browser/version/viewports: Pending

## Scope and evidence boundary

This pending record covers private synthetic hosted-demo validation across the
Vercel frontend, Render backend, and disposable Neon PostgreSQL. It does not
establish production readiness; NEXORA remains not production-ready. No actual
result is recorded until deployment execution occurs. No real hosted evidence
exists yet, and no check below is recorded as passed or failed.

Follow the [deployment guide](../deployment/production-demo-deployment-plan.md)
and [live smoke plan](../deployment/live-smoke-test-plan.md). Historical local
QA and the [v0.91 pending record](BROWSER_QA_V0_91.md) do not satisfy these checks.
Record only actual status codes, safe request IDs, timestamps, and redacted
observations. Never record token characters, cookie or CSRF values, Authorization
values, passwords, database credentials, private account content, or raw logs.

## A. Backend Direct Health

Status: Pending. Observed result and evidence reference: Pending.

- Expected: direct backend `GET /api/health` returns HTTP 200 JSON with
  `runtimeMode=production`, `dataMode=postgres-dev`, and
  `checks.authProductionGuard=active` for the intended candidate.
- Health summarizes sanitized runtime/configuration; it does not prove database
  or provider liveness, mail delivery, Gemini availability, or proxy correctness.

## B. Frontend Proxy Health

Status: Pending. Observed result and evidence reference: Pending.

- Expected: frontend-origin `GET /api/health` returns HTTP 200 JSON with the
  same intended candidate and runtime/data/guard labels as direct backend health.
- Confirm browser requests stay on frontend `/api/**`, without redirect loops,
  hosting login pages, mixed content, or localhost destinations. Auth and cookie
  forwarding require separate checks below.

## C. Hosted PostgreSQL Validation

Status: Pending. Observed result and redacted evidence reference: Pending.

- Run the opt-in hosted PostgreSQL validation only against disposable Neon
  PostgreSQL. Existing Flyway V1–V12 migrations may initialize schema/seed data.
- Expected: hosted profile initialization, PostgreSQL connectivity, read-only SQL
  validation, and JPA schema validation succeed.
- Expected: exactly 12 successful versioned migrations, latest successful
  migration version 12, and 0 failed migrations.
- This check does not establish persistence across a backend restart.

## D. Authentication Flow

Status: Pending. Observed results and evidence references: Pending.

| Flow | Expected behavior | Observed result / evidence |
| --- | --- | --- |
| Register | Synthetic account registration through the frontend proxy succeeds and establishes the browser session | Pending |
| Login | Synthetic account login restores authenticated account access | Pending |
| Reload / refresh restoration | Reloading a protected route restores the session through cookie-backed refresh; rotation rejects the consumed refresh credential | Pending |
| Logout | Refresh session is revoked/cleared and frontend private account state is cleared | Pending |
| Post-logout refresh rejection | Refresh cannot restore the logged-out session; reloading remains signed out | Pending |

Logout does not immediately revoke an already-issued short-lived Bearer access
token; it can remain valid until expiry. Record browser behavior without private
response bodies or credentials.

## E. Hosted Cookie Attributes

Status: Pending. Observed attributes and evidence reference: Pending.

| Cookie | Expected attributes only | Observed attributes |
| --- | --- | --- |
| Refresh cookie | Secure; HttpOnly; SameSite=Lax; Path=/api/auth; no Domain | Pending |
| CSRF cookie | Secure; non-HttpOnly; SameSite=Lax; Path=/api/auth; no Domain | Pending |

Inspect attributes on the frontend host without recording values. Confirm no
browser rejection and refresh-cookie expiry on logout with matching attributes.

## F. CSRF Negative Tests

Status: Pending. Observed results and evidence references: Pending.

| Test | Expected behavior | Observed result / evidence |
| --- | --- | --- |
| Missing header | Cookie-sensitive auth POST from the trusted origin with the CSRF header absent returns structured HTTP 403 `csrf_failed` without an auth mutation | Pending |
| Mismatched header | Cookie-sensitive auth POST with a header that differs from the CSRF cookie returns structured HTTP 403 `csrf_failed` without an auth mutation | Pending |

Inspect the rejected request itself; the frontend can retry once with new CSRF
data. Keep actual header/cookie values out of evidence.

## G. CORS Trusted / Rejected Origin Behavior

Status: Pending. Observed results and evidence references: Pending.

- Expected: direct API preflight for the exact trusted frontend HTTPS origin
  permits required methods/headers and credentials with an exact allow-origin.
- Expected: an untrusted Origin header receives no permissive CORS response,
  and cookie-sensitive auth requests are rejected. No wildcard with credentials.
- Check trusted-origin preservation through the frontend proxy. Same-origin
  browser success alone does not prove direct cross-origin CORS enforcement.

## H. Wishlist Persistence Across Backend Restart

Status: Pending. Before/after comparison, restart time, and evidence: Pending.

- Save a synthetic Wishlist item and target/alert settings; verify after reload.
- Restart the backend against the same disposable database and persistent
  secrets, restore/sign in, and verify item/settings persistence and ownership.
- Remove the test item afterward. Backend restart persistence does not prove
  database restart recovery or durability.

## I. Notification Preference Persistence Across Backend Restart

Status: Pending. Before/after comparison, restart time, and evidence: Pending.

- Record original synthetic-account preferences privately, apply a reversible
  change, restart the backend against the same database, and verify persistence
  and account ownership through the authenticated API/UI.
- Restore the original preference. This is not notification-delivery evidence;
  keep delivery disabled unless separately authorized.

## J. External Deals Success / Cache / Fallback

Status: Pending. Success, cache, fallback observations and evidence: Pending.

- Exercise `GET /api/deals/external` normally and repeat the same query for cache
  behavior; record bounded completion times and source/fallback observations.
- Use an isolated controlled candidate environment for provider-unavailable and
  stale/local fallback cases. Do not disrupt a shared environment.
- HTTP 200 or the response array alone proves neither provider success nor
  cache freshness. Keep each case pending until supported by actual evidence.

## K. Log Privacy Review

Status: Pending. Redacted findings, access/retention owner, and evidence: Pending.

- Review backend startup/auth/error/provider logs and frontend build/runtime
  logs privately for tokens, cookies, CSRF/Authorization values, credentials,
  database URLs, private account data, and prompts/answers.
- Publish only redacted findings and safe request IDs; do not attach raw logs.

## L. Cleanup and Rollback

Status: Pending. Procedure, owner, and observed outcome: Pending.

- Synthetic data cleanup/retention: Pending. Account for smoke-created accounts,
  remove test Wishlist items, restore preferences, and end sessions without
  claiming unsupported account deletion.
- Disposable database cleanup/retention decision: Pending. Removal requires
  separate authorization and must not target real user data.
- Schema-compatible rollback target and owner: Pending. Record rollback or
  takedown/redeploy steps without assuming a previous hosted artifact exists.
  A source tag alone does not prove prior deployment; application rollback does
  not reverse Flyway migrations.
- Rollback/takedown validation and evidence: Pending.

## M. Final Go/No-Go Decision

Status: Pending. Decision, owner, UTC time, and evidence references: Pending.

- Blocking findings and required reruns: Pending.
- Accepted private synthetic demo limitations: Pending.
- Cleanup and rollback review: Pending.

Any eventual decision applies only to the checked private synthetic hosted demo
at the recorded time. It does not establish production readiness, uptime,
verified giveaway redemption, complete market history, or notification delivery.
