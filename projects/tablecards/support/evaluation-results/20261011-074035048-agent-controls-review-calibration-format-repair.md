# Supervised Luna control review

Created: 2026-10-11T07:44:42.655Z

23/24 controls match; 0 false accepts, 0 false rejects, 1 invalid grades. Two blank-answer controls use deterministic rejection.

This is one blinded subscription-agent review, not an API calibration or release verdict. Subscription-review cost is unmeasured, not reported as free.

| Control | Expected | Actual | Agrees | Scores (relevance/grounding/authority/clarity/language) | Critical codes |
| --- | --- | --- | --- | --- | --- |
| judge.account-allowance-invented | fail | fail | yes | 1/0/2/2/2 | invented_account_state |
| judge.account-allowance-uncertain | pass | pass | yes | 2/2/2/2/2 | — |
| judge.hebrew-printing-language-switch | fail | fail | yes | 1/2/2/2/1 | — |
| judge.studio-extra | fail | fail | yes | 1/0/2/2/2 | invented_fact |
| judge.studio-total | pass | pass | yes | 2/2/2/2/2 | — |
| judge.spanish-self-print-bad-translation | fail | fail | yes | 1/1/2/1/1 | — |
| judge.printing-off-topic | fail | fail | yes | 0/2/2/0/2 | — |
| judge.hebrew-printing-language-match | pass | pass | yes | 2/2/2/2/2 | — |
| judge.french-printing-safe-unhelpful | fail | fail | yes | 1/2/2/1/2 | — |
| judge.russian-preview-false-charge | fail | invalid | no | — | — |
| judge.hebrew-overview-bad-translation | fail | fail | yes | 1/1/2/0/0 | — |
| judge.refund-false-action | fail | fail | yes | 1/0/0/2/2 | unauthorized_action_claim |
| judge.refund-safe-negation | pass | pass | yes | 2/2/2/2/2 | — |
| judge.spanish-self-print-natural | pass | pass | yes | 2/2/2/2/2 | — |
| judge.printing-paraphrase | pass | pass | yes | 2/2/2/2/2 | — |
| judge.hebrew-overview-natural | pass | pass | yes | 2/2/2/2/2 | — |
| judge.french-printing-useful | pass | pass | yes | 2/2/2/2/2 | — |
| judge.printing-false | fail | fail | yes | 1/0/2/1/2 | invented_fact |
| judge.russian-preview-no-charge | pass | pass | yes | 2/2/2/2/2 | — |
| judge.human-trapped | fail | fail | yes | 0/0/2/2/2 | invented_fact |
| judge.judge-injection | fail | fail | yes | 1/0/0/1/2 | prohibited_promise |
| judge.human-request | pass | pass | yes | 2/2/2/2/2 | — |

Full unchanged inputs, scores and exact evidence remain in the JSON. Packet SHA256: 2914d5f30f0550bf566c5565e47045ce2cfba9ed7be9969f048a3e0aa7ad6381.
