# Production delivery tool

This Nx tool validates the complete production topology, builds the shared
surfaces, retained Example and TableCards for their separate Convex deployments,
and smoke-checks the live release. It is intentionally
separate from interactive development.

## CI scope

Both pull-request and main-push triggers ignore Markdown-only changes
(`**/*.md`), including `STATUS.md`, READMEs, brainstorms, plans, ADRs and skills.
These changes start no Actions run, full checks or production deployment. No
manual development refresh is needed just to publish a documentation SHA.

Any changed non-Markdown file keeps the normal validation gate; a mixed
documentation/code change still runs. A validated main push then deploys and
smoke-checks production. Source code, tests, schemas, dependencies, workflow and
deployment configuration, public assets and `.mdx` are **not** excluded. Markdown
currently is repository documentation, not runtime input; revise this filter
before introducing runtime-generated pages or configuration from Markdown.

Live health and metadata identify the **last deployed release commit**, which
may precede `main` after documentation-only commits. Do not redeploy or relabel
unchanged services merely to make their SHA match newer prose.

Use focused local checks for small implementation changes, full regression at
meaningful release boundaries, and only relevant prose/link checks for docs.
GitHub still runs the complete CI gate for non-Markdown changes. Before adding
required-check branch protection, reassess this path-filtered workflow: a skipped
workflow does not report its required check and can leave a docs-only PR pending.
See [GitHub's path-filter documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onpushpull_requestpull_request_targetpathspaths-ignore)
and [required-check guidance](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks#handling-skipped-but-required-checks).

## Commands

```bash
pnpm production:build
pnpm production:verify-example-target
pnpm production:verify-tablecards-target
pnpm production:smoke
pnpm nx run production-delivery:test
```

`production:build` runs once as a no-mutation preflight and again through the
BFF `convex deploy --cmd` hook. The hook supplies `BFF_DEPLOY_CONVEX_URL`. The
tool refuses to build unless it matches `EXPECTED_CONVEX_URL`, the BFF/example
Convex pairs are internally consistent and separate, and every remaining public
value identifies the fixed production lane. It builds and audits backoffice,
customer auth, retained Example and enabled TableCards before adding exact-SHA
metadata. Main CI explicitly enables TableCards; missing configuration fails
closed. Legacy Build 2-only local callers may omit that surface.

`production:smoke` makes anonymous requests only. It verifies both backend
health contracts and exact commit, public-only JWKS, absence of the development
provider route, unauthenticated product and gateway denial, security headers,
asset metadata and the exact targets embedded in every published JavaScript
bundle. It never uses a Google token, session cookie or provider deployment
credential. TableCards checks also cover its gateway CORS, private-file denial,
private AI adapter denial, fixed production endpoints and disabled dev controls.

`production:verify-example-target` validates the documented Convex
deployment-scoped key format before the CLI is allowed to run. It extracts only
the non-secret production deployment name and rejects the key unless it exactly
matches `EXPECTED_EXAMPLE_CONVEX_URL`. The token is never printed or returned.
CI performs this local guard before any example environment write.

`production:verify-tablecards-target` applies the same guard to
`EXPECTED_TABLECARDS_CONVEX_URL`. CI supplies only the TableCards-scoped key in
that step, before configuration/deployment of the independent product backend.

## Public inputs

| Name                           | Used by      | Purpose                                                             |
| ------------------------------ | ------------ | ------------------------------------------------------------------- |
| `BACKOFFICE_URL`               | build, smoke | Must be `https://ops.tofler.tech`                                   |
| `CUSTOMER_AUTH_URL`            | build, smoke | Must be `https://auth.tofler.app`                                   |
| `EXAMPLE_WEB_URL`              | build, smoke | Must be `https://example.tofler.app`                                |
| `EXAMPLE_SESSION_ADAPTER_URL`  | build, smoke | Must be `https://api.example.tofler.app`                            |
| `BFF_CUSTOMER_ENVIRONMENT_KEY` | build, smoke | Must be `example-production`                                        |
| `CONVEX_SITE_URL`              | build, smoke | BFF production HTTP-action origin                                   |
| `EXPECTED_CONVEX_URL`          | build, smoke | BFF production client origin                                        |
| `BFF_DEPLOY_CONVEX_URL`        | build        | Convex-injected BFF client origin; must equal `EXPECTED_CONVEX_URL` |
| `EXAMPLE_CONVEX_SITE_URL`      | build, smoke | Separate example production HTTP-action origin                      |
| `EXPECTED_EXAMPLE_CONVEX_URL`  | build, smoke | Matching separate example production client origin                  |
| `GITHUB_SHA`                   | build, smoke | Full 40-character commit expected everywhere                        |

With `TABLECARDS_PRODUCTION_ENABLED=true` (mandatory in main CI), also provide:

| Name                             | Required production value                                             |
| -------------------------------- | --------------------------------------------------------------------- |
| `TABLECARDS_WEB_URL`             | `https://tablecards.tofler.app`                                       |
| `TABLECARDS_SESSION_ADAPTER_URL` | `https://api.tablecards.tofler.app`                                   |
| `TABLECARDS_ENVIRONMENT_KEY`     | `tablecards-production`                                               |
| `TABLECARDS_CONVEX_SITE_URL`     | `https://clean-gerbil-451.convex.site`                                |
| `EXPECTED_TABLECARDS_CONVEX_URL` | `https://clean-gerbil-451.convex.cloud`                               |
| `TABLECARDS_CLOUDFLARE_AI_URL`   | `https://business-factory-tablecards-ai.kabytaa.workers.dev/generate` |
| `TABLECARDS_AI_DAILY_BUDGET_USD` | `1` (separate production admission budget)                            |

Deployment secrets stay in the GitHub `production` environment. The target
guard reads `CONVEX_DEPLOY_KEY` only to compare its non-secret deployment-name
prefix; build and smoke never receive deploy keys. See
`docs/operations/build-2-customer-auth.md` for the multi-surface setup, key
handling, deployment order, smoke contract and partial release recovery. See
[TableCards Operations](../../projects/tablecards/docs/operations.md#production-release-and-recovery)
for private provider/checkout setup, the no-charge boundary, browser smoke and
AI pause/recovery. Build and smoke never receive provider/session secrets.
