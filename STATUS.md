# Business Factory Handoff

Updated: 2026-10-06.

## Current state

- Builds 1 and 2 are complete in production. TableCards Build 3 is deployed to [development](https://tablecards-dev.tofler.app), but **not ready for development acceptance or production promotion** after the new independent review.
- The accepted [Business lifecycle scope](.agent/brainstorms/261003-business-lifecycle-skills.md) is complete: four skills were created, structurally validated and forward-tested by independent agents on TableCards, including Astra readiness review. The [forward-test record](docs/factory/reviews/261006-business-lifecycle-skills-forward-tests.md) states outcomes and limits.
- Canonical TableCards documentation now sits beside its code: [README/router](projects/tablecards/README.md), [Product](projects/tablecards/docs/product.md), [Application](projects/tablecards/docs/application.md), [Architecture](projects/tablecards/docs/architecture.md) and [Operations](projects/tablecards/docs/operations.md). Old root paths are routers; shared BFF explanations and root work records/ADRs remain canonical where they were.
- Documentation/review checkpoint `3a948ad` is committed and pushed to `origin/feat/tablecards-application` (PR #1). The accepted [remediation plan](.agent/plans/261006-tablecards-review-remediation.md) now implements private byte delivery/server-owned decoded uploads, immutable atomically scheduled exports, durable AI retry, current-draft PDF output, phone navigation/preview, named workspaces, bundled fonts and truthful policy routes. No merge or production deployment is authorized.
- Remediation source `11c0be6` is deployed to development with matching backend/gateway source stamps and verified font bytes. Browser/independent review found workspace-rename and invitation-copy feedback races plus Creator state/accessibility gaps; those follow-up fixes are now source-validated. Independent checks passed 92 web and 57 SDK tests, with earlier 40 core and account-scoped backend regressions. The complete Node 24 repository gate passed again after source freeze. The first hosted attempt was interrupted and had failures, so it is not acceptance evidence; successor deployment and a complete fresh 27-case run remain required.
- A fresh 19-case hosted suite passed (13 desktop Chromium, 6 mobile WebKit). The complete Node 24 repository gate passed with Nx concurrency 1; independent checks also passed 63 focused unit/integration tests. These tests miss the defects documented below, so the old “functionally complete” claim is superseded. Optional user review is not a completion gate.

## Active findings and next work

Read the [combined review](projects/tablecards/docs/reviews/261006-build-3-documentation-and-readiness.md), then its linked [app findings](projects/tablecards/docs/reviews/261006-tablecards-app-review.md) and [Astra readiness evidence](projects/tablecards/docs/reviews/261006-tablecards-readiness-review.md).

1. Execute the remediation plan: secure server-owned uploads/authenticated file delivery, export snapshots, recoverable AI completion, the recorded UI defects, bundled fonts and truthful development disclosures. Add regression evidence for each saved finding.
2. Address the recorded mobile/session/navigation, artwork-library, fit-feedback and safe-error presentation failures; rerun the affected hosted journeys. Do not substitute a user request to “test everything” for agent verification.
3. Before an authorized production release, resolve font coverage and private file-access/revocation expectations, register exact production targets and perform production smoke. Physical output still needs explicit 100%-scale measurement evidence; the six-card landscape layout remains a trial, not the canonical four-card format.

## Development and stage boundaries

- Live development targets: TableCards Convex `scrupulous-hawk-991`, shared BFF `compassionate-buffalo-689`, `tablecards-dev.tofler.app`, `api.tablecards-dev.tofler.app` and `auth-dev.tofler.app`. Read-only provider inspection confirmed web Worker `c82c37eb-b670-4a28-884b-4cd2b559ba9d`; backend/gateway health labels do not establish an exact current source SHA.
- Build 3 uses BFF-owned explicitly no-charge checkout and deterministic development AI. Its unit allocation boundary/anniversary rollover is implemented in development; mock renewal is simulated success, not payment truth.
- The [delivery plan](docs/factory/mvp-delivery-plan.md) now matches the accepted later checkout decision: a future Build 3 production demo may use shared no-charge checkout. No TableCards production deployment is authorized by the current task. Build 4 owns verified billing/renewal/restrictions/retention, Build 5 two-way support, Build 6 analytics/monitoring/usable backoffice and Build 7 launch.
- User usability review is optional. Physical measurement and personal provider/seller verification remain distinct requirements when applicable; there is no routine “waiting for Andrew to test” blocker.

## Guardrails

- Keep credentials, tokens, private customer content and unredacted browser artifacts out of Git and evidence.
- Review findings are not authority for silent fixes, paid calls, production provisioning, merge or deployment.
- Durable promises belong in Product; actual UI/state choices in Application; table/API ownership in Architecture; deploy/recovery in Operations; detailed evidence in dated reviews. Historical work is retained in plans, brainstorms, review records and Git rather than copied into this handoff.
