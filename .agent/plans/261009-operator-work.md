# Feature: Operator work — development delivery

> **Status:** Completed for the authorized development checkpoint — Gemma/Jev integration verified; 90–95% quality target unmet and deferred
> **Created:** 2026-10-09
> **Last updated:** 2026-10-14
> **Repository baseline:** `41ba411`
> **Source brainstorm:** [Accepted Operator work](../brainstorms/261008-customer-operations-backoffice.md), presented design/schema accepted 2026-10-09.

Andrew authorized planning, implementation, testing, independent review,
development deployment and hosted verification while asleep. Routine safe choices
and necessary additive development schema refinements may proceed. Production,
paid plan upgrades, customer billing and customer launch remain excluded. Andrew
authorized one minimum Gateway credit top-up on 2026-10-11 (dated evidence below).
External
blockers do not stop independent tasks: use labelled development mocks and record
unverified live criteria rather than claiming mocks prove provider behavior.

### 2026-10-14 production release authorization

The original development checkpoint above remains completed. Andrew now
explicitly authorizes independent review, garbage cleanup, finishing the current
PR/build, merge and production deployment if safe, using existing credentials.
This supersedes the historical development-only publication restriction, not the
separate Payments or customer-launch stages. Production release evidence and
remaining checks are recorded in the
[dated release review](../../projects/tablecards/docs/reviews/261014-operator-work-production.md).
The release preserves the accepted Gemma/Jev quality checkpoint and spending
caps; no new benchmark run or paid plan change is needed. The production
checkpoint completed on 2026-10-14 at `b260092` after main CI, deployment,
infrastructure smoke and bounded real provider/browser checks; the linked
review preserves the unverified production-authenticated and later-launch boundaries.

## Repository context snapshot

At `41ba411`, main is clean and synchronized after the requested documentation
checkpoint. Convex 1.46.0, React 19.3, TypeScript 6.0.3, Node 24 and pnpm 12.6.0
are installed. Shared identity/account/authentication and TableCards no-charge
preview exist; support, events and text helpers do not. The backoffice presents
disconnected customer lists. Existing image AI is Business-owned and is not the
new private screenshot processor. Development targets exist. Resend Full access
and a separate Cloudflare setup credential passed read-only checks; no mail
domains or gateways are configured. Provider writes/live processing are untested.

## Feature, user story and approach

**New capability, high complexity:** several existing customer/operator authority
boundaries meet asynchronous email, model work and browser tool execution.

As an admitted operator, I want an overview and joined support/customer evidence
on phone and desktop, so I can understand and handle each Business safely.
Customers get site-wide documented help, explicit contact/feedback and email
continuity without a customer ticket portal.

Use shared generic BFF workflows and eight additive tables. AI SDK Core/UI owns
model/tool/chat protocol, not permission. Convex owns records, atomic transitions
and one-shot jobs. Business knowledge, settings, event descriptors, routes and
realistic fixtures remain Business-owned data or local executable code. Resend
is the sole mail transport; private Cloudflare Images rewriting supplies previews.
No Convex Agent, HarnessAgent, LangGraph, specialist router, app spending ledger,
priority/owner system or configuration console.

## Required reading and integration evidence

- `platform/bff/service/convex/schema.ts:19`: existing environment/identity tables.
- `platform/bff/service/convex/lib/authorization.ts:80`: admitted operator guard.
- `platform/bff/service/convex/lib/customerHttp.ts:50,311`: bounded JSON,
  environment-bound customer token and registered-origin checks.
- `platform/bff/service/convex/productAccess.ts:80`: current account/user/membership
  relationship validation; email equality is never account authority.
- `platform/bff/service/convex/businessEnvironments.ts:193`: revision-checked config.
- `platform/bff/service/convex/rateLimits.ts`: installed rate-limiter component.
- `platform/bff/service/convex/customerOperations.test.ts:51`: synthetic scoped
  integration fixture and `convex-test` pattern.
- `platform/bff/backoffice/src/app.tsx`: current auth, health and list hooks.
- `platform/bff/backoffice/src/dashboard.tsx`: current views and their tests.
- `projects/tablecards/workloads/web/src/router.tsx`: shared product shell.
- `projects/tablecards/workloads/web/src/application-context.tsx`: selected account.
- `tools/bff-operator/src/cli.ts:508`: validated administrative CLI precedent,
  **not** authenticated human Send authority.
- `platform/bff/backoffice-e2e/src/developmentAuth.ts:233`: short-lived development
  operator identity; private signer stays ignored and outside repository records.
- `projects/tablecards/backend/convex/projects.ts:203`, `exportState.ts`,
  `aiState.ts:288`: actual Business outcome reporting points.
- `docs/architecture/operator-work.md`: approved field/index and ownership view.
- `docs/operations/provider-accounts-and-secrets.md`: access evidence/secret boundaries.
- `docs/operations/development-authenticated-smoke.md`: exact development targets;
  **omit historical production setup commands**.
- `projects/tablecards/docs/product.md`, `application.md`, `operations.md`:
  actual product facts and delivery boundaries.
- `.github/workflows/ci.yml`: a code push to main deploys production automatically.
  Keep implementation local/on a non-main branch; no implementation push to main.

Current external contracts, rechecked by source research:

- [AI SDK 7 migration](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0):
  use installed types; current names include `instructions`, `isStepCount`,
  `stream`, `onEnd`. Pins: `ai@7.0.137`, `@ai-sdk/react@4.0.140`,
  `@ai-sdk/openai-compatible@3.0.67`; no default Vercel gateway.
- [Browser tools](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage): registered
  client tools and correlated actual results; UI validation is not authorization.
- [Workers AI route](https://developers.cloudflare.com/ai-gateway/usage/providers/workersai/):
  explicit capped route, or verified equivalent native Worker binding gateway.
- [Qwen candidate](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/):
  cheap function-calling candidate, not yet a quality winner.
- [Gateway update](https://developers.cloudflare.com/api/resources/ai_gateway/methods/update/)
  and [spend limits](https://developers.cloudflare.com/ai-gateway/features/spend-limits/):
  provider caps are estimated/eventually consistent. The
  [official launch article](https://blog.cloudflare.com/ai-gateway-spend-limits/)
  documents fixed calendar resets; exact REST window mapping/timezone and actual
  enforcement need setup proof. Never label guessed integers as verified limits.
- [Resend signatures](https://resend.com/docs/webhooks/verify-webhooks-requests),
  [receiving](https://resend.com/docs/dashboard/receiving/get-email-content),
  [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys): durably
  deduplicate raw signed notifications, retrieve content asynchronously and retain
  exact payload/key for bounded retries inside 24 hours.
- [Private Images binding](https://developers.cloudflare.com/images/optimization/binding/):
  authenticated bytes in, newly encoded PNG/JPEG out; never serve originals.

## Design decisions, data and migrations

1. Add `conversations`, `conversationEntries`, `botRuns`, `emailDeliveries`,
   `emailWebhookReceipts`, `supportAttachments`, `feedbackRecords`, `businessEvents`
   with the approved fields and lookup indexes. One history and current draft.
2. Add optional `operatorWork` configuration and optional numeric
   `operatorWorkConfigurationRevision` to `businessEnvironments`. This resolves
   the explicitly noted settings-storage gap without a ninth table. The typed
   bounded snapshot contains bot/skill versions/content, declarative events/page
   capabilities, presentation and registered mailbox bindings. Absent means
   disabled/revision zero. Secrets/provider URLs stay in deployment variables.
   No required existing field change, backfill, removal or product-table migration.
   Record any needed mailbox lookup index explicitly before applying it.
3. Authenticated configuration uses expected revision; collision and descriptor
   validation precede activation. Shared code cannot import Business schemas/prompts.
4. Scoped operator APIs use `requireOperator` and server-attributed actors.
   Customer/helper HTTP uses verified environment/account claims or a random
   hashed anonymous conversation capability. Signed-out contact remains email.
5. Support permitted reads/skill loads run automatically; model job saves one
   draft and stops. Only exact operator **Send** freezes the email envelope.
   New customer messages revoke unsent authority but retain edits. Claiming
   dispatch is atomic; old IDs, duplicate Sends and stale runs cannot overwrite
   or send another draft. No AI send tool or extra generic approval store.
6. Helper uses authoritative stored history, not arbitrary browser transcripts.
   Client results match a saved pending request and current account/page context;
   navigation remains customer-clicked. Private notes/tools are not UI projections.
7. Event ingestion has separate authenticated Business server authority. BFF
   validates registered data descriptors generically. Product success is not
   rolled back solely because event reporting fails. Bounded pagination and honest
   partial coverage replace unbounded summaries or loaded-page pseudo-totals.
8. Use mock mail/inference only in explicit development mode. Live inference
   remains disabled until capped routing/windows and cheap model compatibility
   are verified. Choose a separate **$2 maximum evaluation allowance per intentional
   run**, bounded call/output/step counts and no expensive fallback. This is a
   testing bound, not a new application spending table or live cap increase.
9. Initial screenshot limits: three PNG/JPEG files, 5 MiB each/15 MiB total,
   bounded decoded pixels and 1,600px regenerated preview. Check actual bytes,
   dimensions and private retrieval; failure has no original fallback. No paid
   scanner/Images plan or new storage vendor.
10. Andrew's later request adds Business KPIs to the overview. Business-owned
    optional declarative metric definitions live in the existing configuration
    snapshot; shared code counts seven-day event activity and unique verified
    customers. A bounded 500-event read is labelled partial when truncated.
    No new table/index/backfill, financial ledger or invented lifetime totals.

## Dependency-ordered implementation tasks

### 1. CREATE shared contracts and runtime library

Create `platform/bff/libs/contracts/src/operations.ts` and tests/export.
Create a separate `platform/bff/libs/assistant/` public library with pure typed
model/tool/transport helpers and a React helper entry point, not auth-core AI
dependencies. Add exact package pins, Nx targets and TypeScript aliases. Keep
browser and provider/server entry points separate. Validate contract tests,
library types and restrictive Nx boundaries.

### 2. UPDATE shared schema and CREATE atomic workflow core

Update `schema.ts`; create `operations.ts`, `lib/operatorWorkConfiguration.ts`
and integration tests. Implement config preview/apply, scoped overview/queues/
case/customer evidence, notes/status, current draft editing and exact Send,
customer intake and correlated messages, stale completion checks and immutable
delivery records. Explicit args/returns validators and index every growing read.
Test cross-environment/customer denial, replay, stale IDs and concurrent changes
before dependent UI. Generated Convex API files follow normal codegen.

### 3. CREATE provider adapters and triggered jobs

Create shared Convex action-only modules for bounded drafting, helper model steps,
email retrieval/dispatch and attachment conversion; use native one-shot scheduling.
Separate provider IO from atomic state. Preserve attempt limits across resumes.
Use AI SDK allowed read tools and lazy assigned skills; capture actual tool usage,
model/config versions and failures, not another transcript or chain-of-thought.
Retry exact approved sends only when provider deduplication/reconciliation is safe.

### 4. CREATE guarded customer, callback and preview HTTP

Create `lib/operationsHttp.ts`; register routes in `http.ts`. Reuse current
token/origin/body patterns. Implement helper turn/result/history projection,
signed-in contact and general feedback, safe GET survey plus explicit POST,
signed webhook intake and operator-authorized private preview. No anonymous
contact form, unsafe raw HTML, public original URL or account authority from mail.
Cover headers, signature failures, duplicate/out-of-order callbacks, uncorrelated
mail, response activation and private preview denials with integration tests.

### 5. CREATE shared Cloudflare provider capability

Create `platform/bff/ai-provider/` with explicit development Wrangler manifest,
authenticated bounded private screenshot conversion and, if required by current
permissions, a native AI-binding compatible text bridge. Server-only fixed gateway,
allowlisted cheap models, no arbitrary target URLs or customer provider selection.
Add tests/typecheck/dry-run before actual publication. Use one existing Cloudflare
account; existing TableCards image Worker and production manifests are untouched.

### 6. UPDATE responsive backoffice

Implement Astra's overview-first all-Business/scoped shell, visible delivery
exceptions, Support/Customers/Activity/Bots read views and joined case journey.
Use exact server queues/projections. One editor, explicit exact recipient/content
Send, internal notes and status controls; no owners, priority labels or spending
tiles. Preserve query/filter/scroll context and unsent edits, labelled mobile nav,
keyboard/focus and enlarged text. Update component tests and desktop/phone journeys.
Include Business-supplied KPIs above current support, separate from current work
counts. TableCards starts with recorded active customers, saves, PDFs ready and
export failures; definitions stay with TableCards.

### 7. CREATE Business configuration and UPDATE TableCards integration

Create `projects/tablecards/operator-work.defaults.ts` and Business-owned skills/
knowledge/evaluation fixtures. Mount shared helper in product shell, reset private
context across account changes, provide approved links and explicit contact/
feedback. Add safe server-reported save/export/AI/blocked outcomes using separate
event credentials and bounded deduplication. Existing project/account writes and
domain tables remain unchanged. Add focused Business backend and UI tests.
Andrew's 2026-10-10 refinement makes the launcher a shared persistent Help bubble,
not a header-only button. Use the existing controlled dialog/state boundary,
shared theme tokens and Business-owned navigation clearance; include auth/setup
routes without granting extra private context. Feedback remains prominent.

### 8. UPDATE validated operator tooling and operating skills

Extend `tools/bff-operator/` with configuration/seed/evaluation and authenticated
queue/case/draft/Send contracts. Administrative configuration may use internal
CLI precedent; ticket Send must use the same public identity-attributed API as UI.
Add targeted operating/evaluation skills using skill-creator workflow. Commands
must retain explicit development/production guards; no direct-database Send bypass.

### 9. CREATE realistic synthetic seed and evaluation workflow

Ask Astra to author varied Business-owned believable messages, linked histories,
drafts/outcomes and independent held-out cases during implementation. Generic
development-only seed validates payloads, deduplicates stable synthetic IDs and
does not erase unrelated data or trigger external email/model calls. Generic
evaluation runner writes dated JSON/Markdown Business results, separates reference
knowledge/test expectations, and can add a sanitized real miss then rerun all
saved sets. Compare cheap compatible candidates if provider access/caps allow;
zero observed critical boundary failures, report incomplete/unrun model suites.

### 10. VALIDATE, review and reconcile

Run affected tests first, then repository gate. Do behavior-preserving cleanup,
independent security/concurrency review and actual phone/desktop app review.
Fix scoped defects and rerun the failing tests and applicable full regression.
Update nearest READMEs/public contracts and the existing architecture/product/
application/operations records without another duplicated document pack.

### 11. DEPLOY development and verify hosted journeys

Confirm `compassionate-buffalo-689` for BFF and `scrupulous-hawk-991` for TableCards
before every deployment-affecting command. Publish only explicit dev Workers
`business-factory-backoffice-dev`, `business-factory-tablecards-dev` and the new
shared dev provider. Provision only development secrets/configuration; preserve
existing DNS records and use the Resend managed receiving identity where possible
to avoid a dev-only verified-domain slot. Branded `help@tablecards.tofler.app`
verification is scoped mail setup, not product-site production deployment.
Do not route production callbacks into development or contact real customers.
Use synthetic provider recipients/Andrew's account only for deliberately bounded
mail checks. Verify authenticated hosted backoffice, customer helper/contact,
follow-up/survey, private previews and regression; record live versus mock evidence.

## Validation commands and acceptance

Run under Node 24 (existing pnpm Node wrapper if necessary):

```bash
pnpm exec nx run bff-contracts:test
pnpm exec nx run bff-service:test-integration
pnpm exec nx run bff-service:typecheck
pnpm exec nx run bff-operator:test
pnpm exec nx run bff-backoffice:test
pnpm exec nx run tablecards-web:test
pnpm exec nx run tablecards-backend:test-integration
pnpm boundaries:check
pnpm check
pnpm test:e2e:development-auth
pnpm test:e2e:tablecards-hosted
```

New library/Worker/evaluation/seed targets must be introduced and documented before
use. Development push uses `pnpm exec convex dev --once --typecheck enable`, not
`convex deploy`/`--prod`; inspect selected target first. Build/publish using existing
dev manifests. No git implementation push to main because it triggers production.

- [x] Eight shared workflow tables and backward-compatible optional settings.
- [x] Truthful all-Business/per-Business overview, Business KPIs and customer investigation.
- [x] Joined support history, private notes, statuses and exact approved reply.
- [x] Website intake and visible delivery outcomes; correlation/retry state covered by backend and actual development email checks.
- [x] Public helper UI, scoped account facts and registered client tools; mock journeys and permission tests pass, not live model quality.
- [x] Reusable persistent Help bubble, Business-neutral forms and scoped theme hooks;
      desktop/phone, keyboard/200% text and navigation-clearance checks pass.
- [x] Explicit answer/general feedback and survey state tied to send evidence; actual emailed invitation and explicit submission pass.
- [x] Private regenerated screenshot conversion and blocked-file guards; actual email intake and authenticated PNG/JPEG browser rendering pass.
- [x] Repeatable realistic dev records and saved-suite execution/report wiring; replacement LLM judge/scorecard and supervised subscription-agent reports implemented. Earlier API calibration failed; real answer batches now have partial supervised evidence, not full-suite acceptance.
- [x] Critical auth, concurrency, privacy, retry and disabled/uncapped-text denial tests pass. Provider caps read back and blocking proved with a temporary tiny guard, then restored.
- [x] Phone/desktop journey, sampled visual/200% text review and full repository gate pass; not a full accessibility certification.
- [x] Authorized development deployment and hosted mock smoke pass; remaining live
      provider evidence is explicitly separated from mocks, never hidden.
- [x] Production unchanged; final handoff lists tested URLs, checks and issues.
- [x] Real Resend send/receive/attachment/survey round trip with signed callbacks.
- [x] Verified provider daily/monthly caps and enabled the fixed cheap development model.
- [x] Bounded broad live cheap-model comparison and subscription-judge controls:
      all recoverable captures and blind grades complete; 90–95% target unmet.
- [x] Reviewable live performance evidence and independently audited subscription
      scoring; no human-ground-truth or API-judge calibration claim. Offline
      wiring reports are still unjudged, not live model accuracy.

Final evidence: [combined development app/readiness review](../../projects/tablecards/docs/reviews/261009-operator-work-development.md).

## Risks, review state and history

**2026-10-12 — Accepted Gemma/Jev development checkpoint:** Andrew chooses Gemma
4 plus Jev over compact-upfront for extensible shared configuration, accepting
the measured 84.0% checkpoint and deferring further quality improvement. The
90–95% aspiration is unmet, not waived as an achieved score. Implement, deploy
and verify development first, then explicitly stage reviewed code/tests/docs and
useful evidence and push the current `build/operator-work-dev` branch. No main
merge/push, production deployment, cap increase, purchase or repeated broad run.

The approved additive schema extension is optional
`operatorWork.bots[].knowledgeSelection` with `strategy: inline | jev` and
`mandatorySkillKeys: string[]`, plus the reviewed Gemma model option. Jev permits
at most 16 assigned sections; mandatory keys are unique and assigned. No new
table/index, requiredness change, backfill or data deletion. Existing rows keep
their old behavior. TableCards bot v6 uses compact-v2 with basics/contact mandatory;
preserve live mail/events/KPI/page-tool bindings while applying the next revision.
Preserve original full/Qwen/v5 and compact reference modules and frozen evidence.

Independent review found full-payload preflight and resumed-run provenance gaps:
include actual serialized system/messages/tool definitions before any selector IO
and every answer step; retain answer-only tokens under each answer-model attempt;
persist selector version, attempt-qualified call counts, fallback reason and
effective sections as bounded evidence, including browser pauses/resumes. No new
spending ledger. Run actual processRun regressions, full repository validation,
real hosted helper/browser-tool and support-draft checks. Small integration smokes
do not establish a fresh 95% quality result. Remove only the disposable generated
`.last-run.json`; preserve paid captures/grades and ignore caches/private state.

**Checkpoint execution outcome — 2026-10-12:** shared provider
`b162aeef-6e08-4b7d-925e-962f876febfd` and BFF development code are published;
final clean BFF push/recheck completed 06:14 UTC. Revision 8 exact readback
confirms Gemma/Jev v6/compact-v2 with all other live bindings preserved. Full
Node24 `pnpm check` passes, followed by fresh 147/147 backend tests and 4/4 real
desktop/phone helper/support checks. Nine focused runtime regressions and
independent Astra source recheck pass. One real synthetic incoming email produced
a delivered fixed receipt and correct suggested reply; exact operator Review
created no substantive delivery. No automatic reply, cap increase, purchase,
production change or unchanged-frontend restamp. Registered destinations are now
included as generic trusted tool metadata after a phone reply invented a URL;
the UI had correctly blocked it. This specific integration fix is not a new
semantic-quality score. Dated failures/rechecks and limitations remain in the
existing development review. Implementation/evidence checkpoint `fa9b2bc` is
committed and pushed to `build/operator-work-dev`; no PR, merge or main push.

**2026-10-11 — Quality target and judge challenge:** Andrew wants more than 90%
good answers, preferably 95%; a cheap model is not acceptable merely because it
is cheap. Diagnose factual errors separately from missing useful guidance and
grading errors. Public benchmarks shortlist candidates, not prove TableCards
accuracy. Preserve previous grades and independently audit actual answers before
using scores for selection. Re-run both saved roles and languages under the actual
knowledge/output budget; missing suites and provider failures remain explicit.
Current benchmark research favors testing newer GLM-5.3-Flash, with GPT-6 Luna and
DeepSeek V4.1 Flash as cross-provider alternatives, not selected replacements.
Access, price and reasoning-budget constraints are recorded in the existing
[development review](../../projects/tablecards/docs/reviews/261009-operator-work-development.md#quality-target-error-diagnosis-and-current-benchmarks--2026-10-11).
No upgrade, purchase, cap increase or model/configuration change is authorized by
this diagnostic comparison.

**2026-10-11 — Matched context experiment and Jev selector:** Andrew requested
testing Jev selection, not merely assuming all knowledge or an extra call is
better. Compare four arms with the same answer model (initially the existing
Gemma candidate), shared behavior, role instructions, questions and output bound:
original full knowledge inline; compact full knowledge inline; compact knowledge
through existing lazy tool loading; Jev selecting compact sections before one
answer call. Keep reasoning/output-budget changes as separate experiments.
Jev sees only the question, minimal relevant history and assigned names/when-to-use
descriptions. Independent relevance decisions allow several sections; trusted
code retains mandatory Business facts and scope/permission rules. Ambiguous,
empty or invalid selection falls back to full compact knowledge within the same
budget; fallback frequency and errors remain visible, not omitted successes.

Start with the first seven helper and first four support tuning cases plus all
13 saved language regressions: 24 diagnostic questions across both roles and
English/Hebrew/Russian/Spanish/French. Separately repeat the three already-seen
Meal-column, failed-unit and unsupported-script failures. These are tuning/error
diagnostics, **not fresh held-out evidence**. Add multi-topic/follow-up cases
before judging retrieval fit; manually check necessary fact dependencies rather
than assuming fixture reference keys are a complete retrieval oracle.
Judge all arms against unchanged full approved facts, blind model/context mode
and randomize review order; retain known-control calibration and independent
checks of critical/disputed cases. Report five quality KPIs, definite factual
errors separately from omissions, missing required knowledge, fallback rate,
every selector/answer call, observed tokens/cost and end-to-end latency. Expand
only promising arms to all saved helper/support sets and fresh unseen cases;
a small pilot cannot establish 95% accuracy.

A pure bounded Jev request/response contract is prepared separately from live
runtime; no Worker route or customer configuration changed. Fresh read-only
Cloudflare checks confirm enabled global $3/day/$30/month caps, postpaid Workers
AI mode and **zero prepaid Gateway credits**. Jev needs third-party Unified
Billing credits, so no Jev inference was attempted, no credits purchased and no
deployment performed. This is a billing-access blocker, not a failed selector
quality score. Resume through the same capped gateway only after authorized
credit access exists, keeping the existing combined $2 evaluation bound.

**2026-10-11 15:40 UTC — One-off Gateway credits authorized and purchased:**
Andrew explicitly approved a small purchase, superseding the earlier no-purchase
boundary only for this top-up. The documented provider minimum is USD 10 credit
plus a 5% purchase fee (USD 10.50 before any applicable tax). Exactly one top-up
creation request returned success; status became completed and balance read-back
was 1000 cents, from zero. No payment details or client secret were persisted.
The two global caps, auto-top-up (amount/threshold zero) and Workers AI postpaid
billing mode read back unchanged. No plan upgrade, inference, schema change or
deployment occurred in this purchase step. Jev access and native answer-model
availability still need proof before the matched experiment; retain the existing
USD 2 evaluation bound and no automatic purchases or uncapped fallback.

**2026-10-11 16:00–16:10 UTC — Prepaid routing and experiment integration:**
Fresh settings explain the remaining access gap: Gateway authentication was off
and native Workers AI billing remained postpaid. Enable authenticated `unified`
billing for `bff-operator-dev` to use the purchased credits; read-back shows only
those two changes, with exact global caps/logging/rate limit/auto-top-up preserved.
No subscription upgrade. Native Gemma responds; Jev returns its v1.13.0 decisions
after normalizing the actual binding's extra result envelope. Inner probabilities
remain strictly validated; outer metadata is never echoed. A private, separately
gated selector route changes no customer bot/model/knowledge configuration.
Shared experiment CLI captures full inline, compact inline, compact lazy and
Jev-selected compact, with complete original facts for blinded review and actual
per-step/selector usage. Business-owned diagnostics add the three already-seen
errors and four multi-topic/follow-up probes to the 24-case pilot; all 31 are
tuning/diagnostic, not fresh held-out evidence. Offline captures 124 rows with
zero paid calls. Seven-descriptor Gemma conservative bound is about USD 1.088;
retain the combined USD 2 maximum, no retry or uncapped fallback. One live
question smoke produces four nonempty answers without errors (USD 0.00130716
measured token estimate); wider capture and supervised judgment remain pending.

**2026-10-11 16:41 UTC — Context capture and independent review:**
31-case capture produced 54 nonempty replies, eight deadline failures and 62
local circuit fast-failures; do not count all 170 driver entries as paid calls.
Fresh seven-case follow-up records 44 actual network calls, 26 nonempty answers,
one empty length-limited answer and one timeout. All 80 replies have validated
blinded Luna grades; strict acceptance is 40/54 and 6/26, respectively, not a
general-accuracy estimate. Astra's selected 15-answer audit accepts 5/15 and
reverses two pricing rejections; original grades and one wrong-question citation
recheck remain separate. Real failed-unit/payment errors persist. Metadata
blinding, dependency labels and sanitized selector-error classification have
regressions. Report matched costs including all answer/selector steps; no customer
model or knowledge selection. Full roles/languages and unseen cases remain.
See [context evidence](../../projects/tablecards/docs/reviews/261009-operator-work-development.md#context-selection-experiment-preflight--2026-10-11).

**2026-10-11 18:19 UTC — Complete Astra review of the seven-case context capture:**
All 26 nonempty replies independently graded at extra-high reasoning against full
approved facts; exact packet/content/ID checks yield no invalid or unsure grades.
Primary Codex cross-check retains the judgments and distinguishes unsupported
reference claims from definite falsehoods. Out of all seven attempts per strategy:
full upfront 6/7 (85.7%), compact upfront 4/7 (57.1%), compact tool-loaded 4/7
(57.1%), Jev + compact 5/7 (71.4%). The two no-answer failures remain included.
Seven is five helper plus two support, not seven per bot. The sole definite
critical fact error is calling the no-charge preview a current $5 charge.
No new inference or customer configuration change. Andrew correctly challenged
the tiny sample: the full 84-helper/73-support saved sets and fresh unseen cases
remain necessary; these diagnostic percentages establish no winner or 95% claim.
[Full review evidence](../../projects/tablecards/support/evaluation-results/20261011-163454683-context-astra-full.md).

**2026-10-11 18:40 UTC — Broader comparison authorized:** Andrew requested all
four knowledge strategies across the full saved helper/support bank and multiple
cheap models, respecting request limits. Freeze 157 saved plus 12 fresh
Business-owned questions (169 total) and both knowledge snapshots; compare Qwen3
30B, Gemma4 26B and GLM 4.7 Flash, for 2,028 planned answer attempts. Preserve
provider-default generation and the 1,200-output-token ceiling. Three workers
share paced admission (3.5 seconds between starts against the last verified
20/minute gateway limit), actual-network 25-second timeouts, finite workflow
deadlines, no retries and a combined $2 measured/unknown/in-flight bound. Lazy
steps no longer share the pilot's unfair 25-second total allowance. Both provider
caps and the customer Qwen/full configuration stay unchanged. Read-only dev
secret-store access and live/caps flags work; a fresh management read-back is
unavailable because the setup token was cleared. Persist partial coverage and
blinded review packets incrementally. Astra judges all substantive outputs, with
known controls and primary cross-checks; report semantic quality separately from
delivery failures, unknown costs and unattempted cases. No extra purchase,
subscription, schema change, production deployment or implementation push.

**2026-10-11 19:16 UTC — Faster pacing authorized and applied:** Andrew reported
raising the Gateway rate limit to 200 requests/minute. Reduced this running
capture's start interval from 3,500 to 400 milliseconds in place, preserving
the same process, immutable captures, model/knowledge/settings and three awaited
workers. The $2 measured/unknown/in-flight bound, 4,000-call maximum and 25-second
network deadline read back unchanged. A non-billable Node 24 control completed
with 399/401-millisecond start gaps before the live adjustment; subsequent live
captures continued, with no restart or retries. Localhost debugging was detached
and closed. Fresh provider management readback remains unavailable; the 200/minute
setting is user-reported. Keep observed latency's two pacing phases explicit;
actual throughput remains model-latency/concurrency dependent.
[Pacing evidence](../../projects/tablecards/support/evaluation-results/knowledge-matrix-2026-10-11T184003-864Z-pacing-change.json).

**2026-10-11 21:00 UTC — Interrupted matrix recovery:** Andrew requested continuing
the check to its end and a final summary. Original capture/watcher processes are
gone; exit cause is unknown. Preserve all 217 completed workflows (868 attempts)
and their 753 nonempty blind grades. Frozen hashes and capture identities pass
read-only recovery preflight. Exclude three potentially interrupted GLM workflows
(indices 215/218/219, 12 attempts) from reruns and retain them in planned coverage.
Resume 287 untouched workflows (1,148 attempts), using the same $2/4,000-call
ceilings, known $0.293626 estimate, $0.221167 unknown reserve, $0.004925 former
in-flight reserve and an additional conservative $0.080613 interruption reserve
(up to 24 unrecorded starts, not measured starts). No extra purchase or retry.
Use 400-millisecond shared pacing with eight awaited workers; all generation,
knowledge and customer configuration remain frozen. Add durable sanitized
request reservation/completion journaling and atomic progress before resumption.
Two new Astra extra-high reviewers use the fixed blind scorecard and independently
check authored controls. Final percentages separate semantic adequacy, missing
required details, wrong claims and unavailable/interrupted delivery; ungraded
answers remain pending. Compare cost only with complete known usage, and retain
unknown failed-call costs. No model/config/deployment/schema change is implied.

**2026-10-11 — Broad comparison completed:** 2,016 of 2,028 planned attempts
captured, 12 earlier interrupted attempts retained without retry, zero unstarted.
All 1,771 nonempty answers strictly validate under blind Astra reviews; no
pending/invalid/unsure grades. Gemma compact-upfront and Jev each pass 142/169
(84.0%), full-upfront 139/169 (82.2%); none meets Andrew's 90–95% target.
Recorded inference estimate USD 0.691337 plus unknown-call headroom USD 0.523401
stays below the same USD 2 bound. Zero HTTP 429; GLM contributes 156 of 164
timeouts and all 10 provider errors. Both 22-control checks and a
selected 24-answer audit are preserved; raw grades remain unchanged, and
omissions/unsupported account claims are distinguished from false advice.
Gemma with knowledge upfront is the improvement candidate, not a live switch;
fix numeric advice, unverified account diagnoses and current-preview wording
before fresh regression runs. All 115 operator tests/type/lint/format checks
pass; processes/reviewers finished, no schema, customer config or deployment
change. [Full outcome and actual failure examples](../../projects/tablecards/docs/reviews/261009-operator-work-development.md#context-selection-experiment-preflight--2026-10-11).

**2026-10-11 — Next bounded generation control:**
Hold compact knowledge and behavior fixed while comparing provider default with
documented Gemma `chat_template_kwargs: { enable_thinking: false }`. Seven cases,
three repetitions and two randomized arms give 42 calls, 1,200 output tokens,
25-second deadlines and no retries; conservative bound USD 0.152746, within the
existing combined USD 2 ceiling. No customer configuration change or extra
purchase. Separate private experimental gate, exact Gemma only and no tools.
Preserve raw measured reasoning counts; absent details stay unknown, not the
SDK's synthetic zero. Do not infer hidden reasoning from blank output alone.
Retain current compact snapshot during this paired test; restore its dropped
bot qualifier in a separately versioned follow-up, not mid-experiment.

**2026-10-11 17:25 UTC — Generation control completed and audited:**
All 42 actual requests returned HTTP 200; 41 complete nonempty answers, one
default length-limited response, zero timeout/local block/retry. Estimated
inference USD 0.0141868 includes all 42. Default/disabled mean USD per attempt
0.00041247/0.00026309, observed medians 12.304s/2.711s; absent reasoning counts
remain unknown in both arms. Luna grades all 41 (13 strict passes), with two
wrong-batch-ID originals preserved beside separate rechecks and one disclosed
semantic correction. Astra audits 17 selected disputes: six adequate, seven
pass/fail reversals, no definite critical finding; all five raw Luna critical
labels are disputed. Real incomplete mapping, ambiguous credit explanations,
workspace wording and unqualified current-price problems remain. Neither raw
counts nor selected audit rates establish general accuracy or a strategy winner.
Compact v2 separately restores the bot qualifier; original paired v1 snapshot
and hashes remain. All 19 Business tests/type/lint pass; CLI 90/provider 52
tests, affected builds and boundaries pass. No schema/migration, customer switch,
cap increase, extra purchase or production change. Next: essential/optional
grading calibration, corrected knowledge and stronger cheap candidates on saved
roles/languages plus fresh cases, keeping quality first.
Full compact-v2 offline rerun loads all 157 saved cases with zero paid calls/errors;
all remain unjudged. Scoped formatting/secret/link checks pass; existing scoring
guidance already requires qualitative cross-checks and preserves unrun suites,
so no repository rule/skill change is proposed from this experiment.
[Measured comparison, exact replies and provenance](../../projects/tablecards/support/evaluation-results/generation-control-2026-10-11T171036-602Z.md).

**2026-10-11 — Subscription batch judge and optional knowledge compression:**
Andrew chose Luna subscription sub-agents in batches instead of buying Workers
Paid for an API judge. Capture-only generation remains explicitly unjudged and
bounded; independent opaque-ID packets hide candidate/model/price/split/old
grades. Shared validation checks provenance, complete IDs, strict scorecard
contracts and deterministic failures. Controls initially matched 23/24; one
incorrect citation was repaired separately, with scores unchanged, to reach
24/24. This is a supervised AI control check, not API calibration or human
ground truth. Primary AI checks retain every original grade and disclose
corrections. Collection subsequently stopped after shared provider failures;
all 179 nonempty answers have saved grades, a four-answer fresh recheck and
primary inspections. The identical 22-question helper intersection yields
8 → 13 Qwen, 17 → 18 Gemma and 15 → 16 GLM original → supervised passes, each out of 22.
Gemma leads this limited sample, not a full multilingual/support comparison;
no permanent model selection follows from partial scores. The existing
[development review](../../projects/tablecards/docs/reviews/261009-operator-work-development.md#blinded-subscription-agent-results--2026-10-11)
links exact cases, KPIs, costs and provenance. Native error 4006 is consistent
with inferred account free-quota exhaustion, but quota analytics and the public
3036 error-code mapping were not confirmed. No retries or purchase; verify
availability before bounded missing-suite continuation. Experimental disabled
Business-local compressed knowledge preserves 123 fact distinctions and reduces
content by 11.6% in bytes. It requires matched answer-quality tests against the
original full facts; no live replacement, schema/migration, cap change, billing
purchase, provider deployment or production change.

**2026-10-11 — Shared behavior and quality-first model comparison:** Andrew chose
quality first, estimated cost second and latency third. Compare inexpensive answer
candidates using the same questions and an independently calibrated stronger judge;
report five dimension scores, critical failures, runtime questions/acceptable answers
per USD 1 and separate evaluation-only judge costs. No frontier customer answers,
automatic fallback, cap increase or spending tables. Shared behavior v2 owns general
grounding/permissions/clarity and one customer-language rule; TableCards bot v5
contains only its role guidance. Seven assigned files total 7,873 UTF-8 bytes
(9,158 with descriptors), so supply them upfront within the generic 10KB bound;
larger corpora retain lazy loading. No paid selection model is justified yet.
Final history review fixes retain complete customer/tool turns and reserve the
SDK's system-message slot. Full Node24 repository checks pass (3m3s), and BFF
development was republished at 07:26 UTC with revision-7 content unchanged.
Final real desktop/phone helper smokes pass 2/2 (39.2s); no schema or
migration, email change, production deployment or commit/push. Judge calibration
improved 20/24 to 22/24 but still accepts a bad Spanish translation; quality
comparison remains gated, not passed. Current evidence is in the existing review.
Kimi/DeepSeek evaluation-only candidates and selected-judge identity checks are
implemented/tested, but actual probes returned Cloudflare 5035 (Workers Paid
required). No billing upgrade/credits were purchased. The later subscription-
judge decision above resolves that choice without an API-judge purchase. Do not
label access errors as answer accuracy.

**2026-10-11 — Russian/Spanish/French diagnostic check:** Twelve actual anonymous
helper replies (four per language, including fresh-thread repeats) were reviewed
against approved facts, independently checked by Astra and saved in the existing
[review](../../projects/tablecards/docs/reviews/261009-operator-work-development.md#russian-spanish-and-french-spot-checks--2026-10-11).
All three sets invented current payment behavior; Spanish also leaked Hebrew and
misworded printing. Readable Russian/French does not establish factual quality.
Nine tuning regressions bring the bank to 157, held-out sets unchanged; six
fixture tests and affected lint/type checks pass. All 157 offline cases remain
unjudged; the prior failed live calibration is not bypassed. No runtime/model/
prompt/cap change, deployment, schema/migration or email send occurred.

**2026-10-11 — Hebrew rendering and quality regression:** Andrew's screenshot
showed LTR layout and genuinely garbled Hebrew/Arabic output. Generic shared
direction/isolation fixes pass 34 assistant tests and 12 hosted desktop/phone
checks, including Hebrew after a Latin brand, mixed English, lists, code and
200% containment. TableCards bot instructions v4 and basics/printing knowledge
v2 were revision-checked into dev configuration revision 6; mail/tools/events/KPI
bindings, caps and the fixed Qwen model are unchanged. No schema/migration or
backend/provider redeployment. Repeated real questions and lower-temperature
isolated probes still produced bad wording and unsupported details: **language
quality is unresolved**, not passed. Four Hebrew regressions bring the saved
sets to 148; offline wiring ran, but live judge calibration matched only 2/12,
blocking all answer cases. Next is judge-contract repair and bounded evaluation
of inexpensive multilingual candidates, not further claims based on one good
sample or an expensive fallback. Exact reports and dev UI version are in the
existing [review](../../projects/tablecards/docs/reviews/261009-operator-work-development.md#hebrew-rendering-and-language-regression--2026-10-11).

**2026-10-11 — Markdown and duplicate-link remediation:** Andrew's mobile
screenshots show raw Markdown and the same pricing destination repeated across
tool/answer steps. Shared presentation now renders Markdown/GFM through pinned
`react-markdown@10.1.0`/`remark-gfm@4.0.1`, discards raw HTML, suppresses remote
images and permits only registered Business links. Adjacent assistant steps are
grouped for display; destinations are deduplicated without rewriting saved/SDK
history, feedback IDs or browser-tool continuation. Customer text remains literal.
No schema, provider-mode/cap change, backend redeployment or production work;
targeted regression and development UI evidence are in the existing app review.

**2026-10-10 — modern shared chat refinement:** Andrew requests a modern bubble
chat instead of the form-like Help panel. Astra supplies a bounded UX review;
the shared component now owns compact chrome, message bubbles, an independently
scrolling transcript and pinned autosizing composer. TableCards only selects
the view/subtitle and supplies branding/content. Draft clearing happens at
submission, never after the awaited answer; Enter/Shift+Enter/IME handling,
explicit retry/Stop, preserved reading position and contact-back continuity
have targeted regression coverage. No schema, dependencies, provider-mode change
or automatic customer action. Development-only publication and final rendered
validation are recorded in the existing app review. Final TableCards version
`e1869c48-bddb-4078-8ab1-13af50215c40` passes 16 hosted desktop/phone checks,
29 shared React/server tests and the full Node 24 gate (3m1.7s). Astra's final
review also led to VisualViewport/zoom cleanup, non-overlapping multiline jump
controls and Help/contact heading focus. Actual phone keyboards remain unproved
by browser emulation; live AI remains independently cap-blocked.

**2026-10-10 — real development email acceptance:** email and authenticated
website intake, fixed receipt, exact public operator Send, private PNG/JPEG
previews, signed callbacks/replay, duplicate denial, emailed survey and follow-up
reopening pass. Email-only and verified website cases remain separate. Two
fail-closed defects were fixed: the provider's exact HTTPS download-CDN hostname
and backoffice CSP support for private image blobs. The latter allows `blob:`
only in `img-src`, with red/green policy regression and six fresh affected
test/type/lint tasks. Backoffice dev version
`4e369153-e9c9-4580-b0e1-2231aaa92696` renders JPEG 1050×600 and PNG 32×32;
zero CSP/preview errors, original links or mutation requests in the final check.
The final Node 24 `pnpm check` passes in 1m31s, with all three backend integration
suites and both local browser suites fresh; matching Nx caches reused elsewhere.
No schema migration, production change or additional vendor. Live AI remains
disabled pending provider caps; this email proof does not establish model quality.

**2026-10-10 — reusable support presentation:** moved default helper/form/survey
styles into the shared library, removed TableCards guest-list copy from shared
code and exposed scoped presentation tokens. TableCards supplies its extra
privacy wording and branding. The shared controlled `BffHelpSurface` now owns
the persistent launcher, responsive modal and focus behavior; Business code
retains auth/page/view state and mobile-navigation clearance. Shared React tests
pass 24/24, affected type/lint/unit targets and builds pass, and eight focused
hosted desktop/phone checks pass on TableCards dev version
`1f7ecad3-75ef-4e9a-9002-ad0d477b558f`. Anonymous bubble/panel captures were
visually inspected. No database/schema migration, provider-mode change,
production publication or automatic sending. Full hosted helper/contact/survey
mock regression passes 14/14 on desktop Chromium/phone WebKit;
live email/model gates remain separate and unchecked.

**2026-10-10 — event visibility refinement:** Andrew requests customer-page
Business events and compact overview counters with linear trends. Show readable
Business labels, bounded properties and product references prominently; offer
indexed, paginated history restricted to the selected customer/environment.
Overview trends use seven consecutive 24-hour buckets from the existing rolling
seven-day, 500-event sample. Daily unique customers and seven-day unique
customers are counted independently; incomplete totals/trends remain labelled.
No new table, field, index, migration, spending display or fabricated history.
Verify the populated customer journey and trend table on hosted desktop/phone.

Implemented and development-verified on 2026-10-10: BFF pushed at 08:34 UTC;
final backoffice version `f803e6a2-748d-4e0d-9205-c3bcab36320b`. Full Node 24
gate passes (1m50.4s); final scoped UI checks, fresh 133 backend tests and 8/8
hosted desktop/phone checks pass. Visual inspection removed duplicate displayed
references. Actual synthetic customer records, empty history, navigation and
scope clearing are verified. No schema migration or provider/production change.

No remaining Business decision blocks implementation. Private Images conversion
and real development mail are deployed/tested. Provider caps are now verified
and live development AI is enabled (activation revision below); full live quality
evaluation remains pending. The 2026-10-10 evaluation audit also establishes
an engineering correction before relying on quality scores: empty/irrelevant
answers pass 122/144 cases, and correct synonyms can fail. Fresh offline execution
and 58 targeted tests pass but do not establish meaningful scoring or live model
performance; detailed calibration is in the existing development review.
Resend access is now restored through a temporary key persisted/read-back verified
in BFF development. The isolated Business domain and signed development webhook
are now provisioned; a bounded provider diagnostic reached Andrew's Gmail inbox,
with actual signed callbacks, idempotency and callback-replay deduplication proved.
All five Business DNS records now match publicly after Andrew's renewed temporary
setup authorization; revision-3 branded bindings match exact read-back. Resend's
verification passed at 16:37 UTC; development mail is live. Actual Gmail intake
created an email-only case and its fixed receipt reached Gmail with signed
callbacks. Attachment smoke found a fail-closed CDN-host mismatch; its scoped fix,
private browser previews, operator reply, website intake and survey proof now pass. Exact
records/evidence are in the provider runbook.
Rotate the temporary Resend and setup keys after setup. The isolated development
gateway has Andrew's named global USD 3/1 day and USD 30/1 month fixed rules,
with actual read-back and blocking proof. The isolated judge/scorecard, calibration
controls and readable v2 reports are implemented/tested; real model smoke calls
now work but do not establish full-suite quality scores. Development mail and text
are live; no expensive or uncapped fallback is enabled.
Do not fake success or widen authority. No destructive rollback,
real customer backfill, production settings or paid plan upgrade is needed.

**2026-10-10 — live activation follow-through:** Andrew requests completing real
email/AI, not stopping at mocks. Earlier access checks found the Resend key
absent from task notes and dev runtime; the exposed Cloudflare setup token still
needs replacement. Two live-path defects are fixed/deployed: reply-token address
normalization and Qwen reasoning echoes in SDK tool continuations. Red/green
tests pass (service 129/provider 10), with no schema/migration. A separately
opted-in live browser suite is prepared and correctly refuses current mock mode
before spending. Screenshot PNG/JPEG rechecks pass. Required real-mail round trip,
cap enforcement and live model evaluations remain unchecked, not waived.
Full Node 24 gate rerun passes (1m51.3s); hosted backoffice 6/6 and helper 8/8
reruns pass after the development push. Final harness type/lint checks pass.

**2026-10-10 — temporary Resend access restoration:** Andrew supplied a replacement
temporary key. Saved to the explicit BFF development environment through private
stdin and verified by exact private read-back; domain/webhook list requests both
return HTTP 200 with zero resources. No email was sent, mail was not enabled,
and no domain/webhook was created. No repository credential or production change.
The chat-shared key needs rotation after setup; domain/DNS/receiving and live mail
acceptance remain pending.

**2026-10-10 — bounded live-email provisioning:** created the one approved
`tablecards.tofler.app` Resend domain with sending/receiving enabled and tracking
off, plus the enabled signed development callback. Its secret was privately
installed and read-back verified. One diagnostic from `onboarding@resend.dev`
reached Andrew's connected Gmail inbox; duplicate-safe provider requests and real
sent/delivered callbacks pass, including delivered-event replay deduplication and
unsigned-callback denial. This was not a support reply; receipts correctly stay
unmatched. Existing OAuth reads the zone but receives HTTP 403 for DNS records;
branded verification remains pending. No exposed setup token, beta Inbox, paid
upgrade, global live-mail activation, old mock resend, code/schema change or
production publication. Forty-four focused tests pass. Full received-email,
operator Send, attachment and survey checks still need a verified receiving
domain or the provider-managed receiving identity; do not infer them from the
transport diagnostic. See the existing provider runbook for exact DNS records.

**2026-10-10 — capped development AI activation:** Andrew configured the named
global fixed USD 3/day and USD 30/month gateway rules. Read-back returned windows
86400/2592000; a temporary USD 0.000001 guard rejected with HTTP 429/code 2045,
then was removed and both original rules were rechecked. Activated only the
development private Worker and BFF flags. Fixed Qwen native null-content handling,
SDK7 completed-read versus pending-browser-call separation, and repeated client
continuations with red/green regressions. No schema or migration change.
Fresh provider/shared/TableCards tests pass (11/30/120), backend 135 tests and
affected type/lint/build pass. Actual printing answers, FAQ browser-result
continuation, feedback and chosen navigation pass desktop Chromium/phone WebKit
**2/2**, without mock responses. The browser harness captures only live/status
booleans in-page, avoiding Chromium's discarded streamed-body diagnostics.
Current versions and caps are in the existing development review/runbook.
Production is untouched; native alerts, full quality eval and judge calibration
remain pending. This activation did not run the 144-case paid quality suite.

One-pass confidence: **7/10** — clear accepted scope and reusable auth/tests, but
asynchronous provider boundaries and actual model/browser-tool behavior require
implementation evidence. Completing the dev boundary does not establish paying
customer launch or production readiness.

| Date       | Status                                   | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-09 | Approved for unattended execution        | Plan created at `41ba411`; Andrew authorized plan/build/test/review/dev verification and labelled mock alternatives while asleep.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-10-09 | In progress                              | Backend/contracts, private provider, UI, synthetic fixtures and operator CLI implemented. Independent review found and fixed stale draft replacement, callback ordering/failure handling, atomic attachments, CID retrieval, short browser call IDs, privacy headers and disabled-run state. Targeted tests pass; full gate and hosted deployment remain. Worker screenshot conversion verified live; text/mail remain mocked/disabled pending access and cap proof.                                                                               |
| 2026-10-09 | Development deployed; final verification | Initial full `pnpm check` passed. Both dev Convex backends, private image provider, populated backoffice and TableCards helper deployed; 18-case seed is repeatable. Hosted support approval/private-note checks pass desktop/phone. Andrew adds Business KPIs, implemented through optional definitions and bounded event aggregation; final gate and hosted regression rerun after this addition. Real mail and capped text remain unverified/disabled, not silently passed.                                                                     |
| 2026-10-09 | Development verified; provider blockers  | Final Node 24 `pnpm check` passes (1m15.5s, matching cache reused). Hosted backoffice 6/6 and helper 8/8 pass; existing TableCards regression aggregates 39 passes/2 intentional paid-AI skips across bounded runs after an unexplained exit 143. Final KPI/200% text fixes are deployed and rendered checks pass. Fresh product events reach BFF. Current Resend notes are empty; the exposed setup token requires rotation and caps remain unverified. Production, purchases, live text/email and implementation commit/push were not performed. |
