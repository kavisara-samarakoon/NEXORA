# NEXORA OpenAPI Contract

## Purpose

The NEXORA OpenAPI contract provides a machine-readable overview of the current
Spring Boot routes, request and response shapes, authentication boundaries, and
shared error response. It is intended for local/development reviewer
understanding and possible future client or tooling work.

## Current status

The completed v0.38 milestone created this hand-maintained, source-aligned
contract. The completed v0.39 milestone added a lightweight local checker and
API Contract CI validation on pull requests and pushes to `main`. Neither
milestone changes backend behavior, adds Swagger UI, or adds runtime generation.
The Java controllers and DTOs remain authoritative if this documentation and
the implementation diverge.

## Files

- [`openapi.yaml`](openapi.yaml) contains the OpenAPI 3.1 route and schema
  contract.
- [`OPENAPI_CONTRACT.md`](OPENAPI_CONTRACT.md) is this scope and maintenance
  guide.
- [`API_CONTRACT.md`](API_CONTRACT.md) remains the detailed human-readable API
  contract and explains runtime modes, security boundaries, and limitations.
- [`openapi-contract-check.py`](../../scripts/openapi-contract-check.py) is the
  Python standard-library structural guard.
- [`API Contract CI`](../../.github/workflows/api-contract-ci.yml) runs that
  checker without installing dependencies.

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

## Lightweight validation

[`openapi-contract-check.py`](../../scripts/openapi-contract-check.py) checks
the expected path and operation counts, endpoint and `operationId` markers,
required schemas and security schemes, shared error markers/codes, and the
localhost-only server assumption. API Contract CI runs the same transparent
check on pull requests and pushes to `main`.

The checker uses text and indentation-aware regular expressions from the Python
3 standard library. It is a focused NEXORA source-alignment guard, not a full
YAML parser, OpenAPI linter, JSON Schema validator, or runtime conformance test.

## Limitations

- The OpenAPI file is hand-maintained rather than generated; the lightweight
  checker does not prove full OpenAPI validity or runtime-route conformance.
- No Swagger UI, runtime schema endpoint, springdoc dependency, generated
  client, hosted documentation, or Postman collection is included.
- Flexible demo/status values are described structurally without promising
  fixed business wording or deployed availability.
- The contract documents a local/development API and makes no production
  readiness claim.

## Future work

Later milestones may consider full OpenAPI schema/lint validation, generated
clients, Postman import or a maintained collection, and hosted documentation
after their maintenance and deployment boundaries are reviewed.
Runtime-generated docs or Swagger UI would require a separate dependency and
security decision.
