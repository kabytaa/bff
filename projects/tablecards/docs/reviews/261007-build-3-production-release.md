# Build 3 production release review

Created: 2026-10-07
Updated: 2026-10-07
Status: Release in progress — production verdict pending deployment and smoke
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

| Area                                | State                                             | Evidence / limit                                                                                                                                                   |
| ----------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Product promises and UI             | Pending fresh run                                 | Full development user-story rerun covers import, projects, PDFs, uploads/presets, no-charge offers and Studio team/transfer; pricing must remain visibly simulated |
| Desktop/mobile app                  | Pending production run                            | New public Chromium/mobile WebKit suite checks creator, long names, policies and real Google handoff; rendered captures need inspection                            |
| Production targets/version/security | Pending deployment                                | Main CI and `production:smoke` must establish all three backend targets and web/gateway SHA/header/CORS/private-route contracts                                    |
| AI                                  | Pass for private provider smoke                   | Account orchestration/reference behavior requires the separately opted-in development manual AI tests; independent `$1/day` budgets, same provider invoice         |
| Payments and subscription truth     | Not applicable to no-charge boundary              | Shared simulation is explicitly approved; verified paid-through renewal/failure/downgrade/cancellation is Build 4, not proven by mock checkout                     |
| Privacy/disclosures                 | Scoped pass; commercial legal sign-off unverified | Notices explain vendor/image transfer, no charge, archive versus deletion, retention and absent public support; not a compliance certification                     |
| Operations/support/monitoring       | Scoped release work pending                       | Production manifests, target guards, recovery and AI pause commands exist; public support/monitoring remain Builds 5–6 and launch requirements                     |
| Print                               | Accepted Build 3 boundary                         | Andrew accepted his earlier satisfactory print; measured scale/margin/Avery compatibility remains the final MVP prelaunch gate. Six-up stays development-only      |

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

Final fixed production and refreshed development results are recorded below
after completion. Build 3 is not yet marked complete.

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
