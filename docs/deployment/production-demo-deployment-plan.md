# NEXORA hosted demo: Vercel / Render / Neon

This is the existing setup path for a controlled portfolio demo. The latest
released milestone is `v0.91.0-hosted-demo-readiness-foundation`. The active
milestone is v0.92 — Real Hosted Deployment Execution on
`feature/real-hosted-deployment-execution`: private synthetic hosted deployment
and evidence capture across Vercel, Render, and disposable Neon PostgreSQL.
No real hosted evidence exists yet, and NEXORA is not production-ready.
Select the same reviewed candidate for both services.
[Hosted evidence is pending](../qa/BROWSER_QA_V0_92.md) until real frontend,
backend, and database checks are completed.

## 1. Reserve the frontend origin; create a disposable Neon database

Create the Vercel project first so its stable HTTPS frontend origin is known.
Use that origin in Render's trusted-origin setting below. If it later changes,
update Render's allowlist and Vercel's site URL, then redeploy and repeat auth QA.

Create a dedicated **disposable demo** Neon branch/database and a non-default
database role. It must own or have the schema privileges needed by Flyway.
Keep it separate from real user data. Select the **direct** connection hostname,
without `-pooler`: Flyway and the application share this datasource, and Neon
recommends direct connections for migrations. [Neon pooling guidance](https://neon.com/docs/connect/connection-pooling)

Convert the connection details to JDBC, keeping credentials separate:

```text
NEXORA_DB_URL=jdbc:postgresql://<neon-direct-host>:5432/<database>?sslmode=require&channelBinding=require
NEXORA_DB_USERNAME=<database-role>
NEXORA_DB_PASSWORD=<database-password>
```

These are placeholders, not runnable values. Do not paste a `postgres://` URL
or a JDBC URL containing `user`/`password` into `NEXORA_DB_URL`. The Java driver
uses `channelBinding` (camel case). `sslmode=require` enables TLS; certificate
verification modes need matching trust configuration. [Neon Java settings](https://neon.com/docs/guides/java)

On startup, existing Flyway V1–V12 migrations initialize the schema and existing
seed data; Hibernate only validates it. Do not run `clean`, reset migration
history, or edit migrations to bypass a failure. The hosted validation test
also starts Flyway, so run it only against this disposable database.

## 2. Deploy the backend on Render

Create a **Web Service** connected to the reviewed repository candidate:

| Render setting | Value |
| --- | --- |
| Language/runtime | Docker (Render has no native Java runtime) |
| Root directory | `backend/nexora-api` |
| Dockerfile path | `./Dockerfile` |
| Docker build context | `.` |
| Docker Command | Leave unset; use the image's `CMD` |
| Health check path | `/api/health` |

Paths are relative to the selected root. Render builds the Dockerfile; there
are no separate native build/start commands to enter. The image runs Maven
`mvn --batch-mode --no-transfer-progress -DskipTests package`, then starts
`java -XX:MaxRAMPercentage=60.0 -jar /app/nexora-api.jar` as a non-root user on
Java 17. Tests remain a prerequisite in CI/local validation.
[Render Docker](https://render.com/docs/docker), [root-directory settings](https://render.com/docs/monorepo-support)

Enter these **runtime** variables in Render, using the
[backend env example](../../backend/nexora-api/.env.hosted-demo.example) as a checklist:

| Variable | Required value |
| --- | --- |
| `SPRING_PROFILES_ACTIVE` | `hosted-demo` (also the image default) |
| `PORT` | Render-supplied port, normally `10000`; keep the service and app aligned |
| `NEXORA_DB_URL` | Direct Neon JDBC URL from step 1 |
| `NEXORA_DB_USERNAME` | Dedicated role; neither `postgres` nor `nexora_user` |
| `NEXORA_DB_PASSWORD` | Real database password, at least 16 bytes |
| `NEXORA_JWT_SECRET` | Independently generated random secret, at least 48 bytes |
| `NEXORA_REFRESH_TOKEN_HASH_SECRET` | A different random secret, at least 48 bytes |
| `NEXORA_AUTH_TRUSTED_ORIGINS` | Exact Vercel HTTPS origin; no path or wildcard |

Generate the two auth secrets separately using a password manager or secret
generator; keep values in provider secret settings. Do not use examples/local
credentials. No paid provider/API keys are required for the existing default
demo modes. Do not enable optional integrations just to pass deployment checks.

`hosted-demo` composes `dev` persistence and `production` safety guards. It
enforces Secure refresh/CSRF cookies and CSRF protection; retain `SameSite=Lax`
and `/api/auth` cookie paths. Both cookies are host-only (no Domain attribute);
the refresh cookie is HttpOnly and the CSRF cookie is readable. Actual forwarding
and session restoration through the hosted proxy remain pending checks.
Spring Boot does **not** automatically load the
example env file. Missing/unsafe hosted settings should fail startup.

Render can use `/api/health` as its HTTP health check. This sanitized runtime/
configuration summary does **not** prove PostgreSQL liveness, provider liveness,
mail delivery, Gemini availability, or frontend proxy correctness by itself.
Verify dependencies and both request paths separately below.
[Render health checks](https://render.com/docs/health-checks)

## 3. Deploy the frontend on Vercel

Use framework **Next.js**, root `frontend/nexora-web-next`, Node.js **24.x**,
install command `npm ci`, build command `npm run build`, and the framework's
default output setting. [Vercel roots](https://vercel.com/docs/monorepos),
[Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)

Set all three variables in the deployment's environment scope before building:

```text
NEXT_PUBLIC_API_BASE_URL=/
NEXORA_API_BASE_URL=https://<render-backend-host>
NEXT_PUBLIC_SITE_URL=https://<vercel-frontend-host>
```

The browser calls Vercel `/api/...`; the Next.js server rewrites `/api/**` to
the Render HTTPS origin from server-side `NEXORA_API_BASE_URL`. Server-rendered
requests use that origin directly. Use an origin only, without `/api`, other
paths, credentials, query, or fragment; never point it at the frontend. Keep the
server variable available at runtime and rebuild/redeploy after routing changes.
Every `NEXT_PUBLIC_*` value is browser-visible. Do not place secrets in frontend
environment examples or public variables.
[Vercel external rewrites](https://vercel.com/docs/routing/rewrites)

Same-origin browser calls avoid reliance on third-party refresh cookies. Retain
the backend cookie/CSRF policy and verify the actual hosted behavior; do not
relax security to fix an origin mismatch. Preview deployments need their own
exact trusted origins, or use only the stable demo deployment for signed-in QA.

## Verify before sharing

Run commands **from the repository root**. The env checker reads exported
variables, never `.env` files, and prints no values. Use separate terminal
environments for the intended Vercel and Render settings:

```bash
python3 scripts/deployment/check-hosted-demo.py env frontend
python3 scripts/deployment/check-hosted-demo.py env backend
```

With Render's intended backend variables exported locally (Java 17+, Maven
3.9+), explicitly validate the disposable Neon database:

```bash
NEXORA_RUN_HOSTED_POSTGRES_VALIDATION=true bash scripts/deployment/validate-hosted-postgres.sh
```

This checks hosted profile initialization, a live SQL connection/query, Flyway
history, and JPA schema validation; it does not start the HTTP server or test
restart persistence. The current opt-in test requires exactly 12 successful
versioned migrations (V1–V12), latest successful migration version `12`, and
zero failed migrations. Keep only redacted results. Do not share raw
provider errors, database URLs, cookies, or credentials in screenshots/logs.

Set `NEXORA_DEMO_FRONTEND_URL` and `NEXORA_DEMO_BACKEND_URL` to your two real
HTTPS origins. Check Render and the Vercel proxy without creating accounts:

```bash
python3 scripts/deployment/check-hosted-demo.py public \
  --frontend-url "$NEXORA_DEMO_FRONTEND_URL" \
  --backend-url "$NEXORA_DEMO_BACKEND_URL"
```

This requires production runtime, PostgreSQL data mode and an active auth guard,
checks deals/giveaways (empty arrays are valid), and expects signed-out wishlist
denial. It refuses redirects/hosting login pages. `UP` alone is insufficient;
public health sanitizes `hosted-demo` to `custom`. The default request timeout is
60 seconds; a cold backend may need to finish starting before rerunning.

For the owned disposable demo only, exercise auth **through Vercel**:

```bash
NEXORA_ALLOW_NON_LOCAL_SMOKE_TEST=true \
NEXORA_API_BASE_URL="$NEXORA_DEMO_FRONTEND_URL" \
NEXORA_SMOKE_ORIGIN="$NEXORA_DEMO_FRONTEND_URL" \
bash scripts/api-smoke-test.sh
```

That `NEXORA_API_BASE_URL` override is for this script process only. **Vercel's
project variable must stay pointed at Render.** The script creates a generated
reviewer account with a random password, checks signed-in wishlist reads,
refresh, logout, and refresh denial. It does not delete its retained account.

Finally, in a fresh browser on the stable Vercel origin:

- Register/login; confirm auth requests use frontend `/api/auth/...`, with no
  cookie rejection, CORS error, mixed content, or hosting protection redirect.
- Verify both cookies are Secure, host-only, `SameSite=Lax`, path `/api/auth`;
  the refresh cookie is HttpOnly and the CSRF cookie is readable. Reload a
  signed-in route to exercise refresh, then log out and reload again.
- Save an existing deal to Wishlist and change a notification preference from
  Wishlist. Reload, restart the backend against the same database, and verify
  both persist. Then remove the test item and restore the original preference.
  Preference persistence does not demonstrate notification delivery.
- Follow the live checklist for CSRF rejection, trusted/rejected origins,
  external deals success/cache/fallback, log privacy, and cleanup/rollback.
- Visit deals/giveaways, Wishlist, Sentinel, security, settings, login/register,
  and the landed homepage at desktop/mobile widths. Check empty/unavailable
  states and keyboard navigation without inventing provider data.

Use the [live checklist](live-smoke-test-plan.md) for final evidence. Warm the
service and rerun public checks shortly before the demo; a successful frontend
build can coexist with an unavailable API. Hosting capacity/cold starts, live
database validation, proxy cookies, and persistence remain deployment sign-off
items. On failure, keep the previous reviewed deployment or stop sharing the
demo while fixing configuration; code rollback must remain schema-compatible.
