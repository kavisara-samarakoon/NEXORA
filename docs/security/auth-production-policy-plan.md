# NEXORA authentication production-policy plan

## 1. Purpose and status

This document defines the authentication, session, CSRF, CORS, cookie, secret,
and operational decisions NEXORA must review before any real deployment. It is
a production-policy planning artifact only: it changes no runtime behavior,
configuration defaults, API contract, database schema, dependency, or
deployment workflow.

NEXORA remains a local/development MVP and is not production-ready. Completing
this document is not the same as implementing or validating its controls. A
deployment owner and security reviewer must resolve the open topology and
operations decisions, implement the selected policy, and complete the go/no-go
checklist before any production use.

The older
[auth/session hardening plan](auth-session-hardening-plan.md) records the
migration path that produced the current local refresh-session foundation. This
document supersedes it for current production-policy decisions.

## 2. Current implemented local-development state

The following controls exist today:

- Passwords are hashed with BCrypt. Registration enforces BCrypt's 72-byte
  input boundary, and login uses the same password encoder.
- The backend issues signed HS256 JWT access tokens. Protected APIs accept them
  through `Authorization: Bearer <token>` and remain stateless for access-token
  authentication.
- The primary Next.js frontend keeps the active access token in module memory,
  removes the legacy `localStorage` token, and performs one serialized refresh
  attempt for eligible authentication failures.
- Registration and login create an opaque refresh token and issue it in an
  `HttpOnly` cookie. Frontend JavaScript does not receive the raw refresh token.
- The backend stores only an HMAC-SHA256 refresh-token hash, rotates the token
  on successful refresh, and revokes the current refresh record on logout.
- Flyway V7 creates `auth_sessions` for the PostgreSQL-backed `dev` profile.
  The default profile keeps refresh sessions and users in memory, so they reset
  on backend restart.
- `GET /api/auth/csrf` issues a cryptographically random CSRF token in a
  frontend-readable cookie and response body. Register, login, refresh, and
  logout require the same token in the configured request header.
- Cookie-sensitive auth POST routes validate a present `Origin`, or a present
  `Referer` when `Origin` is absent, against explicit trusted origins.
- CORS permits credentials only for the configured trusted origins and limits
  headers to content type, Bearer authorization, and the CSRF header.
- Local trusted origins default to the Next.js and retained Vite localhost
  ports. These are development compatibility values, not a production
  allowlist.
- Refresh and CSRF cookies default to `Secure=false`, `SameSite=Lax`, and
  `Path=/api/auth` so local HTTP development works.
- A request with neither `Origin` nor `Referer` is currently allowed to proceed
  when its CSRF cookie/header pair is valid. This supports local curl and test
  clients; it is not an approved production no-origin policy.

These are local-development foundations, not assurance that the application is
safe for Internet exposure. There is no production profile, deployed topology,
secret manager, reverse-proxy policy, operations guide, or security monitoring
integration.

## 3. Required production environment and secret policy

Before deployment, NEXORA must have a dedicated production configuration that
fails closed instead of inheriting local defaults.

Required policy:

- A production profile must use persistent PostgreSQL user and refresh-session
  stores. It must never select the default in-memory stores.
- Production startup must fail when a required secret, database setting,
  trusted-origin allowlist, or secure-cookie setting is absent, empty, invalid,
  or still equal to a local placeholder.
- The JWT signing secret must be cryptographically strong, unique to the
  environment, externally managed, revocable/rotatable, and never use the
  repository default.
- The refresh-token HMAC secret must be cryptographically strong, externally
  managed, and independent from the JWT signing secret. Compromise or rotation
  procedures must account for the effect on existing refresh sessions.
- Database credentials must be injected by the selected deployment platform or
  secret manager with least privilege. They must not be stored in source,
  images, build artifacts, or developer-facing configuration.
- SMTP credentials and Gemini or other explicitly enabled provider keys must be
  external secrets. Disabled providers must not require credentials.
- No secret may use a `NEXT_PUBLIC_` variable; Next.js exposes those values to
  browser code.
- Real secrets must never appear in documentation, commits, pull requests,
  GitHub Actions logs, application logs, support messages, or screenshots.
- Secret generation, access, rotation, revocation, incident response, and
  ownership must be documented for the selected deployment platform.

### Production environment checklist

The production configuration review must cover these variables without placing
their values in this repository:

| Variable | Required production decision |
| --- | --- |
| `NEXORA_JWT_SECRET` | Required external JWT signing secret; no default or reuse across environments |
| `NEXORA_REFRESH_TOKEN_HASH_SECRET` | Required independent external HMAC secret; no default |
| `NEXORA_DB_URL` | Required persistent production database endpoint with reviewed TLS/network policy |
| `NEXORA_DB_USERNAME` | Required least-privilege database identity |
| `NEXORA_DB_PASSWORD` | Required externally managed database credential |
| `NEXORA_AUTH_TRUSTED_ORIGINS` | Exact deployed frontend origin or reviewed origins; no localhost or wildcard |
| `NEXORA_REFRESH_TOKEN_COOKIE_SECURE` | Must be `true` |
| `NEXORA_AUTH_CSRF_COOKIE_SECURE` | Must be `true` |
| `NEXORA_REFRESH_TOKEN_COOKIE_SAME_SITE` | Explicit value selected for the deployed site topology |
| `NEXORA_AUTH_CSRF_COOKIE_SAME_SITE` | Explicit value aligned with the deployed site topology |
| Provider, SMTP, or Gemini variables | Present only when the corresponding capability is deliberately enabled; external secrets only |

Other authentication settings—including access-token lifetime, refresh-token
maximum age, cookie names/paths, CSRF lifetime, and proxy handling—must also be
reviewed even when they are not secret values.

## 4. Production cookie policy

The final cookie settings depend on whether the frontend and API are same-site
or intentionally cross-site. That topology must be written down before values
are selected.

### Refresh-token cookie

- `HttpOnly=true` is mandatory so frontend JavaScript cannot read the raw
  refresh credential.
- `Secure=true` is mandatory, and the complete browser flow must use HTTPS.
- Keep `Path=/api/auth` unless a reviewed route topology requires a different,
  minimally scoped path.
- Use `SameSite=Lax` for a compatible same-site frontend/API topology. Use
  `SameSite=None` only for a documented cross-site requirement and only with
  `Secure=true`; reassess the increased CSRF and third-party-cookie risks.
- Do not set a broad `Domain`. Prefer a host-only cookie unless a documented
  multi-host requirement is reviewed.
- Review the current seven-day maximum age against account risk, expected user
  experience, inactivity policy, absolute session lifetime, and revocation
  capability.
- Consider cookie-name prefixes only after checking their required `Path`,
  `Domain`, and topology constraints; do not rename cookies casually during a
  compatibility rollout.

### CSRF cookie

- The CSRF cookie is intentionally not `HttpOnly` because the double-submit
  client must read the token and echo it in a custom header. It is not an
  authentication credential.
- `Secure=true` is mandatory in production.
- `SameSite` must align with the refresh cookie and deployed site topology.
- Keep `Path=/api/auth` unless the protected route set changes and the scope is
  explicitly reviewed.
- The token remains transient and is not stored in the database.
- Before production, review whether the current random double-submit design
  should become a signed, session-bound token to reduce cookie-injection risk.
  This document does not claim that enhancement is implemented.

Cookie deletion must emit the same name, path, domain policy, `Secure`,
`HttpOnly`, and `SameSite` attributes used for issuance, with an expired or
zero maximum age. Login, refresh, logout, and clear-cookie behavior must be
tested through the actual HTTPS endpoint and reverse proxy, including forwarded
scheme/host handling and browser inspection.

## 5. Production CORS, origin, and proxy policy

- Credentialed CORS must never use a wildcard origin. Configure exact HTTPS
  deployment origins and remove all localhost origins from production.
- Allow only methods used by deployed APIs. Review whether the current broad
  API method list can be narrowed per route or route group.
- Allow only required headers, currently content type, Bearer authorization,
  and the CSRF header. Do not reflect arbitrary requested headers.
- Preserve `Origin` validation and `Referer` fallback for cookie-sensitive auth
  POST routes. Compare normalized complete origins—scheme, host, and port—not
  suffixes or substring matches.
- Define the production no-origin policy. The preferred browser-facing policy
  is to reject state-changing auth requests that have neither a trustworthy
  `Origin` nor `Referer`. If a non-browser client must be supported, give it an
  explicit reviewed authentication/CSRF contract rather than silently retaining
  the local allowance.
- Document whether the frontend and API are same-origin, same-site on separate
  hosts, or cross-site. Test cookie and CORS behavior for that exact topology.
- TLS termination and reverse-proxy ownership must be explicit. Trust forwarded
  scheme, host, and client-address headers only from known proxies that replace
  untrusted incoming values. The application must reconstruct its external
  HTTPS origin consistently, and the proxy must not create a second conflicting
  CORS policy.
- Document load-balancer health checks and service-to-service requests so they
  do not require weakening browser auth-route protections.

## 6. Session lifecycle and revocation policy

- Reduce the production access-token lifetime from the local 60-minute default.
  A starting target of 5–15 minutes should be tested against usability, refresh
  load, clock skew, and incident-containment goals.
- Preserve single-use refresh rotation. Define token-family semantics,
  concurrency handling, and the response to reuse of a rotated or revoked
  token. The current foundation rejects the old token but does not implement a
  complete family-wide revocation or security-event response.
- Current-session logout and server-side refresh revocation are implemented.
  Logout-all, active-session/device listing, per-session revocation, and
  reauthentication for sensitive actions are future controls.
- Password change, password recovery, account disablement, suspected
  compromise, and material credential changes must revoke all relevant refresh
  sessions according to a documented rule. The remaining lifetime of already
  issued access tokens must be included in the risk decision.
- Define automated cleanup and retention for expired and revoked
  `auth_sessions` records, including operational ownership, failure alerting,
  transaction safety, privacy minimization, and evidence-retention needs.
- Define bounded active-session limits and multi-tab/concurrent-refresh
  behavior before adding device management.
- Generate security audit events for successful and failed login, registration
  outcomes where appropriate, refresh success/failure/reuse, logout, logout-all,
  session revocation, password change, recovery, verification, account
  disablement, and sensitive account/provider changes.
- Audit records must use safe identifiers and outcomes. Never log passwords,
  raw access or refresh tokens, CSRF tokens, reset/verification tokens, database
  credentials, SMTP credentials, or provider keys. Minimize and govern IP and
  user-agent data if those signals are collected.

## 7. Account-safety and operations gaps

The following capabilities are not implemented and remain production blockers
or explicit risk decisions:

- No email/account verification workflow.
- No password recovery workflow.
- No complete login/register abuse rate limiting, credential-stuffing defense,
  or production lockout policy.
- No logout-all or user-facing session/device management.
- No production security-event dashboard, centralized monitoring, alerting, or
  SIEM integration.
- No verified-recipient workflow for email notifications.
- No production incident-response, credential-compromise, or session-revocation
  runbook.
- No production privacy/retention policy for authentication security events.

## 8. Testing checklist before deployment

- [ ] Unit-test production configuration validation and fail-closed startup for
      absent, placeholder, coupled, or invalid secrets/settings.
- [ ] Unit-test refresh and CSRF cookie issuance and clearing attributes,
      including `Secure`, `HttpOnly`, `SameSite`, path, maximum age, and domain
      absence.
- [ ] API-test missing, malformed, mismatched, and expired CSRF tokens plus
      allowed, rejected, `null`, malformed, and absent origin/referrer cases.
- [ ] Browser-test registration, login, reload/session restoration, serialized
      refresh, expiry, logout, cookie clearing, multiple tabs, and error states.
- [ ] Test the real HTTPS and reverse-proxy path, forwarded headers, redirect
      behavior, external URL reconstruction, and accidental HTTP access.
- [ ] Test exact allowed origins and representative rejected origins, including
      hostile subdomains, scheme changes, port changes, and wildcard absence.
- [ ] Test malformed, expired, rotated, revoked, reused, and concurrently used
      refresh tokens, including the selected family/reuse response.
- [ ] Run PostgreSQL integration tests for Flyway V7, rotation transactions,
      revocation, cleanup, and persistent-store selection in the proposed
      production profile.
- [ ] Test account disablement and future password/recovery workflows against
      the approved session-revocation rules.
- [ ] Review application, proxy, database, CI, and security-event logs for raw
      token, credential, CSRF, personal-data, and provider-secret leakage.
- [ ] Confirm repository secret scanning/push protection where available,
      private vulnerability reporting, Dependabot/security alerts, CodeQL, and
      required branch checks in GitHub settings.
- [ ] Perform an independent threat-model and security review for the selected
      deployment topology and rollback design.

## 9. Production go/no-go checklist

Production is a **no-go** until every applicable item is evidenced and approved:

- [ ] A deployment owner and security reviewer approve this policy for the
      selected architecture.
- [ ] Strong, independent production JWT and refresh-token HMAC secrets are
      supplied by an approved external secret-management path.
- [ ] Persistent production database configuration is active; in-memory user
      and refresh-session stores cannot be selected.
- [ ] Database and optional SMTP/provider/Gemini credentials are external,
      least-privilege, scoped, and covered by rotation/revocation procedures.
- [ ] Refresh and CSRF cookies use `Secure=true`; refresh remains `HttpOnly`.
- [ ] Cookie topology, `SameSite`, path, domain, maximum age, and matching clear
      behavior are reviewed and browser-tested over HTTPS.
- [ ] `NEXORA_AUTH_TRUSTED_ORIGINS` contains only exact production URLs; no
      localhost, wildcard, placeholder, preview, or unowned origin remains.
- [ ] No local authentication secret, cookie, origin, database, or provider
      default can start in the production profile.
- [ ] CORS, origin/referrer, no-origin, proxy, and forwarded-header policies are
      implemented and tested for the deployed topology.
- [ ] Access-token lifetime and refresh rotation/reuse policy are approved.
- [ ] Current-session, account-disablement, password-change/recovery, and
      incident session-revocation policies are reviewed and tested.
- [ ] Expired/revoked session retention and cleanup ownership are defined.
- [ ] Authentication monitoring, alerting, audit events, log redaction,
      retention, and incident response are reviewed and operational.
- [ ] Account verification, recovery, and auth abuse-control gaps are either
      implemented or explicitly accepted by the accountable deployment owner.
- [ ] GitHub branch protection and available security alerts/settings are
      reviewed and required CI checks are passing.
- [ ] A tested rollback and secret/session revocation plan exists.
- [ ] Privacy and provider data handling are reviewed if Gemini, SMTP, or any
      external provider is enabled; Gemini remains backend-only.
- [ ] Final backend, frontend, PostgreSQL, browser, HTTPS/proxy, and security
      regression evidence is attached to the deployment decision.

## 10. References

This plan uses the following implementation guidance as review input; it does
not claim compliance merely by linking to it:

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [MDN secure cookie configuration](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies)
