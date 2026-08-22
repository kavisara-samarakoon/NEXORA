# NEXORA Auth and Session Hardening Plan

## 1. Purpose

This document defines the path from NEXORA's current MVP JWT authentication
model to a safer, production-style browser authentication and session model. It
is a design and sequencing artifact only: it does not change runtime behavior,
API contracts, database schemas, dependencies, or deployment configuration.

The plan establishes the security boundaries and migration order that should be
reviewed before implementation. It also creates a foundation for future account
recovery, verification, security monitoring, and safe Steam, Epic Games, and GOG
account linking. NEXORA remains a local/development MVP and must not be described
as production-ready merely because this plan exists.

## 2. Current authentication state

The current implementation provides a useful MVP authentication foundation:

- `POST /api/auth/register` validates account input, normalizes the email,
  checks email and username uniqueness, hashes the password with BCrypt, creates
  the user, and returns an authenticated response.
- `POST /api/auth/login` accepts an email address or username, verifies the
  BCrypt password hash, checks that the account is active, and returns an
  authenticated response.
- `AuthResponse` contains a JWT access `token`, the `Bearer` token type, and a
  user summary. Registration and login therefore authenticate the browser
  immediately.
- `JwtService` creates and validates signed HS256 access tokens containing the
  user ID, issuer, issued-at time, and expiry. The configured access-token
  lifetime defaults to 60 minutes.
- `JwtAuthenticationFilter` reads the access token from the
  `Authorization: Bearer <token>` request header. Spring Security remains
  stateless and protects `GET /api/auth/me` and routes under `/api/me/**`.
- `GET /api/auth/me` resolves the authenticated user and returns the active
  account summary.
- Personal wishlist operations under `/api/me/wishlist` use the authenticated
  user ID for user-owned reads and changes. The public `/api/wishlist` preview
  remains separate.
- The primary Next.js frontend stores the access token in browser
  `localStorage` through `auth-client.ts`. Login and registration save it, while
  account and personal-wishlist requests send it in the Bearer header.
- Frontend components clear the stored token after authentication failures.
  The current logout action only removes that client-side token.
- In the default/non-`dev` backend profile, users are stored in memory and are
  lost when the process restarts. In the `dev` profile, users are stored in
  PostgreSQL through JPA and the existing Flyway-managed schema.

## 3. Current risks and limitations

The current design is appropriate only for local MVP use. Its main limitations
are:

- A script that executes through an XSS flaw can read and exfiltrate the access
  token from `localStorage`. The token remains usable until it expires.
- There is no refresh-token lifecycle, so the browser cannot renew a session
  securely without another credential submission or continued use of a
  relatively long-lived access token.
- There is no server-side session or token-revocation state. A valid access
  token cannot be individually invalidated before expiry.
- Logout is mainly client-side token removal. It does not invalidate a
  credential on the server or terminate the same session on another device.
- There is no password-reset or account-recovery workflow.
- There is no email-verification workflow or verified-email state suitable for
  sensitive notifications and recovery.
- Login and registration do not have dedicated rate limits or automated-abuse
  controls.
- Suspicious logins, repeated failures, refresh-token reuse, password changes,
  recovery attempts, and session revocations are not captured as structured
  audit/security events.
- There is no linked-account security model for provider identity binding,
  reauthentication, unlinking, or provider-token handling.
- CSRF is disabled for the current stateless Bearer-token model. That decision
  must be revisited before cookies are accepted as authentication credentials.
- The negative `!dev` profile selection currently falls back to in-memory user
  storage. A future production profile must select persistent stores explicitly
  and fail closed if required persistence is unavailable.

## 4. Target production-style design

### Token and session model

Use two credentials with different exposure and lifetime characteristics:

1. Issue a short-lived signed access token for Bearer authentication. A target
   lifetime of approximately 5–15 minutes should be selected during
   implementation and made configurable.
2. Issue a longer-lived, high-entropy opaque refresh token in an `HttpOnly`,
   `Secure`, and appropriately scoped `SameSite` cookie. JavaScript must never
   receive or persist the refresh token.
3. Keep the access token in frontend memory, not durable browser storage. On a
   page reload, the frontend should call the refresh/session endpoint using the
   cookie and receive a new access token plus the current user. This preserves
   Bearer authorization for API requests while reducing durable token exposure.
4. Store one server-side refresh-session record per browser/device session.
   Store only a cryptographic token hash, never the raw refresh token. A keyed
   hash using a separately managed server secret should be preferred so a
   database-only compromise is insufficient for offline token lookup.
5. Rotate the refresh token atomically every time it is used: invalidate the
   presented token, create its successor, set the successor cookie, and return a
   fresh access token. Concurrent frontend refreshes should be serialized.
6. Treat use of a successfully rotated or revoked token as possible reuse.
   Record the event and revoke the affected token family/session. A carefully
   bounded concurrency policy may be designed later, but it must not silently
   make old refresh tokens reusable.

Access JWTs can remain stateless during the first migration. Revocation is then
immediate for refresh capability, while an already issued access token remains
valid only for its short remaining lifetime. Operations requiring stronger
immediate invalidation can later check account or session security state.

### Logout and session control

- `POST /api/auth/logout` should identify and revoke the current refresh
  session, clear the refresh cookie with matching attributes, and be safe to
  call repeatedly.
- The frontend must erase its in-memory access token and authenticated-user
  state whether logout succeeds or the session is already absent. It should
  report a backend availability failure without retaining the local credential.
- A later `POST /api/auth/logout-all` can revoke all active sessions for the
  authenticated user. A session list with per-session revocation can follow
  once the core lifecycle is stable.
- Password reset, account disablement, and high-risk account changes should
  revoke relevant sessions according to an explicit policy.

### CSRF, cookies, and CORS

The refresh cookie is sent automatically by the browser, so refresh, logout,
and any future cookie-authenticated state-changing routes require CSRF defenses.
The implementation design should combine:

- a conservative `SameSite` setting (`Lax` by default where the product flow
  permits it), `Secure` outside local development, `HttpOnly`, a narrow cookie
  `Path`, no broad `Domain`, and a defined maximum age;
- strict validation of `Origin` and, where appropriate, `Referer` against an
  environment-specific frontend allowlist;
- a CSRF token mechanism for state-changing cookie-authenticated requests, such
  as a server-issued token returned outside the HttpOnly cookie and echoed in a
  custom request header; and
- no state-changing authentication operation over `GET`.

Production CORS must enumerate trusted origins, allow credentials only for
those origins, restrict methods and headers to what is required, and never
combine credentialed requests with wildcard origins. The local frontend origins
can remain a development-only configuration. Cookie behavior behind HTTPS,
reverse proxies, and the intended same-site/cross-site topology must be tested
before deployment.

### Environment separation

Local MVP mode and a future production mode must be visibly separate. Local
development may relax the cookie `Secure` flag only when using HTTP on loopback.
Production-style configuration must require HTTPS, persistent users and
sessions, strong independent secrets, explicit trusted origins, and non-default
lifetimes. Startup should fail when required production values are missing; a
production profile must not accidentally activate the current in-memory stores.

## 5. Proposed backend changes

Future backend implementation should be delivered in reviewable increments:

- Add a Flyway migration for an `auth_sessions` (or `refresh_sessions`) table.
- Add a refresh-session entity, repository, and service with secure random
  token generation, token hashing, atomic rotation, expiry, revocation, and
  reuse detection.
- Add `POST /api/auth/refresh`. It should read the HttpOnly refresh cookie,
  enforce CSRF/origin controls, rotate the session, set the successor cookie,
  and return a short-lived access token plus the current user.
- Add idempotent `POST /api/auth/logout` to revoke the presented refresh session
  and expire its cookie.
- Consider `POST /api/auth/logout-all` after current-session logout is proven.
  Require a valid authenticated context and, if appropriate, recent
  reauthentication for broader session revocation.
- Update login and registration to create a server-side refresh session and set
  the refresh cookie while returning a short-lived access token and user.
- Keep `GET /api/auth/me` as the authenticated account lookup and compatibility
  check.
- Add centralized cookie utilities and validated configuration properties for
  names, paths, lifetimes, `Secure`, `SameSite`, trusted origins, token-hashing
  secret, and maximum active sessions.
- Define consistent error contracts for missing, expired, revoked, rotated, and
  reused refresh credentials without leaking whether a supplied token ever
  existed.
- Preserve existing Bearer access-token support temporarily so the frontend can
  migrate independently. Document and later remove the legacy long-lived
  issuance/storage behavior after all consumers have moved.
- Add endpoint-specific rate limiting for registration, login, refresh,
  password recovery, and verification. Keys should combine appropriate signals
  such as normalized account identifier and privacy-conscious network hints,
  with bounded counters, retry guidance, and no permanent account lockout that
  enables denial of service.
- Add structured audit/security events for authentication successes and
  failures, refresh reuse, logout/revocation, account recovery, verification,
  password changes, and linked-account changes. Do not log raw passwords,
  access tokens, refresh tokens, reset tokens, or sensitive provider tokens.

## 6. Proposed frontend changes

Future frontend implementation should:

- Stop storing access tokens long-term in `localStorage` and remove the legacy
  token after a controlled migration.
- Hold the short-lived access token in memory, or obtain it through a
  refresh/session bootstrap endpoint when the application loads.
- Send refresh and logout requests with browser credentials enabled while
  continuing to send access tokens through the Bearer header for protected API
  calls.
- Centralize authenticated API behavior. On an eligible `401`, allow one
  serialized refresh attempt, update the in-memory access token, and retry the
  original request once. Do not retry login errors, loop indefinitely, or run
  parallel refresh rotations for the same session.
- Call the backend logout endpoint, then clear all in-memory authentication and
  user state even if the server reports that the session is already expired.
- Update `AuthStatus` to represent session bootstrap, authenticated,
  anonymous/expired, temporarily unavailable, and logging-out states without
  flashing stale identity information.
- Handle expired or revoked sessions consistently across account, deals, and
  wishlist screens: clear local state, cancel protected work where practical,
  and prompt for sign-in without losing unrelated public-page functionality.
- Keep login and registration UX simple. Cookie issuance should be invisible to
  JavaScript, and the UI should receive only the access token and safe user
  summary needed for the active application session.
- Never expose, read, copy, log, or include the refresh token in JavaScript,
  React state, browser storage, URLs, analytics, or error messages.

## 7. Proposed database changes

The first future auth migration should add one clearly named session table,
preferably `auth_sessions`. It should support rotation history and revocation
without storing a usable credential. Proposed fields are:

| Field | Purpose |
| --- | --- |
| `id` | Stable server-side session/token record identifier |
| `user_id` | Foreign key to the owning user |
| `token_hash` | Unique hash of the opaque refresh token; raw token is never stored |
| `issued_at` | Time this refresh token was issued |
| `expires_at` | Absolute expiry time |
| `revoked_at` | Revocation/consumption time, nullable while active |
| `rotated_from_id` | Link to the predecessor record for rotation and reuse analysis |
| `user_agent_hash` or user-agent summary | Privacy-conscious device/session context |
| `ip_hash` or `last_ip_hint` | Optional, minimized network context if justified |
| `created_at` / `updated_at` | Persistence audit timestamps |

The implementation should also define indexes for active user sessions, token
hash lookup, expiry cleanup, and rotation ancestry; foreign-key behavior;
retention/cleanup rules; UTC timestamp semantics; and transaction/concurrency
rules for single-use rotation. Device and network data must be minimized,
retained briefly, and justified rather than collected by default.

Later migrations may add:

- `password_reset_tokens`, containing only hashed, single-use, expiring recovery
  tokens with consumption state;
- `email_verification_tokens`, containing only hashed, single-use, expiring
  verification tokens and the email/version they verify; and
- `security_events`, containing event type, user/session reference when known,
  time, outcome, and minimized context suitable for security review.

Migration names, constraints, and retention policies should be finalized only
when the corresponding implementation branch is reviewed. None of these tables
is created by this planning change.

## 8. API migration plan

### Phase 1: Documentation plan only

- Review and approve this design, threat assumptions, naming, cookie topology,
  compatibility window, and production/local configuration boundary.
- Make no API, runtime, database, dependency, or deployment changes.

### Phase 2: Backend refresh-token/session foundation

- Add the session migration, persistence model, hashing, rotation, expiry,
  revocation, configuration, and focused tests.
- Add refresh-cookie issuance and `POST /api/auth/refresh` behind an explicitly
  reviewed contract while retaining existing Bearer support.

### Phase 3: Frontend session client migration

- Introduce the memory-only access-token store, credentialed session bootstrap,
  serialized refresh/retry behavior, and unified authentication state.
- Migrate `AuthStatus`, account lookup, deals saving, and personal wishlist
  operations away from durable access-token storage.

### Phase 4: Logout and token revocation

- Add backend logout, cookie clearing, refresh-session revocation, replay/reuse
  handling, and frontend logout integration.
- Remove legacy `localStorage` access-token compatibility only after the new
  flow is validated end to end.

### Phase 5: Rate limiting and account safety

- Add endpoint-specific throttling, structured security events, retention and
  privacy rules, operational alert thresholds, and session-management controls.

### Phase 6: Password reset and email verification

- Add hashed single-use token workflows, verified-email state, safe expiration,
  enumeration-resistant responses, notification delivery, and appropriate
  session revocation after recovery or password change.

### Phase 7: Prepare linked account security for Steam/Epic/GOG

- Define provider-specific identity and credential storage, callback/state
  validation, reauthentication requirements, conflict handling, unlink/revoke
  behavior, audit events, and recovery rules before implementing any provider.

Each phase should preserve a documented rollback/compatibility path and update
the project status so planned controls are not mistaken for implemented ones.

## 9. Testing strategy

- Keep the ordinary backend `mvn test` suite database-free where practical by
  testing session/token logic with clocks, deterministic fixtures, and mocked or
  in-memory repository boundaries.
- Add backend unit tests for random-token handling, hashing, constant-time hash
  comparison where applicable, rotation, absolute expiry, revocation, token
  family reuse detection, cookie attributes, and configuration validation.
- Add API endpoint tests for successful and failed refresh, rotation, logout,
  idempotent logout, CSRF/origin rejection, inactive users, and safe error
  responses.
- Add PostgreSQL integration tests for each Flyway session migration,
  constraints, indexes, JPA validation, atomic rotation, and cleanup queries.
  Keep these in the separate database-backed validation path.
- Run primary frontend lint and production-build validation after the session
  client migration.
- Add frontend tests where the project test foundation permits them for startup
  bootstrap, a single 401 refresh retry, concurrent request serialization,
  refresh failure, logout, and state changes across account/deals/wishlist UI.
- Manually test in a real browser: login, registration, reload/session restore,
  access-token refresh, multiple tabs, logout, expired session, revoked session,
  cookie clearing, and local-versus-production cookie settings.
- Add security regression tests for malformed, invalid, expired, revoked,
  rotated, and reused refresh tokens; expired or incorrectly signed access
  tokens; cross-origin and missing-CSRF requests; and logs that could otherwise
  expose credentials.

## 10. Linked account readiness

Session hardening should precede Steam, Epic Games, or GOG account linking
because linked accounts increase both the value of a NEXORA account and the
impact of account takeover. An attacker with a persistent NEXORA session could
otherwise attach, inspect, or remove external identities and gain access to
future cross-store data.

Provider identifiers and any provider credentials must be treated as sensitive
account data, stored with least privilege, and excluded from logs and client
state unless explicitly required. Linking and unlinking need anti-CSRF and
provider-state protections, recent NEXORA reauthentication for sensitive
changes, clear ownership-conflict handling, secure revoke/disconnect behavior,
and audit events. Recovery must not permit an attacker to use one linked
provider to bypass verification for another. These controls depend on a trusted
session lifecycle, reliable revocation, and security-event model.

## 11. Out of scope for this plan

- No immediate Steam, Epic Games, or GOG account-linking implementation.
- No OAuth or external identity-provider implementation yet.
- No production deployment, production environment, or deployment/CD changes.
- No full multi-factor authentication implementation yet.
- No real Sentinel AI, Gemini, or other AI integration.
- No backend or frontend runtime changes, API behavior changes, database
  migrations, dependencies, or secret/configuration rollout in this branch.

## 12. Recommended next implementation branch

After this plan has been reviewed and its security decisions approved, create:

`feature/auth-refresh-token-backend-foundation`

That branch should implement only the Phase 2 backend foundation and its tests,
with explicit review of the session schema, token hashing and rotation,
refresh-cookie attributes, CSRF controls, compatibility contract, and
configuration boundaries. Implementation must not begin merely because the
planning document has been added.
