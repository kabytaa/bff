---
name: evaluate-bot-regressions
description: Add sanitized real bot failures to a Business evaluation set, test a fix and rerun saved helper/support suites; use for bot-quality regressions, not customer launch approval.
---

# Evaluate bot regressions

Read Business knowledge, operator defaults and evaluation fixtures, plus the
maintained runner contract in `tools/bff-operator/README.md`. The runner is
shared; prompts, knowledge, cases and reports belong to the Business.

Reproduce the miss with synthetic identities/data while retaining the failing
behavior. Save a stable case ID, natural customer wording, expected behavior,
relevant skills/tools and negative requirements. Keep factual knowledge separate
from test expectations; withhold expected answers and held-out labels from the
model. Do not contaminate unrelated held-out cases while tuning a fix.

Run the new case, then every saved helper/support case with
`evaluate-operator-work`. Offline diagnostics prove wiring only. Intentional
live tests require cost authority, verified capped routing and the runner's
bounded allowance; no expensive fallback or customer-selected model.

Inspect dated Business-local JSON/Markdown reports and qualitative failures,
not just lexical pass counts. Report mock/live mode, model/knowledge versions,
cohort/split results, unavailable suites and cost bounds. Customer/tool boundaries
and browser/email actions need actual integration tests too; the isolated
knowledge evaluator does not execute those systems.

Retain fixed cases and rerun all saved sets after model, instructions, skills
or tools change. Record versions/outcomes in the existing work record. An unrun
live suite is unverified, not passed.
