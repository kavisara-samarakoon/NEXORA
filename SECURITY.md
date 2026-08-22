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
- JWT access-token authentication foundation.
- Backend refresh-session foundation with HMAC-SHA256 token hashes, rotation,
  logout revocation, profile-based storage, and HttpOnly cookie issuance.
- Frontend refresh-session consumption with memory-first Bearer access tokens,
  serialized refresh, backend logout, and legacy `localStorage` token cleanup.
- Focused local-development CSRF/trusted-origin checks for register, login,
  refresh, and logout using a `SecureRandom` double-submit token, explicit
  origin allowlist, and restricted credentialed CORS headers.
- Backend request validation and ownership checks for personal wishlist data.
- Backend tests, frontend lint/build validation, and PostgreSQL `dev`-profile
  integration validation in CI.
- Weekly Dependabot checks for GitHub Actions, backend Maven, and the primary
  Next.js npm dependencies.
- Security CI with a high-severity production npm audit and Maven dependency
  resolution visibility.

## Known limitations

The proposed implementation roadmap is documented in
[`docs/security/auth-session-hardening-plan.md`](docs/security/auth-session-hardening-plan.md).
The backend foundation and initial frontend migration are implemented; later
production-hardening phases remain incomplete.

- Active access tokens are held in frontend memory and legacy `localStorage`
  tokens are removed. Protected APIs still use Bearer access tokens.
- Local CSRF cookie/header and trusted `Origin`/`Referer` validation now protects
  cookie-sensitive auth routes. The no-origin curl/test allowance, explicit
  localhost CORS support, local cookie defaults, reverse-proxy assumptions, and
  overall production policy are not production-ready.
- Rate limiting, account verification, password recovery, session-wide
  revocation policy, and comprehensive security monitoring are not implemented.
- There is no CodeQL/full code-scanning workflow, dedicated secret-scanning
  workflow, or full Maven vulnerability scanner in this foundation.
- There is no production deployment or operations security guide.
- Notification delivery has no durable status, retry/outbox, verified-recipient
  preference, or asynchronous after-commit security workflow.
- Sentinel is a demo/status experience and has no real AI or Gemini integration.
