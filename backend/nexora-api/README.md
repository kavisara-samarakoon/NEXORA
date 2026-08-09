# NEXORA API

Initial Spring Boot backend foundation for NEXORA. It provides welcome and
health endpoints, static demo APIs for the frontend, and allows local requests
from the Next.js and Vite development servers.

## Requirements

- Java 17 or newer
- Maven 3.9 or newer

## Run locally

From `backend/nexora-api`:

```bash
mvn spring-boot:run
```

The API starts at `http://localhost:8080`.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api` | Returns the NEXORA API welcome message |
| `GET` | `/api/health` | Returns the API health status |
| `GET` | `/api/deals` | Returns demo game deals |
| `GET` | `/api/giveaways` | Returns demo game giveaways |
| `GET` | `/api/wishlist` | Returns demo wishlist items |
| `GET` | `/api/security/status` | Returns the demo security summary |

## Build and test

```bash
mvn test
mvn clean package
```

The packaged application is created under `target/` and can be run with:

```bash
java -jar target/nexora-api-0.0.1-SNAPSHOT.jar
```

## CORS

The API accepts local browser requests from:

- `http://localhost:3000`
- `http://localhost:5173`

Demo API data is held in memory and resets whenever the application restarts.
No database, authentication, AI integration, or external API integration is
included in this foundation.
