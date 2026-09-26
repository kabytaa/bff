# Business Factory Handoff

Updated: 2026-09-26.

## Current state

- [Build 1 Foundation](.agent/plans/build-1-foundation.md) is **locally complete**; hosted verification remains approval-gated and has not been executed.
- The Nx workspace contains five real projects: public contracts, Convex BFF service, operator CLI, read-only backoffice and backoffice Playwright tests.
- The only application table is `businessEnvironments`. Public health, protected operator overview and internal create/list/inspect/update operations are implemented.
- The phone-friendly backoffice is production-built but not hosted. Direct Google OIDC configuration and a fixed server-side operator allowlist are implemented but require a real hosted Google smoke test.
- Product scope remains canonical in [the TableCards MVP specification](docs/products/tablecards-mvp.md); no TableCards workload, Business-user auth, billing, accounts or speculative SDK/domain tables were added.

## Last completed

- Passed the final `pnpm check`: formatting, lint, Nx boundaries, type checks, 24 unit/component tests, 14 Convex integration tests, four production builds, bundle leak assertion, secret scan and desktop/phone Playwright checks.
- Passed a frozen-lockfile install, peer-dependency check, local Convex function push, live local health request, operator CLI smoke sequence and Cloudflare `wrangler deploy --dry-run` without uploading assets.
- Added GitHub Actions with the same deterministic gate and no provider secrets or deployment step.
- Reconciled the architecture, delivery plan and provider guidance through [ADR 0002](docs/architecture/adr/0002-business-environments-and-operator-auth.md).
- Added the [local development](docs/operations/build-1-local-development.md) and [hosted verification](docs/operations/build-1-hosted-verification.md) runbooks.
- Added a standing repository rule to assess local documentation whenever an Nx project is created or materially expanded, while avoiding boilerplate READMEs and unnecessary nested instructions.
- Local Convex setup created the separate `andrew-tofler/business-factory` project record and ignored local deployment. No BFF functions or data were pushed to a cloud deployment.

## Next moves

1. Review and commit the locally complete Build 1 change set.
2. Only after explicit approval, run the hosted gate: confirm the existing Business Factory Convex project/cloud development deployment, Cloudflare account/Worker and Google web client; then deploy and perform one real operator sign-in.
3. After Build 1 hosting is accepted, brainstorm and plan the next delivery slice before implementing it.

## Human blockers

- Hosted Build 1 needs approval for the exact Convex cloud development deployment and Cloudflare Worker, access to the Cloudflare account, one Google web client for the final origins and one real operator sign-in. No client secret is needed.
- Andrew can continue Paddle seller verification independently; Paddle is not a Build 1 dependency.
- A physical 100%-scale TableCards print and ruler check remains required before product launch, not for Build 1.

## Guardrails

- Do not deploy or create provider resources merely because local validation passed.
- Never store provider credentials, Google identity values or operator allowlists in git.
- Keep repeatable configuration in the operator CLI, essential state read-only in the backoffice and human-judgment actions in the appropriate web workflow.
- Add models and APIs only when their owning implementation slice has a real caller and denial tests.
