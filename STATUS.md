# Business Factory Handoff

Updated: 2026-10-14.

## Current checkpoint

- Andrew authorized review, cleanup, PR completion and production deployment.
  [PR #2](https://github.com/kabytaa/bff/pull/2) is merged. Operator work and
  test-user checkout are published. Final release b260092 passed CI, production
  deployment/smoke and public version readback on all checked surfaces.
  [Production evidence](projects/tablecards/docs/reviews/261014-operator-work-production.md).
- Production: [TableCards](https://tablecards.tofler.app),
  [backoffice](https://ops.tofler.tech), BFF exuberant-goldfinch-830 /
  TableCards clean-gerbil-451. Business Operator configuration revision 1;
  Gemma 4 + Jev, compact-v2, bot v6, mandatory basics/contact.
- Test checkout is operator-designated per Business customer, not a deployment
  switch: Customers → exact email/ID → Mark as test user. Requires a test Owner
  and all-test workspace; provider-paid grants are protected. Flag removal stops
  pending/new purchases but preserves access/data. Normal users cannot
  join/inherit test workspaces; legacy customer development-grant write is retired.
- Read-only support tools/assigned skills run automatically. Every substantive
  reply needs the operator's exact Send. Drafts are suggestions; Review is not Send.
- Eight approved shared Operator tables plus optional businessUsers.isTestUser
  and additive test_mock source are deployed. Missing flag=false; no backfill,
  old-user designation, deletion or new release-fix schema/index change.
- Shared machinery stays generic; TableCards owns content, branding, event/KPI
  definitions and evaluation fixtures. Customer events and overview trends,
  shared modern Help chat, Markdown, RTL and scoped themes are included.

## Verification and operations

- Full repository gate passes; 182 backend tests, 57 delivery tests, independent
  Astra safety/release reviews and fresh test-user desktop/phone journeys pass.
- 14/14 real production public browser checks pass. Two real helper answers have
  saved completed Gemma/Jev provenance. Actual Gmail intake, delivered receipt,
  private PNG regeneration and reply correlation pass: one case, two incoming
  messages, one receipt, no substantive reply sent. Production preview/designation
  deny anonymous callers; unsigned callbacks=403; signed self-sender is ignored
  before persistence. Development stores zero copies of these production events.
- Separate production gateway bff-operator-prod has verified global $3/day and
  $30/month fixed caps, including actual blocking proof/code2045 and exact
  restoration. Separate native runtime/event/mail secrets; no new credit purchase.
  Evaluation/experimental routes are absent from production.
- Mail: production help@tablecards.tofler.app; development
  help-dev@tablecards.tofler.app (revision9). Independent signed callbacks filter
  foreign/ambiguous routes before storage/fetch. Automatic receipts carry
  loop-suppression headers; permitted human replies remain supported.
- Generated caches were cleared and old ignored browser/build/test artifacts
  moved recoverably to /tmp/bff-release-artifacts-dhEMH7. Source/history and useful
  frozen paid-evaluation evidence are retained. No credentials/private state in Git.
- Development web was synced to the corrected contact/privacy wording. Production
  operator automation is explicitly disabled; no development identity was used.

## Remaining boundary

- This PR/release checkpoint is complete for the authorized no-charge preview.
  New roadmap work remains separate; Markdown-only handoff updates do not
  restamp the deployed b260092 release.
- Accepted quality checkpoint: 142/169 strict answers (84%); the 90–95% target
  remains unmet and improvement is deferred. Jev has no proven quality advantage.
  [Frozen comparison](projects/tablecards/support/evaluation-results/knowledge-matrix-2026-10-11T210245-209Z-summary.md).
- No-charge preview, not paying-customer launch. Personal-Google authenticated
  production journeys and physical launch checks were not newly performed.
  Native billing alerts remain unconfigured; concurrent cap overshoot is possible.
  Temporary setup/development credential rotation is recommended, not a missing
  access blocker. [Provider operations](docs/operations/provider-accounts-and-secrets.md).
- Payments, Monitoring and launch/legal acceptance remain later
  [roadmap stages](docs/factory/mvp-delivery-plan.md); rich logo/accent mail
  branding remains an unimplemented goal without an approved logo schema.
- On/after 2026-10-28, revisit Andrew's workplace-VPN reachability issue; obtain
  the exact browser/IT error rather than assuming domain-age blocking.

Product truth: [TableCards Product](projects/tablecards/docs/product.md).
