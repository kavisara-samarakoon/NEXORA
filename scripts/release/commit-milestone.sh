#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIRECTORY}/common.sh"

usage() {
  cat <<'USAGE'
Usage:
  scripts/release/commit-milestone.sh \
    --message "Commit message" \
    --files file1 file2 file3

Stages only the explicitly approved files and creates a milestone commit after
exact typed confirmation.

Options:
  --message MESSAGE  Required non-empty commit message.
  --files FILE...    Required list of one or more approved repository files.
  -h, --help         Show this help message.

This helper refuses to run on main or with pre-existing staged changes. It does
not push, open or merge a pull request, create a tag, or deploy.
USAGE
}

commit_message=""
supplied_files=()
collecting_files=false

while (($# > 0)); do
  case "$1" in
    --message)
      (($# >= 2)) || fail "--message requires a value."
      commit_message="$2"
      collecting_files=false
      shift 2
      ;;
    --files)
      collecting_files=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      if [[ "${collecting_files}" == true ]]; then
        supplied_files+=("$1")
        shift
      else
        fail "Unknown argument: $1. Run with --help for usage."
      fi
      ;;
  esac
done

[[ -n "${commit_message}" ]] || fail "--message is required and must not be empty."
((${#supplied_files[@]} > 0)) || fail "--files is required with at least one approved file."

require_command git
enter_project_root

current_branch="$(git branch --show-current)"
[[ -n "${current_branch}" ]] || fail "A named Git branch is required; detached HEAD is not supported."

print_section "Commit context"
print_info "Current branch: ${current_branch}"

[[ "${current_branch}" != "main" ]] || fail "Refusing to commit directly on main."

status_snapshot="$(git status --porcelain=v1 --untracked-files=all)"
[[ -n "${status_snapshot}" ]] || fail "The working tree has no changes to commit."

while IFS= read -r status_line; do
  [[ -n "${status_line}" ]] || continue
  index_status="${status_line:0:1}"
  case "${index_status}" in
    " "|"?")
      ;;
    *)
      fail "The staged area is not empty. Review or unstage existing entries before using this helper."
      ;;
  esac
done <<< "${status_snapshot}"

approved_files=()
for supplied_file in "${supplied_files[@]}"; do
  [[ -n "${supplied_file}" ]] || fail "Approved file paths must not be empty."
  [[ "${supplied_file}" != ".." && "${supplied_file}" != ../* ]] || \
    fail "Approved file path must not begin with ../: ${supplied_file}"

  supplied_directory="$(dirname -- "${supplied_file}")"
  supplied_basename="$(basename -- "${supplied_file}")"
  resolved_directory="$(cd -- "${supplied_directory}" 2>/dev/null && pwd -P)" || \
    fail "Approved file directory does not exist: ${supplied_file}"

  case "${resolved_directory}" in
    "${PROJECT_ROOT}")
      approved_file="${supplied_basename}"
      ;;
    "${PROJECT_ROOT}"/*)
      approved_file="${resolved_directory#"${PROJECT_ROOT}"/}/${supplied_basename}"
      ;;
    *)
      fail "Approved file path is outside the repository: ${supplied_file}"
      ;;
  esac

  [[ ! -d "${approved_file}" ]] || fail "Approved paths must name files, not directories: ${supplied_file}"
  approved_files+=("${approved_file}")
done

print_section "Working tree review"
git status --short
git diff --stat

print_section "Whitespace check"
if git diff --check; then
  print_pass "git diff --check passed."
else
  fail "git diff --check failed; no files were staged."
fi

print_section "Stage approved files"
printf 'Approved file: %s\n' "${approved_files[@]}"
print_info "Running git add -- with the approved files only."
if ! GIT_LITERAL_PATHSPECS=1 git add -- "${approved_files[@]}"; then
  fail "Staging failed. Inspect the index; this helper does not reset staged files automatically."
fi

print_section "Staged files"
git diff --cached --name-only

print_section "Staged diff stat"
git diff --cached --stat

print_section "Remaining working tree changes"
git status --short

if git diff --cached --quiet --exit-code; then
  fail "No staged changes exist after staging the approved files."
fi

unexpected_staged_file=""
staged_file_count=0
while IFS= read -r -d '' staged_file; do
  staged_file_count=$((staged_file_count + 1))
  staged_file_is_approved=false
  for approved_file in "${approved_files[@]}"; do
    if [[ "${staged_file}" == "${approved_file}" ]]; then
      staged_file_is_approved=true
      break
    fi
  done

  if [[ "${staged_file_is_approved}" != true ]]; then
    unexpected_staged_file="${staged_file}"
    break
  fi
done < <(git diff --cached --name-only -z)

((staged_file_count > 0)) || fail "No staged files were found after staging the approved files."
if [[ -n "${unexpected_staged_file}" ]]; then
  fail "Unexpected staged file '${unexpected_staged_file}'. No commit was created; staged files were left as-is for manual review."
fi
print_pass "Every staged file is in the approved file list."

print_section "Staged whitespace check"
if git diff --cached --check; then
  print_pass "git diff --cached --check passed."
else
  fail "The staged diff has whitespace errors. No commit was created; staged files were left as-is."
fi

expected_confirmation="commit \"${commit_message}\" with approved files"
printf 'Type exactly: %s\n' "${expected_confirmation}"
printf '> '
IFS= read -r actual_confirmation || actual_confirmation=""

if [[ "${actual_confirmation}" != "${expected_confirmation}" ]]; then
  printf 'ERROR: Confirmation did not match. No commit was created.\n' >&2
  printf 'Approved files remain staged. Review them with git diff --cached; unstage them manually if needed.\n' >&2
  exit 1
fi

print_section "Create commit"
if ! git commit -m "${commit_message}"; then
  fail "git commit failed. Review the output and staged state; this helper does not reset or amend."
fi
print_pass "Milestone commit created."

print_section "Post-commit status"
git status

print_section "Recent history"
git log --oneline --decorate -6

print_section "Created commit"
git show --stat --oneline HEAD

print_info "Next step: review the result, then use scripts/release/open-pr.sh when ready."
