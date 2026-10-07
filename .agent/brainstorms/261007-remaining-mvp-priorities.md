# Brainstorm: Remaining MVP priorities while Paddle is unavailable

> **Status**: Superseded — 2026-10-07; inactive discussion/research history. Current priorities and open delivery choices live in the [MVP roadmap](../../docs/factory/mvp-delivery-plan.md).
> **Created**: 2026-10-07
> **Last updated**: 2026-10-07
> **Repository baseline**: `ff0de87954cfb436fe9a63584e83e1424c1e2ac8`

## Document role — discussion record, not an MVP plan

The [MVP delivery roadmap](../../docs/factory/mvp-delivery-plan.md) is the one
authoritative overall plan. This brainstorm preserves our questions, research,
options and dated reasoning; it is not a second roadmap, approved implementation
backlog or authority to start work. Earlier alternatives are historical context,
not an instruction to implement every idea recorded here.

Accepted delivery decisions are reconciled into that roadmap; accepted product
promises remain in [TableCards Product](../../projects/tablecards/docs/product.md).
Open ideas stay open. Future scoped execution plans take their scope from those
canonical documents, using this record only for rationale and unresolved choices.
Andrew raised this duplication/authority concern on 2026-10-07. Preserve the
discussion history without maintaining an independent MVP schedule in this file.

**Closure, 2026-10-07:** Andrew prefers fewer maintained documents and asks why
this separate priority brainstorm is needed. It is not needed as a live planning
surface. Accepted delivery revisions and current backoffice questions have been
reconciled into the existing roadmap; vendor comparisons and earlier options
remain here as dated research/history, not selected providers or accepted work.
Continue ordinary MVP prioritization in the roadmap, not this file. No
implementation plan, complete brainstorm acceptance, account access or runtime
change is authorized by closing this record.

## Context Snapshot

- Builds 1–3 meet their authorized production boundaries; TableCards is a
  no-charge preview, not a paid/customer launch. Development has the same app
  fixes. The working tree was clean when this discussion began.
- Andrew says Paddle is not yet available and requests a small brainstorm about
  other remaining MVP work. No replacement billing provider is requested.
- [STATUS](../../STATUS.md), the [delivery plan](../../docs/factory/mvp-delivery-plan.md),
  [TableCards product](../../projects/tablecards/docs/product.md) and the
  [production evidence](../../projects/tablecards/docs/reviews/261007-build-3-production-release.md)
  are the current sources. Earlier accepted product/skills brainstorms retain
  their own scope; this discussion concerns remaining-work priority only.

## The Idea

Choose useful non-billing MVP work without waiting idle for Paddle, expanding
product scope or declaring dependent release stages complete prematurely.

## Codebase Context

### What We Have

- Working account/session/team contracts, TableCards projects/PDF/AI and shared
  no-charge checkout, plus production health/version and deployment checks.
- An existing read-oriented backoffice, not the full launch operator tool.
- Build 5 requires two-way support and a public monitored contact path.
- Build 6 requires focused analytics, actionable monitoring and usable operator
  search/account views/queues. Build 7 owns final launch acceptance and recovery.
- The product already records a focused outreach/pilot experiment; marketing is
  not a new generic automation system to add to the MVP.

### Constraints

- Real payment/subscription verification remains Build 4. Support billing
  context and paid-conversion views cannot be honestly verified without it.
- The delivery plan currently sequences Builds 4–6; non-billing foundations can
  be discussed earlier, but this does not accept a wholesale dependency change.
- Support needs a selected outbound/inbound email bridge or helpdesk and an
  approved public contact. Analytics/monitoring providers are not selected.
- Preserve privacy, bounded retention/cost and schema-change confirmation.
- Final launch still needs personal provider/production proof and physical
  print checks; optional user usability review is not a routine blocker.

### Opportunities

Reuse existing identity, audit, health, account and export boundaries. Basic
monitoring and customer/account visibility can help diagnose preview problems
now; support can reuse trusted user/account context without authorizing refunds.

## Options

### Option A: Support conversation first

**Approach**: Explore the smallest complete customer/operator reply experience,
including email replies and a public contact for users unable to sign in.
**Leverages**: Existing authenticated users/accounts and operator access.
**Constraints**: Needs an email/helpdesk choice; verified finance context follows
Build 4 rather than being invented from mock purchases.
**Effort**: Medium.
**Risk**: Email setup, reply correlation and abuse safeguards become the next
external dependency; an oversized helpdesk could add avoidable scope.

### Option B: Operational visibility first

**Approach**: Explore basic health/error/PDF/AI monitoring, a minimal visit-to-
signup/export funnel and useful customer/account lookup in the backoffice.
**Leverages**: Live preview, existing health/version, accounts, audits and exports.
**Constraints**: Paid conversion and support-delivery queues follow their real
workflows; absent capabilities must not appear as working controls.
**Effort**: Medium.
**Risk**: Scope creep into generic analytics/admin tooling or excessive telemetry
cost; require explicit operating questions and bounded/redacted data.

## Open Questions

Discussion format requested by Andrew: present two or three concrete options
for each decision, explain their trade-offs and give a reasoned recommendation
before asking him to choose. Do not ask a bare open-ended operating question or
expect him to design the options. Discuss one consequential choice at a time.

- Which independent slice should we explore first: support or basic operational
  visibility? Provider selection and exact MVP boundaries follow that choice.
- For reusable customer workflows, choose API-only, hosted shared screens or
  shared workflow logic with optional product-styled components. No choice is
  accepted yet; work through this separately from the stage-order decision.
- Settle reuse boundaries after the completed-code review, including different
  account/domain-group semantics and pricing presentation. Clarify marketing,
  alert transport/digest, support response expectations and optional helper/AI
  scope when their owning delivery work begins; not every idea is MVP scope.
- Confirm Business-specific legal documents, contracting/data roles and the
  points where users receive notices or actively accept terms. Applicable
  jurisdictions, seller identity, final wording and the shared acceptance
  boundary are unresolved; the screenshot is not a universal legal checklist.

### Next focused discussion: backoffice

Monitoring/provider/bot choices can wait for their deferred slice. Keep the next
conversation focused on the human backoffice, without making Andrew settle all
remaining MVP topics together. Decisions still needed:

- **First scope:** read-only customer/account investigation with relevant
  existing project/export/AI activity, or include operator mutations immediately.
  Recommend the read-oriented workspace first; real fixes stay in validated
  Codex/operator workflows. Extra buttons need demonstrated need, authorization,
  confirmation, idempotency and audit, not speculative admin capability.
- **Access:** Andrew alone initially, or an independently identified limited
  QA/helper too; decide which data the helper actually needs, not shared admin
  credentials. Possible later AI access does not imply equal privileges.
- **Visible evidence:** minimum summary/search/detail/timeline for today's
  implemented records; separate product-owned facts from shared BFF facts and
  show stale/unknown explicitly. Billing/support add context only when real.
- **Useful human actions:** safe copy/link/navigation, perhaps reporting a QA
  finding; support replies and remediation follow their own accepted workflows.
  A new QA reporting feature is not assumed merely because QA is happening.

Offer the first scope choice with trade-offs, then discuss access and evidence.
This is a conversation guide and unaccepted recommendation, not an implementation
plan, an access grant or a fixed mandatory screen template.

## 2026-10-07 added concerns

Andrew asks to defer general/personal sales, repeat-purchase offers and marketing
promo codes outside MVP scope, preferably owned by shared BFF. They are recorded
in [Future Ideas](../../docs/architecture/future-ideas.md#shared-promotions-personal-offers-and-repeat-purchase-campaigns),
not added to Build 4 or this implementation scope.

Andrew also identifies two current concerns:

- Common account/team/support UIs would create excessive repeated UI and
  client workflow logic across Businesses; preserve each product's freedom.
- The backoffice looks bad and is not usable for him. This is reported user
  evidence, not a new independent hands-on review or an authorized redesign.

Repository grounding: the [TypeScript SDK](../../platform/bff/libs/sdk/typescript/README.md)
already owns browser account/member/invitation/transfer operations and minimal
React authentication controls. The [TableCards team page](../../projects/tablecards/workloads/web/src/pages/team-page.tsx)
still owns team presentation and loading/error/action handling. The
[backoffice dashboard](../../platform/bff/backoffice/src/dashboard.tsx)
and [app](../../platform/bff/backoffice/src/app.tsx) are largely environment-
selected entity lists with health and a bounded user lookup, rather than the
joined task-oriented customer/problem workspace required by Build 6.

### Shared customer UI: Option 1 — API/SDK only

**Approach**: Keep shared server rules and transport, with every Business
building its own screens and client interaction states.
**Leverages**: Existing SDK/account contracts.
**Constraints**: Lowest initial shared-UI investment; no common ready-made flow.
**Effort**: Low centrally, repeated effort per product.
**Risk**: Duplicated loading/error/confirmation/permission behavior and drift;
does not substantially address Andrew's concern.

### Shared customer UI: Option 2 — Hosted BFF management screens

**Approach**: Product links to shared account/team/support pages, with bounded
branding and a secure return to the originating product.
**Leverages**: Existing central auth/checkout navigation pattern.
**Constraints**: Requires a designed account/session/return-path handoff; more
limited product layout and navigation freedom. This is not an accepted iframe
or cross-site-cookie implementation.
**Effort**: Medium.
**Risk**: Context-switching UX, rigid screens and added hosted-flow complexity.

### Shared customer UI: Option 3 — Shared workflow logic plus optional views

**Approach**: Keep authorization and domain rules in BFF; put reusable client
states/actions in technology-specific SDK bindings, with optional accessible
team/account/support components. Businesses choose styling, placement and
navigation, or replace the view while reusing the same workflow.
**Leverages**: Existing runtime-neutral SDK/browser state and React bindings;
extract concrete TableCards patterns rather than inventing a universal app kit.
**Constraints**: React views are for React, not a promise of drop-in Swift/Go
UI. Add other bindings only for real technology consumers. Support components
must wait for an implemented support protocol; server rules remain authoritative.
**Effort**: Medium.
**Risk**: An overly configurable component framework or hidden state coupling;
keep a small explicit contract and test account switches, roles and failures.

Recommendation: Option 3. A product can adopt the default team panel, customize
its appearance, or draw a different screen without copying the workflow logic.
Reusable views do not share admin/customer privileges or force products to share
one design system. Build only modules that an actual current flow uses.

### Backoffice outcomes to explore

Treat this as an operator application, not merely a reskin of entity tables.
Candidate navigation is overview, customers/accounts, issues, then support and
billing when those workflows exist. Start from questions such as: who reported
the problem, which account/project/export is affected, what failed, and what can
the operator safely do next? Keep production/development distinct, make detail
links/search and mobile states usable, and avoid nonfunctional future controls.
Provisioning/configuration stays in CLI automation; sensitive actions are not
silently enabled by a dashboard redesign. Exact screens/design remain open.

### Research lenses and limits

- [React's official reuse guidance](https://react.dev/learn/reusing-logic-with-custom-hooks)
  supports sharing stateful logic while keeping different presentations. Hooks
  do not automatically share state; account/session context and concurrency
  still need explicit ownership. This is a pattern, not proof of a new SDK.
- Consulted the [Agency Agents UX Architect](https://github.com/msitarzewski/agency-agents/blob/main/design/design-ux-architect.md)
  only as an additional component-boundary, information-architecture and
  responsive-design lens. Its universal theme/layout rules are not adopted;
  repository decisions and product freedom take precedence. No agent/catalog
  was installed or spawned.

## 2026-10-07 maintainability and operating model

Andrew requests a final pre-completion MVP phase reviewing maintenance,
operations and potential shared reuse after the relevant code exists. Record it
within [Build 7](../../docs/factory/mvp-delivery-plan.md#final-maintainability-and-operating-review),
not as automatic approval for a large refactor. Compare other-product scenarios
to discover real variation before committing a universal abstraction. Review
may justify bounded extraction or local code; substantial refactoring still
needs an implementation-facing scope and any schema/migration confirmation.

### Product semantics and maintenance burden

- Preserve each product's domain model and UI freedom. Staff who share a payer
  workspace and a football/social team are different concepts; a domain team
  must not automatically become a BFF billing-account membership or inherit its
  owner/admin roles. The current [ADR](../../docs/architecture/adr/0004-business-customer-auth-and-accounts.md#accounts-and-policy)
  and [account explanation](../../docs/architecture/shared-bff-data-model.md#accounts)
  describe BFF accounts as access/workspace and commercial containers, including
  Free accounts, not just records of payment. No model is renamed/redesigned here.
- Shared components should expose only the capability they really implement
  (for example BFF account membership), leaving product teams and other domain
  groups local unless an accepted scenario demonstrates a shared contract.
- Repeated pricing pages/offer logic are a named maintenance concern. Assess
  authoritative catalog/access/checkout rules, reusable presentation state and
  optional views together so a pricing change does not require copied rules in
  every product. Products may still choose very different offers and layouts.
- Theme/style variation should not require duplicated security/workflow logic;
  it also must not force every technology to use a React component. The earlier
  shared-logic/optional-view recommendation remains provisional until the
  final code/scenario review clarifies what is genuinely reusable.

### Marketing

Marketing preparation is explicitly part of MVP completion. Detailed tactics
will be discussed later; retain the existing [TableCards learning/acquisition
gates](../../projects/tablecards/docs/product.md#assumptions-and-learning-gates)
as the baseline rather than inventing a new campaign. This is not permission for
outreach, ad spend, discount automation or a promise of customer demand.

### Phone-first operation and alerts

Andrew expects to operate mainly from his phone initially. Backoffice lookup,
triage, details and support handling must be mobile-first, while desktop remains
fully usable. This is a priority/operating-context clarification of Build 6,
not approval of exact navigation, styling or implementation yet.

An operator needs alerts that actually arrive. A single Telegram bot/chat/channel
was initially a suggested destination; Andrew selected Telegram as the first
transport later in this discussion (see the focused track below). New actionable feedback/problems and system
failures are candidate triggers, with an optional daily activity summary.
Different destinations can be added only if needed. Keep alerts redacted,
bounded, deduplicated and linked to authenticated detail. Choose urgency,
response/escalation and delivery-failure behavior rather than notifying for every
ordinary event. Configuration belongs in operator automation; protected details
and human decisions belong in the backoffice. Chat is not a permission boundary.

### Optional AI and nontechnical QA/helper

Andrew has ChatGPT Pro and is considering its autonomous bot/agent capabilities
for support, maintenance checks, reviews and monetization thinking, perhaps
connected to Telegram. He may also involve a trusted nontechnical, primarily
Russian-speaking QA/helper who would not use Codex, edit code or perform
dangerous operations; bot explanations could assist that person. No helper
identity, access or sending authority is granted by this conversation.

Preserve these in [Future Ideas](../../docs/architecture/future-ideas.md#permission-bounded-ai-operations-and-helper-assistance).
MVP inclusion is undecided; the accepted product currently defers autonomous
support. Recommendation is normal human support/alerts first, then evaluate
read-only checks and draft-only assistance before any customer-facing autonomy.
Enforce limited tools/data and revocation, not just prompt instructions. A
two-day response expectation is a candidate alternative to continuous support,
not an accepted or published SLA; clarify initial response, resolution and urgent
issues before promising it.

Official OpenAI documentation was checked for this idea, not to install a bot:
[dot availability](https://learn.chatgpt.com/docs/dots),
[assigned/recurring tasks](https://learn.chatgpt.com/docs/dots/tasks-and-memory),
[permissions/action controls](https://learn.chatgpt.com/docs/dots/controls) and
[subscription versus API pricing](https://learn.chatgpt.com/docs/pricing).
These establish possible supervised/ongoing assistance, not Andrew's specific
rollout, a ready Telegram connector, unattended uptime or customer-service
suitability. No connector, bot, schedule or API call was installed/created.

## 2026-10-07 focused backoffice and monitoring discussion

Andrew asks for a brainstorm with recommended operating scenarios rather than
requiring him to identify an existing painful task. Continue this discussion
track in the same active artifact. He selects Telegram for the initial alert
destination. This selects a transport, not a bot installation, credential
exchange, recipient permissions or authority to send messages now.

The backoffice must support **understanding as well as action**: a detected
failure may affect a user who has not complained or does not know it happened.
Andrew needs to find that user easily and understand the sequence of events.
Human operators must retain this ability even if an AI assistant later helps.
This requires linked evidence, not a generic list of tasks or entity tables.

### Repository grounding and limits

The [existing dashboard](../../platform/bff/backoffice/src/dashboard.tsx) shows
health/version, Business environments, exact user lookup and paginated users,
accounts, memberships, sessions and security events. Configuration is prominent
and the separate entity lists are not a joined problem/customer workspace.
The [operator CLI](../../tools/bff-operator/README.md) already covers validated
configuration, read-only customer state and specific lifecycle operations;
cloud/production confirmation and server validation remain authoritative.
There is no joined TableCards incident/support/payment view or Telegram delivery
proved by these code paths. Support and verified billing still belong to their
own delivery slices. This is source inspection, not a fresh browser review.

### Candidate questions and operating scenarios

These are product questions to prioritize, not an implementation task list or
approval of new operator mutations.

| Operator question / scenario                                         | Proposed information and safe next step                                                                                                                          | Placement and dependency                                                                                                              |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| What needs attention now?                                            | Open issues with severity, first/last occurrence, affected users/accounts, age, recovery and delivery status; distinguish isolated versus service-wide problems  | Phone-first backoffice overview/queue; Telegram points to the protected issue                                                         |
| An export/AI operation failed without a complaint: who was affected? | Correlation, environment/version, trusted user/account/project links if known, outcome, unit reservation/commit/release state and subsequent successful attempts | Joined issue detail and recent activity; no automatic paid regeneration or access override                                            |
| A customer reports a problem: can I find them?                       | Search by verified email or safe user/account/project/case/error reference; scoped results and a direct detail link                                              | Backoffice search; do not confuse development/production or different Businesses                                                      |
| What is this customer's current situation?                           | Membership/role, session state, current access and usage, relevant recent exports/AI activity and linked issues; payment/support context only when implemented   | Joined customer/account view; shared facts from BFF, product facts through explicit product-owned read contracts                      |
| Is the problem resolved or still happening?                          | Bounded timeline connecting failure, provider/job outcome, retries and later success; mark uncertain/stale/missing data rather than infer a diagnosis            | Backoffice evidence; read-only agent may summarize the same authorized facts                                                          |
| Should I contact or reply to someone?                                | Linked support conversation and a draft/response with delivery state when Build 5 exists; a technical alert alone is not authority to email the customer         | Human support handling in the secured workflow; autonomous sending remains unapproved                                                 |
| Can something safely be retried or repaired?                         | State, reason, eligibility and effect of a narrowly implemented idempotent retry; distinguish recovered operations from unknown external outcomes                | CLI for repeatable recovery; backoffice only for justified secured human handling; no blind replay of paid AI or financial operations |
| Are usage and service limits healthy?                                | Failed/successful export or AI trends, remaining estimated deployment AI budget, health and delivery backlog; payment truth later                                | Bounded overview/digest, not a new actual-spend ledger or generic analytics suite                                                     |

Customer investigation should expose necessary operational metadata, not
automatically open guest lists, artwork, private PDFs, credentials or complete
logs. Pre-auth/browser failures may lack a reliable user identity: retain a safe
correlation when available and explicitly show “unknown,” never guess a customer
from weak evidence. Collect only the context needed for approved diagnosis and
publish accurate processing disclosures. Do not add session replay by default.

### Experience alternatives

**Option A — improve the existing entity dashboard.**
**Approach**: Make existing lists/search responsive and clearer, leaving most
incident investigation in CLI/provider tools.
**Leverages**: Current operator reads and dashboard.
**Constraints**: Few new joined views; frequent switching between records/tools.
**Effort**: Low.
**Risk**: A tidier dashboard still fails Andrew's “see what happened” scenario.

**Option B — linked incident and customer workspace.**
**Approach**: Start from attention-needed issues and customer lookup; connect
each issue to the relevant user/account and bounded activity evidence.
**Leverages**: Existing identity/account/audit/health reads and product operation
facts; extend only actual current diagnostic gaps.
**Constraints**: Cross-service ownership and identity correlation must be clear;
billing/support appear only after their real workflows exist.
**Effort**: Medium.
**Risk**: Too many dashboard metrics or unrestricted customer data access;
prioritize explainable cases, minimal data and explicit unknowns.

**Option C — Telegram/chat-first investigation.**
**Approach**: Let an agent answer operational questions in chat; retain only a
minimal dashboard for confirmation/details.
**Leverages**: Selected Telegram transport and possible later assistant.
**Constraints**: No such agent/connector exists; phone-friendly visual evidence
and independent human operation are still required.
**Effort**: High relative to the first useful operator experience.
**Risk**: Unreliable diagnosis, broad tool permissions and personal data leakage;
would depend on unapproved AI capabilities instead of delivering human use.

Earlier recommendation: Option B, with Telegram as the entry point for alerts, not the
authoritative customer database or permission system. On a phone the alert link
should reopen the precise issue after operator authentication, show who/what/
when first and offer linked customer/activity detail. Desktop can show more
context together without requiring a different operating workflow. Exact
navigation and visual design remain open.

After the later monitoring deferral, recommend retaining the joined customer/
activity investigation benefits without requiring Telegram, automatic incidents
or a monitoring queue in the first backoffice slice. A reported QA problem and
manual customer/operation lookup can be its entry point. This keeps the earlier
reasoning without treating the entire incident workspace as approved next work.

### Human and agent parity without equal authority

Prefer small structured, permission-scoped read contracts usable by the
dashboard and, when approved, agent/CLI tools. Do not make an agent scrape the
operator UI or introduce an MCP server merely to claim AI support. The same
facts and explicitly permitted actions should use authoritative server rules;
each actor has its own identity, scope and audit, not Andrew's shared credential.
An agent/helper may receive fewer fields and actions than the primary operator.
AI assistance starts as a proposal for read-only diagnosis/summaries or drafts;
no customer replies, retries, refunds, entitlement changes or autonomous
maintenance are granted here. Human workflows must remain usable without AI.

An alert is a prompt to investigate, not proof of a root cause. Proposed routing:
immediate Telegram for outages/sustained unexpected failures, with isolated
recoverable failures visible in the queue and optionally a digest. Whether every
individual unexpected failure should notify immediately remains a later
monitoring question, not the next backoffice decision.
Expected authentication denials, plan limits and invalid input should not create
an operator alarm. Delivery failures must be visible independently of the same
Telegram destination that may be failing; exact fallback and thresholds remain
open. Never suppress a failure merely because the customer has not complained.

### Sources and lens checked for this track

- [Telegram Bot API](https://core.telegram.org/bots/api#sendmessage) supports
  sending a message to a configured chat; transport selection does not establish
  secure backoffice identity or successful delivery. No token was requested or
  installed and no bot/message was created.
- [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
  supports least privilege, deny-by-default and authorization on each request;
  the shared permission-scoped human/agent boundary is a design recommendation,
  not proof of an existing agent integration.
- Consulted the [Agency Agents UX Architect](https://github.com/msitarzewski/agency-agents/blob/main/design/design-ux-architect.md)
  for information hierarchy, responsive flows and discoverable next steps, not
  mandatory layouts/styles. No persona was installed or agent spawned.

### Technology feasibility before committing the experience

Andrew favors balanced alerts (important unrecovered problems immediately,
minor/recovered problems in a queue or summary), but asks to understand actual
technology and the implementation approach before promising the experience.
Severity, recovery detection and daily summaries are not automatic platform
features. This remains feasibility discussion, not an implementation plan.

The conceptual flow is **detect → attach trusted context → classify/group →
deliver → investigate**. Generic exception logs alone cannot establish which
customer was blocked, whether a later attempt succeeded or whether the denial
was an expected plan limit.

| Part                      | Existing leverage / proposed boundary                                                                                                                                                                     | Important constraint                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Product outcomes          | Existing [exports](../../projects/tablecards/backend/convex/exports.ts) and [AI batches](../../projects/tablecards/backend/convex/ai.ts) carry user/account context and persisted operation states/errors | Reuse these facts; shared incident/operator reads are not yet implemented; do not copy private content                |
| Technical failures        | Native Convex recent logs and Cloudflare Worker logs; browser reporting needs instrumentation                                                                                                             | Caught business failures may not be exceptions; offline/browser reports may never arrive or identify a user           |
| Grouping/recovery         | Correlation, operation IDs and outcomes can support bounded deterministic rules                                                                                                                           | Define later success, shared incidents, thresholds and unknown outcomes; do not assert automatic root-cause diagnosis |
| Telegram/summary delivery | Convex actions can call external APIs and scheduling can run delayed/periodic work                                                                                                                        | Bound retries, deduplication, rate limits and delivery evidence; side-effecting actions are not automatically retried |
| Outages                   | Existing public health/version endpoints support external probes                                                                                                                                          | A Convex job cannot reliably report a Convex outage while itself down; use independent monitoring                     |
| Customer investigation    | Existing BFF reads plus product-owned operation facts                                                                                                                                                     | BFF and TableCards have separate deployments; define scoped joins/read contracts and show unavailable/stale data      |

#### Approach A — native diagnostics and health alerts only

**Approach**: Use provider dashboards/logs, external health probes and Telegram;
leave deep individual investigation manual.
**Leverages**: Existing diagnostics and health endpoints.
**Constraints**: Does not deliver the whole linked user/incident experience.
**Effort**: Low relative to a joined workspace.
**Risk**: An isolated failure remains hard to investigate from a phone.

#### Approach B — monitoring tools plus curated product context

**Approach**: Use suitable existing error/uptime tools for technical monitoring;
build only the customer-linked operational views and alert rules we need.
**Leverages**: Eligible platform integrations and current product operation facts.
**Constraints**: Verify account tier, integration support, quotas, retention,
redaction and cost before choosing or enabling a provider.
**Effort**: Medium.
**Risk**: Fragmented or duplicate telemetry without clear ownership/correlation.

#### Approach C — build a complete monitoring pipeline ourselves

**Approach**: Own technical event capture, storage/search, grouping and alerting,
including browser reporting and reliability mechanisms.
**Leverages**: Convex actions, transactions and scheduling.
**Constraints**: More ongoing ingestion, abuse, retention and operations work;
some crash/platform coverage may still require integration.
**Effort**: High.
**Risk**: Building another monitoring product rather than the minimum MVP.

Recommendation: Approach B, with the smallest necessary product context and
explicit coverage limits. No vendor/tier purchase is approved. Before planning,
verify the supported/cost-efficient capture path for each priority scenario.
Any persistence/index/API design follows that decision and schema changes need
confirmation; do not create a universal telemetry database now.

Official sources checked 2026-10-07:

- [Convex logs](https://docs.convex.dev/dashboard/deployments/logs) offer recent
  request/function/outcome history, not a full customer activity database.
- [Log streams](https://docs.convex.dev/production/integrations/log-streams/)
  require Pro and are best-effort with possible loss/duplication;
  [native Sentry integration](https://www.convex.dev/can-do/sentry) also requires
  Pro. Andrew's current tier/integration eligibility has not been checked.
- [Actions](https://docs.convex.dev/functions/actions) support external API calls;
  [scheduling](https://docs.convex.dev/scheduling/scheduled-functions) persists
  work, but actions are not automatically retried, scheduled auth is not inherited
  and completed scheduler results last seven days. Retried external effects and
  longer operator timelines need explicit design.
- [Cloudflare Worker logs](https://developers.cloudflare.com/workers/observability/logs/)
  cover Worker diagnostics, not every independent Convex/browser problem.
  Current logging settings, entitlement and cost are unverified.

No instrumentation, monitoring provider, paid tier, component, schema, bot or
deployment was changed. Independent health probes and delivery tests are
prospective verification, not completed evidence.

### Telemetry storage and cost boundary

Andrew is concerned that routing every product's metrics/logs into BFF Convex
would add ingestion, database, retention and maintenance cost. Do not interpret
the shared backoffice requirement as a requirement to centralize raw telemetry.
Costs depend on event volume, selected provider/tier, sampling and retention;
no cost comparison or load benchmark has yet established the cheapest option.

- **Option 1 — external technical telemetry with linked operational views.**
  Error/log/metric data stays in the chosen monitoring system. Backoffice reads
  existing BFF customer/access facts and product-owned operation state and links
  to relevant protected diagnostics. Lower duplication and simplest boundary;
  some deep debugging may open the provider interface. **Recommended MVP start.**
- **Option 2 — external telemetry plus bounded incident summaries.** Keep the
  same external raw data, but retain minimal issue references/status when a
  genuinely implemented operator workflow needs them. A more joined experience,
  but extra ingestion, reconciliation, retention and storage work; evaluate only
  actual callers rather than create a generic event or metrics warehouse.

Routine BFF account/payment/unit/audit records and existing TableCards export/AI
records remain authoritative because they implement product operations, not
because every request needs a new metric row. Do not move their source of truth
into a best-effort logging system or duplicate their private contents there.
Do not require a `product → BFF write → telemetry provider` hop for every click,
request or technical log. A provider alert or narrowly scoped notification relay
can reach Telegram without storing all its inputs in BFF; exact delivery/uptime
mechanisms and fees still need verification. Apply budgets, sampling/redaction
and retention at telemetry ingestion, and keep identifiers scoped/opaque where
possible. “External” is not automatically cheaper or unrestricted/free.

This is a recorded concern and recommended ownership boundary, not approval
to install a provider, remove existing records or add an incident table.

### Use the monitoring tool directly rather than mirror it

Andrew questions whether technical monitoring needs to appear in backoffice at
all: if an external tool already works, use that tool. Narrow the recommendation
accordingly. Monitoring can own technical errors/logs/performance, outage
investigation and alert configuration in its own interface. Backoffice owns
customer/account lookup and authoritative access/usage, support and implemented
commercial context. No embedded monitoring UI, copied charts or shared incident
store is a prerequisite for the MVP.

- **Option 1 — separate tools with usable references.** Telegram opens the
  appropriate external issue; it includes minimal environment/version and safe
  customer/operation references when known. An authorized operator can use that
  reference in backoffice lookup; a protected direct link is optional convenience,
  not a reason to reproduce the provider interface. Least duplication;
  occasional tool-switching. **Recommended starting boundary.**
- **Option 2 — a thin backoffice summary later.** Add only a useful health/issue
  count or protected link if actual operation shows the need. Slightly more
  integration/failure handling; do not introduce it just for visual completeness.

The requirement remains that Andrew can find the affected customer and understand
the relevant facts from a phone, including before a complaint. It does not mean
all investigation must be on one screen or in one application. Each linked
destination still enforces its own identity/scope; monitor access and backoffice
access are separate, and arbitrary chat content cannot assert a trusted user.
Evaluate the monitoring provider's phone usability and bounded agent/API access
if those become requirements; do not assume it already provides them.

This is a proposed simplification of the Build 6 dashboard boundary, not yet a
wholesale acceptance of monitoring scope or removal of canonical support/billing
queues. Reconcile the accepted delivery/product requirements when that scope is
settled. Technical incident investigation may stay external; product operations
still need their own real workflow and any essential state/recovery evidence.

### Monitoring provider shortlist and growth costs

Andrew wants broad monitoring capabilities with low initial cost and reasonable
growth pricing, rather than selecting a cheap single-purpose tool and later
needing many subscriptions. Compare ingestion, retention, users, integration
maintenance and alert delivery together. User counts alone do not predict cost.
The following is official-source desk research on 2026-10-07, not a completed
integration, phone usability test or vendor selection.

| Candidate     | Starting allowance / pricing                                                                                                                                              | Fit and trade-offs                                                                                                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grafana Cloud | Free: 50 GB logs/month, 50 GB traces/month and 10k active metric series, with 14-day retention. Pro starts at $19/month plus metered usage.                               | Broad observability, external synthetic checks and documented Telegram contact points. Strong free starting candidate; more configuration and several independent billing meters.                                                                                                      |
| Better Stack  | Free offer lists 3 GB logs and 3 GB traces, retained three days, plus metrics, errors and ten monitors. Logs/traces list $0.10/GB ingestion and $0.05/GB/month retention. | Broad integrated operational tooling with volume-based telemetry pricing. The free offer says personal projects: commercial eligibility must be checked. Paid responder licenses are separate from telemetry, not an all-inclusive $29 package.                                        |
| PostHog       | Free allowances include 1M analytics events, 100k exceptions and 10 GB ingested logs/month; logs default to 14-day retention.                                             | Strong analytics/errors/logs candidate and a named Convex integration. Those capabilities do not establish complete infrastructure metrics, general distributed tracing or independent uptime coverage. Do not call it a complete monitoring replacement without checking those needs. |

Sources: [Grafana pricing](https://grafana.com/pricing/),
[Better Stack pricing](https://betterstack.com/pricing?isVariant=b) and
[PostHog pricing](https://posthog.com/pricing). Prices are USD; these are different
meters/allowances, not equivalent bundles or total-stack invoices.

Andrew asks whether Grafana is only visualization and needs separate storage.
Distinguish standalone Grafana's dashboard/query interface from the proposed
**Grafana Cloud managed package**, which includes telemetry ingestion and storage:
[logs powered by Loki](https://grafana.com/products/cloud/logs/),
[traces powered by Tempo](https://grafana.com/products/cloud/traces/) and a
[managed metrics service](https://grafana.com/products/cloud/metrics/).
We would not need to run those storage backends ourselves for Cloud ingestion.
Storage remains subject to the selected retention and usage limits, not a
permanent archive. Collection/format adaptation from our actual services still
needs validation; included storage does not make every source automatically
connected. Customer/payment/product records remain in their own databases.

Growth cautions from the official documentation:

- Grafana meters products separately. Logs distinguish processing, writing,
  extra retention and queries beyond fair use; metrics also depend on reporting
  frequency. Frontend sessions, synthetics and active users have separate
  meters. Do not describe $19 as unlimited monitoring or promise a permanent
  cheap bill. See [billing dimensions](https://grafana.com/docs/grafana-cloud/platform/pricing-and-usage/),
  [log billing](https://grafana.com/docs/grafana-cloud/platform/pricing-and-usage/logs/)
  and [metric calculation](https://grafana.com/docs/learning-paths/billing-usage/learn-cost-calculations/).
- Better Stack's telemetry bill combines ingestion and retained data; responder
  seats, extra monitors and optional products must be evaluated separately.
  [Metrics billing](https://betterstack.com/docs/logs/billing-for-metrics/)
  differs by data region. Do not compare GB retained with active time series as
  though they were the same unit.
- Capture caps protect spending but can also create blind spots. PostHog's
  pricing FAQ explicitly describes dropping capture at a billing limit. Observe
  ingestion health and preserve independent availability checks, not just spend.

**Provisional recommendation:** evaluate Grafana Cloud Free first for the
requested broad package and direct [Telegram alerts](https://grafana.com/docs/grafana-cloud/observe-and-act/alert-and-measure-reliability/alerting/configure-notifications/manage-contact-points/integrations/configure-telegram/),
with Better Stack as the alternative if the operator experience and total
growth cost prove better. This is an inference from coverage/pricing, not a
demonstrated winner on our app. No self-hosted observability cluster is proposed:
avoiding license fees would not remove maintenance/uptime work.

Convex's [log stream contract](https://docs.convex.dev/production/integrations/log-streams)
names Axiom, Datadog and PostHog, plus a signed custom webhook. Grafana and Better
Stack are not listed native destinations; a secure format adapter may be needed,
with its own hosting/egress, retries and maintenance. Log streaming does not
automatically produce end-to-end traces or identify every caught operation
failure. Validate the actual browser, Worker and Convex signals we need before
promising complete coverage. Keep technical data outside BFF's database and
preserve authoritative operation/customer records as described above.

Remaining evaluation: phone alert-to-issue navigation; permission-scoped human
and agent reads; private-data redaction and data location; observed low/medium/
high ingest volumes including development; actual plan eligibility; capture and
alert delivery limits. Better Stack documents [MCP versus AI SRE access](https://betterstack.com/docs/ai-sre/mcp-server-comparison/),
but that is not permission to connect it or grant an agent write tools. Only
read-oriented bounded access is contemplated here.

#### Convex Pro willingness and actual price

Andrew says he is comfortable with Convex Pro and asks whether it is $25 per
developer. [Current pricing](https://www.convex.dev/pricing) confirms Professional
at **$25 per developer/month**, with included resource allowances and metered
overages; log streaming and exception reporting are included features.
The [pricing FAQ](https://www.convex.dev/pricing/faq) says resource usage aggregates
across projects in the same Convex team. For one developer seat, the base is $25
monthly, not $25 for every product's customers; it is not unlimited backend use
or the monitoring provider's fee. Region-specific resource terms still apply.

Record willingness to include that base cost in the comparison, not a purchased
upgrade or evidence of the current account tier. No billing setting was changed.
With Pro considered acceptable, native streaming is a viable option to evaluate
rather than a blocker; custom-destination integration costs still matter.

## 2026-10-07 legal documents and user agreement

Andrew adds a concern about documents each Business needs and where its users
must agree. The supplied screenshot lists terms, privacy, DPA, refund policy,
MSA and cyber liability insurance as six prerequisites to the first paying user.
Treat this as a prompt to assess applicability, not evidence that all six are
mandatory for every Business or six checkboxes that every customer must tick.
Legal requirements depend on seller/buyer jurisdictions, customer type, data
roles and contracts. This is researched product direction, not legal clearance
or final legal drafting. An Israeli seller with international customers needs
the relevant Israeli and target-market requirements assessed before paid launch.

### Existing boundary

TableCards has preview [terms/privacy/contact pages](../../projects/tablecards/workloads/web/src/pages/policy-page.tsx),
linked in its [public shell](../../projects/tablecards/workloads/web/src/layouts/public-shell.tsx).
They honestly describe no-charge checkout and actual files/data/AI behavior,
and explicitly defer verified seller details and commercial cancellation/refund
arrangements. Inspected [shared login](../../platform/bff/customer-auth/src/app.tsx),
[mock checkout](../../platform/bff/customer-auth/src/checkout.tsx) and public
SDK/contracts do not establish a versioned product-terms acceptance workflow.
Google authentication proves identity; it does not prove agreement to a
Business's terms. No new runtime tests or compliance certification were done.

### Applicability and proposed customer surfaces

| Item                                    | Proposed treatment                                                                                                                                         | Where it belongs                                                                                                                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Terms of service                        | Baseline product contract; identify the legal operator and actual service, content/AI rights, limitations and support commitments                          | Public link; active product-terms acceptance at first Business onboarding/use, including invited users, with an appropriately designed anonymous-use boundary                        |
| Privacy notice                          | Explain actual data purposes, recipients, retention, rights/contact and shared versus product processing; notice is distinct from consent                  | Public link and notice at collection/upload points, including before optional AI reference transfer; obtain specific consent where applicable rather than blanket privacy acceptance |
| Cancellation/refund/subscription policy | Reconcile provider rules and mandatory buyer rights; disclose recurring price, interval, renewal/cancellation and digital-delivery conditions              | Accessible policy plus relevant details before purchase in the shared/provider checkout; a footer alone is not the whole purchase disclosure                                         |
| Data Processing Agreement (DPA)         | Assess when processing customer-controlled personal data requires a controller–processor contract; uploaded guest lists are a relevant TableCards scenario | Contract with the authorized customer representative where applicable, not a DPA checkbox for every guest or ordinary member; assess vendor/subprocessor arrangements too            |
| Master Services Agreement (MSA)         | Evaluate negotiated business/enterprise needs; do not assume an additional standalone MSA is required for every self-serve buyer                           | Separate commercial contracting if needed, not ordinary login                                                                                                                        |
| Cyber liability insurance               | Risk/contract/insurer decision, distinct from public product documents                                                                                     | Operator/business administration; customers do not accept our insurance policy                                                                                                       |

These are recommendations, not accepted UI, legal wording or authority to buy
insurance/sign contracts. A DPA may become a real requirement, not merely an
enterprise extra, when the applicable data-processing role/law requires it.
Nonessential tracking and marketing permissions, if introduced, need their own
applicability/consent/withdrawal design and must not be bundled into required
login or terms. Do not add a cookie banner just because the screenshot exists.

### Ownership alternatives

**Option A — independent implementation per Business.**
**Approach**: Each product owns its documents and agreement workflow.
**Leverages**: Existing local TableCards policy pages.
**Constraints**: Easy local fit but repeats collection/version/update logic.
**Effort**: Low initially, repeated effort later.
**Risk**: Drift, missing evidence and inconsistent shared checkout disclosures.

**Option B — one universal BFF policy and mandatory hosted flow.**
**Approach**: All products use the same documents and agreement screen.
**Leverages**: Shared login and checkout.
**Constraints**: Different operators, data practices and product terms may not fit.
**Effort**: Medium.
**Risk**: Misleading consent/coverage and loss of product freedom.

**Option C — reusable mechanism, Business-specific scope and content.**
**Approach**: Reuse document identifiers/versions, publication links and minimal
agreement evidence; each Business defines applicable documents and placement.
**Leverages**: Shared identity/checkout and local product policy surfaces.
**Constraints**: Distinguish individual terms, authorized account contracts,
purchase confirmation and optional consents; legal identity is not necessarily
one Business ID. Exact persistence/API design remains open.
**Effort**: Medium.
**Risk**: Overbuilding a generic legal platform; prefer the first real caller
and evaluate existing audit facilities before proposing schema changes.

Recommendation: Option C. Keep Business-specific policy source/explanations
beside its code, linking shared BFF/service disclosures instead of duplicating
them. Version shared and product portions explicitly; shared authentication must
not silently count as acceptance for a different product. The public pages must
remain accessible without sign-in and usable on phone/desktop. Actual secrets,
identity/payment verification files and private signed agreements do not belong
in Git.

Before launch, specify who accepts which document/version, for which Business
and account if applicable, at what point, and what a refusal or relevant update
means. Preserve minimally necessary server-verified evidence and referenced
document versions without storing unnecessary browser/PII details. Do not
re-prompt on every login or assume every text edit legally requires reacceptance;
material changes need an assessed notification/reacceptance rule. Proposed
checks include first/returning/invited users, anonymous upload, purchases,
decline, changed versions and cross-Business separation. No tables are created
or approved here.

Operational placement: approved document publication/configuration and version
changes belong in validated operator automation; users receive notices and
provide any applicable agreement in product/shared checkout UI; the secured
backoffice exposes bounded evidence and data-rights/support cases. It must not
offer a control to fabricate acceptance on behalf of a user. Final legal wording,
seller facts and contractual/insurance commitments require the relevant legal
and owner decisions, not an agent's unsupported compliance verdict.

### Primary sources checked 2026-10-07

- [Paddle domain review](https://www.paddle.com/help/start/account-verification/what-is-domain-verification)
  requires accessible terms, privacy and refund policies and operator/company
  identification; checkout-provider coverage does not replace product policies.
- [Paddle Buyer Terms](https://www.paddle.com/legal/buyer-terms) distinguish the
  provider transaction from the supplier product agreement and refer to
  cancellation/refund and territory-specific terms. Verify the eventual offer
  and digital-delivery flow; do not promise blanket nonrefundable PDFs.
- [EDPB controller/processor guidance](https://www.edpb.europa.eu/sme/learn-the-basics/data-controller-or-data-processor_en)
  explains the conditional binding processing contract and subprocessor
  responsibilities when GDPR applies, not a universal six-document rule.
- [EDPB legal bases](https://www.edpb.europa.eu/topics/key-gdpr-concepts/legal-basis_en)
  distinguishes consent from other processing bases; a privacy notice is not
  permission for every purpose.
- [Israeli Privacy Protection Authority assessment tool](https://mojforms.justice.gov.il/mojaemprivacyprotectionauthority/dpiaform.html)
  appears in official search results with notification duties when requesting
  personal information and informed/free consent concerns. Direct page retrieval
  timed out; its linked current notification PDF also appeared in search but
  direct retrieval returned 403. No full-page/PDF audit is claimed.

## Current Direction

Historical discussion summary at closure, not a live planning surface. Accepted
build scope and sequencing belong to the linked canonical MVP roadmap; the
recommendations and open questions below are not all approved work.

### Later monitoring: AI-first investigation with bounded evidence

Andrew clarifies the desired operating model: reduce his routine investigation
work by letting a bot examine what happened, not merely send him raw alerts.
The bot needs easy access to relevant facts, but not a large dump of customer
data or logs. This changes the earlier human-first internal-triage recommendation;
it does not authorize autonomous customer support, repairs or an immediate
monitoring implementation. Monitoring remains deferred within the MVP.

#### Option A — incident-triggered investigation

**Approach**: A deterministic monitoring rule groups an actionable problem and
starts one bounded AI investigation of that incident.
**Leverages**: The proposed external monitoring alerts and existing operation/
customer facts; use correlation references, not a new BFF telemetry store.
**Constraints**: Requires actual alert capture and trusted triggering; currently
not configured. An incident without a signal may remain undiscovered.
**Effort**: Medium.
**Risk**: Alert storms become model/query spend unless deduplicated and capped.

#### Option B — periodic investigation only

**Approach**: A scheduled bot reviews a bounded summary of new/stuck issues and
changes since its last completed review.
**Leverages**: Provider summaries and existing authoritative operation state.
**Constraints**: Schedule, host availability, scope and durable progress still
need design; not a promise that this Codex conversation stays awake.
**Effort**: Medium.
**Risk**: Delayed urgent detection or repeated expensive full-history scans.

#### Option C — event-driven triage plus a periodic sweep

**Approach**: Investigate meaningful grouped incidents when triggered; use a
small periodic sweep to catch unresolved/stuck items and summarize trends.
**Leverages**: The same scoped read boundary for incident and scheduled callers.
**Constraints**: Exact cadence, data availability, model/runtime, spending
limits and MVP implementation scope remain to be accepted.
**Effort**: Medium, higher than either trigger alone.
**Risk**: Duplicate work, false diagnoses and retry loops; require incident
correlation, bounded runs and explicit uncertainty.

**Recommendation:** Option C, starting read-only. A daily sweep is a candidate,
not an accepted schedule. Deterministic health/operation rules detect failure;
AI explains and correlates evidence. For the later customer-launch operating
boundary, confirmed high-impact alerts should still reach Andrew if AI times
out, is unavailable or exhausts its budget. Do not rely on a model as the only
outage detector. This prospective recommendation is not a current critical-
alert workflow or a claim that such customer incidents already exist.

**Current-stage clarification, 2026-10-07:** Andrew reports there are no real
customers yet and questions prioritizing critical alerts for the preview. Keep
the immediate work on product/backoffice usability and reported QA findings,
not an on-call system, escalation taxonomy or infrastructure-monitoring build.
Existing privacy/auth/cost safeguards still apply; lack of paying customers is
not permission to weaken them. AI investigation remains a later direction.

The managed/serverless stack removes our need to administer provider servers,
but does not mean externally visible failures are impossible to observe.
[Independent endpoint/journey checks](https://grafana.com/docs/grafana-cloud/observe-and-act/testing/synthetic-monitoring/introduction/)
can observe availability without access to provider internals; they do not prove
the underlying cause or give us the power to repair a provider outage. Later
monitoring should focus on user-visible outcomes and provider diagnostics,
not reproduce a server-administration platform. No probes are enabled by this
clarification, and provider guarantees are not a claim of perfect availability.

Recommend an on-demand **incident evidence packet**, not unrestricted database
access or a new table: product/environment/release, problem and observation
time, safe operation/account references when known, current outcome/recovery,
grouped occurrence/impact counts and a small redacted evidence sample with links.
The bot may retrieve a bounded related time window or exact operation through
authorized reads, with result-size/query/token/time budgets and a stopping rule.
Unknown identity/outcome, stale data and unsupported hypotheses remain explicit.
No default guest lists, uploaded artwork, private PDFs, credentials or full
customer conversations. Avoid high-cardinality metrics per individual user.

The result should be a short human-readable explanation: observed impact,
whether recovery is confirmed, likely causes versus facts, evidence references,
recommended next step and whether Andrew's attention is actually needed.
Enforce data/tool permissions outside the prompt. Treat logs, support messages
and other retrieved content as untrusted evidence, never new tool instructions;
see [OWASP agent/least-privilege guidance](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html#agent-specific-defenses).
No deploy, payment/refund, access change, customer reply or costly operation
replay is authorized by an AI diagnosis. Human-accessible investigation remains
available independently; helper access is separately scoped.

This is recorded desired direction and proposed trigger/data design, not a
selected bot product, bought plan, job schedule, API/schema implementation or
waiver of normal safety/launch verification.

### Delivery priority

**Sequencing revision, 2026-10-07:** Andrew first deferred Pro-dependent
monitoring, then clarified that all new monitoring/alert setup is lower priority
for now, including the proposed lightweight health checks. It remains required
before MVP customer launch. Do not interpret the earlier Option B recommendation
as an accepted decision to implement or buy telemetry next.

For informal QA, his mother may report a problem to Andrew, who brings it to
Codex. On-demand investigation using available provider diagnostics, existing
operation/customer records and reproductions or deterministic test simulations
is sufficient for this interim preview stage. Do not promise continuous
detection, access to expired/uncaptured logs or automatic reproduction of every
reported problem; a simulation is not evidence that the exact production
incident occurred or is fixed. No diagnostic checks were executed for a reported
incident during this prioritization discussion.

The more useful next discussion is a focused phone-first backoffice slice for
human investigation and potential nontechnical QA use. Recommend a safe,
read-oriented helper experience if needed; actual fields, private-data scope,
roles, Russian-language needs and any ability to report a finding remain open.
Do not grant helper access, expose private customer content by default or build
an AI/Telegram intermediary just because family QA is contemplated. This is a
priority preference, not approval of a full redesign, implementation plan or
new authorization schema. Support and analytics retain their launch outcomes
and independent delivery decisions.

Andrew also allows splitting broad build groups into smaller deliveries to make
the design discussion manageable. Recommend independent backoffice, analytics
and monitoring slices rather than one bundled Build 6 brainstorm/implementation.
Keep existing build references stable with named sub-builds where useful; do not
renumber completed work merely to make the list consecutive. Each real slice
gets a focused brainstorm when discussed, with links to this umbrella and the
canonical delivery plan; do not pre-create empty documents or start a new copy
for every continuation. Preserve this discussion's reasoning and reference the
focused successors as they exist. Exact labels, other slice ordering and all
provider/implementation decisions remain open.

The distinction is native Convex log streaming requires Pro; Grafana Cloud's
free managed storage or independent endpoint checks do not themselves require
upgrading Convex. Deferral is a sequencing/cost decision, not a claim that all
monitoring is impossible without Pro. This revision is reflected in the
[delivery rules and Build 6](../../docs/factory/mvp-delivery-plan.md#build-6--analytics-monitoring-and-usable-backoffice).

Also recommend shared client workflows with optional product-styled components
and a task-oriented backoffice. These remain discussion proposals, not accepted
architecture, a schema change or implementation authorization.
Andrew has now required a final maintenance/reuse/operations review, marketing
preparation and phone-first operator journeys. Shared abstractions remain
provisional until evaluated against the finished code and variant product
scenarios. Telegram is now selected for the first alert channel, not configured;
linked issue/customer investigation is the recommended backoffice approach.
Balanced alert routing is favored subject to the requested feasibility check;
monitoring tools plus curated product context are recommended, not a selected
provider or approved implementation. Keep technical telemetry external rather
than assume a BFF log/metrics warehouse; start with linked operational views,
consider minimal incident state only for an actual workflow. After Andrew's
further correction, recommend using the external monitoring interface directly,
with backoffice customer lookup and usable references; do not require a mirrored
monitoring screen. Exact Build 6 narrowing remains to be settled. Official-source
provider research now favors evaluating Grafana Cloud Free first, with Better
Stack as a broad alternative and PostHog considered for analytics/errors/logs.
Andrew is comfortable considering Convex Pro's $25/developer/month base; no
upgrade, provider choice or integration is approved by that willingness alone.
AI/helper access and a two-day
response target remain open, not launch promises or implementation permission.
Add document-applicability and agreement-point review to commercial launch
preparation. Andrew has accepted recording this work in the delivery plan, with
checkout requirements in Build 4 and the final review in Build 7, and explicitly
does not want implementation or its onboarding questions now. Shared
version/evidence machinery with Business-specific policies is recommended, not
yet an accepted contract, UI or schema design. This does not accept the whole
brainstorm or start an implementation plan.

## Decision Log

| Date       | Decision                                                                                | Context                                                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-07 | Andrew requests a small remaining-MVP brainstorm; Paddle is unavailable                 | Keep existing paid-billing requirements; discuss non-billing work without starting implementation                                                  |
| 2026-10-07 | Defer shared promotions/personal offers/promo codes outside MVP                         | Preserve the idea in Future Ideas; BFF ownership is a preferred direction for later evaluation                                                     |
| 2026-10-07 | Record duplicate customer UI concern and unusable backoffice                            | Preserve product design freedom; compare reuse options and operator outcomes before implementation                                                 |
| 2026-10-07 | Add final maintenance/reuse/operations review within MVP completion                     | Review actual code and other-product scenarios; do not pre-authorize a large shared refactor                                                       |
| 2026-10-07 | Marketing preparation and phone-first backoffice are required                           | Discuss tactics later; mobile is Andrew's initial primary operating tool and desktop must still work                                               |
| 2026-10-07 | Record single Telegram alert destination and optional daily summaries                   | Alert delivery is required; transport and notification policy remain open                                                                          |
| 2026-10-07 | Preserve optional Pro assistant and Russian-friendly read-only QA/helper ideas          | No dangerous operations, access grant, bot setup or accepted support SLA; evaluate MVP need later                                                  |
| 2026-10-07 | Record legal-document applicability and user agreement concern                          | Research the screenshot's six items; distinguish terms, notices, processing contracts and insurance; shared mechanism remains proposed             |
| 2026-10-07 | Schedule legal-document/agreement work, with no implementation now                      | Build 4 handles real-checkout requirements, Build 7 final review; notices precede relevant data collection; exact wording/design remain open       |
| 2026-10-07 | Select Telegram as the first alert transport                                            | No token/setup/message permission implied; alert contents, urgency, digest and fallback remain open                                                |
| 2026-10-07 | Require backoffice investigation as well as actions                                     | Automatically detected problems must link to known affected users and relevant evidence; retain independent human use even if an agent helps       |
| 2026-10-07 | Give options, trade-offs and a recommendation with every discussion question            | Andrew wants informed choices, not bare open-ended questions; keep one consequential decision at a time                                            |
| 2026-10-07 | Ground monitoring promises in technical feasibility before implementation               | Balanced alerts are favored; verify capture, customer correlation, outage detection, delivery retries, tiers and cost before planning              |
| 2026-10-07 | Record cost/maintenance concern about centralizing product logs/metrics in BFF          | Recommend external telemetry and linked operational context, not per-event BFF writes; bounded incident state remains optional and unapproved      |
| 2026-10-07 | Simplify proposed monitoring presentation to the external tool itself                   | Keep customer/account/support workflows in backoffice with safe references; a mirrored monitoring dashboard is not the default                     |
| 2026-10-07 | Compare broad monitoring starter and growth costs; Convex Pro is acceptable to consider | Official pricing confirms $25/developer/month plus overages; shortlist remains provisional and no account billing or provider setup changes        |
| 2026-10-07 | Defer Pro-dependent monitoring integration to later MVP work                            | Keep launch monitoring requirements; no immediate upgrade or implementation, and independent lower-cost work may be considered earlier             |
| 2026-10-07 | Permit smaller builds and focused brainstorms instead of fixed broad delivery batches   | Preserve completed identifiers, required outcomes and dependencies; split independent topics when discussed, without placeholder docs or new scope |
| 2026-10-07 | Defer all new monitoring/alert setup; use on-demand diagnosis for interim family QA     | Andrew reports findings to Codex; usable backoffice is the more relevant next discussion, while monitoring remains required before MVP launch      |
| 2026-10-07 | Aim for AI-first monitoring investigation with small scoped evidence                    | Reduce Andrew's manual log searching; hybrid triggers and read-only triage are recommended, not accepted schedules or granted action permissions   |

## Notes

- Operational placement: repeatable provider/event/alert configuration and
  recovery belong in validated operator automation; customer support initiation
  and replies belong in product UI; safe search, joined state, queues and human
  case handling belong in a secured operator workflow/backoffice. Sensitive
  refunds, entitlement overrides and ad-hoc data editing are not added here.
- Build 7 is final launch preparation, not repeating the already completed
  Build 3 production provisioning. It includes honest commercial/privacy/support
  disclosures, provider/live acceptance, print validation, recovery and pilot
  acquisition. Preparatory research/outreach is possible without paid billing;
  paid-buyer validation must wait for real billing.
- Consulted the relevant [future monitoring/edge entry](../../docs/architecture/future-ideas.md#custom-domain-edge-protection-and-security-monitoring):
  stronger WAF/origin-bypass work remains deferred, not part of basic Build 6.
  The [per-user provider-cost ledger](../../docs/architecture/future-ideas.md#per-user-and-per-account-provider-cost-attribution)
  likewise remains a future idea; existing estimated AI caps are not that ledger.
- Official-source monitoring desk comparison is recorded above; integration,
  phone usability and actual volume/cost evidence are still prospective. No
  implementation, schema edits, provider setup, purchase, commit or deployment
  performed during this scope conversation.
