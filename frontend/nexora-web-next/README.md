# NEXORA Next.js Frontend

This directory contains the production Next.js frontend for NEXORA: a dark Liquid Glass gaming command center for game discovery, deals, giveaways, wishlists, account security, and Sentinel assistance.

The app uses the Next.js App Router, React, and TypeScript. The legacy Vite frontend remains separate in `../nexora-web` and is not required to run this application.

## Local development

Install dependencies, then start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
npm run dev       # Start the development server
npm run build     # Create a production build
npm run start     # Run the production build
npm run lint      # Run ESLint
npx tsc --noEmit  # Run TypeScript checks without emitting files
```

## Current routes

- `/` — NEXORA dashboard
- `/deals` — Game Deals Intelligence
- `/giveaways` — Live Giveaway Intelligence
- `/wishlist` — Smart Wishlist Control
- `/security` — Cyber Security Command Center
- `/sentinel` — NEXORA Sentinel static AI preview
- `/settings` — Account Control Center

## SEO base URL

Set `NEXT_PUBLIC_SITE_URL` to the public site origin in production so canonical URLs, Open Graph metadata, `robots.txt`, and `sitemap.xml` use the correct host:

```bash
NEXT_PUBLIC_SITE_URL=https://your-production-origin.example
```

When the variable is not set or is invalid, the app safely falls back to `http://localhost:3000` for local development.

## Integration status

The current experience uses static demo data and local UI state. Backend services, persistent accounts, external APIs, and live Sentinel AI integration are future work.
