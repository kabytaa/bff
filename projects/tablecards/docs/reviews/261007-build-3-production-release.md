# Build 3 production release review

Created: 2026-10-07
Updated: 2026-10-07
Status: Ready for the authorized Build 3 no-charge production preview; not customer launch
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
