# NEXORA security policy

## Project status

NEXORA is a local/development MVP. It is not documented or operated as a
production service, and the controls below are a development security
foundation rather than a production assurance claim.

## Supported branch

Security fixes and reports are reviewed against the `main` branch. Older
branches and retained prototypes may not receive security updates.

## Reporting a vulnerability

Do not open a public issue for a vulnerability that contains sensitive or
exploitable details.

If GitHub private vulnerability reporting is enabled for this repository, use
the repository's **Security** tab. Otherwise, contact the repository owner
through their GitHub profile to request a private reporting channel. Do not
include real secrets, credentials, access tokens, personal data, or working
exploit data in an initial public message.

Useful reports identify the affected component, reproducible conditions,
likely impact, and a minimal remediation suggestion. No response or resolution
time is guaranteed while the project remains a development MVP.

## Secrets and local configuration

- Never commit real JWT secrets, SMTP credentials, database credentials, API
  keys, access tokens, or personal data.
- Put developer-specific values in ignored `.env.local` files or shell
  environment variables.
- Example environment files contain safe local defaults only and must not be
  reused as production credentials.
- Revoke and rotate any credential immediately if it is accidentally exposed.

## Current controls

- BCrypt password hashing through Spring Security.
- JWT access-token authentication foundation with authenticated account lookup.
- Backend refresh-session foundation with HMAC-SHA256 token hashes, rotation,
  logout revocation, profile-based storage, and HttpOnly cookie issuance.
- Frontend refresh-session consumption with memory-first Bearer access tokens,
  serialized refresh, backend logout, and legacy `localStorage` token cleanup.
- Focused local-development CSRF/trusted-origin checks for register, login,
  refresh, and logout using a `SecureRandom` double-submit token, explicit
  origin allowlist, and restricted credentialed CORS headers.
- Production-profile startup safety guard for `prod` and `production`. It fails
  closed when core auth secrets remain missing, short, coupled, local,
  test-like, or placeholder values; secure refresh/CSRF cookie settings are
  disabled; the refresh cookie is overly broad; or trusted origins are missing,
  wildcard, local/development, or non-HTTPS. Exceptions name properties without
  exposing configured secret values.
- Public runtime health and startup summaries use sanitized profile labels and
  allowlisted provider names. They do not return or log raw configuration,
  secrets, credentials, datasource URLs, database identities, cookies, tokens,
  API keys, trusted origins, or the full process environment.
- Best-effort auth security-event recording for register, login, refresh,
  logout, and auth-route rejection outcomes. It stores only typed safe metadata,
  uses bounded in-memory retention by default, and persists through Flyway V10
  in `dev`.
- Disabled-by-default auth security-event retention cleanup with a 30-day local
  default. When enabled, a daily UTC task removes old safe metadata from the
  bounded in-memory store or the existing V10 PostgreSQL table; cleanup failure
  remains isolated from authentication behavior.
- Process-local fixed-window abuse controls for register, login, refresh,
  logout, and repeated CSRF/origin rejections. Limited requests receive a safe
  `429`/`Retry-After` response, and only typed rate-limit reason codes with null
  user IDs are sent to the best-effort auth event recorder.
- Backend request validation and ownership checks for personal Wishlist APIs,
  including price history and alert history.
- Owner-scoped notification preferences with in-memory and PostgreSQL-backed
  development implementations.
- Sentinel backend-only local/Gemini gateway with bounded backend-generated
  context summaries, no conversation persistence, deterministic local fallback,
  safe fallback classification, and process-local per-user rate limiting.
- Backend tests, frontend lint/build validation, and PostgreSQL `dev`-profile
  integration validation in CI.
- Weekly Dependabot checks for GitHub Actions, backend Maven, and the primary
  Next.js npm dependencies, with grouped minor/patch updates.
- Security CI with a high-severity production npm audit, retained audit report,
  and Maven dependency-tree visibility.
- Repository-defined manual CodeQL-ready workflow for Java and JavaScript/TypeScript.
  Automatic CodeQL upload is disabled while private-repository code scanning is unavailable.
- Pull-request dependency review configured to reject newly introduced high or
  critical known vulnerabilities.

The CodeQL-ready and dependency-review workflows define repository automation;
CodeQL alert upload still depends on code scanning being enabled/available for the repository,
and merge enforcement depends on successful GitHub Actions runs and repository security/branch-protection settings. The workflows do not themselves
prove that every GitHub security setting is enabled.

## Known limitations

The historical migration roadmap is documented in
[`docs/security/auth-session-hardening-plan.md`](docs/security/auth-session-hardening-plan.md).
The current production decisions and go/no-go requirements are defined in the
[`auth production-policy plan`](docs/security/auth-production-policy-plan.md).
The backend and frontend refresh-session foundations are implemented for local
development. v0.32 implements only an initial production-profile startup gate;
the broader production policy and operations remain unimplemented.

- Active access tokens are held in frontend memory and legacy `localStorage`
  tokens are removed. Protected APIs still use Bearer access tokens.
- Local CSRF cookie/header and trusted `Origin`/`Referer` validation now protects
  cookie-sensitive auth routes. Localhost trusted origins and the current
  `Secure=false` refresh/CSRF cookie defaults support local HTTP only; they are
  not production settings and are rejected if `prod` or `production` is active.
  The no-origin curl/test allowance, reverse-proxy assumptions, and complete
  production CORS/cookie policy remain unimplemented.
- Account verification, password recovery, a complete session-wide revocation
  policy, and comprehensive security monitoring are not implemented.
- Auth security events intentionally exclude passwords, submitted login
  identifiers, tokens, cookies, token hashes, raw origins, IP addresses, user
  agents, and secrets. Local cleanup deletes only this safe metadata. Its
  disabled-by-default 30-day configuration is not an approved production
  retention/privacy/compliance policy, and there is no production access or
  integrity policy, dashboard, monitoring, SIEM integration, alerting, or
  incident-response process.
- Auth abuse counters use only five route/purpose enum keys and store no raw
  passwords, submitted identifiers, JWTs, refresh tokens or hashes, CSRF
  tokens, cookies, origins/referrers, IP addresses, user agents, API/provider
  keys, SMTP credentials, or database credentials. They are global only within
  one process, reset on restart, and are not distributed or production-grade.
  Production still requires bot and credential-stuffing defenses, distributed
  limiting, monitoring, alerting, privacy/retention policy, and an
  incident-response workflow.
- The startup gate does not provide a deployed production environment,
  persistent production session store, managed-secret integration, HTTPS/proxy
  configuration, production monitoring/SIEM integration, incident response, or
  a production operations guide.
- Runtime health fields describe configuration mode and process uptime only.
  They are not external dependency health probes, production metrics, tracing,
  centralized logging, alerting, SIEM integration, or availability evidence.
- Repository secret scanning, push protection, private vulnerability reporting,
  code-scanning alert policy, and required checks must be enabled and reviewed
  through GitHub repository settings where available.
- Sentinel rate limiting and provider-health tracking are process-local, not
  distributed controls. There is no production AI observability or moderation
  pipeline.
- Maven dependency-tree output is visibility only. A full Maven vulnerability
  scanner is not a mandatory CI gate because no-key vulnerability-feed updates
  can be slow or unreliable for this public development repository.
- Notification delivery has no durable status, retry/outbox, verified-recipient
  workflow, or asynchronous after-commit processing.
