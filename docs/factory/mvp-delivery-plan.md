# Business Factory — MVP Delivery Plan

Prepared: 2026-09-21.

Based on [Business Factory — BFF MVP Architecture](../architecture/bff-mvp-architecture.md). The architecture is preserved unchanged. This plan organizes its broad work areas and adds the manual handoffs needed to execute them.

## Current status

Nirvana has been updated and read back to verify:
- **Business Factory — MVP — Codex:** 14 open work areas (13 implementation areas plus the documentation commit).
- **Business Factory — MVP — Manual:** 10 open actions; the already completed GitHub setup remains completed.
- **Business Factory — Post-MVP:** 7 optional work areas with explicit Codex/Manual ownership.

All three projects are in the Personal area. Existing tasks were reused and moved where appropriate; historical trashed tasks were left alone.

The target repository is [kabytaa/bff](https://github.com/kabytaa/bff). It was empty when inspected. Uploading the architecture returned **403 Resource not accessible by integration**, so no file has been committed. M00 tracks restoring write access and C00 tracks committing these prepared files. No implementation work has been performed as part of this planning update.

This document is a planning snapshot. Nirvana is the task-status source; dependencies are written in notes and do not automatically advance tasks.

## Scope and ownership

Use one Nx monorepo. Each Business Project owns its workloads, backend, docs, libraries, infrastructure and assets under `projects/<id>`. BFF provides the shared service, SDK/contracts and central backoffice under `platform/bff`.

Nx and Paddle are chosen in the architecture. The BFF service/database/auth stack and hosting are still decisions to make in C02. Convex, web/mobile, specific product databases and media tooling remain choices per Business Project.

Codex owns implementation, technical proposals, configuration, integration, verification and runbooks. Andrew owns the business idea, account ownership/verification, paid commitments, access handoff, public launch review and initial distribution.

Keep these as broad work areas. Break down one area when work begins. There are no invented deadlines, duration estimates or assumptions that an unfinished setup is complete. Credentials belong in the selected secret store, never in the repo or task notes.

## Suggested execution order

1. **Start now:** C01 Nx foundations and C02 architecture/contracts. Andrew handles M00 GitHub access, M01 the first idea/validation target and starts M05 Paddle onboarding.
2. **Establish the core:** C03 service and registry, then C04 identity/accounts. After C02, M02 confirms provider/cost commitments and activates M03/M04/M06 account/access work. Hosted setup should not block local implementation.
3. **Prove one end-to-end path:** Build C05 billing and C06 attribution with C07 SDK modules alongside them. Start C11 product-specific work as soon as M01 and C01 are ready. Keep the idea tiny.
4. **Make it operable and reusable:** C08 backoffice, C09 deployments/runbooks and C10 Codex skill, refined against the first product. Andrew performs M07 launch-content and support review.
5. **Prove production and reuse:** C12 technical deployment and verification, M08 manual acceptance and real traffic, plus C13 a technically different second-project skeleton.
6. **Review learning:** M09 evaluates the pre-agreed continue/iterate/kill criteria. Product success and factory completion are separate decisions.

C00 can complete as soon as M00 unblocks GitHub. It does not need to block local design or implementation.

## Codex work

| ID | Work area | Initial list | Dependencies |
| --- | --- | --- | --- |
| C00 | Commit architecture and MVP plan to the repository | Later | M00 |
| C01 | Bootstrap the Nx monorepo and ownership boundaries | Next (Focus) | None; C00 is only the documentation-publishing blocker |
| C02 | Define the BFF stack, data model and public contracts | Next | None; coordinate conventions with C01 |
| C03 | Build the BFF service and project registry | Later | C01, C02; M02/M03 only for hosted provisioning |
| C04 | Implement identity, accounts, memberships and authentication | Later | C02, C03; M06 for the selected hosted login configuration |
| C05 | Implement Paddle billing, subscriptions and entitlements | Later | C03, C04; M05 for seller credentials and production activation |
| C06 | Implement business events, analytics and acquisition attribution | Later | C03, C04; integrate payment attribution with C05; M06 for PostHog credentials |
| C07 | Build the public BFF SDK and integration examples | Later | C02, C03; implement modules alongside C04-C06 |
| C08 | Build the central MVP backoffice | Later | C03-C07 |
| C09 | Set up deployments, secrets, CI and operating runbooks | Later | C01-C03; M02-M04 and relevant M05/M06 credentials for hosted services |
| C10 | Create the Codex Business Factory skill | Later | C01, C02, C07, C09; refine against C11 |
| C11 | Build the first tiny Business Project | Later | M01, C01; wire C04-C07 and C09 as available |
| C12 | Deploy and verify the first production product | Later | C05-C09, C11; M03-M07 |
| C13 | Prove reuse with a technically different second project | Later | C07, C10, C11; run once the first integration is stable |

### C00 — Commit architecture and MVP plan to the repository

**Owner:** Codex  
**Priority:** Must for MVP  
**Dependencies:** M00

**Done when:** Commit the supplied architecture unchanged to docs/architecture/bff-mvp-architecture.md and the execution plan to docs/factory/mvp-delivery-plan.md in kabytaa/bff. Add a short README linking both. Verify the files on GitHub.

Attempted 2026-09-21; GitHub rejected the write with 403 Resource not accessible by integration. Nothing has been committed.

### C01 — Bootstrap the Nx monorepo and ownership boundaries

**Owner:** Codex  
**Priority:** Must for MVP  
**Dependencies:** None; C00 is only the documentation-publishing blocker

**Done when:** Create one Nx workspace with platform/bff, projects/<business-project>, tools and docs. Define a small project.yaml schema and only necessary folders. Establish Nx tags/public SDK and contract boundaries; reject cross-product internals and BFF service imports. Document local commands and add basic CI.

Replaces the old reusable starter-repo approach. Each business owns its documentation, workloads, backend, libraries, assets and infrastructure inside this monorepo. Convex is optional per product.

### C02 — Define the BFF stack, data model and public contracts

**Owner:** Codex  
**Priority:** Must for MVP  
**Dependencies:** None; coordinate conventions with C01

**Done when:** Propose and record the BFF service/database/auth/hosting choices in an ADR with minimal cost and setup needs. Specify project and environment scoping, user identity linking, project-owned accounts/memberships/roles, billing, entitlements, events and attribution. Define the API, trusted identity flow and migration approach.

Architecture leaves the BFF implementation stack open. Propose the technical choices; M02 covers Andrew's cost/account commitments. Do not require every Business Project to adopt the BFF backend technology.

### C03 — Build the BFF service and project registry

**Owner:** Codex  
**Priority:** Must for MVP  
**Dependencies:** C01, C02; M02/M03 only for hosted provisioning

**Done when:** Implement the service foundation, durable schema/migrations, API validation/errors and health checks. Support projects, environments, domains/config and workload metadata. Supply local development/seed data and a clear boundary around platform internals.

Local development can proceed before hosted credentials are supplied.

### C04 — Implement identity, accounts, memberships and authentication

**Owner:** Codex  
**Priority:** Must for MVP  
**Dependencies:** C02, C03; M06 for the selected hosted login configuration

**Done when:** Deliver users, project-scoped accounts, memberships/roles and one reusable login method. Support multiple users per account and users in multiple accounts, with server-side access enforcement and environment/project isolation. Keep login UX in the product. Verify cross-account and cross-project access denial.

Moved into MVP from Post-MVP because the supplied architecture requires it. Additional login providers and polished invitation UX can follow actual product need.

### C05 — Implement Paddle billing, subscriptions and entitlements

**Owner:** Codex  
**Priority:** Must for MVP  
**Dependencies:** C03, C04; M05 for seller credentials and production activation

**Done when:** Implement account-scoped customers, products/prices, checkout, transactions, subscription lifecycle and entitlement queries. Isolate Paddle details; validate webhook signatures, deduplicate/replay events and handle event ordering. Verify subscription, one-time purchase and cancellation access behavior in sandbox; include manual grant support.

Sandbox implementation can proceed before seller approval. Production checkout is blocked until the required seller/site approvals and production configuration are complete.

### C06 — Implement business events, analytics and acquisition attribution

**Owner:** Codex  
**Priority:** Must for MVP  
**Dependencies:** C03, C04; integrate payment attribution with C05; M06 for PostHog credentials

**Done when:** Standardize project/environment, visitor/session, user/account, UTM, referrer and landing-page context. Link anonymous traffic through signup and account to payment. Persist canonical business events; send product interaction data to PostHog. Define attribution rules and a basic funnel with deduplication. Support simple manual campaign cost inputs for source-versus-revenue inspection.

Use real server-validated billing outcomes for revenue. Do not rebuild PostHog or automate advertising platforms.

### C07 — Build the public BFF SDK and integration examples

**Owner:** Codex  
**Priority:** Must for MVP  
**Dependencies:** C02, C03; implement modules alongside C04-C06

**Done when:** Provide typed public contracts and transport/auth/error handling for auth, accounts, billing, entitlements, analytics, projects and config. Keep the core independent of React and backend technology. Demonstrate browser and Node consumers; restrict privileged APIs to authorized callers.

Products use the public SDK/API instead of platform implementation imports. Add platform-specific adapters only where needed.

### C08 — Build the central MVP backoffice

**Owner:** Codex  
**Priority:** Must for MVP  
**Dependencies:** C03-C07

**Done when:** Provide an admin-protected view across projects/environments, workloads/domains/integrations, users/accounts/memberships, subscriptions/payments/revenue and entitlements. Show acquisition sources/campaigns, signups and basic conversion funnels. Audit privileged changes such as manual grants.

The basic cross-project backoffice belongs in MVP. Advanced BI, financial reporting and polished design remain in Post-MVP.

### C09 — Set up deployments, secrets, CI and operating runbooks

**Owner:** Codex  
**Priority:** Must for MVP  
**Dependencies:** C01-C03; M02-M04 and relevant M05/M06 credentials for hosted services

**Done when:** Set up independent workload deployments, environment separation, CI checks, configuration templates, server-side secret storage, HTTPS/domains, basic health/error monitoring, backup/recovery and rollback steps. Keep credentials out of git and Nirvana. Document local, test and production operations.

Use the existing VPS where appropriate; do not purchase services. Sophisticated orchestration and advanced observability are deferred.

### C10 — Create the Codex Business Factory skill

**Owner:** Codex  
**Priority:** Must for MVP  
**Dependencies:** C01, C02, C07, C09; refine against C11

**Done when:** Write and validate a repository skill that creates a Business Project manifest, only required docs/workloads, Nx tags and BFF integration. Cover registry, auth/billing when required, analytics/attribution, deployment and ADRs. Validate it with the first project and the second reuse test.

Codex creates projects; BFF does not generate applications. No new repository per idea and no forced Convex/web/mobile/Remotion stack. Read the skill-creator instructions when implementing this work area.

### C11 — Build the first tiny Business Project

**Owner:** Codex  
**Priority:** Must for MVP  
**Dependencies:** M01, C01; wire C04-C07 and C09 as available

**Done when:** Build the smallest usable product under projects/<id>, with its own product/technical/marketing/analytics docs, manifest and chosen workloads/backend. Exercise BFF user/account lifecycle, login, acquisition analytics and paid access. Include a minimal landing/pricing/support experience for review.

The purpose is to prove the factory. Keep product scope tiny; optional mobile and Remotion workloads only when the chosen experiment needs them.

### C12 — Deploy and verify the first production product

**Owner:** Codex  
**Priority:** Must for MVP  
**Dependencies:** C05-C09, C11; M03-M07

**Done when:** Deploy BFF, backoffice and the first product using approved access. Verify a tracked visit -> login -> account -> checkout -> webhook -> entitlement -> revenue/funnel view. Check a denied access case, duplicate webhook handling and recovery instructions. Provide a concise acceptance checklist and launch URLs to Andrew.

Technical release is Codex work. Andrew performs M08 manual acceptance and initial distribution; real external traffic and provider production activation are required for MVP completion.

### C13 — Prove reuse with a technically different second project

**Owner:** Codex  
**Priority:** Must for MVP  
**Dependencies:** C07, C10, C11; run once the first integration is stable

**Done when:** Use the skill to create a second Business Project skeleton with a different frontend/runtime or different/no product backend. Demonstrate BFF integration, Nx ownership isolation and independent configuration without redesigning BFF. Document any gaps and fix reusable issues.

A skeleton and integration demonstration suffice; no second public launch, store account or paid acquisition required. This is an MVP exit criterion.


## Andrew's manual work

| ID | Work area | Initial list | Dependencies |
| --- | --- | --- | --- |
| M00 | Enable GitHub integration write access to kabytaa/bff | Next (Focus) | None |
| M01 | Choose the tiny first idea and validation target | Next (Focus) | None |
| M02 | Confirm proposed providers, budget and paid commitments | Later | C02 |
| M03 | Provision the selected backend accounts and access | Later | M02 |
| M04 | Provide hosting, domain and DNS access | Later | M02 |
| M05 | Complete Paddle seller onboarding and production approval | Next | Start now; final site/domain review follows M04 and C11 |
| M06 | Provide authentication and analytics account access | Later | C02, M02 |
| M07 | Review launch offer, policies and support contact | Later | M01, C11; coordinate seller/site requirements with M05 |
| M08 | Accept the live flow and bring the first real traffic | Later | C12, M07; M05 production activation |
| M09 | Review validation results and decide the next move | Later | M08 and the observation window defined in M01; use C08 reports |

### M00 — Enable GitHub integration write access to kabytaa/bff

**Owner:** Andrew (manual)  
**Priority:** Must for MVP  
**Dependencies:** None

**Done when:** Authorize the GitHub connection to write repository contents for kabytaa/bff, then ask Codex to retry C00. Read access already works.

2026-09-21 write attempt returned 403 Resource not accessible by integration. This is separate from the completed GitHub CLI authentication on the VPS.

### M01 — Choose the tiny first idea and validation target

**Owner:** Andrew (manual)  
**Priority:** Must for MVP  
**Dependencies:** None

**Done when:** Choose the target audience, problem, smallest useful feature, proposed pricing and first traffic source. Write measurable continue/kill criteria and a time/spend limit. Pick a tiny product that can exercise login, accounts, acquisition tracking and payments.

Codex can draft options; Andrew owns the business choice. Success of the idea itself is not required to validate the reusable foundation.

### M02 — Confirm proposed providers, budget and paid commitments

**Owner:** Andrew (manual)  
**Priority:** Must for MVP  
**Dependencies:** C02

**Done when:** Review Codex's technical proposal and confirm which provider accounts and ongoing costs you accept. Confirm the BFF hosting/database/auth direction and first-product needs. Record decisions so setup tasks can be activated.

No need to register every provider in advance. The architecture specifies Nx and Paddle but does not mandate Convex or a single hosting/frontend stack.

### M03 — Provision the selected backend accounts and access

**Owner:** Andrew (manual)  
**Priority:** Must for MVP  
**Dependencies:** M02

**Done when:** Create or confirm only the backend/database account/team selected for BFF or the first product. Complete account login/billing steps and grant Codex the minimum necessary access using the secret store.

If Convex is selected, use local project dependencies and separate deployments/projects as appropriate; do not install it globally. Product backend code/config stays under that Business Project in the Nx monorepo. If Convex is not selected, use the chosen provider instead.

### M04 — Provide hosting, domain and DNS access

**Owner:** Andrew (manual)  
**Priority:** Must for MVP  
**Dependencies:** M02

**Done when:** Confirm the hosting account and existing VPS access needed by the chosen deployment. Choose a domain if launch/provider requirements need one, complete any purchase, and provide DNS/Cloudflare permissions where used. Put restricted credentials in the approved secret store.

A separate purchased domain for every experiment is not assumed. Codex handles deployment and DNS configuration once authorized; Andrew handles ownership, checkout and account access.

### M05 — Complete Paddle seller onboarding and production approval

**Owner:** Andrew (manual)  
**Priority:** Must for MVP  
**Dependencies:** Start now; final site/domain review follows M04 and C11

**Done when:** Create/confirm the seller account, complete business/identity verification and payout details, and provide sandbox access securely. Complete the required website/domain and production approval steps when the first site is ready.

Codex implements checkout/webhooks/catalog configuration; Andrew supplies seller information, verification and approval submissions. Do not put documents or API secrets in task notes. Production billing is gated by provider approval.

### M06 — Provide authentication and analytics account access

**Owner:** Andrew (manual)  
**Priority:** Must for MVP  
**Dependencies:** C02, M02

**Done when:** Create/confirm the selected identity/OAuth and PostHog accounts. Complete owner-only consent, verification and credential-grant steps, using the configured secret store. Confirm the chosen region/settings as part of the implementation handoff.

Codex creates integration/configuration and callback instructions. Transactional email provider setup is conditional on choosing an email-dependent login or product flow; it is not an automatic MVP prerequisite.

### M07 — Review launch offer, policies and support contact

**Owner:** Andrew (manual)  
**Priority:** Must for MVP  
**Dependencies:** M01, C11; coordinate seller/site requirements with M05

**Done when:** Approve the public product name/message, price, refund/cancellation wording, privacy/terms drafts and a working support address. Check the launch copy matches the real product and seller details; obtain professional input if you need it.

Codex prepares drafts/pages. A branded mailbox is optional; a working contact address is part of launch readiness.

### M08 — Accept the live flow and bring the first real traffic

**Owner:** Andrew (manual)  
**Priority:** Must for MVP  
**Dependencies:** C12, M07; M05 production activation

**Done when:** Use the product yourself on the target device and complete the agreed live payment verification with your approval. Publish/share the tracked launch link through the chosen audience/channel. Record campaign spend, initial feedback and the review date.

Codex supplies the acceptance checklist, tracked links and analytics. Andrew owns outbound posting/outreach, any advertising spend and launch acceptance. No automatic messages or purchases are authorized by this planning task.

### M09 — Review validation results and decide the next move

**Owner:** Andrew (manual)  
**Priority:** Must for the learning review  
**Dependencies:** M08 and the observation window defined in M01; use C08 reports

**Done when:** Compare traffic, activation, conversion, revenue and spend with the pre-agreed criteria. Record continue/iterate/kill and the reason. Separately confirm that all factory exit criteria, including C13 reuse, are met.

Do not confuse a failed product hypothesis with a failed foundation. Scale spend only after a deliberate decision.


## Post-MVP

These tasks are in Someday. Conditional items move earlier only when the selected product flow requires them.

| Owner | Work area |
| --- | --- |
| Andrew | Set up a branded support/contact mailbox |
| Andrew | Set up transactional email provider access when needed |
| Codex | Add advanced cross-product observability |
| Andrew | Decide Apple sign-in and provide developer access if needed |
| Codex | Harden proven platform and deployment patterns |
| Codex | Extend cross-project reporting and experiments |
| Codex | Add optional email and authentication integrations |

The architecture also defers automated campaigns/content strategy, sophisticated A/B, full CRM, advanced support/referrals, generic email marketing, advanced financial reporting, automatic technology selection, sophisticated deployment orchestration and polished backoffice design. Do not add these to the critical path without demonstrated need. BFF application generation is outside the chosen model; Codex creates projects.

## MVP exit criteria

- The Nx monorepo enforces business ownership boundaries.
- BFF has a reusable service, public SDK/contracts and protected central backoffice.
- Projects/environments, users/accounts/memberships, authentication, payments/subscriptions, entitlements, business analytics and acquisition attribution work end to end.
- One intentionally tiny real product runs in production with BFF integration, production payment capability, analytics and real external traffic.
- Codex can use the Business Factory skill to create a technically different second-project skeleton without redesigning BFF.
- Andrew can inspect the validation signals and record a business decision.

A successful business hypothesis is not a prerequisite for factory completion. A large feature backlog is not proof of reuse.

## Changes from the previous Nirvana plan

- Replaced the reusable starter-repo task with one Nx monorepo and business-owned folders.
- Moved reusable authentication, the basic central dashboard and Codex project-creation conventions from Post-MVP into MVP.
- Split technical deployment from Andrew's launch acceptance and distribution.
- Made Convex/backend provisioning conditional on the chosen stack.
- Preserved completed GitHub CLI setup; tracked the separate integration write-access failure explicitly.
- Kept dependent work in Later and optional work in Someday. Focus contains C01, M00 and M01.
