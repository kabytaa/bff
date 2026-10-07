# TableCards MVP Product Specification

Updated: 2026-10-07.

Status: Accepted MVP scope; review remediation verified in development, not released for customer launch.

Current runtime baseline: `d0c53e7` on `feat/tablecards-application`, redeployed 2026-10-07 with implementation unchanged from reviewed runtime `a914da0`. The earlier reconciliation at `b5aeae3` is preserved in the dated reviews; [Operations](operations.md#2026-10-07-development-redeployment) records the redeployment.

This is the canonical product-scope document for the first Business Factory product. The accepted [TableCards application contract](application.md) defines pages, navigation, responsive behavior and user stories, distinguishing development implementation from remaining gaps. The [MVP delivery plan](../../../docs/factory/mvp-delivery-plan.md) describes execution, while [ADR 0001](../../../docs/architecture/adr/0001-convex-first-bff-stack.md) governs the shared technical stack.

The dated [TableCards market-research report](../../../docs/research/260927-tablecards-market-research.md) records competitor, customer-problem, pricing, format, AI-cost and acquisition evidence. The accepted [TableCards product and launch brainstorm](../../../.agent/brainstorms/260927-tablecards-product-and-launch.md) records how that evidence changed the launch scope. [Application](application.md), [architecture](architecture.md) and [operations](operations.md) explain the maintained experience, component/data boundaries and run procedures without becoming alternate product specifications.

## Delivery and evidence boundary

The current development application at `https://tablecards-dev.tofler.app` implements public import/preview, authenticated projects/export, constrained artwork/presets, four-choice development AI and shared Studio account workflows. The [current development acceptance](reviews/261006-tablecards-remediation-and-development-acceptance.md) records repository validation, a fresh 27-case desktop Chromium/mobile WebKit run and independent re-review; the [executable story registry](../e2e/src/support/coverage.ts) remains the coverage source. The [earlier acceptance result](../../../.agent/plans/260928-tablecards-user-story-acceptance.md#execution-result) is historical evidence. These runs establish the tested development behavior, not real purchases, real image-provider quality, physical print compatibility or production acceptance.

TableCards production has not been released. The accepted [shared-checkout direction](../../../.agent/plans/260929-shared-mock-checkout.md) permits a future explicitly no-charge Build 3 production demo; that later decision replaces the earlier product-local, development-only checkout design. It does not mean that demo is deployed or that mock access is payment truth. Build 4 owns real billing and commercial lifecycle, Build 5 two-way support, Build 6 operational visibility, and Build 7 production/launch acceptance. Missing implementation does not remove an accepted promise below.

The [initial 2026-10-06 independent review](reviews/261006-build-3-documentation-and-readiness.md)
found consequential export and upload defects beyond the passing story suite.
The [completed remediation and development acceptance](reviews/261006-tablecards-remediation-and-development-acceptance.md)
records their fixes, independent re-review and 27 passing hosted cases. The
accepted promises are unchanged. Development acceptance is not production
deployment, physical print proof, real billing or customer-launch approval.

## Purpose and launch hypothesis

TableCards is intentionally a small first product. Its primary purpose is to prove that the Business Factory Foundation can support a complete real-user product and make the next Business Project easier to create. Commercial demand is desirable but remains unvalidated.

The initial market is the United States. Occasional hosts are served by a one-event offer, while the likely repeat buyers are independent event planners and small planning studios. Version one has an English interface and supports Latin-script names, including common accents. Right-to-left scripts are explicitly deferred.

The customer job is to turn an existing event spreadsheet and, optionally, matching artwork into a complete correctly sized PDF without manually duplicating or tiling each guest's card. Alternatives include free place-card generators, Avery tooling, Canva/mail merge and a local stationery or print service. The differentiation to validate is reliable spreadsheet-to-print workflow and reusable professional work, not a unique PDF or AI feature. TableCards sells the downloadable file; customers print independently or use their own printer. Printed stationery is an alternative cost, not the software's price benchmark.

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
4. The user selects a predefined design or, when entitled, uploads artwork. Event Pass artwork belongs to its event; Planner Pro and Studio can save and reuse constrained custom presets. Optional AI generation produces four background choices without receiving guest-list data.
5. Google sign-in is required to save a project, export a PDF, generate AI backgrounds or purchase an entitlement.
6. TableCards generates a deterministic PDF with the chosen names, cut marks, fold marks and a scale-check page. Free projects contain at most 25 cards; paid projects contain at most 500.
7. The user can start a support conversation for feedback, a question or a problem, receive operator replies by email and reply by email or from the product.

TableCards is not the system of record for an agency's guest list. A corrected or partial CSV follows the same generation workflow; there is no separate “correction printing” feature.

Import preserves guest spelling, order and multiplicity while trimming surrounding whitespace and ignoring blank rows. Users can review column mapping and header rows before accepting the import; invalid rows must be explained rather than silently treated as a complete successful list. The supported spreadsheet format is XLSX, not legacy XLS. The import ceiling is 500 guests, including for a visitor who only previews. Exact field/parser bounds belong to the [guest contract](../libs/core/src/guests.ts) and [import adapter](../workloads/web/src/imports.ts).

## Product workflows

TableCards must feel like a working application rather than one landing page containing every marketing and product section. The accepted [application contract](application.md) owns exact routes, navigation, responsive behavior and interaction design. Product scope requires discoverable workflows for:

- public discovery, pricing, policy access and import/design/full preview;
- sign-in with the public draft restored for saving or export;
- saved-project creation, opening, editing, duplication, archive/restore and export;
- entitled event artwork and reusable/shared presets;
- the selected workspace's offer, relevant limits/usage and checkout or billing entry;
- Studio members, invitations, permitted role/removal changes and protected ownership transfer, with recipient acceptance surviving authentication.

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

Development additionally exposes a six-card landscape **print trial**, with a ready scale-check PDF. It is not an accepted replacement for the four-card launch contract; physical measurement and explicit acceptance are still required. Nominal card size also does not establish Avery perforation alignment or printer compatibility.

The 2026-10-06 remediation bundles hash-verified, licensed Noto Sans and Noto Serif for hosted exports and previews. Browser preflight uses checked advances from those same fonts; PDF preflight uses their embedded metrics. Both check the actual event title, reject impossible fits and support common Latin names, including Vietnamese and common accented names supplied in composed or decomposed form. Rendering uses canonical-equivalent NFC text without changing stored names; remaining combining marks and unsupported scripts fail explicitly before export. Kerning and discretionary ligatures are disabled in both renderers. Server authorization and final render validation remain authoritative. This does not establish physical printer compatibility. See the [renderer/font boundary](../libs/core/README.md).

## Designs

Designs are lightweight, curated product assets rather than a freeform editor:

- Free includes three polished predefined designs.
- Event Pass, Planner Pro and Studio include the full predefined premium-design library.
- Event Pass can upload artwork for its event; Planner Pro and Studio can save and reuse custom presets.

The paid custom-design workflow is intentionally constrained:

- upload one PNG or JPEG background at the fixed 7:4 face ratio, at least 1050 × 600 pixels for 300-DPI output, at most 2 megapixels and 10 MiB; PNG color must be 8-bit or lower (animated or rotated images are not supported)
- validate format, dimensions and effective print resolution
- adjust the guest-name font, size, color and position
- preview the result before export
- save and reuse design presets with Planner Pro or Studio; Event Pass retains event-only artwork

There is no freeform design studio, vector editor, design marketplace, logo system or arbitrary canvas in the MVP. Do not promise a fixed cadence of new designs.

AI backgrounds are a subordinate optional capability rather than the main product promise. Build 3 adds them only after predefined-design import, preview and deterministic export work. One generation batch returns four choices. Free receives one lifetime welcome batch, Event Pass two batches, Planner Pro ten batches per month and Studio thirty shared batches per month. Monthly batches do not roll over, a failed provider generation releases its unit and guest names/list data are never sent to the image provider.

The deployed development flow uses deterministic generated fixtures to verify choice selection and unit accounting. An optional server-side OpenAI adapter exists; its presence is not a completed live quality/cost benchmark or a provider promise to customers. Prompts contain only the user's bounded visual-style request, never automatically attached guest/project/account contents. Predefined/uploaded designs and deterministic export must remain usable when AI is disabled or fails.

## Authentication and accounts

- The landing, policies, import and preview are public; saving, exporting, AI generation and payment require authentication.
- Google is the only enabled login provider in version one.
- A TableCards user has a stable Business-environment-local ID independent of Google.
- External identities are provider-qualified technical mappings such as `(issuer, subject)` and remain private to BFF authentication; the same person may eventually authenticate through multiple providers.
- Adding Apple or another provider later must not change environment-local user IDs, account IDs, memberships or public BFF contracts.
- Account linking UI and additional providers are deferred until a second provider is actually enabled.

Build 2 selected shared BFF-owned Google authentication and the public SDK/session adapter, as recorded in [ADR 0004](../../../docs/architecture/adr/0004-business-customer-auth-and-accounts.md). TableCards consumes the authenticated environment/user/account context; it does not own a competing login or session system.

First sign-in creates a private workspace. A user may keep it and join one invited Studio workspace; compatible membership/ownership caps also permit transfer of that joined workspace to the invitee. Ordinary users cannot create arbitrary extra workspaces. The account selector appears when there are multiple memberships, and each tab has its own selected account context.

An account/workspace owns its offer and AI allowance, and TableCards projects, guest contents, artwork, presets, exports and AI operations are account-scoped. Studio members work on the shared workspace's records; a private workspace's records do not become shared merely because its owner joins Studio. BFF owns identity, sessions, accounts, memberships, role/policy authority, shared checkout and generic access/unit state. TableCards owns card content, product-specific limits/design rules, rendering and image operations. The [architecture document](architecture.md) explains the data/API boundaries.

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

Binding each Event Pass purchase to one event for 90 days and the professional cancellation/access/deletion policy are accepted requirements for Build 4, not verified behavior of the current mock. Current development enforcement covers card/project limits, design capabilities and account scope; one active project does not establish purchase-to-event binding or a real purchase's lifetime/retention lifecycle. Build 4 must also reject a voluntary downgrade until usage fits, and preserve members/data with Owner/Admin remediation access when failed payment or expiry forces a restricted account. It must never remove team members automatically to satisfy a lower limit.

Build 3 uses a deterministic no-charge checkout owned by the shared BFF to
exercise Event Pass/subscription gates and the account-owned typed AI-unit
balance. TableCards chooses a code-owned offer, asks BFF to start checkout and
redirects to the returned URL; it never renders a provider or dummy payment
screen itself. The shared page applies product access and compatible account
policy atomically, so Studio immediately exposes its five seats, roles and
invitations. The mock is verified in development and is the accepted mechanism
for a future Build 3 production demo, with an explicit notice that no money is
charged. Build 4 may
let development choose mock or Paddle, while production checkout creation
returns Paddle directly without changing the TableCards interface. Only
verified provider events may grant real paid access. The unit balance supports
idempotent reserve, commit and release and never lives in the short-lived JWT.
The monthly mock intentionally simulates a successful renewal every cycle;
real monthly allowances advance only from verified provider
subscription/paid-through state, and a missing, failed or expired payment never
creates the next allowance.

## Teams

- A Studio workspace supports up to five members at one fixed price.
- Membership uses explicit invitations; automatic email-domain joining is out of scope.
- Owner, Admin and Member are the only MVP roles. The Owner controls checkout and ownership transfer. An Admin may manage invitations and ordinary Members but cannot manage the Owner, assign/remove other Admins or transfer ownership. A Member has product access without those administrative powers; a role does not independently grant a paid offer.
- Authorized Studio users can view members and pending invitations, create or revoke invitations, change permitted roles and remove permitted members from the product. The Owner can start the protected ownership-transfer flow for an existing active member. The UI must reflect the already enforced Owner/Admin/Member boundaries rather than inventing broader permissions.
- Development creates or reissues a recipient-bound invitation link for an authorized user to copy and deliver themselves. Acceptance validates the signed-in recipient, membership capacity and reserved seat; reissue invalidates the previous link. Automated invitation email is not implemented or required by this accepted link workflow. Do not introduce a transactional-email provider merely to demonstrate invitations.

## Support, feedback and operations

Support and feedback are launch requirements, not post-launch polish, but they are delivered as a separate MVP slice after the shared authentication/accounts work. Signed-in users can start `feedback`, `problem` or `question` conversations with authenticated Business/user/account context. The operator workflow supports status handling and a real reply thread. Replies are delivered by email, and a user can reply by email or from the product; the resulting messages remain part of the same case. A public monitored support address remains available to people who cannot sign in.

Development now has linked privacy, terms and contact pages that explicitly explain the no-charge preview and actual data/file limitations. They do not invent seller details or a monitored support mailbox. Support conversations, a monitored public contact channel and final commercial disclosures remain launch requirements, not completed capabilities. Build 5 owns conversation/email support; merchant/legal verification remains a separate later gate.

Support may expose bounded account, subscription and payment-status context so Andrew can understand finance-related problems. Email possession or a support conversation never authorizes refunds, billing changes, credential disclosure or another sensitive action; those require their own authenticated operator controls and audit trail.

Future AI support automation may classify or draft responses, but autonomous actions and resolution are not part of this MVP.

Operational readiness includes focused product/business events, basic traffic and conversion visibility, billing truth, support visibility, health/error monitoring, a deployment procedure and recovery notes. A dedicated later MVP slice must make these capabilities operational before launch rather than leaving them as post-launch polish. The support slice selects a concrete outbound/inbound email or helpdesk mechanism; the operational-visibility slice selects the smallest analytics and error-monitoring arrangement after defining exact events, privacy limits, actionable alerts and operator questions. No vendor is preselected.

Canonical analytics should answer a bounded launch funnel: where a visitor came from, whether they signed up, reached first successful preview/export, started checkout, became paid and later needed support. High-volume UI clicks are collected only when they answer a named product question. Analytics must not contain guest names/lists, card contents, credentials, payment details or unnecessary customer profile data.

Monitoring covers public/product/BFF health, unexpected application errors, PDF-generation failures and failed or delayed payment/support delivery. Events include environment, deployed version and safe correlation evidence; expected authentication denials and rate limits are excluded from error alerts. Sampling, redaction, retention and spend limits are required, and alerts exist only for conditions an operator can act on.

The launch backoffice must be usable, not merely a database viewer. Andrew needs an environment-aware overview; safe global customer/account/project/payment/support search; joined customer/account views for memberships, sessions, subscription/entitlements, projects/exports, support and audit history; queues for unresolved support and failed delivery/webhook/job work; and basic acquisition/conversion trends. It needs clear mobile/desktop navigation, filters, pagination and error/empty/loading states. It is not a general analytics product, configuration editor or unrestricted administrative console; repeatable configuration stays in the validated CLI, and sensitive actions require separately designed authorization, confirmation and audit controls.

Operational placement is deliberate: customers create/export cards, select an offer and manage their own permitted Studio membership through product UI; operators apply deployment/auth/catalog configuration and repeatable provisioning/recovery through validated automation; the backoffice shows safe joined state, queues and evidence. Human support handling or a sensitive remediation action belongs in an explicitly secured operator workflow when its delivery stage implements it. Existing backoffice customer/account reads do not establish that TableCards billing, support or launch monitoring already works.

## Promise acceptance and evidence

Every advertised capability must have an understandable workflow, authoritative enforcement and suitable verification before launch. The table connects product promises to existing sources rather than duplicating the application story registry. Development evidence uses the no-charge commerce and deterministic AI providers.

| Promise                                                        | Discoverable workflow                                                             | Authority and suitable evidence                                                                                                                                                                      | Current boundary                                                                                              |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Preserve the imported list and preview every card              | Public creator, mapping/review and restored draft                                 | [Guest/import rules](../libs/core/src/guests.ts), [import tests](../workloads/web/src/imports.test.ts), [hosted journeys](../e2e/src/user-stories.spec.ts)                                           | Verified in development; truthful development policies exist, final commercial disclosures remain later gates |
| Clean 25-card Free export and up to 500 paid cards             | Creator/saved-project review and PDF download                                     | [Server export](../backend/convex/exports.ts), [project scope/limit tests](../backend/convex/projects.test.ts), [PDF tests](../libs/core/src/pdf.test.ts), hosted offer journeys                     | Development gates pass; physical print and broader font coverage remain unverified                            |
| Offer prices, project/seat/AI limits and paid designs          | Public pricing, Account and shared checkout                                       | [Code-owned catalog](../libs/core/src/catalog.ts), [BFF checkout tests](../../../platform/bff/service/convex/checkouts.test.ts), [TableCards access enforcement](../backend/convex/productAccess.ts) | Exact accepted pilot offers exercised without money; verified provider billing and lifecycle remain Build 4   |
| Event artwork and reusable/shared presets                      | Saved event artwork and professional Designs workflow                             | [Asset validation](../backend/convex/assets.ts), [project/preset tests](../backend/convex/projects.test.ts), hosted Event/Planner/Studio journeys                                                    | Implemented in development; Event artwork remains event-scoped                                                |
| Four AI choices, no guest contents, correct balance/refund     | Authenticated generation and live remaining-batch state                           | [AI orchestration](../backend/convex/ai.ts), [BFF unit tests](../../../platform/bff/service/convex/productAccess.test.ts), hosted AI success/failure journeys                                        | Deterministic provider verified; live model quality/cost still unknown                                        |
| Five-person Studio, roles and protected ownership transfer     | Team, copied invitations, recipient acceptance and reauthentication               | Shared BFF account authority, [auth ADR](../../../docs/architecture/adr/0004-business-customer-auth-and-accounts.md), hosted Studio journeys                                                         | Real account/team APIs with mock commercial access; production/live-provider acceptance remains               |
| Retention, real billing, two-way support and observable launch | Billing/remediation, support and operator workflows required by the delivery plan | Verified provider events/lifecycle tests, correlated email round-trip, operational/production smoke and human print/live acceptance                                                                  | Accepted requirements, not delivered launch capabilities; Builds 4–7                                          |

## Assumptions and learning gates

The 2026-09-27 research is desk evidence and a dated price/provider snapshot. It supports the workflow hypothesis, not TableCards willingness to pay, conversion, retention or contribution margin. Automated development runs observe software behavior, not customers. No real-file user pilots or independent paid-buyer results are recorded in the accepted sources used for this reconciliation; AI demand and Studio demand remain unvalidated.

The accepted acquisition gate is 40 planners/stationers plus 10 print shops across two US metro areas, at least eight useful conversations and five observed real-file pilots. Four pilots should produce a correct PDF within ten minutes without operator repair, with exact guest multiplicity and a physical print check. Once real billing exists, require three independent full-price buyers before broad paid acquisition, and two professional repeat purchases over the following 60–90 days before treating retention as validated. Organic search/Pinterest follows the focused discovery work. A later single high-intent search experiment is capped at `$150–$200`; support time, refunds, repeat use and measured contribution must justify further spend.

## Test policy

Every implementation slice must be self-verifiable. The browser regression remains deliberately small and covers the important happy flows: pre-auth import/preview, Google session bootstrap using a deterministic test adapter, pasted-grid/CSV/XLSX input, Free PDF export, mock Event Pass/subscription entitlement, AI-unit success/failure behavior, team access when implemented, and support submission through operator response. The separate support slice also verifies outbound delivery, an inbound email reply joining the correct case and denial of spoofed or cross-environment replies without making ordinary CI depend on a live email provider.

PDF geometry, guest multiplicity, duplicate names, accents, long-name fitting, authorization, webhook signatures/replays and role denials belong in faster unit or integration tests. Live Google and Paddle checks are separate smoke tests; ordinary CI must not depend on those services.

## Explicitly deferred

- right-to-left scripts
- A4, flat cards, multiple card sizes and arbitrary dimensions
- seating-plan management, structured meal/dietary fields and caterer manifests beyond the accepted optional short marker
- direct Google Sheets integration, correction-only selection or general guest-list management
- domain-based team joining and per-seat billing
- annual billing before professional retention is demonstrated
- Apple login and other identity providers
- marketing campaign automation
- marketing/transactional email outside the required support and invitation workflows, advanced analytics/reporting, AI support automation and monitoring/security hardening beyond the bounded launch operations slice
- print fulfillment and shipping

## Remaining delivery-time decisions

- Validate the implemented manual invitation-link workflow with a real Studio team; add automated delivery only if a subsequent accepted requirement needs it.
- Choose whether the required two-way support conversation is BFF-owned with an email bridge or integrated with a helpdesk, then select the provider and safe inbound-reply correlation mechanism.
- Choose the working product/domain name and reachable launch users.
- Benchmark and select a cost-efficient image-generation provider/model that satisfies the accepted four-choice batch contract and safety/privacy boundary.
- Obtain Paddle's written Israeli seller, payout and microtransaction terms before locking Build 4 resources or publishing the final price page.
- Complete physical four-card/100%-scale verification; separately accept or reject the six-card trial and resolve font coverage before publishing final print claims.
- Implement and verify the accepted Event Pass/professional lifecycle, public policies/contact, support and launch operations; production readiness requires the delivery plan's production and live acceptance gates.
