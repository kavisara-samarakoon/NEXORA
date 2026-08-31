# NEXORA Reviewer API Testing Guide

## Purpose

This guide provides a short, safe walkthrough of the NEXORA backend for
lecturers, reviewers, GitHub visitors, and developers. It uses the default
in-memory profile at `http://localhost:8080` and does not require PostgreSQL,
Gemini, SMTP, `jq`, or real credentials.

The examples demonstrate implemented behavior; they are not production
deployment or penetration-testing instructions. For endpoint-by-endpoint
details, see [`API_CONTRACT.md`](API_CONTRACT.md).

Reviewers can inspect the hand-maintained [`openapi.yaml`](openapi.yaml) for a
machine-readable route and schema overview. The manual curl guide below and the
smoke test remain the hands-on sources for verifying local API behavior.

## Local reviewer preflight

Before starting the backend on a fresh review machine, run the read-only
preflight from the repository root:

```bash
scripts/reviewer-local-preflight.sh
```

It verifies Java 17+, Maven, curl, Python 3, Git, Bash, required repository
paths, and the executable smoke/OpenAPI scripts. Node.js 20+ and npm are optional
warnings for API-only review but are needed for frontend review. The preflight
does not start services or prove production readiness; see the
[scripts guide](../../scripts/README.md#reviewer-local-preflight) for its full
safety boundary. [`Reviewer Tooling CI`](../../.github/workflows/reviewer-tooling-ci.yml)
guards the script's syntax, executable mode, and location-independent read-only
run. The reviewer flow itself remains local and manual.

## Quick automated smoke test

With the backend already running, execute the local-only
[`api-smoke-test.sh`](../../scripts/api-smoke-test.sh) from the repository root:

```bash
scripts/api-smoke-test.sh
```

The script verifies a safe subset of the documented public, CSRF/auth,
protected, Sentinel, and shared-error behavior. It generates a fake reviewer
identity, masks access-token output, uses a temporary cookie jar, and requires
no `jq`. See the [scripts guide](../../scripts/README.md) for safety controls and
environment options.

The manual curl flow below remains useful for learning each request, inspecting
responses, and debugging a failed smoke-test step. The script is the local
automated reviewer shortcut and does not start the backend automatically.
[`API Smoke CI`](../../.github/workflows/api-smoke-ci.yml) adds the pull-request
automation layer by starting a local backend and running that same script; it
does not replace manual API review when debugging behavior.

## Request correlation debugging runbook

Use this local runbook to connect the request ID returned to a client with the
same request ID in the backend console. It demonstrates the completed request-
correlation chain without putting the ID in a JSON response body.

### 1. Start the backend and keep its logs visible

In one terminal, start the backend from the repository root:

```bash
cd backend/nexora-api
mvn spring-boot:run
```

Keep this terminal open: request IDs appear in its backend console logs. Startup
and background-work lines may show `requestId=no-request-id`; those messages run
outside an HTTP request scope.

Run the remaining commands in a second terminal from the repository root.

### 2. Send a public request and capture its response

Write the response headers and JSON body to separate temporary files:

```bash
curl -sS -D /tmp/nexora-request-headers.txt \
  -o /tmp/nexora-request-body.json \
  http://localhost:8080/api/health
```

Inspect both files:

```bash
cat /tmp/nexora-request-headers.txt
cat /tmp/nexora-request-body.json
```

The headers should include a generated value:

```text
X-NEXORA-Request-ID: <generated-request-id>
```

### 3. Extract the generated request ID

This shell-safe extraction needs no `jq`:

```bash
export NEXORA_REQUEST_ID="$(
  awk 'BEGIN{IGNORECASE=1} /^X-NEXORA-Request-ID:/ {
    sub(/\r$/, "", $0)
    sub(/^[^:]+:[[:space:]]*/, "", $0)
    value=$0
  } END { print value }' /tmp/nexora-request-headers.txt
)"

printf 'Captured request ID: %s\n' "${NEXORA_REQUEST_ID}"
```

### 4. Match the request ID in backend logs

Look in the backend terminal for a line similar to:

```text
[requestId=<same-request-id>] ... RequestCorrelationFilter - API request completed method=GET path=/api/health status=200 durationMs=<number>
```

`requestId` comes from the MDC console pattern. The completion message
intentionally does not duplicate it. The message contains only `method`,
`path`, `status`, and `durationMs`; `path` is the URI path without query-string
data.

### 5. Confirm `requestId` is absent from the JSON body

Use the Python standard library so `jq` is not required:

```bash
python3 - <<'PY'
import json
from pathlib import Path

payload = json.loads(Path("/tmp/nexora-request-body.json").read_text())
if isinstance(payload, dict) and "requestId" in payload:
    raise SystemExit("requestId unexpectedly appeared in JSON body")
print("requestId is absent from JSON body")
PY
```

### 6. Check safe incoming request ID echo

Send a deliberately non-sensitive reviewer ID:

```bash
curl -sS -D /tmp/nexora-echo-headers.txt \
  -o /tmp/nexora-echo-body.json \
  -H 'X-NEXORA-Request-ID: reviewer-2026.08:runbook_test' \
  http://localhost:8080/api/health
```

The response header should echo `reviewer-2026.08:runbook_test`, and the backend
console should show `requestId=reviewer-2026.08:runbook_test` on the matching
completion line. The JSON body must still contain no `requestId` field.

### 7. Correlate an established error response

Call an account-owned route without authentication:

```bash
curl -sS -i -D /tmp/nexora-error-headers.txt \
  -o /tmp/nexora-error-body.json \
  http://localhost:8080/api/me/wishlist
```

Inspect the captured response:

```bash
cat /tmp/nexora-error-headers.txt
cat /tmp/nexora-error-body.json
```

Expect HTTP 401 and an `X-NEXORA-Request-ID` response header. The response JSON
uses shared error fields such as `error`, `message`, `status`, `path`,
`timestampUtc`, and `retryAfterSeconds`, but does not contain `requestId`. The
backend console should contain a matching safe completion line with
`method=GET path=/api/me/wishlist status=401 durationMs=<number>`.

### Safety boundary

The completion summary logs only the request ID from the MDC console pattern
and the bounded `method`, query-free `path`, `status`, and `durationMs` fields.
It does not log headers, cookies, Authorization values, Bearer tokens, CSRF
values, query strings, parameters, request bodies, or response bodies.

Do not paste real tokens, cookies, CSRF values, passwords, API keys, or provider
keys into logs, screenshots, pull requests, or issues. This runbook is local
debugging guidance only; it is not production tracing, centralized logging,
monitoring, alerting, or incident response. NEXORA remains not production-ready.

### 8. Clean up temporary files

```bash
rm -f /tmp/nexora-request-headers.txt \
  /tmp/nexora-request-body.json \
  /tmp/nexora-echo-headers.txt \
  /tmp/nexora-echo-body.json \
  /tmp/nexora-error-headers.txt \
  /tmp/nexora-error-body.json
```

## Prerequisites

- Java 17 or newer
- Maven 3.9 or newer
- `curl`
- A local checkout of NEXORA
- Optional: Node.js 20+ and npm if you also want to start the Next.js frontend

Use only the local demo identity shown below:

| Field | Local demo value |
| --- | --- |
| Email | `reviewer@example.com` |
| Username | `reviewer_user` |
| Password | `ChangeMeLocalOnly123!` |

Do not reuse these values for a real account. Do not paste real access tokens,
cookies, secrets, or credentials into review notes or issues.

## Start the backend in default local mode

From the repository root:

```bash
cd backend/nexora-api
mvn spring-boot:run
```

Wait for Spring Boot to report that the application has started. The default
profile needs no database and listens on:

```text
http://localhost:8080
```

Keep that terminal running. Use a second terminal for the remaining commands.

## Optional: start the frontend

The API walkthrough does not require the frontend. To run it separately:

```bash
cd frontend/nexora-web-next
npm run dev
```

The normal local Next.js origin is `http://localhost:3000`. Starting the
frontend does not change the API contract.

## Test public endpoints

Check the API welcome response:

```bash
curl -sS http://localhost:8080/api
```

Check the safe runtime summary:

```bash
curl -sS http://localhost:8080/api/health
```

Check curated deals:

```bash
curl -sS http://localhost:8080/api/deals
```

Other safe public checks include:

```bash
curl -sS http://localhost:8080/api/giveaways
curl -sS http://localhost:8080/api/wishlist
curl -sS http://localhost:8080/api/dashboard/summary
curl -sS http://localhost:8080/api/security/status
curl -sS http://localhost:8080/api/sentinel/status
curl -sS http://localhost:8080/api/sentinel/demo
```

Remember that `/api/wishlist`, `/api/security/status`, and `/api/sentinel/demo`
include demo/static presentation data. They are not personal account state,
live security evidence, or persistent AI conversation history.

## Test the CSRF and authentication flow

Browser-sensitive auth POST routes require a matching CSRF cookie/header pair.
The commands below use a temporary local cookie jar so `curl` can retain the
CSRF and refresh cookies.

### 1. Request the CSRF token

```bash
curl -sS -i \
  -c /tmp/nexora-reviewer-cookies.txt \
  -H 'Origin: http://localhost:3000' \
  http://localhost:8080/api/auth/csrf
```

The response body contains:

```json
{"csrfToken":"<CSRF_TOKEN>"}
```

Copy that value into a shell variable, replacing the placeholder:

```bash
export CSRF_TOKEN='<CSRF_TOKEN>'
```

Keep the cookie jar private. It will contain the matching CSRF cookie and,
after successful authentication, the HttpOnly refresh cookie represented here
as `<REFRESH_COOKIE>`.

### 2. Register the local reviewer account

```bash
curl -sS -i \
  -b /tmp/nexora-reviewer-cookies.txt \
  -c /tmp/nexora-reviewer-cookies.txt \
  -H 'Origin: http://localhost:3000' \
  -H "X-NEXORA-CSRF: ${CSRF_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "reviewer@example.com",
    "username": "reviewer_user",
    "displayName": "API Reviewer",
    "password": "ChangeMeLocalOnly123!"
  }' \
  http://localhost:8080/api/auth/register
```

A successful response is HTTP 201 and contains `token`, `tokenType`, and safe
user fields. It also updates the cookie jar with an HttpOnly refresh cookie.

If the account already exists in this running in-memory process, registration
returns `account_conflict`. Use the login step instead, or restart the backend
to clear default-profile account state.

### 3. Log in

Reuse the same CSRF token/cookie pair:

```bash
curl -sS -i \
  -b /tmp/nexora-reviewer-cookies.txt \
  -c /tmp/nexora-reviewer-cookies.txt \
  -H 'Origin: http://localhost:3000' \
  -H "X-NEXORA-CSRF: ${CSRF_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{
    "emailOrUsername": "reviewer@example.com",
    "password": "ChangeMeLocalOnly123!"
  }' \
  http://localhost:8080/api/auth/login
```

Copy the returned access token into a shell variable. Replace the placeholder;
do not include angle brackets around the real local value:

```bash
export ACCESS_TOKEN='<ACCESS_TOKEN>'
```

### 4. Optional refresh and logout checks

Refresh uses the HttpOnly refresh cookie in the cookie jar and the same CSRF
cookie/header pair:

```bash
curl -sS -i -X POST \
  -b /tmp/nexora-reviewer-cookies.txt \
  -c /tmp/nexora-reviewer-cookies.txt \
  -H 'Origin: http://localhost:3000' \
  -H "X-NEXORA-CSRF: ${CSRF_TOKEN}" \
  http://localhost:8080/api/auth/refresh
```

The response contains a new access token and rotates the refresh cookie. If you
continue testing after refresh, replace `ACCESS_TOKEN` with the new token.

Logout revokes the presented refresh session and clears its cookie:

```bash
curl -sS -i -X POST \
  -b /tmp/nexora-reviewer-cookies.txt \
  -c /tmp/nexora-reviewer-cookies.txt \
  -H 'Origin: http://localhost:3000' \
  -H "X-NEXORA-CSRF: ${CSRF_TOKEN}" \
  http://localhost:8080/api/auth/logout
```

Run logout after the protected-endpoint examples if you want to complete the
entire walkthrough in one session.

## Test protected endpoints with a Bearer token

Verify the current account:

```bash
curl -sS \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  http://localhost:8080/api/auth/me
```

List the current account’s personal wishlist:

```bash
curl -sS \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  http://localhost:8080/api/me/wishlist
```

Read notification preferences:

```bash
curl -sS \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  http://localhost:8080/api/me/notification-preferences
```

Request a bounded Sentinel insight using the default local provider:

```bash
curl -sS \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Summarize what this local Sentinel endpoint can do.",
    "context": "general"
  }' \
  http://localhost:8080/api/me/sentinel/insight
```

Sentinel output is preview guidance. It does not save the conversation or
autonomously alter wishlist/account data.

## Test the shared error contract

### Unauthenticated protected request

Call a protected route without the Bearer header:

```bash
curl -sS -i http://localhost:8080/api/me/wishlist
```

Expected status: HTTP 401. The JSON includes `authentication_required`, a safe
message, integer status, path, UTC timestamp, and nullable retry field.

### Validation error

With a valid `ACCESS_TOKEN`, send a blank Sentinel message:

```bash
curl -sS -i \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"message":"   ","context":"general"}' \
  http://localhost:8080/api/me/sentinel/insight
```

Expected status: HTTP 400 with `error: "validation_failed"` and the shared
metadata fields. The response must not echo the Bearer token or raw request
body.

The representative shape is:

```json
{
  "error": "validation_failed",
  "message": "The Sentinel gateway request could not be validated",
  "status": 400,
  "path": "/api/me/sentinel/insight",
  "timestampUtc": "2026-08-26T12:34:56Z",
  "retryAfterSeconds": null
}
```

The actual timestamp will differ.

## Test health and runtime status

```bash
curl -sS http://localhost:8080/api/health
```

In default mode, verify these safe labels:

- `status` is `UP`;
- `service` is `NEXORA API`;
- `runtimeMode` is `local-demo`;
- `activeProfiles` contains `default`;
- `dataMode` is `in-memory-demo`;
- normalized provider names are present; and
- `checks.authProductionGuard` is `inactive`.

The endpoint reports configuration mode and process uptime. It does not prove
database, external provider, email, deployment, or production availability.

## Optional dev/PostgreSQL mode

The normal reviewer flow should use the database-free default profile. If a
local PostgreSQL instance is already configured, the backend can instead be
started with:

```bash
cd backend/nexora-api
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

The `dev` profile uses the repository’s existing environment-driven datasource
configuration, Flyway V1–V10, and JPA schema validation. Do not put real
database credentials into commands, screenshots, or documentation. In this
mode, `/api/health` should report `dev-postgres` and `postgres-dev` without
returning datasource details.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Connection refused | Confirm the Spring Boot process is still running on port 8080. |
| `csrf_failed` | Fetch a fresh CSRF response, retain its cookie in the same jar, and send the matching `X-NEXORA-CSRF` header. |
| Origin rejected | Use the local configured origin `http://localhost:3000` exactly, without an extra path. |
| `authentication_required` | Set `ACCESS_TOKEN` to the current access token and send the Bearer header. |
| `authentication_failed` during refresh | The refresh cookie may be missing, expired, revoked, or already rotated; log in again with a valid CSRF pair. |
| `account_conflict` | The reviewer account already exists in the current process; log in or restart default mode. |
| `rate_limited` / `rate_limit_exceeded` | Wait for the returned `retryAfterSeconds`; local counters reset on backend restart. |
| PostgreSQL startup failure | Return to the default profile unless the optional local database and environment values are intentionally configured. |
| Shell shows literal `<ACCESS_TOKEN>` | Replace the placeholder with the local token returned by register/login. |

## Safety notes

- Keep all examples on `http://localhost:8080`.
- Use only the demo identity in this guide; never use a real password.
- Treat `<ACCESS_TOKEN>`, `<CSRF_TOKEN>`, and `<REFRESH_COOKIE>` as sensitive
  local credentials even though the application is a local MVP.
- Do not commit or share `/tmp/nexora-reviewer-cookies.txt`.
- Do not add real provider keys, SMTP credentials, database credentials, or
  production origins just to review the API.
- The default cookies use local HTTP settings and are not deployment settings.
- Public demo/status endpoints do not constitute security, uptime, or provider
  availability evidence.
- NEXORA is not production-ready.

After testing, remove the temporary local cookie jar:

```bash
rm -f /tmp/nexora-reviewer-cookies.txt
```
