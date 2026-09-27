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
`example-web:build` from the repository root. The development artifact is
published as the no-index `business-factory-example-dev` Worker at
`https://example-dev.tofler.app`; its public build values point to the separate
example Convex development deployment and the existing BFF development lane.
The generated `*.convex.site` origin—not Cloudflare—owns the session cookie.

Build with the four reviewed `VITE_*` values above, verify the output, then use
the repository configuration explicitly:

```sh
pnpm exec wrangler deploy --dry-run \
  --config projects/example/workloads/web/wrangler.jsonc
pnpm exec wrangler deploy \
  --config projects/example/workloads/web/wrangler.jsonc
```

Production hosting is deliberately separate and is added only by the
multi-surface production-delivery slice.
