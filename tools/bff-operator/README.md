# BFF operator CLI

Run validated Business-environment and customer-lifecycle operations through `pnpm bff:environment -- <command>`. The CLI invokes explicit Convex functions without a shell and never accepts credentials in configuration JSON.

Use `--help` for the complete tested syntax. Common groups are:

- Registry: `create`, `inspect`, `list`, `update`.
- Customer configuration: `preview-customer-auth`, then `configure-customer-auth` with the returned preflight ID and both revisions.
- Read-only customer state: `list-customer-users`, `list-customer-accounts`, `list-customer-memberships`, `list-customer-sessions`, `list-customer-security-events`.
- Lifecycle: `provision-managed-account`, development-only `provision-development-account`, `set-account-policy`, `revoke-customer-session`.
- Operator work: `preview-operator-work`, `configure-operator-work` with the returned
  current revision, and `seed-operator-work` for an explicit development target.
- Repository evaluation: `evaluate-operator-work` defaults to offline mock diagnostics;
  reports stay under the relevant `projects/<business>/` directory.

All cloud operations require `--confirm-cloud`. A command that writes to a production reference also requires `--confirm-production <exact-deployment-reference>`. Those flags authorize only the named invocation; they do not deploy code or bypass backend validation.

Customer-auth apply is deliberately two-stage. Prefer `--defaults-module <business-defaults.ts>` plus `--environment-json <json>`: the CLI composes reviewed code-owned behavior with deployment URLs into the exact versioned effective snapshot. `--configuration-json` remains available for compatibility. Preview validates every existing user and account and returns a short-lived single-use preflight. Apply must use the same source inputs, current configuration revision, current account-policy-state revision and preflight ID. Any source or concurrent account change makes it stale and requires a new preview.

For product-guided configuration, use [the repository skill](../../.agents/skills/configure-business-auth/SKILL.md). It explains URL semantics, interacting account defaults and safe scenario choices before invoking this CLI.

Operator configuration accepts validated `--configuration-json`, or a trusted
Business `--operator-defaults-module` exporting `default`/`operatorWorkDefaults`.
Optional `--configuration-overrides-json` changes only activation, presentation
help/contact URLs and mailbox registration values. It never changes Business
bot/skill/event/tool definitions or stores provider credentials. Preview returns
the exact effective configuration and current revision; reuse these inputs for
apply. The backend atomically rechecks revision and mailbox collisions.

`seed-operator-work` accepts `--seed-json` or `--seed-module` exporting
`default`/`operatorWorkSeed`. It requires a `-development` environment key and
`local`, `dev`, `development` or the known BFF development deployment. Recipients
must end in `.example.invalid`. The backend additionally requires its explicit
development flag, validates linkage and deduplicates stable case/event IDs. Seed
never clears other records, sends emails or schedules model work. This CLI has
no internal Send bypass. The `support-*` commands use an admitted operator token
from `BFF_OPERATOR_TOKEN` and the same public API as the UI: queue/case/runs,
draft editing, exact full-envelope preview, explicit Send, notes and status.
Use `--help` for syntax. `--confirm-send` is required for Send; the backend still
rejects stale pending IDs. Never put the token in arguments or repository files.

Evaluation example (no provider calls):

```bash
pnpm bff:environment -- evaluate-operator-work \
  --fixture-module projects/tablecards/support/evaluations.ts \
  --operator-defaults-module projects/tablecards/operator-work.defaults.ts \
  --report-directory projects/tablecards/support/evaluation-results
```

Fixtures export `operatorEvaluations`: cases have ID, helper/support cohort,
tuning/held_out split, prompt, expected phrase/tool dimensions, tags, reference
keys and qualitative expected behavior. Selected cases run sequentially; no held-out cases are rewritten.
Expectations/reference keys/split labels are withheld from the answerer. A separate
isolated stronger judge receives the question, actual answer, expected behavior and
resolved approved knowledge. It scores relevance, grounding, authority/privacy,
clarity and language from 0 to 2; pass requires all five 2, no critical failure and deterministic
answer/tool checks passing. Phrase matches are diagnostics, not semantic grades.
Blank answers fail before a judge call. Missing references, unsure grades, invalid
JSON/evidence and provider failures never pass. The judge has no tools or retries.
Versioned JSON/Markdown reports preserve actual synthetic questions/answers,
observed tool traces, reference/config/case/rubric versions, scores/reasons/exact
evidence, tokens, latency and separate answer/judge/calibration estimated costs. Private provider errors and
credentials are never written. Reports include every selected case in their
denominator, with helper/support and tuning/held-out/style breakdowns.
The isolated evaluator uses shared behavior and bounded knowledge preparation:
small assigned corpora are supplied upfront (no paid selection call); larger
corpora use assigned `loadSkill`. It does **not** execute the per-bot runtime Jev
policy; use the matched knowledge experiment for selector comparison and hosted
development tests for production-path integration. An offline report does not
prove Jev wiring or semantic quality. The evaluator does not
access customer records or execute browser capabilities. Reports show helper/support
and tuning/held-out groups separately. Offline mocks or stub judge tests do not
establish actual model or judge quality. Live failures/unsure/errors return a
nonzero exit. The stronger judge is separate from the inexpensive answering model; judging
errors remain possible and independent manual review is still required. Exact answer-span IDs
are resolved locally to evidence; valid IDs alone are not proof of correct grading.

Later intentional live runs require both `--live --confirm-model-cost` and local
`BFF_EVALUATION_PROVIDER_URL`, `BFF_EVALUATION_PROVIDER_SECRET`,
`BFF_EVALUATION_CAPS_VERIFIED=verified`. Those values are server-only and never
written to reports. Live runs additionally require `--judge-calibration-module`
with Business-owned `judgeCalibrationCases` containing authored positive/negative
answers and expected verdicts/critical codes. Calibration runs first; if it disagrees
or errors, the answer suite is not run and the report records the blocker.
TableCards uses `projects/tablecards/support/judge-calibration.ts`, separate from
the 157 saved question cases. Its 24 controls include multilingual positives and negatives.
Offline CLI does not simulate semantic calibration. Live grading requires fresh successful
controls bound to the same judge model, rubric/prompt and reference versions.
The reviewed answer candidates are `qwen3-30b`, `glm-4.7-flash` and `gemma4-26b`;
`--answer-model` selects an experiment, not customer/runtime configuration.
`--judge-model gpt-oss-120b|kimi-k2.6|deepseek-v4-flash-0731` is evaluation-only;
the default remains GPT-OSS, with no fallback. Each selected judge must pass its
own fresh calibration. Native Kimi/DeepSeek access requires an existing paid
Workers plan or prepaid credits; access failure never authorizes a purchase.
At most 160 selected cases, four answer calls
plus one judge call per case, up to 32 calibration calls, no retries and 1,200
output tokens per call are accounted in a conservative combined full-context cost bound.
Runs above $2 are refused before inference. For GPT-OSS, use `--offset 0 --limit 60`,
then offsets 60 and 120 to cover the full bank. Costlier judges need smaller batches
(for example at most 20 cases plus 24 controls with Kimi); the price-aware gate
rechecks the exact chosen answer/judge combination before paid work.
`--case-id <saved-id>` can repeat to select a tuning slice; `--calibration-only` tests the
judge without generating answers. `--knowledge-mode auto|inline|lazy` compares retrieval
with the same saved questions and measures all model steps; forced inline must fit the byte bound.
Provider-returned usage estimates are
reported separately; failed requests may incur unreported usage. The worker
still requires its own verified gateway caps; these flags do not configure them.
No live run is implied by creating or running offline diagnostics.

For an explicitly authorized **subscription sub-agent review**, use
`--capture-only --live --confirm-model-cost` instead of an API judge. This mode
still requires verified capped routing and the answer-only $2 bound, but makes
**no judge or calibration calls**. Do not combine it with judge/calibration flags.
It preserves all actual answers, failures, usage and versions as unjudged; an
exit-zero capture means generation checks passed, **not answer quality**.

`createAgentReviewBatch` in [operatorAgentReview.ts](src/operatorAgentReview.ts)
creates bounded opaque-ID packets containing the question, unchanged answer,
expected behavior, approved references and actual tool traces. Model, price,
latency, split and old scores stay in a separate local provenance mapping.
`validateAgentReviewBatch` rechecks complete IDs, packet hash, unchanged inputs,
strict score/evidence contracts and deterministic checks. Grade helper/support
in batches, not one sub-agent per question. Run known good/bad controls first;
cross-check passes and all critical/unsure/disputed cases independently. Keep raw
grades and supervisor corrections separate. A supervisor is another AI, not
human ground truth; subscription judging cost is **unmeasured**, not free.
This supervised method never sets API calibration or automatic
`qualityVerified` true and cannot bypass the existing API-judge gate.

The isolated `experiment-operator-knowledge` command captures four matched arms:
full inline, compact inline, compact lazy `loadSkill`, and Jev-selected compact.
It changes no customer configuration and makes no judge/calibration calls. Example
for one saved question, with no provider calls:

```bash
pnpm bff:environment -- experiment-operator-knowledge \
  --fixture-module projects/tablecards/support/evaluations.ts \
  --operator-defaults-module projects/tablecards/support/operator-work.full-reference.ts \
  --compact-defaults-module projects/tablecards/support/operator-work.compact.ts \
  --mandatory-skill tablecards.basics --mandatory-skill tablecards.contact \
  --case-id synthetic.helper.tuning.calibration.01 \
  --report-directory projects/tablecards/support/evaluation-results
```

Repeat `--case-id` for a matched pilot. A Business fixture module can instead
export `knowledgeExperimentCases`, adding bounded `recentMessages` for follow-ups
and optional manually reviewed `necessaryKnowledgeKeys`. These dependency checks
are diagnostics; existing fixture reference keys do not become a retrieval oracle.
History reaches the selector, answerer and judge question. Expectations, tags,
reference keys and dependency labels never reach the selector or answerer.
Full and compact configurations may differ only in knowledge content/version.
Every full/compact/fallback payload must fit before any paid callback begins.

Live capture requires `--live --confirm-model-cost` and the same verified private
provider variables as ordinary evaluations. Jev uses the private evaluation-only
`POST /v1/knowledge-selection` route, which must be enabled separately in the
development provider. The default answer candidate is `gemma4-26b`; only the
existing three cheap answer keys are accepted. Each case reserves seven answer
calls (one each for the three inline arms, four for lazy loading) and one selector
call, with 32,768 input-token headroom for each answer call and each independent
selector question, 1,200 answer-output tokens, no retries and one combined $2
preflight. A 24-case Gemma pilot with seven sections reserves about $0.842; batches
exceeding $2 are refused. External caps remain separate and unchanged.

Jev sees assigned descriptors and minimal conversation history. The explicit
mandatory keys are a server-owned experiment choice, preserved even when Jev
omits them. Ambiguous/empty/invalid selections and provider errors fall back to
the full compact corpus and remain visible. JSON captures independent probabilities,
mandatory additions, per-model steps, tool results, actual usage, missing fact
dependencies and end-to-end latency. Unknown paid usage/cost stays null; measured
subtotals do not claim a complete invoice. Exit zero is unjudged generation,
not quality; provider/invalid-selector errors return nonzero even with fallback.

[operatorKnowledgeExperiment.ts](src/operatorKnowledgeExperiment.ts) exports
`runKnowledgeExperiment`, bounded private answer/selector adapters and
`createKnowledgeExperimentReviewBatches`. The latter reuses the existing opaque
blinded-review packets with randomized arm/case order, unchanged full references
and the existing rubric. Context mode, model and prices stay in local mappings.
Knowledge-retrieval names/versions/traces are also hidden from semantic packets;
unchanged capture records, local hidden evidence and deterministic checks retain
them. Other action traces remain visible. Judge the final answer separately from
any intermediate text when assessing the complete customer-visible journey.
Sanitized bridge `INVALID_PROVIDER_OUTPUT` errors count as invalid selectors,
not transport failures; their discarded usage stays unknown.
This compares operational strategies, not a pure one-call context ablation:
lazy loading permits four steps with a 25-second deadline per step and a
100-second workflow deadline; Jev has a separate 25-second selection allowance.
The earlier pilot used a 25-second total lazy deadline; that historical
operational bias is retained in its evidence, not carried into broader runs.
Report timeout/provider failures
separately from semantic errors. Cost and latency comparisons must use each
attempt's selector plus all model steps and `endToEndLatencyMs`, not the nested
answer-only suite reports. External test pacing is part of measured latency.
An optional trusted `--selector-module` may export a single-attempt
`selectKnowledge(request)` adapter; it receives metadata only and must make no
retries, purchases or uncapped fallback. Offline mode never loads that adapter.

### Broad model/context capture

[operatorKnowledgeMatrix.ts](src/operatorKnowledgeMatrix.ts) exports
`runKnowledgeMatrix` for a validated Business-owned bank and up to three reviewed
cheap models. It preflights every case/configuration offline, freezes full and
compact snapshots, balances case strata and rotates model/arm order. Three workers
share one transport: at least 3.5 seconds between actual starts, 25 seconds of
network allowance **after** queue admission, finite queue/workflow deadlines,
no retries, and a combined $2 measured/unknown/in-flight cost ceiling. Unknown
failed-call costs retain worst-case reservations. Repeated provider failures stop
new work; rate limits introduce a cooldown, not resends or cap changes.

The paced adapter gives 70 seconds per step (queue plus network) and up to four
steps for lazy loading. Each completed workflow persists a capture, safe transport
correlation indices and updated progress. Every nonempty answer, including
length-limited replies, enters a mixed opaque review packet against the original
full references. Empty/provider/local failures remain in delivery denominators;
unstarted cases are recorded separately. Subscription grades require validation
and primary checks. Capture completion alone proves neither quality nor 95%
accuracy. This programmatic runner changes no customer configuration or schema.

[operatorKnowledgeMatrixReview.ts](src/operatorKnowledgeMatrixReview.ts) prepares
opaque subscription-control packets from Business fixtures, retains the hidden
expected grades, validates complete raw Astra grades and saves control agreement.
Use the same rubric for all capture packets. Raw `-astra.json` files stay immutable;
strict validation saves separate `-validation.json` files. Control agreement is
not an API-judge or customer-release approval.

[operatorKnowledgeMatrixReport.ts](src/operatorKnowledgeMatrixReport.ts) reads
capture/transport/validated-grade evidence without provider calls;
`saveKnowledgeMatrixSummary` generates the mutable `-summary.json`/`.md` view.
It separates semantic adequacy from end-to-end acceptance, marks ungraded
coverage pending, and compares identical all-12-complete cases without concealing
that intersection's survivor selection. Unknown usage is not free, and SDK call
starts are not necessarily provider network starts. Transport failure timing is
workflow/model-scoped rather than guessed per arm. If a capture process is
interrupted mid-workflow, in-memory calls may be absent from the last checkpoint:
reconcile provider records before claiming complete cost or coverage.

`inspectKnowledgeMatrixRecovery` preflights an interrupted legacy matrix using
the frozen configuration/case/order hashes and each immutable capture. Passing
`resumeFromStem` to `runKnowledgeMatrix` skips completed workflows and reserves
the original three-worker uncertainty: gaps and at most three possibly active
workflows are marked interrupted, not retried. The original known/unknown costs,
old in-flight reservations and a conservative full-workflow allowance all count
toward the **same** $2 ceiling; up to 24 unrecorded starts count toward the same
4,000-call boundary without being claimed as observed calls. Recovery uses a new
stem linked to the original. The summary reader merges only identity-matched
sources and exposes interruption coverage and acceptance over all planned cases.

Reviewed faster pacing is configurable as `minimumIntervalMs: 400` with up to
eight awaited workers, below the user-reported 200/minute gateway setting. It
does not increase spending caps, output limits or retry counts. New runs save
fsynced request reservations **before** network calls, completions before
returning usage, immutable job claims/captures, and atomically replaced progress.
Raw captures and grades are never overwritten. Recovery of a second interruption
requires explicitly reconciling that ledger; it is not silently restarted.

## Gemma generation control

`experiment-generation-control` is a bounded, development-only paired capture
for the seven `diagnostic.*` cases in a fixture's `knowledgeExperimentCases`.
It compares the provider-default Gemma 4 request against the same request with
`chat_template_kwargs: { enable_thinking: false }`. Both use the exact compact
inline knowledge, shared instructions, user prompt and 1,200-token cap. Three
repetitions per mode are paired with seeded randomized order: 42 calls total,
one attempt per call, 25-second deadline, no retries, 24 KB UTF-8 request
preflight and a conservative combined bound below $2. It refuses other models
and validates all requests and the complete budget before the first provider
callback.

The command requires explicit `--live --confirm-model-cost`,
`GENERATION_EXPERIMENTS_ENABLED=true` in development, and the already verified
private capped-provider environment (`BFF_EVALUATION_PROVIDER_URL`,
`BFF_EVALUATION_PROVIDER_SECRET`, `BFF_EVALUATION_CAPS_VERIFIED=verified`). It
uses only the private `/v1/experiments/chat/completions` route. It never sends
fixture expectations to the answer model. Reports retain actual answers,
failure/usage/cost uncertainty, order, versions, prompt/instruction hashes and
the exact compact knowledge snapshot; no reasoning text is stored. Raw measured
reasoning-token counts are nullable and are populated only when the raw provider
response includes that usage field. The response model and finish reason are
checked against Gemma 4 and the expected stop/length outcomes; truncated answers
remain captured as failures. Blinded review packets use opaque randomized IDs,
the actual recent conversation, and all original full assigned references;
mode, repetition and original case association stay in a separate local mapping.
Packets contain at most eight answers, and report versions, IDs, modes and
deterministic capture checks are validated before packet creation. Captures are
unjudged and do not establish answer quality or authorize enabling thinking
changes in runtime.

Example (run only after the development route and capped credentials have been
independently verified):

```bash
pnpm bff:environment -- experiment-generation-control \
  --fixture-module projects/tablecards/support/knowledge-experiment.ts \
  --operator-defaults-module projects/tablecards/support/operator-work.full-reference.ts \
  --compact-defaults-module projects/tablecards/support/operator-work.compact.ts \
  --report-directory projects/tablecards/support/evaluation-results \
  --order-seed gemma-generation-pilot-20261011 \
  --live --confirm-model-cost
```
