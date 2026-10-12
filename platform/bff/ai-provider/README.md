# Private Operator provider bridge

`bff-ai-provider` is a shared development Worker with private service endpoints.
It contains no Business prompts, customer identity logic or public upload surface.

- `POST /v1/chat/completions` accepts bounded OpenAI chat input for reviewed
  inexpensive answer candidates (Qwen3 30B, GLM 4.7 Flash and Gemma 4 26B).
  Model keys are selected only by trusted server/operator configuration, never
  customer messages. Native Workers AI binding calls always include the fixed
  server `AI_GATEWAY_ID`; no route override or model fallback is accepted.
- `POST /v1/runtime/chat/completions` is the trusted backend's customer path.
  Only the fixed reviewed Gemma 4 26B identifier is accepted; other comparison
  candidates, judges, Jev and generation overrides are rejected. Permitted
  server/browser tool correlation uses the same bounded protocol; the binding
  performs inference only and never executes a tool or sends a support reply.
- `POST /v1/judge/chat/completions` accepts reviewed evaluation-only judges:
  GPT-OSS 120B (unchanged default), Kimi K2.6 and DeepSeek V4 Flash 0731.
  The ordinary answer route rejects all three; the judge route rejects
  answer models, tools and tool history. It uses the same authentication and
  gateway caps, not a separate uncapped or customer-accessible provider.
- `POST /raster-preview` accepts at most 5 MiB of PNG/JPEG bytes with matching
  MIME/magic and at most 20 million decoded pixels. Images binding re-encodes
  a still PNG/JPEG at no more than 1,600px in each dimension. New bytes are returned
  with private/no-store headers. Callers store these privately and authorize reads.
  Originals, public URLs, SVG, documents and conversion fallback are unsupported.
- `POST /v1/knowledge-selection` is an explicitly enabled operator experiment,
  never used by customer chat. It accepts only bounded question/history and
  caller-authorized assigned skill names/descriptions; no knowledge content,
  model/gateway override or evaluation expectations. The server builds fixed
  `typesafe/jev` relevance questions and uses the same gateway. Native output
  must contain exactly one valid probability per assigned descriptor, with
  actual model version and optional measured usage. No tools execute and no
  permissions are granted. `KNOWLEDGE_SELECTION_ENABLED=true` is an additional
  fail-closed gate; it defaults false. The caller owns the combined USD 2 run
  bound, mandatory facts and full-compact fallback on ambiguity/errors.
- `POST /v1/runtime/knowledge-selection` uses the same metadata-only Jev contract
  with an explicit `kind: 'helper' | 'support'`. It is independently gated by
  `RUNTIME_KNOWLEDGE_SELECTION_ENABLED=true` alongside private authentication,
  live text and verified caps; enabling it does not enable the experiment route.
  Mandatory keys remain trusted backend/Business configuration, not provider
  request instructions. The backend validates complete assigned fallback before
  IO, adds mandatory knowledge and uses only assigned content on selector failure.
  No new provider, route override, model fallback, retries or permissions result.
- `POST /v1/experiments/chat/completions` is a separately gated operator-only
  Gemma generation experiment. `GENERATION_EXPERIMENTS_ENABLED=true` is required
  in addition to live/cap gates. Only exact reviewed Gemma, no tools/tool history,
  the same 24KB prompt and 1,200 output tokens are accepted. The default omits
  generation controls; the only override is documented
  `chat_template_kwargs: { enable_thinking: false }`. Ordinary answer/judge
  routes reject it. This does not change customer generation defaults.

All endpoints require `Authorization: Bearer <PROVIDER_SECRET>` from trusted server code.
Set the secret with Wrangler's secret command using the explicit development
manifest. Never place it in files. No production manifest exists.

The checked-in manifest disables live text. Both `LIVE_TEXT_ENABLED=true` and
`CAPS_VERIFIED=true`, plus a configured gateway ID, are required for inference.
Cap verification means actual setup/readback and provider-blocking proof;
do not toggle it merely to silence the disabled response. Gateway spend limits
are estimated/eventually consistent and may overshoot for concurrent calls.
The [official launch article](https://blog.cloudflare.com/ai-gateway-spend-limits/)
documents fixed daily/monthly resets. Andrew configured named global USD 3 /
1 day / Fixed and USD 30 / 1 month / Fixed rules on `bff-operator-dev`.
2026-10-10 readback returned windows 86400 and 2592000 respectively, with no
model/provider/metadata partitions. A temporary USD 0.000001 guard returned
gateway HTTP 429/code 2045, then was removed and the original two rules read back.
Month rollover/timezone and concurrent overshoot are not independently measured.
Development mock generation stays in the server library.

All text requests are non-streaming, with at most 1,200 output tokens. The raw
body limit remains 100 KB, and the normalized native messages plus tool schemas
must fit **24,000 UTF-8 bytes**, including multibyte language input. Larger model
context windows never widen this paid-work bound. Oversized input is rejected
before inference, never silently truncated or retried with another model.

The pure [reviewed model catalog](../libs/assistant/src/models.ts) records exact
native IDs, answer/judge roles, context sizes and provider token prices checked
2026-10-11. Its estimates use measured input/output tokens when available, not
a fixed per-message charge or a new spending table. Missing usage is not zero.
Model selection still requires actual calibrated evaluations; allowlisting a
candidate is not a claim that it is more accurate or ready for live use.

Earlier 2026-10-11 development access probes for Kimi K2.6 and DeepSeek V4 Flash both
returned Workers AI code 5035 (Workers Paid required). Neither produced a graded
answer, and no plan upgrade/prepaid purchase had been performed at that time.
The later authorized prepaid setup restored native answer inference; these two
judge models have not been reprobed. The private judge route is implemented.
GPT-OSS's earlier calibration still has a false pass; current comparison uses
explicitly supervised subscription-agent judgments, not that API judge.
Kimi and DeepSeek require the existing account to have Workers Paid access or
prepaid Gateway credits. A permission/billing failure remains a failed
evaluation; never upgrade, purchase credits, bypass caps or substitute a model
automatically. Kimi K2.5 is deprecated and aliases to the more expensive K2.6;
only the exact reviewed K2.6 identifier is accepted.

After rechecking caps, preserve the live development override when publishing:

```bash
pnpm exec wrangler deploy --config platform/bff/ai-provider/wrangler.jsonc \
  --var LIVE_TEXT_ENABLED:true --var CAPS_VERIFIED:true \
  --var AI_GATEWAY_ID:bff-operator-dev
```

The manifest intentionally stays fail-closed. Publishing without these overrides
disables text; BFF also requires `BFF_OPERATIONS_AI_MODE=live` and
`BFF_OPERATIONS_CAPS_VERIFIED=verified` on `compassionate-buffalo-689` only.
Add `--var KNOWLEDGE_SELECTION_ENABLED:true` only for an authorized bounded Jev
experiment. This route uses existing prepaid credits without widening caps or
upgrading the plan. The authorized 2026-10-11 setup enabled Gateway authentication
and native `unified` billing; only those settings changed, keeping caps,
logging/caching, rate limits and automatic top-ups unchanged. The current
setup token can manage Gateway/billing but direct inference returned HTTP
401/code 10000; the Worker AI binding avoids needing a new REST inference key.
Add `--var RUNTIME_KNOWLEDGE_SELECTION_ENABLED:true` for the accepted Gemma/Jev
development customer checkpoint. The manifest remains fail-closed when this
override is absent; production has no manifest and remains untouched.
Add `--var GENERATION_EXPERIMENTS_ENABLED:true` only during an authorized paired
generation test. Both experimental gates default false in the manifest.

Run under Node24:
`pnpm exec nx run bff-ai-provider:test`, `:typecheck`, `:lint`, and `:build`.
Build is Wrangler dry-run only. Actual deployment is coordinated with the main
development delivery and uses `wrangler deploy --config platform/bff/ai-provider/wrangler.jsonc`.

Reviewed answer tool definitions preserve OpenAI `function` envelopes, not older flat-model
definitions; the binding executes inference only, never browser/backend tools.
Qwen's documented choices envelope passes back to AI SDK; documented native
`response`/`tool_calls` variants are normalized to the same compatible envelope.
The returned model ID identifies the reviewed native model actually requested.
Documented native input/output token usage aliases normalize to OpenAI usage;
absent usage stays absent. The installed SDK echoes `reasoning_content` during tool continuations. The
bridge accepts a bounded assistant-only echo, then discards it before native
inference, preserving content and tool correlation. Tool-only assistant
`content: null` becomes an empty string for native message validation. Native
Qwen input does not define the reasoning field; reasoning is not stored as customer/operator history. A
regression uses the actual SDK through mock bindings, not paid model inference.
Measured `completion_tokens_details.reasoning_tokens` is preserved when the
provider reports it; missing details remain absent. The SDK may synthesize zero
when details are absent, so operator generation experiments must read the raw
numeric measurement and record missing reasoning usage as unknown. Counts do not
store the model's reasoning text. Earlier experiment records made before this
correction retain their original zero fields, which are not proof of no reasoning.
Provider-failure diagnostics contain class, numeric codes and fixed keyword flags
only, never the raw error, prompt, response or credential.
Authenticated private responses may additionally carry up to three numeric codes
in `x-provider-error-codes`, for operator diagnosis when a live tail is unavailable.
No raw provider error or customer text is included in that header.
Invalid selector responses can include `x-provider-output-shape`, containing only
fixed field names/types. The third-party binding's result envelope is unwrapped;
outer metadata is discarded and the inner native decision stays strictly validated.

Cloudflare advertises configurable GPT-OSS reasoning effort, but its published
native input schema does not currently define `reasoning_effort`. This bridge
does not expose an unverified override; actual judge calibration must establish
valid, non-truncated results within the existing bound.
Kimi and DeepSeek publish `max_tokens` (deprecated but accepted) and structured
`response_format` inputs; this minimal bridge still uses the existing bounded
text-JSON grading contract without new generation parameters. Kimi supports
`high`/`none` reasoning and maps `low`/`medium` to `high`; DeepSeek supports
`none`/`low`/`high`/`max`. Neither changes the current 1,200-token bound or adds a
reasoning override here. Calibration must reject truncated or invalid grades.
Use full input prices conservatively: Gateway response caching is bypassed,
while native prompt-prefix caching is a separate provider optimization and
must not be assumed to produce a hit or discount.
For Gemma, the [official binding example](https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/)
explicitly disables thinking using `chat_template_kwargs`. The inspected docs do
not establish the default or a Gemma `reasoning_effort` setting; do not infer
either from a blank answer or missing usage.

Sources: [AI Gateway native binding](https://developers.cloudflare.com/ai-gateway/usage/providers/workersai/),
[traditional tools](https://developers.cloudflare.com/workers-ai/features/function-calling/traditional/),
[Qwen output](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/),
[GLM schema](https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/),
[Gemma schema](https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/),
[GPT-OSS judge](https://developers.cloudflare.com/workers-ai/models/gpt-oss-120b/),
[Kimi judge](https://developers.cloudflare.com/workers-ai/models/kimi-k2.6/),
[DeepSeek judge](https://developers.cloudflare.com/workers-ai/models/deepseek-v4-flash-0731/),
[Images binding](https://developers.cloudflare.com/images/optimization/binding/),
[Free allowance](https://developers.cloudflare.com/images/pricing/).
