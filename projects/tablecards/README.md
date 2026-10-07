# TableCards

TableCards turns guest lists into downloadable place-card PDFs. Customers
print independently; this Business does not print or ship cards.

Build 3's no-charge preview is deployed to
[production](https://tablecards.tofler.app) and
[development](https://tablecards-dev.tofler.app). Checkout explicitly charges
nothing in both environments; real payment processing remains Build 4.
Real Cloudflare artwork has a separate deployment
budget of `$1` per UTC day, conservatively admitting up to 138 four-image starts;
explicitly labelled fixtures remain for regression.

The [production release review](docs/reviews/261007-build-3-production-release.md)
records deployment, desktop/mobile verification and limits, including the
unverified personal Google credential round-trip. The
[earlier development acceptance](docs/reviews/261006-tablecards-remediation-and-development-acceptance.md)
retains 27 passing cases and independent app/security reviews for its baseline.
Earlier development results alone do not establish production or paying-customer launch readiness.

## Start here

| Document                             | Owns                                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------------------- |
| [Product](docs/product.md)           | Customers, value, offers, limits, accepted promises and non-goals                        |
| [Application](docs/application.md)   | Pages, navigation, actions, states, responsive behavior, design choices and user stories |
| [Architecture](docs/architecture.md) | Components, data ownership, table purposes, relationships, APIs and security boundaries  |
| [Operations](docs/operations.md)     | Environment configuration, deployment, verification, troubleshooting and release limits  |
| [Reviews](docs/reviews/)             | Dated findings, evidence, coverage limits and unresolved risks                           |

These are the authoritative TableCards explanations, not copies of shared BFF
documentation. The old root product/application/runbook paths remain routing
links for existing references. Shared factory stages, BFF architecture and
accepted ADRs stay in root `docs/`; root `.agent/` retains brainstorm and plan
history under the existing repository rules.

The dated [market research](../../docs/research/260927-tablecards-market-research.md)
and accepted [product brainstorm](../../.agent/brainstorms/260927-tablecards-product-and-launch.md)
preserve evidence and reasoning. They do not override current product scope.

## Code map

| Project                                      | Responsibility                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [Web](workloads/web/README.md)               | React routes, creator UI, imports, draft restoration and customer SDK integration          |
| [Backend](backend/README.md)                 | Account-scoped Convex product records, validated artwork, PDF and AI operations            |
| [Core](libs/core/README.md)                  | Offer/design catalogs, guest validation, physical geometry and deterministic PDF rendering |
| [Session gateway](session-gateway/README.md) | Narrow same-site proxy for SDK session routes, not product traffic                         |
| [AI provider](ai-provider/README.md)         | Private Workers AI binding adapter; authorization, budget and storage stay in Convex/BFF   |
| [E2E](e2e/README.md)                         | Hosted desktop/mobile journeys and executable user-story coverage                          |

## Verification

Run from the repository root with Node 24:

```sh
pnpm check
pnpm test:e2e:tablecards-hosted
```

The second command drives development using protected automation identities
and creates synthetic accounts/projects. It requires the external development
signing key and is not part of ordinary CI. Neither command proves real
payment, physical print accuracy or a TableCards production release.

## Keeping the documentation consistent

For a meaningful change, update only the affected canonical sections:

- Change a promise or limit → Product; link its visible workflow in Application.
- Change a page, action, state or visual convention → Application.
- Change tables, API contracts or an ownership/security boundary → Architecture.
- Change configuration, deployment or recovery → Operations.
- Verify the change → record scope, version, checks and residual risks in a dated review.

Before handoff, compare the affected promise → UI → server enforcement → test
evidence. A passing test is not evidence for a behavior it never exercised.
Record unknowns as unverified rather than silently treating them as passed.
Update the root [STATUS](../../STATUS.md) with the short outcome and next move.
User review is optional unless personal authority or a real-world check is
actually required; Codex owns the repeatable review first.

Small features update these documents rather than creating another mandatory
document pack. Split a section into a separate file only when its size or
independent ownership makes that useful. Do not precreate empty folders.
