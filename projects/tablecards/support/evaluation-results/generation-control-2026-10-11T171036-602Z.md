# Gemma generation-control diagnostic — 2026-10-11

Completed 17:10 UTC; reviewed 17:25 UTC. Repository baseline `41ba411`, working
branch `build/operator-work-dev`; development only. This is a saved experiment,
not a deployment decision or evidence of 90–95% general accuracy.

## Outcome

Explicitly disabling thinking reduced measured output usage and estimated cost,
with 21/21 complete answers instead of 20/21. **Answer quality is not settled:**
the bot still omits useful options and gives weak credit/workspace explanations;
independent grading also found substantial mistakes in the first judge.
Do not promote a model/context strategy from these diagnostic grades.

## Matched setup and actual transport

Seven already-seen English questions, three repetitions, two randomized settings:
42 private, capped development calls to `@cf/google/gemma-4-26b-a4b-it`.
Same compact knowledge **v1**, shared behavior v2, role instructions, recent
conversation, 1,200-output-token bound and 25-second deadline. No tools,
selection calls, retries or response caching. Compare provider default with
`chat_template_kwargs: { enable_thinking: false }`, supported by the
[official Cloudflare example](https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/).
That example does not establish the provider's default setting.

The [capture](generation-control-2026-10-11T171036-602Z.json) preserves exact
knowledge and input/configuration hashes. Its original review packets were
regenerated against that historical snapshot and matched after canonical JSON
serialization; local
mapping metadata was checked separately. Full approved knowledge, not compressed
wording, is the judge reference. [Transport evidence](generation-control-2026-10-11T171036-602Z-transport.json)
records 42 actual requests, all HTTP 200, zero timeouts/local blocks. One default
answer stopped at the length limit and fails completion despite HTTP success.
All 41 complete replies are nonempty. Request-start pacing totalled 23.292s;
observed latency is end-to-end, not isolated model speed.

## Cost and completion

Prices use reported tokens and
[Gemma's documented USD 0.10/M input, 0.30/M output](https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/).
All 42 calls have measured cost inputs; include the truncated call, not just
successful survivors. Total estimated inference: **USD 0.0141868**.

| Setting | Complete / attempts | Input / output tokens | Inference USD/attempt | Questions / inference USD 1 | Median end-to-end |
| --- | --- | --- | --- | --- | --- |
| Provider default | 20/21 | 48,342 / 12,759 | 0.00041247 | 2,424 | 12.304s |
| Thinking disabled | 21/21 | 48,382 / 2,289 | 0.00026309 | 3,801 | 2.711s |

Disabled: 36.22% lower estimated cost and 77.97% lower observed median in this
sample. The provider reports **no reasoning-token breakdown in either arm**;
all 42 missing values remain unknown, not zero. Do not infer an exact hidden
reasoning count or explain an earlier blank answer from these data.

The low-cost arm is approximately USD 0.263 per 1,000 attempted questions in
inference credits. Including the documented 5% credit-purchase fee gives about
USD 0.276, or 3,620 attempts per out-of-pocket USD 1 before tax. This excludes
Workers/other services and subscription-agent judging, whose cost is unmeasured.
These are sample-based estimates, not an invoice or a promise of acceptable
answers per dollar. USD 10 credits were purchased once; automatic top-ups remain
off, both USD 3/day and 30/month caps unchanged, no Workers Paid subscription.

## Raw Luna scorecard, not an accuracy ranking

[Validated Luna records](generation-control-2026-10-11T171036-602Z-luna-validation.json)
retain six original batches plus separate rechecks. Two originals copied the
wrong batch ID and were rejected; rechecks repair those IDs. One recheck also
changes order 19's relevance/grounding and removes its critical flag; originals
remain. There are 41 valid grades, zero invalid/unsure after rechecks.

Raw strict v2 acceptance is **13/41 reviewed**, or **13/42 attempts** including
truncation: default 2/21, disabled 11/21; helper 9/30, support 4/12. These are
disputed rubric results on a deliberately difficult seen set, **not** estimates
that the bots answer only those percentages of real customer questions correctly.
Do not use this difference alone to select a setting.

Scores below are means over complete, reviewed answers, on the 0/1/2 scale.
Every adequate dimension is required for strict acceptance; fluent wording
cannot compensate for incorrect facts. Language here means **English only**.

| KPI | Default (20 reviewed) | Disabled (21 reviewed) |
| --- | --- | --- |
| Answers the customer's question | 1.20 | 1.57 |
| Grounding in approved facts | 1.60 | 1.62 |
| Permissions/privacy | 2.00 | 2.00 |
| Clear, usable explanation | 1.95 | 1.81 |
| Language quality | 2.00 | 2.00 |

## Independent audit and actual issues

Astra independently graded **17 deliberately selected disputes**, without
candidate settings, mappings, prices, timings or Luna grades. Its
[validated audit](generation-control-2026-10-11T171036-602Z-astra-validation.json)
accepts 6/17 versus Luna's 3/17, with **seven pass/fail reversals**. It finds no
definite critical violations in this selected subset and rejects all five raw
Luna critical labels as disproportionate; several answers still fail for real
grounding, usefulness or clarity problems. This is AI supervision, not human
ground truth. No API calibration or automatic quality flag is enabled, and the
two reviewers are not blended into a supposed overall accuracy rate.

Actual excerpts, with order numbers linking to the capture:

| Customer question/context | Bot excerpt | What is wrong, or what the judge got wrong |
| --- | --- | --- |
| Name, Table and Meal: can I choose columns? | Order 27: “since we don't have a specific field for \"Meal,\" you can choose not to map that column” | Missing the useful Meal → Short Marker option. Astra calls this an omission, not a definite false claim that Meal can never appear. |
| Same spreadsheet question | Order 4: “you could map that to the **Short Marker** field” | Adequate answer. Luna rejected it for omitting a generic review tip; Astra accepted it. |
| Does my saved private project move when I switch workspaces? | Order 1: “To use that project in a different workspace, you would need to work within the original one.” | Correct no-move fact, confusing final instruction. Luna passed it; Astra gives clarity 1. Order 2's simple correct no-move answer was wrongly rejected for missing extra navigation. |
| Failed generation, remaining count went from 2 to 1 | Order 37: “the reserved unit is already released, which is why the count might change” | Release does not establish the cause of a reported decrease. Explain expected release, acknowledge unknown account state and offer an Account check/review. Not proven theft or a verified balance claim. |
| Same failed-credit problem | Order 38: “that unit is still released and counted” | Ambiguous accounting explanation, not enough to know whether “counted” means spent or available. Astra gives grounding/clarity 1 rather than a definite critical contradiction. |
| Can you put that failed unit back? | Order 32: “Neither I nor the support team has the ability to manually adjust your account limits or credits.” | Bot restrictions were broadened to unverified human capabilities. Do not infer human support powers either way. |
| 80 guests, Free offer and checking print size | Order 11: “Event Pass ... for a one-time fee” | Missing the important current no-charge-preview qualification. Luna missed the grounding issue; Astra identified it. |
| Can you put that unit back? | Order 13: “your balance should reflect the correct amount” | Expected behavior, not a claim to have verified/restored this account. Luna's critical label is unsupported; Astra still fails usefulness because there is no next step for the unresolved discrepancy. |

All seven prompts, their recent context and complete answers remain in the
capture/review mappings. The other prompts concern Vietnamese versus Arabic
script coverage and combined Excel-header/print-size diagnosis. Repeated seen
cases are not fresh held-out tests; Russian/Spanish/French were not tested here.

## Follow-up and unchanged boundaries

Separately corrected compact **v2** to preserve “support bot” rather than infer
human support restrictions; distinct experimental skill versions, 6,967 UTF-8
bytes versus full 7,873. The paired capture keeps its v1 snapshot unchanged.
A failing actor-qualifier regression now passes; all 19 Business tests and
affected type/lint checks pass. Fact checks do not prove compressed-answer quality.
The [full saved-case offline rerun](20261011-173133407-operator-mock.md) loads
compact v2 and all 157 cases (84 helper, 73 support), with zero paid calls/errors;
all 157 remain semantically unjudged. CLI/provider checks pass with matching
caches; scoped formatting, secret scan, ownership boundaries and local links
also pass. Cleanup required only fixture formatting, not a behavioral rewrite.

Next: make essential answer requirements versus optional advice explicit in
grading/calibration; test the corrected knowledge and stronger inexpensive
candidates on saved roles/languages and fresh cases. Keep quality first, then
cost, then speed. No additional purchase is needed for this completed diagnostic.
Customer Qwen/full knowledge, shared permissions, approval-before-Send, schema
and production remain unchanged. No implementation commit/push was performed.
