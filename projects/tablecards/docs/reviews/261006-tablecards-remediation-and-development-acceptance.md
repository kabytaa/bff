# TableCards remediation and development acceptance

Created: 2026-10-06
Updated: 2026-10-06
Status: Complete — development acceptance verified; not a production release
Runtime baseline: `a914da02088e4a0724e290117aad11976515405b` on `feat/tablecards-application`
Scope: authorized development fixes and repeated review; no production promotion

## Outcome and scope

The accepted [remediation plan](../../../../.agent/plans/261006-tablecards-review-remediation.md)
implements the findings preserved in the [original combined review](261006-build-3-documentation-and-readiness.md),
[app review](261006-tablecards-app-review.md) and [Astra readiness review](261006-tablecards-readiness-review.md).
Source fixes, repository validation and coordinated development deployment are
complete. A fresh full hosted run passed all 27 cases. Earlier interrupted runs
with exit 143 remain diagnostic history, not passing evidence. Production
remains unchanged. See the [independent application review](261006-tablecards-remediation-app-review.md)
and [Astra security/readiness review](261006-tablecards-remediation-security-review.md)
for their separate observations and scope limits.

The work used the execution/Convex/testing/cleanup skills and the separate
app/readiness reviews. Those reviews discovered additional defects during
remediation; fixes received regression tests and another independent check.
No paid image generation, real charge, outreach, merge, destructive migration
or production deployment was performed. User usability review is optional.

## Findings addressed

| Finding                                                                      | Delivered change and evidence                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Reviewed edits exported old saved guests/title                               | Save/export uses the current normalized draft; stale download state is cleared. Hosted regression reads actual PDF title, duplicate multiplicity and absence of old names.                                                     |
| Foreign storage IDs could be finalized or deleted                            | Fully decoded, bounded direct uploads are server-owned; legacy upload/finalization fail closed. Backend tests prove denial cannot read/attach/delete foreign files.                                                            |
| Queued export could render a different revision                              | Render snapshot and job scheduling are atomic; edits cannot relabel the queued PDF. Interleaving/retry tests inspect real output.                                                                                              |
| Charged AI outputs could be lost on interruption                             | Durable output/commit state and original-key recovery survive uncertain responses and reload, including zero available units. Confirmed terminal failure releases once and permits a new attempt.                              |
| Private files were bearer URLs                                               | New files use authenticated HTTP bytes with live BFF session/membership checks and scoped lookup. Browser Blob leases are bounded and cleared on scope changes. Historical links are not retroactively revoked.                |
| Artwork and growing libraries were incomplete or memory-heavy                | Metadata-only 24-row pages, exact selected-artwork lookup, viewport byte leases and bounded cache; older presets and archives have usable Load more/retry. 130-record integration cases cover order, isolation and exhaustion. |
| Mobile exit, primary actions, preview and navigation were missing            | Reachable sign-out, persistent actions and bounded complete-preview dialog; account switching leaves the previous saved route. Phone and desktop review verifies state and geometry.                                           |
| Blank thumbnails, misleading fit errors and raw errors                       | Real catalog artwork, current custom-artwork resolution, event-title/name preflight and safe operation-specific notices/retry. Event Pass exposes its allowed style controls.                                                  |
| Workspaces lacked names; rename confirmation disappeared                     | Owner-authorized naming plus silent same-context SDK refresh. Epoch guards prevent late rename responses from undoing switch/logout; 57 SDK tests pass.                                                                        |
| Invitation-copy confirmation could be overwritten                            | Separate link-keyed status survives invitation reload. A two-second bound selects the matching link for manual copy when clipboard access cannot finish. Four regression cases pass.                                           |
| Saved projects used visitor marketing; compact brand had no accessible label | Public/new-authenticated/edit introductions now reflect the journey; the compact phone link retains an explicit destination label.                                                                                             |
| Font/disclosure/deployment evidence was incomplete                           | Licensed pinned Noto Sans/Serif, checked metrics and actual accented PDF tests; factual no-charge/privacy/terms/contact pages; exact deployment stamps and reproducible font probes.                                           |

## Verification completed

- Complete Node 24 repository command `NX_PARALLEL=1 pnpm check`: passed
  after runtime source freeze, in 2m38s. It includes format, lint, ownership
  boundaries, types, tests, backend integration, builds, production-bundle
  guards, secret scan and local auth/backoffice browser tests. Valid unchanged
  Nx cache was reused; changed/risky paths also have uncached checks.
  A final complete rerun after test-selector and documentation reconciliation
  also passed in 1m11.7s; runtime source stayed at `a914da0`.
- Independent final web run: 92 tests across 14 files, one worker and unchanged
  timeouts. Independent SDK run: 57 tests across 8 files. Core font/render checks
  passed 40 tests; backend private-file, export/AI and library cases passed in
  the repository gate and focused independent runs.
- Focused E2E lint/type checks passed after exact selector corrections. Test
  assertions distinguish the brand from Projects navigation, await saved
  project hydration/save completion and scope modal versus inline previews.
  They still inspect actual outcomes rather than merely whether a button exists.
- Independent deployed-version/font probes passed for the exact runtime below.
- Fresh full hosted suite: **27/27 passed in 7.1 minutes**, completed at
  22:02 UTC. Configuration contains 27 cases: 17 desktop
  Chromium and 10 mobile WebKit, one worker, zero retries. Its registry covers
  US-01–US-20 using cohesive journeys and focused regressions, not an exhaustive
  browser Cartesian product. Unexpected interrupted attempts are retained as
  diagnostic history, not acceptance. The final direct Playwright invocation
  uses that unchanged configuration in a persistent terminal.

The hosted run exercised all four shared no-charge offers, CSV/import and auth
return, current edited PDF contents, embedded-font 500-card export, anonymous
and revoked private-file denial, project lifecycle, event artwork, presets,
four AI choices and unit accounting, workspace naming/sign-out, and complete
Studio invitation/copy/reissue/accept/account-isolation/role/transfer/removal
journeys in both supported browser profiles. It did not exercise real payments
or replace the deeper negative/concurrency backend cases.

## Exact development deployment

Coordinated development maintenance built/deployed web/font assets first,
then both Convex backends, gateway and central authentication. All backend and
gateway health responses report the full runtime baseline above; acceptance
resumed only after every surface and font check agreed.

| Surface                  | Verified deployment                                                         |
| ------------------------ | --------------------------------------------------------------------------- |
| TableCards web           | `5e9f85d0-abe2-46c5-bfbe-33d1b744ed09`; entry `/assets/index-Dkyj-h_x.js`   |
| Session gateway          | `80995c14-d28f-4d70-bdb9-42559534f838`                                      |
| Central development auth | `136d2837-adec-458f-a2a3-8841250d5e81`                                      |
| TableCards Convex        | `scrupulous-hawk-991`; development push/typecheck passed 21:51:40 UTC       |
| Shared BFF Convex        | `compassionate-buffalo-689`; development push/typecheck passed 21:51:40 UTC |

[Operations](../operations.md) records exact URLs, safe probes, font hashes,
configuration ownership and recovery boundaries. Credentials and unredacted
browser artifacts are not in Git.

## Remaining boundaries, not hidden acceptance claims

- This does not establish TableCards production readiness or customer launch.
  PR #1 remains unmerged; production provisioning/deploy/smoke needs its own
  authorized release work.
- Checkout is shared BFF-owned and explicitly no-charge. Development AI is
  deterministic. Build 4 owns verified payment/paid-through renewal, expiry,
  cancellation/restrictions and retention; Build 5 owns two-way support;
  Build 6 monitoring/analytics/operator visibility; Build 7 launch.
- New private-byte access can be revoked, but already delivered bytes and
  previously issued development bearer links cannot be recalled without
  separately authorized cleanup.
- Automated WebKit is not physical iPhone Safari. Browser geometry/font tests
  do not prove printer scaling, Avery perforation alignment or arbitrary
  scripts. Four-up US Letter is the accepted contract; six-up remains a trial.
- Bounded keyboard/responsive inspection is not a full assistive-technology,
  security penetration or legal-compliance certification. Seller/provider
  identity and formal commercial disclosures are later-stage requirements.
