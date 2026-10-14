# Business Factory Handoff

Updated: 2026-10-14.

## Current checkpoint

- **Active release request (2026-10-14):** Andrew authorized independent review,
  garbage cleanup, finishing the current work branch/PR and production deployment
  if safe. Existing credentials may be used. This supersedes the earlier
  development-only restriction below; it is not a paying-customer launch or
  permission to waive safety checks. Astra's independent safety and release-wiring
  reviews pass after helper retry and webhook-isolation fixes; final gate and
  PR/main publication are in progress. [Release evidence](projects/tablecards/docs/reviews/261014-operator-work-production.md).
- **Test-user checkout (2026-10-14):** implemented and development-deployed.
  Backoffice → Business/environment → Customers → exact email/ID → Mark as test
  user. Andrew approved optional `businessUsers.isTestUser` (absent=false) and
  additive `test_mock` source; no new table/index/backfill. Mock purchases require
  a test Owner/all-test workspace, independent of deployment; provider-paid
  grants are protected. Removing the flag blocks pending/new purchases but keeps
  access/data. Normal users cannot join/inherit test workspaces. The legacy
  customer grant endpoint is retired, preventing a development-mode bypass.
  Full `pnpm check`, 160 BFF tests and ten hosted desktop/phone checks pass. Feature changes
  remain uncommitted; production application is unchanged. Baseline is the
  [completed shared-checkout plan](.agent/plans/260929-shared-mock-checkout.md).
- **Latest development repair:** printing-answer Retry now replays the exact
  authorized saved answer, with no duplicate AI execution. Anonymous recovery
  authority exists before the first fetch; failed explicit retries remain bounded.
  151 backend/101 assistant tests, four real and six isolated UI desktop/phone
  checks pass. Ordinary UI tests cannot accidentally invoke inference or email.
  The initial successful response's display failure was not reproduced.
  Repair checkpoint **`7a03c4f` is committed and pushed** to
  `build/operator-work-dev` on 2026-10-14.
  Model/config/caps and production are unchanged. See the existing development
  review below.
- **Operator work:** follow the [execution plan](.agent/plans/261009-operator-work.md).
  Approved baseline/schema: `41ba411`; development implementation/evidence
  checkpoint **`fa9b2bc` is committed and pushed** to `build/operator-work-dev`.
  Original implementation scope ended at development. The newer release
  authorization above permits main/production after review and release gates.
- Shared support/helper/events, AI SDK/UI, email, private PNG/JPEG conversion,
  realistic seed and evaluation CLI are implemented. Eight additive tables;
  no old-row backfill/deletion or Business domain migration.
  [Schema and ownership](docs/architecture/operator-work.md).
- Permitted read-only support tools/assigned skills are automatic; **every
  substantive reply requires the operator's exact Send**. One draft; new
  customer messages revoke unstarted send authority but preserve operator edits.
- Shared Help bubble/chat, safe Markdown, deduplicated destinations, RTL layout,
  Business-neutral forms and scoped themes are implemented. Customer Business
  events and overview KPI counters/seven-day trends are visible in backoffice.
  TableCards owns branding, knowledge, event/KPI definitions and evaluation cases.

## Verified development

- [Backoffice](https://ops-dev.tofler.tech): `45abcff6-1565-4410-8540-c98235c6443c`.
  [TableCards](https://tablecards-dev.tofler.app): `c9453f84-9aab-4f37-b494-2b16eb5241cd`.
  BFF/TableCards Convex dev targets: `compassionate-buffalo-689` /
  `scrupulous-hawk-991`. Private provider:
  `b162aeef-6e08-4b7d-925e-962f876febfd`; Business configuration revision 9.
  BFF/TableCards backend and changed UI surfaces were pushed for the test-user
  revision. Mail now uses `help-dev@tablecards.tofler.app`; signed foreign events
  are ignored before receipt storage/content fetch. The helper's saved pending
  browser-tool response is recoverable without another model call.
- Real development email intake/replies, signed callbacks, duplicate protection,
  private previews, survey and reopening pass. Capped helper integration and
  hosted desktop/phone chat/event/KPI checks pass; keyboard/200% text checks
  pass. Actual device keyboard behavior remains unverified.
- Gateway `bff-operator-dev` has verified global **$3/day, $30/month** caps.
  Development helper/support use **Gemma 4 + Jev, compact-v2, bot v6**, with
  mandatory basics/contact. Exact settings readback passes; mail/events/KPI/page
  bindings are unchanged. No automatic
  expensive/uncapped fallback. The one-off authorized $10 credit purchase
  ($10.50 with documented fee, before possible tax) completed earlier;
  authenticated native prepaid routing works, auto-top-up remains off.
- [Combined development evidence](projects/tablecards/docs/reviews/261009-operator-work-development.md)
  retains exact releases, earlier repository/browser gates, provider setup,
  narrow live smokes, comparison provenance and limits. Final four live
  desktop/phone checks pass: helper, browser continuation, real inbound mail and
  support-draft Review without Send. Full repository gate and fresh 147 backend
  tests pass; independent Astra review and nine runtime regressions pass.

## Latest quality outcome / next moves

- Production provider/gateway and separate runtime/event/mail secrets are
  prepared. `bff-operator-prod` global $3/day/$30/month limits have actual
  provider-blocking proof (code 2045); temporary guard removed and exact caps
  restored, development unchanged. Production callback is prepared **disabled**.
  Finish the release gates, commit/push/merge the reviewed branch, publish via CI,
  apply revision-checked production Business bindings, activate/test actual mail
  and capped helper, then record production/browser smoke before claiming done.

- **Broad comparison finished:** 169 questions (90 helper/79 support), three
  models/four strategies. Captures/blind Astra grades and limitations are retained.
  [Full comparison](projects/tablecards/support/evaluation-results/knowledge-matrix-2026-10-11T210245-209Z-summary.md).
- Best strict delivered-answer rates: Gemma compact upfront and Jev **142/169
  (84.0%)**; Gemma full upfront **139/169 (82.2%)**. **90–95% target unmet.**
  Smaller omissions, unverified claims and delivery failures are not all wrong
  advice. Both reviewers match 22 authored controls; the selected 24-answer
  independent audit has no pass/fail reversals but flags severity/expectation
  issues. This is supervised AI evidence, not human ground truth/API calibration.
- No new top-ups/cap increases or broad inference rerun. Small checkpoint smokes
  use a conservative additional allowance below $0.50; exact failed-call costs
  and invoices remain unknown. Original full/compact snapshots/grades are intact.
- **Accepted checkpoint:** Andrew selects Gemma 4 + Jev/compact-v2 for reusable
  configuration, accepts this quality baseline and defers improvement. Optional
  per-bot strategy/mandatory-key settings are approved; no new table/backfill.
  Actual-payload preflight, resumed-run evidence and registered navigation facts
  are fixed and development-tested. Reviewed source/tests/docs and useful paid
  evidence are retained; generated status/caches/credentials/private state are
  excluded. The checkpoint is closed; quality tuning or a main/production release
  originally needed a new request; Andrew has now requested the production release.
  No PR or merge exists yet. Jev has no proven quality win.
  Keep quality first, cost second, speed third; do not silently retune frozen
  tests/grades or claim readiness from survivor-selected/five-language samples.
- Rotate temporary Resend/setup credentials after authorized dev use; the setup
  token was exposed in an earlier tool result and Andrew was informed.
  [Provider evidence and remaining operations](docs/operations/provider-accounts-and-secrets.md).
  Native alerts remain unconfigured; concurrent cap overshoot/calendar rollover
  are not independently measured. No custom spending table/dashboard/alerts.

## Retained boundaries

- Builds 1–3 met their authorized production boundaries; TableCards remains a
  **no-charge preview**, not customer launch. Last production release `ee1e1d9`;
  [release evidence](projects/tablecards/docs/reviews/261007-build-3-production-release.md).
  Fresh personal-Google production journeys/physical printing checks remain
  prelaunch. Payments/Paddle, monitoring/Telegram and launch are later
  [roadmap stages](docs/factory/mvp-delivery-plan.md#grouped-launch-tasks).
- On/after **2026-10-28**, revisit Andrew's workplace-VPN reachability issue.
  Domain-age blocking is unconfirmed; obtain the exact browser/IT error first.

Product truth: [TableCards Product](projects/tablecards/docs/product.md).
