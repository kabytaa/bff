# `@tofler/bff-auth`

The TypeScript implementation of the public Business authentication contract.

- `core`: runtime-neutral state and public contract helpers.
- `routes`: dependency-free fixed session-adapter route manifest.
- `browser`: tab-local session and account selection.
- `react`: React bindings and accessible authentication components.
- `server`: Web-standard `Request`/`Response` session adapter.
- `convex`: Convex HTTP and native-auth integration built on the same server
  contract.

Only the TypeScript/Convex path is currently supported. Future Node framework
glue belongs in this package; future Swift, Kotlin, Go, or Rust SDKs are sibling
technology implementations under `platform/bff/libs/sdk/`.

The server entry also exposes `createBffCheckoutClient`. A Business backend
passes its short account context plus a code-owned offer/grant/policy snapshot
and receives only a provider-neutral `checkoutUrl` and expiry. Checkout
creation additionally requires an environment-specific server credential so a
browser holding the ordinary account JWT cannot invent an entitlement payload;
the credential belongs only in the Business backend environment. The browser
then navigates to the returned URL. Build 3 returns the shared BFF mock page;
Build 4 can return Paddle without changing Business UI or the client method.
Redirecting never proves a real payment: provider access must ultimately come
from BFF's verified provider state.

## Server session adapter

`createBffAuthServer` is the portable Web `Request`/`Response` implementation.
It owns these exact routes on the Business adapter origin, which may be
cross-origin but should be same-site with the web application:

- `GET /_tofler/auth/login`
- `GET /_tofler/auth/callback`
- `POST|OPTIONS /_tofler/auth/context`
- `POST|OPTIONS /_tofler/auth/logout`
- `POST|OPTIONS /_tofler/auth/transfer/start`

The adapter stores only the opaque BFF session handle in a host-only
`Secure; HttpOnly; SameSite=None` cookie. It never creates a Business session
table. Browser JSON calls require an exact configured Origin, credentials,
`Content-Type: application/json` and `X-Tofler-CSRF: 1`.

Convex consumers call `mountConvexBffAuthRoutes` once. The SDK owns the route
table and action registration, while the Business supplies its public
environment key, BFF API origin and the same transport configuration registered
in BFF. Secrets and signing keys are not Business SDK configuration.

```ts
import { httpRouter } from 'convex/server';
import { mountConvexBffAuthRoutes } from '@tofler/bff-auth/convex/server';

const http = httpRouter();
mountConvexBffAuthRoutes(http, {
  bffBaseUrl: 'https://bff.example',
  environmentKey: 'cards-production',
  transport: {
    webOrigins: ['https://cards.example'],
    sessionAdapterBaseUrl: 'https://api.cards.example',
    defaultPostLoginPath: '/',
  },
});

export default http;
```

The adapter may be mounted directly on a generated Convex domain, a Convex
custom domain or behind a fixed same-site gateway. A gateway must remain opaque:
it forwards only these exact routes to one configured backend and never owns
cookie/session logic. Changing topology changes registered URLs, not this SDK
API.

## Browser and React bindings

Create one browser client per Business environment. It calls the registered
Business adapter origin with credentials and the BFF API with the short bearer
token. The token and active account remain in tab memory; optional local
storage contains only the last account ID and is always revalidated.

```ts
import { createBffAuthBrowserClient } from '@tofler/bff-auth/browser';

const auth = createBffAuthBrowserClient({
  environmentKey: 'cards-production',
  sessionAdapterBaseUrl: 'https://api.cards.example',
  bffBaseUrl: 'https://bff.example',
});
```

React applications place the client in `BffAuthProvider`, inspect the
discriminated session state through `useBffAuth`, and may use the minimal
accessible controls. Placement and styling remain application-owned.

```tsx
import {
  BffAccountSelector,
  BffAuthLink,
  BffAuthProvider,
  BffRequireAuth,
  BffSignOutButton,
} from '@tofler/bff-auth/react';

<BffAuthProvider client={auth}>
  <BffAuthLink intent="login">Log in</BffAuthLink>
  <BffAuthLink intent="signup">Sign up</BffAuthLink>
  <BffRequireAuth loadingFallback={<p>Checking session…</p>}>
    <ProtectedApplication />
  </BffRequireAuth>
  <BffAccountSelector />
  <BffSignOutButton />
</BffAuthProvider>;
```

`BffRequireAuth` waits for bootstrap before redirecting, preserves the full
same-app return path and marks the browser history entry so cancel/back does
not create a redirect loop. The intent controls central-page wording only;
provider selection and credential handling stay on the shared Tofler page.

Business defaults live in reviewed code, for example
`projects/example/customer-auth.defaults.ts`. They are composed at operator
preview/apply time with deployment URLs and stored as the effective BFF
snapshot. The SDK does not load that file at runtime.

The browser and React entries never import the server entry. New tabs obtain
their own context JWT; logout is broadcast across tabs, while account switches
remain tab-local.

`auth.renameAccount({ accountId, displayName })` renames the currently selected
workspace and refreshes its authoritative account summary. The shared BFF
requires live Owner membership in that account, rejects a different selected
account/environment and trims/limits names to 120 characters. This is a customer
workspace action, not a Business/operator configuration method.
The same-account refresh does not clear authentication or remount the app;
late responses cannot restore a context after switching accounts or signing out.

## Convex native authentication

Nest `BffConvexProvider` inside `BffAuthProvider`. It supplies the current
in-memory JWT to `ConvexProviderWithAuth`, honors Convex's forced refresh
requests, and remounts the auth boundary when the user or tab-local account
context changes. Routine renewal of the same context does not create a polling
loop or reset it.

```tsx
import { BffConvexProvider } from '@tofler/bff-auth/convex/client';

<BffAuthProvider client={auth}>
  <BffConvexProvider client={convex}>{children}</BffConvexProvider>
</BffAuthProvider>;
```

Each Business Convex deployment configures the exact BFF issuer, its own
environment audience and the public BFF JWKS endpoint:

```ts
// convex/auth.config.ts
import { createBffConvexAuthConfig } from '@tofler/bff-auth/convex/server';

export default createBffConvexAuthConfig({
  issuer: 'https://auth.example',
  environmentKey: 'cards-production',
  jwksUrl: 'https://bff-backend.example/v1/auth/jwks',
});
```

Convex verifies the JWT before functions receive an identity. Product
functions then use the account guard to validate BFF-specific claims and get a
typed account context. Browser-supplied user or account IDs must still be
matched with `requireBffConvexUserScope` or
`requireBffConvexAccountScope` before scoped data access.

```ts
export const currentContext = query({
  args: {},
  returns: contextValidator,
  handler: withBffAccountQuery(
    { issuer: 'https://auth.example', environmentKey: 'cards-production' },
    async (_ctx: QueryCtx, _args: Record<string, never>, auth) => ({
      userId: auth.userId,
      accountId: auth.accountId,
      role: auth.role,
    }),
  ),
});
```

Import `convex/client` only from React code and `convex/server` only from
Convex functions or auth configuration so React and server concerns remain in
separate bundles.

For a browser-called Convex HTTP action, pass the exact web origins and allowed
methods to `withBffAccountHttpAction`. The wrapper handles preflight and applies
the same CORS headers to success and recognized `401`/`403` responses, so each
Business does not duplicate security-sensitive CORS code.
