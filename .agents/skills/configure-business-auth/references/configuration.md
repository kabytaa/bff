# Customer authentication configuration

Use this reference when generating or explaining Business customer-auth settings.

## Shape

```json
{
  "version": 1,
  "enabledProviders": ["google"],
  "developmentAutomationEnabled": false,
  "transport": {
    "webOrigins": ["https://example.tofler.app"],
    "sessionAdapterBaseUrl": "https://api.example.tofler.app",
    "defaultPostLoginPath": "/"
  },
  "sessionPolicy": {
    "idleSeconds": 604800,
    "absoluteSeconds": 2592000
  },
  "accountPolicy": {
    "createAccountOnFirstSignIn": true,
    "userAccountCreationEnabled": false,
    "maxAccountMembershipsPerUser": 1,
    "maxOwnedAccountsPerUser": 1,
    "ownershipTransferEnabled": false
  },
  "accountDefaults": {
    "seatLimit": 1,
    "adminRoleEnabled": false,
    "memberInvitationsEnabled": false
  }
}
```

## Transport rules

- `webOrigins` contains exact canonical HTTPS UI origins. No wildcard, path, query, fragment, credentials, or trailing slash.
- `sessionAdapterBaseUrl` is one exact canonical HTTPS origin for the Business server SDK. The SDK derives `/_tofler/auth/callback`; the callback is not another setting.
- `defaultPostLoginPath` is a same-app relative path beginning with one `/`. Reject protocol-relative and external destinations.
- Development and production are separate registered environments with separate origins.
- The shared auth origin and public Google client ID are platform configuration, not Business settings.

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
