# NEXORA v0.91 Hosted Browser QA Evidence

- Status: Pending
- Latest released milestone: `v0.90.0-full-stack-demo-readiness`
- Active milestone: v0.91 hosted demo readiness
- Branch: `feature/hosted-demo-readiness`
- Candidate commit SHA: Pending
- Frontend URL: Pending
- Backend URL: Pending
- Database target: Pending/redacted
- Deployment identifiers: Pending
- Tester and UTC validation time: Pending
- Browser/version and desktop/mobile viewports: Pending

## Scope and evidence boundary

This is an unexecuted evidence template for validating hosted deployment
confidence in the existing product. v0.91 adds no new product-feature scope.
No hosted result is claimed here. The [v0.90 local QA record](BROWSER_QA_V0_90.md)
remains historical evidence and does not satisfy these checks.

The existing plan targets the Next.js frontend on Vercel, the backend Docker
service on Render, and disposable Neon PostgreSQL with Flyway V1–V12. Browser
requests use `NEXT_PUBLIC_API_BASE_URL=/`; Next.js rewrites `/api/**` to the
backend HTTPS origin in server-side `NEXORA_API_BASE_URL`, without `/api` or
credentials. `NEXT_PUBLIC_*` values are browser-visible and contain no secrets.
The exact frontend HTTPS origin must be trusted by the backend.

Follow the [deployment guide](../deployment/production-demo-deployment-plan.md)
and [live smoke plan](../deployment/live-smoke-test-plan.md). Use synthetic data
in the owned disposable demo. Record actual status codes, safe request IDs,
timestamps, and redacted observations only. Keep tokens, cookie/CSRF values,
passwords, database connection details, private account content, raw provider
errors, and unredacted logs out of this file.

## A. Backend direct health

Status: Pending. Observed result and evidence reference: Pending.

- Request `GET /api/health` directly from the actual backend HTTPS origin.
- Expected: HTTP 200 JSON with `runtimeMode=production`,
  `dataMode=postgres-dev`, and `checks.authProductionGuard=active`.
- Health is a sanitized runtime/configuration summary. `UP` does not prove
  PostgreSQL liveness, provider liveness, mail delivery, Gemini availability,
  or frontend proxy correctness. Dependency checks require separate evidence.
- Record the opt-in disposable PostgreSQL validation result separately,
  including 12 successful migrations, latest version `12`, and no failures.
  The existing hosted test only asserts at least 10 successful migrations.

## B. Frontend proxy health

Status: Pending. Observed result and evidence reference: Pending.

- Request frontend-origin `GET /api/health` and compare runtime/data/guard
  labels with the direct backend result; timestamps need not be identical.
- Confirm HTTP 200 JSON, the intended candidate, and no redirect loop, hosting
  login page, mixed content, or accidental localhost destination.
- Confirm browser calls stay on frontend `/api/**`. This request exercises the
  proxy path but does not establish correct forwarding for auth or cookies.

## C. Auth/register/login/refresh/logout

Status: Pending. Observed result and evidence reference: Pending.

- Register a synthetic account, log out, and log in through the hosted browser.
- Reload a protected route and confirm cookie-backed refresh restores the
  session; verify refresh rotation and rejection of a consumed refresh token.
- Log out, reload, and confirm refresh denial and signed-out protected routes.
- Confirm prior private Wishlist/Sentinel state is cleared after logout and
  account changes, including a Sentinel request pending during logout.
- Record desktop/mobile behavior and console/network failures without private
  response bodies. Logout revokes refresh state; an already-issued Bearer
  access token can remain valid until expiry.

## D. Cookie attributes

Status: Pending. Observed attributes and evidence reference: Pending.

| Cookie | Expected hosted attributes | Observed |
| --- | --- | --- |
| Refresh | Secure; HttpOnly; SameSite=Lax; Path=/api/auth; host-only, no Domain attribute | Pending |
| CSRF | Secure; readable/non-HttpOnly; SameSite=Lax; Path=/api/auth; host-only, no Domain attribute | Pending |

Inspect actual cookies on the frontend host. Confirm no browser rejection and
that logout expires the refresh cookie with matching attributes. Record cookie
names and attributes only, never values. Cookie inspection does not replace
the refresh-restoration check.

## E. CSRF negative test

Status: Pending. Observed result and evidence reference: Pending.

- From the trusted origin, submit a cookie-sensitive auth POST with the CSRF
  header missing, then mismatched to the cookie. Avoid sending real credentials.
- Expected: structured HTTP 403 `csrf_failed`, with no successful auth mutation.
- Confirm a valid cookie/header pair still permits the intended flow. The
  frontend can retry a 403 once; inspect the rejected request itself.

## F. CORS trusted/rejected origin behavior

Status: Pending. Observed result and evidence reference: Pending.

- Check direct API preflight and auth requests using the exact trusted frontend
  HTTPS Origin. Confirm allowed methods/headers, credentials support, and the
  exact allow-origin response rather than a wildcard.
- Repeat using an untrusted Origin header without contacting that origin.
  Confirm no permissive CORS response and rejection of cookie-sensitive auth.
- Record trusted-origin preservation through the frontend proxy. Same-origin
  browser success alone does not exercise direct cross-origin CORS enforcement.

## G. Wishlist persistence after backend restart

Status: Pending. Observed result and evidence reference: Pending.

- With a synthetic account, save a deal, change its target/alert preference,
  reload, and verify the current values through the UI and authenticated API.
- Restart the backend using the same database and intended persistent secrets.
  Reload/restore the session or sign in, then confirm item/target persistence.
- Confirm a second account cannot access or mutate the first account's item.
- Record a redacted before/after comparison and restart time. Delete the test
  item after persistence verification. This does not prove database recovery
  or persistence after a database restart; those require separate evidence.

## H. Notification preferences persistence after backend restart

Status: Pending. Observed result and evidence reference: Pending.

- Read original preferences through Wishlist or `/api/me/notification-preferences`.
  Change a reversible preference while global notification delivery stays disabled.
- Restart the backend against the same database, restore the session, and
  confirm the stored preference and account ownership. Restore the original value.
- Do not count this as email, reminder, push, or automatic delivery evidence.

## I. External deals success/cache/fallback behavior

Status: Pending. Observed result and evidence reference: Pending.

- Exercise `GET /api/deals/external?pageSize=12` under normal provider conditions,
  repeat the same query for cache behavior, and record bounded completion times.
- In an isolated candidate environment, verify provider-unavailable and cache
  expiry behavior; do not disrupt a shared demo. Record whether cached data or
  local fallback was actually served using controlled setup and redacted evidence.
- The response array alone proves neither provider success nor cache freshness.
  Keep stale-cache behavior pending until observed; HTTP 200 can be a fallback.
- Confirm unavailable data remains labelled honestly, invalid prices do not
  become FREE, and unsupported historical-low claims do not appear.
- Gemini and email delivery require separate evidence if enabled. Local Sentinel,
  unverified giveaway samples, and disabled notifications remain valid demo limits.

## J. Log privacy review

Status: Pending. Observed result and evidence reference: Pending.

- Review backend startup/auth/error/provider logs and frontend build/runtime
  logs privately; publish only redacted findings and safe correlation IDs.
- Check for credentials, tokens, cookie/CSRF values, database URLs, private
  account data, and user prompts/answers. Record log access and retention owners.
- Notifications are disabled by default. If enabled with the log adapter, it
  records user ID, item title, store, and prices; it sends nothing externally.
  Assess that private-data exposure before enabling it in a shared demo.

## K. Cleanup and rollback

Status: Pending. Procedure, owner, and observed outcome: Pending.

- Cleanup procedure: Pending. Account for synthetic accounts retained by the
  API smoke script, remove test Wishlist items, restore preferences, and end
  sessions. Do not claim account deletion support that the application lacks.
- Database cleanup/retention decision: Pending. Any disposable database removal
  must be separately authorized and must not target real user data.
- Rollback target and schema compatibility: Pending. Record a reviewed source
  or artifact reference and rollback/takedown steps; the v0.90 source tag alone
  is not evidence of a previously deployed rollback target.
- Rollback validation and owner: Pending. If this is the first deployment,
  record how to disable sharing and redeploy safely without assuming a previous
  hosted artifact exists. Application rollback does not reverse Flyway migrations.

## L. Final go/no-go decision

Status: Pending. Decision, owner, UTC time, and evidence references: Pending.

Blocking failures, accepted limitations, and required reruns: Pending.
Hosted evidence remains pending until the actual deployed frontend, backend,
and disposable database checks above are completed. Any eventual decision
supports only a controlled hosted portfolio/demo, without production-readiness,
uptime, complete market history, verified giveaway redemption, or automatic
notification-delivery claims.
