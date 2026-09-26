# Business Factory Handoff

Updated: 2026-09-26.

## Current state

- [Build 1 Foundation](.agent/plans/260925-build-1-foundation.md) is **development verified but not complete**: the local gate and hosted development verification passed, while production CI/CD and production smoke verification remain required under the accepted completion rule.
- The Nx workspace contains seven real projects: public contracts, shared static configuration, Convex BFF service, operator CLI, read-only backoffice, backoffice Playwright tests and tested production-delivery tooling.
- The only application table is `businessEnvironments`. Public health, protected operator overview and internal create/list/inspect/update operations are implemented.
- The phone-friendly backoffice is hosted at `https://ops-dev.tofler.tech`. Direct Google OIDC uses the shared Tofler backoffice web client, while protected reads require Google's verified-email claim plus the code-owned two-operator allowlist shared by every deployment.
- Product scope remains canonical in [the TableCards MVP specification](docs/products/tablecards-mvp.md); no TableCards workload, Business-user auth, billing, accounts or speculative SDK/domain tables were added.
- An active [domain-strategy brainstorm](.agent/brainstorms/260926-domain-strategy.md) records the incubation-to-brand model. KooMasha is the actual developer/operator; Tofler is its software domain family. Andrew owns `tofler.tech` and `tofler.app`; `.app` is customer-facing and `.tech` internal/operator/technical. Stable development uses explicit `-dev` hostnames: Build 1 targets `ops-dev.tofler.tech`, while `ops.tofler.tech` is reserved for future production.
- The [production-delivery brainstorm](.agent/brainstorms/260926-production-delivery.md) is accepted, and its [implementation plan](.agent/plans/260926-production-delivery.md) is in progress. Andrew authorized release `86a7e75`: validation, Convex deploy/version stamping and Cloudflare publication succeeded. The workflow smoke command then failed before its network checks because direct `tsx` execution did not load the workspace path aliases; after that was corrected, the smoke found and excluded ConvexReactClient's built-in example URL from unexpected-deployment detection. The corrected command and all 18 delivery-tool tests pass, and the exact live production smoke now passes locally. A fix-forward push remains required to make the GitHub workflow green.

## Last completed

- Added the main-only post-validation production job, a separate `business-factory-backoffice` manifest for `ops.tofler.tech`, strict target/build validation, bounded public production smoke, ADR 0003 and the production runbook. No production deploy has run yet.
- Created the GitHub `production` environment with a `main`-only branch policy, four public target variables and the Business Factory production-deployment key. No credential value entered git, docs, chat or browser artifacts.
- Passed the production dashboard rehearsal, Cloudflare asset dry run, Convex production dry run against `exuberant-goldfinch-830` and the complete `pnpm check` gate after implementation.
- Verified GitHub contains both required production environment secrets without reading their values, reran the complete `pnpm check` gate under Node.js 24 and completed the final human-readable diff audit.
- Published production Convex and the `business-factory-backoffice` Worker at `https://ops.tofler.tech` from commit `86a7e75`; the backend reports that full SHA and a manual run of the corrected bounded production smoke passes against the live backend, headers, dashboard and bundled Convex target.
- Renamed retained brainstorms and plans to immutable `YYMMDD-topic.md` creation-date filenames, repaired repository links and updated the brainstorming/planning skills and repository rule. Full update dates remain inside each artifact.
- Deployed Cloudflare Worker `business-factory-backoffice-dev` with the Custom Domain `ops-dev.tofler.tech`; `ops.tofler.tech` and production remain untouched. HTTPS, CSP/security headers, signed-out Google UI and desktop/Pixel 7 rendering were verified against the live site.
- Published the centralized static configuration to Convex development and Cloudflare Worker version `45cc63d7-b78f-4c41-86a9-dd8335d10eef`, then removed the now-unused per-deployment `GOOGLE_CLIENT_ID` value. Live backend health and the hosted page both return `200`.
- Andrew completed a real Google sign-in at `ops-dev.tofler.tech` and confirmed that the allowlisted operator can see the authenticated read-only overview. The intentionally minimal visual design is functional; any redesign is separate future work.
- Created the Google web client with both backoffice origins and placed its public client ID in shared static configuration used by Convex and the dashboard. No client secret, redirect URI or downloaded credential JSON is used.
- Centralized the shared Google client ID and two-address operator list in the internal `bff-static-config` library. Both are public identifiers intentionally shared by every deployment, while Convex URLs and build versions remain deployment-specific and credentials remain external. Convex still verifies issuer, audience, signature and expiry; an allowlisted address with `email_verified` false is denied by test.
- Created and selected the personal Convex development deployment `compassionate-buffalo-689` inside `andrew-tofler/business-factory`. The tested functions are deployed there, while no production deployment or cloud registry data was created.
- Verified Wrangler OAuth login to Andrew's Cloudflare account using only account/user read, Worker scripts/routes write and zone read. Broad default Wrangler scopes were deliberately not granted; no Worker, route or DNS record was created during authorization.
- Passed the final `pnpm check` after static-configuration consolidation: formatting, lint, Nx boundaries, type checks, unit/component tests, 12 Convex integration tests, production builds, bundle leak assertion, secret scan and desktop/phone Playwright checks.
- Passed a frozen-lockfile install, peer-dependency check, local Convex function push, live local health request, operator CLI smoke sequence and Cloudflare `wrangler deploy --dry-run` without uploading assets.
- Added GitHub Actions with the same deterministic gate and no provider secrets or deployment step.
- Reconciled the architecture, delivery plan and provider guidance through [ADR 0002](docs/architecture/adr/0002-business-environments-and-operator-auth.md).
- Added the [local development](docs/operations/build-1-local-development.md) and [hosted verification](docs/operations/build-1-hosted-verification.md) runbooks.
- Added a standing repository rule to assess local documentation whenever an Nx project is created or materially expanded, while avoiding boilerplate READMEs and unnecessary nested instructions.

## Next moves

1. Push the tested smoke-runner fix forward under Andrew's existing production authorization and monitor the entire GitHub Action through a green automated production smoke.
2. After the first green release, complete Andrew's real production Google sign-in before closing Build 1. Reassess per-Business Cloudflare tokens only when real usage, collaborators or sensitive infrastructure increase the shared token's impact.
3. Finish or supersede the active [domain-strategy brainstorm](.agent/brainstorms/260926-domain-strategy.md).
4. Keep the current development backoffice as the functional operator surface; treat visual redesign as separate scoped work if it becomes valuable.

## Human blockers

- No external setup blocker remains. After the fix-forward Action is green, Andrew must perform one real Google sign-in at `https://ops.tofler.tech` for final acceptance.
- Andrew can continue Paddle seller verification independently; Paddle is not a Build 1 dependency.
- A physical 100%-scale TableCards print and ruler check remains required before product launch, not for Build 1.

## Guardrails

- Do not deploy or create provider resources merely because local validation passed.
- Never store provider credentials or tokens in git. Reviewed non-secret identifiers shared by every deployment belong only in `@bff/static-config`; deployment-specific values remain external configuration.
- Keep repeatable configuration in the operator CLI, essential state read-only in the backoffice and human-judgment actions in the appropriate web workflow.
- Add models and APIs only when their owning implementation slice has a real caller and denial tests.
