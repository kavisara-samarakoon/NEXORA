# NEXORA roadmap

This roadmap organizes possible next milestones. It does not promise dates, a
public launch, or production readiness. Priorities should be revisited as the
project's academic, portfolio, and product goals evolve.

## Near-term polish

- Complete the in-progress
  `v0.64.0-backend-production-profile-persistence-guard-foundation` milestone
  by preventing `prod` or `production` from starting with in-memory demo
  persistence while reusing the existing `dev` database-backed profile.
- Keep the completed
  `v0.63.0-backend-auth-abuse-limit-keying-foundation` milestone as the latest
  stable milestone until v0.64 is merged and tagged.
- Keep Settings connected to no account data until a separately scoped product
  and API design exists; its current controls and profile remain static preview
  content. Keep Security scores and events labelled as local samples rather
  than monitoring or telemetry.
- Keep reviewer documentation, setup instructions, and milestone labels aligned
  with the implemented repository state.
- Improve test organization and focused verification guidance without reducing
  the existing backend, PostgreSQL, or primary frontend checks.
- Extend the v0.34 shared API error contract only when additional REST domains
  need it, preserving domain-specific codes and avoiding raw exception or
  request disclosure.
- Continue keyboard, label, ARIA, focus, reduced-motion, and UX-state
  accessibility review after the v0.58 state-clarity polish. A formal
  accessibility audit and conformance assessment remain future work and do not
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

## CI and release follow-up

- Add deployed-environment smoke tests only after approved target, credential,
  data-lifecycle, and ownership boundaries exist; they remain separate from the
  local-only v0.44 request correlation smoke coverage.
- Add staging environment checks only after a staging topology, test-account
  lifecycle, secrets boundary, and support owner are defined.
- Add release automation only after versioning, artifacts, approvals, rollback,
  and release ownership are established.
- Add scheduled or push-triggered CodeQL only after repository visibility and
  code-scanning support are ready and the workflow policy is deliberately
  reviewed; CodeQL remains manual-only today.

## Product UX improvements

- Consider broader request-ID presentation only after reviewing privacy,
  support, and accessibility boundaries. Copy-to-clipboard remains future work;
  v0.47 intentionally adds no clipboard behavior.
- Refine account and session feedback, including recovery and verification UX
  after the underlying policies are defined.
- Improve wishlist, price-target, alert-history, and notification-preference
  flows while preserving account ownership boundaries.
- Explore clearer price-history summaries and comparisons after defining data
  aggregation and retention requirements.
- Improve provider attribution and explain when live data falls back to local
  data beyond the bounded v0.54 reviewer-transparency labels.

## Deployment preparation

- Verify refresh and CSRF cookie attributes, rotation, and clearing through a
  deployed HTTPS browser flow only after the topology and proxy boundary are
  approved.
- Verify backend response headers in a deployed environment only after an
  approved HTTPS topology and proxy boundary exist.
- Define frontend Content Security Policy separately when the frontend has a
  reviewed deployment topology and asset/integration requirements.
- Enable HSTS only after HTTPS deployment and redirect behavior are defined and
  verified; it is intentionally outside the local v0.40 foundation.
- Build future deployment health probes and production monitoring only on an
  approved topology with alerting and response ownership. The v0.33 safe
  runtime/configuration summary and v0.53 frontend panel are only lightweight
  local foundations.
- Keep production deployment, centralized observability, uptime monitoring,
  and real external-provider hardening as future work with explicit ownership
  and operational boundaries.
- Treat real production privacy controls, identity-protection features, and
  deployment hardening as future reviewed work; static screenshot guidance is
  not a runtime privacy control.
- Add full observability dashboards later, after metrics, tracing, managed
  logging, alert ownership, and operational response are defined. Prometheus,
  Grafana, OpenTelemetry, and external integrations remain deliberately
  unselected; the local v0.48/v0.49 logging foundations and v0.50 reviewer
  runbook are not substitutes for them.
- Select a target topology, hosting model, networking boundary, and operational
  ownership model.
- Define backend and frontend application image requirements separately from
  the existing local PostgreSQL Compose and devcontainer tooling.
- Establish environment-specific configuration, managed secret storage,
  backups, restore testing, health checks, and rollback expectations.
- Add deployment automation only after those decisions are reviewed.
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
- Replace the process-local, scoped auth abuse controls with a distributed
  design and separately define credential-stuffing and bot protections. CAPTCHA
  and DDoS protection also remain outside the current local foundation.
- Approve auth-event privacy, retention, access-control, integrity, monitoring,
  alerting, and incident-response policies.
- Review repository security settings and add a dependable backend
  vulnerability scanner when an appropriate approach is selected.

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
- Treat business, income, employment, and broader portfolio readiness as future
  evidence-based decisions; the reviewer panels through v0.64 describe
  implemented local foundations only.
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
