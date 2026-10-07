# TableCards remediation independent security and readiness review

Created: 2026-10-06
Updated: 2026-10-06
Status: Passed for the declared development boundary
Repository baseline: initial review at `3a948ad`; follow-up after `902dd39`; first hosted candidate `11c0be6fa5a13cdc28a9ccf1b3c56396b5613450`; replacement candidate `a914da02088e4a0724e290117aad11976515405b` on `feat/tablecards-application`
Declared boundary: Build 3 development acceptance only

## Review scope and current verdict

**Development readiness passes for the declared remediation boundary** at
`a914da02088e4a0724e290117aad11976515405b`. This combines the independent
source/test and exact-deployment probes below, the independent
[application review](261006-tablecards-remediation-app-review.md), and the
coordinator's complete fresh 27-case hosted pass. The independent
source/security review found three additional P2 issues during implementation;
all three were corrected and their final source/regression assertions inspected.
No remaining blocker was identified within the reviewed paths. Production and
customer launch are outside the authorized boundary and are not approved.

The audit applies [review-business-readiness](../../../../.agents/skills/review-business-readiness/SKILL.md).
It inspected the product/application/architecture/operations contracts, prior
failed reviews, file transport, export snapshots/completion, AI operation state,
BFF live session checks and workspace naming. It changed no runtime source,
provider configuration or deployment, and made no paid call or outreach.
The coordinator owns canonical-document and STATUS reconciliation.

## Independent evidence

- Node 24 TableCards backend integration suite: **36 tests passed**, 2026-10-06,
  after the final fixes, with one worker and file parallelism disabled.
  Inspected assertions cover authenticated byte transport, foreign file denial,
  replay, attachment cleanup, immutable export contents, PDF text/multiplicity,
  lost completion responses and AI commit/result preservation.
- Node 24 BFF `productAccess.test.ts` and `customerAuth.test.ts`: **14 tests
  passed**, 2026-10-06. Inspected live-session expiry/logout and membership
  denial checks, and Owner-only, environment-scoped workspace naming.
- Node 24 focused web `creator.test.tsx`, `pages/designs-page.test.tsx` and
  `backend.test.ts`: **20 tests passed** serially, including current-input
  save/export, original AI-operation recovery after remount at zero units,
  safe errors, private Blob delivery and account-change cache invalidation.
  Initial concurrent backend/web runs each hit one default five-second timeout;
  both serial reruns passed without changing assertions or timeouts.
- Independently exercised the installed `image-size` dependency with a
  synthetic 24-byte PNG header: it reports 1050 × 600 although no image pixels
  or complete PNG exist. After correction, independently called the complete
  validator: a valid PNG passed and synthetic excessive IDAT/iCCP expansion
  failed with the bounded-decompression error before the full decoder ran.
- Consulted current official [Convex private file serving](https://docs.convex.dev/file-storage/serve-files),
  [upload transport](https://docs.convex.dev/file-storage/upload-files) and
  [scheduling semantics](https://docs.convex.dev/scheduling/scheduled-functions).
  Authenticated HTTP bytes are the appropriate per-request authorization
  boundary; mutation scheduling can be atomic with job creation.

## Discoveries during remediation review

All three issues were communicated promptly to the implementation coordinator
and fixed in the reviewed tree. The earlier failed reports remain historical
evidence rather than being replaced or deleted.

1. **P2 — corrected: AI recovery after reload.** Persisted, potentially charged outputs
   require the original idempotency key, but the first remediation held it only
   in a component ref. Reload/navigation lost the only customer recovery path.
   The new `aiState:pendingForCaller` query retrieves the original prompt/key
   only for the requesting user, account and exact event/reusable scope. The
   backend suite verifies wrong-user/account/event exclusion, completion
   recovery and disappearance after ready. Creator and Designs load this state
   before enabling another generation and allow recovery at zero remaining units.
2. **P2 — corrected: export scheduling interruption.** The first remediation inserted its
   queued snapshot and scheduled rendering in separate action steps. Losing the
   insertion response left a queued record whose retry never scheduled work.
   Scheduling now belongs to the insertion mutation. Tests verify scheduling
   failure rolls back the row and retry/deduplication leaves one scheduled job.
   Snapshot-interleaving tests inspect the actual rendered PDF and old revision.
3. **P2 — corrected: incomplete image validation.** Header metadata alone admitted a
   truncated non-image as validated artwork. There was also no decoded-pixel
   ceiling. Upload now requires complete PNG/JPEG decoding before storage,
   exact 7:4 dimensions and at most 2 megapixels. PNG color depth, palettes,
   chunk count and IDAT/iCCP expansion are bounded; CRCs are checked. JPEG
   decoding enforces 2MP/32MiB allocation limits. Tests reject truncated PNG,
   missing IEND, truncated JPEG, oversized dimensions, excessive compressed
   expansion and 16-bit PNG. The conservative bounds account for the official
   [64MiB Convex HTTP runtime limit](https://docs.convex.dev/production/state/limits).

## Applicability and limits

### Follow-up source review after `902dd39`

The coordinator requested a further independent review of fixes discovered
during final application verification. On 2026-10-06 the reviewer inspected
account-scoped metadata pagination, exact selected-artwork retrieval, lazy
authenticated byte delivery and reference-counted cache eviction, terminal AI
failure versus uncertain completion, restored custom-artwork previews, checked
font metrics/title preflight and operation-specific checkout recovery.

The independent backend rerun passed **43 tests** and the core rerun passed
**40 tests**, serially with unchanged timeouts. After all runtime source was
frozen, the independent full web rerun passed **85 tests across 13 files**,
also serially with unchanged timeouts. The 130-item paging tests check
complete ordering, bounded 24-item pages, cursor/account isolation and final
exhaustion. After the final archived-project addition, the independent
`libraryPages.test.ts` rerun passed all **7 tests**, including the new project
account/state boundary. Exact asset reads remain account/project scoped. The reviewed byte
adapter never sends credentials to an arbitrary projection URL, keeps active
preview leases during eviction and rejects deliveries finishing after a scope
change. The hook releases offscreen and unmounted deliveries.

AI now returns a persisted terminal `failed` batch after a confirmed provider
failure, allowing a new attempt/key; unknown completion continues with the
original key. Tests prove one release, no charge on failure, same-key replay
and a successful new attempt. Custom artwork from the current unsaved draft is
resolved by its exact authorized asset reference; missing/loading bytes block
save/export rather than displaying a different predefined background.

The font suite regenerates checked advances from both hash-pinned fonts and
actually renders PDFs with composed/decomposed common Latin, rejected residual
marks and positive-kerning edge fixtures. Browser/PDF use the same normalization
and disabled kerning/ligature features. Current event-title preflight is also
covered. This establishes the tested font contract, not physical printing or
arbitrary script support.

The final UI regressions cover older preset selection with its exact style,
same-cursor failure/retry, deduplication/end state, selection retention through
library refresh and stale-page cancellation. Archived projects now have a
bounded account/state-scoped page API and customer Load more controls. The
review inspected that final API and its added integration assertion; the web
rerun exercised older-project restore, failure recovery and filter transitions.
Active-project usage still reads the complete enforced maximum of 100 projects.

No source/security blocker was identified in these final inspected paths.
The separate whole-repository, deployed-runtime and hosted-app prerequisites
were subsequently satisfied as recorded below.

### Deployed candidate verification

The coordinator reported the complete Node 24 `NX_PARALLEL=1 pnpm check` gate
passed and deployed candidate `11c0be6fa5a13cdc28a9ccf1b3c56396b5613450` to the
existing development targets. This reviewer independently fetched BFF,
TableCards backend and session-gateway health: all three returned HTTP 200,
`status: ok` and that exact version. Independent public font fetches returned
HTTP 200 and the Noto Sans/Serif SHA-256 hashes matched their code-owned pins.

Deployment context supplied by the coordinator: web Worker
`2fb342a4-d6ee-4eb3-8bca-e88ae624ea1d`, gateway Worker
`dc564170-ebc7-4e07-b844-21c22407c01f`, and customer-auth Worker
`25e3ac4f-b666-4b38-96b7-840ee738b1bf`. Worker identifiers are supplied deployment
evidence; the health/font responses above were independently observed.
The first 27-case hosted run was interrupted with exit 143 after case 25 and is
not a passing acceptance result. Hosted testing exposed a workspace-rename
feedback loss caused by an authentication `loading` transition remounting the
application. The replacement SDK implementation silently refreshes the
original selected account's authoritative context, guarded by the epoch
captured before the mutation. It does not reactivate the renamed account after
an intervening account switch, sign-out or disposal. The reviewer inspected
those guards and independently reran all **57 SDK tests across 8 files** on
Node 24, serially: passed. Regressions assert no transient loading state,
switch-during-mutation safety, sign-out-during-refresh safety and fail-closed
revoked-session handling. The Convex adapter's identity key remains based on
user/account rather than mutable display metadata.

A separate Team correction keeps invitation-copy feedback keyed to its link
and independent of late invitation-list reload notices. Copy requests now
have a two-second bound and select the still-current link for manual copying
on missing, rejected or indefinitely pending Clipboard APIs. The review
inspected these guards and independently reran the final web suite after its
freeze: **92 tests across 14 files passed** on Node 24, serially with unchanged
timeouts. The implementation reviewer reproduced the notice-overwrite race
against the old source; an isolated native Chromium Clipboard API probe
resolved, so this report does not claim the hosted failure proved a native
permission hang. Creator intro copy now distinguishes signed-in editing and
the compact brand has a meaningful accessible name.

The coordinator reported the complete Node 24 root gate passed again after
the runtime freeze (2m38), then committed/pushed and deployed replacement
candidate `a914da02088e4a0724e290117aad11976515405b`. The reviewer independently
fetched all three health endpoints again: HTTP 200, `status: ok`, exact
replacement SHA. Both hosted font responses again returned HTTP 200 with the
pinned SHA-256 hashes. Supplied replacement deployment identifiers: web Worker
`5e9f85d0-abe2-46c5-bfbe-33d1b744ed09` (entry `index-Dkyj-h_x.js`), gateway Worker
`80995c14-d28f-4d70-bdb9-42559534f838`, customer-auth Worker
`136d2837-adec-458f-a2a3-8841250d5e81`.

The replacement's first hosted attempt also exited 143 after case 13; it is
not acceptance evidence. A legacy substring locator additionally matched the
new accessible brand name and was made exact without runtime changes.
The coordinator subsequently completed the fresh direct Playwright run using
the configured persistent terminal: **27/27 passed in 7.1 minutes**, one
worker, zero retries, 17 desktop Chromium and 10 mobile WebKit cases. This is
supplied full-run evidence, distinct from this reviewer's independently
executed source suites and public probes. It covers all four no-charge offers,
actual current-draft and 500-name PDFs with embedded fonts, private-file
anonymous/revoked denials, workspace feedback and both-device Studio
invitation/reissue/acceptance, two-account, role/ownership and removal paths.
The deployed runtime remained `a914da02088e4a0724e290117aad11976515405b`; later
selector precision changes affect tests only.

The independent application reviewer additionally exercised the real auth
handoff, current-edit actual PDF, restored uploaded artwork, presets, rename
feedback, archive/restore, sign-out and navigation at 1280-, 390- and 320-pixel
widths. Its report records no visible blocker and no horizontal page overflow
in those representative journeys. These combined observations satisfy this
declared development boundary; they do not extend it to production or launch.

| Readiness lens                | Applicability and current evidence                                                                                                                                                                                                                                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product and commercial truth  | Applicable. New policy source explicitly describes proposed prices, no-charge checkout, simulated renewal and development AI. Actual payment/retention lifecycle is not applicable to this development boundary.                                                                                                             |
| Experience and accessibility  | Applicable; bounded pass. Fresh hosted desktop/mobile registry and independent representative app review passed. This security audit does not assert screen-reader or full accessibility conformance.                                                                                                                        |
| Security and privacy          | Applicable, bounded source/integration **pass**. New file addresses contain no JWT/storage bearer link; each byte request rechecks BFF access and account scope. Legacy upload finalization fails closed. Uncertain attachments preserve linked files; AI commit interruption preserves four private outputs and one charge. |
| Legal and disclosures         | Applicable proportionately to the public development preview. Privacy/terms/contact source describes real vendors, stored data, archive versus deletion and absent public support. Seller/commercial/legal verification is unverified and belongs before paid launch.                                                        |
| Performance and compatibility | Applicable; bounded pass. Files, decoded images and browser object-URL retention are bounded; final desktop Chromium/mobile WebKit hosted coverage passed. Physical device/print output is unverified.                                                                                                                       |
| Operations and deployment     | Applicable; development pass. Exact candidate health/fonts and fresh complete hosted suite passed. Production deployment, production recovery drill and later support/monitoring are not established by this audit.                                                                                                          |

Older development bearer links can still deliver their retained files; the
accepted plan explicitly excludes destructive migration and the new privacy
copy explains the limit. Bytes already downloaded cannot be revoked. This is
not a claim that historical links have been invalidated or that real-customer
production privacy is approved.

The four-card US Letter contract still requires physical measurement before
launch; the six-card layout remains a trial. Paid image quality, real billing,
seller/legal verification and later operational stages remain outside this
development remediation. Routine human usability review is not a completion
gate.
