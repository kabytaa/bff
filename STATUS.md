# Business Factory Handoff

Updated: 2026-10-07.

## Current state

- Builds 1–3 meet their authorized production boundaries. Build 3 is the
  explicitly **no-charge preview**, not real billing or paying-customer launch.
  [Production](https://tablecards.tofler.app) and
  [development](https://tablecards-dev.tofler.app) are published. Andrew
  authorized production setup, merge, deployment and the final development
  refresh; [PR #1](https://github.com/kabytaa/bff/pull/1) merged at `660f5cf`.
- Start with the [production release review](projects/tablecards/docs/reviews/261007-build-3-production-release.md).
  Latest runtime `bc85dc6` passed full main CI/deployment, local production smoke,
  27/27 hosted development cases (7.6m), 81 backend tests and 6/6 production public
  browser cases. Earlier 2/2 manual AI tests remain valid for unchanged AI code.
  Release checks found and fixed headers/CSP, first-PDF navigation and transient
  immutable print-asset reads; all affected checks were rerun successfully.
  Documentation commit `3f41d88` does not require publication: its old-policy CI
  run was cancelled before deployment at Andrew's request. Both environments
  already contain the verified runtime. Markdown-only changes now skip CI and
  deployment; non-Markdown or mixed changes retain the normal gate. Live
  metadata identifies the last deployed release, not newer prose. See
  [CI scope](tools/production-delivery/README.md#ci-scope). Local checks are
  proportional: affected tests for small fixes, full regression at meaningful
  release boundaries, no browser/AI reruns for documentation. The filter's
  focused verification passes: 49 release-tool tests, lint and typecheck.
- Production BFF `exuberant-goldfinch-830` and separate TableCards
  `clean-gerbil-451` use Google-only identity, no dummy login/AI fixtures,
  same-site session gateways and shared no-charge checkout. Development remains
  `compassionate-buffalo-689` / `scrupulous-hawk-991`. Both have independent
  **$1 estimated gross AI inference/day** guards; Cloudflare credits/invoice are
  shared. Optional style images and real four-choice generation are implemented.
- Fresh authenticated **production** callback/export/checkout/team round-trips
  remain unverified without personal Google credentials. The real credential
  popup passes; its initialization origin warning is recorded, not concealed.
  Development full journeys are not misrepresented as production execution.
  Andrew accepted his earlier print for Build 3; detailed physical measurements
  remain final MVP pre-launch work. Six-card landscape stays a development trial.

## Next work

Build 4: verified payment/subscription lifecycle, provider configuration and
renewal/restriction/retention tests. Build 5 owns two-way support; Build 6
analytics/monitoring/usable backoffice; Build 7 commercial/customer-launch
acceptance. These are not delivered by simulated checkout.

The [completed core plan](.agent/plans/260927-build-3-tablecards-core.md#2026-10-07-production-execution-result)
preserves historical scope and the authorized release revision. TableCards
canonical docs live beside its code: [README/router](projects/tablecards/README.md)
links Product, Application, Architecture and Operations. Shared BFF explanations
and root plans/ADRs keep their existing ownership. Business lifecycle skills were
[forward-tested](docs/factory/reviews/261006-business-lifecycle-skills-forward-tests.md);
user usability review is optional, not a routine completion blocker.

## Guardrails

- Structural table/schema changes require confirmation by default; authorized
  unattended development exceptions require documented migration impact and
  reporting. This release deployed already-agreed compatible schemas, with no
  new structural change or destructive backfill.
- “Commit” includes push, not implicit merge/deploy authority. Keep credentials
  and private customer/browser artifacts out of Git. Current main release
  publication was explicitly authorized.
- [Provider cost attribution](docs/architecture/future-ideas.md#per-user-and-per-account-provider-cost-attribution)
  remains a future idea; estimated AI admission is not a financial cost ledger.
