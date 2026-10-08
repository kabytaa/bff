# Build 3 production release review

Created: 2026-10-07
Updated: 2026-10-08
Status: Released no-charge preview; welcome-credit fix approved and implemented, publication in progress; not customer launch
Baseline: `14de403d14362229e6809a770f21be049b168b05` on `feat/tablecards-application`; PR #1
Scope: authorized Build 3 no-charge production preview and final development refresh, not paying-customer launch

Andrew explicitly authorized production configuration, merge and deployment.
The [production revision](../../../../.agent/plans/260927-build-3-tablecards-core.md#2026-10-07-production-execution-revision)
preserves the original plan and newer checkout/AI decisions. No new schema is
authored for this release: production receives the already-agreed shared access,
checkout, bucket/reservation tables and six TableCards tables. No destructive
migration or customer-data rewrite is planned.

## Completed release preparation

- **Pass:** 47 production-delivery tests, including exact target/key separation,
  disabled development controls, version/metadata, private routes and CORS.
- **Pass:** full Node 24 `pnpm check` (3m26.6s), plus focused lint/typecheck of
  the new isolated production browser suite. Secret scanning passed before push.
- **Pass:** exact-production `pnpm production:build` preflight. An initial guard
  rejected Vite's backtick-quoted `false` literal; the guard was corrected and a
  regression added. This was a compiler-output mismatch, not enabled dev controls.
- **Pass:** production auth definition 4/configuration 1 applied after compatible
  preview and Andrew's confirmation, with exact web/gateway URLs and dummy
  identities disabled. Independent provider/checkout credentials and a scoped
  CI deployment key were installed through native tools, never Git or logs.
- **Pass:** one authorized synthetic private production AI inference returned
  HTTP 200, 1344 × 768 image, 376,910 bytes and non-solid illustrated pixels.
  This proves the production secret/binding/model path, not account orchestration
  or universal image quality. It was one direct operator inference, outside the
  product's `aiBatches` admission counter (less than one full batch); Cloudflare
  still meters it. No customer content, OpenAI key or real payment was used.
- **Pass:** checkpoint PR CI run [37574120061](https://github.com/kabytaa/bff/actions/runs/37574120061)
  validated `14de403`; branch CI correctly skipped production publication.

## Boundary and evidence matrix

| Area                                | State                                                   | Evidence / limit                                                                                                                                                            |
| ----------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product promises and UI             | Pass for development; production authentication bounded | Fresh 27/27 hosted cases cover import, projects, PDFs, uploads/presets, no-charge offers and Studio team/transfer; fresh authenticated production actions remain unverified |
| Desktop/mobile app                  | Pass for public production journeys                     | 6/6 Chromium/mobile WebKit cases cover creator, long names, policies and actual Google credential-entry popup; sampled rendered inspection recorded below                   |
| Production targets/version/security | Pass                                                    | Main CI and fresh `production:smoke` verify all three backend targets, seven Workers, SHA/header/CORS/private-route contracts                                               |
| AI                                  | Pass for scoped provider and development journeys       | Private production inference and 2/2 development manual AI cases passed; independent `$1/day` budgets share Cloudflare billing                                              |
| Payments and subscription truth     | Not applicable to no-charge boundary                    | Shared simulation is explicitly approved; verified paid-through renewal/failure/downgrade/cancellation is Build 4, not proven by mock checkout                              |
| Privacy/disclosures                 | Scoped pass; commercial legal sign-off unverified       | Notices explain vendor/image transfer, no charge, archive versus deletion, retention and absent public support; not a compliance certification                              |
| Operations/support/monitoring       | Pass for scoped release operations                      | Production publication, target guards, recovery and AI pause procedure verified/documented; public support/monitoring remain Builds 5–6 and launch requirements             |
| Print                               | Accepted Build 3 boundary                               | Andrew accepted his earlier satisfactory print; measured scale/margin/Avery compatibility remains the final MVP prelaunch gate. Six-up stays development-only               |

Production browser automation intentionally does not borrow a Google account or
fabricate an identity. It stops at the real Google entry; a fresh authenticated
production account/export/checkout/team journey is **unverified** without
authorized personal browser credentials. Development's full journeys, shared
protocol tests and retained Build 2 production evidence are bounded evidence,
not a claim that those new production user actions were executed. User review
is optional; this limit must remain visible in the release report.

## Execution evidence

Development checkpoint `14de403` was pushed to shared BFF
`compassionate-buffalo-689`, TableCards `scrupulous-hawk-991`, web Worker
`f07fdc7b-994a-4e3c-961e-13e582350c73`, gateway
`27d72c9c-9679-41bd-9a2d-79c4ebc13118`, private AI adapter
`c8d84c72-bf5d-4678-8a05-d5892dcbeaea` and shared auth Worker
`2896e1ba-9dc1-4c5e-9434-22b3c426f527`. Auth publication initially referenced
a nonexistent manifest; it made no publication and was rerun successfully
with the actual `wrangler.jsonc`. Stable-version acceptance starts only after
all publications finish. Generated Convex API declarations were refreshed to
include the existing AI helper modules; no runtime API or schema changed.

PR #1 merged on 2026-10-07 at `660f5cf93e2c7870bdd9a4a5becae0ff7aef138f`.
Before merge, stable development checkpoint `79a815b` passed **27/27 ordinary
hosted cases** (7.4 minutes), **2/2 manual AI cases** (1.5 minutes), and a
strengthened **2/2 manual AI rerun** inspecting each of the four actual visible
images (1.9 minutes). Rendered mobile/desktop design and review inspection found
no remaining sampled overflow issue. Lazy private-image thumbnails release
offscreen bytes; an offscreen blank in a full-page capture is not evidence of a
failed generation. Individual visible images were inspected.

Final fixed production and refreshed development results are recorded below.
Earlier interrupted or failing runs are retained as diagnostic history, not
counted as acceptance.

The first fresh hosted run was interrupted with exit 143 after 19 passing
ordinary cases and no assertion failure. Its partial output is not acceptance;
the interruption cause is unproven. A persistent-terminal rerun is required.
Rendered development inspection (desktop/mobile design and review) found stale
print-callout text referencing a calibration square on page one. It was corrected
to distinguish separate calibration from cards-only customer exports, with a
component regression and production browser assertion. No PDF layout changed.
The public pricing notice now identifies simulated checkout before an upgrade
click; the AI FAQ includes the optional reference image instead of claiming
only text ever goes to the provider. Both are disclosure corrections, not new
features or access rules.

The first merged deployment published at `660f5cf`; [main CI 37575681412](https://github.com/kabytaa/bff/actions/runs/37575681412)
correctly failed the final smoke step, withholding acceptance. The new gateway
initially failed TLS handshake, then returned healthy matching-SHA responses.
Transient custom-domain TLS activation is the likely explanation, consistent
with Cloudflare's documentation; native certificate status was not queried. The
early desktop auth browser case timed out during that window; mobile passed
after activation. These partial results are not the final production pass.
The next smoke failure exposed missing TableCards CSP/no-index/no-store headers.
The actual header file was hardened rather than weakening the gate, preserving
immutable versioned-artwork caching and permitting required blob previews,
same-site session and Convex HTTP/WebSocket traffic. A source regression guards
the header contract; fresh production and full development revalidation follow.

The corrective checkpoint is `532dccacfd8603cf87364cb7ef5532e0c3fcc9d3`.
It also covers actual `/invite/*` and `/settings/*` routes rather than a guessed
invitation path. Focused lint/typecheck and all 47 release-tool tests pass.
Development publication completed with web Worker
`d9796f78-51d9-4c56-9919-604d6a927b2f`, gateway
`24114365-239e-4787-b3bd-1e9df8934c2d` and shared auth
`155522c6-de89-48c8-9a6b-8cf22b50f4e4`; both backends are stamped with its SHA.
Uncached development HTML/deep-link headers and both pinned font hashes passed.
That hosted run exposed an additional CSP regression: a browser-side fetch of
an already downloaded PDF Blob was denied by `connect-src`. The trace confirmed
the policy violation; export had completed successfully, but local byte reading
was blocked. The run was stopped rather than accepted. Explicit `blob:` access
was added only to the connection directive, with a source regression and a
credential-free production browser probe. [MDN's CSP connection reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src)
explains the Fetch API boundary. A complete stable-version rerun is required.

The subsequent run at `d9b32b4` passed ordinary export and edited-PDF checks,
but the 500-card first-export check caught a different race (`ERR_FILE_NOT_FOUND`,
not a CSP violation). Creator exposed its current Blob link immediately before
navigating to the saved project; route cleanup could revoke it before it was
read. First exports now navigate without exposing the departing route's link;
the saved-project route resolves its own authorized download. A component
regression asserts no stale link during handoff. The partial hosted run was
stopped and is not acceptance; fresh focused and full runs follow.

## Initial runtime acceptance — 2026-10-07

This is acceptance of the first fixed runtime checkpoint; the later print-fetch
correction and its separately versioned evidence are recorded below.

Runtime checkpoint `1ede7b7bea4f1850f5962ddbc62aaa86d16786c2` passed:

- **Full main CI**, including repository validation, exact-target publication of
  all three production backends/seven Workers and final smoke:
  [37577528728](https://github.com/kabytaa/bff/actions/runs/37577528728).
- **Fresh local production smoke**, first attempt, 6.9 seconds. It verifies
  exact health/metadata versions, origin/header contracts, disabled development
  controls and anonymous private-file/AI denials across the configured surfaces.
- **27/27 ordinary hosted development cases**, 8.0 minutes; two manual AI cases
  correctly skipped. Both 500-card first-export journeys passed after the
  navigation-lifetime correction. The suite includes the full executable story
  registry, not only printing: saved/edited projects, account isolation,
  uploaded artwork/presets, offer and allowance denials, no-charge shared
  checkout, invitation acceptance, role/removal changes and ownership transfer.
- **2/2 opted-in manual AI cases**, 1.7 minutes, real Cloudflare generation on
  desktop Chromium/mobile WebKit with optional company-style input. Each case
  checks all four visible, non-solid choices and one account-unit consumption.
  Sampled individual captures show actual corner illustrations and usable blank
  centers; this is not exact-logo fidelity or universal quality certification.
- **6/6 public production browser cases**, 33.2 seconds, plus a fresh repeated
  full pass before final publication (23.8 seconds). Both engines reach the actual Google
  credential-entry popup; no personal credentials are entered. Local PDF Blob
  byte reading is tested under the live CSP without inventing a production user.
- **101 web tests**, focused E2E lint/typecheck and all **47 release-safety
  tests** passed for the corrective implementation. Live development deep-link
  headers and both environments' pinned fonts/artwork bytes were verified.

Rendered production desktop/mobile Design captures were inspected after the
fresh run: desktop has the bounded form/preview columns; mobile uses steps,
an intentional horizontal design carousel and a bottom primary action. Neither
sample has document-level horizontal overflow. Long/accented/duplicate names
remain present in the preview; authentication/error/empty states are additionally
covered by the full development journeys, not by an anonymous screenshot alone.

Production Worker versions at this runtime checkpoint:

| Surface                  | Worker version                         |
| ------------------------ | -------------------------------------- |
| TableCards web           | `1210aac2-4df7-415f-a83e-72b0f4d04a26` |
| TableCards gateway       | `2b403d34-f83e-4b30-af46-a42017ec3b7f` |
| TableCards private AI    | `6c30dbb8-4855-400d-90ed-c2d504ea530a` |
| Shared customer auth     | `b6565733-b5db-40b3-a358-2228ac384655` |
| Backoffice               | `367b4258-9de4-450b-b20a-771febe91312` |
| Retained Example web     | `379bc906-3b4b-479c-8888-c020d75612f7` |
| Retained Example gateway | `ca1f7a20-e4ad-4749-97b1-f92d07d1a963` |

Stable development versions were TableCards web
`12e4bab2-ab93-4210-a669-827056962648`, gateway
`fa9fdc3e-dd08-4820-a1a6-26e51c03371e`, shared auth
`b8bfff0d-2825-45d4-b560-40e86634e594` and unchanged private AI
`c8d84c72-bf5d-4678-8a05-d5892dcbeaea`. Both backend version labels match the
runtime SHA. The final documentation/test-only commit republishes identical
application code with its own metadata; its deployment/verification is tracked
by main CI and the short current handoff, not a self-referential commit in this
record. Full 27-case/manual-AI results belong to the runtime checkpoint above.

### Remaining limits, not concealed passes

- Fresh authenticated production callback, project/export, shared checkout and
  team recipient/transfer round-trips are **unverified**: personal Google
  credentials are unavailable. Production dummy identities/fixtures remain
  disabled. The full development journeys, exact production deployment guards,
  retained Build 2 authentication evidence and real Google popup provide bounded
  evidence; they are not substituted for those missing executions.
- Google initialization emits an origin warning/400 even though the actual
  credential-entry popup opens successfully. A read-only referrer-policy
  experiment did not remove it; no speculative header change was made. Its
  effect on the unavailable authenticated callback is unverified. Review the
  OAuth client's exact authorized origins if callback problems occur and before
  final customer launch. [Google's setup guidance](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
  is the relevant primary reference.
- An earlier mobile policy-link click stayed on `/terms`; the cause is
  unproven. The final test waits for fonts and performs a real mobile tap; the
  complete suite passed without retries. No routing defect or runtime fix is
  asserted from that earlier failure. Google-popup selector failures were test
  corrections, not evidence of provider authentication completion.
- Print is Andrew's accepted Build 3 sample, not measured printer/Avery
  certification. Real billing/lifecycle, support, monitoring, commercial legal
  sign-off and independent customer validation remain their later stage gates.
- Dollar caps estimate gross inference starts, including failures; they do not
  cap the Cloudflare invoice or establish actual per-user provider spend. The
  two deployment counters are independent; free credits/billing are shared.

**Verdict:** ready for the explicitly authorized, visibly no-charge Build 3
production preview. Production deployment and live smoke pass; development
journeys pass. This verdict does not establish paying-customer launch readiness
or waive the missing authenticated production evidence. No optional user review
is treated as a routine implementation blocker.

## Follow-up: transient print-asset read — 2026-10-07

Main CI [37578953222](https://github.com/kabytaa/bff/actions/runs/37578953222)
validated and deployed documentation/test checkpoint `8192eae`. The additional
development story run passed 11/12 cases but the desktop import/login/first-export
journey displayed `EXPORT_FAILED`. Scoped Convex metadata confirmed a thrown
network `fetch failed` inside `exports:render`; no raw customer logs or identity
values were retained. The precise underlying network cause is unverified.

The rendering path now retries only immutable print-asset GET/body reads, at most
three attempts with ten-second timeouts and short bounded backoff. It retries
temporary 429/5xx responses, stops immediately on ordinary 4xx, blocks redirects
and retains all byte/MIME/hash verification. Export/storage writes and image
generation are not automatically replayed. There is no schema/migration change.

**81 backend tests passed**, including eight new network/body/service recovery,
bounded-failure and denial tests. Typecheck and lint pass; the corrected backend
pushed cleanly to the explicit development deployment. Fresh stable hosted and
production results below verify this corrective publication; the 11/12 run is
not accepted as a successful rerun.

### Final corrective acceptance

Runtime `bc85dc63b8c520bbb3ef61b5bda131d07ad45e57` passed full repository CI,
production publication and CI smoke in
[37579983360](https://github.com/kabytaa/bff/actions/runs/37579983360).
Fresh local production smoke passed on attempt one (6.1s). Public production
Chromium/mobile WebKit cases passed **6/6 (41.8s)**. The stable development suite
passed **27/27 (7.6m)**, with both manual AI cases correctly skipped. Both
previously affected first exports and 500-card downloads passed, together with
all import, project, offer, preset and Studio journeys. Earlier **2/2 manual AI**
results remain evidence for unchanged generation/reference/account-unit code;
no new inference was needed for a print-fetch correction.

Production TableCards web version was `29c84d38-9303-4daf-9f08-285125ba457b`,
gateway `fa3aa908-e265-4bf8-b073-7908a4e136cd`, private AI
`f23fedbd-8fb9-4e9e-870a-efdb16bd6b9a` and shared auth
`4fa713a1-9d59-4bf1-ab10-c0e59708d76a`. The same workflow records the retained
Example/backoffice publications. Development web was
`56b67752-c1d4-4614-85de-d72f8822b1e8`, gateway
`c3aec162-d2df-4561-911b-5f69ceaa2f31` and shared auth
`2c8f4c52-8cfc-4876-8fa9-1cf3e87eb3a0`; its private AI Worker was unchanged.
Live metadata identifies the same runtime SHA across each environment.

Documentation-only commit `3f41d88` updates this evidence and handoff without
changing application code. Andrew approved skipping CI and deployment for
Markdown-only changes on 2026-10-07. Its old-policy
[run 37580934343](https://github.com/kabytaa/bff/actions/runs/37580934343)
was cancelled during validation, before production publication. Both environments
retain the accepted runtime above. Health metadata identifies the last deployed
release, not newer prose; no browser/AI/full hosted rerun or manual development
refresh is required for documentation. Non-Markdown or mixed changes retain the
normal gate; see [CI scope](../../../../tools/production-delivery/README.md#ci-scope).

**Final verdict:** ready for the authorized, visibly no-charge production
preview. The personal Google credential/callback, paid billing, legal/customer
launch and physical-certification limits above remain explicit; no unavailable
check is counted as passed. Print-fetch correction is verified, not an open
release defect.

## Follow-up: documentation-only CI policy — 2026-10-07

Policy checkpoint `e5fe629` passed 49 focused release-tool tests, lint/typecheck
and its one-time [main CI/deployment/smoke](https://github.com/kabytaa/bff/actions/runs/37581542926).
No application behavior or schema changed. Production metadata identifies that
published checkpoint; development retains the verified application runtime
`bc85dc6`. The subsequent STATUS-only push `99995de` created zero CI checks or
deployment runs, verifying the new Markdown-only filter. These are completed
release/policy facts, not outstanding deployment work.

The maintained [CI scope](../../../../tools/production-delivery/README.md#ci-scope)
owns the current rules; newer prose does not require restamping unchanged
services. This entry preserves evidence removed from the short STATUS handoff.

## Follow-up: production default-access failure — 2026-10-07

Andrew reports an error after signing in directly and opening Projects without
first creating a saved project. An empty project library is a valid state, not
a prerequisite failure.

Read-only inspection of the 250 most recent entries in each explicitly selected
production deployment found eight matching failures:

- TableCards `clean-gerbil-451`: `productAccess:current` throws
  `BffProductAccessError: UNIT_EXHAUSTED`; last observed at
  `2026-10-07T17:34:20.157Z`.
- Shared BFF `exuberant-goldfinch-830`: `unitLedger:balanceForAccount` throws
  `UNIT_EXHAUSTED`, "No unit allocation is available"; last observed at
  `2026-10-07T17:34:20.090Z`.

Source confirms the missing-default-grant path:

1. [Shared access projection](../../../../platform/bff/service/convex/productAccess.ts)
   returns default Free access with no unit grants when an access grant is absent.
2. [TableCards access](../../backend/convex/productAccess.ts) initializes that
   default only when development mocks are enabled, but `current` always requests
   an AI unit balance. Production must keep those mocks disabled.
3. [Unit balance](../../../../platform/bff/service/convex/unitLedger.ts) rejects
   a missing grant. This is not merely a missing bucket: an existing grant can
   project a balance before its bucket is created.
4. [Projects loading](../../workloads/web/src/pages/projects-page.tsx) combines
   library and access loading, so the balance error becomes a page error even
   when there are no projects to list. Account usage has the same access dependency.

This establishes a real access-initialization defect, not evidence that project
records are missing or actual AI credits were consumed. The reported customer's
private account/offer records were not inspected, and no raw customer payloads,
credentials or identities were retained. Development's mock initialization
explains why its passing stories did not cover this production path.

**Open:** implement a trusted, idempotent production default-access path consistent
with the Free offer, keep ordinary project access independent of optional AI
balance failures, and add a fresh-account regression with development mocks off.
Do not enable development identities or grants in production as a workaround.
This investigation made no runtime, schema, customer-data or deployment changes;
implementation and development/production verification await authorization.

### Authorized minimal balance-read correction

Andrew subsequently authorized reproducing the failure locally, then committing,
pushing and deploying a small fix to both environments without another approval
if no schema change is needed. A production-shaped in-memory test with Business
development automation disabled first failed with the exact observed
`UNIT_EXHAUSTED` message. A read-only query against an existing production
default-Free account also reproduced it; only public scope identifiers and safe
projection/counter fields were inspected, not guest content or credentials.

The minimal correction changes only `unitLedger:balanceForAccount`: a verified
account with no matching allocation returns a zero balance instead of throwing.
`unallocated` is a response label, not a stored bucket or caller-selectable
allocation. Reservation/spending, existing allowances, initialization gates,
production identities and checkout behavior are unchanged. No schema, index,
backfill, grant write or migration is introduced.

**Local pass:** eight shared access/ledger tests, two TableCards action/SDK/guard
tests and four Projects component tests. The fresh-account case also verifies
the authenticated HTTP balance response, unauthenticated denial, wrong-member
denial, unallocated spending denial and absence of grant/bucket/reservation
writes. The TableCards test substitutes only BFF transport responses; it is not
a hosted Google login. A Node 20 jsdom worker startup failed before running UI
tests; the supported Node 24 rerun passed. Focused lint and all three affected
project typechecks passed. No paid inference is required: this failure precedes
any AI operation, and the existing manual AI suite upgrades its synthetic account
before generation, so that suite alone cannot reproduce this path.

**Separate open promise gap:** this correction does not provision the promised
Free lifetime welcome AI batch. Development initializes that grant through its
mock path; a production default-Free account without a grant honestly reports
zero remaining. A trusted, idempotent production default-grant mechanism needs
separate design/approval; do not mislabel default access as a paid provider grant
or enable development identities. The accepted Free offer remains unchanged.
Deployment, live replay and final release results will be recorded below.

### Balance-read deployment acceptance

Fix `a5d304fb77da9442e0a5583c551527f2eb98fbb5` was committed and pushed to main.
[CI 37662281506](https://github.com/kabytaa/bff/actions/runs/37662281506)
passed full repository validation (3m01s), complete production publication and
final exact-version/security smoke (deployment job 2m23s).

Shared BFF development `compassionate-buffalo-689` pushed/typechecked cleanly and
its health version identifies `a5d304f`. A live read against an existing
unallocated development account returned zero allowance/available units.
Unchanged development TableCards/web/auth code retains its earlier deployment;
it was not republished just to restamp test/documentation changes. The targeted
authenticated development browser journey for designs, workspace settings,
pricing, Projects navigation and signout passed on **both desktop Chromium and
mobile WebKit (2/2, 35.7s)** with synthetic development accounts, no inference.

The exact production account-scope balance query that failed before publication
was replayed on `exuberant-goldfinch-830`: it returned `unallocated`, zero
allowance/available/reserved/consumed and no error. This is an admin-invoked
read-only backend replay, not a fabricated Google login or a customer-data write.
Production health identifies `a5d304f`; CI's final smoke confirms the complete
release, not just the early backend publication. Public production Chromium and
mobile WebKit checks also passed **6/6 (22.8s)** during publication of otherwise
unchanged web/auth behavior. Personal authenticated production callback/export/
checkout/team journeys remain unverified; this bounded replay is not a claim
that the browser login was completed with personal credentials.

**Outcome:** the reported missing-allocation read crash is corrected and verified
in both environments without schema changes, paid calls or production data
mutation. Free welcome-credit provisioning remains the separate open promise
gap described above; these passes do not close it.

## Follow-up: consistent Create navigation and site icons — 2026-10-07

Baseline: `07541d0` on main; Andrew supplied desktop production screenshots and
authorized fixing and deploying the navigation mismatch and absent site icon.
This is a feature/delta app review, not another full launch-readiness review.

Signed-in `/create` now renders the same application shell as Projects, Designs
and Account: desktop sidebar, phone bottom navigation, current workspace,
active destination and Sign out. The guest creator retains its public header
and draft-preserving sign-in. Container-aware editor layout accounts for width
consumed by the sidebar and also applies to the saved-project editor. The
existing TC mark supplies a self-hosted SVG favicon, 32-pixel PNG fallback and
180-pixel Apple touch icon; no new brand, installable app, schema, backend,
migration, payment or AI operation is introduced.

Local Node 24 verification passed: **109/109 web tests**, affected web/e2e lint
and typechecks, formatting and an exact-development web build. New coverage
checks authenticated/guest/loading/account-choice shell behavior and actual
icon formats/dimensions. Hosted regression adds common navigation, draft
restoration, viewport widths 320–1440, phone action/navigation separation and
neighboring Designs navigation. Production public smoke checks favicon/touch
image delivery from landing and creator deep links. Deployment and rendered
phone/desktop evidence follows below.

Development web publication **`911f1c99-fc99-404c-85b1-b0cb37a74b05`** succeeded
from the reviewed working-tree candidate. Unchanged development backends, auth,
gateway and AI adapter were not redeployed. The focused hosted checks passed
**4/4 (1m12s)** in desktop Chromium and mobile WebKit: common-shell navigation,
draft reload, narrow/wide containment, phone action placement, navigation to
Designs, saved-project transition and actual edited PDF export/private-byte
denial. Rendered desktop/mobile screenshots were inspected: sidebar/active Create
on desktop, bottom navigation and primary action separated on phones, readable
controls and no page-wide horizontal overflow. The initial screenshots retain
the old programmatic heading outline; the subsequent correction is below.
Fixed phone controls appear mid-image in full-page
captures because they stay attached to the viewport, not the document bottom.
No manual AI generation or real payment was required.

Andrew then reported the same blue focus border around Projects on production
mobile and authorized including it in this batch. Route and step headings keep
their negative tab index and focus/announcement behavior, but their non-interactive
heading outline is suppressed. Existing keyboard focus rings on actionable
controls are unchanged. Browser regressions now assert focused Projects/Create/
step headings without an outline and a real keyboard-focused control with the
three-pixel focus ring. The first main pipeline was cancelled during validation,
before production deployment, to publish the completed batch in one release.

Development was refreshed to web Worker **`8bec54d1-8e6e-4488-9586-a4c48ea353c2`**.
The first post-publication focus run passed on mobile but failed on desktop
before login: its trace shows the previous HTML/main bundle requesting a retired
lazy landing chunk, which the new SPA manifest answered as HTML. A separate
fresh Chromium probe subsequently loaded the current landing correctly. This
was a deployment-transition asset mismatch, not a focus assertion failure;
the focused suite was rerun against the settled publication before release.

The settled-publication rerun passed **2/2 (23.7s)** in Chromium/mobile WebKit,
including heading focus without border, retained keyboard-control focus rings,
navigation, draft reload and 320–1440-pixel containment. Updated desktop/mobile
screenshots were inspected and no longer show the heading highlight. The
prior saved-project/export regression remains valid: only non-interactive
heading CSS and its focused checks changed after that pass.

### Completed publication and final acceptance

Commits `2f226f6` and **`0aa407c6aa0e2f0865c79e17014c8583f2616cd2`** were pushed
to main. The first validation was deliberately cancelled before deployment
when Andrew added the heading issue. The completed batch passed
[CI 37668089734](https://github.com/kabytaa/bff/actions/runs/37668089734): full
repository validation **3m12s**, production publication and exact-version/safety
smoke **2m17s**. Production TableCards build metadata identifies `0aa407c`.
Development web remains the reviewed `8bec54d1-8e6e-4488-9586-a4c48ea353c2`
publication of this same runtime tree; unrelated development services were not
restamped. Final handoff-only Markdown updates do not require another deployment.

Fresh public production browser checks passed **4/4 (12.1s)** in desktop
Chromium and mobile WebKit: SVG/PNG/touch icons return actual image responses on
landing/deep links; anonymous creator, long-name/card preview, no development
controls, contained layout and focused-heading outline suppression all pass.
Both production screenshots were inspected. Development's authenticated
navigation/export evidence is not a fresh personal Google login in production;
the earlier credential-boundary limitation remains unchanged. No paid inference,
new schema, migration, real charge or production customer-data write occurred.

**Outcome:** all three reported UI issues are corrected and deployed to both
development and production. Reload an older open tab to load the new asset
manifest. Default-Free welcome-credit provisioning remains outside this batch.

### Subsequent mobile action-placement review — 2026-10-07

Andrew reported the disabled Continue action looking strangely detached on
mobile and explicitly requested an independent Astra opinion. Scope: supplied
production screenshot and current application contract/CSS/markup at runtime
`0aa407c`, repository `a4f52ad`; not a new live real-iPhone or whole-app audit.

**Visual finding:** the bare fixed button is disconnected from its form card,
straddles the panel edge, and follows a large reserved blank area. Whole-button
disabled opacity makes the background show through. Fixed header, navigation
and browser chrome compound the mobile space cost. Prior containment/action-
separation assertions pass but do not establish good visual composition.

**Astra recommendation, not yet accepted:** put Continue, Review and final
Save/Export/download actions inside their respective active cards; remove
floating-action reserve while keeping bottom-navigation clearance. Use an opaque
muted disabled treatment. The trade-off is scrolling to Review on a longer
Design step. A consistent opaque fixed action bar is a credible alternative,
but consumes permanent space and adds keyboard/browser-toolbar handling.

The accepted application contract currently specifies fixed actions; it remains
unchanged until a replacement is accepted. Future verification must cover all
three steps, disabled/active states, keyboard, scrolling and short screens.
No runtime change, deployment or new browser/AI suite was performed for this
opinion; current production metadata was checked and prior scoped evidence reused.

### Accepted inline actions and single Sign out — 2026-10-07

Andrew accepted a simple solution consistent with Astra's recommendation and
authorized correcting the duplicate desktop Sign out and deploying this batch.
Baseline: repository `a4f52ad`, production runtime `0aa407c`. This supersedes
the fixed creator-action choice above, not the fixed application navigation.

Continue, Review and Save/Export/download now remain inside their step cards.
The extra floating-action padding is removed; bottom-navigation and safe-area
clearance remain. Disabled mobile creator buttons have opaque muted styling.
The application documentation records this choice and its scrolling trade-off.

Desktop's duplicate Sign out was a CSS specificity defect: the later global
text-button display rule overrode the header button's hiding rule. The scoped
header selector now wins on desktop; its mobile override keeps the single
header action visible when the sidebar is hidden. No auth or backend changes.

Affected web/E2E lint and type checks and the development asset build passed.
Development web Worker **`46ee14e0-2d5a-448f-8d17-efdb7d0c9bd3`** contains this
runtime tree; unchanged development services were not redeployed.

Focused navigation/draft/heading-focus checks passed **2/2** in desktop Chromium
and mobile WebKit. The final new inline-action/logout cases passed **2/2 (45.5s)**:
disabled and active actions, 320 × 568 / 390 × 480 / 390 × 844 phone viewports,
all three steps, contained actions above app navigation after scrolling, project
save, a real one-page PDF, download click and actual logout. Screenshots were
inspected: Continue is inside its card without the former blank gap; Save/Export
is contained; desktop has only the sidebar Sign out.

Initial harness checks were corrected rather than changing unrelated behavior:
Playwright's viewport-only "scroll if needed" does not account for a fixed
navigation overlay, so the scoped check explicitly scrolls actions into view.
Mobile WebKit does not supply a suggested filename for this Blob link; the
check validates actual PDF bytes and the download event instead. No code change
was made to authentication or PDF generation. Real iPhone software-keyboard and
browser-toolbar behavior were not exercised; existing production Google
credential limits above are unchanged. No schema/migration, paid AI request or
payment is involved. Production results follow.

#### Completed publication

Commit **`badf7062e5ee8ad59c524c7422dc4f5700ad78ae`** was pushed to main.
[CI 37671776761](https://github.com/kabytaa/bff/actions/runs/37671776761) passed:
repository validation **4m10s**, production deployment and release safety smoke
**2m18s**. Live TableCards build metadata matches this exact commit. Development
web remains the tested `46ee14e0-2d5a-448f-8d17-efdb7d0c9bd3` publication of the
same runtime tree. The final evidence-only Markdown commit does not redeploy.

Fresh public production browser checks passed **2/2 (10.0s)** in desktop
Chromium and mobile WebKit: import/long names, cards-only preview, contained
layout, disabled development controls and inline mobile Review. Both production
screenshots were inspected. Single visible Sign out and authenticated
save/download/logout were exercised in development, not with personal Google
credentials in production; the earlier limit remains explicit.

**Outcome:** both reported issues are corrected, committed/pushed and deployed
to development and production. Reload an older open tab for the current assets.
Free welcome-credit provisioning remains a separate open issue.

### Balanced long names and mixed examples — 2026-10-07

Andrew requested two-line long names, a varied example list, an independent
Astra opinion and deployment. Baseline: repository `4e76eca`, production
runtime `badf706`. Scope: name fitting and example input through desktop/mobile
preview, save and real PDF export; not an unrelated whole-app/auth/payment/AI
review. The supplied Garden Sage print photo shows very long single-line names
touching the artwork and four extreme names first.

Astra recommended balanced word splits before substantial shrinking, preserving
compound/nonbreaking names, protecting card/detail bounds and rotating line
offsets with the upper face. A follow-up accepted a 15% single-line reduction
allowance so medium names remain natural; truly long names get two lines.
The shared core now emits one/two ordinary text commands per name with 24 pt
side insets, 16 pt vertical bounds, 6 pt detail clearance and 1.25 em leading.
It preserves all name characters, never truncates or invents hyphens, and keeps
an explicit failure for impossible fits. Existing saved projects use the new
policy on preview/re-export; downloaded files remain unchanged.

The six example names now mix short, medium, accented and long names. Core
checks cover both fonts, all position/size choices, optional table/meal details,
both rotated faces, compound/nonbreaking cases, impossible fits, actual pinned
PDF-font parity and the 500-card ceiling. Scoped hosted checks exercise the
example action, both preview sheets, real saved/exported PDF lines and a download
on desktop Chromium/mobile WebKit. No schema/migration, provider call, payment
or production customer-data write is planned. Results/publication follow.

Local checks passed: **46 core tests**, **110 web tests**, scoped core/web/backend/
E2E lint/type checks and **11 private-file backend tests**, including foreign
account, missing identity and revoked session/member denials. The first hosted
run passed mobile save/export and both impossible-name cases but exposed a
desktop SVG measurement discrepancy: María's 23 pt line measured 205.179 pt
against the pinned 203.964 pt advance. Investigation showed inherited UI
`optimizeLegibility` and ignored SVG font presentation attributes. Explicit
printable-text CSS disables kerning/ligatures and uses `geometricPrecision`;
the same Chrome line then measured 203.969 pt. Astra endorsed this scoped fix.
The strict 204.5 pt browser bound is retained, not widened. Actual downloaded
mobile PDF pages were rasterized and inspected; their full names, two-line
order and card artwork are readable. This is screen/PDF evidence, not a new
physical printer measurement. Final hosted rerun and publication follow.

Final development browser rerun passed **4/4 (1m9s)**: mixed example order,
short one-line/long two-line SVG with strict width/computed-font rules on both
preview sheets and faces, save, an actual two-page PDF containing every preview
line exactly twice, download click, and explicit impossible-name recovery in
desktop Chromium/mobile WebKit. Both browser screenshot sets were inspected.
Development web Worker **`d746c2d7-5c2b-4d81-ba77-359d17580b25`** and the
TableCards `scrupulous-hawk-991` backend contain this runtime tree. Other
development services were unchanged. Production publication follows.

Commit `f0929fc2dbd961d41002f5f00f49039cee83fd8f` was pushed to main; development
backend health identifies that actual updated application release. Production
CI attempt 1 stalled in Ubuntu package setup and was cancelled before tests or
deployment. A fresh-runner retry was also slow; cancellation was requested just
before setup finally advanced, so no product failure is inferred from either
cancellation. CI now promotes its already configured official HTTPS Ubuntu
archive ahead of Azure's mirror on the ephemeral runner, preserving fallback,
signature checks and all normal validation/deployment gates. This is a scoped
release-infrastructure correction, not an application or schema change. The
[delivery tool documentation](../../../../tools/production-delivery/README.md#ci-scope)
links the official mirror configuration/format. Publication results follow.

The mirror correction release `c0bbbd54c616bc26c527b90b4d51854e7ee49d1d`
passed [CI 37678976550](https://github.com/kabytaa/bff/actions/runs/37678976550):
validation 4m1s and guarded production deployment/smoke 2m22s. Final inspection
found an existing-project edge case: renderer-version 2 could reuse a PDF made
with the previous single-line layout. The existing cache marker now advances
to 3; stale latest-export links are hidden and the next export regenerates,
while explicit old export IDs/files and saved project revisions remain intact.
There is no schema change, migration, backfill or deletion. A focused regression
covers regeneration, current-version deduplication and foreign-account denial.
Final cache-fix verification/publication follows.

Cache-fix checks passed: **13 durable-operation backend tests** and backend
lint/type checks. The changed TableCards development backend was pushed without
redeploying unchanged services. Focused mixed-name preview/save/export/download
reruns passed **2/2 (53.5s)** in desktop Chromium/mobile WebKit against that
backend, with real PDF bytes. Version-2 cache invalidation is covered by the
backend regression rather than mutating a production customer's export.

#### Completed balanced-name publication

Final runtime commit **`d8e83f2b0be316c5f75f1cb217c9f69a89ec6f4a`** was pushed
to main. [CI 37681234317](https://github.com/kabytaa/bff/actions/runs/37681234317)
passed repository validation **6m17s** and guarded production deployment/smoke
**2m11s**. Live TableCards web metadata and production backend health both match
this commit. The updated development backend identifies the same commit;
development web remains `d746c2d7-5c2b-4d81-ba77-359d17580b25`, with unchanged
application assets. Unchanged development services were not restamped.

Fresh public production mixed-example checks passed **2/2 (10.4s)** in desktop
Chromium/mobile WebKit: exact example contents, both sheets/faces, short
one-line and long two-line names, strict measured width and computed-font
rules, preview return and no horizontal page overflow. All four production
screenshots were inspected. The final development PDFs are byte-identical
across browsers and their rasterized output was inspected. Private authenticated
production export remains subject to the Google-credential limit recorded
above; development export and production public checks are distinct evidence.

**Outcome:** Astra's balanced-wrap approach and varied examples are implemented,
committed/pushed and deployed to development/production. Refresh an older open
tab, then create a new PDF for existing projects; previously downloaded PDFs
cannot change. No schema/migration, production customer-data repair or paid AI
call was needed. The evidence-only Markdown follow-up skips CI/deployment.

### Free welcome-credit provisioning — 2026-10-08

Baseline: repository `deb3a23`, deployed production runtime `d8e83f2`. Andrew
approved the fix and both deployments, including the exact compatible addition
of `default` to `accountAccessGrants.source`. Existing rows remain valid; no
table/field/index changes, migration, deletion or mass customer backfill.

The TableCards backend now initializes its code-owned Free definition once on
the next authorized product-access request. Shared BFF's server-only endpoint
requires a live account context plus the environment service credential,
validates bounded input and inserts only if no grant exists. It returns an
upgrade that won a race untouched, and never writes/resets bucket consumption.
The existing `welcome-lifetime-v1` allocation is reused; prior consumption stays
spent. Development mock gates remain disabled in production. No paid AI call
is necessary to provision or verify the credit.

Focused backend tests cover concurrent initialization, one granted unit,
failure release and replay, successful consumption and replay, refresh after
consumption, existing provider/mock grants, legacy consumed buckets, missing/
wrong/cross-environment service credentials, signed foreign account/membership
and revoked sessions. TableCards transport/action checks run with its mock gate
disabled. Hosted desktop/mobile account/reload/save checks and publication
results follow; authenticated production Google flows remain credential-limited.

Local verification passed: **85 shared BFF backend tests**, **86 TableCards
backend tests**, **4 affected contract tests**, **5 affected SDK tests** and
**16 production smoke-tool tests**, including rejection of an unprotected
default initializer. All six affected projects' lint/type checks, changed-source
format/secret checks, repository ownership boundaries and added local-doc links
passed. Both changed backends were pushed to their existing development targets,
shared BFF first, without republishing unchanged web/auth/gateway/AI services.

Final hosted development checks passed **2/2 (51.3s)** in desktop Chromium and
mobile WebKit. Fresh sign-in without choosing a mock offer shows Free / Default
access / one lifetime batch; reload and saving a project preserve that unit.
Generating four choices with the explicitly selected development image fixture
exercises the real BFF reserve/commit path and leaves zero after another reload.
No paid provider calls occurred. Account screenshots were inspected in both
viewports. An initial extended mobile test missed its editor step during route
loading; the test now waits for the editor and explicitly chooses the mobile
Design step, without force-clicking or changing product behavior. Commit and
production publication follow.
