# Feature: Automated Development Authentication

> **Status**: Implemented and development-verified — Source release fix-forward in progress
> **Created**: 2026-09-26
> **Last updated**: 2026-09-26
> **Repository baseline**: `eed726ce95df1f37bda477d521d84228c6a5c228`
> **Source brainstorm**: [Automated Development Authentication](../brainstorms/260926-automated-development-auth.md), accepted 2026-09-26
>
> Implementation plan based on the repository state inspected on 2026-09-26. Re-verify referenced files, versions, provider sessions and external documentation if the repository changes before implementation.

## Repository Context Snapshot

- Build 1 is complete and live in development and production. Human operators use Google Identity Services; Convex validates the Google token and the shared authorization guard requires a verified address from the two-person code-owned allowlist.
- `ops-dev.tofler.tech` and Convex development deployment `compassionate-buffalo-689` are separate from production. The development deployment is manually published; `main` automatically validates and deploys production.
- The normal dashboard keeps its Google token only in React memory. The deterministic Playwright entry and `convex-test` authorization suite cover UI and backend logic separately, but Codex cannot authenticate through the hosted development dashboard without Andrew.
- The accepted brainstorm selected the easiest safe approach: a short-lived signed test identity accepted only by shared development, an on-demand hosted Playwright check, no Google-account automation, no third environment and no development CI/CD.
- The accepted scope ends at development for the automated identity. The source change still follows the normal reviewed push to `main`; production must deploy successfully with Google as its only configured provider and without the development automation page.
- The first source-release attempt passed validation but exposed a Convex auth-config limitation: every environment variable accessed by `auth.config.ts` is required in every deployment, even when application logic treats it as optional. Production therefore uses the explicit non-secret value `disabled` for both development-automation settings; the auth builder interprets only that exact pair as Google-only and rejects partial or mixed configuration.
- At planning time, the accepted brainstorm and short `STATUS.md` handoff are modified but uncommitted. No application code, dependency, credential or provider configuration has changed for this feature.

## Feature Description

Add an operator-authentication test path that Codex can run against the real hosted development dashboard. Playwright will mint a fresh ES256 JWT using a locally held development key, inject it into a development-only dashboard entry before application code starts and verify that the live dashboard loads the protected overview from the real Convex development backend.

Google remains the only human sign-in method. Production receives neither the custom provider configuration nor the development-only browser entry. The private signing key is generated locally under the already ignored `.convex/` directory and never enters git, Cloudflare assets, test reports or command output.

## User Story

As the sole developer working with Codex,
I want Codex to authenticate and exercise the hosted development backoffice independently,
so that ordinary development verification does not require me to perform a Google sign-in.

## Problem Statement

The existing browser test renders a fixture, while backend tests inject mock identities. Together they do not prove that a signed token can travel through the hosted dashboard and Convex client, pass Convex cryptographic validation, satisfy the real operator guard and load protected development data. Automating Google's UI would replace this gap with a brittle provider dependency and a reusable Google credential.

## Solution Statement

Configure a second Convex custom-JWT provider only when the development deployment contains a public JWKS environment value. Use a repository tool to generate a local ES256 key pair and mint two-minute, audience-bound operator tokens. Add a separate development dashboard HTML entry that reads a Playwright-injected token from page memory and uses the same `ConvexProviderWithAuth` and `App` as the Google entry. Build that entry only with an explicit hosted-development Vite target; the ordinary production build remains single-entry and its bundle assertion rejects all automation markers.

The first version runs only on demand and asserts the real protected overview loads. Existing deterministic tests continue to own detailed unauthenticated, forbidden and unverified-email cases.

## Metadata

- **Type**: Enhancement
- **Complexity**: Medium — the code is bounded, but it crosses Convex auth configuration, signed credential handling, a second Vite entry, hosted Playwright and development deployment safety.
- **Systems Affected**: `@bff/static-config`, Convex auth configuration, backoffice bootstrap/build, backoffice Playwright project, development Convex deployment, development Cloudflare Worker, operator documentation.
- **Dependencies**: Add `jose@6.2.12` as a pinned development dependency; existing Convex `1.46.0`, Playwright `1.63.0`, Vite `8.3.1`, Node.js 24 and Cloudflare tooling remain unchanged.
- **Assumptions**: The currently authenticated Convex and Cloudflare CLI sessions retain access to the named development resources; production uses the exact non-secret `disabled` pair for the development automation variables and therefore emits no custom provider; the dedicated automation issuer-and-subject pair is accepted only after Convex authenticates the development JWT; no hosted development test runs in GitHub Actions initially.

## Required Reading

### Codebase Files (read before implementing)

- `platform/bff/service/convex/auth.config.ts:1` — current single-provider Google auth configuration to preserve as the default and production behavior.
- `platform/bff/service/convex/lib/authorization.ts:45` — shared operator guard that must preserve verified-email humans while accepting only the exact authenticated automation identity.
- `platform/bff/service/convex/businessEnvironments.test.ts:102` — existing unauthenticated, forbidden, authorized and unverified-email coverage.
- `platform/bff/backoffice/src/main.tsx:14` — production dashboard bootstrap and `ConvexProviderWithAuth` integration.
- `platform/bff/backoffice/src/googleIdentity.tsx:37` — in-memory token-expiry and provider-adapter pattern.
- `platform/bff/backoffice/src/app.tsx:33` — real protected queries and current Google-button coupling to remove from the shared application component.
- `platform/bff/backoffice/vite.config.ts:10` — default single-entry production build, aliases and output path.
- `platform/bff/backoffice/scripts/assert-production-bundle.mjs:6` — existing fail-closed test-fixture and operator-identity bundle scan.
- `platform/bff/backoffice-e2e/playwright.config.ts:3` — deterministic local Playwright suite that must remain provider-independent.
- `platform/bff/backoffice-e2e/src/dashboard.spec.ts:3` — existing fixture test; it remains in the normal `pnpm check` gate.
- `.github/workflows/ci.yml:30` — production deployment path whose default build must remain Google-only.
- `.gitignore:1` — `.convex/` already excludes locally generated signer material and must stay ignored.

### Internal Documentation

- `.agent/brainstorms/260926-automated-development-auth.md` — accepted scope, exclusions and simplicity choices.
- `docs/architecture/adr/0002-business-environments-and-operator-auth.md` — authoritative operator authentication and authorization boundary.
- `docs/operations/build-1-hosted-verification.md` — current development resource names, safe target checks and manual deployment sequence.
- `docs/operations/production-delivery.md` — production release and smoke contract that must remain unchanged.

### External Documentation

- [Convex custom JWT provider](https://docs.convex.dev/auth/advanced/custom-jwt) — Sections: Server-side integration, `applicationID`, data-URI JWKS and custom claims — defines the exact signature/issuer/audience configuration.
- [Convex custom OIDC provider](https://docs.convex.dev/auth/advanced/custom-auth) — Sections: Multiple providers and client-side integration — confirms provider ordering and the `ConvexProviderWithAuth` adapter contract.
- [Convex environment variables](https://docs.convex.dev/production/environment-variables) — Section: Using environment variables in dev and prod — establishes deployment-specific provider activation.
- [Convex environment CLI](https://docs.convex.dev/cli/reference/env) — Sections: `env set`, `--from-file` and `--deployment` — supports configuring only the named development deployment without exposing values in shell history.
- [Playwright authentication](https://playwright.dev/docs/auth) — Sections: Core concepts and authentication setup — establishes that auth artifacts must remain outside source control; this plan uses a fresh in-memory token instead of persisted browser state.
- [Playwright `page.addInitScript`](https://playwright.dev/docs/api/class-page#page-add-init-script) — confirms the token can be placed in page memory before application scripts execute.
- [`jose` key generation](https://github.com/panva/jose/blob/main/docs/key/generate_key_pair/functions/generateKeyPair.md) and [`SignJWT`](https://github.com/panva/jose/blob/main/docs/jwt/sign/classes/SignJWT.md) — authoritative APIs for extractable ES256 key generation and short-lived JWT signing.

### New Files to Create

- `platform/bff/service/convex/auth.config.test.ts` — conditional-provider configuration tests.
- `platform/bff/backoffice/index.development-auth.html` — hosted-development-only browser entry.
- `platform/bff/backoffice/src/developmentIdentity.tsx` — in-memory token adapter for `ConvexProviderWithAuth`, carrying a production-exclusion marker.
- `platform/bff/backoffice/src/main.developmentAuth.tsx` — automation entry bootstrap using the real dashboard and Convex client.
- `platform/bff/backoffice/vite.development-auth.config.ts` — explicit multi-entry development build; never used by production.
- `platform/bff/backoffice-e2e/src/developmentAuth.ts` — local key loading, ES256 token minting and safe public-JWKS serialization.
- `platform/bff/backoffice-e2e/src/developmentAuth.test.ts` — token claims/signature and local-key behavior tests.
- `platform/bff/backoffice-e2e/src/generateDevelopmentAuthKey.ts` — one-time local key generator that writes only ignored files with restrictive permissions.
- `platform/bff/backoffice-e2e/src/hosted-development.spec.ts` — real `ops-dev` authenticated overview test.
- `platform/bff/backoffice-e2e/playwright.hosted-development.config.ts` — on-demand hosted configuration with no web server, persisted state or trace capture.
- `platform/bff/backoffice-e2e/vitest.config.ts` — unit-test configuration for signer/key helpers.
- `platform/bff/backoffice-e2e/README.md` — local credential, key rotation and deterministic-versus-hosted test boundaries.
- `docs/operations/development-authenticated-smoke.md` — target confirmation, provisioning, deploy, execution and rollback runbook.

## Codebase Context

### Existing Architecture and Integration Points

The browser currently obtains a Google ID token in `GoogleIdentityProvider`, and `ConvexProviderWithAuth` forwards it to the configured Convex deployment. `App` first calls the public health route, then `currentOperator`, and only calls `overview` after authorization succeeds. The new entry changes only the token source: it supplies a signed development token to the same Convex provider and queries. Convex validates that token before `ctx.auth.getUserIdentity()` reaches the existing allowlist guard.

The custom provider is enabled only when `BFF_DEVELOPMENT_AUTOMATION_JWKS` contains a valid public key and `BFF_DEVELOPMENT_AUTOMATION_AUDIENCE` contains an exact canonical HTTPS URL. Its issuer and subject are reviewed non-secret constants shared by the signer and server; the audience is deployment-specific. The JWKS is public but deployment-specific; the corresponding private JWK remains only in `.convex/development-auth-private.jwk`. Because Convex requires every auth-config environment-variable reference in every deployment, production sets both values to the exact non-secret sentinel `disabled`; the generated production auth configuration still contains only Google.

The normal Vite target continues to build `index.html`. An explicit development-auth target additionally builds `index.development-auth.html`; only this output is uploaded to `business-factory-backoffice-dev`. Production CI invokes the existing default production build and bundle assertion, so it cannot publish the automation entry accidentally.

### Patterns to Follow

#### Naming and Organization

- Keep BFF-wide reviewed non-secret identifiers in `@bff/static-config`; keep the deployment-specific JWKS in Convex environment configuration and the private key in ignored local state.
- Extend the existing `bff-backoffice-e2e` Nx project instead of creating a new project or test deployment.
- Follow the separate-entry pattern already used by `index.e2e.html` and `main.e2e.tsx`, while using a distinct marker that production bundle checks reject.

#### Error Handling

- Missing or empty JWKS remains Google-only in pure tests. A deployed configuration uses either a valid audience/JWKS pair or the exact `disabled`/`disabled` pair; partial, mixed or malformed values must make deployment fail rather than silently weaken validation.
- Missing, malformed or overly permissive local key files make key generation/signing fail with a bounded message that never prints key material or JWTs.
- The automation page without an injected, unexpired token shows a bounded configuration failure and never falls back to an unsigned identity.

#### Logging and Observability

- Log only high-level key-generation, target and smoke outcomes. Never log the private JWK, signed JWT, full public-provider environment file contents or operator address.
- Keep Playwright tracing disabled for the hosted authenticated project so the injected token is not retained in failure artifacts.
- The visible ready dashboard and existing BFF health/version are sufficient observability for the first on-demand check; add no table or audit log.

#### Authentication and Authorization

- Google remains first and always configured. The ES256 custom provider uses an exact issuer, exact `applicationID`/audience, data-URI JWKS and two-minute tokens containing `sub`, `iss`, `aud`, `iat` and `exp`.
- Use a dedicated code-owned automation subject, not a human email. The shared operator guard accepts that exact issuer-and-subject pair only after Convex authentication; production has no provider capable of producing the identity.
- Inject the token with `page.addInitScript`, consume it once into React memory and remove the temporary global. Do not use URLs, cookies, local storage, session storage or checked-in Playwright auth state.
- The private signing key grants development operator access and is treated as a credential even though the public JWKS and protocol identifiers are not secret.

#### Data and Migrations

No schema, table, index, stored user or seed-data change is required. The hosted test accepts either an empty or populated registry and asserts only the bounded ready overview.

#### Testing

- Vitest covers auth-config inclusion/exclusion and signer claims/signature using generated ephemeral keys.
- Existing `convex-test` denial/authorization cases remain unchanged and continue to cover the detailed policy matrix.
- Existing fixture Playwright remains part of `pnpm check` and uses no live provider.
- A separate Playwright configuration owns the on-demand hosted development test and is never invoked by the normal CI gate.

## Design Decisions

- **Decision**: Add a signed development identity to shared `ops-dev`, not a third deployment.
  - **Rationale**: It verifies the environment Codex and Andrew actually use with the least infrastructure.
  - **Tradeoff**: Compromise of the local signer permits operator access to development until the JWKS is rotated or removed.
- **Decision**: Use a custom ES256 JWT with a data-URI JWKS.
  - **Rationale**: Convex performs real cryptographic validation without another hosted identity service.
  - **Tradeoff**: The repository gains one local credential and the `jose` development dependency.
- **Decision**: Use a separate development-only HTML/Vite entry.
  - **Rationale**: Human Google login remains unchanged and production can prove the automation adapter is absent.
  - **Tradeoff**: Development publishing must use the explicit multi-entry build target before uploading assets.
- **Decision**: Run the hosted check on demand only.
  - **Rationale**: This satisfies Codex autonomy without adding GitHub development secrets or another deployment workflow.
  - **Tradeoff**: It is not automatically run on every commit.
- **Decision**: Keep detailed negative cases in deterministic tests.
  - **Rationale**: The accepted scope asks the hosted check to prove one real protected happy path; Convex already owns issuer/audience/expiry rejection.
  - **Tradeoff**: The first hosted test does not independently exercise expired or wrong-audience tokens.

## Implementation Plan

### Phase 1: Development identity foundation

Add stable non-secret protocol identifiers, pinned JOSE tooling, local key generation and unit-tested token minting without touching a provider deployment.

### Phase 2: Conditional Convex and dashboard integration

Add the optional development custom-JWT provider and the separate token-driven dashboard entry while preserving the normal Google entry and production output.

### Phase 3: Hosted test and operational documentation

Add the on-demand Playwright project, exact development runbook, architecture amendment and documentation routing.

### Phase 4: Verification and rollout

Pass targeted and complete local gates, provision only the named development deployment, publish the explicit development build, run the authenticated hosted check, then release the source through the normal reviewed `main` workflow and confirm production remains Google-only.

## Step-by-Step Tasks

Execute in dependency order.

### Task 1: ADD development signing primitives and local key generation

- **Implement**: Pin `jose@6.2.12`; add reviewed issuer/subject constants to `@bff/static-config`; keep the exact target audience deployment-specific; add pure ES256 key/JWKS/token helpers and an idempotent key-generation command in `bff-backoffice-e2e`. Write the private JWK to `.convex/development-auth-private.jwk` with mode `0600` and the public data-URI JWKS to `.convex/development-auth-jwks.txt`. Refuse to overwrite an existing private key and never print either private key or JWT.
- **Pattern**: `platform/bff/libs/config/src/index.ts:1` for reviewed shared identifiers; `.gitignore:1` for ignored local Convex state; `tools/production-delivery/src/config.ts:26` for bounded configuration errors.
- **Dependencies/Imports**: `jose` `generateKeyPair`, `exportJWK`, `importJWK`, `SignJWT` and `jwtVerify`; Node `crypto.randomUUID`; Node filesystem APIs with explicit permissions.
- **Gotchas**: Generate extractable keys; set matching `alg`, `use` and random `kid`; token TTL is two minutes; use only the dedicated automation subject and never log the token; all paths resolve from workspace root. The same local signer may be installed in more than one solo-development deployment later, but each token must carry that deployment's exact audience.
- **Validate**: `corepack pnpm nx run bff-backoffice-e2e:test` after Task 4 adds the target; before then, run the helper's focused Vitest file through the planned config.

### Task 2: UPDATE Convex auth configuration to fail closed

- **Implement**: Refactor `auth.config.ts` to export a pure config builder for tests. Always configure Google first. Add the ES256 custom provider only when both `BFF_DEVELOPMENT_AUTOMATION_JWKS` and the exact HTTPS `BFF_DEVELOPMENT_AUTOMATION_AUDIENCE` are valid; the exact `disabled` pair produces Google-only configuration, while partial, mixed or malformed configuration throws during deployment. Use the exact code-owned issuer. Extend the shared operator guard to accept the exact authenticated automation issuer-and-subject pair without adding a fake human email. Add tests proving absent and explicitly disabled mean Google-only, valid means exactly two providers, malformed input fails and near-match automation identities remain forbidden.
- **Pattern**: `platform/bff/service/convex/auth.config.ts:4` for the current provider; `platform/bff/service/convex/businessEnvironments.test.ts:102` for fail-closed authorization expectations.
- **Dependencies/Imports**: `AuthConfig` from `convex/server`; automation constants from `@bff/static-config`.
- **Gotchas**: Production must use only the exact `disabled` pair; local deterministic tests may still call the pure builder without values. Do not add a custom function-level bypass; every request must still use `ctx.auth` and `requireOperator`.
- **Validate**: `corepack pnpm nx run bff-service:test-integration && corepack pnpm nx run bff-service:typecheck`.

### Task 3: ADD the development-only dashboard entry

- **Implement**: Make `App` accept its sign-in control as a prop so it no longer assumes a Google context. Keep `main.tsx` passing the real Google button. Add an automation identity provider/hook that consumes the preloaded token once, keeps it only in React memory, uses the existing expiry semantics and returns it through `ConvexProviderWithAuth`. Add the separate HTML/bootstrap entry and explicit multi-entry Vite config/target used only for development publication.
- **Pattern**: `platform/bff/backoffice/src/googleIdentity.tsx:53` and `:149` for provider/hook semantics; `platform/bff/backoffice/index.e2e.html:1` plus `src/main.e2e.tsx:1` for a non-default browser entry; `vite.config.ts:10` for aliases/output.
- **Dependencies/Imports**: Existing React, Convex client and `App`; no new browser dependency.
- **Gotchas**: The automation entry must not load Google, persist the JWT, accept a token from the URL or fall back to unauthenticated access. A missing/expired token gets a bounded failure. Keep the normal Google entry behavior and visual states unchanged.
- **Validate**: `corepack pnpm nx run bff-backoffice:typecheck && corepack pnpm nx run bff-backoffice:test && corepack pnpm nx run bff-backoffice:build-development-auth` (new target).

### Task 4: ADD the on-demand hosted Playwright test

- **Implement**: Add the hosted development Playwright configuration with exact base URL `https://ops-dev.tofler.tech`, desktop Chromium only, no local web server, no retries and tracing disabled. Mint a fresh token per run, inject it before navigation, open the development-auth entry and assert the real ready overview, health/service label and read-only Business-environment section appear. Restrict the existing config to its deterministic fixture so `pnpm test:e2e` remains offline. Add a Vitest target/config for signing-helper tests and root scripts for key generation, development auth build and hosted auth smoke.
- **Pattern**: `platform/bff/backoffice-e2e/playwright.config.ts:3` and `src/dashboard.spec.ts:3`; `platform/bff/backoffice/project.json:8` and `backoffice-e2e/project.json:8` for Nx target conventions.
- **Dependencies/Imports**: Signing helper from the same E2E project; Playwright `page.addInitScript`; existing dashboard locators.
- **Gotchas**: Never attach the token to a URL, storage state, screenshot name, console message or trace. Fail before launching the browser when the local private file is absent or malformed. Do not assume the development registry contains rows.
- **Validate**: `corepack pnpm nx run bff-backoffice-e2e:test && corepack pnpm test:e2e`; the hosted command is expected to fail clearly until Tasks 6–7 provision and publish development.

### Task 5: HARDEN production exclusion

- **Implement**: Extend the production bundle assertion to reject the development-auth HTML/file name, source marker, issuer and audience. Add an assertion test or deterministic build check proving the default build contains only the Google entry while the explicit development build contains the automation entry. Keep `.github/workflows/ci.yml` on the existing default build; add no development credential or test command to CI.
- **Pattern**: `platform/bff/backoffice/scripts/assert-production-bundle.mjs:6` for content scanning; `.github/workflows/ci.yml:60` for the unchanged production build path.
- **Dependencies/Imports**: Automation constants may be imported by the Node assertion but must be tree-shaken from production browser assets.
- **Gotchas**: Cloudflare SPA fallback may return `index.html` for a missing automation path, so validate build contents rather than expecting a hosted `404`. The conditional backend provider and development HTML are distinct safety boundaries; both must be absent/inactive in production.
- **Validate**: `corepack pnpm nx run bff-backoffice:build && corepack pnpm bundle:assert`; inspect `dist/platform/bff/backoffice` to confirm no automation HTML/chunk before running the explicit development build separately.

### Task 6: UPDATE architecture and operational documentation

- **Implement**: Amend ADR 0002 with the development-only provider, credential boundary and production exclusion. Add the operational runbook with exact named deployment/Worker, key generation, public JWKS configuration via `convex env --deployment compassionate-buffalo-689 set ... --from-file`, development function push, multi-entry build/deploy, hosted test, rotation and rollback. Add an E2E README and route the new runbook from the root README. Correct the root README's stale Build 1 status.
- **Pattern**: `docs/architecture/adr/0002-business-environments-and-operator-auth.md:45` and `:102`; `docs/operations/build-1-hosted-verification.md:40`; `tools/production-delivery/README.md:1`; `README.md:5`.
- **Dependencies/Imports**: None.
- **Gotchas**: Never record the private JWK, JWT or provider login credential. Clearly separate public JWKS from the private signer and distinguish deterministic local Playwright from the hosted on-demand check.
- **Validate**: `git diff --check` and verify every command/path in the runbook exists.

### Task 7: PROVISION and verify the named development lane

- **Implement**: After targeted/local validation and explicit target confirmation, generate the local key if absent; set `BFF_DEVELOPMENT_AUTOMATION_JWKS` from the public file and `BFF_DEVELOPMENT_AUTOMATION_AUDIENCE=https://ops-dev.tofler.tech/` on Convex deployment `compassionate-buffalo-689`; set both values to `disabled` on production so Convex can evaluate the shared auth config without adding the custom provider; push the tested Convex functions to the selected development deployment. Build with the explicit development-auth Vite target, run Wrangler dry-run, publish only `business-factory-backoffice-dev`, then run the hosted authenticated Playwright command.
- **Pattern**: `docs/operations/build-1-hosted-verification.md:40` for target verification, `:57` for development Convex push and `:69` for Cloudflare development publishing.
- **Dependencies/Imports**: Existing authenticated Convex and Wrangler sessions; generated ignored key/JWKS files.
- **Gotchas**: Do not use `--prod`, `wrangler.production.jsonc`, `ops.tofler.tech`, project environment-variable defaults or a GitHub secret. The public JWKS update invalidates previously signed tokens; mint only after the backend push. Report and fix any provider rejection without enabling a bypass.
- **Validate**: `corepack pnpm test:e2e:development-auth` returns success and visibly reaches the real ready overview at `ops-dev.tofler.tech` without Andrew signing in.

### Task 8: VALIDATE, release and close the feature

- **Implement**: Run the complete local gate after all source/docs changes, review the diff for key/token leakage, commit locally and present it for Andrew's pre-push review. After approval, push to `main`; require GitHub validation, production Convex/Cloudflare deployment and production public smoke to pass. Confirm the production auth builder receives the exact `disabled` pair, contains only Google and the production bundle assertion remains green. Update this plan to `Completed` and shorten `STATUS.md` to the verified outcome and next move.
- **Pattern**: `package.json:14` for `pnpm check`; `.github/workflows/ci.yml:30` for the production completion path; `AGENTS.md:37` for the completion rule.
- **Dependencies/Imports**: The repository's existing GitHub production environment; no new production secret.
- **Gotchas**: The feature is intentionally usable only in development, but the source task is not complete until the normal production release proves the test path remains inactive there. A fresh human production Google sign-in is not required because the human provider flow is unchanged; automated production smoke plus the exclusion checks are the release gate.
- **Validate**: `corepack pnpm check && git diff --check`, followed by a green main workflow and read-only confirmation that production has the exact non-secret `disabled` pair and therefore emits no development-auth provider.

## Testing Strategy

### Unit Tests

- Generate an ephemeral ES256 pair, sign a token and verify its signature plus exact issuer, audience, dedicated subject, `kid`, issue time and two-minute expiry.
- Reject missing, malformed and permissively readable private-key files without exposing contents in the error.
- Prove the Convex auth config contains only Google when values are absent in a pure test or explicitly disabled for a deployment, adds exactly one custom provider with a valid data URI and throws for malformed or mixed input.
- Preserve existing dashboard component tests after the sign-in control becomes injectable.

### Integration Tests

- Preserve the current `convex-test` authorization matrix; no function bypass or new public API is introduced.
- Build the ordinary production dashboard and assert every development-auth marker/entry is absent.
- Build the explicit development dashboard and confirm its extra entry exists before deployment.

### End-to-End or Manual Validation

- Existing `pnpm test:e2e` remains deterministic and provider-independent on desktop and phone.
- New `pnpm test:e2e:development-auth` mints a fresh token, injects it only in page memory and loads the protected overview from the live development backend on desktop Chromium.
- No Andrew interaction is required for the development smoke after the one-time local key/JWKS provisioning.
- Production's existing public smoke and bundle exclusion checks are sufficient for this source release; Google operator sign-in remains available but is not re-exercised automatically.

### Edge Cases

- Local key file is missing, malformed, group/world-readable or has an unexpected algorithm.
- Token expires before Convex connects; the run fails and a fresh run mints another token.
- JWKS is absent in development, malformed or belongs to a rotated key.
- The automation page is requested without Playwright token injection.
- Development registry is empty.
- Default production build accidentally includes an automation filename, marker, issuer or audience.
- Production receives anything other than the exact `disabled` pair for the development-automation settings.

## Validation Commands

Run from `/root/projects/bff` under Node.js 24 unless noted.

### Syntax and Types

```bash
corepack pnpm typecheck
corepack pnpm boundaries:check
```

### Tests

```bash
corepack pnpm nx run bff-service:test-integration
corepack pnpm nx run bff-backoffice-e2e:test
corepack pnpm test:e2e
corepack pnpm test:e2e:development-auth
```

The final command is the on-demand hosted check and requires the ignored local signer plus the configured development deployment. It is intentionally not part of `pnpm check`.

### Lint and Formatting

```bash
corepack pnpm format:check
corepack pnpm lint
git diff --check
```

### Production Exclusion and Complete Gate

```bash
corepack pnpm nx run bff-backoffice:build
corepack pnpm bundle:assert
corepack pnpm check
```

### Manual Validation

- Confirm the selected Convex target is `andrew-tofler/business-factory` development deployment `compassionate-buffalo-689` before setting the JWKS or pushing functions.
- Confirm Wrangler identifies the approved account and `platform/bff/backoffice/wrangler.jsonc` still targets only `business-factory-backoffice-dev` / `ops-dev.tofler.tech`.
- Confirm both development automation variables contain valid public verification configuration in development and the exact non-secret `disabled` value in production; do not print the development JWKS.
- Confirm the ignored private JWK is mode `0600`, `git check-ignore` recognizes it and `git status --short` never lists it.
- After the reviewed push, require the GitHub main workflow's validation, production deployment and smoke jobs to pass.

## Acceptance Criteria

- [x] Codex can run one documented command that authenticates to the live `ops-dev` dashboard and observes the protected ready overview without Andrew or a Google account credential.
- [x] Convex cryptographically validates the automation JWT's ES256 signature, exact issuer, exact audience and expiry before existing operator authorization executes.
- [x] The token exists only in test-process/page memory, lasts no more than two minutes and is never logged, placed in a URL, persisted in browser storage or retained in Playwright traces.
- [x] The private key exists only in an ignored mode-`0600` local file; git, Cloudflare assets, Convex environment configuration and docs contain no private key or token.
- [x] The normal `ops-dev` Google entry remains available and unchanged for Andrew and his wife.
- [x] Production configures only Google by using the exact `disabled` pair and ships no development-auth HTML, source marker, issuer or audience.
- [x] Existing authorization denials, deterministic desktop/phone Playwright and all repository gates continue to pass.
- [x] The exact development provisioning, rotation, execution and rollback process is documented and runnable by Codex.
- [ ] The reviewed source reaches `main`; production validation/deployment/smoke is green even though the feature itself is enabled only in development.

## Risks and Mitigations

- **Risk**: The private signer is stolen and used for development operator access.
  - **Mitigation**: Store it only in ignored mode-`0600` local state, bind tokens to exact development issuer/audience, use a two-minute TTL, never persist browser state and document immediate JWKS removal/rotation.
- **Risk**: The test provider is accidentally enabled in production.
  - **Mitigation**: Activation requires a valid deployment-specific JWKS and canonical audience; production uses the fail-closed `disabled` pair, CI keeps the default build and the bundle assertion rejects automation artifacts.
- **Risk**: An automation token leaks into Playwright artifacts or logs.
  - **Mitigation**: Disable hosted traces, inject through `addInitScript`, do not log/attach the token and avoid URL/storage-state transport.
- **Risk**: Vite multi-entry output or Cloudflare SPA behavior hides an exclusion mistake.
  - **Mitigation**: Use distinct build targets and assert filesystem/content absence in the default build instead of relying on hosted HTTP status.
- **Risk**: Custom JWT behavior differs from assumptions.
  - **Mitigation**: Follow Convex's exact custom-JWT fields and data-URI JWKS guidance, cover config/signing deterministically and make the live development overview the acceptance check.

## Open Questions

None. The accepted brainstorm resolved lane, trigger and hosted coverage scope.

## Implementation Confidence

**8/10 for a one-pass implementation.** Repository patterns, provider support and the desired boundary are clear, and all required accounts already exist. The deduction is for the first live combination of Convex's data-URI custom JWT provider with a Vite multi-entry Cloudflare asset deployment; either may require a small compatibility adjustment during the hosted verification pass.

## Notes

- Rejected: automating a real Google account, because it would require a reusable high-value credential and remain vulnerable to provider UI/MFA/CAPTCHA changes.
- Rejected: a third hosted test lane, because Andrew explicitly chose the easiest safe option for the current solo phase.
- Rejected: a function-level fake-auth flag, because it would not exercise Convex token validation and would create a more dangerous bypass.
- No Business-user authentication decision, service credential, table or public API is introduced.
- Rollback is development-only: set both `BFF_DEVELOPMENT_AUTOMATION_JWKS` and `BFF_DEVELOPMENT_AUTOMATION_AUDIENCE` to `disabled` on the exact development deployment, push Convex config, rebuild development with the default Vite target and republish the development Worker. Keeping the now-inert ignored private key is safe; rotate or remove it locally if compromise is suspected.

## Document History

| Date | Status | Change |
| --- | --- | --- |
| 2026-09-26 | Draft — Awaiting review | Initial implementation-ready plan created from the accepted simple shared-development direction. |
| 2026-09-26 | Accepted — Implementation in progress | Andrew approved implementation and the existing development deployment rollout. Replaced human-email impersonation with a dedicated automation identity and recorded one reusable solo-development signer with audience-bound tokens. |
| 2026-09-26 | Implemented and development-verified — Awaiting source release | Local gates passed, the exact development Convex/Cloudflare lane was provisioned, and the authenticated hosted overview passed. Cleanup additionally bound human email authorization to Google's issuer. Commit, push and the normal production exclusion release remain pending Andrew's review. |
| 2026-09-26 | Source release fix-forward in progress | Commit `e733e3a` passed validation, but production deployment stopped before mutation because Convex requires every auth-config environment-variable reference. Adopted the explicit `disabled` pair so production remains Google-only while satisfying that platform constraint. |
