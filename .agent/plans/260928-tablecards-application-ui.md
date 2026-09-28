# Feature: TableCards Application UI

> **Status**: Approved — Execution requested
> **Created**: 2026-09-28
> **Last updated**: 2026-09-28
> **Repository baseline**: `beb4440`
> **Source PRD**: [`TableCards Application PRD`](../../docs/products/tablecards-application-prd.md), accepted for immediate planning and implementation by Andrew on 2026-09-28
>
> Implementation plan based on the repository state inspected on 2026-09-28. Re-verify referenced files, versions, and external documentation if the repository changes before implementation.

## Repository Context Snapshot

Commit `beb4440` preserves the complete Build 3 development slice on branch
`feat/tablecards-application` and PR #1. It provides a one-route React 19
TableCards page, the independent TableCards Convex deployment, shared BFF
authentication/accounts/product access, deterministic development commerce and
AI, PDF export, and six hosted Chromium/WebKit journeys. The full Node 24
`pnpm check` gate passed at this baseline. Development is live at
`https://tablecards-dev.tofler.app`; production is intentionally unchanged.

The current UI is a roughly 8,400 CSS-pixel landing/creator/pricing page on an
iPhone viewport. Saved projects, uploads, AI and offer controls live in a
collapsed creator detail. The BFF account lifecycle has integration coverage,
but TableCards has no visible member/invitation/role/transfer workflow. The
existing TableCards data model already contains `designPresets`, but it has no
functions or UI, and the current fields do not contain the complete constrained
style promised by the PRD.

## Feature Description

Turn TableCards from a long demonstration page into a responsive multi-page
application whose visible workflows match every Build 3 pricing promise. Keep
public import and preview available without authentication, then provide
focused signed-in project, design, usage and Studio team surfaces backed by the
real account-scoped TableCards and BFF APIs. Preserve Build 3's payment mock and
development-only boundaries; do not add Paddle, support or production rollout.

## User Story

As a host, planner or Studio member,
I want focused pages for creating cards, managing projects and designs, seeing
my allowance, and collaborating with my team,
so that TableCards behaves like a reliable work tool on phone and desktop and
every advertised capability is discoverable and usable.

## Problem Statement

The current UI proves the core technology but overloads one page, performs
multiple unrelated jobs in one 1,378-line component, and hides paid/project
features in a disclosure. It does not provide project archive/restore/duplicate,
reusable presets, accurate live AI balance, account usage, or Studio account
management. Shared APIs also lack a pending-invitation list and a display-safe
member roster projection, so a complete team surface cannot be built by UI
composition alone.

## Solution Statement

Add a React Router data router with lazy route modules, separate public and
authenticated shells, and focused pages for landing, creator, projects, saved
project editing, designs, account usage, team management and invitation
acceptance. Extract the creator's stateful workspace without changing its
validated import/preview/export core. Add the smallest missing TableCards
Convex operations and shared typed BFF account-management contract, then prove
the visible journeys through focused unit/integration tests and a small hosted
Chromium/WebKit scenario set.

The accepted defaults are the PRD recommendations: four mobile navigation
items (`Projects`, `Create`, `Designs`, `Account`), roster visibility for every
Studio member, copyable invitation links without email delivery, and restorable
archives.

## Metadata

- **Type**: Enhancement
- **Complexity**: High — the change crosses route architecture, responsive UX,
  two authenticated API boundaries, Convex persistence and hosted multi-person
  acceptance without changing the established security model.
- **Systems Affected**: TableCards React web, TableCards Convex backend,
  TableCards core catalog, BFF contracts/HTTP/service tests, TypeScript browser
  SDK, TableCards hosted Playwright suite, runbook and product handoff.
- **Dependencies**: `react-router-dom@7.18.4`; existing React 19.3, Convex 1.46,
  BFF SDK, Vitest 4 and Playwright 1.63.
- **Assumptions**: Development retains the existing deterministic offer and AI
  providers; no production deployment is authorized; a Studio browser fixture
  may use the existing validated operator account-policy command rather than a
  product self-grant; current Build 3 data is development-only, but schema
  changes remain additive and backward-compatible.

## Required Reading

### Codebase Files (read before implementing)

- `docs/products/tablecards-application-prd.md:1` — accepted page map, user
  stories, permission rules, responsive behavior and browser journeys.
- `docs/products/tablecards-mvp.md:1` — canonical offers, privacy, billing mock
  and output constraints.
- `projects/tablecards/workloads/web/src/main.tsx:16` — existing provider order
  and public runtime configuration boundary.
- `projects/tablecards/workloads/web/src/app.tsx:468` — working creator state,
  sign-in draft restoration and server interactions to preserve during
  extraction.
- `projects/tablecards/workloads/web/src/backend.ts:70` — current typed
  TableCards browser-to-Convex facade and result projections.
- `projects/tablecards/workloads/web/src/draft.ts:15` — bounded, versioned,
  session-only anonymous draft contract.
- `projects/tablecards/backend/convex/schema.ts:8` — account-scoped product
  schema and existing unused preset table.
- `projects/tablecards/backend/convex/projects.ts:89` — existing account-scoped
  list/get/save/archive patterns and transaction-side limit checks.
- `projects/tablecards/backend/convex/productAccess.ts:88` — authoritative
  effective-offer projection and development grant boundary.
- `platform/bff/libs/contracts/src/accounts.ts:10` — current account/member and
  invitation contracts.
- `platform/bff/libs/sdk/typescript/src/browser/index.ts:47` — existing browser
  client, authorized BFF request helper and account activation behavior.
- `platform/bff/service/convex/lib/customerHttp.ts:784` — member/invitation HTTP
  authorization and response patterns.
- `platform/bff/libs/sdk/typescript/src/server/index.ts:601` — protected
  ownership-transfer adapter ceremony.
- `projects/tablecards/e2e/src/hosted-development.spec.ts:1` — hosted
  development-auth and PDF/AI scenario pattern.
- `docs/operations/build-3-tablecards.md:51` — validated development deployment
  order, public hosts and acceptance commands.

### Internal Documentation

- `docs/architecture/shared-bff-data-model.md` — BFF versus Business data
  ownership and access/unit table semantics.
- `docs/architecture/adr/0004-business-customer-auth-and-accounts.md` — accepted
  session, account, role, invitation and transfer security boundary.
- `projects/tablecards/workloads/web/README.md` — local configuration, protected
  drafts and development-only controls.
- `projects/tablecards/backend/README.md` — TableCards deployment ownership and
  environment requirements.

### External Documentation

- [React Router route objects](https://reactrouter.com/start/data/route-object#lazy)
  — Section: `lazy` — implement route-level module loading without moving auth
  or account decisions into URLs.
- [React Router navigation blocking](https://reactrouter.com/how-to/navigation-blocking)
  — use `useBlocker` plus `beforeunload` for meaningful unsaved editor changes.
- [Convex schemas](https://docs.convex.dev/database/schemas) — keep new preset
  fields validator-backed and additive.
- [Convex pagination](https://docs.convex.dev/database/pagination) — preserve
  bounded member/invitation/project listing behavior.

### New Files to Create

- `projects/tablecards/workloads/web/src/router.tsx` — browser router and lazy
  route registration.
- `projects/tablecards/workloads/web/src/application-context.tsx` — stable web
  configuration and account-generation context shared by route modules.
- `projects/tablecards/workloads/web/src/layouts/public-shell.tsx` — concise
  marketing shell.
- `projects/tablecards/workloads/web/src/layouts/application-shell.tsx` —
  authenticated desktop/mobile application navigation.
- `projects/tablecards/workloads/web/src/components/` — focused auth, status,
  confirmation, usage and creator building blocks extracted from `app.tsx`.
- `projects/tablecards/workloads/web/src/pages/landing-page.tsx` — landing only.
- `projects/tablecards/workloads/web/src/pages/create-page.tsx` — anonymous and
  authenticated creator entry.
- `projects/tablecards/workloads/web/src/pages/project-page.tsx` — saved editor.
- `projects/tablecards/workloads/web/src/pages/projects-page.tsx` — active and
  archived project dashboard.
- `projects/tablecards/workloads/web/src/pages/designs-page.tsx` — predefined,
  uploaded/AI and reusable preset library.
- `projects/tablecards/workloads/web/src/pages/account-page.tsx` — plan, limits,
  live units, seats and development offers.
- `projects/tablecards/workloads/web/src/pages/team-page.tsx` — roster,
  invitations, roles, removals and transfer.
- `projects/tablecards/workloads/web/src/pages/invitation-page.tsx` — secure
  inspection/authentication/acceptance flow.
- `projects/tablecards/backend/convex/designPresets.ts` — preset list and
  entitlement-checked mutations.
- `projects/tablecards/workloads/web/src/**/*.test.tsx` as needed — route/page
  behavior and permission rendering tests.

Exact component filenames may be combined when a component has only one route
consumer, but route modules remain separate so Vite can split them.

## Codebase Context

### Existing Architecture and Integration Points

The browser SDK owns the Business session and short account-context token. The
TableCards browser facade supplies that token to account-guarded TableCards
Convex actions. Those actions query BFF server-to-server for authoritative
product access; product data never moves into BFF. Account/member/invitation
operations are shared capabilities and therefore belong in BFF contracts and
the technology TypeScript SDK, not TableCards Convex.

The session-adapter Worker exposes only fixed auth routes. Ownership transfer
must continue through `/_tofler/auth/transfer/start`, because only the adapter
can use the HttpOnly session handle and complete the provider-neutral fresh-auth
ceremony. The browser receives only an authorization URL.

### Patterns to Follow

#### Naming and Organization

- Nx projects retain `scope:business`/`scope:platform` boundaries.
- Route modules live under the TableCards web application; product-agnostic
  account operations remain in the SDK.
- Public identifiers are opaque strings. UI labels use display names/emails,
  never database IDs as primary copy.

#### Error Handling

- BFF returns bounded `customerAuthErrorResponseSchema` errors with safe copy
  and optional correlation IDs.
- TableCards product failures use bounded product errors; `safeMessage` remains
  the UI fallback.
- Not-found/wrong-account project responses intentionally converge on the same
  state.

#### Logging and Observability

Build 3 has no general analytics/monitoring. Do not introduce console logging
for guest data or invitation tokens. The UI renders bounded status and
correlation evidence only when already supplied safely by the server.

#### Authentication and Authorization

- Public routes are landing, creator and invitation entry. Private routes
  require a selected membership; onboarding retains the existing create/join
  flow.
- UI action visibility derives from current role/permissions, but every BFF or
  TableCards mutation rechecks authoritative state.
- Account changes invalidate account-scoped route data before navigation.
- Invitation tokens remain only in the invitation route until extracted, are
  never logged, and are removed from visible browser history after successful
  acceptance.

#### Data and Migrations

- Add preset typography fields as optional schema fields first and apply
  defaults in reads, so any existing development record stays readable.
- Archive is a state transition, not deletion. Restore and duplicate enforce
  current active-project and offer limits transactionally.
- BFF adds read projections/queries only; existing account/membership and
  invitation storage remains authoritative.

#### Testing

- Vitest owns pure rendering, route and SDK decision tables.
- `convex-test` owns project/preset authorization, account isolation, limits,
  invitation listing/inspection and mutation denials.
- Hosted Playwright remains a few scenario-sized tests using the real dev
  gateway, BFF, account token, TableCards deployment and deterministic
  providers.

## Design Decisions

- **Decision**: Use `react-router-dom@7.18.4` with a data router and lazy route
  modules.
  - **Rationale**: It supports deep links, history, route parameters,
    unsaved-navigation blocking and actual code splitting in the current React
    stack.
  - **Tradeoff**: Adds one dependency and requires Cloudflare static fallback
    coverage, already supported by the assets Worker.
- **Decision**: Share one extracted creator workspace between `/create` and
  `/projects/:projectId`.
  - **Rationale**: Keeps the proven import/preview/export behavior and avoids
    two divergent editors.
  - **Tradeoff**: The workspace state contract must explicitly distinguish new,
    draft-restored and saved modes.
- **Decision**: Extend the BFF browser SDK for shared account management rather
  than calling BFF with TableCards-local fetch code.
  - **Rationale**: Every TypeScript Business should receive the same validated
    account contract; session/token/error behavior stays centralized.
  - **Tradeoff**: BFF contracts, service and SDK tests expand in this slice.
- **Decision**: Add a token-authenticated invitation inspection endpoint and
  pending-invitation list.
  - **Rationale**: The PRD needs a safe invite landing and team view, neither of
    which the current mutation-only API can provide.
  - **Tradeoff**: The inspection response must be intentionally minimal and its
    failures non-enumerating.
- **Decision**: Studio offer selection never changes account security policy.
  - **Rationale**: Product access and security policy remain separate accepted
    boundaries.
  - **Tradeoff**: Hosted team tests need explicit operator-provisioned policy
    on their fixture account.
- **Decision**: Keep invitation delivery copy-only in this slice.
  - **Rationale**: Email/support delivery belongs to later builds and a
    one-time secret must not be invented again after creation.
  - **Tradeoff**: Reissuing rotates the secret and requires copying the new URL.
- **Decision**: No dead billing or support route.
  - **Rationale**: The PRD assigns those workflows to Builds 4 and 5.
  - **Tradeoff**: Account actions use honest “not available yet” upgrade copy
    only where needed to explain a denial, without a fake checkout button.

## Implementation Plan

### Phase 1: Typed shared boundaries

Add the missing human-readable member view, paginated pending invitations,
minimal invitation inspection and browser SDK operations. Expose accurate
TableCards access source/features/live unit balance. Add tests before any page
depends on the new contract.

### Phase 2: Product persistence operations

Add active/archived project listing, restore, entitlement-safe duplication,
recent export projection and reusable preset CRUD with account isolation and
current-offer checks.

### Phase 3: Routing, shells and focused pages

Install the router, split public/application shells, extract the creator, add
the project/design/account/team/invite pages, and implement phone-first
navigation and creator steps while preserving desktop preview efficiency.

### Phase 4: Hosted workflows and development rollout

Expand tests around the highest-value workflows, run the complete repository
gate, deploy BFF then TableCards backend then web development, provision only
the required development fixture policy with the operator CLI, and run hosted
Chromium/WebKit plus phone-viewport acceptance. Production stays unchanged.

## Step-by-Step Tasks

Execute in dependency order.

### Task 1: UPDATE shared BFF account contracts and HTTP reads

- **Implement**: Add an `AccountMemberView` containing membership plus safe
  display name/verified email/optional picture; paginated member and pending
  invitation response schemas; `GET /v1/accounts/invitations`; and a minimal
  token-based invitation inspection endpoint returning account display name and
  expiry without recipient email or membership details. Keep invalid, revoked,
  expired and unknown tokens non-enumerating.
- **Pattern**: `platform/bff/libs/contracts/src/accounts.ts:10` and
  `platform/bff/service/convex/lib/customerHttp.ts:784`.
- **Dependencies/Imports**: Existing Zod contracts, invitation SHA-256 hashing,
  registered-origin CORS and Convex pagination validators.
- **Gotchas**: Never return the invitation token from list operations; token
  inspection must not require or mint a session; preserve existing member
  mutation response types.
- **Validate**: `pnpm exec nx run bff-contracts:test` and
  `pnpm exec nx run bff-service:test-integration`.

### Task 2: UPDATE the TypeScript browser SDK account-management interface

- **Implement**: Add typed list-members, list-invitations,
  inspect-invitation, create/reissue invitation, revoke, role change, remove,
  accept and ownership-transfer-start methods. Reuse bounded fetch/error/token
  logic; start transfer through the session adapter and return its verified
  authorization URL.
- **Pattern**: `platform/bff/libs/sdk/typescript/src/browser/index.ts:405` and
  `platform/bff/libs/sdk/typescript/src/server/index.ts:601`.
- **Dependencies/Imports**: New contracts from Task 1; existing CSRF header for
  adapter POST.
- **Gotchas**: A BFF bearer token must never be sent to the adapter; the adapter
  uses only the protected cookie. Pagination remains bounded. Invitation tokens
  must not appear in thrown messages.
- **Validate**: `pnpm exec nx run bff-sdk-typescript:test` and
  `pnpm exec nx run bff-sdk-typescript:typecheck`.

### Task 3: UPDATE TableCards product-access projection

- **Implement**: Return source, all offer feature flags, collaboration-seat
  limit, live AI `available` balance and allocation label from the existing BFF
  access/balance APIs. Stop labelling the static plan allowance as “remaining.”
- **Pattern**: `projects/tablecards/backend/convex/productAccess.ts:88` and
  `platform/bff/libs/sdk/typescript/src/server/productAccess.ts:36`.
- **Dependencies/Imports**: Existing `getUnitBalance` call and offer catalog.
- **Gotchas**: A missing/zero grant renders zero safely; development monthly
  bucket lazy creation remains BFF-owned; do not leak allocation keys to the
  Business UI.
- **Validate**: `pnpm exec nx run tablecards-backend:test-integration`.

### Task 4: UPDATE TableCards project lifecycle operations

- **Implement**: Let list accept active/archived state; add restore and duplicate
  operations; preserve ordered duplicate guests; enforce current offer card,
  project and design limits; expose latest export status for the saved-project
  route.
- **Pattern**: `projects/tablecards/backend/convex/projects.ts:145` and
  `projects/tablecards/backend/convex/productAccess.ts:197`.
- **Dependencies/Imports**: Existing account guards, `effectiveOffer`, project
  contents and export tables.
- **Gotchas**: Restore consumes an active-project slot; duplicate never copies
  export rows; wrong-account/not-found stays indistinguishable; concurrent
  limit checks happen inside one mutation.
- **Validate**: `pnpm exec nx run tablecards-backend:test-integration`.

### Task 5: ADD reusable design-preset operations

- **Implement**: Add optional approved font and constrained size fields to
  `designPresets`; list account presets with short-lived asset URLs; create from
  an account-owned uploaded/AI asset; rename/update constrained style; delete
  the preset without deleting an asset still used by projects.
- **Pattern**: `projects/tablecards/backend/convex/assets.ts` for asset ownership
  and `projects/tablecards/backend/convex/productAccess.ts:112` for effective
  entitlement checks.
- **Dependencies/Imports**: Account guards, product-access client, allowlisted
  typography/color/position validators.
- **Gotchas**: Planner/Studio entitlement is server-authoritative; Event Pass
  artwork remains project-scoped and cannot become reusable; old rows receive
  defaults on read.
- **Validate**: `pnpm exec nx run tablecards-backend:test-integration`.

### Task 6: ADD router, public shell and application shell

- **Implement**: Install/pin `react-router-dom@7.18.4`; create the router with
  lazy route modules; keep provider order intact; add public header/footer and
  authenticated shell with desktop navigation, compact account selector and
  four-item mobile bottom navigation. Add guarded onboarding/account-selection
  states and route-level not-found/error surfaces.
- **Pattern**: `projects/tablecards/workloads/web/src/main.tsx:16` and
  `platform/bff/libs/sdk/typescript/src/react/index.tsx:121`.
- **Dependencies/Imports**: React Router data APIs, existing BFF providers.
- **Gotchas**: Deep links must work on the Cloudflare static site; auth return
  paths remain relative; switching account while editing clears state and goes
  to `/projects`.
- **Validate**: `pnpm exec nx run tablecards-web:test` and build output chunk
  inspection proving landing does not eagerly load XLSX/PDF/team modules.

### Task 7: REFACTOR creator into a route-safe workspace

- **Implement**: Extract the working import/mapping/design/preview/save/export
  logic into a shared workspace. `/create` starts/restores a bounded draft;
  `/projects/:projectId` loads a saved project. Save replaces history with the
  saved route. Add dirty-state tracking and meaningful navigation confirmation.
- **Pattern**: `projects/tablecards/workloads/web/src/app.tsx:468` and
  `projects/tablecards/workloads/web/src/draft.ts:52`.
- **Dependencies/Imports**: Router navigation/blocker, TableCards backend facade.
- **Gotchas**: No guest data in URL/local storage/logging; remounting auth must
  not erase a public draft; stale account/project data must disappear before a
  new account load.
- **Validate**: Creator unit tests plus `pnpm exec nx run tablecards-web:test`.

### Task 8: ADD responsive creator steps

- **Implement**: Phone Guests → Design → Review/Export steps, horizontal design
  chooser, one large selected preview, on-demand full-sheet preview and sticky
  contextual action. Desktop retains efficient controls/preview side by side.
- **Pattern**: Existing `ImportMapping`, `DesignPicker` and `SheetPreview` in
  `projects/tablecards/workloads/web/src/app.tsx`.
- **Dependencies/Imports**: Extracted workspace from Task 7.
- **Gotchas**: 320px minimum with no horizontal page scroll; mapping retains
  focus management; preview dialog/drawer returns focus; six-card controls stay
  development-only.
- **Validate**: web component tests and an iPhone-size Playwright journey.

### Task 9: ADD Projects and saved-project pages

- **Implement**: Active count/limit, create, open, duplicate, archive, archived
  filter, restore, loading/empty/error/at-limit states, editor title/saved-dirty
  state, latest export and safe wrong-account not-found.
- **Pattern**: `projects/tablecards/workloads/web/src/backend.ts:70` for the
  typed facade and Task 4 operations.
- **Dependencies/Imports**: Application shell and creator workspace.
- **Gotchas**: Confirm destructive archive; restore/duplicate denials give
  precise limit copy; cards preserve duplicate guest rows.
- **Validate**: page tests plus backend integration tests.

### Task 10: ADD Designs page and preset workflows

- **Implement**: Separate free/premium predefined catalog, upload/AI assets and
  reusable presets; expose premium state; create/update/rename/delete a preset;
  allow Event Pass project artwork without presenting reuse.
- **Pattern**: `projects/tablecards/libs/core/src/catalog.ts:26` and existing
  upload/AI flows in `app.tsx`.
- **Dependencies/Imports**: Task 3 access projection and Task 5 preset facade.
- **Gotchas**: No freeform canvas; approved fonts/sizes/colors/positions only;
  AI failure releases units as before.
- **Validate**: web tests and Planner hosted workflow.

### Task 11: ADD Account and usage page

- **Implement**: Account name/role, offer/source, active projects, maximum cards,
  live AI balance/allocation label, seat occupancy, honest later-build billing
  boundary and development-only offer selector. Remove project/access/dev tools
  from the creator.
- **Pattern**: Auth state account summaries and Task 3 access projection.
- **Dependencies/Imports**: Application shell, TableCards backend facade.
- **Gotchas**: Never display grant/allocation/provider IDs; production bundles
  cannot include visible development controls.
- **Validate**: offer/source/unit rendering tests and production-build string
  assertion.

### Task 12: ADD Team and Invitation pages

- **Implement**: All-member roster; permission-aware invitation, revoke/reissue,
  role, removal and transfer controls; seat use; copy-once invitation link;
  confirmation dialogs; provider-neutral transfer redirect; invitation inspect,
  sign-in return, acceptance outcomes and post-accept account selection.
- **Pattern**: Task 2 browser SDK and `BffAuthLink` return-path behavior.
- **Dependencies/Imports**: Shared SDK account API, router, account permissions.
- **Gotchas**: Member sees no mutations; Admin cannot act on Owner/peer Admin;
  server denial remains visible; token is not logged/analysed; transfer callback
  returns to team page; reissue rotates the only copyable secret.
- **Validate**: SDK/page tests, BFF account integration tests and Studio hosted
  scenario.

### Task 13: UPDATE focused browser acceptance and fixture provisioning

- **Implement**: Replace selectors tied to the one-page layout; cover visitor to
  Free export, project lifecycle/preset, Studio invitation/roles/seat denial,
  transfer/replay denial where automation supports it, account isolation and
  mobile compact workflow. Provision explicit Studio account policy through the
  existing operator command, never through offer selection.
- **Pattern**: `projects/tablecards/e2e/src/hosted-development.spec.ts:1` and
  `tools/bff-operator/src/cli.ts:394`.
- **Dependencies/Imports**: All prior tasks and development automation keys
  already used by the hosted suite.
- **Gotchas**: Keep scenario count small; never print grants/tokens in output;
  deterministic personas need collision-safe reuse/cleanup; WebKit remains a
  required hosted browser.
- **Validate**: `pnpm exec nx run tablecards-e2e:e2e-hosted-development`.

### Task 14: UPDATE documentation, status and development deployment

- **Implement**: Update web/backend READMEs, Build 3 runbook, PRD status/history,
  this plan and `STATUS.md`; run full gate; deploy BFF development, then
  TableCards development, then the web Worker; run health and hosted smoke; push
  commits to PR #1. Do not deploy production.
- **Pattern**: `docs/operations/build-3-tablecards.md:51`.
- **Dependencies/Imports**: Valid development environment and Cloudflare access
  already proven at the baseline.
- **Gotchas**: Node 24 is required; Convex commands run from the correct service
  directory; report exact Worker versions; no production target/secret mutation.
- **Validate**: full Node 24 `pnpm check`, hosted development suite, direct
  health probes and manual phone-viewport inspection.

## Testing Strategy

### Unit Tests

- Contract parsing for member/invitation/list/inspect results and token-safe
  errors.
- Browser SDK URL, authorization, pagination, transfer-adapter separation and
  error parsing.
- Router guards, navigation, account reset, creator dirty state and offer-based
  action visibility.
- Account live-balance copy and production development-control exclusion.

### Integration Tests

- BFF member projection, pending invitation list, token inspection, CORS,
  revoked/expired/unknown behavior and account isolation.
- Project active/archived lists, restore/duplicate concurrency and current-offer
  denials.
- Preset ownership, entitlement checks, constrained fields and safe deletion.
- Product access projection uses live balance after reserve/commit.

### End-to-End or Manual Validation

- Hosted Chromium and WebKit scenarios listed in the PRD, grouped by coherent
  user journeys with shared helpers.
- Real deployed route refresh/deep-link check for each route.
- iPhone-size viewport validates compact navigation, step flow, on-demand
  preview, sticky action and no desktop marketing stack.
- Andrew's later real-phone review remains useful acceptance evidence but does
  not block completing all automatable development checks.

### Edge Cases

- Signed out, onboarding required and account-selection required.
- Account switched while a project request is in flight.
- Wrong-account project/preset/invitation identifiers.
- Project limit reached during duplicate/restore race.
- Invitation rotates, expires, is revoked, targets another verified email, or
  exceeds recipient membership/seat capacity.
- Concurrent member role/removal changes and stale permissions.
- Transfer canceled, replayed or completed while old account token is cached.
- AI balance zero/failure, upload denial and unsupported preset values.
- Browser private storage rejects draft writes.

## Validation Commands

Run from `/root/projects/bff` unless noted.

### Syntax and Types

```bash
pnpm exec nx run-many -t typecheck --projects=bff-contracts,bff-sdk-typescript,bff-service,tablecards-backend,tablecards-web,tablecards-e2e
```

### Focused Tests

```bash
pnpm exec nx run bff-contracts:test
pnpm exec nx run bff-sdk-typescript:test
pnpm exec nx run bff-service:test-integration
pnpm exec nx run tablecards-backend:test-integration
pnpm exec nx run tablecards-web:test
pnpm exec nx run tablecards-e2e:e2e-hosted-development
```

### Full Repository Gate

```bash
pnpm --package=node@24 dlx sh -c 'pnpm check'
```

### Manual Validation

- Refresh and deep-link each deployed route on the Cloudflare host.
- Inspect the production-mode bundle to confirm development-offer controls and
  development provider entry are absent.
- Use the deployed iPhone viewport to confirm the full creator is no longer a
  long stack and no route scrolls horizontally at 320px.
- Confirm GitHub PR branch activity did not deploy the production environment.

## Acceptance Criteria

- [ ] Landing is concise and separate from the creator/application routes.
- [ ] `/create` works before auth and preserves a bounded draft through sign-in.
- [ ] Mobile creator uses three focused steps, compact design selection,
  on-demand complete preview and sticky contextual action.
- [ ] Signed-in shell exposes Projects/Create/Designs/Account with safe account
  switching and no stale cross-account data.
- [ ] Projects can be opened, duplicated, archived and restored with server-side
  offer limits and safe wrong-account behavior.
- [ ] Planner/Studio reusable preset workflows are visible and enforced; Event
  Pass artwork is not falsely reusable.
- [ ] Account shows accurate offer source, project/card limits, live AI balance
  and seat usage without internal identifiers.
- [ ] Studio roster/invitation/role/removal/transfer and recipient acceptance are
  usable, permission-aware and browser-tested through shared APIs.
- [ ] Pricing claims map to discoverable routes and authoritative enforcement.
- [ ] Public landing initial chunk does not eagerly include editor imports,
  spreadsheet/PDF generation or team-management code.
- [ ] Development-only controls are absent from a production-mode build.
- [ ] Authorization and account isolation rules are verified.
- [ ] Relevant failure, capacity, replay and stale-state cases are covered.
- [ ] Full repository validation and hosted development checks pass.
- [ ] BFF, TableCards backend and web development deploy in dependency order;
  production remains unchanged.
- [ ] Documentation, PRD, plan and status reflect the delivered state.

## Risks and Mitigations

- **Risk**: Refactoring the working monolith regresses import/PDF behavior.
  - **Mitigation**: Extract before redesign, preserve backend facade semantics,
    and rerun the existing PDF/AI hosted journeys after each phase.
- **Risk**: Account route data flashes after account switching.
  - **Mitigation**: Key account-scoped providers/loaders by auth snapshot
    generation and clear/navigate before refetch.
- **Risk**: A copyable invitation secret leaks through history or diagnostics.
  - **Mitigation**: Never log/analytics the token, use no-referrer behavior,
    minimal inspection, and replace the route after acceptance.
- **Risk**: Team UI accidentally conflates Studio product access and BFF policy.
  - **Mitigation**: Require both feature entitlement for product presentation
    and authoritative BFF permissions/policy for every operation; provision
    fixtures explicitly.
- **Risk**: Browser suite becomes slow/flaky across multiple personas.
  - **Mitigation**: Keep a few scenario-level journeys, share login helpers and
    put exhaustive decision tables in Convex/Vitest.
- **Risk**: Broad scope delays a usable review build.
  - **Mitigation**: Commit in dependency-ordered vertical slices and keep the
    existing dev site operational until the routed shell is ready to publish.

## Open Questions

None. The user authorized the PRD recommendations and immediate execution. Live
payments, invitation email delivery, support, analytics/monitoring and
production deployment remain deliberately outside this plan.

## Notes

Rollback is branch/Worker-version based. The existing development Worker
version remains available while the routed application is implemented. Schema
changes are additive, and no destructive data migration is planned. PR #1 is
the review vehicle for both the preserved Build 3 baseline and this follow-up;
the implementation should be added as later commits rather than rewriting the
baseline commit.

## Document History

| Date       | Status                        | Change                                                                                              |
| ---------- | ----------------------------- | --------------------------------------------------------------------------------------------------- |
| 2026-09-28 | Approved — Execution requested | Initial implementation-ready plan created from the accepted PRD and repository baseline `beb4440`. |
