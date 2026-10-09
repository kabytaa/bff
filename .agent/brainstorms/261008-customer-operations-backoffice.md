# Brainstorm: Customer operations and a usable backoffice

> **Status:** Accepted — presented design/schema approved 2026-10-09; ready for planning, not implemented
> **Created:** 2026-10-08
> **Last updated:** 2026-10-09
> **Repository baseline:** 872a96f84551eb81f682c554feb7af58cf9ded52
> **Scope-update baseline:** 7e0433c624eb945f35f5841a3488cd1211ab78a3 (2026-10-09)

## Reading this record

This is the accepted **Operator work** direction, not a second roadmap.
Each topic holds its current decisions, outstanding details and relevant dated
alternatives once. **Accepted** means Andrew agreed to that particular direction;
**proposed** means a recommendation, not authorization. Delegated UX defaults
may evolve within accepted scope. Historical alternatives do not reopen decisions.
The dated research records what was checked then, not guaranteed current prices,
account access, installed capabilities or legal clearance.

The 2026-10-09 consolidation removes duplicate descriptions and stale open
questions while retaining distinct constraints, alternatives, sources and decision
changes. The immutable artifact date and historical baselines remain unchanged.

## Scope and repository snapshot

Operate customer-facing Businesses from a phone or desktop: understand the
business, investigate customers even before they complain, handle questions,
problems and feedback, and see what needs human attention without reconstructing
a story from separate lists. TableCards is the concrete example, not a universal
product-domain template.

- The [single roadmap](../../docs/factory/mvp-delivery-plan.md#build-5--operator-work)
  owns build outcomes and launch acceptance. Builds 1–3 were released at their
  authorized boundaries; TableCards is a **no-charge preview**, not real billing
  or customer launch. Payments is on hold for Paddle, not completed or removed.
- Operator work combines customer support, nontechnical Business/customer
  visibility, meaningful events, a usable backoffice, helper/support runtime and
  useful operating/evaluation skills. This combines the former Build 5 support
  and Business-visibility portion of Build 6.
- **Monitoring** separately owns technical logs, metrics, traces, uptime,
  infrastructure alerts and technical incident investigation: later MVP, required
  before launch. Customer email-delivery exceptions still belong in Operator work.
- **Marketing, Legal, Maintenance and Launch** are separate roadmap outcomes.
  The accepted short names identify scope; numbers are references, not mandatory
  execution order. Maintenance's code/reuse review is not a maintenance-bot system.
  Substantial independent additions need explicit build/sub-build outcomes and
  acceptance in this one roadmap, rather than disappearing in an existing group;
  small cohesive refinements need not each become a build.
- Company-wide Paperclip/Dots managers, analysts, security/legal advisers, sales,
  monetization, marketing, NOC, developer and QA organization are
  [post-MVP future ideas](../../docs/architecture/future-ideas.md#post-mvp-ai-company-organization),
  not this runtime's required bots. The [earlier priorities brainstorm](261007-remaining-mvp-priorities.md)
  remains inactive history, not a competing plan. The unrelated VPN follow-up
  stays in STATUS.

**Dated repository evidence (2026-10-08/09):** the shared backoffice
[App](../../platform/bff/backoffice/src/app.tsx) selects an environment, provides
exact customer lookup and paginated users/accounts/memberships/sessions/security
lists; [Dashboard](../../platform/bff/backoffice/src/dashboard.tsx) mostly shows
separate lists, not a joined case journey. Loaded-page counts are **not totals**.
The [shared data model](../../docs/architecture/shared-bff-data-model.md) already
has profiles, accounts, memberships/invitations, sessions, access/units, checkout
attempts and security/ownership evidence. Its narrow authentication/ownership
security-event enum is not a generic Business-activity store.

Tickets, Business-event ingestion, shared text bots, operator queue skills and
survey are not implemented. Root dependencies include Convex 1.46.0 and the
registered rate limiter; inspected manifests/components contain no Convex Agent,
AI SDK, OpenAI Agents SDK or Resend integration. The existing
[TableCards image adapter](../../projects/tablecards/ai-provider/README.md)
calls a fixed Workers AI image model from Convex; it is not text-chat/session/
queue infrastructure. These are baseline findings, not fresh deployment evidence.

## Current direction

Andrew confirmed the operating boundary by readback on 2026-10-09; later topic
revisions below refine it. This index points to the full details rather than
repeating them.

| Accepted direction | Detailed home |
| --- | --- |
| One shared backoffice; Business/environment-scoped investigation and all-Business summaries, without merged customer profiles | [Visibility](#business-scope-and-visibility) |
| Full access for admitted operators, no new granular roles; bots receive separate capabilities | [Visibility](#business-scope-and-visibility), [bot boundaries](#bot-definitions-skills-and-data-boundaries) |
| BFF-owned cases/transcripts; signed-in form, signed-out email link, email follow-up, no customer conversation portal | [Cases and contact](#cases-contact-and-email-trust) |
| Automatic initial branded receipt and permitted scoped read-only support tools/skill loading; every substantive support reply is a suggestion requiring operator approval to send; helper ordinary answers remain automatic | [Cases](#cases-contact-and-email-trust), [approvals](#support-authority-and-approval-continuation) |
| Open / Waiting for customer / Resolved; explicit resolution, automatic return to Open on customer replies | [Lifecycle](#ticket-lifecycle-and-history) |
| Shared queue without owners or priority labels; attributed internal notes/actions; structured requests and explicit bounded-group approvals | [Lifecycle](#ticket-lifecycle-and-history), [operator workflow](#conversational-operator-workflow) |
| At least one configured support bot; zero or more optional helpers, assigned skills loaded on demand, registered page tools | [Bot definitions](#bot-definitions-skills-and-data-boundaries), [tools](#programmatic-context-and-registered-tools) |
| TableCards site-wide Q&A helper; clickable navigation, validated sign-in/current-account plan context, helper-first help and reachable escalation | [Helper](#tablecards-helper-and-contact-handoff) |
| Shared bot evidence separates observed outcomes, explicit feedback and inferred labels; short outcome survey and contextual review | [Measurement](#shared-bot-measurement), [survey](#customer-feedback-survey) |
| Distinct contact addresses per Business; development should not consume a custom-domain slot merely for testing | [Email research](#shared-email-research--recommendation-not-selected-2026-10-09) |
| Cheap live models only, no Sol/expensive fallback or customer model selector; realistic evaluations later, not now | [AI choices](#ai-runtime-and-model-choices), [evaluation](#evaluation-and-improvement-workflow) |
| Provider-side live-text safety caps only; native daily/delayed alerts acceptable, no spending table/dashboard or custom budget alerts; cost attribution deferred | [Spending limits](#quality-gates-and-spending-limits), [provider alerts](#budget-alerts-and-mock-delivery) |
| Shared AI SDK model/tool foundation with existing Convex storage/jobs; AI SDK UI for helper chat, optional visual components, no HarnessAgent or specialist-routing framework | [AI choices](#ai-runtime-and-model-choices) |
| No Business-specific executable code or hardcoded product content in shared service/libraries; Business code stays with the Business, and shared runtime consumes registered data/settings | [Ownership](#shared-service-libraries-and-business-ownership), [Business settings](#business-settings-and-registration--review-proposal) |
| Repeatable realistic synthetic development data; Astra helps author it during later implementation/testing, not brainstorming | [Development seed](#realistic-development-seed) |
| Overview-first dashboards; detailed UX delegated to Codex/Astra, Andrew's visual feedback optional | [Dashboard](#dashboard-and-delegated-ux) |
| Detailed retention/cleanup discussion deferred; necessary purpose-specific privacy/security/abuse controls precede real collection | [Data lifecycle](#data-lifecycle--detailed-discussion-deferred-2026-10-09) |
| Finish current design questions, then agree ERD, exact structural changes and shared/library/Business ownership | [Final reviews](#final-architecture-reviews) |

## Open Questions

**Decision audit, 2026-10-09:** no additional business-scope questions remain.
The six earlier tracks are coverage, not six pending votes. Their current homes:

| Area | Status / remaining work |
| --- | --- |
| Events and evidence | Initial sparse outcomes accepted; exact registrations and collection safeguards need design |
| AI and email | AI SDK + Convex and Resend selected; cheap-model winner follows later authorized evaluations |
| Support structure | One bounded drafting workflow; no specialists, coordinator or competing history |
| Approvals | Automatic permitted reads, exact operator Send, one draft/pending ID and new-message invalidation selected |
| Email reliability | Same-payload bounded retries and private regenerated screenshots selected; transport/size defaults need testing |
| Quality and cost | Repository-owned evaluations and provider caps selected; exact release gates and provider setup need verification |

Andrew requested three bounded Astra consultations across these tracks; later
decisions supersede their unaccepted alternatives, which remain in the topic
sections and dated ledger. Earlier seven-track, nine-topic and 32-row lists are
historical discussion indexes. Do not reopen settled choices or invent pilot/
identity questions while waiting for research.

Andrew approved the presented design and schema on 2026-10-09, including the
eight workflow tables, additive data impact and shared/Business direction. These
reviews and whole-design acceptance are no longer blockers. Planning/build/dev
deployment have not started; the latest deployment question was hypothetical.
Adjustable metrics, pass thresholds, per-request limits, backoff, expiry,
transport and UX details are engineering proposals—not silently accepted policy
or another product questionnaire. Necessary actual-data privacy checks precede
collection; detailed retention/cleanup stays deferred. No queue, vector database,
MCP server, hosted eval service or configuration console is assumed necessary.

### Final architecture reviews

The requested final review sequence was to finish the decision groups, then
explain and agree the following. Andrew subsequently approved the presented
design/schema on 2026-10-09:

| Review | Required explanation |
| --- | --- |
| ERD and relationships | Relevant reused/new entities and relationships; Business/environment/customer/account isolation; avoid duplicating existing identities |
| Exact structural changes | Tables, fields/types/requiredness, relationships and indexes, including component-managed storage; rationale, compatibility, existing-data/migration impact and verification |
| Shared versus Business ownership | Shared BFF service versus reusable embedded libraries/SDK versus each Business's server/UI/domain records/tool handlers; public contracts and practical runtime portability |

These are proposal reviews, not three prompts to invent infrastructure. UX
delegation does not waive them. A general diagram is not approval for unspecified
schema changes; repository structural-change confirmation remains required.
Acceptance covers the presented contracts, not unspecified additional structural
changes. No planning, coding or deployment has started.

### Final consistency and gap review — 2026-10-09

**Document/design review only, not implementation or release verification.**
Primary checks and Andrew's bounded independent Astra extra-high reviews found
**no additional business-scope questions**. Current sections correct stale read
approval, routing/runtime/provider status and portal/product-read wording.
Historical alternatives stay dated; initial support is bounded drafting with
automatic permitted reads and exact operator Send, one authoritative history/
draft, no specialist router or monetary ledger. Selected sparse Operator outcomes
do not erase the broader later Marketing/Launch funnel promise.

Remaining review/proof points, not a new questionnaire:

| Item | Boundary |
| --- | --- |
| Exact schema/configuration storage and migrations | Presented eight workflow tables and additive impact are approved. Planning must specify remaining Business settings persistence and explain any additional structural changes before edits |
| Private account facts in email support | Prove authenticated association, current eligibility, filtered reads/disclosure and the exact recipient; no same-email identity merging or new login workflow |
| Runtime/browser/email/attachment safety | Prove supported checkpoints and stale-result rejection, immutable sends/retries, scoped access and private bounded raster conversion |
| Real-data collection and provider setup | Minimum actual-data privacy safeguards and verified capped model routing/native alerts before live use; detailed retention remains deferred |

**Implementation/development preflight, 2026-10-09:** presented design/schema
approval is resolved; Andrew asks what practical access would block a future
instruction to build/deploy, not to start that work now. Read-only checks confirm
Convex development access and Cloudflare Wrangler login with existing Worker
deployment scopes. `tofler.app` zone lookup succeeds (HTTP 200). Current OAuth
scopes do not include DNS write; AI Gateway list returns HTTP 403. Branded-mail
DNS automation and gateway/cap management initially needed suitable scoped access.
Andrew subsequently supplied a separate setup token through Nirvana: verification
reports active, and DNS-record/gateway list requests succeed (HTTP 200), with no
gateways configured yet. No write permissions were exercised; existing Wrangler
login is unchanged. Existing image-generation access does not prove screenshot
conversion. Node 24 is available
through the documented pnpm wrapper; default Node 20 is not a user blocker.
Resend's Full-access key check succeeds (HTTP 200), with no registered domains.
Synthetic/mock development can proceed first. A real-mail development path can
use the [restricted test sender](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)
to the Resend account email and the account's
[managed receiving domain](https://resend.com/docs/dashboard/receiving/introduction),
once its address/webhook are retrieved/configured; neither is an end-to-end test
performed here. Branded multi-recipient testing needs custom-domain verification.
The [development access checklist](../../docs/operations/provider-accounts-and-secrets.md#operator-work-development-access--2026-10-09)
records the exact DNS/gateway setup scopes and native-alert dashboard boundary.
Read-only settings retrieval for the existing dev image Worker succeeds and shows
AI generation, not an Images binding. Current Images documentation supports
private-byte conversion on the default Free allowance; no new subscription is
expected for initial development, but conversion has not been tested. Seed
capability, SDK/email integration, capped routes and private screenshot
conversion still need implementation/setup/proof. No provider/DNS write,
credential persistence, email send, model call or deployment occurred.

Hands-on app/readiness skills cannot verify an unbuilt interface. Andrew's AI SDK
choice supersedes the Convex skill's default Agent recommendation. Relevant prose/
path checks do not substitute for later runtime/phone/desktop tests.

### Proposed ERD

For the requested short diagram view, see
[Operator work architecture](../../docs/architecture/operator-work.md).
The detailed field/index and authority contracts below are the approved review
source; the schema has not been changed.

Reuse [existing BFF identities/accounts](../../platform/bff/service/convex/schema.ts)
and [TableCards domain tables](../../projects/tablecards/backend/convex/schema.ts).
Approve eight new shared tables, not eight new services. The 2026-10-09 provider-only
cap revision removes the earlier `botBudgetPeriods` proposal. One discriminated
`conversations` table represents helper chats or support tickets; support-only
fields contain ticket status and its one draft. This avoids an unnecessary
one-to-one ticket wrapper while keeping the public workflows distinct.

```text
businessEnvironments ──< conversations >── businessUsers / accounts (optional)
                          ├──< conversationEntries ──< supportAttachments
                          │            ├──< emailDeliveries
                          │            └──< feedbackRecords
                          └──< botRuns
businessEnvironments ──< businessEvents >── businessUsers / accounts (optional)
emailWebhookReceipts ──> matched entry/delivery (optional until safely correlated)
```

`──<` means one-to-many. Existing customer/account links are optional for general
email help and anonymous helper chats, and present only after verified association.
All conversation children must match the parent's environment; an ID alone grants
no access. Native Convex IDs stay inside BFF. Product references are bounded public
IDs/strings across separate deployments, not foreign keys into TableCards' database.
Indexes are lookup mechanisms, not SQL uniqueness/foreign-key constraints;
mutations enforce scoped relationships, deduplication and atomic transitions.

### Proposed table changes and indexes

Notation: `ID(T)` = native Convex ID; `string?` = optional; times are numeric UTC
milliseconds; states/kinds are explicit validator unions, not arbitrary strings.
Content/arrays are size-bounded. Every environment-scoped table has required
`environmentId: ID(businessEnvironments)`, checked against related records.
These are the presented field/index contracts approved on 2026-10-09, not a schema
already changed. Additional unpresented structural changes still need explanation.

The bounded follow-up Astra review checked this proposal against Andrew's final
typed policy. Its five corrections are incorporated below: complete immutable
email envelope, draft-write concurrency/unstarted-delivery reference, explicit
reply-token lookup, normalized webhook ordering evidence, and declared index
fields. Its earlier application-budget settlement proposal is superseded by
Andrew's later provider-only cap decision. This is an independent design check,
not proof that unimplemented code passes those invariants.

| New shared table | Proposed fields and requiredness | Indexes driven by the initial reads |
| --- | --- | --- |
| `conversations` | Required public ID, `kind: helper/support`, bot key, created/updated times; optional verified user/account IDs and active run ID. Helper has a hashed anonymous handle only when needed. Support requires subject, contact/channel and status; optional waiting-since time, unstarted-delivery ID and one current-draft object with recipient/body, source-run ID, editor/time, exact fingerprint and pending ID/state | environment/public ID; environment/kind/updated time; environment/kind/status/waiting time; environment/user/updated time; environment/account/updated time; environment/anonymous-handle hash |
| `conversationEntries` | Required conversation ID, typed kind, explicit visibility, server-attributed actor, timestamp and bounded text/typed parts; optional referenced message ID, source-run ID and provider inbound-message ID. Outgoing kind requires one immutable envelope: from/to/reply identity, subject, rendered text/HTML, threading headers and any feedback link/approved attachment references. Operator notes are internal; delivery state is separate | conversation/time; environment/provider inbound-message ID for deduplication; environment/actor/time for operator action history |
| `botRuns` | Required conversation/trigger-entry IDs, bot/config/skill/model identifiers, state, start/update times and captured draft ID if one existed. Bounded attempt records have required attempt ID, provider/model and execution outcome; optional token usage, result references, completion/error and pending client-tool checkpoint. No second full transcript, chain-of-thought archive, monetary reservations or per-customer cost attribution | conversation/start time; environment/start time; environment/state/update time; conversation/trigger-entry ID |
| `emailDeliveries` | Required conversation/outgoing-entry IDs, provider, purpose, exact payload fingerprint, stable idempotency key, state, attempt count and created/updated times. Substantive replies require authenticated approver/time/pending ID; fixed receipts use a system actor. Required reply-correlation token hash for ticket emails; optional provider message ID, attempt/next-attempt times and safe error | environment/entry ID; provider/message ID; reply-token hash; state/next-attempt time; environment/state/update time |
| `emailWebhookReceipts` | Required provider/event ID, verified event type, provider occurrence time, received time, processing state and bounded normalized correlation/outcome fields. Optional matched environment/entry/delivery, provider message ID, relevant addresses/thread identifiers and safe error according to event type. No full raw MIME/HTML or attachment bytes | provider/event ID; processing state/received time; provider/message ID |
| `supportAttachments` | Required parent-entry/conversation IDs, provider attachment ID, claimed name/type/size, processing state and created/updated times; optional block reason and regenerated private `ID(_storage)`, verified PNG/JPEG type, byte size and dimensions. No durable original-download URL | entry/provider attachment ID; conversation/entry ID; environment/processing state/update time |
| `feedbackRecords` | Required answer-entry/conversation IDs, question version, evidence kind and created time. Support invitation requires invitation time, token hash/expiry and activation/send evidence; optional submitted Yes/Partly/No, comment and submitted time. Helper feedback uses authorized answer scope. One current explicit response, not an invitation/click/rating/comment table bundle | answer-entry/evidence kind; invitation-token hash; environment/submitted time; environment/invitation time |
| `businessEvents` | Required environment, deduplication ID, registered event name/version, occurrence/receipt times and bounded validated safe properties; optional verified user/account IDs and public product-operation reference. Only meaningful Business-reported outcomes, not duplicated bot/security/delivery logs | environment/deduplication ID; environment/occurrence time; environment/user/time; environment/account/time; environment/event name/time |

`emailWebhookReceipts` may have no environment until registered addressing or a
known delivery safely establishes it; unresolved records are operator-only and
never model context. Spending caps are provider/gateway configuration, not a BFF
table, per-Business allowance or customer-selectable budget scope.
Business-specific bot/skill content, event definitions and templates are owned
under `projects/<business>/` or as reviewed per-environment configuration data.
Shared libraries own only their generic types, loaders/renderers and protocol;
they do not import Business files or executable validators. BFF may retain
registered content/settings or private content references as data, without a
second editable management console. Exact configuration storage/field changes
remain a structural review item; do not imply this registration exists.

**Minimal support run:** customer message → bounded model/automatic allowed reads
→ save one draft → stop. Operator edits update that one draft, never a historical
body-version list. Choosing **Send** is the operator's approval; do not require
two separate approval/send decisions for one reply. Group review may use the same
secured send contract for each explicitly displayed item. Approval checks the
exact current pending ID/fingerprint and
freezes the complete email envelope once on an outgoing entry, plus a delivery
record referencing it. Preview the exact recipient/content and sender/subject
identity; retries must not rerender from later branding/configuration or draft
edits. The conversation points to its unstarted delivery for atomic invalidation;
a genuine new customer message
revokes unstarted send authority and preserves the draft for fresh review; edits
do not silently replace an already approved payload. Atomically claim before
provider dispatch. Retries use that immutable entry/key, never the newly edited
draft; accepted/uncertain/delivered are distinct. No original-draft body snapshot
per edit is implied. Compact acceptance/edit/rejection signals and final sent
answer still support honest operator/evaluation review.

A completing model run must match its active-run ID, captured customer-message
input and captured current-draft ID before saving. It cannot overwrite an
operator edit or a newer draft/message. New edits replace the pending ID; no
version counter/history. A stale result is recorded without silently applying it.
Claiming dispatch clears the unstarted-delivery reference atomically; already
started mail cannot be recalled or resubmitted as a fresh message.

Reviewed registered mailbox/domain identities map incoming recipients to a
Business/environment. The opaque reply-address token hashes to the known delivery
and its conversation; multiple deliveries may refer to the same ticket. Validate
that relationship and registered addressing together. Thread identifiers are
bounded correlation evidence, not an alternate customer identity or permission.
The complete outgoing reply address is already frozen in its email envelope;
the token's lookup hash grants no account access. Unknown/mismatched input stays
operator-only for review. Verified webhook facts preserve event occurrence time
and relevant outcome evidence; duplicate/older events cannot regress a delivery
state, and a later complaint remains a sending prohibition, not another retry.

**Helper integration:** AI SDK UI consumes a projection of the same stored
entries, not a second conversation database. Tool-call/result checkpoints belong
to the bounded run. Server validates allowed tools/current customer; the page
executes only its registered client handler and reports the correlated result.
Private notes/diagnostics and runtime-only tool data are excluded from customer
projections. Resume only actual pending work; no recurring case poller.

**Private attachment path:** bounded Resend retrieval → authenticated shared
Cloudflare image-processing Worker → regenerated raster bytes → existing BFF
Convex private file storage → authorized operator preview endpoint. The existing
TableCards AI-image Worker is not that processor. Validate content and size/count/
pixel limits; conversion failure blocks preview with no original fallback, public
source URL, raw HTML rendering or automatic AI-image ingestion. No R2/new storage
vendor is required by this proposal. Image rewriting reduces exposure, not an
antivirus verdict or complete safety guarantee; local rejection cannot undo
provider inbound quota.

**Provider caps/alerts:** the $3/day and $30/month live-text safety ceilings remain
selected, but enforcement belongs to provider/gateway configuration only. Every
live model request must take the capped route; no direct or fallback bypass.
Handle cap rejection as temporary AI unavailability while preserving tickets,
drafts and direct support contact. Native daily/delayed alerts are acceptable;
their exact scope/reset windows are setup proof points, not an app alert system.
No budget-period table, application money reservations, spending dashboard or
per-customer cost ledger. Each later evaluation run still needs a separately
bounded authorized allowance; no paid runs or provider setup here.

### Existing-data and migration impact

The eight workflow-table proposal is **additive**, with no rename/removal or
required-field change on existing identity/account records. Reuse existing
`businessUsers`, `accounts`, memberships/access/unit records and narrow `securityEvents` unchanged;
do not turn security history or image-credit reservations into text billing.
`businessEnvironments` stores customer-auth configuration, not the new bot/event/
email definitions. Registering those as data needs an explained storage proposal:
optional environment-settings fields and/or private content references are
candidates, not approved changes or an assumed ninth table. Existing environments
must work without new optional settings; helper/support activation requires a
validated complete configuration. No configuration migration is selected here.
TableCards keeps `projects`, `projectContents`, `designAssets`, `designPresets`,
`projectExports` and `aiBatches` unchanged. Adding safe outcome-reporting code need
not change those tables; there is no copy/migration of guest lists, PDFs or images.

New tables start empty. No historical-ticket/event invention or customer-data
backfill; old periods show unavailable evidence, not zero activity. Configure
verified email identities separately from customer identities. A later Business
domain change maps addresses to the same environment/case IDs; it does not rewrite
ticket ownership or consent/preferences. Optional brand/logo/config fields are
not implicitly approved on `businessEnvironments`; any later proposed structural
change requires its own exact explanation/confirmation.

Before activation, verify development fixtures and deterministic tests for
cross-Business/account denial, email-only lack of account authority, private-note
projections, stale/repeated approval, callback deduplication/order, uncertain send,
attachment refusal/private preview, capped provider routing and graceful cap
rejection. Provider configuration and native alerts need setup verification;
application budget-reservation tests are no longer in scope.
Synthetic records and realistic held-out model evaluations happen during the
later authorized build, with Astra assisting dataset realism then. Minimum
actual-data collection/privacy/deletion safeguards precede real customer storage;
no detailed retention system or blanket abuse-retention exception is added.

### Shared service, libraries and Business ownership

| Home | Owns | Does not own |
| --- | --- | --- |
| Shared BFF service (`platform/bff/service`) | All eight approved workflow tables; generic scope/authentication, helper/support workflows, history, filtered reads, exact send approval, email/callbacks, private attachment orchestration, capped model routing and graceful rejection, feedback/event ingestion; validated Business settings as data and operator endpoints | Hardcoded product event catalogs, FAQs, routes, templates or policies; imported/executed Business product code, guest/card contents, PDF generation, product database queries, unapproved remedies, a spending ledger/dashboard or application monetary cap counters |
| Shared TypeScript contracts/runtime and helper UI library (`platform/bff/libs/`) | Generic bot/skill/event/configuration contracts, provider adapters/AI SDK model and tool protocol, typed page capabilities/results, safe knowledge loading, shared helper component/AI SDK UI integration and evaluation/seed machinery with generic boundary fixtures | Business-specific bot content, knowledge, event schemas, branded templates or realistic product fixtures; separate conversation/approval stores, trusted identity from browser claims, a general agent platform or automatic send authority |
| Shared backoffice + operator automation (`platform/bff/backoffice`, `tools/bff-operator`) | Overview/queues/customer views and judgment controls; queue/feedback/evaluation skills and repeatable validated configuration using the same authenticated BFF contracts | Direct-database bypass, raw provider credentials for ordinary operators, duplicated access/approval systems |
| Shared Cloudflare image processor (new platform capability) | Authenticated bounded decode/reencode of permitted screenshots, returning only generated bytes | Email/case ownership, customer authorization, public original storage or TableCards AI generation |
| Provider/gateway configuration | Shared live-text safety ceilings and available native alerts; verify capped routes, time windows and delayed/account-wide notification behavior at setup | Ticket history, customer identity, application spending tables or guaranteed advance warning |
| Each Business (`projects/tablecards/` initially) | Executable domain validators/rules and page/backend handlers deployed to that Business; product knowledge/ground rules, bot/skill content, branding/templates, event definitions, approved routes and realistic evaluation/seed content supplied as Business-owned data/configuration; meaningful outcome reporting and all existing card/project/export/image data | Product code imported into BFF/shared libraries; its own helpdesk, mail-provider integration, new budget/approval engine, generic bot runner or copy of shared identity tables |

Favor shared reusable mechanisms, with small explicit Business registrations—not
product-specific branches throughout shared code or a configurable platform for
imaginary needs. Keep a shared conversation/helper package alongside the existing
`@tofler/bff-auth` SDK rather than putting AI/backend dependencies in auth-core or
browser entry points. Exact Nx packaging belongs to the subsequent plan.

**Ownership clarification accepted 2026-10-09:** no Business-specific executable
code, hardcoded product schemas/content or `if Business === TableCards` branches
in shared service/libraries. Business-only code is deployed with the Business.
Business records/settings/content may live in BFF as scoped **data**, never supplied
executable validators/handlers. Generic ingestion, validation, rendering, knowledge
loading and evaluation consume the same contracts for every Business. TableCards
examples in this brainstorm illustrate registrations, not shared-code constants.

### Business settings and registration — review proposal

The audit found ambiguous ownership and three real integration gaps: runtime
configuration delivery/storage, server-approved event/tool definitions, and
mailbox/presentation bindings. None is already implemented by customer-auth setup.

| Business-owned material | Shared runtime consumes | Code/content owner |
| --- | --- | --- |
| Bot instructions and assigned knowledge/skills | Scoped IDs, versions and reviewed content/references as data | Business product content; shared generic bot/skill contracts and loader |
| Event names/labels and property structures | Versioned declarative field names/types/requiredness/allowed values/bounds, including permitted free text | Business domain checks/reporting; shared generic envelope/descriptor validation |
| Page tools and navigation | Approved names/descriptions, argument/result descriptions and destination data | Business UI handlers; shared generic client bridge and scoped allowlists |
| Support identity and presentation | Environment-bound recipient/sender/reply identities and branding/template settings | Business values/copy; shared generic rendering/delivery |
| Realistic Q&A and seed scenarios | Development/test data, never runtime answer keys | Business fixtures/references; shared generic evaluation/seed runners |

Reviewed Business source may publish serialized settings through an authenticated
validated operator/Business configuration path. BFF does not import Business
TypeScript/Zod validators or evaluate uploaded code. Page-advertised tools are
matched to server-approved capabilities; browser declarations cannot register
permissions. A stored event's environment/name/version selects its registered
data definition, so BFF can check the shape without knowing PDF/game/card rules.
Keep relevant versions interpretable after updates; do not silently validate old
records against a changed definition. Backoffice renders generic views using
registered labels/references, not product-specific shared components.

The [existing Business auth defaults](../../projects/tablecards/customer-auth.defaults.ts)
are a useful Business-local-to-shared-settings pattern, not a ready bot/event/mail
registry. Exact new settings storage, fields/types/indexes and migration impact
remain for structural review; no new configuration table, console or general plugin
framework is selected. Common statuses, send approval, survey defaults, provider
caps and security bounds do not each need a mandatory per-Business switch.

Ordinary TypeScript bot/skill/evaluation/provider logic can move to Node later;
Convex database transactions, authorization, jobs, subscriptions and private file
delivery still need migration/replacement. That is practical reuse, not a drop-in
backend swap or generic portability framework now. The Codex queue skill must
authenticate as an admitted operator through equivalent BFF checks; the existing
configuration CLI is not proof that ticket commands/authentication already exist.
Resolve that concrete path in planning without giving Mum Codex or service secrets.

**Review checkpoint:** agree the proposed entities/fields/indexes, additive data
impact and ownership with Andrew. Whole-brainstorm acceptance and permission to
create an implementation plan remain explicit later decisions; no ADR may present
these proposed tables as accepted or implemented yet.

## Operational placement

| Work | Home and authority |
| --- | --- |
| Customer Q&A, submission and feedback | Product-facing helper/shared signed-in form/public email link; customer controls navigation/submission |
| Customer conversation | Email, not a product ticket-history/reply portal |
| Lookup, evidence, case handling and approvals | Secured backoffice and validated Codex/operator workflow using the same scoped BFF contracts |
| Authoritative cases, delivery workflow and bounded bot execution | Shared BFF; email provider is transport, not case owner |
| Business milestones and page tool handlers | Business-owned server/UI; shared BFF ingestion/access and SDK contracts |
| Repeatable bot/brand configuration, knowledge review and evaluation | Validated Codex/operator automation; dashboard reads effective state rather than owning a second editable copy |
| Technical monitoring / company-role orchestration | Monitoring build / post-MVP future ideas respectively |

Human support actions proposed for MVP are reply, request information, resolve/
reopen, add notes, approve/reject and retry eligible failed sends. Exact controls
remain to design. Placement grants no refund, access override, membership/
ownership change, customer deletion, database repair or deployment power.

<a id="business-first-operating-context--accepted-direction-2026-10-08"></a>
<a id="operator-access--accepted-simplification-2026-10-08"></a>

## Business scope and visibility

**Accepted 2026-10-08, confirmed/refined 2026-10-09.** One shared backoffice,
scoped to the chosen Business/environment, joins customer/account evidence and
cases. TableCards and ContentChaser can serve unrelated people; the same email
does not justify a cross-Business dossier, global customer join or identity merge.
All-Business summaries aggregate scoped Business evidence, not unique people
across products. Under [ADR 0004](../../docs/architecture/adr/0004-business-customer-auth-and-accounts.md#authority-and-isolation),
customer identity remains environment-local and provider issuer/subject based.

All **admitted** backoffice operators have the same full access. Keep the existing
[operator gate](../../platform/bff/service/convex/lib/authorization.ts); no role/
permissions table or granular grants are needed now. Adding a person is still an
access grant, not implicit authorization from this brainstorm. Full backoffice
access is not public access, raw engineering administration or bot inheritance.
Andrew and his mum should be able to operate without managing unnecessary roles.

Show meaningful, safe BFF-held facts rather than every raw field:

| Existing evidence | Useful proposed presentation / limit |
| --- | --- |
| User profile | Safe identity reference, contact/name and registration facts; no credentials/provider subjects or internal auth material |
| Accounts/memberships/invitations | Customer overview with selectable account/workspace details, not one blended entitlement |
| Access/offers/units | Current verified offer/limits and remaining/reserved/consumed units; distinguish unknown/stale evidence |
| Sessions/security/ownership | Useful login/logout/revocation or ownership state, not tokens, hashes, proofs or complete raw session records |
| Checkout | Actual recorded attempt/source/outcome; no-charge preview is not paid subscription evidence |
| Planned cases/events | Related support history and selected meaningful activity, not an existing implemented integration |

Investigation must work without an existing complaint. Missing activity does not
prove inactivity, failure or customer intent. Account-specific facts follow the
selected account; unknown/stale facts are not guessed. Initial scope excludes
custom Business backoffice pages, direct product-database reads, a new person
table, CRM/helpdesk breadth and a cross-Business customer-correlation system.

**Historical alternatives, 2026-10-08:** customer investigation only was the
lower-effort slice but left feedback/replies fragmented. Investigation plus
support was medium/high effort and chosen for combined exploration, with a CRM
scope risk. Proactive outcome discovery added higher effort/false-positive risk;
only evidence-backed milestones/failures are retained, not inactivity inference
or automatic outreach. Business-specific backoffices would duplicate shared
work; a shared Business workspace was selected over cross-Business customer
investigation. Profile-only versus meaningful BFF context and records-only versus
activity/support views were resolved toward the latter, within the limits above.

<a id="bff-customer-information-and-business-events--accepted-direction-2026-10-08"></a>

## Meaningful Business events

**Accepted event breadth, 2026-10-08:** milestones plus important blocked/failed
outcomes, not every click or technical logs. BFF-owned auth/access evidence should
be reused rather than redundantly emitted as product activity. Exact catalog,
validators, integrations and structural changes remain **open**.

**Initial set accepted 2026-10-09:** project saved; PDF availability/failure;
AI-batch outcomes; meaningful blocked actions and bot outcomes such as draft
created, approval invalidated or send uncertain. Exact names/payloads/schema and
collection rules remain unapproved. “Business” means the
product/company, not a TableCards saved project or a customer's wedding/event.
A readable customer timeline, last meaningful activity and scoped Business
summary are proposed; begin with operator review, not extra notifications.

**Astra batch proposal, 2026-10-09:** begin with small typed outcomes and on-demand
counts/review. Precomputed trends add reconciliation/late-event/deletion work;
longitudinal customer journeys add collection and attribution risk. Neither is
needed merely to show the overview. These are **TableCards registration examples**,
not a PDF/card-specific event enum or schema to compile into shared BFF:

| Outcome | Meaning / bounded safe evidence |
| --- | --- |
| `project.saved` | Successful explicit create/save, with created/updated/copied subtype and safe reference/card count; not keystrokes, guest names or autosave noise |
| `pdf.export_completed` / `pdf.export_failed` | Server-validated PDF made available, or terminal failure; safe project/export reference and counts/reason. Not proof of download, saving or printing |
| `ai.batch_completed` / `ai.batch_failed` | One terminal outcome per four-choice batch, with completed-choice count; not four successes or stored prompts/images |
| `action.blocked` | One meaningful attempted save/export/generation denied by a named limit, entitlement or unit reason; not every disabled-control render |

Reuse verified BFF auth/access/checkout facts. No-charge preview must not become
a paid-conversion event. Catalog names/payloads are proposals, not approved schema.

**Internal recording clarification, 2026-10-09:** shared code should automatically
record meaningful outcomes of actions it owns; Businesses should not have to
re-emit BFF or shared bot-workflow events. Existing code records successful login,
logout and session revocation in security evidence, and holds access, checkout
attempt and unit-reservation facts. Reuse those sources rather than inventing an
equivalent activity stream or presenting current state as complete history.
Shared support/helper workflow would record actual draft/approval/tool/send outcomes
and usage as part of execution; that new workflow is not built yet. Business server
code still reports its own product operations. Automatic recording is not automatic
bot access/disclosure: enforce scoped filtered views; permitted support reads are automatic.
It does not collect every internal function/denial or move technical logs from
Monitoring into Operator work.

Business server code should report trusted completed-operation facts. BFF checks
Business/environment and any verified customer/account relationship. Browser
intent/context is separately untrusted: it cannot establish authentication,
payment or successful completion. Proposed payloads contain safe references,
counts, outcomes/reasons and stable deduplication IDs, not guest lists, documents,
raw prompts, stack traces or arbitrary unrestricted JSON.

**Structure/content clarification, 2026-10-09:** the Business owns executable
domain validation and reports outcomes; BFF uses generic checks against a trusted
versioned **data descriptor** registered for that environment/event name. That
descriptor lists permitted fields/types/bounds and any display labels, not code
imported from the Business. Unknown/mismatched definitions are not guessed from
free text. Exact metadata storage is in the
[Business settings review](#business-settings-and-registration--review-proposal).
`safeProperties` does not prohibit useful text or certify privacy: a description
may be explicitly permitted and bounded. Customer explanations remain messages;
approved product references can connect them with the corresponding event timeline.
Code can check allowed fields/types/lengths, not guarantee that arbitrary text has
no personal information or that a customer-reported issue actually occurred.

A conceptual Business-activity record would have Business/environment, optional
verified user/account, named/versioned event, occurrence and receipt time,
deduplication/source reference and bounded safe properties. This is **not an
approved table**. Do not extend the narrow security-event enum into a catch-all.
Schema/indexes, ordering/pagination, payload/rate limits and migration belong in
the final review; [Convex index guidance](https://docs.convex.dev/database/reading-data/indexes/)
is a design reference, not a selected schema.

Recording should tolerate bounded retries/deduplication and delayed/missing
evidence without breaking a successful product operation or changing access.
Reads remain scoped/bounded/paginated; show coverage and freshness. Historical
events are not current entitlement, billing, refund eligibility or an authority
source merely because an AI can read them. Missing events mean unknown, not
proof an operation/refund never happened.

**Historical event alternatives:** milestones only was lowest tracking burden
but missed meaningful failures; milestones plus important failures was selected;
full clickstream was rejected as noisy, costlier and disproportionate. Detailed
product-operation reads were an early investigation proposal, superseded by
meaningful BFF facts plus reported safe events.

<a id="reuse-for-analytics-and-future-offers"></a>

### Future reuse, not present automation

Selected events may later support analytics, marketing measurement or offer
eligibility. Reuse safe named facts with explicit field mapping, consent/privacy
checks and deduplication; do not forward all payloads to pixels or infer
eligibility from unreliable history. [GA4 event definitions](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
and [PII restrictions](https://support.google.com/analytics/answer/6366371?hl=en-SD)
were references, not selected providers. Promotions/discounts/automatic charges
remain in [future offers](../../docs/architecture/future-ideas.md#shared-promotions-personal-offers-and-repeat-purchase-campaigns),
not accepted workflows. Product records remain Business-owned; see also
[future Business extensions](../../docs/architecture/future-ideas.md#product-specific-backoffice-extensions).

<a id="ticket-system-and-email-first-conversations--exploration-2026-10-08"></a>
<a id="signed-out-contact--resolved-2026-10-09"></a>

## Cases, contact and email trust

**Ownership/channel decisions accepted 2026-10-08; signed-out refinement
2026-10-09.** BFF owns the case and authoritative conversation. Email sends/
receives messages for it; changing transport must not lose history. Customers
submit from the shared signed-in website form or direct email, then continue by
email. History/replies are in backoffice, **not** a customer ticket portal.

Signed-out visitors see **Sign in** and **Send us an email**. A mail link opens
their mail app/draft, not an automatic send; display the address for customers
without a configured client. There is no anonymous web form initially. Product
login remains Google-only: no support-managed recovery, alternative Apple/email
login, contact-verification tiers or a separate identity framework. People unable
to use Google can contact us, but contact is not alternative product access.

The same intake accepts issues, how-to questions, feedback, suggestions, missing
features and general product/offer enquiries. It is broader than incident support,
not a required department selector or sales workflow. Receiving a suggestion
does not promise implementation. Substantive responses are **as needed**, not
mandatory for every suggestion and not a response-time/SLA promise.

### Initial receipt and anti-spam

Send one automatic, neutral, Business-branded initial receipt after durable
acceptance of a new case. Do not send another for every reply, webhook replay or
retry. Receipt delivery is not email/account verification, resolution or a
feature promise. Do not echo arbitrary submitted bodies or reveal matched private
account facts to a claimed contact address. Failed receipt/send delivery remains
visible without losing the original accepted case.

Bound submissions/outgoing mail by relevant source and destination, prevent
duplicate messages and autoresponder loops, and distinguish abuse/transport
handling from account authority. Exact limits, retry/backoff and loop mechanisms
are open. Receiving email is not inherently spam-free; provider suppressions/
quotas are not our full anti-abuse design.

### Contact is not account authority

A typed address, matching From header, receipt or successful delivery proves no
account authority. A properly correlated reply can support mailbox/contact
evidence, not automatic entitlement to private account information or account
changes. Existing Google/BFF authorization governs sensitive support. A signed-in
submission also does not justify sending private facts to an arbitrary replacement
contact address. Email equality never merges customer identities.

The earlier risk explanation overstated that entering someone else's address
lets an attacker read responses sent only to that mailbox: it does not. Remaining
risks include spam, spoofing, incorrect correlation and account authority.
[OWASP email validation guidance](https://cheatsheetseries.owasp.org/cheatsheets/Email_Validation_and_Verification_Cheat_Sheet.html)
informs the distinction, not a requirement to build another login system.

**Historical channel/trust alternatives, 2026-10-08/09:**

| Alternative | Reasoning and outcome |
| --- | --- |
| Ordinary shared mailbox | Lowest initial application work, but case state, approvals and joined evidence fragment outside BFF; not selected as case owner |
| BFF cases with email transport | More integration work; selected to preserve authoritative history and shared handling |
| External helpdesk | Broader ready-made workflow but extra ownership/integration/dependency; not selected |
| Customer web history/reply portal or secure-link thread | Extra customer UI/access lifecycle; never accepted, excluded initially |
| Mandatory contact confirmation before handling | Earlier recommendation; too much friction for contact/feedback, challenged by Andrew |
| Immediate public form with visibly unverified contact | First Astra review recommended general help without confirmation and separate private-account checks; Andrew accepted on October 8 |
| Human-first screening | Another control option, with extra manual work; not selected |
| Signed-in form plus public email, no anonymous form | Second Astra review recommended smaller Google-only MVP scope; Andrew accepted October 9, superseding public-form inclusion |
| No signed-out contact | Saves a channel but blocks login-problem/guest feedback; not selected |

Removing the anonymous form saves modest scope, not the substantial case/two-way
email work. A public form is not inherently overengineering; it can be reconsidered
if the email route proves inadequate.

### Wrong-recipient reporting — still proposed

Andrew suggested “I didn't send this.” Option A: a case-specific link opening an
explicit confirmation that pauses further mail for that case/address, preserving
history; option B: reply “not me” for operator handling or narrowly bounded
automation. Neither is accepted. A link must grant no account/history access,
delete nothing, affect no other cases or emit another receipt. Opening alone is
not authorization; forwarding, retries and abuse require review.
The 2026-10-09 Astra batch favors option A's explicit, narrowly scoped confirmation;
it remains unaccepted, not an account-deletion or universal unsubscribe mechanism.

## Ticket lifecycle and history

<a id="initial-case-states--recommendation-not-accepted-2026-10-09"></a>

**Accepted 2026-10-09:**

| Case status | Meaning and transition |
| --- | --- |
| Open | Work/review remains for us. “We're investigating” can leave it Open |
| Waiting for customer | We need their answer/material, e.g. a screenshot; not simply every outgoing reply |
| Resolved | An operator explicitly closes it; no timeout, silence-based or AI-inferred closure |

Sending email alone chooses no status. The bot may suggest the appropriate
transition but does not approve its own work. A correlated customer reply returns
**both Waiting for customer and Resolved to Open**, in the same history, even a
“thanks”; this known noise trade-off was preferred to keeping a state with a
new-message flag. Do not create a new case or initial receipt. Transport replay,
duplicates and automated loops are separate safeguards, not genuine replies.

**Pending bot approval is an indicator, not a fourth case status.** Delivery
state is also separate: an undelivered reply cannot falsely signify resolution.
Exact transition controls and failure presentation remain to design.

A **shared queue without ticket-owner assignment or priority labels** is accepted.
Andrew and his mum need to see who acted, not maintain assignment state. Internal
notes can coordinate; add owners/labels later only if real operating friction
justifies them. On-demand AI queue review can group and recommend handling order
with reasons; Andrew's “50 tickets” example is illustrative, not a runtime cap.

Internal notes appear in the **same case history**, clearly labelled internal,
with author/time, alongside customer messages. They are not customer emails or
action approvals and do not automatically grant bots access. Meaningful action
history shows who did what and when: bot execution and approving operator remain
distinct actors. Proposed coverage includes sends, approvals, status changes and
failures; exact event coverage/editing rules remain open. Prefer additional
correction notes over silently rewriting history. AI/model names cannot stand
in for an authenticated human approval identity.

**Andrew's simpler direction, 2026-10-09:** one current outgoing reply draft per
ticket, not a separate draft for each incoming message, AI suggestion, bot or
operator. AI suggestions and operator edits work on that one draft; sent replies
remain in the normal history and later replies can have a new current draft.
Internal notes may refer to a specific message, still private, labelled and
attributed; they are optional, not a note required on every message. Existing
case-level notes remain useful. No customer portal, extra note conversation or
ticket owner follows. Draft replacement/edit protection and exact send-state
details remain to settle; this is behavior, not an approved table/field change.

**Historical choices:** two versus three statuses resolved to three; automatic
timeout closure versus explicit operator closure resolved to the latter; always
Waiting after sending versus only awaiting a needed response resolved to the
latter. Optional ownership was initially recommended; Normal–Urgent labels were
an unselected alternative. Both were omitted for the small shared team.
Plain-text-only approval summaries were
replaced by structured requests below. These are not fresh questions.

<a id="approved-knowledge-and-an-on-demand-codex-improvement-workflow--2026-10-08"></a>
<a id="shared-bot-controls-and-event-access--exploration-2026-10-08"></a>

## Bot definitions, skills and data boundaries

**Accepted refinements 2026-10-08/09:** use extensible named configurations:
name/identifier, main instructions, assigned skills, permitted context/tools and
role. Helper/support are responsibilities, **not** a hardcoded two-bot limit or
required default pair. Each Business configures at least one support bot; it can
have no helpers or several page-specific helpers. Adding future custom bots
should reuse the contract, not break the runtime. New tools/data sources still
need explicit code/review; this is not plugin upload or arbitrary agent code.

Support is the bot's role, while **suggest/draft** is its initial reply mode
because it is not trusted to send autonomously. It is not a separate “suggestion
bot” product. Future auto-send is a new authority decision, not inferred from
configuration extensibility, successful tests or category names.

Codex maintains definitions, knowledge and test cases as reviewed/versioned
configuration. Shared procedures can be reused; Business-only knowledge stays
beside the Business or in registered BFF data/settings, not shared runtime source.
Shared code owns the definition contract/loader, not TableCards prompts/content.
A mostly read-oriented Bots overview may show configured
roles/modes, assigned skills, test questions/expected behavior and dated/versioned
results from the same effective source—not a second configuration editor.
Exact config/files/storage/contracts remain open.

Proposed common controls include effective definition/policy versions, bounded
usage and an ability to stop a failing assistant. Add management buttons only
for a demonstrated direct operator task; domain behavior stays Business-owned,
not one universal bot personality.

### Runtime skills

Each allowed skill needs a **name**, a short **when to use it** description and
its **content**. Stable IDs/versions are internal tracing details where needed,
not extra authoring questions. Supply the bot a small metadata index, then let it open only relevant
assigned content. Product FAQ/how-to knowledge may be reused as assigned **data**
by permitted bots, not bundled as Business-specific shared-library code;
do not preload the entire knowledge base on each call. Held-out questions and
grading answer keys are not runtime knowledge.

[Agent Skills progressive disclosure](https://agentskills.io/specification#progressive-disclosure)
matches this shape; adopting metadata/content conventions does not imply script
execution, arbitrary paths, internal reference traversal or an MCP dependency.
Lazy loading can add calls/latency; savings and relevance need evaluation, not
assumption. Bound loads, steps, payloads and context. Assigned skill loading and
permitted read-only tools are automatic for both support and helper.

Runtime instructions affect behavior/release evaluation even when stored as
Markdown; unrelated prose edits do not justify paid AI tests. Shared skills/code
do not imply shared private conversations or automatic data access.

### Approved knowledge and filtered customer facts

Review provenance, rights/authorized use, confidentiality, customer shareability
and freshness. Andrew means internal implementation/business secrets as well as
credentials/PII. Do not ingest a raw internal repository and ask the model not to
repeat secrets. Uncertain rights/disclosure need review, not a bot's declaration
of legal clearance. Approved supplied knowledge is not erasure of model pretraining.

BFF supplies role-specific field-filtered views; unknown classifications default
to **withheld**. Read permission and disclosure permission are distinct, and
“customer-safe” does not mean public or safe to another customer. Full operator
access never transfers to a bot. No raw complete customer/event record by default;
instructions alone are not an access-control boundary.

Historical choices compared knowledge-only bots (lower integration) with selected
BFF customer/event facts (more useful investigation, more authorization work).
Sign-in/current-account plan context is now accepted for the TableCards helper;
**additional helper facts and saved-product access remain future scope; exact
initial support read contracts are proposed in the final review**.
Business-owned projects/export/AI/files are not copied into BFF as a new
product database. Further product adapters remain future scope.

**Astra batch proposal:** choose a few named filtered support reads over knowledge
alone or deep product adapters: case conversation, verified contact/account
association status, selected-account access/offer/unit summary and bounded relevant
milestones/failures. Andrew's final typed clarification permits these scoped
read-only calls without operator approval; unknown
association never becomes account access by matching email. Exclude credentials,
session material, provider identifiers, raw documents and unbounded histories.
Permitted reads are not permission to disclose all returned fields to customers.

Sources: [OWASP least privilege](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html#least-privilege),
[Convex full context control](https://docs.convex.dev/agents/context#full-context-control)
and [agent-specific defenses](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html#agent-specific-defenses).
These support code-enforced boundaries, not claims that all indirect disclosure
can be detected after information is copied.

<a id="support-routing-and-specialist-continuity--open"></a>

## Support workflow — selected; routing alternatives historical

**Current direction, 2026-10-09:** one bounded support-drafting workflow on the
shared AI SDK foundation. No specialist selection, routing graph, handoff or
separate specialist histories are needed. Permitted reads run automatically within
that bounded run; saving the one draft ends it. Reply approval triggers deterministic
delivery of the exact payload, not another model call. The alternatives below
preserve earlier reasoning and are not active implementation requirements.

**Historical premise check, 2026-10-09:** Andrew challenged whether support needs
a bot architecture at all. Astra found no demonstrated need for selection,
specialists or a master; tiny reviewed identity/version/instructions/skills/
capability settings support plain bounded drafting. Categories or a longer skill
list do not justify orchestration. This recommendation was initially parked and
subsequently resolved by the accepted shared foundation. Cheap-model adequacy
still needs later evaluations; operators handle missing data/authority.

| Historical alternative | Value / effort / risk |
| --- | --- |
| One broad configured handler | Lowest routing overhead; sufficient starting point if bounded knowledge/capabilities fit |
| Category-to-bot mapping with fallback | Medium configuration; categories can share a handler, but wrong category/topic changes misroute |
| Separate AI classifier | Extra latency/cost, ambiguity policy and routing tests; not selected |
| Thin content-aware coordinator | Medium/higher cost; eligible handlers and operator override, categories only hints |
| Multiple specialists synthesizing | Highest coordination/cost/private-context risk; not selected |

Andrew's Printing-but-payment or mixed-topic examples show why categories cannot
grant authority. Any future handoff would need a remit check, bounded eligible
targets/fallback, loop/step/cost limits and scoped useful results; detection is
not guaranteed. A coordinator would receive compact capability metadata, not all
private specialist context. Rebuild the next handler's permitted context rather
than forwarding another bot's complete history/tool results.

Separately scoped model invocations can isolate distinct tools/data without
separate deployed services. Labels/thread IDs alone are no security boundary;
separate credentials/infrastructure may provide stronger isolation at greater
operational cost. Add handlers only for genuinely distinct capabilities or
repeatable evaluation failures; add a coordinator only for demonstrated benefit.

Saved scoped specialist threads versus fresh bounded summaries trade continuity
against storage/lifecycle/context cost and lost detail. Both belong to one case,
not more tickets or an always-running model. Resume would revalidate Business/
environment/case/bot, current capabilities/authority and relevant facts; never
replay effects to reconstruct context. This remains historical, not initial scope.
The selected workflow reconstructs bounded permitted case context and records
actual results; private notes are not automatically included. Test isolation/
hidden-context leakage if future handoffs are separately accepted.

References: [LLM/agent as a tool](https://docs.convex.dev/agents/tools#using-an-llm-or-agent-as-a-tool),
[agent-as-tool pattern](https://docs.convex.dev/agents/tools#using-an-agent-as-a-tool)
and [continuing a thread](https://docs.convex.dev/agents/threads#continuing-a-thread-using-the-thread-object-from-agentcontinuethread).

## Support authority and approval continuation

**Final typed policy, 2026-10-09:** permitted scoped read-only support tools and
assigned skill loading are automatic. Every substantive reply is a suggestion:
operator edits/rejects or chooses **Send**, approving the exact email. Fixed initial
receipts and helper ordinary answers stay automatic; no refunds, credit grants,
account/project writes or autonomous reply-type permission.

Reads enforce trusted Business/environment/current-customer/account scope,
filtered fields/disclosure and bounded call/rate/spend limits. Initial input:
new message, permitted customer-message history, case scope and reviewed
instructions/tool/skill metadata. Internal notes/operator history are not automatic
context. Missing verified linkage grants no private account lookup. Exact read
names/fields and permitted disclosure to an email recipient need design/testing.

Requests explain **who / what / why**, not operator-facing JSON. Proposed preview:
Business/environment, customer/account, bot/action, exact recipient/content/
attachments, sender/subject, reason/risk, evidence times/versions, expiry and retry
envelope; a suggested status change is separate. Exact schema/presentation is
review work; [table contracts](#proposed-table-changes-and-indexes) explain storage.

**One current draft and one opaque pending ID; no draft-version archive.** Edits/
replacement invalidate the old ID and bind a new one to that exact payload.
Obsolete, withdrawn or already-handled approval explains “nothing pending” / “reply
changed” and refreshes without sending another draft, executing twice or losing
unsent edits. No silent AI replacement; stale completion cannot overwrite operator
edits or newer customer context.

A genuine correlated customer message invalidates pending/approved-but-unstarted
send authority, preserves draft/edits and requires fresh review/ID. Do not
auto-regenerate, delete messages or recall dispatched mail. No semantic dependency
or crossed-message engine; changed authority/eligibility still needs safe checks.

Send rechecks current scope/eligibility, atomically claims and freezes the complete
email envelope. Retries use that immutable payload/key, not a newly edited draft or
changed branding. Support model work ends when its draft is saved; sending is
deterministic, not another model call. Only actual helper browser-tool waits need
bounded checkpoints and actual-result continuation. Saving chat alone is not safe
resumption; no model runs during hours/days of operator waiting.

**Bounded-group approval accepted:** explicitly displayed exact requests only;
separate unusual cases and allow individual review. No unseen/preselected group
or blanket future authority. Record authenticated per-item validation/decision
and success/skipped/stale/denied/failure outcomes, not a false all-or-nothing result.
Already-successful items do not replay.

**Retry envelope accepted:** a few spaced same-email provider-submission retries
within valid authority and provider deduplication window. Stop on permanent
rejection, complaints/suppression, exhaustion or unsafe uncertainty; no recurring
fresh sends, extra bot tools or future permission. Attempt/backoff defaults are
engineering details; provider semantics live in
[email reliability](#threading-attachments-and-branding--outstanding-contracts).

Expiry (24 hours is an unaccepted starting proposal), rejection, cancellation,
error and retry never grant/renew approval. Waiting does not reset bounded run
counters. Resume only with actual results; no replay or dependent work after failed
prerequisites. Human approval cannot override hard capability/eligibility denials.

**History:** Astra initially proposed conservative invalidation. Andrew questioned
brief review/send overlap; notice-only was offered, then he chose invalidation
after simplifying to one draft/pending ID. Codex's added ID-plus-version approach
was rejected. See the ledger; no generic read-approval store/framework follows.

Unselected Convex [approval flow](https://docs.convex.dev/agents/tool-approval#server-side-flow)
and [opt-in tools](https://docs.convex.dev/agents/tool-approval#defining-tools-with-approval)
illustrate persisted requests, not BFF authority/substantive-send guarantees.
Model-context denial alone cannot durably revoke our pending send ID.

### Configurable code policy — future; initial support approvals fixed

**Future requirement, not an initial rules engine:** per-Business/per-tool policy
and eventually different approval rules for reply types. One agent can use distinct
policies; separate agents are unnecessary. Initial allowed reads and exact Send
gating follow the previous section.

| Future outcome | Meaning |
| --- | --- |
| Deny | Disable a capability; human approval cannot override hard scope/eligibility |
| Ask an operator | Authenticated exact decision, not model-decided “auto approval” |
| Allow automatically | Separately accepted rule, retaining scope, eligibility, usage and budget bounds |
| Custom code | Reviewed Business/tool predicates run in the Business deployment; generic shared code enforces their scoped decision, never uploaded/model-authored rules |

Andrew's examples: trusted event occurrence/nonoccurrence, count within a period,
time since occurrence, and per-customer or whole-Business action allowances.
Thresholds can switch auto to ask; hard limits deny. No selected numbers, new
collection or access to other customers. Check current trusted state and atomically
reserve/count scarce allowances where needed. Missing/stale facts fail safely;
events alone are not payment/access truth. Exact counters/periods are future
action-specific design, not current schema requirements.

Routine how-to might eventually auto-send while payment/sensitive/mixed/uncertain
answers require review. An AI topic/intent label cannot authorize arbitrary
content. A conservative proposal is a reviewed answer-recipe catalog with safe
parameters/known links checked at dispatch; generated auto-send needs separately
accepted scope/evaluations. Successful tests never activate authority.

**TableCards need check, 2026-10-09; proposed examples, not accepted tools:**
[printing/import/how-to](../../projects/tablecards/docs/product.md#core-workflow)
mainly need knowledge. Export/missing-project diagnosis may use reported BFF
outcomes, not product-database/guest-list reads. AI failures/allowance and workspace
invitations may use filtered BFF unit/account/access facts. Exact availability,
fields and private disclosure need review. Failed generation already releases its
reserved unit; do not invent a second credit-restoration action. No cash-refund tool
is justified in the no-charge preview. Later Payments may justify verified payment
status/human handling, not automatic refunds, credits, membership or account repair.

Enforce policy at actual tool/email dispatch, including generic send routes;
prompts cannot alter protected rules or turn guesses into trusted facts. Future
rule previews/results are read-oriented: no arbitrary expressions, visual builder,
scripting or autonomous optimization. Shared gating consumes registered data;
Business predicates stay Business-local code. Small predicates have low/medium
effort and fact/implementation risks; the rejected arbitrary editor has high effort.
Code checks are not prompt-injection immunity: test poisoned arguments/results,
unknown facts, thresholds and tool/send bypasses with safe fixtures.

Sources: [OWASP secure enforcement](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html#secure-implementation-pipeline)
and [Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/).
They support external capability limits, not approval of every helper answer.

<a id="helper-first-ticket-suggestions-and-shared-answer-checks--2026-10-08"></a>

## TableCards helper and contact handoff

**Accepted 2026-10-09:** site-wide/cross-page Q&A, not Create-only. Answer from
assigned approved product knowledge/FAQ skills; offer relevant **customer-clicked
links** to known pages. The customer controls navigation; preserve auth, route
and unsaved-change safeguards. No guaranteed answer, project/account write,
automatic navigation or broad private lookup follows.

Provide minimal **BFF-validated sign-in state and current-account plan context**.
Use the selected account for multi-account users; stale/unknown remains unknown.
No-charge preview must not be presented as paid access. Browser claims of plan/
identity are not authority. No credentials, full sessions or private histories.
Suggest normal Google sign-in when relevant, not a new login method or gate for
general public Q&A.

**Help-first, not contact-first:** prefer a useful helper answer before a ticket.
Keep escalation/direct human request discoverable inside Help when the helper
cannot help or a user wants support; do not force a chatbot loop. Feedback should
be prominent and available **without using the helper**. “Help” is a reversible
public label, not a new department architecture or renaming requirement.
Business-branded support replies remain operator-approved and must not invent
a particular human author or falsely claim human review. A bot label is not
required on each operator-approved message. Future autonomous disclosure remains
an open issue, not permission to impersonate a human.

Proposed handoff prepares a short summary the customer can review. Signed-in
customers explicitly submit the shared form; signed-out customers choose the
configured support mail link and send their own draft. A click is not sent email;
opening a form is not a case. No silent ticket creation, automatic customer mail
or resolution claim. First contact still accepts broader questions/suggestions.

General product feedback, optional helper-answer usefulness and the closing
ticket survey are **different flows**. Exact helper feedback placement, page
facts/step/count summaries and additional context remain open. Prominent feedback
does not add an anonymous form; preserve the accepted intake channels.
Further saved TableCards project/product access is a possible later adapter,
not authorized merely by accepting sign-in/plan context.

Reuse a themed shared helper component/SDK so Businesses place/style it rather
than rewrite chat, provider access, errors, conversation handling and usage controls.
The existing React auth controls are a pattern, **not** an implemented helper.
Businesses still integrate the component and approved context; “drop in” does not
mean no setup or arbitrary automatic access. Other Businesses may choose no helper
or distinct per-page bots.

**Historical AI scope, 2026-10-08/09:** the earlier blanket MVP AI exclusion was
reopened. A minimal knowledge/current-page helper plus bounded automatic routine
ticket replies was Codex's initial middle recommendation (less manual work but
greater reliability/authority risk). Andrew instead chose helper answers plus
ticket **auto-suggest/drafts**, briefly requiring approval for every support tool/reply. The final typed
clarification makes permitted reads automatic and keeps only substantive replies
approval-gated. Account remedies remained excluded. Create-only TableCards exposure,
product-knowledge-only context and a required default helper/support pair were
superseded by site-wide Q&A, selected sign-in/plan facts and configurable roles.

<a id="ai-support-alternatives--proposed-mvp-scope"></a>

### Historical autonomy alternatives

| Alternative | Trade-off and outcome |
| --- | --- |
| Helper plus draft-only ticket assistance | Lower authority/risk but every substantive case reply needs an operator; selected |
| Helper plus bounded autonomous routine replies | More manual-work reduction, more accuracy/permission/send safeguards; initial recommendation withdrawn |
| Account/payment remediation automation | Highest authority/implementation burden; refunds, access overrides, membership/ownership/deletion/repair/deployment excluded |

Useful eventual evidence is a grounded answer or an appropriate handoff with
preserved context, not merely an AI reply, silence or guessed satisfaction.

## Programmatic context and registered tools

**Accepted 2026-10-08:** Businesses may supply context and tools **through code**,
not a management console. This revises an earlier fixed-tools-only proposal.

**Runtime comparison clarification, 2026-10-09:** evaluate the helper's backend
tools (permitted current-customer facts and assigned skill loading) together with
Business-provided client tools and their returned results, not chat storage alone.
Identity/plan facts may be supplied as trusted filtered context or retrieved by an
allowed server tool; a separate lookup every turn is not required. Runtime/library
convenience must preserve the registered client-handler bridge and server scope.
The completed runtime comparison incorporated this client/server distinction.

The page advertises available typed tool names/descriptions/argument schemas for
the current invocation; registered handlers stay in Business UI code. BFF/model
returns a structured request; the page validates its current allowlist/context,
executes its own handler and reports actual success/failure/decline, correlated
to the request. It executes **no generated JavaScript, shell or arbitrary code**.
Navigation uses permitted known destinations, not arbitrary generated URLs.

A backend action remains server-authorized for the actual user/account regardless
of what the page declares. Browser page/project IDs, context, tool descriptions
and claimed plans are hints, not trust grants. Sign-out/account/route changes must
not leave stale private context/tools available. Do not automatically send the
whole page, guest files, records or confidential implementation details.

Some tool actions may need customer confirmation depending on impact. Harmless
permitted helper reads/links need not inherit every support gate; first helper
write actions are **not selected** and TableCards's initial helper has none.
Typed call/result contracts, correlation, retries, duplicate/stale execution and
continuation need design/testing. Test invalid arguments, unregistered tools,
failure/decline, duplicate calls and route/account changes; never pretend success
because the model requested it.

Product data/tools remain Business-owned; shared SDK/runtime provides the protocol
rather than unrestricted remote execution or a plugin editor. Extensibility is
not approval for new backend permissions. Product-specific server handlers, if
later authorized, execute in the Business deployment, not through BFF imports;
current backend tools for scoped BFF facts/skill loading remain generic. Tool/schema/
route descriptions are Business-supplied data, checked against trusted approved
settings rather than accepting a browser's declaration as authority.
[Agent Skills conventions](https://agentskills.io/specification#progressive-disclosure)
do not supersede the handler/authorization rules.

<a id="conversational-operator-queue--accepted-capability-2026-10-09"></a>
<a id="current-build-operating-skills--scope-refinement-2026-10-09"></a>

## Conversational operator workflow

**Accepted capability, 2026-10-09; not built or run.** Andrew wants to say
“Review support” to Codex and receive a bounded queue overview: grouped similar
open cases, what bots are waiting to read/do/send, exceptions, recommended order
and concrete proposed decisions. Grouping never merges customer cases. Explain
scope/coverage, missing evidence, reasoning and who needs action rather than
dumping every record.

After explicit individual/bounded-group decisions, apply only the exact authorized
requests and report attributed per-item outcomes. This workflow uses the **same
secured BFF case/approval contracts as backoffice**, not direct database bypass,
another approval store or implicit approval because the skill inspected records.
Operator queue inspection is not permission for a bot to read operator-only data. Preview freshness,
stale requests and partial results follow the approval section.

The same skill reviews ratings/comments and participation alongside actual sent
answers, finds recurring topics/problems and recommends follow-up or content,
bot or product improvements. A resolved case with Partly/No can still require
review attention without automatically reopening. Deeper bot issues go into the
evaluation workflow. Low participation prompts review, not automatic discounts.

Andrew can use Codex; another operator, e.g. his mum, must **not** need Codex,
repository/terminal access or his engineering credentials. Backoffice remains
independently usable. A later conversational operator surface, possibly Dots
before Paperclip, could reuse these contracts/instructions under its own operator
identity. Integration/authentication and skill portability are unverified;
SKILL.md files are not automatically executable across products.
Conversational operator assistants cannot approve their own proposals or acquire
arbitrary shell/code/deployment tools. Reviews inspect effective bot, knowledge
and **policy** versions, not only a displayed name or stale configuration.

Useful operating/evaluation skills belong in the current build. Assess each
build's actual repeatable need and reuse existing workflows; do not create one
skill per build/bot mechanically. Runtime bot skills and Codex/operator skills
serve different users/authority. The
[operator CLI](../../tools/bff-operator/README.md) supplies a validated workflow
pattern, not existing ticket commands. No skill is created by this brainstorm,
nor a scheduler, new operator bot or company hierarchy required.

## Shared bot measurement

**Goal accepted 2026-10-09; exact signals/contracts open:** learn what all runtime
helpers/support/custom bots handle and how assistance can improve, without asking
for feedback everywhere or building a full analytics platform.

**Cost attribution deferred, 2026-10-09:** per-user/account/anonymous monetary
reporting returns to [Future Ideas](../../docs/architecture/future-ideas.md#per-user-and-per-account-provider-cost-attribution).
Existing account credit buckets/reservations and image jobs are not provider-dollar
ledgers. Keep diagnostic token/attempt evidence and bounded evaluation cost
comparisons, not live attribution. Provider-only limits and native-alert caveats
have one home in [spending limits](#quality-gates-and-spending-limits) and
[alerts](#budget-alerts-and-mock-delivery).

| Evidence class | Useful proposed signals | Do not infer |
| --- | --- | --- |
| Observed runtime/actions | Conversation/turn counts, permitted skill/tool use, actual tool outcomes, links offered/clicked, handoff stages, errors/latency/tokens, approved execution; cost comparisons in bounded evaluations, not a live spending report | Click ≠ mail sent; form opened ≠ case created; request ≠ tool success; no handoff ≠ resolution |
| Explicit customer/operator evidence | Choice/comment, user's actual stated agreement, draft accepted unchanged/edited/rejected, approval decision | Operator approval ≠ satisfaction/correctness; feedback on a human rewrite ≠ correct original draft |
| Inferred AI labels | Topic/category, possible confusion/frustration, recurring content gap, with unknown/uncertain/versioned labels | Inference is not a fact, entitlement, offer eligibility or permission |

Distinguish messages, conversations, cases and bounded bot runs; avoid double-counting
one customer outcome across retries/handoffs/bots. Keep Business/environment/bot/
version scope, measurement definitions, denominators, coverage/time and missing/
unknown evidence. All-Business summaries do not merge people. Tiny samples should
show counts/examples, not confident satisfaction trends.

Use actual runtime evidence and existing inexpensive calls or bounded review for
optional labels. Do not require an extra classifier call on every message or
give it extra data access. A quote can capture explicit agreement; detecting
frustration/acceptance from text remains fallible. Optional quiet helper feedback
may belong after an answer/exchange; exact question, placement and timing remain
open, not compulsory popups or every-message surveys.

The Astra batch proposes quiet feedback on the latest helper exchange, dismissed
when the next begins, as an adjustable UX default. Report positive feedback among
respondents **and** respondents per feedback opportunity; draft acceptance among
reviewed drafts; tool success among executed attempts; case creation among relevant
handoffs. Include unknowns/coverage and distinguish active latency from operator
waiting. Ratings/edits must identify the actual answer/version seen, not credit an
original bot draft for a human rewrite. Approval pauses and denied admission are
observations too, not merely successful model calls.

Review a bounded authorized/redacted sample of Q&A, actual answers and outcomes
with sources/config versions. No indiscriminate raw prompts/tool results/traces,
guest documents or copied private conversations in repo. Exact collection,
notices, lifetimes/access/deletion must pass the minimum privacy boundary.
Hosted trace upload and automatic knowledge publication are not accepted.

Operator review connects counts/themes/feedback/edits/rejections to concrete
examples, then recommends changes; evaluation checks improvements against known
facts and boundaries. Product shortcomings despite an accurate answer differ
from bot error. Evidence should guide collaboration, not automatically train,
change permissions, send offers or declare users satisfied.

<a id="customer-feedback--goal-accepted-format-open-2026-10-09"></a>
<a id="astra-feedback-review--proposed-2026-10-09"></a>

## Customer feedback survey

**Accepted 2026-10-09 after Astra consultation:** balance useful learning with
likelihood customers respond—not merely easy implementation. Ask **“Did you get
the help you needed?”** with **Yes / Partly / No**. One tap from the email opens
a tiny Business-branded page with the choice preselected and changeable; a second
explicit **Send feedback** action submits it. No login/required typing; optional
comment, especially “What was missing?” for Partly/No. Do not add another required
question or a new survey platform.

Include an invitation in **each operator-approved closing reply initially**.
A closing reply after reopening may invite again. This supersedes Astra's earlier
once-per-case proposal. Do not invite in receipts, holding updates or information
requests; resolving without a closing reply does not add a survey-only email.
No reminders, incentive experiment, discounts or automatic follow-up are accepted.

Submitted ratings/comments create **review signals**, not status changes.
Actual customer email replies still reopen by the normal rule. Silence is unknown,
not satisfaction; rating is not proof the answer was correct. Link feedback to
the actual **sent** answer and invitation, not just a case or earlier bot draft.

Proposed record details: Business/environment/case/invitation/sent-message,
question/config version, chosen answer, optional comment and time. Prefer one
current response per invitation with explicit updates/deduplication; exact fields,
expiration, replay/update policy and storage remain open. Old links must refer
to the old answer, not accidentally rate a later response. Forwarded links are
not verified customer identity; do not award authority from them.

Opening a link/GET must not submit/consume feedback, reopen the case or mutate
state. Email scanners can open URLs: count only an explicit submission, not link
opens. [HTTP safe-method semantics](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.1)
and [Safe Links behavior](https://learn.microsoft.com/en-us/defender-office-365/safe-links-about)
support this design; confirmation does not prove every scanner incapable of
submitting. A narrowly scoped invitation token grants no account/history access;
URL/page reveal no email, private case text or internal notes. Comments are
untrusted customer content, not instructions or automatically approved knowledge.

Show responses against invitations with delivery-failure context. Low **response
rate** differs from low ratings; neither silence nor tiny sample percentages
justify a confident conclusion. Inspect concrete Partly/No/comments, unexpected
positive answers, edits and cases with no response as appropriate. The operator
skill groups feedback/recurring issues and recommends follow-up; deeper failures
become sanitized eval cases. Any send/reopen/change still needs its own authority.

**Historical alternatives:** “Was this helpful?” via email reply was simple but
required typing and
reopened the case; two Helpful/Not helpful buttons had lower input friction but
less nuance. Astra's selected Yes/Partly/No outcome plus optional comment better
captures partial help and actionable gaps. The accepted flow counts explicit
submissions, not opens. Frequency and status were subsequently settled as above,
not left open.

The original Astra proposal also suggested skipping spam/duplicates and
acknowledgement-only suggestion exchanges, applying eligibility equally to
difficult and positive outcomes rather than seeking praise. These remain dated
proposal considerations, not added accepted eligibility rules; the once-per-case
cap was superseded. A genuine “Did that work?” request can use ordinary
conversation/Waiting for customer, but do not manufacture support messages just
to obtain survey data.

## AI runtime and model choices

**Research checked 2026-10-09; AI SDK direction accepted, models not selected;
nothing installed or tested.**
Separate model/provider inference, agent runtime/state and evaluation. Existing
Cloudflare image use selects none of the text/runtime alternatives.

**Current accepted direction, 2026-10-09:** Andrew accepts the shared AI SDK
model/tool layer with existing Convex storage and event-triggered jobs, separate
helper-chat and support-ticket workflows, and AI SDK UI for helper chat. Keep
generic configuration/knowledge-loading/tool/evaluation machinery and application
authority shared, while Business-specific definitions/content/fixtures are
Business-owned data/settings or Business-local code. Keep provider caps in provider
configuration without introducing a
general-purpose bot or specialist-routing framework. Support history remains
the canonical ticket record. This supersedes the unaccepted recommendations and
reopened runtime preferences below; it does not approve implementation or schema.

The concrete UI fit is `useChat` message/stream/loading/error state plus typed
tool-call/result handling: server executes permitted backend tools; the browser
runs registered handlers and returns correlated results. Visual **AI Elements**
components are optional, not a fixed interface or a required wholesale adoption.
Convex transport/persistence, reconnect behavior, scoped authorization and durable
operator approval remain our integration responsibilities; browser history or
approval messages do not become server authority. LangChain also offers client
tools, so this is useful ready-made functionality versus hand-building it, not a
demonstrated unique advantage over every alternative or a performance benchmark.

Do not use **HarnessAgent** for these customer bots. That optional abstraction
integrates complete runtimes such as coding agents with their own sessions,
workspace/tools and permissions; it is not required by AI SDK Core or UI.
Sources: [chat tool handling](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage),
[UI state](https://ai-sdk.dev/docs/ai-sdk-ui/overview),
[transport integration](https://ai-sdk.dev/docs/ai-sdk-ui/transport),
[optional visual components](https://elements.ai-sdk.dev/),
[harness distinction](https://ai-sdk.dev/docs/ai-sdk-harnesses/overview).

### Historical runtime comparisons — resolved direction, untested integrations

Andrew briefly preferred Convex Agent, then questioned whether conversation/
streaming savings justify its coupling; avoiding a table is not enough. The
focused Astra review recommended AI SDK + Convex; the LangChain/LangGraph extension
reached the same narrow maintenance judgment. Andrew subsequently accepted AI SDK.
These are not benchmarks or new selection questions.

| Candidate | Distinct benefit and integration trade-off |
| --- | --- |
| Convex Agent | Ordered intermediate messages, persisted approvals/continuation and reconnectable database streams. Internal execution records need not duplicate the ticket history. Configuration, scope, bounded work, draft ownership and reliable mail remain ours; Agent is not Workpool/Workflow durability. Reconsider if continuation or firm reconnectable streaming outweighs coupling |
| AI SDK + application-owned state | Narrow shared model/tool and UI bridge; our restricted durable checkpoints/continuation and Convex transport need implementation. Same bot definitions/evaluations for helper/support; no generic agent engine or hybrid by default |
| LangChain/LangGraph | Real durable interrupts and headless browser tools without mandatory LangSmith hosting; custom frontend transport possible. Needs a conforming Convex checkpointer (none official found), not a JSON field. Interrupts restart their node: claims/idempotency still needed. Reconsider if a dependable saver or substantial recoverable branching changes the trade-off |

Both libraries need current authority, capped work, stale page/account and
request/result binding. Preference assumes our restricted continuation stays
smaller than a general checkpointer; no proven performance/context-management or
universal ease advantage. The first review compared Convex Agent, not every JS
library. No established need for RAG, specialists or complex autonomous workflows.

Agent 0.7.7 source at commit `3fa5ad7` was checked; examples/APIs still need
implementation reconciliation. Thread/message APIs support investigation but do
not own Business/environment/session permissions. Model-context denial cannot
replace durable pending-ID revocation or exact BFF send authority. Every option
needs supported tool-call/result checkpoints, not visible chat alone.

Sources: [AI SDK overview](https://ai-sdk.dev/docs/agents/overview),
[Convex pricing](https://www.convex.dev/pricing),
[pinned approvals](https://github.com/get-convex/agent/blob/3fa5ad77e12323b8b82e64fb36a86c1d951cf237/src/approvals.ts),
[continuation](https://github.com/get-convex/agent/blob/3fa5ad77e12323b8b82e64fb36a86c1d951cf237/src/vercel/client/prepareApprovalContext.ts),
[context mapping](https://github.com/get-convex/agent/blob/3fa5ad77e12323b8b82e64fb36a86c1d951cf237/src/vercel/mapping.ts),
[Agent workflows](https://docs.convex.dev/agents/workflows),
[AI SDK tools](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling),
[LangChain overview](https://docs.langchain.com/oss/javascript/langchain/overview),
[checkpointers](https://docs.langchain.com/oss/javascript/langgraph/checkpointers),
[interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts),
[headless client tools](https://docs.langchain.com/oss/javascript/langchain/frontend/headless-tools),
[AI SDK client tools](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage).

Future Node tooling is not a drop-in replacement for Convex persistence,
scheduling, subscriptions or authority; those adapters/records need migration.
Direct inference and Convex resources are separate charges; its optional gateway
is not required. No Node migration, installation or setup follows.

**Execution clarification, 2026-10-09:** Andrew is concerned about an always-running
loop or recurring schedule that scans for pending work. The proposed processing
pattern is event-driven: persist a message and dispatch a bounded drafting run;
save its reply suggestion and stop. An approved reply dispatches deterministic
email work, not another support model run. Helper client-tool results may resume
bounded helper work. No
regular polling of pending cases is assumed. Helper Q&A and ticket support remain
separate roles; the spoken phrase “helper handling a ticket” was incorrect.

Convex's [durable scheduler](https://docs.convex.dev/scheduling/scheduled-functions)
already supports queued one-time work. [Workpool](https://www.convex.dev/components/workpool)
adds pooled concurrency limits and configurable retries; [Workflow](https://www.convex.dev/components/workflow)
is a separate candidate for durable multi-step orchestration. Neither is installed
in the inspected BFF configuration. Consider native primitives/components before
inventing a polling queue or adding external infrastructure; no component selected.
Queued actions are not automatically retried by the native scheduler, scheduling
does not propagate caller authentication, and a queue does not provide approval,
exactly-once email or spend safety: validate scoped current authority and apply the
separately agreed retry/idempotency policies at execution. “Small loop” refers only
to bounded model/tool steps inside a run, not an indefinitely executing process.

| Runtime candidate | Capability / repository fit | Work and risk still to validate |
| --- | --- | --- |
| Application-owned TypeScript loop + AI SDK in existing BFF | Shared model/tool interface; BFF owns durable actions, history, scheduling and approval authority | Medium application work for pause/history/streaming/checkpoints; risk of rebuilding a framework. Portable logic does not make future storage/auth migration free |
| Convex Agent + AI SDK | Saved threads/messages, streaming, opt-in persisted tool approval; convenience near existing BFF | Business authorization, substantive-send gate, exact preview, frontend tool bridge and adapters are ours; compare storage/runtime coupling |
| Cloudflare Agents | Durable Object state/chat, human-in-the-loop/client-tool patterns | Another hosting/state boundary beside BFF cases; identity/thread consistency and ownership; Workers AI inference does not require it |
| OpenAI Agents SDK | Application-run tools/handoffs with deployment/integration control | Persistence/approval integration still needed; not synonymous with OpenAI's separate hosted Agents API |

Sources: [Convex overview](https://docs.convex.dev/agents/overview),
[threads](https://docs.convex.dev/agents/threads),
[tool approval](https://docs.convex.dev/agents/tool-approval),
[Cloudflare state](https://developers.cloudflare.com/agents/runtime/lifecycle/state/),
[human-in-the-loop patterns](https://github.com/cloudflare/agents/blob/main/docs/agents/human-in-the-loop.md)
and [OpenAI runtime choices](https://developers.openai.com/api/docs/guides/agents).
Relative integration effort is our repository-specific inference, not a vendor
benchmark. Package/model/tool/structured-output compatibility remains to test.

**2026-10-09 Astra batch recommendation:** prefer the small application-owned loop
for Andrew's coupling boundary, conditional on exact pause/resume/provider support;
Convex Agent remains a credible convenience alternative if it removes substantial
maintenance. This refines the earlier unselected Convex-convenience recommendation,
not an accepted runtime switch. OpenAI Agents SDK is an alternative loop library,
not another required platform. Cloudflare inference needs no Cloudflare agent store.

[AI SDK approval documentation](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
uses `toolApproval` in current guidance; provider-executed tools bypass its local
approval flow. Support therefore needs allowlisted tools under server-enforced
scope and policy, not a hosted tool that bypasses those controls. Initial permitted support reads are automatic under scoped authorization;
every substantive reply still needs the exact operator send decision. Later action
tools need separately accepted authority.
Saved state/approval facilities in the [OpenAI Agents SDK](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals)
are possibilities to validate, not substitutes for BFF authorization/send gates.

**Accepted cheap-model constraints:** live helper/support use inexpensive
models only. **Sol and expensive escalation/fallback are excluded**, including
fallback caused by customer text, bot difficulty or errors. Customers simply
chat: no model/provider/reasoning-tier selector or override; trusted per-bot
configuration selects allowed inexpensive candidates. No automatic provider
switch/multi-provider fallback is approved. Failed quality/limits should produce
an honest limited/unavailable answer or existing handoff, not expensive inference.

Dated standard short-context text rates, USD per million tokens:

| Model | Uncached input | Output | Status |
| --- | --- | --- | --- |
| GPT-6 Luna | $0.10 | $0.50 | Cheap first eval candidate, not winner |
| Cloudflare GLM-4.7-Flash | $0.0605 | $0.400 | Hosted candidate, compatibility/quality open; individual model-page precision, central pricing rounds to $0.060 |
| Cloudflare GPT-OSS-20B | $0.200 | $0.300 | Hosted candidate, compatibility/quality open |
| GPT-6.1 Sol | $2.00 | $10.00 | Excluded live model; comparison only |
| GPT-6 Astra | $10.00 | $50.00 | Excluded from cheap live direction; separate Codex consultations are not customer runtime |
| GPT-5.6 Terra | $2.00 | $12.00 | Andrew raised it; price does not fit cheap shortlist when Sol is already too expensive; not selected/tested |

Sources: [OpenAI catalog](https://developers.openai.com/api/docs/models),
[pricing](https://developers.openai.com/api/docs/pricing),
[Terra page](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
and [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).
Recheck before choosing/configuring; account access is not established. Cached
input/cache writes, long context and other modes may differ; not a monthly
subscription or measured bill. Cheap hosted open-weight models remain candidates,
not a requirement to self-host or use the strongest model.

The Astra batch favors a later comparison of Luna and GLM first, adding GPT-OSS-20B
only if useful. [Luna's model documentation](https://developers.openai.com/api/docs/models/gpt-6-luna)
specifies Responses for the tool path; Chat Completions function calling requires
`reasoning_effort=none`, while default reasoning is medium. Explicit compatibility/
reasoning settings and billed usage matter even for cheap models. The more precise
GLM rate above comes from its [individual model page](https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/);
neither pricing nor advertised function support establishes a quality winner.

Input includes instructions, tool definitions, history, skills and tool results;
output includes answers, arguments and billed reasoning even when hidden.
Multiple calls/steps/retries contribute to one customer turn. See
[usage/cost observability](https://developers.openai.com/api/docs/guides/agents-api/observability).
Illustration: 5,000 uncached input + 500 total billed output costs $0.00075 on
Luna or $0.015 on excluded Sol; 10,000 such **calls** cost $7.50/$150. This
excludes cache writes, extra calls, tools, hosting and other fees; it is not
10,000 conversations or a guarantee of 500 reasoning/output tokens.

Workers AI's server-authenticated REST endpoint can be called from Convex without
Cloudflare Agents/Durable Object conversations; the image adapter cannot be used
unchanged as text inference. See [GPT-OSS example](https://developers.cloudflare.com/workers-ai/models/gpt-oss-20b/).
The account's 10,000 free Neurons/day are not tokens or a per-Business allowance,
and existing images consume allowance. Workers Paid above it is $0.011/1,000
Neurons. Nominal price is not cost per successful task or a hard abuse cap.
[AI Gateway routing](https://developers.cloudflare.com/changelog/post/2026-05-21-rest-api/)
to third-party models is different from Cloudflare hosting, not inherently cheaper.

**Accepted practical portability:** Andrew values Convex convenience now but
may prefer ordinary Node.js later if justified. Keep bot definitions, skills,
evaluation fixtures and provider-facing logic separate where practical from
Convex persistence/scheduling/approval APIs. Evaluate coupling before component
selection. Do not build a generic portability framework, parallel database or
replacement transaction engine. No Node migration, backend replacement or
runtime choice follows. Explain actual boundaries in the final review.

## Evaluation and improvement workflow

**Capability proposed/accepted through refinements 2026-10-08/09; execution
explicitly deferred by Andrew:** run during later agreed build work, **not now**.
Codex authors/maintains/tests the bots so Andrew need not do routine analysis.
This is an on-demand review-and-improve workflow, not automatic retraining,
fine-tuning, publishing, new management system or a scheduled company analyst.

Keep approved TableCards factual Q&A/reference sources separate from test
questions/expectations. Hold out cases from tuning; never give runtime bots the
answer key. Grade meaning/required behavior, not exact sentence matching.
The runner and generic security/state tests are shared; Business Q&A, product
expectations and realistic fixtures live with that Business and are supplied as
test data, not TableCards branches/answer keys in shared runtime code.
Repeat representative shared-boundary and per-bot cases across cheap candidates:

- Normal documented questions and useful unknown-answer/clarification cases;
  unsupported features and wrong assumptions must not be invented away.
- Human everyday language, relevant customer language, paraphrases, typos and
  follow-ups without our entity names/jargon: e.g. “I have all the names in a
  spreadsheet—what do I do next?”
- Ambiguous, rambling, contradictory, frustrated and mixed/multi-issue requests.
  A clarification or honest “I don't know” can be the good answer.
- Permitted skill selection/loading, sign-in/selected-account plan/preview truth,
  correct handoff and structured registered tools with actual results.
- Business/account/bot isolation, internal/other-customer disclosure attempts,
  fake identity/plan claims and instructions to bypass approval.
- Approval pause/deny/expire/resume, changed requests, duplicate execution,
  unregistered/invalid tools, stale page/account context and send-time gates.
- Repeated/oversized requests, all-call token/step/retry/concurrency/admission
  spend controls and controlled failure with no costly escalation.

### Production failures and regression results

**Accepted 2026-10-09; connect during planning, execute during authorized build:**
an observed production miss can become a sanitized, reproducible Business-owned
test with expected behavior and synthetic context/tool fixtures. Preserve the
failure signal without copying private customer conversations into the repository.
Reproduce the old behavior when practical; model variability can prevent an exact replay.
After an authorized fix, test the new case and **rerun all saved evaluation sets**,
including helper/support cases and shared boundary tests—not just the failing case.
Report improvements and regressions, tested model/config/skill versions, case
counts and incomplete runs honestly; a budget-limited run is not a full pass.
Known regression/tuning cases remain distinct from genuinely held-out questions.
No automatic retraining, publishing, permission expansion or deployment follows.

**Storage proposal, not a selected service/schema:** versioned Business test cases
and dated Markdown summaries plus machine-readable JSON results; the runner is
shared. Planning defines integration, locations and report fields. No extra
evaluation table, hosted service, paid tests or dataset creation is authorized now.

### Realistic development seed

**Decision accepted 2026-10-09; create during later agreed implementation/testing,
not now:** provide repeatable synthetic customers/accounts, tickets/conversations
and meaningful events saved in the development environment. Andrew should be
able to browse a realistically populated backoffice; applicable integration tests
and bot evaluations should exercise actual scoped records and relationships,
not only static screen mocks or isolated Q&A strings. Use the existing validated
development provisioning patterns where applicable; new support/event seeding
is not an existing capability or an approved schema change.

Ask **Astra during that implementation/testing work** to help author realistic
histories and natural customer messages, including messy follow-ups and varied
outcomes, grounded in actual TableCards features and account/plan behavior.
Believable chronology and linked records matter, not just filling every field.
Realistic Business scenarios/fixtures remain Business-owned; a shared seed runner
accepts validated development data rather than hardcoding product stories.
Keep evaluation expectations separate from the context supplied to runtime bots;
use both representative seeded cases and independent held-out questions.

Use clearly identified synthetic data, not production customer copies or real
credentials. Development-only setup must avoid unintended external mail or paid
AI calls. Intentional model evaluations still need their separately bounded,
authorized run budget. Keep seeding repeatable and scoped without replacing
unrelated development data. No dataset authoring, Astra consultation, database
write, evaluation run or new seed tool is started by this decision.

### Quality gates and spending limits

Behavioral grading complements **deterministic authorization/state assertions**.
A good answer score or LLM grader cannot prove boundaries or future correctness.
Report important failures, latency and **whole-task cost** including retries/tool
steps/reasoning, not just averages or nominal token rates. Exact pass thresholds,
caps, release criteria and compatibility checks remain open.

Enforce model allowlists and request/input/context/generated/reasoning/output/
tool-step/retry/rate/concurrency limits in code, including signed-out use. Route
every live call through the configured provider/gateway safety caps; native alerts
inform Andrew but do not enforce limits. No application monetary reservation
system or expensive fallback. The following per-request numbers remain unaccepted
engineering proposals, not permission to spend or run evaluations now.

**Astra batch quality/cost proposal:** repository-owned local tests plus bounded
Codex review, using existing test tools. A local eval framework can help if repeated
comparisons justify another dependency; hosted eval/tracing adds vendor/data/cost
boundaries. Do not begin a new dependency on OpenAI's hosted Evals platform: official
[deprecation guidance](https://developers.openai.com/api/docs/deprecations#2026-06-03-evals-platform)
states read-only on 2026-10-31 and shutdown on 2026-11-30. This does not prevent
our own evaluation runner from calling an allowed model later.

Proposed starter suite: 60 held-out cases (20 ordinary, 20 messy/multi-turn/unknown,
20 adversarial), plus repeat 10 sensitive cases three times. Approved reference
facts, tuning cases and held-out cases remain separate. Once a held-out failure is
used for tuning, add fresh independent cases. These small samples do not prove
production correctness or statistically reliable satisfaction.

Proposed release thresholds: all deterministic authorization/state/cap assertions
pass; **zero observed critical privacy, unauthorized action/send, invented authority
or expensive-fallback failures**; at least 95% acceptable answers overall and 90%
in each noncritical cohort, listing residual failures. Honest relevant clarification
can pass; blanket refusal cannot inflate quality. Compare whole-task cost and active
latency/tails with the prior version. Better scores never enable autonomy.

| Adjustable starting cap — not selected | Helper turn | Support draft job |
| --- | --- | --- |
| New-message characters; no silent factual truncation | 4,000 | 12,000 |
| Full input per model call, including history/skills/results | 8,000 tokens | 12,000 tokens |
| Billed generated tokens per call, including reasoning | 2,000 | 3,000 |
| Total provider attempts, including at most one transient retry | 4 | 6 |
| Permitted read-only skill/tool operations; no operator pause | 4 | 6 |
| Concurrent jobs per conversation/case | 1 | 1 |
| Evaluation target for estimated complete turn/job cost, not an app dollar counter | $0.01 | $0.03 |

Counters survive approval waits/resumes. Proposed admission defaults: anonymous
6 turns/minute and 20/hour/session; authenticated 10/minute and 60/hour/user, with
account/Business aggregate gates. Sessions are bypassable; cautiously bound network
bursts without treating shared networks as one person or adding a fingerprint store.

**Live text spending boundary selected 2026-10-09:** Andrew asks for round caps
of **$3/day and $30/month**, combined across all Businesses' live helper/support
text-model calls, not separately per Business or provider. **Later revision:**
enforce those safety caps through provider/gateway settings, not new application
tables or a spending dashboard. Route all calls/retries through that boundary and
handle rejection without losing messages, drafts or ordinary support contact.
[Cloudflare AI Gateway limits](https://developers.cloudflare.com/ai-gateway/features/spend-limits/)
cover routed known-price requests and are eventually consistent: concurrent calls
may exceed the threshold before usage records settle, and direct calls bypass it.
Verify supported prices/reset windows at setup; no exact application reservation
or provider-invoice accounting is promised.
This replaces Codex's unaccepted $1/day–$20/month and $1.50/day–$25/month proposals;
the briefly mentioned $5/day was discarded. Images, email, hosting and evaluations
are separate charges, not implicitly included or newly authorized by these caps.

Andrew allows a **separate, higher bounded budget for deliberately started testing/
evaluation**, since comparison suites can need more calls. No exact evaluation
allowance is selected here: establish a run-specific limit before an authorized
run and report actual usage. Customer requests cannot select that mode or consume
its allowance. This does not authorize evaluations now, unlimited testing or
expensive live fallback. The existing image budget is not a text-bot allowance.

The former atomic application money-reservation proposal is superseded. Verify
the chosen provider/gateway actually blocks further model requests, rather than
mistaking an alert setting for a cap. Keep bounded calls/concurrency and no bypass;
provider enforcement can lag concurrent requests. At a limit, preserve submitted
messages, explain limited availability and keep direct support intake reachable;
do not auto-send, auto-raise the cap or escalate to an expensive model. No separate
live monetary accounting/reporting system is included.

On demand, review a **bounded, authorized, sanitized** sample of real Q&A/ticket
drafts/outcomes once collected; compare versions, costs/latency and relevant
failure examples. Separate review-only from an explicitly requested improvement
run, record changes and apply the [full regression workflow](#production-failures-and-regression-results)
before authorized release. The new production-failure case and all saved evaluation
sets must be rerun; unrelated documentation edits need only prose/link checks. Use harmless synthetic confidential fixtures for disclosure tests and
poisoned tool inputs/results, unknown facts and policy thresholds for enforcement.
Do not silently broaden knowledge/tools, activate auto-send or copy private chats
to repo. Accepted/edited drafts and ratings are evidence, not proof of correctness.
Generalized guidance and sanitized tests are safer durable learning than copied
customer conversations.

Sources: [agent eval guidance](https://developers.openai.com/api/docs/guides/agent-evals),
[evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
and [developing tests](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests).
Vendor example thresholds, hosted private trace upload and a paid eval service are
not selected. No separate search/vector/MCP infrastructure by default.
Unrelated documentation changes need prose/link checks, not paid model runs.

### Budget alerts and mock delivery

**Current revision 2026-10-09 — provider configuration only:** Andrew removes the
earlier current-build mock budget-alert delivery requirement along with application
spending counters/dashboard. Native provider notifications are sufficient; after
briefly declining billing alerts, he confirms that a daily alert is fine. Do not
build a custom poller, notification transport, alert table or Telegram integration
to reproduce provider billing functionality. General Telegram delivery remains
separate [Monitoring](../../docs/factory/mvp-delivery-plan.md#build-6--technical-monitoring-and-alert-delivery)
scope, not a dependency for these provider-native notices.

**Purpose and desired thresholds:** the existing $3/day/$30/month caps guard
against runaway bugs, not normal spending targets. Andrew wants awareness around
50% and 80% so he can investigate before AI becomes unavailable. Configure native
alerts where their supported scope/windows fit; daily/delayed notices are acceptable
and are not guaranteed to arrive before the daily cap. Do not silently add an
application system to achieve exact thresholds. Never auto-raise caps.

**Official-source check 2026-10-09:** Cloudflare's
[native billing budget alerts](https://developers.cloudflare.com/billing/manage/budget-alerts/)
are account-wide usage-based dollar thresholds over its billing period, email
notifications, not caps or AI-only daily gateway rules. Its
[billing alert changelog](https://developers.cloudflare.com/changelog/post/2026-06-15-budget-alerts-default-on/)
describes prior-day processing. These alerts cannot be represented as an exact
50/80% live-text early-warning service. Verify the account's actual supported
options and distinguish billing alerts from gateway caps at later setup. No
provider settings, recipients or paid tests have been changed.

<a id="shared-email-research--recommendation-not-selected-2026-10-09"></a>

## Email identities, provider research and responsibilities

**2026-10-09:** distinct public contact addresses per Business and avoiding a
custom-domain slot solely for development are accepted. **Resend send/receive and
Cloudflare-regenerated image-only previews selected 2026-10-09**, after security
and cost discussion and Andrew's request to record and continue. No original
downloads or unsupported file access. This is a design decision, not setup,
purchase, tested security or production permission. Exact subdomain address shape
remains recommended; exact format/size/processing contracts belong in final review.

**Preference reaffirmed 2026-10-09:** one email provider for sending and receiving,
not Resend outbound plus another inbound merely for scanning. Cloudflare image
processing, if chosen, is not another email provider. SES for all mail is an
alternative, not an assumed two-provider hybrid.

Recommend one managed production provider account initially for our own small
Businesses, with BFF routing/limits and retained case ownership. Shared provider
accounts share quotas/reputation, not full isolation; leave a path to split
accounts when volume/risk/ownership warrants. Keep credentials from customers/
bots. [Resend multi-tenant guidance](https://resend.com/docs/knowledge-base/setting-up-resend-for-multi-tenants)
is the source, not a provider-neutral isolation guarantee.

### Provider alternatives and dated capacity

| Provider / plan | Price and allowance checked 2026-10-09 | Relative work / constraint |
| --- | --- | --- |
| Resend Free | $0; 3,000 sent+received emails/month, 100/day, 3 verified domains, 1 webhook, 30-day provider retention | Lowest relative integration effort; domain/day/callback limits may bind before monthly volume |
| Resend Pro | $20/month; 50,000 emails, 10 domains, 5 webhooks, no daily quota cap | Shared account limits; no upgrade authorized |
| Pro + domain add-on | Additional $20/month adds 100 slots: **$40 total**, 110 domains, still 50,000 emails | More domain slots do not add email allowance |
| Resend Scale | $90/month; 100,000 emails, 1,000 domains; add-on also available | Growth option, not a purchase |
| Postmark Pro at 10,000-email tier | $16.50/month; inbound processing, 10 sending domains; Free 100/month testing | Medium integration work; do not assume $15 Basic includes inbound |
| AWS SES à-la-carte | $0.10/1,000 outbound + $0.10/1,000 inbound, plus data/chunks/other services | Higher setup/operations; region-limited receiving/receipt rules, not separate Mail Manager pricing |

Sources: [Resend prices](https://resend.com/pricing),
[sent/received quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits),
[Postmark prices](https://postmarkapp.com/pricing),
[SES prices](https://aws.amazon.com/ses/pricing/) and
[SES receiving](https://docs.aws.amazon.com/ses/latest/dg/receiving-email.html).
No evidence here proves one vendor's superior deliverability for our audience.
Provider history/retention is not BFF's lifetime policy. Validate account approval,
current limits, overage settings and account defaults; public prices do not prove
default overage behavior. Inbound junk consumes quota even if BFF drops it.
Exceeding a domain limit does not automatically change a plan.

Resend is selected for one send/receive API with BFF-owned cases:
[custom-domain receiving](https://resend.com/docs/dashboard/receiving/custom-domains)
and [receiving webhook setup](https://resend.com/docs/dashboard/receiving/create-receiving-webhook).
Postmark can feed the same architecture. The earlier cost-only recommendation
against SES is qualified by the later malware requirement: its verdicts may
justify additional operations, but Andrew has not chosen it.

### Historical whole-provider comparison — returned 2026-10-09

Six candidates were researched against domains, sending/receiving, attachments,
retries, development, privacy and total maintenance. No verified candidate combines
a simple/free pilot, trustworthy malware verdicts and negligible integration work.

| Candidate | Distinct findings beyond the capacity table |
| --- | --- |
| Resend | 24-hour exact-key retry protection; receiving AV verdict unconfirmed. Metadata/renewable downloads fit bounded ingestion; shared-team suppressions |
| Postmark | Platform $18/10,000 adds unlimited sending domains. Explicitly no send idempotency key; SpamAssassin does not inspect attachments. Inbound base64 must be captured reliably; later API content can truncate |
| Mailgun | Free one domain/one route; Basic $15/10,000 still one domain; Foundation $35/50,000 supports 1,000 domains. US/EU service regions. AV verdict/general send deduplication not established; complete receiving bill treatment needs confirmation |
| Brevo | Free 300 sends/day; Starter from $9/5,000. Different receiving domain required from sending. Complete inbound price/limits and AV verdict unqualified; batch duplicate protection 30 minutes, not Resend's replay contract |
| SES | One send/receive provider with default-enabled scan and PASS/FAIL/GRAY/PROCESSING_FAILED notifications; app enforces access. Private S3/event adapter/MIME processing required; general send idempotency not established. New account/region default Essentials differs from explicitly chosen à-la-carte pricing |
| Forward Email | Advertised $3/month, unlimited domains and included ClamAV are promising, not qualified: trusted scan/error verdict, hosted fail-closed behavior and applicable service/privacy contract need verification. Scanner source can continue without AV when unavailable |

Sources: [Postmark prices](https://postmarkapp.com/pricing),
[no idempotency](https://postmarkapp.com/support/article/what-is-an-idempotency-key),
[spam-filter limitations](https://postmarkapp.com/support/article/understanding-spamassassin-and-inbound-spam-filtering-in-postmark),
[Mailgun prices](https://www.mailgun.com/pricing/),
[Brevo inbound](https://developers.brevo.com/docs/inbound-parse-webhooks),
[Brevo batch keys](https://developers.brevo.com/docs/heterogenous-versions-batch-emails),
[SES verdicts](https://docs.aws.amazon.com/ses/latest/dg/receiving-email-notifications-contents.html),
[Forward Email](https://forwardemail.net/en/private-business-email),
[scanner caveats](https://github.com/spamscanner/spamscanner).
CloudMailin's integrated scanning price is unpublished; standalone AttachmentScanner
starts at $99/month, not a verified cheap included feature.
[Scan contract](https://docs.cloudmailin.com/features/virus_scanning/),
[scanner prices](https://www.attachmentscanner.com/plans-and-pricing).

**Historical finalists, before the later Resend selection:** Resend for all mail with bounded freshly regenerated
PNG/JPEG previews via managed Cloudflare Images and no original access; or SES for
all mail with trusted malware verdicts and restricted file handling. First favors
integration simplicity, not an antivirus guarantee; second favors scan evidence
but adds AWS operations. Missing/error scan results withhold files, and clean scans
still do not authorize arbitrary document rendering/downloads. Andrew subsequently chose the first protection/maintenance trade-off; it is not
an outstanding choice or a two-email-provider requirement.

Illustrative SES à-la-carte subtotal: 300 outbound + 200 inbound/month averaging
four billed chunks each is $0.122 before outbound data, S3/events/compute/transfer/
logging—not an all-in quote or Mail Manager's separate $50/month ingress.
Cloudflare transformation is unconfigured and has execution/storage costs.

**Image-preview costs checked 2026-10-09:** Images Free includes 5,000 unique
transformations/month; exceeding it fails new transformations rather than charging
or exposing originals. Paid overage is $0.50/1,000 after the first 5,000: one size
for 1,000 images is $0 transformation usage, 10,000 is $2.50 on Paid. Worker Free
allows 100,000 requests/day with 10 ms CPU/invocation; Paid starts at $5/month.
The processing design must fit the free limits before promising a free Worker.
Storage/operations remain separate: if R2 Standard is chosen, 10 GB-month storage
plus bounded operations are included; existing account usage consumes allowances.
This does not select R2 or Cloudflare-hosted Images storage. A small pilot may fit
free tiers, not a guaranteed all-in $0 quote. No upgrades or configuration authorized.
Sources: [Images pricing](https://developers.cloudflare.com/images/pricing/),
[Worker pricing](https://developers.cloudflare.com/workers/platform/pricing/),
[R2 pricing](https://developers.cloudflare.com/r2/pricing/).

Provider retention/residency differ from BFF policy: Resend documents US storage
and 30 days despite selectable sending region; Postmark US/45 days; Mailgun US/EU
regions; Brevo EU database locations. Confirm actual terms at selection.
[Resend security](https://resend.com/security),
[Postmark retention](https://postmarkapp.com/support/article/how-long-are-inbound-and-outbound-messages-stored-in-activity),
[Brevo storage](https://help.brevo.com/hc/en-us/articles/360001005510-Data-storage-location).
Prefer no-send development fixtures; vendor sandbox modes can still consume quota.
Preserve ingested messages while blocking files, but an entire oversized email
rejected upstream may never reach BFF. Precise Resend inbound size/Brevo receiving
limits remain unestablished; do not infer them from outbound allowances.

### Addresses, subdomains and future moves

Address = purpose@domain; multiple local names are not separately paid staff
mailboxes. A subdomain needs no separately purchased registered domain, but each
**verified subdomain counts as a provider domain slot**. Three Business subdomains
can exhaust Free's three slots. Multiple sender names on one verified domain are
supported; [sender/domain explanation](https://resend.com/docs/knowledge-base/how-do-I-create-an-email-address-or-sender-in-resend).
Sending verification alone does not configure receiving.

| Shape | Trade-off |
| --- | --- |
| tablecards-help@tofler.app | Valid few-domain alternative; Business encoded in local name, shared email domain |
| help@tablecards.tofler.app | Recommended clear Business/purpose identity; each verified Business subdomain uses capacity |
| help@future-business-domain | Later standalone branding; verify new DNS and transition the **same** Business |

Start help@… for issues/questions/feedback/suggestions. Add notifications@… only
for an actual distinct system-message need; aliases may feed one scoped queue.
Do not create sales/billing/feedback departments/mailboxes merely because the
provider allows many local names. **Sales mail/bots and promotional workflows
are post-MVP**, in [future offers](../../docs/architecture/future-ideas.md#shared-promotions-personal-offers-and-repeat-purchase-campaigns).
No requirement for a separate marketing provider yet.

Website and sender domain can match or use different approved subdomains.
Protect existing office mail: receiving MX must not compete with an existing
inbox service; use a reviewed mail subdomain/forwarding where needed. Public
tablecards.tofler.app MX query on 2026-10-09 returned NOERROR/no answer, not a
provider-account/DNS audit or configured receiving evidence.

Identity must survive domain changes: retain cases, historical sender identities,
reply correlation and Business-scoped preferences. Verify new sender before
switching; keep old addresses receivable for an agreed transition. Do not rewrite
old messages or turn replies to old threads into a different Business. Migration/
transition mechanisms remain unselected, not a zero-downtime guarantee.

### Development, receiving and mailbox distinction

A development website hostname does not dictate a separate email domain.
Recommend no-send/mock transport for most tests and explicitly invoked bounded
provider tests. [Synthetic recipients](https://resend.com/docs/dashboard/emails/send-test-emails)
simulate delivery/bounce/complaint/suppression, still using quota.
[A documented example](https://resend.com/features/email-api) uses
onboarding@resend.dev without a custom domain; the
[default sender's restrictions](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)
do not allow arbitrary real-customer mail. A provider-managed id.resend.app
receiving address supports inbound tests without a custom receiving domain; see
[receiving overview](https://resend.com/docs/dashboard/receiving/introduction).

This does not prove separate development/production isolation. Do not reuse
production data/credentials or route production callbacks into development to
avoid a one-webhook limit. Validate key/callback/environment isolation. No new
provider account/domain/test mode is configured here.

Resend can receive/store email and its
[Receiving dashboard](https://resend.com/docs/dashboard/receiving/manage-emails)
shows previews/text/HTML/raw content with API retrieval. It is **not** a Gmail-
style personal inbox/login for every address. Planned BFF handling presents
cases for operators to read/reply in backoffice/CLI; that inbox is not built.
A separate staff-mailbox service is optional, not required; revisit MX/forwarding
if it later becomes necessary.

### Delivery, spam and future promotional consent

Authenticate correct sender identity with SPF/DKIM/DMARC as applicable, maintain
consistent Business branding and legitimate volume/recipient practices.
[Google sender guidance](https://support.google.com/mail/answer/81126?hl=en)
supports deliverability practices, not guaranteed inbox delivery. Subdomains
help organization but do not fully isolate shared account/IP/parent reputation.

BFF still verifies callbacks, routes only approved recipient identities,
retrieves content safely, deduplicates, bounds payloads/retries/loops and shows
delivery exceptions. Receiving may accept arbitrary local names under a domain;
that is not permission to create cases for any name. Treat bodies/HTML/
attachments/headers as hostile input, not bot instructions or authenticated
account evidence. Delivery is not a read or resolution signal.

[Hard-bounce/complaint suppressions](https://resend.com/docs/dashboard/emails/email-suppressions)
can affect transactional domains across the team; do not bypass them by changing
sender. Future marketing has distinct consent/preferences/unsubscribe rules:
login, product use or a support ticket is not promotional consent. Keep support/
system mail distinct from offers and do not hide promotions in a support email.
Proposed future product policy is explicit promotional permission **per Business**;
opting out of offers must not disable requested support or essential service mail.
Optional updates need their own clear expectations. These are future recommendations,
not approved campaign functionality.

[Resend global unsubscribe](https://resend.com/docs/dashboard/contacts/managing-unsubscribe-list)
applies across the team's Broadcasts/Automations. [Topics](https://resend.com/docs/dashboard/contacts/manage-topics)
narrow subscription preferences but do not override global unsubscribe; separate
Business campaigns do not automatically isolate it. Never resubscribe a global
opt-out just to send another Business's promotion. Future promotional sending
needs appropriate visible/one-click unsubscribe and Business-purpose preferences.

Provider “transactional” labeling is not legal permission; commercial primary
purpose can matter even for individually sent mail. [FTC CAN-SPAM guidance](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)
and [Resend unsubscribe guidance](https://resend.com/docs/knowledge-base/should-i-add-an-unsubscribe-link)
were researched, not a clearance for every jurisdiction or a selected marketing
system. A closing support survey is not a newsletter-consent mechanism.

### Maintenance and responsibility boundary

Provider infrastructure handles transport/storage and mechanisms we configure;
it does **not** transfer lawful sending, privacy or security duties away from us.
BFF/operator automation owns domain renewal/DNS review, credential/callback
security, allowed identities, recipient preferences/consent, suppression handling,
correlation/deduplication/failure recovery, access/content protection and required
notices/data lifecycle. Provider terms,
[security information](https://resend.com/security) and [DPA](https://resend.com/legal/dpa)
are inputs, not a liability shield or complete compliance answer.

Use validated Codex/operator configuration for repeatable setup; backoffice shows
delivery issues/state and meaningful actions. No campaign/template editor,
technical monitoring platform or mandatory staffed mailbox follows. Selected-provider
setup still needs applicable-purpose/privacy/account validation; no purchase,
credentials, DNS mutation or provider setup is authorized.

### Threading, attachments and branding — outstanding contracts

Recommend opaque case-specific reply addresses plus message threading identifiers,
not subject or matching-email-only joins. Ambiguous/mismatched input should go
to review, not silent customer/case merging. Correlation permits email continuity,
not private-account authority. Exact reply identity, receipt
replay, webhook verification/retrieval, backoff/limits and provider/domain migration
remain open in the reliability area.

**Current-customer boundary reaffirmed 2026-10-09:** Andrew declines another
identity-matching questionnaire or special cross-email handling system. Never
automatically merge emails/customer identities. Bot data access is limited to
the verified current customer/account by server authorization; customer wording,
reply metadata or a thread identifier cannot grant access to another customer.
When trustworthy account linkage is absent, no private account lookup is granted.
Preserve unexpected messages without inventing account authority; unusual cases
can be investigated manually if they arise. Ordinary transport correlation and
authorization checks remain required, not a new identity-verification workflow.

**Attachment direction accepted 2026-10-09:** preserve incoming messages and show
attachment metadata/status on their ticket. Operators see only authenticated,
freshly regenerated PNG/JPEG raster previews; no original downloads, unsupported
formats (SVG/documents/archives), remote HTML images, arbitrary attachment URLs or
automatic AI analysis. Text-only was the smaller alternative. Actual-byte/type/
size/dimension checks and managed isolated decoding reduce device/backend exposure,
not antivirus assurance or a guarantee against decoder vulnerabilities.
The [private byte path](#proposed-table-changes-and-indexes) defines retrieval,
conversion, storage and access; failure has no original fallback.

Unsupported/oversized/blocked files have clear reasons rather than disappearing
or discarding the message. Exact PNG/JPEG/count/size limits remain adjustable review
defaults, not a new general file platform.

**Attachment-size requirement added 2026-10-09:** bound per-file and total image
bytes, file count and decoded dimensions before conversion; do not download
unbounded bytes based solely on metadata or a claimed Content-Length. The existing
three PNG/JPEG files at 5 MiB each (15 MiB total) remain adjustable starting defaults,
not another product vote. Unsupported/oversized files stay unavailable; keep the
ingested message and clear reason. Verify provider-side rejection controls during
implementation; current Resend receiving docs do not establish a configurable
lower inbound limit. A BFF processing limit cannot prevent quota use before intake.
Resend [counts each received email](https://resend.com/docs/knowledge-base/account-quotas-and-limits)
against daily/monthly quotas; size limits mainly bound processing/storage, not
incoming-email count. No provider setting or purchase changed by this discussion.

**Provider attachment retrieval:** Resend
[download URLs](https://resend.com/docs/dashboard/receiving/attachments) expire after
one hour and can be renewed; never make them durable transcript links.

**Historical cheap-security research, 2026-10-09:** Andrew requested Astra to
address viruses compromising his device/backend without an expensive subscription.
Cloudflare [web-upload malware detection](https://developers.cloudflare.com/waf/detections/malicious-uploads/)
is an Enterprise paid add-on for applicable request bodies, not automatically
Resend attachments. [Email Security](https://developers.cloudflare.com/use-cases/company-security/email-security/)
is separate. Resend docs did not establish included antivirus; absence of verified
guarantee is not proof of no scanning. [OWASP file guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
informed restricted handling; extension checks, warnings or clean scans are not
absolute safety. Do not upload private files to public/shared scanners.

SES inbound verdicts had cheap usage but added storage, permissions, MIME processing
and integration. Andrew rejected adding AWS solely for scanning beside current
vendors and requested a whole-provider extra-high Astra comparison while other
questions continued. It covered identities/domains, send/receive, correlation,
attachments, dev tests, privacy, quotas/prices and total maintenance—not scan fees
alone. See the [historical comparison](#historical-whole-provider-comparison--returned-2026-10-09).
He subsequently selected Resend plus managed image regeneration, not an antivirus
verdict requirement. Existing TableCards image generation does not implement this.
Sources: [SES receiving](https://docs.aws.amazon.com/ses/latest/dg/receiving-email-concepts.html),
[Cloudflare Images binding](https://developers.cloudflare.com/images/optimization/binding/).
No scanner, vendor setup, upload, subscription, purchase or paid test occurred.

Proposed transport/correlation contract:

- Registered recipient identity establishes Business/environment; opaque case reply
  token plus [message threading identifiers](https://www.rfc-editor.org/rfc/rfc5322.html#section-3.6.4)
  correlates the conversation, not account authority. Unexpected contact on a known
  case goes to review; uncorrelated mail to an approved public address opens a new
  case. No subject-only join, automatic CC participants or incoming `Reply-To`
  redirection of private material.
- [Verify callbacks](https://resend.com/docs/webhooks/verify-webhooks-requests),
  durably record before acknowledging, retrieve bounded content and deduplicate by
  provider/event identities, not identical text. Unknown outbound IDs and reordered
  events must not create authority or overwrite newer delivery state.
- One fixed branded initial receipt per genuine new case, not replies/replays/
  surveys/bounces/list/autoresponses. Apply bounded [automatic-response safeguards](https://datatracker.ietf.org/doc/html/rfc3834);
  uncertain automated intake can wait for review without a receipt.
- Persist immutable approved payload, operation/key and provider ID. Distinguish
  queued/sending/provider-accepted/delivered/failed/**unknown**. Acceptance is not
  delivery, reading or resolution; a timeout after dispatch is not proof of failure.
  After acceptance, track the provider's delivery outcome instead of submitting
  another email merely because delivery is delayed or the customer has not replied.
  Resend distinguishes [accepted, delayed and delivered events](https://resend.com/docs/webhooks/event-types).
- Resend's [idempotency keys last 24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys).
  Retry the same payload/key only inside a safe approved envelope/window. Reconcile
  ambiguous outcomes; outside the safe window stop for operator review of possible
  duplicates before a fresh send. Never change keys merely to evade uncertainty;
  do not promise end-to-end exactly-once email.
- Bounded transient backoff differs from [webhook retry/replay](https://resend.com/docs/webhooks/retries-and-replays).
  Its [API error guidance](https://resend.com/docs/api-reference/errors) recommends
  retrying temporary 500/503 errors later and slowing requests for rate limiting;
  invalid configuration/recipients or exhausted quota are not rapid-retry cases.
  Hard bounces, complaints/suppression and invalid recipients stop sending; exhausted
  or disabled callbacks surface for validated operator reconciliation, not endless
  retries. Provider inbound junk can consume billable quota before BFF rejection.
  Continuing after a hard bounce or complaint damages sending reputation;
  respect [provider suppressions](https://resend.com/docs/dashboard/emails/email-suppressions),
  including their shared-team scope, without automatically removing them to retry.
- Bind survey invitation to the immutable approved closing message and actual send
  evidence. A retry keeps the same invitation; abandoned sends never activate it.
  Old links refer to the answer originally rated; explicit feedback updates are not
  case-status transitions.

**Retry/spam concern researched and bounded policy accepted 2026-10-09:** Andrew asks
whether recurring retries could make us behave like a spammer. Distinguish a
bounded retry of the provider submission from generating fresh duplicate emails
or repeatedly overriding recipient rejection. Recommend a few spaced, bounded
submission retries with the same exact approved payload and original idempotency
key, within the provider's 24-hour protection window and applicable authority.
For an ambiguous timeout, the same-key request can recover the original result
without a new email within that window; if safe deduplication/reconciliation is
unavailable, stop for review rather than invent a new key. No delivery-delay,
unread/no-reply, bounce or complaint trigger for automatic fresh sends; no infinite
retry loop or guarantee of inbox placement. Exact attempt/backoff defaults can be
chosen during implementation within the selected envelope; no sending or
configuration now.

**Business branding goal accepted 2026-10-08:** name/logo/accent like auth, with
shared configuration and effective-state visibility. Current
[auth contracts](../../platform/bff/libs/contracts/src/auth.ts) and
[TableCards defaults](../../projects/tablecards/customer-auth.defaults.ts)
include name/theme (light/dark/system)/accent, **not logo**. Reusing a small common
brand for auth/email is proposed, not an approved logo field/migration/editor.
Email needs safe HTML/plain-text templates and image-blocked fallback, not web
CSS copied into mail. Codex configuration and a read-oriented preview are proposed;
sender/reply DNS identity is separate from presentation. No template editor.
Business-specific names, links, artwork and email copy reach the generic shared
renderer as registered data/settings; no product-branded templates embedded in
shared source. Provider credentials remain deployment secrets, not Business
registration data. The current auth settings do not already bind support mailboxes.

<a id="data-lifecycle--detailed-discussion-deferred-2026-10-09"></a>

## Data lifecycle and minimum collection boundary

**Detailed discussion deferred by Andrew, 2026-10-09.** Do not build cleanup/
retention tooling for hypothetical volume. The consulted 12-month resolved-case
and 30-day raw-helper proposals are **not accepted policy or legal requirements**.

Before collecting real customer conversations/events, resolve only necessary
purpose-specific storage, access, notices, lifetime/deletion and privacy/security
expectations for the actual audience/flow and applicable rules. This is the
[roadmap collection boundary](../../docs/factory/mvp-delivery-plan.md#execution-order),
not indefinite storage permission or a broad retention platform.

Andrew's delete-and-return-for-free example motivates assessing abuse-prevention
needs separately from capacity and support learning. It grants no blanket
anti-fraud exception, deletion bypass, new identity matching or fraud engine.
Current once-only welcome-credit provisioning does not prove deletion/
re-registration cannot reset eligibility.

The [FTC data-security guidance](https://www.ftc.gov/business-guidance/resources/protecting-personal-information-guide-business)
supports necessary collection/access/disposal, not universal periods or permission
to retain every abuse marker after a deletion request. Review necessity/applicable
rules before any exception. Never commit credentials, tokens, identity/payment
documents or private conversations to repo; durable learning should use authorized
generalized guidance/sanitized cases, not copied customer content.

Later lifecycle review belongs in
[future maintenance ideas](../../docs/architecture/future-ideas.md#data-lifecycle-maintenance-review--refinement-2026-10-09):
inspect actual needs/volume/cost/privacy and propose proportionate changes.
Codex/operator workflows can do this; a future maintenance bot is not a prerequisite
for minimum privacy controls or current build completion.

## Dashboard and delegated UX

**Accepted 2026-10-09:** an all-Business dashboard and a dashboard inside each
Business, **Business overview first**, with relevant links into work/customer/
activity details. “Latest ticket” was clarified to **longest waiting**, not newest.
Delegated default: measure the current uninterrupted wait for **our next action**,
not creation age; another unanswered message must not reset that outstanding wait.
Waiting for customer is a different state. Do not reopen this microchoice.

Astra's **Business briefing** is the delegated working composition: three levels
of information—concise Business facts, visible attention, one-tap complete scoped
detail. Same meaning/authority on mobile and desktop; width changes composition.
Phone is Andrew's primary tool, but desktop must be intentionally useful too.

Historical alternatives:

| Choice | Trade-off / outcome |
| --- | --- |
| Work-first entry | Faster case handling but less overall picture; Codex's original recommendation replaced by Andrew's overview-first choice |
| Business overview-first | Adds a step to work but shows what happens now; selected |
| Customer-search-first | Useful investigation, but operators must separately discover work; not selected |
| Business briefing | Medium presentation effort; concise facts plus visible work, risk of crowding if all metrics equal; working default |
| Per-Business scorecards | Medium effort; desktop comparison but long/repetitive on phones, risk of shrinking/hiding detail |
| Topic tabs | Medium effort; quiet views but urgent items can hide behind tabs unless attention stays visible |

### Comprehension and evidence rules

- Keep explicit Business/environment scope, update time and material coverage.
  All-Business links open properly filtered scoped views, not merged people.
- Summary candidates: meaningful activity/outcomes; Open/Waiting; longest waiting
  for us; pending approvals; failed sends; feedback responses/invitations.
  Exact fields/periods depend on accepted evidence—not new metrics merely because
  an illustrative wireframe showed invented counts.
- Historical activity periods and current work counts are different. Open cases,
  approvals and failed sends overlap; never sum them into a fake task total.
- Consequential delivery warnings stay visible **above** ordinary summaries;
  links reach the relevant filtered queue/exact case. Do not hide warnings solely
  in a folded section, inactive tab or long scroll.
- Only complete successful evidence supports zero/all-clear. Distinguish loading,
  empty, not connected, unavailable, stale and partial coverage; keep unaffected
  sections useful. Current loaded-page counts are not totals.
- Use sparse facts/counts, not invented trend charts or confident percentages from
  tiny samples. Feedback shows response/invitation counts; bot observations,
  explicit feedback and inferred themes remain separate.
- A case connects conversation, meaningful customer/account facts, events,
  internal notes, delivery and exact approvals rather than disconnected lists.
  Reusable Inbox/Support, Customers and Activity destinations plus optional
  read-oriented Bots view are proposed—not a configuration/analytics console.

### Concrete delegated visual/interaction defaults

These are editable design defaults, **not rendered/tested UI evidence**:

| Element | Working direction |
| --- | --- |
| Visual character | Quiet business desk; warm neutral canvas #F6F5F1, white surfaces, dark #1B2825 text, muted #5F6D68, #E0E5DF borders, evergreen #176F62 accent |
| Status cues | Amber for review, red for failure; text/icons as well as color |
| Typography | Inter with system fallback; 28px phone / 32px desktop title, 19–20px sections, 16px body/rows, 14px secondary; semibold tabular counts, not giant metric tiles |
| Rhythm | 8px spacing system; 16px phone gutters, 24–32px desktop/section spacing, 12px corners, fine borders; almost no shadows except menu/dialog |
| Phone | Labelled Overview / Support / Customers / More navigation, safe areas/touch targets; full-page queue → case → exact review journeys |
| Desktop | Approximately 224px rail, 1200px content ceiling, two-thirds overview / one-third attention; deliberate split views rather than stretched mobile |
| Continuity | Back preserves Business/environment/filter/scroll; stable rows, no live reordering under a finger; no hover-only controls/help or nested/giant clickable cards |
| Approval entry | “Review requests” opens exact proposals; no swipe, unseen-card or preselected-group approval |

Avoid tiny captions, uppercase technical headings and sideways carousels. Use
aligned rows/dividers, restrained transitions and local refresh progress. Sparse
data gets an intentional empty panel with a relevant next link, not decorative
charts. On desktop, overview/attention and then queue/conversation are deliberate
side-by-side compositions; do not fill extra width with obligations or metrics.

Codex/Astra choose detailed components/layout/interactions **within agreed scope**
without asking Andrew every design question. His later visual review is optional
feedback, not a prerequisite/sign-off gate. Our own actual phone/desktop rendered
checks, journey testing, enlarged-text readability, keyboard/focus/status behavior
and accessibility verification remain necessary. No preview has been built here.
Design delegation does not authorize code, broader data, cost/privacy/authority
changes, schema or deployment; escalate those consequential boundaries.

<a id="post-mvp-organization-scope-split--2026-10-09"></a>

## Deferred organization and operating-skill distinction

On 2026-10-09 Andrew moved the Paperclip/Dots company organization—including its
reporting lines, isolated analysts, confidentiality rules, proposals, SWOT,
business/engineering advisers and model/bandit ideas—to the
[post-MVP entry](../../docs/architecture/future-ideas.md#post-mvp-ai-company-organization).
Its dated reasoning is preserved there, not an active backlog copied into this
build. Security/legal advisers do not supply current compliance clearance.
NOC/regression/developer organization is different from the Monitoring build.

Keep only useful **manually invoked operating/evaluation capabilities for current
helper/support work** here. Andrew corrected “Build 4” to “current build”; operating
skills are not Payments scope. Dots remains optional/unverified, no external-client
credentials or integration granted. Future company bots cannot be prerequisites
for operating a simple MVP.

The [permission-bounded AI future idea](../../docs/architecture/future-ideas.md#permission-bounded-ai-operations-and-helper-assistance)
was an earlier prompt; Andrew reopened AI scope, then narrowed it through explicit
helper/drafting/approval choices. It is not accepted autonomous authority.

## Dated decision evolution

This ledger records **changes and provenance**, not a second copy of all current
requirements. Detailed constraints and alternatives live in their topic above.

| Date | Discussion / decision evolution |
| --- | --- |
| 2026-10-08 | Begin with problems before solutions; broaden from investigation to visibility, tickets, design and user handling. Discuss conceptual data/ownership alternatives without accepting schema |
| 2026-10-08 | Andrew repeats the preference for concrete options and an explained recommendation for every discussion question, not a request that he invent scope |
| 2026-10-08 | Select one shared Business-scoped backoffice and full admitted-operator access; meaningful BFF information plus milestones/important failures replace raw product reads and cross-Business customer correlation |
| 2026-10-08 | Keep future analytics/pixel/offer reuse as deferred possibility, not a campaign/discount provider or authority |
| 2026-10-08 | Choose website/email intake, email follow-up, backoffice-only history and BFF-owned cases over mailbox/helpdesk/portal ownership |
| 2026-10-08 | Initially accept anonymous website intake; park verification for Astra, include feedback/ideas, accept neutral initial receipt and as-needed substantive replies. Mandatory confirmation gives way to immediate general contact without account authority |
| 2026-10-08 | Request shared email branding, wrong-recipient reporting exploration and Google-only simplicity; second Astra review proposes signed-in form plus public email, awaiting later choice |
| 2026-10-08 | Reopen AI MVP exclusion, distinguish helper from case support, request concrete options. Initial bounded auto-reply recommendation gives way to helper answers and ticket auto-suggest |
| 2026-10-08 | Add approved-knowledge review and on-demand Codex evaluation/improvement; prefer small file-based shared instructions/skills/tests over a management console |
| 2026-10-08 | Require custom named bots; optional/page-specific helpers and multiple support cases/categories replace hardcoded/default-pair assumptions. Support role is distinct from draft/send mode |
| 2026-10-08 | Select metadata-first assigned skills loaded on demand; programmatic context/tools revise fixed-tools-only proposal. UI executes registered handlers and reports real results |
| 2026-10-08 | Challenge category-only routing; discuss thin coordinator, separate scoped invocations versus services, resumable specialists and persisted pending actions. Those architecture choices remain open |
| 2026-10-08 | Explore small code-enforced conditional action rules; strengthen initial support policy to approval for every permitted tool/read/skill and substantive reply. Refund examples grant no power |
| 2026-10-09 | Move company organization to future ideas; keep relevant operating/eval skills in current build. Combine support/nontechnical visibility as Operator work, isolate Monitoring |
| 2026-10-09 | Agree short roadmap names and split bundled Marketing/Legal/Maintenance/Launch; numbers not sequence, Payments still on hold |
| 2026-10-09 | Confirm operating boundary by readback. Accept signed-in form/public mail link, superseding anonymous form. Consolidate overlapping questions; later nine-topic/32-row presentations become supporting detail, not required votes |
| 2026-10-09 | Accept resolved replies reopening, conversational operator queue, bounded group approvals and no engineering access requirement for other operators |
| 2026-10-09 | Accept three statuses, explicit resolution, same-history internal notes, structured requests, attributed shared queue without owners/priority labels; Waiting replies also return Open |
| 2026-10-09 | Require easy-to-answer **and useful** feedback; Astra reviews participation/actionable learning. Accept Yes/Partly/No, two-tap explicit submission/comment and actual-answer review |
| 2026-10-09 | Choose each approved closing reply over once-per-case invitations; ratings review-only; operator skill reviews responses/participation. Low response-rate discussion does not accept incentives |
| 2026-10-09 | Choose overview-first with longest waiting and all-Business scope; delegate routine defaults. Select site-wide Q&A over Create-only, sign-in/plan facts, customer-controlled links/handoff |
| 2026-10-09 | Require shared bot evidence; prominent feedback, helper-first issues and discoverable Help escalation; Business-branded approved support, no invented human author |
| 2026-10-09 | Research email/provider/domains/spam/unsubscribe; accept distinct Business addresses and no development-only domain slot, defer sales mail/bots. Record growth/mailbox/maintenance explanation; Resend still proposed |
| 2026-10-09 | Defer detailed retention/cleanup; distinguish minimum privacy/security/abuse needs from capacity and blanket deletion exceptions |
| 2026-10-09 | Request Astra responsive-dashboard design; adopt layered briefing as delegated default, add concrete visual/check criteria, make Andrew's visual feedback optional while keeping our testing |
| 2026-10-09 | Reserve ERD, exact structural changes/migrations and shared/library/Business ownership for the end, after current design questions |
| 2026-10-09 | Include Cloudflare Agents/text and evaluations in runtime comparison. Require cheap live models, no Sol/fallback/customer selection, realistic separate held-out/messy/adversarial tests **later**, and practical Convex portability |
| 2026-10-09 | Request full consistency/deduplication review. Codex consolidates by topic; Astra independently compares original and rewrite for omissions/status changes. Restore distinct details/history/sources, fix stale Waiting-reply/helper-context open claims and blanket matrix status; verify local links without selecting new contracts |
| 2026-10-09 | Request Astra options/recommendations for all six remaining areas. Three read-only consultations are synthesized into the batch review and topic proposals; distinguish substantive decisions from adjustable defaults, preserve runtime/continuity alternatives and flag retry-envelope/spend approval. Await Andrew's review; no selections, planning, schema changes or evaluations |
| 2026-10-09 | Park support architecture until the other five areas are discussed. Request a new Astra premise check: do we need this architecture at all, versus a plain bounded drafting workflow? One bot is tentative; previously proposed routing/registry/delegation is not assumed required. Keep final architecture reviews afterward |
| 2026-10-09 | Accept initial product/bot outcome set; clarify automatic meaningful internal recording by the owning shared code and reuse of existing BFF evidence, not automatic bot access or a generic log stream. Follow-up Astra proposes one bounded support-drafting workflow; keep its architecture recommendation parked and unaccepted |
| 2026-10-09 | Clarify bounded model/tool steps versus durable event-triggered job dispatch; record Andrew's concern about recurring polling. Verify native scheduler and optional Workpool/Workflow capabilities, not installed or selected; preserve support approval/retry/current-authority boundaries and correct the spoken helper/ticket conflation |
| 2026-10-09 | Andrew challenges automatic cancellation/reapproval for a customer reply arriving during brief operator review as possible overengineering. Propose a nonblocking new-message notice with preserved draft/approval for ordinary replies; exact payload/current authority/tool eligibility stay enforced. Preserve earlier conservative alternative as history; lighter policy awaits confirmation |
| 2026-10-09 | Andrew proposes one current reply draft per ticket and optional message-linked internal notes, with ID-based approval feedback/refresh. Codex adds an ID-plus-version explanation. Preserve history/unsent edits and separate tool/send records; no automatic draft replacement or new-message-only cancellation assumed, schema review remains last |
| 2026-10-09 | Andrew finds message versions too messy. Revise to one current draft and a single opaque pending-reply ID bound to the exact payload; a changed proposal gets a new pending ID, obsolete/already-handled approval refreshes state. No separate message version counter/history/UI; atomic pending-state and exact-payload safety remain |
| 2026-10-09 | Andrew selects the original new-customer-message invalidation rule as simpler after the draft/ID discussion. Invalidate unsent reply authority, keep draft/edits and require fresh review/pending ID; no version history, automatic regeneration, message deletion or recall. Notice-only alternative is unselected; tool continuation/expiry/retry details remain open |
| 2026-10-09 | Select round live-text caps of $3/day and $30/month across Businesses combined, both enforced; supersede Codex's lower proposals. Allow separately bounded, higher budgets for intentional evaluations, exact run cap still unspecified. No spending/configuration/tests now and no customer access to evaluation allowance |
| 2026-10-09 | Require near-budget/reached alerts and clarify “mock” as alert transport/test integration for later Telegram, not dashboard mock-up or invented values. Proposed 80%/100% deduplicated thresholds remain adjustable; actual dashboard figures only, no new monitoring platform or setup now |
| 2026-10-09 | Select warnings at 50% and 80% of either live-text cap, retaining cap-reached notification and hard enforcement. Caps are protective ceilings, not expected spending: even half the allowance warrants attention. Supersede the earlier 80%-only warning proposal; notify once per threshold/period, do not automatically raise the cap |
| 2026-10-09 | Require realistic, repeatable synthetic development seed data for a populated backoffice and record-grounded testing/evaluations. Ask Astra to help author believable histories/messages during later implementation/testing, explicitly not during brainstorming; no agent, seed data or paid tests started now |
| 2026-10-09 | Research Andrew's recurring-retry/spam concern using Resend's API, idempotency, delivery-event and suppression guidance. Recommend bounded same-payload/key submission retries, tracking accepted delivery rather than creating new emails; stop on permanent rejection/complaints, unsafe uncertainty or exhaustion. Retry envelope remains proposed, not selected |
| 2026-10-09 | Accept bounded, spaced retries of the exact approved email submission using duplicate protection and applicable authority; track delivery after provider acceptance and stop on rejection/complaints, exhaustion or unsafe uncertainty. No recurring fresh emails or extra bot authority |
| 2026-10-09 | Require operator visibility of incoming email attachments, not unrestricted access. Andrew raises malware/device/server compromise and explicitly requests Astra to investigate genuinely cheap protection; scanner/file-handling selection remains pending, no setup or uploads |
| 2026-10-09 | Reaffirm no automatic email/identity merging and server-enforced current-customer bot access. Decline extra identity-matching machinery/questions; investigate unusual cases manually if needed, without treating message text or reply correlation as account authority |
| 2026-10-09 | Audit remaining questions after redundant runtime/pilot/identity prompts. Only email/attachment handling and shared helper/support foundation remain consequential decision groups; technical defaults belong in the final reviews, not another questionnaire. Runtime Astra recommends a minimal shared AI SDK service, not yet accepted; vendor comparison remains running |
| 2026-10-09 | Select Resend for all mail plus Cloudflare-regenerated image-only previews after protection/cost discussion; no originals or unsupported files. Add attachment-size/count/dimension bounds and investigate provider-side limit controls; BFF rejection does not undo received-email quota. No setup/purchase; shared bot foundation is the last direction choice before final reviews |
| 2026-10-09 | Accept shared AI SDK model/tool foundation with existing Convex state/jobs and separate helper/support workflows, including helper chat state/tool handling via AI SDK UI. Visual components optional; exclude HarnessAgent and a specialist-routing framework. All substantive direction choices are settled; ERD, exact structural changes/migrations and ownership reviews remain before whole-design/planning approval. No installation, implementation or paid tests |
| 2026-10-09 | Clarify configurable approval policy per Business and tool: deny, ask an operator, automatic allow within protected limits, or reviewed custom code returning those outcomes. Event occurrence/count/recency and customer/Business period limits are conditional-rule examples, not selected thresholds or new powers. Keep initial support approval-every-time default; enabling particular automatic rules requires explicit agreement |
| 2026-10-09 | Revise initial support tools to read-only and remove manual approval for permitted scoped reads/assigned skill loading; retain exact substantive-reply approval, forbidden-action denial and data/rate/budget controls. Rules attach to actions, not separate agents. General threshold-engine deferral is a simplification proposal; no new remediation or automatic reply authority, exact read contracts await review |
| 2026-10-09 | Correct the reply-policy misunderstanding: Andrew wants eventual automatic routine answers but operator review for other answer types, e.g. payment, within the same support agent. Record future per-Business reply policy; do not treat an AI topic label as send authority or enable automatic replies now |
| 2026-10-09 | Final review requested: independent consistency/gap review and explanation of ERD, structural changes/migrations and shared-versus-Business ownership, preferring shared machinery. An ambiguous voice readback briefly restored read approvals; superseded by the final typed clarification below, not an enabled policy |
| 2026-10-09 | Final typed clarification: all permitted read-only support tools and assigned skill loading need no approval. Only substantive outgoing replies require the operator's exact send decision; the bot proposes, the operator edits/sends/rejects. No generic tool-approval table or threshold engine initially; helper policy unchanged. No implementation/schema approval |
| 2026-10-09 | Complete primary and independent Astra final design reviews; reconcile current policies, historical routing and sparse Operator work versus later launch-funnel scope. Present a nine-table additive shared ERD, field/index and migration/ownership proposal, with follow-up safeguards incorporated. Await Andrew's architecture/whole-design review; no code, schema, configuration, seed data or paid tests |
| 2026-10-09 | Accept estimated AI cost visibility, totalled by verified customer or opaque scoped anonymous ID; anonymous usage also counts globally. Reusing per-operation evidence rather than a new per-user spent table remains the recommendation. Investigate Cloudflare Gateway caps as an unselected alternative to exact app counters; no configuration/schema implementation or spending |
| 2026-10-09 | Later superseding revision: defer per-user/account/anonymous spending attribution back to Future Ideas; choose provider/gateway settings for the existing $3/day/$30/month live-text safety caps. Remove proposed `botBudgetPeriods`, application monetary reservations, spending dashboard and custom/mock budget-alert transport. Native daily/delayed alerts are acceptable; their scope differs from exact AI-only threshold warnings. Goal is runaway-bug protection and awareness of AI availability, not a live financial ledger. ERD now has eight new shared tables; existing credit/image safeguards unchanged. No configuration or implementation |
| 2026-10-09 | Clarify Business/shared ownership after ERD discussion: shared service/libraries contain generic machinery only, no imported Business executable code or hardcoded product knowledge/event schemas/templates/fixtures. Business code stays in its deployment; reviewed Business-specific material can be stored/registered as scoped non-executable data/settings in BFF. Preserve useful bounded free text. Primary and read-only independent audit identify real gaps in runtime configuration storage/delivery, approved event/page-capability definitions and mailbox/branding bindings. Current auth setup is only a precedent; exact optional configuration fields/storage/migration remain structural review, not an assumed new registry table or implementation approval |
| 2026-10-09 | Confirm minimal runtime skill metadata (name, when to use it, content) and production-miss regression capability: sanitize a real failure into a Business-owned case, test the fix and rerun all saved evaluation sets. Planning defines wiring/results; versioned Markdown/JSON report storage remains proposed. No tests now |
| 2026-10-09 | Request another important-gaps/consistency and deduplication review, not more microquestions or documents. Primary and bounded independent Astra review find no additional business-scope votes; correct contradictory read gates, selected providers/runtime, portal/product-read and historical-status wording. Preserve decisions/sources while consolidating repeated explanations; exact architecture/schema acceptance remains pending |
| 2026-10-09 | Check potential implementation/dev blockers read-only: existing dev targets/tooling support synthetic/no-send development; exact schema/configuration approval and build/deploy authority remain gates. Live provider setup/capped routing and the new screenshot deployment path still require verification. No credential absence, readiness pass or deployment is claimed |
| 2026-10-09 | Andrew reports opening Resend and providing a key in the named Nirvana task. Read-only lookup confirms key presence without exposing or persisting it; permissions/domains still need verification. No account setup or integration is performed |
| 2026-10-09 | At Andrew's request, test Resend access read-only: GET domains returns HTTP 401 `restricted_api_key`, documented as sending-only permission. Full-access key needed for management; domains could not be inspected. No emails, API writes or credential persistence. No Resend MCP tools connected in this session |
| 2026-10-09 | Andrew changes the key to Full access; requested read-only retry succeeds (HTTP 200). Account has no registered domains, so domain/receiving setup remains. Permission blocker resolved; no emails, API writes, deployment or credential persistence |
| 2026-10-09 | Andrew approves the presented design/schema and asks for practical blockers to a hypothetical fully working development deployment. Whole-design/presented-schema approval is resolved; no implementation/deployment instruction yet. Remaining configuration persistence details belong to planning, not a reopened product questionnaire |
| 2026-10-09 | Read-only preflight confirms Convex dev access, Wrangler login/Worker scopes and active `tofler.app` zone visibility. Current OAuth has no DNS-write scope; AI Gateway list returns HTTP 403. Need scoped access or dashboard setup for email DNS/caps; screenshot conversion remains unverified. Node 24 wrapper works. Document Resend test-sender/managed-inbound path without sending or configuring anything |
| 2026-10-09 | Continue read-only access preflight with a bounded faster fact-checking agent. Existing dev image Worker settings are readable and expose binding names/types only: AI plus a secret binding, no Images. Record DNS write on `tofler.app`, account AI Gateway Read/Edit setup rights and optional Billing-role dashboard alert step in the existing provider runbook. Private-byte conversion fits the default Images Free allowance; no paid subscription is expected at dev volume. Native billing-period/account-wide alerts have documented prior-day processing, not scheduled daily AI reports. No provider/code/schema changes or deployment |
| 2026-10-09 | Andrew supplies a Cloudflare setup token in the existing Nirvana blocker task; no access to the workspace computer is required. Read-only verification reports active, DNS-record and AI Gateway list calls return HTTP 200, and no gateways exist yet. Token used in memory without displaying or persisting it locally; task notes and provider settings unchanged. Write permissions and runtime integration remain untested |

## Review lenses and handoff limits

The [Agency Agents Support Responder](https://github.com/msitarzewski/agency-agents/blob/main/support/support-support-responder.md)
was a customer-context/follow-up/feedback lens, not an authoritative source.
Its staffing targets, response-time promises, channel bundle and automation were
not adopted. Company-organization/Growth Hacker exploration remains in future
ideas. Repository decisions and official primary sources take precedence.

This consolidation preserves settled decisions, unaccepted candidates and real
gaps; it does not claim a gap-free implementation design. No code, schema,
permissions changes, paid AI tests, provider configuration or deployment was
performed. Read-only access preflight is recorded above, not runtime verification.
Documentation verification means relevant prose,
local path/anchor and diff checks—not a special documentation test suite.
