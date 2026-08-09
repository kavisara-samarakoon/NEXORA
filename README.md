# NEXORA

NEXORA is a web-first gaming command center for discovering deals and
giveaways, tracking a wishlist, reviewing account-safety information, and
previewing the Sentinel assistant experience.

The current development setup uses a Next.js frontend and a Spring Boot API.
API-backed pages keep typed static demo data as a fallback, so the frontend can
still run and build while the backend is offline.

## Project structure

| Path | Purpose |
| --- | --- |
| `frontend/nexora-web-next` | Production Next.js frontend |
| `frontend/nexora-web` | Earlier Vite prototype retained as a backup/reference |
| `backend/nexora-api` | Spring Boot REST API and in-memory demo services |
| `docs` | Product, architecture, design, security, and research documentation |
| `database` | Planned database schemas, migrations, and seed-data workspace |
| `assets` | Shared logos, images, and UI references |
| `devops` | Planned deployment, Docker, and CI/CD resources |
| `research` | Final-year project and research preparation |

## Requirements

- Node.js 20.9 or newer and npm
- Java 17 or newer
- Maven 3.9 or newer

## Run locally

Run the backend and frontend in separate terminals.

### 1. Start the backend

```bash
cd backend/nexora-api
mvn spring-boot:run
```

The API starts at [http://localhost:8080](http://localhost:8080). Confirm it is
available at [http://localhost:8080/api/health](http://localhost:8080/api/health).

### 2. Configure and start the frontend

```bash
cd frontend/nexora-web-next
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The example environment
connects the frontend to the local backend and sets the local metadata origin.

## Connected pages

The following production frontend pages are connected to Spring Boot demo APIs
and retain their original static data as an offline fallback:

- Deals (`/deals`)
- Giveaways (`/giveaways`)
- Wishlist (`/wishlist`)
- Security (`/security`)
- Sentinel (`/sentinel`)

Settings (`/settings`) currently uses local demo state only.

## Current backend APIs

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api` | API welcome response |
| `GET` | `/api/health` | Service health status |
| `GET` | `/api/deals` | Demo game deals |
| `GET` | `/api/giveaways` | Demo giveaway listings |
| `GET` | `/api/wishlist` | Demo wishlist items |
| `GET` | `/api/security/status` | Demo security summary and protection items |
| `GET` | `/api/sentinel/status` | Sentinel integration status |
| `GET` | `/api/sentinel/demo` | Sentinel messages, suggestions, capabilities, and system status |

All current feature data is static and held in memory. There is no database,
authentication system, real AI integration, or external game-store API yet.

## Verification

Frontend:

```bash
cd frontend/nexora-web-next
npx tsc --noEmit
npm run lint
npm run build
```

Backend:

```bash
cd backend/nexora-api
mvn test
```

## Roadmap

1. Add persistent storage and database migrations.
2. Add account authentication, authorization, and session management.
3. Replace demo feeds with approved game-store and pricing integrations.
4. Add real Gemini-backed Sentinel behavior with privacy and safety controls.
5. Connect Settings and persistent notification preferences.
6. Expand automated testing, observability, deployment, and cross-platform work.
