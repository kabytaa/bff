# Customer authentication browser contract

This project exercises the real TypeScript browser and server SDKs against a local HTTPS harness. The harness creates an ephemeral self-signed certificate at runtime, keeps all provider/session state in memory and exposes no deployable fake-provider route.

Run it with:

```bash
pnpm exec nx run bff-customer-auth-e2e:e2e
```

Chromium uses `localhost` for the UI and `127.0.0.1` for the adapter to exercise the generated-domain cross-site cookie topology. Playwright WebKit uses `127.0.0.1` for both origins to cover the same callback, cookie, reload, renewal, multi-tab and logout contract without pretending to close the later real-Safari third-party-cookie acceptance gate. A third unregistered HTTPS origin proves browser CORS/CSRF denial.

The fake BFF implements only the explicit operations needed by this harness. Hosted development and production acceptance use deployed BFF/example functions and the protected development or real Google providers instead.
