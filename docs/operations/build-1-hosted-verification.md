# Build 1 hosted verification

Updated: 2026-09-26.

Status: approval-gated; not executed.

This runbook is the separate hosted gate for Build 1. Do not execute it merely because local implementation is complete. It requires Andrew's explicit approval for the named Convex development deployment and Cloudflare site, plus a one-time real Google sign-in.

## Current external baseline

Local Convex initialization created the `business-factory` project record under the currently authenticated Convex team and selected a local deployment. No BFF functions or data were pushed to a cloud deployment. Before hosted work, verify the exact account, project and intended development-deployment name; do not create a duplicate project or reuse Podcat.

No Cloudflare login, Worker deployment, Google OAuth client, custom domain, production/staging deployment, Paddle resource or continuous-deployment credential is part of the local gate.

## Required approval and human inputs

Before making any hosted change, present and confirm:

- the exact Convex team, `business-factory` project and proposed development-deployment reference;
- the exact Cloudflare account and proposed Worker name `business-factory-backoffice-dev`;
- that only a `workers.dev` development origin is being created, with no custom domain;
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

## 2. Select one Convex development deployment

Use `convex whoami` and the Convex dashboard to verify the authenticated team/project. Create or select only one development deployment inside `business-factory`; do not use `--prod` and do not touch Podcat.

After selection, push the already validated functions once:

```bash
pnpm exec convex dev --once --tail-logs disable
```

Set the public build version on that explicit development deployment. Set values through the Convex interactive prompt or stdin so private configuration does not enter shell history.

Do not create dummy cloud Business-environment rows. The hosted dashboard may validly show an empty registry.

## 3. Create the initial Cloudflare origin

After the exact account and Worker name are approved, complete the interactive Wrangler login and build a configuration-pending static shell. Use the repository config at `platform/bff/backoffice/wrangler.jsonc`; do not add a route or custom domain.

The final build requires these public values outside git:

- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`
- `VITE_GOOGLE_CLIENT_ID`

First use `wrangler deploy --dry-run` to verify the static-asset path. Then, only with deployment approval, publish the approved Worker:

```bash
pnpm exec wrangler deploy --config platform/bff/backoffice/wrangler.jsonc
```

Capture the exact HTTPS `workers.dev` origin. Do not store a Cloudflare token in the repository and do not add GitHub deployment automation in Build 1.

## 4. Configure the Google web client

Create or select one Google OAuth 2.0 **Web application** client for the operator dashboard. Configure only basic Google identity and the exact authorized JavaScript origins:

- the approved local dashboard origin, if live local Google testing is desired;
- the exact Cloudflare `workers.dev` origin.

Google Identity Services popup mode uses authorized JavaScript origins and the public client ID. Build 1 does not request a client secret or a callback URL. Put the same public client ID in the Convex development environment as `GOOGLE_CLIENT_ID` and in the backoffice build as `VITE_GOOGLE_CLIENT_ID`, then rebuild and redeploy the static assets.

## 5. Bootstrap the operator allowlist

1. Open the hosted backoffice and sign in with Andrew's intended Google account.
2. Confirm that health loads but the protected overview remains denied.
3. Copy the dashboard's displayed `(issuer, subject)` pair. Never copy the ID token.
4. Set `BFF_OPERATOR_IDENTITIES` on the explicit Convex development deployment using the interactive `convex env set` prompt with a JSON array containing only approved operator pairs. Do not pass the value as a command-line argument or save it in a file under the repository.
5. Reload and verify the environment overview is now authorized.

Google authentication alone must never grant operator access; the server-side allowlist check is mandatory on every protected query.

## 6. Hosted acceptance checks

- `GET /v1/health` returns `200`, service `business-factory-bff` and the intended build version.
- The HTTPS dashboard renders correctly at desktop and phone widths.
- Signed-out users see the sign-in state.
- A verified but unlisted Google identity sees only its own issuer/subject and cannot read the overview.
- Andrew's allowlisted identity can read the bounded, read-only overview.
- Token expiry returns to reauthentication without persisting the Google ID token.
- Browser storage contains no Google token, Convex deployment credential or operator allowlist.
- Security headers prevent framing/indexing and permit only the required Google/Convex connections.
- No registry mutation control appears in the dashboard.
- No production/staging deployment, custom domain, Paddle resource or CI deploy secret exists.

Rerun `pnpm check` against the exact deployed source after provider configuration.

## Rollback

- Remove the Worker deployment or disable its public route in Cloudflare; do not delete unrelated account resources.
- Remove `BFF_OPERATOR_IDENTITIES` or the affected pair from the exact Convex development deployment to fail protected reads closed.
- Remove the Cloudflare origin from the Google client if the site is retired.
- Revoke the one-time Wrangler/Convex session only if it is no longer needed; preserve account recovery access with Andrew.
- Do not delete the Convex project or data without a separate explicit request.

After successful hosted verification, update `STATUS.md` and the retained implementation plan with resource names and results only. Never record identity values or credentials.
