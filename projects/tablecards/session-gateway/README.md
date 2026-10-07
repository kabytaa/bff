# TableCards session gateway

This Cloudflare Worker exposes only the fixed customer-auth session-adapter
routes on `api.tablecards-dev.tofler.app` and the separate production
`api.tablecards.tofler.app`. It forwards them opaquely to the
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
check. Production uses `wrangler.production.jsonc`, its own Worker, and the
`clean-gerbil-451.convex.site` upstream. Main CI supplies the exact release SHA;
the deployment guard and [Operations](../docs/operations.md#production-release-and-recovery)
keep the development and production lanes separate. This gateway never handles
checkout or grants access; shared BFF owns the no-charge preview checkout.
