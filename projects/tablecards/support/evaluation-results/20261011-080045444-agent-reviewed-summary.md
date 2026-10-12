# Blinded agent-reviewed answers — interim

Created: 2026-10-11T08:00:45.445Z. Only reviewed captured cases; incomplete model suites, no automatic release or model promotion.

All five rubric dimensions must be adequate (2), with no critical failure and deterministic checks passing. Luna's original grades are preserved; exact supervisor changes and source hashes are in JSON. Primary Codex is another AI reviewer, not human ground truth. API calibration and automatic quality verification remain false. Subscription judging cost is unmeasured, not zero.

| Model | Reviewed | Luna acceptable | Supervised acceptable | Primary checked | Mean answer USD | Questions/$1 | Acceptable/$1 | p50/p95 elapsed ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| @cf/qwen/qwen3-30b-a3b-fp8 | 60 | 24 | 28 | 40 | 0.0002330 | 4292 | 2003 | 4516/12545 |

Estimated answer-only usage includes all recorded answer steps, not hosting/provider invoice/judge costs. Failed or unreviewed model calls are NOT in this interim cost denominator, so these partial rows cannot rank incomplete suites. Latency includes test-process pacing, SDK and transport, not a production throughput benchmark.

| Model | Relevance adequate | Grounding adequate | Authority/privacy adequate | Clarity adequate | Language adequate |
| --- | --- | --- | --- | --- | --- |
| @cf/qwen/qwen3-30b-a3b-fp8 | 45/60 | 32/60 | 57/60 | 45/60 | 59/60 |
