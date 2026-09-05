# Repository security hardening

NEXORA is a local/development MVP, not a deployed or production-ready service.
This guide distinguishes security automation stored in the repository from
GitHub settings that the repository owner must configure and review separately.
The latest stable milestone is
`v0.70.0-backend-health-version-semantics-foundation`. No next milestone has
started.

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
