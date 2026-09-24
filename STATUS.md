# Business Factory Handoff

Updated: 2026-09-24.

## Current state

- Planning is aligned; application implementation has not started.
- TableCards is the first Business Project.
- Product scope is canonical in [the TableCards MVP specification](docs/products/tablecards-mvp.md).
- Delivery order and the focused regression policy are in [the MVP delivery plan](docs/factory/mvp-delivery-plan.md).
- The accepted stack is Nx/pnpm/TypeScript, Convex, Better Auth with Google initially, Cloudflare and Paddle.

## Last completed

- Replaced the old one-time-purchase TableCards concept with Free, Personal Pro and Studio subscriptions.
- Fixed Studio at up to 20 seats with explicit invitations and no domain joining or per-seat billing.
- Required Google sign-in for the generator while keeping BFF identity provider-neutral for future login methods.
- Fixed the first output at four 3.5 × 2 inch folded tent cards per US Letter sheet.
- Split the design catalog into three free designs, a paid premium library and paid custom background presets.
- Clarified that Nirvana contains only Andrew's genuine offline/personal blockers.

## Next moves

1. Confirm the remaining Free boundary: recommended clean PDF with no watermark; paid value is premium/custom designs, saved presets and collaboration.
2. Choose the smallest Studio invitation delivery method without adding transactional email prematurely.
3. Create the implementation-ready plan for **Build 1 — Foundation**.
4. Execute Build 1: Nx workspace, minimal Convex BFF/project registry, public contracts, test harness and CI baseline.
5. Continue through auth/support, TableCards core, subscriptions/teams and deployment in the order defined by the delivery plan.

## Human blockers

- Andrew can start or continue Paddle seller verification now.
- Domain, production Google OAuth credentials and Cloudflare access wait until implementation supplies exact names and callback/deployment values.
- A physical 100%-scale print and ruler check is required before launch.

## Guardrails

- Add models and APIs only when the active implementation slice uses them.
- Keep browser regression focused on important happy flows; prove edge cases and denials at unit/integration level.
- Do not treat pricing or demand as validated.
- Do not build generic marketing automation; decide TableCards acquisition and attribution when launch planning begins.
