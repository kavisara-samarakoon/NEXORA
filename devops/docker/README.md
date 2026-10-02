# NEXORA local PostgreSQL

This directory provides PostgreSQL 16 for local NEXORA development. Docker
Compose starts only the database; it does not build or start the Spring Boot API
or Next.js frontend.

This is not a production database, application-container, or deployment setup.
The values in `postgres.env.example` are public local demo credentials. Never
reuse them for a shared, staged, or production database.

## Requirements

- Docker Desktop, Docker Engine, or another compatible Docker runtime
- Docker Compose v2 (`docker compose`)

## Quick start

From the repository root:

```bash
docker compose \
  --env-file devops/docker/postgres.env.example \
  -f devops/docker/postgres.compose.yml \
  up -d
```

The service is named `nexora-postgres`, the local container is named
`nexora-postgres-local`, and PostgreSQL is exposed at `localhost:5432`.

## Check health

Check service and health status. The status becomes `healthy` after PostgreSQL
is ready to accept connections:

```bash
docker compose -f devops/docker/postgres.compose.yml ps
```

## View logs

Follow PostgreSQL logs:

```bash
docker compose -f devops/docker/postgres.compose.yml logs -f nexora-postgres
```

## Run the backend `dev` profile

After PostgreSQL reports healthy:

```bash
cd backend/nexora-api
export NEXORA_JWT_SECRET="$(openssl rand -base64 48)"
export NEXORA_REFRESH_TOKEN_HASH_SECRET="$(openssl rand -base64 48)"
export NEXORA_DB_URL=jdbc:postgresql://localhost:5432/nexora_db
export NEXORA_DB_USERNAME=nexora_user
export NEXORA_DB_PASSWORD=nexora_password
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Flyway runs from backend startup and applies migrations V1–V12 before JPA
validates the mapped schema. Docker Compose does not apply migrations itself.

When the backend runs in the optional development container while Compose uses
the host Docker daemon, use
`jdbc:postgresql://host.docker.internal:5432/nexora_db`. See the
[devcontainer guide](../../docs/development/dev-container-foundation.md) for
details.

## Stop PostgreSQL

Stop the database while preserving its named volume:

```bash
docker compose -f devops/docker/postgres.compose.yml down
```

## Reset PostgreSQL

Local data persists in the `nexora-postgres-data` named volume. To delete that
volume and recreate an empty local database on the next start:

```bash
docker compose -f devops/docker/postgres.compose.yml down -v
```

The reset command permanently removes this Compose project's local PostgreSQL
data. It does not remove host PostgreSQL databases or unrelated Docker volumes.

## Custom local values

Copy `postgres.env.example` to an ignored `.env` file or supply another env file
when different local credentials or a database name are needed. Keep real or
shared credentials out of the repository, and update the matching
`NEXORA_DB_*` variables used by the host-side backend.

This local Compose foundation does not provide productionized backend or
frontend containers, production secrets, backups, high availability,
monitoring, or a release workflow.
