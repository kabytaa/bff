# TableCards MVP Product Specification

Updated: 2026-09-28.

This is the canonical product-scope document for the first Business Factory product. The accepted [TableCards application PRD](tablecards-application-prd.md) defines the detailed pages, navigation, responsive behavior and user stories now implemented in development. The [MVP delivery plan](../factory/mvp-delivery-plan.md) describes execution, while [ADR 0001](../architecture/adr/0001-convex-first-bff-stack.md) governs the shared technical stack.

The dated [TableCards market-research report](../research/260927-tablecards-market-research.md) records competitor, customer-problem, pricing, format, AI-cost and acquisition evidence. The accepted [TableCards product and launch brainstorm](../../.agent/brainstorms/260927-tablecards-product-and-launch.md) records how that evidence changed the launch scope.

## Purpose and launch hypothesis

TableCards is intentionally a small first product. Its primary purpose is to prove that the Business Factory Foundation can support a complete real-user product and make the next Business Project easier to create. Commercial demand is desirable but remains unvalidated.

The initial market is the United States. Occasional hosts are served by a one-event offer, while the likely repeat buyers are independent event planners and small planning studios. Version one has an English interface and supports Latin-script names, including common accents. Right-to-left scripts are explicitly deferred.

## Business Factory MVP definition of done

The Business Factory MVP is done when:

- The reusable BFF service and backoffice dashboard operate in production.
- TableCards completes the full real-user cycle: discovery/attribution appropriate to its launch, authentication, product value, billing and access control, support/feedback, monitoring, deployment and recovery.
- The backoffice exposes the operational information needed to serve users and understand the product without becoming a general analytics platform.
- The repository documents the actual boundaries, contracts and steps needed to add a second Business Project without redesigning the foundation. There is no speed target and the second product does not have to be built as part of this MVP.

Initial acquisition uses direct planner/stationer and print-shop discovery, observed real-file pilots and focused organic search/Pinterest material. Paid media waits for a working self-service conversion path and begins with one capped high-intent search experiment. Do not build a generic campaign system. Codex or another authorized agent may operate external marketing tools directly; BFF should implement only the attribution and monitoring needed by this launch approach.

## Core workflow

1. A visitor can view the public landing and policy pages, import a list and preview the complete result without signing in.
2. Input may be pasted lines, a pasted spreadsheet grid, CSV or XLSX. Each row has a required name, optional table number and one optional short marker suitable for a meal, dietary or seat notation.
3. TableCards preserves spelling, order and duplicates, then previews every card and warns about unsupported characters, insufficient image resolution and text that cannot fit.
4. The user selects a predefined design or, when entitled, uploads artwork and saves a constrained custom preset. Optional AI generation produces four background choices without receiving guest-list data.
5. Google sign-in is required to save a project, export a PDF, generate AI backgrounds or purchase an entitlement.
6. TableCards generates a deterministic PDF with the chosen names, cut marks, fold marks and a scale-check page. Free projects contain at most 25 cards; paid projects contain at most 500.
7. The user can start a support conversation for feedback, a question or a problem, receive operator replies by email and reply by email or from the product.

TableCards is not the system of record for an agency's guest list. A corrected or partial CSV follows the same generation workflow; there is no separate “correction printing” feature.

## Product surfaces

TableCards must feel like a working application rather than one landing page containing every marketing and product section. The MVP has these distinct customer surfaces:

- `/` is a concise public landing page with the core promise, a representative example, pricing summary, essential FAQ and clear create/sign-in actions.
- `/create` starts a new project. On phones it is a focused guest-list → design → review/export workflow with compact design selection, persistent progress/action controls and the complete sheet preview opened on demand. Desktop may use a wider workspace without forcing that density onto mobile.
- `/projects` is the authenticated project home for creating, opening, duplicating, archiving and understanding active-project limits.
- `/projects/:projectId` edits and exports one saved project without returning through the marketing page.
- `/settings` exposes the selected account's offer, relevant capability/usage state and upgrade or billing entry when implemented.
- `/settings/team` exposes Studio member and invitation management, fixed roles and ownership transfer to authorized users. Invitation links have a dedicated acceptance path that survives authentication.

Saved presets, uploaded artwork, AI generation/remaining batches, project limits and Studio team controls must have discoverable product workflows when the current offer advertises them. A pricing claim cannot rely only on a backend contract or hidden development fixture: either expose and browser-test the capability or remove the claim before launch. Business-wide policy/configuration remains in the validated operator CLI, while the backoffice remains an operator evidence and remediation surface rather than a customer settings substitute.

## Print contract

Version one supports exactly one physical output:

| Property      | Decision                                                 |
| ------------- | -------------------------------------------------------- |
| Page          | US Letter, 8.5 × 11 inches                               |
| Card          | Folded tent card                                         |
| Finished size | 3.5 × 2 inches                                           |
| Unfolded size | 3.5 × 4 inches                                           |
| Layout        | Four cards per sheet                                     |
| Faces         | Name and design on both visible faces                    |
| Guides        | Cut marks, fold marks and scale-check page               |
| Media         | Ordinary compatible cardstock or Avery 5302-style sheets |

Users must print at 100% / Actual Size. One physical sheet must be printed and measured before launch. Flat cards, A4, arbitrary dimensions, professional print fulfillment and multiple physical presets are deferred.

## Designs

Designs are lightweight, curated product assets rather than a freeform editor:

- Free includes three polished predefined designs.
- Event Pass, Planner Pro and Studio include the full predefined premium-design library.
- Event Pass can upload artwork for its event; Planner Pro and Studio can save and reuse custom presets.

The paid custom-design workflow is intentionally constrained:

- upload one PNG or JPEG background at the fixed card ratio
- validate format, dimensions and effective print resolution
- adjust the guest-name font, size, color and position
- preview the result before export
- save and reuse design presets

There is no freeform design studio, vector editor, design marketplace, logo system or arbitrary canvas in the MVP. Do not promise a fixed cadence of new designs.

AI backgrounds are a subordinate optional capability rather than the main product promise. Build 3 adds them only after predefined-design import, preview and deterministic export work. One generation batch returns four choices. Free receives one lifetime welcome batch, Event Pass two batches, Planner Pro ten batches per month and Studio thirty shared batches per month. Monthly batches do not roll over, a failed provider generation releases its unit and guest names/list data are never sent to the image provider.

## Authentication and accounts

- The landing, policies, import and preview are public; saving, exporting, AI generation and payment require authentication.
- Google is the only enabled login provider in version one.
- A TableCards user has a stable Business-environment-local ID independent of Google.
- External identities are provider-qualified technical mappings such as `(issuer, subject)` and remain private to BFF authentication; the same person may eventually authenticate through multiple providers.
- Adding Apple or another provider later must not change environment-local user IDs, account IDs, memberships or public BFF contracts.
- Account linking UI and additional providers are deferred until a second provider is actually enabled.

Clerk is not required. The supported Business-user authentication mechanism is selected in Build 2 behind the BFF authentication adapter; Build 1 does not preselect Better Auth or Convex Auth.

## Offers and working prices

The following names, prices and limits are accepted launch hypotheses, not validated willingness-to-pay evidence. Annual billing is omitted until professional retention is demonstrated.

| Offer       | Price         | Seats   | Active projects | Intended customer          |
| ----------- | ------------- | ------- | --------------: | -------------------------- |
| Free        | $0            | 1       |               1 | Small event or evaluation  |
| Event Pass  | $5 one time   | 1       |         1 event | Occasional host            |
| Planner Pro | $9 per month  | 1       |              25 | Independent repeat planner |
| Studio      | $19 per month | Up to 5 |             100 | Small planning team        |

Free exports one clean, watermark-free project containing up to 25 cards and includes three predefined designs. A visitor may import and preview a larger list but must reduce the project or upgrade; Free does not create a partial PDF. Free has one active saved project, and the MVP does not add elaborate anti-splitting enforcement without observed abuse.

Event Pass completes one event containing up to 500 cards, including premium designs, uploaded-artwork validation, constrained name styling, two AI batches and edits/re-exports for 90 days. Previously downloaded PDFs remain the customer's files. Planner Pro adds up to 25 active projects, reusable custom presets, duplication and ten monthly AI batches. Studio adds up to 100 active shared projects, shared presets, invitations, Owner/Admin/Member roles, five members and thirty shared monthly AI batches. Archived professional projects do not count toward the active-project limit.

After a professional subscription ends, projects remain readable and exportable for 30 days, then inaccessible for another 60 days and are deleted after advance warnings. The subscription belongs to the account/workspace rather than directly to an individual identity. Do not add annual offers, per-seat charges, extra team tiers or email-domain joining in version one.

Build 3 uses only a deterministic test/development mock to exercise Free/Event Pass/subscription gates and the account-owned typed AI-unit balance. The balance supports idempotent reserve, commit and release and never lives in the short-lived JWT. Build 3 has no live charge or production self-service checkout. Its monthly mock intentionally simulates a successful renewal every cycle. Paddle is the leading Build 4 provider, but products, checkout, verified webhooks and subscription lifecycle begin only after written confirmation of Israeli onboarding/payouts and sub-`$10` one-time/recurring terms. Real monthly allowances advance only from verified provider subscription/paid-through state; a missing, failed or expired payment never creates the next allowance.

## Teams

- A Studio workspace supports up to five members at one fixed price.
- Membership uses explicit invitations; automatic email-domain joining is out of scope.
- Owner, Admin and Member are the only planned roles.
- Authorized Studio users can view members and pending invitations, create or revoke invitations, change permitted roles and remove permitted members from the product. The Owner can start the protected ownership-transfer flow for an existing active member. The UI must reflect the already enforced Owner/Admin/Member boundaries rather than inventing broader permissions.
- The exact invitation-delivery UX remains to be chosen. Do not introduce a transactional-email provider until that workflow actually requires one.

## Support, feedback and operations

Support and feedback are launch requirements, not post-launch polish, but they are delivered as a separate MVP slice after the shared authentication/accounts work. Signed-in users can start `feedback`, `problem` or `question` conversations with authenticated Business/user/account context. The operator workflow supports status handling and a real reply thread. Replies are delivered by email, and a user can reply by email or from the product; the resulting messages remain part of the same case. A public monitored support address remains available to people who cannot sign in.

Support may expose bounded account, subscription and payment-status context so Andrew can understand finance-related problems. Email possession or a support conversation never authorizes refunds, billing changes, credential disclosure or another sensitive action; those require their own authenticated operator controls and audit trail.

Future AI support automation may classify or draft responses, but autonomous actions and resolution are not part of this MVP.

Operational readiness includes focused product/business events, basic traffic and conversion visibility, billing truth, support visibility, health/error monitoring, a deployment procedure and recovery notes. A dedicated later MVP slice must make these capabilities operational before launch rather than leaving them as post-launch polish. The support slice selects a concrete outbound/inbound email or helpdesk mechanism; the operational-visibility slice selects the smallest analytics and error-monitoring arrangement after defining exact events, privacy limits, actionable alerts and operator questions. No vendor is preselected.

Canonical analytics should answer a bounded launch funnel: where a visitor came from, whether they signed up, reached first successful preview/export, started checkout, became paid and later needed support. High-volume UI clicks are collected only when they answer a named product question. Analytics must not contain guest names/lists, card contents, credentials, payment details or unnecessary customer profile data.

Monitoring covers public/product/BFF health, unexpected application errors, PDF-generation failures and failed or delayed payment/support delivery. Events include environment, deployed version and safe correlation evidence; expected authentication denials and rate limits are excluded from error alerts. Sampling, redaction, retention and spend limits are required, and alerts exist only for conditions an operator can act on.

The launch backoffice must be usable, not merely a database viewer. Andrew needs an environment-aware overview; safe global customer/account/project/payment/support search; joined customer/account views for memberships, sessions, subscription/entitlements, projects/exports, support and audit history; queues for unresolved support and failed delivery/webhook/job work; and basic acquisition/conversion trends. It needs clear mobile/desktop navigation, filters, pagination and error/empty/loading states. It is not a general analytics product, configuration editor or unrestricted administrative console; repeatable configuration stays in the validated CLI, and sensitive actions require separately designed authorization, confirmation and audit controls.

## Test policy

Every implementation slice must be self-verifiable. The browser regression remains deliberately small and covers the important happy flows: pre-auth import/preview, Google session bootstrap using a deterministic test adapter, pasted-grid/CSV/XLSX input, Free PDF export, mock Event Pass/subscription entitlement, AI-unit success/failure behavior, team access when implemented, and support submission through operator response. The separate support slice also verifies outbound delivery, an inbound email reply joining the correct case and denial of spoofed or cross-environment replies without making ordinary CI depend on a live email provider.

PDF geometry, guest multiplicity, duplicate names, accents, long-name fitting, authorization, webhook signatures/replays and role denials belong in faster unit or integration tests. Live Google and Paddle checks are separate smoke tests; ordinary CI must not depend on those services.

## Explicitly deferred

- right-to-left scripts
- A4, flat cards, multiple card sizes and arbitrary dimensions
- seating-plan management, meal fields and caterer manifests
- direct Google Sheets integration, correction-only selection or general guest-list management
- domain-based team joining and per-seat billing
- annual billing before professional retention is demonstrated
- Apple login and other identity providers
- marketing campaign automation
- marketing/transactional email outside the required support and invitation workflows, advanced analytics/reporting, AI support automation and monitoring/security hardening beyond the bounded launch operations slice
- print fulfillment and shipping

## Remaining delivery-time decisions

- Choose how Studio invitation links are delivered without prematurely requiring an email provider.
- Choose whether the required two-way support conversation is BFF-owned with an email bridge or integrated with a helpdesk, then select the provider and safe inbound-reply correlation mechanism.
- Choose the working product/domain name and reachable launch users.
- Benchmark and select a cost-efficient image-generation provider/model that satisfies the accepted four-choice batch contract and safety/privacy boundary.
- Obtain Paddle's written Israeli seller, payout and microtransaction terms before locking Build 4 resources or publishing the final price page.
