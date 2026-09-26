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
pnpm test:e2e:development-auth
```

The first command creates one local ES256 pair under the ignored `.convex/` directory. The private JWK is mode `0600`; the public JWKS is a data URI intended for the approved Convex development deployment. Generation is idempotent when both files remain valid and matching. It never overwrites or prints key material.

The hosted command mints a fresh two-minute token for `https://ops-dev.tofler.tech/`, injects it before the development-only page starts, and verifies the real protected overview. It uses no Google account and stores no token in a URL, cookie, browser storage, trace, screenshot or checked-in auth state. It is intentionally on demand and is not part of `pnpm check` or GitHub Actions.

The hosted command works only after following [the development authenticated smoke runbook](../../../docs/operations/development-authenticated-smoke.md). The normal development page remains Google-authenticated. Production has neither this page nor the custom provider.

## Rotation and removal

Remove both ignored local key files, generate a new pair, update the named development deployment's public JWKS and push its auth configuration. Old tokens and the old private key immediately stop working after the provider update. To remove automation entirely, delete both development environment variables and republish development with the ordinary dashboard build.
