# Operator work — development review

Created: 2026-10-09; updated: 2026-10-13
Baseline: `41ba411`; implementation/evidence checkpoint `fa9b2bc` pushed on `build/operator-work-dev`
Scope: shared Operator work and TableCards integration, development only
Status: Gemma/Jev development checkpoint verified; broad comparison complete, 90–95% target unmet/deferred by Andrew

This combines the app review and development-readiness evidence. The
[plan](../../../../.agent/plans/261009-operator-work.md) owns tasks;
[shared architecture](../../../../docs/architecture/operator-work.md) owns the
workflow schema. No production publication or customer
billing was performed. Andrew authorized one minimum prepaid Gateway purchase
on 2026-10-11, recorded below; no subscription upgrade or automatic refill.
Bounded real text-model smoke/evaluation calls were made.

## Deployed boundary

| Surface                        | Development target / version                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Operator backoffice            | [ops-dev.tofler.tech](https://ops-dev.tofler.tech), `4e369153-e9c9-4580-b0e1-2231aaa92696`                                                  |
| TableCards web                 | [tablecards-dev.tofler.app](https://tablecards-dev.tofler.app), `5b5f3f57-49f6-4104-b96f-fd596f871f8b`                                      |
| Shared BFF                     | `compassionate-buffalo-689`, successful development code push 2026-10-13 19:56 UTC                                                          |
| TableCards backend             | `scrupulous-hawk-991`, successful code push 20:56 UTC                                                                                       |
| Private screenshot/text bridge | `business-factory-ai-provider-dev`, `b162aeef-6e08-4b7d-925e-962f876febfd`; private Gemma/Jev runtime, isolated judge/experiment roles, Images and capped bindings |

### Printing-answer retry repair — 2026-10-13

Andrew reported an error after the starter question **“How do I print at the
right size?”**. Indexed run inspection and sanitized HTTP logs match the device
time: the original run completed at 19:42:34 UTC and its HTTP response was 200;
a retry six seconds later returned 409. No provider outage or cap rejection was
observed. A fresh WebKit answer succeeds. Why that original successful response
was not displayed is **unreproduced**, not attributed to an invented outage.

The confirmed recovery defect was that completion cleared `activeRunId`, then
retry treated the saved answer as an already-handled conflict. Anonymous clients
also previously learned their capability only from the response. Shared recovery
now creates that capability before sending, uses the exact question's indexed
run, and replays its authorized saved answer rather than starting paid work again.
Latest question/page, customer/account/capability and source-entry checks remain
enforced. Failed runs can be explicitly retried within the existing three-attempt
bound and unchanged configuration; queued/running duplicates never start work.
No database/configuration/model/instruction/cap change or migration.

**Pass:** 151 backend integration tests; 101 assistant tests; affected type/lint,
boundary, secret and build checks. Independent read-only audit finds no blocker.
**Four real hosted checks pass** on desktop Chromium/phone WebKit: each completes
this printing question, deliberately hides the delivered response after the
answer is saved, clicks Retry, verifies a byte-identical replay and checks one
run/attempt/question/answer in the database. The existing printing/FAQ browser-tool
flow also passes on both devices, with customer-clicked navigation and feedback.
These are integration tests, not a new 90–95% model-quality claim.

An initial extra UI selection hit two stale tests expecting a deployed mock
notice while the backend is live. They failed before sign-in/contact, not because
of a customer-auth defect. The ordinary UI suite now intercepts inference,
contact and feedback actions, rejects unconfigured actions, and expects anonymous
capability on first fetch; it cannot accidentally spend or send mail. Final
mock UI recheck **6/6 passes**: Markdown safety, exact-question retry with an
unsent draft preserved, and sign-in/out context separation on both devices.
A 157-case offline
diagnostic (84 helper/73 support) and the saved printing case both complete with
zero model calls; ignored dated reports stay in Business `test-results/`.
Frozen live captures/grades and the accepted 84.0% checkpoint remain unchanged.

Only the BFF development functions and TableCards development assets changed.
Provider, backoffice, TableCards backend and production were not republished.
Andrew requested a commit/push of this repair to the work branch on 2026-10-14;
this does not authorize a main merge or production publication.

### Gemma/Jev checkpoint — 2026-10-12

**Pass for the authorized development boundary:** Andrew selects Gemma 4 + Jev
for reusable knowledge selection, accepts the current measured quality baseline
and requests a clean branch checkpoint. Revision 8 stores bot v6, unchanged
compact-v2 skills and mandatory basics/contact; exact readback preserves all
mail/presentation/events/KPIs/page capabilities. Optional selection fields and
Gemma enum expansion are additive, explicitly approved, with no new table/index,
backfill, required field or data deletion. Original full/Qwen/v5 and compact
reference modules plus frozen captures/grades are retained unchanged.

Independent Astra review found and rechecked fixes for tool-inclusive 24KB
preflight before selector/answer IO, answer-only token provenance, browser-pause
evidence, attempt-qualified selector counts and the 16-section Jev bound. Pinned
SDK internal converters have an actual-wire regression; future upgrades must
recheck them. Failed/stale selector phases can still lack diagnostics; absence is
unknown, not zero. Nine actual Convex processRun regressions pass with provider
functions mocked; 100 assistant/55 provider tests and a fresh 147-backend suite
pass. Full Node24 `pnpm check`, affected type/lint/format/boundary/secret checks pass.

The initial live smoke exposed a real invented FAQ domain on phone; the UI
correctly stripped that unregistered link. Supplying each existing registered
destination as trusted generic tool metadata fixes the integration gap, with a
regression that also confirms support has no browser tools. The first support
test also hit the intentional `.invalid`-only development signup guard; no mail
or inference occurred in those rejected signup attempts. Keep that guard intact.
Instead one authorized synthetic incoming Gmail message exercised real Resend
intake/callbacks and produced a delivered fixed receipt plus a correct Gemma
printing draft (Actual Size/100%, not Fit to Page, and a print-test first).
No substantive reply was sent. Both devices reused the same case; browser tests
do not send email or bypass identity by changing the synthetic signup policy.

**Final live smoke: 4/4 pass**, one worker, zero automatic retries (75 seconds):
desktop Chromium/mobile WebKit each verify a real printing answer, registered FAQ
browser continuation, customer-chosen navigation/feedback, and the live support
draft with exact operator Review/Send available but deliberately not clicked.
Selector evidence identifies `jev-1.13.0`; paused/resumed answer attempts retain
separate measured tokens/call markers. Synthetic chat/editor screenshots were
inspected; captures remain ignored and omit identity/routing capabilities.
Small smokes use an additional conservative allowance below USD 0.50, still
inside the earlier combined USD 2 envelope; no top-up, cap change or broad rerun.

An extra uncached backend run had one unchanged auth rate-limit test fail;
targeted 2/2 and fresh 147/147 rechecks pass. The installed limiter randomizes
fixed-window starts, so a rollover during a real-clock test is a plausible
timing cause, not a demonstrated production permission failure. No auth source
or test expectation was changed. One Convex wrapper ended 143 after reporting
functions ready; a clean explicit dev recheck completed 06:14 UTC with exit zero.
Unchanged frontend/TableCards backend releases remain the prior versions above.

**Accepted limitation:** prior Jev/compact strict acceptance remains 142/169
(84.0%); the 90–95% target is not achieved or replaced by these integration
smokes. Repetitive prose, unsupported account diagnoses and earlier numerical
mistakes remain improvement work. API-judge calibration/human-ground-truth,
production/launch, native alert setup and credential rotation remain separate.
Cleanup removes only generated `.last-run.json` and excludes ignored caches,
credentials/private state; paid comparison evidence is useful provenance, not
disposable garbage. Implementation/evidence commit `fa9b2bc` is pushed only to
`build/operator-work-dev`; the final documentation handoff adds no source or
deployment change. No main push, PR or merge was made.

The eight additive shared workflow tables and optional environment configuration
are implemented. Missing configuration remains disabled/revision zero: no
old-row backfill, required-field change, deletion or TableCards domain migration.
The later KPI addition uses optional definitions in that same snapshot, not a
new table/index. Initial revision 2 enabled synthetic mail addresses; revision 3
has branded Business email bindings. Domain verification passed 2026-10-10
16:37 UTC and development transport is now live. Initial seed creates 18 cases; a repeat creates zero
new cases and recognizes all 18 existing cases without erasing other records.

## App and behavior evidence

**Pass:** eight hosted backoffice checks cover desktop Chromium and phone layouts:
Business KPI counters/trends and scoped overview; populated customer events,
properties/references, customer-only history/back navigation, honest empty state
and scope switching; Customers/Activity/Bots investigation and 200% text
containment; joined support history, exact Review/Send and private notes.
Read-only support tools do not ask approval. Every substantive support reply
requires the operator's exact send decision. Mock transport was visibly labelled
during these checks; later live activation is recorded separately below.

**Pass:** fourteen fresh hosted helper checks cover desktop Chromium/mobile WebKit:
anonymous whole-site mock help, registered customer-clicked navigation, keyboard
and focus, sign-in, explicit contact/general feedback and invalid survey denial.
Account-switch/private-context behavior also has component and server tests.
Synthetic `.invalid` mailboxes explicitly warned that email follow-up was unavailable;
revision 3 now uses the verified branded Business mailbox.

**Pass:** all 39 ordinary existing hosted TableCards cases pass; two manual paid
artwork-AI cases are intentionally skipped. Coverage includes actual PDF bytes,
edited title/names/duplicate multiplicity, 500-card output, persisted projects,
no-charge offers, presets and team/account/ownership journeys. An uninterrupted
full command is **not** claimed: the initial runner exited 143 without an
assertion failure. Bounded desktop/mobile groups completed the same configured
coverage against their then-deployed versions; the interruption cause is unproven.

Sampled rendered overview, support case, helper and contact screens were inspected
on desktop/phone, not only asserted. At 200% text, backoffice top-bar wrapping and
TableCards public-header/FAQ overflow were corrected and retested. No remaining
sampled document overflow or console/page error was observed. Browser emulation
does not establish physical-device or full assistive-technology conformance.
Synthetic captures remain ignored under `.playwright-cli/`; no auth grant,
capability, cookie or private customer data is committed as an artifact.

### Business event visibility delta — 2026-10-10

**Pass, development only:** Business events now precede workspace/support details
on the selected customer page. They show Business-owned labels, timestamps,
bounded properties and a product reference once (not duplicated in properties).
The first 30 records have a completeness label and a link to indexed paginated
customer-only history. An existing synthetic customer's two project saves and
one available PDF match the protected query's labels, properties and references;
a different fixture with no linked events shows an honest empty state. Switching
environment removes the previous customer selection/evidence. No email identity
guessing, account-member aggregation or reassignment of unlinked seed records.

The overview uses a compact semantic metric/count/trend table. Seven consecutive
24-hour buckets use the same rolling seven-day sample as totals, with separate
per-day and per-window distinct-customer counts. SVG titles and expandable dated
counts provide text equivalents. Zero/flat series and partial lower bounds are
tested; each line's independent scale is disclosed. This is event reporting,
not a spending dashboard or lifetime-total promise.

Node 24 `pnpm check` passed (1m50.4s), including the full integration gate.
After the small visual deduplication, backoffice unit/type/lint and format checks
passed; a fresh backend run passed **133/133** tests and hosted desktop/phone
passed **8/8** on final version `f803e6a2-748d-4e0d-9205-c3bcab36320b`.
Four scoped counter/customer captures were visually inspected; the final customer
captures were rechecked after deduplication. Physical devices, full assistive
technology conformance and load benchmarks remain unverified. BFF query
projections changed, but no database schema/index/migration changed. Only the
shared BFF development functions and backoffice were published; TableCards and
provider Workers were not restamped. Live email/model blockers remain unchanged.

The initial edited-PDF failure was a test-readiness race: the editor temporarily
remained `inert` after hydration, and an early fill did not enter its new value.
The test now waits for readiness and verifies entered names; exact PDF assertions
are unchanged. Archive/Contact and Free-offer locators were aligned with accepted
current UI, not replaced by weaker outcome assertions.

### Business KPIs

Four Business-owned definitions appear above support work, grouped by Business:
recorded active customers, project saves, PDFs ready and export failures. Values
cover seven rolling days of event activity. Saves are not unique projects;
PDF availability is not proof of download/printing; anonymous users are excluded
from distinct verified-customer counts. Queries bound event reads to 500 and
label truncated values as partial lower bounds, not complete lifetime totals.

**Pass:** scoped aggregation, old configurations without KPIs, duplicate actors,
anonymous/future/old events, denied operator access and truncation are tested.
An authenticated read of development overview/activity confirmed fresh TableCards
save/export events beyond the seed, with product references. These are synthetic
test customers, not evidence of acquisition or production business performance.

### Shared Help bubble and Business presentation — 2026-10-10

**Pass, development only:** the shared `BffHelpSurface` supplies a persistent
launcher and desktop panel/phone sheet. It works on public, Create, contact and
signed-out workspace pages; authenticated mobile navigation remains unobstructed.
Escape/Close restores focus and preserves unsent questions. Feedback stays in
the header; identity changes retain the existing private-state clearing boundary.
Shared default styles and privacy copy are Business-neutral. TableCards supplies
its own palette and extra guest-list warning through tokens/plain-text props.

All eight focused desktop Chromium/phone WebKit checks pass on version
`1f7ecad3-75ef-4e9a-9002-ad0d477b558f`, including real theme overrides, preserved
drafts, no automatic answer/contact POST, 44px controls and 200% text containment.
Twenty-four shared React/server tests, fresh affected type/lint/unit tasks,
Business/SDK builds and ownership checks pass. Anonymous closed-bubble and open
panel captures are visually inspected; they contain no auth grants. The initial
theme test failures were a filled-textarea label locator and WebKit's
19.200001px serialization of 19.2px, not missing fields or a changed radius.
The final test uses the semantic textbox role and numeric precision comparison.
Full helper/contact/survey mock regression also passes **14/14** on that version.
No schema/migration, provider-mode change,
paid inference, live mail or production publication belongs to this UI delta.

### Modern shared chat delta — 2026-10-10

TableCards dev version `e1869c48-bddb-4078-8ab1-13af50215c40` replaces the
form-like Help layout with compact chrome, separated message bubbles, a scrolling
transcript and pinned autosizing composer. Shared code owns presentation;
TableCards retains content/branding and view/auth integration. No schema,
dependency, backend deployment, provider-mode change or production publication.

Astra's bounded design/independent review led to three additional fixes:
unzoomed VisualViewport sizing with cleanup/zoom fallback, a jump control anchored
above multiline drafts, and heading focus on Help/contact transitions. The
submitted text is cleared immediately; delayed answers cannot erase newer typing.
Twenty-nine shared React/server tests and affected type/lint/build tasks pass,
including red/green viewport/focus and draft-continuity regressions. All **16**
final hosted checks pass: eight desktop Chromium and eight phone WebKit cases,
run in bounded per-profile commands. Coverage includes long answers/multiline
drafts, reading position, same-question retry, contact-back focus/continuity,
synthetic keyboard geometry/zoom cleanup, themes, registered navigation,
ratings, auth-route availability, mobile-nav clearance and 200% text.

Anonymous welcome/message captures in `.playwright-cli/modern-help-final-*.png`
were rendered and visually inspected. The expected signed-out auth-context 401
and pre-existing router hydration warning are not chat errors. Physical phone
keyboards and full assistive-technology conformance are not proved by emulation.
The earlier complete-check attempt exited 143 without an assertion failure;
the fresh final Node 24 `pnpm check` passes (3m1.7s), with all three integration
and both local browser suites fresh. A final fresh E2E type/lint pass covers the
closed-dialog test-locator correction; the initial combined hosted run was
interrupted and is not claimed complete. Live AI is still disabled pending caps,
and these mock/fixture UI checks do not establish model quality or email sending.

### Markdown and single-link answers — 2026-10-11

**Pass, development only:** assistant Markdown now renders as emphasis, ordered/
unordered lists, headings, code, blockquotes and horizontally contained GFM
tables. Customer messages remain literal. Raw HTML is discarded; Markdown images
do not fetch remote content. Only registered safe Business destinations use the
existing navigation renderer. Adjacent assistant tool/answer steps form one
display bubble, with unique links and no repeated standalone CTA labels; inline
references retain their text. SDK/stored history and feedback IDs remain intact.

Fresh **33** shared React/server and **120** TableCards unit tests pass, along
with affected type/lint/build, formatting and ownership checks. Red/green tests
cover Markdown semantics, unsafe HTML/URLs/media, both same-ID and new-ID tool
continuations, one clickable destination and exactly one browser-result resume.
All **10/10** final hosted desktop Chromium/phone WebKit checks pass, including
200% text, long tables/code, customer-chosen navigation, draft/retry continuity,
reading position and visual-viewport behavior. Synthetic transport fixtures do
not call a model or send email; live AI remains enabled and unchanged.
Anonymous captures `.playwright-cli/markdown-{desktop,phone}.png` and
`.playwright-cli/pricing-phone.png` were visually inspected. The expected
signed-out context 401 and existing router hydration warning are not chat errors.

TableCards dev version `2fbacc72-b368-4437-add1-90817ee46f4f`; no backend/private
provider/backoffice redeployment, schema/migration or production publication.
Exact Markdown dependencies are pinned in the root manifest/lockfile. The build
retains its large-chunk warning; initial JS is 759.12 kB/224.57 kB gzip, not a new
performance benchmark. Full live answer quality and physical-device keyboards
remain separate unverified boundaries.

### Hebrew rendering and language regression — 2026-10-11

**Layout pass, answer quality unresolved.** Andrew's Hebrew question
“איך זה עובד?” reproduced Arabic fragments and broken translations with the
real model. Shared UI now uses logical alignment, per-block predominant RTL
direction (including Latin-brand prefixes), automatic composer direction,
isolated links and LTR code. The phone/desktop captures were inspected.
34 shared assistant tests, five Business fixture tests, 120 TableCards tests,
affected type/lint/build/boundary checks and **12/12** hosted Chromium/WebKit
presentation checks pass, including mixed English, lists, Markdown safety,
duplicate links, 200% containment and existing chat continuity.

TableCards dev is `788753c4-f4fe-42db-8638-7bb4ab4ea5ae`; configuration revision
6 contains bot instructions v4 and basics/printing knowledge v2 with Hebrew
wording for existing facts. Mail, tools, events, KPI definitions and gateway
caps are preserved. No new table, migration, backend/provider/backoffice
publication, production change, expensive fallback or email send.

Prompt v2 switched to English. Later live samples improved, but a repeat with
v4 produced “ליצור ולחפור” and Chinese “宾客”; the Hebrew printing follow-up
mixed Arabic with invented card dimensions/export settings. Four isolated
sampling probes at 0.2/0.1 also included awkward or unsupported wording, so no
temperature change was shipped. These failures are **not fixed by RTL layout**.
Four saved Hebrew regressions bring the bank to 148, without changing the 120
held-out cases or adding test expectations to model knowledge.

The latest [offline run](../../support/evaluation-results/20261011-041405816-operator-mock.md)
exercises all 148 cases but establishes no accuracy. The
[live run](../../support/evaluation-results/20261011-041510521-operator-live.md)
selected all 148 cases; only 2/12 judge controls agreed, so the answer suite
**did not run**. Reported case `judge_error` values are calibration-blocked,
not 148 wrong model answers. Ten calibration model calls used 9,540 input and
8,328 output tokens, estimated $0.003294; the conservative run bound was
$1.5846 within the authorized $2. One parser failure was an `answer_quote`
containing reference text rather than the answer. Do not relax evidence checks
to manufacture a score. Next: repair the judge contract/calibrate, then compare
inexpensive multilingual candidates and rerun both saved suites; no language
quality, accuracy percentage or release verdict is established yet.

### Russian, Spanish and French spot checks — 2026-10-11

**Readable language does not establish reliable answers.** The unchanged capped
Qwen helper answered 12 natural questions in the actual anonymous development
chat: overview, printing, payment and a fresh-thread overview repeat per language.
All 12 responses were live (one helper HTTP request each, not necessarily one
model call), with no mock notice or error. Phone LTR captures were inspected.
UI/config/model versions remain those recorded above; no runtime, provider,
prompt, schema, deployment or email change was made.

Primary and independent Astra review compared the [actual replies and individual
verdicts](../../support/evaluation-results/20261011-062900-multilingual-browser.json)
against approved knowledge, not against the uncalibrated automated judge:

| Language | Same-language samples | Fully acceptable / borderline | Main failures                                                                                                                                  |
| -------- | --------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Russian  | 4/4                   | 1 acceptable, 0 borderline    | Invented real charges/card dimensions; repeat required registration and told the customer to load an internal skill.                           |
| Spanish  | 3/4                   | 0 acceptable, 1 borderline    | Printing appended Hebrew; payment invented live billing/cancellation; repeat said printing happens in a wastebasket.                           |
| French   | 4/4                   | 0 acceptable, 1 borderline    | Payment invented real charges; printing invented formats/settings and omitted the separate print-test PDF; repeat implied a direct-print path. |

Borderline overview replies were mostly usable, with terminology or sign-in
imprecision; they are not equivalent to the definite payment/printing failures.
Russian and French were generally comprehensible, while Spanish also had serious
word-choice mistakes. Fresh-thread repeats differed, so a single reasonable
reply would conceal variability. Four samples per language are **not** overall
accuracy estimates, full support-suite results or native-speaker certification.
Observed mean UI response times were 8.5/8.1/5.7 seconds (Russian/Spanish/French),
including network/tools/rendering; these are not performance benchmarks. Exact
provider cost and tokens were not available through this browser check.

Nine Business-owned tuning regressions now bring the saved bank to 157; the 120
held-out cases are unchanged and expected behavior is not runtime knowledge.
Six fixture tests, affected lint/type checks and the [full offline rerun](../../support/evaluation-results/20261011-062848185-operator-mock.md)
pass, but all 157 answers remain semantically unjudged. The earlier 2/12 judge
calibration failure still blocks automated live-suite claims. This request was a
diagnostic check, not an answer-quality fix or permission to change models.

## Validation and security

**Earlier baseline gate:** Node 24 `pnpm check` completed in 1m15.5s: format, lint, ownership
boundaries, typecheck, unit tests, integration tests, builds, production-bundle
assertions, secret scanning and local browser suites. The stages were also run
individually after an earlier combined runner exited 143. The final combined
rerun succeeds; the older interruption cause remains unproven. Matching Nx
cache outputs were reused where reported; integration/local browser suites
executed afresh. Markdown relative-target and whitespace checks also pass.

Critical negative/state tests pass for operator/environment/customer isolation,
capability-scoped anonymous history, private-note suppression, signed callback
validation, browser-result replay/membership denial, event authority and schemas,
exact/duplicate/stale Send, operator-edit preservation, early and out-of-order
delivery callbacks, later permanent failure, uncertain-send reconciliation and
bounded rejection retries. Backend tests do not prove real provider delivery.

**Pass:** live private PNG/JPEG conversion returns fresh bounded preview bytes;
unauthenticated input, invalid bytes and disabled text requests fail. Supported
file types, byte/pixel/count bounds and private preview denials have tests.
Originals have no serving fallback. Image rewriting reduces exposure; it is not
an antivirus verdict or an absolute guarantee against decoder vulnerabilities.
Actual inbound PNG/JPEG email attachment acceptance and private browser rendering
now pass after narrow download-host/CSP fixes; malformed and unsupported files
remain blocked. The live-email section below records the final proof.

### Live-path hardening — 2026-10-10

**Earlier attachment gate:** Node 24 `pnpm check` passes in 1m31s after the final attachment
CDN and image-only CSP fixes below. Matching Nx cache outputs are reused where reported; all three
backend integration suites and both local browser suites execute afresh. Root
checks 109 relative documentation targets in eight affected documents, all valid.
Shared presentation cleanup found no remaining Business copy/palette, debug code
or necessary behavior-preserving rewrite. No new repository rule was needed.

Two concrete integration defects were reproduced and fixed without schema/data
migration. Receipt and operator-reply tokens now normalize to lowercase before
both addressing and hashing. Deterministic regressions exercise the real
webhook-processing action with simulated provider content, uppercase addresses
and duplicate processing; both join the existing case. The service integration
suite passes 129 tests, with typecheck/lint/formatting also passing.

Qwen may return reasoning with a tool call; the installed SDK echoes it on the
next request, which the original strict private bridge rejected. A red/green
actual-SDK regression verifies bounded assistant-only echo acceptance and removal
before native inference, without altering tool correlation. The provider suite
passes 10 tests, typecheck, lint and dry-run build. Mock bindings prove adapter
compatibility, not actual model quality.

Both fixes are deployed to the development targets above. Live rechecks return
fresh private PNG/JPEG previews, 401 without authorization and 503 for disabled
text. An invalid PNG fixture was rejected; a newly encoded valid PNG passes.
No original fallback or paid inference was used.

The Node 24 full `pnpm check` rerun passes in 1m51.3s, including fresh integration
and local browser execution and reported matching cache reuse elsewhere. Hosted
backoffice 6/6 and helper 8/8 reruns also pass after the development backend push.
The final live-harness assertion tightening separately passes typecheck/lint and
format checks. Eighteen relative documentation targets resolve; no new UI/Business
scope or schema change was introduced.

The separate opt-in desktop/phone live helper suite is ready and type/lint checked.
Without explicit opt-in it refuses to load; with opt-in against current mock
mode its preflight fails before browser/model work. The two live cases remain
**unverified**, not passing or silently skipped. Ordinary hosted regression
explicitly excludes them. Provider caps/live helper remain pending; real mail
is verified separately below.

An independent Astra security/concurrency review found defects in stale draft
replacement, callback ordering, later send failure and attachment registration.
Scoped fixes and regressions were applied before final deployment. Shared code
retains generic contracts/permissions; TableCards supplies its skills, event/KPI
definitions, routes, content and synthetic cases as scoped data/local code.

## Provider and evaluation limits

### Shared behavior and quality-first comparison — 2026-10-11

Development configuration revision 7 uses TableCards-only bot guidance v5,
shared behavior v2 and basics/printing facts v3. The shared prompt has one general
customer-language instruction, not language-specific phrasing. All seven assigned
files fit the generic 10KB upfront bound (7,873 UTF-8 bytes; 9,158 with descriptors),
so normal answers need no paid skill-selection step. Larger corpora still load
assigned skills lazily. Permissions, exact operator Send, mail bindings and caps
are unchanged; no database schema or migration. Final independent review fixed
history trimming to drop complete old customer/tool turns and reserve the SDK's
system-message slot. Bounded history keeps the current question/continuation,
and incomplete model output fails closed.

Fresh final Node24 `pnpm check` passes (3m3s), and final deployed desktop
Chromium/phone WebKit helper smokes pass **2/2** (39.2s): printing guidance, registered
FAQ browser-tool continuation, live flags, explicit feedback and customer-chosen
navigation. These are integration checks, not a multilingual quality benchmark.

The repaired stronger GPT-OSS judge agreed with [20/24 controls](../../support/evaluation-results/20261011-070453003-operator-live.md),
then [22/24 controls](../../support/evaluation-results/20261011-070930664-operator-live.md).
The latest has one genuine false pass (a misleading Spanish printing word) and
one critical-category error (an invented personal allowance is correctly rejected
but mislabelled). Estimated calibration cost is $0.0184265 and $0.02107515,
respectively; neither run generated answer cases. Astra independently confirmed
the misses and recommended another judge rather than fitting known controls.
Kimi K2.6 and DeepSeek V4 Flash are isolated evaluation-only candidates; customer
routes reject them. The [Kimi control run](../../support/evaluation-results/20261011-072031350-operator-live.md)
could not obtain any provider grades (only two locally rejected blank controls
matched). A minimal private probe for each alternative and sanitized Worker
diagnostics both returned Cloudflare code **5035**, meaning the model requires
a [Workers Paid plan](https://developers.cloudflare.com/workers-ai/platform/errors/).
This was an API-judge access blocker, not a model accuracy result. No
subscription/credits were purchased and gateway caps were unchanged. Andrew
subsequently chose subscription-agent judging; its partial evidence follows.

Andrew's order is **quality, cost, speed**. Compare the same saved questions using
five dimension scores and critical failures, followed by measured estimated cost
per complete answer, questions/USD 1 and acceptable answers/USD 1. All answer
model/tool steps count; stronger judge/calibration spending is reported separately
and is not the runtime message price. No cache discount is assumed. Elapsed
sequential latency includes transport/test pacing and is not a production load
benchmark. No model winner or full-suite acceptance is claimed yet.

### Quality target, error diagnosis and current benchmarks — 2026-10-11

Andrew requested more than 90% good answers, preferably 95%, with quality before
cost and speed. The earlier **18/22 (81.8%)** Gemma result requires all five
dimensions to be adequate; it is not a measured one-in-five factual error rate.
Its four rejected answers include two factual mistakes and two missing useful
steps. A fresh independent Astra review of all 38 produced Gemma helper answers
gives **28/38 (73.7%)** rubric-adequate: 17/20 normal and 11/18 messy. It agrees
on **18/22** for the shared comparison subset, but changes which answers count
as adequate in the larger set. These are the same saved model answers, not new
inference. Earlier Luna grades and primary corrections remain unchanged; neither
AI reviewer is a human gold standard.

The [fresh blind audit](../../support/evaluation-results/20261011-100600-helper-blind-audit.json)
preserves all 38 score vectors, cited answer/reference IDs, classifications and
packet hashes. It finds **three definite factual errors**, three additional
materially unverified/imprecise answers, and four further usefulness/completion
failures. It reverses five earlier primary accept/reject judgments: accepts the
actionable tiny-print and wrong-Google-session answers, but rejects unsupported-
script export behavior, omitted professional copying eligibility, and asserted
inactive preview rules. The last case and some completeness judgments remain
explicitly ambiguous. A correct explanation need not repeat unrelated pricing,
support-email caveats or optional reminders. Mechanical provenance/citation and
count checks pass; they cannot establish semantic correctness. No multilingual
accuracy claim follows from this mostly English set.

Concrete original-answer evidence:

| Saved question                                    | Actual problem                                                                              | Classification                                                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Name, Table and Meal column mapping               | Says Meal cannot map to a card field, despite the optional short-marker field.              | Factual error; Meal can supply a short marker.                                                                           |
| AI failed, remaining balance fell from two to one | Says releasing a reserved unit explains a decreased balance.                                | Factual/causal error; release does not explain the decrease, and current personal state is unverified.                   |
| Where an Owner transfers control                  | Says the menu is unknown although supplied knowledge says Account → Team.                   | Useful guidance missing, not an invented fact.                                                                           |
| Exact print-shop paper stock compatibility        | Correctly denies a guarantee and recommends matching paper/margins, but omits a test print. | Correct core facts; whether the omission is material is a disputed usefulness judgment.                                  |
| Vietnamese works, Arabic does not                 | Says unsupported characters may display incorrectly during export.                          | Contradicts explicit pre-export failure for unsupported scripts. Earlier reviews missed this.                            |
| 1600×900 JPG rejected                             | Correct ratio/size facts, but final instruction ends “Try cropping your image to a”.        | Recorded `finishReason=length`, all 1,200 output tokens used; generation-budget failure, not proof of missing knowledge. |

The [captured answers and original judgments](../../support/evaluation-results/20261011-082236118-cheap-model-supervised-comparison.json)
contain exact questions, replies, usage and versioned provenance. The evaluator
already supplied all seven assigned knowledge files upfront; these failures do
not establish a retrieval/second-call problem. Its isolated runs omitted registered
browser capabilities/customer records, so they also do not prove deployed tool
behavior. Route/capability context should be covered in a separate matched runtime
test rather than counting absent integrations as poor model reasoning.

The judge also made both kinds of mistakes: an original GLM price-preview answer
was graded as an unrelated failed-credit answer; some correct paraphrases or offer
definitions were rejected; invented URLs and the unsupported-script export claim
were missed. Valid evidence IDs and 24/24 authored controls did not prevent semantic
errors on real answers. Keep factual correctness, useful completeness, language
and safety visible separately. Do not loosen a rubric simply to achieve 95% or
silently replace historical scores. Clear rubrics, blinded review and agreement
with human labels are recommended by [OpenAI's evaluation guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices).

Current research, checked 2026-10-11, provides candidates rather than a new live
model choice:

| Candidate and serving route          | AA Intelligence Index v4.3.2 | Example USD / 1,000 calls     | Example calls / USD 1 |
| ------------------------------------ | ---------------------------- | ----------------------------- | --------------------- |
| GLM-5.3-Flash, Cloudflare            | 42                           | $0.625                        | 1,600                 |
| GPT-6 Luna, OpenAI                   | 38, Max                      | $0.500                        | 2,000                 |
| DeepSeek V4.1 Flash, direct DeepSeek | 39, Max                      | $0.675 off-peak / $1.350 peak | 1,481 / 741           |
| Qwen3.8-27B, Cloudflare              | 34, xhigh                    | $2.725                        | 367                   |

Those independent benchmark scores are **not percentages of good answers**.
Sources: [GLM/Qwen comparison](https://artificialanalysis.ai/models/comparisons/glm-5-3-flash-vs-qwen3-8-27b),
[Luna](https://artificialanalysis.ai/models/gpt-6-luna),
[current DeepSeek](https://artificialanalysis.ai/models/deepseek-v4-1-flash).
Baseline overall scores for Gemma 26B, GLM 4.7 and original Qwen 30B are marked
estimated, not matched independent measurements; no measured improvement over
our exact hosted checkpoints follows from those estimates. The benchmarks use
substantial reasoning budgets and cannot be assumed under our 1,200-token cap.
They do not measure TableCards' product facts or establish Hebrew, Russian,
Spanish and French customer-answer accuracy.

All price examples assume **2,500 uncached input and 500 total billed output
tokens**, including any reasoning, in one call. They exclude plan fees, judge,
extra steps/retries and unreported usage, and are not measured TableCards prices.
Rates come from [Cloudflare](https://developers.cloudflare.com/workers-ai/platform/pricing/),
[OpenAI Luna](https://developers.openai.com/api/docs/models/gpt-6-luna) and
[DeepSeek](https://api-docs.deepseek.com/quick_start/pricing/). No cache hit is assumed.
DeepSeek peak periods are weekdays 01:00–04:00/06:00–10:00 UTC except Chinese
public holidays. Cloudflare lists the older July DeepSeek checkpoint, **not V4.1**.
GLM-5.3-Flash requires Workers Paid or prepaid AI Gateway credits; Luna/direct
DeepSeek require their provider API access/billing, which this research did not
verify or provision. Gemma 31B has better same-table vendor support/multilingual
results than 26B, but no native Cloudflare offering/price was found; see
[Google's model card](https://huggingface.co/google/gemma-4-26B-A4B).

Recommendation: clearer current-product versus future-offer facts, calibrated
case-specific judgments, and matched full helper/support and language runs. Keep
Gemma as the existing tested candidate; prioritize GLM-5.3-Flash if billing access
is authorized, then Luna as a cheap challenger. Repeated tuning on inspected
questions does not create new held-out evidence. Add fresh unseen realistic cases
for a convincing 95% claim and report uncertainty/role-language breakdowns. No
new live inference, model switch, instruction/configuration change, paid-plan
purchase, cap change or deployment occurred during this review.

### Context selection experiment preflight — 2026-10-11

The research recommendation is to test context changes before adopting another
workflow: [Anthropic's agent guidance](https://www.anthropic.com/engineering/building-effective-agents)
favors simple measured solutions; its [retrieval guidance](https://www.anthropic.com/engineering/contextual-retrieval)
notes that small knowledge sets can be supplied directly, while chunks can lose
important context. This is not proof that every small model handles our corpus
well. [OpenAI's accuracy guidance](https://developers.openai.com/api/docs/guides/optimizing-llm-accuracy)
supports diagnosing knowledge versus behavior failures and testing actual context
needs. Provider-specific caching claims cannot be transferred to our route.

The [existing plan](../../../../.agent/plans/261009-operator-work.md#risks-review-state-and-history)
now records a matched 24-question tuning/language pilot plus three seen failures:
full inline, compact inline, compact lazy loading and Jev-selected compact content.
Keep the same answer model/instructions/output bound; measure missed necessary
facts as well as final answers and count all calls. Preserve mandatory product
qualifications and review against full unchanged facts. This pilot is diagnostic,
not a 95% acceptance claim; full saved suites and fresh unseen cases remain required.

[Jev](https://developers.cloudflare.com/ai/models/typesafe/jev/) accepts typed
binary decisions and lists USD 0.042/million input tokens, zero output cost.
For illustration, 1,000 selector input tokens cost USD 0.000042, **in addition to**
the answer call; this is not measured TableCards usage. At this earlier preflight,
the pure generic contract had no provider/runtime integration. **13 selector tests and
the assistant library test/typecheck/lint/build targets pass**. All 24 pilot
requests validate offline: 19 helper, five support, all tuning, seven assigned
section descriptors each; native serialized payloads range from 7,118 to 7,264
UTF-8 bytes. These are byte measurements, not billed token counts or quality scores.
Fresh account reads confirm the unchanged $3/day/$30/month global caps and
**zero prepaid Gateway credits**. Third-party Jev requires those credits;
no live selector inference, comparison answers, model change, purchase, schema
change or deployment occurred in that preflight. Missing access is not a selector failure score.

**Subsequent authorized access/setup — 2026-10-11:** the minimum one-off top-up
completed: USD 10 credits, documented 5% fee (USD 10.50 before any tax), balance
read-back 1000 cents. Automatic top-ups remain zero/off. The dev gateway lacked
authentication and retained native postpaid billing; enabling authenticated
`unified` billing changed only those two settings, preserving both global caps,
logging/caching/rate limits. No Workers Paid subscription or production change.
Native Gemma transport recovered. Jev's extra binding result envelope required a
tested bridge normalization; strict inner decision validation remains. The live
Meal probe selects import (0.72), with 1,735 input/130 output tokens; it proves
access and one selection, not retrieval accuracy or answer quality.

The [Business-owned experiment](../../support/knowledge-experiment.ts) adds four
multi-topic/follow-up probes alongside the 24 pilot questions and three already-
seen errors. All 31 are tuning/diagnostic; original held-out suites remain intact.
Offline captures 124 rows with zero calls/errors. The live one-question printing
smoke produces four nonempty answers, five answer calls plus one selector, and
USD 0.00130716 measured token-based estimate. All four mention the separate
print-test PDF and Actual Size/100%; this is primary inspection, not a blind
quality score. The wider capture has an approximately USD 1.088 conservative
bound (existing USD 2 maximum), with retries/cache disabled at the runner and
3.5-second request-start pacing for the gateway rate limit. Reported end-to-end
latency includes pacing, not pure model speed. Subsequent results follow;
no customer model/knowledge switch.

**Completed context diagnostics — 2026-10-11 16:41 UTC:**
the [31-case capture](../../support/evaluation-results/20261011-161135256-knowledge-live.json)
contains 54 nonempty answers and 70 answer errors. Eight requests exhausted
the 25-second deadline; the external driver's overly aggressive circuit then
fast-failed 62 answer attempts and 15 selectors without making further requests.
The original 170 driver entries are therefore **not 170 paid network calls**.
The exact original actual-network count was not separately instrumented.
Known completed-call estimate is USD 0.021601518; missing usage prevents a full
cost total. Two Hebrew answers ended at the 1,200-token bound. Russian/Spanish/
French completions did not succeed in this capture and remain unverified.

Fresh Luna control review matches all **22 semantic controls**, with exact packet/
ID/evidence validation; the earlier incomplete 16-control file is preserved.
This is not API calibration or human ground truth. All 54 nonempty answers have
[validated blinded Luna reviews](../../support/evaluation-results/20261011-161135256-context-review-validation.json):
**40/54** meet the strict rubric and deterministic checks. One grade's reasons
referred to the wrong question; a separately saved recheck corrects only those
reasons, retaining the original and scores. Astra independently checked 12 weak
answers plus three passes, accepting **5/15** and finding no critical violations
in that selected subset. It disagrees with two rejected Hebrew pricing answers:
both adequately explain current nonpayment without requiring particular wording.
These are selected-answer diagnostic counts, not overall bot accuracy.

The [fact-dependency audit](../../support/evaluation-results/20261011-161135256-context-knowledge-audit.json)
corrects failed-unit metadata to require access plus designs, preserving the
capture. Among 16 completed Jev decisions, five conservatively fell back; 15
local circuit-blocked selectors are not Jev quality failures. Three nonempty
answers lack a manually necessary prepared/loaded section: lazy missing-project
advice lacks import/Archived facts; Jev Hebrew overview lacks import; lazy Hebrew
pricing lacks basics. Prepared context on failed calls does not prove model receipt.

**Seven-case follow-up:** adjusted only the external circuit so individual
timeouts do not poison subsequent requests. The [new capture](../../support/evaluation-results/20261011-163454683-knowledge-live.json)
and [fixed-metadata transport audit](../../support/evaluation-results/20261011-163454683-knowledge-transport.json)
record **44 actual network calls**, 43 HTTP 200 responses and one deadline failure,
with zero locally blocked calls. There are **26 nonempty replies / 28 attempts**:
one compact-inline failed-unit reply has no text at exactly 1,200 output tokens,
and one lazy unsupported-script attempt times out. Known estimate is USD
0.012180224; the timed-out request's usage is unknown. Five of seven valid Jev
decisions fall back to all compact knowledge; no invalid/provider-error selector.

All 26 replies have [validated Luna scorecards](../../support/evaluation-results/20261011-163454683-context-review-validation.json).
Raw strict acceptance is **6/26 nonempty** (6/28 including capture failures),
with two reported material factual contradictions. This deliberately difficult,
already-seen set is not general accuracy; many rejections are omitted review/
test-print/account steps beyond the literal customer question. The Meal→Marker
mapping is correct in all four replies, yet Luna rejects three for omitting
“review” and accepts the fourth despite the same omission. This inconsistency
prevents treating raw grades as a settled useful-answer rate. Originals remain.

Primary inspection confirms real issues, not just rubric strictness:

- Full knowledge: “even if the generation fails, that unit is still accounted
  for in your balance” contradicts automatic release.
- Jev/full fallback: a reported drop “indicates the unit wasn't successfully
  released” invents a diagnosis without verified account evidence.
- Lazy multi-topic reply calls Event Pass “a one-time $5 charge” without current
  no-charge qualification. It did not load mandatory preview facts.
- Compact Arabic advice recommends checking how final cards will appear without
  explaining the explicit pre-export unsupported-script error.
- Jev support extends a **bot** restriction to “our support team.” The compact
  wording dropped that qualifier; human powers cannot be inferred either way.

The five questions with complete usage/nonempty answers in every arm permit
this **survivor-selected cost comparison**, including selector and all tool steps:

| Strategy       | Mean estimated inference USD/question | Estimated questions / inference USD 1 | Observed median end-to-end |
| -------------- | ------------------------------------- | ------------------------------------- | -------------------------- |
| Full inline    | 0.00039454                            | 2,535                                 | 12.5s                      |
| Compact inline | 0.00038078                            | 2,626                                 | 11.7s                      |
| Compact lazy   | 0.00045294                            | 2,208                                 | 12.3s                      |
| Jev + compact  | 0.00042421                            | 2,357                                 | 13.2s                      |

**Complete blinded Astra follow-up review — 2026-10-11 18:19 UTC:** Andrew
requested useful-answer percentages, not a Luna-specific grading goal. Astra
graded all 26 nonempty answers at extra-high reasoning against the same full
approved facts, without strategy labels or earlier grades. All four batches
validate with zero invalid/unsure grades; primary Codex checked the actual replies
and failure reasons. Including both capture failures, acceptance is **6/7 (85.7%)
full upfront, 4/7 (57.1%) compact upfront, 4/7 (57.1%) compact tool-loaded, and
5/7 (71.4%) Jev + compact**. Seven is per strategy: five helper and two support,
not seven per bot. Optional reminders do not cause otherwise adequate answers
to fail. The full-unit wording is ambiguous/incomplete, not a definite critical
contradiction; only the explicit current $5 charge is a critical factual finding.
Two compact-upfront rejections are narrower reference-coverage uncertainties
(Arabic-specific support and Planner Pro card capacity), not proven falsehoods.
This tiny already-seen English diagnostic cannot establish 90–95% accuracy or a
winner. The saved bank is 84 helper/73 support; full live strategy comparison and
fresh unseen cases remain required. No new paid inference or runtime change.
[Percentages, every case, five KPIs and raw judgments](../../support/evaluation-results/20261011-163454683-context-astra-full.md).

No winner follows from five questions. Token-based prices exclude purchase fees,
Worker/other services and unknown failed usage; output lengths differ and pacing
affects latency. Compact input tokens fell only about 3.5% in the follow-up,
not the earlier 11.6% byte reduction. Jev is not yet a demonstrated quality or
cost improvement. All captured answers remain diagnostic/tuning; full saved
roles/languages and fresh unseen cases are required before a 90–95% claim.

**Broad three-model/four-context run — started 2026-10-11 18:40 UTC:** Andrew
authorized all saved helper/support questions and fresh cases, paced for provider
limits. Frozen 157 saved + 12 fresh cases give 169 questions (90 helper/79 support)
across Qwen3 30B, Gemma4 26B and GLM 4.7 Flash: 2,028 planned answer attempts.
All four context strategies retain provider-default generation and the same
1,200-output-token ceiling. A shared queue spaces actual starts by 3.5 seconds;
network allowance is 25 seconds after admission, with finite multi-step deadlines.
The pilot's lazy 25-second **total** deadline is not repeated. Unknown paid calls
and in-flight reservations count toward the additional $2 run bound; no retries,
cap changes, purchase, subscription or customer configuration change.

At **19:16 UTC**, Andrew reported increasing the Gateway rate limit to 200/minute
and authorized faster evaluation pacing. This same live process now admits starts
400 milliseconds apart, after a non-billable Node 24 pacing/resume check and exact
guard readback. No restart, duplicate requests or discarded captures; concurrency
remains three and every spending/call/deadline guard is unchanged. Localhost
debugging was closed after the adjustment. The management setting was not
independently read back. [Pacing phase evidence](../../support/evaluation-results/knowledge-matrix-2026-10-11T184003-864Z-pacing-change.json)
keeps the two pacing phases explicit: pooled workflow latency includes queue wait
and must not be presented as pure model inference speed.

[Live progress](../../support/evaluation-results/knowledge-matrix-2026-10-11T184003-864Z-progress.json)
records actual calls, capture coverage and failure metadata. Separate per-workflow
captures and full/compact snapshots preserve exact outputs and versions. Mixed
opaque packets conceal candidate/context/price labels; two Astra extra-high
reviewers grade them against the same complete approved facts. Astra's
[control agreement](../../support/evaluation-results/knowledge-matrix-2026-10-11T184003-864Z-controls-agreement.json)
matches all 22 authored nonempty controls; both blank inputs are rejected by code.
This is supervised AI evidence, not a perfect judge or API calibration.

The primary review of the first two batches confirms concrete invitation-channel,
Google-identity, fabricated support-URL and copied-project-limit mistakes. It also
distinguishes smaller omissions (e.g. a correct manual invitation-link explanation
missing Google sign-in) from false claims. One privacy finding inferred exclusion
of an image provider from contextual wording more strongly than the wording
explicitly establishes; that taxonomy merits cross-check, even though the same
answer separately falsely says the optional inspiration image is not used.
All original grades remain unchanged. Semantic adequacy, capture completeness,
timeouts/provider errors, ungraded outputs and unattempted coverage stay separate.
An additional read-only 20-item challenge audit confirms wrong invitation
identity/channel, unsupported email login, denying PNG uploads and promising
cross-browser draft protection. Some critical labels need more careful wording:
unregistered support destinations are unsupported, not independently proved
invalid; categorical provider-privacy assurances exceed the narrower approved
guest-list rule; incidental false preset-scope details need severity distinguished
from their unrelated main answer. Supported pass examples include direct list
import, ordinary sign-in draft continuity with caveats, cautious file-size
diagnosis and independent workspace selection per browser tab. This targeted
audit is not a judge-accuracy estimate and does not overwrite any grade.
**Interruption detected 2026-10-11 20:06 UTC:** the capture and summary-watcher
processes are absent and their execution sessions are no longer available. Exact
exit cause is unknown. The last progress checkpoint at 19:46 UTC retains 868 of
2,028 planned attempts (217 immutable workflow captures); no final manifest,
budget stop or HTTP 429 is recorded. Root validated the final existing blind
packet `030` and refreshed the summary: 744 graded replies, zero invalid/unsure
grades. Astra polling is stopped until checkpoint recovery produces new packets.
Interrupted/unpersisted requests have unknown costs and cannot be silently
treated as free or unstarted. Existing grade/capture files remain unchanged;
recovery investigation has made no additional provider calls.

**Recovery started 2026-10-11 21:02 UTC:** frozen configuration/case/order/capture
identities pass. The [new capture](../../support/evaluation-results/knowledge-matrix-2026-10-11T210245-209Z-progress.json)
preserves the original 217 workflows and schedules 287 untouched workflows at
400-ms shared pacing/eight awaited workers. Three possibly interrupted GLM
support workflows (215/218/219, 12 attempts) remain interrupted, not retried.
Original measured/unknown/former-in-flight amounts plus USD 0.080613 interruption
headroom count toward the same USD 2 ceiling (initial combined bound USD
0.600331); up to 24 unrecorded starts count toward the same 4,000-call maximum
without being claimed as observed starts. New sanitized fsynced reservation and
completion journals, immutable claims/captures and atomic progress protect
accounting. A detached launch produced no new capture and did not persist;
the foreground session is monitored and producing answers. Both fresh Astra
reviewers match all 22 authored nonempty controls and both blanks reject;
this is not proof of a perfect judge. Customer configuration stays unchanged.

The [independent 24-answer challenge audit](../../support/evaluation-results/knowledge-matrix-2026-10-11T210245-209Z-primary-challenge-audit.json)
balances 8 passes, 8 noncritical and 8 critical rejections, 12 per role, including
9 multilingual answers. It has no pass/fail reversals or missed critical errors
among sampled passes; five dimension-score differences and one critical-presence
downgrade remain explicit. This selected audit is not a judge-accuracy estimate.
Primary Codex inspected the four flagged cases and two sampled passes against
the complete saved answers and source facts. The invitation-email and real-charge
claims are definite contradictions. The `support@tablecards.com` mailbox and
extra public URLs are unverified by these references, not proved nonexistent;
their critical severity should not be overstated. The conditional iPad
Share → Save to Files answer is useful but fails the frozen authored requirement
to ask about visible state, illustrating an expectation-design issue rather
than wrong advice. All raw grades remain unchanged; these distinctions must
accompany the final strict percentages.

**Broad comparison finished — 2026-10-11 (capture completed 21:29 UTC):**
All 504 recoverable workflows finish: **2,016 captured attempts**, 12 earlier
interrupted attempts, zero unstarted. All **1,771 nonempty answers** have strictly
validated blind Astra scorecards; zero pending, invalid or unsure grades. The
245 empty captures are not graded as good answers. The manifest deliberately
keeps `completeCapture: false` for the interrupted coverage, alongside
`allRecoverableWorkflowsCaptured: true`; no completed or possibly interrupted
paid work was repeated. Both review agents and the capture/summary processes
finish. [Full comparison and cost/score details](../../support/evaluation-results/knowledge-matrix-2026-10-11T210245-209Z-summary.md)
and [machine-readable results](../../support/evaluation-results/knowledge-matrix-2026-10-11T210245-209Z-summary.json)
retain original/resumed provenance and every denominator.

These are **strict delivered-answer pass rates**, not estimated everyday customer
accuracy. A pass needs all five rubric dimensions plus deterministic completion/
tool checks. Each cell uses all 169 planned questions; the three interrupted GLM
questions count as unavailable in each strategy, not as observed wrong answers.

| Knowledge strategy | Qwen3 30B | Gemma4 26B | GLM 4.7 Flash |
| --- | --- | --- | --- |
| Full upfront | 79/169 (46.7%) | 139/169 (82.2%) | 66/169 (39.1%) |
| Compact upfront | 76/169 (45.0%) | 142/169 (84.0%) | 61/169 (36.1%) |
| Compact via tools | 63/169 (37.3%) | 121/169 (71.6%) | 42/169 (24.9%) |
| Jev + compact | 77/169 (45.6%) | 142/169 (84.0%) | 62/169 (36.7%) |

**No candidate meets the 90–95% target.** Gemma is clearly the stronger candidate
on this bank, but compact versus full versus Jev differences do not establish a
stable context winner. Compact and Jev both pass 76/90 helper and 66/79 support
questions. Full passes 75/90 helper and 64/79 support. Among nonempty replies,
Gemma compact is 142/164 (86.6%) rubric-adequate, versus full 140/165 (84.8%) and
Jev 142/166 (85.5%); delivery failures cannot be excluded from the headline rates.
Compact's 27 nonpasses comprise five empty captures and 22 rubric rejections,
including three judge-flagged grounding-zero answers. That is **not** evidence
that 27 answers gave seriously wrong advice: some misses are omitted required
details, uncertain claims or a test expectation that needs revision.

Language content still needs attention. Gemma full → compact → Jev pass counts:
Russian 3/5 → 4/5 → 3/5; Spanish 5/5 → 2/5 → 4/5; French 5/5 → 5/5 → 5/5;
Hebrew 4/6 → 3/6 → 4/6. Every nonempty Gemma full/compact reply receives 2/2
for language, so factual completeness/delivery, not necessarily bad translation,
explains those strict failures. These tiny per-language sets are not broad fluency
certification. The 12 fresh questions give full 12/12, compact 10/12 (two empty),
Jev 11/12; they remain too small and nonrepresentative for a 95% claim. Seen saved
`held_out` labels are historical. The all-12-complete intersection has just 50
cases and is survivor-selected; its better percentages are not the headline.

**Cost and reliability:** 3,026 observed network starts, zero HTTP 429/local
refusals, 164 timeouts and 10 provider errors. GLM accounts for 156 timeouts and
all 10 errors; Gemma has eight timeouts; Qwen/Jev have none. These are outcomes
under the frozen 25-second/1,200-output-token limits, not proof GLM is intrinsically
unusable under other settings. Recorded inference estimate is USD 0.691337;
unknown failed/interrupted calls retain USD 0.523401 conservative headroom,
including up to 24 unrecorded starts. No in-flight reserve remains. Combined
bound USD 1.214738 stays below the unchanged USD 2 ceiling; the exact bill is
unknown. No retries, new purchase, cap increase or model fallback occurred.

Fully costed, normally completed Gemma replies average USD 0.0004147 full,
0.0004041 compact and 0.0004181 Jev (about 2,411/2,474/2,392 responses per
inference dollar). These estimates include selector/tool steps when applicable;
failed/unknown calls are excluded, **not free**, and subscription judging and
service/purchase fees are separate. Observed mean end-to-end full/compact/Jev
latencies are 10.8/10.2/11.8 seconds, including the disclosed pacing phases, not
pure inference benchmarks. Jev falls back to all compact knowledge in 79/169
Gemma cases; across all captured workflows, 228 uncertain and nine empty
selections cause fallback. It does not improve the headline score or demonstrate
a price advantage here. Tool-loaded knowledge is worse for every tested model.

**Primary-checked examples, not just judge labels:**

- Gemma compact, declining AI allowance: “the system still releases the reserved
  unit, which is why your remaining count decreased.” Release cannot explain
  consumption. Explain automatic release, then acknowledge that this customer's
  discrepancy cannot be diagnosed without verified account evidence.
- Gemma compact, zero allowance: “it means all available batches ... have been
  used”; missing private projects: “Your projects haven't been deleted.” Both
  are overconfident claims about an unverified customer's state, rather than
  established account diagnoses. Suggest Account/workspace checks without that
  certainty. Primary inspection confirms the uncertainty boundary, not proof
  that the projects actually were deleted or the balance was different.
- Gemma full, oversized image: recommends “1960 x 1120” to get below two
  megapixels. That is 2,195,200 pixels and would still fail; 1750 × 1000 is a
  valid 7:4 example within the documented limits. The original diagnosis of
  2100 × 1200 exceeding the cap was correct; the proposed fix was not.
- Gemma full, Russian print size: correct 100%/Actual Size advice fails because
  it omits the expected separate print-test PDF. This is a smaller completeness
  issue, not false scaling advice. The iPad expectation-design dispute above
  remains explicit; raw grades are never silently revised to reach a target.

**Recommendation:** continue with Gemma as the improvement candidate and keep
knowledge upfront; a selector or extra tool round does not earn its complexity
on this small knowledge base. Preserve full knowledge while clarifying current
preview versus launch offers, separating generic facts from unverified account
state, and making numeric constraints deterministic where practical. Re-evaluate
fixes and fresh multilingual cases before claiming readiness; a few percentage
points or small token savings do not outweigh answer quality. This is a proposal,
not a customer model/configuration change. The regression skill kept versions,
controls and failure coverage fixed. The two 22-control checks and selected
24-answer audit strengthen confidence in judging, not establish human ground
truth or API-judge calibration. All **115 operator tests**, affected typecheck,
lint, formatting and diff checks pass. Production and the current Qwen/full
bot remain untouched; no schema or deployment change.

**Next separate variable:** Astra recommends a paired generation-control test,
provider default versus documented Gemma `enable_thinking: false`, fixed compact
knowledge/instructions, seven cases × three repetitions × two modes (42 calls),
1,200 output tokens, 25 seconds and zero retries; conservative bound USD 0.152746
inside the existing combined USD 2 allowance. The bridge previously discarded
reasoning-token details and the SDK supplied zero when absent: historical zero
fields are **not proof of no reasoning**. Numeric measured details are now
preserved and missing counts remain unknown to this experiment; no reasoning text
is saved. Hidden thinking consuming the allowance is a hypothesis, not a diagnosis.
The [official Cloudflare example](https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/)
supports the disabled setting, but inspected docs do not establish its default.
The new private route is separately gated; customer configuration stays unchanged.
Provider version `259c781d-6933-487a-84e1-8ecf1f295216` is development-only.
Two new regressions first failed, then all **52 provider tests**, type/lint and
dry-run build pass. No BFF/UI publication, schema/migration or cap change.

**Completed generation comparison — 2026-10-11 17:25 UTC:** the
[42-call report](../../support/evaluation-results/generation-control-2026-10-11T171036-602Z.md)
keeps fixed compact v1 knowledge and pairs seven seen questions × three repeats.
All 42 actual requests returned HTTP 200, with 41 complete nonempty replies and
one default length-limited response; zero deadlines/local blocks/retries.
Total estimated inference USD 0.0141868 includes every attempt. Default versus
explicit thinking disabled averages USD 0.00041247 versus 0.00026309 per attempt
(2,424 versus 3,801 attempts/inference dollar), with 12.304s versus 2.711s observed
medians. Reported reasoning counts are absent in both arms; do not infer exact
internal reasoning or assume lower cost establishes higher quality.

All 41 complete answers have validated Luna grades: 13 strict passes. Two copied
batch IDs required separately saved rechecks; one recheck also changes a credit
answer's semantic score. Astra independently reviewed 17 selected disputes,
accepted six and reversed seven pass/fail judgments. It disputes all five raw
critical labels, while still finding real usefulness, grounding and clarity
problems. Correct no-move/mapping/printing answers were rejected for extra tips;
contradictory workspace instructions were accepted. Missing Meal→Marker advice,
ambiguous released-credit accounting, unverified human support restrictions and
current-preview fee wording remain important bot weaknesses. The linked report
shows actual questions/replies, five KPIs, exact provenance and each disagreement.
No blended overall accuracy or 90–95% claim follows from this selected repeated set.

Compact **v2** separately restores “support bot” and marks distinct experimental
versions (6,967 UTF-8 bytes). The paired v1 snapshot is untouched. A new actor
regression first fails, then all **19 Business tests**, type/lint pass; all **90
CLI tests**, affected provider/CLI builds, lint/type and boundary checks pass.
The [157-case compact-v2 offline rerun](../../support/evaluation-results/20261011-173133407-operator-mock.md)
loads all saved helper/support fixtures with zero paid calls/errors; all answers
remain semantically unjudged, not a quality pass.
Customer model/full knowledge, approvals, schema and production are unchanged;
no extra purchase, subscription, cap change or implementation push. Next proof
needs consistent essential/optional grading and full saved roles/languages plus
fresh unseen questions, not more repetitions of these seven.

### Blinded subscription-agent results — 2026-10-11

Luna subscription agents graded **179 real nonempty answers** in ten bounded,
model-blinded batches. Original grades, primary Codex AI inspections and a
separate four-answer recheck are retained. Controls reached 24/24 after one
citation-format repair, but actual grading still made mistakes: one batch mixed
up question IDs, and both missed facts and overly harsh rejections needed correction.
This is supervised AI evidence, **not human ground truth or calibrated API scoring**.

All three candidates answered the same **22** selected helper questions:

| Model         | Original Luna acceptable | After primary cross-check | Estimated USD/message | Questions/USD 1 | Reviewed acceptable/USD 1 |
| ------------- | ------------------------ | ------------------------- | --------------------- | --------------- | ------------------------- |
| Qwen 3 30B    | 8/22                     | 13/22 (59.1%)             | $0.0002152            | 4,647           | 2,746                     |
| Gemma 4 26B   | 17/22                    | 18/22 (81.8%)             | $0.0003453            | 2,896           | 2,370                     |
| GLM 4.7 Flash | 15/22                    | 16/22 (72.7%)             | $0.0003816            | 2,620           | 1,906                     |

Each acceptable answer needs all five adequate scores, no critical failure and
passing deterministic checks. This is a small, survivor-selected normal/messy
sample, not general accuracy. All reported answer steps count; subscription
judge cost is unmeasured and excluded. Failed-request cost is unknown. Timing
includes test pacing and cannot establish a native model-speed ranking.
Gemma is the leading candidate for further quality tests, **not a selected live replacement**.

The full 40-selected helper capture yields are separately 18/40, 29/40 and
16/40 after supervision; GLM had 17 unavailable requests and one blank answer.
Qwen support is 18/60 raw and 15/60 supervised, including one provider failure;
Gemma/GLM support was not reached. Typical semantic failures include invented
links/UI controls, wrong failed-credit explanations and omitted diagnostic steps.
The [full report](../../support/evaluation-results/20261011-082236118-cheap-model-supervised-comparison.md)
and [JSON](../../support/evaluation-results/20261011-082236118-cheap-model-supervised-comparison.json)
retain five KPIs, every selected failure/unrun range, exact grades and source hashes.

All three final chunks failed 20/20 requests. A bounded
[diagnostic](../../support/evaluation-results/20261011-081900-provider-availability.json)
observed native `AiError` 4006; free-allocation exhaustion is inferred, not
independently verified account analytics. Public Cloudflare documentation lists
daily exhaustion as 3036, so no exact-code match or $3-cap-hit claim is made.
Collection stopped without retries, cap changes or a purchase. Full multilingual,
cross-model support and compact-knowledge quality tests remain unverified;
compact content's 123 fact checks/11.6% byte reduction are not answer-quality proof.
No model/configuration/runtime/deployment change follows from this comparison.

| Item                                            | State / consequence                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resend send/receive, domain and signed webhooks | **Live development verified:** email/website intake, exact operator reply, private PNG/JPEG browser previews, signed callbacks, duplicate/replay denial, survey and reopening pass. Rotate temporary key after setup.                                                                                                                                                 |
| Cloudflare setup credential                     | **Requires rotation:** exposed in tool output; Andrew later explicitly authorized temporary dev DNS/gateway setup use. Those isolated changes are verified, setup sessions cleared the token, and no repository file contains it.                                                                                                                                     |
| Live text and provider caps                     | **Caps verified; native access recovered:** global $3/day and $30/month remain unchanged. Authorized one-off prepaid credits and authenticated unified routing restore native Gemma/Jev access; the completed 42-call generation diagnostic has zero HTTP failures. Native alerts remain unconfigured.                                                            |
| Model quality and tool compatibility            | **Integration passes; quality target unmet:** broad 169-question comparison is complete for all recoverable workflows. Gemma compact/Jev each pass 142/169 (84.0%); no candidate meets 90–95%. Five-language samples are small; current Qwen/full configuration is unchanged. |
| Regression evaluation workflow                  | **Broad supervised evidence complete:** 2,016 captures, 12 explicitly interrupted attempts, 1,771 validated blind Astra grades, zero pending/invalid/unsure. Two 22-control checks and selected independent audits retain judge caveats. Earlier originals/rechecks remain; no human-ground-truth/API-calibration claim or customer model switch. |

The [offline report](../../support/evaluation-results/20261009-201207961-operator-mock.md)
records 122 passing and 22 failing lexical comparisons, zero evaluator errors and
zero provider cost. This is a mock-run diagnostic, **not a passing live model
score**. The isolated evaluator exercises assigned knowledge loading, not the
complete live account/browser/tool integration. Intentional future live runs have
a separate $2 bound and must use the verified capped route.

### Bounded real email transport — 2026-10-10

Created `tablecards.tofler.app` with sending/receiving enabled and tracking off,
and one enabled signed development webhook at the BFF development callback.
Secret installation/read-back passed without repository or tool-output exposure.
One transport diagnostic from `onboarding@resend.dev` reached Andrew's connected
Gmail **INBOX**, with actual content, passing mail authentication and Resend
`delivered` status. Two identical idempotent requests produced one provider ID
and one Gmail message. Actual sent/delivered callbacks reached BFF; replay kept
one delivered receipt and unsigned callback intake returned HTTP 403.

These diagnostic receipts are correctly unmatched, not operator-approved support
deliveries. Forty-four focused mail/transport/HTTP/workflow tests pass. After
Andrew's renewed temporary setup authorization, all five domain DNS records were
added and exact authoritative/public resolver matches pass; root MX is unchanged.
Resend's asynchronous verification subsequently passed at 16:37 UTC. Exact
provider-returned records and setup evidence are in the existing
[provider runbook](../../../../docs/operations/provider-accounts-and-secrets.md#provisioning-and-bounded-transport-evidence--2026-10-10).

No code/schema migration, redeployment, production setting or paid upgrade was
needed for provisioning. Mail mode is now live with exact revision-3 branded
bindings; old mock rows are not resent, text remains disabled. Actual Gmail
intake created one email-only conversation with no inferred account/user
authority. The fixed receipt reached Gmail, with matched signed delivery callbacks.
Attachment smoke exposed a CDN-host allowlist mismatch; files were safely blocked.
The exact HTTPS CDN-host fix preserves redirect denial, bounded private retrieval
and no original fallback. Forty-six targeted tests/type/lint pass; BFF development
was updated at 16:45 UTC without a schema migration. Actual regenerated PNG/JPEG
previews pass; unauthenticated/wrong-environment reads are denied. A correlated
customer follow-up preserves edits and conflicts the old pending Send ID.
Fresh exact public operator Send yields one delivered Gmail reply; duplicate Send
conflicts with no second delivery. Two survey GETs save no answer; explicit POST
saves feedback without reopening. A later Gmail reply reopens the same case;
malformed PNG and unsupported TXT remain blocked. Actual signed inbound replay
retains one receipt and unchanged customer-message counts. One actual browser
contact submission uses the supported explicit test login for Andrew's existing
verified development user/account, returns HTTP 200 and an honest queued-email
confirmation, then delivers the fixed receipt to Gmail. It links only the verified
current user/account; the email-only case remains separate. No signup exception,
email-based identity merge, project/account edit or automatic substantive reply.
Final private-preview browser inspection exposed an image-only CSP defect: the
authenticated preview bytes were correct, but `img-src` blocked their blob URLs.
The narrow policy fix permits `blob:` only in `img-src`; scripts/connect policy
and all original-file restrictions stay unchanged. Red/green regression and six
fresh affected production-delivery/backoffice test/type/lint tasks pass.
On final backoffice dev version `4e369153-e9c9-4580-b0e1-2231aaa92696`, actual
JPEG 1050×600 and PNG 32×32 render with zero CSP/preview errors, original links,
non-blob image requests or mutation requests. **The full real development email
acceptance gate passes**, not merely its diagnostic or automatic receipt.

### Earlier lexical evaluation audit — 2026-10-10

Andrew requested real question quality and bot performance. A bounded independent
review and direct execution of the then-current scorer found a useful authored question
bank but a material scoring gap. There are 144 distinct single-turn prompts:
72 per role, each with 12 tuning and 60 held-out cases (20 ordinary, 20 messy,
20 adversarial). Examples include tiny printed cards with confused printer
settings, uncertain AI allowance after failure, conflicting artwork dimensions,
multi-intent feedback and requests to bypass operator Send. Two prompts are
French; otherwise English. They are synthetic, not observed customer outcomes.
Reference facts and expected behavior are withheld from model inputs.

At that audit, only 22 cases required a positive phrase; the other 122 checked only absence of
four exact forbidden phrases and write-tool names. No case requires skill/tool
selection. `expectedBehavior` was not scored. Executing the former implementation
of the [comparator](../../../../tools/bff-operator/src/operatorEvaluation.ts) against
controlled responses reproduces:

| Calibration response                                   | Actual comparison result                          |
| ------------------------------------------------------ | ------------------------------------------------- |
| Empty answer, no tools                                 | 122/144 pass                                      |
| Irrelevant “Bananas are yellow.”                       | 122/144 pass                                      |
| Paraphrased claims of refund, deletion and sending     | 122/144 pass                                      |
| Studio supports “5 members total, including the owner” | Correct answer fails the literal “five” check     |
| Five seats plus owner means six people                 | Incorrect answer passes that same check           |
| Monthly batches roll over forever                      | Incorrect answer passes the rollover case         |
| Reply sent and case resolved without operator review   | Unsafe claim passes the relevant adversarial case |

The [fresh offline report](../../support/evaluation-results/20261010-035119022-operator-mock.md)
again completes all 144 cases: 122 lexical passes, 22 failures, zero evaluator
errors and no paid calls. **84.7% is not model accuracy**; an empty answer earns
that same result. Fresh uncached targeted suites pass 58 tests (36 operator CLI,
3 Business fixtures, 19 shared assistant), proving covered execution contracts,
not scorer calibration or live answer quality.

Before a useful live performance report, the scorer needs substantive per-case
criteria and calibrated positive/negative controls, reasonable wording variants,
and separate pending qualitative judgments. Saved synthetic outputs/tool traces,
configuration/knowledge/case versions and latency/token usage are also needed for
review; current reports omit them. The isolated runner supplies no conversation
history, real customer facts or browser execution. Those remain separate
integration checks. No code/schema/provider configuration was changed in this
audit; live model accuracy, latency and actual cost remain unmeasured.

### Semantic judge replacement — 2026-10-10

The shared runner now uses an isolated cheap LLM judge with four 0/1/2 dimensions:
relevance/completeness, factual grounding, authority/privacy and usable clarity.
All must be adequate; deterministic failures, critical violations, missing
references and invalid grades cannot pass. Twelve Business-owned positive/negative
calibration controls are separate from the 144 question cases; disagreement or
error blocks live answer-suite execution. Actual answers, trusted references,
versions/prompt hash, tool traces, reasons, latency and combined answer/judge costs
are preserved. Fresh affected test/typecheck/lint tasks and CLI build pass.
The [v2 offline report](../../support/evaluation-results/20261010-160524429-operator-mock.md)
completes all 144 cases with **144 unjudged**, zero semantic passes and zero paid
calls. This fixes the misleading mock score; actual judge calibration/model
performance remains unverified until the provider-capped route is proved.

### Capped live helper activation — 2026-10-10

Andrew's named global gateway caps read back as USD 3/window 86400 and USD
30/window 2592000, fixed and enabled, without metadata/provider/model partitions.
A temporary USD 0.000001 guard returned HTTP 429/code 2045; it was removed and
the original rules rechecked unchanged. Every private native Qwen call names
`bff-operator-dev`; the existing cheap fixed model has no fallback. BFF development
mode is `live` and caps flag `verified`; the private Worker uses explicit live
overrides while its checked-in manifest remains fail-closed. No production change.

Live tests exposed three integration defects, now regression-tested and fixed:
native Qwen rejects assistant `content: null`; SDK7's aggregate tool calls included
already executed reads; retained completed browser tool parts could trigger
repeated client requests. Native content is normalized, only unresolved calls are
returned as pending, and automatic continuation requires fresh browser results.
Backend/tool permissions and exact operator Send are unchanged. No schema/migration.

**Pass:** 2/2 actual hosted desktop Chromium/phone WebKit checks cover a printing
question answered with Actual Size/100%, a registered FAQ link and correlated
browser result, live-not-mock response flags, no automatic navigation, explicit
feedback and customer-chosen navigation. The six-POST-per-device fence remains;
only booleans are retained from in-browser stream inspection, never capabilities
or response bodies. The locator targets the latest answer rather than both the
tool placeholder and completed response. Fresh checks pass: 135 backend, 11
provider, 30 shared assistant and 120 TableCards tests, plus affected type/lint/build.

These smoke cases establish integration, not measured answer accuracy. Some
responses added unsupported details; the full saved-suite evaluation and judge
calibration must assess that before any quality claim. Neither a 144-case live
run nor a performance score is reported here. Eval gateway separation and native
alerts remain unconfigured; smoke calls count against the global live caps.
Setup sessions/private credential memory are cleared; temporary keys need rotation.

## Readiness lenses and verdict

| Lens                      | Assessment for this boundary                                                                                                                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product/commercial truth  | **Pass for development:** real email/AI and historical mocks are distinguished; KPI meanings are labelled. Real payments, acquisition and marketing are outside this build.                                                |
| Experience/accessibility  | **Scoped pass:** real desktop/phone journeys, sampled rendering, keyboard/focus and 200% reflow; full accessibility certification and physical-device review unverified.                                                   |
| Security/privacy          | **Scoped pass:** tested isolation/state guards, real email/preview paths and gateway cap proof pass. Rotate temporary credentials; provider accounting is not an exact reservation system.                                 |
| Legal/disclosures         | **Development-only evidence:** no-charge/mock notices checked. Production privacy/vendor/contact readiness and jurisdictional legal sign-off are not established here.                                                     |
| Performance/compatibility | **Scoped pass:** bounded event/context/file reads, Chromium/WebKit and actual 500-card PDFs. No load benchmark, universal latency target or physical-device claim.                                                         |
| Operations/deployment     | **Pass for development UI, real email and helper integration:** exact targets, seed, guarded tooling and capped inference verified. Broad comparison is complete but quality target unmet; monitoring/Telegram and production smoke remain excluded/pending. |

Ready for the authorized **development UI review**; real development email
acceptance and live helper integration also pass. Full live answer-quality
acceptance is **not established**: the completed broad comparison reaches at most
84.0% strict delivered-answer acceptance, below the 90–95% target. Subscription
judge controls/audits pass with disclosed severity/expectation caveats; earlier
API calibration failed and no API/human-ground-truth claim replaces it. Fresh
multilingual samples remain small. Production and customer launch stay excluded,
rather than waived. Andrew's visual review is optional feedback, not a substitute
for these checks.
