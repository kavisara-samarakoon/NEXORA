# NEXORA Next.js Frontend

This directory contains the production frontend for NEXORA: a dark Liquid
Glass gaming command center for deals, giveaways, wishlists, account safety,
and Sentinel assistance.

The application uses Next.js App Router, React, and TypeScript. The earlier
Vite prototype is retained in `../nexora-web` as a backup/reference and is not
required to run this application.

## Requirements

- Node.js 20.9 or newer
- npm
- The Spring Boot backend for authentication and live API data (content pages
  retain static fallbacks when it is unavailable)

## Backend connection

Start the API from the project root in a separate terminal:

```bash
cd backend/nexora-api
mvn spring-boot:run
```

The backend runs at `http://localhost:8080` by default.

From `frontend/nexora-web-next`, create a local environment file from the safe
example:

```bash
cp .env.example .env.local
```

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

| Variable | Purpose | Local fallback |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL used for Spring Boot API requests | `http://localhost:8080` |
| `NEXT_PUBLIC_SITE_URL` | Site origin used for canonical URLs, Open Graph metadata, `robots.txt`, and `sitemap.xml` | `http://localhost:3000` |

Deals, Giveaways, Wishlist, Security, and Sentinel use backend demo data when
it is available. Each page validates its response and falls back to the typed
static data in `src/data` if the backend is offline or returns an unexpected
response. A production build therefore does not require a running backend.

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
npm run dev       # Start the development server
npm run build     # Create an optimized production build
npm run start     # Run the production build
npm run lint      # Run ESLint
npx tsc --noEmit  # Run TypeScript checks without emitting files
```

## Current routes

| Route | Experience | Data source |
| --- | --- | --- |
| `/` | NEXORA dashboard | Static dashboard demo data |
| `/deals` | Game Deals Intelligence | Curated `/api/deals` plus optional live `/api/deals/external` |
| `/giveaways` | Live Giveaway Intelligence | `/api/giveaways` with static fallback |
| `/wishlist` | Smart Wishlist Control | Personal `/api/me/wishlist` and alert history with public `/api/wishlist` preview/fallback |
| `/security` | Cyber Security Command Center | `/api/security/status` with static fallback |
| `/sentinel` | NEXORA Sentinel demo | `/api/sentinel/status` and `/api/sentinel/demo` with static fallback |
| `/settings` | Account Control Center | Local demo state |
| `/login` | Account login | `POST /api/auth/login` |
| `/register` | Account registration | `POST /api/auth/register` |

## Curated and external deals

The Deals page initially renders the curated NEXORA feed from `GET /api/deals`
with the existing typed static fallback. Live external deals are optional and
are requested from `GET /api/deals/external?pageSize=12` only after the user
selects **Live External Deals** or submits a live title search.

If the backend, CheapShark, or the external response is unavailable, the page
shows a friendly warning and continues displaying the server-provided curated
deals. External results are not persisted. Stores without an expanded frontend
lookup can appear as `Store {id}` and remain available under **All Stores**.
Live results with a valid CheapShark redirect URL expose an active **View
Deal** link that opens through CheapShark in a new tab. Curated deal redirects
remain disabled and planned.

Authenticated users can save any visible curated or live external deal to
their personal wishlist from its deal card. External store labels such as
Fanatical, Gamesplanet, and GameBillet are accepted. The current deal price is
used as a provisional target and lowest-ever price until scheduled price
refreshing is implemented. The page synchronizes active personal wishlist
items after authentication and when deal sources change, so matching cards
remain marked as saved after refresh. Matching prefers normalized title, store,
and current price, with title plus store as the stable fallback when a live
price changes. The backend also returns an existing active item for repeat
saves with the same case-insensitive title and store. Scheduled price monitoring
and store redirects are still planned and are not activated by this workflow.
Basic alert evaluation exists for saved current and target values, but it does
not fetch new prices automatically.

## Authentication foundation

Login and registration call the Spring Boot authentication endpoints directly
using `NEXT_PUBLIC_API_BASE_URL`. The access token is stored in browser
`localStorage`, and the small client-side account status in the Topbar resolves
the current user through `GET /api/auth/me`. Existing dashboard and feature-page
data fetching remains server-side.

The Wishlist page uses that stored token to load, add, update, and delete items
through the authenticated `/api/me/wishlist` endpoints. Signed-in users can
update a personal item's target price, alert active state, and priority through
`PATCH /api/me/wishlist/{id}/alert`. Cards display the backend-computed optional
`alertEvaluation`, including `target-reached`, `watching`, `paused`, and
`not-evaluable` states. The evaluation updates immediately from successful
PATCH responses and remains visible after the personal wishlist reloads.
The alert-status panel also requests the signed-in user's recent target-reached
events from `GET /api/me/wishlist/alert-events`. Backend POST and PATCH
transitions create those event snapshots, and the panel refreshes after
successful wishlist additions and alert-setting updates. Public preview and
offline modes do not show personal history, and an unavailable history request
does not prevent the personal wishlist from loading or being edited.
Logged-out users, unavailable personal requests, and backend outages retain the
public demo wishlist as a read-only preview/fallback, so the route remains
usable.

This is a basic authentication and personal-wishlist foundation. Browser
storage is intentionally a temporary approach and is more exposed to
cross-site scripting than an HttpOnly-cookie design. Route protection, refresh
tokens, roles, OAuth, and price history are not included yet. Alert settings are
persisted and basic current-versus-target evaluation is available, but real
notification delivery, scheduled price checking, and automatic external price
refreshing remain future work.

## Production environment

Set `NEXT_PUBLIC_API_BASE_URL` to the deployed backend origin and
`NEXT_PUBLIC_SITE_URL` to the public frontend origin before building. Neither
variable is a secret; values prefixed with `NEXT_PUBLIC_` are exposed to the
browser by design.

Production-grade token lifecycle and route protection, external store APIs,
and real Gemini AI responses remain future work.
