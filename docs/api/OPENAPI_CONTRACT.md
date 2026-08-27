# NEXORA OpenAPI Contract

## Purpose

The NEXORA OpenAPI contract provides a machine-readable overview of the current
Spring Boot routes, request and response shapes, authentication boundaries, and
shared error response. It is intended for local/development reviewer
understanding and possible future client or tooling work.

## Current status

The contract is hand-maintained and source-aligned for the in-progress v0.38
documentation milestone. It does not change backend behavior, add Swagger UI,
or add runtime generation. The Java controllers and DTOs remain authoritative
if this documentation and the implementation diverge.

## Files

- [`openapi.yaml`](openapi.yaml) contains the OpenAPI 3.1 route and schema
  contract.
- [`OPENAPI_CONTRACT.md`](OPENAPI_CONTRACT.md) is this scope and maintenance
  guide.
- [`API_CONTRACT.md`](API_CONTRACT.md) remains the detailed human-readable API
  contract and explains runtime modes, security boundaries, and limitations.

## How to read the contract

Start with `paths` for operations and status codes, then follow component
references into `schemas`, `responses`, and `securitySchemes`. The only listed
server is the local backend at `http://localhost:8080`. Nullable properties use
OpenAPI 3.1 JSON Schema types that include `null`.

## How it relates to API_CONTRACT.md

[`API_CONTRACT.md`](API_CONTRACT.md) provides the explanatory source-aligned
contract. `openapi.yaml` complements it with a structured route/schema view; it
does not replace the human-readable security, profile, and maturity guidance.

## How it relates to REVIEWER_API_TESTING.md

[`REVIEWER_API_TESTING.md`](REVIEWER_API_TESTING.md) remains the copyable manual
curl walkthrough for learning and debugging actual local API behavior. The
OpenAPI file is a reference, not proof that a request succeeds at runtime.

## How it relates to scripts/api-smoke-test.sh

[`scripts/api-smoke-test.sh`](../../scripts/api-smoke-test.sh) exercises a safe
local subset of public, auth/CSRF, protected, Sentinel, and shared-error
behavior. It remains the automated reviewer shortcut; the OpenAPI contract does
not execute or validate those behaviors.

## How it relates to API Smoke CI

[`API Smoke CI`](../../.github/workflows/api-smoke-ci.yml) starts the backend on
localhost, waits for health, runs the existing smoke script, and retains backend
logs. It does not currently validate `openapi.yaml` or generate the contract.

## Limitations

- The OpenAPI file is hand-maintained rather than generated or automatically
  verified against runtime routes.
- No Swagger UI, runtime schema endpoint, springdoc dependency, generated
  client, hosted documentation, or Postman collection is included.
- Flexible demo/status values are described structurally without promising
  fixed business wording or deployed availability.
- The contract documents a local/development API and makes no production
  readiness claim.

## Future work

Later milestones may consider automated schema validation, generated clients,
Postman import or a maintained collection, and hosted documentation after their
maintenance and deployment boundaries are reviewed. Runtime-generated docs or
Swagger UI would require a separate dependency and security decision.
