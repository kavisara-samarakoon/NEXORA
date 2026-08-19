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
| `/deals` | Game Deals Intelligence | `/api/deals` with static fallback |
| `/giveaways` | Live Giveaway Intelligence | `/api/giveaways` with static fallback |
| `/wishlist` | Smart Wishlist Control | Personal `/api/me/wishlist` with public `/api/wishlist` preview/fallback |
| `/security` | Cyber Security Command Center | `/api/security/status` with static fallback |
| `/sentinel` | NEXORA Sentinel demo | `/api/sentinel/status` and `/api/sentinel/demo` with static fallback |
| `/settings` | Account Control Center | Local demo state |
| `/login` | Account login | `POST /api/auth/login` |
| `/register` | Account registration | `POST /api/auth/register` |

## Authentication foundation

Login and registration call the Spring Boot authentication endpoints directly
using `NEXT_PUBLIC_API_BASE_URL`. The access token is stored in browser
`localStorage`, and the small client-side account status in the Topbar resolves
the current user through `GET /api/auth/me`. Existing dashboard and feature-page
data fetching remains server-side.

The Wishlist page uses that stored token to load, add, and delete items through
the authenticated `/api/me/wishlist` endpoints. It requires the backend and a
signed-in user for personal data. Logged-out users, unavailable personal
requests, and backend outages retain the public demo wishlist as a
preview/fallback, so the route remains usable.

This is a basic authentication and personal-wishlist foundation. Browser
storage is intentionally a temporary approach and is more exposed to
cross-site scripting than an HttpOnly-cookie design. Route protection, refresh
tokens, roles, OAuth, price history, and a backend-powered alert toggle/alert
engine are not included yet; wishlist alert controls remain local UI state.

## Production environment

Set `NEXT_PUBLIC_API_BASE_URL` to the deployed backend origin and
`NEXT_PUBLIC_SITE_URL` to the public frontend origin before building. Neither
variable is a secret; values prefixed with `NEXT_PUBLIC_` are exposed to the
browser by design.

Production-grade token lifecycle and route protection, external store APIs,
and real Gemini AI responses remain future work.
