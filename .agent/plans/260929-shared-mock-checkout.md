# Feature: Shared BFF Mock Checkout

> **Status**: Completed
> **Created**: 2026-09-29
> **Last updated**: 2026-09-29
> **Repository baseline**: `8e0e0cb`
> **Source brainstorm**: None — direction supplied directly by the user on 2026-09-29
>
> Implementation plan based on the repository state inspected on 2026-09-29.
> Production deployment is not authorized by this plan.

## Repository Context Snapshot

Branch `feat/tablecards-application` and PR #1 are clean and pushed at
`8e0e0cb`. TableCards currently renders a development-only offer selector on
`/settings`; clicking it calls a TableCards Convex action which writes a BFF
development access grant. The hosted Studio E2E test separately uses the
operator CLI to enable five seats, invitations and Admin on its account before
testing Team. A real Studio customer therefore cannot discover the invite form
without an operator-only action, even though the pricing page promises it.

The shared customer surface already runs at `auth-dev.tofler.app` and
`auth.tofler.app`, has Business-aware presentation, and talks directly to BFF
through exact-origin CORS. BFF owns accounts, account policy and product access.
It has no checkout-attempt record or customer-facing checkout flow yet. Build 3
has no live charge. The user has now replaced the earlier product-local mock
with a BFF-owned dummy checkout: development and a future Build 3 production
demo use the shared mock page; Build 4 may offer Paddle or mock in development,
while production creation returns Paddle directly.

## Feature Description

Move the no-charge purchase simulation out of TableCards and behind one shared
BFF checkout handoff. TableCards chooses a code-owned offer and asks BFF to
start checkout. BFF returns an opaque shared checkout URL. The shared page
shows the Business branding, offer, price and explicit no-charge status; a
single-use completion atomically applies product access and compatible account
policy, then redirects to the registered Business origin. Studio completion
therefore exposes Team and the invite form without operator preparation.

## User Story

As a TableCards account Owner,
I want a plan action to take me to a Tofler-hosted payment page and return me to
my account with the purchased capabilities,
so that checkout behavior is provider-independent and Studio collaboration
works exactly as priced.

## Problem Statement

The product currently owns a fake payment screen and directly mutates access.
That leaks provider/testing mechanics into Business UI and gives no reusable
checkout seam. More importantly, the Studio E2E fixture enables shared account
policy out of band, so its invitation evidence does not represent a normal
customer journey.

## Solution Statement

Add a short-lived BFF checkout attempt bound to Business environment, account,
Owner, idempotency key, registered return URL, display metadata, product grant
and account-policy result. Add authenticated checkout creation to the server
SDK and public exact-origin challenge/complete/cancel endpoints for the shared
customer surface. Mock completion is the Build 3 authority and updates access
plus policy in one Convex transaction. TableCards exposes only plan choice and
redirects; it never renders or completes payment itself.

The create-checkout response is provider-neutral. Build 3 returns the shared
mock URL. Build 4 can return Paddle directly in production and let development
select mock or Paddle without changing TableCards.

## Metadata

- **Type**: Bug Fix and architecture correction
- **Complexity**: High — the change crosses contracts, SDK, BFF transactional
  state, shared UI, TableCards backend/UI, account policy and hosted E2E.
- **Systems Affected**: BFF contracts/service/schema/SDK/customer surface,
  TableCards Convex/web, hosted Playwright, architecture/product/runbook docs.
- **Dependencies**: Existing customer context JWT, customer-auth issuer,
  TableCards offer catalog and account-policy invariants. No payment provider.
- **Assumptions**: Build 3 mock completion charges nothing; only an account
  Owner may start it; checkout URLs expire and are single-use; TableCards
  production is not deployed in this task.

## Required Reading

### Codebase Files

- `projects/tablecards/workloads/web/src/pages/account-page.tsx:1` — current
  product-local mock selector to remove.
- `projects/tablecards/e2e/src/support/hosted.ts:195` — hidden Studio operator
  policy fixture and direct offer activation to remove.
- `projects/tablecards/backend/convex/productAccess.ts:294` — current direct
  development offer action and code-owned grant mapping.
- `platform/bff/service/convex/productAccess.ts:1` — access grant storage and
  monthly allocation rules.
- `platform/bff/service/convex/accounts.ts:238` — Owner-only policy update and
  downgrade-conflict invariants.
- `platform/bff/service/convex/schema.ts:1` — additive Convex schema pattern.
- `platform/bff/service/convex/lib/customerHttp.ts:220` — authenticated and
  exact customer-auth-origin HTTP/CORS patterns.
- `platform/bff/customer-auth/src/app.tsx:1` — Business-aware shared page.
- `platform/bff/libs/sdk/typescript/src/server/productAccess.ts:1` — bounded
  server-to-server BFF client pattern.
- `projects/tablecards/e2e/src/user-stories.spec.ts:280` — pricing and Studio
  browser journeys that must traverse the shared checkout.

### Internal Documentation

- `docs/products/tablecards-mvp.md` — accepted offers and revised Build 3/4
  boundary.
- `docs/products/tablecards-application-prd.md` — pricing and Team promises.
- `docs/architecture/adr/0001-convex-first-bff-stack.md` — provider adapter,
  idempotency and “redirect never grants” rules for real billing.
- `docs/architecture/shared-bff-data-model.md` — BFF ownership of product
  access and the current absence of payment records.

### External Documentation

None. This slice deliberately adds no live provider dependency; Paddle
documentation belongs to Build 4.

### New Files to Create

- `platform/bff/libs/contracts/src/checkout.ts` and test — versioned checkout
  request, challenge, result and error schemas.
- `platform/bff/service/convex/checkouts.ts` — indexed attempt lifecycle and
  atomic mock completion.
- `platform/bff/service/convex/lib/checkoutHttp.ts` — authenticated creation
  plus exact-origin public challenge/complete/cancel handlers.
- `platform/bff/service/convex/checkouts.test.ts` — authorization,
  idempotency, expiry, single-use, policy and downgrade tests.
- `platform/bff/libs/sdk/typescript/src/server/checkout.ts` and test — bounded
  server checkout client.
- `platform/bff/customer-auth/src/checkout.tsx` and tests — shared no-charge
  payment page.

## Codebase Context

### Existing Architecture and Integration Points

TableCards browser obtains a short account JWT, then TableCards Convex calls
BFF server-to-server. BFF verifies the account context and is authoritative for
both `accountAccessGrants` and account policy. The shared customer-auth origin
already equals the BFF signing issuer and is the only public origin accepted by
provider-completion endpoints. The new checkout page reuses this trust
topology; no Business cookie or context JWT is exposed to it.

### Patterns to Follow

- All Convex reads use named indexes and bounded `.unique()`, `.first()` or
  `.take()` paths; functions use object form with args and returns validators.
- Public URLs carry only high-entropy opaque references. Responses are
  no-store/no-referrer, and raw references never enter durable audit text.
- Errors expose bounded generic customer copy while tests assert precise
  internal denial codes.
- Browser checkout is scenario-tested through the hosted BFF page; finite
  transition and authorization cases stay in `convex-test`.

## Design Decisions

- **Decision**: BFF owns checkout attempts and the checkout page.
  - **Rationale**: Every Business gets one provider-independent handoff and
    TableCards stops knowing whether the implementation is mock or Paddle.
  - **Tradeoff**: Build 3 adds a small temporary checkout table before real
    provider transaction/subscription tables exist.
- **Decision**: The Business server supplies a validated code-owned offer
  snapshot when creating checkout; BFF stores it in the attempt.
  - **Rationale**: Build 3 avoids speculative global plan-registration tables
    while preventing the browser from inventing entitlements.
  - **Tradeoff**: Build 4 must replace this mock authority with registered
    provider mappings and verified events.
- **Decision**: Mock completion atomically applies access and account policy.
  - **Rationale**: Studio must immediately enable five seats, invitations and
    Admin without an operator fixture; failures cannot leave half-applied state.
  - **Tradeoff**: Downgrades that conflict with members/Admins/invitations are
    rejected rather than auto-remediated.
- **Decision**: Only Owner may create checkout; the public mock page is
  authorized by a single-use, expiring opaque reference. Checkout creation also
  requires an environment-specific Business server credential because the
  browser holds the ordinary account JWT and must not invent grant payloads.
  - **Rationale**: Billing/account-policy changes are Owner operations, while
    the shared page has no Business session cookie.
- **Decision**: Build 3 mock UI ships in the shared production bundle but is
  used only when BFF returns a mock checkout URL. Build 4 provider selection is
  entirely BFF-side.
  - **Rationale**: This matches the requested Build 3 demo and lets production
    switch to direct Paddle without a TableCards release.

## Implementation Plan

### Phase 1: Shared contract and transaction core

Add bounded checkout contracts, the additive attempt table, idempotent creation
and single-use completion/cancellation. Refactor existing access/policy writes
into reusable transaction helpers so completion is atomic.

### Phase 2: Shared BFF page and SDK

Expose authenticated server creation and exact-auth-origin public handlers.
Add the server SDK client and render the Business-aware mock page through the
existing customer-auth deployment.

### Phase 3: TableCards handoff and Team truth

Replace direct offer mutation with checkout creation/redirect, remove the
TableCards dummy selector, handle success/cancel return states, and make Studio
policy part of checkout completion. Remove operator policy setup from E2E.

### Phase 4: Testing, docs and development release

Verify transition/authorization matrices, shared UI, desktop/mobile handoff and
invite discoverability. Deploy BFF, TableCards and shared customer surface to
development in dependency order, run hosted acceptance, update durable docs,
then commit and push the feature branch. Production remains unchanged.

## Step-by-Step Tasks

### Task 1: CREATE checkout contracts and server SDK client

- **Implement**: Versioned create/challenge/complete/cancel schemas with offer
  display, grant, account policy, registered return URL and opaque reference;
  bounded fetch client returning a provider-neutral `checkoutUrl`.
- **Pattern**: `platform/bff/libs/contracts/src/productAccess.ts` and
  `platform/bff/libs/sdk/typescript/src/server/productAccess.ts`.
- **Gotchas**: Reject arbitrary origins, duplicate grant keys, invalid prices,
  oversized payloads and malformed references.
- **Validate**: `pnpm exec nx run bff-contracts:test && pnpm exec nx run bff-sdk-typescript:test`.

### Task 2: ADD BFF checkout persistence and atomic lifecycle

- **Implement**: Add indexed attempts; Owner-only idempotent creation; bounded
  challenge; atomic mock completion applying grant and policy; cancel/expiry
  transitions; cleanup retention.
- **Pattern**: `platform/bff/service/convex/loginTransactions.ts`,
  `productAccess.ts` and `accounts.ts`.
- **Gotchas**: Never allow redirect alone to grant access; reject replay,
  wrong account/environment and incompatible downgrade; keep exactly one
  active access grant.
- **Validate**: `pnpm exec nx run bff-service:test-integration`.

### Task 3: ADD shared checkout HTTP routes and page

- **Implement**: Authenticated create route; exact issuer-origin challenge,
  complete and cancel routes; `/checkout` rendering with product branding,
  price, no-charge disclosure, pending/success/error states and safe redirects.
- **Pattern**: `platform/bff/service/convex/lib/customerHttp.ts` and
  `platform/bff/customer-auth/src/app.tsx`.
- **Gotchas**: Production bundle may contain the mock page, but no provider
  credential or live charge; use no-store/no-referrer and generic errors.
- **Validate**: `pnpm exec nx run bff-customer-auth:test && pnpm exec nx run bff-customer-auth:assert-production-bundle`.

### Task 4: REPLACE TableCards product-local mock selection

- **Implement**: Add `startCheckout(offerId)` in TableCards backend with
  code-owned offer/account-policy mapping; remove `selectDevelopmentOffer` and
  the settings selector; auto-start a requested paid offer once after auth;
  show authoritative success/cancel result after return.
- **Pattern**: `projects/tablecards/backend/convex/productAccess.ts` and
  `projects/tablecards/workloads/web/src/pages/account-page.tsx`.
- **Gotchas**: Free remains the default; only paid offer IDs enter checkout;
  StrictMode must not create duplicate attempts; app reload must refresh policy.
- **Validate**: `pnpm exec nx run tablecards-backend:test-integration && pnpm exec nx run tablecards-web:test`.

### Task 5: REPAIR hosted pricing and Studio acceptance

- **Implement**: Make E2E complete the shared BFF mock page on desktop and
  mobile; remove `enableStudioAccountPolicy`; prove Studio returns with five
  seats and visible invitation form before invitation/role/transfer tests.
- **Pattern**: `projects/tablecards/e2e/src/user-stories.spec.ts`.
- **Gotchas**: No operator side door may prepare the Studio account; unique
  personas/attempts and single worker preserve determinism.
- **Validate**: `pnpm exec nx run tablecards-e2e:e2e-hosted-development` after deployment.

### Task 6: UPDATE canonical documentation and deploy development

- **Implement**: Revise Build 3/4 commerce boundary, shared data model, PRD,
  runbook, plan and `STATUS.md`; deploy BFF Convex, shared customer UI,
  TableCards Convex and TableCards web in dependency order; record versions.
- **Pattern**: `docs/operations/build-3-tablecards.md` and `STATUS.md`.
- **Gotchas**: Do not deploy production or claim verified payment.
- **Validate**: health probes, hosted suite and `pnpm check` under Node 24.

## Testing Strategy

### Unit Tests

Contract bounds; SDK request/response/error handling; shared checkout page
loading/completion/cancel/error rendering; TableCards return-state behavior.

### Integration Tests

Owner-only start, non-Owner denial, idempotent replay, invalid return origin,
expired/cancelled/completed replay, Studio atomic grant/policy, failed downgrade
with members/Admins/invitations, and cleanup.

### End-to-End Validation

Both desktop Chromium and mobile WebKit traverse pricing → authentication when
needed → shared BFF mock page → TableCards Account. Studio then shows Team and
creates an invitation without operator policy setup.

### Edge Cases

- Double-click/reload creates or completes no duplicate checkout.
- Cancel returns without changing access or account policy.
- Expired or reused references cannot change access.
- Conflicting downgrade leaves both access and policy unchanged.
- Shared page network/server failure never claims success.

## Validation Commands

Run from `/root/projects/bff` with the repository's Node 24 wrapper.

```bash
pnpm --package=node@24 dlx sh -c 'pnpm exec nx run bff-contracts:test'
pnpm --package=node@24 dlx sh -c 'pnpm exec nx run bff-sdk-typescript:test'
pnpm --package=node@24 dlx sh -c 'pnpm exec nx run bff-service:test-integration'
pnpm --package=node@24 dlx sh -c 'pnpm exec nx run bff-customer-auth:test'
pnpm --package=node@24 dlx sh -c 'pnpm exec nx run tablecards-backend:test-integration'
pnpm --package=node@24 dlx sh -c 'pnpm exec nx run tablecards-web:test'
pnpm --package=node@24 dlx sh -c 'pnpm exec nx run tablecards-e2e:e2e-hosted-development'
pnpm --package=node@24 dlx sh -c 'pnpm check'
```

## Acceptance Criteria

- [x] TableCards contains no dummy payment selector or offer-mutating button.
- [x] Paid CTAs redirect through a Business-aware BFF checkout page.
- [x] The mock page says no charge and redirects safely on complete/cancel.
- [x] Only Owner can start; attempts are idempotent, expiring and single-use.
- [x] Studio completion atomically grants the offer and five-seat/invite/Admin
      policy; Team exposes the invite form without operator setup.
- [x] Desktop and mobile hosted flows prove paid offers and Studio membership.
- [x] Build 4 can replace the returned URL/provider without TableCards changes.
- [x] Documentation clearly distinguishes mock completion from verified money.
- [x] Required tests and repository gates pass; development is deployed.
- [x] Production remains unchanged.

## Risks and Mitigations

- **Risk**: A mock completion becomes mistaken for real billing authority.
  - **Mitigation**: Store source `development_mock`, use explicit no-charge UI,
    and require Build 4 verified provider state before source `provider`.
- **Risk**: Account policy and access diverge.
  - **Mitigation**: Apply both in one Convex mutation with conflict checks.
- **Risk**: Public checkout URLs leak.
  - **Mitigation**: High-entropy references, short expiry, single-use state,
    no-referrer headers and no guest/payment data in the URL.
- **Risk**: Future Paddle forces another Business UI rewrite.
  - **Mitigation**: Provider-neutral create response; BFF alone selects mock
    page versus Paddle URL.

## Open Questions

None. Paddle credentials, checkout APIs, webhooks and provider selection UI are
explicit Build 4 work.

## Notes

This plan intentionally supersedes the earlier statement that Build 3 mock
controls are product-local and development-only. It does not authorize a live
charge or a production deployment.

## Document History

| Date       | Status                         | Change                                                                                                                                                                                    |
| ---------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-29 | Approved — execution requested | Initial implementation-ready plan created from the user's explicit shared-checkout correction.                                                                                            |
| 2026-09-29 | Completed                      | Implemented the provider-neutral BFF checkout, deployed development, passed the Node 24 repository gate and all 19 hosted desktop/mobile acceptance cases, and left production unchanged. |
