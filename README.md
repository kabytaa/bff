# Business Factory

BFF means **Business Factory Foundation**: the shared business service, public contracts and backoffice for independently organized Businesses in one Nx monorepo.

## Planning documents

- [Current handoff and next moves](STATUS.md)
- [MVP architecture](docs/architecture/bff-mvp-architecture.md)
- [ADR 0001 — Convex-first BFF stack](docs/architecture/adr/0001-convex-first-bff-stack.md)
- [ADR 0002 — Business environments and operator authentication](docs/architecture/adr/0002-business-environments-and-operator-auth.md)
- [MVP delivery plan — Codex and manual work](docs/factory/mvp-delivery-plan.md)
- [TableCards MVP product specification](docs/products/tablecards-mvp.md)
- [Provider accounts, access and secrets](docs/operations/provider-accounts-and-secrets.md)
- [Build 1 local development](docs/operations/build-1-local-development.md)
- [Build 1 hosted verification](docs/operations/build-1-hosted-verification.md)
- [Research source map and reconciliation](docs/research/source-map.md)
- [First Business Project brainstorm](.agent/brainstorms/first-business-project.md)

The architecture is the supplied source document. The TableCards specification is the canonical product scope, and the delivery plan describes implementation. Nirvana is reserved for short personal blockers that Andrew must complete away from the conversation; Codex work and decisions that can be resolved together stay out of Nirvana.

The BFF MVP stack is now decided: Nx/pnpm/TypeScript, Convex for the BFF server and database, Cloudflare for static web hosting/DNS and Paddle when billing begins. Build 1 protects its small operator dashboard with direct Google OIDC and a fixed server-side operator allowlist; the authentication library for Business users is deliberately chosen in Build 2. A reusable in-product support and feedback flow is part of the MVP. Implementations must include executable validation and a small happy-path browser regression suite. Clerk is not required. Apple login, PostHog, Resend and Sentry are optional integrations added only when a product or platform workflow requires them. Businesses remain free to choose different product-specific technology.

Build 1 is locally complete and its hosted verification remains approval-gated. See [the current handoff](STATUS.md) for the exact state.
