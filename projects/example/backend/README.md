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
- `BFF_CUSTOMER_SESSION_ADAPTER_BASE_URL`: this deployment's exact Convex site
  origin, which owns the host-only session cookie.
- `BFF_CUSTOMER_DEFAULT_POST_LOGIN_PATH`: an application-relative destination.

Run `pnpm exec nx run example-backend:test-integration` for the authorization
scenarios and `pnpm exec nx run example-backend:typecheck` for its generated
consumer boundary. The backend mounts the shared session adapter at
`/_tofler/auth/*`, exposes one protected `/v1/context` reference endpoint and
stores no Business session table. It does not use the BFF service's generated
API.
