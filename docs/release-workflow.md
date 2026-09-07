# NEXORA local release workflow

## Why these scripts exist

Milestone branches repeat the same local Git, validation, pull-request, merge,
and tag commands. The helpers in `scripts/release/` make those commands
consistent and visible while retaining human review and explicit confirmation
for merge, branch deletion, and tagging. They are local project tooling only;
they do not change application, CI, deployment, or production behavior.

The scripts use tools already required by the repository workflow: Bash, Git,
Maven, Python 3, npm, and the GitHub CLI (`gh`). They do not install
dependencies or run `npm audit fix`.

## Helper scripts

### Start a milestone

```bash
scripts/release/start-milestone.sh feature/backend-example-foundation
```

`start-milestone.sh` requires a clean working tree and a new valid local branch
name. It switches to `main`, fast-forward pulls `origin/main`, and creates the
milestone branch. It refuses a locally existing branch.

### Validate a milestone

```bash
scripts/release/validate-milestone.sh
scripts/release/validate-milestone.sh --skip-frontend
scripts/release/validate-milestone.sh --skip-smoke
```

`validate-milestone.sh` runs `git diff --check`, shows `git status --short`, and
runs the backend Maven tests, primary frontend lint/build/production-dependency
audit, OpenAPI structure checker, reviewer preflight, and local API smoke test.
Each selected section prints its output and a clear pass or failure result.

Use `--skip-smoke` when the backend is not running. Use `--skip-frontend` only
when frontend validation is deliberately outside the current local pass; it
skips lint, build, and audit together. These flags do not redefine the checks a
reviewer or pull request may require.

### Open a pull request

```bash
scripts/release/open-pr.sh \
  --title "PR title" \
  --body "PR body"
```

`open-pr.sh` requires a clean non-`main` branch plus a non-empty title and body.
It pushes the current branch to `origin`, sets its upstream when missing,
creates a PR against `main`, prints the PR URL, and streams `gh pr checks
--watch`. It never merges or tags.

### Merge and tag

```bash
scripts/release/merge-and-tag.sh \
  --pr 72 \
  --tag v0.70.0-example-foundation \
  --message "NEXORA v0.70.0 Example Foundation"
```

`merge-and-tag.sh` requires a clean working tree, an open PR targeting `main`,
successful `gh pr checks`, and a tag that does not exist locally or on
`origin`. It then requires the operator to type the complete displayed merge
and tag confirmation. Only after that confirmation does it run `gh pr merge
--merge --delete-branch`, update `main`, recheck the tag, create an annotated
tag, and push that tag. It finishes with a pruned fetch, Git status, local
branch list, and recent log.

## Safety rules and human responsibilities

- Read the diff and validation output before committing; the helpers never
  stage or commit files.
- Review the PR content, conversation, approvals, and repository check details.
  A successful command exit is not a substitute for code review.
- The scripts do not force-push, amend, reset, install dependencies, hide
  command output, or merge/tag/delete branches without typed confirmation.
- Check the proposed tag name and annotation carefully. Release tags mark
  development milestones and are not a production-readiness claim.
- Keep credentials and tokens out of command arguments, PR text, commits, and
  terminal transcripts. Authentication remains the operator's responsibility.
- The GitHub connector may help with repository context, but local `gh` output
  remains the source of truth for private-repository PR, check, merge, and tag
  operations.

## Normal milestone flow

1. Run `start-milestone.sh` with the reviewed branch name.
2. Make the scoped changes and run `validate-milestone.sh` (starting the local
   backend first, or explicitly using `--skip-smoke`).
3. Review `git diff`, stage intentionally, and commit manually.
4. Run `open-pr.sh`, then perform human review and resolve any check failures.
5. Run `merge-and-tag.sh` only when the PR and exact tag are approved. Read the
   prompt and type its complete confirmation text.
6. Verify the printed main status, branches, tag, and recent history, then
   review the final GitHub repository state.

## Documentation-only release-state closure

When a milestone tag is followed by a separate documentation-only closure, use
a new docs branch from updated `main`. Update only the approved release-state
documentation, validate and review the diff, commit manually, and use
`open-pr.sh` for the closure PR. After human review, merge that closure PR with
an explicitly confirmed manual `gh pr merge --merge --delete-branch`, update
local `main`, fetch with pruning, and verify the final state.

Do not run `merge-and-tag.sh` for the closure PR: the milestone was already
tagged, and the closure does not create or move another release tag.

## Current milestone state

The latest stable development tag is
`v0.70.0-backend-health-version-semantics-foundation`.
Work in progress is
`v0.71.0-project-release-workflow-tooling-foundation`, which adds only these
local release helpers and documentation. The v0.72 candidate is the backend
external provider request budget foundation. NEXORA remains a local/development
MVP and is not production-ready.
