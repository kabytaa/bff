# Cheap bot models — captured, supervised comparison

Created: 2026-10-11T08:22:36.118Z. Development only; no live calls were made to assemble this report.

The fair matched slice is **40 helper questions** (20 normal, 20 messy), using the same shared behavior v2 and Business v5 knowledge/configuration. All 40 stay in each denominator, including provider failures and blank answers. This is supervised AI review, **not human ground truth or release-quality acceptance**. API calibration and automatic quality verification remain false.

## Matched helper end-to-end capture results

| Model | Nonempty / selected | Valid scored | Provider failures | Blank | Invalid original grades | Luna raw acceptable | Primary-adjusted acceptable | Separate recheck variant |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| qwen3-30b | 40/40 | 40 | 0 | 0 | 0 | 14/40 (35.0%) | 18/40 | none |
| gemma4-26b | 38/40 | 38 | 2 | 0 | 0 | 27/40 (67.5%) | 29/40 | none |
| glm-4.7-flash | 22/40 | 21 | 17 | 1 | 1 | 15/40 (37.5%) | 16/40 | 18/40; 4 rechecked |

Acceptance requires **all five scores = 2**, no critical failure and deterministic checks passing. A 2 means adequate, not stylistically perfect. Provider failures are unavailable evidence, not semantically bad answers. Original grades are immutable; primary adjustments and the four-answer GLM recheck are separate JSON fields/columns.

The rates over 40 measure **captured acceptable-answer yield, not pure answer accuracy**. Later GLM shared-infrastructure failures are not evidence that its unproduced answers were wrong.

## Answer quality on the same produced questions

All three models successfully produced nonempty, completed answers for the same **22** first-40 question IDs. Comparing this intersection separates answer quality from unavailable provider requests; it is still a small survivor-selected subset, not a complete reliability ranking.

| Model | Same produced questions | Valid original grades | Invalid original grades | Luna raw adequate answers | Primary-adjusted adequate answers | Separate recheck variant |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3-30b | 22 | 22 | 0 | 8/22 (36.4%) | 13/22 (59.1%) | none |
| gemma4-26b | 22 | 22 | 0 | 17/22 (77.3%) | 18/22 (81.8%) | none |
| glm-4.7-flash | 22 | 21 | 1 | 15/22 (68.2%) | 16/22 (72.7%) | 18/22 |

### Cost for the identical produced-question intersection

These 22 selected questions are fully priced for all three models. Cost includes every reported answer-model step for those questions, but not the excluded failed requests, subscription judge, hosting or provider invoice differences.

| Model | Mean answer USD / message | Questions / $1 | Luna raw acceptable / $1 | Primary-adjusted acceptable / $1 | Observed p50 / p95 ms |
| --- | --- | --- | --- | --- | --- |
| qwen3-30b | $0.0002152 | 4647 | 1690 | 2746 | 3835 / 5058 |
| gemma4-26b | $0.0003453 | 2896 | 2238 | 2370 | 10692 / 17821 |
| glm-4.7-flash | $0.0003816 | 2620 | 1787 | 1906 | 17579 / 23456 |

The sample is survivor-selected. Timings include capture pacing and transport, **not native model or production latency**; this is not a full reliability or total-spend ranking.

### Five KPIs over the full matched slice

| Model | Valid scored / selected | Answers the question | Factual grounding | Authority / privacy | Clarity | Customer language |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3-30b | 40/40 | 28/40 | 16/40 | 38/40 | 26/40 | 40/40 |
| gemma4-26b | 38/40 | 33/40 | 31/40 | 37/40 | 33/40 | 38/40 |
| glm-4.7-flash | 21/40 | 19/40 | 15/40 | 21/40 | 19/40 | 21/40 |

Those five KPI numerators use validated **original** Luna scores; each denominator is 40. Ungraded/invalid cases do not receive invented dimension scores. Primary-inspected answers: qwen3-30b 40/40; gemma4-26b 38/40; glm-4.7-flash 22/40. Deterministic failures on completed turns: qwen3-30b 0; gemma4-26b 1; glm-4.7-flash 1 (the blank GLM turn is included).

## Cost and timing

| Model | Known recorded answer cost | Selected set fully priced? | USD / selected question | Selected questions / $1 | Luna raw acceptable / $1 | Primary-adjusted acceptable / $1 | Observed p50 / p95 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| qwen3-30b | $0.0093136 | yes | $0.0002328 | 4295 | 1503 | 1933 | 3867 / 5516 |
| gemma4-26b | $0.0142114 lower bound | no | unknown | unknown | unknown | unknown | 14138 / 24335 |
| glm-4.7-flash | $0.0087802 lower bound | no | unknown | unknown | unknown | unknown | 17579 / 23456 |

Qwen's fully-priced matched set supports the per-selected-question estimates above. Failed-request usage is unavailable for Gemma/GLM, so their full-selected efficiency is **unknown**, not zero. Subscription judging cost is **unmeasured**, not free; it is excluded from runtime answer cost. Hosting and provider invoice differences are also excluded.

Conditional completed-turn samples only — **not a fair full-selected ranking**:

| Model | Priced completed turns | USD / completed turn | Completed turns / $1 | Luna raw acceptable / $1 within this sample |
| --- | --- | --- | --- | --- |
| qwen3-30b | 40 | $0.0002328 | 4295 | 1503 |
| gemma4-26b | 38 | $0.0003740 | 2674 | 1900 |
| glm-4.7-flash | 23 | $0.0003817 | 2620 | 1708 |

GLM's completed-turn sample includes its blank turn and its cost. Elapsed timings include capture pacing (shared 4-second request spacing), SDK and transport; **not native production latency**.

## Separate Qwen evidence — no cross-model support ranking

| Slice | Selected | Nonempty | Valid scored | Provider failures | Invalid grades | Luna raw acceptable | Primary-adjusted acceptable |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Qwen helper adversarial questions 40–59 | 20 | 20 | 20 | 0 | 0 | 10/20 | 10/20 |
| Qwen support normal/messy/adversarial questions 60–119 | 60 | 59 | 58 | 1 | 1 | 18/60 | 15/60 |

No GLM/Gemma support suite was reached. The separate Qwen support result must not be used to rank the other candidates.

## Incomplete bank and infrastructure boundary

| Model | Full-bank attempted | Completed turns | Provider failures | Unrun |
| --- | --- | --- | --- | --- |
| qwen3-30b | 140 | 119 | 21 | 17 |
| glm-4.7-flash | 73 | 23 | 50 | 84 |
| gemma4-26b | 60 | 38 | 22 | 97 |

The final Qwen 120–139, Gemma 40–59 and GLM 40–59 chunks each failed 20/20 provider requests; the primary observed shared native-provider error **4006**, not poor answer quality. Free-quota exhaustion is an **inference**, not independently verified account analytics; direct-binding code 3036 is **not confirmed**. Captures stopped without retries, cap increases or billing upgrades. The GLM 13-case language run is retained as a pacing diagnostic (30-second fetch spacing inside a 25-second answer deadline), excluded from fair quality/cost comparisons. Language/tuning quality after offset 119 remains unverified.

- Only the first 40 helper questions have matched captures for all three candidates; no GLM/Gemma support answer evidence exists.
- Rates over 40 are end-to-end captured acceptable-answer yield, not pure answer accuracy. Unavailable answers and invalid judgments are separately identified, not called semantically wrong answers.
- The same-produced intersection compares answer quality on identical successfully produced IDs, but is a small survivor-selected subset and still has AI judgment errors; it does not establish general reliability or model promotion.
- The four-answer GLM messy original batch contains semantically mismatched question/answer judgments; its fresh blinded recheck is reported separately without changing original scores.
- Primary adjudications are another AI review, not a human gold standard. Packet/source validation proves provenance, not grading correctness.
- All bank tuning/language cases after offset 119 failed or remain unrun, including the invalid-paced GLM language diagnostic; multilingual quality is unresolved.
- Failed request usage may be missing. Recorded cost is a lower bound; Gemma/GLM completed-sample cost efficiency must not be treated as a fair full-selected cost ranking.
- Measured elapsed latency includes the shared 4-second capture pacing and transport; it is not a native model or production-speed benchmark.
- Isolated evaluation supplies assigned knowledge but does not execute real customer-record, browser-tool, operator-Send or email workflows.
- This is incomplete, supervised evidence. Automatic quality flags and API-judge calibration remain false; no model/configuration/runtime change follows from the report.

JSON preserves per-case original scores, separate adjudications/rechecks, review groups and validated source hashes. Original raw captures, packets, mappings, Luna grades and reports are unchanged.

Provenance: [capture manifest](20261011-080737960-cheap-model-capture-manifest.json), [attempted/unrun coverage](20261011-080737960-cheap-model-capture-coverage.json), [provider availability finding](20261011-081900-provider-availability.json), [first-40 primary notes](20261011-075900-primary-first40-notes.json), [additional primary notes](20261011-081800-primary-additional-audit.json).
