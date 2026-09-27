# Example Business backend

This is the retained Convex consumer of `@tofler/bff-auth`. Its native
functions trust only Convex-verified BFF context JWTs and then apply the SDK's
environment, account and permission guards.

Each deployment requires two public values before Convex code generation or
deployment:

- `BFF_CUSTOMER_AUTH_ISSUER`: the exact BFF customer-token issuer origin.
- `BFF_CUSTOMER_ENVIRONMENT_KEY`: the registered Business environment key.
- `BFF_CUSTOMER_JWKS_URL`: the exact public BFF JWKS endpoint; it may be on a
  different HTTP origin from the canonical issuer.

Run `pnpm exec nx run example-backend:test-integration` for the authorization
scenarios and `pnpm exec nx run example-backend:typecheck` for its generated
consumer boundary. Deployment and browser wiring are added by the later
example-app slice; this project does not use the BFF service's generated API or
store a Business session table.
