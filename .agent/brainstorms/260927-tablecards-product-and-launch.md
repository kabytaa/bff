# Brainstorm: TableCards Product and Launch Direction

> **Status**: Accepted — Ready for planning
> **Created**: 2026-09-27
> **Last updated**: 2026-09-27
> **Repository baseline**: `328e108`

## Context Snapshot

- Build 2 shared identity, accounts and SDK is complete in development and production. There is no TableCards workload or product data model yet.
- The canonical [TableCards MVP specification](../../docs/products/tablecards-mvp.md) currently assumes Google sign-in before generator use, pasted/CSV names with optional table number, one 3.5 × 2 inch folded format on US Letter, three Free designs, paid custom background presets, $9 Personal Pro and $19 Studio subscriptions, and up to 20 Studio members.
- The [MVP delivery plan](../../docs/factory/mvp-delivery-plan.md) assigns the deterministic generator and PDF to Build 3, real Paddle subscriptions/team commercial behavior to Build 4, support to Build 5, operational visibility/backoffice to Build 6 and launch to Build 7.
- The [2026-09-27 market-research report](../../docs/research/260927-tablecards-market-research.md) found direct support for the physical format and a 25-card Free boundary, but also found strong one-time event pricing, Excel/Sheets expectations and lower-friction alternatives. It identifies print reliability and spreadsheet handling—not generic design—as the core buyer value.
- Andrew proposed a usable but smaller Free card limit, optional AI-generated backgrounds using a cost-efficient model, four choices from one generation action and a reusable BFF account-unit/balance concept. Research found image generation economically feasible but did not establish buyer demand or the right allowance.
- The previously deferred [usage-based billing and account credits](../../docs/architecture/future-ideas.md#usage-based-billing-and-account-credits) concept is now relevant because AI image batches are a concrete variable-cost caller. It remains an idea until this brainstorm decides whether the reusable ledger is justified.
- Andrew decided that Build 3 has only the deterministic test/development payment and entitlement mock needed by its real feature gates. Live Paddle checkout, webhooks and subscription lifecycle remain Build 4.
- TableCards delivers a downloadable PDF only. It does not print or ship cards, supply cardstock or provide a reprint service; the customer prints independently or takes the PDF to a local printer. Pricing must therefore be compared primarily with other PDF-generation software, not fulfilled stationery.
- An independent Astra review rechecked the closest competitor offers and acquisition assumptions. It found the four-tier structure coherent enough to pilot, but emphasized that advertised competitor prices do not validate TableCards willingness to pay, the annual discounts are aggressive and a `$5` transaction cannot support broad paid acquisition without measured conversion and support economics.

## The Idea

Choose a research-informed TableCards product and launch shape before planning Build 3. The discussion covers one cohesive outcome: who TableCards first serves, what result Free and paid customers receive, how they import and retain event data, whether AI backgrounds and generic units belong in the first product slice, and how the first paying customers will be reached.

The goal is not to maximize feature count. It is to deliver the smallest trustworthy workflow a real buyer will choose over Canva, Avery templates, Word mail merge or a focused competitor, while still exercising the Business Factory's real product, entitlement and later payment boundaries.

## Codebase Context

### What We Have

- Production-proven BFF customer authentication, accounts, memberships, session lifecycle and one short account-context JWT.
- A technology-first TypeScript SDK with a Convex adapter, plus development-only deterministic login identities and real production Google authentication.
- Code-owned Business defaults, environment registration, a same-site session gateway and repeatable development/production deployment.
- An accepted account-owned subscription/entitlement direction for Build 4 and a deterministic payment mock boundary for Build 3.
- A minimal example Business that proves integration patterns without containing TableCards product behavior.
- A canonical fixed TableCards print contract and explicit physical 100%-scale acceptance requirement.

### Constraints

- No TableCards project, data schema, generator, asset storage or PDF renderer exists yet.
- Build 3 cannot pretend to have live payment or let a production visitor self-grant paid access.
- Guest names and lists are customer data and must not be sent to an image model or analytics provider.
- PDF output must remain deterministic even when a background was generated nondeterministically.
- The output must work with real printer margins, actual-size settings and optionally Avery 5302 geometry, not merely look correct in a browser.
- Each table, API and abstraction needs a real caller in its owning slice. A generic usage ledger is justified only if the accepted AI flow truly needs it.
- Research is desk evidence. Pricing, AI demand, team demand and acquisition cost remain unvalidated until real buyers act.

### Opportunities

- The generator can differentiate through a deliberately shorter spreadsheet-to-verified-PDF path rather than a general editor.
- A common entitlement contract can let Build 3 test Free/paid/credit behavior and let Build 4 replace only the commercial source of truth.
- Uploaded artwork and AI-generated artwork can share the same validated, print-safe background asset contract.
- A typed account-unit flow could become the first real reusable BFF consumption capability if it stays small and provider-independent.
- Direct planner and print-shop pilots can produce both product evidence and the real spreadsheets/artwork needed for regression fixtures.

## Options

### Option A: Professional Workflow First

**Approach**: Keep subscriptions as the primary commercial model and optimize for independent planners and studios. Free proves a small batch; Pro adds reusable client presets, event duplication and higher limits; Studio adds collaboration. AI is a paid professional convenience.

**Leverages**: The accepted account/team model, recurring Paddle direction and repeat-buyer hypothesis.

**Constraints**: The reachable professional market is smaller and requires direct selling. Current $9/$19 pricing and 20-seat Studio allowance appear low relative to adjacent professional tools.

**Effort**: Medium

**Risk**: Builds retention and collaboration features before evidence that professionals will switch; ignores the larger one-time buyer segment and may make first revenue slower.

### Option B: Event Pass Plus Professional Subscription

**Approach**: Offer a useful Free batch, a lower-priced one-time PDF Event Pass for occasional couples/hosts and a recurring Pro or Studio path for repeat professionals. Both use the same focused import, preflight and PDF engine. Saved presets, duplication, higher ongoing limits, included AI batches and collaboration distinguish recurring plans.

**Leverages**: Direct competitor segmentation, the existing account/entitlement boundary, the Build 3 payment mock and later Paddle products without changing the product engine.

**Constraints**: The landing and upgrade UX must distinguish “finish this event” from “run events repeatedly” without presenting a confusing price grid. Build 4 must support both a one-time entitlement and subscriptions.

**Effort**: Medium

**Risk**: More commercial states than subscription-only; a cheap Event Pass could cannibalize recurring plans if professional value is weak.

### Option C: AI-First Consumer Creator

**Approach**: Lead with prompt-to-four-background generation and make spreadsheet/PDF output the fulfillment layer. Free gets a small batch; credits or plans buy more visual generations and exports.

**Leverages**: The proposed four-choice generation experience, current low model costs and the deferred BFF units concept.

**Constraints**: Requires model integration, moderation, asset lifecycle and variable-cost controls before the core print promise is proven. Canva already provides broad design and AI capability.

**Effort**: High

**Risk**: Optimizes for a visually appealing demo rather than the recurring buyer pain. Output inconsistency, unwanted text/artifacts and provider failure can dominate support. AI is easy for competitors to add and is not a durable positioning advantage.

### Option D: Minimal One-Time Print Utility

**Approach**: Defer teams and AI, offer Free plus a one-time paid export/event package, and focus entirely on CSV/XLSX, uploaded artwork, preflight and exact output. Add recurring professional behavior only after repeat usage is observed.

**Leverages**: The smallest deterministic Build 3 and the strongest market evidence.

**Constraints**: Exercises less of the already accepted BFF account/team and usage architecture. Repeat buyers receive little reason to subscribe initially.

**Effort**: Low

**Risk**: May become a commodity utility with low customer lifetime value and limited room for paid acquisition, even if it is easy to understand.

## Resolved Questions

1. Launch uses Free, a one-time Event Pass and recurring Planner Pro/Studio offers; annual billing is withheld until retention is demonstrated.
2. Free supports a clean project of up to 25 cards. A larger imported list may be previewed in full but cannot be partially exported as a Free project. Free has one active saved project; no elaborate anti-splitting system is added without observed abuse.
3. A visitor may import and preview before authentication. Sign-in is required for save, export, AI generation and payment.
4. Launch import supports pasted lines, pasted spreadsheet grids, CSV and XLSX. Direct Google Sheets integration is deferred.
5. The import contract includes required name, optional table number and one optional short marker suitable for a meal, dietary or seat notation without becoming a caterer workflow.
6. Event Pass retains one editable event for 90 days. Planner Pro supports 25 active projects and Studio 100; archived projects do not count. After subscription cancellation, projects remain readable/exportable for 30 days, inaccessible for another 60 days and are then deleted after warnings.
7. Every paid project supports up to 500 cards.
8. Build 3 adds optional AI backgrounds only after deterministic designs and export work. One batch yields four choices and never receives guest-list data.
9. Free receives one lifetime welcome batch, Event Pass two batches, Planner Pro ten monthly batches and Studio thirty shared monthly batches. Monthly units do not roll over; provider failure releases the unit.
10. AI uses a small generic account-owned typed-unit balance with idempotent reserve, commit and release rather than putting mutable balances in a JWT.
11. Studio launches at `$19/month` for up to five members, not twenty. Team demand still requires real-team validation.
12. First acquisition is direct planner/stationer and print-shop discovery plus real-file pilots, followed by organic search/Pinterest material. Paid search waits for a working conversion path and uses one capped `$150–$200` experiment.
13. Paddle is the leading Build 4 provider, subject to written confirmation of Israeli onboarding/payouts and microtransaction terms. Build 3 remains provider-independent through its accepted deterministic mock.

## Accepted Direction

Option B, **Event Pass Plus Professional Subscription**, is accepted. The `$0 / $5 / $9 / $19` ladder is pilot pricing—not validated willingness to pay—with the one-event offer primary and recurring plans serving repeat professionals. A generic PDF, AI background or artwork upload is not a unique advantage: free competitors advertise all three. TableCards must instead prove reliable spreadsheet handling, correction, print preflight and reusable professional workflow with real event files.

The commercial experiment is Free 25, Event Pass `$5`, Planner Pro `$9/month` and Studio `$19/month` for five members. Annual offers are excluded from the MVP because the earlier `$59/$149` candidates discounted twelve monthly payments by approximately 45.4% and 34.6% without retention evidence. Public seller and filed-declaration evidence indicates Paddle has historically used a roughly 10% flat microtransaction schedule below `$10`, so its contact requirement is not evidence of a hard minimum; TableCards still needs a current written merchant quote covering one-time and recurring charges, discounts and Israeli payouts before Build 4 locks provider resources.

The first acquisition motion should be direct planner/stationer and print-shop validation: 50 carefully selected contacts, at least eight useful conversations, five observed real-file pilots and—once Build 4 billing exists—at least three independent full-price buyers. Broad paid acquisition is inappropriate until the self-service conversion rate, support minutes, refunds and contribution margin are measured.

The complete direction was accepted on 2026-09-27 and is ready for an implementation plan. Market gates remain evidence requirements rather than implementation blockers: pricing, AI demand, Studio demand and acquisition economics are hypotheses until real users act.

## Candidate Pricing Page Copy

The offer and entitlement scope below are accepted pilot decisions. The exact customer-facing wording remains draft copy until launch review.

### Header

**Simple pricing for print-ready PDFs**

Create the file here. Print it at home or send it to any local print shop. TableCards does not sell or ship printed cards.

No watermark on any plan. No printing or shipping charges from TableCards.

### For one event

#### Free — $0

For dinners, small celebrations and trying the complete workflow.

- Up to 25 cards in one active project
- Three polished designs
- Names and optional table numbers
- Full card and print-sheet preview
- US Letter, 3.5 × 2 inch folded cards
- Cut marks, fold marks and scale-check page
- Clean PDF without a watermark
- One lifetime welcome AI background batch producing four choices

**Button:** Create free PDF

#### Event Pass — $5 one time

For one wedding, party or event. No subscription.

- Up to 500 cards for one event
- Everything in Free
- Full premium design library
- Upload and validate your own background artwork
- Adjust name font, color, size and position
- Two AI background batches producing eight choices
- Edit and re-export the same event for 90 days
- Keep every downloaded PDF permanently

**Button:** Finish one event

Supporting line: Digital PDF files only. Paper, printing, cutting and shipping are not included.

### For professionals

#### Planner Pro — $9/month

For independent planners and designers who create cards repeatedly.

- Up to 25 active saved event projects, each supporting up to 500 cards
- Everything in Event Pass
- Reusable custom design presets
- Duplicate an earlier event or design
- Ten AI background batches each month; unused batches do not roll over
- One member

**Button:** Start Planner Pro

#### Studio — $19/month

For a small planning team sharing events and designs.

- Everything in Planner Pro
- Up to five members at launch
- Up to 100 active shared projects
- Shared projects and reusable presets
- Owner, Admin and Member roles
- Invitations and shared account access
- Thirty shared AI background batches each month; unused batches do not roll over

**Button:** Start Studio

The five-member launch decision deliberately replaces the unvalidated 20-member marketing promise. The generic account system can support a higher limit later without making that capacity a launch entitlement. Annual billing is withheld from the MVP until professional retention is observed.

### Pricing-page FAQ

**Does TableCards print or ship my cards?**  
No. TableCards creates a correctly sized PDF. You print it yourself or send it to a printer of your choice.

**Will the PDF contain a watermark?**  
No. Even the Free PDF is clean. Paid plans unlock larger events and reusable/custom creative capabilities.

**What is an Event Pass?**  
It covers one event with up to 500 cards and 90 days of edits and re-exports. It is a one-time purchase, not a subscription.

**What happens after 90 days?**  
Every PDF already downloaded remains yours. The editable event expires unless it belongs to an active professional subscription.

**What is one AI background batch?**  
One prompt produces four background choices. Guest names and guest-list data are never sent to the image model.

**Can I cancel a professional plan?**  
Yes. Cancellation stops future renewal. Previously downloaded PDFs remain usable. Projects remain readable and exportable for 30 days, become inaccessible for another 60 days and are then deleted after advance warnings.

### Why this draft is recommended

- Free is genuinely useful for a 25-person event and proves print quality without a watermark.
- A $5 Event Pass matches the closest current PDF-only benchmark and makes the value easy to understand.
- Event Pass includes workflow value that free generators may not combine reliably: uploaded-artwork preflight, verified fixed output, editable re-exports and optional AI choices.
- Professional subscriptions sell repeat workflow and saved brand work rather than charging repeatedly for the same PDF engine.
- Studio stays simple and inexpensive but does not promise 20 supported collaborators before real studio evidence exists.

### Independent review and validation gates

The proposal is suitable for a measured pilot, not a claim that the market is already validated:

- Let visitors import and preview the full list before an upgrade decision; the 25-card Free export boundary remains a hypothesis.
- Make Event Pass a clean one-event completion purchase, including corrections and re-exports. Explain exactly when its 90-day editing window starts and show the expiry date before payment.
- Define professional allowances directly instead of saying only “Everything in Event Pass”; monthly AI allowances and project retention must not inherit ambiguous per-event clocks.
- Test AI cost, print usefulness, retry rate and failure refund behavior before promising public allowances. AI remains optional and never receives guest data.
- Recruit 40 planners/stationers and 10 print shops across two US metro areas through public business channels. Continue only if eight useful conversations and five concrete recent workflows emerge.
- Run five real-file pilots. Four should reach a correct PDF within ten minutes without operator repair, with no missing/duplicated records and a physical print check, before spending on acquisition.
- Once Build 4 enables real payment, require at least three independent buyers at the stated prices and two professional repeat purchases over the following 60–90 days before treating pricing or retention as validated.
- Start with `$0` media spend. Only after self-service conversion works should one high-intent search campaign receive a capped `$150–$200` learning budget; do not test multiple paid channels simultaneously.
- Track the funnel from source through valid preview and paid PDF, plus support minutes, refunds and repeat events. Guest-list content never enters analytics.

## Decision Log

| Date       | Decision                                                                                                                             | Context                                                                                                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-27 | Research must precede the product brainstorm and be preserved with findings, conclusions and sources.                                | Andrew asked to validate product, pricing, missing/redundant features, formats and acquisition before changing scope. The completed report is linked in the context snapshot.                                                                                     |
| 2026-09-27 | Build 3 uses only a deterministic test/development payment mock; real provider payment remains Build 4.                              | The mock is a real test caller for Free/paid and any accepted usage-unit contract, but Build 3 does not implement live checkout, webhooks or subscription lifecycle.                                                                                              |
| 2026-09-27 | Free card limits, AI-generated backgrounds, four choices per generation and generic account units enter the brainstorm as proposals. | These are important founder directions and now have a concrete caller, but Andrew explicitly requested market validation before final product decisions. They are not silently treated as accepted scope merely because they motivated the research.              |
| 2026-09-27 | TableCards is PDF-only and its one-event price must exclude print-fulfillment value.                                                 | Customers print at home or through their own print shop. Avery and printed stationery validate the workflow/substitute cost, while PDF-generation software is the closer pricing benchmark.                                                                       |
| 2026-09-27 | Withdraw the $12 Event Pass recommendation; keep one-event pricing unsettled.                                                        | Direct PDF-only evidence includes $4.99 and several free no-watermark tools, including free AI. A paid TableCards event pack likely belongs around $5–$9 only if it delivers differentiated workflow value beyond generic PDF export.                             |
| 2026-09-27 | Keep `$0 / $5 / $9 / $19` as pilot pricing after independent Astra review, not as a validated market conclusion.                     | The structure is understandable, but competitor pages prove only advertised offers. Annual discounts are aggressive, direct features are available free elsewhere and acquisition must begin with observed real-file workflows and full-price pilots.             |
| 2026-09-27 | Accept the complete Event Pass plus professional-subscription direction and close the brainstorm for planning.                       | Andrew accepted the recommendations covering monthly-only pilot pricing, Free/import/auth/project boundaries, 500-card paid projects, AI batches and reusable units, five-member Studio scope, retention, marketing gates and Paddle's Build 4 decision boundary. |

## Notes

- Strongest desk evidence: Free 25, 3.5 × 2 folded/four per US Letter, spreadsheet import, own-artwork reuse, full preview and actual-size print guidance.
- Strongest missing commercial concept: one-time event purchase for buyers who do not want a subscription.
- Strongest missing workflow concepts: XLSX/pasted-grid mapping and bounded post-import correction.
- Most likely overbuilt concepts: a general design studio, seating/RSVP/QR features, 20-person collaboration before demand, and AI as the primary message.
- The research suggests a paid launch limit of 250–500 records and A4 as the first later format, but neither is accepted.
- Customer acquisition cost is unknown. Start with no-media-cost professional discovery and concierge pilots; run paid channel smoke tests only after a working conversion path exists.
- Paddle's public under-`$10` contact requirement appears to route sellers to bespoke microtransaction pricing rather than prohibit low-ticket products. A 2024 seller reported activating a flat 10% rate within days, corroborated by a filed description of rates around 10% or lower; current TableCards terms remain unconfirmed.
