#!/usr/bin/env bash
set -euo pipefail

readonly RELEASE_SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd -P)"
readonly PROJECT_ROOT="$(cd -- "${RELEASE_SCRIPT_DIR}/../.." >/dev/null 2>&1 && pwd -P)"

print_section() {
    printf '\n=== %s ===\n' "$1"
}

print_pass() {
    printf 'PASS: %s\n' "$1"
}

print_info() {
    printf 'INFO: %s\n' "$1"
}

fail() {
    printf 'ERROR: %s\n' "$1" >&2
    exit 1
}

require_command() {
    command -v "$1" >/dev/null 2>&1 \
        || fail "Required command not found: $1"
}

enter_project_root() {
    cd -- "${PROJECT_ROOT}"
    print_info "Project root: ${PROJECT_ROOT}"
}

require_clean_worktree() {
    local worktree_status

    worktree_status="$(git status --porcelain --untracked-files=all)"
    if [[ -n "${worktree_status}" ]]; then
        printf '%s\n' "${worktree_status}" >&2
        fail "Working tree must be clean, including untracked files."
    fi

    print_pass "Working tree is clean"
}

confirm_exact() {
    local expected_text="$1"
    local response

    printf 'Type exactly "%s" to continue: ' "${expected_text}"
    IFS= read -r response || fail "Confirmation input was not received."
    [[ "${response}" == "${expected_text}" ]] \
        || fail "Confirmation did not match; no merge or tag was performed."
}
