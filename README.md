# Business Factory

BFF means **Business Factory Foundation**: the shared business service, SDK and backoffice for independently organized Business Projects in one Nx monorepo.

## Planning documents

- [MVP architecture](docs/architecture/bff-mvp-architecture.md)
- [ADR 0001 — Convex-first BFF stack](docs/architecture/adr/0001-convex-first-bff-stack.md)
- [MVP delivery plan — Codex and manual work](docs/factory/mvp-delivery-plan.md)
- [Provider accounts, access and secrets](docs/operations/provider-accounts-and-secrets.md)
- [Research source map and reconciliation](docs/research/source-map.md)

The architecture is the supplied source document. The delivery plan maps work to the Personal-area Nirvana projects **Business Factory — MVP — Codex**, **Business Factory — MVP — Manual** and **Business Factory — Post-MVP**.

The BFF MVP stack is now decided: Nx/pnpm/TypeScript, Convex for the BFF server and database, Better Auth hosted in Convex with Google as the initial login provider, Cloudflare for static web hosting/DNS and Paddle when billing begins. A reusable in-product support and feedback flow is part of the MVP. Clerk is not required. Apple login, PostHog, Resend and Sentry are optional integrations added only when a product or platform workflow requires them. Business Projects remain free to choose different product-specific technology.

This repository is still at the planning stage. The runtime and Nx workspace are not implemented yet.
