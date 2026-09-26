# Feature: Build 2 — Shared Business Authentication and Accounts

> **Status**: Accepted 2026-09-26 — implementation authorized
> **Created**: 2026-09-26
> **Last updated**: 2026-09-26
> **Repository baseline**: `f2e7e6498bf628d97b74696942f512bb36a322d1`
> **Source brainstorm**: [Build 2 Shared MVP](../brainstorms/260926-build-2-shared-mvp.md)
> **Planning handoff**: Andrew requested `plan-feature` after the discussion and Astra reconciliation, reviewed the resulting URL/SDK refinements and authorized implementation on 2026-09-26.
>
> Implementation is authorized. Production deployment still follows the repository's reviewed release controls. Recheck the baseline, provider documentation and resource configuration before each affected phase.

## Repository Context Snapshot

- Build 1 and its production-delivery and development-operator-auth follow-ups are complete. The workspace has seven Nx projects and only one application table, `businessEnvironments`. Customer identities, accounts, sessions, SDKs and an example Business do not exist yet.
- Existing operator authentication uses a separate Google client and a fixed verified-email allowlist. Its development automation identity is not the customer automation provider; preserve its authorization boundary.
- The inspected worktree already contains discussion-related edits to `AGENTS.md`, `README.md`, `STATUS.md`, ADR 0001, the delivery plan and product specification, plus the untracked source brainstorm and future-ideas registry. They belong to the user and must not be discarded or silently overwritten.
- Only this plan is changed during planning. On implementation handoff, reconcile the source lifecycle and short `STATUS.md` pointer without copying this plan into either file.
- Required runtime is Node.js 24 with pnpm 12.6.0. The inspection shell reported Node.js 20.20.2; select the repository's supported runtime before implementation validation.
- Installed stack: Convex 1.46.0, React 19.3.0, Zod 4.6.5, TypeScript 6.0.3, Nx 23.2.1, Vite 8.3.1, Vitest 4.1.11, convex-test 0.0.60, Playwright 1.63.0, JOSE 6.2.12 and Wrangler 4.141.0. Do not combine this work with general upgrades.
- The handoff says the customer Google client was created, but its exact public client ID is not in the inspected source. The only checked-in Google client is the operator client. Obtain the reviewed customer ID rather than substituting the operator audience.
- BFF development/production and operator hosting exist. The separate example Convex project/deployments, customer-auth hosting, example hosting and their release configuration remain to be provisioned. No provider resources were created or changed during planning.

## Feature Description

Give every web Business one supported authentication and account integration: a shared Google sign-in page, BFF-owned users/accounts/memberships, a secure Business-host session cookie and one short BFF-signed token per tab. The SDK hides login, renewal and account selection while Business code receives a verified user/account context.

The retained example is a minimal real Convex consumer, not TableCards and not an administration playground. It proves the reusable contract in development and production. Backoffice shows the resulting records; validated CLI operations own configuration and provisioning.

## User Story

As a Business developer, I want to install the shared SDK, register my environment and account policy, and protect my backend functions, so that sign-in, account membership and multi-tab authorization work without rebuilding authentication or coupling my product to Cloudflare.

As a customer, I want to sign in once, use the correct account in each tab and remain signed in according to the Business's policy, without periodically repeating Google login.

## Problem and Solution

The repository currently authenticates operators only. Extending that audience or exposing BFF internals to products would mix trust boundaries. A frontend-only demo would also miss the real Convex cookie, native-client, account-selection and deployment behavior.

Build one end-to-end implementation: BFF is the authority; a portable server SDK owns the Business cookie and requests tokens; browser/React bindings keep account tokens in tab memory; a Convex adapter uses the native authenticated client and guarded server functions. One stable opaque handle avoids renewal-cookie races. Indexed transactional account operations preserve membership, seat and ownership invariants.

## Metadata

- **Type**: New Capability.
- **Complexity**: High — custom cross-origin authentication, transactional multi-tenant authorization, browser concurrency and two Convex deployment pairs must work together.
- **Affected systems**: BFF schema/HTTP/actions/crons, public contracts, SDK, shared auth UI, example UI/backend, operator CLI/backoffice, tests, release tooling and operational documentation.
- **Dependencies**: Existing repository stack; add the official `@convex-dev/rate-limiter` component. Registry inspection returned 0.4.0 with Convex `^1.43.0` compatibility; pin the reviewed version during execution. JOSE becomes a declared runtime dependency wherever shipped rather than relying on its current development-only classification.
- **Implementation assumptions**: Explicitly named below: transport limits, invitation lifetime and Google confirmation assurance. None authorize new billing, support, identity-linking or native-app work.

## Scope and Ownership

| Build 2 implements | Deliberately outside this plan |
| --- | --- |
| Google customer sign-in; dev-only dummy signup and existing-user login-as | Apple/GitHub, email-based identity merging, recovery/linking |
| Principal/identity/environment-user/session records | Central SSO cookie, native multi-user session chooser |
| BFF-owned accounts, memberships, Owner/Admin/Member roles | Product data schemas beyond the minimal reference caller |
| Account policy, default provisioning, invitations, ownership transfer | Structural personal/team account kinds or child profiles |
| One tab-local current-context JWT; server cookie adapter; Convex integration | A second Business-signed JWT, Business session tables, Cloudflare-managed auth |
| Current active-account authorization and shared numeric limits | Plans/subscriptions, custom product entitlements, seat classes, usage balances |
| Read-only operator visibility and validated operations | Paid downgrade/restriction machinery, customer-support conversations |
| Layered tests and a working production example | A visible example account-management playground |

Build 4 retains the accepted commercial policy: reject an incompatible voluntary downgrade; restrict an account when an unavoidable subscription change makes it invalid, preserving members and data and leaving Owner/Admin remediation. Do not implement those states or guards until the paid caller exists. Build 5 owns two-way email support. Deferred ideas remain in their existing registry.

Operational ownership is explicit:

- **CLI/Codex**: register environments, approved origins/callbacks, configure policy/defaults/overrides, provision managed accounts, inspect state, revoke sessions, prepare development fixtures and publish approved deployment configuration.
- **Read-oriented backoffice**: environment-filtered user/account/membership/session/security evidence and effective policy provenance; no duplicate configuration forms.
- **Product-facing SDK**: sign-in/out, account selection, onboarding create/join, permitted invitations/member actions and explicitly confirmed ownership transfer. The example exposes only sign-in/out, profile/context and conditional selection; integration harnesses exercise the other real SDK operations.

## Required Reading

### Existing code and useful entry points

- `package.json:8`, `pnpm-workspace.yaml`, `nx.json`, `tsconfig.base.json` — runtime, targets, package discovery, cache inputs and public aliases.
- `eslint.config.mjs:30`, `tools/verify-boundary-policy.mjs:35` — public, Business, BFF and operator dependency boundaries; do not relax them to make SDK imports work.
- `platform/bff/libs/contracts/src/health.ts:5` — shared Zod response validation pattern.
- `platform/bff/libs/config/src/index.ts:8` — reviewed shared non-secret identifiers; existing Google identifier belongs to operators.
- `platform/bff/service/convex/schema.ts:4`, `platform/bff/service/convex/businessEnvironments.ts:19` — present schema, indexed lookup, internal mutations and safe views.
- `platform/bff/service/convex/lib/errors.ts:3`, `platform/bff/service/convex/lib/businessEnvironmentView.ts:5` — typed errors and explicit public projections.
- `platform/bff/service/convex/lib/authorization.ts:80`, `platform/bff/service/convex/auth.config.ts:84` — operator guard and fail-closed development-auth configuration.
- `platform/bff/service/convex/http.ts:9` — HTTP router; its public-health wildcard CORS is not suitable for cookie routes.
- `platform/bff/service/convex/backoffice.ts:11`, `platform/bff/service/convex/businessEnvironments.test.ts:37` — protected reads and convex-test scenarios.
- `platform/bff/service/vitest.config.ts:24`, `platform/bff/service/project.json:20` — edge-runtime integration tests and targets.
- `tools/bff-operator/src/cli.ts:88`, `tools/bff-operator/src/cli.ts:221`, `tools/bff-operator/src/main.ts:25` — strict parsing, explicit deployment and child-process invocation. Production mutations are currently rejected; any added production command needs an explicit, tested confirmation boundary.
- `platform/bff/backoffice/src/googleIdentity.tsx:53`, `platform/bff/backoffice/src/dashboard.tsx:74` — GIS loading and presentation patterns, not a ready-made customer session implementation.
- `platform/bff/backoffice/public/_headers`, `platform/bff/backoffice/scripts/assert-production-bundle.mjs:10` — hosting headers and development-code leak checks.
- `platform/bff/backoffice-e2e/src/developmentAuth.ts:144`, `platform/bff/backoffice-e2e/playwright.hosted-development.config.ts:10` — protected local signing material and sensitive hosted-browser artifact policy.
- `tools/production-delivery/src/config.ts:77`, `tools/production-delivery/src/build-dashboard.ts:17`, `tools/production-delivery/src/smoke.ts:76`, `.github/workflows/ci.yml:30` — strict deployment targets, actual production build/publish/smoke sequence.

### Canonical documents

- [Source brainstorm](../brainstorms/260926-build-2-shared-mvp.md) — read in full, including later decisions superseding the historical options.
- [TableCards MVP](../../docs/products/tablecards-mvp.md) and [delivery plan](../../docs/factory/mvp-delivery-plan.md) — Build 2/4/5 boundaries and production completion.
- [ADR 0001](../../docs/architecture/adr/0001-convex-first-bff-stack.md), [ADR 0002](../../docs/architecture/adr/0002-business-environments-and-operator-auth.md), [ADR 0003](../../docs/architecture/adr/0003-production-delivery.md) — public SDK boundary, deployment isolation and release authority.
- `docs/architecture/bff-mvp-architecture.md:155` — placement of platform libraries and separate Business workloads/backends.
- `docs/operations/build-1-local-development.md`, `docs/operations/build-1-hosted-verification.md` — preserve existing local/hosted operator workflows.

### Version-sensitive external evidence

- [Convex custom JWT integration](https://docs.convex.dev/auth/advanced/custom-jwt#server-side-integration) — pin ES256, issuer, explicit audience and JWKS; never omit `applicationID`.
- [Convex custom auth client integration](https://docs.convex.dev/auth/advanced/custom-auth#client-side-integration) — use `ConvexProviderWithAuth` and honor forced token refresh. Also inspect the installed client types and authentication manager rather than writing a competing refresh loop.
- [HTTP actions](https://docs.convex.dev/functions/http-actions) and [Web Crypto runtime](https://docs.convex.dev/functions/runtimes#web-crypto-apis) — Request/Response cookie/CORS adapter, outbound verification/signing outside database functions.
- [Convex optimistic concurrency](https://docs.convex.dev/database/advanced/occ) — transaction boundaries and retry behavior; indexes alone are not declarative uniqueness constraints.
- [Official rate-limiter component](https://github.com/get-convex/rate-limiter) — component registration, transactional consumption, retry timing and bounded keys.
- [Google ID-token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [GIS nonce and button options](https://developers.google.com/identity/gsi/web/reference/js-reference#nonce) — provider verification and challenge binding; provider subject, not email, identifies the person.
- [Google authentication-time limitations](https://developers.google.com/identity/siwg/security-bundle#authentication_time) — a newly issued ID token is not proof of a newly entered password/MFA. Google does not expose an application-requested Google Account reauthentication guarantee.
- [PKCE S256](https://datatracker.ietf.org/doc/html/rfc7636#section-4), [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) — transaction binding, protected cookies, explicit origin/custom-header defenses and the cost of periodic handle rotation.
- [WebKit third-party-cookie policy](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/) and [Convex custom domains](https://docs.convex.dev/production/custom-domains) — real Safari acceptance and the agreed paid custom-domain fallback, not a preimplementation gate.
- [Convex project configuration](https://docs.convex.dev/production/project-configuration) — keep BFF and example CLI working directories, generated code and deploy credentials separate.

## Planned File Map

All paths in this subsection that do not exist are proposed, not discovered APIs. Follow the existing Nx project-file conventions; create configuration, package exports, tests and a useful README with each new project, not a boilerplate directory tree.

| Target | Change |
| --- | --- |
| `platform/bff/libs/contracts/src/{auth,accounts,accountPolicy}.ts` | Versioned public schemas, discriminated contexts, error codes, limits and operation DTOs |
| `platform/bff/libs/sdk/typescript/` (`bff-sdk-typescript`, package `@tofler/bff-auth`) | One technology SDK: `src/core/`, `src/browser/`, `src/react/`, `src/server/`, `src/adapters/convex/`; hard subpath exports and independent tests |
| `platform/bff/service/convex/{customerAuth,sessions,accounts,memberships,invitations,ownershipTransfers,customerOperations,customerBackoffice,authCleanup}.ts` | Internal transactional model and bounded operator queries/operations |
| `platform/bff/service/convex/lib/{customerCrypto,customerPolicy,customerHttp,customerAuthorization}.ts` | Provider/JWT verification, pure policies, HTTP envelopes and customer guards |
| `platform/bff/service/convex/{schema,http,crons,convex.config}.ts` | Add schema as callers land; routes, retention cron, rate-limiter registration |
| `platform/bff/customer-auth/` (`bff-customer-auth`) | Static React/Vite GIS surface, distinct development automation entry, hosting manifests, headers, bundle assertions |
| `projects/example/workloads/web/` (`example-web`) | Minimal React example, SDK-only auth integration and environment-specific static hosting |
| `projects/example/backend/convex/` (`example-backend`) | Separate `schema.ts`, `auth.config.ts`, `http.ts`, `currentContext.ts`, generated files and backend tests |
| `projects/example/backend/convex.json` | Independent functions root; invoke its CLI from `projects/example/backend`, never root accidentally |
| `platform/bff/customer-auth-e2e/` (`bff-customer-auth-e2e`) | Local fixture-browser and uncached hosted-development Playwright suites |
| `tools/bff-customer-auth/` (`bff-customer-auth-tools`) | Customer-only dev signer, protected grant creation and fixture orchestration |
| Existing `tools/bff-operator/`, `platform/bff/backoffice/` | Policy/provision/revoke commands and read-only customer state |
| Existing `tools/production-delivery/`, `.github/workflows/ci.yml` | Multiple backend/asset targets, negative production probes and smoke coverage |
| `.agents/skills/configure-business/SKILL.md` | Scenario-driven configuration guide using the implemented CLI; create using `skill-creator` during implementation |
| `docs/architecture/adr/0004-business-customer-auth-and-accounts.md`, `docs/operations/build-2-customer-auth.md` | Accepted contract, setup, key lifecycle, failure handling and release evidence |
| Root package/workspace/TypeScript/Nx files | Discover `projects/**`, expose public SDK paths, add all new test/build targets and environment-sensitive cache inputs |

## Codebase Context and Patterns

- Use strict TypeScript, Zod at public JSON/configuration boundaries and Convex `v` validators on every function argument/return. Database functions import builders from their own `_generated/server`.
- Preserve `@bff/contracts` as public vocabulary. SDK/Business code cannot import BFF `_generated/api`; only the existing internal operator/backoffice exception remains. The example can import its own generated API.
- Organize SDKs by implementation technology, not by the product that first consumes them. Build 2 creates only `platform/bff/libs/sdk/typescript/`. Its portable core, browser, React and Fetch-style server pieces are technology-level code; Convex is the first backend adapter under `src/adapters/convex/`, not a separate SDK family. A later ordinary Node.js adapter belongs under the same TypeScript package when it has a real caller. Future Swift, Kotlin/Android, Go or Rust implementations become sibling technology directories under `platform/bff/libs/sdk/` and implement the same versioned public HTTP/token contracts without importing TypeScript internals. React Native may reuse the TypeScript core, but requires a real native secure-storage/session adapter before being claimed as supported.
- Use indexed reads and bounded pagination; never introduce growing `.collect()` scans for users, memberships, sessions or events. Existing `.take(100)` overview is not a template for silently truncating account selectors.
- Reuse `ConvexError`/`fail` internally. Add a deliberate HTTP error mapper with safe messages and correlation IDs; unexpected exceptions become generic failures. Do not serialize arbitrary upstream exceptions or input bodies.
- There is no existing customer-session logging/auditing framework. Add only the bounded security-event model below, not a new observability platform.
- Additive schema changes must accept existing `businessEnvironments` documents until explicitly configured. Missing customer-auth configuration means customer login disabled, not a wildcard policy. Existing health, operator auth and environment-management behavior remain operational throughout rollout.
- Unit tests are Vitest; backend scenarios use convex-test in the edge runtime; Playwright covers the browser boundary. Mocked `withIdentity` proves authorization logic, not cryptographic authentication. Both kinds of proof are required.

## Design Decisions

### 1. Deployment and cookie topology

| Surface | Development | Production |
| --- | --- | --- |
| Shared customer sign-in UI | `https://auth-dev.tofler.app` | `https://auth.tofler.app` |
| Reference Business UI | `https://example-dev.tofler.app` | `https://example.tofler.app` |
| Business session adapter | Separate example Convex generated HTTP deployment | Separate example production Convex generated HTTP deployment |
| BFF authority | Existing development BFF | Existing production BFF |

Start with the free generated example `*.convex.site` host. Set a host-only `__Host-tofler-session` cookie with `Secure; HttpOnly; Path=/; SameSite=None`; no `Domain` attribute. UI calls the adapter with `credentials: 'include'`, exact-origin CORS, `Vary: Origin` and non-cacheable responses. CORS never overrides browser third-party-cookie restrictions.

Complete the adapter and full flow before treating actual Safari results as an acceptance gate. If required, attach `api.example-dev.tofler.app` / `api.example.tofler.app` to the example Convex HTTP deployment, update approved callback/origin configuration, and use the same SDK contract with the now same-site cookie. Obtain approval for any paid plan/resource action. No Cloudflare cookie processing, reverse proxy or Worker auth gateway is added.

The generated native Convex `*.convex.cloud` WebSocket client continues using the short bearer token; it does not need the session cookie or an HTTP custom-domain replacement. Local tests must exercise genuinely different sites, not claim two localhost ports reproduce Safari's cross-site behavior.

### 2. Fixed platform controls and configurable policy

Business-wide controls are per **Business environment**, so development changes cannot mutate production policy.

Every registered Business environment also has explicit transport URLs:

| Field | Example | Meaning/validation |
| --- | --- | --- |
| `webOrigins` | `["https://example.tofler.app"]` | Non-empty bounded set of exact HTTPS frontend origins allowed to initiate login and make credentialed calls; no paths, wildcards, opaque origins or trailing-origin variants |
| `sessionAdapterBaseUrl` | `https://example-backend.convex.site` | One canonical HTTPS origin where the server SDK runs and owns the host-only session cookie; no path, query or fragment |
| `defaultPostLoginPath` | `/` | Validated same-application relative path used when a login does not request another permitted relative destination |

The SDK fixes its callback path to `/_tofler/auth/callback`; BFF derives and stores/checks the exact callback as `new URL('/_tofler/auth/callback', sessionAdapterBaseUrl)`. It is not a fourth independently editable URL. A login transaction records one initiating member of `webOrigins`, the exact derived callback and a validated relative return path. The callback redirects only to that recorded web origin plus relative path. BFF never infers the Business from `Origin`, `Referer` or callback host; the public environment key selects the registered record and every supplied URL must match it exactly.

The auth-page URL is deployment-owned (`https://auth-dev.tofler.app` or `https://auth.tofler.app`), not Business configuration. Browser code separately needs `sessionAdapterBaseUrl` to call the SDK routes, but its value is public and must match the registered environment. Changing the adapter origin—for example, to the accepted Safari custom-domain fallback—changes this one setting, regenerates the exact callback and requires a new login because host-only cookies do not migrate.

| Field | Default | Meaning/validation |
| --- | --- | --- |
| `createAccountOnFirstSignIn` | `true` | Materialize one default account once for a new local user; no permanent “personal” kind |
| `userAccountCreationEnabled` | `false` | User may explicitly create accounts subject to both caps |
| `maxAccountMembershipsPerUser` | `1` | Positive integer; counts owned and joined memberships |
| `maxOwnedAccountsPerUser` | `1` | Positive integer, no greater than the total-membership cap |
| `ownershipTransferEnabled` | `false` | Permit the protected transfer operation, not an unguarded role edit |
| `sessionIdleSeconds` | `604800` | 900–2592000 seconds; never exceed the absolute lifetime |
| `sessionAbsoluteSeconds` | `2592000` | 3600–15552000 seconds |

Account defaults, overridable by an explicit authorized account override in Build 2:

| Field | Default | Meaning |
| --- | --- | --- |
| `seatLimit` | `1` | Active memberships, including Owner, plus reserved invitation seats |
| `adminRoleEnabled` | `false` | Enables the limited fixed Admin role |
| `memberInvitationsEnabled` | `false` | Allows authorized members to issue member invitations |

Use `seatLimit` consistently; the brainstorm's illustrative ERD field `memberLimit` is not a second setting. Effective values expose `business_default` or `account_override` provenance. No plan-derived branch or subscription table exists yet.

All four creation-switch combinations are valid. Both switches off means sign-in plus invitation/operator onboarding, not accountless product access. Configuration guidance must warn that an automatically created account consumes the default membership capacity; accepting a second account requires a higher cap. Do not invalidate this deliberate default combination.

Settings operations validate exact URLs, integer bounds, allowed providers and cross-field constraints. No wildcard origins/callbacks. Reject a configuration change requiring automatic member removal or forbidden role migration; those are not implicit effects of editing a limit. Use a preflight plus concurrency-safe validation rather than a stale CLI-only check. Tightened session limits apply on the next authoritative session check; increases must not silently extend an existing absolute expiry.

Fixed platform limits: handoff code 60 seconds; current-context JWT at most 600 seconds; automation grant 120 seconds; transfer proof at most 300 seconds. These are not per-Business knobs.

### 3. One token, not a token hierarchy

The cookie contains **only a 256-bit random opaque session handle**. Store only its hash in BFF. Generate a fresh handle on every new login; do not replace it on ordinary token issuance/renewal. The cookie lifetime is capped by session absolute expiry; idle validity is enforced centrally.

The server SDK presents this handle to BFF and requests the tab's context. BFF validates session, policy and membership, then signs one ES256 JWT. No second identity assertion or Business-signed token is created. No BFF browser cookie or permanent Business client secret is necessary for this flow.

Versioned token claims:

- Standard `iss`, scalar `aud`, `sub`, `iat`, `exp`, `jti`; header `alg: ES256`, `kid`, `typ: JWT`.
- `iss` is the configured lane's canonical auth origin. `aud` is the exact lane/environment identifier, for example `https://auth-dev.tofler.app/environments/example-development`; consumers validate it rather than deriving trust from the request host.
- `sub` is the public environment-local user ID; additional flat claims are `version`, `environmentKey`, `sessionId` and `contextType`.
- Account context adds `accountId`, `membershipId`, `role` and compact fixed permissions. Onboarding context must not have account claims or product access.
- No private principal/provider IDs, name, email, picture, IP, device details, renewal handle, account list or mutable usage balance.

Both the example backend and allowed BFF APIs accept this token for its audience and scope. Acceptance by both is intentional; it does not give it operator authority or permission to access another environment. Protected BFF account mutations reread authoritative membership/role/capacity; a ten-minute snapshot is not enough for transfer, invitations or role changes.

Token expiration is `min(issuance snapshot + 600 seconds, absolute session expiry, applicable idle deadline)`. Use the timestamp from the transaction that authorized issuance, not a later signing timestamp. A concurrent revoke cannot extend the window by delaying signing. Existing tokens may remain accepted until expiry after logout/revocation; central revocation immediately prevents further issuance. Do not claim immediate invalidation of already-issued stateless tokens.

Keys are separate per deployment lane. BFF publishes public keys at `/v1/auth/jwks`; private signing material remains deployment secret configuration. Verifiers pin issuer/JWKS location/algorithm/audience and ignore token-supplied key URLs. Retain retiring public keys through token lifetime plus verifier-cache and bounded clock-skew overlap. A key/network outage is a retryable failure, not evidence to erase a valid cookie.

### 4. Login and browser binding

1. Browser navigates to the Business SDK login route. The server creates random state, PKCE verifier and S256 challenge; an attempt-specific short-lived HttpOnly transaction cookie holds state/verifier. It asks BFF to create a login transaction bound to environment, exact registered callback and validated relative return path.
2. The server redirects to the shared auth page with only the transaction reference. BFF supplies the public provider configuration and nonce for that transaction. Google credentials remain on the auth page only long enough to POST for verification.
3. BFF validates Google's signature, permitted issuer, exact customer audience, expiry and transaction nonce. Normalize the two documented Google issuer forms for identity lookup. Never use matching email as identity proof. The production provider list is Google only.
4. A transaction atomically creates/reuses the principal, provider identity, local user and first-signup account as policy requires. It creates a hashed one-minute handoff code bound to that same transaction. Parallel first logins converge on the same logical records.
5. The auth page navigates to the exact Business server callback with code and state. The SDK checks its corresponding transaction cookie before submitting code, verifier, environment and callback to BFF. BFF consumes the code once and creates one durable session.
6. The Business callback receives the handle server-to-server, sets its session cookie, expires only that attempt's transaction cookie and redirects to a clean UI URL. No durable credential or JWT travels in the URL. React does not process the callback code.
7. The React SDK bootstraps against the Business adapter. BFF resolves user and available accounts: zero means onboarding; one selects automatically; several restore an accessible tab/last-used preference or show selection. Selected account access is always revalidated before signing.

Implementation defaults for temporary protocol state: ten-minute login transaction, 60-second code after provider verification, bounded concurrent attempt cookies (eight), exact callback plus relative UI destination with protocol-relative/external redirects rejected. These are SDK protocol constants, not more Business settings. Independent attempts must not overwrite one common transaction cookie.

Set `Cache-Control: no-store` and `Referrer-Policy: no-referrer` on auth, callbacks and token responses. Exclude query strings, request bodies, tokens and cookie headers from application logs and browser artifacts. Reject invalid destinations before any redirect.

### 5. Server adapter and public operation boundaries

Proposed versioned routes are new contracts, not existing endpoints:

| Boundary | Operations | Credential and enforcement |
| --- | --- | --- |
| BFF `/v1/auth/transactions`, transaction completion | Start/read challenge; Google completion; conditional dev completion | Public environment registration plus transaction binding; fixed auth-origin CORS for browser completion; body/size limits and rate limiting |
| BFF `/v1/auth/exchange` | Consume one-minute handoff | Server SDK submits code + PKCE verifier + exact binding; no credentialed browser CORS |
| BFF `/v1/auth/session/context`, `/v1/auth/session/logout` | Bootstrap/issue/renew or revoke | Opaque handle in redacted server-to-server body/header, never query parameters; no browser cookie accepted |
| BFF `/v1/me`, `/v1/accounts/*` | Safe current user/account views and explicit account/member/invite operations | Verified BFF token plus authoritative checks for mutations; explicit method/operation routing, no generic function-name proxy |
| BFF `/v1/auth/transfer/*` | Start/consume action-bound confirmation | Current account/session/Owner checks and provider proof; server SDK handles private exchange material |
| Business `/_tofler/auth/login`, `callback` | Top-level login navigation and server callback | Transaction state/PKCE, not ordinary cross-site JSON CORS |
| Business `/_tofler/auth/context`, `logout`, `transfer/*` | Cookie-backed token bootstrap/renewal and action initiation | Exact registered UI Origin, credentials, JSON and required non-simple `X-Tofler-CSRF` header; preflight validated explicitly |
| Business product endpoints / native Convex functions | Actual product operations | Account-scoped bearer JWT and server guard, never a browser-supplied user/account ID alone |

For cookie-backed JSON operations, reject missing, `null` or unexpected Origin and simple-form submissions. The custom CSRF header is a preflight requirement, not a secret; its safety depends on exact origin validation and no reflected/wildcard credentialed CORS. Login navigation/callback uses the separate transaction defense. CORS is not authentication and does not stop a non-browser attacker who already possesses a handle.

SDK request validation bounds bodies, enum values, identifiers, return destinations and token size. Unknown errors produce a generic message plus correlation ID. Stable public errors distinguish unauthenticated, expired session, onboarding required, forbidden, capacity conflict, invalid input, rate limited and retryable unavailable; sensitive provider details remain private reason codes.

### 6. Data model and transaction boundaries

Keep identities normalized; do not denormalize provider details into every token or session renewal. New tables below have actual login/account/operator/test callers. The source's earlier five/six-table illustrations were not a final schema.

| Table | Purpose and essential indexes/invariants |
| --- | --- |
| Existing `businessEnvironments` | Optional versioned customer auth/policy configuration, registered UI origin/callback, automation enablement; existing `by_key` remains |
| `authPrincipals` | Private technical identity; no public enumeration or product-facing ID |
| `authIdentities` | Provider + normalized issuer + subject → principal; composite identity index; transactionally unique; dev namespace distinct from Google |
| `businessUsers` | Environment + principal → public local user/profile; indexes by pair, public ID and environment; first-signup provisioning marker; authoritative membership/ownership counters if used for bounded capacity checks |
| `loginTransactions` | Purpose, environment/callback/state/challenge/nonce hashes, verified principal, code hash/expiry/consumption, optional dev grant replay hash; indexes by public transaction reference, code hash, replay hash and cleanup deadline |
| `businessSessions` | Hashed handle → environment/user, public session ID, creation/absolute/idle/last-seen/revocation, bounded coarse evidence; indexes by handle hash, public ID, environment/user and cleanup deadline |
| `accounts` | Environment/public ID, optional display name, sole owner reference, shared-limit overrides and occupancy counters; indexes by public ID and environment |
| `memberships` | Environment/account/user, public ID and fixed role; unique account/user pair; indexes by user and account; owner role agrees with account owner |
| `accountInvitations` | Environment/account, token hash, intended verified email, inviter, Member role, pending/accepted/revoked/expired state, expiry; indexes by token hash, account/recipient and expiration |
| `ownershipTransferProofs` | Hashed proof, session/account/current Owner/target, provider-confirmation evidence, expiry, consumed operation result; indexes by hash and cleanup deadline |
| `securityEvents` | Bounded typed event, environment, safe actor/subject IDs, reason/correlation ID, coarse evidence and retention deadline; indexes by environment/time, account/time and retention |

Application-enforced uniqueness uses indexed get-or-create inside one Convex mutation; `.unique()` alone does not enforce inserts. Generate cryptographic randomness/hashes and verify/sign tokens in actions/HTTP handlers using Web Crypto/JOSE. Internal mutations receive hashes and validated normalized data, not raw Google tokens, session handles or handoff secrets that could leak through function logging.

One transaction owns each materialization/capacity/role change and its audit. All creation, invitation acceptance, member removal and transfer paths update any counters consistently. No public mutation may accept an unchecked principal or owner supplied by the client. Paginated operator views use safe projections, never dump database documents containing credential hashes or private identity mappings.

Issuance reads the session and the relevant environment/account/membership state; profile reads occur for `/me`, not every product request. Accept several indexed reads per active renewal. Do not promise one read regardless of account checks, add a synchronized permission projection prematurely, or perform joins per analytics/product call.

### 7. Account lifecycle

- The first-signup provisioning marker makes automatic creation exactly-once. Losing all memberships later returns onboarding-required, not a fresh free account on every sign-in.
- A user can explicitly create an account only when enabled and below both caps. Managed operator creation assigns a known local user as Owner and obeys the same invariants. No operator bypass is silently enabled.
- Exactly one Owner remains. Owner may manage Admins when enabled; Admin may invite/manage ordinary Members only. Neither Admin nor Member can mutate the Owner, peer Admins, settings reserved to operators or ownership. A sole Owner cannot leave/be removed; transfer first. General account deletion is not added in this slice.
- Invitations are independent of account creation. Implement single-use, revocable, recipient-bound links; the first implementation issues Member invitations. Joining requires the link, a matching verified recipient email and an authenticated environment-local user, not an email-only lookup/merge. Do not strip email `+` tags or dots to manufacture identity equality.
- A pending invite reserves a standard seat. Default expiry is seven days (an implementation constant); revocation/expiry releases it; acceptance converts reservation to membership atomically and checks recipient capacity. A duplicate active invite must not reserve twice. Reissuing replaces/revokes the earlier secret without exposing stored hashes. Cleanup lag cannot incorrectly keep expired reservations consuming capacity; resolve expiry in the capacity transaction as needed with bounded work.
- Reject invitations when disabled, exhausted or unauthorized, including acceptance if policy no longer permits it. Do not remove an existing member or create an account automatically to make an invite work. The SDK returns actionable capacity/policy errors.
- No email transport is added. The SDK returns an authorized invitation link once for a Business to present/share; integration tests consume it without generic logs. Email/customer-support delivery is later scope.

### 8. Ownership transfer assurance

Transfer is implemented now, disabled by default. Require the current Owner, an existing active target member in the same account/environment, available target ownership capacity, explicit confirmation, and a new provider ceremony for the same private principal. Admin cannot transfer.

Reuse transaction/PKCE/callback mechanics with `purpose: ownership_transfer`, fresh provider nonce and session/account/target binding. Disable automatic One Tap completion for this ceremony. BFF issues a proof valid for at most five minutes; the server SDK consumes it for the already confirmed target. It is not a new session, general elevation token or replacement cookie. Recheck all invariants in the final atomic mutation, consume the proof and write the lifetime audit. Old Owner becomes Admin if enabled, otherwise Member. Retries may read the recorded result but cannot repeat the transfer.

**Provider limitation, made explicit for review:** this means fresh, user-initiated provider confirmation, not a guarantee that Google asks for a password or MFA again. A new `iat` or nonce is not a recent Google `auth_time`. Do not document it as protection against someone controlling both the unlocked browser and its Google session. If stronger credential re-entry is required, this accepted GIS-only mechanism is insufficient and that requirement must return to discussion before enabling transfer; do not silently add passwords/passkeys or fake `prompt=login` support.

Development automation can exercise the same proof as the current Owner, including login-as, but wrong-person, wrong-account, target-change, expired and replay cases must fail. Production has no automation trust path.

### 9. Browser/React and native Convex integration

Expose one TypeScript SDK package with hard `core`, `browser`, `react`, `server` and `adapters/convex` subpath exports; optionally retain a concise `convex` export alias if package ergonomics justify it, but keep one canonical adapter implementation. Do not let a browser import pull in server cookies/crypto, private configuration or BFF generated code. Only the actual Convex adapter is shipped now; no speculative Express, Next, generic Node, React Native or other-language adapter is presented as supported.

The TypeScript `server` module uses Web-standard `Request`, `Response`, `fetch` and Web Crypto primitives wherever the runtime supports them. Convex's adapter mounts those primitives into HTTP actions and supplies native auth guards. A later Node.js adapter should be thin runtime/framework glue around the same server core rather than a second auth protocol. Native/mobile and non-TypeScript SDKs share only the documented wire contracts and generated-neutral conformance fixtures; they must choose their platform's secure credential storage and browser handoff rather than copying web-cookie behavior.

The browser API owns a discriminated state machine: signed-out, loading, onboarding-required, account-selection-required, authenticated and recoverable-error. Token and selected context are in memory per tab. Non-secret account preference may be stored separately, scoped to environment and user, and always revalidated.

Deduplicate concurrent renewals within a tab; separate tabs can renew simultaneously against the same stable handle. Account selection increments a context generation: abandon old requests/responses and clear/recreate account-scoped Convex client caches so Account A data is not rendered under Account B. Broadcast logout/session replacement, not account selection. A delayed response after logout must not restore local authentication.

Use `ConvexProviderWithAuth` with a stable hook and `fetchAccessToken({ forceRefreshToken })`; forced requests obtain a fresh token via the Business adapter. Convex can renew authentication for active subscriptions; do not bolt on a ten-minute polling loop or promise that an active reactive connection is “idle.” Define activity as authenticated use/renewal and keep the absolute session cap authoritative.

Example `auth.config.ts` accepts only the lane's BFF issuer, public JWKS, ES256 and that exact environment audience. Native query/mutation/action guards read verified `ctx.auth.getUserIdentity()` and validate the versioned account context. HTTP guards use JOSE verification. No outbound JWKS fetch in deterministic queries/mutations. Export default-deny wrappers for authenticated account functions; public health/onboarding operations must be deliberately separate. These wrappers must still scope Business data queries by trusted IDs.

Keep the central BFF native operator provider configuration separate. Dynamic customer environments use the public HTTP contract and manual JOSE verification in BFF HTTP actions rather than adding every Business audience to the operator `auth.config.ts`.

### 10. Development provider and safe evidence

Reuse the existing automation approach, not the operator identity/audience. A protected local customer signer issues 120-second single-use grants bound to deployment, environment, transaction, operation and selected persona/user. Development holds public verification material only. Grant types:

- `signup`: deterministic dev-provider subject, safe test display name and reserved test email; repeated subject reuses a local user, different subjects create different users.
- `login_as`: exact existing public local user ID in an explicitly automation-enabled development environment, including Andrew's development user. Never attach a dummy identity to Google, rewrite its profile or pretend automation refreshed its real-provider authentication time.
- Transfer confirmation: same current user/transaction constraint, not an arbitrary user selected after the target was confirmed.

Sessions are ordinary sessions, as requested; no special impersonation-session tag. Separate development audit provenance is permitted and must contain no raw grant. Production has neither a routed dummy completion handler nor accepted verification configuration or browser entry. A public user ID alone is never a login grant.

Keep signing material in an ignored mode-0600 local file, never a browser bundle, repository file, command argument log or committed fixture. Hosted Playwright receives short grants in memory. No trace/video/screenshots/storage-state artifacts containing live authentication. Local fixtures may use synthetic non-secret keys clearly isolated from real deployments.

### 11. Security telemetry, retention and failure behavior

- Profile: verified email, display name, optional HTTPS picture; provider issuer/subject stays private. Refresh at genuine provider sign-in, not every renewal. Optional images render safely without arbitrary server-side URL fetching.
- Session snapshot: browser/OS family, coarse device category, optional country and environment-keyed network correlation if a trusted source exists. BFF server-to-server renewal sees the Business server's address; never mislabel that as the user's location. Untrusted forwarded headers/hints are not fraud proof. Unknown is an acceptable value; no new geolocation vendor or precise location permission.
- Update last-seen during issuance/renewal; ordinary token-authenticated requests produce no session write. Record sparse meaningful transitions, security-sensitive changes and sanitized reason codes; do not store an event for every rejected attack request or every identical renewal.
- Use application rate limits before expensive provider verification and expensive state writes. Limiters also consume database resources: finite environment/operation buckets first; authenticated user/session buckets only after validation; no unbounded keys from random attacker input. A rejected auth operation must not roll back its earlier limiter debit. Return `429` with bounded retry advice.
- Cleanup in indexed bounded batches: consumed/expired transactions and transfer proofs within 24 hours; expired/revoked sessions and ordinary security evidence within 90 days; transfer audit for the account lifetime. Keep enough consumed-code/grant evidence until replay validity ends.
- Retryable provider/JWKS/BFF outages fail closed without destroying the durable cookie. Definitive expired/revoked sessions clear it. Expired short tokens never authorize offline server operations. Logout revokes centrally and clears the cookie; if central revocation is unavailable, report that fact and do not claim a successful server logout.

## Implementation Phases

1. **Contracts and persistence**: public schema, projects/boundaries, environment settings, transactional identities/accounts and crypto.
2. **Protocol and authorization**: bound login, durable sessions, one-token issuance, account lifecycle, transfer and bounded security operations.
3. **Consumer integration**: server/browser/React/Convex SDK, shared sign-in site, development provider and minimal example.
4. **Proof and delivery**: operator surfaces, scenario tests, full local gate, hosted dev, production release and real Safari evidence. No early Safari spike blocks phases 1–3.

## Step-by-Step Tasks

Each task below is independently reviewable. New commands/targets are explicitly labelled **new** and must be introduced before use. Reuse fixtures, but do not make separate scenarios depend on previous tests' side effects.

### Task 1: ADD public auth/account contracts

- **Target**: `platform/bff/libs/contracts/src/{auth,accounts,accountPolicy}.ts`, exports and adjacent tests.
- **Implement**: Policy schemas/defaults, versioned onboarding/account context, public views, operation DTOs, safe error envelopes and pure fixed-role permission matrix. Define exact route vocabulary from this plan before handlers diverge.
- **Pattern**: `platform/bff/libs/contracts/src/health.ts:5`; current library targets in `platform/bff/libs/contracts/project.json`.
- **Dependencies/Imports**: Zod; no Convex generated code or deployment secrets.
- **Gotchas**: Owners count toward both caps and seats; onboarding cannot accidentally satisfy an account guard; reject malformed/mixed-version claims rather than coercing them.
- **Validate**: `pnpm exec nx run bff-contracts:test` and `pnpm exec nx run bff-contracts:typecheck`; exhaustive four-creation-switch/role tables and numeric boundaries.

### Task 2: CREATE SDK/example project boundaries and build plumbing

- **Target**: `platform/bff/libs/sdk/typescript/`; `projects/example/backend` and web project shells; root workspace/TypeScript/Nx/ESLint/package configuration.
- **Implement**: Create the single TypeScript SDK with `core`, `browser`, `react`, `server` and `adapters/convex` boundaries, public subpath exports and scope tags; separate example Convex root/generated namespace; real `test`, `typecheck`, `lint`, `build` targets. Include `projects/**` in workspace and formatting discovery. Establish environment-sensitive build inputs and separate development/production output directories. Document sibling technology SDKs as the future extension point without scaffolding empty Swift/Kotlin/Go/Rust projects.
- **Pattern**: Existing contracts project/package; `eslint.config.mjs:30`; root `convex.json` and `nx.json`.
- **Dependencies/Imports**: Task 1; existing tool versions; runtime JOSE declaration. Keep Convex/React as explicit compatible SDK peers where appropriate.
- **Gotchas**: Do not loosen Business→BFF boundaries or run example codegen from the root BFF directory. No empty service scaffolds outside the actual SDK/example callers.
- **Validate**: `pnpm boundaries:check`; **new** `pnpm exec nx run bff-sdk-typescript:typecheck`, `pnpm exec nx run example-backend:typecheck`; fixture imports must fail for a Business importing `@bff/service-api`, server code through the browser entry or Convex adapter internals through a portable core entry.

### Task 3: UPDATE environment configuration and operator validation

- **Target**: BFF environment schema/functions, policy helpers, contracts views and `tools/bff-operator` parsing/tests.
- **Implement**: Optional versioned customer configuration, explicit Google/provider registration, `webOrigins`, `sessionAdapterBaseUrl`, derived fixed callback, `defaultPostLoginPath`, session/account defaults, inspected effective settings and validation-only/preflight CLI output. Leave unconfigured existing rows login-disabled. Implement schema/cross-field validation now; Task 8 adds live-account conflict checks before publishing configuration-edit operations for populated environments.
- **Pattern**: `platform/bff/service/convex/businessEnvironments.ts:19`, `platform/bff/service/convex/lib/businessEnvironmentView.ts:5`, `tools/bff-operator/src/cli.ts:88`.
- **Dependencies/Imports**: Tasks 1–2. Apply additive schema before backfill; no wholesale registry rewrite.
- **Gotchas**: Shared reviewed customer client ID belongs in static config once obtained; per-lane URLs/keys remain external. CLI must never log secret request payloads.
- **Validate**: `pnpm exec nx run bff-operator:test`, `pnpm exec nx run bff-service:test-integration`; existing environment tests remain green; tests cover exact URL/origin matching, deterministic callback derivation, forbidden path/query/fragment/wildcard forms, relative return paths, missing config, invalid combinations and isolation.

### Task 4: CREATE transactional identity and account bootstrap

- **Target**: `customerAuth.ts`, `accounts.ts`, `memberships.ts` and their schema/tests.
- **Implement**: Principal/identity/local-user get-or-create, profile projection, exactly-once automatic account/Owner membership and indexed membership enumeration. Implement all four creation policies and no-membership state without a temporary account.
- **Pattern**: `platform/bff/service/convex/businessEnvironments.ts:26` transactional mutation and indexed logical key.
- **Dependencies/Imports**: Tasks 1 and 3; random public IDs supplied from the trusted action boundary, collision handling inside the mutation.
- **Gotchas**: Same email is not an identity key; environment users remain distinct. Concurrent logins may create multiple sessions later, not duplicate users/default accounts.
- **Validate**: `pnpm exec nx run bff-service:test-integration`; repeated and parallel bootstrap, empty-membership return, profile update and wrong-environment scenarios. Add live-runtime concurrency proof in Task 21 rather than relying solely on mocked scheduling.

### Task 5: CREATE cryptographic verification and signing boundary

- **Target**: `lib/customerCrypto.ts`, BFF configuration readers, public JWKS route and crypto tests.
- **Implement**: CSPRNG/hash helpers; cached pinned Google verification; lane-specific ES256 signer/JWKS; strict BFF JWT verification; redacted error classification; missing/invalid key configuration fails closed.
- **Pattern**: Existing development-auth JOSE use and `platform/bff/service/convex/auth.config.ts:84` explicit-disable checks, with separate customer keys/audiences.
- **Dependencies/Imports**: Tasks 1–3; JOSE 6.2.12/Web Crypto. No secrets in deterministic database functions.
- **Gotchas**: Verify Google nonce and customer audience; allow only documented issuer forms; never accept `alg:none`, token-supplied JWKS URLs or an operator/dummy key as a production customer signer.
- **Validate**: Backend integration tests with actual signed fixtures for issuer/audience/algorithm/kid/expiry/nonce rejection and JWKS rollover; typecheck under Convex runtime, not only Node.

### Task 6: CREATE bound login transactions and exchange validation

- **Target**: `customerAuth.ts`, `loginTransactions` schema and HTTP handler helpers.
- **Implement**: Start/read/complete lifecycle from design section 4; transaction expiry, exact callback/return-path validation, S256 verifier check and single-use consumption helper. Keep exchange internal until Task 7 composes consumption with session creation in one transaction; do not expose an intermediate consumed-code-without-session API.
- **Pattern**: Convex internal transaction + `platform/bff/service/convex/http.ts:9` Request/Response route registration.
- **Dependencies/Imports**: Tasks 3–5. Task 7 uses the completed validation/consumption helper; this task does not depend on a future session implementation.
- **Gotchas**: Lost exchange response may require restarting login; never replay a consumed code to reveal a durable handle. Invalid/replayed completion must not materialize additional accounts. Codes stay out of mutation logs.
- **Validate**: `pnpm exec nx run bff-service:test-integration`; code/state/nonce/verifier/callback/environment swap matrix, duplicate exchange, expiry and retry/restart behavior.

### Task 7: CREATE durable sessions and single-context token issuance

- **Target**: `sessions.ts`, schema and `/v1/auth/session/*` handlers.
- **Implement**: Stable hashed handle, atomic code-consumption plus new-login session creation, session-bound bootstrap/account choice, authoritative active-membership check, snapshot JWT issuance, idle/absolute expiry and logout/revocation. Safe `/v1/me` profile read proves the same JWT works at BFF.
- **Pattern**: Indexed lookup/mutation pattern; crypto helper from Task 5 and contracts from Task 1.
- **Dependencies/Imports**: Tasks 4–6; account state from BFF, never trusted from the server SDK request.
- **Gotchas**: No `Set-Cookie` rotation on renewal; no two-token cascade. Revocation stops future issuance but does not revoke cached JWTs. A signing delay cannot extend the transaction's expiry window.
- **Validate**: Backend tests for session expiry bounds, same handle/different tab account tokens, no-membership restrictions, invalid handles, concurrent logout/issuance and retryable outages.

### Task 8: ADD explicit account/member lifecycle operations

- **Target**: `accounts.ts`, `memberships.ts`, public account HTTP handlers and mutation tests.
- **Implement**: User create, safe paginated list, Owner/Admin/Member management, non-owner leave/remove, role assignment and invariant-preserving capacity counters. Add live-data conflict checks for policy edits and account overrides; not arbitrary product-provided claims. For multi-page environment preflights, capture an account-policy-state revision that every relevant account/member mutation changes, then atomically apply only if that revision is unchanged; otherwise retry the preflight. Reject incompatible changes rather than partially migrating members.
- **Pattern**: Task 4 bootstrap uses the same helpers; `platform/bff/service/convex/lib/errors.ts:3` for typed conflicts/forbidden results.
- **Dependencies/Imports**: Tasks 1, 3, 4, 7.
- **Gotchas**: Authoritative authorization on every mutation despite a valid token; prevent self-escalation, peer Admin changes, Owner removal and cross-environment IDs. No account-deletion API or subscription restriction states.
- **Validate**: Integration scenarios for ownership-as-membership, create caps, forged role, disabled Admin, user-scoped account lists, concurrent last-capacity creation, stale-token role removal and a policy preflight racing a membership change. Snapshot revision is used for infrequent lifecycle changes, never ordinary token-authenticated traffic.

### Task 9: ADD invitation reservation and acceptance

- **Target**: `invitations.ts`, invitation schema/indexes, API DTOs and SDK-facing operations.
- **Implement**: Authorized Member invitation, one-time link, reserved seat, revoke/reissue/expire/accept transitions, verified recipient plus possession, idempotent acceptance and explicit errors for full user/account capacity.
- **Pattern**: Transactional helpers/counters from Task 8; hashes generated through Task 5.
- **Dependencies/Imports**: Tasks 7–8; seven-day default expiry is a local implementation constant.
- **Gotchas**: Concurrent invites cannot oversubscribe. Invites do not bypass user membership caps or imply account creation. Do not emit raw tokens into CLI stdout/audit fixtures or build an email sender.
- **Validate**: One coherent multi-user integration scenario plus focused replay/wrong-email/wrong-environment/expired/reservation-release/concurrent-accept tests. Pending reservations and member counts agree after every transition.

### Task 10: ADD provider-confirmed ownership transfer

- **Target**: `ownershipTransfers.ts`, proof schema, transfer transaction purpose and handlers.
- **Implement**: Explicit target confirmation, same-principal fresh provider ceremony, five-minute single-use proof, final authoritative capacity/role/session checks, atomic sole-Owner change and permanent audit with idempotent result.
- **Pattern**: Task 6 transaction protocol, Task 8 account helpers, Task 5 provider verification.
- **Dependencies/Imports**: Tasks 5–8; expose server-SDK adapter hooks in Task 13.
- **Gotchas**: Follow section 8's Google assurance limitation; do not equate new token issuance with password/MFA re-entry. Owner/target/account/session changes between start and consume invalidate proof.
- **Validate**: Integration tests for valid transfer, disabled setting, Admin attempt, wrong principal/provider, changed target, revoked session, full target ownership cap, expiry, replay and two simultaneous transfers. Exactly one Owner and one successful transfer audit remain.

### Task 11: ADD bounded security records, rate limits and retention

- **Target**: `securityEvents`, `authCleanup.ts`, `crons.ts`, `convex.config.ts`, component setup and tests.
- **Implement**: Sparse typed events/correlation IDs, meaningful login/logout/transfer evidence, retention indexes and bounded cleanup. Register official rate limiter and apply finite environment/operation limits before Google verification; authenticated limits after identity validation.
- **Pattern**: Bounded indexed access in existing functions; official component initialization/test support for the pinned version.
- **Dependencies/Imports**: Tasks 3–10; `@convex-dev/rate-limiter` reviewed pin. Keep ordinary constants beside owning code.
- **Gotchas**: Limiter debit must survive downstream failure; cleanup races cannot resurrect sessions or free an accepted seat twice. Never log cookies/proofs/JWTs; do not record network/server IP as user telemetry or implement DDoS alerts.
- **Validate**: Frozen-clock expiration/retention tests, batch limits, component integration and rejection-flood checks showing bounded retained data; `pnpm exec nx run bff-service:typecheck`.

### Task 12: ADD complete versioned BFF HTTP route registration

- **Target**: `http.ts`, `lib/customerHttp.ts`, customer route modules and HTTP tests.
- **Implement**: Explicit handlers/OPTIONS registration, safe envelopes/status mapping, fixed CORS audiences, request-size/content-type validation, no-store/no-referrer and redaction. Keep public health and operator APIs unchanged.
- **Pattern**: Existing health registration and `t.fetch` tests; no wildcard health CORS copied into credentialed/customer operations.
- **Dependencies/Imports**: Tasks 5–11.
- **Gotchas**: Server-only exchange/context endpoints receive no browser credential CORS and never read BFF cookies. Host/Origin are routing/CSRF evidence, not proof of identity. No arbitrary URL proxy or generated-function passthrough.
- **Validate**: `pnpm exec nx run bff-service:test-integration`; real signed-token HTTP tests, malformed bodies, unsafe redirects, preflight behavior, cross-environment requests and unchanged operator/health regression tests.

### Task 13: CREATE portable server SDK session routes

- **Target**: `platform/bff/libs/sdk/typescript/src/server/` and `src/adapters/convex/http.ts`.
- **Implement**: Fetch-based BFF client, Request/Response handler factory, login attempt cookies, callback exchange/clean redirect, stable session cookie, CSRF-checked context/logout/transfer routes, deadlines and safe retry policy. Export a Convex `httpAction` mounting adapter with no Business session table.
- **Pattern**: Public contract parsing and BFF HTTP semantics; no existing server-session adapter exists to copy.
- **Dependencies/Imports**: Tasks 1–2, 6–7, 10, 12; Web Crypto/JOSE only in server exports.
- **Gotchas**: Cookie plaintext is protected by HttpOnly/transport, not a magic server store. Server cannot set another domain's cookie. Do not retry a consumed code transparently or delete a valid session on a transient 503. Reject missing Origin/simple POST for cookie APIs.
- **Validate**: **new** `pnpm exec nx run bff-sdk-typescript:test`; synthetic Request/Response tests assert exact cookie attributes, independent attempts, CSRF, expiry, no renewal cookie, clean redirects, logout races and response/body secret filtering.

### Task 14: CREATE browser and React session/account bindings

- **Target**: TypeScript SDK `src/core/`, `src/browser/`, `src/react/`, components and tests.
- **Implement**: State machine, profile/bootstrap, sign-in/out, account selection, memory-only tokens, generation-bound in-flight work, single-flight renewal and minimal accessible sign-in/selector components. Style choices remain small, placement stays with the Business.
- **Pattern**: Existing React auth context/component testing, not its operator identity model.
- **Dependencies/Imports**: Tasks 1–2, 13; no private server imports.
- **Gotchas**: New tabs do not inherit another tab's active-account token. Local preference is not authority. Logout/session change broadcasts clear state; account switches do not change other tabs. Avoid silently signing in again after logout.
- **Validate**: SDK unit/component tests for zero/one/many memberships, stale preference, no-account creation modes, overlapping refresh/switch/logout, retryable errors and no durable browser token storage; production browser-entry bundle assertion.

### Task 15: CREATE native Convex auth integration and guards

- **Target**: TypeScript SDK `src/adapters/convex/`, example backend auth config and native protected functions.
- **Implement**: `ConvexProviderWithAuth` integration honoring `forceRefreshToken`; issuer/audience/JWKS config helper; guarded query/mutation/action/HTTP wrappers yielding typed context; reset account-scoped reactive cache on context changes.
- **Pattern**: Installed Convex 1.46.0 types, existing operator client hook, `ctx.auth.getUserIdentity` guard conventions.
- **Dependencies/Imports**: Tasks 5, 13–14; example owns its `_generated/server` builders supplied to wrappers, not the BFF builders.
- **Gotchas**: Do not verify only decoded JWT payloads in HTTP. Native Convex performs signature verification; wrappers still validate context/schema and account scope. Query/mutation code cannot call remote auth or depend on Node-only libraries.
- **Validate**: SDK type-level consumer fixtures; **new** `pnpm exec nx run example-backend:test-integration`; both authorized and wrong-user/account/environment/onboarding denial cases; live signed-token native authentication in Task 21.

### Task 16: CREATE shared customer-auth web surface

- **Target**: `platform/bff/customer-auth/`.
- **Implement**: Lane-specific public auth page, transaction metadata loading, Google-rendered compliant button, nonce-bound completion and safe destination navigation; transfer confirmation view. Fail closed for invalid/expired transactions. Add headers and separate production/dev entrypoints.
- **Pattern**: `platform/bff/backoffice/src/googleIdentity.tsx:53`, Vite/Nx/Cloudflare static-asset project, existing `_headers` and production bundle assertion.
- **Dependencies/Imports**: Tasks 5–6, 10, 12; reviewed customer client in static config. No Google client secret or Google callback URI.
- **Gotchas**: Never log GIS credentials or expose them to Business apps. Keep Google consent identity/homepage/privacy branding truthful; do not reuse the operator allowlist. Do not promise GIS always presents password entry.
- **Validate**: **new** `pnpm exec nx run bff-customer-auth:test`, `pnpm exec nx run bff-customer-auth:build`, `pnpm exec nx run bff-customer-auth:assert-production-bundle`; synthetic provider callback/nonce/errors and headers tests.

### Task 17: CREATE protected customer development automation

- **Target**: `tools/bff-customer-auth/`, dev-only completion routing, customer-auth development entry and grant replay tests.
- **Implement**: Customer-specific local key generation/permissions, single-use grant creation for deterministic signup and exact dev login-as, normal post-provider flow, current-Owner transfer proofs and separate sanitized provenance event.
- **Pattern**: `platform/bff/backoffice-e2e/src/developmentAuth.ts:144`; preserve operator automation unchanged.
- **Dependencies/Imports**: Tasks 4–7, 10–12, 16; development lane + explicit environment enablement + configured public verifier are all required.
- **Gotchas**: Grant binds transaction, operation, target and lane; no public-ID-only login; no private key in app/server deploy. No special session tag. Production rejects even a correctly signed development grant.
- **Validate**: **new** `pnpm exec nx run bff-customer-auth-tools:test`; grant expiry/replay/misbound-target/production-denial/profile-preservation matrix; production bundle and route registration assertions.

### Task 18: ADD the minimal separate example Business

- **Target**: `projects/example/workloads/web/`, `projects/example/backend/convex/`.
- **Implement**: Wire SDK routes and native JWT provider; display current local user/account/role, signed-out state and conditional account selector. Add a protected native `currentContext` query and protected HTTP context response; call BFF `/v1/me` with the same short token. These are the reference views, not placeholder TableCards CRUD.
- **Pattern**: Existing minimal dashboard presentational separation; only public SDK/contracts and example-generated API imports.
- **Dependencies/Imports**: Tasks 13–17. Development registration allows a test user's second membership; production uses one-account defaults.
- **Gotchas**: No duplicated cookie/auth logic, no direct BFF issuance call from browser, no account-management playground. Ordinary real Google customers can exercise production; `noindex` is not authentication.
- **Validate**: **new** `pnpm exec nx run example-web:test`, `pnpm exec nx run example-web:build`, `pnpm exec nx run example-backend:typecheck`; prove the reference UI works entirely through documented SDK entrypoints.

### Task 19: ADD operator customer views and lifecycle commands

- **Target**: `customerOperations.ts`, `customerBackoffice.ts`, operator CLI/backoffice and guided configuration skill.
- **Implement**: Explicit environment-scoped policy/configure/inspect, managed provisioning, account overrides, session revocation and dev fixture commands; production write confirmation; paginated safe users/accounts/memberships/session/security views. Guide asks product-behavior questions one at a time and previews exact config before invoking CLI.
- **Pattern**: Existing strict CLI/deployment guard and `requireOperator`; safe backoffice projections and React components.
- **Dependencies/Imports**: Tasks 3–11, 17. Read and follow `skill-creator` before authoring the new guide during implementation.
- **Gotchas**: No backoffice mutation forms or arbitrary raw document edits; private identity/credential hashes stay hidden. Development-only fixture tools cannot target production. Override provenance covers only implemented sources, not fictitious subscriptions.
- **Validate**: Operator unit/component and backend tests; a customer/dummy identity cannot call operator queries; CLI preview vs apply, wrong-deployment and production-confirmation tests; run the guide against one single-account and one create-or-join scenario.

### Task 20: ADD the layered acceptance matrix and local browser harness

- **Target**: Customer E2E project, reusable backend fixtures, root scripts and CI validation job.
- **Implement**: Decision-table tests, several isolated coherent Convex scenarios and a small browser contract suite. Add cross-site HTTPS test fixtures where needed; local fake Google/provider signing only in test harness, never a deployable provider route. Extend root gates to new projects, Chromium and WebKit.
- **Pattern**: Existing Vitest/convex-test setup and `platform/bff/backoffice-e2e/playwright.config.ts`; preserve existing operator E2E.
- **Dependencies/Imports**: Tasks 1–19. No network/real-provider secrets in normal PR validation.
- **Gotchas**: Shared setup means reusable fixture functions, not order-dependent shared test state. `.withIdentity` does not prove native signature verification. WebKit is not final Safari evidence.
- **Validate**: **new** `pnpm exec nx run bff-customer-auth-e2e:e2e`; root `pnpm check` must now include both backend integration projects, both browser suites and all production bundle checks, not merely the original BFF project.

### Task 21: ADD complete hosted development verification

- **Target**: Dev provider configuration, actual dev BFF/example deployments, hosted auth/example assets and uncached hosted suite.
- **Implement**: Provision reviewed dev resources, register exact targets, deploy full feature, seed bounded deterministic scenarios and run the real adapter end-to-end. Exercise simultaneous code exchange/login, same cookie in two tabs, separate accounts, token expiry, logout, and live native Convex verification.
- **Pattern**: Existing explicit hosted-development tooling and artifact-suppressed Playwright setup.
- **Dependencies/Imports**: Tasks 16–20; customer public client ID and dev project/hosting access must be resolved. Use correct CLI working directories; no key reads into logs.
- **Gotchas**: Full development implementation precedes Safari fallback decisions. Distinguish expected browser cookie rejection from broken CORS/token verification. Do not lower production JWT TTL to accelerate tests.
- **Validate**: **new** `pnpm exec nx run bff-customer-auth-e2e:e2e-hosted-development` (`cache: false`); hosted Chromium/WebKit results, genuine parallel runtime transactions and successful existing operator hosted test. Record environment/commit/results without credentials.

### Task 22: UPDATE multi-surface production delivery and runbook

- **Target**: Production-delivery tools/config/tests, CI deploy job, customer-auth/example manifests/headers, new ADR/runbook and nearest READMEs.
- **Implement**: Strict independent BFF/example deployment credentials and targets; preflight all builds/bundles/config before release. Publish BFF/JWKS before enabling example custom JWT trust; deploy example backend and auth/example assets with correctly injected URLs; extend smoke to every surface/build SHA, protected unauthenticated denial, no dummy routes/entries and old operator behavior. Add key rollover/revocation, deployment topology and troubleshooting procedures.
- **Pattern**: `tools/production-delivery/src/config.ts:77`, current `production:build`/`production:smoke`, `.github/workflows/ci.yml:30` and ADR 0003.
- **Dependencies/Imports**: Tasks 18–21. Add separate example deploy key without overwriting BFF's `CONVEX_DEPLOY_KEY`; child-process environment and working directory isolate each command.
- **Gotchas**: No cached dev bundle released as production; no source maps/live auth artifacts with credentials; fail closed when customer config absent. Schema rollout is additive. Fix forward on partial release; do not destroy new data or automatically roll back into incompatible auth behavior.
- **Validate**: Production-delivery unit tests with target mismatch/secret-scope/bundle-leak cases; static asset dry runs and supported Convex deployment rehearsal; `pnpm check`. No production mutation before reviewed execution authority.

### Task 23: UPDATE production deployment and acceptance evidence

- **Target**: Intended production BFF/auth/example release, acceptance evidence, plan/source lifecycle and `STATUS.md`.
- **Implement**: Under the existing reviewed release workflow, deploy the prepared commit and run expanded `pnpm production:smoke`. Andrew performs the real Google/Safari lifecycle below and verifies corresponding operator records. If actual Safari fails on generated-domain cookies, apply the agreed approved custom-domain fallback, revalidate all targets/cookies and repeat the complete gate.
- **Pattern**: Existing production plan/runbook and repository completion rule; no “dev complete” substitution.
- **Dependencies/Imports**: Tasks 1–22; actual Google client configuration, production deploy/hosting resources and Andrew's final browser participation.
- **Gotchas**: Production never uses the dummy provider to fake acceptance. A domain switch creates a new host-only cookie and requires a new login; do not assume old cookies migrate. Production is not complete while Safari is failing or awaiting human evidence.
- **Validate**: Passing CI/deploy/smoke SHA; real login, context, reload, >10-minute renewal, second tab, logout and read-only backoffice evidence; existing production operator flow still passes. Then mark retained plan Completed/date, source Accepted/handoff, ADR accepted as reviewed, and update the concise live status.

## Testing Strategy

### Unit decision tables

- All four creation-switch combinations; default/min/max/invalid session values; both account caps; default/override precedence; fixed role permissions and invitation/transfer flags.
- Exact issuer/audience/context schemas; malformed token headers/claims; future/expired tokens; signature/key rollover; unsupported role/context/version; safe error mapper.
- URL/cookie/CORS/CSRF/return-path normalization, key configuration, CLI deployment intent and production-bundle checks.
- SDK state machine, single-flight renew, forced refresh, account-change cancellation, local generation checks and logout broadcasts. No broad Cartesian product of every numeric value.

### Stateful Convex scenarios

1. **Signup/session**: repeated and simultaneous provider login, one local user/default account, separate valid sessions, code replay rejection, renewal, idle/absolute expiry and revoke.
2. **Onboarding/policy**: all creation modes, create-or-join, membership/owned-account caps, no auto reprovision after membership loss, managed provisioning and incompatible configuration rejection.
3. **Team lifecycle**: owner/admin/member matrix, reservations/invites, duplicate/revoked/expired links, member capacity, cross-account IDs and authoritative mutation authorization after a role change.
4. **Transfer**: provider-confirmed same Owner, target caps, single-use proof, concurrent changes, old/new Owner roles and durable audit.
5. **Operations/safety**: operator-only projections, bounded lists/cleanup/rate limits, dev signup/login-as/replay, existing profile preservation and production dummy rejection.

Each scenario starts from a fresh fixture. Test normal effects and unchanged state after rejected operations. Use actual JOSE signatures for HTTP/provider/SDK crypto tests. Use mocked identities only for database authorization tests. True simultaneous OCC and native Convex `auth.config.ts` behavior also need the deployed/local-runtime checks in Task 21.

### Browser contract suite

- Server-only callback and clean redirect; no secrets in URL/storage/artifacts; exact expected host-only cookie.
- Reload obtains a fresh tab token without Google; real server cookie remains stable across renewals.
- Two tabs share the signed-in person but use independent account tokens; switching one neither changes the other nor renders cached data under the wrong account.
- Login in a second browser context is a separate session. Login-as another dev user does not mutate Google identity/profile or silently reuse the first user's cached context.
- CSRF/wrong Origin and substituted/replayed transaction values fail; product APIs reject onboarding and wrong-environment tokens.
- Logout clears both tabs' local SDK state and stops new issuance. A retained test copy of an already-issued JWT may work only until its documented expiry; do not assert impossible immediate stateless revocation.
- Repeated/pending requests, offline/retryable failures and slow responses do not rotate cookies or resurrect logged-out UI state.

### Real production review

Andrew uses production Safari for Google login → protected example view → hard reload → continue after the first ten-minute JWT expires → second tab → logout → verify neither tab can mint another token. Verify matching production environment-local user/account/session state in backoffice. Record browser/device/version, deployment SHA and outcomes, not tokens or personal screenshots. Run automated Chrome checks where feasible; Playwright WebKit alone does not close Safari acceptance.

## Validation Commands

Run repository commands from `/root/projects/bff` using Node.js 24. These already exist:

```bash
pnpm format:check
pnpm lint
pnpm boundaries:check
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
pnpm bundle:assert
pnpm secrets:scan
pnpm test:e2e
pnpm check
```

Their scope must be expanded in Tasks 2/20/22 to include new projects; passing today's unchanged scripts is not sufficient evidence. Existing `pnpm test:e2e:development-auth` remains an operator regression gate when hosted verification is authorized.

New commands/targets to introduce, not commands that exist at planning time:

```bash
pnpm exec nx run bff-sdk-typescript:test
pnpm exec nx run bff-customer-auth:test
pnpm exec nx run bff-customer-auth:assert-production-bundle
pnpm exec nx run example-backend:test-integration
pnpm exec nx run example-web:test
pnpm exec nx run bff-customer-auth-tools:test
pnpm exec nx run bff-customer-auth-e2e:e2e
pnpm exec nx run bff-customer-auth-e2e:e2e-hosted-development
```

The hosted target and deployment/smoke targets are uncached and require explicit environment configuration. Extend, do not bypass, the existing `pnpm production:build` and `pnpm production:smoke`. Document the exact new operational CLI syntax in tested `--help` and the runbook as Task 19 lands; do not leave copied placeholder deployment names in runnable commands.

## Acceptance Criteria

- [ ] A real Google customer signs into the production example through the shared customer-auth origin; the operator audience remains separate.
- [ ] One BFF-owned stable session handle and one BFF-signed short context JWT implement the flow; no second token tier, central browser cookie or Business session database.
- [ ] All four creation-policy combinations, caps, default overrides, roles, invitation reservations and protected transfer have positive/negative/concurrency evidence.
- [ ] No-account users can complete permitted onboarding but cannot call normal product functions. Environment/account/user isolation is enforced server-side.
- [ ] The same token works through the separate example's native Convex guard/HTTP guard and a permitted BFF endpoint; caller-supplied account IDs cannot override its context.
- [ ] SDK consumers do not handle Google tokens, session handles, PKCE or callback codes. Browser exports contain no server/private implementation.
- [ ] Business registration validates exact web origins, one canonical adapter base URL and a relative default destination; callback URL is deterministically derived from the fixed SDK path rather than configured twice.
- [ ] The implemented SDK is explicitly the TypeScript SDK with a Convex adapter. Folder/package boundaries permit later Node.js glue or sibling Swift/Kotlin/Go/Rust SDKs without claiming those unimplemented runtimes are supported.
- [ ] Two tabs can use different accounts with no refresh-cookie race or stale-context UI leak; logout stops issuance and the documented token-expiry window is tested honestly.
- [ ] Dev tooling supports deterministic signup and exact existing-user login-as; production ships no usable dummy route/trust/browser entry.
- [ ] Customer policy/lifecycle operations have validated CLI paths; backoffice is read-only, paginated and safe; guided configuration explains interacting defaults.
- [ ] Coarse evidence/retention is bounded; no raw credentials/permanent raw IPs, DDoS log flood, billing tables, restriction state machine or support implementation is introduced.
- [ ] All local gates, complete hosted-development flow and production deploy/smoke pass without regressing operator auth.
- [ ] Real production Safari lifecycle and backoffice confirmation pass, using the approved custom-domain fallback if necessary. Only then mark Build 2 complete.

## Risks, Prerequisites and Open Questions

### Required setup, not new product decisions

1. Recover/confirm the already-created customer Google public client ID and its exact two authorized origins. Inspect consent/public branding requirements without creating or printing a client secret.
2. Provision the separate example Convex deployment pair, auth/example hosting targets, public URLs and independently scoped deploy keys. Record non-secret target identifiers in the proper configuration; never invent existing slugs.
3. Provision separate BFF signing keys and dev customer automation verification configuration. Exercise key rollover and production explicit-disabled behavior before release.
4. Select Node.js 24 for execution. No current-shell test result was claimed during planning.
5. Arrange Andrew's final Google/Safari review. A paid custom-domain fallback needs cost approval when actually required, not a preemptive purchase.

### Principal risks and mitigations

- **Custom authentication surface**: small explicit protocol, pinned verification, no generic proxies, negative tests and reviewed release. Existing operator auth is not repurposed.
- **Google confirmation assurance**: section 8 states exactly what the provider can prove. This plan cannot promise fresh password/MFA; requiring that stronger guarantee would reopen only the transfer mechanism.
- **Third-party cookies**: full implementation proceeds now; actual Safari failure triggers the accepted custom-domain route. Do not let anticipated failure stall unrelated work or pretend a passing localhost test resolves it.
- **Snapshot permissions**: up to ten minutes of old ordinary access is accepted; high-risk BFF mutations read current state. Keys, sessions and claims cannot cross lanes/environments.
- **Concurrent state**: stable cookies solve handle rotation only. Transactional capacity/ownership checks, single-use exchanges/proofs and browser response-generation guards address the other independent races.
- **Configuration/data tightening**: policy edits cannot silently remove users or invent a paid restriction flow. Validate existing state and concurrent modifications, report an actionable conflict and retain prior effective configuration on failure.
- **Deployment expansion**: separate working directories, deploy keys, per-surface cache inputs and full release preflight prevent publishing BFF URLs/keys or development assets into the example production target.
- **Cost/observability amplification**: rate-limit expensive paths with finite buckets, sparse events, retention batches and no rejected-request event stream.

No further product-mode decision is needed to start the listed implementation sequence. Resource values and production evidence remain unresolved prerequisites, not claims of readiness. The Google assurance limitation is a visible review condition, not an unnoticed replacement for stronger reauthentication.

## Notes and Handoff

- Planning used the Convex guidance to keep database invariants in mutations, outbound crypto/network work at action boundaries and the real native-client integration in the acceptance path.
- This is one logical feature with dependency-ordered increments, not an invitation to write every file before running tests. Run the narrow validation after each task and the full gate at integration/release checkpoints.
- No new brainstorm is required to execute an accepted plan. If a genuinely consequential requirement changes, discuss that change explicitly rather than silently widening the build.
- Do not update the implementation status to Completed merely because code is ready or the browser review is scheduled. Keep the exact outstanding production gate in `STATUS.md` during execution.
- **One-pass implementation confidence: 8/10.** Repository patterns, protocol and scope are specified; the deduction is for new multi-deployment setup, provider confirmation limits and real Safari behavior that cannot be proven by a written plan.

## Document History

| Date | Status | Change |
| --- | --- | --- |
| 2026-09-26 | Draft — Awaiting review | Created from the settled Build 2 discussion and explicit planning request; pinned repository/provider evidence, single-token protocol, account operations, layered tests and production completion. No implementation or provider mutations performed. |
| 2026-09-26 | Draft — Awaiting review | Added explicit Business web/session-adapter/default-return URL registration with a derived fixed callback, and made SDK organization technology-first: one TypeScript package with the current Convex adapter and clear future sibling-language boundaries. |
| 2026-09-26 | Accepted — Implementation authorized | Andrew approved the plan, requested commit/push and authorized implementation with hosted-development validation; production delivery remains subject to the existing reviewed release controls. |
