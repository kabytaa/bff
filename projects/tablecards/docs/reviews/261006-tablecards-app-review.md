# TableCards development application review

Created: 2026-10-06
Updated: 2026-10-06
Mode: Full application, audit only
Result: **fail** — one P1 correctness defect and several reproducible application/UX defects. This is not a production-readiness verdict.

**Resolution, 2026-10-06:** The failed baseline and findings below remain
historical evidence. The [successor application review](261006-tablecards-remediation-app-review.md)
passes for runtime `a914da0` in development; the [combined acceptance](261006-tablecards-remediation-and-development-acceptance.md)
maps the fixes and 27-case hosted proof. This does not imply production or
customer-launch approval.

## Scope and baseline

Applied [review-business-app](../../../../.agents/skills/review-business-app/SKILL.md), using the [documentation ownership contract](../../../../docs/factory/business-documentation.md) and the committed Product/Application contracts at `b5aeae3f7d48924365e37bf5dcbd9abaf73e84f0`. Concurrent documentation reconciliation was excluded from the reviewed baseline. Runtime source, browser tests and dependencies have no changes from the supplied runtime baseline `0067776` to that checkpoint; the changes are documentation and skill artifacts. A final diff also found no concurrent runtime/test/lockfile edits.

Reviewed `https://tablecards-dev.tofler.app` and its real development authentication, same-site session gateway, TableCards Convex and shared no-charge checkout. TableCards backend health returned `200`, `status: ok`, `service: tablecards-backend`, `version: development`. The observed web entry was `/assets/index-WCJzftky.js`, with `/assets/index-CLv86dj5.css`. The handoff identifies TableCards Worker `c82c37eb-b670-4a28-884b-4cd2b559ba9d` and customer-auth Worker `9b85e6d6-314b-4b89-b7de-6cef22b63bf5`; their exact live commit identity was not independently exposed by these browser/health probes. Treat those Worker identifiers as supplied deployment context, not a fresh deployment-version assertion.

The repository at this checkpoint has separate landing, creator, Projects, saved Project, Designs, Account, Team and invitation routes; real account-scoped persistence/PDF APIs; deterministic development AI; and a BFF-owned mock checkout. Production, real Google accounts, paid providers and policy-changing operator fixtures were outside this audit. Only fresh synthetic development identities and normal customer mock journeys were used. No application fix, policy override or deployment was made.

## Evidence and checks

Independent rendered inspection used desktop Chromium at 1280 × 900 and mobile WebKit with the iPhone 13 profile, including 390-pixel layouts and a 320 × 844 CSS-pixel check. Screenshots were inspected for landing, empty creator, mapping, premium selection, review, saved project, account, Designs/presets, provider error and Studio roster. Captures and the temporary driver remained outside the repository; session grants, cookies and invitation secrets were never saved in evidence. Downloaded PDF bytes were decoded in memory to compare their actual text with the edited UI.

| Check                                                                       | Result         | Evidence and boundary                                                                                                                                                                                                              |
| --------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing clarity, PDF-only scope and create entry                            | pass           | Direct desktop/mobile inspection. Four accepted offers, independent-printing copy and working create action.                                                                                                                       |
| Public list/grid import, column mapping, duplicate preservation and preview | pass           | Direct grid journey with duplicate Ada rows, table/marker fields and a realistic long name; rendered mapping and sheet controls inspected.                                                                                         |
| Synthetic authentication return and initial Free export                     | pass           | Direct auth handoff restored the bounded draft; downloaded PDF had two pages, the scale guide and all three original guests.                                                                                                       |
| Export of the current edited revision                                       | fail           | Direct downloaded-PDF comparison: corrected two-guest preview exported the previous three-guest revision; F1.                                                                                                                      |
| Invalid and unfittable input feedback                                       | fail           | Unsupported emoji produced an actionable row error. A permitted 120-character name that cannot fit produced the misleading empty preview; F4.                                                                                      |
| Planner upgrade, artwork and reusable preset                                | pass           | Visible landing offer → shared checkout → no-charge completion → Designs upload → named serif/large preset save. Existing suite supplies rename/reuse/delete coverage; this audit independently created and inspected a preset.    |
| AI accounting and four-choice generation                                    | pass           | Direct mock provider failure retained 10 batches; subsequent successful generation produced four background assets. Error presentation fails separately; F5.                                                                       |
| Studio capability through customer checkout                                 | pass           | Visible Studio checkout → Team exposed five seats and invitation controls, without an operator policy fixture.                                                                                                                     |
| Invitation creation, copy recovery, reissue and acceptance                  | pass           | Direct Owner UI; unavailable clipboard gave selectable-link fallback. Old reissued link showed revoked; intended signed-in recipient accepted the new link and joined the Studio. Secrets stayed in memory.                        |
| Team Member permissions                                                     | pass           | Direct mobile roster showed both members and no invitation/membership mutation controls for the Member.                                                                                                                            |
| Admin, ownership transfer, removal, archive/restore, Event Pass and XLSX    | pass           | Supplied 2026-10-06 hosted run: 19 cases, 13 Chromium/6 mobile WebKit, approximately 5.6 minutes. Relevant test/config/dependency freshness checked and assertions read. These were not independently rerun in this audit.         |
| Switching accounts from a saved project                                     | fail           | Direct switch cleared guest data but retained the old project route and empty editor instead of opening Projects; F8. No stale guest disclosure observed.                                                                          |
| Phone containment and one-step design selection                             | pass           | Observed zero page overflow on representative routes and at 320 pixels; creator designs scroll horizontally and only the active step is visible.                                                                                   |
| Persistent mobile action and on-demand complete preview                     | fail           | Primary action is static and below the viewport; complete sheet is always inline on Review; F6.                                                                                                                                    |
| Mobile session exit                                                         | fail           | Zero accessible/visible Sign out buttons; the sole DOM button is inside the hidden sidebar; F2.                                                                                                                                    |
| Basic labelled controls and keyboard progression                            | pass           | Mapping moves focus to a labelled select. Keyboard Enter advanced Guests → Design; the next Tab reached the Event name input. Native confirmation controls and CSS focus outline exist. This is not a complete accessibility pass. |
| Full assistive-technology, contrast, zoom/reflow and touch-target audit     | unverified     | No screen reader or quantitative contrast/target audit; viewport containment is not browser-zoom evidence.                                                                                                                         |
| Physical print, real phone/Safari, real Google/Paddle and production        | unverified     | Browser emulation and mock providers cannot establish these outcomes; no corresponding actions were authorized.                                                                                                                    |
| Billing remediation, Support and operator monitoring UI                     | not-applicable | Later delivery stages, excluded from this Build 3 development app review; no readiness waiver implied.                                                                                                                             |

Fresh repository commands passed:

- `pnpm nx run-many -t test --projects=tablecards-web,tablecards-core --skip-nx-cache --output-style=static`: 20 web tests and 32 core tests, uncached.
- `pnpm nx run tablecards-backend:test-integration`: 11 integration tests, uncached.

These checks prove import/catalog/draft/error helpers, print geometry/determinism and sampled account-scoped product invariants. The web tests do not mount the complete creator state machine. The supplied hosted run supports its actual assertions, not every sentence assigned to a story ID. In particular, US-07 checks a successful PDF and navigation warning, but does not compare a changed saved revision with the subsequent PDF; US-19 does not assert sticky actions/on-demand preview; US-20 primarily tabs once to a visible focused element.

## Reproducible findings

P1 means incorrect core output likely to harm a real event. P2 means a material promised capability or ordinary workflow is impaired. P3 means a smaller navigation/presentation defect. All findings below are `fail`, with no accepted-risk waiver.

### F1 — P1: successful export silently uses the previous saved revision

Save a project with three guests and title `Independent review event`. Open its saved route and wait for it to load. Replace the list with `Zelda Corrected` and `New Guest`, click Preview names, and change the title to `Changed event title`. The preview reports `2 cards · 2 PDF pages`. Click Create print-ready PDF without first clicking Save project.

Observed: the UI reports “Your PDF is ready.” The actual downloaded PDF still contains `Ada Lovelace` and the previous title, and contains neither corrected name nor the new title. The header keeps saying Saved project; it does not present a current saved/unsaved indicator. Download latest PDF remains available during these edits. This breaks US-07 and the central preview → exact-print promise.

[Creator export](../../workloads/web/src/app.tsx#L791) uses `savedProject ?? await save(false)`; having a saved project skips persisting changed state. Export controls do not check `dirty`. A correction must make the exported revision explicit and match the visible preview, and regression evidence must inspect the resulting PDF content after an edit. No fix was made.

### F2 — P2: phones have no reachable Sign out control

Sign in and open Projects, Account or Team at 390 or 320 pixels. Inspect all visible navigation and Account content.

Observed at 320 pixels: zero visible/accessibility-tree Sign out buttons, one Sign out button in the DOM, and `.application-sidebar` computed `display: none`. Account contains usage, workspace context and View plans, but no session-exit action. The only [Sign out control](../../workloads/web/src/layouts/application-shell.tsx#L97) lives in that sidebar, which [mobile CSS hides](../../workloads/web/src/styles.css#L1877). A phone customer cannot complete the ordinary logout lifecycle through the product.

### F3 — P2: the predefined Designs library renders six identical blank thumbnails

Open Designs after login. Compare Minimal Ivory, Garden Sage, Midnight Gold, Rosewater Frame, Coastal Blue and Modern Charcoal with the creator's actual artwork.

Observed: all six Designs thumbnails are plain cream cards with the same Ada Lovelace text. All six computed background images are `none`, and screenshot inspection confirms no catalog artwork. The creator correctly shows distinct backgrounds. [The library](../../workloads/web/src/pages/designs-page.tsx#L227) emits a class and text, without the catalog SVG/image used by the creator; there are no corresponding design-specific CSS backgrounds. This prevents useful visual comparison in the advertised library.

### F4 — P2: fit errors become a misleading empty preview

Enter a single name of 120 `W` characters, Continue to design, then Review and export. This input is within the accepted name-length bound.

Observed: the UI reports “1 guest ready to preview,” but the preview says “Your print preview appears here” and “Add at least one valid guest.” It shows no blocking fit reason and no visible alert. The specific trial's Free active-project limit also blocks Save; the fit-feedback failure is independent of that capacity message. [SheetPreview](../../workloads/web/src/app.tsx#L269) catches manifest errors and returns the same null state as an empty list. The core fitting tests reject such content; the UI discards the useful failure instead of identifying the guest/recovery action.

### F5 — P2: Designs exposes a raw backend error envelope

On Planner Pro, enter `[fail] independent review` in AI background description and generate four choices using the deterministic development provider.

Observed: the banner includes `[CONVEX A(ai:generate)]`, a request ID, `Server Error`, `Uncaught ConvexError`, JSON error data, source paths/line numbers and “Called by client.” The batch remains available and a later success works, so accounting/recovery passes; customer error presentation fails. [Designs' message helper](../../workloads/web/src/pages/designs-page.tsx#L27) returns `Error.message` directly rather than the existing approved product-error mapping. The hosted test currently accepts this presentation by matching `PROVIDER_UNAVAILABLE|failed`.

### F6 — P2: the accepted mobile primary-action/preview composition is missing

At 320 pixels, enter two guests and advance to Design. Inspect the screen before scrolling through layout explanations.

Observed: Review and export has computed position `static`; in the final check its top was about 1155 CSS pixels in an 844-pixel viewport. At the iPhone profile it was also below the viewport. It scrolls away instead of remaining available. On Review, the entire scale/sheet preview is rendered inline, without an Open complete preview control or bounded return flow. [The mobile action rule](../../workloads/web/src/styles.css#L1976) only sets inline display/margin; preview CSS hides it for Guests/Design and exposes it inline for Review. This contradicts the accepted persistent-action and on-demand-preview requirements. The carousel/step visibility itself works.

### F7 — P2: automatically created workspaces are distinguishable only by opaque IDs

Create a fresh synthetic account through ordinary development login, join another Studio through its invitation, then inspect Account and the workspace selector.

Observed: workspace copy is “Selected TableCards account”; the selector options are `account_…` identifiers rather than meaningful workspace names. Both automatically created accounts are unnamed and there is no naming/rename workflow in the reviewed UI. [The selector fallback](../../../../platform/bff/libs/sdk/typescript/src/react/index.tsx#L234) exposes the public account ID when `displayName` is absent. Authorization remains scoped, but customers cannot recognize which workspace they are choosing, particularly for a shared Studio.

### F8 — P3: switching from a saved project leaves the previous project URL

With two memberships, open a private saved project and wait for its six guests to load. Select the joined Studio in the account selector.

Observed: after the switch, the route remains `/projects/[previous-private-project]`. Guest data is cleared, so this is not a demonstrated data leak, but the UI remains an empty saved-project editor with Duplicate/Archive controls rather than the joined account's Projects home. Switching from Team similarly retained Team after selecting the private Free account. [The shell navigation effect](../../workloads/web/src/layouts/application-shell.tsx#L62) records null during intermediate auth state, losing the prior-account comparison. US-13's current test switches while already on Projects and does not exercise this route transition.

### F9 — P3: View plans returns to the landing top

Click View plans from Account and wait for navigation to settle.

Observed URL: `/?section=pricing`, with `scrollY: 0`; the Pricing section was roughly 1429 pixels below the desktop viewport top. [The link](../../workloads/web/src/pages/account-page.tsx#L174) sends a query that the landing does not consume. Customers must find Pricing again, whereas the public Pricing navigation uses the working `/#pricing` anchor.

## Visual/UX observations and limits

The warm cream/terracotta palette, serif headings, generous spacing and clear PDF-only examples create a coherent landing. The mobile landing preserves readable hierarchy, and product routes avoid marketing sections. Creator artwork, included/premium labels, Free-plan guidance and the on-screen scale sheet are clear. Long synthetic display names/emails wrapped inside the observed Studio roster without page overflow. Member permissions are understandable because unavailable administrative controls are absent.

Application styling is less consistent: ordinary project/roster actions use small native browser buttons beside styled rounded primary actions; Account includes implementation-facing copy (“without exposing billing-provider internals”); automatically created accounts have no useful identity. Large mobile introductions plus development layout explanation increase scrolling before the primary action. These observations supplement the concrete failures above; they do not establish contrast or touch-target conformance.

The initial independent account-switch script expected navigation to Projects and timed out; the final check reproduced and inspected the retained-route behavior in F8. Consequently that script did not reach Admin promotion or ownership transfer. Those flows retain fresh reused hosted coverage, but no independent new transfer/reauthentication claim is made. The invitation recipient was already authenticated in this audit; signed-out invitation return remains reused evidence. Full concurrent-state/expired/capacity/permission decision tables, outage recovery and real subscription expiry were not exhaustively re-exercised.

The current automated registry is useful as a discovery router, but its set-membership assertion cannot certify visual quality, accessibility or story completeness. No production, launch or physical-output completion follows from these development passes. Product/runtime fixes and affected hosted regressions remain the next work; this audit grants no deployment authority.

## Skill forward-test outcome

The skill was usable without a permission pause or a forced documentation project. Its requirement to inspect rendered screens and actual control outcomes, together with its warning about green suites, led to defects the existing story-labelled tests miss. It supported clear separation of current app findings from production readiness, allowed unchanged evidence reuse, and kept the work audit-only.

No blocking weakness in the skill itself was demonstrated. The proven gaps are in the implementation and the precision of existing test assertions, particularly revision-to-PDF parity and mobile story coverage. A useful concrete future review fixture would compare edited preview content with downloaded PDF content, but this run does not justify silently editing the skill or widening its scope. The explicit accessibility/version/evidence limits above remain limits rather than invented passes or waivers.
