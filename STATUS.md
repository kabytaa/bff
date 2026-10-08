# Business Factory Handoff

Updated: 2026-10-08.

## Current state

- Builds 1–3 were released at their authorized production boundaries. TableCards is live in
  [production](https://tablecards.tofler.app) and
  [development](https://tablecards-dev.tofler.app) as a **no-charge preview**,
  not real billing or customer launch.
- Release `ca30bb9` passed CI, production deployment and smoke. Free accounts
  receive their promised lifetime AI batch on the next authorized access request;
  used credits and upgraded plans are never reset. Andrew approved the sole
  compatible schema change: `accountAccessGrants.source` also accepts `default`.
  No migration/deletion or paid AI call. Prior UI/PDF fixes remain.
- Both changed development backends identify this release; unchanged development
  services retain their prior releases. 196 local tests and 2 scoped desktop/mobile
  hosted account/reload/save/generation/consumption checks passed. Exact versions,
  evidence and limits are in the
  [welcome-credit review](projects/tablecards/docs/reviews/261007-build-3-production-release.md#free-welcome-credit-provisioning--2026-10-08).
- Markdown-only changes skip CI/deployment; see [CI scope](tools/production-delivery/README.md#ci-scope).

## Immediate next work

- Continue the [backoffice choices in the single MVP roadmap](docs/factory/mvp-delivery-plan.md#build-6--analytics-monitoring-and-usable-backoffice):
  read-only scope, helper permissions and essential customer/activity views.
  Give options, trade-offs and a recommendation; no implementation is approved yet.
- Build 4 hosted payment work awaits Paddle access/confirmed terms. Monitoring
  remains later MVP work, before launch; no Pro upgrade or alert setup now.
  Telegram is selected, not configured. Early QA reports come through Andrew.

## Outstanding evidence

- Fresh authenticated production callback/export/checkout/team journeys remain
  **unverified** without personal Google credentials; the popup passes but an
  origin warning remains recorded. Development passes do not prove these flows.
- Andrew accepted his print for Build 3. Detailed physical checks remain for MVP
  launch; six-card landscape is still a development trial.

Product decisions: [TableCards Product](projects/tablecards/docs/product.md).
Technical/operational docs: [TableCards router](projects/tablecards/README.md).
Persistent workflow and safety rules: [AGENTS.md](AGENTS.md).
