# Feature: Production Delivery

> **Status**: Completed
> **Created**: 2026-09-26
> **Last updated**: 2026-09-26
> **Repository baseline**: `b754169e9144a437b99dcd7c8aae655a09aa00db`
> **Source brainstorm**: [Production Delivery](../brainstorms/260926-production-delivery.md), accepted 2026-09-26
>
> Implementation plan based on the repository state inspected on 2026-09-26. Re-verify referenced files, provider access, versions and external documentation if the repository changes before implementation.

## Repository Context Snapshot

- Build 1 passes the complete local `pnpm check` gate and is verified in the hosted development lane: Convex development deployment `compassionate-buffalo-689` and Cloudflare Worker `business-factory-backoffice-dev` at `https://ops-dev.tofler.tech`.
- Andrew completed a real Google sign-in against development and saw the authenticated, read-only overview. The production origin is already authorized by the shared Google web client.
- The repository has one validation-only workflow at `.github/workflows/ci.yml`. It runs for pull requests and pushes to `main`, but no job has provider credentials or deploys anything.
- The default Business Factory Convex production deployment exists and had no recorded usage at planning time. No production Business-environment rows were created.
- Cloudflare has no `business-factory-backoffice` production Worker at planning time. `ops.tofler.tech` remains unused and reserved for production.
- GitHub has no Actions environment, secrets or variables for deployment at planning time.
- The worktree contains the reviewed Build 1 hosted-verification and static-configuration changes that have not yet been committed. Preserve them; production delivery is the final completion slice for that work.
- The accepted temporary solo workflow is direct-to-`main`: Andrew reviews the prepared change with Codex and explicitly authorizes the push. A push starts validation and, only after validation succeeds, automatic production deployment and smoke verification. Pull-request enforcement is deferred until real users, meaningful data or additional collaborators justify it.
- The accepted completion rule is stricter than the original Build 1 plan: local and development checks are intermediate gates. Build 1 is complete only after the intended production deployment, automated production smoke and Andrew's real production sign-in pass.

## Feature Description

Add the first production delivery path for Business Factory. An Andrew-authorized push to `main` must run the existing deterministic quality gate, deploy the same commit to the production Convex backend and the separate Cloudflare backoffice Worker, then verify the live backend and dashboard before the workflow is green.

This slice also provisions narrowly scoped CI credentials, records the operational recovery path and closes Build 1 only after automated and human production acceptance. It does not automate development or preview deployments and does not add product functionality.

## User Story

As the solo Business Factory operator,
I want an explicitly reviewed push to `main` to validate and deploy production automatically,
So that repository state, live backend and live dashboard correspond to one known commit and a task cannot be called done while production is stale or broken.

## Problem Statement

Development is healthy, but production is untouched. The current GitHub workflow proves repository quality without publishing the result, so deployment still depends on local interactive provider sessions and separate commands. That creates ambiguity about whether `main` is live, makes backend/frontend target mismatches possible and permits documentation to report completion before production is usable.

## Solution Statement

Extend the existing GitHub Actions workflow with one production job that depends on the unchanged full validation job and runs only for pushes to `main`. Scope provider credentials through a GitHub `production` environment restricted to `main`, serialize deployments, deploy Convex first, stamp the full commit SHA, publish a distinctly named Cloudflare Worker at `ops.tofler.tech`, and finish with a tested live smoke command.

The deployment helper will fail closed unless Convex supplies the exact configured production client URL and the separately configured production site URL is present. The smoke check will validate the public health contract and exact SHA, Cloudflare security headers, and the dashboard bundle's production Convex target. Google authentication remains a one-time manual production acceptance because CI must not hold an operator identity token.

## Metadata

- **Type**: New Capability
- **Complexity**: Medium — application behavior is already proven, but the slice coordinates two providers, scoped credentials, ordered partial-failure behavior and live verification.
- **Systems Affected**: GitHub Actions, GitHub deployment environment, Convex production, Cloudflare Workers/custom domain, Nx tooling, operational documentation and Build 1 lifecycle records.
- **Dependencies**: Existing GitHub/Convex/Cloudflare account access; one production-deployment-scoped Convex deploy key; one shared Tofler Cloudflare CI token with `Account > Workers Scripts > Edit` and `Zone > Workers Routes > Edit` for `tofler.tech` plus `tofler.app`; existing Google web client authorization for `https://ops.tofler.tech`.
- **Assumptions**: The existing public repository and provider accounts remain under Andrew's control; the default Convex production deployment and `tofler.tech` zone remain the intended targets; production starts with no Business-environment rows; no real customer data exists during the first rollout; Andrew explicitly authorizes the final push.

## Required Reading

### Codebase Files (read before implementing)

- `.github/workflows/ci.yml:1` — existing PR/push triggers, read-only permissions, Node 24/pnpm setup and the complete `pnpm check` validation job to preserve.
- `package.json:6` — pinned pnpm, Node 24 engine, complete quality gate and locally pinned Convex/Wrangler/tsx/Vitest tools.
- `convex.json:1` — repository-root Convex functions path and Node 24 runtime.
- `platform/bff/backoffice/wrangler.jsonc:1` — development-only Worker name, custom-domain structure and static-assets settings; production needs a separate file, name and hostname.
- `platform/bff/backoffice/project.json:8` — production-bundle assertion and build targets already owned by the backoffice project.
- `platform/bff/backoffice/src/main.tsx:17` — both `VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL` are mandatory hosted build inputs.
- `platform/bff/backoffice/public/_headers:1` — deployed dashboard security/no-index headers that the live smoke must verify.
- `platform/bff/backoffice/scripts/assert-production-bundle.mjs:4` — existing leak assertion that forbids test-auth markers and the operator allowlist in browser assets.
- `platform/bff/service/convex/http.ts:9` — anonymous `/v1/health` route used for production smoke.
- `platform/bff/service/convex/lib/serviceMetadata.ts:1` — `BFF_BUILD_VERSION` source used to expose the deployed commit.
- `platform/bff/libs/contracts/src/health.ts:3` — public health response schema the smoke tool must parse instead of duplicating.
- `tools/bff-operator/project.json:1` — established Nx layout and `scope:operator,type:tool` tags for repository-owned operational tooling.
- `tools/bff-operator/src/main.ts:25` — existing `execFile`-based process invocation and explicit exit-code pattern.
- `nx.json:4` — test/build inputs and cache rules that new tooling must join.
- `eslint.config.mjs:31` — Nx dependency boundaries; operator tooling may import public contracts but not BFF implementation internals.
- `AGENTS.md:35` — production deployment and production smoke are required before completion unless scope explicitly ends earlier.

### Internal Documentation

- `.agent/brainstorms/260926-production-delivery.md` — accepted direct-push workflow, automatic release, no routine second approval, manual development and partial-failure policy.
- `.agent/plans/260925-build-1-foundation.md` — retained Build 1 implementation history and the current `Development verified — Production delivery pending` lifecycle state.
- `docs/architecture/adr/0001-convex-first-bff-stack.md` — GitHub Actions, separate Convex dev/prod deployments, production-scoped deploy key and Cloudflare static hosting decisions.
- `docs/architecture/adr/0002-business-environments-and-operator-auth.md` — operator authorization and production-bundle isolation invariants.
- `docs/operations/provider-accounts-and-secrets.md` — credential names, placement, separate lane rule and account ownership boundary.
- `docs/operations/build-1-hosted-verification.md` — proven development rollout and live verification pattern.
- `docs/factory/mvp-delivery-plan.md` — Build 1 acceptance boundary and later TableCards delivery sequence.

### External Documentation

- [Convex `deploy` reference](https://docs.convex.dev/cli/reference/deploy) — Sections: target selection, `--cmd`, `--cmd-url-env-var-name`, `--dry-run`, `--message` — use the production key to select the deployment and inject its client URL into the dashboard build.
- [Convex deploy keys](https://docs.convex.dev/cli/deploy-key-types) — Sections: deploying from build pipelines and CLI token creation — create a deployment-scoped CI credential without reusing the interactive personal token.
- [Convex environment CLI](https://docs.convex.dev/cli/reference/env) — Section: `env set` — stamp `BFF_BUILD_VERSION` on the deployment after the backend push.
- [Cloudflare Workers with GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/) — Sections: authentication and CI/CD — non-interactive Wrangler needs a scoped API token and account ID stored outside git.
- [GitHub deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) — Sections: deployment branches, environment secrets and variables — restrict production credentials to the production job and `main`.
- [GitHub deployment concurrency](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments) — Section: using concurrency — prevent overlapping production releases and never cancel an already running production deployment.

### New Files to Create

- `platform/bff/backoffice/wrangler.production.jsonc` — distinct production Worker `business-factory-backoffice` and custom domain `ops.tofler.tech`.
- `tools/production-delivery/project.json` — Nx targets for production helper build, lint, typecheck and tests.
- `tools/production-delivery/tsconfig.json` — no-emit TypeScript configuration for source and tests.
- `tools/production-delivery/tsconfig.build.json` — build-time TypeScript configuration for the operational tool.
- `tools/production-delivery/vitest.config.ts` — deterministic Node test configuration.
- `tools/production-delivery/src/config.ts` — strict parsing/normalization of expected production URLs and commit SHA.
- `tools/production-delivery/src/build-dashboard.ts` — fail-closed target assertion followed by the existing dashboard build and bundle-leak assertion.
- `tools/production-delivery/src/smoke.ts` — bounded-retry live production health/dashboard/bundle verifier.
- `tools/production-delivery/src/config.test.ts` — configuration validation and wrong-lane denial coverage.
- `tools/production-delivery/src/smoke.test.ts` — mocked-network success, retry and failure coverage.
- `tools/production-delivery/README.md` — exact operational inputs, commands, ownership and recovery notes for this non-obvious release-critical tool.
- `docs/architecture/adr/0003-production-delivery.md` — accepted deployment/completion/failure semantics.
- `docs/operations/production-delivery.md` — provider setup, first rollout, rerun, recovery, rotation and human acceptance runbook.

## Codebase Context

### Existing Architecture and Integration Points

The production chain starts from the same commit that GitHub checks out:

1. `validate` installs pinned dependencies and runs `pnpm check` exactly as it does today.
2. A push-to-`main`-only `deploy-production` job waits for `validate`, enters the GitHub `production` environment and acquires its secrets/variables.
3. Convex uses `CONVEX_DEPLOY_KEY` to select only the production deployment. Its `--cmd` invokes the repository production-build helper while supplying `VITE_CONVEX_URL`.
4. The helper compares that supplied client URL with the reviewed GitHub production variable, requires the production `VITE_CONVEX_SITE_URL`, builds the dashboard and runs the existing bundle leak assertion. A development URL or missing value stops the release before backend publication.
5. Convex pushes functions/schema/auth configuration and records the commit in its deployment message. The job then writes the same full SHA to `BFF_BUILD_VERSION` in that production deployment.
6. Pinned local Wrangler publishes the already-built assets using `wrangler.production.jsonc` and its production-only Worker/domain.
7. The smoke tool retries through bounded certificate/DNS/edge propagation, parses the live health contract, requires its version to equal the workflow SHA, verifies dashboard headers and requires a fetched dashboard asset to contain the expected production Convex URL rather than development.
8. Andrew completes one real Google sign-in and confirms the empty read-only production overview. CI does not receive a Google identity or bypass operator authentication.

The GitHub environment holds only lane-specific deployment configuration. The shared Google client ID and operator allowlist remain code-owned in `@bff/static-config`; no values are duplicated into Actions.

### Patterns to Follow

#### Naming and Organization

- Keep operational automation under `tools/`, following `tools/bff-operator` rather than placing release logic in application source.
- Name the production Worker `business-factory-backoffice`; retain the `-dev` suffix only in the existing development config.
- Use `scope:operator,type:tool` for production tooling so it may consume `@bff/contracts` while remaining outside public and product boundaries.
- Use full commit SHAs for deployment messages, health version and smoke comparison.

#### Error Handling

- Parse every required variable before performing a remote write and report names/expected shape without printing secret values.
- Treat non-2xx responses, invalid health payloads, wrong SHA, absent security headers, missing assets, wrong Convex target and retry exhaustion as non-zero failures.
- Do not swallow a partial release. The workflow must identify the failed stage and leave the job red.

#### Logging and Observability

- Log the commit SHA, public target hostnames, stage names, retry count and final observable result.
- Never log deploy-key or API-token values. Avoid broad environment dumps and shell tracing.
- Use the Convex deployment message, GitHub environment deployment record, Cloudflare deployment record and public health SHA as the first production audit trail. No additional monitoring vendor is introduced.

#### Authentication and Authorization

- GitHub production secrets are available only to `deploy-production`, never to pull-request validation.
- `CONVEX_DEPLOY_KEY` is scoped to the Business Factory production deployment. Convex CLI deploy keys are deployment-scoped rather than capability-scoped, so the workflow receives that deployment's supported management access and no access to sibling deployments.
- `CLOUDFLARE_API_TOKEN` is deliberately shared by Tofler CI pipelines during the solo phase. In Cloudflare's three-column user-token editor it uses `Account > Workers Scripts > Edit` for Worker creation/deployment and `Zone > Workers Routes > Edit` for both `tofler.tech` and `tofler.app`. It receives no general DNS Edit, billing, KV, D1, R2, AI, Queue, email, browser or Secrets Store permission. Reassess per-Business tokens when real users/data, another collaborator or additional sensitive infrastructure makes the wider CI blast radius material.
- The existing Google verified-email plus code-owned allowlist continues unchanged. No CI token impersonates an operator and no fake-auth path may enter the production bundle.

#### Data and Migrations

- The first production deployment creates no Business-environment rows and imports no development data.
- Convex deploys schema, indexes, auth configuration and functions as one backend step. Future destructive/data migrations require their own reviewed runbook/ADR and cannot rely blindly on this Build 1 rollback posture.
- Never delete production data to recover a deployment.

#### Testing

- Vitest covers configuration and smoke behavior with mocked `fetch`/time; it must not call live providers during ordinary `pnpm check`.
- Existing Convex integration tests, dashboard component tests, secret scan, production bundle assertion and deterministic desktop/phone Playwright flows remain unchanged parts of the pre-deploy gate.
- Live production smoke is a separate post-deploy command and is intentionally not part of ordinary local/PR validation.

## Design Decisions

- **Decision**: Extend `.github/workflows/ci.yml` instead of creating an independent deployment workflow.
  - **Rationale**: A single job graph makes the production dependency on the exact validation run explicit and prevents workflow-chaining ambiguity.
  - **Tradeoff**: The workflow becomes larger, but validation and deployment remain visibly separated by jobs and secret scope.

- **Decision**: Deploy only on `push` to `main`; pull requests validate only.
  - **Rationale**: This implements the accepted current solo workflow while allowing PRs to be introduced later without redesigning deployment.
  - **Tradeoff**: A bad commit can temporarily exist on `main`, although production remains unchanged when validation fails.

- **Decision**: Use a GitHub `production` environment with a `main` branch restriction and no routine required reviewer.
  - **Rationale**: Environment-scoped secrets, variables and history are valuable; a second approval click was explicitly rejected.
  - **Tradeoff**: GitHub does not add another human barrier after Andrew authorizes the push.

- **Decision**: Serialize production with a fixed concurrency group and do not cancel a running release.
  - **Rationale**: Convex and Cloudflare for one environment must not receive overlapping releases.
  - **Tradeoff**: A later push waits; when GitHub retains only the newest pending job, an intermediate commit may be skipped, but the newest commit contains it.

- **Decision**: Keep separate Wrangler files for development and production.
  - **Rationale**: Distinct worker names and domains make accidental cross-lane publication harder and keep manual development unchanged.
  - **Tradeoff**: Shared static-assets settings are duplicated in two small JSONC files and must be reviewed together when changed.

- **Decision**: Use repository-owned, tested TypeScript release tooling rather than inline shell/curl logic or an unpinned deployment action.
  - **Rationale**: Target checks, retries, contract parsing and error messages become locally testable and use the pinned Convex/Wrangler toolchain.
  - **Tradeoff**: Adds one small Nx tool project and operational README.

- **Decision**: Build through Convex `deploy --cmd` and compare its injected URL with the expected production URL before any backend push.
  - **Rationale**: The dashboard and backend are derived from the same deployment key and commit while a wrong key fails before publication.
  - **Tradeoff**: `VITE_CONVEX_SITE_URL` still needs a separate GitHub production variable because Convex injects the client URL, not the HTTP site URL.

- **Decision**: Deploy in the order backend, build-version stamp, dashboard, smoke; do not automatically roll back a partial release.
  - **Rationale**: The dashboard must not publish against backend code that failed to deploy, and automated database/backend rollback becomes unsafe as data evolves.
  - **Tradeoff**: A Cloudflare failure can leave the new backward-compatible backend live behind the previous dashboard. The red workflow and runbook require retry/fix-forward before completion.

- **Decision**: Automated smoke proves anonymous/public wiring; Andrew proves real Google operator access once for the first production rollout.
  - **Rationale**: Storing operator tokens in CI would weaken the auth boundary and complicate token expiry.
  - **Tradeoff**: First production completion retains one human acceptance step.

- **Decision**: Keep development manual and production empty.
  - **Rationale**: Neither preview automation nor seed data is needed to close Build 1.
  - **Tradeoff**: Development can drift operationally until a later need justifies automating it.

## Implementation Plan

### Phase 1: Deterministic production tooling

Add the separate production Worker manifest and tested Nx release helper. The helper validates exact target URLs, reuses the public health contract, builds/asserts the dashboard and performs bounded live smoke without provider credentials in tests.

### Phase 2: CI/CD workflow and provider environment

Extend the current workflow with the main-only, post-validation production job. Create the GitHub production environment, variables, branch restriction and narrowly scoped credentials without exposing values. Prove both deploy commands with dry runs before the first push.

### Phase 3: Operational and architectural records

Record the accepted release/completion policy in ADR 0003, document setup/recovery/rotation, update the delivery and provider guidance, and keep Build 1 explicitly pending until production evidence exists.

### Phase 4: First production rollout and closeout

Run the complete local gate, obtain Andrew's diff review and explicit push approval, push `main`, monitor validation/deploy/smoke, then have Andrew complete the real production Google sign-in. Only after all gates pass, mark both plans complete and update the handoff.

## Step-by-Step Tasks

Execute in dependency order.

### Task 1: CREATE `platform/bff/backoffice/wrangler.production.jsonc`

- **Implement**: Mirror only the proven static-assets behavior from development while setting Worker name `business-factory-backoffice`, `workers_dev: false` and one custom domain `ops.tofler.tech`. Do not add the development hostname, production secrets, arbitrary DNS records or an account ID to source.
- **Pattern**: `platform/bff/backoffice/wrangler.jsonc:1` — current development Worker/custom-domain/static-assets layout.
- **Dependencies/Imports**: Existing `dist/platform/bff/backoffice` build output.
- **Gotchas**: The two files intentionally duplicate a small amount of config to make target review obvious. A dry run must name only the production Worker/domain.
- **Validate**: **planned** `pnpm exec wrangler deploy --dry-run --config platform/bff/backoffice/wrangler.production.jsonc` with the approved account selected; confirm no upload occurs.

### Task 2: CREATE the `tools/production-delivery` Nx project

- **Implement**: Add project/TypeScript/Vitest configuration tagged `scope:operator,type:tool`, with build, lint, test and typecheck targets. Add a focused README because the tool introduces non-obvious inputs, remote effects and recovery ownership.
- **Pattern**: `tools/bff-operator/project.json:1` and `tools/bff-operator/vitest.config.ts:1` — repository operational-tool structure.
- **Dependencies/Imports**: `@bff/contracts`, Node APIs, existing `tsx` and Vitest; no new package dependency.
- **Gotchas**: Production live smoke must not run as the ordinary Nx `test` target. Keep secrets out of Nx cache inputs/output.
- **Validate**: **planned** `pnpm nx show project production-delivery` and `pnpm nx run production-delivery:typecheck`.

### Task 3: ADD strict production-target configuration and tests

- **Targets**: `tools/production-delivery/src/config.ts`, `tools/production-delivery/src/config.test.ts`.
- **Implement**: Parse required HTTPS URLs and a 40-character hexadecimal SHA. Normalize trailing slashes, require `https://ops.tofler.tech`, compare Convex's `VITE_CONVEX_URL` to the configured expected production client URL and reject known development/local hostnames. Return only non-secret typed config.
- **Pattern**: `platform/bff/libs/contracts/src/health.ts:5` — strict schema/parser style.
- **Dependencies/Imports**: `zod`; no provider SDK.
- **Gotchas**: Error messages may name missing variables and public URLs but must never echo the process environment or secret values.
- **Validate**: **planned** `pnpm nx run production-delivery:test -- --run` covering valid inputs, missing inputs, malformed SHA, wrong dashboard host, client mismatch and dev/local target rejection.

### Task 4: ADD the production dashboard build entrypoint

- **Target**: `tools/production-delivery/src/build-dashboard.ts`.
- **Implement**: Validate the production target before remote mutation, invoke the existing `bff-backoffice:build`, then invoke `bff-backoffice:assert-production-bundle`. Make the command exit non-zero on target mismatch, build failure or bundle leak.
- **Pattern**: `tools/bff-operator/src/main.ts:25` — safe `execFile` invocation and explicit failures; `platform/bff/backoffice/project.json:8` — existing build/assert targets.
- **Dependencies/Imports**: Task 3 config parser; Node child-process APIs.
- **Gotchas**: Do not interpolate provider credentials into commands. Preserve inherited public build variables only. Do not add a fake-auth build path.
- **Validate**: **planned** `VITE_CONVEX_URL=<production-client-url> EXPECTED_CONVEX_URL=<same-url> VITE_CONVEX_SITE_URL=<production-site-url> BACKOFFICE_URL=https://ops.tofler.tech GITHUB_SHA=<40-char-sha> pnpm production:build`; run a negative test with a development URL and confirm it fails before building.

### Task 5: ADD the production smoke command and deterministic tests

- **Targets**: `tools/production-delivery/src/smoke.ts`, `tools/production-delivery/src/smoke.test.ts`.
- **Implement**:
  - Retry transient network/non-2xx responses with bounded attempts and delay.
  - Fetch `<CONVEX_SITE_URL>/v1/health`, parse it through `parseHealthResponse` and require `status: ok`, expected service name and exact full `GITHUB_SHA` version.
  - Fetch `https://ops.tofler.tech`, require success plus `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-Robots-Tag: noindex, nofollow`, and the expected CSP framing/connection restrictions.
  - Resolve a same-origin dashboard JavaScript asset from the returned HTML, fetch it and require the expected production Convex client URL. Reject known development Convex URLs.
  - Print concise stage/retry results and exit non-zero after exhaustion.
- **Pattern**: `platform/bff/service/convex/http.ts:9`, `platform/bff/libs/contracts/src/health.ts:5` and `platform/bff/backoffice/public/_headers:1` — live contracts to prove.
- **Dependencies/Imports**: Task 3 config parser, `@bff/contracts`, built-in `fetch`; no browser or Google token.
- **Gotchas**: HTML asset parsing must accept Vite's hashed filenames without executing arbitrary markup. Retry only transient fetch/status failures; deterministic contract, SHA, header and wrong-target failures should report immediately.
- **Validate**: **planned** `pnpm nx run production-delivery:test` with mocked success, delayed propagation, wrong version, invalid health, missing header, missing asset, wrong Convex URL and exhausted retry cases.

### Task 6: UPDATE `package.json` and root validation integration

- **Implement**: Add `production:build` and `production:smoke` scripts invoking the TypeScript entrypoints through pinned `tsx`. Ensure the new Nx project automatically joins existing `format:check`, lint, typecheck, test and build run-many commands. Do not add live smoke to `pnpm check`.
- **Pattern**: `package.json:10` — central command router and complete deterministic gate.
- **Dependencies/Imports**: Tasks 2–5.
- **Gotchas**: Live smoke requires public production variables and must be opt-in. No dependency or lockfile change should be necessary.
- **Validate**: `pnpm check` and the negative no-environment `pnpm production:smoke` failure, which must list only missing public input names.

### Task 7: UPDATE `.github/workflows/ci.yml`

- **Implement**:
  - Preserve current PR and push validation behavior.
  - Add `deploy-production` with `needs: validate` and an explicit condition limiting it to `push` on `refs/heads/main`.
  - Reference GitHub environment `production` with URL `https://ops.tofler.tech`.
  - Use a fixed production concurrency group and `cancel-in-progress: false`; never terminate an active release to start another.
  - Install from the frozen lockfile using the pinned Node 24/pnpm versions; use local `pnpm exec` tooling rather than an unpinned deployment action.
  - Expose `CONVEX_DEPLOY_KEY` and `CLOUDFLARE_API_TOKEN` secrets only to this job. Expose public account/target values from environment variables.
  - Run Convex deploy with `--cmd "pnpm production:build"`, `--cmd-url-env-var-name VITE_CONVEX_URL` and a full-SHA deployment message.
  - After successful Convex publication, set `BFF_BUILD_VERSION` to `github.sha`; then deploy Cloudflare with the production manifest and run `pnpm production:smoke`.
- **Pattern**: `.github/workflows/ci.yml:12` — current validation job; retain its complete gate rather than creating a weaker release-only check.
- **Dependencies/Imports**: Tasks 1–6; GitHub environment from Task 8.
- **Gotchas**: Pull requests, forks and manual local commands must never receive production secrets. Keep the backend-before-dashboard order. A failed build means no backend deploy; a failed backend/stamp means no dashboard deploy; a failed dashboard/smoke leaves the workflow red with no automatic rollback.
- **Validate**: `pnpm exec prettier --check .github/workflows/ci.yml`, manual event/job-condition inspection, and GitHub's workflow validation on the first reviewed push.

### Task 8: PROVISION the GitHub `production` environment and CI credentials

- **Implement**:
  1. Create/select the GitHub `production` environment and restrict deployments to `main`; do not configure a required reviewer or wait timer.
  2. Set public environment variables `CLOUDFLARE_ACCOUNT_ID`, `CONVEX_URL`, `CONVEX_SITE_URL` and `BACKOFFICE_URL=https://ops.tofler.tech`.
  3. From the already authenticated Convex CLI, create a production-deployment key named `bff-github-production`. Pipe it directly into GitHub's environment secret `CONVEX_DEPLOY_KEY`; do not print, paste into chat, save in the repository or leave it in a shell variable/file. Convex does not offer a separate capability selector for this deployment-scoped CLI key.
  4. Andrew creates one shared Cloudflare CI token named `tofler-github-ci`, with `Account > Workers Scripts > Edit`, `Zone > Workers Routes > Edit` for `tofler.tech` plus `tofler.app`, and the minimal read-only account/user/zone discovery permissions documented in the runbook. Paste it directly into GitHub environment secret `CLOUDFLARE_API_TOKEN`; future Tofler repositories may install the same token in their own protected CI secret stores. Put only this actionable human blocker in Nirvana when reached.
  5. Verify secret names/existence and public variables through metadata-only commands; GitHub must not reveal secret values.
- **Pattern**: `docs/operations/provider-accounts-and-secrets.md:44` and `:117` — established credential contract and placement.
- **Dependencies/Imports**: Approved accounts and Task 7's exact variable contract.
- **Gotchas**: Never reuse the interactive Convex personal token or Wrangler OAuth session in CI. If the Convex CLI cannot create the required permission scope non-interactively, stop and have Andrew create the key in the Convex dashboard rather than broadening silently. Do not create a production Business-environment row.
- **Validate**: metadata-only `gh` environment/secret/variable inspection plus Convex/Cloudflare dry runs; redact command output before preserving logs.

### Task 9: CREATE ADR 0003 and the production operations runbook

- **Targets**: `docs/architecture/adr/0003-production-delivery.md`, `docs/operations/production-delivery.md`.
- **Implement**:
  - ADR: record direct-to-main as the temporary solo policy, the later PR-protection trigger, validation dependency, environment scoping, deployment order, concurrency, production completion gate and no-automatic-rollback policy.
  - Runbook: record exact resource names, public variables, secret names/owners, dry run, first release, monitoring, smoke expectations, partial-release recovery, revert/fix-forward choices, credential rotation/revocation and first real Google sign-in.
  - Explicitly distinguish deploy-key rotation from application-data recovery and state that destructive migrations need separate planning.
- **Pattern**: `docs/architecture/adr/0002-business-environments-and-operator-auth.md:1` and `docs/operations/build-1-hosted-verification.md:1` — durable decision and provider-runbook structure.
- **Dependencies/Imports**: Accepted brainstorm and Tasks 1–8 exact commands/resources.
- **Gotchas**: Record names and procedures, never secret values or operator tokens. Do not describe PR protection as active yet.
- **Validate**: `git diff --check -- docs/architecture/adr/0003-production-delivery.md docs/operations/production-delivery.md` and manual comparison with the accepted brainstorm.

### Task 10: UPDATE repository guidance and current documentation

- **Targets**: `README.md`, `docs/operations/provider-accounts-and-secrets.md`, `docs/factory/mvp-delivery-plan.md` and, only if implementation reveals a durable mismatch, the applicable existing ADR.
- **Implement**: Link ADR 0003/runbook, replace stale provider-account evidence, document production Actions credential placement, make Build 1 production smoke/sign-in its final gate and preserve Build 5 as the later full TableCards launch. Remove any duplicate/stale acceptance wording encountered in the directly edited sections.
- **Pattern**: `README.md:5` — root document is the router; `docs/factory/mvp-delivery-plan.md:56` — Build 1 scope and acceptance.
- **Dependencies/Imports**: Tasks 7–9.
- **Gotchas**: Do not duplicate the workflow/runbook into STATUS or expose account identifiers unnecessarily. Keep domain-strategy decisions in their existing brainstorm until accepted separately.
- **Validate**: `pnpm format:check` and link/path inspection.

### Task 11: RUN pre-release local and remote dry-run validation

- **Implement**:
  - Run a frozen install and the full `pnpm check` gate.
  - Exercise production configuration parsing with public production values and fake test secrets only where a local stub permits it.
  - Run Convex `deploy --dry-run` against the exact production-scoped key without changing production.
  - Run Wrangler `deploy --dry-run` with the production manifest and confirm the name/domain/assets are correct.
  - Inspect `git diff`, ignored files and secret scanning output; confirm no token, temporary key file or provider output is staged.
- **Pattern**: `docs/operations/build-1-hosted-verification.md:29` — revalidate the exact source state before provider work.
- **Dependencies/Imports**: Tasks 1–10 and Task 8 provider environment.
- **Gotchas**: Some CLI dry runs may still query providers, but must not upload or change resources. Stop if any target differs from the recorded production deployment/account/domain.
- **Validate**: `pnpm install --frozen-lockfile && pnpm check && git diff --check`, followed by both documented dry runs and `pnpm secrets:scan` after any provider setup.

### Task 12: REVIEW, COMMIT and PUSH the first production-enabled release

- **Implement**:
  1. Present Andrew with the exact diff, validation evidence, new remote resources/credentials by name and the expected effects of pushing `main`.
  2. Wait for explicit push authorization. Do not infer it from plan or implementation approval.
  3. Commit the complete verified change set and push directly to `main` under the accepted temporary solo policy.
  4. Monitor the GitHub run through validation, Convex deploy/version stamp, Cloudflare deploy and production smoke. Record URLs/run/deployment identifiers without credentials.
- **Pattern**: `.agent/brainstorms/260926-production-delivery.md` — Andrew's conversational review and explicit push authorization are the current release gate.
- **Dependencies/Imports**: successful Task 11.
- **Gotchas**: Do not manually deploy around a red Action merely to obtain a green outcome. A failed validation means production remains unchanged; a later-stage failure follows Task 13.
- **Validate**: one GitHub run for the pushed SHA is green and its production environment record points to `https://ops.tofler.tech`.

### Task 13: HANDLE partial failure without automatic rollback

- **Implement**: If Convex succeeds and a later stage fails, record which SHA is live in health, which dashboard version remains live and which stage failed. Prefer rerunning an idempotent failed job when inputs are unchanged; otherwise fix forward in a new Andrew-reviewed push. Revert through a new reviewed commit/push only for a behavior regression. Never delete production data or automate Convex rollback.
- **Pattern**: accepted failure policy in `.agent/brainstorms/260926-production-delivery.md`; additive/recovery guidance in `docs/architecture/adr/0001-convex-first-bff-stack.md:188`.
- **Dependencies/Imports**: Task 9 runbook.
- **Gotchas**: A partial release is not success even if the public page still works. Keep Build 1 and this plan incomplete until the entire workflow is green.
- **Validate**: the runbook identifies the observed live versions and the retry/fix-forward run ultimately passes automated smoke.

### Task 14: COMPLETE manual production acceptance and lifecycle closeout

- **Implement**:
  1. Andrew opens `https://ops.tofler.tech`, completes real Google sign-in and confirms the authenticated read-only overview loads with an empty Business-environment registry.
  2. Confirm the live dashboard reports the same full commit SHA as the successful GitHub workflow and production health endpoint.
  3. Mark this plan and `.agent/plans/260925-build-1-foundation.md` `Completed` with dates and concise production evidence.
  4. Update `STATUS.md` to make production the current Build 1 state and name the next accepted work; preserve the brainstorm/plan history.
  5. Complete/archive the single Nirvana Cloudflare-token blocker after the credential is stored and remove no historical repository artifact.
- **Pattern**: `AGENTS.md:35` — production deployment and smoke are the completion boundary; `.agent/plans/260925-build-1-foundation.md:781` — append lifecycle history rather than replacing it.
- **Dependencies/Imports**: green Task 12/13 release and Andrew's real sign-in.
- **Gotchas**: Automated anonymous smoke cannot substitute for real operator authentication. Do not seed production merely to make the dashboard non-empty.
- **Validate**: documented successful GitHub production run, exact live SHA health response, successful Andrew sign-in and clean lifecycle/status consistency review.

## Testing Strategy

### Unit Tests

- Production configuration accepts only the exact HTTPS dashboard/Convex targets and a full hexadecimal SHA.
- Missing variables, malformed URLs, wrong host, development/local URL and Convex injected/expected URL mismatch fail before deploy/build.
- Smoke parsing accepts the public contract and required headers, rejects wrong service/SHA/header/asset/target and redacts secrets from errors.
- Retry behavior retries only transient failures, succeeds after propagation and stops after the configured bound.

### Integration Tests

- The new Nx project participates in root lint, typecheck, test and build targets.
- The dashboard production build continues to pass the existing forbidden-marker/operator-address assertion.
- Workflow inspection/dry runs prove production and development manifests name separate Workers/domains.
- Convex dry run proves the production-scoped key targets the intended default production deployment; Cloudflare dry run proves the intended Worker/custom domain/assets without upload.

### End-to-End or Manual Validation

- GitHub Actions on the first authorized `main` push must show `validate` before `deploy-production`; PR runs must have no deployment job.
- Automated live smoke checks exact backend SHA, dashboard security/no-index headers and deployed production Convex bundle target.
- Andrew performs one real production Google sign-in and confirms the empty authorized overview on desktop or phone.
- Development remains reachable and unchanged at `ops-dev.tofler.tech` after production release.

### Edge Cases

- A PR from a fork cannot access or exercise production secrets.
- A wrong Convex deploy key/client URL fails before backend publication.
- A build failure leaves both providers untouched.
- A Convex failure prevents Cloudflare publication.
- A build-version stamp failure prevents Cloudflare publication and is reported as a partial backend release.
- A Cloudflare failure leaves the new backend and previous dashboard; retry/fix-forward is required.
- Smoke sees cached/propagating content and retries, but wrong SHA/target never becomes a false positive.
- Two quick `main` pushes never overlap running deployments; an active release is not canceled.
- An expired/revoked provider key fails visibly without exposing the credential.
- Production remains valid with zero Business-environment rows.

## Validation Commands

Run from `/root/projects/bff` unless noted. Commands marked **planned** are introduced by this implementation.

### Syntax and Types

```bash
pnpm typecheck
pnpm boundaries:check
```

### Tests

```bash
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm nx run production-delivery:test
```

### Lint and Formatting

```bash
pnpm format:check
pnpm lint
pnpm secrets:scan
git diff --check
```

### Complete Local Gate

```bash
pnpm install --frozen-lockfile
pnpm check
```

### Provider Dry Runs

```bash
pnpm exec convex deploy --dry-run
pnpm exec wrangler deploy --dry-run --config platform/bff/backoffice/wrangler.production.jsonc
```

The Convex dry run requires the production-scoped key to be supplied outside git. The Wrangler dry run requires the approved account/token environment. Neither command may upload during this gate.

### Live Production Smoke

```bash
pnpm production:smoke
```

This **planned** command requires only public production URLs and the expected commit SHA; it must not require a Google token or provider deploy credential.

### Manual Validation

- Inspect the first GitHub production deployment record and provider deployment identifiers.
- Open `https://ops.tofler.tech`, sign in with an allowlisted Google account and confirm the empty read-only overview.
- Confirm `https://ops-dev.tofler.tech` still points to development.

## Acceptance Criteria

- [ ] Pull requests and non-`main` events run deterministic validation only and cannot access production credentials.
- [ ] An Andrew-authorized push to `main` runs the complete `pnpm check` gate before any deployment step.
- [ ] Only one production release runs at a time, and a running release is never canceled for a newer push.
- [ ] The Convex key is scoped to the production deployment, the shared Tofler Cloudflare CI token is limited to Workers plus routes for the two Tofler zones, and neither value exists in git, chat, build artifacts or logs.
- [ ] The dashboard build fails before deployment when the Convex key/URL or production site URL does not match the configured production lane.
- [ ] The production backend deploys before the dashboard and exposes the exact full GitHub commit SHA from `/v1/health`.
- [ ] `business-factory-backoffice` serves at `https://ops.tofler.tech` with the expected no-store, CSP, anti-framing, nosniff and no-index headers.
- [ ] The deployed dashboard bundle references the production Convex client URL and no development URL, fake-auth marker or operator allowlist.
- [ ] Automated production smoke passes for the exact pushed SHA.
- [ ] Andrew completes a real Google sign-in and sees the authorized empty read-only overview.
- [ ] Development resources remain separate and unchanged; production receives no seed Business-environment rows.
- [ ] Partial failure is reported and resolved by retry, fix-forward or reviewed revert without automatic Convex/data rollback.
- [ ] ADR/runbook/provider/delivery/root documentation matches the live process and contains no credential values.
- [ ] Build 1 and this plan are marked Completed only after deployment, automated smoke and human sign-in all pass.

## Risks and Mitigations

- **Risk**: A production secret leaks through workflow logs, repository files or shell handling.
  - **Mitigation**: GitHub environment secrets, direct secret piping/entry, no environment dumps or shell tracing, secret scanning and metadata-only verification.

- **Risk**: A wrong Convex deploy key builds or deploys the dashboard against development.
  - **Mitigation**: Compare Convex's injected client URL with an independently configured production URL before backend publication; verify the deployed bundle again during smoke.

- **Risk**: Backend deploy succeeds but build-version stamping, Cloudflare or smoke fails.
  - **Mitigation**: Ordered stages, red workflow, explicit live-version inspection and documented retry/fix-forward; no unsafe automated backend rollback.

- **Risk**: Custom-domain certificate/DNS propagation causes a false first-run failure.
  - **Mitigation**: Bounded transient retries and an idempotent rerun path; deterministic contract/target errors do not retry.

- **Risk**: Direct pushes allow a failing commit on `main`.
  - **Mitigation**: Andrew's explicit pre-push review, full local gate before push and no deployment unless GitHub validation passes. Introduce protected PRs when real usage/data/collaborators increase impact.

- **Risk**: CI claims success without proving authenticated operator access.
  - **Mitigation**: Treat Andrew's first real production Google sign-in as a separate required completion criterion; never store an operator token in CI.

- **Risk**: Production starts on a free provider tier without mature backup/recovery.
  - **Mitigation**: Keep production empty in this slice. Before meaningful customer/payment data, follow ADR 0001's backup/restore requirement and reassess Convex Professional or an accepted recovery alternative.

- **Risk**: Development and production Wrangler configuration drift.
  - **Mitigation**: Keep manifests short, test each dry run and document that shared changes require reviewing both; prioritize visible lane separation over premature config generation.

## Open Questions

None. Cloudflare token creation, secret entry and Andrew's first production sign-in are execution-time human gates, not unresolved design choices.

## Success Estimate

- **One-pass implementation and first complete production release: 7/10.** The code and development deployment are proven; deductions are for the first GitHub environment wiring, first non-interactive Cloudflare token deployment, first production custom-domain/certificate publication and live provider propagation.
- **Local implementation and deterministic validation: 9/10.** The project already has pinned tools, a complete gate, reusable contracts and directly analogous Nx/operator patterns.
- **First hosted production verification attempt: 7/10.** Provider permissions or propagation may require one correction, but the plan isolates those failures and avoids data migration.

## Notes

- This plan does not authorize implementation or deployment. The `plan-feature` workflow ends with this review artifact; wait for Andrew to request execution.
- Production deploy credentials are separate from runtime Business-service credentials and future user authentication.
- `ops.tofler.tech` is an internal/operator domain under the accepted Tofler domain split; no customer-facing `.app` resource is created.
- Development automation, preview deployments, required pull requests, production seed data, monitoring vendors and TableCards deployment remain outside this slice.
- Retain this plan after implementation. Mark it Completed and append evidence; never delete or silently rewrite its repository snapshot.

## Document History

| Date | Status | Change |
| --- | --- | --- |
| 2026-09-26 | Draft — Awaiting review | Initial implementation-ready plan created from the accepted production-delivery brainstorm at repository baseline `b754169e9144a437b99dcd7c8aae655a09aa00db`. |
| 2026-09-26 | Draft — Awaiting review | Renamed the retained plan to the repository's `YYMMDD-topic.md` log convention using its immutable creation date; lifecycle and update history remain inside the document. |
| 2026-09-26 | Approved — In progress | Andrew approved execution through production preparation and deployment, with the required final diff review before the production-triggering push. |
| 2026-09-26 | Approved — In progress | Recorded the initial provider finding that Convex CLI keys are deployment-scoped without capability selection. The first Cloudflare proposal used an abstract Workers Admin role with later rotation; Andrew subsequently replaced it with the shared user-token design recorded below. |
| 2026-09-26 | Approved — In progress | Implemented Tasks 1–11, created the main-restricted GitHub production environment and Convex secret, and passed the frozen install, full local gate, exact-target production build, Convex dry run and Wrangler dry run. Waiting for Andrew's Cloudflare CI token and final push review; production remains untouched. |
| 2026-09-26 | Approved — In progress | Andrew chose one shared `tofler-github-ci` Cloudflare token for the current solo phase instead of per-Business CI tokens. Its scope covers Workers in the selected account and Worker routes for both Tofler zones, but excludes general DNS and unrelated products. |
| 2026-09-26 | Approved — In progress | Reconciled the abstract Workers role wording with Cloudflare's actual three-column user-token UI: Workers Scripts Edit uploads/deploys, Workers Routes Edit connects both zones, and read-only discovery rows support Wrangler. |
| 2026-09-26 | Approved — Ready to release | Andrew stored the Cloudflare token directly in the GitHub production environment. Both provider secrets are present, the complete Node.js 24 gate passed again and the final diff audit found no blocker. Waiting only for Andrew's explicit authorization to commit and push the production-triggering release. |
| 2026-09-26 | Approved — Fix forward | Andrew authorized and pushed release `86a7e75`. Validation, Convex deploy/version stamping and Cloudflare publication passed. The workflow smoke failed before network checks because direct `tsx` execution did not load `tsconfig.base.json`; the corrected command then exposed ConvexReactClient's harmless built-in example URL in the bundle. The fix now loads workspace aliases explicitly, permits only that known dependency example while still rejecting other deployment URLs, passes all 18 tool tests and passes the exact live production smoke locally. |
| 2026-09-26 | Production verified — Final human sign-in pending | Fix-forward commit `2c25226` passed GitHub run `36243427909` end to end: complete validation, Convex deployment and SHA stamp, Cloudflare publication, and bounded automated production smoke. Only Andrew's real production Google sign-in remains before completion. |
| 2026-09-26 | Completed | Andrew completed the final real Google sign-in at `https://ops.tofler.tech` and confirmed the authenticated read-only overview is accessible. Every automated and human production acceptance gate passed. |
