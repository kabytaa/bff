# Feature: TableCards User-Story Acceptance

> **Status**: Completed — development acceptance
> **Created**: 2026-09-28
> **Last updated**: 2026-09-28
> **Repository baseline**: `5a399f8`
> **Source PRD**: [`TableCards Application PRD`](../../docs/products/tablecards-application-prd.md)
>
> Andrew requested immediate implementation, hosted development deployment and
> complete mobile/desktop verification on 2026-09-28. Production remains outside
> this PR's accepted Build 3 boundary.

## Repository Context Snapshot

Branch `feat/tablecards-application` and PR #1 contain the accepted multi-page
TableCards Build 3 application. Development is deployed at
`https://tablecards-dev.tofler.app`; production is intentionally unchanged.
The hosted Playwright project currently runs seven journeys in desktop Chromium
and desktop WebKit. Those journeys prove PDF geometry, responsive creator
basics, anonymous draft restoration, one Free denial, one professional path and
one Studio invitation path, but they do not cover all twenty PRD user stories,
all four pricing offers, full navigation, or every interactive control.

Build 3 has deterministic development commerce and AI providers. It does not
have Paddle checkout, provider webhooks or production subscription lifecycle;
those remain Build 4. Acceptance in this plan therefore proves the same offer,
entitlement, renewal-allocation and team contracts through the explicit
development mock without presenting it as a real charge.

## Feature Description

Make every accepted TableCards application user story executable and observable
through the hosted product on both desktop and phone layouts. Add a maintained
story-to-test matrix, complete the missing negative and role workflows, fix dead
or silent controls, and make public/application navigation lead to the expected
surface. Exercise the `$0 / $5 / $9 / $19` pricing contract through the Build 3
mock purchase/subscription boundary, including Studio seats and member
management.

## User Story

As a TableCards customer on desktop or phone,
I want every advertised action and navigation item to lead to a working,
understandable workflow,
so that Free, Event Pass, Planner Pro and Studio deliver exactly what the
pricing page promises.

## Problem Statement

The current browser suite is illustrative rather than exhaustive. Several
accepted workflows are covered only by backend tests, and some visible controls
have no user-observable completion state. The Playwright configuration also
runs both projects as desktop devices, so the full application is not presently
accepted on a real phone-sized WebKit viewport. This allows navigation, offer
copy, permission rendering and responsive regressions to escape even when unit
and integration tests pass.

## Solution Statement

Create scenario-level Playwright coverage organized around public creation,
Free/Event Pass, professional design/project management and Studio
collaboration. Run the complete story suite in desktop Chromium and mobile
WebKit, with unique deterministic personas and reusable auth/operator helpers.
Add explicit assertions for every PRD story, offer promise, navigation target
and visible control outcome. Repair product behavior as those tests expose it,
while keeping authorization server-side and keeping live billing out of Build
3.

## Metadata

- **Type**: Quality and product-completeness enhancement
- **Complexity**: High — hosted multi-person authentication, account-scoped
  product data, offer gates, file/PDF workflows, role changes and responsive UX
  all share state across BFF, TableCards Convex and the browser.
- **Systems Affected**: TableCards web routes and feedback states, TableCards
  hosted Playwright project, development offer projection, shared BFF account
  workflows, product/runbook documentation and current handoff.
- **Dependencies**: Existing development auth signing key, deployed BFF and
  TableCards Convex environments, Cloudflare development hosts, Playwright
  1.63, deterministic development AI and commerce.
- **Assumptions**: Desktop Chromium plus mobile WebKit are the mandatory full
  matrix; unit/integration tests continue to prove lower-level combinatorics;
  hosted tests may provision explicit Studio policy through the validated
  operator CLI; no live provider charge or production deployment is implied.

## Required Reading

- `docs/products/tablecards-application-prd.md:320` — offer/interface contract
  and US-01 through US-20.
- `docs/products/tablecards-mvp.md` — canonical `$0/$5/$9/$19` promises and
  Build 3 mock / Build 4 provider boundary.
- `projects/tablecards/e2e/src/hosted-development.spec.ts` — current hosted
  journeys and deterministic development login helper.
- `projects/tablecards/e2e/playwright.config.ts` — current desktop-only device
  matrix.
- `projects/tablecards/workloads/web/src/router.tsx` — public and authenticated
  page topology.
- `projects/tablecards/workloads/web/src/layouts/application-shell.tsx` —
  desktop and mobile navigation.
- `projects/tablecards/workloads/web/src/pages/landing-page.tsx` — pricing CTA
  contract.
- `projects/tablecards/workloads/web/src/pages/account-page.tsx` — Build 3
  development purchase/subscription selector and usage projection.
- `projects/tablecards/workloads/web/src/pages/team-page.tsx` — invitations,
  roles, removals and transfer controls.
- `projects/tablecards/workloads/web/src/app.tsx` — creator/import/save/export,
  responsive steps and unsaved-change behavior.
- `projects/tablecards/backend/convex/productAccess.ts` — authoritative offer
  projection and development commerce boundary.
- `docs/operations/build-3-tablecards.md` — deployment and hosted acceptance.

## Acceptance Coverage Contract

| Acceptance area | PRD stories | Mandatory browser evidence |
| --- | --- | --- |
| Public creation and auth return | US-01–04 | Landing CTAs/nav, pasted and spreadsheet import, complete preview, sign-in draft return, returning login to Projects |
| Project lifecycle and Free limits | US-05–08 | Account isolation, open/edit/save/export, duplicate/archive/restore, dirty-navigation guard, 25-card and active-project denials |
| Offers, designs and AI | US-09–12 | All four mock offers, exact limits/capabilities, Event Pass event-only upload, Planner/Studio reusable preset CRUD, four AI choices, balance decrement and failure release evidence |
| Accounts and teams | US-13–18 | Account switching, seat capacity, invite/copy/reissue/revoke, valid and invalid acceptance, Owner/Admin/Member action boundaries, removal, transfer with fresh auth |
| Responsive, accessible and navigation | US-19–20 | Every scenario in desktop Chromium and mobile WebKit, no page overflow, keyboard-reachable navigation/actions, focus/status/dialog labels, deep-link/refresh and route-error recovery |
| Pricing promise | all offers | `$0/$5/$9/$19`, card/project/design/upload/preset/AI/member promises match authoritative access and visible UI; paid CTAs never imply a live Build 3 charge |

Each accepted story must have at least one named hosted assertion in the
coverage registry. Backend-only evidence may supplement but cannot replace the
visible browser path for an advertised capability.

## Implementation Phases

### Phase 1 — Executable matrix and deterministic fixtures

1. Extract hosted login/operator/persona helpers from the monolithic spec into
   `projects/tablecards/e2e/src/support/` without changing security behavior.
2. Configure full-story projects as desktop Chromium and mobile WebKit. Keep
   viewport-specific geometry assertions data-driven rather than overriding
   the project device inside individual tests.
3. Add a typed US-01–US-20 coverage registry consumed by tests and documented
   in the e2e README; fail when a story has no declared scenario.
4. Add helpers for unique personas, offer selection, project creation,
   invitation setup, file fixtures and viewport overflow checks.

### Phase 2 — Public, navigation and project acceptance

1. Cover public header anchors, pricing CTAs, anonymous creator entry,
   long-name preview, pasted tabular mapping, CSV/XLSX upload and invalid input.
2. Cover authentication return with draft preservation and returning-user
   login to Projects.
3. Cover application navigation, deep links, browser refresh, mobile bottom
   navigation, selected-account route reset and unknown-route recovery.
4. Cover create/open/edit/save/export/download, dirty-navigation cancel/accept,
   duplicate, archive, restore, latest export and account isolation.
5. Verify exact Free card/project/premium/upload/preset/team denials and clear
   next steps.

### Phase 3 — Pricing, design and usage acceptance

1. Make development commerce visibly describe whether the chosen offer is
   Free, one-time Event Pass or a monthly mock subscription; expose the exact
   limits being tested and a deterministic confirmation state.
2. Verify all catalog prices and promises against effective BFF access after
   each mock selection.
3. Cover Event Pass event-only artwork without reusable presets.
4. Cover Planner Pro and Studio upload, AI four-choice generation, balance
   decrement, reusable preset create/use/edit/delete and denial when the offer
   changes.
5. Add deterministic failure injection only if the existing development AI
   provider cannot already prove reservation release without embedding a test
   backdoor in production behavior.

### Phase 4 — Studio collaboration acceptance

1. Cover five-seat policy, invitation link copy with visible success/failure,
   revoke/reissue and stale-link rejection.
2. Cover valid acceptance, wrong recipient and capacity-full outcomes without
   membership leakage.
3. Cover Owner, Admin and Member visible actions plus server denials after
   concurrent role/state changes.
4. Cover removal and ownership transfer through provider-neutral fresh auth,
   including the development dummy provider, final role swap and replay denial.
5. Create the recipient's second membership and prove account switching clears
   projects, designs, usage and team state before loading the selected account.

### Phase 5 — Control feedback and responsive repair

1. Audit every rendered `button`, `a`, form submit and menu item. Each must
   navigate, mutate with visible pending/success/error state, open a documented
   disclosure, or be disabled with an explanation.
2. Repair silent preset, clipboard, project and team actions; preserve bounded
   safe error copy and never log guest lists or invitation secrets.
3. Check every page at desktop and phone widths for horizontal overflow,
   obscured primary actions, sensible navigation order and correctly restored
   focus after dialogs/status changes.
4. Add focused Vitest/Convex tests for defects that are cheaper and less flaky
   below the browser layer.

### Phase 6 — Validation and development release

1. Run focused lint, typecheck, unit/integration suites and production web
   build.
2. Deploy BFF/Business Convex only when their code changes, then deploy the
   development gateway/web in dependency order.
3. Run the complete hosted desktop/mobile user-story suite against the deployed
   development URLs and inspect retained traces/screenshots for failures.
4. Run repository `pnpm check`, update the e2e README, Build 3 runbook and
   `STATUS.md` with exact evidence and remaining Build 4 live-payment work.
5. Commit and push to the existing feature branch/PR. Do not merge or deploy
   TableCards to production without separate authorization.

## Testing Strategy

- **Scenario granularity**: several cohesive journeys with shared setup, not
  one giant test and not one expensive browser setup per small assertion.
- **Required devices**: desktop Chromium (`1280×900`) and mobile WebKit (iPhone
  class). Every US-01–US-20 scenario runs in both unless it is a transport-only
  PDF byte assertion; any exception is recorded in the coverage registry.
- **Lower layers**: pure catalog/import/navigation decision tables in Vitest;
  entitlement/account isolation and negative authz in Convex/shared integration
  tests; visible workflow and responsive behavior in hosted Playwright.
- **No false payment claim**: the suite calls the development offer mock and
  verifies `development_mock`; live Paddle checkout/webhooks/failed provider
  renewal remain Build 4 acceptance.
- **Stability**: unique persona IDs, no shared mutable seeded project names,
  explicit state assertions instead of sleeps, one worker for hosted account
  lifecycle scenarios, and bounded polling only for asynchronous PDF/AI work.

## Definition of Done

- US-01 through US-20 each map to named, passing hosted evidence.
- The complete matrix passes on desktop Chromium and mobile WebKit against the
  deployed development environment.
- Every `$0/$5/$9/$19` promise is either visibly working and enforced or clearly
  labelled as Build 4 live-payment behavior; no CTA silently does nothing.
- Studio invitation, member, role, removal and ownership-transfer journeys work
  through the real shared BFF APIs.
- All visible controls have deterministic navigation or user feedback.
- Navigation is coherent on public, authenticated desktop and authenticated
  mobile surfaces, including deep links and account switching.
- Focused checks and `pnpm check` pass, development deployment and hosted smoke
  pass, docs/status are current, and production remains unchanged.

## Risks and Mitigations

- **Hosted suite duration/flakiness**: group assertions by persona journey,
  reuse setup within a test, use deterministic providers and avoid timing-only
  waits.
- **Cross-test state pollution**: create unique personas/accounts and explicit
  policies; never depend on ordering between tests.
- **Mobile browser differences**: use WebKit's phone device profile and avoid
  clipboard-only success assumptions by adding a tested fallback/status.
- **Overstating billing**: use “development mock” language throughout and keep
  Paddle/provider lifecycle in Build 4.
- **UI hiding authorization defects**: keep negative API/integration checks;
  hidden controls are not treated as enforcement.
- **Large Cartesian product**: full stories run at the two accepted device
  profiles, while numeric/input permutations remain at unit/integration layers.

## Documentation Updates

- `projects/tablecards/e2e/README.md` — device matrix, story coverage and run
  command.
- `docs/operations/build-3-tablecards.md` — complete hosted acceptance and
  deterministic commerce boundary.
- `docs/products/tablecards-application-prd.md` — only if implementation reveals
  an actual accepted-contract correction; do not rewrite settled product scope.
- `STATUS.md` — short outcome, deployment evidence and immediate remaining
  Build 4/production work.

## Execution Notes

- Live Paddle payment, webhooks, cancellation, failed renewal and production
  subscription remediation are not implementable evidence in Build 3. The
  development mock must prove the provider-independent result of those events;
  Build 4 must later rerun the same offer/entitlement acceptance against
  verified provider state.
- Production deployment is explicitly not authorized by the current branch/PR
  workflow. Development deployment is the completion boundary for this plan.

## Execution Result

Completed on 2026-09-28 against the accepted development boundary.

- Added an executable US-01–US-20 registry and five cohesive browser journeys
  for public creation/authentication, Free and Event Pass, Planner Pro/AI and
  Studio accounts/teams, plus CSV and retained focused regression cases.
- Deployed shared BFF development `compassionate-buffalo-689`, TableCards
  Convex `scrupulous-hawk-991` and web Worker
  `62a72afb-2f99-4ca1-9448-4ab319a4b5d0`.
- Applied TableCards customer-auth definition/configuration revision 4 with
  membership and ownership caps of two so the advertised Studio invitation
  and ownership-transfer paths are compatible.
- The uncached hosted gate passed all 19 cases in 4m37s: 13 desktop Chromium
  and 6 mobile WebKit. The Story registry has no uncovered accepted story.
- The complete Node 24 `pnpm check` gate passes, including formatting, lint,
  boundary verification, type checks, unit and integration tests, production
  builds, bundle assertions, secret scanning and the repository browser suites.
- The implementation pass corrected stale offer and project-list races,
  mobile creator-step restoration, project-scoped artwork enforcement,
  transfer cardinality and former-Owner role behavior, and silent action
  feedback uncovered by the journeys.
- `$5`, `$9/month` and `$19/month` are exercised only through the explicit
  no-charge development provider. Live Paddle checkout, verified webhooks,
  failed renewal and subscription remediation remain Build 4.
- Production was not changed.
