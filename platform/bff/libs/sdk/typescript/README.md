# `@tofler/bff-auth`

The TypeScript implementation of the public Business authentication contract.

- `core`: runtime-neutral state and public contract helpers.
- `browser`: tab-local session and account selection.
- `react`: React bindings and accessible authentication components.
- `server`: Web-standard `Request`/`Response` session adapter.
- `convex`: Convex HTTP and native-auth integration built on the same server
  contract.

Only the TypeScript/Convex path is currently supported. Future Node framework
glue belongs in this package; future Swift, Kotlin, Go, or Rust SDKs are sibling
technology implementations under `platform/bff/libs/sdk/`.

## Server session adapter

`createBffAuthServer` is the portable Web `Request`/`Response` implementation.
It owns these exact same-origin routes on the Business backend:

- `GET /_tofler/auth/login`
- `GET /_tofler/auth/callback`
- `POST|OPTIONS /_tofler/auth/context`
- `POST|OPTIONS /_tofler/auth/logout`
- `POST|OPTIONS /_tofler/auth/transfer/start`

The adapter stores only the opaque BFF session handle in a host-only
`Secure; HttpOnly; SameSite=None` cookie. It never creates a Business session
table. Browser JSON calls require an exact configured Origin, credentials,
`Content-Type: application/json` and `X-Tofler-CSRF: 1`.

Convex consumers create one action with `createConvexBffAuthHttpAction` and
register that action at every route above in their own `convex/http.ts`. The
Business supplies its public environment key, the BFF origin and the same
transport configuration registered in BFF. Secrets and signing keys are not
Business SDK configuration.

```ts
import { createConvexBffAuthHttpAction } from '@tofler/bff-auth/convex';

const auth = createConvexBffAuthHttpAction({
  bffBaseUrl: 'https://bff.example',
  environmentKey: 'cards-production',
  transport: {
    webOrigins: ['https://cards.example'],
    sessionAdapterBaseUrl: 'https://cards-backend.convex.site',
    defaultPostLoginPath: '/',
  },
});
```

The generated Convex domain remains the first supported deployment topology.
A later custom domain changes registered transport URLs, not this SDK API.

## Browser and React bindings

Create one browser client per Business environment. It calls the same-origin
session adapter with credentials and the registered BFF API with the short
bearer token. The token and active account remain in tab memory; optional local
storage contains only the last account ID and is always revalidated.

```ts
import { createBffAuthBrowserClient } from '@tofler/bff-auth/browser';

const auth = createBffAuthBrowserClient({
  environmentKey: 'cards-production',
  sessionAdapterBaseUrl: 'https://cards-backend.convex.site',
  bffBaseUrl: 'https://bff.example',
});
```

React applications place the client in `BffAuthProvider`, inspect the
discriminated session state through `useBffAuth`, and may use the minimal
accessible controls. Placement and styling remain application-owned.

```tsx
import {
  BffAccountSelector,
  BffAuthProvider,
  BffSignInButton,
  BffSignOutButton,
} from '@tofler/bff-auth/react';

<BffAuthProvider client={auth}>
  <BffSignInButton>Continue with Google</BffSignInButton>
  <BffAccountSelector />
  <BffSignOutButton />
</BffAuthProvider>;
```

The browser and React entries never import the server entry. New tabs obtain
their own context JWT; logout is broadcast across tabs, while account switches
remain tab-local.
