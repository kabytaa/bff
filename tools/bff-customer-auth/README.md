# Customer development-auth tools

This project owns the customer-only local signer used by hosted development
automation. It is deliberately separate from the operator/backoffice signer.
The private ES256 key stays in an ignored mode-`0600` file under `.convex/`;
only the public JWKS is configured in the development BFF.

```sh
pnpm exec nx run bff-customer-auth-tools:generate-development-auth-key
pnpm exec nx run bff-customer-auth-tools:test
```

Playwright imports `mintCustomerDevelopmentGrant` directly and keeps each
two-minute grant in memory. Grants bind the exact BFF deployment, Business
environment, browser transaction and requested capability. A public user ID
without a valid signed grant is never sufficient to sign in.
