# Build 1 local development

Updated: 2026-09-26.

This runbook reproduces the provider-independent Build 1 Foundation checks. It starts a local Convex backend, exercises the operator CLI against disposable data, verifies the public health endpoint and runs the complete repository quality gate. It does not deploy the BFF or backoffice.

## Prerequisites

- Node.js 24.x, as pinned by `.node-version`.
- Corepack with pnpm 12.6.0, as pinned by `package.json`.
- Chromium installed by Playwright for the deterministic dashboard smoke test.
- No Google, Cloudflare, Paddle or production credential.

Confirm the toolchain and install exactly the lockfile:

```bash
node --version
corepack enable
pnpm --version
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
```

The expected Node major version is 24 and the expected pnpm version is 12.6.0.

## Local Convex selection

The repository's ignored `.env.local` selects the local deployment. Never commit that file or copy a deployment token into the repository.

For an already configured checkout, start the backend from the repository root:

```bash
pnpm convex:local
```

The default local API and HTTP-action ports are `3210` and `3211`. Treat the values written to `.env.local` as authoritative if the CLI selects different ports.

If this is a new checkout with no `.env.local`, stop and identify the exact Convex team/project before configuring it. The current Convex CLI associates even a local deployment with project metadata. Creating or selecting that project is an external account action; it is not required again for this repository's existing local configuration. Once the intended project is confirmed, create/select its local deployment with the installed CLI rather than borrowing another product's deployment.

Convex currently requires a non-empty auth-provider configuration while pushing these functions. The local deployment may use this public, non-secret placeholder audience; it does not enable a test-auth bypass:

```bash
pnpm exec convex env set GOOGLE_CLIENT_ID local-test-client-id --deployment local
```

`BFF_OPERATOR_IDENTITIES` should remain absent locally unless a specific manual authorization check requires it. All required operator authorization cases run deterministically through `convex-test`.

## Verify the live local health route

Keep `pnpm convex:local` running, open a second shell and load only the generated public local URL:

```bash
set -a
. ./.env.local
set +a
curl --fail --silent --show-error "$VITE_CONVEX_SITE_URL/v1/health"
```

Expected shape:

```json
{
  "status": "ok",
  "service": "business-factory-bff",
  "version": "development"
}
```

## Exercise the operator CLI

Use disposable local keys. Every command requires an explicit deployment, and cloud references are rejected unless `--confirm-cloud` is also present.

```bash
pnpm bff:environment -- create --deployment local --key sample-development --business-name Sample --environment-name Development
pnpm bff:environment -- create --deployment local --key sample-qa --business-name Sample --environment-name QA
pnpm bff:environment -- list --deployment local
pnpm bff:environment -- inspect --deployment local --key sample-development
pnpm bff:environment -- update --deployment local --key sample-development --environment-name Local
```

Repeat the first create command to verify that a duplicate key fails with exit code `3`. Attempting `update` with `--new-key` must fail during argument parsing with exit code `2`; the backend update operation has no key-change argument.

There is deliberately no delete command. Local rows are disposable. To preserve a recoverable copy while resetting all local Convex state, stop the backend and move the exact ignored directory aside:

```bash
mv .convex/local .convex/local.backup
```

Start `pnpm convex:local` again to recreate local state. Do not use that reset against any cloud deployment.

## Dashboard verification

The normal backoffice entry needs real public Google/Convex build configuration and therefore shows a configuration-required state when those values are absent. Local completion does not weaken that entry.

The deterministic browser harness uses a separate Vite entry that cannot be selected at runtime. Run both the desktop and Pixel 7 checks, then prove the test fixture is absent from the production bundle:

```bash
pnpm test:e2e
pnpm bundle:assert
```

## Complete local gate

The expected Nx projects are:

- `bff-contracts`
- `bff-service`
- `bff-operator`
- `bff-backoffice`
- `bff-backoffice-e2e`

Run the clean, deterministic gate:

```bash
pnpm install --frozen-lockfile
pnpm exec nx show projects
pnpm convex:check
pnpm check
git diff --check
```

`pnpm check` runs formatting, lint and ownership boundaries, type checks, unit/Convex integration tests, production builds, the test-fixture bundle assertion, secret scanning and Playwright. It uses no Google login and performs no deployment.

Before handoff, confirm that `.env.local`, `.convex/`, Playwright reports and build output remain ignored:

```bash
git status --short
git check-ignore .env.local .convex/local playwright-report dist
```

## Common recovery

- **Node or peer-version errors:** switch to Node 24 and rerun the frozen install; do not bypass peer checks.
- **Local site port refuses connections:** keep `pnpm convex:local` running and use `VITE_CONVEX_SITE_URL` from `.env.local`.
- **Convex rejects auth configuration:** set the non-secret local placeholder `GOOGLE_CLIENT_ID` shown above and restart the local backend.
- **Generated API is missing or stale:** run `pnpm exec convex dev --once --tail-logs disable` against the selected local deployment.
- **Playwright cannot find Chromium:** run `pnpm exec playwright install chromium`.
- **A cloud CLI target is refused:** this is intentional. Recheck the target and obtain explicit deployment approval before using `--confirm-cloud`.

Stop the local backend with `Ctrl-C`. Local state remains under the ignored `.convex/local` directory until intentionally moved or removed.
