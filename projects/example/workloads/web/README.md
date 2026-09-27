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
- `VITE_BFF_SESSION_ADAPTER_URL`
- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`
- `VITE_BFF_AUTH_DIAGNOSTICS` (`true` only for the development example)

The development-only diagnostics panel classifies the session-adapter request
as healthy, signed out, missing its post-login cookie, browser-hidden
CORS/network failure or an unexpected HTTP error. It displays only public
origins and status metadata; it never reads or displays the HttpOnly cookie,
JWT, handoff code or personal data.

Run `pnpm exec nx run example-web:test`, `example-web:typecheck` and
`example-web:build` from the repository root. The development artifact is
published as the no-index `business-factory-example-dev` Worker at
`https://example-dev.tofler.app`; its public build values point to the separate
example Convex development deployment and the existing BFF development lane.
The narrow session gateway at `https://api.example-dev.tofler.app` forwards
only `/_tofler/auth/*` to Convex, so its Business-owned host receives the
opaque cookie without moving authentication logic into Cloudflare. Native
Convex and protected `/v1/*` calls remain direct.

Build with the four reviewed `VITE_*` values above, verify the output, then use
the repository configuration explicitly:

```sh
pnpm exec wrangler deploy --dry-run \
  --config projects/example/workloads/web/wrangler.jsonc
pnpm exec wrangler deploy \
  --config projects/example/workloads/web/wrangler.jsonc
```

Production uses the separate `wrangler.production.jsonc` manifest, Worker
`business-factory-example` and `https://example.tofler.app`. It must be built by
the repository-level `pnpm production:build` command so the bundle contains the
exact production BFF origin, `example-production` key and separate example
Convex deployment, with no development markers. That command also writes the
exact release SHA metadata required by production smoke. See
`docs/operations/build-2-customer-auth.md`; do not publish the production
manifest from the development output.
