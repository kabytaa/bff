# TableCards session gateway

This Cloudflare Worker exposes only the fixed customer-auth session-adapter
routes on `api.tablecards-dev.tofler.app`. It forwards them opaquely to the
TableCards Convex HTTP deployment so the browser's protected session cookie is
same-site. Product queries, mutations, uploads, and downloads never pass
through this Worker.

`UPSTREAM_ORIGIN` must be the exact `https://*.convex.site` origin. The Worker
rejects every non-auth route and follows no upstream redirects. Deploy with:

```bash
pnpm exec wrangler deploy \
  --config projects/tablecards/session-gateway/wrangler.jsonc \
  --var UPSTREAM_ORIGIN:https://YOUR-DEPLOYMENT.convex.site \
  --var BUILD_VERSION:YOUR-VERSION
```

Use `/_tofler/session-gateway/health` for an uncached, credential-free version
check. No production manifest exists in Build 3; the development gateway must
not be reused as a production mock-commerce surface.
