#!/usr/bin/env bash
set -euo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd -P)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

usage() {
    cat <<'USAGE'
Usage: scripts/release/merge-and-tag.sh --pr <number> --tag <tag> --message <message>

Verify a main-targeted PR and its checks, require typed confirmation, merge it,
delete its branch, update main, and create and push an annotated release tag.

Example:
  scripts/release/merge-and-tag.sh \
    --pr 72 \
    --tag v0.70.0-example-foundation \
    --message "NEXORA v0.70.0 Example Foundation"
USAGE
}

PR_NUMBER=""
TAG_NAME=""
TAG_MESSAGE=""

while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --pr)
            [[ "$#" -ge 2 ]] || fail "--pr requires a value."
            PR_NUMBER="$2"
            shift 2
            ;;
        --tag)
            [[ "$#" -ge 2 ]] || fail "--tag requires a value."
            TAG_NAME="$2"
            shift 2
            ;;
        --message)
            [[ "$#" -ge 2 ]] || fail "--message requires a value."
            TAG_MESSAGE="$2"
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

[[ "${PR_NUMBER}" =~ ^[1-9][0-9]*$ ]] \
    || fail "--pr must be a positive pull request number."
[[ -n "${TAG_NAME}" ]] || fail "A non-empty --tag is required."
[[ -n "${TAG_MESSAGE}" ]] || fail "A non-empty --message is required."

require_command git
require_command gh
enter_project_root

tag_exists_remotely() {
    local remote_status

    if git ls-remote --exit-code --tags origin "refs/tags/${TAG_NAME}"; then
        return 0
    else
        remote_status=$?
        [[ "${remote_status}" -eq 2 ]] \
            || fail "Could not verify whether ${TAG_NAME} exists on origin."
        return 1
    fi
}

require_tag_absent() {
    if git show-ref --verify --quiet "refs/tags/${TAG_NAME}"; then
        fail "Tag already exists locally: ${TAG_NAME}"
    fi
    if tag_exists_remotely; then
        fail "Tag already exists on origin: ${TAG_NAME}"
    fi
    print_pass "Tag is absent locally and on origin: ${TAG_NAME}"
}

print_section "Preflight"
require_clean_worktree
git check-ref-format "refs/tags/${TAG_NAME}" >/dev/null 2>&1 \
    || fail "Invalid tag name: ${TAG_NAME}"
require_tag_absent

readonly PR_STATE="$(gh pr view "${PR_NUMBER}" --json state --jq '.state')"
readonly PR_BASE="$(gh pr view "${PR_NUMBER}" --json baseRefName --jq '.baseRefName')"
[[ "${PR_STATE}" == "OPEN" ]] || fail "PR #${PR_NUMBER} is not open (state: ${PR_STATE})."
[[ "${PR_BASE}" == "main" ]] || fail "PR #${PR_NUMBER} targets ${PR_BASE}, not main."
gh pr view "${PR_NUMBER}" --json number,title,url,state,baseRefName,headRefName

print_section "Pull request checks"
gh pr checks "${PR_NUMBER}"
print_pass "GitHub reports successful checks for PR #${PR_NUMBER}"

print_section "Explicit confirmation"
print_info "This will merge PR #${PR_NUMBER}, delete its branch, and create and push ${TAG_NAME}."
readonly CONFIRMATION_TEXT="merge PR #${PR_NUMBER} and tag ${TAG_NAME}"
confirm_exact "${CONFIRMATION_TEXT}"

print_section "Merge pull request"
gh pr merge "${PR_NUMBER}" --merge --delete-branch

print_section "Update main"
git switch main
git pull --ff-only origin main

print_section "Recheck tag"
require_tag_absent

print_section "Create annotated tag"
git tag -a -m "${TAG_MESSAGE}" -- "${TAG_NAME}"

print_section "Push tag"
git push origin "refs/tags/${TAG_NAME}"

print_section "Refresh remote state"
git fetch --prune origin

print_section "Final Git status"
git status

print_section "Local branches"
git branch -vv

print_section "Recent history"
git log --oneline --decorate -10

print_pass "Merged PR #${PR_NUMBER} and pushed annotated tag ${TAG_NAME}"
