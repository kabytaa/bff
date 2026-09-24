# TableCards MVP Product Specification

Updated: 2026-09-24.

This is the canonical product-scope document for the first Business Factory product. The [MVP delivery plan](../factory/mvp-delivery-plan.md) describes execution, while [ADR 0001](../architecture/adr/0001-convex-first-bff-stack.md) governs the shared technical stack.

## Purpose and launch hypothesis

TableCards is intentionally a small first product. Its primary purpose is to prove that the Business Factory Foundation can support a complete real-user product and make the next Business Project easier to create. Commercial demand is desirable but remains unvalidated.

The initial market is the United States. The likely repeat buyers are independent event planners and small planning studios. Version one has an English interface and supports Latin-script names, including common accents. Right-to-left scripts are explicitly deferred.

## Business Factory MVP definition of done

The Business Factory MVP is done when:

- The reusable BFF service and backoffice dashboard operate in production.
- TableCards completes the full real-user cycle: discovery/attribution appropriate to its launch, authentication, product value, billing and access control, support/feedback, monitoring, deployment and recovery.
- The backoffice exposes the operational information needed to serve users and understand the product without becoming a general analytics platform.
- The repository documents the actual boundaries, contracts and steps needed to add a second Business Project without redesigning the foundation. There is no speed target and the second product does not have to be built as part of this MVP.

Marketing execution is deliberately undecided until the TableCards launch is planned. Do not build a generic campaign system. Codex or another authorized agent may operate external marketing tools directly; BFF should implement only the attribution and monitoring needed by the chosen launch approach.

## Core workflow

1. A visitor can view the public landing and policy pages.
2. Starting the generator requires Google sign-in.
3. The user pastes names or uploads a CSV containing names and optional table numbers.
4. TableCards preserves spelling, order and duplicates, then previews every card and warns about unsupported characters, insufficient image resolution and text that cannot fit.
5. The user selects the built-in design or, with a paid plan, a saved custom design preset.
6. TableCards generates a deterministic PDF with the chosen names, cut marks, fold marks and a scale-check page.
7. The user can submit feedback, a question or a problem and see the operator's response.

TableCards is not the system of record for an agency's guest list. A corrected or partial CSV follows the same generation workflow; there is no separate “correction printing” feature.

## Print contract

Version one supports exactly one physical output:

| Property | Decision |
| --- | --- |
| Page | US Letter, 8.5 × 11 inches |
| Card | Folded tent card |
| Finished size | 3.5 × 2 inches |
| Unfolded size | 3.5 × 4 inches |
| Layout | Four cards per sheet |
| Faces | Name and design on both visible faces |
| Guides | Cut marks, fold marks and scale-check page |
| Media | Ordinary compatible cardstock or Avery 5302-style sheets |

Users must print at 100% / Actual Size. One physical sheet must be printed and measured before launch. Flat cards, A4, arbitrary dimensions, professional print fulfillment and multiple physical presets are deferred.

## Designs

Designs are lightweight, curated product assets rather than user-editable templates:

- Free includes three polished predefined designs.
- Personal Pro and Studio include the full predefined premium-design library.
- Personal Pro and Studio can also create custom presets from uploaded artwork.

The paid custom-design workflow is intentionally constrained:

- upload one PNG or JPEG background at the fixed card ratio
- validate format, dimensions and effective print resolution
- adjust the guest-name font, size, color and position
- preview the result before export
- save and reuse design presets

There is no freeform design studio, vector editor, design marketplace, logo system or arbitrary canvas in the MVP. Do not promise a fixed cadence of new designs.

## Authentication and accounts

- The landing and policy pages are public; using the generator requires authentication.
- Google is the only enabled login provider in version one.
- A BFF user has a stable internal ID independent of Google.
- External identities are provider-qualified mappings such as `(issuer, subject)`, and one BFF user may eventually have multiple identities.
- Adding Apple or another provider later must not change product user IDs, account IDs, memberships or public BFF contracts.
- Account linking UI and additional providers are deferred until a second provider is actually enabled.

Clerk is not required. Better Auth remains behind the BFF authentication adapter as specified by ADR 0001.

## Plans and working prices

The following names, prices and seat limits are accepted launch hypotheses, not validated willingness-to-pay evidence:

| Plan | Monthly | Annual | Seats | Intended customer |
| --- | ---: | ---: | ---: | --- |
| Free | $0 | $0 | 1 | Occasional individual user |
| Personal Pro | $9 | $59 | 1 | Independent repeat planner |
| Studio | $19 | $149 | Up to 20 | Planning studio or agency |

Personal Pro centers on the premium design library, custom backgrounds and reusable presets. Studio adds a shared workspace, shared presets, invitations and Owner/Admin/Member roles. The subscription belongs to the account/workspace rather than directly to an individual identity. Do not add per-seat charges, extra team tiers or email-domain joining in version one.

The exact free-versus-paid export boundary is still being confirmed. The current recommendation is a clean, watermark-free Free PDF using any free design, with paid value coming from the premium library, custom branded designs, saved presets and collaboration rather than an intentionally degraded output.

## Teams

- A Studio workspace supports up to 20 members at one fixed price.
- Membership uses explicit invitations; automatic email-domain joining is out of scope.
- Owner, Admin and Member are the only planned roles.
- The exact invitation-delivery UX remains to be chosen. Do not introduce a transactional-email provider until that workflow actually requires one.

## Support, feedback and operations

Support and feedback are launch requirements, not post-launch polish. Signed-in users can submit `feedback`, `problem` or `question` requests. The BFF backoffice provides a small operator inbox, status handling and one response visible to the user. A public support address remains visible for people who cannot sign in.

Future AI support automation may classify or draft responses, but autonomous actions and resolution are not part of this MVP.

Operational readiness includes focused product/business events, basic traffic and conversion visibility, billing truth, support visibility, health/error monitoring, a deployment procedure and recovery notes. PostHog, Resend, Sentry and a helpdesk are optional until a concrete workflow requires them.

## Test policy

Every implementation slice must be self-verifiable. The browser regression remains deliberately small and covers the important happy flows: Google session bootstrap using a deterministic test adapter, list/CSV input, preview, PDF export, subscription entitlement, team access when implemented, and support submission through operator response.

PDF geometry, guest multiplicity, duplicate names, accents, long-name fitting, authorization, webhook signatures/replays and role denials belong in faster unit or integration tests. Live Google and Paddle checks are separate smoke tests; ordinary CI must not depend on those services.

## Explicitly deferred

- right-to-left scripts
- A4, flat cards, multiple card sizes and arbitrary dimensions
- seating-plan management, meal fields and caterer manifests
- correction-only selection or stored guest-list management
- domain-based team joining and per-seat billing
- Apple login and other identity providers
- marketing campaign automation
- transactional email, PostHog, Sentry, a helpdesk and AI support automation unless activated by a real workflow
- print fulfillment and shipping

## Remaining decisions

- Confirm the recommended clean, watermark-free Free export and final feature boundary.
- Choose how Studio invitation links are delivered without prematurely requiring an email provider.
- Choose the working product/domain name and reachable launch users.
- Decide the first launch/attribution approach when marketing work begins.
- Confirm guest-list retention/deletion behavior during implementation; retain no more data than the real workflow requires.
