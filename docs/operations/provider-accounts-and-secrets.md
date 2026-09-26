# Provider accounts, access and secrets

Updated: 2026-09-26.

This is the manual handoff for [ADR 0001 — Convex-first BFF stack](../architecture/adr/0001-convex-first-bff-stack.md). It records which accounts are needed, when they are needed and how access should be supplied. It must never contain credential values.

## Immediate answer

No new token is needed to implement or deterministically test Build 1 locally. The workspace, contracts, Convex schema/functions, operator authorization, dashboard and browser flow use the repository's local Convex deployment plus mocked identities. Better Auth is not part of Build 1. Production CI/CD additionally needs one Convex production deploy key and the shared Tofler Cloudflare CI token stored in the GitHub `production` environment.

The machine has an authenticated Convex CLI user token. Do not copy that token or reuse the unrelated Podcat deployment. Build 1 uses the separate `andrew-tofler/business-factory` project; its personal development deployment is live and verified, while the default production deployment remains empty pending the CI/CD rollout.

Wrangler is interactively authenticated to Andrew's Cloudflare account with the narrow development authorization used for `ops-dev.tofler.tech`. That OAuth session is not a CI credential. GitHub production deployment requires a separate scoped API token entered directly into the GitHub environment.

Do not paste provider secrets into chat. Use a local ignored `.env.local`, the provider's environment-variable store, or GitHub Actions secrets as appropriate.

## Blocker-first setup

For the current TableCards direction, the known external setup tracks for the first public paid launch are:

1. **Paddle seller verification:** Start or continue the seller account, identity/business verification and payout setup now. Sandbox work can proceed without production approval. Final [Paddle domain review](https://www.paddle.com/help/start/account-verification/what-is-domain-verification) waits for the real HTTPS product site with a clear description, pricing, terms, refund policy and privacy policy; Paddle says manual review is typically 5–7 business days but does not guarantee that timing.
2. **Owned domain and Cloudflare access:** Choose or confirm the launch domain and make sure Andrew controls it. This unlocks the public product, Paddle domain review and Google production branding/domain verification. Codex needs scoped Cloudflare access only when DNS or deployment begins.
3. **Google production OAuth:** Development can use a test project and test users. Once the product name, domain and callback URL are stable, configure the production Google Cloud project, consent branding, verified domain, homepage and privacy policy, then provide the client credentials through the secret store. Keep scopes to basic identity; sensitive or restricted Google API scopes are not part of the MVP.

Convex is not an external-account blocker based on the recorded local CLI authentication; recheck access when creating the separate BFF project. TableCards' proposed PDF generation uses a code library, so no AI token, scanner/browser service, printing integration or transactional-email account is needed for its initial scope. PDF/runtime compatibility and physical print quality still require implementation verification.

Do not register Clerk, Apple Developer, PostHog, Resend, Sentry or a helpdesk for the initial web MVP. None is a launch blocker under the current scope. The remaining human inputs are a monitored support email and review of the public product/policy wording.

## Account checklist

| Provider | Current evidence | Registration/action | Needed when |
| --- | --- | --- | --- |
| Convex | CLI is authenticated; `andrew-tofler/business-factory` development is live and production is empty | Create a production-scoped CI deploy key named `bff-github-production`; never reuse the personal CLI token | Production CI/CD |
| Google Cloud OAuth | One shared backoffice web client exists with exact development and production origins | No additional Build 1 credential; Business-user clients wait for their owning build | Complete for Build 1 |
| Apple Developer | Not confirmed and conditional | Do not register/configure yet; provide access and create Sign in with Apple credentials only when an iOS/App Store or product requirement activates it | Conditional Apple login |
| Cloudflare | Interactive Wrangler access is connected; `ops-dev.tofler.tech` is live; both Tofler zones are owned in Cloudflare | Create shared `tofler-github-ci` with Workers Scripts Edit and Workers Routes Edit for both Tofler zones | Production and future Tofler CI/CD |
| Paddle | Seller status not verified here | Continue seller onboarding; create sandbox credentials first, live credentials after approval | Billing implementation and launch |
| PostHog | Not confirmed and optional | Do not register yet; create a project only if the first product outgrows canonical BFF events | High-volume product analytics/funnels |
| Resend | Not confirmed and optional | Do not register yet; Google/Apple social login needs no authentication email | First separate transactional email flow |
| Support mailbox | Existing address may be used | Confirm one monitored public address; a branded mailbox can wait | Before first public launch |
| Sentry | Not confirmed and optional | Defer until Convex logs are insufficient | After observed monitoring need |
| GitHub | Repository, Actions validation and authenticated CLI access exist | Create the `production` environment, branch restriction, public variables and two environment secrets | Production CI/CD |

## Credential inventory

Names below are the intended configuration contract. Credentials and deployment-specific values remain outside git; explicitly identified public, deployment-invariant identifiers are reviewed in `@bff/static-config`.

### Convex

| Name | Exposure | Purpose |
| --- | --- | --- |
| `CONVEX_DEPLOYMENT` | Local configuration, not an authentication secret | Selects the development deployment |
| `VITE_CONVEX_URL` | Public frontend configuration | Convex client endpoint |
| `VITE_CONVEX_SITE_URL` | Public frontend configuration | Convex HTTP/auth endpoint |
| `CONVEX_SITE_URL` | Public configuration | HTTP action/webhook base URL |
| `CONVEX_DEPLOY_KEY` | Secret, CI only | Non-interactive production or preview deployment |

GitHub production also stores the public expected `CONVEX_URL` and `CONVEX_SITE_URL` as environment variables so the build and smoke checks can reject a key/target mismatch.

Interactive local development uses the existing CLI login; it does not need `CONVEX_DEPLOY_KEY`. Generate a deploy key scoped only to the BFF production deployment for GitHub Actions. See [Convex deploy keys](https://docs.convex.dev/cli/deploy-key-types).

### Build 1 operator Google OIDC

The hosted backoffice uses Google Identity Services popup mode and passes the short-lived ID token to Convex for verification. It needs a public web client ID and exact authorized JavaScript origins; it does not need a Google client secret or callback URL.

| Name | Exposure | Purpose |
| --- | --- | --- |
| `BACKOFFICE_GOOGLE_CLIENT_ID` | Public, code-owned identifier in `@bff/static-config` | Initializes Google Identity Services and restricts the accepted token audience |
| `BACKOFFICE_OPERATOR_EMAILS` | Code-owned identity allowlist in `@bff/static-config` | Authorizes the fixed backoffice operators after verified Google authentication |

Authorize the exact localhost and Cloudflare origins. Request only basic identity. The browser keeps the ID token in memory and the production bundle must not contain the operator allowlist. Production OAuth branding/domain requirements wait for production. See [Google Identity setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) and [Google OAuth policies](https://developers.google.com/identity/protocols/oauth2/policies).

Do not add Apple credential names or placeholders until Apple login is activated. At that point configure the Apple Service ID/app capability, Team ID, Key ID and private key in the relevant deployment's secret store; never commit the private key. Apple login uses the same BFF auth adapter, so enabling it must not change BFF user/account IDs or public session contracts.

### Paddle

Create separate sandbox and live values.

| Name | Exposure | Purpose |
| --- | --- | --- |
| `VITE_PADDLE_CLIENT_TOKEN` | Public | Initializes Paddle.js checkout |
| `PADDLE_API_KEY` | Secret, Convex environment | Server-side Paddle API calls |
| `PADDLE_WEBHOOK_SECRET_KEY` | Secret, Convex environment | Verifies Paddle notifications |
| `PADDLE_ENVIRONMENT` | Public configuration | Selects sandbox or production |

Use a least-privilege, expiring, rotatable Paddle API key. Never use an API key in frontend code. The client-side token is the only Paddle credential intended for frontend exposure.

### PostHog, only when needed

| Name | Exposure | Purpose |
| --- | --- | --- |
| `VITE_POSTHOG_KEY` | Public | Sends product analytics events |
| `VITE_POSTHOG_HOST` | Public | Selects the PostHog region/host |
| `POSTHOG_PERSONAL_API_KEY` | Secret, provisioning only | Optional automation; not required by the product runtime |

Revenue and entitlement truth remains in BFF. PostHog is not the payment ledger and no PostHog credential is required for the first backend/auth/support/billing slices.

### Cloudflare

Local interactive setup can use Wrangler OAuth. CI should use a narrowly scoped API token rather than the legacy global API key.

| Name | Exposure | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Secret, CI only | Deploys the selected Worker/static-assets project and, only if allowed, updates DNS |
| `CLOUDFLARE_ACCOUNT_ID` | Configuration | Selects the account |
| `CLOUDFLARE_ZONE_ID` | Configuration | Selects the DNS zone when DNS automation is enabled |

Use separate deployment and DNS tokens if practical. Restrict them to the selected account/zone and only required permissions. See [Cloudflare API authentication](https://developers.cloudflare.com/fundamentals/api/get-started/).

The shared Tofler CI token does not need general-purpose DNS-write access. In Cloudflare's current three-column user-token UI, add `Account > Workers Scripts > Edit`, `Zone > Workers Routes > Edit`, `Account > Account Settings > Read`, `Zone > Zone > Read`, `User > User Details > Read` and `User > Memberships > Read`. Scope the account rows to the selected Cloudflare account and the zone rows to `tofler.tech` plus `tofler.app`. Workers Scripts Edit uploads/deploys Workers; Workers Routes Edit attaches Custom Domains and their automatically managed subdomain records; the read-only rows support Wrangler discovery. This is an accepted simplicity tradeoff for the solo phase; move to per-Business tokens when real users/data, another collaborator or sensitive infrastructure increases the blast radius. `CLOUDFLARE_ACCOUNT_ID` is a GitHub production environment variable; `CLOUDFLARE_API_TOKEN` is an environment secret.

### Resend, when required

| Name | Exposure | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret, Convex environment | Sends transactional email |
| `RESEND_WEBHOOK_SECRET` | Secret, Convex environment | Verifies delivery events when used |

Domain ownership and DNS verification are manual prerequisites. Resend is not required for the MVP support inbox: users read operator responses in-product and the operator may reply manually from the monitored support mailbox when necessary.

## Secret placement

| Context | Location |
| --- | --- |
| Local public values | Ignored `.env.local` beside the consuming app |
| Local server secrets | Ignored `.env.local`; never shell history or documentation |
| Convex runtime secrets | Convex deployment environment variables, set separately for dev/prod |
| GitHub deployment secrets | GitHub Actions environment/repository secrets |
| Cloudflare build/deploy secrets | Cloudflare environment variables or GitHub Actions secrets |
| Human recovery credentials | Existing password manager |

Every example environment file must contain names and placeholders only. Add repository secret scanning and `.env*` ignore rules during **Build 1 — Foundation**.

## Setup sequence

1. Start **Build 1 — Foundation** locally with no new credentials.
2. Complete and validate the entire local gate with local Convex and deterministic identities.
3. After explicit approval, create/select the BFF Convex cloud development deployment inside the existing `business-factory` project record and create the initial Cloudflare backoffice origin.
4. Create the Google web client for the exact backoffice origins, then place its public client ID and the small verified-email operator allowlist in `@bff/static-config` after review.
5. When the first product adds login, choose and configure the Business-user authentication mechanism separately.
6. When the first product adds a paid gate, use Paddle sandbox credentials; keep live credentials blocked on seller/domain approval.
7. Confirm Cloudflare account/domain access before the first production backoffice or product deployment.
8. Create the GitHub `production` environment, public target variables and narrowly scoped Convex/Cloudflare secrets; follow [the production-delivery runbook](production-delivery.md).
9. Before launch, confirm the monitored public support address; do not create a helpdesk account for the initial BFF support inbox.
10. Add Apple login, PostHog, Resend or Sentry only when an implemented workflow or platform rule needs them.

## Account ownership rules

- Andrew remains the owner of provider accounts, billing commitments, identity verification and recovery methods.
- Codex may create configuration, projects and deployment resources only within the authorized accounts and task scope.
- Use separate development and production credentials.
- Name tokens by consumer, for example `bff-github-production`, to make rotation clear.
- Revoke unused credentials and record rotation/recovery steps without recording values.
