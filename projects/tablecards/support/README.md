# TableCards Operator work content

The `tablecards-operations` Nx project owns the Business-specific
[configuration defaults](../operator-work.defaults.ts), assigned knowledge,
Business KPI definitions, synthetic development seed and helper/support evaluation fixtures. Shared BFF
code does not import this product content. Existing nested web/backend projects
retain their own ownership; fixture tests stay beside these Business definitions.

Run under Node24:

```bash
pnpm exec nx run tablecards-operations:lint
pnpm exec nx run tablecards-operations:test
pnpm exec nx run tablecards-operations:typecheck
```

Configuration is disabled by default, with deliberately non-deliverable mailbox
placeholders. Use the validated [operator CLI](../../../tools/bff-operator/README.md)
to preview effective environment bindings before revision-checked apply. The
synthetic seed is development-only and does not schedule sending/model work.
Fixtures with expectations are not runtime model knowledge. Offline evaluation
reports are diagnostics, not evidence of live model quality or launch readiness.

The **2026-10-12 development checkpoint** selects Gemma 4 (`gemma4-26b`) with
Jev knowledge selection for helper and support, bot version 6. Runtime defaults
use the unchanged reviewed compact-v2 skills. Each bot declares its selection
policy and mandatory `tablecards.basics`/`tablecards.contact` keys as Business
configuration; shared machinery contains no TableCards-specific keys or facts.
The factory preserves the registered mailbox bindings, events, KPIs and page
capabilities. Support reads stay automatic; outgoing replies still require exact
operator Send. This choice favors extensibility: the measured strict result was
142/169 (84.0%), not the unmet 90–95% quality target or a proven Jev quality win.

[operator-work.full-reference.ts](operator-work.full-reference.ts) retains the
original disabled full-knowledge/Qwen/version-5 configuration for benchmarks.
[operator-work.compact.ts](operator-work.compact.ts) replaces only its skill
content/versions for historical matched comparisons. Use those two modules as
the full/compact experiment inputs, and [current defaults](../operator-work.defaults.ts)
for deployable configuration. Frozen captures, snapshots and grades remain
unchanged; switching runtime defaults must not silently make a `full-inline`
benchmark use compact knowledge.

The [controlled judge examples](judge-calibration.ts) are separate from the
157 saved helper/support question cases (144 original, four Hebrew and nine
Russian/Spanish/French regressions). Each role retains 60 held-out cases; language regressions are
tuning cases, not held-out evidence. Business instructions version 6 retain only
TableCards role guidance. Shared behavior owns clarity, grounding, permissions and
one general customer-language rule; basics/printing knowledge version 3 removes
duplicated translated wording without changing product facts. The seven full files total
7,873 characters (roughly 2,000 English tokens, not a measured tokenizer count), so
bounded upfront mode can avoid paid knowledge-selection calls. Runtime compact-v2
content is 6,967 UTF-8 bytes; neither character counts nor bytes measure tokens or
prove answer quality. Large corpora retain lazy loading.

Upfront versus lazy loading can be compared with `--knowledge-mode`; the model
comparison priority is quality, then estimated runtime cost, then elapsed speed.
The reports include questions and acceptable answers per USD 1 with all answer
steps counted, while evaluation-only judge costs stay separate. The
[Jev decision model](https://developers.cloudflare.com/ai/models/typesafe/jev/)
and native [Clef Flash](https://developers.cloudflare.com/workers-ai/models/clef-flash/)
are selectors, not chat answerers. The development checkpoint adopts Jev through
the per-bot policy above, although its quality benefit for this small corpus is
unproven. Andrew requested a matched Jev experiment against full/compact inline
knowledge and ordinary lazy tool loading.
The [plan](../../../.agent/plans/261009-operator-work.md#risks-review-state-and-history)
records the diagnostic pilot and unchanged quality-first acceptance criteria.
Jev's typed-decision benchmarks do not establish general chat or multilingual
quality. Its isolated metadata-only contract has offline tests, not model-quality
results. The initial zero-credit preflight was superseded by Andrew's one-off
USD 10 credit purchase plus 5% fee and authenticated prepaid Gateway setup.
The 2026-10-11 live Jev v1.13.0 probe responded on the private evaluation route
without changing the then-active customer knowledge/model. The USD 3/day,
USD 30/month caps are unchanged by the subsequent runtime checkpoint.
Gateway whole-response caching is bypassed; no model-prefix
discount is assumed in current cost estimates.

Live evaluation first checks those
24 authored good/bad answers against the selected independent stronger judge
(GPT-OSS-120B by default; Kimi K2.6/DeepSeek are evaluation-only alternatives); disagreement
or invalid grading blocks the answer suite. Reports show actual synthetic
questions/answers, five 0/1/2 scores, critical failures, unsure/errors, exact
evidence, reference/config/rubric versions and separate answer/judge/calibration costs and
latency. Offline stub tests do not establish actual judge accuracy. See the
operator CLI for live opt-in, verified caps and the shared $2 run bound.

The 2026-10-11 [live attempt](evaluation-results/20261011-041510521-operator-live.md)
failed judge calibration (2/12 controls agreed), so **none of the 148 answer
cases ran**. Their `judge_error` results are a blocked evaluation, not a 0%
answer-accuracy score. Repeated real browser checks still exposed garbled Hebrew;
the development [review](../docs/reviews/261009-operator-work-development.md#hebrew-rendering-and-language-regression--2026-10-11)
records both improved and failed samples. Do not treat prompt/knowledge updates
or successful RTL UI tests as proof the cheap model answers Hebrew reliably.

The earlier [GPT-OSS calibration](evaluation-results/20261011-070930664-operator-live.md)
matches 22/24 controls but still falsely accepts a bad Spanish translation;
the answer suites remain gated. Kimi/DeepSeek access probes returned Cloudflare
5035 (Workers Paid required), so no alternate-judge accuracy or model ranking is
available from that automated run. No subscription was purchased; current live
caps remain unchanged.

Andrew subsequently selected **blinded Luna subscription-agent batch review**
instead of buying stronger provider-judge access. Real cheap-model answers are
captured separately with `--capture-only`; this does not relabel the blocked API
judge as calibrated. Known controls matched 23/24 initially, then 24/24 after a
single evidence-ID format correction, with no changed semantic scores. Raw
grades/corrections and hashed provenance are retained. Primary Codex cross-checks
are AI supervision, not human ground truth. All 179 captured nonempty answers
now have grades; one four-answer batch also needed a separate fresh recheck
after semantically mismatched comments. [The comparison](evaluation-results/20261011-082236118-cheap-model-supervised-comparison.md)
keeps original/rechecked/primary scores separate, all selected failures and unrun
ranges, five KPIs and measured costs. All three final chunks failed at the
provider, stopping the full bank; native error 4006 suggests free allocation
exhaustion, without independently verified account analytics. Remaining
multilingual and cross-model support suites are unverified. Current partial
scores and limitations also belong in the existing development review.

[knowledge.compact.ts](knowledge.compact.ts) retains the compact-v2 wording
approved for the development checkpoint. [operator-work.compact.ts](operator-work.compact.ts)
remains a **disabled historical evaluation input**, not the deployable runtime
definition. Compact skills preserve the same seven skill keys,
names, when-to-use descriptors and assignments, with distinct version/provenance
values. Experimental v2 preserves the bot/human-support qualifier: content is
6,967 versus full 7,873 UTF-8 bytes (11.5% fewer); this is not measured token or
cost savings. Fact/provenance tests guard 123 distinctions plus the actor
qualifier, but do not prove answer quality. The completed generation experiment
preserves its original v1 snapshot (6,959 bytes). Judge compact answers against
unchanged full approved facts, then rerun saved suites. Never make further
compression changes if quality suffers.

[knowledge-experiment.ts](knowledge-experiment.ts) retains the 24 tuning/language
pilot plus three already-reviewed errors and four multi-topic/follow-up probes.
Its 31 cases are diagnostic, not fresh held-out evidence; the original 157-case
bank remains unchanged. Shared CLI captures four matched contexts, complete
original judge references, every model/selector step and measured usage. The
offline 124-row run makes zero paid calls; live capture is separately authorized,
bounded to USD 2 and unjudged until subscription review/primary checks. Actual
context-comparison results belong in the existing development review.

[knowledge-fresh-cases.ts](knowledge-fresh-cases.ts) adds 12 independently authored
questions for the broader comparison: six helper/six support across English,
Hebrew, Russian, Spanish and French, including two multi-topic follow-ups. They
were frozen before candidate outputs; the original 157-case bank is unchanged.
The combined 169 questions are not a representative traffic sample. Previously
seen saved `held_out` labels are historical, not newly unseen evidence.

The [42-call generation comparison](evaluation-results/generation-control-2026-10-11T171036-602Z.md)
separately tests Gemma default versus explicit thinking disabled, with fixed v1
knowledge. Estimated cost falls 36.22%, but answer quality is not settled:
Luna's 41 grades include consequential judge errors, and Astra reverses seven
of 17 selected pass/fail judgments. Raw strict counts are not general accuracy.
All original captures/grades, separate rechecks, hashes and actual examples are
saved; customer configuration is unchanged. Full held-out/language evidence remains.
The [157-case compact-v2 offline rerun](evaluation-results/20261011-173133407-operator-mock.md)
checks fixture wiring with zero paid calls/errors; every answer is unjudged,
not a semantic pass or a live regression proof.

The subsequent Russian/Spanish/French check captured [12 real anonymous helper
replies](evaluation-results/20261011-062900-multilingual-browser.json), four per
language including a fresh-thread repeat. These are manually reviewed browser
samples, not calibrated-judge scores or a full-suite accuracy benchmark. All
three languages invented current payment behavior; Spanish also appended
Hebrew and mistranslated printing. The [157-case offline rerun](evaluation-results/20261011-062848185-operator-mock.md)
passes fixture wiring only; all answers remain unjudged. No runtime/model/cap
change was made for this diagnostic check.
