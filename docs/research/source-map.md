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

### Recovered first-product candidates and founder preference

The blueprint's section 18 defines TableCards as a guest-list-to-printable-place-card-PDF utility and ContentChase as a client-content checklist, upload and reminder workflow. The older local memo at `/root/Documents/Codex/2026-09-15/new-realtime-voice-chat/business-factory/docs/BUSINESS_FACTORY.md` records a preference for TableCards buyers who repeat the job—planners, venues, print shops and event producers—and for ContentChase agencies with concurrent projects. Its platform topology is historical; the current BFF ADR still governs.

On 2026-09-21 the user asked for an easier project and delegated the choice, requesting an Astra reviewer. The working choice is **TableCards** because it has a smaller controllable core than accessibility scanning or a multi-party content-reminder workflow. The original one-event purchase idea was superseded on 2026-09-24 by Free, Personal Pro and Studio subscription hypotheses. This is a scope choice, not validated market demand; the current decisions live in the [TableCards MVP product specification](../products/tablecards-mvp.md).

[Place Card Me](https://www.placecardme.com/our-printable-place-cards/) already supports guest-list import, automatic layout and printable PDF export. Batch generation is therefore not a unique advantage. The pilot must establish why a repeat professional buyer prefers our workflow. ContentChase remains a second candidate; [Content Snare](https://contentsnare.com/pricing/) is an established request/upload/reminder alternative. See the [living comparison](../../.agent/brainstorms/first-business-project.md) for scope, tradeoffs and open questions.

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

The newer [Google Doc copy](https://docs.google.com/document/d/1_6CepogJGniZm14wFCJNYWDdBvhtTr4ISqjAom5JpJ0/edit) has exactly the same extracted text as this report. Treat it as a duplicate, not a second independent research result.

### WCAG/EAA accessibility audit-tool analysis

[WCAG/EAA Accessibility Audit Tool for Web Freelancers](https://drive.google.com/file/d/12JUc2TyUjS4_Sz_LcK_YtijAA93KmBqn/view)

Status: independent idea research; previously recommended, now parked in favor of TableCards after the user prioritized a simpler first implementation.

The report recommends a client-ready automated accessibility report for solo web freelancers and small studios. It proposes a free preview followed by a paid branded report, accessibility statement and re-scan. Its strongest insight is the buyer/workflow choice: sell a useful client deliverable to practitioners rather than promise end businesses automated legal compliance.

Important reconciliation before selection:

- Use the narrower “automated accessibility snapshot” framing. Do not advertise a compliance audit, certification, legal advice or guaranteed WCAG/EAA conformance.
- Start with one public page or a very small user-selected set, a prioritized report and explicit manual-review checklist. Defer a crawler, overlay, auto-fix, enterprise monitoring and unqualified accessibility-statement generation.
- Automated testing has a real coverage ceiling. The report must visibly separate detected findings, checks that passed and items requiring human review.
- EAA scope is not “all websites.” Covered services and national implementation must be described cautiously; [the Council of the EU](https://www.consilium.europa.eu/en/policies/accessibility-goods-services/) confirms the 28 June 2025 application date and a service micro-enterprise exemption.
- The [FTC accessiBe case](https://www.ftc.gov/legal-library/browse/cases-proceedings/2223156-accessibe-inc) reinforces that automated-compliance claims need substantiation.
- The demand evidence remains indirect. Require paid pre-purchases/deposits or another behavioral commitment before treating freelancer willingness to pay as validated.
- The product can use open-source browser tooling on the existing VPS initially, so no paid scanner API or new provider account is required. URL scanning still needs strict public-network and resource limits.

The living comparison and current recommendation are recorded in [First Business Project brainstorm](../../.agent/brainstorms/first-business-project.md).

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
- **Accepted authentication approach:** Build 1's fixed operator dashboard uses direct Google OIDC plus a server-side allowlist. Build 2 selects the supported Business-user mechanism behind the BFF adapter, with Google as the only initial provider; Clerk is not required and Apple is conditional.
- **Accepted web/DNS provider:** Cloudflare for static assets and DNS, not the BFF database.
- **Accepted billing provider:** Paddle.
- **Accepted MVP support approach:** BFF/Convex support requests, manual backoffice triage and user-visible responses, with a public support-address fallback; AI automation is later.
- **Optional product analytics provider:** PostHog, only when canonical BFF events are insufficient.
- **Working first Business Project:** TableCards, selected under the user's delegated choice for a simpler first implementation; demand and pricing remain unvalidated.
- **Accepted TableCards output:** US launch, Latin-script names without RTL, one 3.5 × 2 inch folded tent-card format on US Letter, four per sheet.
- **Accepted TableCards account direction:** Google is required to use the generator, while the internal identity model remains ready for multiple login providers; Studio supports explicit invitations and up to 20 seats without domain joining.
- **Still open:** reachable pilot users, final free/paid export boundary, Studio invite delivery and launch marketing/attribution.

The first product may use different infrastructure. For example, a webhook-reliability product could use a Cloudflare edge ingress while relying on BFF/Convex for accounts, billing, entitlements and attribution.
