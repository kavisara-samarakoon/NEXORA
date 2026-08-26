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

The script checks HTTP statuses and stable JSON fields without depending on
dynamic timestamps or provider-specific response text.

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
- Temporary response and cookie files are deleted through an exit trap.
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
