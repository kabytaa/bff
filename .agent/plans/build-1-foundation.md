# Feature: Build 1 Foundation

> **Status**: Locally complete — Hosted verification pending
> **Created**: 2026-09-25
> **Last updated**: 2026-09-26
> **Repository baseline**: `73608e446538`
> **Source brainstorm**: [Build 1 Foundation](../brainstorms/build-1-foundation.md), accepted 2026-09-25
>
> Implementation plan based on the repository state inspected on 2026-09-25. Re-verify referenced files, dependency versions and external documentation if the repository changes before implementation.

## Repository Context Snapshot

- The repository is documentation-only at this baseline. It has no root package manifest, workspace, runtime source, schema, tests or CI workflow.
- `STATUS.md` identifies this implementation-ready plan as the current task and prohibits starting implementation before plan review.
- The accepted stack is an integrated Nx monorepo with pnpm and TypeScript, Convex as the BFF server/database, React/Vite/Tailwind for the backoffice, Cloudflare Workers Static Assets for hosting, Playwright for the focused browser regression and GitHub Actions for CI.
- The accepted brainstorm replaces the older `projects` registry with one persisted `businessEnvironments` row per isolated Business environment. It also moves the hosted read-only operator dashboard into Build 1 and protects it with direct Google OIDC plus a fixed server-side operator allowlist.
- Existing ADR, delivery, architecture and provider documents still contain stale `projects`, Better Auth, global-user and one-site-URL wording. Implementation must reconcile those documents explicitly; it must not silently reinterpret ADR 0001.
- Existing modifications to skills, repository instructions, `STATUS.md` and the accepted brainstorm predate this plan and belong to the user/session. Implementation must preserve them and work around unrelated changes.
- The machine has an existing authenticated Convex CLI session. Local initialization created the separate `andrew-tofler/business-factory` project record and an ignored local deployment, but no BFF functions or data were pushed to a cloud deployment. No Cloudflare credentials were found. Provider access must be rechecked immediately before any hosted action.

## Feature Description

Build the smallest executable Business Factory foundation that proves the shared architecture without creating speculative product surface. The slice establishes the workspace and dependency rules, a public versioned BFF health endpoint, one real Business-environment table with an operator-only CLI, a hosted phone-friendly read-only dashboard protected by Google operator authentication, deterministic unit/integration/browser tests and matching GitHub Actions checks.

The implementation is intentionally split into two completion gates:

1. **Locally complete** — all source, schema, CLI behavior, authorization logic, responsive dashboard behavior and deterministic validation pass without Andrew, a Google client, Cloudflare access or a cloud Convex deployment.
2. **Hosted verified** — after Andrew explicitly authorizes the exact cloud targets and completes the required account sign-ins, the same code is deployed to one development Convex deployment and a Cloudflare-hosted backoffice, then smoke-tested with one real Google operator identity.

No deployment occurs merely because local implementation succeeds.

## User Story

As the solo Business Factory operator,
I want a trustworthy shared foundation that Codex can validate and operate through automation while I can inspect its state from my phone,
so that future Businesses can be added without rebuilding infrastructure or risking cross-Business access.

## Problem Statement

The accepted architecture exists only in documents. There is no executable workspace, persisted registry, public service proof, authorization boundary, operator workflow, dashboard or regression gate. Starting TableCards or shared MVP capabilities before these foundations exist would make later code choose ad hoc package boundaries, data terminology and deployment/authentication behavior.

## Solution Statement

Create an integrated Nx workspace rooted in the existing repository and implement one vertical BFF slice:

- a technology-neutral `GET /v1/health` contract and Convex HTTP action;
- a single `businessEnvironments` table managed only by typed internal Convex functions;
- a repository-owned operator CLI that invokes those internal functions against an explicitly selected deployment;
- bounded exported dashboard queries protected by Google OIDC identity verification and a shared `(issuer, subject)` allowlist guard;
- a React/Vite/Tailwind backoffice that shows health, build version and read-only Business environments on desktop and phone;
- a separate test-only dashboard entry point for deterministic Playwright coverage without live Google or any production authentication bypass;
- local Convex development, `convex-test` integration tests, Nx boundaries, secret scanning and validation-only GitHub Actions.

The hosted verification phase adds only provider configuration and deployment. It does not change application behavior.

## Metadata

- **Type**: New Capability
- **Complexity**: High — this is a greenfield workspace plus backend, data, auth, operator tooling, UI, hosting and CI slice, with no existing runtime patterns to reuse.
- **Systems Affected**: repository root tooling, canonical architecture documentation, public BFF contracts, Convex service/schema, operator CLI, backoffice web app, Cloudflare static hosting and GitHub Actions.
- **Dependencies**: Node.js 24, pnpm, Nx, TypeScript, Convex and `convex-test`, React/Vite/Tailwind, Google Identity Services, Cloudflare Wrangler, Playwright, Secretlint and GitHub Actions.
- **Assumptions**:
  - Only one BFF development deployment is provisioned in Build 1; staging and production remain unprovisioned.
  - Build 1 contains no TableCards workload, public SDK, Business-user auth, account/member data, service credentials, billing, analytics, settings blob or environment lifecycle status.
  - The public Google web client ID is configuration, not a secret. No Google client secret is needed for the selected popup ID-token flow.
  - Dummy Business environments exist only in tests or disposable local state. Shared cloud data is created only when Andrew requests a real entry because Build 1 intentionally has no delete operation.
  - Dependency versions below were current and compatibility-checked on 2026-09-25; implementation pins exact direct versions and commits `pnpm-lock.yaml`.

## Implementation Success Estimate

**Confidence: 8/10 for successful one-pass implementation of the accepted Build 1 scope.**

The score is high because the scope and boundaries are settled, local implementation needs no provider account, the selected tools have official support for the required behavior, and every important path has a deterministic validation method.

The two-point deduction reflects two areas that can require iteration:

- this is a greenfield integration of Nx, Convex, TypeScript, Vite, Playwright and Cloudflare rather than an extension of an existing runtime workspace;
- live Google, Convex-cloud and Cloudflare configuration can reveal origin, token-audience or security-header issues that local tests cannot reproduce completely.

The locally complete gate is estimated at **9/10 confidence**. The hosted-verification gate is estimated at **7/10 confidence on the first attempt**, rising after the exact provider accounts, origins and public client ID are available. These are engineering-delivery estimates, not estimates of TableCards demand, revenue or commercial success.

## Scope Boundaries

### Included

- Root Nx/pnpm/TypeScript workspace and enforceable ownership tags.
- Public health contract and `/v1/health` HTTP endpoint.
- Exact `businessEnvironments` schema and `by_key` index.
- Internal create, inspect, list and update operations with immutable keys.
- Local operator CLI wrapping authenticated `convex run` calls.
- Direct Google OIDC configuration for the backoffice only.
- Server-side operator allowlist and protected overview query.
- Hosted, read-only, responsive backoffice.
- Unit, Convex integration and deterministic Playwright tests.
- Formatting, lint, type, boundary, secret-scan, build and test gates locally and in GitHub Actions.
- Cloudflare static deployment configuration and a manual, approval-gated development deployment path.
- Canonical documentation reconciliation and operator/developer runbooks.

### Excluded

- TableCards or any other Business workload.
- Public Business-environment discovery or CRUD.
- Dashboard create/edit/delete actions.
- `status`, disable/reactivate or deletion behavior.
- Business environment settings, allowed Business URLs or Business manifests.
- Better Auth, Convex Auth or any final Business-user auth selection.
- Users, authentication identities, accounts, memberships, service credentials, subscriptions, support, billing and analytics tables.
- A public BFF SDK or generated Convex types in public contracts.
- Live Google or cloud deployment in ordinary CI.
- Production/staging deployments, custom domain/DNS, Paddle and automated deployment credentials.

## Required Reading

### Codebase Files (read before implementing)

- `AGENTS.md:1` — repository source ordering, durable-artifact, status and secret-handling rules.
- `STATUS.md:7` — accepted Foundation handoff and current no-code state.
- `STATUS.md:40` — required planning/review sequence and immediate next moves.
- `.agent/brainstorms/build-1-foundation.md:154` — no remaining architecture questions and explicitly deferred choices.
- `.agent/brainstorms/build-1-foundation.md:160` — complete accepted Build 1 direction.
- `.agent/brainstorms/build-1-foundation.md:168` — exact table fields and excluded tables.
- `.agent/brainstorms/build-1-foundation.md:172` — dashboard, direct Google OIDC and operator-allowlist rules.
- `.agent/brainstorms/build-1-foundation.md:178` — deterministic local/CI quality gates.
- `.agent/brainstorms/build-1-foundation.md:196` — boundary-specific authentication model.
- `docs/factory/mvp-delivery-plan.md:56` — original Build 1 boundary to reconcile with the accepted brainstorm.
- `docs/architecture/adr/0001-convex-first-bff-stack.md:21` — accepted platform stack.
- `docs/architecture/adr/0001-convex-first-bff-stack.md:43` — monorepo ownership and public-contract boundary.
- `docs/architecture/adr/0001-convex-first-bff-stack.md:134` — stale `projects` first-table choice requiring partial supersession.
- `docs/architecture/adr/0001-convex-first-bff-stack.md:176` — deterministic focused-browser-test policy.
- `docs/operations/provider-accounts-and-secrets.md:9` — credential-free local work rule.
- `docs/operations/provider-accounts-and-secrets.md:125` — secret placement and repository-exclusion rules.
- `README.md:18` — stale stack summary that must distinguish operator auth from deferred Business auth.

### Internal Documentation

- `docs/products/tablecards-mvp.md` — confirms TableCards is the first Business but is outside this implementation slice.
- `docs/architecture/bff-mvp-architecture.md` — long-term ownership/topology context; reconcile terminology rather than scaffolding every future package.
- `docs/research/source-map.md` — provenance map for prior architectural research.

### External Documentation

- [Nx: add Nx to an existing project](https://nx.dev/docs/getting-started/start-with-existing-project) — initialize the existing documentation repository without replacing it.
- [Nx: enforce module boundaries](https://nx.dev/docs/features/enforce-module-boundaries) — configure free ESLint tag constraints for public, BFF and operator scopes.
- [Convex project configuration](https://docs.convex.dev/production/project-configuration) — set the nested functions directory and `node.nodeVersion: "24"` in root `convex.json`.
- [Convex local deployments](https://docs.convex.dev/cli/local-deployments) — run the complete backend locally without an account or cloud deployment.
- [Convex agent mode](https://docs.convex.dev/cli/agent-mode) — prefer local deployments for autonomous implementation and use cloud only for provider smoke checks.
- [Convex schema](https://docs.convex.dev/database/schemas) and [indexes](https://docs.convex.dev/database/reading-data/indexes/) — define the table, exact validators and `by_key` lookup.
- [Convex internal functions](https://docs.convex.dev/functions/internal-functions) — keep environment mutations inaccessible to released Businesses and browsers.
- [`convex run`](https://docs.convex.dev/cli/reference/run) — invoke internal functions from the operator CLI against an explicit deployment.
- [Convex custom OIDC provider](https://docs.convex.dev/auth/advanced/custom-auth) — validate Google's exact issuer and audience and adapt the React client token source.
- [Authentication in Convex functions](https://docs.convex.dev/auth/functions-auth) — obtain the verified `issuer` and `subject` for the operator guard.
- [`convex-test`](https://docs.convex.dev/testing/convex-test) — use `withIdentity` for auth tests and `t.fetch` for the HTTP health endpoint.
- [Google Identity Services web client setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) — configure public client ID and authorized local/hosted JavaScript origins.
- [Google Identity Services button](https://developers.google.com/identity/gsi/web/guides/display-button) — use popup mode and receive the ID-token credential in a JavaScript callback.
- [Cloudflare Workers static assets configuration](https://developers.cloudflare.com/workers/static-assets/configuration/) — deploy the Vite output as SPA static assets.
- [Cloudflare static custom headers](https://developers.cloudflare.com/workers/static-assets/headers/) — apply CSP, clickjacking, referrer and indexing protections.
- [Wrangler login/deploy commands](https://developers.cloudflare.com/workers/wrangler/commands/) — use user-approved device login for the manual development deploy; do not create a CI token in Build 1.
- [Playwright web server](https://playwright.dev/docs/test-webserver) — launch the isolated deterministic dashboard test entry.
- [GitHub Actions: setup Node with pnpm caching](https://github.com/actions/setup-node) — run the same root validation command using the committed lockfile.

### New Files to Create

The exact generator-created support files may vary, but implementation must produce this owned structure rather than alternate package boundaries:

- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` — pinned root workspace and scripts.
- `nx.json`, `tsconfig.base.json`, `eslint.config.mjs` — project graph, TypeScript aliases and dependency constraints.
- `.node-version`, `.npmrc`, `.prettierrc.json`, `.prettierignore`, `.gitignore` — reproducible local tooling and ignored local/provider state.
- `.secretlintrc.json` — baseline secret scanning.
- `convex.json` — root Convex functions-path and Node 24 configuration.
- `.github/workflows/ci.yml` — deterministic validation-only workflow.
- `docs/architecture/adr/0002-business-environments-and-operator-auth.md` — accepted refinements that partially supersede ADR 0001.
- `docs/operations/build-1-local-development.md` — setup, local Convex, CLI and validation runbook.
- `docs/operations/build-1-hosted-verification.md` — approval-gated Convex/Cloudflare/Google sequence and rollback notes.
- `platform/bff/libs/contracts/` — technology-neutral public health contract.
- `platform/bff/service/project.json` and `platform/bff/service/convex/` — Convex service, schema, auth, HTTP endpoint and tests.
- `tools/bff-operator/` — repository-owned Business-environment CLI and tests.
- `platform/bff/backoffice/` — React/Vite/Tailwind production app, test-only entry and component/unit tests.
- `platform/bff/backoffice-e2e/` — Playwright configuration and focused smoke tests.

## Dependency Baseline

Use Node.js 24.x and exact direct package versions. Keep every Nx package on the same version. Recheck the registry before installation if implementation begins after 2026-09-25.

| Package group | Planned exact version |
| --- | --- |
| `pnpm` | `12.6.0` |
| `nx`, `@nx/workspace`, `@nx/js`, `@nx/node`, `@nx/react`, `@nx/vite`, `@nx/playwright`, `@nx/eslint`, `@nx/eslint-plugin` | `23.2.1` |
| `typescript` | `6.0.3` |
| `react`, `react-dom` | `19.3.0` |
| `vite` | `8.3.1` |
| `@vitejs/plugin-react` | `6.1.1` |
| `vitest` | `4.1.11` |
| `convex` | `1.46.0` |
| `convex-test` | `0.0.60` |
| `@edge-runtime/vm` | `5.0.0` |
| `@convex-dev/eslint-plugin` | `5.0.0` |
| `@playwright/test` | `1.63.0` |
| `tailwindcss`, `@tailwindcss/vite` | `4.3.3` |
| `zod` | `4.6.5` |
| `tsx` | `4.23.15` |
| `eslint` | `10.11.0` |
| `prettier` | `3.9.9` |
| `secretlint`, `@secretlint/secretlint-rule-preset-recommend` | `13.0.6` |
| `@testing-library/react` | `16.3.3` |
| `@testing-library/jest-dom` | `7.0.1` |
| `jsdom` | `30.1.1` |
| `wrangler` | `4.141.0` |

Use generator-selected compatible versions for ancillary direct packages such as React type packages only after confirming them with `pnpm why` and the Nx generator output. Do not leave floating `latest`, `*` or unbounded versions in the committed manifest.

## Codebase Context

### Existing Architecture and Integration Points

There is no existing runtime code to extend. The accepted documentation establishes these integration boundaries:

```text
Google GIS popup ── ID token ──> Convex auth verification
                                      │
                                      ▼
React backoffice ── protected query ─> requireOperator ─> businessEnvironments
       │
       └──────── public HTTP ────────> GET /v1/health

Codex/operator ── local CLI ── convex CLI/deploy access ─> internal mutations

Tests ── mocked Convex identity + test-only UI adapter ──> same domain/UI behavior
```

Business workloads do not participate in Build 1. The only browser caller is the operator dashboard, the only public HTTP behavior is health, and the only mutation caller is the local operator CLI.

### Planned Project Tags and Dependency Rules

| Project | Tags | May depend on |
| --- | --- | --- |
| `bff-contracts` | `scope:public`, `type:contract` | `scope:public` only |
| `bff-service` | `scope:bff`, `type:service` | `scope:bff`, `scope:public` |
| `bff-backoffice` | `scope:bff`, `type:app` | `scope:bff`, `scope:public` |
| `bff-backoffice-e2e` | `scope:bff`, `type:e2e` | the backoffice test surface only |
| `bff-operator` | `scope:operator`, `type:tool` | `scope:operator`, `scope:public`; service calls happen by subprocess, not source import |

Reserve `scope:business` for future Business-owned projects and deny it access to `scope:bff` internals. Do not create a fake Business project merely to exercise the rule; test the ESLint constraint with rule-level fixtures or an intentionally failing temporary check during implementation.

### Patterns to Follow

#### Naming and Organization

- Use **Business environment** in domain/UI text and `businessEnvironment`/`businessEnvironments` in code.
- Use **BFF deployment** for a running Convex deployment; never overload Business environment with deployment.
- Use lower-case kebab-case immutable keys, 3–64 characters, matching `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- Trim `businessName` and `environmentName`; require 1–80 characters after trimming.
- Keep public contracts free of Convex document IDs, generated API types and database document shapes.

#### Error Handling

No runtime convention exists, so Build 1 establishes one deliberately small pattern:

- Domain/internal function failures use `ConvexError` with stable codes: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT` and `VALIDATION_ERROR`.
- Public health returns a validated success document and an HTTP `200`; unexpected failures use a minimal JSON error document without stack traces or provider details.
- CLI failures map stable domain/argument errors to concise stderr messages and a non-zero exit code. Never print raw environment variables, access tokens, deployment credentials or the full operator allowlist.
- The dashboard distinguishes signed-out, signed-in-but-forbidden, loading, empty and transient-error states without exposing raw backend errors.

#### Logging and Observability

- Include service/build version in health and the dashboard; inject a commit SHA or release identifier at build/deploy time and default locally to `development`.
- Log operation name and target deployment for CLI work, with an explicit confirmation before a non-local target. Do not log mutation payloads that may gain sensitive fields later.
- Build 1 adds no third-party monitoring vendor. Convex/Cloudflare platform logs plus deterministic validation are sufficient for this slice.

#### Authentication and Authorization

- `/v1/health` is public and contains no registry or configuration details.
- Convex `auth.config.ts` trusts only Google's exact issuer and the configured public client audience when `GOOGLE_CLIENT_ID` is present.
- `requireOperator` requires a verified identity and matches the pair `(issuer, subject)` against a strict server-side JSON allowlist. It fails closed when the variable is absent, malformed or empty.
- The bounded `currentOperator` probe may return only the caller's own issuer, subject and `authorized` boolean so the first operator can be identified without exposing the allowlist.
- The protected `backoffice.overview` query must call `requireOperator` before reading any table.
- The Google token remains in browser memory. On expiry, the adapter obtains a fresh token if supported or returns to signed-out/re-authentication; it does not persist the ID token in local storage.
- Unit/Convex tests use `withIdentity`. Playwright uses a separate test-only app entry and adapter. Shared development and production builds contain no unsigned-token, header, test-issuer or skip-auth path.

#### Data and Migrations

Build 1 creates exactly one application table:

| Field | Source | Rule |
| --- | --- | --- |
| `_id` | Convex | internal only; not part of the public health contract |
| `_creationTime` | Convex | shown read-only in the dashboard |
| `key` | application | immutable, normalized kebab-case, unique through `by_key` lookup plus transactional rejection |
| `businessName` | application | editable trimmed display label |
| `environmentName` | application | editable trimmed display label |
| `updatedAt` | server | set with server time on create/update |

- Define `by_key` on `key` and use the index for every key lookup.
- Never scan then enforce uniqueness outside the mutation transaction.
- List through a bounded page/limit (initial dashboard maximum 100) rather than an unbounded collection.
- Do not add `status`, `settings`, URLs, credentials, operator/user/account tables or seed data.
- No migration is required because the repository has no database. Schema deployment is additive. Local fixtures must be disposable; cloud data must be intentional.

#### Testing

- Vitest is the unit runner for contracts, pure domain functions, CLI parsing/runner behavior and React components.
- `convex-test` runs the real Convex schema/functions in memory with mocked identities and HTTP actions; no cloud backend or provider is needed.
- Playwright starts a Vite server using a test-only entry that injects deterministic health, identity and environment adapters into the same dashboard component tree.
- The normal production Vite build must not include the test entry or its fixture marker. Add an assertion over the production output to make this enforceable.
- CI runs the same root `pnpm check` command as local development and never contacts live Google, Convex cloud, Cloudflare or Paddle after dependency/browser installation.

## Design Decisions

- **Decision**: Use one root integrated Nx workspace, not nested package managers.
  - **Rationale**: The accepted architecture needs one enforceable project graph and one validation command.
  - **Tradeoff**: Initial setup is larger than isolated packages, but future ownership drift is caught early.

- **Decision**: Keep public contracts in `platform/bff/libs/contracts` and generated Convex types inside BFF-owned projects.
  - **Rationale**: Future Business projects need a technology-neutral API boundary.
  - **Tradeoff**: The backoffice may use an internal generated client because it is BFF-owned, while public consumers cannot.

- **Decision**: Persist Business environments, but expose mutation only through internal Convex functions and an operator CLI.
  - **Rationale**: New environments should not require a BFF release, and released Businesses must not self-register.
  - **Tradeoff**: Operators need authenticated deployment access; there is intentionally no web CRUD.

- **Decision**: Use direct Google OIDC only for Build 1 operator auth.
  - **Rationale**: The dashboard has at most a few fixed operators and does not need a general user/session/account system.
  - **Tradeoff**: Google is the only operator provider and an expired browser ID token may require a quick re-sign-in.

- **Decision**: Use a separate test-only Vite entry rather than a runtime authentication bypass.
  - **Rationale**: Deterministic Playwright coverage must not weaken the shared dev or hosted deployment.
  - **Tradeoff**: E2E configuration has a second entry/server, and the production build needs a leakage assertion.

- **Decision**: Make local completion provider-independent and hosted verification a separate approval gate.
  - **Rationale**: Code quality and authorization behavior must not wait for user credentials or live services.
  - **Tradeoff**: Live Google/origin mistakes can only be found after the locally complete gate.

- **Decision**: Use manual, user-approved development deployments; do not add continuous deployment.
  - **Rationale**: Build 1 needs a hosted dashboard but not production automation or long-lived provider tokens.
  - **Tradeoff**: Hosted updates require an explicit operator action until a later deployment build owns automation.

## Implementation Plan

### Phase 1: Canonical decisions and workspace

Record the accepted refinements in an ADR, reconcile stale canonical text, then establish the pinned Nx/pnpm/TypeScript workspace, ownership tags and root validation scripts without creating future capability packages.

### Phase 2: Service, data and operator path

Implement the public health contract/endpoint, the exact Business-environment schema and internal operations, then add the local operator CLI. Prove the contract, validation, uniqueness, immutable-key and bounded-read behavior locally.

### Phase 3: Operator authentication and dashboard

Add Google custom OIDC configuration, the fail-closed operator guard and bounded overview query. Build the responsive read-only backoffice and the test-only adapter entry, without exposing deployment credentials or management controls.

### Phase 4: Deterministic quality gates

Complete unit, Convex integration and Playwright coverage; add production-bundle leak checks, formatting/lint/type/boundary/secret/build targets and validation-only GitHub Actions. Run the full local completion gate using a local Convex backend where required.

### Phase 5: Approval-gated hosted verification

Only after explicit approval, provision/select one Business Factory Convex development deployment, deploy the Cloudflare static site, configure a Google web client, bootstrap the first operator identity and run live hosted smoke checks. Preserve every secret outside the repository.

## Step-by-Step Tasks

Execute in dependency order. Commands labeled **planned** are created by the named task and do not exist at this baseline.

### Task 1: CREATE the accepted ADR and UPDATE canonical documentation

- **Targets**: `docs/architecture/adr/0002-business-environments-and-operator-auth.md`, `docs/architecture/adr/0001-convex-first-bff-stack.md`, `docs/architecture/bff-mvp-architecture.md`, `docs/factory/mvp-delivery-plan.md`, `docs/operations/provider-accounts-and-secrets.md`, `README.md`.
- **Implement**:
  - Record `Business`, `Business environment`, `BFF deployment` and `workload` terminology.
  - Record the one-row-per-environment isolation boundary, exact Build 1 registry ownership and operator-only mutation path.
  - Record direct Google OIDC plus operator allowlist as Build 1 backoffice auth, while reopening the Business-user auth mechanism for Build 2.
  - Record environment-local future user rows/credentials without implementing their tables.
  - Update Build 1 acceptance to include the hosted read-only dashboard; remove the stale Better Auth/`projects`/one-`SITE_URL` instructions where they claim to govern this slice.
  - Mark only the affected ADR 0001 sections partially superseded and link ADR 0002. Preserve its still-valid stack, public-boundary and testing decisions.
- **Pattern**: `docs/architecture/adr/0001-convex-first-bff-stack.md:1` — retain ADR context/decision/consequence structure and history rather than rewriting past rationale.
- **Dependencies/Imports**: accepted brainstorm only.
- **Gotchas**: Do not prematurely choose the Build 2 Business-user auth library or add future settings fields.
- **Validate**: `git diff --check -- README.md docs` and `rg -n "ADR 0002|businessEnvironments|direct Google OIDC" README.md docs`.

### Task 2: CREATE the pinned root Nx/pnpm/TypeScript workspace

- **Targets**: root manifest/config files listed under New Files, plus Nx `project.json` files for the five real projects.
- **Implement**:
  - Declare Node 24 and `pnpm@12.6.0`; pin the dependency baseline and commit the lockfile.
  - Initialize Nx in the existing repository without moving or deleting documentation.
  - Configure TypeScript strict mode, ESM where supported, Vite/Vitest/React/Playwright plugins and deterministic output paths.
  - Add root scripts: `format`, `format:check`, `lint`, `typecheck`, `test`, `test:integration`, `test:e2e`, `build`, `secrets:scan`, `check`, `convex:local`, `convex:check` and `bff:environment`.
  - Configure Nx tags/ESLint constraints from the project-tag table; do not enable Nx Cloud or paid conformance.
  - Configure `convex.json` with its schema, `functions: "platform/bff/service/convex/"`, `node.nodeVersion: "24"` and AI file prompts disabled because repository-owned skills already govern the work.
  - Ignore `.env*`, `.convex/`, Wrangler local state, Playwright artifacts and local credential files while retaining checked-in `.env.example` files containing names/placeholders only.
- **Pattern**: `docs/architecture/adr/0001-convex-first-bff-stack.md:43` — one monorepo with public/BFF/Business ownership boundaries.
- **Dependencies/Imports**: exact versions in Dependency Baseline.
- **Gotchas**: The machine starts on Node 20; switch to Node 24 before install. Run generator dry-runs where available. Preserve all current dirty-worktree changes. TypeScript 7 compatibility requires the selected current Nx/Convex versions and must be proven by typecheck.
- **Validate**: **planned** `pnpm install --frozen-lockfile && pnpm exec nx show projects && pnpm typecheck && pnpm lint`.

### Task 3: CREATE the public health contract library

- **Targets**: `platform/bff/libs/contracts/src/health.ts`, `platform/bff/libs/contracts/src/index.ts`, project config and adjacent tests.
- **Implement**:
  - Define a Zod-backed, JSON-safe `HealthResponse` containing `status: "ok"`, `service: "business-factory-bff"` and a non-empty `version`.
  - Export inferred TypeScript types and parse helpers from the library entry only.
  - Keep the contract independent of Convex, React and database IDs.
- **Pattern**: `.agent/brainstorms/build-1-foundation.md:38` — public contracts cannot import Convex-generated types.
- **Dependencies/Imports**: `zod` only.
- **Gotchas**: Do not create a generic SDK, client or speculative universal response envelope.
- **Validate**: **planned** `pnpm exec nx test bff-contracts && pnpm exec nx lint bff-contracts && pnpm exec nx build bff-contracts`.

### Task 4: CREATE the Convex service, public health endpoint and schema

- **Targets**: `platform/bff/service/convex/schema.ts`, `http.ts`, service helpers/config and generated Convex files.
- **Implement**:
  - Define only `businessEnvironments` with exact fields and `by_key` index.
  - Register `GET /v1/health` in `http.ts`; populate version from deployment/build configuration with `development` fallback and validate the response against the public contract.
  - Add strict value/return validators to all functions and bounded HTTP headers (`application/json`, no-store where appropriate).
  - Generate and commit Convex API/data model output required by clients and CI.
- **Pattern**: `.agent/brainstorms/build-1-foundation.md:168` — authoritative Build 1 table shape.
- **Dependencies/Imports**: `convex`, `bff-contracts`.
- **Gotchas**: No seed rows, auth tables, `status`, `settings` or environment URLs. Do not expose table documents from the public HTTP boundary.
- **Validate**: **planned** `pnpm exec nx test bff-service --testPathPattern=health && pnpm convex:check`.

### Task 5: CREATE validated Business-environment domain operations

- **Targets**: `platform/bff/service/convex/businessEnvironments.ts`, validation helpers and adjacent `convex-test` suites.
- **Implement**:
  - Add internal `create`, `inspect`, `list` and `update` query/mutation functions.
  - Normalize/validate keys and labels at the server boundary; use the `by_key` index.
  - Reject duplicate keys transactionally with `CONFLICT`.
  - Keep `key` out of the update arguments so it is structurally immutable.
  - Set `updatedAt` with server time and return a deliberate projection.
  - Bound list results to 100 and use deterministic key ordering for the initial operator view.
  - Share pure validation/domain helpers with adapters without making internal Convex functions public.
- **Pattern**: `.agent/brainstorms/build-1-foundation.md:164` — create/inspect/update only, no lifecycle or deletion.
- **Dependencies/Imports**: Convex validators/errors; no UI or CLI imports.
- **Gotchas**: Never use raw import/direct database edits as the management path. Two rows for the same Business are valid when their environment keys differ.
- **Validate**: **planned** `pnpm exec nx test bff-service --testPathPattern=businessEnvironments`.

### Task 6: CREATE the repository-owned operator CLI

- **Targets**: `tools/bff-operator/src/main.ts`, argument/domain modules, subprocess adapter, project config and tests.
- **Implement**:
  - Expose `create`, `inspect`, `list` and `update` subcommands through root `pnpm bff:environment -- ...`.
  - Require an explicit deployment selector (`local`, `dev` or a documented deployment reference) and print the resolved non-secret target before execution.
  - Use Node `parseArgs` and `execFile`/argument arrays to call `pnpm exec convex run <internal-function> <json> --deployment <target>`; never construct a shell command.
  - Reject attempts to update `key`, unknown flags, invalid labels and missing targets before invoking Convex.
  - Require an explicit confirmation flag for every cloud target; Build 1 runbooks must not define a production target.
  - Keep backend validation authoritative and map its structured errors to stable CLI exits.
  - Unit-test the runner through an injected subprocess port; do not invoke a live backend in unit tests.
- **Pattern**: `.agent/brainstorms/build-1-foundation.md:166` — local wrapper around authenticated internal Convex operations.
- **Dependencies/Imports**: Node standard library, `tsx`; subprocess boundary to Convex CLI rather than service-source import.
- **Gotchas**: Redact inherited deployment credentials in errors and never accept credentials as CLI arguments.
- **Validate**: **planned** `pnpm exec nx test bff-operator && pnpm bff:environment -- --help`; after Task 11, exercise all four commands against disposable local state.

### Task 7: CREATE direct Google OIDC configuration and operator authorization

- **Targets**: `platform/bff/service/convex/auth.config.ts`, `lib/authorization.ts`, `backoffice.ts` and auth tests.
- **Implement**:
  - Configure Google's exact issuer and `GOOGLE_CLIENT_ID` audience for hosted deployments; permit an empty provider list only when the variable is absent in local deterministic development.
  - Parse `BFF_OPERATOR_IDENTITIES` as a strict JSON array of `{ "issuer": string, "subject": string }`; reject malformed/duplicate entries and fail closed.
  - Implement `requireOperator(ctx)` once and call it at the top of every protected dashboard query.
  - Add `currentOperator` as the only bounded bootstrap probe: signed-out state or the caller's own issuer/subject and authorization flag, never the allowlist.
  - Add `backoffice.overview` returning service/build metadata and a bounded projected environment list only after authorization.
  - Test signed out, allowed identity, unrelated Google identity, wrong issuer/audience behavior at the correct layer, malformed allowlist and absent allowlist.
- **Pattern**: `.agent/brainstorms/build-1-foundation.md:172` — direct OIDC plus fixed allowlist; no general auth data model.
- **Dependencies/Imports**: Convex custom auth and `ConvexError`.
- **Gotchas**: Do not authorize by email, do not store Google access/refresh tokens, and do not reuse this guard as future Business-user auth.
- **Validate**: **planned** `pnpm exec nx test bff-service --testPathPattern=authorization`.

### Task 8: CREATE the responsive read-only backoffice

- **Targets**: `platform/bff/backoffice/src/`, Vite/Tailwind configs, `.env.example`, `public/_headers`, `wrangler.jsonc` and component tests.
- **Implement**:
  - Build explicit signed-out, identifying, forbidden, loading, empty, ready and error states.
  - Load Google Identity Services only in the production entry; use popup mode and the public `VITE_GOOGLE_CLIENT_ID`.
  - Adapt the short-lived in-memory Google ID token to Convex auth. Decode expiry only to decide when to reauthenticate; rely on Convex for cryptographic verification.
  - Query `currentOperator`, then `backoffice.overview` only for an authorized identity. Fetch and validate `/v1/health` through the public contract.
  - Show status, version and Business-environment key/names/timestamps in a phone-first layout. Provide the unauthorized operator's own stable identity values with a copy action for controlled bootstrap.
  - Add no registry mutation controls, navigation shell, design system or future domain cards.
  - Configure the Workers Static Assets SPA output and security headers: restrictive CSP that admits required Google/Convex origins, `frame-ancestors 'none'`, no sniffing, strict referrer policy, permissions policy and search-engine noindex.
- **Pattern**: `.agent/brainstorms/build-1-foundation.md:172` — exact dashboard purpose and authentication boundary.
- **Dependencies/Imports**: React, Convex React client, Tailwind/Vite, `bff-contracts`, BFF-internal generated API.
- **Gotchas**: The Google client ID and Convex URL are public build configuration; deployment keys and the operator allowlist never enter Vite variables. Verify Google CSP/COOP needs in popup mode rather than copying a permissive policy.
- **Validate**: **planned** `pnpm exec nx test bff-backoffice && pnpm exec nx build bff-backoffice`.

### Task 9: CREATE the deterministic Playwright harness and smoke flow

- **Targets**: `platform/bff/backoffice/src/main.e2e.tsx`, `vite.e2e.config.ts`, `platform/bff/backoffice-e2e/` and a production-output leak assertion.
- **Implement**:
  - Extract a small typed adapter boundary around health, identity and overview data while keeping the production entry responsible for Google/Convex wiring.
  - Make the test-only Vite entry inject a deterministic authorized operator, health result and two sample Business environments.
  - Test the useful happy flow at phone and desktop sizes: dashboard renders status/version, both rows are readable and there are no edit/delete controls.
  - Add one forbidden-state browser check if it remains cheap; keep detailed denial rules in Convex tests.
  - Assert the production build contains neither the test fixture marker nor a test-auth selector/import.
- **Pattern**: `docs/architecture/adr/0001-convex-first-bff-stack.md:176` — small happy-path browser regression; denial paths belong below the browser layer.
- **Dependencies/Imports**: Playwright and the backoffice's exported composition surface.
- **Gotchas**: No query flag, header or environment variable in the production entry may activate test auth. The E2E server must be a separate config/target.
- **Validate**: **planned** `pnpm test:e2e && pnpm exec nx run bff-backoffice:assert-production-bundle`.

### Task 10: CREATE deterministic quality gates and GitHub Actions

- **Targets**: root scripts/config, `.secretlintrc.json`, `.github/workflows/ci.yml`.
- **Implement**:
  - Make `pnpm check` run formatting check, lint/Nx boundaries, typecheck, unit/Convex integration tests, production builds, bundle leak assertion, secret scan and Playwright in a stable order.
  - Configure Secretlint with ignored generated/build/vendor/local-state paths and no blanket suppression for source/docs/config.
  - Configure GitHub Actions on pull requests and default-branch pushes with Node 24, Corepack/pinned pnpm, pnpm cache, frozen install and pinned Playwright Chromium installation.
  - Run `pnpm check` as the single CI quality command.
  - Grant minimal workflow permissions (`contents: read`) and provide no provider/deploy secrets.
  - Add Nx boundary tests or fixture validation proving future `scope:business` cannot import `scope:bff` and public contracts cannot import service internals.
- **Pattern**: `.agent/brainstorms/build-1-foundation.md:178` — local/CI parity and no live-provider CI.
- **Dependencies/Imports**: GitHub-maintained action versions, Nx, Playwright, Secretlint.
- **Gotchas**: Do not add coverage quotas, Nx Cloud, live Google, a cloud Convex deployment or Cloudflare deployment to CI.
- **Validate**: **planned** `pnpm check`; inspect workflow with `pnpm exec prettier --check .github/workflows/ci.yml` and confirm no `${{ secrets.* }}` references exist.

### Task 11: VERIFY the locally complete gate

- **Targets**: all runtime projects and `docs/operations/build-1-local-development.md`.
- **Implement**:
  - Create/select a local Convex deployment using the documented local flow and push/codegen the exact schema/functions.
  - Start the local backend and backoffice without Google/provider configuration; verify health and the deterministic test entry separately.
  - Use the operator CLI against disposable local state to create two environments for one dummy Business, list/inspect them, update one label and prove duplicate-key/key-update rejection.
  - Run all unit, `convex-test`, browser, boundary, secret, formatting, lint, type and production-build checks from a clean install.
  - Verify no ignored credential/local-state file is staged and record any account metadata created while selecting the local deployment.
  - Document exact prerequisites, commands, expected ports, teardown and common recovery steps.
- **Pattern**: `docs/operations/provider-accounts-and-secrets.md:9` — local implementation requires no new provider token.
- **Dependencies/Imports**: Tasks 2–10.
- **Gotchas**: Local Convex filesystem state is disposable and uncommitted. The current Convex CLI associated local initialization with the separate `business-factory` project record; this did not push functions or data to a cloud deployment.
- **Validate**: **planned** `pnpm install --frozen-lockfile && pnpm convex:check && pnpm check`, followed by the documented CLI local smoke sequence.

### Task 12: UPDATE `STATUS.md` for the local implementation handoff

- **Implement**: Record locally completed behavior, validation results, hosted-verification status and exact remaining human/provider gates. Keep it short and link this plan/runbooks rather than copying them.
- **Pattern**: `AGENTS.md:12` — status is the short current handoff, not a second source of truth.
- **Dependencies/Imports**: successful Task 11.
- **Gotchas**: Do not mark Build 1 fully hosted or the plan Completed while Task 13 remains unapproved/unverified.
- **Validate**: `git diff --check -- STATUS.md` and manual comparison with canonical docs.

### Task 13: PROVISION and VERIFY the hosted development slice after explicit approval

- **Targets**: one Business Factory Convex cloud development deployment inside the existing project record, one Cloudflare Workers static-assets site and one Google web OAuth client; no production resources.
- **Implement**:
  1. Recheck CLI identities and show Andrew the exact Convex team/project and Cloudflare account/site names. Wait for explicit approval before creation/deploy.
  2. Use the existing Convex login if still valid; otherwise Andrew completes the one-time browser/device login. Select or create one cloud development deployment inside the existing Business Factory project record; never reuse Podcat.
  3. Push the already-validated schema/functions and set non-secret build version. Do not create dummy cloud rows.
  4. With Andrew's approval, complete `wrangler login --device` and deploy an initial configuration-pending static shell to the stable `workers.dev` origin (planned name `business-factory-backoffice-dev`, subject to availability).
  5. Andrew creates/selects a Google Cloud web client or grants equivalent scoped access. Configure only the localhost origin(s) and exact Cloudflare origin, basic identity and popup flow. Capture only the public client ID; no client secret is requested or stored.
  6. Set `GOOGLE_CLIENT_ID` in the Convex development environment and the corresponding public Vite build variable outside the repository; rebuild/redeploy.
  7. Andrew performs one real Google sign-in. The bounded probe displays his verified issuer/subject while denying overview access.
  8. Add only that identity to `BFF_OPERATOR_IDENTITIES` through `convex env set`/stdin or another non-logging secret-safe path; reload and verify authorized overview access.
  9. Run public health, pre-allowlist denial, authorized dashboard, token-expiry/re-login and phone-size smoke checks. Optionally Andrew opens the URL on his physical phone; Playwright phone viewport remains the required automated check.
  10. Record exact resource names and verification outcome in the hosted runbook and `STATUS.md`, without recording tokens, deploy keys or operator identity values.
- **Pattern**: `docs/operations/provider-accounts-and-secrets.md:140` — provider work follows credential-free local completion and stays explicitly authorized.
- **Dependencies/Imports**: successful local gate and Andrew's explicit deployment approval.
- **Gotchas**: Do not create a Google client secret, custom domain, production/staging deployment, Cloudflare API token, GitHub deployment secret or Paddle resource. Never paste a Google ID token or deploy key into chat/repository/logs.
- **Validate**: run the hosted checklist in `docs/operations/build-1-hosted-verification.md`; rerun local **planned** `pnpm check` against the exact deployed commit before and after provider configuration.

### Task 14: MARK the retained plan complete only after both required gates

- **Targets**: this plan's lifecycle header/history and `STATUS.md`.
- **Implement**: After Task 11 and, if Andrew chooses hosted completion in this execution, Task 13 both pass, mark the plan `Completed`, add the completion date and concise validation/deployment result. If implementation is intentionally handed off after local completion, mark the plan `Locally complete — Hosted verification pending` and record hosted verification as the immediate next move in `STATUS.md`.
- **Pattern**: `AGENTS.md:21` — retain plans and use lifecycle status rather than deleting them.
- **Dependencies/Imports**: completion evidence.
- **Gotchas**: A responsive Playwright viewport is not a claim that Andrew personally tested a physical phone; record that separately if performed.
- **Validate**: `git diff --check -- .agent/plans/build-1-foundation.md STATUS.md`.

## Access and Human Handoff Matrix

### What Codex can complete without Andrew

| Work | Account/credential needed | Proof |
| --- | --- | --- |
| Workspace, packages, boundaries and documentation | None | clean install, Nx graph, lint/type/build |
| Convex schema/functions and local backend | No new credential; existing local project association | local push/codegen and `convex-test` |
| Registry behavior and CLI | None | unit tests plus disposable local CLI smoke |
| Auth guard behavior | None | mocked verified identities through `convex-test` |
| Backoffice states and responsive UI | None | component tests and deterministic Playwright |
| Production-bundle no-bypass proof | None | build artifact assertion |
| Secret scan and GitHub Actions definition | None | local `pnpm check` and workflow inspection |

### What requires Andrew or explicit authority

| Gate | Andrew's smallest required action | Codex continues with |
| --- | --- | --- |
| Convex cloud | Approve the exact Business Factory project and proposed cloud development deployment; complete login only if the saved CLI session is invalid | development-deployment selection/creation, function push and configuration |
| Cloudflare development hosting | Approve the exact account/site and authorize Wrangler device login | static site creation/deploy and headers |
| Google web client | Create/select the Google Cloud project/client, or grant equivalent scoped access; confirm consent/test-user setup | exact origin configuration guidance and public client-ID wiring |
| First operator bootstrap | Complete one real Google sign-in | read the bounded on-screen identity, set server allowlist safely and re-test |
| Production or custom domain | Not requested in Build 1 | deferred to a separately approved deployment task |

### Explicitly not required for Build 1

- Google client secret or refresh token.
- Better Auth account, secret or subscription.
- Paddle seller credentials.
- Custom domain or DNS changes.
- Production Convex/Google/Cloudflare configuration.
- Cloudflare API token or GitHub deployment secrets.
- Nx Cloud account.
- Andrew's credentials pasted into chat or repository files.

## Testing Strategy

### Unit Tests

- Health contract accepts the exact shape and rejects missing/invalid status, service or version.
- Key/label normalization and validation cover empty, whitespace, length, uppercase/invalid separators and boundary lengths.
- Operator allowlist parser covers absent, malformed, duplicate and valid pairs and never authorizes by email.
- CLI parser covers every command, explicit targets, cloud confirmation, immutable key, invalid flags and safe argument construction.
- Dashboard components cover signed-out, forbidden, loading, empty, ready and error states.

### Convex Integration Tests

- Health `t.fetch('/v1/health')` returns HTTP 200 and matches the public schema.
- Create/list/inspect/update works and server timestamps change.
- Duplicate key fails with `CONFLICT`; missing key fails with `NOT_FOUND`; invalid values fail with `VALIDATION_ERROR`.
- Key cannot be updated because it is absent from the mutation contract.
- Two environments for one Business remain independently addressable and label updates do not affect the sibling row.
- Signed-out overview fails `UNAUTHENTICATED`.
- Authenticated but unlisted Google identity sees only its own probe result and fails `FORBIDDEN` on overview.
- Listed identity receives only the bounded dashboard projection.
- No test claims user/product-data cross-environment isolation before scoped user/product tables exist.

### End-to-End Validation

- Deterministic Playwright runs against the test-only Vite entry at phone and desktop viewports.
- It verifies the dashboard's meaningful happy flow and absence of management controls without Google/network dependencies.
- Production output is scanned to prove the test adapter/fixtures are absent.
- Hosted smoke, when authorized, verifies actual Google origin/audience wiring, operator bootstrap, denial before allowlisting and authorization afterward.

### Edge Cases

- Missing/malformed operator allowlist fails closed while health remains available.
- Expired Google token returns to reauthentication and does not keep stale authorized data visible.
- Wrong Google audience/issuer is rejected by Convex before the operator guard.
- Empty registry renders a useful empty state rather than requiring fake cloud data.
- More than 100 environments does not trigger an unbounded read; UI can state that the initial view is bounded until pagination has a real need.
- A CLI cloud target without explicit confirmation is refused.
- A subprocess/provider error cannot echo credentials or full environment contents.
- CSP/COOP permits the selected Google popup/Convex connections while denying arbitrary scripts and embedding.

## Validation Commands

All commands run from `/root/projects/bff`. They are **planned additions** because the baseline has no runtime tooling.

### Environment and install

```bash
node --version                 # must be 24.x
corepack enable
pnpm --version                 # must resolve to 12.6.0
pnpm install --frozen-lockfile
```

### Syntax, graph and types

```bash
pnpm exec nx show projects
pnpm typecheck
pnpm convex:check
```

### Tests

```bash
pnpm test
pnpm test:integration
pnpm test:e2e
```

### Lint, formatting, secrets and builds

```bash
pnpm format:check
pnpm lint
pnpm secrets:scan
pnpm build
pnpm exec nx run bff-backoffice:assert-production-bundle
```

### Complete local gate

```bash
pnpm check
```

### Manual local validation

Follow `docs/operations/build-1-local-development.md` to start/select disposable local Convex, then exercise the planned commands:

```bash
pnpm bff:environment -- create --deployment local --key sample-dev --business-name Sample --environment-name Development
pnpm bff:environment -- create --deployment local --key sample-qa --business-name Sample --environment-name QA
pnpm bff:environment -- list --deployment local
pnpm bff:environment -- inspect --deployment local --key sample-dev
pnpm bff:environment -- update --deployment local --key sample-dev --environment-name Local
```

Also verify duplicate create and key-update attempts fail. The precise CLI flag spelling may be adjusted during Task 6 only if the committed `--help`, tests and runbook all agree.

## Acceptance Criteria

### Locally complete — required before requesting provider access

- [x] A fresh Node 24/pnpm install succeeds from the committed lockfile.
- [x] Nx lists only the real Build 1 projects and enforces the accepted dependency directions.
- [x] `GET /v1/health` returns the validated technology-neutral service/version response.
- [x] `businessEnvironments` is the only application table and has only the accepted fields/index.
- [x] Internal create/inspect/list/update operations enforce unique immutable keys, validation and bounded reads.
- [x] The repository CLI performs those operations against explicit disposable local state and has no public/self-registration path.
- [x] Signed-out and unlisted identities cannot read the protected overview; a listed mocked identity can.
- [x] The backoffice renders all required states and the environment list at phone and desktop sizes.
- [x] The deterministic browser flow uses no Google/provider/network account and no test-auth path is present in the production bundle.
- [x] `pnpm check` passes formatting, lint/boundaries, types, tests, builds, bundle assertion, secret scan and Playwright.
- [x] GitHub Actions runs the same validation command with no provider secrets or deployment step.
- [x] Canonical documentation and ADRs match the accepted terminology/auth/data direction.
- [x] No TableCards code, placeholder SDK or speculative domain tables/packages are added.

### Hosted verified — required only after Andrew authorizes deployment

- [ ] One separate Business Factory Convex development deployment serves the validated commit.
- [ ] The Cloudflare-hosted backoffice is reachable by HTTPS and usable at a phone viewport.
- [ ] Google accepts only the configured local/hosted origins and requires no client secret.
- [ ] An arbitrary/unlisted signed-in identity cannot read the dashboard overview.
- [ ] Andrew's verified `(issuer, subject)` can be allowlisted without storing it or any token in the repository.
- [ ] The authorized dashboard shows hosted health/version and an intentional empty or real environment list.
- [ ] No production, staging, domain, billing or continuous-deployment resource was created.

## Risks and Mitigations

- **Risk**: Direct Google token handling grows into a home-built general authentication system.
  - **Mitigation**: Limit it to the fixed operator dashboard, store no sessions/provider tokens, and leave Business-user auth explicitly deferred.

- **Risk**: A test authentication mechanism reaches a shared deployment.
  - **Mitigation**: Separate Vite entry/config, no runtime switch in production, build-output assertion and real server-side auth on every hosted query.

- **Risk**: An allowlist mistake locks out the only operator.
  - **Mitigation**: Keep a bounded self-identity probe available to authenticated callers, strict parser diagnostics in server logs and a documented `convex env set` recovery path.

- **Risk**: Registry data leaks through a public/browser function.
  - **Mitigation**: Public health carries no registry data; overview calls `requireOperator` first and returns an explicit projection; mutations remain internal.

- **Risk**: Shared BFF data later misses Business-environment scoping.
  - **Mitigation**: ADR establishes the invariant now, but Build 1 makes no false isolation claim. Every future scoped table/function must add negative cross-environment tests in its owning build.

- **Risk**: Greenfield package versions or generators differ from the planning snapshot.
  - **Mitigation**: Pin exact direct versions, run generator dry-runs, commit the lockfile and re-verify official compatibility if implementation starts later.

- **Risk**: Local Convex succeeds while hosted Google/origin configuration fails.
  - **Mitigation**: Keep hosted verification as a separate checklist after local completion and deploy the static origin before finalizing Google's allowed origins.

- **Risk**: Provider setup accidentally targets Podcat or a production account/resource.
  - **Mitigation**: Resolve and display exact resource names, require explicit user approval, use only the existing separate Business Factory project record and add no production alias.

- **Risk**: No-delete registry makes test cloud rows permanent.
  - **Mitigation**: Use in-memory/local fixtures only; create cloud rows only for real requested Business environments.

- **Risk**: Security headers break Google popup or Convex connectivity.
  - **Mitigation**: Derive the narrow allowlist from official endpoints, test the deployed headers/browser console and avoid `unsafe-inline` unless Google documentation proves it necessary.

## Rollback and Recovery

- The first schema is additive and has no migration. Before hosted use, rollback is simply restoring the last known-good commit and local state.
- On the development Convex deployment, redeploy the last validated commit if a function/auth configuration regression occurs. Do not delete data as a rollback strategy.
- On Cloudflare, redeploy the prior known-good static artifact/commit; no DNS/custom domain is changed in Build 1.
- If Google wiring fails, remove/disable the hosted client configuration and leave the public health endpoint available; local deterministic checks remain authoritative for code behavior.
- If operator configuration is wrong, use authenticated deployment access to replace `BFF_OPERATOR_IDENTITIES`; never add a temporary bypass.

## Open Questions

None. Resource names and account selections are execution-time authorization gates, not unresolved architecture decisions. If the planned Cloudflare worker name is unavailable, choose a development-only equivalent with Andrew's approval and record it in the hosted runbook.

## Notes

- Use the Convex, Convex Test and Convex Verify skill guidance during implementation: schema-first, explicit validators/indexes, mocked identities and negative authorization tests.
- The `plan-feature` workflow ends with this review artifact. Do not install dependencies, generate the workspace, create provider resources or deploy until Andrew explicitly asks to execute the plan.
- After implementation, retain this file. Mark it `Completed` rather than deleting it; append any later baseline/revision change to Document History.

## Document History

| Date | Status | Change |
| --- | --- | --- |
| 2026-09-25 | Draft — Awaiting review | Initial implementation-ready plan created from the accepted Foundation brainstorm at repository baseline `73608e446538`; added explicit local, hosted and overall implementation-success estimates. |
| 2026-09-25 | Approved — In progress | Andrew approved execution through every locally completable task; hosted provider actions remain separately approval-gated. |
| 2026-09-25 | Approved — In progress | Fresh install peer checks replaced planned TypeScript 7/Vitest 5 with TypeScript 6.0.3/Vitest 4.1.11, matching TypeScript-ESLint and Nx 23's declared compatibility ranges. |
| 2026-09-26 | Locally complete — Hosted verification pending | Implemented all local tasks and passed the complete `pnpm check` gate, live local health/CLI smoke checks and Cloudflare build dry-run. Local Convex setup created the separate `andrew-tofler/business-factory` project record and local deployment, but no BFF functions/data or web assets were deployed to cloud infrastructure. |
