# Business Factory Handoff

Updated: 2026-10-07.

## Current state

- Builds 1–3 were released at their authorized production boundaries. TableCards is live in
  [production](https://tablecards.tofler.app) and
  [development](https://tablecards-dev.tofler.app) as a **no-charge preview**,
  not real billing or customer launch.
- Production release `badf706` passed CI/deployment and smoke. Mobile creator
  actions now stay inside their cards; desktop has only one Sign out button.
  Development web has the same corrections; unchanged development services
  retain their prior releases. The prior navigation/icons, heading-focus and
  default-Free balance-read corrections remain in place.
- Scoped desktop/mobile development flows and two fresh public production
  checks passed. No schema/migration or paid AI call. Exact versions, evidence
  and limits are in the [release review](projects/tablecards/docs/reviews/261007-build-3-production-release.md#accepted-inline-actions-and-single-sign-out--2026-10-07).
- Markdown-only changes skip CI/deployment; see [CI scope](tools/production-delivery/README.md#ci-scope).

## Immediate next work

- In progress: Andrew's authorized long-name/two-line and mixed-example batch.
  Development preview/save/export/download and impossible-fit checks passed
  4/4 on desktop/mobile. Next: commit/push, guarded production publication and
  public production checks; no schema or migration. See the
  [release review](projects/tablecards/docs/reviews/261007-build-3-production-release.md#balanced-long-names-and-mixed-examples--2026-10-07).
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
