# Business Factory — TableCards MVP-to-Launch Plan

Updated: 2026-10-09.

This is the single authoritative MVP delivery roadmap for the first Business
Factory product: accepted build scope, dependencies and launch acceptance live
here. The [TableCards product specification](../../projects/tablecards/docs/product.md)
owns product promises and limits. The broader platform intent remains in
[Business Factory — BFF MVP Architecture](../architecture/bff-mvp-architecture.md);
[ADR 0001](../architecture/adr/0001-convex-first-bff-stack.md) governs the stack.

## One roadmap, supporting records

Clarified at Andrew's request on 2026-10-07:

- This document is the only overall MVP delivery plan. Splitting a build updates
  this roadmap; it does not create a second roadmap elsewhere.
- `.agent/brainstorms/` records questions, alternatives, research and discussion
  history. In particular, [remaining MVP priorities](../../.agent/brainstorms/261007-remaining-mvp-priorities.md)
  is now inactive history, not another plan or a backlog of approved work.
  Keep ordinary priority questions in this roadmap; a separate brainstorm is
  useful only for a distinct design decision needing substantial alternatives
  or research, not automatically for each build or small change.
- Accepted delivery changes are reconciled here, and product-promise changes in
  the product specification. A recommendation in a brainstorm alone does not
  override either canonical source or authorize implementation.
- A scoped `.agent/plans/` execution plan details only an accepted build/feature:
  code, dependencies, tests and rollout. It must link to this roadmap and the
  relevant product/technical contracts, not independently redefine the MVP's
  scope or order. Historical completed plans retain their dated evidence.
- `STATUS.md` is the short current handoff, not a second roadmap. If it or an
  execution plan disagrees with accepted canonical scope, reconcile the record
  before proceeding rather than choosing whichever file was read last.

## Task-system boundary

Repository plans and the active conversation govern Codex work. Nirvana is only Andrew's short personal blocker list for actions that truly require him at a computer or in the physical world, such as provider identity verification, entering credentials, buying a domain or measuring a printed sheet.

Do not add Codex implementation work, discussion topics, reviews, choices or approvals that can be resolved in conversation to Nirvana. When either route works, resolve the item in conversation. Do not put credentials, identity documents or payment details in Nirvana, chat or git; use the chosen provider connection or secret store.

## Product and scope

The working first product is **TableCards**: a visitor pastes or uploads a guest list, previews a fixed folded-card layout and, after authentication, saves or downloads a correctly sized printable PDF. Occasional hosts use a one-time Event Pass; the repeat-buyer hypothesis is an independent event planner or small planning studio. Demand and all prices remain unvalidated hypotheses.

The smallest launch scope is:

- Pasted lines/grids, CSV or XLSX with required names, optional table numbers and one optional short marker, preserving spelling, order and duplicates.
- One 3.5 × 2 inch folded tent-card format, four per US Letter sheet, with three free predefined designs and a premium library.
- Preview of every card before export.
- Cards-only PDF export with cut/fold marks; a separate print-test download supplies the scale-check sheet.
- Explicit handling of long names and unsupported characters.
- Free 25, a `$5` Event Pass, `$9/month` Planner Pro and `$19/month` five-member Studio; no annual offer in the MVP. Paid offers add larger projects, premium/custom designs, bounded optional AI batches and reusable/team workflow.
- Public import/preview followed by required Google login for save, export, AI generation or payment, plus support submission, email follow-up, shared backoffice handling and a public support-email link for signed-out visitors.

Not in the first launch: arbitrary dimensions, A4/flat-card output, RTL scripts, seating planning, direct Google Sheets integration, general guest-list management, structured meal/caterer workflows, print fulfillment, annual or per-seat billing, domain joining, Apple login, generic marketing automation, advanced reporting, autonomous ticket replies/account remedies or a second product.

**2026-10-08 AI direction:** Andrew chooses an in-app knowledge helper and ticket
auto-suggest in the MVP support discussion: an operator reviews/edits and sends
substantive ticket replies. This narrows the earlier blanket AI-support exclusion;
Andrew initially specified approval for every permitted support-tool call; on
2026-10-09 his final typed clarification narrows initial tools to read-only:
permitted scoped reads and assigned skill loading run without approval; the bot
suggests a reply and the operator chooses whether to send the exact content.
Every substantive reply remains approval-gated, with server-enforced data/rate/budget limits and no
refund/account-write powers. Action-specific policies do not require separate bots.
Automatic initial receipts remain separate. Both roles may share suitable
Business knowledge/procedures, with distinct context and tool boundaries, and
need repeatable answer evaluation and approved-knowledge/disclosure review.
Andrew wants an on-demand Codex review/improvement skill, not mandatory manual
analysis. [The active customer-operations brainstorm](../../.agent/brainstorms/261008-customer-operations-backoffice.md#helper-first-ticket-suggestions-and-shared-answer-checks--2026-10-08)
owns the alternatives and detailed contracts. AI SDK with existing Convex and
Resend are selected; the cheap-model winner and exact evaluation/integration
details follow later testing/planning. No code/schema change is approved.
Andrew prefers file-assigned reusable instructions/evaluation questions and
configured bots, not a default pair: at least one BFF-owned support bot, initially
drafting replies, and zero or more optional helpers. Businesses can embed the
configurable, themed helper component without rewriting chat logic. Defer a large
management console. Use a small extensible bot definition with name/main
instructions and assigned skill metadata; load full content only when relevant,
not all product knowledge on each call. Businesses can supply approved context
and register tools through code, revising the earlier fixed-tools-only boundary.
UI declares its tools and executes its registered handlers for structured requests
returned by BFF/the bot; arbitrary generated code is not executed. Exact
lazy-loading limits, result/continuation protocol and per-action approval/backend
authorization contracts remain open.
**2026-10-09 scope split:** Company-wide Paperclip/Dots-style roles, analysts,
automation/monetization/marketing reviews and their proposal inbox are explicitly
[post-MVP future ideas](../architecture/future-ideas.md#post-mvp-ai-company-organization),
not this build's choices or MVP dependencies. The current helper/support
discussion includes useful [operating/evaluation skills](../../.agent/brainstorms/261008-customer-operations-backoffice.md#current-build-operating-skills--scope-refinement-2026-10-09),
initially invoked manually through Codex. Dots is optional and requires verification,
not a required connector. This corrects Andrew's "Build 4" reference to current
work; it does not renumber builds or move payment dependencies.
Helpers are optional and may vary by page. Drafting is the support bot's initial
reply mode, not its identity. Helper/support are roles, not a two-bot limit:
definitions share the AI SDK foundation, with separate helper-chat and bounded
support-drafting workflows and authoritative history. No initial specialists or
category router; future automatic replies require separately accepted authority.
Preserve future page, signed-in customer and product-owned saved-work context;
those live-data integrations are not automatically initial MVP requirements.
Exact file/integration contracts and filtered event access
remain to design; MCP is an optional later interface, not an MVP dependency.

## Delivery rules

- Add data models and API surface only when the active implementation slice uses them.
- Break down a grouped action only when work begins; do not turn the project into a speculative backlog.
- Give an accepted substantial independent MVP addition its own build or named
  sub-build, outcome, dependencies and acceptance boundary instead of burying it
  in an existing group. Small cohesive refinements may stay with their owning
  build; deferred ideas stay outside the MVP.
- Build numbers are delivery groupings, not fixed batch sizes. A group with
  independent outcomes may be split into smaller named builds/sub-builds, each
  with a clear acceptance boundary. Use focused design discussion when needed,
  not a mandatory new document. Preserve completed-build
  identifiers, required launch outcomes and real dependencies; splitting does
  not add scope or authorize implementation. Do not create empty brainstorms or
  plans for every possible split in advance.
- Hosted provider setup must not block local work that can be implemented and tested without credentials.
- Every feature slice must be self-verifiable with real validation commands.
- Assess each build's repeatable operating/review needs: reuse or extend a useful
  Codex/operator skill where warranted, rather than require a new skill per build
  or bot. Helper/support operating and evaluation workflows belong with that
  current work; exact contracts remain in its brainstorm. Skill invocation is
  not automatic approval for customer messages, authority changes or deployment.
- Keep browser regression small and valuable: automate the important happy flows and expensive regressions. Put edge cases, authorization denials and webhook replay cases in faster unit or integration tests.
- Product code consumes the public BFF API/SDK, not Convex implementation internals.
- Treat a slice intended for production as complete only after its production deployment and production smoke pass; local and development verification are readiness gates.

## Execution order

**2026-10-09 — names and meanings accepted by Andrew.** Use short names to
identify work. Numbers are stable references in this revision, not a required
execution sequence; reorder work when actual dependencies and blockers permit.
Historical records keep their original numbering. The separate Marketing, Legal,
Maintenance and Launch builds below replace the old bundled Build 7 without
adding scope or creating another roadmap.

**Current focus: Operator work**, still in feature brainstorming, not approved
for implementation. **Payments is on hold** for Paddle access/confirmed terms,
not completed or removed. Non-billing customer/support work can proceed from
the released identity and TableCards base; verified payment facts depend on
Payments. Provider-neutral local work need not wait for hosted credentials.

Monitoring, Marketing, Legal and Maintenance each retain their own outcome.
Legal notices must precede the relevant data collection, and purchase disclosures
and agreement must precede real payment; a later final Legal review does not
defer those requirements. Launch depends on all required outcomes and evidence,
not on completing numbered builds in sequence. Configuration changes, provider
setup, code work and production deployment still require their applicable authority.

## Grouped launch tasks

| Reference | Name | Meaning / outcome | Current state and real dependencies |
| --- | --- | --- | --- |
| 1 | Foundation | Workspace, shared service, contracts and validation harness | Completed; no dependency |
| 2 | Identity | Google authentication, accounts and shared SDK | Completed; Foundation |
| 3 | TableCards | Import, designs, complete preview, PDF and no-charge checkout | Published preview; Foundation/Identity and product contract, not final customer launch |
| 4 | Payments | Real checkout, subscriptions and paid-access lifecycle | On hold; TableCards, confirmed Paddle access/terms for hosted checks |
| 5 | Operator work | Customer support, helper/support bots, business/customer visibility and usable backoffice | Active brainstorm; Identity/TableCards base; email transport for hosted support; verified billing facts after Payments |
| 6 | Monitoring | Technical health, errors and actionable alerts, not business activity | Later MVP; deployed flows and configured telemetry/alert transport; required before launch |
| 7 | Marketing | Positioning, launch messaging and first-user/pilot approach | Later MVP; accepted product promises and offers; detailed discussion deferred |
| 8 | Legal | Required documents, notices and agreements | Later final review; actual product/data/commercial behavior; applicable notices and checkout agreement required earlier |
| 9 | Maintenance | Final code-quality, shared-reuse and operating review, not maintenance bots | Later MVP; implemented flows/evidence; no blanket refactor authorization |
| 10 | Launch | Final deployment, regression, recovery and customer-launch checks | All required build outcomes and applicable provider/physical acceptance |
| — | Human blockers | Provider verification, credentials and physical/live checks Codex cannot complete | Andrew; activate only when actionable |

Codex owns implementation and review within accepted scope. Andrew owns the
personal/provider/physical actions that cannot be delegated. The table does not
authorize implementation of the active brainstorm or deployment.

### Build 1 — Foundation

**Status: Completed 2026-09-26.** The reviewed implementation is live in development and production; automated validation/deployment/smoke and the real operator sign-in passed.

Create the Nx workspace, ownership boundaries, minimal Convex BFF service and operator-managed `businessEnvironments` registry. Add the repository-owned operator CLI and a hosted, phone-friendly, read-only backoffice protected by direct Google OIDC plus a fixed server-side operator allowlist. Define only the contracts and table used by this flow. Establish typecheck, lint, unit/Convex integration testing, a deterministic Playwright dashboard flow, secret scanning and baseline GitHub Actions CI.

The required local gate is done when the repository runs without provider accounts, the public health and internal Business-environment paths work, auth denial/allow tests pass, the dashboard browser test passes and validation commands are documented. Hosted development verification follows only after Andrew authorizes one Convex development deployment, Cloudflare site and public Google web client. Build 1 is complete only when the reviewed `main` commit passes GitHub validation, automatically deploys the separate production Convex backend and `ops.tofler.tech` dashboard, passes production smoke and Andrew confirms one real production Google sign-in. No speculative tables, TableCards code or placeholder SDK modules belong in Build 1.

<a id="build-2--shared-identity-accounts-and-sdk"></a>

### Build 2 — Identity

**Status: Completed 2026-09-27.** The reviewed shared identity/account implementation is live in development and production; automated validation/deployment/smoke and Andrew's complete real Safari lifecycle plus backoffice confirmation passed.

Choose the current supported Business-user authentication mechanism and enable Google as the only production MVP provider. Keep provider-qualified technical identities private to BFF auth and create a distinct local user row in each Business environment the person accesses. Implement the accepted configurable account/membership boundary, fixed Owner/Admin/Member roles, invitations, provider-neutral ownership transfer/reauthentication and thin typed SDK paths, with a stable centrally revocable Business session, short-lived environment/account-bound JWTs and the retained minimal example Business. Verify signup/onboarding policies, authorization, renewal, independent tab account selection, concurrent/replayed login denials, cross-environment isolation and the development-only automated identity path. Do not add paid-plan/subscription tables, product-entitlement evaluation or restricted-account guards before Build 4 has their first real caller.

Development readiness requires the hosted example to create or reuse an authenticated environment user/account, exercise protected Business backend access, select account context when multiple memberships exist and appear correctly in the development backoffice. Repeatable automation uses the development-only provider. Build 2 is complete only after the reviewed commit deploys BFF/auth and the non-promoted production example at `example.tofler.app`, production smoke passes with no automation provider/configuration present and Andrew uses real Safari to verify Google login, protected access, hard reload, renewal after the first ten-minute JWT expires, a second tab, logout preventing both tabs from minting again and the corresponding production-backoffice records. Support is not part of this build. Apple, email delivery and PostHog are not prerequisites.

<a id="build-3--tablecards-core"></a>

### Build 3 — TableCards

The authorized no-charge production preview was deployed and smoke-verified on
2026-10-07. [Release evidence](../../projects/tablecards/docs/reviews/261007-build-3-production-release.md)
records the full development journeys, bounded production browser/provider
proof and remaining personal-authentication/launch limits. This is not real
paid billing or final customer-launch acceptance.

Implement pre-auth pasted-line/grid, CSV and XLSX guest import with required name, optional table and optional short marker; predefined designs; paid uploaded-artwork presets; complete preview; the fixed print layout; and deterministic PDF generation. Preserve exact guest multiplicity. Validate image resolution, font coverage and fitting before export. Include cut/fold marks; keep calibration in the separate print-test PDF, not an extra customer-export page (accepted correction 2026-10-07). Require authentication for save/export/AI/payment, not for import and preview.

Implement the accepted Free 25, one-event/500-card Event Pass, 25-active-project Planner Pro and 100-active-project Studio boundaries through the BFF-owned deterministic no-charge checkout. The later [shared checkout decision](../../.agent/plans/260929-shared-mock-checkout.md) supersedes the earlier development-only boundary: development and the published Build 3 production preview use that explicitly labeled simulation. TableCards requests a checkout URL through its authenticated backend and returns from the shared page; it exposes neither a local dummy-payment screen nor arbitrary client-side access grants. The mock drives the same application-facing access contract later used by real billing and supports positive and denial tests without a live charge. Studio invitations, team workflows and their compatible seat policy are exercised in Build 3. Do not claim real payment, paid-through state, cancellation or retention enforcement; Paddle checkout, webhooks and verified subscription lifecycle belong to Build 4.

After deterministic predefined-design export works, add optional AI backgrounds using a benchmarked cost-efficient model. One typed account-owned unit reservation produces four choices; success commits the unit and provider failure releases it idempotently. Exercise the accepted lifetime/event/monthly allowances without putting mutable balances in JWTs or sending guest-list data to the provider. Ordinary predefined/uploaded designs and PDF export must remain usable when AI is unavailable.

Development and the no-charge production preview use capped real Cloudflare
generation, with optional company/style references and independent deployment
budgets. Ordinary development regression selects labelled fixtures without
inference cost; production rejects fixtures. [TableCards Operations](../../projects/tablecards/docs/operations.md#cloudflare-ai-budget-and-reference-images)
owns the model, cap and manual AI procedure. Fixture tests alone do not prove
live quality/cost; private production inference, browser evidence and durable
cross-service recovery checks have separately stated limits.

The core regression fixture includes duplicate names, accents and long names. Automated checks verify exact guest multiplicity, page size/count and absence of clipped text. On 2026-10-07 Andrew accepted his existing satisfactory printed sheet as sufficient for Build 3 and deferred detailed physical testing to final MVP pre-launch acceptance. Further printing is not a Build 3 blocker. A 100%-scale ruler/margin check remains required before claiming measured physical output compatibility at launch; the six-card layout remains a development trial rather than a new launch promise.

<a id="build-4--paidteam-flow-and-operations"></a>

### Build 4 — Payments

**Status: On hold for Paddle access/confirmed terms.** This build remains an MVP
requirement; non-billing Operator work does not need to wait for it.

After Paddle confirms the Israeli seller/payout and sub-`$10` one-time/recurring terms in writing, route the shared checkout interface directly to Paddle in production; development may choose Paddle or the mock. Implement verified Event Pass and subscription state, idempotent webhooks and minimal purchase/acquisition events while preserving the Business-facing contract. Build on the Studio invitations, five-seat policy and shared design workflows demonstrated in Build 3, and add only the operator views needed for purchases, subscriptions and billing remediation. Do not add annual billing. Monthly mock allocation demonstrates a successful-renewal simulation, not payment truth; real monthly allowances must advance only from verified provider subscription/paid-through state and must never renew merely because wall-clock time crossed an anniversary.

Before enabling real payment, establish the applicable product/provider terms,
seller identity, cancellation/refund arrangements and recurring-price/renewal
disclosures. Present these before purchase and implement any required purchase
agreement/evidence in the shared/provider checkout, not a TableCards-only dummy
screen. Ask the focused business/legal questions during this work, not now;
document versions, acceptance scope and storage design remain to be settled.
Do not defer checkout requirements until the final Legal/Launch reviews or confuse Google sign-in with
acceptance of product terms.

Signed payment fixtures must let the full happy path run without a live charge and must prove that a missing, failed or expired renewal does not create the next allowance. A requested downgrade is rejected until the account satisfies the target plan's limits. An unavoidable expiration or payment failure preserves users, memberships and data, restricts ordinary product access and keeps Owner/Admin remediation access so they can restore payment or reduce usage; it never removes members automatically. Done means Free cannot export over 25 cards or use paid design capabilities, Event Pass grants exactly one 90-day event, verified subscriptions produce the correct project/AI/team entitlements, cancellation/status changes and the accepted 30-day access plus 60-day deletion-warning lifecycle are handled, seat and role rules are enforced and webhook replays are harmless.

<a id="build-5--customer-support-conversation"></a>

<a id="build-5--operator-work-customer-support-and-business-visibility"></a>

### Build 5 — Operator work

**2026-10-09 regrouping — accepted:** Andrew wants one focused operator build:
nontechnical business visibility, meaningful customer information and support
handling, with related customer-facing help/contact abilities. Move the usable
backoffice, meaningful events and basic business-visibility scope formerly in
Build 6 here. Technical monitoring is a separate later Build 6; logs, metrics,
traces, uptime panels and monitoring-provider setup are not this build's scope.
Company-wide Paperclip/Dots roles remain post-MVP. This accepts the delivery
boundary, not the whole design, schemas or implementation.

#### Customer support and helper/support assistance

**2026-10-09 helper choice:** TableCards launches a site-wide Q&A helper with
customer-clicked links to relevant pages, not a Create-only helper. Use approved
skills on demand and minimal validated sign-in/current-account plan context,
with ground rules for relevant login suggestions and support email referral;
prefer helper answers with optional customer-confirmed form/email handoff for
questions, problems, feedback and suggestions. Make feedback easy to reach
without chatbot assistance; issues start helper-first with discoverable escalation
inside Help. Business-branded substantive support remains operator-approved,
without invented human authorship. Customers need not select a
support/sales department; no sales workflow, project/account-changing authority
or automatic email/ticket submission follows. The
[TableCards product contract](../../projects/tablecards/docs/product.md#support-feedback-and-operations)
owns the Business-specific promise. Helpers remain optional/configurable for
other Businesses; additional context, runtime and implementation remain unapproved.

Add the required support capability as its own implementation slice rather than expanding Build 2. Signed-in customers can open `feedback` (including suggestions and missing-feature requests), `problem` or `question` cases through a shared website form, and anyone can email support. Signed-out visitors see Sign in and Send us an email options, with a public mail link and visible support address; no anonymous website form is required for MVP. The link opens a draft in the visitor's configured mail client, not an automatic send. Receive email messages without a contact-verification ceremony, apply spam controls and send the initial receipt; general help may proceed, but private support requires appropriate authenticated account authority. Signed-in submissions carry trusted environment/user/account context; public intake must not invent account authority. Operators review history, handle status and reply through the shared backoffice. Substantive replies are as needed; ticket AI suggests drafts for an operator to review and send, not autonomous replies. Customer follow-up uses email, with inbound replies joining the same case. Provide a monitored support address for people who cannot sign in; authenticated private-support continuation and detailed form behavior remain to define. No customer ticket-history or conversation/reply pages in the Business website for MVP.

**2026-10-09 channel decision:** Andrew accepts Astra's signed-in form plus
public email recommendation, with explicit website choices to sign in or send
email. This supersedes the earlier public-form scope; its dated reasoning is
preserved in the brainstorm. Reconsider an anonymous form only if observed
friction justifies it. BFF case ownership and email follow-up are unchanged.

Emails use Business-configured styling and a logo, with shared BFF rendering;
reuse existing auth presentation where appropriate rather than duplicate brand
settings. Exact logo/configuration contracts and editing controls remain open.
Initial receipt delivery must be retry-safe, bounded against abuse and email
loops, and distinguish received, sent/delivered, answered and resolved. A receipt
does not verify contact/account identity or promise a substantive response/SLA.

BFF owns the authoritative tickets and conversations; an email provider supplies transport, not a separate helpdesk record. Select the concrete inbound/outbound email integration after its focused design discussion. Finance-related cases may show bounded account/subscription/payment-status context, but support messages never authorize refunds, billing changes or credential disclosure. Done means website/email intake works, outbound delivery and inbound reply correlation are verified, spoofed/cross-environment replies are denied and the case/history/handling is available in the shared backoffice while customers receive their conversation by email.

**2026-10-08 channel and ownership decisions:** Andrew confirms website or email submission,
email-only customer follow-up and history/handling in the shared backoffice,
not in the Business website. This replaces the earlier in-product reply-thread
promise, not the initial website ticket-opening capability. The
[active ticket discussion](../../.agent/brainstorms/261008-customer-operations-backoffice.md#ticket-system-and-email-first-conversations--exploration-2026-10-08)
preserves the earlier alternatives. Andrew subsequently chooses BFF-owned
tickets and conversations rather than external-helpdesk ownership. The email
provider is now selected as Resend; detailed data/workflow contracts remain review
proposals. A standalone mailbox
or customer portal is not the chosen scope.
After Astra's review, Andrew accepts immediate public contact/email intake plus
the initial receipt, without an upfront email-confirmation gate. Spam controls remain
required; general help does not need account proof, while private support must
use appropriate authenticated account authority. Exact private-support
continuation remains to design; contact confirmation does not confer
product-account authority. Suggestions do not promise feature delivery.
Andrew further limits the MVP to existing Google-only product authentication:
support adds no email/Apple login, custom verification-tier system or account
recovery. Public contact remains available for general help and suggestions,
including requests for other login providers; it does not grant alternative
product access. Retain basic spam/duplicate/loop protections and existing
account permissions, without turning contact intake into a new identity system.
No provider, schema, AI authority or implementation is approved by this decision.

The shared helper/support direction and open contracts are in
[Product and scope](#product-and-scope) and the active brainstorm. Include useful
manually invoked Codex operating/evaluation workflows here; helpers remain
optional per Business. Permitted scoped read-only support tools and skill loading
run automatically; every substantive support reply requires exact send approval.
Andrew specifies a [conversational operator-queue skill](../../.agent/brainstorms/261008-customer-operations-backoffice.md#conversational-operator-queue--accepted-capability-2026-10-09)
on 2026-10-09: group cases/pending requests, explain and recommend decisions,
then apply only authorized operator decisions through the same BFF contracts
used by backoffice. Andrew accepts approval of explicitly listed bounded groups,
with exceptions separated; exact previews, supported actions and execution
checks remain open. Other operators use backoffice without Codex or engineering
workspace access. A later independent conversational client, possibly Dots before
Paperclip, can reuse the same secured approval workflow once its integration is
verified; it is not a current-build dependency. No automatic replies or
company-manager bot are enabled by these decisions.
Exact context/read contracts, skill files and quality checks remain review/build
work. A specialist-routing framework is excluded initially; live text budget caps
are selected. Any supported Dots invocation remains later integration work.

**2026-10-09 revised budget boundary:** Operator work uses provider/gateway settings
for the selected $3/day/$30/month live-text safety caps, with native daily/delayed
alerts acceptable. No spending table/dashboard or custom/mock budget-alert
integration; per-user/account cost attribution returns to Future Ideas.
[Selected text caps and provider-alert limitations](../../.agent/brainstorms/261008-customer-operations-backoffice.md#budget-alerts-and-mock-delivery)
remain in the active design record. General Telegram delivery stays in Monitoring;
no channel/credentials/provider setup is performed by this documentation decision.

#### Business and customer visibility

**Current backoffice choices — not implementation approval:**

- First scope: read-only customer/account investigation and existing activity,
  or operator mutations too. Recommend read-oriented investigation first, with
  fixes in validated Codex/operator workflows; support/remediation actions join
  only when their actual secured workflows are accepted and implemented.
- Operator access, agreed 2026-10-08: every approved backoffice operator has the
  same full access to all implemented features and Businesses. Keep sign-in and
  approved-operator admission; do not build granular operator roles, per-Business
  grants or a permissions UI now. Adding actual operators is a separate decision;
  product-customer access and AI action authority are unchanged.
- Customer evidence, agreed 2026-10-08: generic shared pages show meaningful
  BFF-held customer/account information plus important Business-reported events.
  No custom Business backoffice pages or direct reads of product databases in
  this slice. Choose the event catalog, bounded data contract and phone/desktop
  presentation; no automatic incidents or Telegram prerequisite for this slice.

These delivery questions live here rather than in an active parallel priority
brainstorm. The focused [customer-operations discussion](../../.agent/brainstorms/261008-customer-operations-backoffice.md)
records the problem/scope alternatives requested on 2026-10-08; it is not a
second roadmap or implementation approval. Technical monitoring belongs to Build 6,
not this operator scope. Resend, Cloudflare raster previews and the shared AI SDK
direction are selected; no installation, recurring AI schedule or deployment is authorized.

**2026-10-08 customer-context decision:** Andrew confirms one shared backoffice
for all Businesses, with customer investigation and support inside the selected
Business/environment. Cross-Business customer lookup, matching-email associations
and combined person profiles are not required for the initial workflow; revisit
them only for a demonstrated need. This narrows the earlier umbrella discussion,
not the underlying [identity boundary](../architecture/adr/0004-business-customer-auth-and-accounts.md#authority-and-isolation).
Phone/desktop design, signed-in/public tickets and customer-handling actions
remain part of the combined exploration; final feature scope and which sensitive
actions, if any, to expose are still open. Full operator access does not itself
add those actions or grant them to the AI assistant.

Add the minimum operational visibility required to understand and run TableCards.
The accepted initial event set covers meaningful project saves, PDF availability/
failure, AI-batch outcomes and important blocked actions. Reuse existing BFF
account/access/security facts and the new workflow's own support, delivery and
bot-run records; do not duplicate them as generic events. Launch acquisition,
signup/activation/checkout/subscription measurement and UTM/referrer attribution
remain in Marketing/Launch below, rather than requiring that larger funnel in
Operator work now. Add only events that answer a named business question; no
generic clickstream or replacement analytics platform. Exclude guest-list/card
contents, credentials, payment details and unnecessary profile data.

**2026-10-08 event/data boundary:** Businesses report selected meaningful usage
and outcome events to BFF; operator history is not technical log/metric storage.
Andrew selects successful milestones plus important failed/blocked outcomes,
without detailed click tracking; exact event names and payloads still need design.
Keep the catalog, payloads, rate/retention limits and reads bounded. The shared
customer page reads BFF-held facts and recorded events only, distinguishes
reported history from current authoritative state and does not imply product
records are replicated or remotely inspected. The proposed event store/ingestion
contract is not implemented; structural schema approval is still required.
Appropriate event facts may later feed analytics/pixels through separate approved
mapping/privacy controls. Future special-offer eligibility is in the
[existing promotions idea](../architecture/future-ideas.md#shared-promotions-personal-offers-and-repeat-purchase-campaigns),
not a new MVP campaign/discount engine or permission to send full customer records.

**2026-10-09 shared bot-learning requirement:** collect useful interaction and
outcome evidence across configured helper/support/custom bots, attributed to
Business/environment and bot/version. Separate observed actions, optional explicit
customer/operator feedback and fallible AI topic/frustration labels; neither
silence nor lack of a support ticket proves success. Propose bounded/redacted
question/answer samples and role-specific topic, handoff and draft-acceptance/
editing measures for the existing operator/evaluation skills. Preserve the accepted
ticket survey; no mandatory feedback everywhere, general clickstream, company-bot
platform or automatic improvement/marketing action. Exact metrics, label execution,
feedback placement, privacy/retention, data model and implementation remain open.

Turn the existing read-oriented backoffice into a usable daily operator surface. It should provide:

- an all-Business summary dashboard and a dashboard for each Business/environment, with links to relevant areas; show what is happening now through meaningful customer/activity summaries, open support, pending approvals, delivery issues, feedback and significant milestones/blocked outcomes, not technical health. Preserve environment scope, distinguish unavailable/simulated billing facts and do not merge customer profiles across Businesses. The longest-waiting ticket initially uses its current wait for our next action, not original creation age;
- search within the selected Business/environment by safe customer email, public user/account ID, BFF-held payment/support reference or a recorded product-event reference, with direct links to the shared customer/account view; no product-database query is required;
- Business-scoped customer/account detail showing meaningful BFF-held profile, memberships/invitations, session state, access/limits/units, available checkout or verified billing facts, support history and a chronological security/activity timeline; product milestones come from reported events, not custom product pages or live product-data reads;
- an investigation path from a meaningful business outcome or support case to known affected users/accounts and bounded activity, even before a customer complains; unknown identity or outcome stays explicit;
- focused queues for unresolved support, pending reply approvals, undelivered replies and BFF-known customer/billing problems, with status, age, actor/action history and safe references; no ticket-owner assignment or manually maintained priority labels initially. Show meaningful outcomes, not raw logs, with missing/stale evidence explicit;
- bounded activity/outcome counts, export/support trends and feedback participation, with honest denominators, freshness and missing evidence; the broader acquisition/conversion funnel belongs to Marketing/Launch;
- mobile/desktop navigation, filters, pagination, empty/loading/error states and safe copyable identifiers so Andrew can actually diagnose a report from a phone or desktop.

**2026-10-07 operating requirement:** Andrew expects his phone to be the primary
operator tool initially. Design the main customer lookup, issue triage and
support-handling journeys mobile-first, while preserving a usable desktop
experience. Do not treat mobile as a compressed desktop table or hide essential
operator work behind desktop-only controls.

Preserve human investigation and permitted handling even if an AI assistant is
later introduced. Prefer reusable, scoped read/operation boundaries for the
dashboard and authorized automation, with customer/AI authorization and audit,
without a granular human-operator permission matrix;
this is not approval to install an agent or grant it the operator's full powers.
Exact endpoints, persistence and agent tooling remain implementation-design
questions, not new schemas or an MCP-server requirement.

Keep repeatable configuration, provisioning and bulk lifecycle work in the validated operator CLI. The backoffice may perform only actions that need direct human judgment and are implemented with authorization, confirmation, idempotency and audit evidence—for this MVP, primarily support handling and explicitly designed remediation/retry actions. It must not expose raw tokens, identity-provider subjects, payment credentials or ad-hoc database editing, and it must not add refund, entitlement override or ownership controls without their own secured workflow.

**Acceptance boundary:** Verify website/email intake, automatic initial receipt,
approved operator replies and correlated inbound follow-up through the shared
backoffice, including Business isolation and denial checks. Andrew can use phone
and desktop to find a customer, understand meaningful BFF facts/reported events
and handle agreed unresolved business/support work. Verify bounded event history
against deterministic scoped development fixtures; distinguish reported activity
from current facts and unavailable/simulated payment evidence. Answer
named business questions, not build a generic reporting platform. Verify selected
helper/support and operating-skill behavior against approved knowledge, disclosure,
automatic permitted scoped reads, exact reply approval and evaluation limits once those contracts are accepted.
Technical monitoring is not this build's gate; it remains required before launch.

<a id="build-6--analytics-monitoring-and-usable-backoffice"></a>

<a id="build-6--technical-monitoring-and-alert-delivery"></a>

### Build 6 — Monitoring

**2026-10-09 split — accepted:** Technical observability/alerts are separate from
Build 5's business/customer visibility, events and support. The old Build 6
anchor remains for historical links; its operator scope now belongs to Build 5.

**2026-10-07 sequencing revision:** Andrew defers new monitoring/alert setup to
later in the MVP, not just the Convex Pro-dependent integration. It remains
required before customer launch; neither an immediate subscription upgrade nor
an early lightweight monitoring build is requested. For the current preview
and informal family QA, reports through Andrew followed by on-demand inspection
of available evidence and reproduction/simulation are an acceptable interim
approach. They are not continuous monitoring or proof of every incident.
Phone-friendly operator work now belongs to Build 5. No monitoring-provider
setup, Pro upgrade, schedule or monitoring-agent access grant is authorized here.

Add privacy-bounded health and error monitoring for the public product, BFF, PDF generation, Paddle webhooks and support-email delivery. Monitoring must include deployed version/environment context, correlation IDs, credential/PII redaction, sampling, retention and spend limits. Expected authentication denials and rate limits are not errors. Alerts must be actionable and intentionally few: production or health-check failure, sustained unexpected error rate, and failed/stalled payment or support delivery that requires operator attention. Choose the smallest suitable provider arrangement during this build; PostHog, Sentry or alternatives are options, not preselected requirements.

Technical collection and investigation belong in an external monitoring tool,
not a BFF raw-log/metrics store or a duplicate backoffice dashboard. Safe known
Business/customer references can link incidents to the operator workspace;
unknown identity stays explicit. Provider, integration, redaction, sampling,
retention, budgets and exact thresholds remain to design.

Alert delivery must reach the operator, not just appear in stored logs. Andrew
selected Telegram as the first transport on 2026-10-07; no bot/destination is
provisioned and no credentials are installed yet. Explore actionable unexpected technical failures and stalled payment/support
delivery; customer-case queues and business activity summaries belong to Operator
work. Do not add one technical alert per ordinary signup/export. Define severity, deduplication, escalation,
redaction, delivery-failure visibility and volume limits. Telegram messages
should carry minimal safe context and protected backoffice links, not guest
lists, credentials or full customer conversations. Adding a channel must not
grant account/operational authority.

**2026-10-07 AI operating direction:** Andrew wants later monitoring to support
AI-led initial investigation with small, scoped evidence rather than requiring
him to search raw logs. The [trigger/evidence discussion](../../.agent/brainstorms/261007-remaining-mvp-priorities.md#later-monitoring-ai-first-investigation-with-bounded-evidence)
recommends read-only incident triage plus a bounded periodic sweep. Exact MVP
automation scope, cadence, provider/runtime and cost limits remain open; no bot
or schedule is authorized now. Preserve critical alert delivery if AI fails and
independent human use; this does not grant autonomous customer replies, financial
changes, deployment or repair authority.

**Acceptance boundary:** Prove the selected availability check, one sampled and
redacted unexpected error, and an actionable stalled/failed payment or support
delivery case reach the operator alert path without alerting on expected denials.
Verify environment/release context, deduplication and delivery-failure visibility
within agreed volume/spend limits. Preserve human alert delivery/investigation
if optional AI triage fails. No autonomous repairs, customer replies or company
NOC hierarchy are authorized. Production monitoring must pass before launch,
without redoing Build 5's business/operator features.

### Build 7 — Marketing

Reconcile positioning, honest pricing/output copy, an initial acquisition/pilot
approach and attribution with the [product's existing learning gates](../../projects/tablecards/docs/product.md#assumptions-and-learning-gates).
The existing launch-measurement promise remains here: choose the smallest lawful
measurement of acquisition → signup → successful preview/export → checkout →
verified paid access → later support, including UTM/referrer continuity where
available and justified. Reuse Operator work's bounded outcome records rather
than rebuilding them; no guest/card contents or fabricated payment truth.
Andrew wants the detailed marketing discussion later; no outreach, paid ads or
new campaign automation is authorized by recording this requirement.

**Acceptance boundary:** Document the initial marketing/pilot approach and
truthful launch messaging against the accepted product promises and learning
gates. Record what evidence the experiment should produce without claiming
market validation from an agent review; verify the selected launch funnel against
deterministic fixtures and actual implemented billing truth before launch.
Actual outreach follows its separately
accepted scope; no broad paid-acquisition requirement is added.

### Build 8 — Legal

#### Legal documents and agreement readiness

Added to the delivery scope at Andrew's request on 2026-10-07; no implementation
or legal onboarding questions now. Use the [recorded applicability discussion](../../.agent/brainstorms/261007-remaining-mvp-priorities.md#2026-10-07-legal-documents-and-user-agreement)
to assess each Business's public terms, privacy and cancellation/refund policies,
any required data-processing contract, and conditional negotiated contracts or
insurance. Do not require the screenshot's six items for every product or turn
all of them into customer checkboxes.

Gather the relevant operator identity, target markets, data/retention practices
and support/commercial choices, then reconcile approved wording with actual
behavior and the payment provider. Obtain jurisdiction-appropriate legal review
and owner decisions where needed; agent-drafted text is not legal clearance.
Keep Business-specific source/explanations beside the product and link shared
service disclosures. Prefer minimal reusable version/evidence mechanisms over
copied workflow logic, while leaving their API/schema design open for planning.

Document where users receive notices and where explicit agreement is needed,
including onboarding/invitations, uploads and checkout. Privacy notices and
applicable consent must exist before the relevant collection/processing, not
wait for the final review. Keep optional marketing/tracking consent separate.
Verify public access, mobile/desktop readability, relevant first/returning-user
and refusal/update behavior, and correctly scoped agreement evidence. Any
structural schema change still requires confirmation. Legal (Build 8) verifies the
complete legal-document/interaction boundary; Build 4 owns real-purchase
disclosures and agreement before enabling payment.

**Acceptance boundary:** Applicable public documents, notices and agreement
flows are reconciled with actual behavior and provider terms, with relevant
scope/version evidence and owner/professional review where needed. This final
review does not defer notices before data collection or checkout agreement
before real payment, and is not an agent-issued legal clearance.

### Build 9 — Maintenance

#### Final maintainability and operating review

Review the finished implementation before MVP completion for duplicated shared
logic, ownership boundaries, configuration differences, dependency upkeep,
test/documentation coverage and safe day-to-day operation/recovery. Include
repeated pricing/offer presentation, account membership and support workflows,
without assuming all products use the same layout or domain semantics.

Compare the actual code against a few documented other-product scenarios:
one payer workspace with staff, a product-owned sports/social team independent
of billing membership, and a product with different pricing/presentation or
technology. A scenario review is not a second-product implementation mandate.
In the current BFF, an account is an access/workspace and commercial container,
including Free accounts; it is not automatically every product's domain group.
Keep product-specific groups, roles and permissions distinct unless a concrete
accepted requirement supports mapping them to BFF membership.

Record which patterns should remain local, become shared SDK/workflow logic,
be optional styled views or be deferred. Recommend only bounded refactors
supported by actual duplication or maintenance risk, with affected behavior and
regression evidence preserved. If findings justify a large redesign, explain
its value, alternatives, scope and schema/migration impact and obtain a separate
decision; this review is not blanket refactor authorization. The release report
must identify remaining risks rather than label every reusable abstraction a
launch blocker.

**Acceptance boundary:** Record the final maintainability/shared-reuse/operations
review, justified bounded corrections and residual risks. Preserve affected
regression evidence; a large refactor, second Business or company maintenance
bot is not required or authorized by this review.

<a id="build-7--deployment-and-launch-preparation"></a>

### Build 10 — Launch

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

Run provider-specific sandbox/live smoke checks separately. Done when the authorized production flow works, production smoke and the applicable self-review gates pass, and the release report explains changes, verification and residual risk. Andrew's usability review is optional; it does not replace Codex's checks or waive explicitly required physical/provider acceptance.

Support coverage and any additional QA/operator helper must have an explicit
scope, response expectation and escalation path. A two-day response target is a
candidate, not a published SLA. TableCards' site-wide Q&A helper and support draft
assistance are selected Operator work scope, not optional future ideas or substitutes
for the required support/alert paths. Broader autonomous assistance remains
[deferred](../architecture/future-ideas.md#permission-bounded-ai-operations-and-helper-assistance).

## Human blocker groups

These are candidates for Andrew's short Nirvana list only when they become actionable. Reviews and decisions that can be completed in conversation stay here.

### Paddle onboarding

Create or confirm the seller account, finish business/identity/payout verification and enable sandbox access. Obtain written confirmation of Israeli payouts and the one-time/recurring microtransaction schedule, including discount and payout treatment. Submit the real product/domain and required policy pages for production review when the site exists. Configure the Event Pass and accepted monthly subscriptions only after implementation identifies the exact required Paddle resources; do not configure annual offers.

### Accounts, domain and OAuth

Confirm the existing Convex login can create a separate Business Factory project, choose or buy the product domain, and provide Cloudflare/DNS access. After Codex provides exact callback URLs, create/select the Google Cloud project, configure consent/branding and create the web OAuth client.

Do not pre-create Apple, PostHog, Resend or Sentry accounts. Build 3 will benchmark and select the minimum cost-efficient image-generation provider/model for the accepted four-choice batch; TableCards needs no scanner, browser-worker or printing provider. Build 5 will select minimum inbound/outbound email and business-visibility/analytics capabilities after support and meaningful-event boundaries are defined; Build 6 separately selects technical monitoring/alert delivery after redaction, privacy, cost and actionable thresholds are defined.

### Physical and live launch checks

Provide or approve the monitored support address and any provider verification that cannot be automated. Print the scale-check page at 100%, measure it with a ruler, and complete one real production sign-in, subscription, export and two-way support conversation. Then bring the first real pilot traffic from selected buyers. Offer, policy and product-claim reviews happen in conversation rather than becoming Nirvana tasks.

## Launch acceptance

The launch gate is satisfied when:

- TableCards is deployed with the fixed, honestly described output contract.
- Google login and project/account isolation work in production.
- Event Pass/subscription webhooks and server-side entitlements protect paid sizes, designs, AI allowances and collaboration.
- Applicable product/privacy/commercial documents are published, truthful and accessible; required notices and agreement points work with appropriate version/scope evidence, without treating authentication as legal acceptance.
- The deterministic PDF checks and focused happy-path regression pass.
- A user can begin a support conversation, receive Andrew's reply by email and reply into the same case.
- A monitored public support contact works for users who cannot sign in, without treating email possession as authority for sensitive account or payment actions.
- Focused acquisition/activation/payment events produce a trustworthy basic funnel without collecting guest-list contents or credentials.
- Production health, unexpected errors and failed payment/support delivery are observable through bounded, actionable monitoring.
- The backoffice lets Andrew find a customer or account, understand access/payment/support state, trace a reported problem and see whether an operational queue needs attention.
- The primary operator journeys work on Andrew's phone and on desktop, and actionable alerts reach the operator through the selected transport.
- The final maintainability/reuse/operations review is recorded with justified bounded corrections and explicit residual risk, without forcing domain teams into billing-account membership or requiring a speculative platform rewrite.
- The initial marketing/pilot approach is documented and reconciled with the accepted product learning gates; campaign automation and broad paid acquisition are not implicit launch requirements.
- Andrew verifies physical print scale, completes the live flow and deliberately sends real prospects to it.

Post-launch validation review, advanced integrations, platform hardening, a reusable factory skill and a technically different second-project proof are intentionally parked. They are not blockers for shipping the first product.
