# Business Factory Handoff

Updated: 2026-10-08.

## Current state

- Builds 1–3 were released at their authorized production boundaries. TableCards is live in
  [production](https://tablecards.tofler.app) and
  [development](https://tablecards-dev.tofler.app) as a **no-charge preview**,
  not real billing or customer launch.
- Release `c16df8d` is committed/pushed and passed CI, production deployment and
  smoke. Astra agreed to keep Duplicate/Archive in Projects and remove the saved
  editor banner. Project name is editable above every step before/after saving;
  name-only edits retain save, stale-download and departure protections. A
  same-route Save bypass bug was also fixed. No schema/API change or paid AI call.
- Development web identifies this release; unchanged development services retain
  their prior releases. 115 web tests, 8 focused desktop/mobile development
  journeys and 4 public production browser checks passed. Astra's code and visual
  reviews passed. Versions and evidence are in the
  [naming/actions review](projects/tablecards/docs/reviews/261007-build-3-production-release.md#project-naming-and-editor-actions--2026-10-08).
- The earlier Free welcome-credit fix remains: one lifetime batch is initialized
  once, never resetting consumption or upgraded access. Its approved compatible
  enum addition required no migration; see the
  [welcome-credit review](projects/tablecards/docs/reviews/261007-build-3-production-release.md#free-welcome-credit-provisioning--2026-10-08).
- Markdown-only changes skip CI/deployment; see [CI scope](tools/production-delivery/README.md#ci-scope).

## Immediate next work

- In progress: Andrew approved relabelling Duplicate as Make a copy. Behavior
  and schemas stay unchanged; focused tests and both deployments pending.
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
