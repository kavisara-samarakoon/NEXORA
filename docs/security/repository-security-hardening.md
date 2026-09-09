# Repository security hardening

NEXORA is a local/development MVP, not a deployed or production-ready service.
This guide distinguishes security automation stored in the repository from
GitHub settings that the repository owner must configure and review separately.
The latest stable milestone is
`v0.77.0-hosted-postgresql-persistence-validation-foundation`. It is completed
and tagged; the previous milestone is
`v0.76.0-backend-hosted-environment-configuration-foundation`. No public
deployment or production readiness is claimed.

## Repository-defined automation

| Control | Repository behavior |
| --- | --- |
| Backend CI | Runs the database-free Maven test suite and a separate PostgreSQL 16 `dev`-profile integration test. |
| Frontend CI | Installs the primary Next.js dependencies, runs ESLint, and creates a production build for validation only. |
| Security CI | Gates on high-severity production npm audit findings and retains the JSON report; exports the Maven dependency tree as a visibility artifact. |
| CodeQL | Manual CodeQL-ready workflow for Java and JavaScript/TypeScript. Automatic upload is disabled while private-repository code scanning is unavailable. |
| Dependency Review | Runs advisory review of dependency changes on pull requests to `main`; `fail-on-severity: high` records the intended threshold when repository support is available. |
| Dependabot | Checks GitHub Actions, Maven, and primary Next.js npm dependencies weekly; routine minor/patch updates are grouped and major updates remain manual. |

The v0.70 health semantics milestone adds an explicit safe name for the v0.33
observability-contract baseline while preserving the old response key as a
legacy alias. It does not expose configuration values or add monitoring,
dependencies, workflows, deployment, or production capability. NEXORA remains
not production-ready.

The v0.71 release tooling adds local command helpers, not a new security or CI
control. It keeps review manual; refuses dirty trees for branch/PR/merge
operations; verifies PR checks and tag absence; and requires typed confirmation
before merge, branch deletion, and tagging. Local `gh` output remains the
source of truth for private-repository operations.

The completed and tagged v0.73 tooling added only the local
`scripts/release/commit-milestone.sh` helper. It starts with an empty index,
stages literal paths from an explicit approved list, verifies the staged set,
refuses `main`, and requires the exact displayed confirmation before committing.
It does not push, open or merge PRs, tag, delete branches, deploy, reset, stash,
or amend. v0.71 and v0.73 change no workflow/CI behavior, dependency,
backend/frontend application behavior, OpenAPI YAML, or production/deployment
capability.

The completed and tagged v0.74 backend security foundation explicitly
allowlists the method-and-path combinations intended to remain public,
preserves authentication for `/api/auth/me` and `/api/me/**`, and denies
unmatched requests by default. Unknown or future routes and unexpected methods
therefore fail closed. Existing CSRF/session, credentialed CORS, and request-ID
controls are unchanged, as are endpoint paths, query parameters, JSON shapes,
the frontend, dependencies, workflows/scripts, and OpenAPI YAML. This adds no
production/deployment capability, and NEXORA remains not production-ready.

The completed and tagged v0.75 milestone created planning documents only. They
require exact HTTPS origins, externally managed and independently scoped
secrets, secure cookie/CSRF/CORS review, least-privilege PostgreSQL access,
controlled migrations/backups, redacted live smoke evidence, browser QA,
rollback and takedown ownership, and truthful hosted-demo wording. No hosting
provider, secret value, Docker/cloud/environment or runtime deployment
configuration, application change, or live deployment was included. Existing
source, API/OpenAPI behavior, dependencies, and workflows/scripts remain
unchanged, and NEXORA remains not production-ready.

The completed and tagged v0.76 backend configuration foundation added a
`hosted-demo` profile group that activates the existing database-backed `dev`
path and `production` safety checks. Its profile properties require an external
server port, PostgreSQL URL/user/password, separate JWT and refresh-token HMAC
secrets, and exact trusted frontend origins with no hosted secret fallbacks.
Production-like validation rejects missing, local, embedded, default-superuser,
short, or placeholder database settings. Refresh and CSRF cookies are forced
secure, cookie paths and CSRF remain intact, and the `SameSite=Lax` baseline can
become `None` only through an explicit secure cross-site decision. CORS remains
credentialed and exact-origin; request-ID behavior is unchanged.

This is backend configuration only. It changes no domain logic and creates no
live deployment, frontend/provider/cloud/Docker/`.env` configuration,
dependency, script, workflow, endpoint, JSON shape, or OpenAPI YAML change.
NEXORA remains not production-ready.

The completed and tagged v0.72 backend change limits outbound external-deals
provider concurrency to four calls per process and falls back immediately to
stale same-key or local catalog data when admission is saturated. This is a
local resource bound, not a distributed rate limiter or production
availability/security control. It changes no API shape, frontend, dependency,
workflow/script, OpenAPI YAML, deployment, or production capability.

The CodeQL-ready workflow scopes analysis to `backend/nexora-api` and
`frontend/nexora-web-next`; it does not build or analyze the retained Vite
prototype as a primary application. None of these workflows deploy NEXORA or
require application credentials.

The Maven dependency tree is not a vulnerability scan. OWASP Dependency-Check
was evaluated but is not a mandatory workflow because its initial external data
downloads and no-key vulnerability-feed behavior can be slow or unreliable.
This avoids turning a third-party feed outage into a repository-wide PR block.

GitHub CI validation for v0.65 proved that enforceable Dependency Review is
currently unsupported by this repository's GitHub security configuration. The
workflow therefore intentionally uses `continue-on-error: true` and remains
advisory. `fail-on-severity: high` records the intended threshold when the action
can evaluate dependency changes, but the current check must not be represented
as rejecting or merge-blocking. Enforceable use is deferred until the required
GitHub Dependency Graph and repository security capability are available; this
guide does not claim that any additional security product is enabled. The
workflow retains pull-request-only execution, read-only permissions, and job-
summary reporting rather than requesting write access for comments. It does not
run npm audit or Maven vulnerability scanning; the existing production npm audit
gate and Maven dependency-tree visibility remain separate.

## GitHub settings to review manually

The repository owner should review **Settings → Code security and analysis** and
the repository's branch rules. Availability and naming can vary by repository
visibility, account plan, and GitHub product changes.

- Enable GitHub private vulnerability reporting when available, and verify that
  maintainers can receive and privately discuss reports.
- Enable the dependency graph, Dependabot alerts, and Dependabot security
  updates. Dependency Review depends on the dependency graph/API data.
- Enable secret scanning and push protection when available. These are GitHub
  settings, not capabilities created by the workflows in this repository.
- Review CodeQL/code-scanning availability before enabling automatic runs. If
  code scanning becomes available, choose either CodeQL default setup or this
  repository's workflow to avoid duplicate analyses.
- Add branch protection or a ruleset for `main`, then require the stable backend,
  frontend, and security checks after their job names and behavior have been
  confirmed on a pull request. Do not treat the current advisory Dependency
  Review job as a required rejecting control. Reconsider it only after the
  required repository capability is available and enforcement is revalidated.
  Require CodeQL only after code scanning is enabled and stable for this
  repository.
- Limit GitHub Actions permissions to read by default and retain the explicit
  workflow exceptions required for CodeQL result upload.

Public repositories on GitHub.com can use CodeQL/code scanning more broadly. Private
repository availability can depend on GitHub Code Security or GitHub Advanced
Security licensing. This repository does not claim those plan-dependent
features are enabled.

## Secret response

Never paste or commit real passwords, JWT secrets, database credentials, SMTP
credentials, Gemini keys, API keys, or access/refresh tokens. If a credential is
exposed, revoke or rotate it immediately, remove it from active local tooling,
and use the private reporting path in [`SECURITY.md`](../../SECURITY.md) when the
exposure affects the repository.

Deleting a secret from the latest commit does not make an already published
credential safe. Rotation is still required, and repository history cleanup
should be coordinated carefully with maintainers.

## Local validation

Run the same application and dependency checks before opening a pull request:

```bash
cd backend/nexora-api
mvn test
```

```bash
cd frontend/nexora-web-next
npm run lint
npm run build
npm audit --omit=dev --audit-level=high
```

```bash
git diff --check
```

Dependency Review requires GitHub event and repository context, so final
verification occurs on a pull request. Current CI evidence shows that this
repository cannot rely on it as an enforceable gate, so the job remains
advisory. CodeQL upload additionally requires code scanning to be enabled and
available for the repository. No real credentials are needed for either
workflow.

## Remaining gaps

- No deployed production environment or production operations guide.
- No production secret-management platform or monitoring/SIEM integration.
- No mandatory full Maven vulnerability scanner.
- No enforceable Dependency Review gate under the repository's current GitHub
  security capability; the workflow remains advisory.
- No guarantee that plan-dependent GitHub security settings are enabled.
- No production-grade distributed rate limiting or production AI
  observability/moderation pipeline.
- No password recovery/account verification or durable notification delivery.
