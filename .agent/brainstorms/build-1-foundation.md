# Brainstorm: Build 1 Foundation

> **Status**: Accepted — Ready for planning
> **Started**: 2026-09-25
> **Last updated**: 2026-09-25
> **Repository baseline**: `73608e446538` (`docs: finalize TableCards MVP direction`, 2026-09-24)

## Context Snapshot

- When this exploration began, the repository contained product, delivery and architecture documentation but no application workspace or runtime code.
- `STATUS.md` was updated 2026-09-24 and named an implementation-ready Build 1 Foundation plan as the next Codex deliverable after two remaining TableCards product choices.
- The accepted stack was Nx, pnpm and TypeScript with a Convex BFF, technology-neutral public contracts, GitHub Actions, and later React/Vite/Tailwind, Cloudflare, Better Auth/Google and Paddle capabilities.
- The delivery plan described Build 1 as workspace, ownership boundaries, a minimal Convex BFF/project registry, contracts, deterministic tests, Playwright infrastructure and baseline CI.
- ADR 0001 expected a persisted `projects` collection for the first registry slice. Whether a runtime table was justified before any project workflow existed became an explicit question in this brainstorm.
- Canonical sources consulted at the baseline were `STATUS.md`, `docs/products/tablecards-mvp.md`, `docs/factory/mvp-delivery-plan.md`, `docs/architecture/adr/0001-convex-first-bff-stack.md`, `docs/architecture/bff-mvp-architecture.md` and `docs/operations/provider-accounts-and-secrets.md`.
- This snapshot records what was known at the start; `STATUS.md` remains the source for the current handoff.

## The Idea

Explore the smallest foundation that makes the accepted Business Factory architecture real without building speculative platform surface. Build 1 needs to establish the Nx/pnpm/TypeScript workspace, ownership boundaries, a minimal Convex BFF service, a real Business-environment registry path, public contracts, deterministic validation, a protected read-only operator dashboard and baseline CI. It should leave Business-user authentication, support, TableCards product behavior, billing and team workflows to the builds that have actual callers for them.

This is an architecture-shape discussion, not an implementation plan. The stack and product direction were already accepted; this brainstorm resolved how much executable vertical proof belongs in Foundation.

## Codebase Context

### What We Have

- A documentation-only repository; no runtime workspace, packages or application code exists yet.
- An accepted stack: Nx, pnpm and TypeScript; Convex for the BFF runtime/database; React/Vite/Tailwind for the Build 1 backoffice; Cloudflare for static hosting; GitHub Actions for CI.
- An accepted ownership model under `platform/bff/` and `projects/<project-id>/`.
- A technology-neutral public BFF boundary. Business Projects must use public contracts/API rather than Convex-generated internals.
- A Build 1 acceptance boundary: the repository runs locally, the BFF health/Business-environment path works, the authenticated backoffice is hosted and usable from a phone, validation commands are documented, and no speculative domain tables or placeholder SDK modules exist.
- A deliberately incremental data model. ADR 0001 already expected a persisted `projects` registry; the discussion has refined that concept into operator-created `businessEnvironments`, where each row is one isolated environment of a Business.
- TableCards as the accepted first real Business, while Build 1 may use dummy Business-environment rows without creating any TableCards code.

### Constraints

- Build 1 must not create empty auth, billing, analytics or SDK packages merely to resemble the long-term architecture diagram.
- Public request/response contracts cannot import Convex-generated types or expose database document shapes.
- Build 1 authentication is deliberately narrow: direct Google OIDC protects the operator dashboard, while Business-user authentication remains deferred to Build 2. Public health exposes no sensitive state, Business-environment mutations remain internal operator capabilities and the protected dashboard is the only Build 1 browser reader of registry data.
- The project manifest concept is intentionally lightweight and not yet a general configuration framework.
- The browser regression policy calls for a small Playwright suite. The hosted Build 1 backoffice now supplies the first real browser flow; broader Business-product flows remain deferred.
- Nx boundaries should encode real ownership rules without generating every possible workload or library in advance.
- Development and CI must be deterministic and must not require live Google, Paddle or other hosted-provider access.

### Opportunities

- A tiny vertical capability can prove the most important boundary early: a technology-neutral health contract reaches the Convex BFF, operator mutations remain internal and an authenticated dashboard reads the resulting Business-environment state without receiving deployment credentials.
- A protected internal environment command can prove that one dummy Business may have independently addressed development and QA environments without a public self-registration API or any product code in Build 1.
- Contract tests can establish normalized success/error envelopes before Business-user authentication and billing make the API more consequential.
- Nx tags can enforce the core dependency direction from the first commit: products may consume BFF public contracts, but not BFF service internals.
- Playwright can cover the authenticated dashboard's one valuable smoke flow now, while service rules and denial paths remain in faster unit/integration layers.

## Options

### Option A: Minimal Persisted Foundation

**Approach**: Create only the workspace pieces needed for two bounded capabilities: a public BFF health check and an operator-managed `businessEnvironments` table. Put the health response in a technology-neutral public contracts library, expose environment management only through internal Convex functions callable by the authenticated operator CLI, create one dummy Business under distinct development/QA environment keys, and prove both paths with service tests. Establish Nx ownership tags, Playwright configuration and CI without creating TableCards code, public environment CRUD or a placeholder SDK.

**Leverages**: The `/v1` public API discipline, the TableCards product decision and the rule that every method, table and abstraction needs a real caller or workflow.

**Constraints**: A Business environment needs a unique stable public key even when two environments describe the same underlying Business. Build 1 stores only fields used by environment creation and operator verification; auth origins, account policy, billing configuration and service credentials wait for their owning slices. A full SDK, Business manifest and TableCards web workload also wait for an actual caller.

**Effort**: Medium

**Risk**: A persisted environment registry can grow into a generic administration platform. Keep mutation internal, reject self-registration, do not add an unvalidated settings blob and add fields only with a real workflow.

### Option B: Code-Owned Registry — Superseded

**Approach**: Keep registration definitions in BFF source code and require a reviewed BFF deployment whenever Codex adds or changes one.

**Leverages**: TypeScript validation, deterministic source history and no mutable registry data.

**Constraints**: Every new product environment requires changing and redeploying BFF code even though the BFF's runtime behavior may not change.

**Effort**: Low

**Risk**: It contradicts Andrew's requirement that Codex can create another project registration without a BFF code release. This option was explored earlier and was superseded on 2026-09-25.

### Option C: Hosted Read-only Backoffice

**Approach**: Build the foundation plus the first small piece of the real BFF backoffice: a hosted, phone-accessible, read-only dashboard showing system status and Business environments. Protect it with direct Google OIDC plus a fixed operator allowlist, and use it as the initial Playwright smoke flow without adding TableCards code, environment editing or other operator workflows.

**Leverages**: The accepted React/Vite/Tailwind backoffice stack, the real future operator surface, the public health contract and the requirement for browser-test infrastructure.

**Constraints**: Google login alone is insufficient: every protected query must also enforce the server-side operator allowlist. The browser may call only bounded read queries and must never receive a Convex deployment key or a generic internal-function proxy. Environment changes remain CLI-only.

**Effort**: Medium

**Risk**: A small dashboard can expand into speculative navigation, design systems or operator features before real backoffice workflows exist.

### Option D: Platform Skeleton by Final Topology

**Approach**: Generate the complete anticipated `platform/bff` folder tree up front, including backoffice, SDK, auth, billing, analytics and config libraries, with initial build/test targets for every package.

**Leverages**: The long-term architecture document and makes the intended repository layout highly visible from the beginning.

**Constraints**: Most packages would have no real caller, data or behavior in Build 1. The accepted ADR explicitly treats the topology as adjustable and forbids unused capability surface.

**Effort**: High

**Risk**: Placeholder packages harden speculative abstractions, increase CI and dependency maintenance, and contradict the delivery guardrail to add models and APIs only when the active slice uses them.

## Environment Topology Alternatives

### Environment Option A: One Business Environment, Fully Shared Development

**Approach**: Create one `tablecards` Business environment. Any compatible TableCards development or preview website may call it and share its environment-scoped state. An optional client-build label may appear in logs for diagnosis, but it is not trusted for authorization or data isolation.

**Leverages**: Stable Business identity, one BFF development deployment and no additional environment rows or row-scoping fields.

**Constraints**: The BFF cannot treat the websites as independent data environments. Global auth/provider configuration and backend code are shared.

**Effort**: Low

**Risk**: A destructive experiment or incompatible backend change can disturb other development clients.

### Environment Option B: Operator-Managed Business Environments in One BFF

**Approach**: Store each Business environment as a row with a unique stable key. Codex creates it through a protected operator command, while the released Business has no self-registration capability. Scope all Business-owned state directly or through ownership roots so several isolated Business environments coexist in one BFF deployment.

**Leverages**: One cloud BFF can represent many Business environments at runtime. The authenticated Convex CLI can run internal functions, so Build 1 can support operator creation without exposing a public mutation; the protected backoffice reads the same validated state.

**Constraints**: Every authorization and data-access path must preserve the Business-environment boundary. Deployment-wide code, technical identity/provider configuration and rate limits still remain shared.

**Effort**: Medium

**Risk**: One missed scope check can leak or mix data. The schema and authorization helpers must make Business-environment scope mandatory, and negative integration tests must prove cross-environment denial as each scoped capability is introduced.

### Environment Option C: One BFF Deployment per Business Environment

**Approach**: Pair every Business environment with its own complete BFF deployment rather than representing several isolated rows in one deployment.

**Leverages**: Convex's native deployment boundary isolates code, database, functions and environment variables without application-level partitioning.

**Constraints**: Each environment requires deployment selection, configuration, callbacks, credentials and cleanup.

**Effort**: Medium

**Risk**: Operational overhead grows faster than the value for ordinary UI changes and solo development.

### Environment Option D: Code-Registered Installations — Superseded

**Approach**: Let BFF source code register the same underlying product multiple times under unique registration keys. One shared cloud BFF development deployment hosts tested registrations; BFF code/schema experiments use isolated local Convex deployments before promotion, and production remains separate for launch.

**Leverages**: Code-owned deterministic configuration, central identity, one provider callback per BFF environment and per-registration policies/allowed origins without a mutable registry table.

**Constraints**: Every account-owned capability must preserve registration scope, while truly global identity/provider behavior remains shared. Secrets stay in deployment secret stores rather than registration code. Local deployments cannot directly receive public callbacks.

**Effort**: Medium

**Risk**: It requires a BFF code release merely to add another project environment and was superseded by the operator-managed persisted model on 2026-09-25.

## Open Questions

No substantive architecture question remains. Andrew accepted the overall direction on 2026-09-25.

The following are deliberately deferred to the build that first needs them and are not Foundation gaps: the exact Business-user authentication library and token-exchange mechanism, the first concrete environment-settings fields, provider-specific service-secret adapters, and any second-provider account-linking flow.

## Current Direction

The accepted direction combines a refined **Option A: Minimal Persisted Foundation**, **Environment Option B: Operator-Managed Business Environments in One BFF** and **Option C: Hosted Read-only Backoffice**. The earlier code-owned registry and local-only dashboard directions were based on superseded assumptions. All substantive questions raised in this brainstorm are resolved.

The candidate Build 1 thin slice is a public health check plus one real `businessEnvironments` table. Environment creation is operator-controlled but data-backed: when Andrew asks Codex to add a Business environment, Codex invokes a protected internal BFF operation against the selected deployment. The released Business never registers itself, and adding a row does not require redeploying BFF code. One dummy Business may be created under two unique environment keys to prove addressing and independent label updates without creating any TableCards code. Build 1 cannot yet prove cross-environment isolation of user or product data because those capabilities do not exist.

Build 1 uses a repository-owned local operator CLI tool for Business-environment management. The tool runs from Codex's machine using the authenticated Convex CLI session, or a narrowly scoped deployment credential where non-interactive access is later authorized, and calls internal typed Convex operations. It is not a public HTTP/product API and it does not bypass domain validation with raw table imports or direct edits. This keeps unique-key and validation invariants in one reusable BFF operation; a future human mutation workflow could call the same domain logic through a separately protected adapter. The stable environment key is immutable; Business and environment display names are editable; and the tool supports create, inspect and update. Build 1 has no lifecycle status, disable/reactivate commands or deletion operation. Add lifecycle behavior only when a concrete workflow defines what it must enforce.

Build 1 therefore has one BFF domain table rather than zero. Convex supplies `_id` and `_creationTime`; `businessEnvironments` adds immutable `key`, editable `businessName` and `environmentName`, and server-maintained `updatedAt`, with a `by_key` lookup index and transactional duplicate rejection. Direct Google OIDC for the fixed operator allowlist adds no BFF auth, user, operator, account or membership table. It still has no TableCards application, Business workspace, manifest, public SDK, product-user flow, service credentials, billing or analytics. Environment settings remain absent; origins, onboarding, account policy, billing configuration and service permissions appear only when their owning capability is implemented.

When a real environment setting first appears after Build 1, it is stored in an optional `settings` field as a native Convex object rather than a serialized JSON string. The object has a schema version and a version-specific application validator at every write boundary, so adding an ordinary setting does not require a new table column. It contains no secrets. Build 1 adds neither the empty field nor a settings index. Convex can later index a known nested path using dot notation when the structured schema exposes that path, but the index must be explicitly declared in the Convex schema and is added only for a real cross-environment query. A setting that needs independent querying, history, ownership or lifecycle is promoted to an explicit field or table instead of remaining buried in the object.

Build 1 includes the first real hosted backoffice dashboard rather than only a health page. It is intentionally usable from a phone and shows BFF health, current BFF deployment/service version and a read-only Business-environment list with stable key, Business name, environment name and timestamps. Environment mutations remain CLI-only; no create/edit/delete controls appear in the page. Google is the only enabled backoffice login method. The browser obtains a short-lived Google OIDC ID token for the configured Google client; Convex centrally verifies its signature, issuer, audience and expiry; and every protected dashboard read calls one shared operator guard that matches the verified `(issuer, subject)` against a fixed server-side deployment allowlist of at most a few operators. Signing in with an arbitrary Google account grants no access. The browser auth adapter must obtain a fresh token or require reauthentication when needed, and expired or wrong-audience tokens fail closed. The browser receives neither Convex deployment credentials nor a generic internal-function proxy, and the allowlist uses Google's stable subject rather than email as the permanent identifier. One deterministic Playwright smoke flow uses a test auth adapter or isolated test issuer, while real Google wiring is a separate hosted smoke check rather than an ordinary CI dependency. Shared development and production never accept a skip-auth header, unsigned token or test-only issuer. Later user-facing Businesses receive stronger happy-path regression coverage, while the operator dashboard remains deliberately small and relies on thorough BFF authorization/data-integrity tests.

Operator bootstrap is also fail-closed. The Google client ID is non-secret browser configuration, while the authorized operator `(issuer, subject)` values live only in the selected deployment's server-side configuration and never in browser authorization logic or repository data. Before the first operator is configured, protected dashboard reads deny everyone. Adding or removing one of the few operators is an authenticated CLI/deployment-configuration action; the implementation plan must define a one-time way to obtain Andrew's verified subject after Google sign-in without weakening the guard.

This establishes a broader backoffice rule: when the BFF adds a core entity or capability, its essential state becomes visible in the operator dashboard in the same owning slice. Visibility does not imply generic CRUD. Codex-driven configuration and lifecycle changes continue through validated operator tooling, while controls are added only for workflows Andrew genuinely performs himself, such as responding to support requests or authorizing a refund.

Build 1 quality gates are formatting, linting, TypeScript checks, unit tests, Convex integration tests, Nx dependency-boundary enforcement, secret scanning and the dashboard Playwright smoke flow with a deterministic test identity. GitHub Actions runs the same deterministic commands as local development. Ordinary CI does not call live Google, Paddle or other hosted providers. Coverage-percentage quotas, load testing, comprehensive accessibility audits, live-provider checks and production smoke tests wait until an implemented or deployment slice needs them.

The accepted environment model separates deployment ownership into three logical BFF lanes. **Production** holds real data and is called only by production product deployments. A stable **staging/integration** BFF gives product developers and QA a dependable non-production dependency. Disposable personal **development/preview** deployments are used while changing BFF code/schema or when a branch needs isolated state. Build 1 provisions only one BFF development deployment; it temporarily serves BFF development and early product integration. Staging and production remain logical future lanes until an active build needs them.

Each Business workload deployment is configured with the base URL of the BFF deployment it should call and the unique public Business-environment key it uses. The same underlying TableCards code may use `tablecards-dev` and `tablecards-qa` environment rows inside one BFF development deployment. The BFF must not treat their shared Business name or codebase as an authorization relationship; Business and environment names are presentation metadata. Production Business environments live in the separate production BFF deployment.

The resolved Business-environment record is the hard authorization and data-isolation boundary. A stable public key selects that record, but a caller-supplied key alone grants no access. Every Business-owned read or write resolves trusted environment context before touching data, and all ownership roots carry the internal Business-environment reference. A provider-neutral technical authentication identity is the intentional shared exception and remains private to the auth boundary. The same person receives a distinct local user row in every Business environment they access, and memberships reference that environment-local user rather than the technical identity. Business workloads never receive the global technical identity ID.

Several Business environments using the same BFF deployment share infrastructure, code and technical authentication machinery, but they do not share Business-owned state. Browser session behavior across different origins depends on the eventual authentication configuration. When Build 2 introduces accounts, negative tests must prove that one environment's credential cannot select another environment merely by changing the public key. Provider configuration, deployment-wide rate limits and BFF code remain shared; isolating those requires another local or preview BFF deployment.

Under this model, the operator dashboard lists Business-environment rows and may visually group them by non-authoritative Business names, but `tablecards-dev` and `tablecards-qa` remain separate isolation scopes. Explicitly authorized operator dashboards may aggregate across environments for display, while each underlying data access remains scoped and every write targets one environment. A row proves only that the environment is configured; it must not be presented as a healthy workload deployment without a real check.

The later-MVP security discussion distinguishes three runtime identities. The future product-auth layer authenticates a technical person identity behind the BFF auth boundary; selecting Better Auth, Convex Auth or another suitable implementation is an owning-build decision and is independent of the direct Google operator path. Every credential delivered to a Business caller, including a browser calling BFF directly, must be short-lived and bound to one Business environment, with that environment's local user as its product-facing subject; a credential for one environment must fail at another. Privileged server operations independent of a user use a separate server-only credential assigned on demand to one deployed service and one Business environment. Within that environment it may use the full Business-service API; it receives no speculative per-capability permission list and can never access another environment or operator-only functions. Ordinary user-request forwarding uses the user's environment credential, and a frontend-only Business receives no service credential.

The threat boundary is explicit: compromise of one Business workload, environment-scoped user credential or environment service credential may expose that Business environment, but must not disclose or mutate another environment's users, accounts, data, billing or operations. The public environment key grants no authority. Every Business-owned root record carries the internal `businessEnvironmentId`, shared authorization helpers reject mismatched context, and each capability adds negative cross-environment tests when it introduces scoped data. A compromise of the shared BFF deployment itself remains outside this row-isolation guarantee because BFF is the trusted enforcement layer.

When a real privileged service workflow first needs a credential, the operator CLI asks BFF to generate a high-entropy secret, stores only its verifier/hash and service/environment metadata in BFF, and immediately writes the one-time plaintext value into the target backend environment's provider secret store. The CLI must not print the secret, persist it in repository files or leave it in shell history. Rotation creates and installs the replacement, verifies it, then revokes the old credential. Provider-specific secret-store adapters are added only for backends actually used. This is not a Convex deployment key and it grants no implicit right to access other Business environments, call operator-only functions or impersonate arbitrary users. A Business without a trusted server cannot safely supply a dynamic price from the browser and instead needs a registered price or another BFF-owned validation rule.

Authentication is boundary-specific rather than one universal BFF scheme. Public health requires no identity; backoffice functions require verified Google OIDC plus the operator allowlist; future Business-user functions require an environment-scoped user credential; privileged Business-service functions require the user credential or the service credential for that same environment; provider ingress verifies OAuth state or provider signatures; and operator CLI mutations remain internal Convex functions reached through authorized deployment access. Cryptographic verification may be configured centrally, but every exposed function invokes the guard for its own caller type and environment.

When Business-user authentication is implemented, each Business environment gains one primary site URL for its default destination plus explicit approved browser origins and post-login return URLs. Those are distinct from any redirect or callback URL owned by the shared BFF deployment. If the selected product-auth flow uses OAuth redirects, protected state binds the initiating Business environment and an approved return destination. Business URL configuration is deferred from Build 1 because no real Business workload consumes it yet; the Build 1 backoffice still needs its own stable hosted origin registered with the Google client.

API ownership follows the existing ADR: Business callers use a versioned public capability API/SDK; a Business workload's own API manages Business-domain data and validates the environment-scoped user credential; the backoffice uses only bounded exported read functions protected by operator authorization; Business-environment mutations remain internal functions reached by the operator CLI; and Google/Paddle provider ingress uses dedicated login/redirect or signed-webhook routes as applicable. There is no public Business-environment CRUD or generic database API.

The recommended Convex access model separates provisioning from routine development. The existing interactive CLI login can create the `business-factory` project and its first development deployment without Andrew sharing credentials in chat. Afterward, a revocable deploy key scoped only to that development deployment can support ordinary agent work with a smaller blast radius. CI and future production use separate least-privilege keys in their own secret stores. Authentication persistence removes repeated credential entry, but it does not grant blanket authorization for unrelated projects, production changes, billing or destructive operations.

Across the whole MVP, the only planned provider-ingress families are Google/OIDC login wiring and Paddle payment/subscription webhooks. Build 1 direct Google OIDC needs an authorized hosted browser origin; the later Business-user auth choice determines whether Google also needs a BFF redirect/callback URL. The shared cloud BFF development deployment supplies any stable non-production provider URL. Most logic remains testable locally with deterministic identities and signed provider fixtures; after local verification, the solo-developer workflow promotes one tested version to shared dev for the real provider smoke check. A separate temporary cloud BFF is an escape hatch for concurrent remote backend versions, not a routine environment. Production receives its own BFF deployment and live provider configuration at launch; permanent staging is deferred until observed release risk justifies it.

The direction is accepted for implementation planning, but not for automatic implementation. There is no Business manifest relationship in Build 1 because no Business workspace exists yet. The plan must reconcile the changed terminology, Build 1 dashboard/auth scope and local-user isolation model into the canonical ADR, delivery plan and broader architecture, and it must identify every provider access or human action needed for complete hosted verification.

## Decision Log

| Date | Decision | Context |
| --- | --- | --- |
| 2026-09-25 | Use one umbrella Foundation brainstorm and require explicit approval before implementation planning. | Workspace, BFF behavior and verification choices are coupled; discussion is the primary decision phase. |
| 2026-09-25 | Build 1 contains no TableCards application, product workspace or manifest. | Foundation should establish shared infrastructure without inventing product behavior. |
| 2026-09-25 | **Superseded:** Keep the project registry internal and code-owned with stable string IDs; create no public project-discovery API or application table in Build 1. | This was based on the temporary assumption that adding a registration should require a code change. The no-public-discovery boundary remains, but the storage choice was corrected later the same day. |
| 2026-09-25 | Retain production, staging/integration and development/preview as the logical environment model, but provision only one BFF development environment initially. | One environment is sufficient until parallel work or stability creates a concrete need to split it. |
| 2026-09-25 | **Refined:** Let product deployments select the BFF runtime through deployment-specific base-URL configuration while keeping the project ID unchanged. | The BFF base URL remains deployment configuration. The identity portion was refined: each isolated project environment uses its own registration key, even when project/environment labels show that rows belong to the same underlying product. |
| 2026-09-25 | Use the existing authenticated Convex CLI session for approved development provisioning, then prefer deployment-scoped credentials for routine work. | Andrew wants Codex to create routine development projects without repeated manual console work while keeping production access separate. |
| 2026-09-25 | Preserve brainstorms and plans in the repository with dates, lifecycle state, context snapshots and decision history. | Future sessions must be able to reconstruct what was known when decisions were made rather than relying on chat history. |
| 2026-09-25 | **Superseded:** Test Build 1 without a browser page: use BFF unit/API integration tests and a hosted health response; configure Playwright but add no scenario yet. | This was replaced after Andrew chose to start the real read-only operator dashboard in Build 1. Future Business UIs still need stronger regression protection. |
| 2026-09-25 | Reopen the no-browser decision to consider starting the real BFF backoffice with a minimal status page. | Andrew values having a web surface for the BFF. The earlier choice remains recorded while a development-only, read-only alternative is evaluated. |
| 2026-09-25 | **Refined:** Replace the single project-identity assumption with repeatable registrations inside one BFF environment. | The repeatable-registration and isolation decisions remain. The code-owned/no-table implementation was later superseded by persisted operator-created rows. |
| 2026-09-25 | Make each registration the hard data and authorization boundary; treat project and environment names as display metadata only. | The BFF does not need to distinguish a different product from another environment of the same product. All project-owned reads and writes remain registration-scoped, global identity is the shared exception, and an authorized backoffice may explicitly aggregate isolated scopes for operator views. |
| 2026-09-25 | **Superseded in part:** Keep project registration operator-controlled and code-owned; Business Projects never register themselves. | Operator control and no self-registration remain accepted. Code ownership and required BFF redeployment were a misunderstanding and are superseded by the persisted internal-operator model. |
| 2026-09-25 | Store registrations in the BFF database and let Codex create them through a protected operator mechanism; never let released projects self-register. | Andrew needs Codex to add another project environment without changing or redeploying BFF code. Each environment is another isolated registration row. The leading Build 1 mechanism is an internal Convex function invoked through authenticated CLI access. |
| 2026-09-25 | Manage registrations with a local repository CLI tool that calls validated internal Convex operations; create no public registration API in Build 1. | Andrew wants Codex to execute registration locally. The wrapper provides a simple operator workflow while the internal mutation preserves schema, uniqueness and lifecycle invariants; raw imports/direct edits would bypass those rules. |
| 2026-09-25 | **Superseded:** Give registrations an immutable key, editable project/environment labels and `active`/`disabled` lifecycle; support create, inspect, update, disable and reactivate, with no hard delete initially. | Review showed that no Build 1 behavior gave the status meaning. The later decision removes speculative lifecycle state until an owning workflow defines its enforcement. |
| 2026-09-25 | **Refined:** Treat the backoffice primarily as a read-oriented operator dashboard and show each core BFF entity when its owning slice introduces it; keep configuration changes in validated CLI tooling unless Andrew has a real manual workflow. | The read-oriented/CLI ownership rule remains. The original local-only delivery was later replaced by a hosted, Google-authenticated dashboard so Andrew can use it from his phone. Support responses, refunds and similar human operations may gain controls later; generic settings CRUD is excluded. |
| 2026-09-25 | Require formatting, linting, type checks, unit/Convex integration tests, Nx boundary checks, secret scanning and the dashboard Playwright smoke flow locally and in GitHub Actions. | Build 1 needs deterministic quality gates that match developer execution. Coverage quotas, load tests, comprehensive accessibility audits, live-provider checks and production smoke tests are deferred until a real slice gives them value. |
| 2026-09-25 | Use **Business** for the commercial initiative, **Business environment** for one isolated BFF data/access scope, **BFF deployment** for the running shared backend/database and **workload** for an executable app, API or worker. Name the Build 1 table `businessEnvironments`. | `Business` matches the factory's intended outcome; `Company` implies an owning organization, while Product, Project and App collide with narrower concepts. One BFF deployment may host several isolated Business environments. |
| 2026-09-25 | Omit lifecycle status and disable/reactivate operations from Build 1. | A status with no enforced behavior is misleading. The row currently records configured existence only; introduce lifecycle state when a real workflow defines what it blocks, preserves and permits. |
| 2026-09-25 | **Refined:** Make the Build 1 backoffice a hosted, phone-accessible dashboard protected by Google-only operator authentication through the self-hosted Better Auth Convex component. | Hosted, phone-accessible and Google-only remain accepted. Reusing Better Auth was later rejected as unnecessary coupling to the future Business-user authentication design. |
| 2026-09-25 | Authenticate the Build 1 backoffice directly with Google OIDC: let Convex validate the token centrally and require a fixed server-side `(issuer, subject)` operator allowlist in every protected dashboard read. | The backoffice has at most a few known operators and does not need product-user accounts, provider linking or a general session model. Authentication remains capability-specific across BFF; future Business-user auth is a separate decision. Deterministic tests mock authenticated identities or use an isolated test issuer, never a shared-environment bypass. |
| 2026-09-25 | Give the same authenticated person a distinct local user row in every Business environment they access; keep the provider-neutral technical identity private to BFF auth. | Each Business environment needs independent profiles, onboarding, suspension, deletion and memberships. Business workloads see only their local user ID and cannot correlate the person across environments through a global identifier. |
| 2026-09-25 | Issue only short-lived, Business-environment-bound credentials to Business browsers and user-facing backends; never expose a reusable global BFF user credential to a Business workload. | Compromise of one Business workload or user credential must not grant data or operations in another environment, even when the same person belongs to both. The exact product-auth library and token exchange wait for Build 2, but the audience/isolation invariant is fixed now. |
| 2026-09-25 | Create service credentials only on demand for a deployed backend or worker that needs privileged operations independent of a user; bind each credential to one deployed service and Business environment, without a speculative per-capability permission list. | The credential may use the full Business-service API within its environment but cannot cross environments or call operator-only functions. Frontend-only Businesses and ordinary user-request forwarding need no service credential. The operator CLI generates and immediately installs the one-time secret into the target backend environment's secret store without exposing it through chat, logs or repository files; rotation installs the replacement before revoking the old credential. |
| 2026-09-25 | Store later Business-environment settings as a small versioned, application-validated Convex object; add no settings field or index in Build 1. | Ordinary settings should not require a database column per key. Known nested paths can be indexed later through an explicit Convex schema index, while independently queried or lifecycle-rich concepts become explicit fields/tables. Secrets never belong in settings. |
| 2026-09-25 | Complete the internal consistency review with no unresolved architecture question before overall approval. | The review removed stale no-auth/local-only/open-question wording, made operator bootstrap and token refresh explicit, distinguished Google browser origins from optional later OAuth callbacks, and left implementation mechanisms to planning. |
| 2026-09-25 | Accept the complete Foundation direction and proceed to implementation planning. | Andrew approved the reviewed direction and requested that the plan identify every external account, access grant, credential and human action needed for Codex to implement and verify the slice end to end. |

## Notes

- Repository fact: `STATUS.md` names the Build 1 implementation-ready plan as the next Codex deliverable after two product choices; neither product choice changes the Foundation architecture.
- Repository fact: ADR 0001 accepts Convex-first BFF, a versioned technology-neutral API/contracts boundary and capability-sized schema growth.
- Repository fact: the delivery plan defines Build 1 as workspace, ownership boundaries, minimal Convex BFF/project registry, contracts, test harness and CI.
- Consistency audit on 2026-09-25: ADR 0001 still names a `projects` table with environment configuration on the project, while the corrected direction uses one `businessEnvironments` row per isolated environment. After brainstorm acceptance, the ADR and delivery wording must be amended together rather than silently reinterpreted during planning.
- Consistency audit on 2026-09-25: ADR 0001's first-login slice links global `users` directly through `memberships`; the accepted brainstorm direction instead gives every Business environment a distinct local user row and changes `session.bootstrap()`/authorization wording. The accepted ADR is not changed while the brainstorm remains Active; reconcile it immediately after overall approval.
- Consistency audit on 2026-09-25: the broader architecture still describes `projects`, `project_environments` and a manifest `projectId`, while the provider/secrets guide assumes one `SITE_URL` per BFF environment. Those documents require reconciliation after the whole brainstorm is accepted.
- Official Convex auth behavior checked 2026-09-25: a custom OIDC provider can pass browser-obtained ID tokens to Convex, which validates the exact issuer and application audience before exposing the verified identity to functions; the client adapter must be able to obtain a fresh token when requested. See [Custom OIDC Provider](https://docs.convex.dev/auth/advanced/custom-auth) and [Auth in Functions](https://docs.convex.dev/auth/functions-auth).
- Official Convex index behavior checked 2026-09-25: indexes may target known nested object fields with dot-separated paths, but every index is still explicitly defined and deployed as part of the Convex schema. See [Indexes](https://docs.convex.dev/database/reading-data/indexes/).
- Official Convex behavior: a Convex project has isolated production, personal development and optional preview deployments, and environment variables are configured per deployment. See [Deployments](https://docs.convex.dev/dashboard/deployments/) and [Environment Variables](https://docs.convex.dev/production/environment-variables).
- Official Convex guidance: a permanent staging environment can use a separate Convex project, while personal development and temporary preview deployments handle isolated change work. See [Working with Multiple Deployments](https://docs.convex.dev/production/multiple-deployments).
- Repository fact: this machine already has an authenticated Convex CLI session, so Build 1 should not require Andrew to paste or generate a new account-wide credential. The session must create a new Business Factory project rather than reuse the unrelated Podcat deployment.
- Official Convex guidance: local interactive login is stored and reused by the CLI, while a development deploy key can restrict an agent to one deployment. See [Deploy Keys](https://docs.convex.dev/cli/deploy-key-types) and [Agent Mode](https://docs.convex.dev/cli/agent-mode).
- Historical option note: an earlier version of Option C proposed a thin TableCards product shell. It was replaced by the backoffice-shell alternative because Build 1 explicitly excludes TableCards code.
- Independent Astra architecture review on 2026-09-25 compared per-environment cloud deployments, row-scoped logical environments, repeated Convex Component instances and a shared-cloud/local-isolation model. It recommended shared cloud integration plus local isolation and temporary cloud previews. At the time, the candidate Build 1 had zero application tables; the later operator-registry correction adds only `businessEnvironments` and does not change the review's rejection of per-environment Convex Component instances. See [Agent Mode](https://docs.convex.dev/cli/agent-mode), [Local Deployments](https://docs.convex.dev/cli/local-deployments), [Multiple Deployments](https://docs.convex.dev/production/multiple-deployments) and [Using Components](https://docs.convex.dev/components/using).
- Official Convex CLI behavior checked 2026-09-25: `npx convex run` can invoke public or internal queries, mutations and actions against the selected deployment, while deploy keys can be permission-scoped. This supports CLI-first operator registration without exposing a public self-registration endpoint. See [`npx convex run`](https://docs.convex.dev/cli/reference/run), [CLI overview](https://docs.convex.dev/cli/overview) and [Deploy Keys](https://docs.convex.dev/cli/deploy-key-types).
- Agency Agents review lenses used 2026-09-25: the Backend Architect lens reinforced a single persisted source of truth, explicit schema/index/lifecycle rules and idempotent operator operations; the Application Security and Cloud Security lenses reinforced no implicit intra-company trust, least-privilege service credentials, no secrets in registration rows and negative cross-registration tests. Repository decisions and official documentation remain authoritative.
- Whole-MVP provider-ingress review on 2026-09-25: current scope requires Google/OIDC login wiring and Paddle webhooks. Direct Google OIDC for Build 1 requires an authorized browser origin but not necessarily a BFF callback; the later Business-user auth choice determines its redirect/callback shape. Support, PDF generation, manual invitations and Cloudflare hosting introduce no additional provider-ingress family.
- Future identity exploration recorded 2026-09-25: the MVP keeps Google as its only login provider and implements no account-linking flow. If a second provider is enabled later and reports an email matching an existing authentication account, a candidate low-friction flow is to send a short-lived, single-use verification link to the existing email address before linking the new provider identity. A raw email match must not silently merge accounts. Sensitive identity or billing changes may still require recent provider reauthentication. This is a future design note, not accepted MVP scope; reassess it with the second provider's verified-email guarantees and the authentication library's current behavior when that provider is actually introduced.
- Independent Astra consistency review on 2026-09-25 found the single-row-per-Business-environment model viable. It initially identified the Build 1 dashboard credential bridge, which the later direct-Google-OIDC decision resolved; it also corrected claims about what two dummy rows can prove, required environment-bound credentials for all Business callers in Build 2, and assigned product storage, paid-asset delivery, detailed service credentials and billing refinements to their owning builds rather than Foundation.
