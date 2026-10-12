# Backoffice browser tests

This Nx project owns two deliberately separate browser-test paths.

## Deterministic dashboard regression

```bash
pnpm test:e2e
```

This starts the local fixture entry and runs desktop and phone Chromium checks. It has no provider account, network authentication or reusable credential, and it remains part of `pnpm check` and CI.

## Hosted development authentication

```bash
pnpm development-auth:keygen
BFF_EVENT_SMOKE_CUSTOMER_ID=<synthetic-public-customer-id> pnpm test:e2e:development-auth
```

The first command creates one local ES256 pair under the ignored `.convex/` directory. The private JWK is mode `0600`; the public JWKS is a data URI intended for the approved Convex development deployment. Generation is idempotent when both files remain valid and matching. It never overwrites or prints key material.

The hosted command mints a fresh two-minute token for `https://ops-dev.tofler.tech/`, injects it before the development-only page starts, and verifies the real protected overview, configured Business KPI counters/trends, populated customer events and scoped history/back navigation, an honest empty event state, enlarged text, exact synthetic reply approval and private notes on desktop/phone. It requires a populated development seed and labelled mock mail; it does not send real email. Select an existing synthetic `@example.invalid` customer with actual reported product events using `BFF_EVENT_SMOKE_CUSTOMER_ID`; this public identifier is not a credential. The event test compares rendered labels/properties/references with the protected customer query rather than inserting a UI-only fixture. It uses no Google account and stores no token in a URL, cookie, browser storage, trace, screenshot or checked-in auth state. It is intentionally on demand and is not part of `pnpm check` or GitHub Actions.

The hosted command works only after following [the development authenticated smoke runbook](../../../docs/operations/development-authenticated-smoke.md). The normal development page remains Google-authenticated. Production has neither this page nor the custom provider.

`src/mintDevelopmentAuthToken.ts` exposes the same tested two-minute signer to
trusted cross-project browser automation through a subprocess, without importing
another test project's implementation. It accepts one canonical HTTPS audience.
Callers must capture stdout privately and inject the token in memory; never
display it, write it into a report or save browser authentication state. This
uses the existing ignored signer, not a newly generated or production credential.

For bounded visual inspection, `BFF_EVENT_VISUAL_REVIEW=true` captures only the
KPI panel and verified synthetic customer's events under ignored
`.playwright-cli/`. It does not enable authentication traces or storage-state
exports; never select a real customer's identifier for this capture.

## Rotation and removal

Remove both ignored local key files, generate a new pair, update the named development deployment's public JWKS and push its auth configuration. Old tokens and the old private key immediately stop working after the provider update. To remove automation entirely, delete both development environment variables and republish development with the ordinary dashboard build.
