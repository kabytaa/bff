# Business Factory — TableCards MVP-to-Launch Plan

Updated: 2026-09-24.

This is the current delivery view for the first Business Factory product. The [TableCards MVP product specification](../products/tablecards-mvp.md) is the canonical product scope. The broader platform intent remains in [Business Factory — BFF MVP Architecture](../architecture/bff-mvp-architecture.md); [ADR 0001](../architecture/adr/0001-convex-first-bff-stack.md) governs the current stack.

## Task-system boundary

Repository plans and the active conversation govern Codex work. Nirvana is only Andrew's short personal blocker list for actions that truly require him at a computer or in the physical world, such as provider identity verification, entering credentials, buying a domain or measuring a printed sheet.

Do not add Codex implementation work, discussion topics, reviews, choices or approvals that can be resolved in conversation to Nirvana. When either route works, resolve the item in conversation. Do not put credentials, identity documents or payment details in Nirvana, chat or git; use the chosen provider connection or secret store.

## Product and scope

The working first product is **TableCards**: an authenticated user pastes names or uploads a CSV, previews a fixed folded-card layout and downloads a correctly sized printable PDF. The first buyer hypothesis is an independent event planner or small planning studio. Demand and all prices are unvalidated hypotheses, not research findings.

The smallest launch scope is:

- Pasted or CSV names and optional table numbers, preserving spelling, order and duplicates.
- One 3.5 × 2 inch folded tent-card format, four per US Letter sheet, with three free predefined designs and a premium library.
- Preview of every card before export.
- PDF export with cut/fold marks and a scale-check sheet.
- Explicit handling of long names and unsupported characters.
- Free, Personal Pro and Studio plans; paid plans add premium/custom reusable designs and Studio adds a shared workspace for up to 20 members.
- Required Google login through a provider-neutral identity model, in-product feedback/support, minimal operator handling and a public contact path.

Not in the first launch: arbitrary dimensions, A4/flat-card output, RTL scripts, seating planning, guest-list management, meal/caterer workflows, print fulfillment, per-seat billing, domain joining, Apple login, generic marketing automation, advanced reporting, AI support automation or a second product.

## Delivery rules

- Add data models and API surface only when the active implementation slice uses them.
- Break down a grouped action only when work begins; do not turn the project into a speculative backlog.
- Hosted provider setup must not block local work that can be implemented and tested without credentials.
- Every feature slice must be self-verifiable with real validation commands.
- Keep browser regression small and valuable: automate the important happy flows and expensive regressions. Put edge cases, authorization denials and webhook replay cases in faster unit or integration tests.
- Product code consumes the public BFF API/SDK, not Convex implementation internals.

## Execution order

1. Codex starts Build 1. In parallel, Andrew can begin Paddle onboarding.
2. Codex builds provider-neutral auth/support and the deterministic TableCards core. Production OAuth becomes actionable when exact domains and callback URLs exist.
3. Codex adds subscriptions, plan entitlements, Studio membership and the minimal operator view. Paddle fixtures keep regression independent of live charges.
4. Codex deploys and runs the automated happy path. Andrew then completes the physical ruler check, provider verification, live acceptance and first outreach.

## Grouped launch tasks

| # | Work group | Owner | Main dependency |
| --- | --- | --- | --- |
| Build 1 | Foundation: workspace, Convex BFF, contracts and test harness | Codex | None |
| Build 2 | Shared MVP: Google auth, accounts, support and SDK | Codex | Build 1; production OAuth later needs provider access |
| Build 3 | TableCards core: list/CSV, designs, preview and verified PDF | Codex | Build 1 and the accepted product specification |
| Build 4 | Paid/team flow: Paddle subscriptions, entitlements, membership and minimal operations | Codex | Builds 1–3; hosted checks need Paddle access |
| Build 5 | Deploy, run happy-path regression and prepare launch | Codex | Builds 1–4 and relevant provider access |
| Human blockers | Provider onboarding, domain/credentials, physical print check and live acceptance | Andrew | Activated only when Codex cannot complete the action |

### Build 1 — Foundation

Create the Nx workspace, ownership boundaries, minimal Convex BFF service and operator-managed `businessEnvironments` registry. Add the repository-owned operator CLI and a hosted, phone-friendly, read-only backoffice protected by direct Google OIDC plus a fixed server-side operator allowlist. Define only the contracts and table used by this flow. Establish typecheck, lint, unit/Convex integration testing, a deterministic Playwright dashboard flow, secret scanning and baseline GitHub Actions CI.

The required local gate is done when the repository runs without provider accounts, the public health and internal Business-environment paths work, auth denial/allow tests pass, the dashboard browser test passes and validation commands are documented. Hosted verification follows only after Andrew authorizes one Convex development deployment, Cloudflare site and public Google web client. No speculative tables, TableCards code or placeholder SDK modules belong in Build 1.

### Build 2 — Shared MVP

Choose the current supported Business-user authentication mechanism and enable Google as the only MVP provider. Keep provider-qualified technical identities private to BFF auth and create a distinct local user row in each Business environment the person accesses. Implement only the account and membership shapes TableCards uses, with short-lived environment-bound user credentials. Add support/feedback submission and status, an operator queue/response, and the corresponding thin typed SDK paths. Verify authorization, cross-environment denial and the support lifecycle.

Done when a Google-authenticated user can submit an issue or feedback and Andrew can review and respond from the minimal backoffice. Apple, Resend and PostHog are not prerequisites.

### Build 3 — TableCards core

Implement pasted/CSV guest data, predefined designs, paid custom background presets, preview, the fixed print layout and deterministic PDF generation. Preserve exact guest multiplicity. Validate image resolution, font coverage and fitting before export. Include cut/fold marks and a scale-check page.

The core regression fixture includes duplicate names, accents and long names. Automated checks verify exact guest multiplicity, page size/count and absence of clipped text. One physical sheet must still be printed at 100% and measured before the output is called verified.

### Build 4 — Paid/team flow and operations

Implement Paddle subscriptions for Personal Pro and Studio, server-side plan entitlements, verified idempotent webhooks and minimal purchase/acquisition events. Add Studio invitations, the 20-seat limit, shared design presets and only the operator views needed for projects, users, subscriptions, entitlements, memberships and support.

Signed payment fixtures must let the full happy path run without a live charge. Done means Free cannot use paid design capabilities, verified subscriptions produce the correct entitlements, cancellation/status changes are handled, seat and role rules are enforced and webhook replays are harmless.

### Build 5 — Deployment and launch preparation

Configure environments, secrets, Cloudflare deployment, domains, CI, basic health/error monitoring, rollback and recovery notes. Run the focused browser regression:

1. Sign in.
2. Create a representative guest list.
3. Preview all cards.
4. Download the permitted Free PDF.
5. Complete fixture or sandbox subscription and use a paid design capability.
6. Exercise Studio membership when that slice is implemented.
7. Submit support/feedback.
8. Review and respond in the backoffice.

Run provider-specific sandbox/live smoke checks separately. Done when automated validation passes, the production flow is reachable and Andrew has a concise final acceptance checklist.

## Human blocker groups

These are candidates for Andrew's short Nirvana list only when they become actionable. Reviews and decisions that can be completed in conversation stay here.

### Paddle onboarding

Create or confirm the seller account, finish business/identity/payout verification and enable sandbox access. Submit the real product/domain and required policy pages for production review when the site exists. Configure the accepted monthly and annual subscription offers only after the implementation identifies the exact required Paddle resources.

### Accounts, domain and OAuth

Confirm the existing Convex login can create a separate Business Factory project, choose or buy the product domain, and provide Cloudflare/DNS access. After Codex provides exact callback URLs, create/select the Google Cloud project, configure consent/branding and create the web OAuth client.

Do not pre-create Apple, PostHog, Resend or Sentry accounts. TableCards needs no AI, scanner, browser-worker, printing or email-delivery provider for its initial scope.

### Physical and live launch checks

Provide a monitored support address. Print the scale-check page at 100%, measure it with a ruler, and complete one real production sign-in, subscription, export and support submission. Then bring the first real pilot traffic from selected buyers. Offer, policy and product-claim reviews happen in conversation rather than becoming Nirvana tasks.

## Launch acceptance

The launch gate is satisfied when:

- TableCards is deployed with the fixed, honestly described output contract.
- Google login and project/account isolation work in production.
- Subscription webhooks and server-side entitlements protect paid designs and collaboration.
- The deterministic PDF checks and focused happy-path regression pass.
- A user can submit feedback or a problem and Andrew can review/respond.
- A public support contact works for users who cannot sign in.
- Andrew verifies physical print scale, completes the live flow and deliberately sends real prospects to it.

Post-launch validation review, advanced integrations, platform hardening, a reusable factory skill and a technically different second-project proof are intentionally parked. They are not blockers for shipping the first product.
