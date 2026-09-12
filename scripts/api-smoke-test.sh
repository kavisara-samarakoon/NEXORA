#!/usr/bin/env bash
set -euo pipefail

readonly DEFAULT_BASE_URL="http://localhost:8080"
readonly RAW_BASE_URL="${NEXORA_API_BASE_URL:-${DEFAULT_BASE_URL}}"
readonly BASE_URL="${RAW_BASE_URL%/}"
readonly SMOKE_ORIGIN="${NEXORA_SMOKE_ORIGIN:-http://localhost:3000}"
readonly ALLOW_NON_LOCAL="${NEXORA_ALLOW_NON_LOCAL_SMOKE_TEST:-false}"
readonly SMOKE_REQUEST_ID="smoke-2026.08:request_test"

TEMP_DIR=""
COOKIE_JAR=""
RESPONSE_BODY=""
RESPONSE_HEADERS=""
LAST_STATUS=""

pass() {
    printf 'PASS: %s\n' "$1"
}

fail() {
    printf 'FAIL: %s\n' "$1" >&2
    exit 1
}

info() {
    printf 'INFO: %s\n' "$1"
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

classify_url() {
    python3 - "$1" <<'PY'
import sys
from urllib.parse import urlsplit

try:
    parsed = urlsplit(sys.argv[1])
    _ = parsed.port
except ValueError:
    raise SystemExit(1)

if (
    parsed.scheme not in {"http", "https"}
    or not parsed.netloc
    or parsed.username is not None
    or parsed.password is not None
    or parsed.path not in {"", "/"}
    or parsed.query
    or parsed.fragment
):
    raise SystemExit(1)

host = (parsed.hostname or "").lower()
print("local" if host in {"localhost", "127.0.0.1", "::1"} else "non-local")
PY
}

cleanup() {
    if [[ -n "${TEMP_DIR}" && -d "${TEMP_DIR}" ]]; then
        rm -rf -- "${TEMP_DIR}"
    fi
}

request() {
    local method="$1"
    local path="$2"
    shift 2

    : >"${RESPONSE_BODY}"
    : >"${RESPONSE_HEADERS}"
    if ! LAST_STATUS="$(curl \
        --silent \
        --show-error \
        --connect-timeout 5 \
        --max-time 30 \
        --dump-header "${RESPONSE_HEADERS}" \
        --output "${RESPONSE_BODY}" \
        --write-out '%{http_code}' \
        --request "${method}" \
        "$@" \
        "${BASE_URL}${path}")"; then
        fail "Could not reach ${BASE_URL}${path}. Start the backend first and confirm the base URL."
    fi

    [[ "${LAST_STATUS}" =~ ^[0-9]{3}$ ]] \
        || fail "No valid HTTP status was returned for ${method} ${path}."
}

assert_status() {
    local expected="$1"
    local label="$2"

    [[ "${LAST_STATUS}" == "${expected}" ]] \
        || fail "${label} expected HTTP ${expected}, received HTTP ${LAST_STATUS}."
    pass "${label} (HTTP ${LAST_STATUS})"
}

assert_json_document() {
    local file="$1"
    local label="$2"

    python3 - "${file}" <<'PY' || fail "${label} did not return valid JSON."
import json
import sys

try:
    with open(sys.argv[1], encoding="utf-8") as response_file:
        json.load(response_file)
except (OSError, UnicodeError, json.JSONDecodeError):
    raise SystemExit(1)
PY
}

assert_json_field() {
    local file="$1"
    local field="$2"
    local label="$3"

    python3 - "${file}" "${field}" <<'PY' \
        || fail "${label} is missing JSON field '${field}'."
import json
import sys

try:
    with open(sys.argv[1], encoding="utf-8") as response_file:
        payload = json.load(response_file)
except (OSError, UnicodeError, json.JSONDecodeError):
    raise SystemExit(1)

if not isinstance(payload, dict) or sys.argv[2] not in payload:
    raise SystemExit(1)
PY
}

assert_json_field_absent() {
    local file="$1"
    local field="$2"
    local label="$3"

    python3 - "${file}" "${field}" <<'PY' \
        || fail "${label} unexpectedly includes JSON field '${field}'."
import json
import sys

try:
    with open(sys.argv[1], encoding="utf-8") as response_file:
        payload = json.load(response_file)
except (OSError, UnicodeError, json.JSONDecodeError):
    raise SystemExit(1)

if not isinstance(payload, dict) or sys.argv[2] in payload:
    raise SystemExit(1)
PY
    pass "${label} omits JSON field '${field}'"
}

response_header_value() {
    local header_name="$1"

    python3 - "${RESPONSE_HEADERS}" "${header_name}" <<'PY'
import sys

header_path = sys.argv[1]
header_name = sys.argv[2].lower()
last_value = ""

try:
    with open(header_path, encoding="iso-8859-1") as header_file:
        for raw_line in header_file:
            line = raw_line.rstrip("\r\n")
            name, separator, value = line.partition(":")
            if separator and name.strip().lower() == header_name:
                candidate = value.strip()
                if candidate:
                    last_value = candidate
except (OSError, UnicodeError):
    raise SystemExit(1)

print(last_value)
PY
}

assert_response_header_exists() {
    local header_name="$1"
    local label="$2"
    local value

    value="$(response_header_value "${header_name}")" \
        || fail "${label} response header '${header_name}' could not be inspected."
    [[ -n "${value}" ]] \
        || fail "${label} is missing response header '${header_name}'."
    pass "${label} includes response header '${header_name}'"
}

assert_request_id_header_exists() {
    local label="$1"

    assert_response_header_exists "X-NEXORA-Request-ID" "${label}"
}

assert_request_id_header_equals() {
    local expected="$1"
    local label="$2"
    local value

    value="$(response_header_value "X-NEXORA-Request-ID")" \
        || fail "${label} request ID response header could not be inspected."
    [[ -n "${value}" ]] \
        || fail "${label} is missing response header 'X-NEXORA-Request-ID'."
    [[ "${value}" == "${expected}" ]] \
        || fail "${label} did not echo the expected safe request ID."
    pass "${label} echoed the expected safe request ID"
}

assert_generated_request_id_header() {
    local label="$1"
    local value

    value="$(response_header_value "X-NEXORA-Request-ID")" \
        || fail "${label} request ID response header could not be inspected."
    [[ -n "${value}" ]] \
        || fail "${label} is missing response header 'X-NEXORA-Request-ID'."
    [[ "${value}" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ ]] \
        || fail "${label} request ID response header is not UUID-style."
    pass "${label} includes a generated UUID-style request ID"
}

extract_json_field() {
    local file="$1"
    local field="$2"

    python3 - "${file}" "${field}" <<'PY'
import json
import sys

try:
    with open(sys.argv[1], encoding="utf-8") as response_file:
        payload = json.load(response_file)
except (OSError, UnicodeError, json.JSONDecodeError):
    raise SystemExit(1)

if not isinstance(payload, dict) or sys.argv[2] not in payload:
    raise SystemExit(1)

value = payload[sys.argv[2]]
if value is None or isinstance(value, (dict, list)):
    raise SystemExit(1)
if isinstance(value, bool):
    print("true" if value else "false")
else:
    print(value)
PY
}

assert_error_contract() {
    local label="$1"
    local field

    for field in error message status path timestampUtc; do
        assert_json_field "${RESPONSE_BODY}" "${field}" "${label}"
    done
    pass "${label} includes the shared error fields"
}

masked_token() {
    local token="$1"
    if (( ${#token} <= 6 )); then
        printf '<masked>'
    else
        printf '%s...<masked>' "${token:0:6}"
    fi
}

check_public_get() {
    local path="$1"
    local label="$2"

    request GET "${path}"
    assert_status 200 "${label}"
    assert_json_document "${RESPONSE_BODY}" "${label}"
    assert_generated_request_id_header "${label}"
}

check_protected_get() {
    local path="$1"
    local label="$2"
    local token="$3"

    request GET "${path}" --header "Authorization: Bearer ${token}"
    assert_status 200 "${label}"
    assert_json_document "${RESPONSE_BODY}" "${label}"
    assert_generated_request_id_header "${label}"
}

require_command curl
require_command mktemp
require_command python3

URL_SCOPE="$(classify_url "${BASE_URL}")" \
    || fail "NEXORA_API_BASE_URL must be an HTTP(S) origin without credentials, path, query, or fragment."
classify_url "${SMOKE_ORIGIN}" >/dev/null \
    || fail "NEXORA_SMOKE_ORIGIN must be an HTTP(S) origin without credentials, path, query, or fragment."

if [[ "${URL_SCOPE}" == "non-local" && "${ALLOW_NON_LOCAL}" != "true" ]]; then
    fail "Refusing non-local API URL '${BASE_URL}'. Set NEXORA_ALLOW_NON_LOCAL_SMOKE_TEST=true only for an explicitly approved target."
fi

if [[ "${URL_SCOPE}" == "non-local" ]]; then
    info "Non-local smoke testing was explicitly enabled; only fake reviewer data will be sent."
fi

TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/nexora-api-smoke.XXXXXX")"
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
COOKIE_JAR="$(mktemp "${TEMP_DIR}/cookies.XXXXXX")"
RESPONSE_BODY="$(mktemp "${TEMP_DIR}/response.XXXXXX")"
RESPONSE_HEADERS="$(mktemp "${TEMP_DIR}/headers.XXXXXX")"

readonly SMOKE_TIMESTAMP="$(python3 - <<'PY'
from datetime import datetime, timezone

print(datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f"))
PY
)"
readonly REVIEWER_EMAIL="reviewer+${SMOKE_TIMESTAMP}@example.com"
readonly REVIEWER_USERNAME="reviewer_${SMOKE_TIMESTAMP}"
readonly REVIEWER_DISPLAY_NAME="Reviewer Smoke Test"
readonly REVIEWER_PASSWORD="$(python3 - <<'PY_PASSWORD'
import secrets

print(secrets.token_urlsafe(24))
PY_PASSWORD
)"

printf 'NEXORA API smoke test\n'
printf 'Base URL: %s\n' "${BASE_URL}"
printf 'Identity: generated reviewer account (%s)\n\n' "${REVIEWER_EMAIL}"

info "Checking public endpoints"
check_public_get "/api" "API welcome"
check_public_get "/api/health" "Runtime health"
check_public_get "/api/deals" "Deals catalog"
check_public_get "/api/giveaways" "Giveaways catalog"
check_public_get "/api/wishlist" "Public demo wishlist"
check_public_get "/api/dashboard/summary" "Dashboard summary"
check_public_get "/api/security/status" "Security demo status"
check_public_get "/api/sentinel/status" "Sentinel status"
check_public_get "/api/sentinel/demo" "Sentinel demo"

printf '\n'
info "Checking request correlation header"
request GET "/api/health" \
    --header "X-NEXORA-Request-ID: ${SMOKE_REQUEST_ID}"
assert_status 200 "Safe request ID echo"
assert_json_document "${RESPONSE_BODY}" "Safe request ID echo"
assert_request_id_header_equals "${SMOKE_REQUEST_ID}" "Safe request ID echo"

printf '\n'
info "Checking CSRF and authentication flow"
request GET "/api/auth/csrf" \
    --cookie-jar "${COOKIE_JAR}" \
    --header "Origin: ${SMOKE_ORIGIN}"
assert_status 200 "CSRF token"
assert_json_document "${RESPONSE_BODY}" "CSRF token"
assert_generated_request_id_header "CSRF token"
assert_json_field "${RESPONSE_BODY}" "csrfToken" "CSRF token"
if ! CSRF_TOKEN="$(extract_json_field "${RESPONSE_BODY}" "csrfToken")" \
    || [[ -z "${CSRF_TOKEN}" ]]; then
    fail "CSRF response did not contain a usable csrfToken."
fi

printf -v REGISTER_PAYLOAD \
    '{"email":"%s","username":"%s","displayName":"%s","password":"%s"}' \
    "${REVIEWER_EMAIL}" \
    "${REVIEWER_USERNAME}" \
    "${REVIEWER_DISPLAY_NAME}" \
    "${REVIEWER_PASSWORD}"
request POST "/api/auth/register" \
    --cookie "${COOKIE_JAR}" \
    --cookie-jar "${COOKIE_JAR}" \
    --header "Origin: ${SMOKE_ORIGIN}" \
    --header "X-NEXORA-CSRF: ${CSRF_TOKEN}" \
    --header "Content-Type: application/json" \
    --data "${REGISTER_PAYLOAD}"
assert_status 201 "Register reviewer account"
assert_json_document "${RESPONSE_BODY}" "Register reviewer account"
assert_generated_request_id_header "Register reviewer account"
assert_json_field "${RESPONSE_BODY}" "token" "Register reviewer account"
assert_json_field "${RESPONSE_BODY}" "user" "Register reviewer account"
if ! ACCESS_TOKEN="$(extract_json_field "${RESPONSE_BODY}" "token")" \
    || [[ -z "${ACCESS_TOKEN}" ]]; then
    fail "Registration response did not contain a usable access token."
fi
info "Registration access token: $(masked_token "${ACCESS_TOKEN}")"

request GET "/api/auth/me" \
    --header "Authorization: Bearer ${ACCESS_TOKEN}"
assert_status 200 "Current authenticated user"
assert_json_document "${RESPONSE_BODY}" "Current authenticated user"
assert_generated_request_id_header "Current authenticated user"
assert_json_field "${RESPONSE_BODY}" "email" "Current authenticated user"

printf -v LOGIN_PAYLOAD \
    '{"emailOrUsername":"%s","password":"%s"}' \
    "${REVIEWER_EMAIL}" \
    "${REVIEWER_PASSWORD}"
request POST "/api/auth/login" \
    --cookie "${COOKIE_JAR}" \
    --cookie-jar "${COOKIE_JAR}" \
    --header "Origin: ${SMOKE_ORIGIN}" \
    --header "X-NEXORA-CSRF: ${CSRF_TOKEN}" \
    --header "Content-Type: application/json" \
    --data "${LOGIN_PAYLOAD}"
assert_status 200 "Login reviewer account"
assert_json_document "${RESPONSE_BODY}" "Login reviewer account"
assert_generated_request_id_header "Login reviewer account"
assert_json_field "${RESPONSE_BODY}" "token" "Login reviewer account"
if ! LOGIN_ACCESS_TOKEN="$(extract_json_field "${RESPONSE_BODY}" "token")" \
    || [[ -z "${LOGIN_ACCESS_TOKEN}" ]]; then
    fail "Login response did not contain a usable access token."
fi
ACCESS_TOKEN="${LOGIN_ACCESS_TOKEN}"
info "Login access token: $(masked_token "${ACCESS_TOKEN}")"

request POST "/api/auth/refresh" \
    --cookie "${COOKIE_JAR}" \
    --cookie-jar "${COOKIE_JAR}" \
    --header "Origin: ${SMOKE_ORIGIN}" \
    --header "X-NEXORA-CSRF: ${CSRF_TOKEN}"
assert_status 200 "Refresh session through cookie jar"
assert_json_document "${RESPONSE_BODY}" "Refresh session"
assert_generated_request_id_header "Refresh session"
if ! ACCESS_TOKEN="$(extract_json_field "${RESPONSE_BODY}" "token")" \
    || [[ -z "${ACCESS_TOKEN}" ]]; then
    fail "Refresh response did not contain a usable access token."
fi
check_protected_get "/api/auth/me" "Account with refreshed access token" "${ACCESS_TOKEN}"

printf '\n'
info "Checking protected endpoints"
check_protected_get "/api/me/wishlist" "Personal wishlist" "${ACCESS_TOKEN}"
check_protected_get "/api/me/wishlist/alert-events" "Wishlist alert events" "${ACCESS_TOKEN}"
check_protected_get "/api/me/notification-preferences" "Notification preferences" "${ACCESS_TOKEN}"

request POST "/api/me/sentinel/insight" \
    --header "Authorization: Bearer ${ACCESS_TOKEN}" \
    --header "Content-Type: application/json" \
    --data '{"message":"Summarize this local smoke-test context safely.","context":"general"}'
assert_status 200 "Sentinel local insight"
assert_json_document "${RESPONSE_BODY}" "Sentinel local insight"
assert_generated_request_id_header "Sentinel local insight"
assert_json_field "${RESPONSE_BODY}" "mode" "Sentinel local insight"
assert_json_field "${RESPONSE_BODY}" "answer" "Sentinel local insight"

printf '\n'
info "Checking shared API error contract"
request GET "/api/me/wishlist"
assert_status 401 "Unauthenticated protected request"
assert_json_document "${RESPONSE_BODY}" "Unauthenticated protected request"
assert_error_contract "Unauthenticated protected request"
assert_generated_request_id_header "Unauthenticated protected request"
assert_json_field_absent "${RESPONSE_BODY}" "requestId" "Unauthenticated protected request"
UNAUTHENTICATED_ERROR="$(extract_json_field "${RESPONSE_BODY}" "error")" \
    || fail "Unauthenticated response error code could not be read."
UNAUTHENTICATED_PATH="$(extract_json_field "${RESPONSE_BODY}" "path")" \
    || fail "Unauthenticated response path could not be read."
[[ "${UNAUTHENTICATED_ERROR}" == "authentication_required" ]] \
    || fail "Unauthenticated request returned an unexpected error code."
[[ "${UNAUTHENTICATED_PATH}" == "/api/me/wishlist" ]] \
    || fail "Unauthenticated error path did not match the request path."

request POST "/api/me/sentinel/insight" \
    --header "Authorization: Bearer ${ACCESS_TOKEN}" \
    --header "Content-Type: application/json" \
    --data '{"message":"   ","context":"general"}'
assert_status 400 "Sentinel validation error"
assert_json_document "${RESPONSE_BODY}" "Sentinel validation error"
assert_error_contract "Sentinel validation error"
assert_generated_request_id_header "Sentinel validation error"
assert_json_field_absent "${RESPONSE_BODY}" "requestId" "Sentinel validation error"
VALIDATION_ERROR="$(extract_json_field "${RESPONSE_BODY}" "error")" \
    || fail "Validation response error code could not be read."
VALIDATION_STATUS="$(extract_json_field "${RESPONSE_BODY}" "status")" \
    || fail "Validation response status could not be read."
VALIDATION_PATH="$(extract_json_field "${RESPONSE_BODY}" "path")" \
    || fail "Validation response path could not be read."
[[ "${VALIDATION_ERROR}" == "validation_failed" ]] \
    || fail "Validation request returned an unexpected error code."
[[ "${VALIDATION_STATUS}" == "400" ]] \
    || fail "Validation error body did not report status 400."
[[ "${VALIDATION_PATH}" == "/api/me/sentinel/insight" ]] \
    || fail "Validation error path did not match the request path."

printf '\n'
info "Checking logout and post-logout refresh denial"
request POST "/api/auth/logout" \
    --cookie "${COOKIE_JAR}" \
    --cookie-jar "${COOKIE_JAR}" \
    --header "Origin: ${SMOKE_ORIGIN}" \
    --header "X-NEXORA-CSRF: ${CSRF_TOKEN}"
assert_status 204 "Logout reviewer session"
assert_generated_request_id_header "Logout reviewer session"
request POST "/api/auth/refresh" \
    --cookie "${COOKIE_JAR}" \
    --cookie-jar "${COOKIE_JAR}" \
    --header "Origin: ${SMOKE_ORIGIN}" \
    --header "X-NEXORA-CSRF: ${CSRF_TOKEN}"
assert_status 401 "Refresh denied after logout"
assert_error_contract "Refresh denied after logout"
assert_generated_request_id_header "Refresh denied after logout"

printf '\nNEXORA API smoke test completed successfully.\n'
