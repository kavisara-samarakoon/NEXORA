# NEXORA API

Initial Spring Boot backend foundation for NEXORA. It currently provides the
welcome and health endpoints and allows local requests from the Next.js and
Vite development servers.

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

No database, authentication, AI integration, or external API integration is
included in this foundation.
