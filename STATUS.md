# Business Factory Handoff

Updated: 2026-10-07.

## Current state

- Builds 1–3 were released at their authorized production boundaries. TableCards is live in
  [production](https://tablecards.tofler.app) and
  [development](https://tablecards-dev.tofler.app) as a **no-charge preview**,
  not real billing or customer launch.
- Application runtime `bc85dc6` passed CI/deployment, production smoke/public
  browser checks and full development journeys. Detailed versions, tests and
  release history are in the [release review](projects/tablecards/docs/reviews/261007-build-3-production-release.md).
- Documentation consolidation/cleanup passed formatting and local link checks;
  runtime is unchanged.
  Markdown-only changes skip CI/deployment; see [CI scope](tools/production-delivery/README.md#ci-scope).
- Approved reflection update: [brainstorm-ideas](.agents/skills/brainstorm-ideas/SKILL.md)
  shapes ideas before planning; routine prioritization stays in the roadmap.

## Immediate next work

- Publish and verify the authorized no-schema balance-read correction in both
  environments. Local reproduction and focused regression pass; release pending.
- Continue the [backoffice choices in the single MVP roadmap](docs/factory/mvp-delivery-plan.md#build-6--analytics-monitoring-and-usable-backoffice):
  read-only scope, helper permissions and essential customer/activity views.
  Give options, trade-offs and a recommendation; no implementation is approved yet.
- Build 4 hosted payment work awaits Paddle access/confirmed terms. Monitoring
  remains later MVP work, before launch; no Pro upgrade or alert setup now.
  Telegram is selected, not configured. Early QA reports come through Andrew.

## Open issue and outstanding evidence

- The production fresh-login/Projects crash was reproduced locally and through
  a read-only production query. The narrow fix returns zero for an unallocated
  balance while continuing to deny spending. The separate promised Free welcome
  AI grant is not provisioned in production; it remains open. See the
  [scoped diagnosis](projects/tablecards/docs/reviews/261007-build-3-production-release.md#follow-up-production-default-access-failure--2026-10-07).
- Fresh authenticated production callback/export/checkout/team journeys remain
  **unverified** without personal Google credentials; the popup passes but an
  origin warning remains recorded. Development passes do not prove these flows.
- Andrew accepted his print for Build 3. Detailed physical checks remain for MVP
  launch; six-card landscape is still a development trial.

Product decisions: [TableCards Product](projects/tablecards/docs/product.md).
Technical/operational docs: [TableCards router](projects/tablecards/README.md).
Persistent workflow and safety rules: [AGENTS.md](AGENTS.md).
