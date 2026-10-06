# TableCards review remediation

> **Status**: Completed — authorized development remediation and re-review, 2026-10-06; not a production release
> **Created**: 2026-10-06
> **Last updated**: 2026-10-06
> **Repository baseline**: `3a948ad` on `feat/tablecards-application`
> **Source brainstorm**: None — fix direction supplied directly by Andrew

## Context snapshot and scope

The independent app/readiness reviews found three P1 defects and additional
UI, state, privacy and release-evidence gaps despite 19 passing hosted cases.
The documentation/review checkpoint was committed and pushed before fixes.
Andrew authorizes fixing agent-executable findings, development deployment and
another review without routine approval waits. Production, real charges, paid
AI calls, seller onboarding, outreach and physical printing remain excluded.

Type: Bug Fix / bounded Enhancement. Complexity: High because file transport,
cross-service AI completion and browser draft/route lifecycle interact.
Systems: TableCards Convex/React/core/E2E, narrowly affected shared SDK/BFF
account naming and auth presentation. Node 24, pnpm 12, Convex 1.46, React 19,
Vitest/convex-test and Playwright are already installed; no new infrastructure.
Bounded PNG/JPEG decoding adds pinned `fast-png`, `fflate` and `jpeg-js`, rather
than treating image headers as proof of valid pixels.

As a customer I want the PDF to match my reviewed edits, my files to stay
account-private, and every phone/desktop action to have a clear outcome.

## Required reading

- `projects/tablecards/docs/product.md`, `application.md`, `architecture.md`,
  `operations.md` and both `docs/reviews/261006-tablecards-*-review.md` reports.
- `projects/tablecards/backend/convex/schema.ts`, `assets.ts`, `http.ts`,
  `exportState.ts`, `exports.ts`, `ai.ts`, `aiState.ts`, `operations.test.ts`.
- `projects/tablecards/workloads/web/src/app.tsx`, `backend.ts`, `router.tsx`,
  layouts/pages/styles and the existing product-error/draft helpers.
- `projects/tablecards/e2e/src/user-stories.spec.ts`, `support/hosted.ts` and
  the existing hosted test configuration.
- Shared SDK browser/Convex provider lifecycle and BFF account authorization.
- [Convex file serving](https://docs.convex.dev/file-storage/serve-files) and
  [upload transport](https://docs.convex.dev/file-storage/upload-files):
  authenticate each private request; do not infer storage ownership from IDs.

## Decisions and boundaries

- Keep accepted prices, physical geometry, project limits and billing stages.
- Use authenticated HTTP file transfer with exact-origin CORS and current
  BFF membership/session authorization; never put a JWT in a URL. Browser
  object URLs represent already-delivered bytes, not server sharing links.
- Prefer server-owned direct uploads: validate bounded bytes, store them, then
  attach them; never delete or attach arbitrary caller-supplied storage IDs.
  Disable unsafe legacy finalization. Existing synthetic dev bearer URLs
  cannot be retroactively revoked without deleting/replacing their files;
  do not perform a destructive migration or claim that limitation is fixed.
- Export must save/parse the intended current draft and clear stale downloads.
  Queued work must use its authorized revision, via snapshot or explicit
  stale-revision denial; retries must not silently relabel live contents.
- AI operation state must preserve/reconcile generated assets across uncertain
  BFF commit responses; successful retries never charge twice or discard paid
  results. Keep the existing operation model, not a new general workflow engine.
- Vendor licensed Noto font assets with provenance/hash/license and actual
  glyph/fitting tests; retain the constrained serif/sans design choice.
- Public policy/contact pages must truthfully describe development/no-charge
  scope and real current data handling. No invented legal entity details,
  support mailbox, provider compliance certification or refund automation.
  Formal merchant/legal verification and support delivery remain later gates.

## Dependency-ordered implementation

### 1. UPDATE secure artwork/file transport

Targets: backend `assets.ts`, `http.ts`, new `files.ts`/tests, browser
`backend.ts`; adapt asset/preset/AI/export projections away from bearer links.
Reuse SDK HTTP guards and account indexes; authorize before reading bytes and
clean up only server-created pending files. Test unauthenticated, wrong
account/environment, revoked membership, invalid images, replay and destructive
denial. Validate backend integration, typecheck and upload/download browser flow.

### 2. UPDATE deterministic export and recoverable AI completion

Targets: `exportState.ts`, `exports.ts`, `ai.ts`, `aiState.ts`, additive optional
schema fields where needed, focused new tests. Prove create/save/load
interleaving, idempotent retry, uncertain commit, failure after generated asset
persistence and private-result recovery. Existing populated rows stay readable;
no destructive backfill. Coordinate ownership of projection edits with Task 1.

### 3. UPDATE creator, application navigation and design feedback

Targets: web `app.tsx`, layouts/pages/router/styles and unit tests. Fix dirty
save/export, textarea/import synchronization, saved-state feedback and fit
errors; mobile signout, persistent actions and bounded complete preview;
actual design thumbnails, safe errors, workspace naming/context navigation,
auth draft/deep-link return, permission guidance, transfer finality and Pricing
destination. Reuse catalog/preview/error mapping rather than duplicate rules.
UI uses the backend interface negotiated in Task 1, not raw storage URLs.

### 4. ADD remaining agent-executable release preparation

Targets: core fonts/renderer/assets/tests, backend renderer font loading,
public disclosure/contact routes and local docs. Bundle verified Latin fonts,
clear glyph/fit errors, consistent preview styles. Provide meaningful named
workspaces through the smallest public BFF/SDK/Business-facing flow necessary.
Record actual dev backend/gateway build versions before smoke; do not create
production resources or alter paid provider configuration.

### 5. ADD regressions and deploy development

Targets: E2E edited-PDF content, security/authenticated file retrieval, mobile
logout and navigation, artwork/AI recovery, long names/policy routes. Inspect
real PDF text and download bytes, not merely a link. Run the complete gate,
deploy only the exact existing BFF/TableCards development targets and existing
Cloudflare dev manifests, then run all hosted scenarios in desktop/mobile.

### 6. REVIEW again and reconcile documentation

Apply app/readiness skills to the deployed candidate; use independent reviewers
for risky behavior when authorized. Fix new in-scope findings and rerun tests.
Preserve the earlier failed reports, append dated resolutions backed by new
evidence, and create a dated remediation review. Update product/application/
architecture/operations and STATUS without changing accepted promises.

## Validation commands and acceptance

Commands run from repository root through Node 24:

```sh
pnpm --package=node@24 dlx sh -c 'pnpm exec nx run tablecards-backend:test-integration --skip-nx-cache'
pnpm --package=node@24 dlx sh -c 'pnpm exec nx run-many -t test --projects=tablecards-web,tablecards-core,bff-sdk,bff-contracts'
pnpm --package=node@24 dlx sh -c 'NX_PARALLEL=1 pnpm check'
pnpm --package=node@24 dlx sh -c 'pnpm test:e2e:tablecards-hosted'
```

Verify exact Nx project names before running narrower commands; the complete
root scripts are authoritative. Development deployment commands/targets come
from the Business runbook; credentials stay external and no production command
is permitted. Fresh builds must precede hosted verification.

- [x] Reviewed edits and actual PDF title/guest multiplicity agree.
- [x] Foreign-file upload/cleanup and private download denials are tested.
- [x] Export interleaving cannot render a mismatched recorded revision.
- [x] AI interruption/retry preserves one charge and recoverable four choices.
- [x] All reported phone/desktop actions work with useful safe feedback.
- [x] Font, disclosure and version evidence reflect real implementation.
- [x] Complete repository/hosted gates and independent re-review pass, or
      precise external/physical/later-stage limits are honestly recorded.
- [x] Canonical docs and short handoff agree; production remains unchanged.

Initial assessment: no questions blocking implementation. Confidence: 7/10; interrupted
cross-service recovery, private file transport and realistic browser behavior
need negative/interleaving tests and a fresh hosted review, not assumptions.

Completed result: runtime `a914da02088e4a0724e290117aad11976515405b` was pushed
and deployed to development. The complete repository gate, fresh 27-case
desktop/mobile hosted run and independent app/security/readiness re-review
passed. The [development acceptance record](../../projects/tablecards/docs/reviews/261006-tablecards-remediation-and-development-acceptance.md)
maps fixes to evidence and explicitly preserves physical, provider, legacy-link
and later-stage limits. Production remains unchanged.

## History

| Date       | Status                                           | Change                                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-06 | Accepted — execution authorized                  | Created from saved review findings and Andrew's commit/fix/dev/re-review request.                                                                                                                                                                                                                                                                                      |
| 2026-10-06 | Implementation completed; validation in progress | Tasks 1–4 implemented. Independent Astra review found and verified fixes for reload-safe AI recovery, atomic export scheduling and bounded full raster decoding. Development deployment and fresh hosted review remain pending.                                                                                                                                        |
| 2026-10-06 | Source validated; development rollout next       | Follow-up review corrected terminal AI retries, lazy scoped byte leases, growing artwork/preset/archive pagination, current custom-artwork preview, event-title/font preflight and checkout retry. Independent web/core checks passed 85/40 tests; complete Node 24 repository gate passed after source freeze. Fresh deployment and hosted/app review still required. |
| 2026-10-06 | Completed — development only                     | Follow-up browser review fixed workspace/clipboard feedback and Creator state/accessibility. Runtime `a914da0` deployed with exact stamps and pinned fonts; repository gate, 27/27 hosted cases (17 desktop, 10 mobile) and independent re-reviews passed. Canonical docs and handoff reconciled; no production action.                                                |
