# Knowledge matrix aggregate: knowledge-matrix-2026-10-11T210245-209Z

Created 2026-10-11T21:02:45.209Z; updated 2026-10-11T21:29:03.517Z. Capture is observational; supervised grades are not ground truth.

Planned cases 169; model-workflows planned/captured/interrupted/unstarted 507/504/3/0. Planned arm attempts 2028; captured attempts 2016; interrupted attempts 12; unstarted attempts 0.
Recovery sources: knowledge-matrix-2026-10-11T210245-209Z, knowledge-matrix-2026-10-11T184003-864Z. 3 interrupted workflows (12 answer attempts) are not silently rerun; missing coverage is not a successful answer. Acceptance over ALL planned attempts: 52.8%. Up to 24 additional unrecorded provider starts are conservatively reserved, not claimed as measured starts.
Transport: 3026 actual network starts, 0 local refusals; known estimate $0.691337, unknown worst-case reserve $0.523401, total unknown. Queue pacing wait 1714.5s. Unattributed Jev selector calls: 1 network, 0 locally refused.

| Model | Arm | Planned | Captured | Unstarted | SDK answer-call starts | Nonempty | End-to-end accepted / captured | Semantic adequate / reviewed | R / G / A / C / L | Finish reasons | Failed SDK steps | Mean end-to-end | Known USD | Unknown SDK usage | Jev fallback / traces |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|
| qwen3-30b | full-inline | 169 | 169 | 0 | 169 | 169 | 79/169 | 79/169 | 1.78 / 1.40 / 1.95 / 1.73 / 1.92 | stop:169 | 0 | 3.9s | $0.041877 | 0 | 0/0 |
| qwen3-30b | compact-inline | 169 | 169 | 0 | 169 | 169 | 76/169 | 76/169 | 1.78 / 1.40 / 1.97 / 1.72 / 1.90 | stop:169 | 0 | 4.0s | $0.041562 | 0 | 0/0 |
| qwen3-30b | compact-lazy | 169 | 169 | 0 | 338 | 169 | 63/169 | 63/169 | 1.70 / 1.29 / 1.89 / 1.64 / 1.90 | stop:169 | 0 | 7.2s | $0.057361 | 0 | 0/0 |
| qwen3-30b | jev-compact | 169 | 169 | 0 | 169 | 169 | 77/169 | 77/169 | 1.76 / 1.31 / 1.94 / 1.74 / 1.92 | stop:169 | 0 | 5.4s | $0.048732 | 0 | 79/169 |
| gemma4-26b | full-inline | 169 | 169 | 0 | 169 | 165 | 139/169 | 140/165 | 1.89 / 1.90 / 1.99 / 1.95 / 2.00 | stop:162, length:4, unreported:3 | 3 | 10.8s | $0.069573 | 3 | 0/0 |
| gemma4-26b | compact-inline | 169 | 169 | 0 | 169 | 164 | 142/169 | 142/164 | 1.90 / 1.90 / 1.99 / 1.96 / 2.00 | stop:161, length:7, unreported:1 | 1 | 10.2s | $0.069195 | 1 | 0/0 |
| gemma4-26b | compact-lazy | 169 | 169 | 0 | 328 | 157 | 121/169 | 121/157 | 1.83 / 1.82 / 1.97 / 1.93 / 2.00 | stop:156, unreported:11, length:2 | 11 | 15.6s | $0.067211 | 11 | 0/0 |
| gemma4-26b | jev-compact | 169 | 169 | 0 | 169 | 166 | 142/169 | 142/166 | 1.91 / 1.90 / 1.99 / 1.95 / 1.99 | stop:165, length:2, unreported:2 | 2 | 11.8s | $0.070455 | 2 | 79/169 |
| glm-4.7-flash | full-inline | 169 | 166 | 0 | 166 | 97 | 66/166 | 66/97 | 1.84 / 1.72 / 1.99 / 1.85 / 1.95 | stop:94, unreported:48, length:24 | 48 | 19.1s | $0.055626 | 48 | 0/0 |
| glm-4.7-flash | compact-inline | 169 | 166 | 0 | 166 | 98 | 61/166 | 62/98 | 1.80 / 1.66 / 1.98 / 1.81 / 1.96 | stop:98, unreported:46, length:22 | 46 | 18.4s | $0.053898 | 46 | 0/0 |
| glm-4.7-flash | compact-lazy | 169 | 166 | 0 | 336 | 146 | 42/166 | 42/146 | 1.57 / 1.14 / 1.66 / 1.47 / 1.90 | unreported:17, stop:146, tool-calls:2, length:1 | 17 | 16.1s | $0.052996 | 17 | 0/0 |
| glm-4.7-flash | jev-compact | 169 | 166 | 0 | 166 | 102 | 62/166 | 63/102 | 1.79 / 1.69 / 1.97 / 1.79 / 1.91 | stop:96, unreported:52, length:18 | 52 | 21.0s | $0.059130 | 52 | 79/166 |

End-to-end acceptance: 53.1% (1070/2016 captured attempts; empty/failed captures remain in denominator). 0 nonempty answers ungraded; lower bound 53.1% is not reported accuracy. Semantic adequacy is 1073/1771 reviewed nonempty answers (60.6%; partial=false). relevance 1.80/2, grounding 1.59/2, authority 1.94/2, clarity 1.79/2, language 1.95/2; semantic KPI coverage partial=false.

Shared comparison: 50 cases have all 12 model×arm variants nonempty with finishReason=stop (28 historically labelled held-out, 6 fresh complete; 12 fresh planned). Held-out labels include previously seen cases and are historical, not fresh evidence. The fresh subset is small and not representative.

Judge-flagged failure types are non-exclusive and subject to the independent audit; a rejected omission is not automatically wrong advice.

| Model | Arm | Critical flagged | Grounding 0 | Incomplete-only | Language below 2 |
|---|---|---:|---:|---:|---:|
| qwen3-30b | full-inline | 24 | 22 | 7 | 8 |
| qwen3-30b | compact-inline | 19 | 19 | 4 | 10 |
| qwen3-30b | compact-lazy | 27 | 26 | 4 | 9 |
| qwen3-30b | jev-compact | 34 | 34 | 5 | 9 |
| gemma4-26b | full-inline | 3 | 3 | 8 | 0 |
| gemma4-26b | compact-inline | 3 | 3 | 5 | 0 |
| gemma4-26b | compact-lazy | 6 | 6 | 9 | 0 |
| gemma4-26b | jev-compact | 3 | 3 | 8 | 1 |
| glm-4.7-flash | full-inline | 6 | 6 | 5 | 4 |
| glm-4.7-flash | compact-inline | 6 | 6 | 3 | 3 |
| glm-4.7-flash | compact-lazy | 41 | 34 | 1 | 13 |
| glm-4.7-flash | jev-compact | 6 | 5 | 6 | 6 |

Measured inference-cost estimates below include answer/tool/selector steps for nonempty, normally completed responses with complete usage only. Failed or usage-unknown calls are excluded, NOT free; these are not invoice totals or guaranteed future prices. Subscription judging is separate and unmetered here.

| Model | Arm | Fully costed complete responses | Mean USD / response | Responses / USD |
|---|---|---:|---:|---:|
| qwen3-30b | full-inline | 169 | $0.0002478 | 4036 |
| qwen3-30b | compact-inline | 169 | $0.0002459 | 4066 |
| qwen3-30b | compact-lazy | 169 | $0.0003394 | 2946 |
| qwen3-30b | jev-compact | 169 | $0.0002884 | 3468 |
| gemma4-26b | full-inline | 162 | $0.0004147 | 2411 |
| gemma4-26b | compact-inline | 161 | $0.0004041 | 2474 |
| gemma4-26b | compact-lazy | 156 | $0.0004213 | 2373 |
| gemma4-26b | jev-compact | 165 | $0.0004181 | 2392 |
| glm-4.7-flash | full-inline | 93 | $0.0004339 | 2304 |
| glm-4.7-flash | compact-inline | 95 | $0.0004113 | 2432 |
| glm-4.7-flash | compact-lazy | 145 | $0.0003518 | 2842 |
| glm-4.7-flash | jev-compact | 95 | $0.0004519 | 2213 |

| Shared cases: model | Arm | Complete variants | Final grades | Semantic adequate / reviewed | End-to-end accepted / final grades |
|---|---|---:|---:|---:|---:|
| qwen3-30b | full-inline | 50 | 50 | 30/50 (60.0%) | 30/50 (60.0%) |
| qwen3-30b | compact-inline | 50 | 50 | 26/50 (52.0%) | 26/50 (52.0%) |
| qwen3-30b | compact-lazy | 50 | 50 | 22/50 (44.0%) | 22/50 (44.0%) |
| qwen3-30b | jev-compact | 50 | 50 | 32/50 (64.0%) | 32/50 (64.0%) |
| gemma4-26b | full-inline | 50 | 50 | 48/50 (96.0%) | 48/50 (96.0%) |
| gemma4-26b | compact-inline | 50 | 50 | 49/50 (98.0%) | 49/50 (98.0%) |
| gemma4-26b | compact-lazy | 50 | 50 | 44/50 (88.0%) | 44/50 (88.0%) |
| gemma4-26b | jev-compact | 50 | 50 | 47/50 (94.0%) | 47/50 (94.0%) |
| glm-4.7-flash | full-inline | 50 | 50 | 41/50 (82.0%) | 41/50 (82.0%) |
| glm-4.7-flash | compact-inline | 50 | 50 | 41/50 (82.0%) | 41/50 (82.0%) |
| glm-4.7-flash | compact-lazy | 50 | 50 | 22/50 (44.0%) | 22/50 (44.0%) |
| glm-4.7-flash | jev-compact | 50 | 50 | 35/50 (70.0%) | 35/50 (70.0%) |

Strata coverage by role/language/style/freshness (model×arm detail is in JSON):

| Role / language / style / freshness | Cases | Planned variants | Captured variants | Nonempty answers |
|---|---:|---:|---:|---:|
| helper/en/adversarial/seen | 20 | 240 | 240 | 210 |
| helper/en/messy/seen | 20 | 240 | 240 | 209 |
| helper/en/normal/fresh | 2 | 24 | 24 | 24 |
| helper/en/normal/seen | 20 | 240 | 240 | 232 |
| helper/en/regression-or-tuning/seen | 12 | 144 | 144 | 137 |
| helper/es/normal/fresh | 1 | 12 | 12 | 11 |
| helper/es/regression-or-tuning/seen | 3 | 36 | 36 | 33 |
| helper/fr/normal/fresh | 1 | 12 | 12 | 12 |
| helper/fr/regression-or-tuning/seen | 3 | 36 | 36 | 36 |
| helper/he/normal/fresh | 1 | 12 | 12 | 11 |
| helper/he/regression-or-tuning/seen | 3 | 36 | 36 | 26 |
| helper/ru/normal/fresh | 1 | 12 | 12 | 10 |
| helper/ru/regression-or-tuning/seen | 3 | 36 | 36 | 33 |
| support/en/adversarial/seen | 20 | 240 | 236 | 185 |
| support/en/messy/fresh | 1 | 12 | 12 | 12 |
| support/en/messy/seen | 20 | 240 | 236 | 191 |
| support/en/normal/fresh | 1 | 12 | 12 | 10 |
| support/en/normal/seen | 20 | 240 | 236 | 207 |
| support/en/regression-or-tuning/seen | 12 | 144 | 144 | 131 |
| support/es/messy/fresh | 1 | 12 | 12 | 10 |
| support/fr/normal/fresh | 1 | 12 | 12 | 12 |
| support/he/normal/fresh | 1 | 12 | 12 | 12 |
| support/he/regression-or-tuning/seen | 1 | 12 | 12 | 7 |
| support/ru/messy/fresh | 1 | 12 | 12 | 10 |

Arm-level actual network starts/local refusals and transport timing are intentionally unassigned: each workflow stores one record-index list spanning all four arms. Provider timeouts can only be reported at workflow/model level. SDK-call starts and unknown SDK usage records may include local refusals; they are not proof of billable provider starts. Local refusals are not included in unknown paid reserves. End-to-end latency includes the observed workflow/pacing interval.

Summary generated 2026-10-11T21:35:07.081Z; source progress last updated 2026-10-11T21:29:03.517Z.
