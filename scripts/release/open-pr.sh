#!/usr/bin/env bash
set -euo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd -P)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

usage() {
    cat <<'USAGE'
Usage: scripts/release/open-pr.sh --title <title> --body <body>

Push the current branch to origin, open a pull request against main, and watch
its checks. This script never merges or tags.

Example:
  scripts/release/open-pr.sh \
    --title "PR title" \
    --body "PR body"
USAGE
}

PR_TITLE=""
PR_BODY=""

while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --title)
            [[ "$#" -ge 2 ]] || fail "--title requires a value."
            PR_TITLE="$2"
            shift 2
            ;;
        --body)
            [[ "$#" -ge 2 ]] || fail "--body requires a value."
            PR_BODY="$2"
            shift 2
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
done

[[ -n "${PR_TITLE}" ]] || fail "A non-empty --title is required."
[[ -n "${PR_BODY}" ]] || fail "A non-empty --body is required."

require_command git
require_command gh
enter_project_root

readonly CURRENT_BRANCH="$(git branch --show-current)"
[[ -n "${CURRENT_BRANCH}" ]] || fail "Detached HEAD is not supported."
[[ "${CURRENT_BRANCH}" != "main" ]] || fail "Cannot open a milestone PR from main."

print_section "Preflight"
require_clean_worktree
print_info "Current branch: ${CURRENT_BRANCH}"

print_section "Push branch"
if git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' >/dev/null 2>&1; then
    git push origin "${CURRENT_BRANCH}"
else
    git push --set-upstream origin "${CURRENT_BRANCH}"
fi

print_section "Create pull request"
gh pr create \
    --base main \
    --head "${CURRENT_BRANCH}" \
    --title "${PR_TITLE}" \
    --body "${PR_BODY}"

print_section "Pull request URL"
gh pr view --json url --jq '.url'

print_section "Watch pull request checks"
gh pr checks --watch

print_section "Final pull request URL"
gh pr view --json url --jq '.url'
print_info "Checks were watched; human review and a separate confirmed merge are still required."
