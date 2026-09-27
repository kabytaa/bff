# Business Factory — TableCards MVP-to-Launch Plan

Updated: 2026-09-27.

This is the current delivery view for the first Business Factory product. The [TableCards MVP product specification](../products/tablecards-mvp.md) is the canonical product scope. The broader platform intent remains in [Business Factory — BFF MVP Architecture](../architecture/bff-mvp-architecture.md); [ADR 0001](../architecture/adr/0001-convex-first-bff-stack.md) governs the current stack.

## Task-system boundary

Repository plans and the active conversation govern Codex work. Nirvana is only Andrew's short personal blocker list for actions that truly require him at a computer or in the physical world, such as provider identity verification, entering credentials, buying a domain or measuring a printed sheet.

Do not add Codex implementation work, discussion topics, reviews, choices or approvals that can be resolved in conversation to Nirvana. When either route works, resolve the item in conversation. Do not put credentials, identity documents or payment details in Nirvana, chat or git; use the chosen provider connection or secret store.

## Product and scope

The working first product is **TableCards**: a visitor pastes or uploads a guest list, previews a fixed folded-card layout and, after authentication, saves or downloads a correctly sized printable PDF. Occasional hosts use a one-time Event Pass; the repeat-buyer hypothesis is an independent event planner or small planning studio. Demand and all prices remain unvalidated hypotheses.

The smallest launch scope is:

- Pasted lines/grids, CSV or XLSX with required names, optional table numbers and one optional short marker, preserving spelling, order and duplicates.
- One 3.5 × 2 inch folded tent-card format, four per US Letter sheet, with three free predefined designs and a premium library.
- Preview of every card before export.
- PDF export with cut/fold marks and a scale-check sheet.
- Explicit handling of long names and unsupported characters.
- Free 25, a `$5` Event Pass, `$9/month` Planner Pro and `$19/month` five-member Studio; no annual offer in the MVP. Paid offers add larger projects, premium/custom designs, bounded optional AI batches and reusable/team workflow.
- Public import/preview followed by required Google login for save, export, AI generation or payment, plus an email-capable in-product support conversation, operator handling and a public contact path.

Not in the first launch: arbitrary dimensions, A4/flat-card output, RTL scripts, seating planning, direct Google Sheets integration, general guest-list management, structured meal/caterer workflows, print fulfillment, annual or per-seat billing, domain joining, Apple login, generic marketing automation, advanced reporting, AI support automation or a second product.

## Delivery rules

- Add data models and API surface only when the active implementation slice uses them.
- Break down a grouped action only when work begins; do not turn the project into a speculative backlog.
- Hosted provider setup must not block local work that can be implemented and tested without credentials.
- Every feature slice must be self-verifiable with real validation commands.
- Keep browser regression small and valuable: automate the important happy flows and expensive regressions. Put edge cases, authorization denials and webhook replay cases in faster unit or integration tests.
- Product code consumes the public BFF API/SDK, not Convex implementation internals.
- Treat a slice intended for production as complete only after its production deployment and production smoke pass; local and development verification are readiness gates.

## Execution order

1. Codex starts Build 1. In parallel, Andrew can begin Paddle onboarding.
2. Codex builds provider-neutral auth/accounts and the deterministic TableCards core. Production OAuth becomes actionable when exact domains and callback URLs exist.
3. Codex adds the one-time Event Pass, subscriptions, plan entitlements, Studio membership and the minimal operator view. Paddle fixtures keep regression independent of live charges.
4. Codex adds the separate customer-support conversation slice with outbound and inbound email replies.
5. Codex adds focused product/business analytics, actionable monitoring and the usable operator backoffice needed to run the MVP.
6. Codex deploys and runs the automated happy path. Andrew then completes the physical ruler check, provider verification, live acceptance and first outreach.

## Grouped launch tasks

| #              | Work group                                                                        | Owner  | Main dependency                                                         |
| -------------- | --------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------- |
| Build 1        | Foundation: workspace, Convex BFF, contracts and test harness                     | Codex  | None                                                                    |
| Build 2        | Shared identity: Google auth, accounts and SDK                                    | Codex  | Build 1; production OAuth later needs provider access                   |
| Build 3        | TableCards core: import, designs/AI, preview, verified PDF and payment mock       | Codex  | Builds 1–2 and the accepted product specification                       |
| Build 4        | Paid/team flow: Paddle Event Pass/subscriptions, entitlements and membership      | Codex  | Builds 1–3; hosted checks need confirmed Paddle access/terms            |
| Build 5        | Customer support: case conversation, email replies and operator workflow          | Codex  | Builds 2 and 4; hosted checks need the selected email/helpdesk provider |
| Build 6        | Operational visibility: analytics, monitoring and usable backoffice               | Codex  | Builds 3–5                                                              |
| Build 7        | Deploy, run happy-path regression and prepare launch                              | Codex  | Builds 1–6 and relevant provider access                                 |
| Human blockers | Provider onboarding, domain/credentials, physical print check and live acceptance | Andrew | Activated only when Codex cannot complete the action                    |

### Build 1 — Foundation

**Status: Completed 2026-09-26.** The reviewed implementation is live in development and production; automated validation/deployment/smoke and the real operator sign-in passed.

Create the Nx workspace, ownership boundaries, minimal Convex BFF service and operator-managed `businessEnvironments` registry. Add the repository-owned operator CLI and a hosted, phone-friendly, read-only backoffice protected by direct Google OIDC plus a fixed server-side operator allowlist. Define only the contracts and table used by this flow. Establish typecheck, lint, unit/Convex integration testing, a deterministic Playwright dashboard flow, secret scanning and baseline GitHub Actions CI.

The required local gate is done when the repository runs without provider accounts, the public health and internal Business-environment paths work, auth denial/allow tests pass, the dashboard browser test passes and validation commands are documented. Hosted development verification follows only after Andrew authorizes one Convex development deployment, Cloudflare site and public Google web client. Build 1 is complete only when the reviewed `main` commit passes GitHub validation, automatically deploys the separate production Convex backend and `ops.tofler.tech` dashboard, passes production smoke and Andrew confirms one real production Google sign-in. No speculative tables, TableCards code or placeholder SDK modules belong in Build 1.

### Build 2 — Shared identity, accounts and SDK

**Status: Completed 2026-09-27.** The reviewed shared identity/account implementation is live in development and production; automated validation/deployment/smoke and Andrew's complete real Safari lifecycle plus backoffice confirmation passed.

Choose the current supported Business-user authentication mechanism and enable Google as the only production MVP provider. Keep provider-qualified technical identities private to BFF auth and create a distinct local user row in each Business environment the person accesses. Implement the accepted configurable account/membership boundary, fixed Owner/Admin/Member roles, invitations, provider-neutral ownership transfer/reauthentication and thin typed SDK paths, with a stable centrally revocable Business session, short-lived environment/account-bound JWTs and the retained minimal example Business. Verify signup/onboarding policies, authorization, renewal, independent tab account selection, concurrent/replayed login denials, cross-environment isolation and the development-only automated identity path. Do not add paid-plan/subscription tables, product-entitlement evaluation or restricted-account guards before Build 4 has their first real caller.

Development readiness requires the hosted example to create or reuse an authenticated environment user/account, exercise protected Business backend access, select account context when multiple memberships exist and appear correctly in the development backoffice. Repeatable automation uses the development-only provider. Build 2 is complete only after the reviewed commit deploys BFF/auth and the non-promoted production example at `example.tofler.app`, production smoke passes with no automation provider/configuration present and Andrew uses real Safari to verify Google login, protected access, hard reload, renewal after the first ten-minute JWT expires, a second tab, logout preventing both tabs from minting again and the corresponding production-backoffice records. Support is not part of this build. Apple, email delivery and PostHog are not prerequisites.

### Build 3 — TableCards core

Implement pre-auth pasted-line/grid, CSV and XLSX guest import with required name, optional table and optional short marker; predefined designs; paid uploaded-artwork presets; complete preview; the fixed print layout; and deterministic PDF generation. Preserve exact guest multiplicity. Validate image resolution, font coverage and fitting before export. Include cut/fold marks and a scale-check page. Require authentication for save/export/AI/payment, not for import and preview.

Implement the accepted Free 25, one-event/500-card Event Pass, 25-active-project Planner Pro and 100-active-project Studio boundaries through a deterministic test/development payment mock. It must drive the same application-facing entitlement contract later used by real billing, support repeatable positive and denial tests without a live charge and give production visitors no self-grant path. Do not add Paddle checkout, provider products, webhooks or subscription lifecycle in this build.

After deterministic predefined-design export works, add optional AI backgrounds using a benchmarked cost-efficient model. One typed account-owned unit reservation produces four choices; success commits the unit and provider failure releases it idempotently. Exercise the accepted lifetime/event/monthly allowances without putting mutable balances in JWTs or sending guest-list data to the provider. Ordinary predefined/uploaded designs and PDF export must remain usable when AI is unavailable.

The core regression fixture includes duplicate names, accents and long names. Automated checks verify exact guest multiplicity, page size/count and absence of clipped text. One physical sheet must still be printed at 100% and measured before the output is called verified.

### Build 4 — Paid/team flow and operations

After Paddle confirms the Israeli seller/payout and sub-`$10` one-time/recurring terms in writing, replace the Build 3 payment mock with a Paddle Event Pass plus Planner Pro and Studio subscriptions, server-side entitlements, verified idempotent webhooks and minimal purchase/acquisition events while preserving the application-facing contract. Configure the shared account machinery for Studio invitations and its five-seat limit, add shared design presets and add only the operator views needed for projects, users, purchases, subscriptions, entitlements and memberships. Do not add annual billing.

Signed payment fixtures must let the full happy path run without a live charge. A requested downgrade is rejected until the account satisfies the target plan's limits. An unavoidable expiration or payment failure preserves users, memberships and data, restricts ordinary product access and keeps Owner/Admin remediation access so they can restore payment or reduce usage; it never removes members automatically. Done means Free cannot export over 25 cards or use paid design capabilities, Event Pass grants exactly one 90-day event, verified subscriptions produce the correct project/AI/team entitlements, cancellation/status changes and the accepted 30-day access plus 60-day deletion-warning lifecycle are handled, seat and role rules are enforced and webhook replays are harmless.

### Build 5 — Customer support conversation

Add the required support capability as its own implementation slice rather than expanding Build 2. Signed-in users can start `feedback`, `problem` or `question` cases with trusted environment/user/account context. Andrew can review and respond through the operator workflow. Replies are delivered by email, and customer replies from email or the product join the same conversation. Provide a monitored public support path for people who cannot sign in.

Select the concrete BFF-owned email bridge or helpdesk integration only after its focused design discussion. Finance-related cases may show bounded account/subscription/payment-status context, but support messages never authorize refunds, billing changes or credential disclosure. Done means the signed-in and public paths work, outbound delivery and inbound reply correlation are verified, spoofed/cross-environment replies are denied and the complete conversation is visible to the appropriate user and operator.

### Build 6 — Analytics, monitoring and usable backoffice

Add the minimum operational visibility required to understand and run TableCards. Define a small, versioned set of canonical business events covering acquisition, signup, activation, PDF export, checkout, subscription state and support outcomes. Preserve UTM/referrer attribution from anonymous visit through user/account/payment where available. Add only product events that answer an explicit launch question; do not build generic clickstream collection or a replacement for a dedicated analytics provider. Never send guest-list/card contents, credentials, payment details or other unnecessary personal data in analytics payloads.

Add privacy-bounded health and error monitoring for the public product, BFF, PDF generation, Paddle webhooks and support-email delivery. Monitoring must include deployed version/environment context, correlation IDs, credential/PII redaction, sampling, retention and spend limits. Expected authentication denials and rate limits are not errors. Alerts must be actionable and intentionally few: production or health-check failure, sustained unexpected error rate, and failed/stalled payment or support delivery that requires operator attention. Choose the smallest suitable provider arrangement during this build; PostHog, Sentry or alternatives are options, not preselected requirements.

Turn the existing read-oriented backoffice into a usable daily operator surface. It should provide:

- an environment-aware overview of deployed version/health, unresolved failures, open support cases, recent signups, activations, paid accounts and successful exports;
- global search by safe customer email, public user/account/project ID, payment reference or support case, with direct links to a joined customer/account view;
- customer and account detail showing membership/role, session state, plan/subscription/entitlements, recent projects/exports, support history and a chronological audit/activity timeline;
- focused queues for support, failed or delayed webhooks/email/jobs and accounts needing billing remediation, with status, age, owner and correlation evidence;
- basic acquisition and conversion views for visit → signup → activation → checkout → paid account, plus export and support-volume trends;
- mobile/desktop navigation, filters, pagination, empty/loading/error states and safe copyable identifiers so Andrew can actually diagnose a report from a phone or desktop.

Keep repeatable configuration, provisioning and bulk lifecycle work in the validated operator CLI. The backoffice may perform only actions that need direct human judgment and are implemented with authorization, confirmation, idempotency and audit evidence—for this MVP, primarily support handling and explicitly designed remediation/retry actions. It must not expose raw tokens, identity-provider subjects, payment credentials or ad-hoc database editing, and it must not add refund, entitlement override or ownership controls without their own secured workflow.

Done means the analytics funnel reconciles against canonical BFF/payment facts for a deterministic fixture; monitoring proves one sampled/redacted error and one actionable delivery/webhook failure without alerting on expected denials; and Andrew can use the deployed backoffice to find a customer, understand their account/access/payment/support state, trace a reported problem and identify whether the system needs attention.

### Build 7 — Deployment and launch preparation

Configure environments, secrets, Cloudflare deployment, domains and CI; connect the selected analytics/monitoring production configuration; and verify rollback and recovery notes. Run the focused browser regression:

1. Sign in.
2. Create a representative guest list.
3. Preview all cards.
4. Download the permitted Free PDF.
5. Complete fixture or sandbox Event Pass and use a paid design or AI capability.
6. Complete a fixture or sandbox subscription and verify its project/AI allowance.
7. Exercise Studio membership when that slice is implemented.
8. Start a support conversation.
9. Review and respond in the backoffice, then verify the emailed response and one customer reply returns to the same case.
10. Confirm the run's acquisition, signup, activation, checkout/payment, export and support events appear once with the expected safe context.
11. Confirm production health/version, operational queues and alert delivery are healthy, with no unresolved synthetic or real failure hidden from the backoffice.

Run provider-specific sandbox/live smoke checks separately. Done when automated validation passes, the production flow is reachable and Andrew has a concise final acceptance checklist.

## Human blocker groups

These are candidates for Andrew's short Nirvana list only when they become actionable. Reviews and decisions that can be completed in conversation stay here.

### Paddle onboarding

Create or confirm the seller account, finish business/identity/payout verification and enable sandbox access. Obtain written confirmation of Israeli payouts and the one-time/recurring microtransaction schedule, including discount and payout treatment. Submit the real product/domain and required policy pages for production review when the site exists. Configure the Event Pass and accepted monthly subscriptions only after implementation identifies the exact required Paddle resources; do not configure annual offers.

### Accounts, domain and OAuth

Confirm the existing Convex login can create a separate Business Factory project, choose or buy the product domain, and provide Cloudflare/DNS access. After Codex provides exact callback URLs, create/select the Google Cloud project, configure consent/branding and create the web OAuth client.

Do not pre-create Apple, PostHog, Resend or Sentry accounts. Build 3 will benchmark and select the minimum cost-efficient image-generation provider/model for the accepted four-choice batch; TableCards needs no scanner, browser-worker or printing provider. Build 5 will select and activate the minimum email-delivery or helpdesk capability required for the accepted support workflow; Build 6 will select the minimum analytics/monitoring arrangement only after its events, privacy boundaries, alert thresholds and operating questions are defined.

### Physical and live launch checks

Provide or approve the monitored support address and any provider verification that cannot be automated. Print the scale-check page at 100%, measure it with a ruler, and complete one real production sign-in, subscription, export and two-way support conversation. Then bring the first real pilot traffic from selected buyers. Offer, policy and product-claim reviews happen in conversation rather than becoming Nirvana tasks.

## Launch acceptance

The launch gate is satisfied when:

- TableCards is deployed with the fixed, honestly described output contract.
- Google login and project/account isolation work in production.
- Event Pass/subscription webhooks and server-side entitlements protect paid sizes, designs, AI allowances and collaboration.
- The deterministic PDF checks and focused happy-path regression pass.
- A user can begin a support conversation, receive Andrew's reply by email and reply into the same case.
- A monitored public support contact works for users who cannot sign in, without treating email possession as authority for sensitive account or payment actions.
- Focused acquisition/activation/payment events produce a trustworthy basic funnel without collecting guest-list contents or credentials.
- Production health, unexpected errors and failed payment/support delivery are observable through bounded, actionable monitoring.
- The backoffice lets Andrew find a customer or account, understand access/payment/support state, trace a reported problem and see whether an operational queue needs attention.
- Andrew verifies physical print scale, completes the live flow and deliberately sends real prospects to it.

Post-launch validation review, advanced integrations, platform hardening, a reusable factory skill and a technically different second-project proof are intentionally parked. They are not blockers for shipping the first product.
