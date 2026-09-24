# Business Factory

BFF means **Business Factory Foundation**: the shared business service, SDK and backoffice for independently organized Business Projects in one Nx monorepo.

## Planning documents

- [Current handoff and next moves](STATUS.md)
- [MVP architecture](docs/architecture/bff-mvp-architecture.md)
- [ADR 0001 — Convex-first BFF stack](docs/architecture/adr/0001-convex-first-bff-stack.md)
- [MVP delivery plan — Codex and manual work](docs/factory/mvp-delivery-plan.md)
- [TableCards MVP product specification](docs/products/tablecards-mvp.md)
- [Provider accounts, access and secrets](docs/operations/provider-accounts-and-secrets.md)
- [Research source map and reconciliation](docs/research/source-map.md)
- [First Business Project brainstorm](.agent/brainstorms/first-business-project.md)

The architecture is the supplied source document. The TableCards specification is the canonical product scope, and the delivery plan describes implementation. Nirvana is reserved for short personal blockers that Andrew must complete away from the conversation; Codex work and decisions that can be resolved together stay out of Nirvana.

The BFF MVP stack is now decided: Nx/pnpm/TypeScript, Convex for the BFF server and database, Better Auth hosted in Convex with Google as the initial login provider, Cloudflare for static web hosting/DNS and Paddle when billing begins. A reusable in-product support and feedback flow is part of the MVP. Implementations must include executable validation and a small happy-path browser regression suite. Clerk is not required. Apple login, PostHog, Resend and Sentry are optional integrations added only when a product or platform workflow requires them. Business Projects remain free to choose different product-specific technology.

This repository is still at the planning stage. The runtime and Nx workspace are not implemented yet.
