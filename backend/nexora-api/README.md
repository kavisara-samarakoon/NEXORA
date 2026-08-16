# NEXORA API

Spring Boot REST API for NEXORA. The current backend provides health, welcome,
and static in-memory demo endpoints for the production Next.js frontend. A
PostgreSQL/JPA foundation is available through the optional `dev` profile.

No entities, repositories, authentication, Gemini integration, or external API
calls are included yet.

## Requirements

- Java 17 or newer
- Maven 3.9 or newer
- PostgreSQL when using the `dev` profile

## Run locally

From `backend/nexora-api`:

```bash
mvn spring-boot:run
```

The API starts at [http://localhost:8080](http://localhost:8080).

The default profile does not initialize a datasource, so the demo APIs and
tests run without PostgreSQL.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api` | Returns the NEXORA API welcome response |
| `GET` | `/api/health` | Returns the service health status |
| `GET` | `/api/deals` | Returns demo game deals |
| `GET` | `/api/giveaways` | Returns demo game giveaways |
| `GET` | `/api/wishlist` | Returns demo wishlist items |
| `GET` | `/api/security/status` | Returns the demo security summary and protection items |
| `GET` | `/api/sentinel/status` | Returns the Sentinel integration status |
| `GET` | `/api/sentinel/demo` | Returns Sentinel messages, suggestions, capabilities, and system status |

All feature data is stored in immutable in-memory collections. Restarting the
application restores the original demo data.

## Maven commands

```bash
mvn spring-boot:run  # Start the local API
mvn test             # Compile and run all tests
mvn clean package    # Test and create the executable JAR
```

Run the packaged application with:

```bash
java -jar target/nexora-api-0.0.1-SNAPSHOT.jar
```

## PostgreSQL development setup

The local development defaults are:

| Setting | Default |
| --- | --- |
| Database | `nexora_db` |
| Username | `nexora_user` |
| Password | `nexora_password` |
| JDBC URL | `jdbc:postgresql://localhost:5432/nexora_db` |

Create the local role and database with a PostgreSQL administrator account:

```sql
CREATE USER nexora_user WITH PASSWORD 'nexora_password';
CREATE DATABASE nexora_db OWNER nexora_user;
```

The defaults can be overridden with environment variables:

| Variable | Purpose |
| --- | --- |
| `NEXORA_DB_URL` | PostgreSQL JDBC connection URL |
| `NEXORA_DB_USERNAME` | PostgreSQL username |
| `NEXORA_DB_PASSWORD` | PostgreSQL password |

For example:

```bash
export NEXORA_DB_URL=jdbc:postgresql://localhost:5432/nexora_db
export NEXORA_DB_USERNAME=nexora_user
export NEXORA_DB_PASSWORD=nexora_password
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

The `dev` profile runs Flyway migrations from `src/main/resources/db/migration`
before JPA starts. It also uses `spring.jpa.hibernate.ddl-auto=validate`, so
Hibernate validates future entity mappings without creating, updating, or
dropping the schema. The default profile still runs without PostgreSQL and does
not execute Flyway migrations.

## Frontend connection and CORS

The Next.js frontend reads the backend origin from
`NEXT_PUBLIC_API_BASE_URL`, which defaults to `http://localhost:8080` during
local development.

The backend allows browser requests to `/api/**` from these local origins:

- `http://localhost:3000` — production Next.js frontend in development
- `http://localhost:5173` — retained Vite prototype

## Future work

- Add database entities, repositories, and persistence-backed services.
- Add authentication, authorization, and session management.
- Add approved external game-store and pricing APIs.
- Add real Gemini integration for Sentinel with privacy and safety controls.
- Add production configuration, observability, and deployment support.
