# Development authenticated dashboard smoke

Updated: 2026-09-26.

Status: development verified 2026-09-26; source release pending.

This runbook gives Codex an on-demand authenticated check of the real hosted development backoffice. It does not automate Google, add a third deployment or enable any production identity.

## Fixed targets

- Convex project: `andrew-tofler/business-factory`
- Convex development deployment: `compassionate-buffalo-689`
- Cloudflare Worker: `business-factory-backoffice-dev`
- Dashboard: `https://ops-dev.tofler.tech/`
- Production exclusions: `exuberant-goldfinch-830`, `business-factory-backoffice` and `https://ops.tofler.tech/`

Before a provider mutation, confirm the selected Convex deployment and Wrangler account. Never use `--prod`, `wrangler.production.jsonc`, a GitHub secret or a production hostname in this procedure.

## 1. Generate or validate the local signer

```bash
pnpm development-auth:keygen
stat -c '%a %n' .convex/development-auth-private.jwk
git check-ignore .convex/development-auth-private.jwk
```

The permission output must be `600`. The command prints only whether the pair was created or already valid. It must never print the private JWK or a signed token.

## 2. Configure only Convex development

Confirm the existing deployment selection, then set the public values:

```bash
pnpm exec convex env set \
  --deployment compassionate-buffalo-689 \
  BFF_DEVELOPMENT_AUTOMATION_JWKS \
  --from-file .convex/development-auth-jwks.txt

pnpm exec convex env set \
  --deployment compassionate-buffalo-689 \
  BFF_DEVELOPMENT_AUTOMATION_AUDIENCE \
  'https://ops-dev.tofler.tech/'
```

The JWKS and audience are public verification configuration; only the local private JWK can mint tokens. Inspect names without printing values:

```bash
pnpm exec convex env list \
  --deployment compassionate-buffalo-689 \
  --names-only
pnpm exec convex env list --prod --names-only
```

Development and production both list the two names because Convex requires every
environment variable referenced by `auth.config.ts` to exist. Development holds
the real public verification configuration. Production holds the exact
non-secret value `disabled` for both names, which produces a Google-only auth
configuration.

## 3. Validate and publish development

Run the targeted tests, push the tested functions to the selected personal development deployment, then build and publish the explicit two-entry dashboard:

```bash
pnpm nx run bff-service:test-integration
pnpm nx run bff-backoffice-e2e:test
pnpm nx run bff-backoffice:build-development-auth
pnpm exec convex dev --once --tail-logs disable
pnpm exec wrangler deploy \
  --dry-run \
  --config platform/bff/backoffice/wrangler.jsonc
pnpm exec wrangler deploy \
  --config platform/bff/backoffice/wrangler.jsonc
```

The development build contains the ordinary Google page plus `index.development-auth.html`. The production workflow continues to invoke only the default single-entry build.

## 4. Run the authenticated hosted check

```bash
pnpm test:e2e:development-auth
```

Success means the live page used the short-lived signed automation identity, Convex accepted the exact issuer/audience/signature/expiry, the shared operator guard accepted the exact dedicated subject and the real read-only overview loaded. Registry data may be empty.

## Safety verification

- The normal `pnpm test:e2e` remains deterministic and offline.
- The private key remains ignored and mode `0600`.
- Hosted Playwright tracing, screenshots and video are disabled.
- The token appears only in the test process and page memory for at most two minutes.
- `pnpm bundle:assert` proves the ordinary production build contains no automation entry, marker, issuer, subject or development URL.
- Production sets both automation values to the exact non-secret sentinel
  `disabled`; the auth-config tests prove this emits only Google.

## Verification result — 2026-09-26

- Generated one ignored mode-`0600` ES256 private key and installed only its public JWKS plus the exact audience in `compassionate-buffalo-689`.
- The first source-release attempt showed that Convex treats every environment
  variable referenced by `auth.config.ts` as required. Production now sets both
  development-automation values to `disabled`; the fail-closed builder emits
  only Google for that exact pair and rejects mixed values.
- Convex accepted the custom provider configuration and published the tightened exact-issuer/subject operator guard.
- Cloudflare published the explicit two-entry development build as Worker version `ae486a9f-f839-4fef-85b2-814d7a627f94` at `ops-dev.tofler.tech`.
- The on-demand hosted Chromium check minted a fresh two-minute token and loaded the real protected read-only overview without a Google account or Andrew's participation.
- The complete local repository gate and production-bundle exclusion passed before provisioning. A final post-cleanup gate remains part of the source release review.

## Rotation

Delete the two ignored development-auth key files, rerun key generation, replace the development JWKS value and push the development auth configuration. The new public key immediately invalidates tokens signed by the old private key. A solo developer may install the same public key in another development deployment, but that deployment must use its own exact audience. Use separate keys when per-machine or per-developer revocation is needed.

## Rollback

Set both `BFF_DEVELOPMENT_AUTOMATION_JWKS` and
`BFF_DEVELOPMENT_AUTOMATION_AUDIENCE` to `disabled` on
`compassionate-buffalo-689`, push the Convex configuration, build the ordinary
`bff-backoffice:build` target and republish only
`business-factory-backoffice-dev`. The ignored private key may then be deleted
locally. Production already uses this disabled configuration and never trusts
the provider.
