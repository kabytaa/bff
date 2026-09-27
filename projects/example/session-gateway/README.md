# Example Business session gateway

This Cloudflare Worker is a deliberately narrow transport adapter for the
retained example's cookie-backed authentication routes. The browser uses
`api.example-dev.tofler.app` (or `api.example.tofler.app` in production), while
the Worker forwards only the fixed SDK route manifest to one configured Convex
`*.convex.site` origin:

- `GET /_tofler/auth/login`
- `GET /_tofler/auth/callback`
- `POST|OPTIONS /_tofler/auth/context`
- `POST|OPTIONS /_tofler/auth/logout`
- `POST|OPTIONS /_tofler/auth/transfer/start`

The gateway contains no authentication or session policy. Its application code
treats credentials as opaque bytes: it does not decode, validate, rewrite or
log the session cookie. Cloudflare terminates TLS and is therefore in the
credential transport trust path; “opaque” does not mean Cloudflare is
cryptographically unable to observe traffic. Convex and
`@tofler/bff-auth/server` remain responsible for login, callback exchange,
cookies, CSRF/CORS, renewal and logout. Product `/v1/*` and native Convex calls
continue directly to Convex; this Worker is not a general API proxy.
The generated Convex upstream remains publicly reachable, which is safe here
because the gateway is neither an authorization boundary nor a WAF: the SDK at
the origin still validates transaction binding, exact Origin, CSRF, session and
token state.
The only non-session route is the no-store deployment marker at
`/_tofler/session-gateway/health`.

Run the local project gates from the repository root:

```sh
pnpm exec nx run example-session-gateway:test
pnpm exec nx run example-session-gateway:typecheck
pnpm exec nx run example-session-gateway:build
```

Deploy development with the checked-in fixed public upstream:

```sh
pnpm exec wrangler deploy \
  --config projects/example/session-gateway/wrangler.jsonc
```

Production has no placeholder upstream in source. The reviewed release passes
the exact `EXAMPLE_CONVEX_SITE_URL` as `UPSTREAM_ORIGIN`:

```sh
pnpm exec wrangler deploy \
  --config projects/example/session-gateway/wrangler.production.jsonc \
  --var "UPSTREAM_ORIGIN:$EXAMPLE_CONVEX_SITE_URL" \
  --var "BUILD_VERSION:$GITHUB_SHA"
```
