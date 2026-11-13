#!/usr/bin/env bash
set -euo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd -P)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

usage() {
    cat <<'USAGE'
Usage: scripts/release/validate-milestone.sh [--skip-frontend] [--skip-smoke]

Run the common NEXORA milestone validation stack without installing
dependencies or changing Git state.

Options:
  --skip-frontend  Skip frontend lint, tests, build, and npm audit.
  --skip-smoke     Skip the API smoke test when the backend is not running.
  -h, --help       Show this help.
USAGE
}

SKIP_FRONTEND=false
SKIP_SMOKE=false

while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --skip-frontend)
            SKIP_FRONTEND=true
            ;;
        --skip-smoke)
            SKIP_SMOKE=true
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            usage >&2
            fail "Unknown argument: $1"
            ;;
    esac
    shift
done

run_check() {
    local label="$1"
    local exit_status
    shift

    print_section "${label}"
    if "$@"; then
        print_pass "${label}"
    else
        exit_status=$?
        printf 'FAIL: %s (exit %s)\n' "${label}" "${exit_status}" >&2
        exit "${exit_status}"
    fi
}

run_backend_tests() {
    (
        cd -- "${PROJECT_ROOT}/backend/nexora-api"
        mvn test
    )
}

run_frontend_lint() {
    (
        cd -- "${PROJECT_ROOT}/frontend/nexora-web-next"
        npm run lint
    )
}

run_frontend_tests() {
    (
        cd -- "${PROJECT_ROOT}/frontend/nexora-web-next"
        npm test
    )
}

run_frontend_build() {
    (
        cd -- "${PROJECT_ROOT}/frontend/nexora-web-next"
        npm run build
    )
}

run_frontend_audit() {
    (
        cd -- "${PROJECT_ROOT}/frontend/nexora-web-next"
        npm audit --omit=dev --audit-level=high
    )
}

require_command git
require_command mvn
require_command python3
enter_project_root

run_check "Git whitespace check" git diff --check
run_check "Git working tree summary" git status --short
run_check "Backend Maven tests" run_backend_tests

if [[ "${SKIP_FRONTEND}" == false ]]; then
    require_command npm
    run_check "Frontend lint" run_frontend_lint
    run_check "Frontend tests" run_frontend_tests
    run_check "Frontend build" run_frontend_build
    run_check "Frontend production dependency audit" run_frontend_audit
else
    print_section "Frontend validation"
    print_info "Skipped by --skip-frontend"
fi

run_check "OpenAPI contract check" \
    "${PROJECT_ROOT}/scripts/openapi-contract-check.py" \
    "${PROJECT_ROOT}/docs/api/openapi.yaml"
run_check "Reviewer local preflight" \
    "${PROJECT_ROOT}/scripts/reviewer-local-preflight.sh"

if [[ "${SKIP_SMOKE}" == false ]]; then
    run_check "API smoke test" "${PROJECT_ROOT}/scripts/api-smoke-test.sh"
else
    print_section "API smoke test"
    print_info "Skipped by --skip-smoke; use this when the local backend is not running."
fi

print_section "Validation result"
print_pass "All selected milestone checks passed"
