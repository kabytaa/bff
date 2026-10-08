# Future Architecture Ideas

Updated: 2026-10-08.

## Purpose

This is a non-authoritative registry of durable architecture ideas that are intentionally outside current implementation scope. It is not a roadmap, backlog, implementation plan or accepted architecture decision. An entry records enough context for a later brainstorm to recover the idea without treating it as approved work.

When a real caller or requirement triggers an entry:

1. Read the linked source discussion.
2. Start or continue the relevant dated brainstorm in `.agent/brainstorms/`.
3. Re-evaluate the idea against the then-current repository and official provider documentation.
4. Record the accepted outcome in an ADR only after implementation-facing architecture is approved.
5. Update the entry with a link to the successor brainstorm or ADR rather than deleting its history.

## Cross-provider identity linking and recovery

**Status:** Partially adopted by the active Build 2 brainstorm: the private technical principal and separate provider-identity boundary are now selected. Provider linking and recovery remain deferred; Google is still the only production Business-user provider in the current slice.

**Source:** [Build 2 Shared MVP brainstorm](../../.agent/brainstorms/260926-build-2-shared-mvp.md)

**Trigger:** A real Business needs a second identity provider such as Apple or GitHub.

**Idea:**

- Keep one private technical principal with separately linked provider identities; environment-local users materialize from the principal rather than a provider-specific account.
- Never merge identities merely because provider emails match.
- When a newly authenticated provider returns the same verified email as an existing user, create only a short-lived `pending_identity_link` transaction. Do not create a permanent provider identity, principal, Business user, account or membership yet.
- Ask the person to authenticate with the existing sign-in method. After both identities are proven, explicitly confirm and atomically link the new provider identity to the existing principal, then append a security event.
- If the existing-provider proof fails or is cancelled, expire the pending transaction without durable identity changes.
- An existing signed-in session or a separately designed strong recovery method may prove continuity. Matching email, a support conversation or control of only the new provider must never authorize takeover.
- Before enabling a second provider, design recovery for people who permanently lose the original provider: recovery codes, strongly verified operator recovery, delays, notifications, session revocation and immutable audit evidence are candidate controls, not accepted implementation yet.

**Open when triggered:** Define recovery proof, notification and cooldown rules; verify provider-specific email and private-relay behavior; design negative linking and takeover tests. Reuse the already selected principal/identity boundary rather than reopening email-based merging.

## Usage-based billing and account credits

**Status:** Partially adopted by Build 3 for non-financial product units. BFF now has account-owned access grants, aggregate unit buckets and idempotent reserve/commit/release reservations for AI batches. Purchasable credit balances, automatic top-up, postpaid metering and a financial transaction ledger remain deferred.

**Source:** [Build 2 Shared MVP brainstorm](../../.agent/brainstorms/260926-build-2-shared-mvp.md)

**Trigger:** A real product charges for measurable consumption rather than, or in addition to, a subscription—for example AI tokens or generated images.

**Idea:**

- Keep feature entitlement separate from usage charging: entitlements answer whether an operation is available, while an account-owned ledger answers how much was consumed and whether more spending is permitted.
- Let a Business register bounded named meters and units. Business backends report trusted billable usage server-to-server; browser input never directly creates charges.
- Provide an idempotent reserve/commit/release SDK flow around costly operations. Reserve estimated usage before the external call, commit actual usage afterward and release the reservation on failure.
- Keep balances, spending limits and usage counters authoritative in BFF. Do not place mutable balances in ten-minute JWTs.
- Prefer prepaid credit packs for the first real caller to limit unpaid invoices and runaway provider cost. Re-evaluate postpaid metering only when a concrete Business needs it.
- Preserve optional user, membership and seat attribution for audit/reporting while the account remains the payer.
- Treat a unit bucket's scope as an allocation rather than assuming every balance is calendar-period based. Candidate allocations include a subscription billing period, lifetime welcome grant, purchased event and persistent prepaid-credit pool; reassess whether the implemented `periodKey` should become `allocationKey` when a real non-period caller triggers this work.
- For optional automatic top-up, keep an explicit account policy with threshold, top-up amount, spend caps and failure behavior. Trigger an idempotent payment attempt when available credit crosses the threshold, but add credits only after verified provider confirmation and notify the customer after every charge.
- Record every purchased credit, committed debit, refund, expiry and operator adjustment in an immutable financial transaction ledger. The existing aggregate bucket may remain the transactional balance projection, but it must not be the only evidence for money-backed credits.
- Keep provider payment records and BFF product-operation reservations separate: a billing provider can prove that money moved, while BFF must still prevent concurrent Business operations from overspending the product balance.

**Open when triggered:** Select provider or Convex component capabilities from then-current official documentation; decide whether `periodKey` becomes `allocationKey`; define meter and immutable transaction schemas, auto-top-up thresholds and spend caps, reservation expiry, concurrency, refunds/adjustments, ledger invariants, fraud limits, reconciliation, customer notifications and operator workflows. Do not add financial tables until a real money-backed caller exists.

## Per-user and per-account provider cost attribution

**Status:** Deferred idea requested by Andrew on 2026-10-07. No shared cost ledger, reporting API or dashboard is implemented by the current TableCards daily-budget change.

**Source:** TableCards AI-budget discussion, 2026-10-07; [current provider/budget boundary](../../projects/tablecards/docs/operations.md#cloudflare-ai-budget-and-reference-images).

**Trigger:** A Business needs to understand its cost to serve each user/workspace, compare cost with revenue, or enforce a cross-Business provider-spend policy.

**Idea:**

- Attribute trusted provider operations to Business/environment, account and initiating user; team operations roll up once to their account rather than being counted again as separate user expenses.
- Keep our cost to serve a user separate from what they paid, their feature entitlements and their remaining usage units. A refunded product unit does not prove a provider call cost nothing.
- Record provider usage/request evidence, currency, a price/version snapshot and estimate-versus-confirmed status. Distinguish gross metered cost, free credits and net billed spend; reconcile available provider usage/invoices before describing an estimate as actual money spent.
- Make attribution idempotent across retries, partial failures and recovery. Report costly failed operations too; do not send guest lists, prompts, image bytes or credentials into cost records.
- BFF should own the shared contract/rollup; trusted Business backends report operations server-to-server. Operators use validated automation for configuration and a read-oriented backoffice for user/account cost and margin views. Product UI exposes customer allowances or billing, not unrestricted internal cost records.

**Open when triggered:** Determine available provider evidence and attribution granularity, reuse existing operation/reservation identifiers, define retention/access rules and reconciliation, and assess whether any new table is genuinely needed. Do not build a financial ledger merely to implement a small estimated daily admission cap.

## Shared promotions, personal offers and repeat-purchase campaigns

**Status:** Deferred idea requested by Andrew on 2026-10-07; explicitly not a
required MVP feature. No promotion engine, campaign delivery or new schema is
approved by this entry.

**Source:** [Remaining MVP discussion](../../.agent/brainstorms/261007-remaining-mvp-priorities.md#2026-10-07-added-concerns).

**2026-10-08 refinement:** Andrew suggests reusing meaningful Business activity
events for future special-offer/discount eligibility; see the
[active customer-operations discussion](../../.agent/brainstorms/261008-customer-operations-backoffice.md#reuse-for-analytics-and-future-offers).
Reaching a feature limit or returning after a purchase can be evidence for an
offer rule, not an automatic discount or charge. Recheck current verified
account/billing state and the campaign's eligibility before applying any offer.
This does not add campaign automation or a promotion schema to the current scope.

**2026-10-08 advisory-bot proposal:** Andrew proposes monetization and marketing
advisors that suggest scoped offers or acquisition experiments, with operator
approval before activation/outreach. Continue the
[same active exploration](../../.agent/brainstorms/261008-customer-operations-backoffice.md#business-automation-and-commercial-advisors--exploration-2026-10-08);
neither advisor, promotional sending nor MVP inclusion is approved here.

**Trigger:** A Business has real billing and a concrete acquisition, conversion
or repeat-purchase offer that needs shared eligibility/redemption behavior.

**Idea:**

- Support general time-bounded sales, eligible user/account-specific offers
  (for example, signed in but not subscribed), repeat-purchase/win-back offers
  and marketing promo codes. A repeat invitation is not permission to charge
  automatically or change a subscription's renewal price silently.
- Keep reusable offer definitions, scheduling, eligibility, redemption limits,
  expiry, stacking policy and audit evidence in BFF rather than reimplementing
  discount logic in each Business. Each Business chooses its campaigns and
  controls presentation/branding; this is not a universal marketing UI.
- Resolve eligibility and price server-side, scoped to Business/environment
  and the correct buyer/account. Prevent coupon sharing beyond its intended
  audience, replay and concurrent over-redemption. Browser input or a displayed
  offer never grants paid access.
- Match the accepted discount and renewal terms to the provider checkout and
  verified payment/subscription facts. Re-evaluate then-current provider
  capabilities, fees and permitted offer mechanics before implementation;
  no Paddle-specific capability is asserted here.
- Treat campaign notifications separately from transactional support: define
  consent, opt-out, frequency, minimal targeting data and retention. Show honest
  eligibility, expiry and subsequent prices; avoid manufactured urgency.
- Put repeatable campaign configuration in validated operator automation;
  expose safe campaign/redemption/conversion evidence in the read-oriented
  backoffice. Product UI may show an eligible offer or accept a promo code;
  exceptional operator actions require an explicitly secured workflow.

**Open when triggered:** Choose the first real offer, target user versus payer
account, determine expiration/redemption/stacking and renewal rules, establish
privacy/marketing boundaries, verify provider integration, define necessary
evidence and decide whether existing billing records can avoid additional
tables. Do not turn this deferred entry into MVP billing scope.

## Product-specific backoffice extensions

**Status:** Deferred idea raised by Andrew on 2026-10-08, not an MVP requirement.
The current backoffice direction uses shared generic pages, meaningful BFF-held
customer information and important reported Business events. No custom Business
pages or direct product-database reads are required in that slice.

**Source:** [Customer information/event boundary](../../.agent/brainstorms/261008-customer-operations-backoffice.md#bff-customer-information-and-business-events--accepted-direction-2026-10-08).

**Trigger:** A demonstrated operator/support question cannot be answered well
from existing BFF facts and meaningful activity events.

**Idea:** Consider an optional product-owned detail surface or a bounded read
adapter, preserving the shared shell and each product's domain semantics.
Decide ownership, allowed data, source freshness, phone/desktop behavior and
maintenance cost against the actual need. Do not prebuild a plugin framework,
copy private product records into BFF or impose one product's data model on others.

## Permission-bounded AI operations and helper assistance

**Status:** Optional idea raised by Andrew on 2026-10-07; MVP inclusion is
undecided and no bot, schedule, account access or automation is authorized.
Autonomous customer support remains outside the currently accepted TableCards
MVP. Alerts and working human support are required separately in Builds 5–6.

**2026-10-08 revision:** Andrew now proposes including customer-facing AI support
in the MVP from the beginning. Continue that decision in the [active customer-operations brainstorm](../../.agent/brainstorms/261008-customer-operations-backoffice.md#ai-support-alternatives--proposed-mvp-scope),
not as a second discussion here. He subsequently selects an in-app knowledge
helper plus ticket auto-suggest for operator review/send, not autonomous ticket
replies. Provider, data/tools and implementation remain undecided; the single
roadmap owns the narrowed MVP direction.

**2026-10-08 shared-control/MCP exploration:** Andrew proposes shared BFF bot
controls, on-demand Codex evaluation/improvement and filtered important-event
context. Continue the [same active discussion](../../.agent/brainstorms/261008-customer-operations-backoffice.md#shared-bot-controls-and-event-access--exploration-2026-10-08).
MCP is a potential later interface to already authorized tools, not an access
grant or required MVP integration. A small file-configured extensible bot definition
is chosen in the discussion; a large management console or connector is not approved.
Future helper page/customer/saved-work context uses approved bounded product-owned
adapters where necessary, not copied product data or unrestricted reads. Initial
integration scope remains open in the same brainstorm, not a second plan here.
Andrew subsequently refines the small runtime to metadata-first/on-demand skills
and programmatic Business context/tool registration, not fixed shared tools only.
The same discussion owns the exact execution/data/cost boundary; this does not
promote MCP, a large management UI or arbitrary remote-code execution into scope.

**2026-10-08 business-automation advisor:** Andrew proposes reviewing support
decisions/outcomes and suggesting tested policy changes, never self-activation.
The [active discussion](../../.agent/brainstorms/261008-customer-operations-backoffice.md#business-automation-and-commercial-advisors--exploration-2026-10-08)
owns evidence access, cadence and approval design; technical incident monitoring
remains a distinct later topic. Initial support tool calls/replies all require
approval; no scheduled bot, rule builder or expanded action authority is approved.
Andrew subsequently proposes external periodic review and selectable backoffice
proposals, now considering dots rather than a custom Codex CLI runner; continue
that refinement in the same discussion, not as live BFF advisory bots.
The same exploration now distinguishes COO operations oversight from Andrew's
independent CTO assistant; every configured bot may raise an assistant request.
Implementation, communication/access and MVP inclusion remain open; this does
not create a second authoritative plan.

**2026-10-08 operator-scope revision:** The [active brainstorm](../../.agent/brainstorms/261008-customer-operations-backoffice.md#operator-access--accepted-simplification-2026-10-08)
now records full access for every approved human backoffice operator, with no
granular roles initially. The restricted-helper suggestion below is historical,
not a current MVP requirement; AI authority remains a separate open decision.

**Source:** [Remaining MVP operating discussion](../../.agent/brainstorms/261007-remaining-mvp-priorities.md#2026-10-07-maintainability-and-operating-model).

**Trigger:** Real support/operating load warrants assistance while Andrew is
unavailable, or a trusted nontechnical QA/helper needs bounded guidance.

**Idea:**

- Evaluate Andrew's existing ChatGPT Pro agent/bot capabilities for scoped
  maintenance checks, reviews, summaries, monetization suggestions and support
  triage/drafts. A customer-facing autonomous responder is a separate decision,
  not an automatic consequence of installing an internal assistant.
- Later clarification: Andrew wants AI to do initial monitoring investigation,
  not leave routine log searching to him. The [recorded trigger/evidence research](../../.agent/brainstorms/261007-remaining-mvp-priorities.md#later-monitoring-ai-first-investigation-with-bounded-evidence)
  compares incidents, periodic sweeps and a recommended read-only hybrid. Small
  scoped evidence packets and bounded follow-up queries are preferred over raw
  log/database dumps. Monitoring remains later MVP work; exact bot/runtime,
  cadence and implementation scope are undecided. This does not promote
  autonomous support or repair powers into accepted launch scope.
- A candidate Telegram integration can receive redacted operator alerts, return
  safe summaries and explain approved QA tasks in Russian. Chat membership,
  another person's request or model-generated text never grants production
  permissions. No existing Telegram bridge is claimed.
- Historical restricted-helper proposal, not the current backoffice role model:
  a trusted helper may observe, follow checklists and report issues without
  Codex, code edits or deployment access. Use a separate identity, narrowly
  scoped views/data and enforced permissions; do not share Andrew's credentials
  or broad operator access. Russian guidance is an accessibility/language
  preference, not a reason to expose full customer conversations.
- Prefer read-only/draft-only first. Enforce tool/API permissions, identity,
  scope, audit and revocation independently of prompts. No refund, billing or
  entitlement change, user/role deletion, ownership transfer, credential access
  or deployment by the helper or bot without a separately approved secured flow.
- Treat feedback, email, chat and product content as untrusted inputs. Bound
  context, retention, execution frequency and costs; preserve clear human
  escalation, failure visibility and an emergency stop.
- Compare the assistant with ordinary human coverage. A possible response
  expectation of two days needs clarification (calendar/business days,
  acknowledgment/resolution, urgent escalation) before any SLA is published.

**Open when triggered:** Clarify which OpenAI product Andrew means, verify actual
account availability and supported connections/triggering, decide the first
allowed tasks, define helper permissions and language/data scope, test failure
and abuse cases, and prove cost and safe stop/recovery before enabling anything.
Do not assume subscription access is an unlimited API or a continuously
available external customer-service integration.

**Initial official-source check, 2026-10-07:**

- [Meet dots](https://learn.chatgpt.com/docs/dots) describes an ongoing assistant
  on eligible Pro tiers/regions with rollout conditions; work it initiates still
  uses Work/Codex allowances. This does not establish Andrew's enabled features.
- [Tasks and memory](https://learn.chatgpt.com/docs/dots/tasks-and-memory)
  describes assigned/recurring work; local tasks need a connected computer and
  app, while configured cloud tasks have a different execution boundary.
- [Controls](https://learn.chatgpt.com/docs/dots/controls) separates drafting from
  sending and states that custom instructions can make mistakes and do not
  grant app access. They are not a replacement for restricted tools.
- [Pricing](https://learn.chatgpt.com/docs/pricing) distinguishes subscription
  usage from API token prices. Telegram integration, customer-service suitability,
  24/7 availability and permission-bounded operation remain unverified.

## Custom-domain edge protection and security monitoring

**Status:** Deferred operational-hardening idea beyond the accepted basic MVP analytics/monitoring slice. The current MVP uses a narrow Cloudflare gateway only for same-site customer-session routes, keeps product/native Convex traffic direct to the generated origin and uses bounded application-level rate limiting. Build 6 now owns privacy-bounded product/business analytics, ordinary health/error monitoring and actionable delivery/webhook alerts; this entry retains only the stronger custom-domain, WAF, DDoS and origin-bypass questions. The gateway is not currently a WAF or origin-authentication boundary.

**Source:** [Build 2 Shared MVP brainstorm](../../.agent/brainstorms/260926-build-2-shared-mvp.md)

**Trigger:** A Business adopts a Convex custom domain, public traffic or abuse becomes material, monitoring cost/error volume becomes operationally relevant, or an observed incident shows the MVP controls are insufficient.

**Idea:**

- Reassess a layered boundary using then-current official provider capabilities: Cloudflare edge DDoS/WAF/rate limiting before origin work, precise Convex application limits keyed to Business semantics and security-specific aggregation/alerts layered onto the bounded monitoring selected in Build 6.
- Do not assume that attaching a Convex custom domain automatically puts Cloudflare security in the request path. Verify the supported DNS/proxy topology, TLS behavior and Convex custom-domain contract at that time.
- If traffic is intentionally routed through an edge proxy, prevent attackers from bypassing it through the generated Convex origin when the platform provides a supported restriction or origin-authentication mechanism.
- Keep expected authentication denials and rate-limit rejections out of per-request durable audit and error-monitoring streams. Aggregate or sample noisy evidence, redact credentials and personal data, set volume/spend limits and alert only on actionable thresholds.
- Preserve individual immutable audits for meaningful authenticated lifecycle and high-risk account actions; edge/security analytics must not replace the application audit trail.
- Validate the design with bounded, provider-compliant load and failure tests rather than intentionally exposing production to an attack.

**Open when triggered:** Confirm whether Convex custom domains can be safely proxied through Cloudflare; determine origin-bypass prevention; select edge and application rate-limit keys/thresholds; reassess the baseline provider's security-event sampling, privacy, retention and spend caps; define security-specific alert thresholds and incident evidence.
