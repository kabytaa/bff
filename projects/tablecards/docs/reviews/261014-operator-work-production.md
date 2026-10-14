# Operator work and test-user checkout — production release

Created: 2026-10-14
Last updated: 2026-10-14
Status: In progress — release gates and production verification outstanding
Repository baseline: `7a03c4f` on `build/operator-work-dev`; production baseline
`ee1e1d9`, main documentation baseline `41ba411`.

Andrew authorized review, cleanup, PR completion and production deployment on
2026-10-14. Scope is the existing no-charge preview plus shared Operator work and
operator-designated test checkout, not real billing or customer launch.

## Review findings and current evidence

| Area                                                | Status                   | Evidence / boundary                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Test checkout                                       | pass in development      | Exact operator designation; test Owner/all-test workspace; no provider-grant overwrite; pending purchase recheck; invitation/ownership isolation; flag removal preserves access. Two fresh hosted desktop/phone journeys pass.                                                                                           |
| Existing data                                       | pass                     | Eight previously approved Operator tables and optional `businessUsers.isTestUser`/additive `test_mock` source. Missing flag means false; no old-user marking, backfill or deletion. No additional schema/index change for release fixes.                                                                                 |
| Independent review                                  | fixes verified           | Astra found lost browser-tool response recovery and account-wide mail webhook fanout. Exact saved pending tools can be replayed without another model call. Signed foreign/ambiguous mail is rejected before persistence/fetch, including queued inbound rechecks. Targeted backend/UI regressions, types and lint pass. |
| Production AI caps                                  | pass setup               | Separate `bff-operator-prod`, global $3/day and $30/month fixed rules. A temporary tiny guard caused provider code 2045; exact original rules restored. Development caps unchanged. No purchase/top-up.                                                                                                                  |
| Production credentials                              | pass setup               | Separate generated runtime/event secrets and dedicated Resend key in native secret stores; no repository secrets. Production signed callback is prepared and disabled until activation.                                                                                                                                  |
| Quality                                             | accepted-risk            | Andrew accepted Gemma 4 + Jev/compact-v2 at 142/169 strict delivered answers (84.0%), below the 90–95% target. Support sends remain operator-controlled; future improvement deferred. See [comparison](../../support/evaluation-results/knowledge-matrix-2026-10-11T210245-209Z-summary.md).                             |
| Full repository gate                                | pass                     | Final `pnpm check` passes format, lint, boundaries, types, unit/integration tests, builds, bundle assertions, secret scanning and browser suites. Fresh policy/copy tests and 57 production-delivery tests pass. Independent release-wiring review finds no P1/P2 blocker.                                               |
| Deployment / live smoke                             | unverified               | Must pass before declaring this release complete.                                                                                                                                                                                                                                                                        |
| Personal Google / physical printing / real payments | not part of this release | Existing production public Google handoff smoke stops before entering credentials. Real billing and paying-customer launch remain later stages; no development identity grants in production.                                                                                                                            |

## Operational isolation

Shared code, authorization and event machinery stay generic. TableCards owns bot
content, event/KPI definitions, capabilities and branding. BFF retains exact
operator Send approval; neither the model nor a deploy/admin credential grants
human sending authority. The fixed receipt is automatic.

Development now uses `help-dev@tablecards.tofler.app` (configuration revision 9);
production will use `help@tablecards.tofler.app`. Both use the verified domain,
but independent webhooks/secrets and pre-persistence routing prevent account-wide
notifications from copying production cases into development. Frozen reply
envelopes and local token hashes preserve already-issued development reply routes.
Unknown/ambiguous recipients are acknowledged without storing content. Early
outgoing callback sender fallback is bounded to 100 local environments; existing
provider-ID callbacks use their index. Above that bound new early callbacks fail
closed and need a reviewed registry-index change, not a wider scan.

Production provider exposes only customer runtime and private raster conversion;
evaluation/experimental routes are absent. Private PNG/JPEG regeneration remains
fail-closed without original-file fallback. Provider caps are approximate and can
overshoot with concurrency; no app spending tables or new alert system are added.

## Cleanup

Source, tests, architecture history and useful frozen evaluation evidence are
retained. The large evaluation corpus is referenced by manifests and result
reports; it is not disposable garbage. Generated caches/browser/test artifacts
are excluded from Git; no customer data or durable decision record is deleted.
Nx's reproducible cache was reset after validation. Old ignored browser/build and
TableCards test outputs were moved to `/tmp/bff-release-artifacts-dhEMH7` for
recovery, not committed or mixed with current release evidence. Native secret
stores and local environment/Convex state were preserved.
