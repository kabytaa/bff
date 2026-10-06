# TableCards remediation development application review

Created: 2026-10-06
Updated: 2026-10-06
Mode: Full application, remediation audit only
Result: **pass for the reviewed development application scope.** This is not
production readiness or launch approval.

## Scope and exact baseline

This review applies the repository's `review-business-app` workflow to the
successor of the failed [2026-10-06 application review](261006-tablecards-app-review.md).
The reviewed runtime candidate is
`a914da02088e4a0724e290117aad11976515405b` on
`feat/tablecards-application`, deployed only to
`https://tablecards-dev.tofler.app`.

The coordinator supplied these exact deployment identifiers after a coordinated
development maintenance window:

- web Worker `5e9f85d0-abe2-46c5-bfbe-33d1b744ed09`, serving
  `/assets/index-Dkyj-h_x.js`;
- session gateway Worker `80995c14-d28f-4d70-bdb9-42559534f838`;
- customer-auth Worker `136d2837-adec-458f-a2a3-8841250d5e81`;
- shared BFF and TableCards Convex development deployments pushed successfully
  at the same candidate boundary.

The coordinator reported HTTP 200 health from BFF, TableCards and the session
gateway with the exact candidate SHA, plus HTTP 200 and matching pinned hashes
for both hosted Noto fonts. The coordinator also reported the complete Node 24
repository gate passing in 2 minutes 38 seconds. Those are supplied deployment
and gate facts, not browser observations invented by this reviewer.

The independent browser pass used fresh synthetic development identities and
the real development auth handoff, session gateway, TableCards backend,
no-charge checkout and file endpoints. It used desktop Chromium at
1280 × 900 and mobile WebKit at 390 × 844, then resized the same mobile journey
to 320 × 844. Temporary screenshots and drivers remained outside the
repository. No session grant, cookie, bearer token, invitation secret or
private customer content was retained. No production target, paid model,
provider configuration or real user data was used.

## Independent rendered evidence

| Journey or quality boundary          | Result | Direct evidence and limit                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public landing and policies          | pass   | Landing showed all four accepted offers, independent-printing scope and no horizontal overflow. Privacy, Terms and Contact each rendered a real heading.                                                                                                                                                                                                           |
| Saved-project edit and current PDF   | pass   | Saved three old guests, reloaded the saved route, replaced them with two identical `Łukasz Dvořák` rows, changed the title and exported without a separate save. The parsed PDF title was `Reviewed current event`, had two pages, contained the duplicated name four rendered times and contained none of the old names.                                          |
| Saved-project state and introduction | pass   | Saved-route hydration completed before editing. The page showed `Edit your sheet`, current-edit guidance and no `Try it before you sign in` copy. Reopening returned `Reviewed current event`.                                                                                                                                                                     |
| Private uploaded artwork and preset  | pass   | Planner Pro was selected through the no-charge development checkout. A valid 1050 × 600 predefined JPEG was uploaded, a reusable serif preset was saved, selected on the existing project, saved and then restored after a hard reload. The selected artwork remained visible rather than falling back to catalog art.                                             |
| Designs visual comparison            | pass   | All six predefined catalog entries rendered real SVG image references with visibly distinct artwork. Uploaded artwork and the saved reusable preset rendered; the desktop route had no horizontal overflow.                                                                                                                                                        |
| Workspace naming and pricing return  | pass   | Renaming to `Independent review workspace` kept the visible `Workspace name saved.` status through the SDK context refresh and updated the shell. View plans settled at `/#pricing`.                                                                                                                                                                               |
| Projects lifecycle                   | pass   | The edited project appeared with its current two-card count, archived, appeared under Archived and restored back to its saved route. No stale previous content was shown.                                                                                                                                                                                          |
| Phone session and navigation         | pass   | At 390 pixels, Sign out and all four bottom-navigation destinations were visible. Logout returned to the public signed-out state.                                                                                                                                                                                                                                  |
| Phone creator and complete preview   | pass   | Authenticated `/create` exposed an accessible `TableCards projects` brand destination and `Create your place cards` heading. Two guests advanced through the step-focused creator; the complete sheet opened in a bounded modal and had a clear Return to editor action.                                                                                           |
| 320-pixel layout and primary action  | pass   | Creator, Projects and Account had zero horizontal page overflow. Review and export remained visible above the fixed bottom navigation at roughly 721 CSS pixels in an 844-pixel viewport.                                                                                                                                                                          |
| Basic keyboard route focus           | pass   | Projects route focus landed on the `Projects` heading; the next Tab reached `Create project`. Visible focus styling and labelled native form controls were present. This is not a full screen-reader or WCAG audit.                                                                                                                                                |
| Team invitation copy recovery        | pass   | Studio and Team rendered the five-seat/invitation surface. With a deliberately never-settling clipboard request, the UI bounded the wait, showed the manual-copy explanation and selected the complete one-time link. No invitation secret was printed or captured. Source tests additionally cover success and missing/rejected clipboard.                        |
| Complete 27-case hosted registry     | pass   | Coordinator-run configured Playwright completed 27/27 in 7 minutes 9.6 seconds with one worker and zero retries: 17 desktop Chromium and 10 mobile WebKit. It covered all four offers, edited/private/500-card PDFs, private-file 401/revocation, full Studio invitations, copy/reissue/acceptance, accounts, roles, transfer and removal on both device profiles. |

No customer-visible error, dead primary action, stale project content or
horizontal-overflow defect appeared in the completed independent journey.
Desktop application interaction produced no console errors. The final mobile
logout produced an expected unauthenticated product-access console line while
the authenticated tree was being torn down; logout still completed and no raw
error reached the customer UI. Expected-denial telemetry remains a later
monitoring concern rather than evidence of a failed visible journey here.

Private file fetches that were still in flight were aborted when the review
navigated between routes or disposed the account scope. The successful artwork
and PDF results were browser Blob URLs; anonymous/revoked private-file denials
remain covered by the focused hosted remediation scenario and backend tests,
not inferred from screenshots.

## Source, architecture and documentation reconciliation

The review independently traced the changed UI into its current server and
documentation contracts:

- PDF requests atomically snapshot the current saved revision and schedule the
  render; stale downloads disappear after edits.
- Upload validation fully decodes bounded PNG/JPEG content before storage;
  private rows expose relative authenticated file addresses rather than new
  storage bearer URLs.
- The browser resolves only selected/visible private artwork, balances leases
  against a bounded inactive-byte cache and clears it on account/session change.
- Assets, presets and archived projects use account-indexed 24-row cursor pages;
  an exact account-scoped asset lookup restores older selected artwork outside
  the compatibility list window.
- Pinned Noto Sans/Serif bytes, generated browser advances and server PDF
  preflight share NFC/Latin coverage and fitting rules. Stored names are not
  rewritten, residual combining marks reject, and both SVG/PDF disable kerning
  and discretionary ligatures.
- Durable AI recovery retains the original idempotency key and caller scope;
  completed descriptors survive lost responses without an additional unit.
- Workspace rename performs a same-account metadata refresh without clearing
  authentication or remounting the Business. Late refreshes cannot restore a
  switched or signed-out context.

Business documentation ownership is consistent: Product, Application,
Architecture, Operations and reviews live beside TableCards; the old root
product path is a compatibility router; shared BFF details remain linked to
their root canonical records. The architecture explains all six product tables,
the new metadata pages/exact lookup, authenticated byte routes and BFF/product
trust boundary. Operations now gives credential-free hosted font hash commands
and canonical expected pins rather than asking an operator to accept HTTP 200.

The complete hosted result is now available for final canonical-document
reconciliation. Historical failed findings and old deployment evidence must
remain dated history, not be silently rewritten as if they had passed.

## Remaining boundaries

- WebKit emulation is not a real iPhone/Safari hardware test. No screen reader,
  quantitative contrast/touch-target audit, zoom/reflow audit or network-loss
  recovery study was performed.
- Physical 100%-scale output, printer margins, the six-card landscape trial,
  real Google, real Paddle, live image-provider quality/cost and any production
  TableCards deployment remain unverified or belong to later stages.
- Previously issued legacy development bearer links remain a documented
  revocation limitation until their files are separately retired.
- Passing development remediation does not complete Build 3 under the
  repository rule. Production deployment and production smoke require separate
  authorization and evidence.

No further application or documentation defect is recorded from the completed
independent paths. The unverified boundaries above are explicit limits, not
accepted-risk waivers.
