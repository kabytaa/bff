# Build 1 hosted verification

Updated: 2026-09-26.

Status: completed 2026-09-26; development resources only.

This runbook is the separate hosted gate for Build 1. Do not execute it merely because local implementation is complete. It requires Andrew's explicit approval for the named Convex development deployment and Cloudflare site, plus a one-time real Google sign-in.

## Current external baseline

The authenticated Convex account owns the existing `andrew-tofler/business-factory` project. On 2026-09-26, hosted verification created and selected its personal development deployment, `compassionate-buffalo-689`. No production deployment was created and no cloud Business-environment rows were inserted. The tested functions and public health route are live in the development deployment.

Wrangler is authenticated to Andrew's confirmed Cloudflare account with only account/user read, Worker scripts/routes write and zone read. The approved development Worker `business-factory-backoffice-dev` is live at `https://ops-dev.tofler.tech`; its current Cloudflare version is `45cc63d7-b78f-4c41-86a9-dd8335d10eef`. `ops.tofler.tech` remains reserved for a future production environment.

No production/staging deployment, Paddle resource or continuous-deployment credential is part of this hosted gate.

## Required approval and human inputs

Before making any hosted change, present and confirm:

- the exact Convex team, `business-factory` project and development-deployment reference;
- the exact Cloudflare account, Worker name `business-factory-backoffice-dev` and Custom Domain `ops-dev.tofler.tech`;
- that `ops-dev.tofler.tech` is development-only and `ops.tofler.tech` will not be created or changed;
- the Google Cloud project and web client Andrew wants to own;
- the locally validated git commit and a clean `pnpm check` result.

Andrew must authorize the provider-account changes and perform or approve the necessary one-time logins. Never request or record passwords, recovery codes, Google ID tokens, Convex deploy keys or Cloudflare API tokens in chat or repository files.

## 1. Revalidate locally

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm check
git diff --check
```

Record the commit SHA as the intended `BFF_BUILD_VERSION`. If the worktree is intentionally uncommitted, do not claim a hosted commit until that state is resolved.

## 2. Confirm the development targets

Use an explicit deployment selector or the Convex dashboard to verify `andrew-tofler/business-factory` and its personal development deployment. Do not use `--prod`, create a second Business Factory project or touch Podcat.

Use `wrangler whoami` to verify the approved Cloudflare account before any upload. The repository Wrangler configuration is the source of truth for the Worker name and Custom Domain.

## 3. Configure the Google web client

Create or select one Google OAuth 2.0 **Web application** client shared by the tiny development and future production operator dashboards. Configure only basic Google identity and these exact authorized JavaScript origins:

- `https://ops-dev.tofler.tech`
- `https://ops.tofler.tech`

Google Identity Services popup mode uses a JavaScript callback, so Build 1 requires no redirect URI or client secret. Keep the generated secret unused. The public client ID is safe, reviewed code-owned configuration.

Add the public client ID to `@bff/static-config`. Convex auth and the dashboard must import the same reviewed value; do not duplicate it in deployment or Vite environment variables.

## 4. Push the Convex functions

After selection, push the already validated functions once:

```bash
pnpm exec convex dev --once --tail-logs disable
```

Set the public build version on that explicit development deployment. Set values through the Convex interactive prompt or stdin so private configuration does not enter shell history.

Do not create dummy cloud Business-environment rows. The hosted dashboard may validly show an empty registry.

## 5. Build and deploy the development dashboard

Use the repository config at `platform/bff/backoffice/wrangler.jsonc`. It disables the `workers.dev` hostname and declares `ops-dev.tofler.tech` as a Custom Domain, allowing Cloudflare to create the DNS record and certificate for that hostname. Do not add a route for `ops.tofler.tech` or request general DNS-write permission.

The final build requires these public values outside git:

- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`

Build the dashboard using the exact development Convex URLs, public Google client ID and intended git build version. First use `wrangler deploy --dry-run` to verify the static-asset path and declared domain. Then, only with deployment approval, publish the approved Worker:

```bash
pnpm exec wrangler deploy --config platform/bff/backoffice/wrangler.jsonc
```

Confirm `https://ops-dev.tofler.tech` serves the expected build. Do not store a Cloudflare token in the repository and do not add GitHub deployment automation in Build 1.

## 6. Bootstrap the operator allowlist

1. Open the hosted backoffice and sign in with Andrew's intended Google account.
2. Confirm that health loads but the protected overview remains denied.
3. Confirm the dashboard displays the expected Google email and marks it verified. Never copy the ID token.
4. Add only Andrew's and his wife's approved addresses to `BACKOFFICE_OPERATOR_EMAILS` in `@bff/static-config`, rerun the authorization and full quality gates, then deploy the BFF functions.
5. Reload and verify the environment overview is now authorized.

Google authentication alone must never grant operator access; the server-side allowlist check is mandatory on every protected query.

## 7. Hosted acceptance checks

- `GET /v1/health` returns `200`, service `business-factory-bff` and the intended build version.
- The HTTPS dashboard renders correctly at desktop and phone widths.
- Signed-out users see the sign-in state.
- A verified but unlisted Google identity sees only its own email/verification state and cannot read the overview.
- Andrew's allowlisted identity can read the bounded, read-only overview.
- Token expiry returns to reauthentication without persisting the Google ID token.
- Browser storage contains no Google token, Convex deployment credential or operator allowlist.
- Security headers prevent framing/indexing and permit only the required Google/Convex connections.
- No registry mutation control appears in the dashboard.
- No production/staging deployment, production hostname, Paddle resource or CI deploy secret exists.

Rerun `pnpm check` against the exact deployed source after provider configuration.

## Verification result — 2026-09-26

- The complete local `pnpm check` gate passed after the final static-configuration change.
- Live Convex health returned `200` with the expected service and build metadata.
- The Cloudflare Custom Domain returned `200` with the expected security and no-index headers.
- Signed-out desktop and phone-size rendering were checked, and Playwright passed both deterministic viewports.
- Andrew completed a real Google sign-in and confirmed that the allowlisted operator can see the health, version and empty read-only Business-environment overview.
- The production hostname, production Convex deployment, Paddle and CI deployment credentials remained untouched.

The functional hosted gate is complete. Visual refinement of the deliberately minimal backoffice is separate product work, not a Build 1 acceptance blocker.

## Rollback

- Remove the Worker deployment or disable its public route in Cloudflare; do not delete unrelated account resources.
- Remove the affected address from the code-owned allowlist, rerun the authorization tests and redeploy the affected BFF lane to fail protected reads closed.
- Remove the Cloudflare origin from the Google client if the site is retired.
- Revoke the one-time Wrangler/Convex session only if it is no longer needed; preserve account recovery access with Andrew.
- Do not delete the Convex project or data without a separate explicit request.

After successful hosted verification, update `STATUS.md` and the retained implementation plan with resource names and results only. Never record identity values or credentials.
