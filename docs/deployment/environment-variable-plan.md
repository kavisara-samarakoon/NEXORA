# NEXORA hosted-demo environment variable plan

## Status and rules

This is a variable-category and ownership plan, not an environment file or
deployable provider configuration. The completed and tagged
`v0.76.0-backend-hosted-environment-configuration-foundation` added the
backend-only `hosted-demo` Spring profile described below. The completed and
tagged `v0.77.0-hosted-postgresql-persistence-validation-foundation` is the
latest stable development milestone. All displayed secret values remain
non-secret placeholders; no hosted environment or live deployment exists yet.

Placeholder vocabulary:

- `<set-in-hosting-provider>` — inject through the selected host's secret store.
- `<frontend-origin>` — exact canonical HTTPS frontend origin.
- `<backend-api-url>` — exact public HTTPS backend base URL.
- `<database-url>` — reviewed PostgreSQL JDBC connection URL.
- `<database-username>` — least-privilege application identity.
- `<reviewed-setting>` — an explicit non-secret decision, not a default guess.

Never substitute a realistic-looking credential into documentation, commits,
pull requests, screenshots, shell history, or logs.

## Backend runtime and profile category

| Existing setting | Hosted-demo plan | Sensitivity |
| --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | Set to `hosted-demo`; the profile group activates the existing `dev` persistence path and `production` safety checks. | Public-safe configuration |
| `PORT` | `<set-in-hosting-provider>`; required and bound to `server.port` with no hosted fallback. | Public-safe provider setting |
| Java runtime | Select a supported Java 17-or-newer runtime and pin it through future deployment configuration. | Public-safe configuration |

The selected host must distinguish build-time settings from runtime settings,
support graceful restart, and expose the backend only through HTTPS. v0.76 does
not choose a provider/start command or create a hosting manifest.

## Database connection category

| Existing variable | Planned placeholder | Purpose |
| --- | --- | --- |
| `NEXORA_DB_URL` | `<database-url>` | PostgreSQL JDBC endpoint with reviewed TLS/network policy |
| `NEXORA_DB_USERNAME` | `<database-username>` | Least-privilege application database identity |
| `NEXORA_DB_PASSWORD` | `<set-in-hosting-provider>` | Database credential stored only in the backend secret scope |

The `hosted-demo` profile has no fallback for these three variables.
Production-like validation rejects blank settings, the local JDBC default,
local database addresses, credentials embedded in the JDBC URL, the local or
PostgreSQL default username, and local, short, or obvious placeholder passwords.

Confirm connection limits, timeout behavior, encrypted transport, migration
ownership, backup/restore ownership, database name, and region/network placement
with the chosen service. Do not copy a provider dashboard URL containing
credentials into repository documentation.

## Authentication, session, and JWT category

| Existing variable | Planned placeholder or decision | Purpose |
| --- | --- | --- |
| `NEXORA_JWT_SECRET` | `<set-in-hosting-provider>` | External JWT signing secret meeting the current startup guard |
| `NEXORA_REFRESH_TOKEN_HASH_SECRET` | `<set-in-hosting-provider>` | Separate external HMAC secret for refresh-session hashes |
| `NEXORA_JWT_EXPIRATION_MINUTES` | `<reviewed-setting>` | Access-token lifetime |
| `NEXORA_REFRESH_TOKEN_EXPIRATION_DAYS` | `<reviewed-setting>` | Refresh-session and cookie lifetime |
| `NEXORA_REFRESH_TOKEN_COOKIE_NAME` | `<reviewed-setting>` | Cookie name; preserve the current name unless migration is planned |
| `NEXORA_REFRESH_TOKEN_COOKIE_PATH` | `/api/auth` | Current narrow path required by the production safety guard |
| `NEXORA_REFRESH_TOKEN_COOKIE_SECURE` | `true` | HTTPS-only refresh cookie requirement |
| `NEXORA_REFRESH_TOKEN_COOKIE_SAME_SITE` | `<reviewed-setting>` | Select after same-site/cross-site topology review |

The two secret values must be independently generated and managed. They must
not reuse database, provider, SMTP, or other environment credentials. The
`hosted-demo` profile has no fallback for either secret, and the existing
production safety guard continues to require at least 48 bytes and reject local,
placeholder, equal, or missing values.

## CSRF and frontend-origin category

| Existing variable | Planned placeholder or decision | Purpose |
| --- | --- | --- |
| `NEXORA_AUTH_CSRF_ENABLED` | `true` | Keep the cookie-sensitive auth guard enabled |
| `NEXORA_AUTH_CSRF_COOKIE_NAME` | `<reviewed-setting>` | Preserve the current public cookie name unless migration is planned |
| `NEXORA_AUTH_CSRF_HEADER_NAME` | `X-NEXORA-CSRF` | Preserve the current frontend/backend header contract |
| `NEXORA_AUTH_CSRF_COOKIE_PATH` | `/api/auth` | Keep the CSRF cookie narrowly scoped |
| `NEXORA_AUTH_CSRF_COOKIE_SECURE` | `true` | HTTPS-only CSRF cookie requirement |
| `NEXORA_AUTH_CSRF_COOKIE_SAME_SITE` | `<reviewed-setting>` | Align with the selected browser topology |
| `NEXORA_AUTH_CSRF_EXPIRATION_MINUTES` | `<reviewed-setting>` | CSRF token/cookie lifetime |
| `NEXORA_AUTH_TRUSTED_ORIGINS` | `<frontend-origin>` | Exact HTTPS origin allowlist; never wildcard or localhost |

Preview deployments must not be added as a broad wildcard. Each additional
origin requires an explicit need, lifecycle owner, and removal plan. The
`hosted-demo` profile has no trusted-origin fallback and forces CSRF plus both
cookie Secure flags. It defaults both SameSite settings to `Lax`; use `None`
only for an intentional cross-site topology while retaining Secure cookies and
exact HTTPS origins.

## Frontend routing and public configuration

| Existing variable | Planned placeholder | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `/` | Same-origin browser `/api/...` requests through the Next.js rewrite |
| `NEXORA_API_BASE_URL` | `<backend-api-url>` | Server-side HTTPS Render origin, without `/api`; rewrite target and server-rendered API base |
| `NEXT_PUBLIC_SITE_URL` | `<frontend-origin>` | Browser-visible canonical site/metadata origin |

Set these on Vercel before building, and rebuild/redeploy after changes. Keep
`NEXORA_API_BASE_URL` available at runtime too. It must target Render, never the
frontend or an alias that routes back to it. See the
[frontend routing guide](../../frontend/nexora-web-next/README.md#vercel-to-render-api-routing)
for local proxy validation and configuration checks.

Every `NEXT_PUBLIC_*` value is visible in the built client. Only the `/` routing
selector and public origins belong in this category; secrets, private database addresses, internal service
names, provider credentials, and administrative URLs do not.

The server-side rewrite target must also contain no credentials or secrets.

## Local safety-control category

The existing process-local auth abuse, auth-event cleanup, Sentinel rate-limit,
prompt, and answer settings require an explicit hosted-demo review. Relevant
existing variables include:

- `NEXORA_AUTH_ABUSE_CONTROLS_ENABLED` and the corresponding window and
  per-operation maximum variables.
- `NEXORA_AUTH_SECURITY_EVENTS_CLEANUP_ENABLED` and
  `NEXORA_AUTH_SECURITY_EVENTS_RETENTION_DAYS`.
- `NEXORA_SENTINEL_RATE_LIMIT_ENABLED`, its window/maximum variables, and the
  prompt/answer character limits.

Use `<reviewed-setting>` for approved non-secret values. These controls remain
process-local and are not DDoS protection, a distributed limiter, or a formal
retention policy.

## External provider and API category

The public external-deals integration currently uses CheapShark without a
credential and retains bounded cache, request-budget, stale-data, and local
fallback behavior. Do not invent a CheapShark API-key variable.

Sentinel may remain on the deterministic local provider. If Gemini is
separately approved, review these existing variables:

| Existing variable | Planned placeholder or decision | Purpose |
| --- | --- | --- |
| `NEXORA_SENTINEL_AI_PROVIDER` | `local` or an explicitly approved provider | Provider selection; local is sufficient for the hosted demo |
| `GOOGLE_API_KEY` or `GEMINI_API_KEY` | `<set-in-hosting-provider>` | Backend-only credential; configure only for approved Gemini use |
| `NEXORA_GEMINI_MODEL` | `<reviewed-setting>` | Reviewed model identifier |
| `NEXORA_GEMINI_BASE_URL` | `<reviewed-setting>` | Existing provider endpoint setting; do not change casually |
| `NEXORA_GEMINI_TIMEOUT_MS` | `<reviewed-setting>` | Bounded provider timeout |
| `NEXORA_GEMINI_MAX_OUTPUT_TOKENS` | `<reviewed-setting>` | Bounded output request |
| `NEXORA_GEMINI_TEMPERATURE` | `<reviewed-setting>` | Bounded generation setting |

Record provider ownership, budget/cost controls, privacy terms, logging
boundaries, disable procedure, and fallback test before enabling a credentialed
provider. No provider key is required while local mode is selected.

## Optional email/SMTP category

Email is not required for a fully functional hosted demo unless explicitly
included in a later scope. Keep the log/no-delivery behavior unless delivery,
verified recipients, privacy, abuse prevention, cost, and support ownership are
approved.

Existing Spring Mail categories include `SPRING_MAIL_HOST`,
`SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, and `SPRING_MAIL_PASSWORD`. Any
credential uses `<set-in-hosting-provider>` and remains backend-only. Provider
selection and sender identity must be reviewed through existing application
configuration without adding undocumented environment names.

## Local versus hosted-demo differences

| Area | Local development | Hosted demo target |
| --- | --- | --- |
| Origins | Localhost frontend/API | Exact HTTPS frontend and API origins |
| Persistence | Database-free default or optional local PostgreSQL | Persistent hosted PostgreSQL with controlled migrations |
| Secrets | Developer-generated local values | Hosting-provider secret store, independent per environment |
| Cookies | Local HTTP permits `Secure=false` | HTTPS with both secure-cookie flags enabled |
| CORS/CSRF | Local trusted origins | Exact deployed frontend origin and verified credentialed flow |
| Providers | Safe local/log defaults | Keep defaults or enable only separately approved providers |
| Operations | Developer terminal | Named deployment, database, secret, rollback, and takedown owners |

## Secret handling rules

- Store secrets only in the selected platform's secret facility; never in a
  repository file, frontend variable, build artifact, image, URL, or docs.
- Give each environment separate values and least-privilege access. Do not share
  secrets between preview, demo, and local environments.
- Prevent values from appearing in command output, application logs, build logs,
  screenshots, support text, analytics, or error responses.
- Define generation, access approval, rotation, revocation, expiry, incident
  response, and owner before launch.
- Treat a copied or accidentally displayed value as exposed: revoke/rotate it
  and record only a redacted incident reference.
- Use placeholders such as `<set-in-hosting-provider>` in all review artifacts.

## Manual hosted PostgreSQL validation

Run `scripts/deployment/validate-hosted-postgres.sh` only against a disposable
hosted-demo database. The wrapper requires
`NEXORA_RUN_HOSTED_POSTGRES_VALIDATION=true`,
`SPRING_PROFILES_ACTIVE=hosted-demo`, `PORT`, `NEXORA_DB_URL`,
`NEXORA_DB_USERNAME`, `NEXORA_DB_PASSWORD`, `NEXORA_JWT_SECRET`,
`NEXORA_REFRESH_TOKEN_HASH_SECRET`, and `NEXORA_AUTH_TRUSTED_ORIGINS` from the
operator environment. It does not source or create an `.env` file.

The wrapper prints only each variable name and a redacted set status, then runs
the environment-gated integration test. The test verifies the composed hosted
profiles, an external PostgreSQL connection, Flyway history, and a read-only
SQL query after startup. The test itself adds no application records, but
existing Flyway migrations may initialize schema and seed data; therefore the
database must be disposable. The test is skipped during ordinary backend tests
unless the opt-in flag is true.

## v0.76 implementation state

The completed and tagged
`v0.76.0-backend-hosted-environment-configuration-foundation` resolved the
backend profile, provider port binding, external database/auth/origin binding,
secure-cookie baseline, and fail-closed validation gaps identified by v0.75.
It does not provide frontend/provider/cloud configuration, verify a live
PostgreSQL service, or deploy NEXORA.

The completed and tagged v0.77 milestone added the provider-neutral manual
validation path. Neon is the planned hosted-demo PostgreSQL provider, but
running the validation against a disposable Neon database and performing a live
deployment remain separate future readiness steps. NEXORA remains a hosted
portfolio/demo target, not a production SaaS service, and remains not
production-ready.
