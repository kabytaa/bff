# Business Factory Handoff

Updated: 2026-10-09.

## Current state

- Builds 1–3 passed their authorized production boundaries. TableCards is live in
  [production](https://tablecards.tofler.app) and
  [development](https://tablecards-dev.tofler.app) as a **no-charge preview**,
  not real billing or customer launch. Payments remains on hold for Paddle.
- Release `ee1e1d9` is committed/pushed and passed CI, production deployment and
  smoke. “Make a copy” clarifies the existing duplicate action; Archive/Restore
  and copying behavior are unchanged. Development web identifies this release;
  unchanged services retain their previous releases. See the
  [copy-label evidence](projects/tablecards/docs/reviews/261007-build-3-production-release.md#make-a-copy-terminology--2026-10-08).
  Earlier once-only welcome-credit provisioning remains; see its
  [review](projects/tablecards/docs/reviews/261007-build-3-production-release.md#free-welcome-credit-provisioning--2026-10-08).
- Approved context-reuse/delegation/transparency rules are in [AGENTS.md](AGENTS.md).
  Use purposeful parallel work or substantial consultation, not agents for every
  lookup. Quality, instruction reads and authorization gates remain unchanged.
- **Operator work** is active in the
  [canonical brainstorm](.agent/brainstorms/261008-customer-operations-backoffice.md).
  Andrew approved the presented design/schema on 2026-10-09: ready for planning.
  Andrew requested a documentation commit/push to main before planning. No further
  Andrew-side input blocker is known; provider writes and end-to-end integration
  remain untested. Implementation/deployment have not started.
- Final typed approval clarification: **permitted read-only support tools and
  assigned skill loading need no approval; every substantive reply is a suggestion
  requiring the operator's exact send decision**. This supersedes the ambiguous
  voice readback. Fixed initial receipts and helper ordinary answers stay automatic.
- Latest primary/independent Astra audit found no additional business-scope
  questions. The brainstorm is consolidated; stale read-approval, provider/runtime,
  customer-portal and product-search promises are corrected in existing summaries.
  Production misses can become sanitized Business regression cases: test the fix
  and rerun all saved evaluation sets. Result-storage wiring remains planning work;
  Markdown/JSON reports are proposed, and no evaluations have run.
- The [ERD/field/index proposal](.agent/brainstorms/261008-customer-operations-backoffice.md#proposed-erd)
  and [fielded architecture diagrams](docs/architecture/operator-work.md)
  are approved with their presented migration/ownership direction: eight additive shared
  tables, one history/current draft, existing identities reused, no generic
  read-approval table, and TableCards domain tables unchanged.
  Latest revision defers per-user/account/anonymous spending attribution and removes
  `botBudgetPeriods`, application money reservations, spending dashboard and custom
  budget alerts. Provider/gateway safety caps ($3/day, $30/month) are selected;
  native daily/delayed alerts are acceptable. Verify exact provider scope/windows
  and capped routing at later setup; no limits or notifications are configured.
  Business/shared ownership is clarified: generic shared code only; product code
  stays in the Business deployment, with content/definitions supplied as scoped
  data/settings. Audit found registration/storage gaps for runtime configuration,
  approved event/page capabilities and mailbox/branding bindings. Existing auth
  configuration is a precedent only; planning must specify remaining storage and
  explain any additional unpresented structural changes before edits.
  No schema/code change, installation, configuration, paid evaluation, seeding,
  purchase or deployment was performed.

## Immediate next work

- Presented architecture/design approval is resolved; do not ask again or reopen
  settled product/UX choices. On a planning/build instruction, continue this accepted
  scope, specify configuration persistence and prove runtime/security behavior.
  Cheap-model selection and realistic Astra-assisted seeds/evaluations happen then.
- Read-only preflight confirms Convex dev access and Wrangler login/Worker scopes;
  `tofler.app` zone is active/visible. Andrew supplied a separate Cloudflare setup
  token in Nirvana: verification reports active, and DNS-record and AI Gateway
  list requests both succeed (HTTP 200); no gateways exist yet. Write permissions
  have not been exercised. Exact setup permissions are DNS write on `tofler.app` and account
  AI Gateway Read/Edit; see the [access checklist](docs/operations/provider-accounts-and-secrets.md#operator-work-development-access--2026-10-09).
  Existing dev image Worker settings are readable and show AI, not Images. Private
  conversion can use the default Images Free allowance; adding/testing the binding
  is build work, not a confirmed paid-subscription blocker. Billing alerts are
  account-wide threshold emails with prior-day processing, not daily AI reports.
  Node 24 wrapper works; no deployment or provider settings changed.
  Andrew's access instructions are in Nirvana Next under the existing TableCards
  MVP project: `01a1221f-e482-7cc2-9999-025514b28f7e`. The supplied token was used
  in memory only, without displaying it or persisting it locally; task notes unchanged.
  Wrangler's checked OAuth scope list does not offer DNS write or explicit gateway
  management; simply reauthorizing this client is not a verified substitute. Login unchanged.
- Resend account/key provided; after Andrew's permission update, authorized read-only
  GET domains succeeds (HTTP 200), returning no registered domains. Key-access blocker
  resolved; domain/receiving/callback setup remains. No connected Resend MCP tools,
  credential persistence, email sending or provider configuration occurred.
  Synthetic/no-send development can start first; Resend's restricted test sender
  and managed receiving domain offer a later bounded real-mail test path without
  adding a development custom domain. No end-to-end email test has run.
- The [single roadmap](docs/factory/mvp-delivery-plan.md#grouped-launch-tasks)
  owns scope/order: Operator work now; Payments held; Monitoring later MVP before
  launch, including Telegram. Company-wide Paperclip/Dots and sales mail/bots are
  [post-MVP ideas](docs/architecture/future-ideas.md#post-mvp-ai-company-organization).
  AI SDK/shared BFF and Resend/private Cloudflare raster previews are selected
  directions, not installed services. Necessary actual-data privacy safeguards
  precede collection; detailed retention/cleanup remains deferred.
- At the first conversation on or after **2026-10-28**, proactively revisit Andrew's
  workplace-VPN reachability issue. Domains registered 2026-09-26 reach the 32-day
  checkpoint; age-related blocking is unconfirmed, not guaranteed to clear.
  Public DNS/HTTPS passed. Obtain the exact browser error or IT log when Andrew
  is available and recheck; no investigation is required from him now.

## Outstanding evidence

- Fresh authenticated production callback/export/checkout/team journeys remain
  **unverified** without personal Google credentials; the popup passes but an
  origin warning remains. Development passes do not prove production journeys.
- Andrew accepted his print for Build 3. Detailed physical checks remain for MVP
  launch; six-card landscape remains a development trial.

Product truth: [TableCards Product](projects/tablecards/docs/product.md).
Technical/operational router: [TableCards README](projects/tablecards/README.md).
