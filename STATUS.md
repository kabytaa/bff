# Business Factory Handoff

Updated: 2026-10-07.

## Current state

- Builds 1–3 were released at their authorized production boundaries. TableCards is live in
  [production](https://tablecards.tofler.app) and
  [development](https://tablecards-dev.tofler.app) as a **no-charge preview**,
  not real billing or customer launch.
- Production release `a5d304f` passed CI/deployment and smoke; the previously
  failing default-Free balance query now succeeds. Shared BFF development has
  the same fix; unchanged development product surfaces retain `bc85dc6`.
  Targeted development and public production phone/desktop checks pass. Versions and
  release history are in the [release review](projects/tablecards/docs/reviews/261007-build-3-production-release.md).
- The crash fix changes one balance-read branch; no schema, migration, grant
  creation or paid inference. Unallocated spending remains denied.
  Markdown-only changes skip CI/deployment; see [CI scope](tools/production-delivery/README.md#ci-scope).
- Approved reflection update: [brainstorm-ideas](.agents/skills/brainstorm-ideas/SKILL.md)
  shapes ideas before planning; routine prioritization stays in the roadmap.

## Immediate next work

- Resolve production-safe Free welcome-credit provisioning separately; do not
  enable development mocks or fabricate paid grants. Any schema change needs
  Andrew's confirmation.
- Continue the [backoffice choices in the single MVP roadmap](docs/factory/mvp-delivery-plan.md#build-6--analytics-monitoring-and-usable-backoffice):
  read-only scope, helper permissions and essential customer/activity views.
  Give options, trade-offs and a recommendation; no implementation is approved yet.
- Build 4 hosted payment work awaits Paddle access/confirmed terms. Monitoring
  remains later MVP work, before launch; no Pro upgrade or alert setup now.
  Telegram is selected, not configured. Early QA reports come through Andrew.

## Open issue and outstanding evidence

- The fresh-login/Projects crash is fixed and deployed. The separate promised
  Free welcome AI grant is not provisioned for default production accounts;
  they now honestly show zero remaining instead of failing. See the
  [scoped diagnosis](projects/tablecards/docs/reviews/261007-build-3-production-release.md#follow-up-production-default-access-failure--2026-10-07).
- Fresh authenticated production callback/export/checkout/team journeys remain
  **unverified** without personal Google credentials; the popup passes but an
  origin warning remains recorded. Development passes do not prove these flows.
- Andrew accepted his print for Build 3. Detailed physical checks remain for MVP
  launch; six-card landscape is still a development trial.

Product decisions: [TableCards Product](projects/tablecards/docs/product.md).
Technical/operational docs: [TableCards router](projects/tablecards/README.md).
Persistent workflow and safety rules: [AGENTS.md](AGENTS.md).
