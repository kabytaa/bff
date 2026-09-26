# ADR 0003 — Production delivery

- **Status:** Accepted
- **Date:** 2026-09-26
- **Decision owner:** Andrew
- **Implementation owner:** Codex
- **Scope:** Business Factory production CI/CD, release verification and completion semantics
- **Source:** [Production Delivery brainstorm](../../../.agent/brainstorms/260926-production-delivery.md)

## Context

Build 1 is fully validated locally and in its hosted development lane, but the original workflow only runs checks. Manual provider commands would leave ambiguity about whether `main`, the Convex backend and the Cloudflare dashboard represent the same release.

Andrew and Codex are currently the only collaborators. Andrew reviews completed work in conversation and explicitly authorizes pushes. Production has no meaningful user data yet, so a mandatory pull-request ceremony is not currently valuable, but production still needs deterministic validation, scoped credentials and an observable completion gate.

## Decision

### Current release trigger

During the solo phase, Andrew reviews the prepared diff and explicitly authorizes Codex to push directly to `main`. Pull requests validate but do not deploy. A push to `main` starts the same full validation gate and deploys automatically only after validation succeeds; there is no second routine approval click.

Introduce protected pull requests before the impact changes materially: real production users or data, paid workflows, another collaborator or a recurring direct-push error is sufficient reason to reassess.

### Production boundary

Use a GitHub environment named `production`, restricted to `main`, for lane-specific variables and deploy credentials. Production deployments are serialized and an active release is never canceled by a newer push.

During the solo phase, use one shared Tofler CI token with Cloudflare's `Account > Workers Scripts > Edit` permission and `Zone > Workers Routes > Edit` for both `tofler.tech` and `tofler.app`, plus read-only discovery permissions. This intentionally favors simple CI setup over per-Business deploy-token isolation, while still excluding general DNS Edit and unrelated Cloudflare products. Reassess this choice when real users/data, another collaborator or additional sensitive infrastructure makes the wider CI blast radius material.

Development remains manual. Development and production use separate Convex deployments, Cloudflare Workers, domains, data and credentials.

### Ordered deployment

One GitHub job deploys a single commit in this order:

1. Use a production-scoped Convex deploy key to validate the injected client URL, build the dashboard and deploy Convex.
2. Stamp `BFF_BUILD_VERSION` with the full GitHub commit SHA.
3. Publish the already validated dashboard bundle through Worker `business-factory-backoffice` at `ops.tofler.tech`.
4. Run anonymous live smoke checks against the backend and dashboard.

The build fails closed when Convex's injected client URL does not match the independently configured production URL. Provider secrets are available only to the production job and never enter pull-request jobs, repository files, browser bundles or logs.

### Completion and smoke

An implementation intended for production is not complete after local or development verification. Completion requires:

- a green GitHub validation and production job for the exact commit;
- health reporting that full commit SHA;
- the production dashboard serving its security/no-index headers and referencing the production Convex client URL;
- Andrew's first real Google operator sign-in for a newly provisioned production lane.

CI does not store an operator Google token. The deterministic browser suite remains provider-independent; live provider smoke is a separate production gate.

### Failure and recovery

Do not automatically roll back Convex after a later Cloudflare or smoke failure. The workflow stops and reports a partial release. Retry the idempotent failed job when inputs are unchanged, otherwise fix forward through another reviewed push. Use a reviewed revert commit only for a behavior regression. Never delete production data as a deployment rollback.

Future destructive schema/data migrations require their own reviewed migration and recovery design.

## Consequences

### Benefits

- One known commit identifies repository, backend and dashboard state.
- A red validation run cannot deploy.
- A wrong deployment key/URL is rejected before backend publication.
- Deployment history and credentials are isolated in the GitHub production environment.
- The completion claim reflects actual production behavior.

### Tradeoffs

- A failing commit can temporarily exist on `main` until protected pull requests are introduced.
- A backend-first partial release may leave the new compatible backend behind the previous dashboard.
- The first Cloudflare token setup and real Google production sign-in remain human/provider gates.
- A compromise of the shared Tofler token could modify multiple Tofler Workers or their routes; that accepted solo-phase tradeoff must be revisited as operational impact grows.
- Development and production manifests duplicate a small amount of configuration to make lane selection explicit.

## Verification

- `pnpm check` remains the pre-deployment gate.
- Production-delivery unit tests cover target mismatch, contract/header/bundle failure and bounded retry.
- Convex and Wrangler dry runs prove the selected production targets before the first push.
- Post-deploy smoke verifies the exact SHA, public health contract, dashboard security headers and production Convex URL.
- Andrew confirms authenticated read-only access with the real Google provider.
