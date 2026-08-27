# NEXORA authentication production-policy plan

## 1. Purpose and status

This document defines the authentication, session, CSRF, CORS, cookie, secret,
and operational decisions NEXORA must review before any real deployment. It
originated as a production-policy planning artifact. v0.32 implements only the
bounded startup checks identified below; the rest remains planning. The
milestone changes no API contract, database schema, dependency, or deployment
workflow.

NEXORA remains a local/development MVP and is not production-ready. The startup
guard is not equivalent to implementing or validating this complete policy. A
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
- Refresh and CSRF cookie configuration rejects `SameSite=None` unless the
  corresponding cookie also enables `Secure`.
- A request with neither `Origin` nor `Referer` is currently allowed to proceed
  when its CSRF cookie/header pair is valid. This supports local curl and test
  clients; it is not an approved production no-origin policy.
- A backend auth security-event foundation records typed register, login,
  refresh, logout, and auth-route rejection metadata. The default profile keeps
  at most 500 events in memory and resets them on restart; the `dev` profile
  persists them through Flyway V10 `auth_security_events`.
- Auth security events contain only event type, outcome, nullable internal user
  ID, safe reason code, source, and UTC timestamps. They contain no password,
  submitted login identifier, access/refresh/CSRF token, cookie, token hash,
  request origin, IP address, user agent, or application/provider secret.
- Auth security-event cleanup is configurable for local development, disabled
  by default, and uses a 30-day default retention age. When enabled, a daily UTC
  task removes only old safe metadata from the bounded in-memory store or the
  existing Flyway V10 PostgreSQL table. The in-memory store still resets on
  restart, and cleanup-store failures do not escape into authentication flows.
- Register, login, refresh, logout, and repeated CSRF/origin rejection attempts
  have process-local fixed-window controls. Counters use only typed purpose keys,
  expire in memory, and return a safe `429` with retry timing after the local
  limit. `AUTH_RATE_LIMITED` events use a typed reason code and null user ID.
- The counters store no raw password, submitted identifier, JWT, refresh token
  or hash, CSRF token, cookie, `Origin`/`Referer`, IP address, user agent, API or
  provider key, SMTP credential, or database credential. They reset on restart
  and do not coordinate across processes.
- When `prod` or `production` is active, an early startup guard rejects local,
  short, missing, or obvious placeholder auth secrets; insecure refresh/CSRF
  cookie settings; an unsafe refresh-cookie path; disabled CSRF protection; and
  missing, wildcard, local/development, or non-HTTPS trusted origins. Failures
  name configuration properties without including secret values. Default and
  `dev` profiles do not enforce this production-only policy.

These are local-development foundations plus one production-profile startup
gate, not assurance that the application is safe for Internet exposure. There
is no complete production configuration, deployed topology, persistent
production store selection, secret manager, reverse-proxy policy, operations
guide, or security monitoring integration.

Repository CodeQL remains manual-only until code scanning is enabled/available;
these local authentication foundations do not change that workflow policy.

## 3. Required production environment and secret policy

Before deployment, NEXORA must have a dedicated production configuration that
fails closed instead of inheriting local defaults. v0.32 begins this work by
validating core auth settings whenever `prod` or `production` is active. It
does not create a production properties file or resolve the remaining database,
topology, proxy, and operations requirements.

Required policy:

- A production profile must use persistent PostgreSQL user and refresh-session
  stores. It must never select the default in-memory stores.
- Production startup now fails when the JWT/refresh hash secret,
  trusted-origin allowlist, refresh-cookie scope/Secure setting, or CSRF
  enabled/Secure setting is absent, invalid, or still local/placeholder. A
  future production configuration must extend fail-closed validation to the
  required persistent database and other selected deployment settings.
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

The current startup guard enforces both auth secrets at a minimum of 48 bytes,
the two Secure flags, CSRF enablement, the existing `/api/auth` refresh-cookie
path, and exact HTTPS non-local trusted origins. The values above remain an
environment review checklist, not a claim that the rest of production
configuration or operations exists.

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
- Preserve the current safe register/login/refresh/logout/rejection event
  foundation. Future work must define events for family-wide refresh reuse,
  logout-all, session revocation, password change, recovery, verification,
  account disablement, and sensitive account/provider changes.
- Audit records must use safe identifiers and outcomes. Never log passwords,
  raw access or refresh tokens, CSRF tokens, reset/verification tokens, database
  credentials, SMTP credentials, or provider keys. Minimize and govern IP and
  user-agent data if those signals are collected.

## 7. Account-safety and operations gaps

The following capabilities are not implemented and remain production blockers
or explicit risk decisions:

- No email/account verification workflow.
- No password recovery workflow.
- No production distributed auth rate limiting, credential-stuffing/bot
  defense, or production lockout policy. The implemented route-purpose counters
  are a local-development safeguard only and reset on restart.
- No logout-all or user-facing session/device management.
- No production security-event dashboard, centralized monitoring, alerting, or
  SIEM integration.
- No approved production auth-event retention, privacy, access-control,
  integrity, aggregation, or alert-threshold policy. The configurable local
  cleanup foundation is a deletion mechanism, not a production policy or
  compliance control.
- No verified-recipient workflow for email notifications.
- No production incident-response, credential-compromise, or session-revocation
  runbook.
- No request-context enrichment policy; raw origin, IP address, and user-agent
  data are deliberately excluded from the current foundation.

## 8. Testing checklist before deployment

The v0.41 foundation adds focused local-default tests for CSRF issuance,
refresh-cookie issuance/rotation/clearing, raw-token non-disclosure, and the
`SameSite=None`/`Secure` property guard. The broader deployment checklist below
remains open because HTTPS, proxy, production-like cookie issuance, domain
behavior, and real-browser verification still require deployed evidence.

- [x] Unit-test the v0.32 fail-closed guard for inactive profiles, absent/local/
      placeholder/short/coupled auth secrets, secure-cookie and CSRF settings,
      trusted origins, aggregated messages, and secret-value non-disclosure.
- [ ] Extend production configuration validation to persistent-store selection,
      database requirements, and remaining deployment settings once the
      topology and operations design is approved.
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
- [ ] Run PostgreSQL integration tests for Flyway V7 session storage, Flyway
      V10 security-event storage, rotation transactions, revocation, cleanup,
      and persistent-store selection in the proposed production profile.
- [ ] Test account disablement and future password/recovery workflows against
      the approved session-revocation rules.
- [ ] Review application, proxy, database, CI, and security-event logs for raw
      token, credential, CSRF, personal-data, and provider-secret leakage.
- [ ] Confirm repository secret scanning/push protection where available,
      private vulnerability reporting, Dependabot/security alerts, CodeQL/code scanning if available,
      and required branch checks in GitHub settings.
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
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [MDN secure cookie configuration](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies)
