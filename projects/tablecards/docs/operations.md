# Build 3 TableCards development operations

Created: 2026-09-27
Last updated: 2026-10-06
Status: Development remediation deployed and verified; not a production release

This runbook covers the development-only Build 3 TableCards slice. It does not
authorize a production TableCards deployment, live payment, or paid image-model
call.

Use [Product](product.md) for promises, [Application](application.md) for
screens/states and [Architecture](architecture.md) for table/API ownership.
The [current dated review](reviews/261006-tablecards-remediation-and-development-acceptance.md)
separates current checks from historical acceptance below.

## Ownership and surfaces

- `projects/tablecards/libs/core` owns imports, catalog, print geometry, SVG
  preview and deterministic PDF rendering.
- `projects/tablecards/backend` is the independent TableCards Convex backend.
  It owns product projects, guest rows, artwork, PDF jobs and AI batches.
- BFF owns identities/accounts plus the provider-independent effective-offer
  projection, unit buckets and usage reservations; this is not a financial
  credit ledger.
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
Development currently applies definition/configuration revision 4 with a
two-membership user cap: one automatically created private workspace plus one
invited Studio workspace. The owned-account cap is also two so an invited
Studio member who already owns their private workspace can receive ownership of
the shared workspace. User-created additional workspaces remain disabled, and
the shared BFF still enforces both caps.

## Development providers

`TABLECARDS_DEVELOPMENT_MOCKS_ENABLED=true`,
`BFF_DEVELOPMENT_PRODUCT_ACCESS_ENABLED=enabled` and
`BFF_MOCK_CHECKOUT_ENABLED=enabled` are required in development. Paid pricing
actions ask BFF for a provider-neutral checkout URL, redirect to the shared
`auth-dev.tofler.app/checkout` page and return after the explicit no-charge
completion. TableCards has no local dummy-payment selector. Studio completion
also applies its five-seat, Admin and invitation policy atomically, so hosted
tests must not prepare that policy with the operator CLI.

Checkout creation also requires matching secrets in
`BFF_CHECKOUT_SERVICE_SECRETS_JSON` on BFF and `BFF_CHECKOUT_SERVICE_TOKEN` on
the TableCards backend. The first is an environment-keyed object. These values
are credentials: generate and install them directly through the deployment
environment, never commit or print them, and never expose the service token to
Vite/browser configuration.

`TABLECARDS_AI_PROVIDER=development` produces a deterministic four-image batch
and exercises reserve/commit/release against real BFF usage accounting. The
optional `openai` provider is server-only and intentionally unused in Build 3
acceptance. Guest names, tables and markers are never included in its prompt.

## Deploy development

For the 2026-10-06 private-file/font remediation, use a short coordinated
development maintenance window: stop acceptance journeys, build/deploy the new
web assets first (including the font files), then deploy shared BFF and
TableCards backends, then gateway/auth changes. The new browser requires new
file routes; the new renderer requires the web fonts. There is no claim of
zero-downtime compatibility with the old browser. Do not run or announce
acceptance until all surfaces and health/font checks agree. Existing open tabs
should reload after the window; legacy upload/finalize safely reject.

Verify the public font bytes before resuming export tests. These commands do
not need credentials; compare both outputs with the canonical code-owned pins
in [fonts.ts](../libs/core/src/fonts.ts), not merely HTTP 200:

```sh
curl -fsS https://tablecards-dev.tofler.app/fonts/NotoSans-Regular.ttf | sha256sum
curl -fsS https://tablecards-dev.tofler.app/fonts/NotoSerif-Regular.ttf | sha256sum
```

For the 2026-10-06 candidate the expected hashes are:

| Font       | SHA-256                                                            |
| ---------- | ------------------------------------------------------------------ |
| Noto Sans  | `b85c38ecea8a7cfb39c24e395a4007474fa5a4fc864f6ee33309eb4948d232d5` |
| Noto Serif | `c8f669ceb2c9c60ccf55198b305e08a997ffca79a38cc7eeb551e643cbe66505` |

The backend independently verifies the same pins before embedding the fonts.
An HTML fallback/error page or stale font download is not a valid deployment.

In subsequent compatible releases, push the BFF and TableCards schemas/functions
independently in the order established for that release:

```bash
pnpm exec convex dev --once --typecheck enable
cd projects/tablecards/backend
pnpm exec convex dev --once --typecheck enable
```

Build the web app with its seven public development values shown in
`projects/tablecards/workloads/web/.env.example`, replacing both deployment
placeholders with the exact BFF and TableCards development URLs listed above.
Do not substitute an unprovisioned vanity hostname for the BFF customer API;
team/account browser calls use this value directly. Then deploy:

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

The repository requires Node 24. When the default shell resolves Node 20,
run commands through the verified Node 24 wrapper, for example:

```bash
pnpm --package=node@24 dlx sh -c 'pnpm check'
pnpm --package=node@24 dlx sh -c 'pnpm test:e2e:tablecards-hosted'
```

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
deterministic AI batch. The executable registry maps every accepted PRD story,
US-01 through US-20, to four cohesive product journeys. Those journeys run in
desktop Chromium and mobile WebKit and include all four offer promises,
projects, artwork, AI units, navigation, two-account isolation, invitations,
roles, removal and ownership transfer. Focused desktop regressions retain the
public print PDF and 320-pixel geometry checks. The complete hosted command runs
27 cases: 17 desktop Chromium and 10 mobile WebKit, including actual edited
PDF contents, private-file denials, embedded-font 500-card exports and the
recorded UI regressions.
The local development signing key is intentionally absent from CI, so the
hosted suite is a separate development acceptance gate rather than part of the
self-contained root `pnpm check` command.

Real iPhone Safari and a physical 100%-scale ruler check remain useful extra
evidence, not a reason to hide an automated failure.

### 2026-10-06 remediation acceptance

Runtime `a914da02088e4a0724e290117aad11976515405b` was committed and pushed,
then deployed to both existing development Convex targets, the web Worker,
session gateway and central development authentication. All three health
responses matched the full SHA and both fonts matched the pins above. The
[acceptance record](reviews/261006-tablecards-remediation-and-development-acceptance.md)
lists exact Worker versions and independent evidence. The complete repository
gate passed, followed by **27/27** hosted cases in 7.1 minutes.

Earlier Nx-wrapped hosted attempts ended with exit 143 before completion and
are not passes. The complete rerun used the same configured Playwright suite
in a persistent terminal:

```sh
pnpm --package=node@24 dlx sh -c 'pnpm exec playwright test --config projects/tablecards/e2e/playwright.config.ts'
```

The interruption cause is unproven. Do not remove assertions, enable retries
or claim acceptance from partial output when recovering a runner interruption.

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
- A real-phone generic failed-save report was traced to valid Free-plan
  enforcement being hidden by the client. Web Worker
  `6c8bfa3f-a425-47bc-b2c6-60980534963d` now keeps premium designs available
  for preview but explains and disables unavailable Save/Export actions, does
  the same when active-project capacity is exhausted and safely presents only
  approved structured product errors. Focused Chromium and WebKit journeys
  prove the Free premium/design-switch/export flow, the one-project limit and
  the same entitlement guidance at 320 CSS pixels without overflow.
- The same acceptance run caught an invalid, unprovisioned BFF API hostname in
  the web deployment example. The example now requires the exact BFF Convex
  site URL; the corrected Worker passes all 14 Chromium/WebKit journeys,
  including Studio invitation, acceptance and role promotion.
- Direct health probes for TableCards HTTP and the session gateway return `200`;
  an unauthenticated shared product-access probe returns the intended `401`.
- The complete user-story acceptance pass deployed shared BFF development
  `compassionate-buffalo-689`, TableCards Convex `scrupulous-hawk-991` and web
  Worker version `62a72afb-2f99-4ca1-9448-4ab319a4b5d0`. All US-01–US-20
  registry entries pass through the hosted product in desktop Chromium and
  mobile WebKit. The tests exercise `$0`, no-charge `$5` Event Pass, no-charge
  `$9/month` Planner Pro and no-charge `$19/month` Studio projections; Studio
  then uses the real shared BFF invitation, role, removal and provider-neutral
  ownership-transfer APIs. Production and Paddle remain unchanged.

## Safety and known limits

- Build 3 has no Paddle tables, provider webhook, live charge, production
  TableCards deployment, email/support flow, analytics, or generic monitoring.
  Its shared BFF checkout is an explicitly no-charge simulation, not payment
  truth.
- Current uploads and generated PDFs use authenticated byte endpoints, never
  new `storage.getUrl` bearer links. Every byte request rechecks the live BFF
  session and membership; browsers hold disposable, bounded blob URLs. Previously
  issued legacy bearer links cannot be revoked by this code change and must not
  be logged/shared; invalidating those files requires separately scoped cleanup.
- Hosted exports embed bundled, hash-verified Noto Sans and Noto Serif. The
  supported font boundary is Latin text including common extended characters;
  unsupported glyphs fail explicitly. This is not a broad-script or physical
  print-fidelity certification.
- CSV/XLSX and print code remain a large editor chunk, but route-level loading
  keeps that chunk off the landing page. Further editor-internal splitting is a
  performance optimization, not an authorization or correctness dependency.
- The focused hosted browser suite proves the primary public/Free,
  professional and Studio workflows. Exhaustive permission, account-isolation,
  capacity, replay and unit-accounting decisions remain in faster BFF/Convex
  integration tests rather than a browser Cartesian product.

## Troubleshooting and recovery

| Symptom                                 | Safe check / next action                                                                                                                                                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in returns but shows signed out    | Check gateway health and exact web/adapter/callback configuration; same-site cookie topology matters. Do not expose cookie or token values in diagnostics                                                         |
| Save/export denied                      | Inspect the approved error code, selected account, offer, active-project/card limits and design entitlement; do not bypass the server rule to make the UI appear successful                                       |
| Export stays queued/generating or fails | Check TableCards scheduled work and the safe export status/error; verify registered artwork path/hash and project revision before retry                                                                           |
| Upload rejected                         | Check fully decodable PNG/JPEG bytes, at most 10 MiB and 2 megapixels, unrotated exact 7:4 ratio and minimum 1050 × 600 dimensions; PNG must be non-animated and at most 8-bit; Event Pass requires a saved event |
| AI unavailable                          | Confirm development provider flags and safe batch/reservation status; never add an API key or call a paid model as an unapproved workaround                                                                       |
| Studio invitation controls missing      | Verify Studio was completed through shared checkout and the account role/policy allows invitations; do not manufacture policy with a hidden test fixture                                                          |
| Monthly usage seems wrong               | BFF chooses the anniversary allocation; Business calls must not send a bucket/period key. Mock renewal means simulated success, not verified payment                                                              |

Credential-free development probes:

```bash
curl --fail https://scrupulous-hawk-991.convex.site/v1/health
curl --fail https://compassionate-buffalo-689.convex.site/v1/health
curl --fail https://api.tablecards-dev.tofler.app/_tofler/session-gateway/health
```

For an incorrect web release, use the last compatible reviewed artifact and
the existing development Worker manifest; verify the public creator, session
and checkout return after publication. For backend changes, assess schema/data
compatibility and prefer a fix-forward deployment; do not blindly restore an
older schema or delete account/project data. Redeployment still needs the
task's authorization. This runbook does not establish tested backup recovery
or a production rollback procedure.

## Production boundary

There is currently no TableCards production Worker/session-gateway manifest or
documented production acceptance run. A later authorized release must register
exact independent targets, configure credentials outside Git, validate that
development identity/AI entries are absent, verify truthful no-charge checkout
when enabled for the accepted Build 3 demo, and run live production product
smoke. Build 4 replaces simulated activation with verified provider state;
Build 5 owns support and Build 6 owns monitoring/operator visibility. These
later-stage obligations must not be reported as completed by development mocks.
