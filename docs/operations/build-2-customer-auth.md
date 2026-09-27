# Build 2 customer authentication delivery

Updated: 2026-09-27.

Status: production tooling prepared and the same-site development gateway has
passed real iPhone Safari; production deployment and real Google/Safari
acceptance remain pending.

This runbook implements [ADR 0004](../architecture/adr/0004-business-customer-auth-and-accounts.md) and extends the release controls in [ADR 0003](../architecture/adr/0003-production-delivery.md). Never place deploy keys, private JWKs, Google credentials, session handles or JWTs in git, chat, command output or browser artifacts.

## Fixed production topology

| Surface                  | Production target                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------ |
| BFF Convex               | Existing Business Factory production deployment                                      |
| Example Convex           | Separate production deployment/project and scoped deploy key                         |
| Operator backoffice      | `https://ops.tofler.tech` / Worker `business-factory-backoffice`                     |
| Customer sign-in         | `https://auth.tofler.app` / Worker `business-factory-customer-auth`                  |
| Retained example         | `https://example.tofler.app` / Worker `business-factory-example`                     |
| Session gateway          | `https://api.example.tofler.app` / Worker `business-factory-example-session-gateway` |
| Business environment     | `example-production`                                                                 |
| Session adapter upstream | The example production `*.convex.site` origin                                        |

Real iPhone Safari proved that the generated Convex origin does not receive the
cross-site cookie after login. The fixed session gateway makes the public
adapter same-site with the example UI while forwarding only
`/_tofler/auth/*` to Convex. It does not decode or validate cookies and contains
no authentication policy; the shared server SDK in Convex still owns callback,
cookie, renewal, CORS/CSRF and logout behavior. `/v1/*` and native Convex
traffic do not use the gateway. A future direct Convex custom domain replaces
the gateway URL without changing the SDK contract.

## GitHub production environment

The existing `production` environment remains `main`-only and serialized. Add these public variables before the first Build 2 production run:

| Variable                       | Required value/purpose                              |
| ------------------------------ | --------------------------------------------------- |
| `BACKOFFICE_URL`               | `https://ops.tofler.tech`                           |
| `CUSTOMER_AUTH_URL`            | `https://auth.tofler.app`                           |
| `EXAMPLE_WEB_URL`              | `https://example.tofler.app`                        |
| `EXAMPLE_SESSION_ADAPTER_URL`  | `https://api.example.tofler.app`                    |
| `BFF_CUSTOMER_ENVIRONMENT_KEY` | `example-production`                                |
| `CONVEX_URL`                   | Existing BFF production `*.convex.cloud` origin     |
| `CONVEX_SITE_URL`              | Matching BFF production `*.convex.site` origin      |
| `EXAMPLE_CONVEX_URL`           | Separate example production `*.convex.cloud` origin |
| `EXAMPLE_CONVEX_SITE_URL`      | Matching example production `*.convex.site` origin  |
| `CLOUDFLARE_ACCOUNT_ID`        | Existing reviewed account identifier                |

Required environment secrets:

| Secret                      | Scope                                               |
| --------------------------- | --------------------------------------------------- |
| `CONVEX_DEPLOY_KEY`         | BFF production deployment only                      |
| `EXAMPLE_CONVEX_DEPLOY_KEY` | Separate example production deployment only         |
| `CLOUDFLARE_API_TOKEN`      | Existing reviewed Tofler Worker/custom-domain scope |

The production tool rejects a shared BFF/example Convex deployment, mismatched site/client pairs, development domains, non-production environment keys and incomplete values before any provider mutation.

## BFF customer signing key

The BFF production current-context signer must be different from development and from both automation signers.

1. On the protected operator machine, run:

   ```bash
   pnpm exec nx run bff-customer-auth-tools:generate-production-customer-signing-key
   ```

2. Verify the private file under `.convex/` is mode `0600`. Do not print it. The public JWKS sibling must contain no `d` member.
3. Set the BFF production Convex environment values through the authenticated Convex CLI without putting JWK contents in shell history or output:

   ```bash
   pnpm exec convex env set --prod BFF_CUSTOMER_AUTH_ISSUER https://auth.tofler.app
   pnpm exec convex env set --prod BFF_CUSTOMER_SIGNING_PRIVATE_JWK \
     --from-file .convex/customer-context-signing-production-private.jwk
   pnpm exec convex env set --prod BFF_CUSTOMER_SIGNING_PUBLIC_JWKS \
     --from-file .convex/customer-context-signing-production-jwks.json
   ```

   Inspect only the variable names afterward; never run a value-listing command into logs.

4. Do not configure either `BFF_CUSTOMER_DEVELOPMENT_AUTOMATION_AUDIENCE` or `BFF_CUSTOMER_DEVELOPMENT_AUTOMATION_PUBLIC_JWKS` in production. Their absence removes the development completion route.
5. Retain the protected local pair for controlled rotation/recovery, not in cloud sync or source control.

The automated smoke reads only `/v1/auth/jwks`, requires at least one public P-256 key and rejects a private `d` value. It never reads the signer secret.

### Rotation

For planned rotation, generate a new explicit pair outside the existing filenames, publish an overlapping JWKS containing old and new public keys, deploy the new private signer, and retain the retiring public key for at least the ten-minute token lifetime plus cache/clock-skew overlap. After every consumer and smoke sees the new `kid`, remove the old public key and destroy the retired private key. Never overwrite an active key implicitly.

For suspected compromise, revoke sessions, replace the signer immediately, retain only public material needed to reject/age out old tokens according to the incident decision, inspect provider/GitHub histories and require customers to sign in again. Do not claim already-issued stateless tokens vanished before their expiry.

## Register `example-production`

Before the real login gate, use the validated operator CLI preflight/apply flow to create or update the production Business environment with:

- `webOrigins: ["https://example.tofler.app"]`;
- `sessionAdapterBaseUrl: <EXAMPLE_SESSION_ADAPTER_URL>`;
- `defaultPostLoginPath: "/"`;
- Google enabled and development automation disabled;
- the accepted default single-account policy.

The callback is derived as
`<EXAMPLE_SESSION_ADAPTER_URL>/_tofler/auth/callback`; never configure a second
independent callback. Production writes require the CLI's exact production
confirmation and a fresh compatible preflight. Do not provision development
fixture accounts in production.

## Pre-release rehearsal

From the repository root under Node 24:

```bash
pnpm install --frozen-lockfile
pnpm check
git diff --check
pnpm exec nx run production-delivery:test
```

Supply the public production variables plus `GITHUB_SHA`, then map the GitHub
variable names to the process-level target guards before running
`pnpm production:build`:

```bash
export EXPECTED_CONVEX_URL="$CONVEX_URL"
export EXPECTED_EXAMPLE_CONVEX_URL="$EXAMPLE_CONVEX_URL"
export BFF_DEPLOY_CONVEX_URL="$CONVEX_URL"
```

The build audits all three static surfaces and writes a non-secret
`build-metadata.json` containing the exact SHA to each output directory.

With each scoped deploy key supplied only to its matching command, rehearse both backends:

```bash
pnpm exec convex deploy --dry-run
(cd projects/example/backend && pnpm exec convex deploy --dry-run)
```

Rehearse all static targets without upload:

```bash
pnpm exec wrangler deploy --dry-run --config platform/bff/backoffice/wrangler.production.jsonc
pnpm exec wrangler deploy --dry-run --config platform/bff/customer-auth/wrangler.production.jsonc
pnpm exec wrangler deploy --dry-run --config projects/example/session-gateway/wrangler.production.jsonc --var "UPSTREAM_ORIGIN:$EXAMPLE_CONVEX_SITE_URL" --var "BUILD_VERSION:$GITHUB_SHA"
pnpm exec wrangler deploy --dry-run --config projects/example/workloads/web/wrangler.production.jsonc
```

Expected Workers are `business-factory-backoffice`,
`business-factory-customer-auth`, `business-factory-example-session-gateway`
and `business-factory-example`. A dry run must not upload assets or create
domains.

## Automated release order

After the normal `pnpm check` validation job, the production job:

1. preflights every URL, separate deployment pair, static build and production bundle before mutation;
2. deploys the BFF and stamps `BFF_BUILD_VERSION` with `GITHUB_SHA`;
3. validates the deployment name embedded in the scoped example deploy key
   against `EXPECTED_EXAMPLE_CONVEX_URL` before invoking Convex or writing any
   example environment value;
4. configures only that verified example deployment's public trust/transport values using its own working directory and deploy key;
5. deploys the example backend and stamps `EXAMPLE_BUILD_VERSION` with the same SHA;
6. deploys the gateway with the exact example HTTP origin as its fixed upstream;
7. publishes backoffice, customer-auth and example assets built from that SHA; and
8. runs the expanded anonymous production smoke.

BFF/JWKS publication precedes example trust. No example command runs from the repository-root BFF Convex configuration, and no BFF command receives the example deploy key.

## Automated smoke contract

`pnpm production:smoke` retries only for bounded propagation and requires:

- BFF `/v1/health` reports the exact SHA;
- BFF `/v1/auth/jwks` exposes public P-256 keys only;
- the production development-automation HTTP route returns `404`;
- example `/v1/health` reports the exact same SHA;
- unauthenticated example `/v1/context` returns `401`;
- unauthenticated gateway `/_tofler/auth/context` returns `401` through Convex;
- direct and gateway preflights return the exact approved CORS contract, the
  gateway denial is credentialed and gateway `/v1/context` remains `404`;
- gateway health reports the exact release SHA;
- all three static surfaces return the expected CSP, no-store, anti-frame, nosniff and no-index headers;
- every `build-metadata.json` matches the exact SHA/surface; and
- downloaded JavaScript contains only the exact production BFF/example targets and no development marker.

Smoke is deliberately anonymous. It does not retain provider tokens, browser traces, screenshots or storage state.

## Real production acceptance

Automated smoke is necessary but not sufficient. Andrew completes the production example using real Safari and Google:

1. sign in through `auth.tofler.app` and reach the protected example;
2. confirm native Convex, Business HTTP and BFF `/v1/me` show one matching context;
3. hard reload without another Google ceremony;
4. remain active beyond the first ten-minute JWT and confirm renewal;
5. open a second tab, select an available account context and confirm tab isolation; and
6. sign out, then confirm neither tab can mint another token.

Verify the matching environment-local user, account, memberships and revoked session in the production backoffice. Record browser/device/version, workflow SHA and pass/fail results only—never personal screenshots or credentials.

## Partial-release recovery

- **Preflight/build failure:** no provider should have changed. Fix and use another reviewed push.
- **BFF failure:** stop; do not configure or deploy the example.
- **BFF succeeded, example failed:** keep the backward-compatible BFF, fix forward or retry with identical reviewed inputs. Do not roll back schema or delete auth data.
- **Backends succeeded, asset publish failed:** previous static assets may remain against compatible new backends. Fix the failed publication and rerun smoke.
- **Smoke failed:** inspect the exact SHA, target, header, JWKS, dummy-route or denial mismatch. Do not bypass the failing assertion.
- **Gateway or Safari failed only:** leave the direct Convex product paths
  operational, fix the fixed gateway/upstream/configuration, require a new
  login and repeat all smoke/manual evidence. A paid direct Convex custom domain
  remains a later simplification, not the current recovery dependency.

Production completion occurs only after the exact workflow SHA, expanded smoke, real Google/Safari lifecycle and operator evidence all pass.
