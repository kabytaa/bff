# Production delivery tool

This Nx tool validates the production target, builds the backoffice for that exact Convex deployment and smoke-checks the live release. It is intentionally separate from the interactive development deployment.

## Commands

```bash
pnpm production:build
pnpm production:smoke
pnpm nx run production-delivery:test
```

`production:build` is normally invoked by `convex deploy --cmd`, which supplies `VITE_CONVEX_URL`. It refuses to build unless that URL matches `EXPECTED_CONVEX_URL` and the remaining public values identify the production lane.

`production:smoke` makes anonymous requests only. It verifies the BFF health contract and exact commit, dashboard security headers and the Convex client URL embedded in the published JavaScript. It never uses a Google operator token or provider deployment credential.

## Public inputs

| Name                   | Used by      | Purpose                                                         |
| ---------------------- | ------------ | --------------------------------------------------------------- |
| `BACKOFFICE_URL`       | build, smoke | Must be `https://ops.tofler.tech`                               |
| `CONVEX_SITE_URL`      | build, smoke | Production HTTP-action origin                                   |
| `EXPECTED_CONVEX_URL`  | build, smoke | Independently configured production client origin               |
| `GITHUB_SHA`           | build, smoke | Full 40-character commit expected in health                     |
| `VITE_CONVEX_URL`      | build        | Convex-injected client origin; must equal `EXPECTED_CONVEX_URL` |
| `VITE_CONVEX_SITE_URL` | build        | Vite public HTTP-action origin; must equal `CONVEX_SITE_URL`    |

Deployment secrets stay in the GitHub `production` environment and are not inputs to this tool. See `docs/operations/production-delivery.md` for setup, deployment order and recovery after a partial release.
