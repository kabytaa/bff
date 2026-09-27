# Customer authentication web surface

This static application owns the shared customer-facing Google sign-in page.
Business applications start a browser-bound login through the server SDK and
redirect here with only an environment key and opaque transaction reference.
This page loads the one-time BFF challenge, binds Google Identity Services to
its nonce, gives Google's credential directly to the BFF and navigates to the
registered HTTPS Business callback returned by the BFF.

It never receives a Google client secret, durable Business session handle or
Business access token. Production uses the reviewed public customer client ID
from `@bff/static-config`; the operator client and allowlist are not bundled.

## Local commands

Set `VITE_BFF_SITE_URL` to the exact HTTPS Convex site origin for the intended
lane, then run:

```sh
pnpm exec nx run bff-customer-auth:serve
pnpm exec nx run bff-customer-auth:test
pnpm exec nx run bff-customer-auth:build
pnpm exec nx run bff-customer-auth:assert-production-bundle
```

`build-development` writes a separate artifact for `auth-dev.tofler.app`.
Development automation is a distinct entry added by the protected automation
slice; it must never enter the production artifact.
