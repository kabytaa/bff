# Example Business web app

This is the smallest retained customer application for `@tofler/bff-auth`. It
shows signed-out, onboarding, account-selection and authenticated states, then
proves one memory-only context token against:

- a native Convex query;
- the Business backend's protected HTTP endpoint; and
- the shared BFF `/v1/me` endpoint.

It deliberately contains no account-management playground or custom cookie,
token or login implementation. Configure these public build values:

- `VITE_BFF_CUSTOMER_API_URL`
- `VITE_BFF_CUSTOMER_ENVIRONMENT_KEY`
- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`

Run `pnpm exec nx run example-web:test`, `example-web:typecheck` and
`example-web:build` from the repository root. Hosted values and deployment are
owned by the later hosted-development and production-delivery slices.
