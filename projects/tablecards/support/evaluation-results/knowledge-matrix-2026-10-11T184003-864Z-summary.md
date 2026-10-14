# Knowledge matrix aggregate: knowledge-matrix-2026-10-11T184003-864Z

Created 2026-10-11T18:40:03.864Z; updated 2026-10-11T19:46:46.641Z. Capture is observational; supervised grades are not ground truth.

Planned cases 169; model-workflows planned/captured/unstarted 507/217/290. Planned arm attempts 2028; captured attempts 868; unstarted attempts 1160.
Transport: 1304 actual network starts, 0 local refusals; known estimate $0.293626, unknown worst-case reserve $0.221167, total unknown. Queue pacing wait 1525.9s. Unattributed Jev selector calls: 1 network, 0 locally refused.

| Model | Arm | Planned | Captured | Unstarted | SDK answer-call starts | Nonempty | End-to-end accepted / captured | Semantic adequate / reviewed | R / G / A / C / L | Finish reasons | Failed SDK steps | Mean end-to-end | Known USD | Unknown SDK usage | Jev fallback / traces |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|
| qwen3-30b | full-inline | 169 | 73 | 96 | 73 | 73 | 32/73 | 32/73 | 1.77 / 1.38 / 1.93 / 1.77 / 1.82 | stop:73 | 0 | 5.3s | $0.018481 | 0 | 0/0 |
| qwen3-30b | compact-inline | 169 | 73 | 96 | 73 | 73 | 27/73 | 27/72 | 1.79 / 1.33 / 1.96 / 1.71 / 1.76 | stop:73 | 0 | 5.3s | $0.018264 | 0 | 0/0 |
| qwen3-30b | compact-lazy | 169 | 73 | 96 | 146 | 73 | 22/73 | 22/72 | 1.69 / 1.14 / 1.90 / 1.67 / 1.76 | stop:73 | 0 | 9.7s | $0.025388 | 0 | 0/0 |
| qwen3-30b | jev-compact | 169 | 73 | 96 | 73 | 73 | 29/73 | 29/72 | 1.78 / 1.15 / 1.88 / 1.76 / 1.81 | stop:73 | 0 | 7.9s | $0.021118 | 0 | 30/73 |
| gemma4-26b | full-inline | 169 | 73 | 96 | 73 | 70 | 59/73 | 60/68 | 1.93 / 1.93 / 1.99 / 1.97 / 2.00 | stop:68, unreported:3, length:2 | 3 | 12.5s | $0.029466 | 3 | 0/0 |
| gemma4-26b | compact-inline | 169 | 73 | 96 | 73 | 68 | 57/73 | 57/67 | 1.90 / 1.91 / 2.00 / 1.96 / 2.00 | stop:65, length:7, unreported:1 | 1 | 11.6s | $0.030022 | 1 | 0/0 |
| gemma4-26b | compact-lazy | 169 | 73 | 96 | 140 | 67 | 48/73 | 48/66 | 1.80 / 1.79 / 1.98 / 1.94 / 2.00 | stop:67, unreported:6 | 6 | 17.7s | $0.027878 | 6 | 0/0 |
| gemma4-26b | jev-compact | 169 | 73 | 96 | 73 | 71 | 61/73 | 61/69 | 1.93 / 1.96 / 1.99 / 2.00 / 2.00 | stop:71, unreported:2 | 2 | 14.6s | $0.029826 | 2 | 30/73 |
| glm-4.7-flash | full-inline | 169 | 71 | 98 | 71 | 39 | 27/71 | 27/39 | 1.90 / 1.72 / 2.00 / 1.92 / 1.90 | stop:39, length:9, unreported:23 | 23 | 20.5s | $0.022587 | 23 | 0/0 |
| glm-4.7-flash | compact-inline | 169 | 71 | 98 | 71 | 39 | 27/71 | 27/39 | 1.82 / 1.69 / 2.00 / 1.87 / 1.95 | unreported:22, stop:41, length:8 | 22 | 19.6s | $0.021809 | 22 | 0/0 |
| glm-4.7-flash | compact-lazy | 169 | 71 | 98 | 142 | 60 | 20/71 | 20/60 | 1.68 / 1.08 / 1.65 / 1.60 / 1.87 | unreported:10, stop:60, tool-calls:1 | 10 | 17.1s | $0.021222 | 10 | 0/0 |
| glm-4.7-flash | jev-compact | 169 | 71 | 98 | 71 | 47 | 31/71 | 31/47 | 1.85 / 1.77 / 1.94 / 1.85 / 1.83 | stop:45, length:6, unreported:20 | 20 | 23.1s | $0.025717 | 20 | 31/71 |

End-to-end acceptance: unknown/incomplete (440/868 captured attempts; empty/failed captures remain in denominator). 9 nonempty answers ungraded; lower bound 50.7% is not reported accuracy. Semantic adequacy is 441/744 reviewed nonempty answers (59.3%; partial=true). relevance 1.82/2, grounding 1.55/2, authority 1.93/2, clarity 1.83/2, language 1.89/2; semantic KPI coverage partial=true.

Shared comparison: 22 cases have all 12 model×arm variants nonempty with finishReason=stop (4 historically labelled held-out, 6 fresh complete; 12 fresh planned). Held-out labels include previously seen cases and are historical, not fresh evidence. The fresh subset is small and not representative.

| Shared cases: model | Arm | Complete variants | Final grades | Semantic adequate / reviewed | End-to-end accepted / final grades |
|---|---|---:|---:|---:|---:|
| qwen3-30b | full-inline | 22 | 22 | 11/22 (50.0%) | 11/22 (50.0%) |
| qwen3-30b | compact-inline | 22 | 22 | 10/22 (45.5%) | 10/22 (45.5%) |
| qwen3-30b | compact-lazy | 22 | 22 | 6/22 (27.3%) | 6/22 (27.3%) |
| qwen3-30b | jev-compact | 22 | 22 | 12/22 (54.5%) | 12/22 (54.5%) |
| gemma4-26b | full-inline | 22 | 22 | 22/22 (100.0%) | 22/22 (100.0%) |
| gemma4-26b | compact-inline | 22 | 22 | 22/22 (100.0%) | 22/22 (100.0%) |
| gemma4-26b | compact-lazy | 22 | 22 | 18/22 (81.8%) | 18/22 (81.8%) |
| gemma4-26b | jev-compact | 22 | 22 | 22/22 (100.0%) | 22/22 (100.0%) |
| glm-4.7-flash | full-inline | 22 | 22 | 19/22 (86.4%) | 19/22 (86.4%) |
| glm-4.7-flash | compact-inline | 22 | 22 | 19/22 (86.4%) | 19/22 (86.4%) |
| glm-4.7-flash | compact-lazy | 22 | 22 | 10/22 (45.5%) | 10/22 (45.5%) |
| glm-4.7-flash | jev-compact | 22 | 22 | 17/22 (77.3%) | 17/22 (77.3%) |

Strata coverage by role/language/style/freshness (model×arm detail is in JSON):

| Role / language / style / freshness | Cases | Planned variants | Captured variants | Nonempty answers |
|---|---:|---:|---:|---:|
| helper/en/adversarial/seen | 20 | 240 | 72 | 60 |
| helper/en/messy/seen | 20 | 240 | 72 | 60 |
| helper/en/normal/fresh | 2 | 24 | 24 | 24 |
| helper/en/normal/seen | 20 | 240 | 72 | 68 |
| helper/en/regression-or-tuning/seen | 12 | 144 | 72 | 68 |
| helper/es/normal/fresh | 1 | 12 | 12 | 11 |
| helper/es/regression-or-tuning/seen | 3 | 36 | 36 | 33 |
| helper/fr/normal/fresh | 1 | 12 | 12 | 12 |
| helper/fr/regression-or-tuning/seen | 3 | 36 | 36 | 36 |
| helper/he/normal/fresh | 1 | 12 | 12 | 11 |
| helper/he/regression-or-tuning/seen | 3 | 36 | 36 | 26 |
| helper/ru/normal/fresh | 1 | 12 | 12 | 10 |
| helper/ru/regression-or-tuning/seen | 3 | 36 | 36 | 33 |
| support/en/adversarial/seen | 20 | 240 | 68 | 52 |
| support/en/messy/fresh | 1 | 12 | 12 | 12 |
| support/en/messy/seen | 20 | 240 | 72 | 52 |
| support/en/normal/fresh | 1 | 12 | 12 | 10 |
| support/en/normal/seen | 20 | 240 | 68 | 57 |
| support/en/regression-or-tuning/seen | 12 | 144 | 72 | 67 |
| support/es/messy/fresh | 1 | 12 | 12 | 10 |
| support/fr/normal/fresh | 1 | 12 | 12 | 12 |
| support/he/normal/fresh | 1 | 12 | 12 | 12 |
| support/he/regression-or-tuning/seen | 1 | 12 | 12 | 7 |
| support/ru/messy/fresh | 1 | 12 | 12 | 10 |

Arm-level actual network starts/local refusals and transport timing are intentionally unassigned: each workflow stores one record-index list spanning all four arms. Provider timeouts can only be reported at workflow/model level. SDK-call starts and unknown SDK usage records may include local refusals; they are not proof of billable provider starts. Local refusals are not included in unknown paid reserves. End-to-end latency includes the observed workflow/pacing interval.

Summary generated 2026-10-11T20:09:28.454Z; source progress last updated 2026-10-11T19:46:46.641Z.
