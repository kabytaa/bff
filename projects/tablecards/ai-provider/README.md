# TableCards Cloudflare AI adapter

Private bridge from the TableCards Convex Node action to
Cloudflare's Workers AI binding. It owns no product data, sessions, unit balances
or queue. The browser never calls it. See [Architecture](../docs/architecture.md#ai-usage-and-payment-boundary)
and [Operations](../docs/operations.md#cloudflare-ai-budget-and-reference-images).

`POST /generate` requires a server-only bearer secret, bounds the JSON body and
fixes FLUX.2 [klein] 4B to 1344 × 768 pixels. It accepts a bounded prompt/seed
and optional PNG/JPEG reference from the validated backend, and returns one
base64 image. The backend makes exactly four calls for an accepted batch.
No CORS, provider payload logging or client-selected model is exposed.

Run from the repository root with Node 24:

```sh
pnpm exec nx run tablecards-ai-provider:test
pnpm exec nx run tablecards-ai-provider:typecheck
pnpm exec nx run tablecards-ai-provider:lint
pnpm exec nx run tablecards-ai-provider:build
```

The build is a Wrangler dry run, not a deployment. Authorized development deploy:

```sh
pnpm exec wrangler deploy --config projects/tablecards/ai-provider/wrangler.jsonc
pnpm exec wrangler secret put PROVIDER_SECRET --config projects/tablecards/ai-provider/wrangler.jsonc
```

Install the same strong random secret in the TableCards development Convex
environment as `TABLECARDS_CLOUDFLARE_AI_SECRET`; never put it in a file, browser
build, command-line argument or evidence. Configure `TABLECARDS_CLOUDFLARE_AI_URL`
and `TABLECARDS_AI_PROVIDER=cloudflare` there. Set
`TABLECARDS_AI_DAILY_BUDGET_USD=1` for the authorized development budget. The `AI` binding uses Cloudflare's
existing account authorization, not an OpenAI key.

Deployment-wide budget admission is enforced transactionally in Convex,
not by this stateless adapter. Preserve fixed model/geometry and no inference
retries when changing it. An exposed/copied server secret is an operator incident,
not a reason to make this endpoint public. Production uses the separate
`wrangler.production.jsonc` Worker with a different `PROVIDER_SECRET` and URL.
Main CI deploys code without replacing that secret. Its Convex budget and
`aiBatches` counter are independent, while provider free credits/billing still
belong to the same Cloudflare account. See the [production runbook](../docs/operations.md#production-release-and-recovery).
