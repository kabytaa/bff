# Business Factory Handoff

Updated: 2026-10-06.

## Current state

- Builds 1 and 2 are complete in production. TableCards review remediation is **complete for the authorized development boundary** at [development](https://tablecards-dev.tofler.app). Build 3 is not yet complete in production; no production change or merge was made.
- The accepted [Business lifecycle scope](.agent/brainstorms/261003-business-lifecycle-skills.md) is complete: four skills were created, structurally validated and forward-tested by independent agents on TableCards, including Astra readiness review. The [forward-test record](docs/factory/reviews/261006-business-lifecycle-skills-forward-tests.md) states outcomes and limits.
- Canonical TableCards documentation now sits beside its code: [README/router](projects/tablecards/README.md), [Product](projects/tablecards/docs/product.md), [Application](projects/tablecards/docs/application.md), [Architecture](projects/tablecards/docs/architecture.md) and [Operations](projects/tablecards/docs/operations.md). Old root paths are routers; shared BFF explanations and root work records/ADRs remain canonical where they were.
- Runtime `a914da02088e4a0724e290117aad11976515405b` is committed, pushed and deployed on `feat/tablecards-application` ([PR #1](https://github.com/kabytaa/bff/pull/1), unmerged). The [completed remediation plan](.agent/plans/261006-tablecards-review-remediation.md) delivered secure private files, immutable current-draft exports, durable AI recovery, phone navigation/preview, bounded libraries, named workspaces, pinned fonts and truthful policy routes. Further review also fixed workspace-rename and invitation-copy feedback races.
- The complete Node 24 repository gate passed. The fresh hosted suite passed **27/27** (17 desktop Chromium, 10 mobile WebKit, one worker, zero retries). Independent checks passed 92 web, 57 SDK and 40 core tests plus backend regressions. Independent application and security/readiness reviews pass for this development scope. Exact backend/gateway source stamps and hosted font hashes agree. Earlier failed/interrupted reviews remain historical evidence, not acceptance.

## Evidence and next work

Read the [development acceptance record](projects/tablecards/docs/reviews/261006-tablecards-remediation-and-development-acceptance.md), then its linked independent app and security/readiness reports. It maps original findings to fixes, verification and remaining limits. The failed original reports are retained with successor links.

Next is a separately authorized Build 3 production release: review/merge the PR, confirm exact production targets, deploy and run production smoke. Preserve the documented Latin-font and private-file boundaries; already delivered bytes and old development bearer links cannot be recalled without separately authorized cleanup. Physical output still needs explicit 100%-scale measurement evidence; six-card landscape remains a trial, not the canonical four-card format. No routine user review is required to close this development work.

## Development and stage boundaries

- Live development targets: TableCards Convex `scrupulous-hawk-991`, shared BFF `compassionate-buffalo-689`, `tablecards-dev.tofler.app`, `api.tablecards-dev.tofler.app` and `auth-dev.tofler.app`. Web Worker is `5e9f85d0-abe2-46c5-bfbe-33d1b744ed09`; exact gateway/auth versions and safe health/font probes are in the acceptance record and Operations.
- Build 3 uses BFF-owned explicitly no-charge checkout and deterministic development AI. Its unit allocation boundary/anniversary rollover is implemented in development; mock renewal is simulated success, not payment truth.
- The [delivery plan](docs/factory/mvp-delivery-plan.md) now matches the accepted later checkout decision: a future Build 3 production demo may use shared no-charge checkout. No TableCards production deployment is authorized by the current task. Build 4 owns verified billing/renewal/restrictions/retention, Build 5 two-way support, Build 6 analytics/monitoring/usable backoffice and Build 7 launch.
- User usability review is optional. Physical measurement and personal provider/seller verification remain distinct requirements when applicable; there is no routine “waiting for Andrew to test” blocker.

## Guardrails

- Keep credentials, tokens, private customer content and unredacted browser artifacts out of Git and evidence.
- Review findings are not authority for silent fixes, paid calls, production provisioning, merge or deployment.
- Durable promises belong in Product; actual UI/state choices in Application; table/API ownership in Architecture; deploy/recovery in Operations; detailed evidence in dated reviews. Historical work is retained in plans, brainstorms, review records and Git rather than copied into this handoff.
