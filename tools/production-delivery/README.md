# Production delivery tool

This Nx tool validates the complete production topology, builds all three static
surfaces plus the narrow example session gateway for their exact BFF/example
Convex deployments and smoke-checks the live release. It is intentionally
separate from interactive development.

## Commands

```bash
pnpm production:build
pnpm production:smoke
pnpm nx run production-delivery:test
```

`production:build` runs once as a no-mutation preflight and again through the
BFF `convex deploy --cmd` hook. The hook supplies `BFF_DEPLOY_CONVEX_URL`. The
tool refuses to build unless it matches `EXPECTED_CONVEX_URL`, the BFF/example
Convex pairs are internally consistent and separate, and every remaining public
value identifies the fixed production lane. It builds and audits backoffice,
customer auth and the retained example before adding exact-SHA metadata.

`production:smoke` makes anonymous requests only. It verifies both backend
health contracts and exact commit, public-only JWKS, absence of the development
provider route, unauthenticated product and gateway denial, security headers,
asset metadata and the exact targets embedded in every published JavaScript
bundle. It never uses a Google token, session cookie or provider deployment
credential.

## Public inputs

| Name                           | Used by      | Purpose                                                             |
| ------------------------------ | ------------ | ------------------------------------------------------------------- |
| `BACKOFFICE_URL`               | build, smoke | Must be `https://ops.tofler.tech`                                   |
| `CUSTOMER_AUTH_URL`            | build, smoke | Must be `https://auth.tofler.app`                                   |
| `EXAMPLE_WEB_URL`              | build, smoke | Must be `https://example.tofler.app`                                |
| `EXAMPLE_SESSION_ADAPTER_URL`  | build, smoke | Must be `https://api.example.tofler.app`                            |
| `BFF_CUSTOMER_ENVIRONMENT_KEY` | build, smoke | Must be `example-production`                                        |
| `CONVEX_SITE_URL`              | build, smoke | BFF production HTTP-action origin                                   |
| `EXPECTED_CONVEX_URL`          | build, smoke | BFF production client origin                                        |
| `BFF_DEPLOY_CONVEX_URL`        | build        | Convex-injected BFF client origin; must equal `EXPECTED_CONVEX_URL` |
| `EXAMPLE_CONVEX_SITE_URL`      | build, smoke | Separate example production HTTP-action origin                      |
| `EXAMPLE_SESSION_ADAPTER_URL`  | build, smoke | Fixed `https://api.example.tofler.app` session gateway              |
| `EXPECTED_EXAMPLE_CONVEX_URL`  | build, smoke | Matching separate example production client origin                  |
| `GITHUB_SHA`                   | build, smoke | Full 40-character commit expected everywhere                        |

Deployment secrets stay in the GitHub `production` environment and are not
inputs to this tool. See `docs/operations/build-2-customer-auth.md` for the
multi-surface setup, key handling, deployment order, smoke contract and partial
release recovery.
