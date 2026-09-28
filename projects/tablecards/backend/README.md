# TableCards backend

This is the independent Convex backend for the TableCards Business. It stores
only TableCards product records and public BFF user/account identifiers. BFF
remains authoritative for sessions, memberships, effective offers and typed
unit balances.

Required public deployment values mirror the retained Example Business:

- `BFF_CUSTOMER_AUTH_ISSUER`
- `BFF_CUSTOMER_ENVIRONMENT_KEY` (`tablecards-development` in development)
- `BFF_CUSTOMER_JWKS_URL`
- `BFF_CUSTOMER_API_BASE_URL`
- `BFF_CUSTOMER_WEB_ORIGINS_JSON`
- `BFF_CUSTOMER_SESSION_ADAPTER_BASE_URL`
- `BFF_CUSTOMER_DEFAULT_POST_LOGIN_PATH`
- `TABLECARDS_BUILD_VERSION`

`TABLECARDS_DEVELOPMENT_MOCKS_ENABLED=true` is allowed only in the development
deployment and enables deterministic commerce/image fixtures. Production must
omit it. `OPENAI_API_KEY` is optional and is never required for development or
CI.

Run Convex commands from this directory so they cannot target the BFF or the
retained Example deployment:

```sh
pnpm exec convex dev --once --typecheck enable
```

The integration suite is `pnpm exec nx run tablecards-backend:test-integration`.
