# NEXORA Scripts

## API smoke test

[`api-smoke-test.sh`](api-smoke-test.sh) provides a readable terminal check of
the documented NEXORA API flow. It is intended for local reviewers, lecturers,
students, and developers. It does not start the backend automatically.

This script is local validation only. It is not a load test, security scanner,
deployment check, production monitor, or production-readiness claim.

## What it checks

- Public welcome, health, catalog, dashboard, security-demo, and Sentinel-demo
  endpoints.
- CSRF cookie/header acquisition, reviewer account registration, login, and
  authenticated account lookup.
- Protected personal wishlist, alert-event, notification-preference, and local
  Sentinel insight endpoints.
- An unauthenticated 401 response and a Sentinel validation response using the
  shared API error fields.
- Generated UUID-style `X-NEXORA-Request-ID` response headers across public,
  CSRF/authentication, protected success, and established error responses.
- Exact response-header echoing of the safe incoming smoke ID
  `smoke-2026.08:request_test`, plus confirmation that error JSON bodies do not
  gain a `requestId` field.

The script captures response headers in a temporary file internally and checks
HTTP statuses, stable JSON fields, and request correlation without depending on
dynamic timestamps or provider-specific response text. It does not print full
response headers, cookies, CSRF tokens, or unmasked access tokens.

## Prerequisites

- Bash
- `curl`
- `mktemp`
- Python 3 standard library for JSON parsing
- A running NEXORA backend

No `jq`, third-party shell package, PostgreSQL server, or optional provider is
required for the default local flow.

## How to run

Start the backend first from the repository root:

```bash
cd backend/nexora-api
mvn spring-boot:run
```

In a second terminal, return to the repository root and run:

```bash
scripts/api-smoke-test.sh
```

The script exits non-zero on the first failure. If the backend is unavailable,
it reports the failed URL and reminds you to start or check the backend.

## API Smoke CI

The same local script runs in GitHub Actions through
[`api-smoke-ci.yml`](../.github/workflows/api-smoke-ci.yml). Before starting the
default backend, the workflow warms the Maven dependency/plugin graph with
bounded retries. It starts Maven in batch/no-transfer-progress mode, waits for
`/api/health`, and fails early with the last 160 backend log lines if the
Maven/backend process exits. It then runs the script against
`http://localhost:8080` and uploads the complete `backend-smoke.log` artifact
for debugging.

The script's endpoint, authentication, CSRF, and error-contract flow now also
validates `X-NEXORA-Request-ID` generated values, one safe echoed value, and
header presence on auth/error responses. The existing CI preparation and
diagnostics reduce the impact of a transient Maven Central HTTP 429 response
but still fail when dependency resolution remains unavailable or the backend
cannot start.

The CI workflow remains local-only and does not target production or staging.
Manual local execution is still useful before opening a pull request and when
debugging API behavior.

## OpenAPI contract check

Run the hand-maintained contract guard from the repository root:

```bash
scripts/openapi-contract-check.py
```

An explicit contract path is also accepted:

```bash
scripts/openapi-contract-check.py docs/api/openapi.yaml
```

The checker verifies the expected path and operation counts, required endpoint
and `operationId` markers, schema and security components, shared error fields
and codes, and the localhost-only server assumption. It uses only the Python 3
standard library and performs no network access.

This is not a full OpenAPI linter. It is a lightweight source-alignment guard
for NEXORA's hand-maintained contract. GitHub Actions runs the same command
through [`api-contract-ci.yml`](../.github/workflows/api-contract-ci.yml).

## Environment variables

Use the default local API explicitly when useful:

```bash
NEXORA_API_BASE_URL=http://localhost:8080 scripts/api-smoke-test.sh
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXORA_API_BASE_URL` | `http://localhost:8080` | API origin. Paths, query strings, fragments, and embedded credentials are rejected. |
| `NEXORA_SMOKE_ORIGIN` | `http://localhost:3000` | Origin header used by the existing auth CSRF/origin checks. |
| `NEXORA_ALLOW_NON_LOCAL_SMOKE_TEST` | `false` | Must be exactly `true` before a non-local API origin is accepted. |

Non-local targets are blocked by default. Only use the explicit override for a
target you are authorized to test, together with its approved API and trusted
origin configuration. The normal reviewer flow and every example in this guide
remain on localhost.

## Safety notes

- The script generates a unique fake `reviewer+<timestamp>@example.com`
  identity and never asks for real account credentials.
- Access tokens are kept in memory and displayed only as a short masked prefix.
- Cookies are kept in a temporary cookie jar whose contents are never printed.
- Temporary response-body, response-header, and cookie files are deleted
  through an exit trap; full headers are never printed.
- The script follows no redirects and sends no requests beyond the selected
  API origin.
- The default profile keeps the generated account in memory until the backend
  restarts. A deliberately selected persistent profile may retain the fake
  reviewer account.
- Do not use the script against a production service or with real personal
  information.

## Troubleshooting

| Failure | Check |
| --- | --- |
| Required command missing | Install Bash, `curl`, or Python 3 locally. |
| Backend cannot be reached | Start `backend/nexora-api` and confirm port 8080 is available. |
| `csrf_failed` | Keep the default local origin, or ensure an explicitly selected origin is trusted by that backend. |
| Registration conflict | Run again for a new timestamp-based fake account. |
| Non-local URL refused | Return to localhost, or set the override only for an approved target. |
| Unexpected status or JSON field | Review the backend output and compare the route with [`../docs/api/API_CONTRACT.md`](../docs/api/API_CONTRACT.md). |

For a step-by-step manual flow, see
[`../docs/api/REVIEWER_API_TESTING.md`](../docs/api/REVIEWER_API_TESTING.md).
