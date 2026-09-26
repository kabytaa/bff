# Production delivery

Updated: 2026-09-26.

Status: completed and production-verified 2026-09-26.

This runbook implements [ADR 0003](../architecture/adr/0003-production-delivery.md). Never record a deploy key, API token or Google ID token here, in chat or in git.

## Fixed targets

| Surface | Development | Production |
| --- | --- | --- |
| Convex | Personal development deployment inside `andrew-tofler/business-factory` | Default production deployment inside the same project |
| Cloudflare Worker | `business-factory-backoffice-dev` | `business-factory-backoffice` |
| Backoffice | `https://ops-dev.tofler.tech` | `https://ops.tofler.tech` |
| Google web client | Shared reviewed public client ID | Same client, with the exact production origin already authorized |
| Data | Development-only | Empty at first release; never copied from development |

Development stays manual. Production deploys only from GitHub Actions after a reviewed push to `main`.

## GitHub production environment

Create environment `production`, restrict its deployment branch to `main` and configure no required reviewer or wait timer.

### Variables

| Name | Value type | Purpose |
| --- | --- | --- |
| `BACKOFFICE_URL` | Public HTTPS origin | Must equal `https://ops.tofler.tech` |
| `CLOUDFLARE_ACCOUNT_ID` | Non-secret provider identifier | Selects Andrew's approved Cloudflare account |
| `CONVEX_URL` | Public HTTPS origin | Expected production `.convex.cloud` client URL |
| `CONVEX_SITE_URL` | Public HTTPS origin | Expected production `.convex.site` HTTP-action URL |

### Secrets

| Name | Owner | Scope |
| --- | --- | --- |
| `CONVEX_DEPLOY_KEY` | Convex | Business Factory production deployment only; Convex CLI keys are deployment-scoped rather than capability-scoped |
| `CLOUDFLARE_API_TOKEN` | Cloudflare | Shared Tofler CI token: Workers Scripts Edit in the selected account and Workers Routes Edit for `tofler.tech` plus `tofler.app` |

Name the Convex key `bff-github-production` and the Cloudflare token `tofler-github-ci`. Install values directly into the GitHub environment secret store. Do not use repository secrets when environment-scoped secrets suffice, and do not reuse the interactive personal Convex or Wrangler login.

The Cloudflare token is deliberately reusable by Tofler CI pipelines during the current solo phase. In the three-column token editor, add these exact rows:

- `Account > Workers Scripts > Edit` to upload and deploy Workers;
- `Zone > Workers Routes > Edit` to connect Workers to both owned Tofler zones;
- `Account > Account Settings > Read`;
- `Zone > Zone > Read`;
- `User > User Details > Read`; and
- `User > Memberships > Read`.

The final four rows support Wrangler discovery. The token does not grant general DNS Edit, billing, KV, D1, R2, AI, Queue, email, browser or Secrets Store access. A future arbitrary non-Worker DNS record needs a separate action or token.

## Pre-release checks

From the repository root under Node 24:

```bash
pnpm install --frozen-lockfile
pnpm check
git diff --check
```

With production credentials supplied outside git, run both provider dry runs and inspect the printed targets:

```bash
pnpm exec convex deploy --dry-run
pnpm exec wrangler deploy --dry-run \
  --config platform/bff/backoffice/wrangler.production.jsonc
```

Expected Cloudflare target: Worker `business-factory-backoffice`, custom domain `ops.tofler.tech`, assets from `dist/platform/bff/backoffice`. A dry run must not upload.

Before push, confirm:

- the complete local gate is green;
- GitHub environment variables identify the default Convex production deployment and `ops.tofler.tech`;
- both production secret names exist without revealing values;
- no credential/provider output is staged;
- Andrew has reviewed the diff and explicitly authorized this push.

## Automated release sequence

The `deploy-production` job in `.github/workflows/ci.yml` runs only for a push to `main` and only after `validate` succeeds.

1. Install the frozen dependency graph.
2. Run `convex deploy` with the production key. Convex supplies `VITE_CONVEX_URL` to `pnpm production:build`.
3. The build tool requires that injected URL to equal `CONVEX_URL`, requires the matching production site URL, builds the dashboard and runs the bundle leak assertion.
4. Convex publishes functions/schema/auth configuration and records the commit SHA in its deployment message.
5. Set `BFF_BUILD_VERSION` to the same full SHA.
6. Wrangler publishes the prebuilt assets with `wrangler.production.jsonc`.
7. `pnpm production:smoke` checks the live release.

The job uses production concurrency and never cancels an already running deployment.

## Automated smoke contract

The smoke command retries boundedly for provider propagation, then requires:

- `<CONVEX_SITE_URL>/v1/health` returns the public `business-factory-bff` health contract;
- `version` equals the full GitHub SHA;
- `https://ops.tofler.tech` returns success and the expected no-store, CSP, anti-framing, nosniff and no-index headers;
- a same-origin Vite JavaScript asset contains the expected production Convex URL and no other generated `.convex.cloud` target.

Smoke uses public values only. It receives no Google identity and no provider deploy credential beyond what the preceding deploy steps require.

## First production acceptance

After the first green automated release:

1. Andrew opens `https://ops.tofler.tech` on his computer or phone.
2. Sign in with one allowlisted Google account.
3. Confirm the read-only overview loads and shows zero Business environments.
4. Confirm health displays the same commit SHA as the GitHub run.
5. Confirm `https://ops-dev.tofler.tech` remains the separate development dashboard.

Only then mark Build 1 and the production-delivery plan Completed.

## Partial-release recovery

### Validation or build failed

No provider should have changed. Fix the repository issue, rerun locally and use another Andrew-reviewed push.

### Convex deploy failed

Cloudflare must not run. Inspect the Convex error without printing the deploy key, correct it and retry/fix forward.

### Version stamp failed

Treat this as a partial backend release. Do not publish Cloudflare. Correct the key permission or environment command, set the exact SHA and rerun smoke before continuing.

### Cloudflare deploy failed after Convex succeeded

The new backward-compatible backend may be live behind the previous dashboard. Record the live health SHA and Cloudflare deployment state. Rerun the failed job if inputs are unchanged; otherwise fix forward in a reviewed commit. Do not automatically roll back Convex.

### Smoke failed after both deploys

Inspect the exact failing contract, header, SHA or bundle target. Never bypass the check to mark the release green. Retry only for propagation; fix configuration/code when the observed value is deterministically wrong.

### Behavior regression

Create a reviewed revert commit and push it through the same pipeline. Do not delete production data or manually upload an untracked local build.

## Credential rotation and revocation

1. Create a replacement provider token with the same accepted solo-phase scope, or narrow it to per-Business access if the reassessment trigger has been reached.
2. Replace the matching GitHub production environment secret directly.
3. Run dry checks and a reviewed production release.
4. Revoke the old token after the new credential succeeds.
5. Record the rotation date and token name, never its value.

If a credential may have leaked, revoke it first, stop production deployment and inspect provider/GitHub histories before issuing a replacement.
