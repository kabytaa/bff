# ADR 0001 — Convex-first BFF stack

- **Status:** Accepted
- **Date:** 2026-09-21
- **Decision owner:** Andrew
- **Implementation owner:** Codex
- **Scope:** Business Factory Foundation (BFF), not every Business Project

## Context

BFF needs a reusable backend, public SDK and central backoffice for many small Business Projects. The founder's scarce resource is operating time, so the MVP should minimize infrastructure and deployment work without coupling every product to the same technology.

The original Business Factory blueprint proposed separate Next.js, Vercel and Supabase projects. The current architecture supersedes that topology with one Nx monorepo and a centralized BFF service. The machine and Google Drive also contain substantial prior Convex research and a working Convex backend in the separate Podcat project. Reusing that experience materially reduces implementation and operating risk.

## Decision

Use Convex as the primary BFF server runtime and database for the MVP.

| Concern | MVP choice |
| --- | --- |
| Workspace | Nx, pnpm and TypeScript |
| BFF functions, database, jobs and webhooks | Convex |
| User authentication | Better Auth hosted in Convex; enable Google only for the first login flow |
| Authorization, accounts and memberships | BFF data and server-side Convex function checks |
| Public integration | Versioned JSON/HTTP API and technology-neutral TypeScript SDK |
| BFF backoffice | React, Vite and Tailwind |
| Backoffice/static hosting | Cloudflare Workers Static Assets; Pages is an acceptable fallback |
| DNS | Cloudflare where a custom domain is used |
| Payments and merchant of record | Paddle |
| Product analytics | Defer; add PostHog only when a product needs more than BFF's canonical events |
| Canonical business events and attribution | BFF/Convex |
| User support and feedback | BFF/Convex request workflow with manual backoffice handling |
| Transactional email | Resend only when an actual flow needs email |
| Error monitoring | Convex logs initially; Sentry after a demonstrated need |
| CI | GitHub Actions |

Convex Free is sufficient for development. Plan to use Convex Professional before storing meaningful production customer/payment state unless an explicit backup and recovery alternative is accepted. As checked on 2026-09-21, Professional is $25 per developer per month and adds daily backups, log streaming, exception reporting and custom domains. See [Convex pricing](https://www.convex.dev/pricing).

Cloudflare is not part of BFF's application server or database. It hosts static web assets and DNS. Product-specific edge workloads may independently use Workers, Queues, R2 or another provider.

## Repository placement

The initial implementation should follow the architecture's ownership model:

```text
platform/bff/
├── service/                 # Convex schema, functions, HTTP actions and jobs
├── backoffice/              # React/Vite internal application
├── libs/
│   ├── contracts/           # public request/response schemas and event names
│   ├── sdk/                 # transport-independent public client
│   ├── auth/                # identity helpers and authorization policy
│   ├── billing/             # provider-neutral billing concepts
│   ├── analytics/           # canonical event and attribution helpers
│   └── config/
└── docs/

projects/<project-id>/       # product-owned UI, data and infrastructure
```

The exact folders may be adjusted during C01, but public contracts must not depend on Convex-generated internals.

## Technology boundary

Business Projects must integrate through BFF contracts, not import files from the Convex service.

- Browser and mobile callers authenticate through the BFF auth adapter and use the public BFF SDK.
- Server workloads use a project/environment-scoped service credential.
- Non-TypeScript callers can use the versioned HTTPS API.
- Paddle calls dedicated signed webhook endpoints; OAuth callbacks are handled by the auth component.
- The BFF backoffice may use Convex's native client because it is part of the BFF platform.
- A product remains free to use Convex, PostgreSQL, Supabase or no product database at all.

### Public API discipline

Do not create generic CRUD endpoints for every stored entity. Add a public capability only when an active product or backoffice workflow calls it. Every new method needs a real caller, an authorization rule, a bounded data contract and a test.

The expected first capabilities, in implementation order, are:

| Capability | Add only when | Likely contract |
| --- | --- | --- |
| Health | The hosted BFF service exists | `health.check()` |
| Authenticated context | The first product introduces login | `session.bootstrap()` returns the current user, account, membership and project context |
| Support and feedback | The first product has signed-in users | `support.submit(request)` and `support.listMine()` |
| Canonical event capture | The first acquisition/product funnel is instrumented | `events.capture(event)` |
| Entitlement check | A feature is actually gated | `entitlements.has(accountId, key)` |
| Checkout creation | The first paid offer is implemented | `billing.createCheckout(accountId, priceRef)` |

Paddle webhook handlers and authentication callback routes are provider ingress routes, not general product APIs. Account invitation, usage-limit, service-credential, campaign-cost and generic administration methods stay absent until a chosen product or backoffice task needs them.

HTTP routes should be grouped under `/v1` when the first external route is implemented. Breaking contract changes require a new version or a compatible migration period. The SDK owns transport, authentication, retries and normalized error shapes. Backoffice-only functions can remain internal Convex functions rather than enlarging the public API.

For every method, derive identity from the verified token rather than request fields, verify account membership server-side, treat returned IDs as opaque, and require an idempotency key for repeatable side effects such as checkout creation.

## Identity and trusted request flow

Clerk is not required for the MVP. When C04 begins, use [Better Auth with the Convex component](https://labs.convex.dev/better-auth/framework-guides/react) as the session and OAuth layer running in the BFF Convex deployment. Enable only Google login. Do not enable passwords, magic links, email OTP or other social providers without a real product requirement.

Better Auth is a code dependency, not another hosted identity account. It avoids a separate identity vendor while still handling OAuth callbacks, provider account records and sessions. Pin compatible package versions and keep it behind `platform/bff/libs/auth`; products consume the BFF session/API contract, not Better Auth internals. Convex Auth is also provider-free but remains beta and may change incompatibly, so it is not the default. See [Convex authentication](https://docs.convex.dev/auth/overview).

Google is the only initial external identity provider. Create its OAuth client only when the first login flow is implemented. Apple login remains disabled for the web MVP. Add it when a selected product needs it or before an iOS App Store launch that uses Google for the primary account and does not qualify for an exception under [App Review Guideline 4.8](https://developer.apple.com/app-store/review/guidelines/#login-services).

Trusted user flow:

1. The product starts Google login through the BFF auth adapter.
2. Google returns to the Better Auth callback hosted by Convex.
3. Better Auth verifies the OAuth response and establishes the session.
4. Convex validates the authenticated request and exposes the verified identity.
5. BFF maps `(issuer, subject)` to its own stable internal user.
6. Every function verifies the requested project, environment, account and membership before reading or changing data.

Do not use an email address as proof of identity. The Podcat `signInOrCreate` email lookup is product prototype code, not a reusable authentication pattern.

For the quickest first implementation, create or update the internal BFF user and identity mapping lazily on the first authenticated request. Store no Google access or refresh token unless a concrete product feature needs Google APIs beyond login.

## Incremental data model

The entity names below are a sequence, not a schema to build up front. A collection is created only in the task that supplies its first real writer and reader.

Every new collection must have:

- a current product or backoffice workflow that needs it
- a project/environment boundary where applicable
- explicit authorization and indexes for its real query paths
- a retention/deletion expectation
- tests for its access and invariants

Implement in capability-sized slices:

| Task/capability | Add only these likely collections | Defer from that slice |
| --- | --- | --- |
| Project registry | Start with `projects`; keep environment configuration on the project until it needs an independent lifecycle/query | Users, billing and analytics |
| First login/account flow | `users`, `authIdentities`, `accounts`, `memberships`; map each verified `(issuer, subject)` to a stable BFF user | Account-linking UI, invitations and elaborate roles until a workflow needs them |
| First support/feedback flow | `supportRequests`; keep one user message, one operator response and current status on the request | Threads, attachments, knowledge bases, AI automation and external helpdesk synchronization |
| First Paddle checkout/paid gate | Always add `webhookReceipts`; add only the billing customer, transaction, subscription and entitlement collections used by the chosen one-time or recurring offer | Generic catalog tables, unused billing states, usage counters and multiple-provider abstractions beyond a clean adapter |
| First acquisition funnel | Start with `businessEvents`; add anonymous visitors/sessions only when pre-login attribution needs them | General event warehouse and campaign management |

Keep Paddle price references in project configuration until independent catalog querying or lifecycle management is genuinely needed. Do not create `serviceCredentials`, `usageCounters`, `campaignCosts`, `auditEvents` or similar collections before a concrete task uses them.

Convex stores canonical events required for billing, entitlement, attribution and factory decisions. If a product later needs high-volume interaction analytics, add PostHog at that point rather than creating a speculative analytics integration now.

## MVP support and feedback

Every launched Business Project must have a discoverable **Help / Feedback** entry point for signed-in users. The first implementation supports three request kinds: `feedback`, `problem` and `question`.

The form accepts a subject and message and warns the user not to include passwords, payment details or other secrets. BFF derives the user, account, project and environment from trusted session context and may add bounded technical context such as the route and app version. It must never capture tokens, cookies, unrelated form contents or broad page/session recordings. Validate length, sanitize rendered content and rate-limit submission.

The central backoffice provides a simple inbox with `new`, `inProgress`, `resolved` and `closed` states. An operator can add one response and change the status. The submitting user can view their own request, status and response in the product. Keep a working public support address visible on login and public pages so a person with an authentication or account-access problem can still reach the operator.

No helpdesk SaaS, live chat, attachments or transactional-email provider is required for this MVP flow. The operator can use the existing support mailbox when an email reply is necessary. Later AI assistance should operate on this same bounded request lifecycle; automatic classification, draft responses, autonomous actions and automatic resolution require a separate decision, audit trail and human-control design.

## Billing correctness

Paddle details stay behind a provider adapter. The BFF model separates payment, subscription and entitlement state.

- Verify webhook signatures from the unmodified request body.
- Persist and deduplicate every provider event ID.
- Make processing idempotent and safe under retries or out-of-order delivery.
- Apply related state changes atomically in Convex mutations.
- Never grant access from a checkout redirect alone.
- Keep manual replay and reconciliation paths.
- Store provider references, not secrets, in ordinary database records.

Paddle client-side tokens may be exposed only to Paddle.js. Paddle API keys and webhook secrets remain server-only. See [Paddle authentication](https://developer.paddle.com/api-reference/about/authentication/) and [webhook signature verification](https://developer.paddle.com/webhooks/about/signature-verification/).

## Schema changes, migrations and recovery

- Prefer additive schema changes followed by a separate backfill and cleanup.
- Validate existing documents before making a field required.
- Make backfills resumable and observable.
- Keep stable external IDs and timestamps so data can be exported.
- Test backup/restore before relying on the production system.
- Record every destructive migration in a separate ADR/runbook.

Convex does not provide SQL joins or general ad-hoc relational reporting. Use indexed access paths and add a materialized summary only when a real screen/query needs it. PostHog can handle high-volume product analytics later. The public API boundary makes a future storage migration possible without changing every Business Project.

## Environments and deployment

- Create a new Convex project for Business Factory; do not reuse Podcat.
- Use separate Convex development and production deployments.
- Add preview deployments only when CI or review workflows need them.
- Keep environment-specific Google OAuth, auth-session, Paddle, optional analytics and domain configuration separate.
- Use a production-scoped `CONVEX_DEPLOY_KEY` in CI; the existing personal CLI token is for interactive development only.
- Deploy the backoffice as static React assets on Cloudflare Workers. It talks to BFF through the public endpoint or an internal backoffice client.
- Use Convex's generated domains during development. A Convex custom API domain requires Professional and can wait until launch.

## Cost posture

The intended pre-launch baseline is zero provider subscription cost:

- Convex Free for development
- Better Auth runs in Convex; no separate hosted authentication subscription
- Google OAuth credentials when login is introduced
- Cloudflare Free for static assets/DNS within its limits
- No PostHog account until product interaction analytics require it
- No Resend account until a transactional email flow requires it
- Paddle transaction fees only when payments occur

The expected first fixed production cost is Convex Professional at $25/month for a solo developer. Cloudflare Workers Paid starts at $5/month if free limits or product workloads require it. Prices and provider terms must be rechecked before a paid commitment.

## Consequences and guardrails

Benefits:

- Minimal server and database operations
- One TypeScript implementation surface
- Existing local Convex knowledge and reusable patterns
- Atomic mutations, scheduled work, webhooks and real-time backoffice updates
- Fast local-to-hosted deployment

Tradeoffs:

- Stronger Convex vendor coupling inside the BFF service
- No SQL or general join/aggregation layer
- Function-level authorization requires disciplined reusable guards
- Production backups/custom domains require a paid Convex plan
- The Convex Better Auth component and pinned Better Auth version add an upgrade surface

Required guardrails:

- All public functions deny by default and use shared project/account authorization helpers.
- Products never import BFF Convex internals.
- Billing and identity integrations have verified, idempotent webhook handling.
- Important queries have indexes and bounded reads.
- Support submission is authenticated, rate-limited and isolated by user/account/project; public pages expose a contact path without exposing the support queue.
- Secrets never enter git, documentation, task notes or chat.
- Export and recovery procedures exist before meaningful production use.

## Alternatives considered

### Supabase/PostgreSQL plus a Node API

This remains attractive for SQL reporting, relational constraints and portability. It was not selected for the MVP because it adds more service, migration, authorization and deployment work, while the founder already has meaningful Convex experience. Reconsider it if reporting complexity, compliance, portability or unsupported database access patterns become material.

### Clerk or another hosted identity platform

These provide managed user administration and broader authentication features, but add another vendor, account and configuration surface. They are not needed for the initial Google-only flow. Reconsider one if production requirements such as enterprise SSO, mature abuse controls, advanced account recovery or auth operations exceed the Convex-hosted solution.

### Convex Auth

It also avoids a hosted identity vendor and is the quickest Convex-native option, but Convex currently labels it beta and warns that it may change incompatibly. Better Auth is selected because the provider adapter and account model make the Google-first, Apple-later path explicit. Reconsider this choice when C04 begins if either integration's current support materially changes.

### Direct Google token handling

Calling Google directly without a session/authentication library appears smaller but would make BFF responsible for callback security, state/nonce validation, sessions, rotation, logout and account linking. That is security-sensitive custom infrastructure and is not selected.

### Fastify on the existing VPS

It provides control and predictable hosting but adds patching, deployment, backup, scaling and availability work. The VPS may still host specialized product workloads that do not fit Convex.

### Cloudflare as the BFF server/database

Workers and Cloudflare data products can be valuable for product-specific edge workloads, but adopting them for the BFF core would discard the existing Convex advantage. Cloudflare remains the web asset/DNS provider.

## Revisit triggers

Re-evaluate this ADR if any of the following occurs:

- BFF reporting needs become dominated by complex relational joins or ad-hoc SQL.
- Convex cost materially exceeds an equivalent managed PostgreSQL/API design.
- Required residency, compliance, backup or SLA guarantees are unavailable.
- A product needs direct BFF access from an unsupported runtime and the HTTP boundary is insufficient.
- Repeated authorization or data-model friction shows the document model is the wrong fit.
- The Better Auth Convex component proves unstable, incompatible with a required client, or costly to maintain.
- Vendor exit requirements become a near-term business constraint.
