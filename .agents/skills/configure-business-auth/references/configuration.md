# Customer authentication configuration

Use this reference when generating or explaining Business customer-auth settings.

## Shape

Business code defines deployment-invariant defaults:

```ts
export default defineCustomerAuthDefaults({
  definitionRevision: 1,
  enabledProviders: ['google'],
  presentation: {
    productName: 'Example',
    theme: 'system',
    accentColor: '#314EC6',
  },
  defaultPostLoginPath: '/',
  sessionPolicy: { idleSeconds: 604800, absoluteSeconds: 2592000 },
  accountPolicy: {
    createAccountOnFirstSignIn: true,
    userAccountCreationEnabled: false,
    maxAccountMembershipsPerUser: 1,
    maxOwnedAccountsPerUser: 1,
    ownershipTransferEnabled: false,
  },
  accountDefaults: {
    seatLimit: 1,
    adminRoleEnabled: false,
    memberInvitationsEnabled: false,
  },
});
```

Each deployment supplies only environment-specific registration:

```json
{
  "developmentAutomationEnabled": false,
  "webOrigins": ["https://example.tofler.app"],
  "sessionAdapterBaseUrl": "https://api.example.tofler.app"
}
```

The CLI composes these into the version-2 effective snapshot that BFF stores and enforces. Legacy version-1 snapshots remain readable only during migration.

## Migrating populated environments

Before migrating a version-1 environment, inspect its effective configuration
and populated customer/account state, then preview the exact code-owned
defaults plus lane registration. Do not assume matching URLs make the policies
compatible.

A conflict is evidence that current state or intentional test behavior differs
from the reviewed Business definition. Do not bypass preflight, delete fixture
data, leave version 1 as the permanent answer or weaken production-like
defaults merely to make migration pass. Resolve whether the Business defaults
should genuinely change or whether the divergent fixtures belong to a separate
test Business definition/environment, then generate a fresh preview. Legacy
version-1 reads exist only to keep the service operational during that explicit
decision and migration.

## Transport rules

- `webOrigins` contains exact canonical HTTPS UI origins. No wildcard, path, query, fragment, credentials, or trailing slash.
- `sessionAdapterBaseUrl` is one exact canonical HTTPS origin for the Business server SDK. The SDK derives `/_tofler/auth/callback`; the callback is not another setting.
- `defaultPostLoginPath` is code-owned and is a same-app relative path beginning with one `/`. Reject protocol-relative and external destinations.
- Development and production are separate registered environments with separate origins.
- The shared auth origin and public Google client ID are platform configuration, not Business settings.
- Presentation is intentionally bounded: product name, theme and accent only. Never accept arbitrary CSS/HTML or an unvalidated remote logo URL.

## Limits and defaults

- Providers: Google only in the current MVP.
- `developmentAutomationEnabled`: false except an explicitly protected development Business.
- Idle session: 900–2,592,000 seconds; default 604,800 (7 days).
- Absolute session: 3,600–15,552,000 seconds; default 2,592,000 (30 days). Idle must not exceed absolute.
- Membership and ownership limits are positive integers; owned accounts cannot exceed total memberships.
- `seatLimit` is positive and counts active memberships plus reserved invitation seats.
- Admin is the fixed limited Admin role. Admins manage Members and invitations, never the Owner, other Admins, or ownership transfer.
- Ownership transfer is off by default and, when enabled, uses fresh provider-neutral reauthentication.

## Common scenarios

### One workspace with an upgrade path

Use the default configuration. First login creates one stable account. The account may later gain seats/features without changing identity or account ID. The user cannot create extra accounts.

### Create or join an organization during onboarding

Set `createAccountOnFirstSignIn` to false and `userAccountCreationEnabled` to true. Login succeeds into `onboarding_required`; the user creates the correct account or accepts an invitation. Keep both caps at one unless the product supports multiple memberships.

### Personal start plus team/client memberships

Keep automatic first-account creation on. Enable user account creation only if users may create additional accounts. Raise `maxAccountMembershipsPerUser` above one for joining other accounts and raise `maxOwnedAccountsPerUser` only when users may own more than one.

### Operator-managed onboarding

Disable automatic and user account creation. Users may sign in but remain in onboarding until an operator provisions an account or they accept an enabled invitation.

All four combinations of the two creation switches are valid. Invitations are governed by the effective account policy, independently of account creation.
