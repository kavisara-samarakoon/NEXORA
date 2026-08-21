# NEXORA local PostgreSQL

This directory provides a Docker Compose foundation for local PostgreSQL 16
development. It starts only the database; the NEXORA backend and frontend still
run directly on the host.

This configuration uses safe local defaults and is not a production database
or deployment setup.

## Requirements

- Docker Desktop, Docker Engine, or another compatible Docker runtime
- Docker Compose v2 (`docker compose`)

## Start PostgreSQL

From the repository root:

```bash
docker compose \
  --env-file devops/docker/postgres.env.example \
  -f devops/docker/postgres.compose.yml \
  up -d
```

The service is named `nexora-postgres`, the local container is named
`nexora-postgres-local`, and PostgreSQL is exposed at `localhost:5432`.

Check service and health status:

```bash
docker compose -f devops/docker/postgres.compose.yml ps
```

Follow PostgreSQL logs:

```bash
docker compose -f devops/docker/postgres.compose.yml logs -f nexora-postgres
```

## Run the backend `dev` profile

After PostgreSQL reports healthy:

```bash
cd backend/nexora-api
export NEXORA_JWT_SECRET="$(openssl rand -base64 48)"
export NEXORA_DB_URL=jdbc:postgresql://localhost:5432/nexora_db
export NEXORA_DB_USERNAME=nexora_user
export NEXORA_DB_PASSWORD=nexora_password
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Flyway runs from the backend startup and applies migrations V1–V6 before JPA
validates the mapped schema. Docker Compose does not apply migrations itself.

## Stop or reset

Stop the database while preserving its named volume:

```bash
docker compose -f devops/docker/postgres.compose.yml down
```

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
