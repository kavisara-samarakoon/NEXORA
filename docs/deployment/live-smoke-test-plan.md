# NEXORA live hosted-demo smoke-test plan

Latest released milestone: `v0.90.0-full-stack-demo-readiness`.
Active milestone: v0.91 hosted demo readiness on `feature/hosted-demo-readiness`.
This validates the existing product; it adds no product-feature scope.
All checks below are pending. Record real results in
[BROWSER_QA_V0_91.md](../qa/BROWSER_QA_V0_91.md); historical local QA is not
hosted evidence.

## Purpose and safety

Run this checklist only after a candidate hosted frontend, API, and PostgreSQL
environment exists. v0.75 did not create that environment, and the completed,
tagged v0.76 milestone added only backend hosted-environment configuration;
the completed and tagged v0.77 milestone added manual validation against a
disposable hosted-demo PostgreSQL database. None of these milestones deployed
NEXORA, and this live checklist remains pending for the planned Neon, Render,
and Vercel hosted-demo path.
The checklist supplements existing automated validation; it is not a
penetration test, production certification, uptime probe, or monitoring system.

Before testing:

- Run `scripts/deployment/validate-hosted-postgres.sh` against the disposable
  hosted-demo database and retain only redacted pass/fail evidence. The manual
  test must remain opt-in and issues only read-only validation queries after
  existing Flyway migrations initialize the disposable database.
- Record the candidate source commit, frontend origin, API origin, environment,
  deployment identifier, tester, and UTC start time.
- Confirm the backend reports the reviewed hosted mode after starting with
  `SPRING_PROFILES_ACTIVE=hosted-demo` and a provider-supplied `PORT`; never
  record database or auth secret values in the evidence.
- Confirm the URLs are approved HTTPS demo endpoints and not an unrelated or
  real-user environment.
- Use a unique generated test account and synthetic Wishlist content. Never put
  a real password, access token, cookie, CSRF value, provider key, or private
  response body in the report.
- Capture only route, expected/actual status, pass/fail, safe request ID, and a
  redacted observation.
- Define how test data will be removed or record the known retention limitation.

## Runnable checks

Follow [the setup guide's verification commands](production-demo-deployment-plan.md#verify-before-sharing)
for offline env checks, opt-in hosted PostgreSQL validation, GET-only checks of
both hosted origins, and the account smoke test through Vercel. The account
smoke creates a generated reviewer account that persists in the demo database;
it now covers refresh, logout, and post-logout refresh denial. Curl's cookie jar
does not establish that browser SameSite/Secure handling works.

Health must report `runtimeMode=production`, `dataMode=postgres-dev`, and an
active auth production guard. `UP` alone also occurs in the memory-only demo.
The public profile list sanitizes `hosted-demo` to `custom`; it is not a raw
profile dump. `/api/health` is a sanitized runtime/configuration summary. It
does not prove PostgreSQL or provider liveness, mail delivery, Gemini
availability, or frontend proxy correctness by itself. Check direct backend
and frontend-proxy health separately, then use SQL, browser, and provider smoke
checks for dependency evidence. Confirm Flyway V1–V12 and latest version `12`
separately from the hosted test's current minimum-of-10 assertion.

## Public API checks

- [ ] `GET /api` returns the current welcome response and HTTP 200.
- [ ] `GET /api/health` returns the safe health shape and HTTP 200 without
  exposing raw configuration, database identity, or secrets.
- [ ] `GET /api/deals` returns the public deals array.
- [ ] `GET /api/deals/external` returns its existing response shape through a
  provider response, stale cache, or local-fallback behavior without claiming
  freshness that the response metadata cannot prove.
- [ ] `GET /api/giveaways` returns the unverified public sample array without
  presenting it as verified redemption data.
- [ ] `GET /api/wishlist` returns the public demo Wishlist array and no personal
  account data.
- [ ] `GET /api/dashboard/summary` returns the public summary.
- [ ] `GET /api/security/status` returns explicitly demo/status data.
- [ ] `GET /api/sentinel/status` and `GET /api/sentinel/demo` remain public and
  accurately label provider/demo state.
- [ ] An unknown `/api/...` route and an unexpected method do not become public;
  accept the framework's legitimate 401/403 default-deny response.

## Request-ID behavior

- [ ] Every representative public, protected, validation-error, and auth-error
  response includes `X-NEXORA-Request-ID`.
- [ ] A syntactically valid, bounded client request ID is echoed as documented.
- [ ] Missing or invalid input produces a generated safe ID rather than echoing
  unsafe text.
- [ ] Browser JavaScript on the trusted frontend can read only the configured
  exposed request-ID header; tokens and cookie headers are not exposed.
- [ ] Logs can be correlated with a sampled safe request ID without recording
  credentials, cookies, query secrets, or private bodies.

## CSRF and authentication flow

- [ ] `GET /api/auth/csrf` returns HTTP 200, a non-empty token, and the readable
  CSRF cookie with reviewed HTTPS attributes and `/api/auth` path.
- [ ] Register a generated reviewer account from the deployed frontend; confirm
  the existing safe user/auth response and HttpOnly refresh cookie.
- [ ] `GET /api/auth/me` succeeds with the issued access token and returns only
  the authenticated test account's safe user fields.
- [ ] Login with the generated account succeeds using the CSRF cookie/header and
  trusted frontend origin.
- [ ] Refresh rotates the refresh session/cookie and returns a fresh access token;
  reuse of the rotated credential fails safely.
- [ ] Reload the frontend and verify its existing refresh/session restoration
  behavior without exposing the raw refresh token to JavaScript.
- [ ] Logout revokes/clears the refresh session and returns the existing status.
- [ ] After the frontend discards its access token, unauthenticated protected
  calls fail with 401/403 and refresh cannot restore the revoked session. Record
  that an already-issued short-lived Bearer token is not immediately revoked by
  logout and can remain valid until expiry.
- [ ] Missing/mismatched CSRF data and an untrusted origin are rejected safely.

## Protected route checks

- [ ] Without credentials, `/api/auth/me`, `/api/me/wishlist`,
  `/api/me/notification-preferences`, and `/api/me/sentinel/insight` return
  401/403 with the existing safe error contract where applicable.
- [ ] With the generated account token, the supported `/api/me/**` routes remain
  accessible and account-scoped.
- [ ] A second generated account cannot read or mutate the first account's
  Wishlist items, history, events, or preferences.

## Wishlist lifecycle

- [ ] Read the authenticated account's initial Wishlist.
- [ ] Add a uniquely named synthetic item and record its generated item ID only
  in the private test session.
- [ ] Update its alert/target fields and verify the existing evaluation shape.
- [ ] Read price history and alert events where applicable without assuming an
  event will exist before its documented transition.
- [ ] Confirm another account cannot read, update, or delete the item.
- [ ] Restart the backend against the same disposable database;
  reload/sign in and verify the saved item and target still belong to the account.
- [ ] Delete the item and verify it no longer appears.

## Notification preference checks

- [ ] Read the generated account's notification preferences and verify safe
  defaults.
- [ ] Apply one reversible preference update and confirm only supplied fields
  change.
- [ ] Restart the backend against the same database and
  verify the changed preference through the authenticated API/UI. This tests
  persistence, not automatic notification delivery.
- [ ] Restore the original value when practical.
- [ ] Confirm preferences remain account-scoped. Do not trigger real email unless
  email delivery has separate approval and a controlled recipient.

## Sentinel checks

- [ ] Public Sentinel status/demo routes accurately identify the selected mode.
- [ ] Submit a bounded authenticated request to
  `POST /api/me/sentinel/insight` and verify the existing response shape.
- [ ] Confirm deterministic local mode works when Gemini is not enabled.
- [ ] Confirm validation and process-local rate-limit errors remain safe and do
  not expose prompts, keys, internal URLs, or raw provider errors.
- [ ] If an external provider is separately enabled, confirm a controlled
  failure falls back to the local response with the existing safe reason label.

## CORS and browser-cookie checks

- [ ] Requests from the exact deployed frontend origin receive the configured
  credentialed CORS response.
- [ ] Preflight succeeds for the existing methods and request headers needed by
  the frontend.
- [ ] An untrusted origin receives no permissive CORS response.
- [ ] No wildcard origin is combined with credentials.
- [ ] Browser developer tools show both auth cookies as Secure, with reviewed
  `SameSite=Lax`, host-only scope (no Domain attribute), and `/api/auth` paths;
  the refresh cookie remains HttpOnly and the CSRF cookie is readable.
- [ ] There is no mixed HTTP/HTTPS content and no browser cookie rejection that
  breaks register, refresh, or logout.

## External-deals fallback checks

- [ ] Normal `GET /api/deals/external` completes within the reviewed timeout and
  preserves its current response shape.
- [ ] Under an approved controlled provider-unavailable test, the endpoint
  returns stale same-key data when available or the local catalog fallback.
- [ ] Provider saturation does not return a public 500 solely because the
  four-call process-local budget is full.
- [ ] Cache bounds, same-key sharing, fallback labels, and lack of provider error
  detail remain intact.
- [ ] Do not deliberately disrupt a shared public environment; run failure cases
  in a controlled candidate environment or rely on focused automated evidence.

## Browser route checks

- [ ] `/` loads the dashboard and its backend/data-source status remains
  truthful.
- [ ] `/deals`, `/giveaways`, `/security`, and `/sentinel` load directly and
  after refresh without routing or asset errors.
- [ ] `/register` and `/login` complete the deployed browser auth flow.
- [ ] `/wishlist` shows the signed-out state, then the authenticated personal
  workflow after login.
- [ ] `/settings` remains clearly labelled according to its implemented preview
  or connected state.
- [ ] Navigation, logout, direct URL entry, and session-expiry behavior work at
  desktop and narrow/mobile viewports.
- [ ] No page shows localhost URLs, raw exceptions, credentials, mixed content,
  misleading production claims, or private test-account data after sign-out.

## Completion record

- [ ] Record all failures and owners; do not waive auth, persistence, CORS,
  cookie, migration, or secret-handling failures for a public demo.
- [ ] Re-run affected sections after fixes against the exact candidate artifact.
- [ ] Complete the deployment readiness checklist and browser QA evidence.
- [ ] Remove or account for synthetic test data and end the test session.
- [ ] Review hosted logs for private data, record the cleanup procedure and its
  outcome, and select a schema-compatible rollback target and owner. No previous
  deployed rollback target may be assumed for a first deployment; record a
  takedown/redeploy procedure if none exists.
- [ ] Record a go/no-go decision. A smoke-test pass means only that the checked
  hosted-demo flows worked at that time; it is not production readiness or an
  availability guarantee.
