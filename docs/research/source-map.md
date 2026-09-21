# Business Factory source map and reconciliation

Updated: 2026-09-21.

This file records the source material recovered from the machine and Google Drive, and how it should influence current decisions. It prevents an older proposal or product-specific report from silently becoming an adopted BFF decision.

## Governing repository documents

1. [BFF MVP architecture](../architecture/bff-mvp-architecture.md) — current architectural source: one Nx monorepo, centralized BFF service/SDK/backoffice and technology-independent Business Projects.
2. [MVP delivery plan](../factory/mvp-delivery-plan.md) — work ownership, dependencies and exit criteria.
3. [ADR 0001 — Convex-first BFF stack](../architecture/adr/0001-convex-first-bff-stack.md) — accepted implementation decision for BFF.
4. [Provider accounts, access and secrets](../operations/provider-accounts-and-secrets.md) — manual setup and credential handoff.

When these documents disagree with an older reference, the current architecture and accepted ADRs govern implementation.

## Google Drive BFF folder

[BFF Google Drive folder](https://drive.google.com/drive/folders/1LeiEKJf25E11MLWi4jeIW1FGiLA9QNpz)

### Business Factory Blueprint

[Business-Factory-Blueprint.docx](https://drive.google.com/file/d/1OPSf8NTOd9RtSW5TrESvaZMCc8fuNFTn/view)

Status: reference proposal, not an adopted implementation decision.

It recommends separate repositories/deployments/databases using Next.js, Vercel and Supabase. It also provides useful experiment stages, scoring, billing correctness, analytics and operating guardrails. The current one-monorepo, centralized-BFF architecture supersedes its repository and shared-platform topology.

### Business Factory Workbook

[Business-Factory-Workbook.xlsx](https://drive.google.com/file/d/1R3rpSaRetSUL2XHDrqIgumgxptIwzsLM/view)

Status: operating template with illustrative and planned data.

It contains ten worksheet areas: an experiment dashboard, contribution/CAC calculator, portfolio, experiment records, idea scoring, criteria, retention cohorts, billing snapshots, standard events, and sources/assumptions. BF001–BF005 are CatalogFix, ContentChase, TableCards, PracticeLoop and WorkshopRun. Most metrics are blank plans or explicitly fictional demo data; do not treat them as validation results.

### Micro-Product Business Analysis

[Micro-Product Business Analysis](https://docs.google.com/document/d/17w49zIH6UwgAdQurZeWMDlKoVCcXLe99-2HGiUe_tX8/edit)

Status: new idea research and hypothesis, not a selected first product.

The report ranks a Stripe Webhook Dead Letter Queue/proxy first at 4.25/5 with high stated confidence. It proposes a $9–$12/month developer product and explicitly exercises BFF attribution, authentication, Paddle subscription entitlements and analytics. It suggests PostgreSQL for product payloads and a Cloudflare Worker proof of concept. It does not evaluate or select the BFF server/database stack.

Important reservations before selecting that idea:

- Claims such as “zero legal liability” are not credible for a service processing financial webhook payloads.
- Stripe retry/timeout behavior, competitor prices and the alleged market gap require current primary-source verification.
- Trust, security, data retention and uptime are core product requirements, not secondary polish.
- Returning success to Stripe is safe only after signature verification and durable receipt; forwarding/replay must be loss-resistant and idempotent.
- The proposed cold outreach and willingness-to-pay assumptions still require direct validation.

Only one obvious new idea-research report is present in the BFF Drive folder. A second Claude/Gemini report is not currently visible there.

## Prior Convex research outside the BFF folder

### Convex + React Native AI Podcast Studio

[Technical implementation strategy](https://docs.google.com/document/d/1EuNh_OZO7SQAgSxj1QkABBQyRzQQ8aJ4JWrIiOQgMwE/edit)

Status: product-specific technical precedent.

It explicitly recommends Convex with React Native/Expo, Convex workflows/workpools/storage/crons and Clerk authentication. This supports team familiarity with the chosen tools but does not by itself decide the BFF architecture.

### Generative AI Podcast PRD Design

[Podcast PRD](https://docs.google.com/document/d/1knXSRKdsQ2EOjdXKF-H6IodpfS03uPDmiXt64512r5I/edit)

Status: product-specific product/technical research.

It selects React Native + Convex for reactive generation state and media workflows. It is relevant evidence of prior Convex reasoning, not a shared-platform specification.

## Local machine evidence

- `/root/podcat` contains a real Convex application with schema, functions, payments/webhooks, cron/scheduling and deployment configuration.
- The Convex CLI has an authenticated local user token. The token value was not read into documentation or exposed.
- Podcat's email-based `signInOrCreate` mutation is not secure authentication and must not be copied into BFF.
- An older Business Factory workspace and extracted blueprint exist under `/root/Documents/Codex/2026-09-15/new-realtime-voice-chat/business-factory/`.
- A prior duplicate of the current BFF planning repository exists under `/root/Documents/Codex/2026-09-10/check-your-server-permissions-and-verify/bff/`.

Machine-specific paths are recovery clues only. Repository documents and linked Drive sources are the durable project memory.

## Current reconciliation

- **Accepted BFF backend:** Convex.
- **Accepted authentication approach:** Better Auth hosted in Convex, with Google as the only initial identity provider; Clerk is not required and Apple is conditional.
- **Accepted web/DNS provider:** Cloudflare for static assets and DNS, not the BFF database.
- **Accepted billing provider:** Paddle.
- **Accepted MVP support approach:** BFF/Convex support requests, manual backoffice triage and user-visible responses, with a public support-address fallback; AI automation is later.
- **Optional product analytics provider:** PostHog, only when canonical BFF events are insufficient.
- **Still open:** first Business Project selection and its product-specific backend/edge/storage choices.

The first product may use different infrastructure. For example, a webhook-reliability product could use a Cloudflare edge ingress while relying on BFF/Convex for accounts, billing, entitlements and attribution.
