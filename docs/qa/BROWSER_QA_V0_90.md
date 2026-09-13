# NEXORA v0.90 full-stack demo-readiness QA evidence

## Scope and evidence boundary

This document records the final local checks for the v0.90 full-stack
demo-readiness candidate on `feature/full-stack-demo-readiness`.

- Validation date: 2026-09-13
- Implementation baseline before this documentation update: `3824fd9`
- Frontend: local Next.js application
- Backend: local Spring Boot default profile
- Runtime API evidence port: `18080`, used to avoid relying on another local
  process at the normal demo port
- Latest tagged development milestone at validation time:
  `v0.89.0-browser-qa-evidence`

This is local demo-readiness evidence. It is not proof of production readiness,
a hosted deployment, cross-origin hosted cookie behavior, restart durability,
formal accessibility conformance, notification delivery, or third-party data
freshness. The earlier [v0.88 browser matrix](BROWSER_QA_V0_88.md) remains
historical evidence; it is not silently reclassified as a complete v0.90
desktop/mobile browser pass.

## Automated verification

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Frontend lint | `cd frontend/nexora-web-next && npm run lint` | PASS | ESLint exited 0 with no reported violations. |
| Frontend production build | `cd frontend/nexora-web-next && npm run build` | PASS | Next.js 16.3.4 compiled, type-checked, and completed page generation for the application routes. |
| Product-readiness regression tests | `cd frontend/nexora-web-next && node --test tests/product-readiness.test.mjs` | PASS | 10 passed, 0 failed, 0 skipped. |
| Backend tests | `cd backend/nexora-api && mvn test` | PASS | 331 passed, 0 failed, 0 errors, 2 skipped. |

The two skipped backend tests are explicitly environment-gated PostgreSQL
checks: the local `dev` PostgreSQL integration test and the hosted PostgreSQL
validation test. Their required environment flags were not set. They are not
counted as hosted or restart-persistence evidence.

The product-readiness tests cover the v0.90 Wishlist identity guard, Sentinel
auth-change request invalidation, homepage DTO mapping and incomplete states,
rating availability, giveaway sample/settings copy, and page-local alert and
reminder disclosure.

## Runtime API checks

The backend was started with its default local profile on port `18080`. The
following requests were made against that process on 2026-09-13.

| Request | Expected | Observed | Result |
| --- | --- | --- | --- |
| `GET /api/deals/external?pageSize=0` | Structured client error | HTTP 400, `error=validation_failed`, message `pageSize: must be greater than or equal to 1` | PASS |
| `GET /api/deals/external?upperPrice=-1` | Structured client error | HTTP 400, `error=validation_failed`, message `upperPrice: must be greater than or equal to 0` | PASS |
| `GET /api/deals/external?pageSize=12` | Existing successful deal array | HTTP 200 with 12 deal records | PASS |
| Scan the successful external-deals body for `Lowest Ever` | No unsupported historical-low claim | No match | PASS |

The successful response confirms the existing response shape remained usable.
It does not prove that every returned record was fetched fresh from the provider;
the endpoint may use its process-local cache or local fallback behavior.

## Focused browser and behavior evidence

The following checks were reported during the six focused v0.90 fixes and are
supported by the regression coverage above. This section is focused acceptance
evidence, not a new full-route browser matrix.

| Area | Verified behavior | Result |
| --- | --- | --- |
| Wishlist identity | Moving from the public preview to a signed-in personal Wishlist does not retain the preview target draft. Saving applies the visible personal item's target. Existing edit, pause/resume, delete, and history actions remain available. | PASS |
| Sentinel privacy | Logout or account/session identity change clears draft, submitted question, response, error, sign-in hint, and safe submitting state. An invalidated pending request cannot restore the previous account's answer. | PASS |
| Homepage feed | Healthy dashboard/deal DTO fields populate prices and counts, and a successful response no longer remains on `Sync pending`. Incomplete and unavailable data use explicit non-live states. | PASS |
| Giveaway wording | Seed and fallback entries render as unverified samples without claim percentages, verified countdowns, invented destinations, or persisted-reminder claims. | PASS |
| Deal alert and freshness wording | Page-local alerts identify themselves as preview-only. External offers state that they may be cached rather than claiming proven live freshness. | PASS |
| Settings wording | Wishlist price-alert preferences remain identified as the persisted account workflow; giveaway reminders are labelled planned and unpersisted. | PASS |

No fake Sentinel transcript was added, Gemini provider support remains present,
and the v0.90 work did not create a new giveaway or notification system.

## Remaining limitations for the demo

- NEXORA has no verified giveaway claim source. Sample entries do not establish
  a real claim URL, eligibility, region, entitlement type, or confirmed end date.
- Giveaway reminders are page-local preview state and are not persisted. Deal
  alert previews are also page-local; persisted price alerts belong to personal
  Wishlist items.
- External offers may be served from the process-local cache or local fallback.
  The current response does not prove provider freshness.
- Price history contains NEXORA-observed snapshots for an account item. It is
  not complete historical market coverage or proof of a market-wide lowest price.
- Notification dispatch is disabled by default. Account preferences and optional
  log/email adapters exist, but automatic delivery was not enabled or validated
  by this QA pass.
- No hosted frontend/backend deployment was tested. Cross-origin hosted auth,
  service restart behavior, and persistence after a hosted backend/database
  restart still require separate validation.
- The default local/demo backend profile may store accounts, sessions, personal
  Wishlist items, alerts, and preferences in memory; applicable state resets
  when the backend process restarts.
- Logout revokes the refresh session and clears frontend account state. An
  already-issued short-lived Bearer access token is not immediately revoked by
  a server-side denylist and can remain valid until it expires.

## v0.90 demo-readiness decision

The checked local build, regression, API-validation, and focused behavior paths
support opening a v0.90 full-stack demo-readiness PR. The result supports a
controlled university/FYP presentation, subject to the limitations above. It
does not support a production-readiness or hosted-validation claim.
