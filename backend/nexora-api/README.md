# NEXORA API

Spring Boot REST API for NEXORA. The current backend provides health, welcome,
and demo endpoints for the production Next.js frontend. Deals, giveaways, and
wishlist items use immutable in-memory data by default and PostgreSQL/JPA
through the optional `dev` profile.

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
| `GET` | `/api/dashboard/summary` | Aggregates current deal, giveaway, wishlist, database, and Sentinel status |
| `GET` | `/api/deals` | Returns active game deals (static by default, PostgreSQL in `dev`) |
| `GET` | `/api/deals/external` | Returns live CheapShark deals mapped to the NEXORA deal contract, with local fallback |
| `GET` | `/api/giveaways` | Returns active giveaways (static by default, PostgreSQL in `dev`) |
| `GET` | `/api/wishlist` | Returns public demo/global wishlist items only |
| `GET` | `/api/security/status` | Returns the demo security summary and protection items |
| `GET` | `/api/sentinel/status` | Returns the Sentinel integration status |
| `GET` | `/api/sentinel/demo` | Returns Sentinel messages, suggestions, capabilities, and system status |
| `POST` | `/api/auth/register` | Creates an account and returns a JWT access token |
| `POST` | `/api/auth/login` | Accepts an email or username and returns a JWT access token |
| `GET` | `/api/auth/me` | Returns the authenticated user's safe account fields |
| `GET` | `/api/me/wishlist` | Returns the authenticated user's active wishlist items |
| `POST` | `/api/me/wishlist` | Adds an item to the authenticated user's wishlist |
| `DELETE` | `/api/me/wishlist/{id}` | Soft deletes an item owned by the authenticated user |

Except for deals, giveaways, and wishlist items in the `dev` profile, feature
data is stored in immutable in-memory collections. Restarting the
default-profile application restores the original demo data.

## External deals foundation

`GET /api/deals/external` requests current on-sale results from the public
[CheapShark API](https://apidocs.cheapshark.com/) and maps them into the same
`Deal` response shape used by NEXORA. This is separate from `GET /api/deals`;
the existing local/database-backed endpoint remains unchanged.

Supported query parameters:

| Parameter | Behavior |
| --- | --- |
| `title` | Optional title search, trimmed and limited to 80 characters |
| `pageSize` | Defaults to `12`, must be at least `1`, and is capped at the configured maximum (`24` by default) |
| `upperPrice` | Optional positive maximum price in USD |

Examples:

```bash
curl -i http://localhost:8080/api/deals
curl -i http://localhost:8080/api/deals/external
curl -i 'http://localhost:8080/api/deals/external?pageSize=5'
curl -i 'http://localhost:8080/api/deals/external?title=elden'
```

The external request defaults to page zero, `DealRating` descending, and
on-sale results only. It has a five-second connect/request timeout. Provider
errors, timeouts, non-success responses, invalid JSON, or structurally invalid
deal data produce a concise server warning and return the current
`DealCatalogService` results instead of failing the endpoint.

Store names are resolved on demand from CheapShark's `/stores` endpoint. If
that lookup is unavailable, live deals are still returned: unknown IDs use
`Store {id}` and a missing ID uses `Unknown Store`. A store-directory failure
does not trigger the local-deals fallback; only a deals request or deal-mapping
failure does.

Configuration defaults:

```properties
nexora.external-deals.enabled=true
nexora.external-deals.cheapshark.base-url=https://www.cheapshark.com/api/1.0
nexora.external-deals.timeout-seconds=5
nexora.external-deals.default-page-size=12
nexora.external-deals.max-page-size=24
```

This integration fetches deals and store data on demand. Neither is persisted,
and there is no scheduled synchronization or store-directory cache yet. No API
key is required.

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
| `NEXORA_JWT_SECRET` | JWT signing secret (required outside local development) |
| `NEXORA_JWT_EXPIRATION_MINUTES` | Access-token lifetime in minutes (default: `60`) |

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
not execute Flyway migrations. In `dev`, `GET /api/deals` reads only rows where
`deals.is_active = true`, `GET /api/giveaways` reads only rows where
`giveaways.is_active = true`, and `GET /api/wishlist` reads only rows where
`wishlist_items.is_active = true AND wishlist_items.user_id IS NULL`. User-owned
rows are intentionally excluded from the public demo response.

Verify the database-backed endpoint after starting the `dev` profile:

```bash
curl http://localhost:8080/api/deals
curl http://localhost:8080/api/giveaways
curl http://localhost:8080/api/wishlist
curl http://localhost:8080/api/dashboard/summary
```

## Basic authentication

Authentication uses BCrypt password hashes and stateless HS256 JWT access
tokens. The `dev` profile persists accounts in PostgreSQL through Flyway V4.
The database-free default profile uses an in-memory account store so local demo
APIs and tests continue to run without PostgreSQL; those accounts are lost when
the process restarts.

Start PostgreSQL and the database-backed API, overriding the local-only signing
secret:

```bash
export NEXORA_JWT_SECRET='replace-this-with-at-least-32-random-bytes'
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Register an account:

```bash
curl -i -X POST http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"player@example.com","username":"player_one","displayName":"Player One","password":"change-me-123"}'
```

Log in with either the email or username:

```bash
curl -i -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"emailOrUsername":"player@example.com","password":"change-me-123"}'
```

Copy the `token` value from either response, then request the protected account:

```bash
export NEXORA_TOKEN='<token-from-register-or-login>'
curl -i http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer ${NEXORA_TOKEN}"
```

## Per-user wishlist foundation

Flyway V5 adds nullable ownership to `wishlist_items`. Existing seeded rows keep
`user_id = NULL` and continue to power public `GET /api/wishlist`. Authenticated
wishlist endpoints derive the user id exclusively from the JWT principal; they
never accept a client-supplied user id.

After registering or logging in, capture a token:

```bash
export NEXORA_TOKEN="$(
  curl -sS -X POST http://localhost:8080/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"emailOrUsername":"player@example.com","password":"change-me-123"}' \
  | jq -r '.token'
)"
```

Add an item and capture its id:

```bash
export NEXORA_WISHLIST_ID="$(
  curl -sS -X POST http://localhost:8080/api/me/wishlist \
    -H "Authorization: Bearer ${NEXORA_TOKEN}" \
    -H 'Content-Type: application/json' \
    -d '{"title":"Hades II — Personal","store":"Steam","currentPrice":"$29.99","targetPrice":"$19.99","status":"tracking","alertActive":true,"priority":"high"}' \
  | jq -r '.id'
)"
```

List the current user's items:

```bash
curl -i http://localhost:8080/api/me/wishlist \
  -H "Authorization: Bearer ${NEXORA_TOKEN}"
```

Confirm the personal item is absent from the public demo wishlist:

```bash
curl -sS http://localhost:8080/api/wishlist \
  | jq '[.[] | select(.title == "Hades II — Personal")]'
```

Soft delete the personal item:

```bash
curl -i -X DELETE "http://localhost:8080/api/me/wishlist/${NEXORA_WISHLIST_ID}" \
  -H "Authorization: Bearer ${NEXORA_TOKEN}"
```

This is a per-user wishlist ownership and CRUD foundation only. It does not yet
include price history, live price alerts, external game data, sharing, or team
features.

This is an authentication foundation, not production-complete identity
management. Before deployment, use a generated secret from a secret manager,
serve only over HTTPS, and add rate limiting, email verification, password-reset
flows, token revocation/rotation, and operational audit controls. Refresh
tokens, roles, admin authorization, and OAuth login are intentionally not part
of this change.

To confirm inactive rows are excluded, update a development row and repeat the
request:

```sql
UPDATE deals SET is_active = FALSE WHERE id = 1;
UPDATE giveaways SET is_active = FALSE WHERE id = 1;
UPDATE wishlist_items SET is_active = FALSE WHERE id = 1;
```

## Frontend connection and CORS

The Next.js frontend reads the backend origin from
`NEXT_PUBLIC_API_BASE_URL`, which defaults to `http://localhost:8080` during
local development.

The backend allows browser requests to `/api/**` from these local origins:

- `http://localhost:3000` — production Next.js frontend in development
- `http://localhost:5173` — retained Vite prototype

## Future work

- Add database-backed catalog write workflows when the API is ready for them.
- Expand the authentication foundation with approved account-recovery and token lifecycle workflows.
- Add approved external game-store and pricing APIs.
- Add real Gemini integration for Sentinel with privacy and safety controls.
- Add production configuration, observability, and deployment support.
