# NEXORA roadmap

This roadmap organizes possible next milestones. It does not promise dates, a
public launch, or production readiness. Priorities should be revisited as the
project's academic, portfolio, and product goals evolve.

## Near-term polish

- Keep reviewer documentation, setup instructions, and milestone labels aligned
  with the implemented repository state.
- Improve test organization and focused verification guidance without reducing
  the existing backend, PostgreSQL, or primary frontend checks.
- Continue reviewing accessibility and product feedback after the v0.30
  loading/empty/error/fallback state polish; this frontend-focused work does
  not change backend, API, security, deployment readiness, or production status.
- Keep the retained Vite prototype clearly separated from the primary product.

## Product UX improvements

- Refine account and session feedback, including recovery and verification UX
  after the underlying policies are defined.
- Improve wishlist, price-target, alert-history, and notification-preference
  flows while preserving account ownership boundaries.
- Explore clearer price-history summaries and comparisons after defining data
  aggregation and retention requirements.
- Improve provider attribution and explain when live data falls back to local
  data.

## Deployment preparation

- Select a target topology, hosting model, networking boundary, and operational
  ownership model.
- Define backend and frontend application image requirements separately from
  the existing local PostgreSQL Compose and devcontainer tooling.
- Establish environment-specific configuration, managed secret storage,
  backups, restore testing, health checks, and rollback expectations.
- Add deployment automation only after those decisions are reviewed.

## Production security requirements

- Complete the decisions in the
  [auth production-policy plan](security/auth-production-policy-plan.md),
  including HTTPS, cookie, CORS, origin/proxy, session, and fail-closed
  configuration.
- Add account verification, recovery, complete revocation/session management,
  and a reviewed authorization model.
- Replace process-local auth abuse controls with a distributed design and define
  credential-stuffing and bot protections.
- Approve auth-event privacy, retention, access-control, integrity, monitoring,
  alerting, and incident-response policies.
- Review repository security settings and add a dependable backend
  vulnerability scanner when an appropriate approach is selected.
- Enable automatic CodeQL only if code scanning becomes available and the
  workflow policy is deliberately changed; it remains manual-only today.

## AI and Sentinel expansion

- Define measurable quality and safety evaluations for contextual responses and
  fallback behavior.
- Review privacy, moderation, prompt-injection handling, provider-key
  management, cost controls, and production observability.
- Consider streaming or richer context only after authorization, retention, and
  safety boundaries are established.
- Keep autonomous actions and persistent conversations out of scope until they
  have separate threat models and user-control designs.

## Business and product future

- Validate the problem and workflows with research participants before making
  claims about demand or prioritizing commercialization.
- Evaluate additional data providers, stores, and regional pricing based on
  licensing, reliability, attribution, and operating cost.
- Explore collaboration or sharing features only after privacy and ownership
  rules are designed.
- Define deployment, support, funding, and operating responsibilities before
  considering a public service.

## Roadmap guardrails

- Development milestones are not production releases.
- New integrations should be optional until their reliability and data policies
  are understood.
- Security and operational gaps should remain explicit in documentation.
- No milestone should imply users, revenue, uptime, benchmarks, or deployment
  evidence that the project does not have.
