# Brainstorm: Customer operations and a usable backoffice

> **Status**: Active — operating/data boundaries agreed below; remaining feature design and implementation unapproved
> **Created**: 2026-10-08
> **Last updated**: 2026-10-08
> **Repository baseline**: `872a96f84551eb81f682c554feb7af58cf9ded52`

## Context Snapshot

- STATUS records Builds 1–3 deployed as a no-charge preview. Real billing is
  pending; support, analytics and monitoring are not completed launch capabilities.
- The [single MVP roadmap](../../docs/factory/mvp-delivery-plan.md#build-6--analytics-monitoring-and-usable-backoffice)
  owns delivery scope. This is a focused discussion record, not another roadmap.
- The earlier [remaining-priorities record](261007-remaining-mvp-priorities.md)
  is inactive history. This distinct feature discussion does not reopen it.
- Andrew requests customer/user monitoring, such as feedback, rather than
  technical monitoring. First discuss what problems to solve, then explore how.
- An unrelated VPN follow-up is already recorded in STATUS; preserve it.

## The Idea

Make it possible to run customer-facing operations from a phone or desktop:
understand who needs help, what happened, what remains unresolved and what
Andrew should do next. Avoid making him reconstruct a customer's story from
separate entity lists. Shared operating needs span Businesses; TableCards is
the current concrete example, not a universal product-domain template. Andrew
subsequently confirms Business-scoped customer work in one shared backoffice;
cross-Business customer correlation is not part of the initial scope.

### Discussion scope clarified by Andrew — 2026-10-08

Explore these together because they contribute to one usable operating workspace:

This preserves the initial umbrella. The later accepted
[Business-first boundary](#business-first-operating-context--accepted-direction-2026-10-08)
narrows customer investigation; cross-Business customer linkage is no longer an
initial requirement.

- **Business visibility:** understand what happens within one product and across
  products, with relevant customer/product outcomes rather than infrastructure logs.
  Business/product projects and a customer's saved TableCards project are distinct;
  make those contexts clear rather than silently treating them as the same entity.
- **Customer visibility:** find a person and inspect their separate product/account
  contexts, including records with the same email across Businesses. Correlation
  and presentation need discussion; account/identity merging is not requested.
- **Backoffice design:** a substantially nicer, consistent, task-oriented experience,
  usable on phone and desktop, not only a cosmetic refresh of the existing lists.
- **Tickets and conversations:** customers can submit from product UI; a person
  unable to sign in also needs a contact path. Collecting email, verifying contact,
  viewing replies and safely associating a public ticket with an account remain open.
- **Customer handling:** inspect which human actions are genuinely needed and
  distinguish case handling from sensitive changes to users, accounts or billing.
- **AI support assistance — added 2026-10-08:** Andrew proposes including this
  in the MVP so routine help does not depend on his availability. The guiding
  outcome is self-managing Businesses with minimal manual operator work. He
  subsequently chooses a knowledge helper plus ticket suggestions first, rather
  than autonomous ticket sending. Explore evidence, handoff and cost; no provider
  or implementation is selected.

Recommended additions for discussion, not new accepted implementation requirements:
what needs attention and what is waiting on whom; customer/private-data boundaries;
and the history of operator actions. Technical telemetry, marketing automation
and a general-purpose CRM are not silently included. Customer-facing AI support
is now explicitly under discussion, not yet approved for implementation.

## Codebase Context

### What We Have

- The backoffice [App](../../platform/bff/backoffice/src/app.tsx) currently
  selects an environment and loads users, accounts, memberships, sessions and
  security events, with exact user lookup and pagination.
- [Dashboard](../../platform/bff/backoffice/src/dashboard.tsx) presents these
  mainly as separate lists, not a joined customer/support journey.
- The existing [operator gate](../../platform/bff/service/convex/lib/authorization.ts)
  admits approved operators without granular backoffice roles. Retain this
  simple model; no operator-role or permissions table is proposed.
- The [implemented shared data model](../../docs/architecture/shared-bff-data-model.md)
  covers profiles, accounts, memberships/invitations, sessions, access, units,
  checkout attempts and security/ownership evidence. Its `securityEvents` table
  has a narrow authentication/ownership enum; there is no product-activity store.
  It must not be presented as an existing generic event-ingestion capability.
- The roadmap already requires customer investigation, mobile/desktop usability
  and, in Build 5, two-way feedback/problem/question conversations plus a public
  support path. Those support capabilities are planned, not present in this app.
- [ADR 0004](../../docs/architecture/adr/0004-business-customer-auth-and-accounts.md#authority-and-isolation)
  defines environment-local users/accounts and provider identity by issuer/subject;
  matching email never merges identities. The current dashboard selects one
  environment; the initially discussed cross-Business customer view is neither
  implemented nor part of the later accepted initial scope.

### Constraints

- Do not claim real billing facts from the no-charge mock, or infer customer
  intent from missing activity. Missing, stale and unknown evidence must be clear.
- Preserve product/environment isolation and minimum necessary customer data.
- An email supplied on a public ticket is contact information, not proof of
  ownership or authority to expose an account's private data. Verification and
  ticket-access behavior must be discussed before accepting a solution.
- Adding a person to the approved operator list remains a separate access grant;
  everyone admitted gets the same full backoffice access. AI assistance and its
  authority remain unapproved capabilities; see
  [the relevant future idea](../../docs/architecture/future-ideas.md#permission-bounded-ai-operations-and-helper-assistance).
- Andrew's AI-support addition reopens the previous blanket MVP exclusion. The
  later selected helper/ticket-drafting boundary narrows it; autonomous ticket
  sending and account remedies remain excluded. Final feature design and
  implementation approval remain open.
- Technical telemetry, vendor selection, infrastructure alerts and automatic
  incident investigation remain outside this conversation for now, not removed
  from their later MVP acceptance requirements.

### Opportunities

Use meaningful existing BFF customer/account records plus selected business
milestones to ground investigation. Andrew's later data-boundary decision below
replaces the earlier proposal to read product operation records directly.
Give feedback and support a clear purpose without prescribing a helpdesk or bot.

## Initial scope alternatives — historical starting point, 2026-10-08

Andrew subsequently requested combined exploration of business/customer visibility,
design, tickets and user handling, as recorded above. These narrower alternatives
preserve the initial trade-offs; they are no longer the opening choice to ask again.

### Option A: Customer investigation only

**Approach**: Find a customer/account and understand access and relevant recent
activity when someone reports a problem.
**Leverages**: Existing lookup, identity/account data and product operations.
**Constraints**: Does not itself provide feedback intake or a reply lifecycle.
**Effort**: Lower relative scope.
**Risk**: Improves diagnosis but leaves support work fragmented elsewhere.

### Option B: Investigation plus feedback and support handling

**Approach**: Also receive questions/problems/ideas, understand their context,
follow up with the customer and know which cases still need attention.
**Leverages**: Existing account context and the roadmap's required Build 5 support.
**Constraints**: Two-way support is new work, not merely a dashboard reskin;
its delivery dependency and customer-facing behavior must be discussed later.
**Effort**: Medium to high relative scope.
**Risk**: Expanding into a full CRM/helpdesk unless the operating outcomes stay bounded.

### Option C: Option B plus proactive customer-outcome monitoring

**Approach**: Also discover customers with confirmed unsuccessful outcomes and
recognize recurring customer problems before receiving a complaint.
**Leverages**: Available operation outcomes and, later, meaningful product events.
**Constraints**: Signals and evidence coverage need definition; inactivity alone
does not prove a customer is stuck. No automatic outreach is implied.
**Effort**: Higher relative scope.
**Risk**: False alarms, unnecessary tracking and premature analytics complexity.

These alternatives scope the first discussion/slice; they do not remove required
support or monitoring from the authoritative launch roadmap.

## Two AI roles — clarified by Andrew, 2026-10-08

- **On-site knowledge helper:** a conversational guide for questions about the
  product, its features and how to use it. It answers autonomously from approved
  knowledge; this is not approval to modify accounts or perform arbitrary actions.
  Small personal/context awareness is undecided, not an assumed requirement.
- **Ticket support agent:** works on submitted support cases rather than merely
  chatting on the current page. It can investigate permitted customer/operation
  facts, reply within the case and potentially perform specifically approved
  support actions. Data scope, authority, progress and handoff need separate decisions.

These are distinct responsibilities and experiences, not a requirement for two
models, vendors, deployments or separate conversation databases. Do not turn every
helper chat into a ticket by default; a useful escalation path is an open question.
Product knowledge may be shared, but privileged ticket tools must not automatically
become available to the helper. Keep humans able to inspect and handle cases.

For the helper, compare public product knowledge only with public knowledge plus
current-page context or a few explicitly authorized customer facts. Recommend
public knowledge/current-page context first; add personal facts only for a useful
question that needs them. For the ticket agent, use the action-level alternatives
below. Overall MVP inclusion and the final autonomy boundaries remain under discussion.

### Smallest useful starting scope — historical recommendation, 2026-10-08

The recommendation below preceded Andrew's later choice of ticket auto-suggest,
recorded after the alternatives. It does not authorize automatic ticket replies.

Andrew asks Codex to propose this rather than make him invent the minimum:

- **Knowledge helper:** answer product/how-to questions from maintained approved
  knowledge, optionally using the current page. For TableCards: importing names,
  choosing designs, printing and offer limits. No private account history or
  account-changing tools initially. If it cannot help, offer a ticket/human path;
  transferring chat context and the user's agreement to do so remain design choices.
- **Ticket agent:** work on a submitted case, ask for missing details, inspect the
  minimum authorized account/operation facts needed, and send grounded routine
  replies without waiting for Andrew. For example, investigate a failed export
  or explain an observed allowance balance, rather than guessing its cause.
  It may classify/summarize/escalate the case; exact lifecycle actions need agreement.
  Give Andrew a concise summary and the unresolved decision when human help is needed.
- **Initial boundary:** no refunds, access overrides, membership/ownership changes,
  deletion, engineering repair or deployment. Public/email-only cases receive
  general help until the required identity/account authority is established.
- **Useful completion evidence:** a customer can get a documented how-to answer
  without Andrew; a routine case receives an evidence-backed response without him;
  an unsupported/sensitive case reaches him with preserved context. Do not equate
  an AI reply, silence or an uncertain inference with confirmed resolution.

Draft-only ticket assistance is the smaller alternative but still makes Andrew
handle every reply. Account-remediation automation is the larger alternative and
needs separate action policies. Recommend the middle boundary above; providers,
models, data/API design, costs and implementation sequencing remain open.

## AI support alternatives — proposed MVP scope

These began as a combined assistant comparison. Andrew's clarification above
separates the knowledge helper from the ticket agent; the alternatives below now
concern the **ticket agent's authority**, not whether the helper needs Andrew to
approve ordinary product explanations.

### AI Option 1: Operator copilot — selected initial boundary, 2026-10-08

**Approach**: Summarize tickets, collect permitted context and draft replies;
Andrew reviews and sends them.
**Leverages**: The planned ticket conversation and customer investigation.
**Constraints**: Every customer reply still waits for a human.
**Effort**: Low to Medium relative to the alternatives.
**Risk**: Less autonomy risk, but may not satisfy Andrew's main goal of less work.

### AI Option 2: Bounded autonomous first-line support — earlier recommendation, deferred

**Approach**: Investigate a ticket, answer routine cases and explain verified facts
available to the requesting customer without waiting for Andrew.
When evidence, permission or policy is insufficient, preserve the conversation
and hand off a useful summary with the unresolved question.
**Leverages**: Product documentation, the planned support case and scoped
customer/account facts; human case handling remains independently usable.
**Constraints**: Allowed answers/actions, source freshness, identity/data scope,
escalation, truthful resolution evidence, fallback and spend limits need decisions.
No guessed account linkage, forced case closure, refund, entitlement override,
role/ownership change, data deletion or deployment authority is implied.
**Effort**: Medium to High.
**Risk**: Incorrect replies, private-data exposure, malicious ticket instructions
and unexpected cost; permissions must be enforced outside the model's prompt.

### AI Option 3: Autonomous support plus account remediation

**Approach**: Also let the assistant perform separately chosen account or billing
remedies instead of handing them to an operator.
**Leverages**: Only actual secured remediation workflows, not raw database access.
**Constraints**: Requires exact per-action policy, authentication, audit,
confirmation where appropriate and recovery design. Those workflows are not approved.
**Effort**: High.
**Risk**: Financial/access/data harm and greater operating complexity; do not
make broad administrator powers the default just to reduce manual work.

The recommendation is an outcome boundary, not a particular chatbot, UI,
provider, model, integration or implementation plan. The earlier Option 2 may include
safe, specifically approved routine actions later; it is not a blanket read-only
restriction or permission for sensitive operations.

### Helper first, ticket suggestions and shared answer checks — 2026-10-08

Andrew chooses an in-app knowledge helper and **auto-suggest** for tickets,
not automatic substantive ticket replies. An operator reviews/edits and sends
each suggested reply; the accepted automatic initial receipt remains separate.
Autonomous ticket sending may be reconsidered after evidence, not enabled by
passing a test or by the helper answering successfully. Ticket tools/customer
facts, helper context, provider/model and final MVP implementation scope remain open.

The two roles may share Business-scoped approved product knowledge and reusable
answering procedures, without sharing every tool or permission. This is application
capability reuse, not a requirement to install Codex skills in the customer app.
Do not supply the raw repository, private operational notes or another Business's
knowledge to a public helper. Their separate chat/case experiences remain useful
even if one provider/model supplies both.

Andrew also requests answer-quality evaluation for both roles. Recommend a small
versioned suite of questions, relevant source facts and expected behavior rather
than a new evaluation product. Codex can derive initial cases from canonical
product behavior before real customers exist. Include normal how-to/offer questions,
paraphrases, unknown or unsupported features, incorrect assumptions, and attempts
to obtain private data or make unauthorized changes. Check factual correctness,
grounding, useful uncertainty/fallback and role boundaries, not exact wording or
the model's own confidence. Preserve failed examples and corrections; later add
representative real questions with appropriate data minimization. Tests cannot
establish that every future answer is correct.

Run affected checks when knowledge, prompts, permissions or models change; routine
unrelated Markdown changes do not require paid AI runs. Compare versions, including
latency/cost, and inspect sampled outputs; an AI grader is assistance, not sole proof.
The [official evaluation guidance](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
supports task-specific criteria, edge cases and automated checks, not a requirement
to select that vendor or adopt a separate platform.

If a queue means pending ticket drafting, the case inbox supplies the conceptual
work queue; delivery/retry/concurrency design remains open. The in-app helper needs
an interactive response, not necessarily a separate queue service. No queue,
knowledge/vector database, evaluator service or structural schema is approved.

### Approved knowledge and an on-demand Codex improvement workflow — 2026-10-08

Andrew requires review of what both assistants may know and disclose. This
includes confidential business/implementation information, internal plans and
commercial facts, not merely credentials or other customers' data. Supply only
approved Business knowledge for each role; do not ingest the entire repository
then rely on a prompt to keep internal material secret. Reading a source and
disclosing its contents are separate permissions. Any later internal ticket
context needs a specific purpose and disclosure boundary, not inherited full
operator access. Models already have general pretrained knowledge; the system
controls supplied sources/tools and supported answers, not erasure of that knowledge.

Review source provenance, permitted use, customer-shareability and freshness;
flag uncertain rights/policy rather than claiming legal clearance. Test normal
answers and attempts to expose internal information, override instructions,
mix Businesses or use unapproved tools. Use harmless synthetic confidential
fixtures, not real secrets in test artifacts. [OWASP guidance](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html#least-privilege)
supports restricted data/tool access and layered testing, not prompt-only guarantees.

Andrew also wants a skill/command he can invoke periodically for Codex to
inspect real helper questions/answers and ticket suggestions, find gaps and
improve the assistant. Recommend one reusable **review-and-improve** workflow
with review-only and explicitly requested improvement modes, rather than separate
training/review services. It should use a bounded Business/environment sample,
compare answers with approved facts and outcomes, preserve failures as regression
cases, and test candidate knowledge/prompt/retrieval changes against the baseline.
Passing familiar examples alone does not establish improvement: include unseen
paraphrases, unknown questions and disclosure tests. Operator edits are evidence,
not automatically correct labels; user messages are not trusted instructions or
automatically published knowledge.

Codex owns the analysis and repeatable checks, then reports observed failures,
changes, comparison evidence and remaining uncertainty. Andrew's manual review
is optional unless a genuinely new policy/authority decision is needed. Do not
assume model fine-tuning, automatic retraining, broader permissions, a scheduler,
a new dashboard or deployment authority. Exact skill/command, sample retention,
privacy/provider processing, cost bounds and release criteria still need design.
This invocation belongs in Codex/operator automation; the backoffice exposes
the existing conversation/draft evidence, not a mandatory AI-training console.

### Shared bot controls and event access — exploration, 2026-10-08

Andrew proposes shared BFF bot-management responsibilities, including suitable
event access, with later MCP interfaces as a possibility. Keep three boundaries
distinct: BFF runtime configuration/data policies; Codex's repository review and
evaluation workflow; and a potential future tool interface. No management
console, large general agent platform, MCP server, component install or schema is approved.
The backend currently installs a rate limiter, not an agent/knowledge component.

**File-based defaults and an embeddable helper — clarified, 2026-10-08:** Andrew
defers a large management console and prefers small version-controlled instruction
modules and evaluation questions, with selected approved files assigned to each
bot. Shared modules cover suitable common answering procedures; Business-only
knowledge/examples stay beside that Business's code. Do not duplicate a product
specification or automatically make internal docs bot knowledge. Exact file
locations, assignment format, source preparation and deployment/versioning remain
to design; no new configuration tables or file-upload/editor UI are assumed.

**Codex-managed configuration, read-oriented visibility — accepted, 2026-10-08:**
Andrew wants Codex to maintain bot definitions, assigned skills/knowledge and
evaluation cases and run the review/improvement workflow, rather than expecting
him to author these through a web interface. If a bot overview is useful, make
it mostly read-only: which bots exist, their role/mode, assigned skills, and test
questions with expected facts/behavior and dated results. Read effective versions
from the same configuration/evidence, not a separately maintained UI copy.
This is operator visibility, not a required management console or customer-facing
disclosure of internal instructions/test cases. Exact initial overview remains
open; no editor, additional permission system or implementation is approved.

**Configured roles, not default bots — clarified, 2026-10-08:** support
configuration requires at least one named support bot; a Business may configure
zero, one or several helpers. Neither role implies an automatically created or
enabled default bot. Codex maintains the selected definitions and assignments.
Earlier default-pair wording in the decision history is superseded by this rule.

The **support assistant** is BFF-owned,
working within cases/backoffice and suggesting replies for operator review/send,
not an application-triggered general bot. It still uses the selected Business's
knowledge/context; it is not ignorant of product differences. The **helper** is
product-facing and configurable per Business, delivered as a ready-to-use styled
chat/text component. A Business places it and supplies the necessary configuration
and theme rather than reimplementing chat, provider calls, error states or usage
controls. A small integration is still necessary; placement/layout freedom and
desktop/mobile accessibility must remain, without forcing one universal app UI.

**Optional/page-specific helpers and support modes — clarification, 2026-10-08:**
Andrew clarifies that a Business may omit the helper entirely or bind different
helper definitions to different pages, with different approved knowledge and
capabilities. Do not require one global helper for every product or page. Browser
selection of a helper never grants access to an internal support bot or broader tools.

Use the name **support bot**, not "suggestion bot": draft/auto-suggest is its
initial reply mode while quality is being established, not a separate bot identity.
Keep a future automatic-reply mode possible within the same definition, but do
not enable it now or grant account-changing powers by turning it on. The automatic
initial receipt is independent of that substantive-reply mode. Andrew also proposes
later category-specific support bots, for example payment questions. Route cases
to suitable approved definitions without separate runtimes; exact categories,
selection, unknown/mixed-case fallback and rollout criteria remain to design.
A payment-question bot is not implicitly a refund/billing-action agent.

Andrew reinforces the multiple-definition requirement: helper/support are roles,
not a two-bot limit. A Business may assign different named support definitions
to categories or individual cases, for example payment questions versus printed-
document problems, each with its own instructions, permitted skills and tools.
Keep one authoritative case/transcript across selection or reassignment; this
does not request parallel bot conversations, a swarm or one runtime per category.
The earlier recommendation was a configured category-to-bot starting point,
scope checking and bounded handoff/fallback rather than treating the category
as conclusive; Andrew subsequently proposes a support coordinator below.
user category selection, automated classification and operator case override
remain choices, not an approved AI routing layer or mandatory new management UI.
Per-case selection must preserve Business/context boundaries and the initial
draft reply mode. Defining the capability does not require every specialist bot
to be authored before the first release.

**Category routing alternatives — proposed, 2026-10-08:** Andrew asks how
categories and support-bot rules should relate. Separate the category (what the
case concerns) from the assigned bot (which configured assistant handles it).
Several categories may share one bot; categories need not each create a bot.

- **Option A: one configured bot for all categories.** Approach: categories
  organize operator work without changing the assistant. Leverages: the required
  single support definition and lazy skill selection. Constraints: all relevant
  answering behavior shares one definition. Effort: Low. Risk: broad instructions
  become harder to evaluate as distinct support needs grow.
- **Option B: configured mapping with scope check/handoff — earlier recommendation.**
  Approach: Business-scoped categories suggest a named support bot;
  unknown/unmapped cases go to an explicitly configured fallback, which may be
  the same sole support bot used everywhere initially. The bot checks the actual
  message against its configured remit and can request a permitted handoff rather
  than inventing an out-of-scope answer. Leverages: named definitions, assigned
  skills and Codex-owned configuration. Constraints: scope assessment can be wrong;
  category/handoff alone grants no data or payment authority. Effort: Medium when
  multiple bots are used. Risk: missed mismatches or handoff loops; bound transfers,
  validate targets and evaluate deliberately miscategorized/mixed-topic cases.
- **Option C: AI classification/routing.** Approach: an AI chooses the category
  and permitted bot from the message. Leverages: the shared AI runtime proposal.
  Constraints: requires additional routing evaluation, bounded execution and
  ambiguity handling. Effort: Medium–High. Risk: misrouting and extra latency/cost
  before demonstrated need; not recommended for the initial slice.

For B, illustrative TableCards categories are printing help, payment questions
and feedback; these are examples, not an accepted universal list or new payment
authority. A printing specialist can serve printing cases while other categories
share the configured general support bot. Codex maintains categories/mapping;
correcting a case's category/bot is a proposed direct operator backoffice action,
not a bot-configuration editor. Keep the same ticket history and draft-only reply
mode across changes. A customer form may offer a category and uncategorized email
can use the fallback, but exact intake controls remain open. Routing choice and
initial categories are still awaiting Andrew's decision; no schema is selected.

**Wrong category — concern and revised proposal, 2026-10-08:** Andrew points out
that a customer may choose an unrelated category, leading an unsuitable bot to
answer. The category is a hint, not proof of the question's subject. For option B,
give each configured bot a concise remit and allow it to request reassignment
only to configured eligible support definitions within the same Business/context.
This need not be a separate AI classifier on every message. A printing bot given
a billing question should request the permitted billing bot or fall back to
operator attention/clarification, not fabricate a billing answer.

Recommend bounded handoff without bot-to-bot loops, preserving the same case
history while rebuilding the next bot's permitted context rather than forwarding
all internal context. Evaluate wrong categories, no suitable target, mixed topics
and topic changes on later replies. Initial drafts still require operator send;
that is not a substitute for testing routing or a claim that mismatch detection
is guaranteed. Option A (one bot selecting approved skills) avoids specialist
misassignment initially; option C (separate AI triage) adds a routing step but can
still err. Scope-check/handoff was the revised recommendation before Andrew's
coordinator suggestion below, still awaiting acceptance,
not an approved routing service, schema or autonomous reply capability.

**Support coordinator ("master bot") — proposed by Andrew, 2026-10-08:** a
content-aware support entry point could reduce dependence on the customer's
selected category. Compare two materially different meanings before adopting it:

- **Thin coordinator — recommended if specialist bots are used.** Approach:
  inspect the message/conversation and category hint alongside a compact catalog
  of configured support bots and their remits; select one eligible handler for
  the case. Leverages: named bot definitions, metadata-first loading and one
  BFF-owned case/runtime. Constraints: adds a routing step when multiple handlers
  exist, can still misclassify and needs bounded ambiguity/fallback behavior.
  Effort: Medium. Risk: incorrect selection or redundant calls; evaluate wrong
  categories and later topic changes. When one handler is configured, dispatch
  directly rather than force a separate AI routing call.
- **Coordinator consulting multiple specialists and combining answers.** Approach:
  ask multiple bots for inputs and synthesize a draft for mixed questions.
  Leverages: the same named definitions. Constraints: adds coordination,
  result/disclosure review and more model calls. Effort: High. Risk: conflicting
  or compounded errors, context leakage and higher latency/spend. Defer until
  mixed-case evidence establishes a need, rather than assume a bot swarm for MVP.

The thin version knows approved bot descriptions, not all specialist knowledge
or their internal context. BFF validates selected targets and supplies only the
selected bot's permitted Business/customer context and skills. Unclear/no-match
cases need clarification or operator attention rather than arbitrary dispatch.
Keep one ticket history and the existing draft-only substantive reply mode;
coordinator selection does not grant account powers or permission to send.
Codex configures entry/routing definitions, with routing evidence inspectable in
the backoffice if useful. A coordinator is not a compulsory built-in default,
global cross-Business supervisor or separate configuration service. Andrew's
"maybe" is a proposal, not acceptance; exact coordinator behavior remains open.

**Separate runs versus separate services — exploration, 2026-10-08:** Andrew
asks whether bots with different tools/data should run separately. Distinguish:

- One bot selecting skills is simplest when those tasks have the same permitted
  data/tools. It does not establish separation between confidential domains.
- Separate model invocations with per-bot instructions, skill assignments, tool
  allowlists and filtered context can reuse one BFF execution engine and provider.
  Recommend this when bot capabilities/data boundaries differ. Relative effort:
  Medium; risk: inadvertently including another bot's history/tool results.
- Separate deployed services/credentials offer stronger infrastructure isolation
  where warranted, but increase operating/configuration burden. Relative effort:
  High; not justified by the current examples alone.

One authoritative ticket does not require every bot to see all stored messages
or internal results. Build each invocation's permitted view server-side; a
coordinator gets bot metadata and approved routing facts, not the union of all
specialist tools/data. Any result returned to it must itself be approved for
that recipient/disclosure purpose. Separate model calls are not an automatic
security boundary: execution code must validate tool names, arguments, target
Business/environment/account and allowed action, even if the model requests more.
Bot labels/prompts and lazy knowledge loading do not enforce these permissions.

[Convex's context controls](https://docs.convex.dev/agents/context#full-context-control)
allow filtering the model's messages; its [tool guidance](https://docs.convex.dev/agents/tools#using-an-llm-or-agent-as-a-tool)
describes independent agent invocations. These support this design option, not
proof of installed isolation: the repository currently has no agent component.
[OWASP's agent defenses](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html#agent-specific-defenses)
support tool permissions/parameter checks outside model decisions. Test denied
cross-bot tools, hidden-context leakage and handoff outputs with synthetic data.
No separate deployment, new operator role system, specialist authority or schema
change is approved; the exact permitted capabilities remain to decide.

**Resumable specialist sessions — proposed, 2026-10-08:** Andrew asks whether
the coordinator can invoke specialists as sub-agents and continue with them,
rather than restart their conversations. Separate scoped runs do not require
stateless specialists or separate always-running services. Compare:

- Fresh calls with a bounded approved case summary: less specialist-session
  state, but reconstruct context each time and risk losing useful prior details.
- Reusable specialist threads scoped to the same case, Business/environment and
  bot definition: retain permitted messages/tool outcomes and resume that
  specialist on follow-up. Recommend this for ongoing specialist work. Effort:
  Medium; adds session lifecycle, concurrency and retention handling. Risk: stale
  facts/permissions, duplicate actions or leaking an internal result on handoff.

Example: the coordinator asks the printing specialist about a case, receives an
approved result, then resumes the same specialist after a relevant clarification.
This refines the thin coordinator into bounded invocation/continuation of a
selected handler, not unrestricted multi-specialist synthesis or parallel swarms.
Keep one authoritative support case; internal specialist threads are execution
state, not new customer tickets or product-facing conversations. Revalidate
access and refresh changeable facts on each run; saved history never grants
current authority. Pass only approved results to the coordinator and do not
replay completed actions just to reconstruct conversation context.

[Convex thread continuation](https://docs.convex.dev/agents/threads#continuing-a-thread-using-the-thread-object-from-agentcontinuethread)
and [agents-as-tools](https://docs.convex.dev/agents/tools#using-an-agent-as-a-tool)
support the building blocks, not an installed feature or automatic parent-child
authorization. Reuse saved context for each new model request; this is not free,
unlimited memory or a guarantee of lower total tokens. Exact storage/component,
context/retention limits and safe resume/version behavior remain to design;
no schema change or whole-brainstorm implementation is approved.

**Saved wait for operator approval — requested capability, 2026-10-08:** Andrew
extends continuity to a support flow that needs an operator decision before an
action. Save both the conversation and an explicit pending action/continuation;
chat history alone is not an execution checkpoint. Two options: let the operator
perform the action manually and record its outcome (less automation), or let an
allowed tool resume after an authenticated approval (recommended capability for
approved actions, with more execution/lifecycle handling).

Proposed flow: bot requests a precisely described allowed action; case waits for
operator approval; backoffice shows the actual target/arguments and permits
approve/reject; execution rechecks current authority/state and guards against
duplicate effects; specialist/coordinator continues from the saved point using
the actual result or denial. No model process must run continuously while waiting.
Approval applies only to that request, not future actions or changed parameters.
Rejection, expiry/cancellation, changed facts and retries must not become silent
approval. All admitted operators still use the existing full-access model; this
does not introduce granular human roles or delegate their authority to bots.

[Convex tool approval](https://docs.convex.dev/agents/tool-approval#server-side-flow)
persists pending requests and supports later approval/denial and continuation.
Its documented default denies unresolved approvals when a new generation starts;
incoming customer replies while waiting therefore need deliberate queue/update
handling, not blind continuation or replay of a stale approval. This is a
candidate building block, not an installed support workflow. Approvals belong
in direct operator backoffice work; Codex configures the per-action policy.
Specific first actions, expiry/new-message behavior and schema remain open.
Initial support replies remain drafts for human send; discussing resumable
approval does not authorize refunds, account changes or automatic ticket replies.

**Independent reply/tool policies in code — direction clarified, 2026-10-08:**
Andrew wants automation configurable per action, with optional operator approval
and deterministic rules over meaningful customer facts/events. Separate two axes:

- Reply handling: disabled, draft for human review/send, or conditional automatic
  send where explicitly enabled. This is separate from the automatic initial receipt.
- Tool execution: disabled, automatic within the allowed scope, always require
  approval, or require approval according to a code-owned predicate.

Recommend small registered policy functions plus validated configuration
parameters (for example a reviewed threshold), returning **block**, **needs
approval** or **allow** with an inspectable reason. The bot proposes a request;
trusted execution code resolves facts and evaluates policy. Missing/error/stale
facts must not silently allow automatic execution. Mandatory tool/recipient,
Business/account authorization and input validation precede this decision;
"no approval needed" is not "no restrictions," and approval cannot override a
hard access denial. A read-only tool still needs scoped data/disclosure checks.
Enforce the reply policy at actual send time too, so a draft-only bot cannot
bypass it by invoking a generic email tool. Recheck relevant facts/policy when
resuming an approved action; materially changed requests need a new decision.

**Implementation alternatives, not an implementation request:** a small set of
code-defined predicates with configuration reuses reviewed TypeScript/operator
patterns (Low–Medium relative effort; risks are incorrect/missing facts or buggy
rules, addressed through boundary tests). A stored arbitrary condition tree or
visual builder provides more editing flexibility but requires expression
semantics, validation/versioning and UI maintenance (High relative effort;
overengineering risk). Andrew explicitly rejects a conditioning engine; recommend
the first, maintained by Codex, with optional read-oriented policy/result visibility.
Shared code owns gating/resume mechanics; Business/action-owned code chooses its
domain facts and rules instead of imposing TableCards-specific refund behavior.

Account age and past refunds are Andrew's hypothetical examples, not accepted
refund criteria or approved financial actions. Sparse product activity can inform
rules only within its documented trust/completeness bounds; missing events do
not prove no previous refunds. Money/access decisions require current verified
billing/entitlement facts and applicable terms, not a bot-supplied count or
claimed identity. Rule inputs/configuration remain outside user/model control.
Code-enforced authorization prevents prompt text from directly changing the
rules, but is not blanket prompt-injection immunity: a bot may still propose bad
arguments or disclose supplied information. Test attempted overrides, poisoned
inputs/results, unknown facts, thresholds and send/tool bypasses with harmless
fixtures, alongside approved normal cases.

[Convex conditional tool approval](https://docs.convex.dev/agents/tool-approval#defining-tools-with-approval)
provides a boolean/function approval hook, not the complete authorization policy.
[OWASP execution-boundary guidance](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html#secure-implementation-pipeline)
supports permission/argument enforcement outside the model. This accepts the
desired configurable, code-protected policy capability; exact predicates,
initial auto-send/tool settings and schema remain to design. Existing draft-only
support scope is unchanged until explicitly revised; no refund tool or autonomous
send is enabled or approved by these examples.

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

The existing TypeScript SDK already provides React auth bindings/controls, not
a helper component. That is a reuse pattern, not evidence chat exists. Prefer
shared runtime behavior with themed defaults. Andrew subsequently requires a
small configurable custom-bot definition, not two hardcoded-only bots: common
instructions, assigned knowledge and a selected subset of fixed reviewed tools
(the later on-demand/programmatic refinement below revises this fixed-only boundary).
Helper/support are configurable roles using that definition, not built-in defaults.
Additional bots using the same
capabilities should be configuration, not a separate runtime; new tools/data
sources still require implementation and review. Do not build dynamic tool upload,
a workflow builder or a separate provider per role.
Application instruction modules are distinct from the Codex review/improvement
skill. Assigning instructions never grants tool/data authority. Runtime knowledge
or instruction Markdown is behavior-affecting input: classify its changes for
affected evaluation/release checks, unlike unrelated documentation-only Markdown.
Neither file edits nor evaluations authorize automatic production publication.

**Allocated knowledge, fixed tools and progressive helper context — earlier refinement, 2026-10-08:**
Andrew separates a bot's main instructions, additional knowledge and tools.
Approved product explanations and FAQ Q&A can be assigned as knowledge. Fixed
tools may expose explicitly permitted user/account facts; saying "tools can wait"
must not silently remove that possibility or imply a dynamic plugin registry.
FAQ examples supplied as knowledge and held-out evaluation cases serve different
purposes; do not supply all evaluation answers as context and claim independent
quality evidence. Dynamic customer records are scoped runtime context/tool results,
not a shared knowledge file containing everyone's data.

Andrew wants the helper able to grow to understand the signed-in customer and
current product/page, and later relevant saved work. Distinguish the TableCards
Business, a saved event/project (for example a wedding), and recorded activity
events (for example PDF export completed). They are not interchangeable records.
Recommend progressive context rather than implementing every integration now:
approved product knowledge and a small page identifier/description first; selected
authenticated BFF-held customer/account/event facts when explicitly enabled; and
later product-owned read tools/context adapters for saved-project facts that BFF
does not hold. A page/project identifier from the browser never grants record
access. Backend checks still bind reads to the current Business/environment,
user/account and role, and prevent stale context crossing sign-out/account changes.

The shared component/runtime supplies a stable context boundary; each Business
decides its domain facts and approved fields. Do not impose a TableCards project
schema on other products, copy their databases into BFF, automatically send guest
lists/files, or expose internal implementation information. The initial backoffice
decision of no custom Business pages/direct product reads is unchanged; a future
customer-helper adapter is a separate scope decision. This accepts extensibility
as a design requirement, not those live-data integrations for the initial MVP.

**On-demand skills and programmatic Business extensions — latest direction, 2026-10-08:**
Andrew rejects loading all product knowledge into every invocation, particularly
for frequently used customer-facing helpers. Each bot has a name, its own main
instructions and explicitly assigned skills. Each skill has a title/identifier,
a concise purpose and when/why to use it, plus full content. Initially supply
only the small index of that bot's permitted skills; the bot requests relevant
content on demand. FAQ/how-to material can be a skill, with a small product
introduction only where useful. Shared skills are reusable across appropriate
bots; Business-only knowledge stays scoped. This is the application bot's skill
mechanism, separate from the Codex evaluation/review skill.

The [Agent Skills specification](https://agentskills.io/specification#progressive-disclosure)
supports metadata first and full content on activation. Its complete directory,
script execution and tooling conventions are not automatically requirements for
this runtime. Resolve only assigned/approved skill identifiers; do not expose
arbitrary repository paths or automatically follow an internal source reference.
Bound loaded content, skill reads, model/tool steps and cost; evaluate whether
the bot selects the right skills, avoids unassigned knowledge and answers well.
Lazy loading avoids unused context but may add calls/latency; benchmark rather
than guarantee lower total spend. No search/vector database is assumed necessary.

Andrew also wants a **programmatic context and tool extension interface**:
the Business chooses current-page data and may supply code-registered capabilities
for a helper invocation, such as navigation or a specific update. This revises
the earlier fixed-shared-tools-only proposal; fixed BFF tools can still be defaults.
No web tool editor, dynamic arbitrary-code upload or MCP prerequisite is requested.
The same extensible bot contract supports these code-owned additions; exact
registration/validation and result/continuation details remain open; Andrew
subsequently settles UI execution through the round trip below.

Distinguish local UI callbacks from authenticated backend actions. Browser data,
tool metadata and model arguments do not create authority or prove paid access.
Business backends keep existing user/account checks for reads/writes; local UI
tools validate arguments/destinations and do not acquire BFF administrator powers.
A frontend function is not executable code sent to the BFF server. Tools operate within the supplied approved
capabilities and relevant user context, with confirmation/recovery appropriate
to impact rather than a universal extra prompt for harmless actions. Treat
context/tool results as data, not instructions that override the bot's policy.

**UI tool round trip — accepted direction, 2026-10-08:** the Business page declares
the tool names/descriptions and argument shapes it supports for that helper
invocation; registered handler code remains in the page/application. BFF/the bot
returns a structured request naming one of those tools with arguments, not
JavaScript, shell commands or arbitrary URLs to execute. The page checks the
request against its registered handlers/current context and executes its own
code. Recommend returning success/failure/decline to the same conversation so
the bot does not claim an update happened merely because it requested one.
Exact message schemas, call correlation/retry behavior and continuation need design.

Some actions may need user approval; Andrew does not require an extra approval
for every tool invocation. Let code-owned action policy/local UI handle approval
appropriate to impact, alongside existing backend authorization for persistent
effects. Stale requests after route/account changes, invalid arguments, duplicate
calls and tool failures belong in evaluation. This settles the execution boundary,
not the first write actions, their approval policy or permission to implement/deploy.

The Business chooses what suitable context it shares; do not automatically send
whole pages, every customer record, guest lists or files. Exact domain fields,
privacy/disclosure policy, payload limits, state changes and first allowed actions
remain to decide. Programmatic extensibility is accepted as direction, not
permission for all possible write actions or an implementation request.

Recommend a small common foundation: a Business/environment-scoped role, approved
knowledge/context, allowed operations, version, bounded usage and an ability to
stop a failing assistant. Keep repeatable configuration in validated operator
automation and expose essential state/evidence in the backoffice; add management
buttons only for a demonstrated direct operator task. Business knowledge and
domain behavior remain product-owned, not one universal shared bot personality.

For event reads, authorize the user/account scope and select allowed **fields**
server-side before supplying model context. A meaningful event can contain a
customer-safe outcome and internal-only explanation; showing one does not authorize
the other. Customer-safe means permitted for that customer, not public to anyone.
Unknown/unclassified properties are withheld by default. BFF must not return a
raw event and ask the model to conceal fields, nor infer authority from a claimed
email. Exact event contracts and classifications remain open, not new schema.
The helper and ticket assistant need different approved views; full access for
human operators does not confer the same access on either bot. Events are
evidence, not current entitlement/payment authority, and missing events are unknown.

**A — knowledge-only for both initially:** lower effort and less private context,
but ticket suggestions cannot explain recorded customer-specific failures.
**B — knowledge/page-context helper plus filtered event/customer summaries for ticket
drafting (recommended):** uses the accepted BFF-held meaningful facts/events;
medium relative effort because read/disclosure rules and tests are needed.
It improves investigation without direct product-database access, account changes
or raw history dumps. This capability remains a proposal for Andrew's choice.

MCP may later expose those same bounded tools to a permitted agent; it is an
interface, not an access grant or prerequisite. Reuse server-side policy rather
than create a second source of permissions for each connector. Evaluation must
test these filtered views, cross-Business/account denials and disclosed answers,
not just a bot's wording. Deferred MCP scope is linked from the existing AI idea.

## Business-first operating context — accepted direction, 2026-10-08

Andrew confirms one shared backoffice for all Businesses, with customer work
inside the selected Business. Whether the same person uses another Business is
usually irrelevant to that investigation: TableCards and Content Chaser may
serve unrelated needs. Do not require cross-Business customer lookup, combined
person profiles or matching-email associations in the initial scope. This
accepts the context boundary, not the whole feature or an implementation.
Distinguish **where an operator works** from **where reusable logic lives**.

### Context Option 1: Shared backoffice, Business-first workspace — accepted

**Approach**: Select a Business and its environment, then investigate its customers,
accounts, relevant product activity and support cases. For example, TableCards →
customer → meaningful BFF details, recorded product milestones and tickets.
Keep reusable support/conversation and authorization mechanisms shared where
they genuinely fit; product knowledge, domain data and allowed actions stay scoped
to that Business. This does not approve any particular new tables or tools.
**Leverages**: The existing environment-selected backoffice and environment-scoped
customer queries; replaces disconnected lists with useful journeys rather than
starting from a new global customer model.
**Constraints**: Switching Businesses may initially be necessary to inspect another
product. Production/development must remain visibly distinct. Activity ingestion
and support workflows are still new capabilities, not present integrations.
**Effort**: Lower than a global-first workspace for this context decision; the
broader support/AI scope retains its own implementation complexity.
**Risk**: Reusable mechanisms could become TableCards-specific unless their
contracts preserve Business scope and product-owned facts/behavior.

### Context Option 2: Separate backoffice and support implementation per Business

**Approach**: Each product independently owns the complete operator/support system.
**Leverages**: Maximum freedom for each product's workflows and presentation.
**Constraints**: Common capabilities and fixes must be maintained repeatedly.
**Effort**: Medium to High as more Businesses are added.
**Risk**: Duplicated support, permission and delivery logic recreates Andrew's
maintenance concern; later aggregation is more difficult.

Andrew accepts Option 1. Cross-Business customer discovery can be reconsidered
later if a concrete need appears; it is not a queued requirement. Sharing
mechanisms does not require sharing a customer's context between Businesses.
This changes neither the underlying identity model nor the ban on email-based
identity merges. The single roadmap is reconciled to this boundary.
The visibility options below describe information **inside the selected Business**
under this decision, not an automatic combined customer dossier.

### Operator access — accepted simplification, 2026-10-08

Andrew says no permissions system is needed now: everyone has all permissions.
In this backoffice discussion, interpret everyone as **approved backoffice
operators**, not public visitors or product customers. All operators can select
any Business/environment and use every implemented backoffice feature. Do not
design separate admin/support/read-only roles, per-Business operator grants,
custom permissions screens or operator-role tables for this scope.

Keep sign-in and the existing approved-operator gate. Business selection is an
operating context, not a restriction between operators. This does not change
customer account/membership rules, grant access to new people, expose credentials
or add raw database controls. Which actions the backoffice offers is still a
feature-scope decision; full access means access to those agreed features.
The knowledge helper and ticket assistant never inherit the human operator's
full access. Ticket replies start as operator-approved suggestions; data/tool
scope remains open.

## Customer visibility — earlier alternatives, 2026-10-08

These preserve the earlier comparison. Andrew subsequently selects meaningful
BFF information plus business-reported events below, not direct product-backend
reads or custom backoffice pages for each Business.

Andrew asks for options with an explanation and a recommendation on each question,
not an open-ended request to invent the scope. Start with what an operator should
see when opening a customer:

### Visibility Option 1: Basic customer record

**Approach**: Show the customer's accounts in the selected Business, current
access/offer, allowance and memberships. Cross-product correlation is a separate
choice, not required for opening this record.
**Leverages**: Existing shared identity/account/access records and backoffice lookup.
**Constraints**: Does not explain whether a product task succeeded or failed.
**Effort**: Low to Medium relative to the alternatives.
**Risk**: Andrew still has to investigate elsewhere when someone needs help.

### Visibility Option 2: Customer record plus useful activity and support — recommendation

**Approach**: Add a bounded recent-activity summary for the selected Business and
the customer's support cases there. For TableCards, proposed examples are saved-project
summaries, PDF export outcomes and AI-generation outcomes. Show confirmed failures
and unknown/missing evidence explicitly, without collecting every click.
**Leverages**: Shared account context and existing product-owned project, export
and AI-batch records; the proposed support workflow would supply case history.
**Constraints**: Product-summary access and tickets are not built yet. Private
guest lists, PDF contents and raw AI prompts are not copied into the overview.
**Effort**: Medium to High.
**Risk**: Excessive data exposure or confusing stale evidence unless summaries
are permission-scoped, bounded and clearly labelled.

### Visibility Option 3: Detailed behavioral analytics too

**Approach**: Also track page visits, interaction sequences and abandonment to
understand behavior within the Business, not just recorded work and support.
Cross-product analytics would require an additional scope decision.
**Leverages**: The later analytics discussion, not an existing click-history store.
**Constraints**: Adds new tracking, privacy, retention, cost and signal-quality decisions.
**Effort**: High.
**Risk**: A larger tracking system with noisy conclusions before the operating
need is demonstrated; inactivity does not establish that someone is stuck.

Recommend Option 2: enough context for Andrew or a permission-bounded ticket agent
to investigate routine problems, without turning the backoffice into an analytics
platform. That earlier recommendation is refined by the accepted boundary below;
the proposed direct product-summary integration is not part of the current slice.

## BFF customer information and business events — accepted direction, 2026-10-08

Andrew wants the shared customer page to show the meaningful information BFF
holds about a customer in the selected Business. It is not a raw table browser
or every internal authentication field. Initial backoffice pages are generic:
no custom pages per Business and no direct queries into product-owned databases.
Product-specific backoffice extensions are a [future idea](../../docs/architecture/future-ideas.md#product-specific-backoffice-extensions),
not a dependency of this feature.

Useful existing information to present includes:

- Profile and safe public identifiers, email/name and registration time.
- Accounts, memberships/roles and relevant invitation status.
- Current access/offer, feature limits and remaining/reserved/consumed units.
- Session state and relevant login/logout, revocation and ownership history.
- Checkout status with its actual source: Build 3 is a no-charge mock, not paid
  subscription evidence. Real payment history appears only when implemented.
- Support cases/conversations once built. Secrets, session handles/token hashes,
  provider subjects and temporary auth proofs are not operator information.

Businesses report **important events**, not technical logs or every interaction.
For example: project saved, PDF created or failed, AI generation completed, or a
customer blocked by an offer limit. Candidate metadata is small structured facts,
such as a public operation reference, card count, outcome and safe reason code;
not guest names, document contents, raw prompts, stack traces or arbitrary JSON.
The exact event catalog and payloads remain proposals.

### Proposed ownership and storage, not an approved schema

- **Business:** decides meaningful domain milestones and reports them through a
  shared contract; retains product records and files. It need not implement a
  custom backoffice page or a remotely queried diagnostic adapter.
- **BFF:** owns the customer context, scoped event ingestion/validation, bounded
  activity history and generic backoffice presentation. Reuse existing BFF
  records for current state rather than copying customer/account tables.
- **Backoffice:** reads BFF only for this slice. Event names/structured properties
  may vary by Business; a readable label and shared presentation are not custom
  product pages. Missing event evidence remains unknown, not proof of inactivity.
  The ticket agent must likewise distinguish recorded outcomes from unavailable
  current product details and hand off questions that require evidence it lacks;
  it does not gain a hidden direct product-data integration.
- **Potential new table:** a sparse `businessActivityEvents` store, separate from
  `securityEvents`. Conceptual fields are Business/environment, optional verified
  user/account association, event name/version, occurrence/receipt time, event
  reference for deduplication, source and bounded properties. Name, validators,
  indexes, retention and migration impact need an explicit schema proposal and
  Andrew's confirmation before implementation. Do not create a new person table.
- **Ingestion boundary:** trusted Business backends report completed operations;
  BFF validates environment and user/account relationships. Any browser-observed
  intent is labelled separately and cannot establish payment, access or an
  authoritative operation outcome. BFF-owned lifecycle facts can reuse existing
  records or emit their own events; do not duplicate every security event.
- **Cost/reliability:** propose a small catalog, bounded payloads/rates, retry
  deduplication, retention and paginated per-Business/customer reads. Convex
  [indexes](https://docs.convex.dev/database/reading-data/indexes/) support scoped
  chronological access; they do not make storing unlimited activity free.
  Events are investigation evidence, not entitlement/billing truth. Missing or
  delayed reports must not break a successful product operation or alter access;
  delivery/retry behavior remains a design choice.

### Reuse for analytics and future offers

Andrew suggests the same meaningful facts might later inform marketing pixels
or special-offer eligibility. Keep the internal event distinct from the policy
that consumes it. The [existing offers idea](../../docs/architecture/future-ideas.md#shared-promotions-personal-offers-and-repeat-purchase-campaigns)
owns future discount scope; this does not add an offer engine to the current work.
Examples to evaluate later are reaching a feature limit, returning after a
previous purchase, or verified eligibility for a first paid offer.

Export only specifically mapped, appropriate event fields to a chosen external
provider, not the operator's complete customer record or every support/failure
event. Providers use their own conventions: Google Analytics documents
[recommended events](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
and [PII restrictions](https://support.google.com/analytics/answer/6366371?hl=en-SD).
These are reference examples, not a provider selection. Attribution, required
notices/consent, retention and delivery deduplication need review before enabling
marketing export. An event never itself applies a discount or charges a customer;
future offer eligibility must also consult current verified account/billing state.

### Event-scope alternatives — B accepted, 2026-10-08

- **A — successful milestones only:** fewer events, but misses meaningful blocked
  customer outcomes. Lower relative effort; incomplete support context is the risk.
- **B — milestones plus important blocked/failed outcomes (recommended):** useful
  support and future eligibility evidence without recording technical noise.
  Medium relative effort; payloads and repeated-failure deduplication need limits.
- **C — detailed interaction history too:** adds visits/clicks and abandonment
  tracking. Higher relative effort, volume and privacy complexity; not implied
  by the accepted operator-event direction.

Andrew accepts B: successful milestones plus important blocked/failed outcomes,
without detailed click tracking or technical logs. Define a small initial catalog
rather than ask every Business to send everything. Exact event names/payloads,
schema and marketing/offer integrations are not yet approved; this choice is not
acceptance of the whole brainstorm or an instruction to implement.

## Ticket system and email-first conversations — exploration, 2026-10-08

Andrew first asks to understand the ticket system before choosing access links,
then clarifies the accepted channel/UI boundary: **customers can open a ticket
on the website or by emailing support; ongoing replies use email; history and
conversation management are in the shared backoffice only**. No customer
ticket-history, conversation/reply page or secure-link portal is required in
the Business website for MVP. The website submission form remains in scope;
"no ticket-history UI" does not mean "no ticket-opening UI".
Andrew subsequently accepts **BFF as the authoritative home for tickets and
their conversations**, rather than an external helpdesk. Email is transport,
not a second case-management system. These decisions settle channels,
presentation and storage ownership, not the email provider, exact schema,
AI authority or approval of the whole feature.

Separate three responsibilities:

| Responsibility | Purpose | Accepted ownership / role |
| --- | --- | --- |
| Ticket/case | Business context, contact, trusted customer/account association where available, subject, status and who needs to respond | Shared BFF workflow |
| Conversation | Ordered customer and human/AI support messages belonging to that case | BFF-owned durable transcript, not independent threads per product; AI participation remains undecided |
| Email transport | Deliver outgoing replies and receive/correlate customer replies | Email provider integrated with that workflow |

An illustrative email-first journey is: customer emails support (or submits a
shared website submission form) → a Business-scoped case is opened → an operator,
or the ticket agent within its separately agreed scope, replies → the customer
receives email and replies normally → that message joins the same case. The
operator sees the full conversation, status and relevant BFF facts/events in the
shared backoffice. The customer needs no login or ticket-history page to continue
the email conversation. Website submission and email intake are both required
channels under this decision. Andrew also accepts website submission without
sign-in, while raising the risk of unverified contacts. Exact form fields,
verification behavior, contact trust and routing remain design choices. Operators reply/manage cases
in the backoffice; customer emails and operator replies belong to the same case.

### Ticket Option 1: Ordinary shared mailbox only

Historical comparison: a standalone mailbox does not satisfy the subsequently
accepted backoffice history/handling requirement without additional integration.

**Approach**: Customers and operators exchange email in an ordinary mailbox;
there is no BFF-owned case workflow.
**Leverages**: Basic email tools without a new customer portal or custom case UI.
**Constraints**: Joined BFF customer/event context, consistent case status and
human/AI coordination are not provided automatically. The public/signed-in
support promise needs reconciliation if this replaces structured ticket intake.
**Effort**: Low for initial email exchange, not for later integrations.
**Risk**: Unanswered cases and fragmented context as volume or automation grows.

### Ticket Option 2: Shared BFF cases; email-only customer conversation — accepted, 2026-10-08

**Approach**: Cases/transcripts have a durable home in the shared BFF workflow;
customers correspond through email, and operators handle cases in the backoffice.
**Leverages**: Existing Business/user/account context, the accepted generic
backoffice boundary and planned meaningful events; future ticket-agent support
can operate on the same cases instead of maintaining a separate inbox.
**Constraints**: Reliable inbound/outbound email, case correlation, spam controls,
delivery state and duplicate handling are real new backend work. Evaluate reusable
thread/storage components before proposing a schema; do not build a bespoke AI
conversation engine or claim email integration already exists.
**Effort**: Medium to High, with less customer UI than a portal but not trivial.
**Risk**: Lost/misrouted or duplicate replies and replies that appear sent when
delivery failed; those states must remain visible and not resolve a case.

### Ticket Option 3: External helpdesk owns cases and conversations

Historical alternative, not selected: Andrew chooses BFF-owned records.

**Approach**: A helpdesk receives email and owns the case/transcript; BFF supplies
bounded context or references through a separately designed integration.
**Leverages**: An existing case/email workflow rather than implementing that core.
**Constraints**: Select and research a provider first. Operating in its UI rather
than our backoffice is a different experience; replying from the shared
backoffice and giving AI relevant case context require additional integration.
Choose one authoritative transcript home, not two independently editable copies.
**Effort**: Low to Medium for standalone setup; shared-backoffice integration can
be Medium to High depending on provider capabilities.
**Risk**: Vendor cost/dependency and an awkward split operating surface.

Andrew accepts Option 2 for the joined backoffice/customer workflow. Keep the
external-helpdesk alternative above as discussion history, not an open storage
choice. Evaluate suitable reusable components without selecting a vendor or
claiming email integration exists.
Email follow-up removes a customer portal, not the website submission form or
the backoffice responsibility to manage cases. The email provider sends and
receives messages; BFF keeps the authoritative case and conversation.
Submitted email addresses or inbound text do not establish account authority;
routing and private-data disclosure still need a defined trust boundary.
The knowledge helper's separate on-site chat remains an open discussion, not
silently removed by this ticket-channel proposal.

### Public submissions and contact trust — exploration, 2026-10-08

Accepted: a person can submit the website form without signing in. Andrew's
concern is that the supplied identity/email is unverified. After Astra's review,
he accepts immediate intake plus the initial receipt, without an upfront
email-confirmation gate. General help can proceed; private support requires
appropriate authenticated identity/account authority. No email claim, receipt
or contact confirmation associates the request with an account automatically.

Andrew subsequently challenges mandatory email confirmation: requiring the
sender to open email undermines the low-friction website/contact-us concept,
even though it is not technically a login. He asks Astra for an independent
review of this dilemma and wants to continue other questions meanwhile. The
verification choice was parked pending that review and further discussion;
the earlier recommendation below is not an accepted requirement.

Keep three facts separate: submission, confirmed access to a contact mailbox,
and authenticated authority over a Business account. A public submission may
claim an email but must not disclose matching account details or be treated as
an authenticated customer. Existing [identity rules](../../docs/architecture/adr/0004-business-customer-auth-and-accounts.md#authority-and-isolation)
use provider issuer/subject; email equality never merges identities.

**Option A — confirm email before normal handling (historical recommendation):** save the
submission as pending contact confirmation, send a neutral confirmation link,
then admit the confirmed request to the normal support queue. This adds a step
and may strand genuine requests when delivery fails, but reduces processing of
requests made using someone else's address, especially before future AI handling.
Relative effort: Medium; delivery, expiration and recovery need design.

**Option B — accept immediately, visibly unverified (accepted, 2026-10-08):** handle the request without
an upfront email challenge; limit any response to non-private help until adequate
proof is obtained. Less friction and lower relative effort, but more false/junk
cases and a greater risk of operators or future AI over-trusting the contact.

In either option, contact confirmation is not a product login, membership proof
or authority for private-data disclosure/account changes. Email checks also do
not stop all bots: rate limits and appropriate anti-abuse controls must cover
submission and outgoing confirmation, not only the support queue. A proposed
confirmation email must not repeat arbitrary submitted content, reveal whether
an account exists or become an unlimited email-sending endpoint.

[OWASP email verification guidance](https://cheatsheetseries.owasp.org/cheatsheets/Email_Validation_and_Verification_Cheat_Sheet.html)
supports limited-use/expiring verification tokens, avoiding account enumeration
and not treating email alone as strong account security. Applying a confirmation
gate to public support was our earlier recommendation, now challenged by Andrew,
not a universal rule from OWASP or an accepted requirement.
Direct inbound email and signed-in submissions need their own trusted intake
rules; a `From` address alone is not proof. Exact inbound correlation,
authenticated private-support continuation/recovery, abuse limits, retention
and provider remain to design. No pending-confirmation gate is required for
ordinary public submissions.

#### Independent Astra review — 2026-10-08

Astra recommends Option B and considers the earlier mandatory-confirmation
recommendation too strict for this MVP. Receiving a suggestion or answering a
public how-to question does not require account proof. Requiring everyone to
open email adds friction without establishing product-account authority.
Andrew accepts this intake policy after the review: receive immediately and
send the initial receipt, with no mandatory email confirmation. This does not
approve sensitive actions, AI autonomy, schema or the whole brainstorm.

The third alternative is immediate intake with human screening before the
first substantive outbound reply. It can reduce initial automation risk but
conflicts with minimizing Andrew's routine work. No option needs a portal,
new operator roles or an independent identity framework.

Keep requests visible with their origin and unconfirmed account identity.
Spam/volume controls, mailbox reachability, evidence of mailbox access and
product-account authority are different concerns. Provider delivery acceptance
does not prove a person read an email. A securely correlated reply can provide
limited evidence of contact for that conversation; neither `From`, an email
match nor a guessed reference authorizes private case/account access. Exact
inbound correlation and authenticated private-support continuation remain open.

Example boundaries: accept "Please add X" immediately; answer "How do I print?"
with public instructions; do not expose team members or earlier tickets to
someone claiming a customer's email. Signed-in context must not authorize
private disclosures to an arbitrary replacement contact address. A future AI
responder must not gain private customer data by matching the public request's
claimed email. Enforce tool authority outside the model; see
[OWASP agent defenses](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html#agent-specific-defenses).
The email-verification source above concerns identity/account use; it does not
make confirmation mandatory for ordinary contact forms.

#### MVP simplicity boundary — accepted, 2026-10-08

Andrew rejects overengineering contact verification for the MVP. Keep Google as
the only product authentication method; support does not introduce email/Apple
login, a second identity system, custom verification tiers or an account-recovery
workflow. A person unable to complete Google sign-in can still contact us for
general help/feedback, but support does not grant alternative product access.
Requests such as "Please add Apple/email login" are suggestions, not a commitment
to add those providers. Existing public/guest product behavior is unchanged.

Use existing signed-in Google/Business context when it is available; otherwise
receive the contact, send the initial receipt and continue ordinary email replies
without a separate verification ceremony. Keep basic spam/duplicate/loop controls
and existing account permissions. Simply typing another person's address does
not let the submitter read replies sent only to that address; do not describe it
as automatic account takeover. Extra verification/recovery machinery is not a
required MVP deliverable. Ticket replies subsequently start as auto-suggest;
helper context and ticket tools remain separate open questions.

#### Intake scope reopened — 2026-10-08

Andrew asks a second independent Astra reviewer to reconsider whether this
Google-only, simple MVP needs a signed-out website form at all, public support
email alone, or signed-in support only. Separate contact channels from BFF case
ownership and email follow-up; removing a form does not remove the email workflow.
The earlier public-intake acceptance is under review, not silently withdrawn.
Continue independent questions while the review runs; no implementation is authorized.

The second Astra review recommends a signed-in form plus a public support email,
deferring the signed-out form until observed friction justifies it. Email-only
intake still needs the BFF/email workflow; removing a public form is a modest
saving, not elimination of ticket infrastructure. A mailbox-only pilot would be
a materially smaller but separately reopened ownership decision. These are
recommendations awaiting Andrew's choice, not changed accepted channels.

### Contact purposes and reply expectations — exploration, 2026-10-08

Andrew clarifies that submissions also include feedback, suggestions and missing
capabilities ("I am missing X"), not just support incidents. Treat these as
meaningful contact purposes; a suggestion does not promise implementation, and
negative feedback is not automatically a technical incident. Exact categories
and whether the customer chooses one remain open. The existing `feedback`
product scope can cover suggestions without implying a new schema enum/table.

From the customer's perspective this can be a contact-us entry. The ticket
record adds operator history, follow-up and context behind the scenes; it does
not require the sender to use a ticket portal or prove account ownership merely
to express an opinion.

**Option 1 — a substantive reply to every message (historical alternative):** each submission has a response
expectation, including pure suggestions. Leverages one consistent case workflow;
adds routine response work and risks empty acknowledgements or an unrealistic
promise. Relative effort: Medium; delivery/automation are still unapproved.

**Option 2 — substantive replies as needed (accepted, 2026-10-08):** use the
same intake and backoffice history, but distinguish requests for help/answers
from feedback that only needs recording. Questions/problems and explicitly
requested responses need follow-up; suggestions may receive a reply when useful,
not an automatic promise. Relative effort: Low to Medium; intent can be ambiguous,
so operators must be able to correct how a message is handled. This does not
approve an AI classifier, response SLA or unsolicited automatic email.

Andrew accepts human or AI replies **as needed** and separately requires an
automatic **initial receipt email**, including for feedback/suggestions. A
receipt is not a substantive answer, verified identity, resolution or a feature
delivery promise. The human/AI responder role is accepted; ticket AI subsequently
starts as suggestions for operator approval, not automatic replies. Private-data
tools, provider/model, budget and escalation still require decisions.

Proposed receipt behavior: after the initial message is durably accepted, send
one neutral Business-branded acknowledgement for that case. Do not resend it
for each conversation reply or webhook retry. It may identify the Business and
give a non-secret case reference, but must not echo arbitrary submitted content
or expose matching account facts. Sending/delivery failure stays visible to
operators and does not discard the original message. Avoid autoreply loops and
bound sending per destination/source so the public form cannot spam another
person. These protections preserve the required normal-customer receipt;
provider-specific mechanics and exact limits remain to design. Receipt delivery
does not force a separate customer verification click.

Andrew asks how unanswered/unverified contacts are handled and proposes receipt
wording such as "If you did not send this request, report it here." Unconfirmed
requests remain visible and useful for feedback/general help; they do not need
to earn product-account authority to exist. Delivery alone is not verification.
A securely correlated reply can provide evidence of contact for this case,
not authenticated product-account ownership or access to older conversations.

Wrong-recipient report alternatives, optional proposals rather than required
MVP verification machinery; neither is accepted implementation:

- **Case-specific report link (recommended):** after deliberate confirmation,
  mark the contact disputed and stop further mail for that case/address pair,
  preserving the record for operator review. Low customer effort, Medium relative
  implementation effort; requires a limited-purpose capability and safe handling
  of automated link fetching. It grants no history access, deletes no record,
  affects no other ticket/account and must not trigger another receipt.
- **Reply "not me":** no report page, but the same case must recognize the report
  and stop further mail; handling may require human attention or narrow automation.
  Low initial UI effort; slower or mistaken handling is the risk.

Anti-spam bounds intake and outgoing traffic, repeated submissions/receipts and
auto-responder loops. Account trust instead governs what facts may be disclosed
or which actions are authorized. Neither anti-bot success nor mail delivery
proves account authority. Exact limits, report mechanism and contact-evidence
semantics remain open; the AI reply-autonomy question is still unanswered.

### Business email appearance — accepted goal, design open, 2026-10-08

Andrew requires Business-configured email styling and a logo, analogous to the
shared auth page. Current [auth presentation](../../platform/bff/libs/contracts/src/auth.ts)
supports product name, light/dark/system theme and accent color, not a logo.
[TableCards defaults](../../projects/tablecards/customer-auth.defaults.ts)
provide reviewed values; the [operator configuration workflow](../../tools/bff-operator/README.md)
previews/applies them, and the backoffice displays the effective presentation.
Support emails/receipt templates are not implemented.

Recommend one reusable Business brand identity (name, logo and accent), rendered
appropriately for auth and email instead of maintaining divergent copies. An
email-safe shared template and readable plain-text/image-blocked fallback are
preferable to a per-Business email editor or importing web-page CSS. Sender and
reply-address verification are transport settings, not branding proof.

Operational placement proposal: configure/apply approved branding via the
existing validated Codex/operator pattern; show effective settings and an email
preview in the backoffice. Whether direct brand editing belongs in its settings
UI remains a design question, not a new editing control already approved.
Shared BFF owns rendering/delivery; each Business supplies its brand choices.
The logo/configuration contract, asset ownership and any structural changes need
explicit confirmation before implementation; no schema or migration is approved.

## Open Questions

1. What context should the knowledge helper have: public product knowledge only,
   current-page context too, or a small approved set of customer facts?
   Recommend knowledge/current-page context first, without account-changing powers.
2. What knowledge and permitted context should ticket auto-suggest use? Andrew
   selects operator-approved drafts, not autonomous sending. Any later autonomy
   requires a separate decision, not merely passing evaluation.
3. What does customer handling include: investigation only, investigation plus
   case actions, or also sensitive account/billing actions? Recommend the middle
   option first; discuss sensitive operations only for demonstrated needs.
4. Which specific milestones and blocked/failed outcomes belong in the initial
   catalog, and what small meaningful properties should each carry? The level
   is settled as B, without click tracking/logs. Customer detail uses meaningful
   BFF facts plus reported events, not live product-data reads or custom Business pages.
5. How should a customer's accounts and memberships within the chosen Business
   be presented without mixing production/development or exposing another
   account's data? Cross-Business customer linkage is outside the initial scope.
6. How should a public request safely continue when private account support is
   needed? Use existing signed-in Google/Business authority, with no new
   identity/verification-tier or support-managed account-recovery system.
   Whether signed-out intake needs a website form, public email alone or neither
   is reopened for a second Astra scope review. Earlier acceptance is not revoked.
   BFF ownership and receipt/email/backoffice remain accepted; inbound correlation,
   provider, routing and lifecycle still need design.
7. Which people should later be admitted as operators? All admitted people have
   full backoffice access under the accepted decision; no restricted-helper role
   design is required. Adding actual identities is not authorized by this discussion.
8. What constitutes a nicer design and an effective phone/desktop workflow?
9. Which evidence, channels and notification cadence implement Andrew's
   stage-aware attention preference? Early firsts/feedback/findings matter; later
   routine signals may be grouped. Define criteria per Business and how Andrew
   agrees revisions, including any bounded assistant discretion, while preserving
   unresolved work and distinguishing confirmed problems from missing evidence.
   SWOT is the agreed attention lens, not an automatic urgency or scoring rule.
10. What knowledge, safe customer facts, reply/disclosure policy, escalation,
   failure fallback and usage budget would make the chosen assistant effective?
   Reply automation and tool execution are independent code-protected policies;
   choose initial modes/predicates/trusted facts without a condition-builder engine.
   Initial support replies and all permitted support-tool calls now require
   approval, including reads. Decide external advisor evidence scope/cadence
   separately; dots is now a candidate instead of a custom CLI runner. Proposal
   format/import, operator decision versus activation and reliable delivery remain
   open; automation/monetization/marketing proposals cannot self-activate. COO
   operations oversight and Andrew's independent CTO assistant are now separate
   responsibilities; every configured bot can raise an assistant request. Decide
   execution/communication, success evidence, interruption thresholds and allowed
   delegation without creating a second roadmap or expanding action authority.
   Andrew wants the assistant to search all bots' working context; determine
   concrete sources/search scope without relying only on COO summaries or
   transferring other bots' execution permissions. For future CPU-only model
   research, what evidence would justify the first integration and what bounded
   tuning authority could follow? No algorithm, experiment or ML platform is chosen.
   COO, personal assistant, security, legal, product manager, project manager and
   architect each have a dedicated analytical
   counterpart in the desired structure. Define separate evidence/tool scopes,
   intentional cross-role handoffs and assistant search, not shared analyst memory.
   Security/legal start with advisory proposed-change reviews; exact inputs and
   gate authority remain open, and periodic checking is later. Should the product
   manager only recommend priorities, or also maintain verified accepted-roadmap
   state while proposing scope/priority changes for approval? Recommend the latter.
   What delivery coordination/handoff powers should the distinct project manager
   have over already-agreed work, without authorizing implementation or new scope?
   The common advisor research-versus-effect boundary is accepted as option 2;
   exact read scopes, budgets and execution contracts remain open.
   Andrew now distinguishes ordinary readable analyst workspaces from protected
   security/legal/assistant-analyst contexts. Andrew now wants to set each secret's
   rule; no global assistant exception is selected. What source/recipient rules
   and private approval surface express those decisions? Which paired-role readers
   and outward communication paths are approved? Entire secret-bearing contexts
   need constrained output paths; derivative-disclosure detection is not guaranteed.
   These company-bot boundaries concern the external platform, not Convex.
   Compare Dots versus Paperclip's actual context/read/communication controls and
   operating burden before choosing one; no native joint integration is established.
   How should agreed brainstorming become an architect-led plan and approved
   Codex work, with Andrew involved in substantive decisions initially and
   attention/approval discretion changed only through later agreement?
   For the architect's NOC, QA/regression and developer specialists, which
   approved inputs and result evidence support supervision? How should external
   monitoring trigger bounded investigation and preserve alert delivery when AI
   fails? Monitoring remains later MVP; exact integration/cadence/budgets are open.
   What shared analyst findings make the project manager's company-wide progress
   picture trustworthy without duplicating the roadmap or exposing private context?
   All these role implementations and final MVP inclusion remain open.
11. When should helper chat become a support case, and what context may carry over?
12. What bounded event payload, writer trust, deduplication, retention and delivery
    contract supports the chosen catalog? How should future analytics/offer
    consumers receive only the appropriate facts without becoming this slice's scope?
13. How should Business email styling/logo share configuration with auth?
    Recommend one common brand identity with channel-appropriate rendering.
    Branding and the initial receipt are accepted goals; exact contracts,
    configuration controls and send/delivery mechanics remain open. Substantive
    human replies are as needed; ticket AI suggests drafts for an operator to send.
14. Which answer-quality criteria/cases, source freshness and bounded evaluation
    runs establish a useful initial helper and ticket-draft baseline? Shared
    Business knowledge and evaluation are requested; tooling/storage are open.
15. What bounded samples and permitted improvements should the on-demand Codex
    review-and-improve skill use? Approved knowledge/disclosure checks are required;
    exact workflow, retention, cost and promotion rules remain open.
16. Should initial ticket drafts use knowledge alone or also filtered meaningful
    BFF customer/event summaries? Recommend the latter, while the helper starts
    knowledge/page-scoped. Shared bot controls, context classifications and any future
    MCP interface need design, not a generic bot-management platform by default.
    Later helper data access must remain possible through the same small bot
    definition; adding it to the first release remains a separate decision.
17. Should the embeddable helper be available before sign-in or only after Google
    authentication? Public knowledge-only help serves guests/prospects but needs
    abuse/spend controls; signed-in-only reuse is simpler but misses that journey.
    File assignment, supported styling and integration contracts remain to design.
18. Which signed-in BFF facts, if any, belong in the initial helper rather than
    a later extension? Current-page context, code-registered tools and future saved-work
    access need precise boundaries; extensibility is accepted, not blanket data access.
19. Which initial support categories/definitions and selection rule are useful?
    Multiple named support bots per category/case are required as a capability;
    Andrew now proposes a support coordinator after challenging category-only
    routing. Recommend thin content-aware selection rather than multi-specialist
    synthesis when specialists exist; dispatch directly when only one bot exists.
    Category-as-hint mapping/scope checks and one bot with assigned skills remain
    alternatives; selection can still err and needs bounded fallback/evaluation.
    Andrew asks for resumable specialist sub-agent conversations; recommend
    case-scoped specialist threads rather than restarting each follow-up, with
    current authorization and bounded context. Saved operator-approval waits are
    requested too; exact actions, lifecycle/new-message behavior remain open.
    Several categories can use the same bot. User selection,
    operator override and ambiguous-case handling remain open. Automatic replies
    are a separate mode/rollout choice, not implied by specialization.
20. How should approved skill metadata/content and programmatic context/tool
    registration be scoped and bounded? On-demand loading is chosen; exact format,
    UI executes its own registered handlers after BFF tool requests; exact
    result/continuation protocol, first read/navigation/write capabilities and
    evaluation/cost limits remain open. No management console is required.

Discuss one choice at a time with options, trade-offs and a recommendation.
Andrew now explicitly requests conceptual technical exploration too: existing
data, possible tables, shared-service versus product ownership and exclusions.
These may be discussed alongside behavior; no schema change, provider selection
or implementation sequence is authorized by that request.

## Current Direction

Andrew confirmed the combined topics to explore above, rather than choosing only
one narrow track. Start with required operating outcomes, then discuss alternatives
one question at a time. The accepted context boundary is one shared backoffice
with Business-scoped workspaces and no initial cross-Business customer
correlation. This does not prescribe every product's domain model or require
separate support implementations.
Customer detail uses meaningful BFF-held information and sparse important events
reported by Businesses: successful milestones plus important blocked/failed
outcomes, without detailed click tracking or logs. No custom Business backoffice pages or direct reads from
their databases are required initially. Event reuse for marketing or future
offers is a potential later consumer, not an approved integration or discount engine.
All approved human operators have the same full backoffice access; no granular
operator roles/permission system is in scope. Customer access and AI authority
remain separate from that decision.
Recommend inspection plus support-case handling as the first
customer-action boundary; no sensitive account/payment powers are assumed.
AI support is now a proposed MVP discussion track because reducing Andrew's
routine work is a primary goal. Andrew chooses the in-app knowledge helper and
ticket auto-suggest: operators approve/send substantive ticket replies. Share
Business-scoped knowledge and reusable procedures with separate role boundaries,
and evaluate answers with a small repeatable suite before extending autonomy.
Keep supplied knowledge intentionally approved, including business confidentiality
and content rights; an on-demand Codex review/improvement workflow is required
as a capability, with its precise skill/command and authority still to design.
Andrew selects small file-based instructions/evaluation questions and configured
roles, not a default bot pair: at least one BFF/backoffice support bot, initially
suggesting replies, and zero or more optional embeddable themed Business helpers.
They use a common extensible custom-bot definition: a name and main
instructions, an assigned skill index with full content loaded only when needed,
and programmatic context/tools supplied by the Business. Shared fixed tools remain
defaults, not the only extension mechanism. For UI tools, the page declares
capabilities and executes matching structured requests returned by BFF; handler
code stays in the application. The helper may later use page,
authenticated customer and product-owned saved-work context; initial access is
not settled. Helpers are optional and may differ by page. The support bot starts
in draft mode; multiple named definitions can serve different categories/cases
within the same shared engine/ticket, with separately scoped model runs when
tools/data differ; that execution boundary is a proposal, not implemented
isolation. Andrew proposes a support coordinator;
thin content-aware selection versus multi-specialist synthesis remains undecided.
Reply sending and tool execution have independent code-protected configuration;
recommend small tested policy predicates, not a condition-builder engine.
Andrew tightens the initial support baseline to operator approval for every
permitted tool call, including reads, and every substantive reply. External
automation/monetization/marketing reviews are proposed, not accepted MVP
implementations. Andrew considers a periodic all-Business batch with selectable
structured proposals in backoffice, now leaning toward dots instead of a custom
Codex CLI runner. They cannot apply their own changes; access, transport, cadence,
decision/activation lifecycle and actual account availability remain open.
Andrew clarifies separate COO operations oversight and an independent assistant
reporting only to him as CTO/final decision-maker. Every configured bot may bring
requests directly to the assistant, which protects his time according to his
priorities and well-being, with searchable bot working context rather than only
COO summaries. SWOT is the accepted attention lens, not a mandatory report or
permission to act. Automation opportunities include new capabilities, not only
tuning existing rules; the assistant weighs their value to Andrew's time against
engineering/maintenance cost and risk. Attention rules should evolve with each Business: early customer/
complaint milestones, useful feedback and analytical findings are visible;
routine signals may later be grouped, with rule adjustments agreed with Andrew.
Exact thresholds, channels and adjustment discretion remain open.
This supersedes the combined-coordinator recommendation, not the
existing approval rules. Shared task tooling may support distinct roles; exact
communication/execution and MVP inclusion remain open, with no second roadmap.
Security, legal, product manager, project manager and architect are additional peer roles under
Andrew; all seven responsible roles have their own analysts and separate working
contexts. Shared analytical procedures do not mean shared histories or authority.
Andrew agrees security/legal start with advisory proposed-change reviews, not
periodic checks yet; exact inputs, gate powers and implementation remain open.
Product-manager roadmap maintenance versus recommendations-only and the exact
architecture access/editing powers remain open. Andrew clarifies the collaborative
feature lifecycle: product manager evaluates suggestions with business SWOT,
relevant roles brainstorm, architect prepares the agreed feature's plan and may
help implement through authorized Codex work. Andrew participates in substantive
decisions initially; later attention tuning does not silently waive approvals.
Project manager is distinct: delivery coordination and evidence for agreed work,
with company-wide visibility from relevant analyst findings as its primary output,
not independent implementation, product scope or the assistant's attention role.
The architect supervises proposed NOC, QA/regression and developer specialists,
checking work and quality as the COO oversees operational staff. Technical
monitoring stays external and later in MVP; continuous coverage does not require
continuous model execution. Specialist connections, scopes and schedules are open.
Andrew accepts option 2 for
internal advisors: bounded approved-source research, scoped consultation and
proposal preparation without approval at every step, but approval for consequential
effects. Exact sources/access/budgets remain open; the support-bot approval rule
is unchanged and no jobs or permissions are activated.
Separate analyst conversations remain required, but ordinary work context can
be intentionally read across roles. Security, legal and assistant-analyst private
workspaces are protected. Andrew sets each secret's access/sharing rule; no blanket
assistant exception is granted. Pending rules preserve private scope. Simple
source/recipient checks and approved summaries are proposed; unrestricted outward
conversation cannot be made safe merely by detecting copied secret text. Exact
context/communication enforcement and individual grants remain open.
Andrew corrects the company-agent platform boundary: Dots is the likely candidate,
with Paperclip now a researched alternative matching the organizational concept.
Do not treat BFF/Convex authorization as enforcement of external bot context or
claim provider rules guarantee confidential data cannot be carried onward. Reuse
existing organization tooling where suitable rather than presume a custom BFF
management layer; platform selection, verification and setup remain open.
Andrew also explores analyst-led CPU-only model research, with useful integration
proposals reaching him through the assistant. Codex would build approved
integration points; subsequent tuning must stay within an explicitly agreed
surface. This is a future capability, not initial ML implementation or unrestricted
production access; model choice, experiment evidence and tuning discretion remain open.
Exact initial modes/predicates and specialists/routing are open,
and automatic replies remain unenabled. Codex owns configuration and evaluation
maintenance; any bot overview is read-oriented, not an authoring requirement for
Andrew. A large management console is deferred. Exact contracts and
server-filtered event views remain under exploration; MCP is a later possibility,
not a required integration or access grant.
Ticket channels/UI are agreed: website or
email submission, ongoing customer replies by email, and history/handling only
in the shared backoffice. BFF owns the authoritative tickets and conversations.
Public website submission without sign-in was accepted and is now under renewed
scope review, not removed. Andrew accepts immediate
intake and the initial receipt, without mandatory email confirmation, after
Astra's review. Unverified contacts may receive general help but do not gain
private account authority; authenticated private-support continuation remains
to design using existing Google/Business context, not a new recovery or
verification system. No alternative product login is added through support.
Intake includes feedback, suggestions and missing-feature requests as well as
problems/questions. An automatic initial receipt email and Business styling/logo
are required; human or AI substantive replies are as needed. Those accepted
goals do not settle helper context, ticket tools, evaluation implementation,
email-provider selection, schema, remaining form details or lifecycle.
There is no customer ticket portal.
Remaining scope, design and implementation
are unaccepted; no technical monitoring provider, customer-tracking scheme,
assistant runtime or AI action authority is selected.

## Operational Placement

- Customers initiate tickets through a shared website submission capability or
  email and continue by email. Do not add customer ticket-history/reply pages.
  Operators view history and handle BFF-owned cases in the shared backoffice;
  the email provider is transport, not the authoritative ticket store.
- Shared BFF sends the initial Business-branded receipt automatically; AI suggests
  substantive follow-up for an operator to review/send as needed. Brand
  configuration belongs to validated operator workflows with essential state
  and proposed preview in the backoffice, not duplicated product email code.
- Human lookup, investigation and case handling belong in the secured operator
  workflow/backoffice within the selected Business. All approved operators have
  full access to its features; which actions to build remains open. A shared
  operator login does not require combining customer data across Businesses.
- Configuration and engineering repairs remain in validated Codex/operator
  workflows. This scope discussion grants no billing, access or database-editing powers.
- Businesses produce meaningful activity facts; BFF owns the shared ingestion and
  history proposal. Operators/AI consume the relevant scoped facts. Future offer
  rules belong to shared server-side eligibility logic, with Business-specific
  campaigns, not unvalidated event-triggered account or payment changes.
- The proposed knowledge helper belongs in product UI; the ticket assistant drafts
  through the support-case workflow with bounded tools and customer evidence,
  not the operator's full cross-Business privilege. Escalations reach the human
  operator workflow; AI availability must not be the only route to help.
- Businesses place/theme the shared helper component; BFF owns support-assistant
  invocation within its case workflow. Instruction/evaluation file maintenance
  belongs in reviewed Codex/operator work, not a required bot-management console.
  Any backoffice bot overview shows effective definitions, assigned skills and
  evaluation questions/results read-only by default; Andrew need not author them.
- Businesses register helper context and tools in code; local UI actions remain
  product-owned, backend actions retain existing account authorization. The
  runtime opens only assigned skill content on demand, not the whole knowledge base.
- Codex owns the initial repeatable answer checks and evidence. The backoffice
  should make actual suggested answers/corrections inspectable; a new evaluation
  dashboard or mandatory Andrew test checklist is not required by this decision.
- Pending action approval/rejection, where separately authorized, is a direct
  operator judgment in the backoffice; bot configuration stays Codex-owned.
  Resume only the approved request, with current execution checks and recorded
  outcome, not unrestricted operator authority delegated to the model.

## Decision Log

| Date | Decision | Context |
| --- | --- | --- |
| 2026-10-08 | Define customer-operations problems and scope before solution brainstorming | Andrew distinguishes feedback/user monitoring from technical monitoring; no implementation request |
| 2026-10-08 | Explore business/cross-business visibility, related customer context, improved design, tickets and user handling together | Andrew supplies the umbrella scope and asks for missing needs; action permissions, guest-ticket trust and final solution remain open |
| 2026-10-08 | Reopen AI customer support as a proposed MVP capability | Andrew prioritizes minimizing manual work from the beginning; autonomy level and revision of the earlier exclusion are not yet accepted |
| 2026-10-08 | Distinguish on-site knowledge helper from data-capable ticket support agent | Andrew wants chat guidance separate from case-based investigation/actions; small helper context and ticket permissions remain undecided |
| 2026-10-08 | Codex must propose the smallest useful scope for both roles | Andrew requests a concrete recommendation; the knowledge/current-page helper plus bounded autonomous ticket handling is proposed, not accepted |
| 2026-10-08 | Include conceptual data-model and shared/product ownership alternatives in this brainstorm | Andrew requests technical trade-offs alongside in/out scope; this does not approve implementation or structural changes |
| 2026-10-08 | Give concrete options and an explained recommendation for every discussion question | Andrew repeats this preference after an overly open-ended visibility question; customer records plus activity/support is the next proposed choice |
| 2026-10-08 | Explore Business-first investigation before a separate cross-Business surface | Andrew offers a tentative refinement; Codex recommends scoped workspaces in the shared backoffice, not separate implementations. Final scope and data ownership remain unaccepted |
| 2026-10-08 | Accept one shared backoffice with Business-scoped customer investigation | Andrew confirms that the same person's use of unrelated Businesses is usually irrelevant. Initial scope excludes cross-Business customer linkage/profiles; remaining feature and implementation choices are open |
| 2026-10-08 | All approved backoffice operators have full access; no granular operator roles now | Andrew removes permissions-system complexity. Existing sign-in/operator gate and customer isolation remain; no new person or AI receives authority through this scope decision |
| 2026-10-08 | Show meaningful BFF-held customer information plus important Business-reported events | Andrew excludes custom Business pages/direct product-data access initially. Events are meaningful usage/operator facts, not logs; catalog and structural schema remain unapproved |
| 2026-10-08 | Preserve event reuse for future marketing measurement and offer eligibility | Andrew suggests pixels and special discounts as possible consumers. No provider, campaign, discount engine or automatic charge is approved; the existing future-offers entry owns that deferred idea |
| 2026-10-08 | Accept event scope B: milestones plus important blocked/failed outcomes | Andrew agrees to option 2. Exact catalog/payloads, schema and integrations remain open; no full-brainstorm acceptance or implementation approval |
| 2026-10-08 | Explore the whole ticket system and an email-only customer channel before portal design | Andrew prioritizes understanding where the conversation lives and avoiding per-Business ticket UI for MVP. BFF cases plus email transport is recommended, not accepted; the secure-link proposal was never approved |
| 2026-10-08 | Accept website/email ticket intake, email follow-up and backoffice-only conversation history | Andrew clarifies that customers can open from the website or email, but cannot view/reply to a ticket thread on the Business website. Shared backoffice handling is required; storage/provider/schema and AI authority remain open |
| 2026-10-08 | Keep authoritative ticket records and conversations in the shared BFF | Andrew chooses BFF-owned cases over an external helpdesk. Email remains transport; provider, schema, routing/lifecycle and AI authority remain open. This is a storage-ownership decision, not implementation or whole-brainstorm approval |
| 2026-10-08 | Accept website ticket submission without sign-in, with an unresolved verification concern | Andrew chooses the public form but flags unverified contacts. Confirmation-before-handling versus visibly unverified intake is the next choice; neither policy, account linkage, schema nor implementation is approved |
| 2026-10-08 | Park contact-verification policy for an independent Astra review | Andrew objects that email approval undermines the contact-us/website submission experience. The earlier confirmation recommendation is challenged, not accepted; continue other questions while the review runs |
| 2026-10-08 | Include feedback, suggestions and missing-feature requests in contact intake | Andrew clarifies this is not only a support-incident flow. Exact categories, reply expectations, automation and schema remain undecided; receiving a suggestion does not promise building it |
| 2026-10-08 | Review recommends immediate public intake, without mandatory email confirmation | Astra finds the previous recommendation too strict for contact-us/feedback. Protect private support separately; proposal awaits Andrew's acceptance, and no provider/schema/implementation is authorized |
| 2026-10-08 | Send an automatic initial receipt; human or AI substantive replies are as needed | Andrew settles reply expectations, including feedback/suggestions. A receipt is not verification or resolution; AI autonomy/tools and exact delivery/abuse behavior remain open |
| 2026-10-08 | Business email styling and logo belong in shared configuration | Andrew wants branding analogous to auth. Existing auth fields have no logo; common brand reuse is recommended, not a settled schema/editing UI or migration |
| 2026-10-08 | Accept immediate public intake and initial receipt, without an upfront email-confirmation gate | Andrew accepts option 1 after Astra's review. Apply spam controls; general help may proceed, but private support still requires appropriate authenticated account authority. No schema, AI autonomy or whole-brainstorm implementation approval |
| 2026-10-08 | Explore wrong-recipient reporting and distinguish anti-spam from account trust | Andrew proposes "I did not send this" in the receipt and asks whether a reply establishes verification. A case-specific report/pause is recommended, not approved; reply evidence is contact-only, with no automatic account authority |
| 2026-10-08 | Keep MVP support simple and reuse Google-only product authentication | Andrew rejects verification overengineering. Public contact/email conversations remain available, but no support-managed recovery, alternative login or custom verification-tier system is required. Basic spam/loop controls and existing permissions remain; requests for Apple/email login are feedback, not new scope |
| 2026-10-08 | Reopen the minimum signed-out contact scope with a second Astra review | Andrew asks whether any public form/contact intake is needed for a simple Google-only MVP. Review channels and their actual maintenance cost; earlier acceptance remains visible pending a new decision. Continue other questions, not implementation |
| 2026-10-08 | Second Astra recommends signed-in form plus public support email | Deferring signed-out forms saves modest scope while retaining a login-failure/guest contact route; BFF cases/email transport remain the substantial work. Recommendation awaits Andrew's choice |
| 2026-10-08 | Start with an in-app helper and ticket auto-suggest, not autonomous ticket replies | Andrew wants useful assistance before real user evidence. Operators review/send suggested replies; automatic initial receipts remain. Later autonomy is a new decision, not inferred approval |
| 2026-10-08 | Share suitable knowledge/procedures and evaluate both AI roles | Andrew requests question/answer quality checks. Recommend a small versioned test suite with source-grounded expected behavior, separate role boundaries and Codex-owned initial cases; no extra queue/evaluation service or schema is approved |
| 2026-10-08 | Review approved knowledge and disclosure, including internal business information | Andrew wants assistants supplied only with permitted knowledge, not merely credential/PII filtering. Review provenance, rights, confidentiality and actual access boundaries; no prompt-only secrecy guarantee or raw repository ingestion |
| 2026-10-08 | Add an on-demand Codex evaluation/improvement capability | Andrew wants to invoke a skill/command to analyze real questions/answers and ticket drafts and optimize behavior without doing routine analysis himself. A combined review-and-improve workflow is proposed; exact skill, data/cost scope, changes and release authority are not yet settled |
| 2026-10-08 | Explore shared BFF bot controls and selective event access, with MCP later | Andrew distinguishes internal/secret event data from shareable facts. Recommend scoped server-filtered fields and small shared controls; no raw-record access, operator privilege inheritance, generic management console, MCP server or schema is approved |
| 2026-10-08 | Prefer small file-based instruction/evaluation assignments over a management console | Andrew proposes reusable instruction files and evaluation questions selected per bot. Business knowledge stays scoped; exact assignments/source preparation/contracts are not settled, and no new tables or editing UI are approved |
| 2026-10-08 | Use BFF-owned support suggestions and a configurable embeddable helper as default roles | Support runs within cases/backoffice, not product-owned bot logic. Businesses place/theme a shared helper component instead of rewriting chat behavior. Existing SDK React auth controls provide a reuse pattern, not an implemented helper |
| 2026-10-08 | Require a small extensible custom-bot definition with instructions, allocated knowledge and fixed tools | Andrew wants future custom bots without replacing the runtime. Helper/support are defaults, not hardcoded-only types. FAQ knowledge differs from held-out evaluation; new tools or data sources still require review/code |
| 2026-10-08 | Preserve helper growth to page, signed-in customer and saved-work context | Andrew proposes knowing the current product/page and relevant TableCards event/projects. Keep scope/fields checked, product data owned by the Business and internal information excluded; no initial product-data integration or schema is approved |
| 2026-10-08 | Helpers are optional and may vary by page; support identity is separate from reply mode | Andrew wants different helper knowledge/capabilities by page or no helper. The support bot starts with suggestions because trust is not established, with future automatic replies/category-specific bots possible; no auto-send activation, refund authority or initial routing scheme is approved |
| 2026-10-08 | Load assigned bot skills on demand rather than all knowledge on every call | Andrew defines skill title/purpose/use guidance plus content, with per-bot name/instructions/assigned skills. Small metadata index precedes selective loading. Cost/selection/disclosure evaluation is needed; no arbitrary file access or new search store is approved |
| 2026-10-08 | Allow programmatic Business context and tools, revising fixed-tools-only scope | Businesses may pass approved page data and register UI/backend capabilities in code, not a console. Exact execution/authorization bridge and first actions remain open; no arbitrary remote code, account powers or implementation approval |
| 2026-10-08 | Support multiple named helper/support definitions, including category- or case-specific support | Andrew reinforces payment versus print-document support examples. Roles are not a two-bot limit; preserve one runtime/transcript and initial draft mode. Mapping/selection/override/fallback and initial specialist set remain open; no swarm or AI router is approved |
| 2026-10-08 | UI declares tools; BFF returns requests; UI executes registered handlers | Andrew chooses programmatic page-tool execution. Structured names/arguments, not model-generated code; some actions may need user approval. Exact schemas/results/retries, first write actions and implementation approval remain open |
| 2026-10-08 | Codex maintains bot configuration and evaluations; any overview is mostly read-only | Andrew wants visibility into bots, assigned knowledge and test questions/expected answers without manually authoring them. Reuse effective configuration/evidence, not another source of truth; no editor, console implementation or publication authority is approved |
| 2026-10-08 | Require configured support bots, not a default pair; helpers may be absent | Andrew specifies at least one support bot and zero or more helpers according to Business configuration. This supersedes earlier default-bot wording; initial draft mode, Codex-owned configuration and remaining implementation boundaries are unchanged |
| 2026-10-08 | Explore category-to-bot rules without requiring a bot per category | Andrew asks for a recommendation. Configured Business-scoped mapping plus an explicitly chosen fallback is recommended over one undifferentiated bot or AI routing; category list, routing choice and case override remain unaccepted |
| 2026-10-08 | Treat category as a hint; address incorrect customer selections before answering | Andrew challenges category-only routing. Revised recommendation adds bot scope assessment and bounded permitted handoff/fallback, without a separate classifier on every case. Detection is not guaranteed; test wrong-category/topic-change cases. Routing choice and implementation remain unapproved |
| 2026-10-08 | Explore a support coordinator rather than trust the customer's category | Andrew suggests a "master bot." Recommend thin content-aware selection among configured eligible handlers, not multi-specialist answer synthesis; one-handler cases need no extra AI routing call. No coordinator, runtime/schema change or auto-send is approved |
| 2026-10-08 | Distinguish separate bot execution scopes from separate deployed services | Andrew asks about differing tools/data. Recommend per-bot model context and code-enforced capabilities on a shared engine; same ticket does not imply shared private context or coordinator-wide authority. Separate services are not justified yet; concrete boundaries and implementation remain unapproved |
| 2026-10-08 | Explore resuming specialist sub-agents within the same support case | Andrew wants the coordinator to continue specialist conversations rather than restart. Recommend scoped reusable threads with revalidated tools/data and approved return results; no always-running service or extra customer ticket is needed. Storage/lifecycle and implementation remain undecided |
| 2026-10-08 | Preserve conversation and pending action while awaiting operator approval | Andrew requests long-running continuity across human decisions. Recommend explicit persisted approval/continuation, approve/reject UI and safe execution/resume for allowed actions; first actions, schema and new-message/expiry handling remain open. No expanded bot authority or implementation approval |
| 2026-10-08 | Separate reply automation from tool execution; enforce configurable rules in code | Andrew requests optional/always/conditional approval and rules over meaningful trusted facts/events, without a conditioning engine. Recommend small tested predicates returning allow/review/block; prompts cannot alter configuration. Refunds are hypothetical, draft-only support remains initial scope and exact rules/actions/schema are unapproved |
| 2026-10-08 | Start support with approval for every permitted tool call and substantive reply | Andrew strengthens the baseline while describing gradual automation. Reads also require approval; forbidden actions stay denied. Automatic non-bot initial receipts are unchanged. Helper/advisor read policies remain separate open choices |
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

## Notes

- Earlier requirements remain: phone is Andrew's primary operating tool; desktop
  must work too. Investigation matters even when a customer has not complained.
- Consulted the [Agency Agents Support Responder](https://github.com/msitarzewski/agency-agents/blob/main/support/support-support-responder.md)
  as a customer-context, follow-up and feedback lens only. Its staffing targets,
  response-time promises, channel bundle and automation are not adopted.
- Consulted the [Agency Agents Growth Hacker](https://github.com/msitarzewski/agency-agents/blob/main/marketing/marketing-growth-hacker.md)
  as an experimentation/evidence lens for marketing and monetization proposals,
  not authority or justification for growth targets, paid campaigns or tracking.
- [OWASP Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
  supports limiting tools/permissions and enforcing authorization outside the
  model. Use this as a safety constraint, not a rule that every routine reply
  must wait for Andrew; Andrew subsequently chooses operator approval for ticket
  replies while the in-app helper answers ordinary knowledge questions directly.
- No new runtime diagnostics, code, schema, permissions, provider setup or deployment
  performed. Documentation checks alone are appropriate for this discussion.
