# Business Factory

BFF means **Business Factory Foundation**: the shared business service, public contracts and backoffice for independently organized Businesses in one Nx monorepo.

## Planning documents

- [Current handoff and next moves](STATUS.md)
- [MVP architecture](docs/architecture/bff-mvp-architecture.md)
- [Shared BFF data model and table purposes](docs/architecture/shared-bff-data-model.md)
- [Future architecture ideas (non-authoritative)](docs/architecture/future-ideas.md)
- [ADR 0001 — Convex-first BFF stack](docs/architecture/adr/0001-convex-first-bff-stack.md)
- [ADR 0002 — Business environments and operator authentication](docs/architecture/adr/0002-business-environments-and-operator-auth.md)
- [ADR 0003 — Production delivery](docs/architecture/adr/0003-production-delivery.md)
- [ADR 0004 — Business customer authentication and accounts](docs/architecture/adr/0004-business-customer-auth-and-accounts.md)
- [MVP delivery plan — Codex and manual work](docs/factory/mvp-delivery-plan.md)
- [TableCards code and documentation](projects/tablecards/README.md)
- [TableCards MVP product specification](projects/tablecards/docs/product.md)
- [Business documentation ownership](docs/factory/business-documentation.md)
- [Provider accounts, access and secrets](docs/operations/provider-accounts-and-secrets.md)
- [Build 1 local development](docs/operations/build-1-local-development.md)
- [Build 1 hosted verification](docs/operations/build-1-hosted-verification.md)
- [Development authenticated dashboard smoke](docs/operations/development-authenticated-smoke.md)
- [Production delivery](docs/operations/production-delivery.md)
- [Build 2 customer authentication](docs/operations/build-2-customer-auth.md)
- [TableCards market research (2026-09-27)](docs/research/260927-tablecards-market-research.md)
- [Active TableCards product and launch brainstorm](.agent/brainstorms/260927-tablecards-product-and-launch.md)
- [Research source map and reconciliation](docs/research/source-map.md)
- [First Business Project brainstorm](.agent/brainstorms/260921-first-business-project.md)

The architecture is the supplied source document. The TableCards specification is the canonical product scope, and the delivery plan describes implementation. Nirvana is reserved for short personal blockers that Andrew must complete away from the conversation; Codex work and decisions that can be resolved together stay out of Nirvana.

The BFF MVP stack is now decided: Nx/pnpm/TypeScript, Convex for the BFF server and database, Cloudflare for static web hosting/DNS and Paddle when real billing begins. The operator dashboard uses direct Google OIDC and a fixed server-side operator allowlist. Business customer authentication uses the delivered provider-neutral BFF session/account protocol and technology-first SDK described in ADR 0004. An email-capable customer-support conversation is a later required MVP slice. Implementations include executable validation and focused browser regression. Apple login and specific analytics, email and monitoring vendors are optional integrations selected only when their owning workflow requires them. Businesses remain free to choose different product-specific technology.

Deployment-invariant, non-secret BFF identifiers live in the internal `bff-static-config` library. Credentials and values that actually vary by deployment remain external configuration.

Builds 1–3 meet their authorized production boundaries; TableCards Build 3 is a no-charge preview, not real billing or paying-customer launch. See [the current handoff](STATUS.md) for verification, remaining evidence limits and next work. Markdown-only changes skip CI and deployment; [CI scope](tools/production-delivery/README.md#ci-scope) explains the release rules.
