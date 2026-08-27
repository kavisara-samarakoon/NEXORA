# NEXORA roadmap

This roadmap organizes possible next milestones. It does not promise dates, a
public launch, or production readiness. Priorities should be revisited as the
project's academic, portfolio, and product goals evolve.

## Near-term polish

- Complete the in-progress v0.40 backend security headers foundation with
  explicit browser-facing response headers and focused backend tests.
- Keep the completed v0.39 OpenAPI contract validation foundation as the latest
  stable milestone until v0.40 is merged and tagged.
- Keep reviewer documentation, setup instructions, and milestone labels aligned
  with the implemented repository state.
- Improve test organization and focused verification guidance without reducing
  the existing backend, PostgreSQL, or primary frontend checks.
- Extend the v0.34 shared API error contract only when additional REST domains
  need it, preserving domain-specific codes and avoiding raw exception or
  request disclosure.
- Continue keyboard, label, ARIA, focus, reduced-motion, and UX-state
  accessibility review after the v0.31 frontend polish; this work does not
  change backend, API, security, deployment readiness, or production status.
- Keep the retained Vite prototype clearly separated from the primary product.

## API contract tooling

- Consider full OpenAPI linting with external tooling only after its dependency,
  maintenance, reliability, and security implications are reviewed; the
  completed v0.39 checker is deliberately a lightweight marker/structure check.
- Consider generated clients only after contract stability, versioning, and
  ownership expectations are defined.
- Add Swagger UI or runtime-generated API documentation only after a separate
  dependency, exposure, and security review.
- Consider a maintained Postman collection or import workflow later; the
  manual curl guide and smoke script remain the current executable examples.

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

- Verify backend response headers in a deployed environment only after an
  approved HTTPS topology and proxy boundary exist.
- Define frontend Content Security Policy separately when the frontend has a
  reviewed deployment topology and asset/integration requirements.
- Enable HSTS only after HTTPS deployment and redirect behavior are defined and
  verified; it is intentionally outside the local v0.40 foundation.
- Build future deployment health probes and production monitoring only on an
  approved topology with alerting and response ownership. The v0.33 safe
  runtime/configuration summary is only a lightweight foundation.
- Add full observability dashboards later, after metrics, tracing, managed
  logging, alert ownership, and operational response are defined. Prometheus,
  Grafana, OpenTelemetry, and external integrations remain deliberately
  unselected.
- Select a target topology, hosting model, networking boundary, and operational
  ownership model.
- Define backend and frontend application image requirements separately from
  the existing local PostgreSQL Compose and devcontainer tooling.
- Establish environment-specific configuration, managed secret storage,
  backups, restore testing, health checks, and rollback expectations.
- Add deployment automation only after those decisions are reviewed.
- Design deployed staging smoke tests only after an approved staging topology,
  test-account lifecycle, secret boundary, and ownership model exist.
- Add broader end-to-end/browser testing only after its scenarios, runtime
  cost, and ownership are defined; the API Smoke CI foundation is API-only.
- Write production deployment and operational runbooks only after a target
  topology, owners, monitoring, rollback, and incident-response processes are
  approved.

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
