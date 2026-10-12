# Provider accounts, access and secrets

Updated: 2026-10-11.

This is the manual handoff for [ADR 0001 — Convex-first BFF stack](../architecture/adr/0001-convex-first-bff-stack.md). It records which accounts are needed, when they are needed and how access should be supplied. It must never contain credential values.

## Operator work development access — 2026-10-10

The accepted [Operator work design](../../.agent/brainstorms/261008-customer-operations-backoffice.md)
is implemented and deployed to development under the
[execution plan](../../.agent/plans/261009-operator-work.md). Production is excluded.
Development mail and capped text inference are live. The current
state below supersedes the earlier read-only preflight, not the historical
Foundation setup instructions later in this document.

- **Available:** Convex dev access and Wrangler Worker deployment access were
  exercised successfully. Both dev backends, backoffice, TableCards web and the
  separate private screenshot processor are deployed. Development event-reporting
  secrets were installed through memory/stdin, never tracked files.
- **Resend access restored — 2026-10-10:** Andrew supplied a temporary key after
  the earlier key could not be recovered. It is now persisted as
  `BFF_OPERATIONS_RESEND_API_KEY` in BFF development (`compassionate-buffalo-689`),
  using private stdin; exact private read-back matches. Read-only domain and
  initial webhook/domain list requests both returned HTTP 200 with zero resources. No value was
  written to repository files or printed in command output. The temporary key
  was supplied in chat, so rotate after setup. The initial restoration check
  did not activate mail. It is superseded by the scoped provisioning and
  transport evidence below. Synthetic `.invalid` addresses cannot receive mail.
- **Setup credential incident:** a resumed Nirvana lookup unintentionally exposed
  the separate Cloudflare setup token in tool output. Andrew was informed and
  later expressly authorized temporary development setup use. That access was
  exercised only for the isolated Business mail DNS and dev gateway, never stored
  as a runtime credential. Setup sessions cleared it; rotate after setup.
  No repository file contains it. This renewed authorization supersedes the
  earlier prohibition, not the recommendation for a secure long-term handoff.
- **Branded email setup:** use zone-scoped DNS write access for `tofler.app`
  (`DNS Write` in the [permission catalog](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)),
  during authorized setup. The isolated domain and its five actual returned
  records are installed and exact public DNS checks pass; Resend verification
  passed 2026-10-10 16:37 UTC. Preserve existing DNS/mail records; do not replace root MX
  records when adding a Business subdomain.
- **AI caps:** use account-scoped `AI Gateway - Read` and `AI Gateway - Edit`
  for provisioning, per [gateway setup](https://developers.cloudflare.com/ai-gateway/configuration/manage-gateway/).
  Earlier Wrangler OAuth returned HTTP 403; the supplied setup token listed
  gateways before the exposure incident, without changing that OAuth grant. Gateway permissions cannot
  be restricted to one gateway; keep this setup credential separate from runtime
  credentials and the existing CI token. During authorized setup, route all live
  helper/support text through the selected capped gateway; no uncapped or
  expensive fallback. Andrew configured both $3/day and $30/month rules. Provider
  [spend-limit accounting](https://developers.cloudflare.com/ai-gateway/features/spend-limits/)
  is eventually consistent, not an exact application reservation system. The
  [official launch article](https://blog.cloudflare.com/ai-gateway-spend-limits/)
  documents fixed daily/monthly resets. On 2026-10-10, read-back of the named
  dashboard rules returned enabled cost limits 3/window 86400 and 30/window
  2592000, both fixed and global, without provider/model/metadata dimensions.
  A temporary USD 0.000001 guard returned gateway HTTP 429/code 2045; it was
  removed and the two original rules read back unchanged. Calendar rollover,
  timezone and concurrent overshoot are not independently measured. The isolated
  `bff-operator-dev` gateway retains caching/logging off and 20 requests/60 seconds.
  The private Worker routes its fixed cheap Qwen binding through that gateway;
  actual inference now succeeds. Recheck the rules in the
  [development gateway settings](https://dash.cloudflare.com/b11257caf746bb1d32e60099419603c3/ai/ai-gateway/bff-operator-dev/settings)
  before future activation. Do not bypass the dashboard security challenge or
  widen access to automate native billing alerts.
- **Native alerts:** Andrew can use Billing > Billable Usage > Create budget
  alert under a Billing/Administrator/Super Administrator role. These are
  [account-wide billing-period threshold emails](https://developers.cloudflare.com/billing/manage/budget-alerts/),
  not AI-only daily reports; the [changelog](https://developers.cloudflare.com/changelog/post/2026-06-15-budget-alerts-default-on/)
  documents prior-day processing. Native alerts are not configured. Do not request broad billing API rights merely
  to automate this small dashboard step or build a custom alert system.
- **Jev experiment preflight — 2026-10-11:** read-only setup access rechecks
  `bff-operator-dev`: both global fixed caps remain enabled at USD 3/window 86400
  and USD 30/window 2592000, with logging off and Workers AI billing `postpaid`.
  The [credit-balance API](https://developers.cloudflare.com/api/resources/ai_gateway/subresources/billing/methods/credit_balance/)
  returns balance zero. [Jev](https://developers.cloudflare.com/ai/models/typesafe/jev/)
  is third-party; the binding uses [Unified Billing credits](https://developers.cloudflare.com/ai-gateway/usage/worker-binding-methods/),
  not the Workers free allocation. Jev inference was not attempted; no top-up,
  plan upgrade, billing-mode change or deployment. Existing Wrangler deployment
  OAuth still returns HTTP 403/code 10000 for Gateway/credit reads; it is not the
  setup credential. The setup token was handled in memory/private non-echoing
  stdin, not files or output, then cleared; its earlier rotation requirement remains.
- **One-off credit top-up — 2026-10-11 15:40 UTC:** Andrew authorized a small
  purchase. The [top-up API](https://developers.cloudflare.com/api/resources/ai_gateway/subresources/billing/subresources/topup/methods/create/)
  sets a 1000-cent minimum; [Unified Billing](https://developers.cloudflare.com/ai-gateway/features/unified-billing/)
  documents a 5% purchase fee. One USD 10-credit creation request returned HTTP
  200/success; status reached completed and the credit balance rose from zero to
  1000 cents. The expected charge is USD 10.50 before any applicable tax; the
  bank charge/tax total was not independently inspected. A default payment method
  was available; no card details, invoice identifier or client secret were printed
  or persisted. Before/after read-back proves both caps and Workers AI postpaid
  mode unchanged; auto-top-up remains off (amount/threshold zero).
  This is not a Workers Paid subscription or an automatic refill. No inference
  or deployment occurred in the purchase step. The setup credential travelled
  through private non-echoing stdin and was cleared; rotate after setup.
- **Prepaid inference setup — 2026-10-11 16:00 UTC:** post-purchase probes still
  returned Jev 2049/native 4006. Fresh configuration found authentication off and
  Workers AI billing postpaid. [Unified Billing prerequisites](https://developers.cloudflare.com/ai-gateway/features/unified-billing/)
  require gateway authentication and native `unified` billing to use credits.
  Updated only those settings on `bff-operator-dev`; full before/after comparison
  preserves caps, logging, caching, rate limits and other settings. Credits still
  read 1000 cents immediately after setup; automatic top-ups remain zero/off.
  Binding calls are [pre-authenticated](https://developers.cloudflare.com/ai-gateway/configuration/authentication/);
  no additional runtime key or subscription was created. Direct REST with the
  setup key returned 401/10000 (it lacks Workers AI Read); retain that key only
  for setup, not inference. Native Gemma and private Jev access subsequently pass.
  The separately gated selector endpoint is development evaluation-only. Its
  actual binding result envelope is normalized before strict probability parsing;
  diagnostic headers expose only fixed types/numeric codes, never raw values.
  A one-question four-arm smoke measures USD 0.00130716 token-based inference
  estimate; no invoice reconciliation or quality claim. No cap/plan increase.
- **Generation-control test route — 2026-10-11 16:56 UTC:** development private
  provider `259c781d-6933-487a-84e1-8ecf1f295216` preserves measured numeric reasoning
  usage and adds a separately gated Gemma-only/no-tool experiment route. Ordinary
  customer defaults, 24KB/1,200-token limits, fixed gateway and caps are unchanged.
  Explicit development overrides preserve live/cap/selector flags and enable
  `GENERATION_EXPERIMENTS_ENABLED`; checked-in gates remain false. Two regression
  tests fail before the fix; all 52 provider tests/type/lint/dry-run build pass.
  Missing reasoning counts are not proof of no thinking; no reasoning text is
  persisted. No further purchase, auto-refill, subscription or production change.
  The subsequent [42-call diagnostic](../../projects/tablecards/support/evaluation-results/generation-control-2026-10-11T171036-602Z.md)
  returned 42 HTTP 200 responses, 41 complete answers and one length-limit failure;
  measured token-based estimate USD 0.0141868, no timeouts/retries. This proves
  capped access, not 90–95% answer quality. Both caps and customer configuration
  remain unchanged.
- **Screenshot conversion:** the [Images binding](https://developers.cloudflare.com/images/optimization/binding/)
  is installed in `business-factory-ai-provider-dev`. Actual authenticated PNG/JPEG
  conversion passes, with fresh bounded preview bytes; unauthenticated and invalid
  inputs fail. Original files have no serving fallback. This is image rewriting,
  not an antivirus guarantee. The default
  [Images Free plan](https://developers.cloudflare.com/images/pricing/) supports
  up to 5,000 unique monthly transformations; no paid Images subscription is
  expected for the initial development volume. Actual Resend attachment intake,
  private PNG/JPEG preview retrieval and browser rendering pass after the narrow
  download-host and image-only CSP fixes below.

Use a secure credential channel for long-term secret handling, not task notes,
chat or tracked files. Andrew's Nirvana handoff enabled this read-only check; it
is not a long-term secret-store recommendation. Prefer separate short-lived DNS
and gateway setup tokens; a single setup
token may carry both reviewed scopes if needed. Existing Worker deployment access
does not need widening for these separate API operations.
Checked the installed Wrangler 4.141.0 `login --scopes-list`: it offers Workers AI
but no DNS-write or explicit AI Gateway management scope. Reauthorization of this
client is therefore not an established replacement for the scoped setup token;
no login/grant was changed. Cloudflare documents
[API tokens for granular Wrangler authorization](https://developers.cloudflare.com/workers/authorization/).

### Live-text development activation

After both rules are read back and blocking is proved, deploy the private Worker
with the explicit live overrides in its [README](../../platform/bff/ai-provider/README.md).
The checked-in manifest deliberately remains fail-closed. Set
`BFF_OPERATIONS_AI_MODE=live` and `BFF_OPERATIONS_CAPS_VERIFIED=verified` only on
`compassionate-buffalo-689`; its existing private provider endpoint and secret
remain server-only. The model is fixed to `@cf/qwen/qwen3-30b-a3b-fp8` and every
native inference call includes gateway `bff-operator-dev`. Support reads are
permitted automatically; substantive replies still require exact operator Send.

The separate [live browser smoke](../../projects/tablecards/e2e/README.md) is
explicitly opted in, bounded to six helper POSTs per desktop/phone case and uses
real responses. Do not run the 144-case paid quality suite merely to activate user
testing. Intentional evals keep their separate USD 2 run bound; a separate eval
gateway is not configured yet, so these dev smoke calls count against the global
live caps. Native alerts remain unconfigured. Production is untouched.

### Live-email activation recipe

With restored Full-access Resend and authorized DNS access, list domains/webhooks
before creating anything. Enable sending and receiving for the one isolated
`tablecards.tofler.app` domain, with tracking off. Apply only the actual returned
DKIM/sending/receiving records under that subdomain; preserve root MX and website
records. Verify and poll both capabilities. Resend's catch-all accepts
`help@tablecards.tofler.app` and `reply+<opaque-token>@tablecards.tofler.app`;
no dev-only domain slot or separate mailbox is required.
[Domain creation](https://resend.com/docs/api-reference/domains/create-domain),
[receiving domains](https://resend.com/docs/dashboard/receiving/custom-domains).

Register the signed development callback at
`https://compassionate-buffalo-689.convex.site/v1/operations/resend` for received,
sent, delivered, delayed, failed, bounced and complained events. Install its
returned signing secret directly as `BFF_OPERATIONS_RESEND_WEBHOOK_SECRET`, the
Full-access key as `BFF_OPERATIONS_RESEND_API_KEY`, then revision-check the
development Business bindings before switching `BFF_OPERATIONS_MAIL_MODE=live`.
Never turn old mocked deliveries into new sends. Use only Andrew's connected
mail account for the bounded receipt/reply/PNG-preview/closing-survey smoke;
signed duplicate callbacks must not duplicate history or deliveries.
[Webhook creation](https://resend.com/docs/api-reference/webhooks/create-webhook),
[receiving](https://resend.com/docs/dashboard/receiving/introduction).

New receipt and operator-reply tokens are lowercase before both addressing and
hashing, matching inbound normalization. Existing records are untouched. A
provider replay deduplicates intake; it does not reschedule an already failed
internal receipt. Deliberate recovery uses the retained receipt with internal
`operationsMail:processWebhook`, not a new email or blind repeated resend.

### Provisioning and bounded transport evidence — 2026-10-10

Created one domain, `tablecards.tofler.app` (Resend ID
`1729e329-d765-459e-9906-307b3a5b8485`), with sending and receiving enabled and
open/click tracking disabled. Verification was initially pending and passed
2026-10-10 16:37 UTC, including all five records.
Created the enabled signed development webhook
`58db1534-7c44-4229-9bd7-ff1f282cf222` at the callback above, subscribed to all
seven events in the activation recipe. The returned signing secret was installed
through private stdin and exact read-back verified in `compassionate-buffalo-689`;
it is not recorded here. No production callback or paid plan was added.

A single explicitly labelled transport diagnostic from `onboarding@resend.dev`
reached Andrew's connected Gmail **INBOX**, with provider status `delivered` and
SPF/DKIM/DMARC passing. Two identical requests with one idempotency key returned
the same provider email ID `01a12678-011c-7a3c-8abe-d5b7892d3c34`; Gmail contains
one message. Actual signed `email.sent` and `email.delivered` callbacks reached
BFF. Replaying the delivered event kept one receipt row; an unsigned callback
returned HTTP 403. Those diagnostic receipts intentionally remain `unmatched`
because this was not a support reply or a bypass of operator Send.

**DNS setup completed after renewed authorization:** Andrew expressly permitted
temporary development use of the current setup credential. The five records below
are now installed with exact authoritative/public resolver matches; the `rsend`
CNAME is DNS-only and root MX is unchanged. Setup-token memory was cleared.
During asynchronous verification, GET-only checks avoided restarting its pending
cycle. Verification subsequently passed. Names below are relative to `tofler.app`.

| Type  | Name                           | Value                                   | Priority |
| ----- | ------------------------------ | --------------------------------------- | -------- |
| TXT   | `resend._domainkey.tablecards` | DKIM public value below                 | —        |
| MX    | `send.tablecards`              | `feedback-smtp.us-east-1.amazonses.com` | 10       |
| TXT   | `send.tablecards`              | `v=spf1 include:amazonses.com ~all`     | —        |
| CNAME | `rsend.tablecards`             | `send.forge.rmta.net`                   | —        |
| MX    | `tablecards`                   | `inbound-smtp.us-east-1.amazonaws.com`  | 10       |

Public DKIM TXT value (not a credential):

```text
p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDZCG6Z7QKQxBsoPV28S9jVb04IsmlkTpKeS+RY7BoSEZIZ1+zGUu/w0irvbZYILQkavIc5P3L2huy7UG9AbsKhzoWz1EEiPWtYvpXJzol2X+odjgc6ddAaK1uvu5VNvJ/kT+ns37krx4m9ikALYPnmvceWGiQLlhsf2YNq9nJl/wIDAQAB
```

Alternatively, Resend's existing managed `<id>.resend.app` receiving address can
support the approved development-only path without DNS. Official instructions
expose it in **Emails → Receiving → Receiving address**; there is no connected
authenticated dashboard session or known address here. Supply that non-secret
address rather than inventing one; do not introduce beta Inboxes or a new vendor.

Application mail mode is now **live in development only**. Revision-checked configuration reads
back exactly at revision 3: `help@tablecards.tofler.app` for sender/intake and
`tablecards.tofler.app` for opaque reply addresses. Other bot/skill/event/KPI
definitions are preserved. Zero queued/dispatching or fresh retryable mock
deliveries were present in the activation preflight; old mocks are not resent.
Live text remains disabled. Actual Gmail intake created an email-only support
conversation, with no inferred account/user authority, and the fixed initial
receipt reached Gmail with matched signed sent/delivered callbacks. An attachment
smoke safely blocked the provider's download CDN because of an allowlist mismatch.
The exact HTTPS `cdn.resend.app` fix preserves redirect denial, size bounds and
private bytes; 46 focused tests/type/lint pass and BFF dev was pushed at 16:45 UTC.
Actual regenerated PNG/JPEG previews and unauthorized/wrong-environment denial
pass. Correlated follow-up preserves edits and rejects the old Send ID. One exact
public operator Send reaches Gmail; duplicate Send creates no second delivery.
The actual survey records nothing on GET and accepts explicit POST; a later
customer reply reopens the same case. Malformed PNG/unsupported TXT remain blocked.
Signed inbound replay retains one receipt and unchanged message counts.

One actual website contact submission through the supported test-login path for
Andrew's existing verified dev user/account also returns an honest queued-email
confirmation, then delivers its fixed receipt to Gmail. No signup-email exception,
identity merge, project/account change or substantive automatic reply was needed;
the website case remains separate from the email-only case.

Actual browser inspection found the backoffice CSP blocked private blob previews.
The narrow fix permits `blob:` in **`img-src` only**, not scripts or network
targets. Its red/green policy regression and six fresh affected test/type/lint
tasks pass. Backoffice dev version `4e369153-e9c9-4580-b0e1-2231aaa92696`
renders the actual JPEG 1050×600 and PNG 32×32, with zero CSP/preview errors,
original-download links, non-blob image requests or mutation requests in the
final read-only check. Real development email acceptance is complete.
The prior full Node 24 `pnpm check` passed in 2m1.5s; final post-CSP gate evidence
is recorded in the development review. No schema migration, production change
or paid plan upgrade. Rotate temporary credentials after setup.

## Historical Foundation setup context

The following Build 1 instructions describe the original setup boundary, not
today's production/development inventory. Builds 1–3 have since passed their
authorized production boundaries; use [STATUS](../../STATUS.md) and the
[production runbook](production-delivery.md) for current release state.

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

| Provider           | Current evidence                                                                                                   | Registration/action                                                                                                                                    | Needed when                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| Convex             | CLI is authenticated; `andrew-tofler/business-factory` development is live and production is empty                 | Create a production-scoped CI deploy key named `bff-github-production`; never reuse the personal CLI token                                             | Production CI/CD                      |
| Google Cloud OAuth | One shared backoffice web client exists with exact development and production origins                              | No additional Build 1 credential; Business-user clients wait for their owning build                                                                    | Complete for Build 1                  |
| Apple Developer    | Not confirmed and conditional                                                                                      | Do not register/configure yet; provide access and create Sign in with Apple credentials only when an iOS/App Store or product requirement activates it | Conditional Apple login               |
| Cloudflare         | Interactive Wrangler access is connected; `ops-dev.tofler.tech` is live; both Tofler zones are owned in Cloudflare | Create shared `tofler-github-ci` with Workers Scripts Edit and Workers Routes Edit for both Tofler zones                                               | Production and future Tofler CI/CD    |
| Paddle             | Seller status not verified here                                                                                    | Continue seller onboarding; create sandbox credentials first, live credentials after approval                                                          | Billing implementation and launch     |
| PostHog            | Not confirmed and optional                                                                                         | Do not register yet; create a project only if the first product outgrows canonical BFF events                                                          | High-volume product analytics/funnels |
| Resend             | Real development send/receive, private previews, exact operator reply, signed callbacks and survey round trip pass | Rotate temporary key after setup                                                                                                                       | BFF-owned support send/receive        |
| Support mailbox    | Existing address may be used                                                                                       | Confirm one monitored public address; a branded mailbox can wait                                                                                       | Before first public launch            |
| Sentry             | Not confirmed and optional                                                                                         | Defer until Convex logs are insufficient                                                                                                               | After observed monitoring need        |
| GitHub             | Repository, Actions validation and authenticated CLI access exist                                                  | Create the `production` environment, branch restriction, public variables and two environment secrets                                                  | Production CI/CD                      |

## Credential inventory

Names below are the intended configuration contract. Credentials and deployment-specific values remain outside git; explicitly identified public, deployment-invariant identifiers are reviewed in `@bff/static-config`.

### Convex

| Name                   | Exposure                                          | Purpose                                          |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------ |
| `CONVEX_DEPLOYMENT`    | Local configuration, not an authentication secret | Selects the development deployment               |
| `VITE_CONVEX_URL`      | Public frontend configuration                     | Convex client endpoint                           |
| `VITE_CONVEX_SITE_URL` | Public frontend configuration                     | Convex HTTP/auth endpoint                        |
| `CONVEX_SITE_URL`      | Public configuration                              | HTTP action/webhook base URL                     |
| `CONVEX_DEPLOY_KEY`    | Secret, CI only                                   | Non-interactive production or preview deployment |

GitHub production also stores the public expected `CONVEX_URL` and `CONVEX_SITE_URL` as environment variables so the build and smoke checks can reject a key/target mismatch.

Interactive local development uses the existing CLI login; it does not need `CONVEX_DEPLOY_KEY`. Generate a deploy key scoped only to the BFF production deployment for GitHub Actions. See [Convex deploy keys](https://docs.convex.dev/cli/deploy-key-types).

### Build 1 operator Google OIDC

The hosted backoffice uses Google Identity Services popup mode and passes the short-lived ID token to Convex for verification. It needs a public web client ID and exact authorized JavaScript origins; it does not need a Google client secret or callback URL.

| Name                          | Exposure                                              | Purpose                                                                        |
| ----------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `BACKOFFICE_GOOGLE_CLIENT_ID` | Public, code-owned identifier in `@bff/static-config` | Initializes Google Identity Services and restricts the accepted token audience |
| `BACKOFFICE_OPERATOR_EMAILS`  | Code-owned identity allowlist in `@bff/static-config` | Authorizes the fixed backoffice operators after verified Google authentication |

Authorize the exact localhost and Cloudflare origins. Request only basic identity. The browser keeps the ID token in memory and the production bundle must not contain the operator allowlist. Production OAuth branding/domain requirements wait for production. See [Google Identity setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) and [Google OAuth policies](https://developers.google.com/identity/protocols/oauth2/policies).

Do not add Apple credential names or placeholders until Apple login is activated. At that point configure the Apple Service ID/app capability, Team ID, Key ID and private key in the relevant deployment's secret store; never commit the private key. Apple login uses the same BFF auth adapter, so enabling it must not change BFF user/account IDs or public session contracts.

### Paddle

Create separate sandbox and live values.

| Name                        | Exposure                   | Purpose                        |
| --------------------------- | -------------------------- | ------------------------------ |
| `VITE_PADDLE_CLIENT_TOKEN`  | Public                     | Initializes Paddle.js checkout |
| `PADDLE_API_KEY`            | Secret, Convex environment | Server-side Paddle API calls   |
| `PADDLE_WEBHOOK_SECRET_KEY` | Secret, Convex environment | Verifies Paddle notifications  |
| `PADDLE_ENVIRONMENT`        | Public configuration       | Selects sandbox or production  |

Use a least-privilege, expiring, rotatable Paddle API key. Never use an API key in frontend code. The client-side token is the only Paddle credential intended for frontend exposure.

### PostHog, only when needed

| Name                       | Exposure                  | Purpose                                                  |
| -------------------------- | ------------------------- | -------------------------------------------------------- |
| `VITE_POSTHOG_KEY`         | Public                    | Sends product analytics events                           |
| `VITE_POSTHOG_HOST`        | Public                    | Selects the PostHog region/host                          |
| `POSTHOG_PERSONAL_API_KEY` | Secret, provisioning only | Optional automation; not required by the product runtime |

Revenue and entitlement truth remains in BFF. PostHog is not the payment ledger and no PostHog credential is required for the first backend/auth/support/billing slices.

### Cloudflare

Local interactive setup can use Wrangler OAuth. CI should use a narrowly scoped API token rather than the legacy global API key.

| Name                    | Exposure        | Purpose                                                                             |
| ----------------------- | --------------- | ----------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Secret, CI only | Deploys the selected Worker/static-assets project and, only if allowed, updates DNS |
| `CLOUDFLARE_ACCOUNT_ID` | Configuration   | Selects the account                                                                 |
| `CLOUDFLARE_ZONE_ID`    | Configuration   | Selects the DNS zone when DNS automation is enabled                                 |

Use separate deployment and DNS tokens if practical. Restrict them to the selected account/zone and only required permissions. See [Cloudflare API authentication](https://developers.cloudflare.com/fundamentals/api/get-started/).

The shared Tofler CI token does not need general-purpose DNS-write access. In Cloudflare's current three-column user-token UI, add `Account > Workers Scripts > Edit`, `Zone > Workers Routes > Edit`, `Account > Account Settings > Read`, `Zone > Zone > Read`, `User > User Details > Read` and `User > Memberships > Read`. Scope the account rows to the selected Cloudflare account and the zone rows to `tofler.tech` plus `tofler.app`. Workers Scripts Edit uploads/deploys Workers; Workers Routes Edit attaches Custom Domains and their automatically managed subdomain records; the read-only rows support Wrangler discovery. This is an accepted simplicity tradeoff for the solo phase; move to per-Business tokens when real users/data, another collaborator or sensitive infrastructure increases the blast radius. `CLOUDFLARE_ACCOUNT_ID` is a GitHub production environment variable; `CLOUDFLARE_API_TOKEN` is an environment secret.

### Resend, when required

| Name                                   | Exposure                               | Purpose                                                                                |
| -------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------- |
| `BFF_OPERATIONS_RESEND_API_KEY`        | Secret, development Convex environment | Operator work sending, inbound content and attachment retrieval; Full access for setup |
| `BFF_OPERATIONS_RESEND_WEBHOOK_SECRET` | Secret, development Convex environment | Verifies the exact signed Resend callback body                                         |

Domain ownership/DNS verification and scoped signed callbacks are prerequisites for live support email. Operator work selects Resend send/receive with BFF-owned ticket history and email follow-up, not an in-product customer inbox. Synthetic/no-send development can precede provider setup; provider selection alone does not establish domain or callback configuration. Current access evidence is recorded above.

## Secret placement

| Context                         | Location                                                             |
| ------------------------------- | -------------------------------------------------------------------- |
| Local public values             | Ignored `.env.local` beside the consuming app                        |
| Local server secrets            | Ignored `.env.local`; never shell history or documentation           |
| Convex runtime secrets          | Convex deployment environment variables, set separately for dev/prod |
| GitHub deployment secrets       | GitHub Actions environment/repository secrets                        |
| Cloudflare build/deploy secrets | Cloudflare environment variables or GitHub Actions secrets           |
| Human recovery credentials      | Existing password manager                                            |

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
