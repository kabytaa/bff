# Business Factory — TableCards MVP-to-Launch Plan

Updated: 2026-09-21.

This is the current delivery view for the first Business Factory product. The broader platform intent remains in [Business Factory — BFF MVP Architecture](../architecture/bff-mvp-architecture.md); [ADR 0001](../architecture/adr/0001-convex-first-bff-stack.md) governs the current stack. Nirvana is the live task-status source, while this document explains the grouping and acceptance boundary.

## Current task system

Nirvana was reorganized and read back on 2026-09-21:

- There is one active project: **Business Factory — TableCards MVP to Launch**.
- It contains nine open actions, all in Next: five **[BUILD — Codex]** phases and four **[BLOCKER — Andrew]** groups.
- Focus contains only the current three actions: Build 1, Andrew blocker 1 and Andrew blocker 2.
- Completed repository setup remains in the project's Logbook.
- The former separate Manual, Codex and Post-MVP projects were moved to Trash after their useful work was consolidated. Nirvana Trash is recoverable until the user empties it.

Task prefixes keep work visually separated without creating multiple projects:

- **[BUILD — Codex]** means implementation, technical configuration, automated verification and runbooks.
- **[BLOCKER — Andrew]** means a business decision, provider-owner action, approval, physical check or real-world launch action that Codex cannot complete alone.

Do not put credentials, identity documents or payment details in Nirvana, chat or git. Use the chosen provider connection or secret store.

## Product and scope

The working first product is **TableCards**: paste guest names and optional table numbers, preview place cards, and unlock a correctly sized printable PDF for one event. The first buyer hypothesis is a repeat event professional such as a planner, venue or print shop. Demand and the proposed $19 price are unvalidated hypotheses, not research findings.

The smallest launch scope is:

- Pasted names and optional table numbers, preserving spelling, order and duplicates.
- One fixed folded-card format, one initial page size and two bundled typography choices.
- Preview of every card before payment.
- PDF export with cut/fold marks and a scale-check sheet.
- Explicit handling of long names and unsupported characters.
- One-time event unlock with corrections and repeat downloads for that event.
- Google login, in-product feedback/support, minimal operator handling and a public contact path.

Not in the first launch: CSV import, uploaded artwork, arbitrary dimensions, seating planning, print fulfillment, subscriptions, Apple login, transactional email, PostHog, advanced reporting, AI support automation or a second product.

## Delivery rules

- Add data models and API surface only when the active implementation slice uses them.
- Break down a grouped action only when work begins; do not turn the project into a speculative backlog.
- Hosted provider setup must not block local work that can be implemented and tested without credentials.
- Every feature slice must be self-verifiable with real validation commands.
- Keep browser regression small and valuable: automate the important happy flows and expensive regressions. Put edge cases, authorization denials and webhook replay cases in faster unit or integration tests.
- Product code consumes the public BFF API/SDK, not Convex implementation internals.

## Execution order

1. Codex starts Build 1. In parallel, Andrew fixes the pilot output contract and starts Paddle onboarding.
2. Codex builds shared auth/support and the deterministic TableCards core. Andrew's hosted account task becomes actionable when exact domains and OAuth callback URLs exist.
3. Codex adds the one-time paid entitlement and minimal operator view. Paddle fixtures keep regression independent of live charges.
4. Codex deploys and runs the automated happy path. Andrew then completes the offer/support review, physical ruler check, live acceptance and first outreach.

## Grouped launch tasks

| # | Nirvana action | Owner | Focus now | Main dependency |
| --- | --- | --- | --- | --- |
| Build 1 | Foundation: workspace, Convex BFF, contracts and test harness | Codex | Yes | None |
| Build 2 | Shared MVP: Google auth, accounts, support and SDK | Codex | No | Build 1; production OAuth later needs Andrew 3 |
| Build 3 | TableCards core: paste list, preview and verified PDF | Codex | No | Build 1; use Andrew 1 decisions when available |
| Build 4 | Paid flow: Paddle unlock, entitlement and minimal operations | Codex | No | Builds 1–3; hosted checks need Andrew 2 |
| Build 5 | Deploy, run happy-path regression and prepare launch | Codex | No | Builds 1–4 and relevant provider access |
| Andrew 1 | Decide the TableCards pilot specifics | Andrew | Yes | None |
| Andrew 2 | Start Paddle seller onboarding | Andrew | Yes | None; final review needs the real site |
| Andrew 3 | Provide launch accounts, domain and Google OAuth | Andrew | No | Exact domain/callback values from Codex |
| Andrew 4 | Approve the offer, support channel and live launch | Andrew | No | Production candidate and Paddle approval |

### Build 1 — Foundation

Create the Nx workspace, ownership boundaries, minimal Convex BFF service and project registry. Define only the contracts and tables used by the first implemented flow. Establish typecheck, lint, unit/integration testing, Playwright infrastructure, deterministic test data and baseline CI.

Done when the repository runs locally, the BFF health/project path works, validation commands are documented and there are no speculative tables or placeholder SDK modules.

### Build 2 — Shared MVP

Add Better Auth in the BFF Convex deployment with Google as the only login provider. Implement only the account and membership shapes TableCards uses. Add support/feedback submission and status, an operator queue/response, and the corresponding thin typed SDK paths. Verify authorization boundaries and the support lifecycle.

Done when a Google-authenticated user can submit an issue or feedback and Andrew can review and respond from the minimal backoffice. Apple, Resend and PostHog are not prerequisites.

### Build 3 — TableCards core

Implement pasted guest data, preview, the fixed print layout and deterministic PDF generation. Preserve exact guest multiplicity. Validate font coverage and fitting before payment. Include cut/fold marks and a scale-check page.

The core regression fixture includes duplicate names, accents and long names. Automated checks verify exact guest multiplicity, page size/count and absence of clipped text. One physical sheet must still be printed at 100% and measured before the output is called verified.

### Build 4 — Paid flow and operations

Implement a Paddle one-time event unlock, server-side entitlement enforcement, verified idempotent webhooks and minimal purchase/acquisition events. Allow corrections and repeat downloads for the purchased event. Add only the operator views needed for projects, users, purchases, entitlements and support.

Signed payment fixtures must let the full happy path run without a live charge. Done means an unpaid user cannot fetch the paid PDF, a verified purchase unlocks it exactly once and webhook replays are harmless.

### Build 5 — Deployment and launch preparation

Configure environments, secrets, Cloudflare deployment, domains, CI, basic health/error monitoring, rollback and recovery notes. Run the focused browser regression:

1. Sign in.
2. Create a representative guest list.
3. Preview all cards.
4. Complete fixture or sandbox payment.
5. Download the entitled PDF.
6. Submit support/feedback.
7. Review and respond in the backoffice.

Run provider-specific sandbox/live smoke checks separately. Done when automated validation passes, the production flow is reachable and Andrew has a concise final acceptance checklist.

## Andrew's blocker groups

### Andrew 1 — Pilot specifics

Choose two or three reachable repeat buyers, the single initial paper/page and folded-card format, required writing systems, and the working product/domain name. Define the evidence that counts as validation: a real target buyer willing to try or pay after seeing existing alternatives.

### Andrew 2 — Paddle onboarding

Create or confirm the seller account, finish business/identity/payout verification and enable sandbox access. Submit the real product/domain and required policy pages for production review when the site exists. The first offer is a one-time digital software purchase; no subscription setup is needed.

### Andrew 3 — Accounts, domain and OAuth

Confirm the existing Convex login can create a separate Business Factory project, choose or buy the product domain, and provide Cloudflare/DNS access. After Codex provides exact callback URLs, create/select the Google Cloud project, configure consent/branding and create the web OAuth client.

Do not pre-create Apple, PostHog, Resend or Sentry accounts. TableCards needs no AI, scanner, browser-worker, printing or email-delivery provider for its initial scope.

### Andrew 4 — Offer, support and live launch

Approve price, refund promise, terms/privacy copy, product claims and a monitored support address. Print the scale-check page at 100%, measure it with a ruler, and complete one real production sign-in, purchase, export and support submission. Then bring the first real pilot traffic from the selected buyers.

## Launch acceptance

The launch gate is satisfied when:

- TableCards is deployed with the fixed, honestly described output contract.
- Google login and project/account isolation work in production.
- Payment webhooks and server-side entitlements protect the paid download.
- The deterministic PDF checks and focused happy-path regression pass.
- A user can submit feedback or a problem and Andrew can review/respond.
- A public support contact works for users who cannot sign in.
- Andrew approves the offer, verifies physical print scale, completes the live flow and deliberately sends real prospects to it.

Post-launch validation review, advanced integrations, platform hardening, a reusable factory skill and a technically different second-project proof are intentionally parked. They are not blockers for shipping the first product.
