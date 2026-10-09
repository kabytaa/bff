# Future Architecture Ideas

Updated: 2026-10-09.

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

**2026-10-09 revision:** temporarily discussed for Operator work, then explicitly
deferred again by Andrew. The
[successor discussion](../../.agent/brainstorms/261008-customer-operations-backoffice.md#shared-bot-measurement)
now selects provider-side safety caps and native daily/delayed alerts only; no
application spending tables or dashboard. Estimated attribution to verified users/
accounts or scoped random anonymous IDs remains a future possibility, not current
build scope. Existing account unit balances are not dollar-cost tracking.

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

**2026-10-09 scope revision:** The earlier monetization/marketing advisor
proposal is now explicitly post-MVP. Its reasoning and operator-approval
boundary live in [AI company organization](#post-mvp-ai-company-organization),
not the active customer-operations build. No advisor or promotional sending is enabled.

**2026-10-09 email refinement:** Andrew adds dedicated Business sales email
identities and sales-focused bots for future email conversations, for example
`sales@tablecards.tofler.app` while the Business uses the shared parent domain,
then an address on its own domain if it moves. This is an example, not configured
DNS, a mailbox or an enabled bot. Keep this with the
[post-MVP bot organization](#post-mvp-ai-company-organization), not current
Operator work. Distinguish answering a customer's sales inquiry from outbound
promotional campaigns; consent, opt-out, permitted actions and review boundaries
must be defined before either workflow is enabled. No sales address, outreach,
campaign delivery or automatic reply is authorized by recording the idea.

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

**Status:** Historical umbrella raised on 2026-10-07 and refined below. The
current helper/ticket-suggestion direction belongs in the active brainstorm and
single MVP roadmap; company-wide advisors are explicitly post-MVP. Neither
record authorizes implementation, schedules or data access. Autonomous ticket
replies/account remedies remain excluded; required human support and ordinary
monitoring retain their MVP delivery boundaries.

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

**2026-10-09 organization/skill split:** Business-automation advisors, periodic
external review, selectable proposals and COO/CTO-assistant roles are now
[post-MVP company-organization ideas](#post-mvp-ai-company-organization).
Current helper/support work still needs the
[Codex-invoked operating/evaluation workflows](../../.agent/brainstorms/261008-customer-operations-backoffice.md#current-build-operating-skills--scope-refinement-2026-10-09);
these do not require a scheduler, company hierarchy or verified Dots integration.
Initial support tool calls/substantive replies remain approval-gated; ordinary
technical monitoring retains its later-MVP roadmap boundary.

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

## Post-MVP AI company organization

**Status:** Deferred **until after the MVP**, explicitly requested by Andrew on
2026-10-09. Not an accepted delivery plan, current-build dependency or authorization
to install/connect/schedule agents. Dots and Paperclip remain candidate platforms,
not a selected or verified combination.

**Source and relocation:** Discussion created 2026-10-08 in the
[customer-operations brainstorm](../../.agent/brainstorms/261008-customer-operations-backoffice.md#post-mvp-organization-scope-split--2026-10-09);
moved here on 2026-10-09 from repository baseline
`7e0433c624eb945f35f5841a3488cd1211ab78a3`. The dated exploration and decisions
are preserved below. The active build retains backoffice/tickets/helper/support
and manually invoked operating/evaluation skills, not the company organization.

**Trigger:** Revisit after the MVP when real operating load or a specific
opportunity justifies organizational coordination. Recheck current requirements,
evidence, provider capabilities, cost and confidentiality before adoption.

**Desired shape, not an implementation commitment:**

- Andrew remains CTO/final decision-maker. COO oversees business operations
  (support, automation, monetization, marketing/sales as useful); his personal
  assistant reports directly to him, independently of the COO, prioritizing
  requests from any bot according to his well-being and goals.
- Security, legal, product manager, project manager and architect are distinct
  peer responsibilities. Each responsible role, including COO and assistant,
  has its own analyst and working context; reusing skills does not merge authority.
  Architect supervises NOC-style investigation, QA/regression and authorized
  development. Project manager shows verified company progress; product compares
  value/opportunities; architect shapes approved plans and Codex implementation.
- Automation/monetization/marketing advisors review bounded Business evidence
  and propose rule changes, offers or experiments. A periodic external review
  may produce structured proposals for an operator to accept/reject; approval,
  actual execution and success evidence are separate. No advisor self-activates
  its recommendations or bypasses the live support bot's approval policy.
- Advisory research on explicitly approved information may proceed without
  approval at every step (the discussed option 2); consequential effects still
  need approval. Exact data, communication, budget and execution grants are open.
  Attention uses SWOT, scale, evidence and Andrew's priorities; tune rules with
  him, rather than treating attention filtering as permission to act.
- Ordinary analyst work may be intentionally searchable; security/legal/assistant
  analyst contexts are protected. Andrew sets access and onward-sharing rules
  per secret, with no blanket assistant exception. Source checks alone cannot
  guarantee a model will not reveal paraphrases or inferred information through
  another channel; actual platform/output restrictions need verification.
- CPU-only model/bandit research is a possible later analytical capability.
  Evidence-backed integration proposals reach Andrew; Codex builds authorized
  integration points before any approved bounded tuning. No ML platform or
  production experiment is required for the initial MVP.

**Ownership when revisited:** Prefer evaluating existing external organization
tooling over rebuilding a company control plane in BFF. Validated Codex/operator
workflows own configuration and authorized implementation; an essential
read-oriented dashboard may show evidence/proposals, with direct operator approval
only where useful. Helpers/support stay in their own shared customer-assistance
runtime. Technical logs/metrics remain in the monitoring service.

**Open when triggered:** Choose the smallest useful roles/review loop and actual
platform; verify supported source/context access, protected contexts and all
outbound paths; define evidence/proposal exchange, per-secret decisions, budgets,
scheduling/failure delivery and approval-to-execution contracts. Reuse the single
roadmap and canonical work records, not a second organizational plan. Current
operating/evaluation skills do not require this future system or a Dots connector.
Ordinary technical monitoring remains a later-MVP launch requirement; only the
company's NOC-style bot organization is deferred here.

### Data-lifecycle maintenance review — refinement, 2026-10-09

Andrew proposes a later maintenance advisor that reviews actual stored data,
usefulness, age, storage cost and privacy/security/abuse needs, then recommends
targeted retention or cleanup changes. This extends the deferred organization
idea, not the current MVP's final code-maintenance review. Trigger it when actual
evidence warrants review; do not wait for high volume to consider required privacy
controls. The active
[discussion records the deferral](../../.agent/brainstorms/261008-customer-operations-backoffice.md#data-lifecycle--detailed-discussion-deferred-2026-10-09).

Detailed periods and retention-management tooling are not selected now. The
minimum purpose-specific storage/privacy expectations remain a gate before new
real collection; anti-abuse needs do not grant blanket retention of deleted
customers' histories. An advisor proposes changes for operator approval, not
automatic deletion or a self-issued exception. Codex/operator review can serve
the need without waiting for this bot; no platform, schedule, schema or cleanup
engine is authorized.

<details>
<summary>Preserved 2026-10-08 exploration and decisions — historical, not MVP scope</summary>

The following material preserves earlier alternatives, revisions and dated
source findings. Any wording about undecided MVP inclusion or "now" refers to
that earlier discussion and is superseded by the explicit 2026-10-09 post-MVP
boundary above. Provider findings must be revalidated when this idea is revisited.

### Business automation and commercial advisors — exploration, 2026-10-08

Andrew proposes multiple configurable internal advisory roles, distinct from live
customer helpers/support. His subsequent refinement places these reviews outside
the BFF bot runtime, initially considering Codex CLI and then OpenAI dots. They
inspect bounded Business evidence and propose improvements, but cannot approve
or apply their own recommendations. Initially discussed specialist roles:

- **Business automation advisor:** reviews tickets, approved/denied actions and
  meaningful outcomes over a selected period; recommends keeping manual handling,
  permitting an action automatically or applying a tested conditional rule.
  It also identifies new places to automate, including missing tools or integration
  points, rather than only adjusting automation that already exists. New capability
  proposals require engineering review; discovery does not install them. This is
  policy/workflow improvement, not infrastructure repair or general code
  maintenance. A weekly batch is subsequently proposed; exact cadence and
  execution provider remain open, and no schedule is enabled.
- **Monetization advisor:** suggests an eligible-person offer or a broader offer
  hypothesis from scoped usage/conversion evidence. Offer creation, sending,
  discount application and price changes are separate authorized actions, not
  effects of generating a recommendation. Promotions remain a deferred capability;
  no promotion engine or financial action is added to the MVP by this idea.
- **Marketing/acquisition advisor:** suggests acquisition/conversion experiments
  and relevant messaging/channels. It does not itself create traffic, authorize
  paid ads, contact prospects or turn visitor data into identified leads. Evidence,
  permitted targeting/contact and budgets remain to define.

**Stricter initial support baseline — accepted refinement:** Andrew now specifies
that support-bot substantive replies and every permitted support-tool invocation,
including read-only tools, initially require operator approval. This replaces
earlier suggestions to let scoped reads run automatically at the outset.
"Blocked" here means automation is off/pending approval for otherwise allowed
actions; unavailable/forbidden actions stay hard-denied, not enabled by approving
a bot request. The previously accepted non-bot initial receipt remains automatic.
Helpers and advisor evidence-read approval are separate unsettled policies; do
not silently extend or relax the support rule for those roles.

The advisor proposes a precise policy difference and rationale, affected scope,
representative examples/exceptions, replay/test evidence and rollback/stop path.
An operator can approve/reject a reviewed candidate, not an unrestricted right
for a bot to rewrite its own instructions, tools, policy or data access. Repeated
human approvals are useful evidence, not proof the same action is safe forever.
Sparse/no customers means initial patterns are hypotheses; synthetic cases test
behavior but cannot establish customer demand, profitability or real failure rates.

Recommend a small **proposal → evaluation → approval → validated activation**
loop against the reviewed policy contracts, separate from the live bot runtime.
Code predicates stay reviewed
and configuration stays validated/versioned. An AI-proposed new predicate requires
Codex implementation/review and tests; an Approve button must not dynamically
execute generated code. Hard authorization/disclosure/financial constraints remain
outside the learned rules. Proposals/results should explain why and show evidence,
not only "the AI recommends this." Operator judgment/approval belongs in the
backoffice; configuration/code changes and verification remain Codex-owned.

**External review batch and proposal inbox — refinement, 2026-10-08:** Andrew
clarifies that the advisory roles need not be implemented as live BFF agents.
He proposes one periodic review over the configured Businesses, delegating the
relevant analyses and producing separately selectable proposals, potentially JSON.
He then suggests OpenAI dots rather than a custom subscription-backed Codex CLI
runner; this is a candidate, not a confirmed provider or installation request.
One batch may contain several scoped reviews/model calls; it does not require
one giant prompt, merged customer identities or pooled private Business evidence.

Recommend a small validated proposal envelope, rendered as readable cards in the
shared backoffice: Business/environment, review period, advisory role, proposed
change, rationale/evidence, limitations and the effect of approval. BFF should
own the operator decision and actual application outcome, not a second copy in
an editable JSON document. Import may create pending proposals only; it must not
send offers, change policy or treat generated claims as verified facts. Exact
format, transport, persistence, deduplication and lifecycle remain to design;
there is no proposal inbox/import API in the inspected backoffice today.
Customer-bearing evidence/proposals must not be committed to repository files.

Approval must distinguish a known validated configuration action from a proposal
requiring new code: the former can apply only an explicitly reviewed supported
change after current-state checks; the latter authorizes bounded follow-up Codex
work, not arbitrary generated-code execution or an implied production release.
Rejecting or deferring is not applying. BFF-enforced decision/action boundaries
remain independent of the external reviewer's prompts or product safeguards.

**Relative scope options:** on-demand Codex review (Lower effort; useful first
trial, manual invocation); dots-coordinated recurring review (Medium effort;
could reuse scheduling/delegation, but account availability, bounded BFF evidence
access, reliable proposal delivery and usage require validation); a private
scheduled Codex CLI runner (Medium–High effort; more control over structured
output/transport, but hosting, authentication and scheduling are ours to operate).
Andrew now leans toward dots; recommend validating one proposal-only trial before
enabling a recurrence. Earlier BFF-hosted advisor runs are not the current proposed
location. Autonomous activation or a general campaign/rule builder remains excluded.
No built-in advisory trio, schedule or implementation is approved.

Official checks: [dots tasks and memory](https://learn.chatgpt.com/docs/dots/tasks-and-memory)
documents recurring work and delegation; [computers and apps](https://learn.chatgpt.com/docs/dots/computers-and-apps)
distinguishes cloud work from connected local files/skills and existing app access.
[Meet dots](https://learn.chatgpt.com/docs/dots#access) states rollout/eligibility
conditions and that delegated Work/Codex tasks use those products' allowances.
Andrew's actual enabled access is unverified. No built-in Convex connector,
guaranteed JSON delivery or approval synchronization with our backoffice is
established by these sources. [Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)
supports scripted execution and schema-shaped final output; CLI JSONL progress
events are not the proposal document. Subscription sign-in exists, but the
[authentication guidance](https://learn.chatgpt.com/docs/auth) recommends API auth
for programmatic workflows; do not promise unlimited or unattended subscription
capacity. No account/credentials/connection changes were made.

One key unresolved boundary: an advisor cannot examine data without receiving
it. Options are operator-approved bounded evidence per review (recommended initial
choice), approval for every read (strict but interruptive), or an explicitly
pre-approved recurring read scope (less manual work, new authority). These are
not implied by approval of support actions. Analysis approval is also not policy
change approval. No automatic customer outreach, schedule, schema or wider data
access is authorized; MVP inclusion remains a separate decision.

**Manager and project-prioritization roles — proposal, 2026-10-08:** Andrew
extends the external advisory idea to a manager/CEO-like coordinator that checks
marketing, support, monetization and other relevant work, plus a product/project
manager that identifies what genuinely needs Andrew's scarce time. The desired
outcome is verified useful work and a short decision/blocker list, not managing
Andrew's personal life or adding mandatory management layers. The combined-role
recommendation below is historical: Andrew subsequently clarifies the separate
COO and independent CTO-assistant responsibilities in the next subsection.

Recommend initially one coordinator with these two responsibilities, delegating
bounded specialist tasks when useful. It inspects actual results, evidence,
failures and waiting decisions; an agent's "done" report is not proof of success.
It reconciles conflicting proposals, checks dependencies, removes duplicates and
distinguishes work within existing authority from new scope or decisions needing
Andrew. New strategy/features may be proposed, not silently added to the accepted
MVP. Ranking should explain expected impact, uncertainty, effort and what a delay
would affect; sparse evidence must be labelled rather than turned into a precise
sales/ROI forecast. Sales/SDR is a possible role, not assumed necessary for every
Business.

The operator output should say what was verified, what remains unverified, which
few decisions require Andrew and why, the recommendation/options for each, and
what approved work can continue without him. Use the single delivery roadmap and
accepted work records as inputs, not another competing live plan. Cross-Business
prioritization may use approved summaries; it does not reopen cross-Business
customer merging or unrestricted private-data pooling.

Options: **one coordinator plus delegated roles** (Lower–Medium relative effort;
reuses dots' documented task coordination but may mix responsibilities);
**separate business-oversight and project-management agents** (Medium–High;
clearer focus, but more handoffs, shared-state reconciliation and usage);
**an independently scheduled hierarchy per Business/function** (High;
potentially useful at larger scale, but duplicated reviews, conflicting tasks and
coordination costs need evidence). Recommend the first until distinct workloads
justify separation. These are architectural roles, not a verified ability to
create multiple independently addressable dots or one dot managing another.
[Official dots guidance](https://learn.chatgpt.com/docs/dots/tasks-and-memory)
supports task delegation and follow-up, not our complete proposed hierarchy or
an already-connected BFF integration.

Andrew suggests MCP for evidence/proposal access. Treat this as an interface
candidate: approved reads and pending-proposal submission are distinct from
policy activation. Exact dots connector support, credentials and scoped APIs are
unverified; no MCP server is approved or created. The manager cannot approve its
own proposals, expand another bot's capabilities, bypass initial support approval
or authorize code/schema/production work merely by assigning it. Routine bounded
research/drafting may run only within separately approved access/budgets.
Configuration/engineering stays Codex/operator-owned; human approval belongs in
backoffice; this adds no product-facing manager UI or Nirvana tasks. Cadence,
evidence/quality checks, coordinator autonomy and MVP inclusion remain open.

**COO and independent CTO assistant — clarified direction, 2026-10-08:** Andrew
is the CTO and ultimate decision-maker, also acting as the company's head; no
separate CEO role is required. He distinguishes two responsibilities rather than
the previously recommended combined coordinator:

- **COO:** oversees day-to-day Business operations and the relevant support,
  monetization, marketing, sales/SDR and possible analytics roles. Checks actual
  outcomes, coordinates dependencies and follows up when work is ineffective,
  blocked or awaiting an authorized decision. The exact specialist set is not
  fixed, and an analytics role means permitted business-outcome understanding,
  not silently adding technical telemetry or new production-data access.
- **CTO's assistant:** reports directly to Andrew, not to the COO. Prioritizes
  requests according to Andrew's goals, available time and explicit preferences.
  Every configured bot may raise a request directly with this assistant without
  requiring COO approval. The assistant decides what merits Andrew's attention;
  an incoming bot request is evidence/a proposal, not an instruction overriding
  Andrew's priorities or approval rules.

This separation is a clarified operating direction, not permission to install
agents or build an organization-management platform. COO oversight and access
to Andrew are separate paths: the assistant may consult the COO's context but
does not become its subordinate or transfer control of Andrew's queue to it.
Recommend a short request with Business/context, actual evidence, why Andrew is
needed, options/recommendation and consequences of waiting. Deduplicate related
requests and distinguish urgent attention from ordinary digest/deferred work;
exact interruption thresholds and response promises remain open.

**Searchable working context — Andrew's clarification, 2026-10-08:** The
assistant's primary concern is Andrew's well-being, preferences and available
attention, not maximizing the COO's activity or business growth at any cost.
Andrew wants it able to search every configured bot's working context and
understand what it is doing and why, rather than depend only on the COO's
selected summaries. Relevant context includes assigned goals/instructions,
ongoing work, evidence, outputs, decisions, dependencies and documented rationale.
This is a desired internal read capability, not a claim that dots exposes all
task memory or a requirement to retrieve private model reasoning.

Recommend searchable, attributable context with targeted retrieval, not loading
every bot's entire history into each request. The deliberate wider internal
assistant scope is separate from customer-facing helper knowledge and does not
transfer another bot's tools, write authority or customer-disclosure rights.
Exact sources, sensitive-field exclusions, retention and search integration
remain open; credentials do not belong in this context. Business-scoped customer
work and the exclusion of customer-profile merging remain unchanged. Andrew's
later analyst-sharing refinement below adds three protected workspaces; the
earlier "every context" wording must not be read as silently overriding them.

**Stage-aware attention — Andrew's preference, 2026-10-08:** Importance depends
on each Business's scale, not a permanent notify-on-every-event rule. Early on,
Andrew wants visibility into the first customer, first complaint, useful customer
suggestions and interesting evidence-backed analytical findings. The exact
"first customer" milestone remains to define; do not assume real paid billing
exists in the current no-charge preview. Visibility does not automatically mean
every item requires an urgent interruption.

As a Business grows, recurring routine signals may become summaries, while
novel issues, meaningful changes or decisions needing Andrew remain eligible
for direct attention. A new small Business should not inherit another mature
Business's quieter policy merely because the factory has grown. The assistant
and Andrew can agree on rules and revisit them: propose tightening or relaxing
thresholds with examples of what would be surfaced or grouped. Recommend this
collaborative tuning over either permanent fixed thresholds (simpler but can
become noisy) or unrestricted self-tuning (less manual work but can suppress
important information). Any discretion to adjust within pre-approved bounds,
review cadence, interruption channel and precise criteria remain undecided.
Attention filtering is not action permission: fewer notifications never imply
approval of pending tools/replies, deletion of unresolved work or broader bot
authority. The assistant's agreed role is protecting Andrew's time while keeping
important business learning visible, not launching technical monitoring now.

**SWOT attention lens — accepted refinement, 2026-10-08:** Andrew explicitly
agrees that the assistant should understand strengths, weaknesses, opportunities
and threats as a way to identify what deserves his attention. Apply this lens to
the evidence and each Business's stage, while respecting Andrew's priorities:

- **Strengths:** what is working and might usefully be reused or expanded.
- **Weaknesses:** internal limitations or recurring friction worth addressing.
- **Opportunities:** a credible improvement, such as a useful new model integration
  or a new place to automate work that currently consumes Andrew's time.
- **Threats:** a meaningful risk or change that needs a decision or timely response.

A SWOT label alone does not make an item important or urgent. Recommend surfacing
material, timely findings with evidence versus hypothesis, likely impact,
cost/effort and uncertainty, why Andrew is needed, options/recommendation and the
consequence of waiting. Routine findings can remain searchable or in summaries;
neither a mandatory four-quadrant report for every event nor a numerical scoring
engine is required. This attention lens grants no action approval and adds no
independent roadmap, monitoring setup or management console.

**Automation-opportunity discovery — Andrew's refinement, 2026-10-08:** The
automation advisor should suggest further places where work could be automated,
not only which existing approval rules to relax. The assistant includes these
possibilities in its SWOT opportunity assessment and can identify a candidate
from searchable work context for the advisor to investigate. Distinguish a
supported configuration change from a missing capability that Andrew and Codex
would need to develop. A useful proposal explains the recurring work, evidence,
expected manual effort removed, implementation/ongoing maintenance costs, risks
and the specific decision needed. Potential time saved is a hypothesis until
measured, not proof that building the automation is worthwhile. The assistant
prioritizes against Andrew's current goals; neither role activates its own proposal
or silently adds it to the MVP. This extends the existing advisor/assistant roles,
not a request for another bot, plan or automatic engineering workflow.

Approval-required actions remain pending until an authorized human decides.
Neither role gains Andrew's authority from its title, may self-approve proposals,
expand bot/data permissions or authorize code/schema/production changes merely
by delegating. The assistant presents choices and carries explicit decisions
back through validated flows; it does not manufacture Andrew's consent. Keep the
existing single roadmap authoritative. The assistant's clarified internal
working-context access does not merge customer profiles across Businesses or
grant arbitrary production-data access.

Preserve separate role definitions even if they share scheduling/task tooling
(Lower–Medium relative effort; less integration, but routing and scope still need
validation). Independently scheduled bot instances are another option
(Medium–High; clearer execution ownership, but more handoffs, duplicate reviews
and usage). Recommend the former initially without combining responsibilities.
Actual multi-dot availability, communication/identity, execution placement,
approved data/skills, cadence/budgets, interruption rules and MVP inclusion remain
undecided. This is not a verified native dot-to-dot management capability.
Configuration/engineering belongs in Codex/operator automation; human decisions
remain operator/backoffice work, not product-facing controls or new Nirvana tasks.

**Analytics research and future model integration — exploration, 2026-10-08:**
Andrew wants the analyst able to investigate meaningful Business data and query
results, research useful models and potentially create/test models for marketing,
sales or offer selection. Multi-armed and contextual bandits are example future
ideas, not a selected algorithm or approved customer experiment. His constraint
is CPU-only work; the analyst must establish data needs, evaluation, runtime
feasibility and costs rather than assume any model fits the deployed services.
No unrestricted production queries, training jobs or data export are authorized.

The desired proposal loop is: analyst studies a candidate and its evidence →
assistant judges whether it merits Andrew's attention → Andrew chooses whether
to pursue it → Codex develops a reviewed integration point → analyst gains a
bounded model/configuration surface to evaluate and tune. New integrations,
data sources or code changes are engineering decisions, not effects of a bot
having a tunable parameter. Which later parameter changes may run autonomously
within approved ranges, and which require another approval, remains open.
Models do not replace the code-protected authorization/approval rules.

Relative scope options:

- **Research and proposals first (recommended now):** reuse meaningful events
  and the proposed evidence/proposal flow. Lower relative effort; useful for
  identifying what data and integration are missing. Without customers, findings
  are hypotheses; synthetic evaluation does not prove commercial benefit.
- **A bounded experiment at one approved integration:** reuse a Codex-built
  interface with explicit alternatives, objective, exposure/cost limits and a
  stop/rollback path. Medium–High relative effort; requires suitable data and
  validation. CPU-only does not make a customer-facing experiment low-risk.
- **A general autonomous modeling platform:** flexible across many integrations,
  but High relative effort and new maintenance, permission and experiment risk.
  Not recommended for the present stage or included in the initial MVP scope.

Andrew explicitly does not want all of this at once. Record it in this active
exploration, not as a new MVP commitment or separate plan. Research/configuration
and model integration remain Codex/operator workflows; Andrew's decisions belong
in the operator proposal/attention flow. No model dashboard or customer-facing
ML control is required merely by discussing the idea.

**Security/legal roles and dedicated analysts — Andrew's refinement, 2026-10-08:**
Andrew adds security and legal to the operating concept, then clarifies that each
role directly under him with its own responsibility should have its own analyst.
The initial four peer responsibilities are below; Andrew subsequently adds product
manager, project manager and architect with the same dedicated-analyst pattern:

| Responsible role | Dedicated analytical counterpart | Proposed focus |
| --- | --- | --- |
| COO | Operations analyst | Business outcomes, specialist effectiveness, dependencies and operational improvements |
| CTO personal assistant | Assistant analyst | Evidence for attention priorities, SWOT and opportunities to reduce Andrew's burden |
| Security | Security analyst | Security exposure, access/disclosure boundaries and evidence for mitigations |
| Legal | Legal analyst | Applicable obligations, policy/behavior mismatches and source-grounded questions for review |
| Product manager | Product analyst | Customer needs, product opportunities, prioritization evidence and accepted-roadmap status |
| Project manager | Delivery analyst | Progress evidence, dependencies, blockers, delivery coordination and completion checks for agreed work |
| Architect | Architecture analyst | Technical feasibility, reuse boundaries, maintainability, operating costs and design trade-offs |

Security and legal are peers of the COO and personal assistant here, not silently
placed beneath the COO. These are desired responsibilities, not newly granted
production permissions or a requirement for a separately deployed service per role.
The assigned analyst is a dedicated counterpart with its own work context, not
a shared analyst conversation that accumulates all roles' data. This revises
the earlier suggestion that one analyst might serve several responsibilities.
Other future decision-owning roles can use this pattern; it does not require
an analyst for every customer-facing helper or ticket specialist.

Reuse analytical code, procedures and approved skill files without automatically
sharing conversation history, retrieved records, legal material or tool access.
Cross-role requests/results should be deliberate and attributable; delegation
does not transfer the sender's authority. The assistant's earlier requirement
to search other bots' work remains a distinct, intentionally approved read path,
not automatic analyst-context pooling. Exact searchable sources and disclosure
boundaries, especially sensitive legal/security evidence, still need definition.
Do not claim a separate named bot alone provides enforced data isolation or that
the selected external provider already supports this complete arrangement.

Recommended starting responsibilities, not final scope or implementation:

- **Security bot:** inspect approved code/configuration and relevant evidence;
  identify possible vulnerabilities, excess access, confidential-data exposure
  and unsafe automation proposals; recommend bounded fixes and verification.
  Findings distinguish confirmed issues from untested hypotheses. It does not
  certify safety, attack/scan live systems, rotate credentials, revoke access or
  deploy fixes merely because it has the security title.
- **Legal bot:** research applicability against the Business's real operator,
  markets, data use and commercial promises; compare policy wording with actual
  behavior and review proposed changes. Cite current primary sources and flag
  missing facts, jurisdictional uncertainty and matters needing qualified advice.
  It can prepare questions/drafts, not declare legal clearance, sign agreements,
  publish binding terms or make representations to customers on its own.

Use the existing [legal launch gates](../../docs/factory/mvp-delivery-plan.md#legal-documents-and-agreement-readiness)
and the deferred [edge-security discussion](../../docs/architecture/future-ideas.md#custom-domain-edge-protection-and-security-monitoring)
as context, not a new document pack or permission to implement their backlog.
Both roles can raise evidenced concerns directly with Andrew's assistant; a
security/legal concern does not need COO permission to be heard. Whether they
only advise or also participate in a specific mandatory review gate is open;
existing code-enforced authorization/safety controls are not optional meanwhile.
Review cadence, incident authority, approved inputs and final MVP inclusion remain
open. Codex/operator workflows own configuration and authorized engineering;
human decisions belong in the backoffice/attention flow. No customer-facing
security/legal chatbot or legal-management console is requested.

Earlier scope alternatives: on-demand/proposal review (Lower relative
effort; reuses the proposed evidence flow, but misses changes between reviews),
periodic operating review (Medium; needs a scoped schedule and reliable inputs),
or both (Medium–High; wider coverage but more duplicate work and usage).
**Accepted starting mode, 2026-10-08:** Andrew agrees to advisory reviews of
proposed changes first; periodic business checks can be considered later, not
scheduled now. Sensitive changes still require approval. This settles the
initial review mode, not precise inputs, mandatory gates or implementation.

Source checks: [OWASP Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
supports limited tools, downstream authorization and approval for high-impact
actions. [NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)
calls for clear human/AI responsibilities, legal-risk context and leadership
accountability. These support the advisory boundaries, not a legal determination
for Andrew's Businesses or proof that this proposed architecture is secure.

**Product manager and architect — requested roles, 2026-10-08:** Andrew adds
these to the roles under him, applying the dedicated-analyst/separate-context
pattern. Proposed responsibility boundaries:

- **Product manager:** understand customer problems and meaningful feedback,
  compare product opportunities and recommend priorities/scope with evidence.
  Use the existing canonical product documents and single MVP roadmap; do not
  create a competing live backlog. The product analyst supports this research.
- **Project manager — added by Andrew, 2026-10-08:** coordinate delivery of
  already-agreed work, examine verified progress/dependencies/blockers and prepare
  useful follow-ups. Its dedicated delivery analyst checks evidence, rather than
  treating another bot's "done" as proof. Reuse the accepted roadmap and work
  records; coordinating delivery does not authorize new scope, launch claims,
  engineering execution or deadlines Andrew has not agreed. This is separate
  from product-value decisions and the personal assistant's attention priorities.
- **Architect:** examine technical feasibility, shared versus Business-owned
  behavior, reuse without imposing one product's domain model on another,
  maintainability and operational/cost trade-offs. The architecture analyst
  researches these choices against current code and applicable primary sources.
  Proposed designs/ADR drafts are not accepted architecture or permission to
  change schemas, implement refactors or deploy. Andrew subsequently clarifies
  that the architect should also help implement approved work through Codex,
  not remain a design-only advisor; the collaboration refinement below owns that
  distinction, without granting general execution authority.
- **Personal assistant:** assess which findings and decisions merit Andrew's
  attention under his goals, SWOT and well-being. It does not replace product
  reasoning or technical design; those roles can raise requests directly to it.

These are responsibilities, not a request to start role instances or assume every
role must run on every change. Codex remains the authorized engineering/configuration
workflow; human scope/approval decisions remain in the operator/attention flow.
No extra product-management or architecture console is required by these additions.
Andrew explicitly asks for project manager, product manager and architect as
distinct roles, not a single combined manager. Precise handoff and task-dispatch
powers remain open; no additional planning artifact or operational queue is created.

Next product-manager authority alternatives, not yet accepted:

- **A — recommendations only:** use the proposed evidence/proposal flow to
  suggest priorities; Codex/Andrew separately maintain accepted status. Lower
  relative effort; limited write authority, but extra handoffs and stale status
  are possible.
- **B — maintain the accepted roadmap and propose changes (recommended):** keep
  verified outcomes, blockers and already-approved work current in the same
  canonical records; ask Andrew before changing agreed product scope or priorities.
  Medium relative effort; needs clear accepted inputs and conflict handling so
  record maintenance does not become unapproved strategy or duplicate plans.

Recommend B to reduce manual coordination while preserving Andrew's decisions.
The exact supported write surface and product/architecture access are still open;
this recommendation does not grant roadmap editing or deployment authority now.

**First common authority boundary — options and accepted refinement, 2026-10-08:** Andrew is unsure
which boundaries to define now. Recommend settling internal-advisor research
versus action authority before detailed tools, schedules or per-role write
controls. This is distinct from the live support bot's already-agreed approval
for every permitted tool invocation and substantive reply.

- **1 — approve every advisory step:** review each allowed data/tool request and
  suggested action. Lower policy-design effort, but substantial operator handoffs.
- **2 — pre-approved research, approval for effects (recommended):** advisors can
  inspect explicitly approved sources, collaborate through scoped handoffs and
  prepare proposals without asking at each step; consequential writes, customer
  communications and new authority still need a separate approved execution path.
  Medium effort; requires concrete read/disclosure scopes and budgets, not an
  unrestricted production read grant or automatic deployment.
- **3 — automatic effects within approved rules:** permit selected changes under
  tested code-backed rules. Higher effort; precise actions, limits and evaluation
  are needed. Preserve this later possibility, not initial blanket authorization.

**Accepted refinement, 2026-10-08:** Andrew initially restates approval for
everything, then asks for a clearer explanation of option 2 and agrees with it.
For the internal advisors, bounded research on approved information, scoped
consultation and proposal/draft preparation need not interrupt him at each step;
consequential effects still require approval. This does not relax the live support
bot's approval for every permitted tool call and substantive reply. Concrete
read/disclosure scopes and budgets are still to define; approval of the design
does not connect data sources, enable jobs or grant unrestricted production reads.

Security/legal/architecture review should be relevant to a proposal's risks, not every role
reviewing every message or clerical change. Exact review triggers and whether any
review is a mandatory gate remain open; bot recommendations cannot weaken existing
hard controls. No runtime write permissions or implementation are enabled here.

**Collaborative feature lifecycle and Andrew's involvement — clarified direction, 2026-10-08:**
Andrew describes the product manager receiving suggestions from customers,
operators and any relevant bot, then assessing product/business value, risks and
opportunities through SWOT. This is distinct from the personal assistant's SWOT
question of whether something deserves Andrew's time. Worthwhile prioritized
ideas proceed to shared brainstorming: architect develops technical options,
legal/security assess relevant implications, and other roles contribute when
needed. Relevant review does not mean invoking every role for every small change.

Once the chosen feature direction is agreed, the architect prepares an
implementation-ready plan informed by that collaboration. The project manager
coordinates agreed delivery and evidence; Andrew and the architect can work
together through Codex on authorized implementation. The architect is therefore
not permanently limited to recommendations, but planning approval is not blanket
permission for code, structural schema changes or production publication. This
describes the proposed future workflow; it does not accept this entire brainstorm,
create an implementation plan now or start building these roles.

Andrew expects involvement in nearly every substantive decision initially.
Approved-source research/drafting can still proceed under option 2; independent
analysis is not agreement to product priorities, designs or consequential actions.
Later, evaluate whether the assistant's attention recommendations match Andrew's
judgment, including unnecessary interruptions and important missed items, then
tune the agreed criteria together. Reduced participation in particular decisions
requires an explicit later boundary, not a SWOT score silently removing approvals.

For Codex placement, retain an open choice: an interactive repository-connected
Codex task with Andrew (recommended initial lower-integration approach), or a
later validated dot-to-Codex task handoff. [Official prompting guidance](https://learn.chatgpt.com/docs/prompting)
describes reviewing plans and delegated implementation; [dots tasks and memory](https://learn.chatgpt.com/docs/dots/tasks-and-memory)
describes local connected-computer tasks and configured cloud coding tasks, each
with its own conversation. This establishes possible work surfaces, not the
architect role's setup, Andrew's available account/environment, native cross-role
context search or an installed BFF integration. Exact workspace, handoff and
approved context package remain to define; no task or provider setup is activated.

**Separate workspaces versus readable context — Andrew's refinement, 2026-10-08:**
Every responsible role still has its own analyst, after Andrew considers and
rejects sharing one analyst among project manager, product manager and architect.
Separate working conversations are not a blanket requirement that all other
analysts' work be unreadable. Andrew now wants ordinary working context available
across the relevant internal analysts, with no context automatically copied into
every prompt. This revises the earlier broad default-isolation suggestion:
distinguish who owns/writes a workspace from who may intentionally read it.
Internal work-context access is not a new right to arbitrary customer records,
merged customer identities, credentials or another role's execution tools.

Andrew identifies three specially protected analyst contexts: **security, legal
and personal assistant**. Their private working context should not be accessible
to other bots merely through broad context search. He also describes the personal
assistant's analyst as unusually broad, able to inspect everyone's context.
These statements leave one explicit unresolved exception: does that analyst read
security/legal private work too, or receive deliberately shared findings only?
Also clarify access for each paired responsible role before implementing any
private-workspace contract; do not assume title, sibling status or oversight
automatically bypasses the protection.

Options for the assistant-analyst exception:

- **A — protected contexts stay private; share findings explicitly (recommended):**
  reuse intentional handoffs and ordinary-context search, with no automatic raw
  access to the three protected workspaces. Medium relative effort; preserves
  Andrew's stated privacy boundary, but the assistant may need follow-up evidence.
- **B — assistant analyst has an explicit security/legal exception:** broader
  raw read access supports its overview, while ordinary analysts remain excluded.
  Medium–High relative effort; expands the most sensitive read scope and requires
  precise read/disclosure controls. This is a new exception, not implied by A.

Both retain a private assistant-analyst workspace. Recommend A pending Andrew's
clarification, not as an accepted restriction on his desired broad overview.
Searchable work records, separately approved findings and provider-private task
memory are different sources; the exact supported access mechanism remains open.
No confidential bot histories or customer evidence are copied into the repository.

**Per-secret rules and derived disclosure — Andrew's clarification, 2026-10-08:**
Andrew makes the access decision depend on subsequent communication: a bot that
knows confidential information should not freely discuss it with other bots.
He wants each secret brought to him so **he sets its rule**. This replaces the
earlier global A/B choice with per-secret operator judgment, not blanket raw
access for the assistant analyst. Knowing a fact does not authorize forwarding
it, and a bot cannot widen its own rule. Pending a rule, preserve the existing
private scope rather than disclosing it to a new reader or recipient.

Illustrative small rules, not yet approved individual grants:

- A particular security report is retrievable only by Andrew and the security
  role; other bots cannot retrieve the original.
- A private analyst allowed to read confidential sources has no free-form
  bot-to-bot send tool or shared output destination; its findings go only to
  Andrew or another explicitly approved private recipient.
- A specific operator-approved summary is a separate shareable artifact with
  named readers; approval of that summary does not expose its private source.

Recommend reusing Andrew's recorded decision for the same secret and approved
scope rather than asking on every identical access; a new recipient or wider
scope needs him again. Whether related secrets may share one rule remains open.
Rules are source/recipient access checks and narrow communication capabilities,
not a general condition-builder or an assumption that a prompt can enforce
confidentiality. The existing operator allowlist is a code-level access-check
pattern, not an implemented bot identity or secret-policy system.

Andrew then points out that information can be copied or carried elsewhere.
Agree with the limitation: controlled direct reads/transfers can be audited,
but matching text or attaching a source label cannot reliably detect every
paraphrase, inference or derivative disclosure. [OWASP Sensitive Information Disclosure](https://genai.owasp.org/llmrisk/llm022025-sensitive-information-disclosure/)
warns that model outputs can expose confidential information and prompt
restrictions can be bypassed. Recommend constraining the entire secret-bearing
execution context's outbound channels, not allowing unrestricted messages on
the promise that an output filter will recognize each secret. A shareable summary
should be deliberately approved before a separate context reads it; source
approval is not approval of every generated summary. Actual provider context,
memory, retrieval and communication enforcement remain to verify. This is a
design requirement, not a guarantee or a newly enabled permission system.

Codex/operator automation maintains validated configuration; Andrew decides
confidentiality exceptions in a private approval surface. No confidential content,
credentials or real private conversation transcripts are written to repository
examples. No schema, new bot, connector or rule-management UI is implemented.

**External organization platform: Dots and Paperclip — Andrew's correction and research, 2026-10-08:**
Andrew explicitly corrects the layer under discussion: the company/analyst bots
would most likely use OpenAI Dots, not run as a Convex bot organization. He asks
to investigate Paperclip because the proposed reporting structure resembles it.
The BFF allowlist example above is only a generic access-check analogy; it does
not establish control over an external agent's memory, context or communication.
Keep these company advisors separate from the proposed live BFF helper/support
runtime. No external platform is selected or connected by this discussion.

Primary-source findings, inspected 2026-10-08:

- [Paperclip's repository README](https://github.com/paperclipai/paperclip) describes
  an open-source, self-hosted agent-organization platform, with reporting lines,
  delegated tasks, schedules, budgets, approvals and adapters including Codex.
  It is an organizational control plane, not a model or a library to add to Convex.
  Its credential-secret storage is not evidence that arbitrary confidential
  business facts remain isolated after a model reads them.
- [Official OpenAI Dots controls](https://learn.chatgpt.com/docs/dots/controls)
  describe action review and custom rules for asking before an action, acting on
  request or handing work to the user. The documentation explicitly says custom
  rules are instructions the dot tries to follow and can make mistakes; they are
  not a proof of enforced per-secret information-flow isolation.
- [Paperclip connector access](https://docs.paperclip.ing/connectors/access-model/)
  provides selected-agent connection access and Allowed/Ask first/Off for calls
  through its tool gateway. These controls do not apply identically to messaging
  channels, and per-tool Ask first does not govern an agent's shell. Thus a rule
  such as "this managed action asks before every call" is concrete, but does not
  establish "all ways to send this confidential information require approval."

Candidate approaches, not an accepted provider decision:

| Approach | Reuse and likely effort | Main unresolved constraint |
| --- | --- | --- |
| Dots-led small advisory setup | Reuse managed tasks and action review; Lower initial integration effort if available to Andrew | Exact multi-role context/search, confidentiality boundaries and BFF evidence/proposal handoff remain unverified |
| Paperclip-led organization | Reuse explicit organization/delegation/budget/approval concepts; Medium–High setup and operational effort | Hosting and agent runtimes need operation; private context and all outward paths require verification beyond gateway controls |
| Custom organization layer in BFF | Reuse existing Business/operator facts; High implementation and maintenance effort | Rebuilds orchestration and does not itself control externally running bots; not recommended now |

Recommend evaluating Paperclip's existing organization model before designing
custom company-management infrastructure, while retaining Dots as Andrew's likely
candidate. Do not assume Dots has a Paperclip adapter or that the two are a proven
combined solution. Record the desired confidentiality rules separately from
what either provider can enforce; source access, execution context, shared files,
memory and non-gateway communication all matter. A bounded approved-information
review is a possible later experiment, not authority to install, connect accounts,
create agents, schedule work or give them real private material now.

**Architect's engineering staff and company visibility — Andrew's refinement, 2026-10-08:**
The architect is also an engineering supervisor, analogous to the COO's
operational oversight: understand what its staff are doing, check their results
and quality, and answer technical questions about worthwhile features. Andrew
requests these specialist responsibilities beneath the architect, alongside its
already separate architecture analyst, not three more CTO-level peers:

| Engineering specialist | Desired responsibility | Useful evidence for the architect |
| --- | --- | --- |
| NOC-style technical watcher | Examine technical issues, logs and metrics; identify individual versus wider production problems | Affected environment/release, observed symptoms, scope, evidence and uncertainty; investigation or escalation needed |
| QA/regression | Reproduce reported problems, examine what failed and check that approved changes do not break relevant journeys | Reproduction, affected checks, actual results and remaining gaps, rather than an unsupported "tested" status |
| Developer | Implement authorized work and address approved findings with the architect | Reviewed changes and proportionate test/release evidence; implementation is not finished merely because code was written |

These are proposed roles, not running agents or additional deployment units.
Recommend starting with these three engineering responsibilities rather than
inventing a separate release, reliability or code-review bot before a distinct
need appears; the architect and existing delivery/QA workflows can cover those
concerns initially. Staffing, execution grants and final MVP inclusion remain open.

For the NOC role, "always monitoring" describes desired coverage, not a
requirement for nonstop model calls. Recommend external monitoring collection
and detection, with scoped AI investigation of supported incident notifications
and bounded periodic checks. Technical telemetry stays in the monitoring tool,
not copied into BFF's business-event records or the backoffice. Preserve a direct
critical-alert path if AI investigation fails; a technical watcher does not
automatically repair production. [Official dots tasks guidance](https://learn.chatgpt.com/docs/dots/tasks-and-memory#event-monitoring)
describes event monitoring where the connected service supports it; a connection
alone does not create a monitoring task. Native access to our chosen log/metrics
service, coverage, cadence, budgets and failure delivery are unverified. Monitoring
remains later MVP work under the existing roadmap, with no provider, schedule or
subscription activated by this role discussion.

Andrew clarifies the coordination responsibilities: the product manager connects
COO/business needs with architectural options and relevant security/legal
validation, then hands agreed work and outstanding decisions to delivery
coordination. The COO's dedicated analyst helps it understand business outcomes;
the architecture analyst supports technical judgment. The project manager's
**primary output is a trustworthy company-wide picture** of what is happening,
what agreed work is actually progressing, what is blocked and what evidence is
missing. It consults the relevant analysts, supports Andrew's prioritization and
follows up on commitments, rather than independently implementing changes or
changing product priorities. This broadens the earlier delivery-only description,
not the personal assistant's independent responsibility for Andrew's attention
and well-being. Use the existing roadmap/work records, not a second plan.

Consulting "all analysts" does not silently settle the private-context exception:
security/legal/assistant analysts can provide deliberately shared findings while
their protected workspaces remain unresolved as described above. Operational
placement stays Codex/operator automation for configuration and approved
engineering, read-oriented backoffice for progress/evidence, and human judgment
in the existing approval/attention flow. No new customer-facing engineering UI
or company-management console is requested. QA effort should follow the affected
behavior and release boundary; this does not reinstate full CI, browser or AI
checks for every Markdown edit.

### Historical decision log — 2026-10-08

| Date | Decision | Context |
| --- | --- | --- |
| 2026-10-08 | Explore configurable automation, monetization and marketing advisors with operator-controlled activation | Andrew wants bots to analyze periods of evidence and propose rules/offers/acquisition improvements. They cannot apply their own changes; recommend a small evaluated proposal loop, not a new builder or default trio. Cadence, evidence access, MVP inclusion, schema and implementation remain unapproved |
| 2026-10-08 | Place periodic advisory review outside live BFF helper/support bots | Andrew proposes a weekly Codex CLI batch over Businesses with relevant delegated reviews and separately selectable structured proposals in backoffice. Preserve Business-scoped evidence and operator-controlled effects; exact data/format/import and implementation remain open |
| 2026-10-08 | Consider OpenAI dots instead of a custom scheduled Codex CLI runner | Andrew offers a tentative alternative. Official guidance supports recurring/delegated work, not an already-connected BFF proposal workflow or confirmed account access. Validate proposal-only review/delivery before recurrence; no schedule, connector, schema, action powers or new MVP build is approved |
| 2026-10-08 | Explore manager/business oversight and product/project prioritization to protect Andrew's time | Andrew proposes checking specialist outcomes and surfacing what genuinely needs him. Recommend one coordinator with bounded delegated roles initially; verify results rather than trusting agent status, reuse the single roadmap, and keep new scope/approval authority explicit. MCP, multiple independent dots, scheduling, implementation and MVP inclusion remain unapproved |
| 2026-10-08 | Separate COO operations oversight from Andrew's independent CTO assistant | Andrew is CTO/final company decision-maker, with no separate CEO needed. COO coordinates operational specialists; the assistant reports only to Andrew and prioritizes requests from any configured bot without a COO gate. This supersedes the combined-role recommendation; shared tooling may retain distinct responsibilities. Exact execution/communication, access, budgets, MVP inclusion and implementation remain unapproved |
| 2026-10-08 | Make assistant attention rules adapt to each Business's scale through agreed revisions | Andrew wants early first-customer/complaint milestones, useful suggestions and analytical findings surfaced, with routine signals becoming less individually important as a Business grows. Revisit rules together; thresholds/channels and any discretion to self-adjust within approved bounds remain open. Attention filtering never grants action approval or expands implementation/MVP scope |
| 2026-10-08 | Give Andrew's assistant searchable bot working context, not only COO summaries | Andrew prioritizes his well-being and wants to understand each bot's work and reasons. Record desired access to goals, work, evidence and documented rationale; exact integration/data scope remains open and grants no other bot's tool authority or customer disclosure rights |
| 2026-10-08 | Explore CPU-only analyst research and approved model integration points | Andrew proposes models and possible bandits for marketing/sales/offers, explicitly not all at once. Analyst researches evidence/data/runtime needs; assistant surfaces worthwhile proposals; Andrew and Codex establish approved integrations. Subsequent bounded tuning authority remains undecided; no training, rollout, schema or new MVP commitment is approved |
| 2026-10-08 | Use SWOT as the assistant's attention lens | Andrew confirms strengths, weaknesses, opportunities and threats should help identify what deserves his time. Consider evidence, materiality, timing and personal priorities; do not interrupt for every finding or treat a SWOT label as action approval |
| 2026-10-08 | Discover new automation opportunities as well as improve existing rules | Andrew wants further places to automate included in the assistant's SWOT opportunity assessment. The advisor investigates candidates; the assistant prioritizes potential time saved against engineering/maintenance effort and risk. Missing capabilities require Andrew/Codex decisions, not self-activation or automatic MVP expansion |
| 2026-10-08 | Add security and legal as proposed peer responsibilities under Andrew | Andrew requests these bots alongside COO and personal assistant. Recommend evidence-backed security concerns and source-grounded legal research/drafts, not autonomous remediation, contracts or legal clearance. Specific scope, review/gate powers, cadence and MVP implementation remain open |
| 2026-10-08 | Give each CTO-level responsible role its own analyst and separate context | Andrew clarifies that COO, personal assistant, security and legal each need a dedicated analytical counterpart. This revises the shared-analyst suggestion. Shared skills/code are possible without pooling histories/data/tools; intentional handoffs and assistant search must be separately defined. No new instances, permissions, schema or implementation are approved |
| 2026-10-08 | Start security/legal with advisory proposed-change reviews | Andrew agrees with the narrower starting mode rather than periodic business checking now. Sensitive changes still need approval; exact inputs/gates, role implementation and future cadence remain open |
| 2026-10-08 | Add product manager and architect to the desired role structure | Andrew requests both, following the dedicated-analyst/separate-context pattern. Propose product/customer-priority work versus technical-design/reuse work, distinct from the assistant's attention role. Recommend maintaining accepted roadmap state while seeking scope/priority approval; that authority choice remains open. No new plan, runtime, schema or deployment is approved |
| 2026-10-08 | Propose research-versus-action authority as the first common boundary to resolve | Andrew is unsure which boundaries to choose. Recommend pre-approved scoped advisory research and proposals with separately approved effects; retain all-support-tool/reply approval. Options and selective review triggers are proposals, not new access or accepted automation |
| 2026-10-08 | Accept option 2 for internal-advisor research versus effects | After initially asking for approval for everything, Andrew asks for clarification and agrees that scoped approved-information research, consultation and drafts can proceed without per-step interruption, while consequential changes require approval. Support tool/reply approval remains unchanged; concrete data/cost scopes and runtime setup are unapproved |
| 2026-10-08 | Require distinct project manager, product manager and architect roles | Andrew explicitly requests all three. Apply the dedicated-analyst/separate-context pattern; propose delivery coordination versus customer/product priorities versus technical design. Precise task/write/engineering authority remains open; reuse existing roadmap/work records, not a new plan or management platform |
| 2026-10-08 | Shape a collaborative feature lifecycle, not design-only architecture advice | Andrew wants suggestions assessed by product/business SWOT, relevant-role brainstorming, architect-led planning and approved implementation with him through Codex. He expects broad initial decision involvement and later evidence-based attention tuning. This does not accept the whole brainstorm, create a plan or authorize runtime/schema/deployment work |
| 2026-10-08 | Separate workspace ownership from read access; protect three analyst contexts | Andrew retains distinct analysts but allows ordinary internal work context to be read across analysts. Security, legal and personal-assistant analyst workspaces are private. His assistant analyst also has a desired broad overview, so its possible private-context exception and paired-role readers require clarification. No access grant or copied private histories |
| 2026-10-08 | Give the architect NOC, QA/regression and developer staff; make project-manager visibility primary | Andrew wants technical-staff supervision, quality evidence and production-issue awareness, while product coordinates business/technical/review needs. Project manager consults analysts to show actual company progress and support his priorities, not execute independently. External monitoring remains later MVP; private-context access, integrations, schedules and implementation are unresolved |
| 2026-10-08 | Let Andrew set each secret's rule; distinguish access from onward disclosure | Andrew conditions private access on whether its holder can communicate with others, asks to choose rules per secret and identifies copying/indirect disclosure risk. Preserve private scope pending his decision; illustrate source allowlists, restricted outbound channels and approved summaries. No blanket assistant exception, reliable derivative-content detection, implemented rules or runtime grants |
| 2026-10-08 | Evaluate external Dots/Paperclip organization controls, not Convex rules for company bots | Andrew identifies Dots as likely and asks to look up Paperclip. Official sources support organizational reuse and concrete action controls, not guaranteed per-secret disclosure prevention: Dots custom rules can err; Paperclip gateway gates do not cover every channel or shell path. No platform selection, installation or integration is approved |

**Review lens:** The [Agency Agents Growth Hacker](https://github.com/msitarzewski/agency-agents/blob/main/marketing/marketing-growth-hacker.md)
was consulted for experimentation/evidence, not as authority for growth targets,
paid campaigns, tracking or legal compliance.

</details>

## Custom-domain edge protection and security monitoring

**Status:** Deferred operational-hardening idea beyond the accepted basic MVP analytics/monitoring slice. The current MVP uses a narrow Cloudflare gateway only for same-site customer-session routes, keeps product/native Convex traffic direct to the generated origin and uses bounded application-level rate limiting. Build 5 now owns business/customer visibility and bounded analytics; the separate Build 6 owns ordinary health/error monitoring and actionable delivery/webhook alerts; this entry retains only the stronger custom-domain, WAF, DDoS and origin-bypass questions. The gateway is not currently a WAF or origin-authentication boundary.

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
