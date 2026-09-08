# NEXORA local release workflow

## Why these scripts exist

Milestone branches repeat the same local Git, validation, commit, pull-request,
merge, and tag commands. The helpers in `scripts/release/` make those commands
consistent and visible while retaining human review and explicit confirmation
for commits, merge, branch deletion, and tagging. They are local project tooling
only; they do not change application, CI, deployment, or production behavior.

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

### Commit a milestone

```bash
scripts/release/commit-milestone.sh \
  --message "Add bounded milestone behavior" \
  --files path/to/approved-file another/approved-file
```

`commit-milestone.sh` refuses to commit on `main`, requires an initially empty
staging area, shows the working-tree status and diff summary, and runs
`git diff --check`. It stages only the file paths explicitly listed after the
`--files` option by using `git add --` with literal path handling; it never uses
`git add .` or stages other modified files automatically. After staging, it
shows the staged names and summary, leaves other working-tree changes unstaged,
and verifies that every staged file was approved.

The commit is created only after the operator types the exact displayed
confirmation, including the commit message. If confirmation fails, no commit is
created and the approved files remain staged for inspection with
`git diff --cached`; unstage them manually if needed after review. The helper
does not reset the index automatically. It also does not push, open or merge a
PR, create a tag, delete a branch, or deploy.

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

- Read the diff and validation output before committing. Only
  `commit-milestone.sh` stages or commits, and it does so only for explicit file
  paths after staged-diff review and exact typed confirmation.
- Review the PR content, conversation, approvals, and repository check details.
  A successful command exit is not a substitute for code review.
- The scripts do not force-push, amend, reset, stash, install dependencies,
  hide command output, or merge/tag/delete branches without typed confirmation.
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
3. Review `git diff`, then run `commit-milestone.sh` with the exact approved
   file list and commit message. Review its staged output and type its complete
   confirmation phrase.
4. Run `open-pr.sh`, then perform human review and resolve any check failures.
5. Run `merge-and-tag.sh` only when the PR and exact tag are approved. Read the
   prompt and type its complete confirmation text.
6. Verify the printed main status, branches, tag, and recent history, then
   review the final GitHub repository state.

## Documentation-only release-state closure

When a milestone tag is followed by a separate documentation-only closure, use
a new docs branch from updated `main`. Update only the approved release-state
documentation, validate and review the diff, and either commit manually or run
`commit-milestone.sh` with only the approved documentation paths. Then use
`open-pr.sh` for the closure PR. After human review, merge that closure PR with
an explicitly confirmed manual `gh pr merge --merge --delete-branch`, update
local `main`, fetch with pruning, and verify the final state.

Do not run `merge-and-tag.sh` for the closure PR: the milestone was already
tagged, and the closure does not create or move another release tag.

## Current milestone state

The latest stable development tag is
`v0.75.0-production-demo-deployment-planning-foundation`. No next milestone has
started. The possible next candidate is
`v0.76.0-backend-hosted-environment-configuration-foundation`. It has not
started. The completed and tagged v0.75 milestone created deployment planning
documentation only; it did not deploy NEXORA or add backend/frontend code,
runtime deployment configuration, Docker/cloud/environment files, API/OpenAPI,
dependency, script, or workflow changes. The target remains a fully functional
hosted portfolio/demo MVP, not production SaaS. NEXORA remains not
production-ready.
