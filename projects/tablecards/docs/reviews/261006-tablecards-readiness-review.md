# TableCards Build 3 development readiness review

Created: 2026-10-06
Updated: 2026-10-06
Status: Completed audit — not ready for development acceptance
Repository baseline: `b5aeae3` on `feat/tablecards-application`; inspected HEAD `42a6e3394091d2bcd5154d9f1a45728ed091f689` adds the repository preference checkpoint. Product/application/architecture/operations reconciliation was uncommitted during inspection.

## Boundary and verdict

**Not ready for the declared Build 3 development acceptance boundary.** The current implementation has meaningful working development coverage, but account isolation at upload finalization and fidelity between reviewed content, saved content and exported content have concrete defects. These are current product/security requirements, not deferred billing work. Documentation can truthfully record this candidate and its gaps; it cannot establish a completed development implementation.

Production readiness is **not established**: no TableCards production deployment or production product smoke was performed or evidenced here. Paying-customer launch is **not ready**: real billing/lifecycle, disclosures, physical print acceptance and later support/operations remain incomplete. Neither conclusion authorizes deployment or expands this audit into fixes.

This is an independent forward-test of [review-business-readiness](../../../../.agents/skills/review-business-readiness/SKILL.md), using its readiness lenses and the [documentation ownership standard](../../../../docs/factory/business-documentation.md). No runtime code, fixture, provider configuration or policy was changed. Only this report was written; the coordinating agent owns STATUS.

## Exposure and applicability

The accepted product targets US occasional hosts, independent planners and small studios, with an English interface and downloadable PDFs. Repository context identifies KooMasha as operator and Tofler as domain family; seller onboarding and commercial terms are not independently verified legal/entity evidence. Development checkout explicitly charges nothing. Production commercial offers remain hypotheses: Free, $5 Event Pass, $9/month Planner Pro and $19/month five-seat Studio.

Data includes BFF identity/session/account/membership records, guest names and optional table/marker contents, project/design metadata, uploaded/generated images, PDFs and bounded AI prompts. A guest marker may contain dietary or other personal context; synthetic data is appropriate for this review. BFF owns identity and shared access/unit accounting; TableCards owns content and files. Cloudflare hosts web/gateway surfaces and Convex hosts backend/data/files; Google is the accepted production identity provider. Development identity automation and deterministic image fixtures do not prove live Google/device or live image-provider behavior. The optional OpenAI adapter sends the supplied visual prompt, not automatically attached guest arrays; a user could still type personal information into that prompt.

| Lens                      | Applicability and current result                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product/commercial truth  | Applicable. **fail** for current-input/export fidelity; **pass** for explicit mock boundary in inspected checkout story assertions and canonical product reconciliation. Real purchase/renewal/cancellation/refund lifecycle is **not-applicable to this development simulation**, still required for commercial launch. Demand is **unverified**, not inferred from prices or tests.                                                                                               |
| Experience/accessibility  | Applicable. **fail** for saved/edit/export continuity described below. Browser coverage is useful but full keyboard/focus, announcements, assistive technology and visual quality are **unverified by this independent audit**.                                                                                                                                                                                                                                                     |
| Security/privacy          | Applicable now, even in development. **fail** for storage ownership/destructive cleanup. Inspected account-scoped project/export queries and their negative tests provide bounded **pass** evidence, not global account-isolation proof. File sharing/revocation, upload abuse and interrupted AI recovery remain unresolved.                                                                                                                                                       |
| Legal/disclosures         | Applicable proportionately to public development exposure and any real personal data use. **pass** for no-charge simulation being explicit in inspected tests; **fail** for missing accepted policy surfaces, a launch blocker. Seller terms, privacy/data handling, content rights and US/Israeli obligations are **unverified**; no legal compliance conclusion is made. Actual charging/tax/renewal processing is **not-applicable to the present mock**, not waived for launch. |
| Performance/compatibility | Applicable. Chromium/mobile WebKit results are supplied evidence; physical Safari, physical printing and realistic 500-card hosted latency are **unverified here**. No universal speed target is invented.                                                                                                                                                                                                                                                                          |
| Operations/deployment     | Applicable. **pass** for two fresh public health probes and documented development commands; exact backend source identity is **unverified** because health reports `development`. Production deployment/smoke/recovery are **unverified** and outside this audit's authority. Support and monitoring belong to later accepted stages.                                                                                                                                              |

## Evidence actually checked

- Read STATUS, current Business product/application/architecture/operations, the relevant Build 3/4/7 delivery sections, shared-checkout successor decision, all four new skill instructions and the shared documentation standard. The old proposal review was not treated as an implementation verdict.
- Inspected actual router, Creator save/export/input state, upload actions, export state/actions, AI action ordering, schema relationships, backend tests and hosted story registry/assertions. These are source checks, not claims that every UI state was driven.
- Ran `pnpm --package=node@24 dlx sh -c 'pnpm exec nx run tablecards-backend:test-integration --skip-nx-cache'`: **11 tests / 3 files passed**, uncached, 2026-10-06 16:59 UTC; Vitest 2.17 seconds. Tests include project/account/entitlement boundaries, presets and durable export/AI state. They do not include the upload action ownership failure or export create/save/load interleaving below.
- Executed an in-memory control-path harness against the actual TypeScript `assets.ts`, transpiled with TypeScript. Dependencies/auth/access were stubbed; no file or hosted object was created/deleted. A valid synthetic Free-account context calling `finalize` with a foreign synthetic storage ID produced `ENTITLEMENT_REQUIRED` **and called `storage.delete` with that foreign ID**. This demonstrates the handler's destructive denial path, not a full hosted exploit or storage-ID discovery technique.
- Fresh unauthenticated GETs returned HTTP 200: `https://scrupulous-hawk-991.convex.site/v1/health` → `tablecards-backend`, version `development`; `https://api.tablecards-dev.tofler.app/_tofler/session-gateway/health` → `business-factory-tablecards-session-gateway`, version `f6344be-build3-dev`. A live health result proves availability of those endpoints, not all product functions or equality to HEAD.
- Coordinating-agent evidence supplied for this review: a fresh 19-case hosted Chromium/mobile WebKit run passed in about 5.6 minutes; a complete `pnpm check` passed in about 1m50s after an earlier interrupted run. These are attributed results, not independently rerun here. The registry labels US-01–US-20, but the assertions are narrower than all story clauses. For example, the saved-event scenario edits text and saves without verifying changed PDF guest contents.
- The recorded development target set is TableCards `scrupulous-hawk-991`, shared BFF `compassionate-buffalo-689`, web `tablecards-dev.tofler.app` and shared auth `auth-dev.tofler.app`. STATUS records web Worker `c82c37eb-b670-4a28-884b-4cd2b559ba9d` and customer-auth Worker `9b85e6d6-314b-4b89-b7de-6cef22b63bf5`; these Worker IDs were not independently provider-queried here. No production mutation, payment, paid AI call or outreach occurred.

## Prioritized findings

### P1 — fail: upload finalization can delete a file without establishing ownership

[assets.ts](../../backend/convex/assets.ts), `finalize` lines 108–163, accepts a caller-supplied `_storage` ID. The action verifies account/offer but does not establish that this caller uploaded or owns that file. Its catch deletes that ID even when the earlier entitlement check rejects the request. `recordValidated` verifies an optional project belongs to the caller, but does not bind the storage object itself to the caller. A valid paid caller can also attempt to attach another known image ID to its own asset record.

Reproduction of the confirmed denial path: a valid authenticated Free user supplies a known existing file ID to `assets:finalize`; `custom_artwork` denial throws inside the try; catch calls `storage.delete` on that ID before rethrowing. The local harness observed precisely that call. Guessability is not assumed: the precondition is knowledge of an ID, for example one retained from previously authorized access. Being authenticated does not grant deletion of another account's files.

This blocks development acceptance of account-scoped uploads. Bind pending upload/finalization to an authorized owner; reject foreign or already-attached IDs before reads/deletion; restrict cleanup to proven caller-owned pending data. Add negative action-level tests asserting that unauthorized, foreign-account and replayed finalization cannot attach or delete existing artwork/PDF objects. No repair was made in this audit.

### P1 — fail: save/export can acknowledge content different from the current editor

[Creator](../../workloads/web/src/app.tsx) keeps `pastedText` and parsed `guests` separately. Textarea edits only update `pastedText` and dirty state (around line 974); `save` submits the previous `guests` (around line 753) and clears dirty state. `exportPdf` uses `savedProject ?? await save(false)` (around line 792), so an already-saved project is exported without saving current changes. The normal path can therefore show a successful save/export while newer typed input or reviewed edits are absent from the PDF.

Reproduction path from source: open saved event → edit guest text → Save without Preview names/reimport; or change a saved event's reviewed design/parsed guests → Create print-ready PDF without another save. The existing happy-path assertions do not prove resulting PDF contents match the current editor. This independent review establishes the source paths; it did not drive a fresh browser reproduction.

Resolve input parsing/dirty/revision semantics and make the exported revision explicit or save the intended state before export. Regression must inspect changed PDF content, not just a Download link. This blocks the core reliable spreadsheet-to-print development claim.

### P1 — fail: queued export revision is not bound to rendered contents

[exportState.ts](../../backend/convex/exportState.ts) `create` records `projectRevision` and validates offer/design/card limits, but `load` reads current project and current `projectContents` without comparing their revision to the job's revision or loading an immutable snapshot. A save between queue creation and worker load changes what the job renders while its record still names the earlier revision. [exports.ts](../../backend/convex/exports.ts) then renders that returned content.

Reproduction sequence is create export for revision N → update project to N+1 → load/render the old job. Existing tests call create then load without that intervening edit. This is source-established; a hosted race was not attempted. It is separate from the Creator's stale-save issue and affects concurrent editing/queued work.

Capture the authorized render input atomically, or reject/recreate stale jobs before rendering. Add a create/save/load interleaving test and verify the job's revision, actual PDF contents and entitlement checks agree. This blocks current deterministic export acceptance.

### P2 — fail/unverified: interrupted AI completion can consume a batch without choices

[ai.ts](../../backend/convex/ai.ts), lines 328–360, commits the BFF unit before recording TableCards completion. If completion fails after commit, catch deletes stored images and skips release because `reservationCommitted` is true. If the commit succeeded remotely but its response was lost, the local flag is still false and release may not undo a committed reservation. Normal deterministic `[fail]` provider coverage does not exercise these boundaries.

The control-flow gap is **fail**; frequency and recovery after actual service interruption are **unverified**. Establish reconciliation/idempotent completion for committed reservations before treating failed-batch refunds as universal or enabling paid usage. This also limits the current development claim of complete failure recovery; no authorized risk acceptance was found.

### P2 — unresolved: direct file URLs outlive membership changes

[exportState.ts](../../backend/convex/exportState.ts) and [assets.ts](../../backend/convex/assets.ts) return `storage.getUrl` results after an account check. Once obtained, access is by URL possession. Convex's [current serving-files documentation](https://docs.convex.dev/file-storage/serve-files), checked 2026-10-06, explicitly says a shared URL can be reused without app authentication and recommends an authenticated HTTP action when every request needs authorization. A session/membership denial test is not a file-URL revocation test.

The revised architecture/runbook accurately disclose this boundary. **Unverified** release decision: whether persistent bearer URLs are acceptable for PDFs containing guest data, with what disclosure/retention, or whether download authorization/revocation is required. This is not an invented blanket ban on bearer downloads and is not marked accepted-risk without an authorized decision. Resolve before real customer data/release.

### P2 — corrected on closeout: stage documentation contained conflicting mock-release authority

The [delivery plan](../../../../docs/factory/mvp-delivery-plan.md) Build 3 still requires no production visitor self-grant path. The accepted [shared-checkout plan](../../../../.agent/plans/260929-shared-mock-checkout.md), lines 26–29 and its production-bundle decision, permits a future explicitly no-charge Build 3 production demo. The reconciled product correctly identifies the successor decision, but the factory plan remains a conflicting canonical instruction. It also calls for a benchmarked AI model, while only deterministic development fixtures are evidenced.

Reconcile the factory stage text with the accepted successor and mark live model benchmarking honestly as outstanding. This documentation contradiction does not authorize production or invalidate the truthful development mock itself. The architecture header also retains baseline `0067776` although this reconciliation is at `b5aeae3`/`42a6e33`; clarify the historical versus current inspection baseline on closeout.

**Closeout resolution, 2026-10-06:** the coordinator updated the current factory
delivery plan to the accepted BFF-owned no-charge Build 3 demo boundary,
separated simulated activation from verified Build 4 billing, and explicitly
qualified the deterministic AI benchmark. The architecture header now names
the inspected runtime and pushed checkpoint. This documentation finding is
corrected; the independently identified runtime defects are not fixed.

## Later-stage gates and evidence limits

- **fail, launch gate:** router has no policy routes and landing has no policy links despite the accepted public policy promise. Supply accurate operator/contact/privacy/terms/content-rights disclosures appropriate to the actual launch; this review offers no legal sign-off.
- **unverified, physical output gate:** four-card US Letter is canonical; six-card landscape is only a trial. Real 100%-scale print/ruler evidence and any Avery alignment claim remain outstanding. Automated page dimensions do not prove printer/perforation compatibility.
- **fail, font promise gap before production:** hosted renderer calls `renderTableCardsPdf` without reviewed font bytes. The reconciled product preserves the broader accepted Latin promise and identifies fallback Helvetica coverage. Bundle/verify the reviewed font or obtain an explicit scope change and publish the narrower supported boundary.
- **unverified, later commercial stages:** purchase-to-event 90-day binding, verified billing/renewal, forced restrictions, professional 30/60-day cancellation retention and warned deletion, refunds, written Paddle seller/microtransaction terms, support and operational monitoring. These are not proven by selecting a mock offer and are not additional blockers invented for a no-charge development simulation.
- **unverified, release operations:** production targets/manifests, deployed identity-provider behavior, recovery/rollback drill and live production smoke. Health probes and the development runbook are insufficient substitutes.
- **unverified, remaining app acceptance:** current app-document reconciliation records Event Pass styling and continuity/feedback/accessibility gaps. This audit inspected the relevant fidelity issue directly but did not independently drive every other gap. The current hands-on app-review report should provide its own observations; no other agent's verdict was used to establish the findings above.

## Forward-test of the four skills and documentation standard

The four skills are short, responsibility-based and avoid prescribing a universal page template, fixed document pack, per-button IDs, technology or mandatory agent delegation. Product preserves accepted promises; application explains routes/states/design choices; app review requires observed behavior; readiness separates development, production and launch. The shared standard explicitly assigns tables/API intent to architecture and run/deploy/recovery to operations, maintained by ordinary implementation/documentation work. A fifth mandatory architecture skill is unnecessary for this scope.

This test demonstrated useful instruction behavior: readiness required inspecting actual authorization and failure paths despite a green story registry; it allowed an audit of incomplete documentation; it separated mock success from billing truth; and it produced a not-ready verdict without deploying or requesting a routine human usability sign-off. The missing upload test, export defect and stale stage text are implementation/evidence/documentation findings, not proof that the skills need more mandatory checklists.

One narrow instruction clarification is supported by this forward-test: `design-business-app` says to inspect routes/components/tokens/tests and account state, but does not explicitly remind the reconciler to follow relevant shared SDK/provider lifecycle boundaries. Here, inspecting only `ApplicationShell` could suggest its previous-account ref guarantees navigation to Projects. The shared [browser SDK](../../../../platform/bff/libs/sdk/typescript/src/browser/index.ts) `activateAccount` first emits `loading`; the shared [Convex provider](../../../../platform/bff/libs/sdk/typescript/src/adapters/convex/client.ts) keys its subtree by auth/account context. That remount resets shell-local refs, invalidating the inference from the component alone. The application reconciliation has now recorded the concern. A single proportionate instruction—trace consequential state transitions through shared SDK/provider lifecycles when they own remounts, auth return or account switching—would prevent this demonstrated omission without prescribing a framework or expanding every app review to all platform code. No skill was edited here.

**Closeout resolution:** the coordinator added that focused shared-lifecycle
reminder to `design-business-app`. It changes inspection scope, not the
Business's UI or implementation choice; no runtime behavior was changed.

The concrete maintenance lesson is to execute the existing cross-source reconciliation instruction fully: business-local documents cannot alone repair contradictory shared delivery-stage text. Preserve one product truth and link bounded dated evidence. Do not make another complete checklist or copy all technical validators into docs. The present operational runbook links an earlier review as “current”; closeout should route readers to the completed forward-test reports and avoid treating stale review pointers as the latest verdict.

No material risk was silently waived. Optional human usability review is separate from the genuinely physical print measurement and any future required commercial/production authority. Immediate next work is to fix and prove the P1 development failures under separately authorized implementation scope, reconcile the remaining stage text, then rerun affected tests and update this dated verdict; broader paid-provider or production work is not implied.
