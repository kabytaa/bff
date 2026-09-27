---
name: configure-business-auth
description: Configure or revise one BFF Business environment's customer authentication, session, and account policies through guided product questions, conflict-safe preview, and the validated operator CLI. Use when registering customer web and session-adapter URLs or changing Business auth/account behavior; do not use for provider credentials, product authorization schemas, or billing plans.
---

# Configure Business Auth

Translate the Business's intended product behavior into one exact customer-auth configuration. Keep the conversation about user-visible behavior rather than field names.

Before proposing configuration, read [references/configuration.md](references/configuration.md). Read `STATUS.md` and its active Build plan when working inside this repository.

## Guide the decision

Ask one short question at a time. Reuse answers already supplied; do not make the user repeat them. Resolve these areas:

1. Target Business environment and deployment lane.
2. Exact customer web origins, session-adapter base URL, and relative destination after login.
3. Whether the development-only automation provider is enabled. Never enable it outside development.
4. What happens on first sign-in and whether ordinary users may create more accounts.
5. Maximum total memberships and owned accounts per user.
6. Default seats, Admin role, invitations, and ownership transfer.
7. Idle and absolute session lifetimes.

Recommend the documented defaults unless the product behavior requires otherwise. Explain interacting choices: an automatically created account consumes one total membership and one owned-account slot; joining another account therefore needs a total-membership cap above one.

Do not invent personal/team account kinds. Accounts are stable billing/collaboration containers; plan labels and product-data ownership are Business concerns. Do not add billing plans or product entitlements during this workflow.

## Produce and preview

Build strict version-1 JSON with no credentials. Show the complete JSON and a plain-language summary before any apply operation.

Run the validated CLI preview against the selected deployment:

```bash
pnpm bff:environment -- preview-customer-auth \
  --deployment <deployment> \
  --key <environment-key> \
  --configuration-json '<exact-json>' \
  [--confirm-cloud] \
  [--confirm-production <exact-production-reference>]
```

Report the preflight ID, configuration revision, account-policy revision, expiry, and every conflict. A conflict is a stop condition: explain what current user/account state prevents the change and do not apply it.

## Apply only after confirmation

Preview does not authorize apply. Ask for explicit confirmation after showing the exact compatible configuration and target deployment. Then use only the returned preflight and revisions:

```bash
pnpm bff:environment -- configure-customer-auth \
  --deployment <deployment> \
  --key <environment-key> \
  --expected-revision <configuration-revision> \
  --expected-account-policy-revision <account-policy-revision> \
  --preflight-id <preflight-id> \
  --configuration-json '<same-exact-json>' \
  [--confirm-cloud] \
  [--confirm-production <exact-production-reference>]
```

Never bypass a stale/consumed preflight, change JSON between preview and apply, or edit Convex documents directly. If state changed, preview again and request confirmation for the new result. Never print secrets or private identity/credential hashes.

After apply, inspect the environment and summarize the effective public URLs and policy. Do not claim production completion until the intended deployment and smoke evidence pass.
