# PDF, session UX and live AI corrections

Created: 2026-10-07
Updated: 2026-10-07
Status: Passed for the authorized development boundary; production unchanged
Baseline: `ed7539f4381ecf2a3b30a3cfa2f5374839b1a9c5` on `feat/tablecards-application`, plus uncommitted corrections; PR #1 remains unmerged
Scope: authorized development fixes, feature/delta application review and same-day AI-budget revision, not production/customer-launch acceptance

## Requested changes and results

| Concern | Correction | Evidence |
| --- | --- | --- |
| Extra first PDF page | Customer preview/export starts with card sheet 1. Calibration remains only in the separate public print-test PDF. Renderer-version checks prevent reusing old-format exports. Old files are not deleted. | Core PDF/geometry tests; legacy-export integration regression; hosted actual PDF contents/counts, including 500 cards → 125 pages |
| Login shown while signed in | Shared public session action distinguishes loading, recovery, signed out and known-user states. Header, hero, pricing and creator entry agree. | Six component state cases; authenticated desktop/mobile visits to landing, creator, projects, designs and account; ordinary login/logout/account/team journeys |
| AI only returns colors | Development defaults to real Cloudflare FLUX.2 [klein] 4B, producing four illustrated choices. Color fixtures require explicit mock selection and never silently replace a provider failure. | Two manual AI test cases passed; four private images each, real non-solid pixels, one account unit each; generated botanical/corporate artwork inspected |
| Optional company/style image | Creator and Designs share optional reference upload, preview and removal. Browser resizes/strips metadata; backend validates actual bounded pixels and binds the reference/provider to the operation key. | Mobile WebKit upload/remove/reupload/live generation; server rejection tests; browser forwarding test; Worker multipart reference test |

The reference is style/palette inspiration, not a promise of exact logo
reproduction. Existing color-fixture assets remain in their owners' libraries;
this change neither regenerates nor deletes earlier artwork.

## Verification and safety

- Node 24 `pnpm check`: passed, including format, lint, ownership boundaries,
  typechecks, tests/integration, builds, production-bundle guards, secret scan
  and self-contained browser tests. Unchanged targets may reuse verified cache.
- Fresh focused suites: **101 web**, **42 core/rendering**, **52 backend** tests;
  the private adapter's seven tests passed as part of the gate.
- Manual AI test: **2/2 passed**,
  desktop Chromium text-only artwork and mobile WebKit company-style reference.
  It made two four-image batches total; no OpenAI key/calls or real checkout.
  This historical run used `TABLECARDS_TEST_LIVE_AI=true`; Andrew subsequently
  requested the name "manual AI test" on 2026-10-07. The current opt-in flag is
  `TABLECARDS_TEST_MANUAL_AI=true` and the file is `manual-ai.spec.ts`. Browser
  assertions, provider calls and explicit-spend requirements are unchanged.
  After renaming, formatting, E2E lint/typecheck and discovery passed (29 cases
  total); the two renamed cases were verified skipped with the flag off. No new
  inference was performed for the naming change.
- Transactional integration test raced twelve live starts across accounts:
  eight accepted, four rejected. Retry did not consume another admission; a new
  UTC day renewed the cap. Failed starts count conservatively. Cap rejection
  precedes account-unit reservation; UI does not invent an unfinished batch.
- Wrong/anonymous provider credentials and browser preflight are denied before
  inference. A live anonymous POST returned 401. Anonymous product-file access
  returned 403. Provider errors do not disclose prompts/images/credentials.
- Both hosted font hashes still match the canonical code pins.
- Synthetic desktop/mobile live screenshots were inspected, not committed.
  That review also caught the desktop upload button stretching beside the taller
  AI form; `align-items: start` fixes it, with a bounded-height browser regression.

Ordinary hosted acceptance explicitly chooses fixtures and cannot spend more AI
credits. Earlier runs failed stale two-page expectations or shared trace-folder
cleanup; they are **not acceptance**. One corrupt-artifact run was deliberately
interrupted. TableCards now keeps ignored artifacts in its own E2E project,
separate from local browser suites. Final rerun results are recorded below.
An intermediate mobile 500-card case crossed the final CSS publication and
requested its old `/assets/project-page-DrnnUIKF.js`; the trace confirmed that
address received the new SPA HTML fallback, not JavaScript. This is stale-tab
deployment evidence, not a passed export. Final acceptance must start after
publication is complete, with no deployment during the run. Existing tabs must
reload after a development publication.

**Final stable-version run:** **27/27 ordinary hosted cases passed** (17 desktop
Chromium, 10 mobile WebKit), one worker, zero retries, 7.2 minutes. The two manual
AI test cases were correctly skipped in this ordinary run and had already passed in
their explicit paid-provider-authorized run; they are not counted as ordinary
passes. Both 500-card downloads, current PDF contents, import/auth/navigation,
all four mock offers, presets, private-file denials, invitations, roles, account
isolation and protected ownership transfer passed. The final desktop/mobile
control screenshots were inspected, and both upload controls passed the
bounded-height regression. All deployments were complete before this final run.

No material unresolved issue was found in these four requested changes. This
feature/delta review does not claim a new full accessibility, commercial/legal
or whole-platform security audit.

## Deployed candidate

- TableCards development Convex: `scrupulous-hawk-991`, latest health version
  `ed7539f-ai-budget-20261007` (supersedes the earlier
  `ed7539f-pdf-session-cloudflare-20261007`; a dirty-worktree candidate label,
  **not** a claim that these changes have been committed).
- Web Worker: `6eaef2bf-3bed-4646-855e-24052234890d`, entry
  `/assets/index-lpkqrTdh.js`, stylesheet `/assets/index-DIIg5DbD.css`.
- Private AI Worker: `8f53f89d-c176-44d9-b948-e2f97ad53a1c`, following secret
  installation; fixed development manifest, no production route.
- Shared BFF, session gateway and central authentication were not changed.
  [Operations](../operations.md#cloudflare-ai-budget-and-reference-images)
  records configuration and the latest dollar-budget boundary; secrets exist
  only in the provider/Convex environment stores.

## 2026-10-07 budget and terminology revision

The earlier eight-batch cap above records the original verification boundary.
Andrew subsequently authorized `$1/day` for development. The backend now reads
`TABLECARDS_AI_DAILY_BUDGET_USD` per deployment and converts it at a conservative
`$0.0072/batch` into at most 138 starts. Configuration was set/read as `1` on
`scrupulous-hawk-991`, and the development push/typecheck/health probe succeeded.
Zero, invalid or missing configuration refuses new real generation without an
account-unit reservation; previously admitted completion recovery remains valid.
An indexed read and insertion still make admission atomic across accounts.
No new tables or browser-configurable budget were added.

Fresh validation: **73 backend tests passed**, including the race at 138 starts,
failed-start counting, setting changes, UTC rollover and pre-inference denials;
Node 24 `pnpm check` passed in 2m 36s. The manually triggered automated test is
now named `manual-ai.spec.ts` with `TABLECARDS_TEST_MANUAL_AI=true`; a new explicit
run passed **2/2** (desktop Chromium and mobile WebKit) in 1.8 minutes, spending
two four-image batches. The earlier ordinary 27-case suite is retained as
unchanged-flow evidence, not claimed as rerun after this backend-only revision.
The narrow helper/admission quality review required no cleanup refactor.

This is a gross estimated inference admission budget, not a Cloudflare-wide hard
invoice ceiling or provider-confirmed per-user spend. Free allowances, other
account workloads, admission-versus-completion dates and non-inference costs
remain separate. Andrew's future BFF cost-attribution request is saved in the
[Future Ideas registry](../../../../docs/architecture/future-ideas.md#per-user-and-per-account-provider-cost-attribution).
Production has not been configured or deployed; it must receive its own explicit
budget rather than silently inheriting development spending authority.

## Remaining boundary

At completion of development verification, production was unchanged and no
merge, commit or push had been made for that implementation task.
Real Google/provider account verification, physical print compatibility,
commercial billing/lifecycle and launch readiness are not established by these
checks. References are intentionally downsampled; brand reproduction remains
probabilistic. Cloudflare's free tier is account-wide and shared, so a bounded
deployment budget is not a promise of a zero account invoice. User review is
optional, not a routine completion dependency.

## 2026-10-07 print acceptance and release checkpoint

Andrew confirmed that his previously printed sheet looked satisfactory and
accepted it as sufficient for Build 3. Detailed physical measurement and broader
print validation move to final MVP pre-launch acceptance; no new print was
performed or measured by Codex. This does not promote the six-card trial or
establish printer/Avery compatibility.

Andrew authorized committing and pushing the existing fixes on the feature
branch. Production merge/deployment remains a separate action. No additional
Build 3 product feature or new schema change is introduced by this checkpoint;
remaining production work is deployment configuration and target-specific
verification, with fixes if those checks expose a defect.
