# TableCards MVP Product Specification

Updated: 2026-10-09.

Status: Accepted MVP scope; Build 3 no-charge production preview deployed, not a paying-customer launch.

Current release: the Build 3 preview on `main`, including the 2026-10-08
welcome-credit fix; the
[production release review](reviews/261007-build-3-production-release.md)
records exact versions, production smoke and verification limits. The earlier
PDF/session/Cloudflare [delta review](reviews/261007-pdf-session-and-live-ai-fixes.md),
`d0c53e7`/`a914da0` acceptance and `b5aeae3` reconciliation remain historical evidence.

This is the canonical product-scope document for the first Business Factory product. The accepted [TableCards application contract](application.md) defines pages, navigation, responsive behavior and user stories, distinguishing development implementation from remaining gaps. The [MVP delivery plan](../../../docs/factory/mvp-delivery-plan.md) describes execution, while [ADR 0001](../../../docs/architecture/adr/0001-convex-first-bff-stack.md) governs the shared technical stack.

The dated [TableCards market-research report](../../../docs/research/260927-tablecards-market-research.md) records competitor, customer-problem, pricing, format, AI-cost and acquisition evidence. The accepted [TableCards product and launch brainstorm](../../../.agent/brainstorms/260927-tablecards-product-and-launch.md) records how that evidence changed the launch scope. [Application](application.md), [architecture](architecture.md) and [operations](operations.md) explain the maintained experience, component/data boundaries and run procedures without becoming alternate product specifications.

## Delivery and evidence boundary

The current development application at `https://tablecards-dev.tofler.app` implements public import/preview, authenticated projects/export, constrained artwork/presets, four-choice capped Cloudflare AI and shared Studio account workflows. The [production release review](reviews/261007-build-3-production-release.md) records the latest development verification and bounded production evidence. The [earlier delta review](reviews/261007-pdf-session-and-live-ai-fixes.md) retains provider-specific evidence; the [earlier remediation acceptance](reviews/261006-tablecards-remediation-and-development-acceptance.md) retains its 27-case desktop Chromium/mobile WebKit run and independent re-review. The [executable story registry](../e2e/src/support/coverage.ts) remains the coverage source. The [original acceptance result](../../../.agent/plans/260928-tablecards-user-story-acceptance.md#execution-result) is historical evidence. Development checks establish tested development behavior and bounded sampled AI quality, not real purchases, universal model quality, physical print compatibility or production acceptance.

The explicitly no-charge Build 3 production preview is published at
`https://tablecards.tofler.app`, following the accepted
[shared-checkout direction](../../../.agent/plans/260929-shared-mock-checkout.md).
Production target/security smoke and public desktop/mobile journeys pass;
fresh authenticated production checkout/export/team round-trips remain
unverified without personal Google credentials. Mock access is not payment
truth. Build 4 owns real billing and commercial lifecycle; Build 5 now groups
operator work (support plus business/customer visibility and helper/support);
Monitoring (Build 6) separately owns technical health/errors/alerts. Marketing,
Legal and Maintenance have distinct final outcomes; Launch (Build 10) owns final
customer-launch acceptance. Short names identify scope, not a fixed execution order.
Missing implementation does not remove an accepted promise below.

The 2026-10-07 investigation found missing Free welcome grants, separate from
the fixed login/Projects crash. The 2026-10-08 fix initializes the promised one
lifetime batch through the trusted Business backend on the next authorized
access request, including for existing default accounts. Refreshing does not
replenish used credits or replace an upgraded offer; production mocks stay
disabled. Publication and verification are recorded in the
[welcome-credit evidence](reviews/261007-build-3-production-release.md#free-welcome-credit-provisioning--2026-10-08).

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
6. TableCards generates a deterministic PDF containing only card sheets with the chosen names, cut marks and fold marks. Calibration belongs in the separate print-test download, not an extra customer-export page. Free projects contain at most 25 cards; paid projects contain at most 500.
7. Signed-in users can submit feedback, a question or a problem through the shared form; signed-out visitors can use the public support-email link. Operator replies and customer follow-up use email, not an in-product ticket conversation portal.

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

Users can name a new draft and rename an existing project through the same
Project name field above the editor steps. Changes persist on Save or Export;
renaming does not create another project. Make a copy and Archive remain available
in Projects rather than taking space above the editor. Make a copy creates a new
editable project; it does not mark the original as a duplicate.

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
| Guides        | Cut marks and fold marks; separate calibration download  |
| Media         | Ordinary compatible cardstock or Avery 5302-style sheets |

Users must print at 100% / Actual Size. One physical sheet must be printed and measured before launch. Flat cards, A4, arbitrary dimensions, professional print fulfillment and multiple physical presets are deferred.

On 2026-10-07 Andrew confirmed that his earlier printed sheet looked acceptable and accepted it as sufficient for Build 3. Further physical testing does not block Build 3 software verification or its authorized production release. Detailed scale/margin measurements and broader print validation are deferred to the final MVP pre-launch gate; this acceptance is not measured printer or Avery-alignment certification.

Development additionally exposes a six-card landscape **print trial**, with a ready scale-check PDF. It is not an accepted replacement for the four-card launch contract; physical measurement and explicit acceptance are still required. Nominal card size also does not establish Avery perforation alignment or printer compatibility.

The 2026-10-06 remediation bundles hash-verified, licensed Noto Sans and Noto Serif for hosted exports and previews. Browser preflight uses checked advances from those same fonts; PDF preflight uses their embedded metrics. Both check the actual event title, reject impossible fits and support common Latin names, including Vietnamese and common accented names supplied in composed or decomposed form. Rendering uses canonical-equivalent NFC text without changing stored names; remaining combining marks and unsupported scripts fail explicitly before export. Kerning and discretionary ligatures are disabled in both renderers. Server authorization and final render validation remain authoritative. This does not establish physical printer compatibility. See the [renderer/font boundary](../libs/core/README.md).

On 2026-10-07 Andrew requested more readable long names. Preview and newly
generated PDFs now use up to two balanced lines rather than shrinking every name
into one line. Short/medium names stay on one line when they fit with at most
15% size reduction; longer names wrap at ordinary word boundaries before further
shrinking. Names are never truncated; nonbreaking text remains intact and
impossible fits still fail explicitly. The same layout protects card-edge and
table/meal-detail clearance on both folded faces. The example list mixes short,
medium, accented and long names instead of showing four extreme names first.
This does not alter saved guest content or already downloaded PDFs.

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

Development and production use Cloudflare Workers AI for real illustrated
choices under the 2026-10-07 authorization. Each deployment has its own `$1`
estimated UTC-day budget and counter, conservatively admitting up to 138
four-image starts, including failed starts. Explicitly labelled fixtures are
development-only and are not real AI artwork. No OpenAI API key is used.
Cloudflare's account-wide free allowance and invoice remain shared: this is an
estimated gross-inference guard, not an invoice guarantee or a change to
customer-plan allowances. Model, geometry and cost evidence belong in
[Operations](operations.md#cloudflare-ai-budget-and-reference-images).

Users may optionally supply a PNG/JPEG company icon or style image. The app sends a resized, metadata-stripped copy alongside the bounded visual-style request; it does not automatically attach guest/project/account contents. This is style/palette inspiration, not guaranteed exact logo reproduction. The reference is not separately saved in the artwork library; generated results remain private workspace artwork. Predefined/uploaded designs and deterministic export must remain usable when AI is disabled, capped or fails.

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
invitations. The mock is verified in development and enabled for the published
Build 3 production preview, with explicit notices that no money is charged.
Its fresh authenticated production round-trip is not claimed by that deployment.
Build 4 may
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
- The product creates or reissues a recipient-bound invitation link for an authorized user to copy and deliver themselves. Acceptance validates the signed-in recipient, membership capacity and reserved seat; reissue invalidates the previous link. This workflow is browser-tested in development; a fresh production recipient round-trip is unverified. Automated invitation email is not implemented or required by this accepted link workflow. Do not introduce a transactional-email provider merely to demonstrate invitations.

## Support, feedback and operations

Support and feedback are launch requirements, not post-launch polish, but they are delivered as a separate MVP slice after the shared authentication/accounts work. Signed-in customers can open `feedback` (including suggestions and missing-feature requests), `problem` or `question` cases through a shared website form, and anyone can email support. Signed-out visitors see Sign in and Send us an email options, using a public email link and visible support address rather than an anonymous form. The link opens a draft in the visitor's configured mail client, not an automatic send. Receive email messages without a contact-verification ceremony, apply spam controls and send the initial receipt. General help may proceed; private support requires appropriate authenticated account authority. Signed-in submissions carry authenticated Business/user/account context; public email intake does not establish account authority. Operators view the conversation/history, manage status and reply in the shared backoffice. Substantive replies are as needed; ticket AI suggests drafts for an operator to review and send, not autonomous replies. Customer follow-up is by email, with replies joining the same case. There are no customer ticket-history or conversation/reply pages in the product for MVP. A public monitored support address remains available to people who cannot sign in; authenticated private-support continuation and detailed form behavior remain to define. Receiving a suggestion does not promise its implementation.

On 2026-10-09 Andrew accepts the signed-in form plus public email-link boundary,
after Astra's simplicity review. This supersedes the earlier anonymous-form
scope; dated reasoning remains in the [Operator work brainstorm](../../../.agent/brainstorms/261008-customer-operations-backoffice.md#signed-out-contact--resolved-2026-10-09).
A public form can be reconsidered if observed friction justifies it. These are
accepted requirements, not implemented support capabilities.

Support emails use Business-configured styling and a logo through shared BFF
rendering, not a TableCards-only delivery implementation. Reuse the existing
auth presentation where appropriate; exact branding/logo contracts remain to
design. A receipt confirms intake, not verified identity or case resolution;
delivery failures, duplicate prevention and email-abuse protections belong to
the shared support workflow.

MVP support reuses the existing Google-only product authentication. It does not
introduce email/Apple login, custom contact-verification tiers or an account
recovery workflow. People unable to sign in may still submit feedback/general
questions; requests for additional login providers are suggestions, not promised
scope. Existing public/guest behavior is unchanged, and support does not bypass
the authentication required for account features.

Andrew accepted this channel/UI boundary on 2026-10-08, replacing the earlier
in-product reply-thread promise while retaining website ticket submission.
[Build 5](../../../docs/factory/mvp-delivery-plan.md#build-5--customer-support-conversation)
owns the shared workflow. Andrew subsequently chooses BFF as the authoritative
home for tickets and conversations, with Resend selected as email transport.
Exact integration/schema still require review; support remains unimplemented.

Both deployments have linked privacy, terms and contact pages that explicitly explain the no-charge preview and actual data/file limitations. They do not invent seller details or a monitored support mailbox. Support conversations, a monitored public contact channel and final commercial disclosures remain launch requirements, not completed capabilities. Build 5 owns conversation/email support; merchant/legal verification remains a separate later gate.

On 2026-10-07 Andrew requested that legal-document applicability and user
agreement be included in the remaining delivery work, not implemented now.
[Build 4](../../../docs/factory/mvp-delivery-plan.md#build-4--paidteam-flow-and-operations)
owns real-purchase disclosures and any required checkout agreement;
[Legal](../../../docs/factory/mvp-delivery-plan.md#legal-documents-and-agreement-readiness)
verifies the complete published-document/interaction boundary. Relevant privacy
notices/consent precede collection or processing. Assess processing contracts,
negotiated agreements and insurance by applicability, not as six universal
documents or checkboxes. Final wording and shared version/evidence design are
unsettled; authentication alone is not agreement to product terms.

Support may expose bounded account, subscription and payment-status context so Andrew can understand finance-related problems. Email possession or a support conversation never authorizes refunds, billing changes, credential disclosure or another sensitive action; those require their own authenticated operator controls and audit trail.

On 2026-10-08 Andrew chooses an in-app knowledge helper plus ticket auto-suggest:
operators approve/send substantive ticket replies; automatic receipts are separate.
The final 2026-10-09 policy permits scoped read-only tools and assigned skill
loading automatically; every substantive reply requires the exact operator Send
decision. Earlier all-tool approval is superseded; wider automation needs separate review.
Share suitable Business knowledge/procedures, not every permission. Evaluate
answer correctness and approved disclosure, including confidential business and
implementation information. Supply only approved knowledge, not the raw repository.
An on-demand Codex review/improvement workflow should inspect bounded questions,
answers and drafts, test improvements and report evidence rather than require
Andrew to do routine analysis. [The customer-operations brainstorm](../../../.agent/brainstorms/261008-customer-operations-backoffice.md#approved-knowledge-and-an-on-demand-codex-improvement-workflow--2026-10-08)
owns its design. On 2026-10-09 Andrew adds shared bot-interaction/outcome
measurement for helpers, support and other configured variants: useful questions/
topics, observed actions/handoffs, explicit usefulness feedback and operator
draft acceptance/edits, with optional AI topic/possible-frustration labels kept
separate from facts. Do not require a customer survey for every bot or infer
success from silence, clicks or lack of a ticket. Useful bounded/redacted examples
and effective bot/skill versions support operator and evaluation review; exact
signals, feedback placement, classification and retention/privacy remain open.
Reuse shared BFF measurement contracts rather than Business-only instrumentation
or a separate analytics platform. The accepted ticket survey remains unchanged;
these measurements grant no automatic improvement, marketing or bot authority.
Exact helper/ticket context, tools, model, cost/data limits and
skill/command remain open. Autonomous ticket sending/actions/resolution are not
approved; neither passing evaluation nor a helper's success grants those powers.
Shared BFF bot controls and selective event context are now under exploration:
approved customer-facing fields and internal-only information must remain distinct.
Raw event records, human-operator privilege and direct product-data access are
not granted to bots. Andrew prefers small file-assigned instructions/evaluation
questions, a BFF/backoffice-owned support assistant and a shared themed helper
component that TableCards can place without reimplementing chat logic. A large
bot-management console is deferred. On 2026-10-09 Andrew chooses a site-wide
TableCards Q&A helper, rather than the proposed Create-only launch configuration.
It explains approved product behavior and offers clickable links to relevant
pages. The customer chooses navigation; this does not authorize project/account
changes, broader private-data access or loading all knowledge into each request.
Andrew also selects signed-in/out awareness and the active account's current
plan through minimal validated BFF context. The helper can explain relevant
documented limits, suggest existing Google sign-in when useful, and direct
unresolved issues to the configured support email through a customer-clicked
mail link or offer the planned signed-in ticket form. Prefer resolving questions
and issues in the helper, not creating unnecessary tickets, while retaining
direct contact and offering it when the customer asks or the helper cannot help.
Contact includes questions, problems, feedback, suggestions/missing features and
product/offer enquiries; customers need not choose support versus sales. "Help"
is a proposed customer-facing label, not a new sales workflow. Ticket submission
remains the customer's explicit action; signed-out sign-in/email choices remain.
Andrew wants giving feedback prominent and independent of chatbot assistance;
problems start with helper guidance and support escalation is inside Help rather
than a prominent Contact us action. Preserve a discoverable direct/fallback path
and the existing intake channels, not an anonymous form. General feedback is
distinct from optional answer ratings and the accepted ticket closing survey.
Support replies may use the TableCards name without describing the internal
drafting bot on every message; they remain operator-approved and must not invent
a human sender or falsely claim human authorship/review. Fully automatic reply
authority and its disclosure are not approved by this branding choice.
General Q&A does not require login; no automatic email or ticket creation follows.
Ground rules require approved guidance, explicit unknowns,
no invented plan/payment/offer claims and no internal/private disclosures.
Missing context stays unknown; preview/mock access is not verified payment.
Exact placement, additional context, integration/source contracts and limits
remain open; no helper is yet implemented.
Support configuration requires at least one bot; shared-system helpers may be
absent or multiple, with no automatically created default pair. Helper/support
use a small extensible bot definition with name/main
instructions and assigned skill metadata; full skill content loads on demand,
not all product knowledge on every invocation. TableCards may supply approved
page context and code-registered UI/backend tools through the shared interface;
for UI tools, the page declares capabilities and executes its own registered
handlers for structured tool requests returned by BFF; no generated code is run.
On 2026-10-09 Andrew's final typed clarification narrows initial support tools to
read-only: permitted scoped reads and assigned skill loading run without approval.
The bot suggests a reply; an operator may edit, send or reject it. Every substantive
support reply requires approval of the exact recipient/content before sending.
Refunds, credit grants and other
account/project writes remain excluded. Policies apply per action within one
agent, with data-access, rate and spending controls still enforced. Exact tool
names/fields, results/continuation, authorization, payload and cost contracts
remain to review; this is not implemented support functionality.
This revises fixed-tools-only scope, not existing account rules. Helpers
are optional and may have page-specific definitions; a Business need not embed one.
Support starts in draft mode on the same model/tool foundation as the helper,
with its own ticket workflow and one authoritative history. Initial specialist
routing is excluded; future named definitions or automatic reply policies require
separately accepted scope. No auto-send activation or billing-action powers are implied.
Preserve future additional current-page, signed-in BFF facts and product-owned saved-project context
through approved bounded adapters, without copying TableCards data into BFF or
automatically supplying guest lists/files. These extensions do not approve
broader initial live-data access beyond the helper's selected sign-in/plan facts,
or change the backoffice's no-product-read boundary.
MCP is a later possibility, not an MVP dependency.

Operational readiness includes focused product/business events, basic traffic and conversion visibility, billing truth, support visibility, health/error monitoring, a deployment procedure and recovery notes. Dedicated MVP slices must make these capabilities operational before launch rather than leaving them as post-launch polish. Operator work selects Resend for BFF-owned email tickets, private Cloudflare-regenerated screenshot previews, and sparse meaningful save/export/AI/blocked outcomes plus existing BFF facts. The broader acquisition/conversion measurement promise remains in Marketing/Launch, not an extra current event platform. Monitoring separately selects technical health/error tools after defining privacy, redaction, costs and actionable thresholds; no monitoring provider is selected. Selected directions are not implemented services; the [final architecture review](../../../.agent/brainstorms/261008-customer-operations-backoffice.md#proposed-erd) remains a proposal.

Canonical analytics should answer a bounded launch funnel: where a visitor came from, whether they signed up, reached first successful preview/export, started checkout, became paid and later needed support. High-volume UI clicks are collected only when they answer a named product question. Analytics must not contain guest names/lists, card contents, credentials, payment details or unnecessary customer profile data.

Monitoring covers public/product/BFF health, unexpected application errors, PDF-generation failures and failed or delayed payment/support delivery. Events include environment, deployed version and safe correlation evidence; expected authentication denials and rate limits are excluded from error alerts. Sampling, redaction, retention and spend limits are required, and alerts exist only for conditions an operator can act on.

The backoffice must be usable, not merely a database viewer: Business/environment-scoped customer/account investigation, all-Business summaries without merged profiles, joined safe BFF account/access/session/support evidence, reported product outcomes and unresolved-support/delivery queues. Operator work does not query the TableCards project/export database or promise global product-record search. Broader acquisition/conversion evidence remains a separate Marketing/Launch requirement. Mobile/desktop navigation, filters, pagination and truthful error/empty/loading states are required. It is not a general analytics product or configuration editor; repeatable configuration stays in the validated CLI, and sensitive actions require their own authority and audit controls.

Andrew clarified on 2026-10-07 that his phone will initially be his main operator
tool: essential lookup, triage and support handling must be mobile-first as well
as usable on desktop. Alerts must actually reach the operator. One Telegram
destination was initially proposed and Andrew later selected Telegram as the
first transport; setup, notification contents and an optional daily digest
remain delivery-time choices. Keep
customer/guest data out of chat alerts and preserve authorization at every
protected detail/action. Further autonomous AI operations and the earlier limited
QA/helper-role suggestion remain optional ideas, not approved access or a
replacement for the required support workflow;
a possible two-day response target is not yet an advertised SLA.

The backoffice must also support investigation before a user complains: link
automatically detected failures to the known user/account and relevant recent
operation evidence, with explicit unknowns when identity/outcome is unavailable.
Andrew must be able to find the customer and understand what happened on his
phone without depending on an AI assistant. Shared human/agent access boundaries
are a design direction, not authority for an agent to read all customer data or
perform sensitive actions.

Operational placement is deliberate: customers create/export cards, select an offer and manage their own permitted Studio membership through product UI; operators apply deployment/auth/catalog configuration and repeatable provisioning/recovery through validated automation; the backoffice shows safe joined state, queues and evidence. Human support handling or a sensitive remediation action belongs in an explicitly secured operator workflow when its delivery stage implements it. Existing backoffice customer/account reads do not establish that TableCards billing, support or launch monitoring already works.

## Promise acceptance and evidence

Every advertised capability must have an understandable workflow, authoritative enforcement and suitable verification before launch. The table connects product promises to existing sources rather than duplicating the application story registry. Ordinary development regression uses no-charge commerce and explicitly selected AI fixtures; manual AI test evidence against real Cloudflare is recorded separately.

| Promise                                                        | Discoverable workflow                                                             | Authority and suitable evidence                                                                                                                                                                      | Current boundary                                                                                                                                        |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preserve the imported list and preview every card              | Public creator, mapping/review and restored draft                                 | [Guest/import rules](../libs/core/src/guests.ts), [import tests](../workloads/web/src/imports.test.ts), [hosted journeys](../e2e/src/user-stories.spec.ts)                                           | Verified in development; truthful development policies exist, final commercial disclosures remain later gates                                           |
| Clean 25-card Free export and up to 500 paid cards             | Creator/saved-project review and PDF download                                     | [Server export](../backend/convex/exports.ts), [project scope/limit tests](../backend/convex/projects.test.ts), [PDF tests](../libs/core/src/pdf.test.ts), hosted offer journeys                     | Development gates pass; Andrew accepted his existing print for Build 3; measured print certification remains a pre-launch gate                          |
| Offer prices, project/seat/AI limits and paid designs          | Public pricing, Account and shared checkout                                       | [Code-owned catalog](../libs/core/src/catalog.ts), [BFF checkout tests](../../../platform/bff/service/convex/checkouts.test.ts), [TableCards access enforcement](../backend/convex/productAccess.ts) | Exact accepted pilot offers exercised without money; verified provider billing and lifecycle remain Build 4                                             |
| Event artwork and reusable/shared presets                      | Saved event artwork and professional Designs workflow                             | [Asset validation](../backend/convex/assets.ts), [project/preset tests](../backend/convex/projects.test.ts), hosted Event/Planner/Studio journeys                                                    | Deployed to both; full development workflows verified; Event artwork remains event-scoped                                                               |
| Four AI choices, no guest contents, correct balance/refund     | Authenticated generation and live remaining-batch state                           | [AI orchestration](../backend/convex/ai.ts), [BFF unit tests](../../../platform/bff/service/convex/productAccess.test.ts), hosted AI success/failure journeys                                        | Fixtures plus sampled real Cloudflare checks; estimated cost/budget verified, not universal quality or confirmed per-user spend                         |
| Five-person Studio, roles and protected ownership transfer     | Team, copied invitations, recipient acceptance and reauthentication               | Shared BFF account authority, [auth ADR](../../../docs/architecture/adr/0004-business-customer-auth-and-accounts.md), hosted Studio journeys                                                         | Real APIs with no-charge commercial access; development round-trips pass; fresh authenticated production recipient/transfer evidence remains unverified |
| Retention, real billing, two-way support and observable launch | Billing/remediation, support and operator workflows required by the delivery plan | Verified provider events/lifecycle tests, correlated email round-trip, operational/production smoke and human print/live acceptance                                                                  | Accepted requirements, not delivered launch capabilities; remaining Payments-to-Launch outcomes                                                                                    |

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
- marketing/transactional email outside the required support and invitation workflows, advanced analytics/reporting, autonomous ticket replies/account remedies and monitoring/security hardening beyond the bounded launch operations slice
- print fulfillment and shipping

## Remaining delivery-time decisions

- Validate the implemented manual invitation-link workflow with a real Studio team; add automated delivery only if a subsequent accepted requirement needs it.
- Select the email provider and safe inbound-reply correlation mechanism for the accepted BFF-owned tickets and conversations; settle the detailed form, contact-trust and lifecycle behavior.
- Validate the working TableCards brand and reach launch users; the preview domain is already deployed.
- Rebenchmark the configured production AI budget if model/geometry changes; sampled generation does not establish universal model quality.
- Obtain Paddle's written Israeli seller, payout and microtransaction terms before locking Build 4 resources or publishing the final price page.
- Complete physical four-card/100%-scale verification; separately accept or reject the six-card trial and resolve font coverage before publishing final print claims.
- Implement and verify the accepted Event Pass/professional lifecycle, public policies/contact, support and launch operations; production readiness requires the delivery plan's production and live acceptance gates.
