# Build 3 TableCards operations

Created: 2026-09-27
Last updated: 2026-10-07
Status: Build 3 no-charge production preview deployed; final release evidence below

This runbook covers the Build 3 no-charge preview in development and production.
Andrew authorized production setup, merge, deployment and verification on
2026-10-07. Real Cloudflare generation is authorized with separate capped usage
in each deployment. Real payment and customer launch remain later stages.

Use [Product](product.md) for promises, [Application](application.md) for
screens/states and [Architecture](architecture.md) for table/API ownership.
The [production release review](reviews/261007-build-3-production-release.md)
records current versions, checks and limits. The
[delta review](reviews/261007-pdf-session-and-live-ai-fixes.md) and
[earlier remediation acceptance](reviews/261006-tablecards-remediation-and-development-acceptance.md)
and older runs below remain historical evidence for their versions.

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
- `projects/tablecards/ai-provider` is the secret-authenticated Workers AI
  adapter; product authorization, cap, accounting and storage remain in Convex.

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

`TABLECARDS_AI_PROVIDER=cloudflare` is the development default for real artwork.
The browser's explicit test-fixture engine (or a fixture-only deployment with
`TABLECARDS_AI_PROVIDER=development`) produces four deterministic color images
without AI calls and still exercises reserve/commit/release. Mock selection is
allowed only while development mocks are enabled. No OpenAI adapter/key is used.

### Cloudflare AI budget and reference images

The [private AI adapter](../ai-provider/README.md) is
`business-factory-tablecards-ai-dev`, using its `AI` binding with fixed
`@cf/black-forest-labs/flux-2-klein-4b`, 1344 × 768 output, four images/batch,
two concurrent calls at a time and no inference retries. Set the TableCards
development `TABLECARDS_CLOUDFLARE_AI_URL` to
`https://business-factory-tablecards-ai-dev.kabytaa.workers.dev/generate`.
Install matching strong random credentials in its `PROVIDER_SECRET` and Convex's
`TABLECARDS_CLOUDFLARE_AI_SECRET` through secret/environment tools only. Never
put these values in Git, public environment files, screenshots or command output.
Worker request observability is disabled; errors return safe codes, not prompts,
images or provider payloads. Production uses the separate adapter below.

Andrew raised the initial eight-batch cap on 2026-10-07 to **$1 per UTC day across
the TableCards development deployment**. The non-secret
`TABLECARDS_AI_DAILY_BUDGET_USD` setting belongs in that Convex deployment's
environment configuration, managed through its dashboard or the operator's
Convex CLI—not the browser, shared BFF account-policy settings or this Worker.
For the reviewed development target, run from `projects/tablecards/backend`:

```sh
pnpm exec convex env set TABLECARDS_AI_DAILY_BUDGET_USD 1 --deployment scrupulous-hawk-991
```

The backend rounds estimated batch cost up to `$0.0072` and admits at most
**138 four-image starts/day** ($0.9936 of reserved gross inference budget),
before reserving account units. Failed/interrupted
starts still count; identical completion recovery does not start new inference.
Concurrent starts and UTC rollover are integration-tested. A cap response leaves
the account's remaining allowance unchanged and reports Try tomorrow. This is
separate from each account's offer allowance and from Cloudflare's account-wide
free tier; other applications may share that tier.

Set `0` to pause new real batches; missing/invalid settings fail closed too.
An already-admitted batch may finish recovery after lowering the budget.
Only plain dollar amounts with up to two decimal places, from `0` to `7.20`,
are supported: the upper bound keeps the indexed admission read within 1,000
records. Larger budgets require a reviewed counting strategy, not an unbounded
query. Production must configure its own budget explicitly; the authorized
release uses a separate `$1/day` setting and counter. Customer-plan allowances do not
change when the site's safety budget changes.

[Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
checked 2026-10-07 lists 10,000 free neurons/account/day, with paid overage after
that. For the [fixed 4B model](https://developers.cloudflare.com/workers-ai/models/flux-2-klein-4b/),
a conservative six output tiles/image plus at most one 512-pixel reference tile
is about 647 neurons per four-image batch, or about 89,242 neurons at 138 starts.
The unrounded model-rate estimate is `$0.007124/batch`; the admission guard uses
`$0.0072` for conservatism. These are gross inference estimates, not a guarantee
of free account-wide usage or an exact provider-invoice limit. Free credits may
reduce billed cost; Worker/Convex/storage/tax costs are separate, and provider
calls admitted before midnight may complete after it. Per-user confirmed spend
is a [future BFF idea](../../../docs/architecture/future-ideas.md#per-user-and-per-account-provider-cost-attribution), not this admission counter.
Changing model, size, count or retries needs a fresh budget
check. The adapter does not permit caller-selected values for those dimensions.

Optional company/style references are PNG/JPEG up to 10 MB/16 megapixels locally,
normalized to a metadata-stripped JPEG no larger than 512 × 512 pixels/512 KiB.
Convex checks actual pixels, then sends the selected copy alongside the prompt.
Guest lists, project/account metadata and filenames are not automatically sent.
Only a reference digest persists on the operation; the reference itself is not
a saved gallery file. The UI/privacy notice disclose the Cloudflare transfer
and explain that exact logo reproduction is not promised.

## Production release and recovery

PDF export reads its pinned public artwork/fonts with at most three transport
attempts (ten seconds each). Persistent failure remains a failed export that can
be requested again; retries do not weaken hash/MIME checks, follow redirects or
replay storage/AI writes. If `EXPORT_FAILED` persists, inspect the scoped Convex
`exports:render` failure and public asset availability; never copy raw customer
logs/identity tokens into release evidence.

The reviewed production targets are independent of development:

| Surface                        | Production target                                                     |
| ------------------------------ | --------------------------------------------------------------------- |
| Web                            | `https://tablecards.tofler.app`                                       |
| Same-site session gateway      | `https://api.tablecards.tofler.app`                                   |
| TableCards Convex              | `clean-gerbil-451` (`.convex.cloud` / `.convex.site`)                 |
| Shared BFF Convex              | `exuberant-goldfinch-830`                                             |
| Shared authentication/checkout | `https://auth.tofler.app`                                             |
| Private AI adapter             | `https://business-factory-tablecards-ai.kabytaa.workers.dev/generate` |
| Business environment           | `tablecards-production`                                               |

Production auth uses the same code-owned defaults as development, with exact
production origins, the `/create` return path and automation disabled. Definition
revision 4/configuration revision 1 passed a compatible operator preflight and
was applied after Andrew's confirmation. Production never accepts development
identity grants, fixture AI or arbitrary offer selection. The shared no-charge
checkout is intentionally enabled; it creates simulated grants, not verified
paid subscriptions. The UI identifies these as **No-charge simulation**.

Production Convex requires the same private checkout/provider credentials as
development, but different values: `BFF_CHECKOUT_SERVICE_TOKEN` matches its
environment entry in BFF's `BFF_CHECKOUT_SERVICE_SECRETS_JSON`, and
`TABLECARDS_CLOUDFLARE_AI_SECRET` matches this Worker's `PROVIDER_SECRET`.
`TABLECARDS_AI_PROVIDER=cloudflare`, `TABLECARDS_AI_DAILY_BUDGET_USD=1` and the
production adapter URL are deployment settings. `TABLECARDS_DEVELOPMENT_MOCKS_ENABLED`
must be absent. Each Convex database counts its own `aiBatches` starts; development
cannot consume production's application budget. Both adapters still share the
Cloudflare account's provider allowance and invoice.

Install secrets through native provider tools/stdin, never repository files,
browser variables or logs. GitHub's `production` environment holds the scoped
`TABLECARDS_CONVEX_DEPLOY_KEY`; the [production-delivery tool](../../../tools/production-delivery/README.md)
documents public inputs. Its target guard checks the key's non-secret deployment
prefix before any TableCards environment write. Shared BFF and retained Example
credentials remain isolated in their own CI steps.

The main-branch workflow validates first, then preflights exact-target bundles,
deploys/stamps BFF, Example and TableCards backends, publishes gateways and static
surfaces, and runs `pnpm production:smoke`. Every health/build metadata must match
the same full merge SHA. TableCards manifests live beside web/gateway/AI code as
`wrangler.production.jsonc`. This is not a zero-downtime rollout guarantee: if
publication partially fails, do not call the release complete. Inspect the failed
step, fix the release-scoped problem and rerun the workflow at the reviewed SHA.
Prefer roll-forward; do not roll a deployed schema back or erase customer data
without a separately reviewed compatibility/migration plan. Existing browser tabs
should reload after publication.

After CI's anonymous target/header/CORS/private-route checks, run public browser
smoke without any development identity:

```sh
pnpm exec playwright test --config projects/tablecards/e2e/playwright.production.config.ts
```

It checks pricing, long/accented/duplicate names, cards-only preview, responsive
containment, policies and real business-branded Google handoff on Chromium and
mobile WebKit, including opening Google's real credential-entry popup.
It deliberately stops before entering personal Google credentials.
Authenticated development user-story tests are separate evidence, not a claim
that a new production account completed checkout/team/export. Record those
limits and actual deployed versions in the dated release review.

Verify production fonts against the same pins documented below. Public artwork
must match its catalog pins; new uploaded artwork/PDF bytes must remain private.
To pause new production AI starts without changing account allowances:

```sh
cd projects/tablecards/backend
pnpm exec convex env set TABLECARDS_AI_DAILY_BUDGET_USD 0 --deployment clean-gerbil-451
```

Restoring `1` reopens the remaining daily admission budget; lowering the cap does
not erase attempts or cancel recovery. Main CI reconciles this value from
GitHub's `production` environment on every release. An emergency CLI pause is
therefore not persistent across a later deployment: prevent pending publication
or review that desired configuration before allowing CI to reopen generation.
Disabling AI is not a rollback of ordinary
predefined/uploaded designs or PDF export. Real billing, public support,
observability and physical launch certification remain Builds 4–7.

The no-charge preview remains unindexed. TableCards HTML routes, including
project, invitation and team deep links, send `no-store`; CSP blocks embedding
and permits the required same-site session/Convex connections and private Blob
image previews. Versioned predefined artwork retains immutable caching. The
actual rules are in [web/public/_headers](../workloads/web/public/_headers),
and live release smoke verifies their publication. Newly created custom-domain
TLS may take time to activate; do not disable certificate verification or mark
a failing hostname as accepted. See [Cloudflare custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

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
explicitly selected fixture AI batch. The executable registry maps every accepted PRD story,
US-01 through US-20, to four cohesive product journeys. Those journeys run in
desktop Chromium and mobile WebKit and include all four offer promises,
projects, artwork, AI units, navigation, two-account isolation, invitations,
roles, removal and ownership transfer. Focused desktop regressions retain the
public print PDF and 320-pixel geometry checks. The complete hosted command runs
27 ordinary cases: 17 desktop Chromium and 10 mobile WebKit, including actual edited
PDF contents, private-file denials, embedded-font 500-card exports and the
recorded UI regressions. Two additional manual AI test cases are skipped unless
`TABLECARDS_TEST_MANUAL_AI=true`; they make exactly two four-image batches total
and consume the real daily budget. Normal regression explicitly selects fixtures.

"Manual AI test" means an explicitly triggered automated browser test against
the real Cloudflare provider. It is not a human-only checklist or a normal CI run.

```sh
TABLECARDS_TEST_MANUAL_AI=true pnpm exec playwright test \
  --config projects/tablecards/e2e/playwright.config.ts \
  projects/tablecards/e2e/src/manual-ai.spec.ts
```

Run that opt-in check only with live-provider authority and remaining budget.
It verifies text-only desktop generation, optional reference preparation/removal
on mobile WebKit, four stored choices, actual non-solid image pixels, exactly one
account unit per batch and signed-in navigation. Do not loop failed inference
tests or silently fall back to fixtures.
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

### 2026-10-07 development redeployment

Andrew requested commit/push and development deployment. The worktree was
already clean and `d0c53e71062b440c3a0483087483b7eda4360117` was pushed;
there was no uncommitted implementation to create an empty checkpoint for.
This commit differs from reviewed runtime `a914da0` only in documentation and
E2E selectors, not application/server implementation.

Fresh uncached web and development-auth builds passed. All 44 backend
integration tests passed, including negative authorization. Both existing
Convex development deployments were pushed with typechecking enabled and
stamped with the full `d0c53e7` SHA; gateway health matches it. Hosted fonts
still match their code-owned pins, both web surfaces return HTTP 200 and an
anonymous private-file request correctly returns HTTP 401.

| Surface                  | Redeployed version                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------- |
| TableCards web           | `bc9923cf-aec7-430f-8be0-cb1890e6445c`; entry `/assets/index-Dkyj-h_x.js` unchanged |
| Session gateway          | `07da38cc-2ddc-468a-8829-c1490f996127`                                              |
| Central development auth | `093d57d7-a654-46e0-866a-1f7ffd618d63`                                              |
| TableCards Convex        | `scrupulous-hawk-991`; push/typecheck passed 03:04:55 UTC                           |
| Shared BFF Convex        | `compassionate-buffalo-689`; push/typecheck passed 03:04:50 UTC                     |

The unchanged configured hosted suite passed **27/27** after deployment at
03:13 UTC, in 7.7 minutes (command duration 7m45.9s): 17 desktop Chromium and
10 mobile WebKit cases, one worker and zero retries. It covered actual edited
and 500-card PDFs, private-file denials, no-charge offers, artwork/presets/AI,
workspace feedback and full Studio invitation/role/account/transfer journeys.
No provider secret, paid model, production target or merge was changed. This
operational refresh does not broaden the original development acceptance into
a production or customer-launch verdict. The follow-up documentation commit
records this deployment; it does not change the deployed implementation.

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

- Build 3 has no Paddle tables, provider webhook, live charge,
  email/support flow, analytics, or generic monitoring.
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

## 2026-10-07 PDF, session and Cloudflare corrections

Following explicit capped Cloudflare approval, the development candidate is
`ed7539f` plus uncommitted corrections, not a new Git commit. The TableCards
backend was pushed with its explicit development env file and reports
`ed7539f-pdf-session-cloudflare-20261007`. Web Worker
`6eaef2bf-3bed-4646-855e-24052234890d` serves `/assets/index-lpkqrTdh.js` and
`/assets/index-DIIg5DbD.css`. The private AI Worker is
`8f53f89d-c176-44d9-b948-e2f97ad53a1c` after secret installation. Shared BFF,
gateway and central authentication were not redeployed for this correction.

The [dated delta review](reviews/261007-pdf-session-and-live-ai-fixes.md)
records cards-only PDFs, public session-state actions, optional style references,
real illustrated choices, the hard cap, validation and final browser results.
Both manual AI test cases passed using only two batches. The final stable-version
ordinary suite passed **27/27** (17 desktop Chromium, 10 mobile WebKit; one worker,
zero retries, 7.2 minutes), and both final control screenshots were inspected.
The Node 24 repository gate and 101 web/42 core/52 backend focused checks passed.
Ordinary regression uses fixtures. Local/hosted artifact folders are separate, and final hosted
acceptance starts only after publication has finished. Reload old tabs after
publication: old lazy-module addresses may otherwise return the new SPA fallback.
No production change, merge, commit or push is authorized or performed here.

### 2026-10-07 AI budget revision

Andrew requested a `$1/day` development budget and the name "manual AI test".
TableCards Convex now has `TABLECARDS_AI_DAILY_BUDGET_USD=1`, confirmed by a scoped
environment read; its health reports `ed7539f-ai-budget-20261007`. This is still
the `ed7539f` baseline plus uncommitted corrections. The development Convex push
and server typecheck succeeded. Web, private AI Worker, BFF, gateway and auth were
not redeployed for this follow-up.

All 73 backend tests passed fresh, including a race for the last two of 138
admissions, already-failed attempts, lowered-budget recovery, raising the budget,
UTC rollover and missing/invalid/zero-budget refusal before unit reservation or
inference. Node 24 `pnpm check` passed in 2m 36s. The renamed manual AI test was
then explicitly run against the stable deployment: **2/2 passed** in 1.8 minutes,
using two four-image batches total. The desktop text-only and mobile company-style
cases stored real illustrated choices, consumed one account unit apiece and
retained correct signed-in navigation. Screenshots remain ignored private test
artifacts. The earlier 27-case regression verifies unchanged web flows; this
follow-up did not rerun or relabel those cases as new evidence.

The [future provider-cost attribution entry](../../../docs/architecture/future-ideas.md#per-user-and-per-account-provider-cost-attribution)
records Andrew's separate request to understand actual cost to serve each
user/account. The daily admission estimate is not that future BFF ledger/report,
and does not claim invoice-confirmed spend. No production configuration, merge,
commit or push was performed.

## Production boundary

There is currently no TableCards production Worker/session-gateway manifest or
documented production acceptance run. A later authorized release must register
exact independent targets, configure credentials outside Git, validate that
development identity/AI entries are absent, verify truthful no-charge checkout
when enabled for the accepted Build 3 demo, and run live production product
smoke. Build 4 replaces simulated activation with verified provider state;
Build 5 owns support and Build 6 owns monitoring/operator visibility. These
later-stage obligations must not be reported as completed by development mocks.
