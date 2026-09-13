# NEXORA optional dev container

NEXORA includes an optional development-container configuration for a
consistent Java 17, Maven, Node.js 20, npm, Git, and Docker CLI toolchain. It is
local developer-experience tooling only. It is not a production container
image, does not deploy NEXORA, does not create release images, and does not
replace the normal host-native setup.

The container does not start PostgreSQL, the backend, or the frontend
automatically. Its post-create command only prints tool versions. No secrets
are required or included.

## Requirements

- Docker Desktop or a compatible Docker engine with Linux-container support
- An editor or tool that supports the
  [Development Containers specification](https://containers.dev/), such as
  Visual Studio Code with the Dev Containers extension
- Enough local resources to run the development container and optional
  PostgreSQL container

The selected Java image supports both x86-64 and ARM64 on Debian Bookworm, so
it is suitable for Intel and Apple Silicon development hosts. Tool availability
can still vary with the Docker engine and editor integration.

## Open the repository in the container

In Visual Studio Code:

1. Install Docker Desktop (or start a compatible Docker engine).
2. Install the **Dev Containers** extension.
3. Open the NEXORA repository.
4. Run **Dev Containers: Reopen in Container** from the command palette.
5. Wait for the image and features to finish installing.

Confirm the toolchain in the container terminal:

```bash
java -version
mvn -version
node -v
npm -v
git --version
```

Reopening in the container does not install NEXORA dependencies and does not
start application processes. Run only the commands needed for the task.

## Start local PostgreSQL

The existing Compose file starts PostgreSQL 16 only. From the repository root,
either on the host or in the development-container terminal:

```bash
docker compose \
  --env-file devops/docker/postgres.env.example \
  -f devops/docker/postgres.compose.yml \
  up -d
```

Check its health and follow logs:

```bash
docker compose -f devops/docker/postgres.compose.yml ps
docker compose -f devops/docker/postgres.compose.yml logs -f nexora-postgres
```

The development container reuses the host Docker daemon. This is convenient
for local Compose commands, but it also gives processes in the container access
to that daemon; use only trusted repository code and commands.

## Run the backend

The default profile does not require PostgreSQL:

```bash
cd backend/nexora-api
mvn test
mvn spring-boot:run
```

For a backend process running directly on the host, start the PostgreSQL
Compose service and use the `dev` profile:

```bash
cd backend/nexora-api
export NEXORA_JWT_SECRET="$(openssl rand -base64 48)"
export NEXORA_REFRESH_TOKEN_HASH_SECRET="$(openssl rand -base64 48)"
export NEXORA_DB_URL=jdbc:postgresql://localhost:5432/nexora_db
export NEXORA_DB_USERNAME=nexora_user
export NEXORA_DB_PASSWORD=nexora_password
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

When both the backend process and Compose command are launched from the
development-container terminal, PostgreSQL is still published by the host
Docker daemon. Use the host gateway instead of container-local `localhost`:

```bash
export NEXORA_DB_URL=jdbc:postgresql://host.docker.internal:5432/nexora_db
```

The devcontainer configuration adds the standard host-gateway mapping for
Docker Engine. With a different compatible engine, use its documented host
gateway name or run the backend on the host.

## Run the frontend

In another host or development-container terminal, copy the example only for a
fresh setup; preserve any existing `.env.local`:

```bash
cd frontend/nexora-web-next
cp .env.example .env.local
```

The example now leaves hosted origins blank. For this local browser-to-backend
flow, edit the ignored
copy to set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080` and
`NEXT_PUBLIC_SITE_URL=http://localhost:3000`, leaving `NEXORA_API_BASE_URL`
unset. To use proxy mode, follow the [frontend routing guide](../../frontend/nexora-web-next/README.md#vercel-to-render-api-routing)
and choose a backend origin reachable from the Next.js process.

```bash
npm ci
npm run dev
```

The frontend defaults to `http://localhost:8080` for the browser-visible API
origin. Do not place secrets in `.env.local` variables prefixed with
`NEXT_PUBLIC_`; those values are exposed to the browser.

## Stop or reset PostgreSQL

Stop PostgreSQL without deleting its named volume:

```bash
docker compose -f devops/docker/postgres.compose.yml down
```

Delete the Compose project's local PostgreSQL volume and recreate an empty
database on the next start:

```bash
docker compose -f devops/docker/postgres.compose.yml down -v
```

The reset command permanently deletes only this Compose project's local data.

## Troubleshooting

### Docker daemon is not running

Start Docker Desktop or the compatible Docker service, then retry the Compose
or **Reopen in Container** command. If Docker commands inside the development
container cannot reach the daemon, rebuild the container after the daemon is
available.

### Port 5432 is already in use

A host PostgreSQL installation or another container may already own port 5432.
Stop that local service, or use a deliberate Compose port override and update
`NEXORA_DB_URL` to match. Do not silently connect NEXORA to an unrelated
database.

### Port 8080 is already in use

Stop the other backend process before starting NEXORA. If a different local
backend port is selected, update the frontend's `NEXT_PUBLIC_API_BASE_URL`.

### Port 3000 is already in use

Stop the other frontend process or accept Next.js's alternate local port and
update any matching local origin configuration deliberately.

### Apple Silicon

The selected Bookworm Java image and PostgreSQL Alpine image publish ARM64
variants, so Docker Desktop should use native images on Apple Silicon. Avoid
forcing `linux/amd64`; emulation is unnecessary for this foundation and is
slower. If an older cached image behaves unexpectedly, rebuild the development
container without cache.

### Reset local PostgreSQL data

Use `docker compose ... down -v` only when losing the local NEXORA database is
acceptable. A normal `down` preserves the named volume.

## Deliberate boundaries

This foundation adds no production deployment, production secrets, backend or
frontend release images, service auto-start, database migration, or application
runtime change. Host-native development remains fully supported.
