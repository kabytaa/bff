# Operator work and test-user checkout — production release

Created: 2026-10-14
Last updated: 2026-10-14
Status: Completed — authorized no-charge production checkpoint deployed and verified
Repository baseline: `7a03c4f` on `build/operator-work-dev`; production baseline
`ee1e1d9`, main documentation baseline `41ba411`.

Andrew authorized review, cleanup, PR completion and production deployment on
2026-10-14. Scope is the existing no-charge preview plus shared Operator work and
operator-designated test checkout, not real billing or customer launch.

## Review findings and current evidence

| Area                                                | Status                                          | Evidence / boundary                                                                                                                                                                                                                                                    |
| --------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository gates                                    | pass                                            | Full `pnpm check`, 182 backend tests, 57 delivery tests, independent Astra safety and release reviews.                                                                                                                                                                 |
| Test checkout                                       | pass in development; production denial verified | Exact operator designation, test Owner/all-test workspace, pending-purchase recheck, provider-grant protection and invitation/ownership isolation. Two fresh hosted desktop/phone journeys; production unauthenticated designation denied.                             |
| Schema / data                                       | pass                                            | Eight approved Operator tables, optional `businessUsers.isTestUser` and additive `test_mock` source. Missing flag=false; no backfill, old-user marking or deletion. Release fixes add no schema/index changes.                                                         |
| Production chat / email                             | pass                                            | Two real helper answers with saved Gemma/Jev provenance, actual email receipt and correlated follow-up, private regenerated PNG, unsent support draft. Details below.                                                                                                  |
| Browser / accessibility checks                      | pass within tested scope                        | 14/14 real production Chromium/mobile-WebKit checks; focus return, containment, disclosure/contact links and actual Google handoff. Earlier development keyboard/enlarged-text evidence retained. Not physical-device or accessibility-conformance certification.      |
| Security / privacy                                  | pass within tested scope                        | Unsigned webhook=403, valid signed self-sender ignored with no row, anonymous preview/designation denied, zero production-mail receipts copied to development. Operator automation explicitly disabled in production. Native secret stores; no repository credentials. |
| Spending limits                                     | pass setup; residual risk                       | Separate authenticated production gateway, global $3/day and $30/month fixed rules; temporary tiny-limit blocking proof=2045, exact limits restored. Concurrency overshoot remains possible; no new purchase/top-up. Native billing alerts remain unconfigured.        |
| Answer quality                                      | accepted-risk                                   | Andrew accepted Gemma/Jev at 142/169 strict answers (84%), below the deferred 90–95% goal. [Frozen comparison](../../support/evaluation-results/knowledge-matrix-2026-10-11T210245-209Z-summary.md); these integration smokes do not replace it.                       |
| Authenticated production customer/operator journeys | unverified                                      | No personal Google credentials entered or development identity admitted to production. Positive test-user/operator journeys are development evidence, not a claimed production purchase/Send test.                                                                     |
| Physical printing / commercial launch               | outside this release                            | Physical launch acceptance, real billing and commercial/legal certification remain later stages. Rich logo/accent email branding is not implemented; current mail has configured sender/name/copy and escaped HTML/plain text.                                         |

## Production execution evidence

- [PR #2](https://github.com/kabytaa/bff/pull/2) merged at `41cf45b`; the
  loop-protection follow-up is `40e16d3`, Contact-link fix is `d5600d8`.
  Their main CI validation, deployment and infrastructure smoke passed. Runtime
  at functional verification was `d5600d8`. The final test-harness-only
  correction `b260092` passed normal CI, production deployment and infrastructure
  smoke. No model or payment behavior changed. Public metadata for TableCards,
  backoffice and auth, plus BFF/TableCards/gateway health, all identify the exact
  `b260092a74bc85ae7aa9a1ba8374cc83f043e1c2` release.
- Production Business configuration **revision 1**: both bots v6,
  `gemma4-26b`, Jev, mandatory basics/contact, the same accepted compact-v2
  knowledge. Separate runtime/event secrets and a dedicated Resend key are in
  native stores. Webhook `f39d1ee6-7171-42c1-b85e-5e84a318a7a1` was enabled
  only after the loop-protected backend was published.
- Real public desktop and phone helper questions returned useful Actual
  Size/100% printing guidance; saved runs are completed Gemma/Jev in
  `tablecards-production`, not mocks. Screens were inspected. The temporary
  capture driver initially queried a public conversation ID as a native ID;
  that inspection was corrected against the existing saved answer without
  repeating the paid desktop question.
- Synthetic Gmail intake with a tiny PNG created **one case, one delivered
  automatic receipt, one unsent suggestion**. The 32×32 regenerated PNG is ready
  in private storage. The receipt arrived in Gmail with
  `Auto-Submitted: auto-replied` and `X-Auto-Response-Suppress: All`. A real reply to its scoped
  reply address produced **two incoming messages on that same case**, without a
  second receipt or substantive reply delivery. Development stored **zero**
  receipts for those production incoming/outgoing provider IDs.
- Live production negatives: unsigned webhook=403; correctly signed synthetic
  self-sender event=200 ignored with zero receipt rows; private preview and
  test-user designation both return `UNAUTHENTICATED` without operator identity.
  No production test users were fabricated or seeded, and no operator approval
  was bypassed to send the model's draft.
- The first full public run had 12 passes/two stale test expectations: Contact
  had changed from a policy page into the real support form. Assertions now
  verify its actual configured mail link and Home exit, not obsolete policy
  copy; **14/14 then passed**. Public tests make no inference calls and stop at
  Google's genuine credential-entry screen, never entering personal credentials.

Relevant commands: `pnpm check`, `pnpm exec nx run bff-service:test-integration`,
`pnpm exec playwright test --config projects/tablecards/e2e/playwright.test-users.config.ts`,
and `pnpm exec playwright test --config projects/tablecards/e2e/playwright.production.config.ts`.
The completed release runs are [initial](https://github.com/kabytaa/bff/actions/runs/38638135859),
[loop hardening](https://github.com/kabytaa/bff/actions/runs/38639245720) and
[Contact correction](https://github.com/kabytaa/bff/actions/runs/38639571306), followed by
the [final smoke-harness release](https://github.com/kabytaa/bff/actions/runs/38640914541).

**Verdict:** the current PR/build is complete for its authorized no-charge
production boundary. This is not a paying-customer launch or a claim that every
authenticated production journey was performed. The accepted 84% answer-quality
baseline, richer email-branding goal and later roadmap outcomes remain explicit
limitations, not hidden release successes. No new latency benchmark was run;
the frozen comparison remains the quality/cost/speed evidence.

## Operational isolation

### Self-mail loop hardening before activation

Main's final source audit found that automatic receipts lacked automation
headers and a self-addressed incoming message could create another receipt.
Production callback/configuration activation was held. Eleven regression
assertions reproduced the gap offline. Fixed automatic receipts now freeze
`Auto-Submitted: auto-replied` and `X-Auto-Response-Suppress: All`; human-approved
replies do not inherit these receipt-only headers. Both own service addresses
are suppressed at the pre-persistence routing gate and again when queued mail
resolves its environment, without starting a bot or another receipt. All 88
affected operations/transport tests, service types, lint and formatting pass.
Existing frozen receipts are not rewritten; no schema migration is involved.
Main also ran the complete BFF backend suite: **182/182 tests pass**.

Initial release `41cf45b` passed main CI, production infrastructure smoke and
four real public desktop/phone checks (pricing, Help and support entry). The
loop hardening was published before production mail activation, then verified
against the actual delivered receipt and a safe signed self-sender denial.

### Deployment boundaries

Shared code, authorization and event machinery stay generic. TableCards owns bot
content, event/KPI definitions, capabilities and branding. BFF retains exact
operator Send approval; neither the model nor a deploy/admin credential grants
human sending authority. The fixed receipt is automatic.

Development now uses `help-dev@tablecards.tofler.app` (configuration revision 9);
production uses `help@tablecards.tofler.app` (revision 1). Both use the verified domain,
but independent webhooks/secrets and pre-persistence routing prevent account-wide
notifications from copying production cases into development. Frozen reply
envelopes and local token hashes preserve already-issued development reply routes.
Unknown/ambiguous recipients are acknowledged without storing content. Early
outgoing callback sender fallback is bounded to 100 local environments; existing
provider-ID callbacks use their index. Above that bound new early callbacks fail
closed and need a reviewed registry-index change, not a wider scan.

Both production operator automation settings read back as explicitly `disabled`;
the customer development-completion route is absent. Personal Google credentials
were not supplied or replaced with fabricated production tokens. Development web
was separately synced to the corrected contact/privacy wording after the release.
Fresh desktop Chromium and phone WebKit checks confirm its test-checkout notice,
`help-dev@tablecards.tofler.app` contact link, Resend privacy disclosure and
contained layout, without new inference calls.

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
