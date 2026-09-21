# Brainstorm: First Business Project

## The Idea

Choose the first tiny paid product that can validate real demand while exercising BFF login, project/account context, attribution, payment, entitlement, support and backoffice flows.

The current comparison prioritizes the user's request for an easier product whose useful output we can verify ourselves. On 2026-09-21, the user delegated the choice and requested an Astra subagent review. The working choice is **TableCards for repeat event professionals**.

The blueprint and workbook contain TableCards, ContentChase and CatalogFix. The recovered 2026-09-15 founder memo favors repeat professional TableCards buyers and agencies with concurrent projects for ContentChase. The workbook's scores, budgets and success thresholds are proposals or illustrative examples, not observed business results.

The two later research reports proposed a Stripe webhook proxy and an accessibility report. The newer Stripe Google Doc is an exact extracted-text duplicate of the earlier copy. Accessibility was our previous recommendation; it is now parked because its scanner, report interpretation and operational scope exceed the desired first-project complexity.

## Codebase Context

### What We Have

- An accepted Convex-first BFF architecture with Google-only login through Better Auth, Paddle billing, canonical events and reusable support/feedback.
- A public API/SDK boundary that lets a product use a specialized runtime without moving BFF away from Convex.
- Prior source descriptions of TableCards and ContentChase, including buyer, paid outcome and practical validation criteria.
- No runtime workspace yet, so the first product can still shape only the abstractions it actually needs.

### Constraints

- The first product must stay small and must not force speculative BFF models or APIs.
- TableCards must produce correct names, page dimensions, margins and card placement. Long names, unsupported characters and printer scaling are the principal correctness risks.
- ContentChase needs both the designer and the invited client to participate; secure links, files and effective reminders add workflow and support complexity.
- Current competitors already offer batch place-card generation and content collection. Neither category's existence establishes demand for our product.
- Paddle production checkout depends on seller/identity and domain review. Google production branding depends on an owned, verified domain and public policy pages.

### Opportunities

- TableCards has a bounded input and an inspectable output: names/table labels become a printable PDF.
- A one-event export entitlement exercises BFF's real paid path without introducing subscriptions before repeated demand exists.
- PDF generation can use a JavaScript library without a hosted browser, AI service or printing API. This is a proposed architecture, not an implemented integration.
- Planners, venues and print shops repeat the job across customers. This is the buyer direction already recorded in the earlier founder memo.

### What a working TableCards product means

A user pastes guest names with optional assigned table labels, chooses a typography template, sees a print layout, pays for one event and downloads the correctly sized PDF. Corrections and repeat downloads within the purchased event belong to the same purchase. We do not assign seats or infer names.

The smallest useful scope is one card format, one paper size chosen for the pilot and a few bundled typography styles. The blueprint proposes three templates; one polished template is enough for the first output proof. The supported writing systems must be explicit before payment: font embedding alone does not establish correct Hebrew/Arabic shaping or mixed-direction text.

The result is successful when every supplied guest row appears correctly, text fits legibly, page dimensions and cut/fold guides match the preview, and a physical print at actual size produces usable cards. Duplicate names may be legitimate separate guests; preserve the user's rows. Invalid or unsupported input must be visible before purchase.

The main automated regression would cover list entry, preview, confirmed test payment, PDF download, a name correction and re-export under the same entitlement. PDF content/geometry and overflow cases belong in focused integration tests. Andrew's physical print check complements these automated checks. No such tests have been implemented yet.

Keep guest lists out of analytics and logs. The preview can be local; an export generated on the server requires an explicit retention choice. The paid export must be enforced on the server, consistent with the accepted BFF contract.

## Options

### Option A: TableCards — chosen first project

**Approach**: Batch guest names and assigned table labels into printable place cards, beginning with planners or venues that already repeat this task. Offer a free preview and one paid event export with corrections/re-exports.

**Leverages**: BFF Google login, one-time payments, account/event access, attribution and support. A product-owned PDF generator can plausibly run in a Convex action; confirm package/font compatibility during the first technical slice.

**Constraints**: Fixed paper/card choices, bounded guest count and verified fonts. Seating optimization, a freeform design editor, printing fulfillment and integrations would expand the scope materially.

**Effort**: Low for the product-specific core; the shared BFF foundation still has to be built.

**Risk**: A correct tool may still fail commercially. Place Card Me already supports uploaded/pasted names and tables, automatic formatting and printable PDFs; Canva is another substitute. Fast batch export is not a unique differentiator. The repeat-professional audience is a hypothesis to test, not proof of an unmet need.

### Option B: ContentChase

**Approach**: An agency creates a checklist for copy, logos and images; the client submits through a secure link without an account; the agency sees what is missing and sends reminders.

**Leverages**: BFF accounts, memberships, subscriptions/limits and support; Convex data, file storage and scheduled work.

**Constraints**: Expiring/revocable client links, file authorization, upload limits, deletion/export, reminder scheduling and email delivery are real product work. Manual sharing could support a trial, but automated chasing needs a transactional sender and verified domain.

**Effort**: Medium

**Risk**: Content Snare already offers client requests, uploads and reminders. A simpler agency workflow might sell, but file upload alone is weak differentiation. Value cannot be proven without a real client submitting material. Keep it as the next candidate if reachable agency demand outweighs TableCards' simpler delivery.

### Option C: CatalogFix

**Approach**: Diagnose and explicitly repair a narrowly supported Shopify product CSV, show the changes and export a corrected file without connecting to the store.

**Leverages**: A one-time export entitlement and deterministic file processing, similar to TableCards.

**Constraints**: Correctness depends on the supported import format and real merchant files; actual import success is the completion test. Avoid promising safe correction for arbitrary catalogs.

**Effort**: Low to Medium for a fixed subset; higher if supplier-specific exceptions accumulate.

**Risk**: Each customer's file may require a bespoke repair, turning a small utility into ongoing support. The blueprint explicitly treats representative real files as a prerequisite for validating the idea.

### Option D: Accessibility snapshot — parked

**Approach**: Render a public page in a browser, run axe-core, and turn structured findings into a branded report with explicit manual-review items.

**Leverages**: BFF login, paid reports, support and attribution.

**Constraints**: Isolated browser execution, bounded URL access and clear assessment limits. Automated checks cover only part of accessibility; a clean scan cannot establish conformance.

**Effort**: Medium to High relative to TableCards.

**Risk**: Buyers may not value the report beyond free tools. Interpreting findings and operating a public scanner add complexity that the user now wants to avoid in the first project.

## Open Questions

- Which reachable planner, venue or print shop has an upcoming event and an unsatisfactory current workflow?
- Which paper/card format and writing systems does that buyer actually need? A4 versus US Letter and Hebrew/RTL support must follow the intended pilot.
- What would make that buyer choose this over Place Card Me, Canva or their existing template?
- Does the blueprint's proposed $19 event export earn a real purchase? It is a price hypothesis, not a validated recommendation.
- Can the offered print layout succeed on the intended printer/cardstock without individual troubleshooting?

## Current Direction

Choose **TableCards** as the working first Business Project in response to the user's delegated choice. Root and the requested Astra reviewer independently favor it for the smallest controllable product scope and fewest product-specific providers. This supersedes the accessibility recommendation.

The first offer is one paid event export with edits/re-exports; investigate professional repeat buyers while deferring subscription mechanics. There is no evidence yet of demand, profitable acquisition or a commercial advantage over incumbents. The workbook's proposed five independent buyers and four successful print outputs are useful learning gates, not achieved results or a promise of profit.

The decisive first artifact is a correct PDF generated from a representative guest list, alongside a matching preview and successful physical print. This research task selects and scopes the idea; no application code, provider resources or outreach were created.

## Notes

- Source: [Business Factory Blueprint, section 18](https://drive.google.com/file/d/1OPSf8NTOd9RtSW5TrESvaZMCc8fuNFTn/view). Local extracted copy: `/root/Documents/Codex/2026-09-15/new-realtime-voice-chat/business-factory/docs/references/business-factory-blueprint.txt`.
- Source: [Business Factory Workbook, portfolio and experiment records](https://drive.google.com/file/d/1R3rpSaRetSUL2XHDrqIgumgxptIwzsLM/view). BF003 is TableCards and BF002 is ContentChase; their entries are planned, not actual results.
- Recovered founder memo: `/root/Documents/Codex/2026-09-15/new-realtime-voice-chat/business-factory/docs/BUSINESS_FACTORY.md`, “Existing ideas” and “Blueprint reference received 2026-09-15.” Preserve its professional-buyer preference, but its older platform topology is superseded by the current ADR.
- Current competition checked 2026-09-21: [Place Card Me's existing workflow](https://www.placecardme.com/our-printable-place-cards/) and [Content Snare's plans/features](https://contentsnare.com/pricing/). These establish available alternatives, not our demand.
- Technical feasibility references: [PDF-LIB](https://pdf-lib.js.org/) supports JavaScript PDF creation, page geometry and embedded fonts; [Convex runtimes](https://docs.convex.dev/functions/runtimes) support npm libraries and optional Node actions. Compatibility, font behavior and print quality remain to be tested in our implementation.
- Previous alternatives: Stripe webhook replay was rejected for first-product trust, payload security and availability burden. Cron monitoring was technically simple but has strong free substitutes. The earlier founder memo also records that PracticeLoop and WorkshopRun were not selected.
- Source: [Strategic Product Opportunity Analysis](https://docs.google.com/document/d/1_6CepogJGniZm14wFCJNYWDdBvhtTr4ISqjAom5JpJ0/edit) (exact duplicate of the earlier Stripe report).
- Source: [WCAG/EAA Accessibility Audit Tool analysis](https://drive.google.com/file/d/12JUc2TyUjS4_Sz_LcK_YtijAA93KmBqn/view).
- [EU sources](https://www.consilium.europa.eu/en/policies/accessibility-goods-services/) support the EAA's 28 June 2025 application date for covered services and the service micro-enterprise exemption, but scope varies by service and jurisdiction; do not market every website as legally covered.
- The [FTC's final accessiBe order](https://www.ftc.gov/legal-library/browse/cases-proceedings/2223156-accessibe-inc) supports the warning against unsupported automated-compliance claims.
- [Paddle treats production domain review as mandatory](https://www.paddle.com/help/start/account-verification/what-is-domain-verification); sandbox testing does not require an approved domain.
- [axe-core](https://github.com/dequelabs/axe-core) provides the structured browser testing engine and explicitly returns uncertain cases for manual review.
- [Playwright's accessibility guidance](https://playwright.dev/docs/accessibility-testing) confirms the `@axe-core/playwright` integration and warns that automated testing finds only some accessibility problems.
