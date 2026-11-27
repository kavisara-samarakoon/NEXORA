# NEXORA Next.js frontend

This directory contains NEXORA's primary frontend: a Next.js App Router
application for game deals, giveaways, personal wishlists, alert intelligence,
account safety, and the Sentinel local gateway preview.

**Status:** Local/development MVP · Production builds are validated locally ·
No production deployment is documented

The earlier Vite prototype remains in `../nexora-web` for reference and is not
required to run this application.

## Requirements

- Node.js 24 LTS (24.x). From the repository root, run `nvm use` if you use nvm.
- npm
- The Spring Boot backend for authentication, personal wishlist operations, and
  live API data

Public content pages retain typed local fallbacks, so linting and production
builds do not require a running backend.

These commands can also run unchanged inside the repository's optional
development container, which supplies Node.js 24 and npm. See the
[devcontainer guide](../../docs/development/dev-container-foundation.md). The
container is local tooling, not a frontend release image, and it does not alter
frontend environment-variable or secret-handling rules.

## Install and run

From `frontend/nexora-web-next`, copy the example only if `.env.local` does not
already contain your configuration:

```bash
cp .env.example .env.local
```

The tracked example is a hosted template with blank origins. For local proxy mode,
edit the ignored copy before continuing:

```dotenv
NEXT_PUBLIC_API_BASE_URL=/
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXORA_API_BASE_URL=http://localhost:8080
```

Selecting `/` with an empty backend target fails startup/build. For hosted use,
fill the origins in provider settings using the deployment guide below.

```bash
npm ci
npm run lint
npm run build
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Start the backend in a separate terminal **from the repository root**:

```bash
cd backend/nexora-api
mvn spring-boot:run
```

The backend runs at [http://localhost:8080](http://localhost:8080). Confirm it
at [http://localhost:8080/api/health](http://localhost:8080/api/health).

## Environment variables

For local direct API mode instead of the proxy, use the following and leave
`NEXORA_API_BASE_URL` unset:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

| Variable | Purpose | Local fallback |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | API origin for direct requests, or `/` for same-origin browser requests | `http://localhost:8080` |
| `NEXORA_API_BASE_URL` | Server-side backend origin for the optional API rewrite and server-rendered fetches | Unset; required when the public API base is `/` |
| `NEXT_PUBLIC_SITE_URL` | Origin used for canonical URLs, Open Graph metadata, `robots.txt`, and `sitemap.xml` | `http://localhost:3000` |

Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.
`NEXORA_API_BASE_URL` is read on the server, but its rewrite destination is
configuration, not a secret store. Use only an origin; never embed credentials.

### Vercel to Render API routing

Set these on the Vercel project rooted at `frontend/nexora-web-next` before building:

```dotenv
NEXT_PUBLIC_API_BASE_URL=/
NEXORA_API_BASE_URL=
NEXT_PUBLIC_SITE_URL=
```

Both origins above are deliberately blank. Supply the actual backend HTTPS
origin and canonical frontend HTTPS origin before building. No deployed URLs
are recorded by this example. Latest release: `v0.91.0-hosted-demo-readiness-foundation`.
Active milestone: v0.92 — Real Hosted Deployment Execution on
`feature/real-hosted-deployment-execution`, covering private synthetic hosted
deployment and evidence capture across Vercel, Render, and disposable Neon
PostgreSQL. No real hosted evidence exists yet.
[Hosted QA remains pending](../../docs/qa/BROWSER_QA_V0_92.md).

Browser requests such as `/api/auth/csrf` stay on the frontend origin.
Next.js rewrites `/api/:path*` to `NEXORA_API_BASE_URL/api/:path*`, preserving
endpoint paths and query strings. Server-rendered API reads use the backend
origin directly because server-side `fetch` requires an absolute URL.

Use the Render **origin without `/api`**, paths, query strings, fragments, or
credentials. Remote targets must use HTTPS. Never point it at the frontend or
an alias that routes back to the frontend: known site/Vercel origins and local
frontend origins are rejected to prevent rewrite loops. Rebuild/redeploy after
changing routing variables; keep the server-side variable available at runtime.

Local development stays unchanged with the defaults above. To test proxy mode
locally, set `NEXT_PUBLIC_API_BASE_URL=/` and
`NEXORA_API_BASE_URL=http://localhost:8080`, then restart Next.js. An unset backend
target disables the rewrite; selecting `/` without a target fails configuration.
An explicit public backend origin continues to make direct requests.

The rewrite adds no auth logic or cookie/header transformations. Keep the
backend's trusted origins configured for the exact frontend HTTPS origin and
retain its existing secure cookie and CSRF requirements.
Both auth cookies are expected to be Secure, host-only, `SameSite=Lax`, and
scoped to `/api/auth`; the refresh cookie is HttpOnly. Actual hosted forwarding,
refresh restoration, logout, CSRF, and CORS/origin checks are pending evidence.

Validation: with the backend and Next.js running in local proxy mode, request
`http://localhost:3000/api/health` and compare its status/body with
`http://localhost:8080/api/health`. In browser Network tools, confirm auth calls
use the frontend `/api/auth/...` paths. Before deployment sign-off, verify
login, refresh, logout, and cookie handling through the hosted frontend.

`/api/health` is a sanitized runtime/configuration summary. It does not prove
PostgreSQL or provider liveness, mail delivery, Gemini availability, or proxy
correctness by itself. Check direct and proxied health separately and use the
hosted smoke plan for dependencies, browser auth, and restart persistence.

Vercel setup: framework **Next.js**, root `frontend/nexora-web-next`, install
`npm ci`, build `npm run build`, and the default framework output setting.
The frontend manifest sets `engines.node` to `24.x`, which selects the hosted
runtime. Align the Vercel project setting to 24.x as well. [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)

From the repository root, with the intended three frontend variables exported,
run `python3 scripts/deployment/check-hosted-demo.py env frontend` before
copying them into Vercel. This offline check does not load `.env` files or
prove backend connectivity. Follow the
[hosted setup and smoke commands](../../docs/deployment/production-demo-deployment-plan.md)
for Render/Neon settings and browser session verification. A successful frontend
build alone does not prove the API is reachable.

See [Next.js external rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites#rewriting-to-an-external-url).

### Shared API client safety

The shared `src/lib/api-client.ts` helper centralizes browser-visible
`NEXT_PUBLIC_API_BASE_URL` resolution, trims configuration whitespace, removes
trailing slashes, and retains `http://localhost:8080` as the safe local
fallback unless `/` explicitly selects proxy mode. Frontend API modules use the same URL builder so endpoint paths and
query strings keep their existing behavior.

The helper can also read a trimmed `X-NEXORA-Request-ID` from backend response
headers as optional internal debugging metadata. The frontend does not generate
or send request IDs by default, does not add them to JSON body expectations,
and does not log response headers.

Memory-first access-token handling, the browser-managed HttpOnly refresh
cookie, module-memory CSRF caching, `X-NEXORA-CSRF` echoing, and the single
bounded CSRF retry remain unchanged. The shared helper contains no secrets.

### Frontend request error observability

Selected login, registration, Sentinel gateway, personal Wishlist, notification-
preference, and saved-deal error/support states can show the safe
`X-NEXORA-Request-ID` response-header value beneath their existing message. The
small support line helps connect a local frontend failure with backend logs; it
is not a token or session identifier, is not stored, and is never shown for
successful states or client-only validation errors.

The frontend still does not generate or send request ID headers by default.
Request IDs remain response metadata rather than JSON body fields, and no raw
response headers or credentials are displayed or logged. Memory-first access-
token storage, the browser-managed HttpOnly refresh cookie, module-memory CSRF
caching and echoing, and the bounded single CSRF retry are unchanged.

## Commands

```bash
npm run dev       # Start the development server
node --test tests/product-readiness.test.mjs # Route/auth UI regression checks
npm run lint      # Run ESLint
npm run build     # Create an optimized production build
npm run start     # Run a completed production build locally
npx tsc --noEmit  # Run TypeScript checks without emitting files
```

## Current routes

| Route | Experience | Current data source |
| --- | --- | --- |
| `/` | NEXORA landing page with a featured deal and small deal/giveaway collections | API-backed entries/counts only; empty and unavailable states |
| `/deals` | Curated and live deal discovery | `/api/deals`, optional `/api/deals/external`, and typed fallback data |
| `/giveaways` | Giveaway discovery | `/api/giveaways` with typed fallback data |
| `/wishlist` | Personal wishlist and alert intelligence | Authenticated `/api/me/wishlist`, alert history, and public/fallback preview |
| `/security` | Account-safety presentation | `/api/security/status` with typed fallback data |
| `/sentinel` | Public Sentinel preview plus authenticated local gateway | Public status/demo APIs and Bearer `POST /api/me/sentinel/insight` |
| `/settings` | Account-control presentation | Local demo state; not connected to notification preferences |
| `/login` | Account login | `POST /api/auth/login` |
| `/register` | Account registration | `POST /api/auth/register` |

## Data and fallback behavior

The homepage uses scoped CSS and the existing account-status component; inner
pages retain their dashboard layout. Search links to the existing Deals page,
and News is marked coming soon because there is no News route.

The first returned deal is featured, with at most three deals and three
giveaways below. Counts come from the summary API or successfully loaded feeds;
unavailable counts display a dash with an unavailable label. The homepage
discards bundled fallback entries returned by shared helpers: no sample titles,
prices, countdowns, or stores are rendered. Failed feeds show an unavailable
state with a retry button that refreshes the homepage feeds while preserving
the account component and scroll position.
Valid empty responses show an empty state and real zero counts. A homepage-only Suspense fallback keeps
navigation and hero links available while the feeds load.

Current deal/giveaway contracts have **no cover, thumbnail, or image URL fields**.
The homepage therefore uses decorative NEXORA gradient artwork, not unofficial
game covers. No image provider, download, or remote-image configuration is added.
Existing validated CheapShark deal URLs open in a new tab; other deal actions
lead to `/deals`. Giveaway actions lead to `/giveaways`.

Deals, Giveaways, public Wishlist, Security, and Sentinel responses are
validated before rendering. If the backend is unavailable or a public response
is invalid, the page uses typed fallback data from `src/data` and displays the
appropriate network state.

Authenticated account and personal wishlist operations do not pretend to
succeed offline. They show an error or fall back to a read-only public wishlist
preview where appropriate.

## Deals experience

The Deals page starts with the curated NEXORA feed from `GET /api/deals`. Users
can explicitly switch to **Live External Deals** or submit a live title search,
which requests `GET /api/deals/external`.

CheapShark-backed results can include a **View Deal** link through a CheapShark
redirect URL. Curated deals without a verified redirect keep that action
disabled. If external results fail, the interface keeps curated results
available and reports the fallback state.

Authenticated users can save visible curated or external deals to their
personal wishlist. The frontend synchronizes saved items and recognizes
existing entries by normalized title/store identity, with price-aware matching
where useful.

## Authentication and personal wishlist

Login and registration call the Spring Boot authentication endpoints through
`NEXT_PUBLIC_API_BASE_URL`. The top bar resolves the signed-in account through
the backend refresh-session flow and `GET /api/auth/me`.

The frontend keeps the active access token in module memory and continues to
send it as `Authorization: Bearer` for protected account and wishlist APIs. A
small global client bootstrap calls `POST /api/auth/refresh` with browser
credentials after a page load, allowing the backend's HttpOnly refresh cookie
to restore the access token and safe user summary. Concurrent refresh attempts
are serialized, and wishlist requests retry at most once after a `401`.

Login and registration include browser credentials so their refresh cookies are
accepted. Logout calls `POST /api/auth/logout`, then clears frontend session
state even if the backend is unavailable. New access tokens are not written to
`localStorage`; the legacy `nexora.auth.access_token` entry is removed during
bootstrap, login, registration, refresh, and logout.

Before register, login, refresh, or logout, the auth client obtains a CSRF token
from `GET /api/auth/csrf` with browser credentials. It caches only the response
token in module memory and echoes it as `X-NEXORA-CSRF`; the matching
`nexora_csrf_token` cookie is managed by the browser. A CSRF `403` clears the
memory token, obtains a new cookie/token pair, and retries the rejected auth
request once. Neither the CSRF token nor any access or refresh token is written
to `localStorage` or `sessionStorage`; the refresh token remains only in its
HttpOnly cookie.

The Wishlist page supports:

- loading authenticated personal items;
- saving deals from the Deals page;
- editing target price, alert enabled state, and priority; common target-price
  inputs such as `15`, `$15`, `15$`, and `FREE` are normalized before saving;
- deleting owned active items;
- displaying backend-computed `target-reached`, `watching`, `paused`, and
  `not-evaluable` evaluations;
- displaying recent target-reached events from
  `GET /api/me/wishlist/alert-events`;
- loading up to 15 recent price snapshots on demand for a personal item from
  `GET /api/me/wishlist/{id}/price-history`, then presenting latest, lowest,
  highest, snapshot-count, and last-observed summaries;
- displaying a compact CSS-only price trend, direction indicator, and the five
  newest snapshots with timestamps and readable source badges;
- reading and updating account-scoped email, in-app, target-reached, price-drop,
  and free-game notification preferences from the authenticated Wishlist panel.

Logged-out users see a read-only public demo wishlist. Public preview data never
exposes another user's personal items or alert history.

## Backend-only alert and notification foundations

The backend now contains opt-in foundations for scheduled wishlist price
refresh, CheapShark wishlist price snapshots, notification dispatch, and email
delivery. Those capabilities are not controlled by this frontend:

- Automatic price refresh is configured and scheduled in the backend `dev`
  profile; it is disabled by default.
- The stored price provider remains the backend default. CheapShark wishlist
  snapshots are optional and use conservative matching.
- Notifications are disabled by default, with a log-only default provider.
- The optional email provider requires explicit backend SMTP configuration for
  real delivery.
- The Wishlist page includes account preference controls; provider selection
  and recipient management remain backend/future concerns.
- There is no frontend delivery-status, retry, or email-history view.

The frontend displays alert evaluations, alert events, and a compact card-level
price-history visualization returned by the existing owner-scoped Bearer API;
it does not run scheduled checks or send notifications itself. The trend strip
uses React and CSS only, with no chart dependency. This remains a visualization
foundation rather than a full price-analytics interface.

Notification preferences use the owner-scoped Bearer endpoints at
`/api/me/notification-preferences` with the same bounded access-token refresh
retry as other personal APIs. The panel loads and saves independently, so a
preference failure does not disable the wishlist. Email remains opt-in and does
not become deliverable without backend SMTP and a future recipient workflow.

## Sentinel gateway foundation

The Sentinel page preserves its public static messages and typed status/demo
fallback. Signed-in users can send one transient request to the owner-scoped
Bearer endpoint `POST /api/me/sentinel/insight`. The client accepts the local
default, local fallback, and optional Gemini foundation response modes, then
renders the answer, deterministic recommendations, safety notes, and next
actions with one bounded access-token refresh retry. Signed-out users receive a
sign-in hint rather than a simulated AI answer.

Provider badges distinguish `Local provider`, `Local fallback`, and
`Gemini provider`. Local fallback responses show a small, fixed explanation for
the backend-classified provider failure, and HTTP 429 responses show a friendly
wait-before-retrying message. Messages and responses live only in current React
state and disappear on navigation or reload; they are not written to browser storage.
The chat labels authenticated requests as using bounded, backend-generated
NEXORA context. Depending on the selected context, that may contain compact
owner-scoped Wishlist, recent-price, alert, public deal, or giveaway summaries;
the raw summary is not exposed to frontend code.
Gemini configuration and API keys are backend-only. There are no `NEXT_PUBLIC`
Gemini variables, no frontend key handling, and no autonomous wishlist, deal,
account, notification, or security action.

## Security notes

The active JWT access token is memory-first and the longer-lived refresh token
remains in the backend-issued HttpOnly cookie, where JavaScript cannot read it.
Protected APIs continue to use Bearer access tokens. This reduces durable token
exposure but is still a local/development foundation, not a production security
claim.

The backend permits credentialed requests only from configured explicit
localhost frontend origins and validates a CSRF cookie/header pair plus browser
`Origin` or `Referer` on cookie-sensitive auth POST routes. These controls are a
local-development foundation. Production CORS, cookie, proxy, CSRF/origin,
broader revocation, and operational-monitoring policy still requires review.

`NEXT_PUBLIC_*` configuration is visible to users. SMTP credentials, JWT
secrets, and database credentials belong only in backend/deployment
configuration.

The repository's `Frontend CI` GitHub Actions workflow runs `npm ci`, lint, and
the production build with Node.js 24 for pushes to `main` and pull requests
targeting `main`. It validates this Next.js application only, not the retained
Vite prototype. The separate `Security CI` workflow runs
`npm audit --omit=dev --audit-level=high` against this application's production
dependency graph; it never applies automatic audit fixes.

## Current limitations

- No production frontend deployment or continuous-delivery workflow is
  documented. CI performs validation only.
- Settings links to the saved notification preferences in Wishlist. Its sample
  profile and preview toggles remain unsaved demo state.
- Automatic refresh scheduling and notification providers are backend-only
  configuration.
- Real email delivery requires backend SMTP configuration.
- Preference controls do not provide verified recipients, durable delivery
  status, retries, an outbox, or asynchronous delivery.
- The refresh-session flow has local CSRF/trusted-origin checks but still uses
  local-development cookie/CORS defaults and lacks complete session controls.
- Price-history visualization is a compact card-level view; full analytics,
  aggregation, retention policy, and advanced charts are still not implemented.
- This visualization milestone adds no backend migration, AI, account linking,
  external data provider, deployment workflow, or production-readiness claim.
- The notification-preference milestone adds no AI, account linking, delivery
  provider, deployment workflow, or production email claim.
- Sentinel has bounded backend-generated NEXORA context summaries, an optional
  backend-only Gemini provider disabled by default, and a deterministic local
  fallback with safe failure reasons. Backend limits and provider-health
  metadata are in-memory only. There is no conversation persistence, autonomous
  action, streaming, production privacy/safety review, moderation pipeline,
  distributed rate limiting, production AI observability, abuse monitoring,
  managed provider-key workflow, or cost control. This milestone adds no
  database migration.
- Public content fallbacks are intentionally demo data, not guaranteed live
  provider results.

## Verification

```bash
npm run lint
npm run build
```

Optional standalone type check:

```bash
npx tsc --noEmit
```
