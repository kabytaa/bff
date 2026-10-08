# Business Factory Handoff

Updated: 2026-10-08.

## Current state

- Builds 1–3 were released at their authorized production boundaries. TableCards is live in
  [production](https://tablecards.tofler.app) and
  [development](https://tablecards-dev.tofler.app) as a **no-charge preview**,
  not real billing or customer launch.
- Production release `d8e83f2` passed CI/deployment and smoke. Long names now
  use balanced two-line layouts; examples mix lengths/accents, and old PDF
  caches regenerate on the next export. Development has the same behavior;
  unchanged development services retain their prior releases. Navigation/icons,
  inline mobile actions, single Sign out and default-Free balance fixes remain.
- Scoped desktop/mobile development preview/save/PDF/download checks and two
  fresh public production checks passed. No schema/migration or paid AI call.
  Exact versions, evidence and limits are in the
  [release review](projects/tablecards/docs/reviews/261007-build-3-production-release.md#balanced-long-names-and-mixed-examples--2026-10-07).
- Markdown-only changes skip CI/deployment; see [CI scope](tools/production-delivery/README.md#ci-scope).

## Immediate next work

- Andrew authorized fixing/deploying Free welcome-credit provisioning.
  He approved the compatible `accountAccessGrants.source` enum addition
  `default`. Both changed development backends are deployed; 196 local tests,
  focused lint/type/secret/boundary checks and 2 desktop/mobile hosted checks
  pass. Production publication is next. Existing rows remain valid; no migration
  or deletion. See the [welcome-credit evidence](projects/tablecards/docs/reviews/261007-build-3-production-release.md#free-welcome-credit-provisioning--2026-10-08).
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
