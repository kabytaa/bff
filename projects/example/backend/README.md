# Example Business backend

This is the retained Convex consumer of `@tofler/bff-auth`. Its native
functions trust only Convex-verified BFF context JWTs and then apply the SDK's
environment, account and permission guards.

Each deployment requires these public values before Convex code generation or
deployment:

- `BFF_CUSTOMER_AUTH_ISSUER`: the exact BFF customer-token issuer origin.
- `BFF_CUSTOMER_ENVIRONMENT_KEY`: the registered Business environment key.
- `BFF_CUSTOMER_JWKS_URL`: the exact public BFF JWKS endpoint; it may be on a
  different HTTP origin from the canonical issuer.
- `BFF_CUSTOMER_API_BASE_URL`: the exact BFF customer API origin.
- `BFF_CUSTOMER_WEB_ORIGINS_JSON`: the JSON array of exact allowed web origins.
- `BFF_CUSTOMER_SESSION_ADAPTER_BASE_URL`: the Business-owned public adapter
  origin. The retained example uses its narrow Cloudflare session gateway,
  which forwards the fixed auth routes to this Convex deployment.
- `BFF_CUSTOMER_DEFAULT_POST_LOGIN_PATH`: an application-relative destination.
- `EXAMPLE_BUILD_VERSION`: the full release SHA returned by `/v1/health` in
  production; development falls back to `development` when it is absent.

Run `pnpm exec nx run example-backend:test-integration` for the authorization
scenarios and `pnpm exec nx run example-backend:typecheck` for its generated
consumer boundary. The backend mounts the complete shared session adapter with
one `mountConvexBffAuthRoutes` call, exposes one SDK-guarded `/v1/context`
reference endpoint and one anonymous no-store `/v1/health` endpoint, and stores
no Business session table. The protected HTTP wrapper owns exact-origin
preflight and error CORS. The Business does not copy cookie, route-table or
auth-error logic and does not use the BFF service's generated API.

Run every Convex CLI command for this backend from
`projects/example/backend`. Its `convex.json`, generated API, project and deploy
key are deliberately separate from the repository-root BFF deployment. For a
development push:

```sh
cd projects/example/backend
pnpm exec convex dev --once --typecheck enable
```

Production uses a distinct example deployment and scoped
`EXAMPLE_CONVEX_DEPLOY_KEY`; the root `CONVEX_DEPLOY_KEY` must never be passed to
this working directory. See `docs/operations/build-2-customer-auth.md` for the
ordered release and environment configuration.
