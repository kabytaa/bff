# Build 3 TableCards development operations

Created: 2026-09-27
Last updated: 2026-09-28
Status: Development deployment validated

This runbook covers the development-only Build 3 TableCards slice. It does not
authorize a production TableCards deployment, live payment, or paid image-model
call.

## Ownership and surfaces

- `projects/tablecards/libs/core` owns imports, catalog, print geometry, SVG
  preview and deterministic PDF rendering.
- `projects/tablecards/backend` is the independent TableCards Convex backend.
  It owns product projects, guest rows, artwork, PDF jobs and AI batches.
- BFF owns identities/accounts plus the provider-independent effective-offer
  projection and typed-unit ledger.
- `projects/tablecards/workloads/web` is the routed public creator and
  authenticated Projects, Designs, Account and Team application.
- `projects/tablecards/session-gateway` forwards only the fixed SDK auth routes;
  it never proxies product data.

Development URLs:

- Web: `https://tablecards-dev.tofler.app`
- Session adapter: `https://api.tablecards-dev.tofler.app`
- TableCards Convex: `https://scrupulous-hawk-991.convex.cloud`
- TableCards HTTP: `https://scrupulous-hawk-991.convex.site`
- Shared BFF HTTP: `https://compassionate-buffalo-689.convex.site`
- Business environment: `tablecards-development`

The BFF environment is composed from
`projects/tablecards/customer-auth.defaults.ts` plus deployment URLs. The code
owns product presentation and stable auth/account behavior; the operator
configuration owns origins, callback transport and development automation.
Development currently applies definition/configuration revision 2 with a
two-membership user cap: one automatically created private workspace plus one
invited Studio workspace. The ownership cap remains one.

## Development providers

`TABLECARDS_DEVELOPMENT_MOCKS_ENABLED=true` and
`BFF_DEVELOPMENT_PRODUCT_ACCESS_ENABLED=enabled` are required together with the
Business environment's `developmentAutomationEnabled`. The visible offer
selector writes the same provider-independent access projection that a future
verified payment webhook will write. It does not charge anything.

`TABLECARDS_AI_PROVIDER=development` produces a deterministic four-image batch
and exercises reserve/commit/release against the real BFF unit ledger. The
optional `openai` provider is server-only and intentionally unused in Build 3
acceptance. Guest names, tables and markers are never included in its prompt.

## Deploy development

Push the BFF and TableCards schemas/functions independently:

```bash
pnpm exec convex dev --once --typecheck enable
cd projects/tablecards/backend
pnpm exec convex dev --once --typecheck enable
```

Build the web app with its seven public development values shown in
`projects/tablecards/workloads/web/.env.example`, then deploy:

```bash
pnpm exec wrangler deploy \
  --config projects/tablecards/session-gateway/wrangler.jsonc \
  --var UPSTREAM_ORIGIN:https://scrupulous-hawk-991.convex.site \
  --var BUILD_VERSION:YOUR_VERSION

pnpm exec nx run tablecards-web:build
pnpm exec wrangler deploy \
  --config projects/tablecards/workloads/web/wrangler.jsonc \
  --assets dist/projects/tablecards/workloads/web
```

Wrangler currently requires Node 22 or newer. On this host use the available
Node 24 runner when the default shell still resolves Node 20.

## Validation

Run focused gates, then hosted development acceptance:

```bash
pnpm exec nx run tablecards-core:test
pnpm exec nx run tablecards-backend:test-integration
pnpm exec nx run tablecards-web:test
pnpm exec nx run tablecards-session-gateway:test
pnpm test:e2e:tablecards-hosted
```

The Playwright flow uses short-lived development grants, the real session
gateway, account-bound JWT, separate TableCards Convex service, stored PDF and
deterministic AI batch. Six scenario-sized journeys run in both Chromium and
WebKit, including mobile and desktop creator containment plus a two-person
Studio invitation and role promotion. It downloads and parses the PDF in both
browser engines.
The local development signing key is intentionally absent from CI, so the
hosted suite is a separate development acceptance gate rather than part of the
self-contained root `pnpm check` command.

Real iPhone Safari and a physical 100%-scale ruler check remain useful extra
evidence, not a reason to hide an automated failure.

### Six-card landscape print trial

The development UI exposes `landscape_6` beside the canonical four-card
portrait layout. It places six unchanged 3.5 × 4 inch unfolded cards on US
Letter landscape with 0.25 inch outer margins. This is a development print
trial, not an accepted replacement for the canonical four-card layout.

A ready-to-print sample is public at
`https://tablecards-dev.tofler.app/six-card-landscape-print-test.pdf`. Print it
in landscape at **Actual Size / 100%** with every fit, shrink and scale option
disabled. Confirm the one-inch calibration square on page one, then verify that
all outer cut lines are visible and at least 0.25 inch from the paper edge on
page two. Record the printer/model and result before promoting this layout.

Predefined design thumbnails, browser sheet previews and PDF output consume the
same exact versioned 1050 × 600 JPEG artwork. Active `v2` assets use a true
white paper field to minimize home-printer ink while preserving the colored
corner artwork; immutable `v1` is retained but no longer selected. The
code-owned catalog pins each
asset's public path and SHA-256; the backend fetches only that registered path
and verifies the bytes before export. Uploaded and generated full-face artwork
uses the same 7:4 renderer contract. There is no vector-motif fallback.

### 2026-09-28 acceptance evidence

- The complete Node 24 repository lint, typecheck, test, integration-test and
  build targets pass after the raster-design replacement. Bundle-boundary and
  secret scans also pass.
- The complete Node 24 `pnpm check` gate passes after the review changes. The
  focused TableCards hosted suite passes six uncached cases: the public
  landscape file's two 792 × 612 point pages, public draft through real
  authentication, stored PDF download/parsing and the authenticated four-choice
  AI/unit flow in Chromium and WebKit.
- The final TableCards backend push completed successfully against development
  deployment `scrupulous-hawk-991` after the AI reservation ordering fix.
- The TableCards session gateway remains Cloudflare Worker version
  `2870c83e-36b3-4cfa-aafc-efdbe559cd46`; the reviewed web Worker is version
  `d612f60b-b966-4e85-9a70-6b10734e0c7a`.
- The final ink-friendly `v2` raster-artwork deployment passes all six uncached
  Chromium/WebKit journeys, including authenticated stored export; all six
  public JPEG responses match their catalog SHA-256 and content type, and the
  one-year immutable cache policy is active.
- The unit-allocation correction was deployed in dependency order to BFF
  `compassionate-buffalo-689` and TableCards `scrupulous-hawk-991`. Business
  reservations now omit allocation keys; BFF resolves anniversary-monthly or
  fixed allocations and lazily creates the effective bucket. Integration tests
  prove automatic rollover without offer reselection and preserve the prior
  bucket's committed history.
- After that coordinated deployment, the complete `pnpm check` gate remains
  green and the six uncached hosted Chromium/WebKit journeys pass, including
  authenticated offer selection and AI reserve/commit behavior.
- The routed application correction is deployed at web Worker version
  `009a28c8-6ec3-4ab1-b79d-1330e8b78f3a`. The public landing loads a dedicated
  lightweight catalog chunk and does not eagerly load the spreadsheet/PDF
  editor or team route. The creator's full print-layout controls remain
  available and contained on mobile; only the design carousel scrolls. The
  hosted suite now asserts the Design step and print controls at 320 CSS pixels
  and at 1,280 desktop pixels; all 12 hosted Chromium/WebKit journeys pass.
- The follow-up creator review keeps desktop Preview names beside its visible
  sheet, while mobile validates and advances through one Continue to design
  action. The example-list link sits above the input and exercises several long
  names. Mobile retains the TableCards identity and Log in action in a more
  compact creator header and intro.
- Direct health probes for TableCards HTTP and the session gateway return `200`;
  an unauthenticated shared product-access probe returns the intended `401`.

## Safety and known limits

- Build 3 has no Paddle tables, checkout, webhook, live charge, production mock
  route, production TableCards manifest, email/support flow, analytics, or
  generic monitoring.
- Generated file URLs are short-lived; database rows store only Convex storage
  IDs.
- The server renderer accepts caller-supplied Noto Sans bytes, but the current
  hosted job uses deterministic built-in Helvetica. Common Western Latin text
  is covered and unsupported glyphs fail preflight instead of silently clipping.
  Bundled broad-script font coverage remains an explicit follow-up before a
  multilingual production claim.
- CSV/XLSX and print code remain a large editor chunk, but route-level loading
  keeps that chunk off the landing page. Further editor-internal splitting is a
  performance optimization, not an authorization or correctness dependency.
- The focused hosted browser suite proves the primary public/Free,
  professional and Studio workflows. Exhaustive permission, account-isolation,
  capacity, replay and unit-accounting decisions remain in faster BFF/Convex
  integration tests rather than a browser Cartesian product.
