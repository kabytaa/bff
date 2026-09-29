# Feature: Build 3 TableCards Core

> **Status**: In progress — Development slice deployed and validated
> **Created**: 2026-09-27
> **Last updated**: 2026-09-28
> **Repository baseline**: `f6344be`
> **Source brainstorm**: [TableCards Product and Launch Direction](../brainstorms/260927-tablecards-product-and-launch.md), accepted 2026-09-27
>
> Implementation plan based on the repository state inspected on 2026-09-27. Re-verify referenced files, versions, and external documentation if the repository changes before implementation.

## Repository Context Snapshot

Build 1 and Build 2 are complete in development and production. The repository has a production-proven BFF-owned customer identity/account/session system, a TypeScript SDK with browser/React/server/Convex adapters, a retained Example Business, separate Convex deployments, same-site Cloudflare session gateways, development-only automated identities, and repeatable Nx validation/deployment patterns. Commit `f6344be` accepted the TableCards market-informed product direction and updated the canonical product and delivery documents.

There is no TableCards code, data schema, Convex deployment, Cloudflare surface, PDF renderer, file import implementation, product-entitlement projection, typed-unit ledger, or image-generation integration at this baseline. Build 3 must create those capabilities without turning the retained Example into a product or introducing live Paddle billing. The intended hosted development origins are `https://tablecards-dev.tofler.app` and `https://api.tablecards-dev.tofler.app`, with BFF environment key `tablecards-development`. Production TableCards deployment is outside this execution request.

## Feature Description

Build a hosted development version of TableCards that lets a visitor import and preview names before authentication, then sign in and save a project, create an entitlement-checked deterministic print-ready PDF, exercise Free/Event Pass/Planner Pro/Studio through an explicit development-only commerce mock, upload print-safe background artwork, and generate four deterministic development AI-background choices through a real account-owned unit reservation flow. The implementation must preserve guest order and duplicates, enforce account isolation and server-side limits, and keep guest-list data out of image prompts and analytics.

## User Story

As an event host or planner,
I want to turn a pasted or spreadsheet guest list into correctly sized tent-card PDFs and optionally choose custom or AI-created backgrounds,
So that I can reliably print place cards without manually laying out every name.

## Problem Statement

The shared platform can authenticate and authorize a Business user, but it has not yet proven a real product workflow or a reusable paid-capability boundary. TableCards needs a trustworthy import-to-preview-to-PDF path whose print geometry and account limits cannot be bypassed in the browser. Build 3 also needs a deterministic substitute for future billing and AI providers so development and automated tests exercise the eventual application-facing entitlement and consumption contracts without pretending a live purchase occurred.

## Solution Statement

Create a separate `projects/tablecards/` Business with five Nx projects: a pure core/layout library, a Convex backend, a React/Vite web app, a narrow Cloudflare session gateway, and a focused Playwright suite. Use one immutable point-based render manifest for both SVG preview and server-side `pdf-lib` output. Parse XLSX/CSV in the browser into the same validated row model, preserve a bounded pre-auth draft in `sessionStorage`, and require a verified BFF account context for save/export/upload/AI/mock-payment actions.

Add a small generic BFF entitlement projection and typed-unit ledger. A code-owned, versioned TableCards offer catalog provides the Free default and the validated mock offers. Development-only signed/mock controls can change an account's effective offer in development; production has no self-grant path. Unit reservations are account-owned, idempotent, and never placed in the context JWT. TableCards product records remain in the TableCards Convex deployment. Use a deterministic four-image development provider and a fail-closed optional OpenAI `gpt-image-2` adapter seam; development verification incurs no provider charge.

## Metadata

- **Type**: New Capability
- **Complexity**: High — new product, shared BFF contracts/persistence, deterministic PDF generation, assets, AI job orchestration, four new hosted components, and cross-service authorization must land together.
- **Systems Affected**: BFF contracts/service/SDK, Nx workspace boundaries, new TableCards core/backend/web/gateway/e2e projects, Convex development deployments, Cloudflare development routes, customer-auth environment configuration, documentation/status.
- **Dependencies**: `pdf-lib@1.17.1`, `@pdf-lib/fontkit@1.1.1`, `papaparse@5.7.0`, `@types/papaparse@5.5.2`, `read-excel-file@9.3.10`, `image-size@2.0.4`; existing React/Convex/Nx/Vitest/Playwright/Cloudflare tooling. An OpenAI secret is optional and not required for development acceptance.
- **Assumptions**: Existing BFF and Cloudflare development credentials remain available in the environment; a new TableCards Convex development deployment and Cloudflare dev resources may be created; only development deployment is authorized; no live billing, email, analytics, support, or production release is included.

## Required Reading

### Codebase Files (read before implementing)

- `STATUS.md:1` — active handoff and completed Build 2 deployment state.
- `docs/products/tablecards-mvp.md:26` — canonical workflow, print, offer, AI, account, and test boundaries.
- `docs/factory/mvp-delivery-plan.md:77` — Build 3 scope and Build 4 exclusions.
- `docs/architecture/adr/0004-business-customer-auth-and-accounts.md:1` — accepted Business auth/token/account architecture.
- `projects/example/backend/convex/http.ts:1` — separate Business Convex session and protected HTTP route pattern.
- `projects/example/backend/convex/currentContext.ts:1` — native Convex account guard pattern.
- `projects/example/backend/convex/environment.ts:1` — required public deployment configuration.
- `projects/example/workloads/web/src/main.tsx:1` — browser client, React auth provider, and Convex provider wiring.
- `projects/example/session-gateway/src/index.ts:1` — fixed-route opaque same-site gateway contract.
- `platform/bff/libs/sdk/typescript/src/adapters/convex/server.ts:1` — authoritative Business account-context guards.
- `platform/bff/service/convex/lib/customerHttp.ts:1` — authenticated BFF customer HTTP/error/CORS conventions.
- `platform/bff/service/convex/schema.ts:1` — BFF schema/index conventions and account identifiers.
- `platform/bff/service/convex/http.ts:1` — BFF route registration conventions.
- `eslint.config.mjs:1` and `tools/verify-boundary-policy.mjs:1` — generated-API import boundary allow lists.
- `docs/operations/build-2-customer-auth.md:1` — environment registration and deployment order.

### Internal Documentation

- `.agent/brainstorms/260927-tablecards-product-and-launch.md` — accepted product/pricing/AI/acquisition decisions.
- `docs/research/260927-tablecards-market-research.md` — evidence and direct-market caveats behind the accepted scope.
- `.agent/brainstorms/260926-domain-strategy.md` — selected TableCards development hostnames.
- `.agents/skills/configure-business-auth/SKILL.md` — required conflict-safe Business environment configuration flow.

### External Documentation

- [pdf-lib](https://pdf-lib.js.org/) — custom fonts, images, deterministic PDF construction, and metric APIs.
- [Convex actions](https://docs.convex.dev/functions/actions) and [file storage](https://docs.convex.dev/file-storage/store-files) — durable mutation-to-action orchestration and Blob storage.
- [Convex limits](https://docs.convex.dev/production/state/limits) — action/runtime/document/return limits that prohibit returning image/PDF base64 through normal functions.
- [read-excel-file](https://gitlab.com/catamphetamine/read-excel-file/-/raw/master/README.md) — browser XLSX raw-row parsing.
- [Papa Parse](https://www.papaparse.com/docs) — bounded browser CSV parsing.
- [image-size](https://raw.githubusercontent.com/image-size/image-size/main/Readme.md) — authoritative PNG/JPEG dimensions from bytes without a native image runtime.
- [OpenAI image generation](https://developers.openai.com/api/docs/guides/image-generation) and [Images generate API](https://developers.openai.com/api/reference/cli/resources/images/methods/generate) — `gpt-image-2`, four-output request, low-quality cost-efficient generation, supported output formats, and moderation.
- [OpenAI deprecations](https://developers.openai.com/api/docs/deprecations) — do not select the deprecated `gpt-image-1-mini`.
- [Noto Sans metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/METADATA.pb) and [OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/OFL.txt) — pinned font provenance and redistribution license.

### New Files to Create

- `.agent/plans/260927-build-3-tablecards-core.md` — this plan and execution record.
- `projects/tablecards/libs/core/` — validated rows, offer catalog, design registry, point geometry, fitting, render manifest, and PDF implementation/tests.
- `projects/tablecards/backend/` — independent Convex project/schema/functions/storage/jobs/auth/development mock/tests/runbook.
- `projects/tablecards/workloads/web/` — public import/preview and authenticated project/export/design/AI application.
- `projects/tablecards/session-gateway/` — TableCards-specific deployment wrapper around the fixed SDK route allowlist.
- `projects/tablecards/e2e/` — focused local/hosted-development Playwright scenarios.
- `projects/tablecards/customer-auth.defaults.ts` — code-owned Business name/theme/auth/account behavior.
- `platform/bff/libs/contracts/src/productAccess.ts` — provider-independent entitlement/unit contracts.
- `platform/bff/service/convex/{productAccess,unitLedger,developmentProductAccess}.ts` — effective-offer projection and typed-unit implementation.
- `platform/bff/libs/sdk/typescript/src/server/productAccess.ts` — server-only authenticated capability client.
- `docs/operations/build-3-tablecards.md` — setup, deployment, mock boundaries, hosted verification, and troubleshooting.

## Codebase Context

### Existing Architecture and Integration Points

The browser session cookie remains only on the TableCards session-adapter host. The browser SDK obtains a ten-minute BFF-signed context JWT. Convex verifies that JWT and the SDK exposes environment/account/user context to product functions. TableCards native queries use this context directly; authoritative product actions that need current entitlements or unit state forward the same short token server-to-server to BFF. No new service credential or second Business-signed JWT is introduced.

BFF owns Business identities, accounts, memberships, effective offer projection, and generic account-owned unit balances. TableCards owns projects, bounded guest rows, designs/assets, export records and AI operations. Generated PDF/image bytes live in TableCards Convex storage and database rows store storage IDs, not URLs or base64.

### Patterns to Follow

#### Naming and Organization

Use strict TypeScript and repository Nx tags. Keep product code below `projects/tablecards`; use `@tablecards/core` and `@tablecards/backend-api` aliases. SDK additions are technology-level server APIs, not TableCards-named helpers. Predefined designs and the offer catalog are code-owned constants, not `@bff/static-config` catch-all values.

#### Error Handling

Use Zod at public JSON/config boundaries, Convex `v` validators on every function, existing safe HTTP envelopes/correlation IDs in BFF, and typed product errors in TableCards. Never return upstream model bodies, raw storage failures, guest input, tokens, or credentials. Distinguish validation, authentication, entitlement, unit exhaustion, conflict, and retryable provider failures.

#### Logging and Observability

Build 3 records bounded project/export/AI operation state and BFF reservation rows needed by the product. It does not add generic analytics/monitoring (Build 6), per-request guest logging, or provider prompt logging. Health endpoints expose only service/version status.

#### Authentication and Authorization

Public import/preview is browser-local. Save/export/upload/AI/mock-commerce requires `state.status === 'authenticated'` and a server-verified account context. `BffRequireAuth` alone is insufficient because onboarding/account-selection states may render children. Every product row is account-scoped and every read/write checks the verified account ID. Development mock routes must be absent or fail closed unless deployment-level mock enablement and a development-enabled Business environment both pass.

#### Data and Migrations

BFF changes are additive tables and routes. TableCards begins with a new schema. Use public BFF account/user IDs in the product DB; do not import BFF generated APIs. Store a project metadata row plus one bounded contents document containing no more than 500 tightly validated guests, preserving duplicates/order while keeping PII out of list views. Use indexed point reads/counts and bounded queries only.

#### Testing

Use Vitest for pure/core/UI/gateway tests, `convex-test` for BFF and TableCards authorization/concurrency/idempotency scenarios, and a few large Playwright hosted scenarios. Mocked `withIdentity` proves product authorization; hosted dummy-provider login proves real browser/session/Convex integration. Real Google/OpenAI/Paddle are not ordinary CI dependencies.

## Design Decisions

- **Decision**: Separate TableCards from the retained Example.
  - **Rationale**: The Example remains a minimal reusable SDK proof; a product needs independent data, deployment, domains, and tests.
  - **Tradeoff**: More Nx/deployment configuration, but no product coupling or misleading reference app.
- **Decision**: Generate PDFs server-side from the same immutable render manifest used by browser SVG preview.
  - **Rationale**: Server authorization enforces limits; one geometry/fitting model prevents preview/export drift.
  - **Tradeoff**: Export becomes an asynchronous storage-backed job rather than instant browser-only download.
- **Decision**: Fixed geometry is Letter `612×792` points, unfolded card `252×288`, visible face `252×144`, four per sheet, plus one exact `72×72` point scale square.
  - **Rationale**: Directly implements the accepted print contract and enables exact tests.
  - **Tradeoff**: No A4, flat cards, arbitrary sizes, or layout editor.
- **Decision**: Use bundled Noto Sans and actual font metrics for deterministic fit/preflight.
  - **Rationale**: Supports common Latin accents and avoids browser/system-font drift.
  - **Tradeoff**: Decorative font variety is intentionally deferred; unsupported characters fail preflight rather than silently substitute.
- **Decision**: BFF owns a minimal generic effective-offer projection and unit ledger; TableCards owns product records.
  - **Rationale**: This is the first real reusable paid/consumption caller while avoiding BFF product-table leakage.
  - **Tradeoff**: Cross-deployment server calls are required for protected actions.
- **Decision**: A versioned code-owned TableCards catalog defines Free/Event/Pro/Studio; Build 3 stores only a provider-independent account access projection.
  - **Rationale**: Build 4 can replace the development mock writer with Paddle webhooks without changing product checks.
  - **Tradeoff**: Build 3 cannot exercise real subscription lifecycle/retention transitions.
- **Decision**: Businesses reserve only a unit type, amount and idempotency key; BFF selects the effective allocation. Monthly development grants use activation-anniversary billing cycles, while fixed allocation keys cover lifetime and event grants. Buckets are created lazily; reservations are idempotent, expire after 15 minutes and transition once among reserved/committed/released/expired.
  - **Rationale**: Keeps allocation economics inside BFF, advances renewable allowances without Business code or manual offer reselection, preserves prior-cycle history and handles retry/concurrency/provider failure without mutable JWT balances.
  - **Tradeoff**: The internal and response field remains named `periodKey` even when it identifies a non-period allocation; adjustment/refund/reconciliation and financial ledgers wait for a real later caller.
- **Decision**: AI uses a deterministic development provider and an optional `gpt-image-2` low-quality four-choice adapter seam.
  - **Rationale**: The full flow can be tested without credentials/spend; current official guidance makes `gpt-image-2` the cost-efficient non-deprecated OpenAI candidate.
  - **Tradeoff**: Development acceptance does not validate live model quality or org verification.
- **Decision**: Preserve a bounded versioned anonymous draft in `sessionStorage` only when crossing a protected redirect.
  - **Rationale**: A user must not lose imported guest data after sign-in.
  - **Tradeoff**: Drafts are device/tab-local and intentionally not durable anonymous server records.
- **Decision**: Development-only mock payment self-grants require both deployment and environment enablement and do not exist in production artifacts/routes.
  - **Rationale**: Exercises exact product gates without creating a fake production checkout.
  - **Tradeoff**: Build 3 cannot be sold until Build 4 introduces verified Paddle state.

## Implementation Plan

### Phase 1: Pure product and shared capability foundations

Add dependencies/project boundaries, implement the offer catalog, import model, print manifest/PDF renderer, then add public BFF entitlement/unit contracts and server client.

### Phase 2: Authoritative persistence and operations

Add BFF effective access/unit tables and idempotent operations, then build the isolated TableCards backend with project/content/asset/export/AI data and authorization.

### Phase 3: User workflow and development providers

Build the public/authenticated React workflow, development mock commerce, deterministic AI provider, optional OpenAI adapter, artwork validation, and same-site gateway.

### Phase 4: Deployment, regression, and handoff

Register/configure the development Business, deploy BFF/TableCards/gateway/web, execute focused hosted browser scenarios and negative probes, document outcomes, and update the plan/status without committing implementation changes.

## Step-by-Step Tasks

Execute in dependency order.

### Task 1: ADD workspace dependencies and TableCards project boundaries

- **Implement**: Add the pinned PDF/font/CSV/XLSX/image dependencies. Create Nx/package/TypeScript/Vite/Vitest scaffolding for `tablecards-core`, `tablecards-backend`, `tablecards-web`, `tablecards-session-gateway`, and `tablecards-e2e`. Add `@tablecards/core` and `@tablecards/backend-api` paths, generated-API boundary exceptions, root E2E inclusion, and useful local READMEs. Extract/reuse a technology-level fixed-route Cloudflare gateway helper only if it removes duplicated security-sensitive logic with both Example and TableCards as real callers.
- **Pattern**: `projects/example/{backend,workloads/web,session-gateway}/project.json` and `tsconfig.base.json`.
- **Dependencies/Imports**: package manager lockfile; existing Nx plugins/executors.
- **Gotchas**: Do not import one Business's generated API from another. Do not rename existing Nx projects or broaden the generated-API exception beyond named consumers.
- **Validate**: `pnpm exec nx show projects` and `pnpm exec node tools/verify-boundary-policy.mjs`.

### Task 2: CREATE `projects/tablecards/libs/core` import, design, layout, and PDF engine

- **Implement**: Define bounded schemas for guest rows and mappings; normalize pasted lines/grids and parser output while preserving spelling/order/duplicates; reject empty/overlong/unsupported data and legacy XLS. Define three Free designs plus premium registry metadata. Build immutable point-based render commands, Noto Sans metric fitting/preflight, SVG-preview adapter, and deterministic pdf-lib renderer with fixed metadata/resource order. Vendor the pinned Noto Sans font/OFL. Add exact geometry, page-count, determinism, accents, duplicate, long-name, and unsupported-character tests.
- **Pattern**: Pure libraries under `platform/bff/libs/contracts` for package boundaries and Vitest configuration.
- **Dependencies/Imports**: `pdf-lib`, `@pdf-lib/fontkit`; browser parsers feed normalized raw arrays rather than File objects into the pure model.
- **Gotchas**: 25 cards produce 8 pages including scale page; 500 produce 126. Both visible faces must render correctly around the fold. Timestamps/IDs must not make identical input bytes differ. Never clip silently.
- **Validate**: `pnpm exec nx run tablecards-core:test && pnpm exec nx run tablecards-core:typecheck && pnpm exec nx run tablecards-core:lint`.

### Task 3: ADD generic product-access and typed-unit public contracts

- **Implement**: Add bounded versioned schemas/types for effective offers, feature flags/numeric limits, unit balance/reserve/commit/release, development mock offer grant, and typed error codes. Add the server-only SDK client that forwards the current short JWT, applies timeouts/no-store, validates responses, and does not enter browser/React exports. Add the versioned TableCards catalog/config shape as the concrete first caller.
- **Pattern**: `platform/bff/libs/contracts/src/{accounts,session}.ts` and `platform/bff/libs/sdk/typescript/src/server/index.ts`.
- **Dependencies/Imports**: Zod and existing fetch/error utilities.
- **Gotchas**: Bodies never accept environment/account/user IDs as authority; those derive from JWT. Unit keys/period keys/idempotency keys are length/character bounded. Balances stay out of the JWT.
- **Validate**: `pnpm exec nx run bff-contracts:test && pnpm exec nx run bff-sdk-typescript:test && pnpm exec nx run bff-sdk-typescript:typecheck`.

### Task 4: ADD BFF effective-access projection and unit ledger

- **Implement**: Add additive `accountAccessGrants`, `accountUnitBuckets`, and `accountUnitReservations` tables with required indexes. Resolve absent access to the registered Free offer. Implement authenticated current-access and reserve/commit/release routes, atomic counters, idempotency-key mismatch conflicts, 15-minute reservation expiry/cron release, and bounded backoffice-safe summaries only if used now. Add development mock offer switching through an explicitly dev-only route; production route registration/config must fail closed. Synchronize each mock offer's current unit bucket using stable lifetime/event/cycle period keys.
- **Pattern**: `platform/bff/service/convex/{schema,http,crons}.ts`, `lib/customerHttp.ts`, and existing transactional account mutations/tests.
- **Dependencies/Imports**: Task 3 contracts; existing verified customer JWT context.
- **Gotchas**: No Paddle/subscription/webhook/customer tables. Reserve derives account/actor from token, checks effective offer, and cannot overdraw under concurrent calls. Commit/release/expiry are replay-safe. Production cannot self-grant.
- **Validate**: `pnpm exec nx run bff-service:test-integration && pnpm exec nx run bff-service:typecheck && pnpm exec nx run bff-service:lint`.

### Task 5: CREATE the TableCards Convex backend and schema

- **Implement**: Create independent Convex config/generated boundary, auth config, environment parser, health/session routes, and schema for `projects`, bounded `projectContents`, `designAssets`, `designPresets`, `projectExports`, and `aiBatches`. Implement account-scoped queries plus protected create/save/archive/duplicate operations, active-project/card/design gates from authoritative BFF access, public IDs, and concurrency-safe indexed limit checks. Keep guest data out of project list responses.
- **Pattern**: `projects/example/backend/convex/*` and `withBffAccountQuery/Mutation/Action`.
- **Dependencies/Imports**: Tasks 1–4, `@tablecards/core`, `@tofler/bff-auth/convex/server`.
- **Gotchas**: 500 guests must stay well below the 1 MiB Convex document limit through strict field caps. Every access is account scoped. No raw BFF IDs from request bodies override the JWT. Build 3 mock offer state is authoritative only in BFF.
- **Validate**: `pnpm exec nx run tablecards-backend:test-integration && pnpm exec nx run tablecards-backend:typecheck && pnpm exec nx run tablecards-backend:lint`.

### Task 6: ADD artwork upload and deterministic PDF export jobs

- **Implement**: Add authenticated upload URL creation and finalize flow; validate stored bytes as PNG/JPEG, MIME/signature, bounded byte size, exact 7:4 ratio, minimum 1050×600 pixels, and unsupported EXIF rotation; delete invalid/orphaned blobs. Add mutation-to-scheduled Node action PDF jobs that re-read canonical project/access, render/store bytes, record ready/failed state, and expose account-scoped download URLs. Enforce Free/paid card and design limits at job start and finalization.
- **Pattern**: Convex action/storage guidance and existing SDK guards.
- **Dependencies/Imports**: `image-size`, `pdf-lib`, core manifest/renderer.
- **Gotchas**: Never return PDF/image base64 through a mutation. Ordinary predefined export must not depend on AI availability. Generated download URLs remain short-lived; database stores storage IDs. Replays return the same finished export or safe job status.
- **Validate**: backend integration tests plus a generated-file probe that parses `MediaBox`, page count, guest multiplicity, and deterministic SHA-256.

### Task 7: ADD development mock commerce and AI batch orchestration

- **Implement**: Provide a visible development-only offer selector/purchase simulation that obtains a single-use bounded grant and writes through the BFF provider-independent access projection. Add TableCards AI job idempotency, reserve one `ai_background_batch` unit, call exactly one provider request returning four images, validate/store all four, commit on complete success, and delete partials/release on any failure. Implement deterministic success/failure provider fixtures and an optional raw-fetch OpenAI `gpt-image-2`, `quality: low`, `size: 1344x768`, `n: 4`, JPEG adapter selected only by server configuration.
- **Pattern**: Existing development-auth signer/verifier fail-closed split and BFF unit client from Task 3.
- **Dependencies/Imports**: BFF unit ledger; Convex storage/actions; optional `OPENAI_API_KEY` server secret.
- **Gotchas**: Prompt accepts only bounded style instructions and never guest/project/customer names or rows. A fake provider must be impossible in production. Replays cannot regenerate or charge twice. AI failure must not impair uploaded/predefined designs or export.
- **Validate**: integration cases for success/commit, provider/partial failure/release, replay, concurrent reserve, exhaustion, cross-account denial, production mock denial, exactly-four enforcement, and provider-input privacy.

### Task 8: CREATE the TableCards React workflow

- **Implement**: Build a responsive one-page public landing/workflow with pricing copy; pasted line/grid, CSV, and XLSX import; explicit column mapping for name/table/marker; warnings; complete card/sheet preview; predefined design choice; bounded session draft through login; authenticated project save; account selection/onboarding handling; export job/download; paid upload controls; development mock offer switch; AI prompt/four-choice selection; and clear safe errors/status. Add policy/FAQ copy stating digital PDF only and Actual Size printing.
- **Pattern**: `projects/example/workloads/web/src/{main,config,app}.tsx` for provider wiring only; TableCards UI remains independent.
- **Dependencies/Imports**: `papaparse`, `read-excel-file/browser`, Tasks 1–7.
- **Gotchas**: `BffRequireAuth` is not account authorization. Preserve a draft before redirect, restore once, and clear after successful save/expiry/logout. No guest data in URL/localStorage/analytics/AI prompt. Browser file checks improve UX but never replace backend validation.
- **Validate**: `pnpm exec nx run tablecards-web:test && pnpm exec nx run tablecards-web:build && pnpm exec nx run tablecards-web:typecheck && pnpm exec nx run tablecards-web:lint`.

### Task 9: ADD TableCards session gateway, environment defaults, and deployment manifests

- **Implement**: Add exact auth-route Cloudflare Worker/manifests for `api.tablecards-dev.tofler.app`, web manifest for `tablecards-dev.tofler.app`, public env schema, TableCards auth/account/theme defaults, and build-version health. Configure the Business through the validated preflight/apply workflow with exact origins/adapter/default path and development automation enabled only in the development environment. Create/push the separate TableCards Convex development deployment and set only required public/secrets.
- **Pattern**: `projects/example/session-gateway`, `projects/example/workloads/web/wrangler.jsonc`, `projects/example/customer-auth.defaults.ts`, and `docs/operations/build-2-customer-auth.md`.
- **Dependencies/Imports**: Existing scoped Convex/Cloudflare/BFF development credentials.
- **Gotchas**: Gateway forwards only SDK auth routes and cookies opaquely; product Convex traffic remains direct. Do not mutate Example or production. Keep secrets out of files and command output. Business callback is derived from adapter base URL.
- **Validate**: dry-run builds; customer-auth preflight/apply/readback; `convex dev --once --typecheck enable` from BFF and TableCards backend working directories; Cloudflare development deploy output and uncached health checks.

### Task 10: ADD layered regression and hosted-development acceptance

- **Implement**: Add core decision/geometry tests, BFF ledger integration scenarios, TableCards backend authorization/limit/storage/job scenarios, component workflow tests, and a small Playwright suite. Hosted flows: public pasted-grid/CSV/XLSX preview; protected redirect with draft restore; automated dev sign-in; Free save/export and >25 denial; mock Event Pass 500-card/export/upload; Planner/Studio project-limit snapshots; AI success/exhaustion/failure-refund; second account isolation; logout denial. Verify production build artifacts have no development mock route/config/provider.
- **Pattern**: `platform/bff/customer-auth-e2e/src/hosted-development.spec.ts` and scenario-based Convex tests.
- **Dependencies/Imports**: Tasks 1–9 and deployed dev surfaces.
- **Gotchas**: Use several focused scenarios, not one brittle mega-test or every Cartesian combination. Playwright WebKit is useful evidence but not identical to physical iPhone Safari. No live OpenAI/Paddle dependence.
- **Validate**: focused project tests, `pnpm check`, hosted Playwright Chromium and WebKit against uncached dev URLs, and safe negative probes.

### Task 11: UPDATE documentation, plan lifecycle, and handoff

- **Implement**: Document project ownership/setup/deploy/troubleshooting, actual contracts, selected dependencies/model, mock limitations, physical-print remaining check, and exact validation/deployment evidence. Update `STATUS.md` concisely. Mark this plan `Completed` only if every scoped automated/development acceptance item passes; otherwise leave it `In progress` with precise remaining blockers. Leave implementation uncommitted for user review as requested.
- **Pattern**: Existing project READMEs, `docs/operations/build-2-customer-auth.md`, repository `AGENTS.md` status rules.
- **Dependencies/Imports**: Results of all prior tasks.
- **Gotchas**: Do not claim production completion or physical print verification. Do not turn status into a second product backlog. Do not commit/push post-baseline changes without a new explicit request.
- **Validate**: `pnpm exec prettier --check .agent/plans/260927-build-3-tablecards-core.md docs/operations/build-3-tablecards.md STATUS.md` and `git diff --check`.

## Testing Strategy

### Unit Tests

- Import normalization/mapping for pasted lines, pasted grids, CSV, XLSX raw rows, empty/corrupt/legacy files, duplicate names, accents, markers, bounds, and stable order.
- Offer catalog and entitlement mapping decision tables.
- Render manifest geometry, face transform, font coverage/fitting, no clipping, exact page counts and byte determinism.
- Gateway route allowlist, frontend draft lifecycle, and safe error/view state.

### Integration Tests

- BFF current offer, development mock grants, production denial, unit reserve/commit/release/expiry and all replay/concurrency/conflict cases.
- TableCards authentication, wrong environment, wrong account, project limits, 25/500 enforcement, guest PII list omission, archive/duplicate behavior, upload validation/orphan cleanup and download authorization.
- Export job idempotency and real parsed PDF geometry/page count.
- AI job success, partial failure cleanup, release, exhaustion, retry, exactly four assets and no guest data passed to provider.

### End-to-End or Manual Validation

- Hosted development Chromium and Playwright WebKit exercise the public-to-authenticated happy path with the real BFF/session gateway/Convex boundary.
- Verify downloadable PDF response and inspect it programmatically. Browser screenshot the complete mobile/desktop workflow and error states.
- A physical 100% print/ruler measurement and real model-quality check remain explicit post-implementation human/provider evidence, not reasons to block safe development deployment.

### Edge Cases

- Duplicate equal names remain two ordered cards.
- Long or unsupported names fail preflight rather than clip or substitute invisibly.
- Import above current entitlement previews fully but cannot partially export.
- Cross-tab/account choices do not leak projects or overwrite drafts.
- Concurrent creates cannot exceed project limits; concurrent AI requests cannot overdraw a unit bucket.
- Provider timeout/partial output returns units and removes partial assets.
- Lost response/retry returns the same project/export/AI operation without duplicate cost.
- Session expiry during a long job fails safely or completes only from previously authoritative persisted job state.
- Invalid MIME/signature, decompression abuse, wrong ratio/resolution, EXIF rotation, oversized upload, or cross-account storage ID is denied and cleaned.

## Validation Commands

Run from `/root/projects/bff` unless noted.

### Syntax and Types

```bash
pnpm typecheck
pnpm exec nx run tablecards-core:typecheck
pnpm exec nx run tablecards-backend:typecheck
pnpm exec nx run tablecards-web:typecheck
pnpm exec nx run tablecards-session-gateway:typecheck
```

### Tests

```bash
pnpm exec nx run tablecards-core:test
pnpm exec nx run bff-contracts:test
pnpm exec nx run bff-sdk-typescript:test
pnpm exec nx run bff-service:test-integration
pnpm exec nx run tablecards-backend:test-integration
pnpm exec nx run tablecards-web:test
pnpm exec nx run tablecards-session-gateway:test
pnpm exec nx run tablecards-e2e:e2e
pnpm check
```

### Lint and Formatting

```bash
pnpm lint
pnpm format:check
git diff --check
```

### Manual Validation

Run uncached health/version and route-denial probes against BFF, TableCards Convex, gateway and web dev hosts; run hosted Chromium/WebKit; download and parse the development PDF. Do not perform a production deploy. Record the still-required physical print and any unavailable live image-provider evidence.

## Acceptance Criteria

- [ ] Anonymous visitors can import pasted lines/grids, CSV and XLSX and preview all valid cards without authentication.
- [ ] Duplicate names, order, common Latin accents, optional table/marker fields and long-name warnings behave exactly as specified.
- [ ] Protected actions survive login redirect through a bounded draft and require an authenticated selected account.
- [ ] Saved projects and all assets/exports are isolated by verified BFF account context.
- [ ] Free cannot export more than 25 cards or paid design features; the development mock exercises Event Pass/Planner Pro/Studio limits without any production self-grant path.
- [ ] PDFs are deterministic, Letter 612×792 points, four folded 3.5×2 inch cards per content sheet, both faces rendered, with cut/fold marks and a scale-check page.
- [ ] A 25-card export has 8 pages and a 500-card export has 126 pages; automated parsing finds no missing/extra guests or clipped accepted text.
- [ ] Uploaded PNG/JPEG backgrounds are authoritatively validated for signature, size, 7:4 ratio, minimum resolution, rotation and account scope.
- [ ] One AI batch reserves one account-owned unit, produces exactly four stored choices, commits once on success, and releases on failure/replay-safe cleanup without receiving guest data.
- [ ] Predefined/uploaded design and PDF behavior remains available when the AI provider is disabled or failing.
- [ ] Development hosts are deployed and focused Chromium/WebKit hosted scenarios pass with the real auth/session/Convex boundary.
- [ ] Production is not mutated and production artifacts/routes cannot enable the development payment or AI providers.
- [ ] Authorization and isolation rules are verified for missing identity, onboarding, wrong environment, wrong account and logout.
- [ ] Repository validation commands pass, or every remaining external/physical blocker is evidenced without a false completion claim.
- [ ] Relevant READMEs, operation docs, plan history and `STATUS.md` describe the actual delivered state.
- [ ] Existing BFF/Example behavior has no unintended regression.

## Risks and Mitigations

- **Risk**: Build 3 breadth produces a large review surface.
  - **Mitigation**: Dependency-ordered projects, pure core first, focused commits are avoided per user request but logical diffs/tests remain grouped by Nx project.
- **Risk**: Browser preview diverges from PDF output.
  - **Mitigation**: Both consume one immutable point/font-metric manifest; PDF geometry and screenshots are tested.
- **Risk**: Development mocks accidentally become production grants.
  - **Mitigation**: Double enablement, separate route registration/config, build assertion, and production-denial tests.
- **Risk**: Entitlement/unit calls introduce cross-service partial failures.
  - **Mitigation**: Stable idempotency keys, durable operations, reservations with expiry, replay-safe transitions, and no decrement-only balance mutation.
- **Risk**: Long AI actions time out or return partial output.
  - **Mitigation**: durable job state, storage IDs, exact-four validation, cleanup/release, and ordinary workflow independence.
- **Risk**: PDF/font/image libraries exceed Convex limits or behave differently hosted.
  - **Mitigation**: pinned pure-JS dependencies, separate Node actions, generated-file hosted probe, no base64 function responses, and current Convex limit checks.
- **Risk**: Guest-list PII leaks into logs/AI/URLs.
  - **Mitigation**: explicit data-flow tests, no analytics in Build 3, local bounded draft, metadata-only list views, and prompt type that cannot contain guest rows.
- **Risk**: Real Safari differs from Playwright WebKit.
  - **Mitigation**: reuse the already production-proven same-site gateway topology and leave physical Safari as an additional manual check, not an implementation deadlock.
- **Risk**: No live OpenAI key/model quality evidence.
  - **Mitigation**: deterministic provider validates contracts; optional adapter fails closed; model quality/provider credentials are recorded as later evidence rather than silently mocked as real.

## Open Questions

None that block implementation. The real image-provider quality benchmark, physical print measurement, live Paddle terms/integration, support/email, analytics/monitoring, production TableCards domain release, and actual buyer validation remain explicitly later gates.

## Notes

The initial documentation commit `f6344be` is the only commit requested before implementation. The user explicitly requested immediate execution, authorized development deployment/testing, asked for autonomous progress while unavailable, and expects the implementation changes to remain uncommitted for review. This plan therefore enters execution without a second approval pause. It does not authorize production mutation, live purchases, paid AI calls, external customer contact, a post-implementation commit, or a push.

## Document History

| Date       | Status                                                 | Change                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-27 | Approved — Execution requested                         | Initial implementation-ready plan created from the accepted TableCards direction; user pre-authorized immediate execution and development deployment.                                                                                                                                                                                                                                                                                              |
| 2026-09-27 | In progress — Development slice deployed and validated | Implemented the shared access/unit contract, TableCards product/backend/web/gateway, deterministic PDF and development AI flow; deployed development and passed repository plus hosted Chromium/WebKit gates. Broader font bundling, the full negative upload/provider browser matrix, physical print, live provider and production gates remain.                                                                                                  |
| 2026-09-28 | In progress — First review fixes deployed              | Replaced misleading seeded guest data with a real placeholder and explicit example action, made spreadsheet mapping visible/focused, added shared SVG/PDF occasion motifs, and deployed a selectable six-card landscape print trial plus public sample PDF. The complete repository gate and six hosted Chromium/WebKit cases pass; physical landscape validation is still pending and the canonical four-card acceptance criteria are unchanged.  |
| 2026-09-28 | In progress — Reviewed raster designs deployed         | Replaced the temporary SVG motifs with six user-supplied, normalized 1050 × 600 JPEG designs. One versioned, SHA-256-pinned catalog now drives picker thumbnails, sheet previews and backend PDF exports; the old motif fallback was removed. Focused gates and all six hosted Chromium/WebKit journeys pass.                                                                                                                                      |
| 2026-09-28 | In progress — Ink-friendly artwork revision            | Created immutable `v2` versions of all six designs through a deterministic, no-AI color-key transformation. Neutral paper pixels became true white while meaningful corner artwork was preserved; `v1` remains immutable, and the catalog now points previews and verified exports at `v2`.                                                                                                                                                        |
| 2026-09-28 | In progress — Unit allocation boundary corrected       | Removed allocation selection from the Business reservation request, made BFF resolve monthly/fixed allocations, anchored mock monthly renewal to the activation anniversary and made buckets lazy. Rollover tests preserve prior-cycle history without offer reselection; the complete repository gate and all six hosted Chromium/WebKit journeys pass after coordinated BFF and TableCards development deployment. Production remains unchanged. |
