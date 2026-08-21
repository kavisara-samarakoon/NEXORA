# NEXORA Next.js frontend

This directory contains NEXORA's primary frontend: a Next.js App Router
application for game deals, giveaways, personal wishlists, alert intelligence,
account safety, and the Sentinel demo experience.

**Status:** Local/development MVP · Production builds are validated locally ·
No production deployment is documented

The earlier Vite prototype remains in `../nexora-web` for reference and is not
required to run this application.

## Requirements

- Node.js 20.9 or newer
- npm
- The Spring Boot backend for authentication, personal wishlist operations, and
  live API data

Public content pages retain typed local fallbacks, so linting and production
builds do not require a running backend.

## Install and run

From `frontend/nexora-web-next`:

```bash
cp .env.example .env.local
npm install
npm run lint
npm run build
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Start the backend in a separate terminal:

```bash
cd backend/nexora-api
mvn spring-boot:run
```

The backend runs at [http://localhost:8080](http://localhost:8080). Confirm it
at [http://localhost:8080/api/health](http://localhost:8080/api/health).

## Environment variables

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

| Variable | Purpose | Local fallback |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL for Spring Boot API requests | `http://localhost:8080` |
| `NEXT_PUBLIC_SITE_URL` | Origin used for canonical URLs, Open Graph metadata, `robots.txt`, and `sitemap.xml` | `http://localhost:3000` |

These values are public by design because Next.js exposes variables prefixed
with `NEXT_PUBLIC_` to the browser. Do not place secrets in them.

## Commands

```bash
npm run dev       # Start the development server
npm run lint      # Run ESLint
npm run build     # Create an optimized production build
npm run start     # Run a completed production build locally
npx tsc --noEmit  # Run TypeScript checks without emitting files
```

## Current routes

| Route | Experience | Current data source |
| --- | --- | --- |
| `/` | NEXORA dashboard | Local dashboard presentation data |
| `/deals` | Curated and live deal discovery | `/api/deals`, optional `/api/deals/external`, and typed fallback data |
| `/giveaways` | Giveaway discovery | `/api/giveaways` with typed fallback data |
| `/wishlist` | Personal wishlist and alert intelligence | Authenticated `/api/me/wishlist`, alert history, and public/fallback preview |
| `/security` | Account-safety presentation | `/api/security/status` with typed fallback data |
| `/sentinel` | Sentinel demo/status experience | `/api/sentinel/status` and `/api/sentinel/demo` with typed fallback data |
| `/settings` | Account-control presentation | Local demo state; not connected to notification preferences |
| `/login` | Account login | `POST /api/auth/login` |
| `/register` | Account registration | `POST /api/auth/register` |

## Data and fallback behavior

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
`GET /api/auth/me`.

The Wishlist page supports:

- loading authenticated personal items;
- saving deals from the Deals page;
- editing target price, alert enabled state, and priority;
- deleting owned active items;
- displaying backend-computed `target-reached`, `watching`, `paused`, and
  `not-evaluable` evaluations;
- displaying recent target-reached events from
  `GET /api/me/wishlist/alert-events`.

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
- There is no frontend notification-provider, recipient, or preference UI yet.
- There is no frontend delivery-status, retry, or email-history view.

The frontend displays alert evaluations and history returned by the backend; it
does not run scheduled checks or send notifications itself.

## Security notes

The current JWT access token is stored in browser `localStorage`. This is a
temporary MVP design and is more exposed to cross-site scripting than an
HttpOnly-cookie approach. A production-grade refresh-token lifecycle, secure
cookie strategy, token revocation, stronger route protection, and related
hardening remain future work.

`NEXT_PUBLIC_*` configuration is visible to users. SMTP credentials, JWT
secrets, and database credentials belong only in backend/deployment
configuration.

## Current limitations

- No production frontend deployment or CI/CD workflow is documented.
- Settings is local demo state and does not manage backend notification
  preferences.
- Automatic refresh scheduling and notification providers are backend-only
  configuration.
- Real email delivery requires backend SMTP configuration.
- Browser `localStorage` authentication is not the final production design.
- There is no price-history chart or long-term price-history interface.
- Sentinel is a demo/status experience; no real Gemini or other AI integration
  exists.
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
