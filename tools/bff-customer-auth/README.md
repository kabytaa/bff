# Customer development-auth tools

This project owns both customer-auth key preparation workflows. Context tokens
use a deployment-specific ES256 pair. Development automation uses a separate
customer-only local signer, which is also distinct from the operator/backoffice
signer. Private ES256 keys stay in ignored mode-`0600` files under `.convex/`;
only public JWKS values are exposed by BFF or configured for verification.

```sh
pnpm exec nx run bff-customer-auth-tools:generate-customer-signing-key
pnpm exec nx run bff-customer-auth-tools:generate-development-auth-key
pnpm exec nx run bff-customer-auth-tools:test
```

Key generation is idempotent and never rotates an existing valid pair. A real
rotation must be an explicit deployment operation so already-issued tokens and
consumer JWKS configuration can be handled deliberately.

Playwright imports `mintCustomerDevelopmentGrant` directly and keeps each
two-minute grant in memory. Grants bind the exact BFF deployment, Business
environment, browser transaction and requested capability. A public user ID
without a valid signed grant is never sufficient to sign in.
