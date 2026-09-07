#!/usr/bin/env bash
set -euo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd -P)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

usage() {
    cat <<'USAGE'
Usage: scripts/release/start-milestone.sh <branch-name>

Update local main from origin and create a new milestone branch.

Example:
  scripts/release/start-milestone.sh feature/backend-example-foundation
USAGE
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    usage
    exit 0
fi

[[ "$#" -eq 1 ]] || {
    usage >&2
    fail "Exactly one branch name is required."
}

readonly BRANCH_NAME="$1"

require_command git
enter_project_root

print_section "Preflight"
git check-ref-format --branch "${BRANCH_NAME}" >/dev/null 2>&1 \
    || fail "Invalid branch name: ${BRANCH_NAME}"
require_clean_worktree
if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
    fail "Local branch already exists: ${BRANCH_NAME}"
fi

print_section "Checkout main"
git switch main

print_section "Update main"
git pull --ff-only origin main

print_section "Create milestone branch"
git switch -c "${BRANCH_NAME}"

print_section "Final state"
git status
print_pass "Created and checked out ${BRANCH_NAME}"
