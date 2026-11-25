#!/usr/bin/env bash
set -u

FAILURE_COUNT=0
WARNING_COUNT=0

pass() {
    printf 'PASS: %s\n' "$1"
}

warn() {
    WARNING_COUNT=$((WARNING_COUNT + 1))
    printf 'WARN: %s\n' "$1"
}

fail() {
    FAILURE_COUNT=$((FAILURE_COUNT + 1))
    printf 'FAIL: %s\n' "$1" >&2
}

info() {
    printf 'INFO: %s\n' "$1"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

check_required_command() {
    local command_name="$1"
    local display_name="$2"

    if command_exists "${command_name}"; then
        pass "${display_name} is available"
        return 0
    fi

    fail "Required command not found: ${command_name}"
    return 1
}

version_major() {
    local version="${1#v}"
    local major="${version%%.*}"
    local remainder

    if [[ "${major}" == "1" ]]; then
        remainder="${version#*.}"
        major="${remainder%%.*}"
    fi

    [[ "${major}" =~ ^[0-9]+$ ]] || return 1
    printf '%s\n' "${major}"
}

version_major_minor() {
    local version="${1#v}"
    local major="${version%%.*}"
    local remainder="${version#*.}"
    local minor="${remainder%%.*}"

    [[ "${major}" =~ ^[0-9]+$ && "${minor}" =~ ^[0-9]+$ ]] || return 1
    printf '%s %s\n' "${major}" "${minor}"
}

check_java_version() {
    local output
    local version
    local major

    output="$(java -version 2>&1)"
    version="$(printf '%s\n' "${output}" | awk -F '"' '/version/ { print $2; exit }')"

    if [[ -z "${version}" ]]; then
        fail "Could not determine the Java version; Java 17 or newer is required"
        return
    fi

    pass "Java version is ${version}"
    if major="$(version_major "${version}")"; then
        if ((major >= 17)); then
            pass "Java satisfies 17+"
        else
            fail "Java 17 or newer is required; found ${version}"
        fi
    else
        fail "Could not parse Java version ${version}; Java 17 or newer is required"
    fi
}

check_maven_version() {
    local output
    local version
    local components
    local major
    local minor

    output="$(mvn -version 2>&1)"
    version="$(printf '%s\n' "${output}" | awk '
        match($0, /Apache Maven [0-9]+(\.[0-9]+)+/) {
            value = substr($0, RSTART, RLENGTH)
            sub(/^Apache Maven /, "", value)
            print value
            exit
        }
    ')"

    if [[ -z "${version}" ]]; then
        warn "Maven is available, but its version could not be parsed; Maven 3.9+ is recommended"
        return
    fi

    pass "Maven version is ${version}"
    if components="$(version_major_minor "${version}")"; then
        major="${components%% *}"
        minor="${components##* }"
        if ((major < 3 || (major == 3 && minor < 9))); then
            warn "Maven ${version} is below the recommended Maven 3.9+"
        else
            pass "Maven satisfies the recommended 3.9+"
        fi
    else
        warn "Could not compare Maven version ${version}; Maven 3.9+ is recommended"
    fi
}

check_python_version() {
    local output
    local version
    local major

    output="$(python3 --version 2>&1)"
    version="$(printf '%s\n' "${output}" | awk 'NR == 1 { print $2; exit }')"

    if [[ -z "${version}" ]]; then
        fail "Could not determine the Python version; Python 3 is required"
        return
    fi

    pass "Python version is ${version}"
    if major="$(version_major "${version}")" && ((major == 3)); then
        pass "Python satisfies the required 3.x version"
    else
        fail "Python 3 is required; found ${version}"
    fi
}

check_optional_frontend_tools() {
    local output
    local version
    local major

    if command_exists node; then
        output="$(node --version 2>&1)"
        version="${output%%$'\n'*}"
        if major="$(version_major "${version}")"; then
            if ((major == 24)); then
                pass "Node.js version ${version#v} satisfies the recommended 24.x"
            else
                warn "Node.js ${version#v} differs from the recommended 24.x for frontend review"
            fi
        else
            warn "Node.js is available, but its version could not be parsed; Node.js 24.x is recommended"
        fi
    else
        warn "Node.js was not found; frontend review requires Node.js 24.x"
    fi

    if command_exists npm; then
        output="$(npm --version 2>&1)"
        version="${output%%$'\n'*}"
        if [[ -n "${version}" ]]; then
            pass "npm is available (version ${version})"
        else
            pass "npm is available"
        fi
    else
        warn "npm was not found; it is needed for frontend review"
    fi
}

check_file() {
    local relative_path="$1"

    if [[ -f "${REPO_ROOT}/${relative_path}" ]]; then
        pass "${relative_path} exists"
    else
        fail "Required file is missing: ${relative_path}"
    fi
}

check_executable() {
    local relative_path="$1"

    if [[ -f "${REPO_ROOT}/${relative_path}" && -x "${REPO_ROOT}/${relative_path}" ]]; then
        pass "${relative_path} is executable"
    else
        fail "Required executable is missing or not executable: ${relative_path}"
    fi
}

check_directory() {
    local relative_path="$1"

    if [[ -d "${REPO_ROOT}/${relative_path}" ]]; then
        pass "${relative_path} exists"
    else
        fail "Required directory is missing: ${relative_path}"
    fi
}

check_recommended_file() {
    local relative_path="$1"

    if [[ -f "${REPO_ROOT}/${relative_path}" ]]; then
        pass "${relative_path} exists"
    else
        warn "Recommended repository file is missing: ${relative_path}"
    fi
}

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd -P)"
readonly REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." >/dev/null 2>&1 && pwd -P)"

printf 'NEXORA reviewer local preflight\n'
printf 'Repository root: %s\n\n' "${REPO_ROOT}"
info "Local readiness only; this is not a production readiness check."
info "No services, tests, installs, network requests, or secret reads are performed."

printf '\nRequired local tools\n'
check_required_command git "git"
if check_required_command java "Java"; then
    check_java_version
fi
if check_required_command mvn "Maven"; then
    check_maven_version
fi
check_required_command curl "curl"
if check_required_command python3 "Python 3"; then
    check_python_version
fi
check_required_command bash "Bash"

printf '\nOptional frontend tools\n'
check_optional_frontend_tools

printf '\nRequired repository structure\n'
check_directory "backend/nexora-api"
check_directory "frontend/nexora-web-next"
check_executable "scripts/api-smoke-test.sh"
check_executable "scripts/openapi-contract-check.py"
check_file "docs/api/REVIEWER_API_TESTING.md"
check_file "docs/api/API_CONTRACT.md"
check_file "docs/api/openapi.yaml"
check_file "README.md"
check_file "RELEASES.md"

printf '\nRecommended repository files\n'
check_recommended_file "frontend/nexora-web-next/package.json"
check_recommended_file "backend/nexora-api/pom.xml"
check_recommended_file ".github/workflows/backend-ci.yml"

printf '\n'
if ((FAILURE_COUNT > 0)); then
    printf 'Preflight failed (%d required check(s) failed, %d warning(s))\n' \
        "${FAILURE_COUNT}" "${WARNING_COUNT}" >&2
    exit 1
fi

if ((WARNING_COUNT > 0)); then
    printf 'Preflight passed with warnings (%d warning(s))\n' "${WARNING_COUNT}"
else
    printf 'Preflight passed\n'
fi

exit 0
