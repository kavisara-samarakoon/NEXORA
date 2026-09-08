#!/usr/bin/env bash
set -euo pipefail

readonly DEPLOYMENT_SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd -P)"
readonly PROJECT_ROOT="$(cd -- "${DEPLOYMENT_SCRIPT_DIR}/../.." >/dev/null 2>&1 && pwd -P)"
readonly BACKEND_DIR="${PROJECT_ROOT}/backend/nexora-api"

usage() {
    cat <<'EOF'
Usage: scripts/deployment/validate-hosted-postgres.sh

Runs the manual hosted-demo PostgreSQL persistence validation test.

This command is opt-in and must target a disposable hosted-demo database only.
It validates configuration, connectivity, Flyway history, and a read-only SQL
query. It does not deploy or create an environment file. Existing Flyway
migrations may initialize schema and seed data in the disposable database.
EOF
}

fail() {
    printf 'ERROR: %s\n' "$1" >&2
    exit 1
}

if (($# > 0)); then
    if (($# == 1)) && [[ "$1" == "--help" || "$1" == "-h" ]]; then
        usage
        exit 0
    fi

    usage >&2
    fail "Unexpected arguments."
fi

command -v mvn >/dev/null 2>&1 || fail "Required command not found: mvn"

readonly REQUIRED_ENVIRONMENT_VARIABLES=(
    "NEXORA_RUN_HOSTED_POSTGRES_VALIDATION"
    "SPRING_PROFILES_ACTIVE"
    "PORT"
    "NEXORA_DB_URL"
    "NEXORA_DB_USERNAME"
    "NEXORA_DB_PASSWORD"
    "NEXORA_JWT_SECRET"
    "NEXORA_REFRESH_TOKEN_HASH_SECRET"
    "NEXORA_AUTH_TRUSTED_ORIGINS"
)

printf 'NEXORA manual hosted PostgreSQL validation\n'
printf 'Project root: %s\n' "${PROJECT_ROOT}"
printf 'WARNING: Use only a disposable hosted-demo database.\n'
printf 'Existing Flyway migrations may initialize schema and seed data.\n'
printf 'No deployment or environment-file loading is performed.\n\n'
printf 'Required environment status (values redacted):\n'

for variable_name in "${REQUIRED_ENVIRONMENT_VARIABLES[@]}"; do
    variable_value="${!variable_name-}"
    [[ -n "${variable_value}" ]] \
        || fail "Required environment variable is missing or empty: ${variable_name}"
    printf '  %s: set (redacted)\n' "${variable_name}"
done

[[ "${NEXORA_RUN_HOSTED_POSTGRES_VALIDATION}" =~ ^([Tt][Rr][Uu][Ee])$ ]] \
    || fail "NEXORA_RUN_HOSTED_POSTGRES_VALIDATION must be true."
[[ "${SPRING_PROFILES_ACTIVE}" == "hosted-demo" ]] \
    || fail "SPRING_PROFILES_ACTIVE must be exactly hosted-demo."
[[ "${NEXORA_DB_URL}" == jdbc:postgresql://* ]] \
    || fail "NEXORA_DB_URL must use the jdbc:postgresql:// scheme."

jdbc_authority="${NEXORA_DB_URL#jdbc:postgresql://}"
jdbc_authority="${jdbc_authority%%/*}"
[[ "${jdbc_authority}" != *"@"* ]] \
    || fail "NEXORA_DB_URL must not embed credentials."
if printf '%s' "${NEXORA_DB_URL}" \
        | grep -Eqi '(^|[?&;])(password|passwd|user|username|token|secret)='; then
    fail "NEXORA_DB_URL must not contain credential query parameters."
fi

case "${NEXORA_DB_URL}" in
    *"//localhost"* | *"//localhost:"* | *"//127.0.0.1"* | *"//127.0.0.1:"* | *"//[::1]"* | *"//[::1]:"*)
        fail "NEXORA_DB_URL must identify an external hosted PostgreSQL database."
        ;;
esac

printf '\nStarting the opt-in hosted PostgreSQL validation test.\n'
cd -- "${BACKEND_DIR}"
mvn test -Dtest=HostedPostgresPersistenceValidationTests

printf '\nPASS: Hosted PostgreSQL persistence validation completed.\n'
printf 'No deployment was performed.\n'
