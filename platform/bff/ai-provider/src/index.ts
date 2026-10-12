import { imageSize } from 'image-size';
import { z } from 'zod';
import {
  REVIEWED_TEXT_MODELS,
  reviewedTextModel,
  type ReviewedTextModel,
  RUNTIME_ANSWER_MODEL_KEY,
} from '@bff/assistant/models';
import {
  KNOWLEDGE_SELECTION_MODEL,
  buildKnowledgeSelectionInput,
  parseKnowledgeSelectionRequest,
  parseKnowledgeSelectionResponse,
  parseRuntimeKnowledgeSelectionRequest,
} from '@bff/assistant/knowledge-selection';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_BYTES = 100_000;
const MAX_PROMPT_BYTES = 24_000;
const MAX_PIXELS = 20_000_000;
const PRIVATE_HEADERS = {
  'cache-control': 'private, no-store',
  'x-content-type-options': 'nosniff',
};
const tool = z
  .object({
    type: z.literal('function'),
    function: z
      .object({
        name: z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/u),
        description: z.string().max(2000).optional(),
        parameters: z.record(z.string(), z.unknown()),
        strict: z.boolean().optional(),
      })
      .strict(),
  })
  .strict();
const message = z
  .object({
    role: z.enum(['system', 'user', 'assistant', 'tool']),
    content: z.string().max(24_000).nullable(),
    reasoning_content: z.string().max(24_000).nullable().optional(),
    tool_call_id: z.string().max(100).optional(),
    tool_calls: z
      .array(
        z
          .object({
            id: z.string().max(100),
            type: z.literal('function'),
            function: z
              .object({
                name: z.string().max(64),
                arguments: z.string().max(8000),
              })
              .strict(),
          })
          .strict(),
      )
      .max(8)
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.reasoning_content === undefined || value.role === 'assistant',
    { message: 'Reasoning echoes belong only to assistant messages' },
  );
const completion = z
  .object({
    model: z.enum(REVIEWED_TEXT_MODELS.map(({ nativeId }) => nativeId)),
    messages: z.array(message).min(1).max(40),
    stream: z.literal(false).optional(),
    max_tokens: z.number().int().min(1).max(1200).optional(),
    temperature: z.number().min(0).max(1).optional(),
    tools: z.array(tool).max(12).optional(),
    tool_choice: z.enum(['auto', 'none', 'required']).optional(),
  })
  .strict();
const generationCompletion = completion.extend({
  chat_template_kwargs: z
    .object({ enable_thinking: z.literal(false) })
    .strict()
    .optional(),
});

interface ImagesInput {
  transform(options: {
    width: number;
    height: number;
    fit: 'scale-down';
  }): ImagesInput;
  output(options: {
    format: 'image/png' | 'image/jpeg';
    anim: false;
  }): Promise<{ response(options?: { headers: HeadersInit }): Response }>;
}
export interface Environment {
  PROVIDER_SECRET: string;
  LIVE_TEXT_ENABLED: string;
  CAPS_VERIFIED: string;
  AI_GATEWAY_ID: string;
  /** Explicitly enabled for bounded operator experiments, not customer chat. */
  KNOWLEDGE_SELECTION_ENABLED?: string;
  /** Separate customer selection gate; never enables operator experiments. */
  RUNTIME_KNOWLEDGE_SELECTION_ENABLED?: string;
  /** Separate fail-closed operator-only generation controls, never customer chat. */
  GENERATION_EXPERIMENTS_ENABLED?: string;
  AI: {
    run(
      model: string,
      input: Record<string, unknown>,
      options: { gateway: { id: string; skipCache: boolean } },
    ): Promise<unknown>;
  };
  IMAGES: { input(stream: ReadableStream<Uint8Array>): ImagesInput };
}

function authorized(request: Request, expected?: string): boolean {
  const actual =
    request.headers.get('authorization')?.replace(/^Bearer /u, '') ?? '';
  if (!expected || expected.length < 32 || actual.length !== expected.length)
    return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++)
    difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}
async function readBytes(
  body: ReadableStream<Uint8Array> | null,
  maximum: number,
): Promise<Uint8Array<ArrayBuffer>> {
  if (!body) throw new Error('Missing body');
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > maximum) throw new Error('Body too large');
      chunks.push(chunk.value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export function inspectRaster(bytes: Uint8Array): {
  type: 'image/png' | 'image/jpeg';
  width: number;
  height: number;
} {
  const png =
    bytes.length >= 24 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every(
      (value, index) => bytes[index] === value,
    );
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!png && !jpeg) throw new Error('Unsupported raster');
  const dimensions = imageSize(bytes);
  if (
    !dimensions.width ||
    !dimensions.height ||
    dimensions.width * dimensions.height > MAX_PIXELS ||
    dimensions.width > 10_000 ||
    dimensions.height > 10_000
  )
    throw new Error('Raster dimensions too large');
  if ((png && dimensions.type !== 'png') || (jpeg && dimensions.type !== 'jpg'))
    throw new Error('Invalid raster');
  return {
    type: png ? 'image/png' : 'image/jpeg',
    width: dimensions.width,
    height: dimensions.height,
  };
}
function error(code: string, status: number): Response {
  return Response.json(
    { error: { message: code, type: 'provider_error', code } },
    { status, headers: PRIVATE_HEADERS },
  );
}

/** Private diagnostics expose only fixed field names/types, never provider values. */
function outputShape(output: unknown): string {
  const kind = (value: unknown) =>
    value === undefined
      ? 'missing'
      : value === null
        ? 'null'
        : Array.isArray(value)
          ? 'array'
          : typeof value;
  const shapes = [`root:${kind(output)}`];
  if (output && typeof output === 'object') {
    const root = output as Record<string, unknown>;
    for (const key of [
      'model',
      'answers',
      'usage',
      'result',
      'response',
      'output',
    ]) {
      shapes.push(`${key}:${kind(root[key])}`);
      if (root[key] && typeof root[key] === 'object') {
        const nested = root[key] as Record<string, unknown>;
        for (const field of [
          'model',
          'answers',
          'usage',
          'type',
          'noul',
          'input_tokens',
          'output_tokens',
          'skill_0',
        ])
          if (nested[field] !== undefined)
            shapes.push(`${key}.${field}:${kind(nested[field])}`);
      }
    }
  }
  return shapes.join(';');
}

/** Workers AI has documented native and OpenAI-shaped output variants. */
export function normalizeCompletion(
  output: unknown,
  selectedModel: ReviewedTextModel,
): unknown {
  if (!output || typeof output !== 'object')
    throw new Error('Invalid provider output');
  const raw = output as Record<string, unknown>;
  const nativeUsage = z
    .object({
      prompt_tokens: z.number().int().nonnegative().optional(),
      completion_tokens: z.number().int().nonnegative().optional(),
      total_tokens: z.number().int().nonnegative().optional(),
      input_tokens: z.number().int().nonnegative().optional(),
      output_tokens: z.number().int().nonnegative().optional(),
      completion_tokens_details: z
        .object({ reasoning_tokens: z.number().int().nonnegative().optional() })
        .optional(),
    })
    .optional()
    .parse(raw.usage);
  const inputTokens = nativeUsage?.prompt_tokens ?? nativeUsage?.input_tokens;
  const outputTokens =
    nativeUsage?.completion_tokens ?? nativeUsage?.output_tokens;
  const reasoningTokens =
    nativeUsage?.completion_tokens_details?.reasoning_tokens;
  if (
    reasoningTokens !== undefined &&
    outputTokens !== undefined &&
    reasoningTokens > outputTokens
  )
    throw new Error('Invalid provider usage');
  const usage = nativeUsage
    ? {
        ...(inputTokens === undefined ? {} : { prompt_tokens: inputTokens }),
        ...(outputTokens === undefined
          ? {}
          : { completion_tokens: outputTokens }),
        ...(nativeUsage.total_tokens === undefined
          ? inputTokens === undefined || outputTokens === undefined
            ? {}
            : { total_tokens: inputTokens + outputTokens }
          : { total_tokens: nativeUsage.total_tokens }),
        ...(reasoningTokens === undefined
          ? {}
          : {
              completion_tokens_details: { reasoning_tokens: reasoningTokens },
            }),
      }
    : undefined;
  if (Array.isArray(raw.choices)) {
    if (!raw.choices.length) throw new Error('Invalid provider output');
    return {
      ...raw,
      model: selectedModel.nativeId,
      ...(usage ? { usage } : {}),
    };
  }
  if (typeof raw.response !== 'string' && !Array.isArray(raw.tool_calls))
    throw new Error('Invalid provider output');
  const toolCalls = Array.isArray(raw.tool_calls)
    ? raw.tool_calls.map((entry) => {
        const modern = z
          .object({
            id: z.string().max(100),
            type: z.literal('function'),
            function: z.object({
              name: z.string().max(64),
              arguments: z.string().max(8000),
            }),
          })
          .safeParse(entry);
        if (modern.success) return modern.data;
        const call = z
          .object({ name: z.string().max(64), arguments: z.unknown() })
          .parse(entry);
        return {
          id: `call_${crypto.randomUUID()}`,
          type: 'function',
          function: {
            name: call.name,
            arguments:
              typeof call.arguments === 'string'
                ? call.arguments
                : JSON.stringify(call.arguments),
          },
        };
      })
    : [];
  return {
    id: `completion_${crypto.randomUUID()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: selectedModel.nativeId,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: raw.response ?? null,
          ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
        },
        finish_reason: toolCalls.length ? 'tool_calls' : 'stop',
      },
    ],
    ...(usage ? { usage } : {}),
  };
}

/** Private service bridge. No customer/provider selection, originals or public cache. */
export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (
      request.method !== 'POST' ||
      ![
        '/v1/chat/completions',
        '/v1/runtime/chat/completions',
        '/v1/judge/chat/completions',
        '/v1/experiments/chat/completions',
        '/v1/knowledge-selection',
        '/v1/runtime/knowledge-selection',
        '/raster-preview',
      ].includes(path)
    )
      return error('NOT_FOUND', 404);
    if (!authorized(request, env.PROVIDER_SECRET ?? ''))
      return error('UNAUTHORIZED', 401);
    if (path !== '/raster-preview') {
      if (
        env.LIVE_TEXT_ENABLED !== 'true' ||
        env.CAPS_VERIFIED !== 'true' ||
        !/^[a-z0-9_-]{1,64}$/u.test(env.AI_GATEWAY_ID ?? '')
      )
        return error('LIVE_TEXT_DISABLED', 503);
      if (
        path === '/v1/knowledge-selection' ||
        path === '/v1/runtime/knowledge-selection'
      ) {
        const runtimeSelection = path === '/v1/runtime/knowledge-selection';
        if (
          (runtimeSelection
            ? env.RUNTIME_KNOWLEDGE_SELECTION_ENABLED
            : env.KNOWLEDGE_SELECTION_ENABLED) !== 'true'
        )
          return error('KNOWLEDGE_SELECTION_DISABLED', 503);
        let selectionRequest;
        let nativeInput;
        try {
          const input = JSON.parse(
            new TextDecoder().decode(
              await readBytes(request.body, MAX_TEXT_BYTES),
            ),
          );
          const parsed = runtimeSelection
            ? parseRuntimeKnowledgeSelectionRequest(input)
            : parseKnowledgeSelectionRequest(input);
          selectionRequest = {
            question: parsed.question,
            skills: parsed.skills,
            ...(parsed.recentMessages
              ? { recentMessages: parsed.recentMessages }
              : {}),
          };
          nativeInput = buildKnowledgeSelectionInput(selectionRequest);
        } catch {
          return error('INVALID_INPUT', 400);
        }
        let output: unknown;
        try {
          output = await env.AI.run(
            KNOWLEDGE_SELECTION_MODEL,
            { ...nativeInput },
            { gateway: { id: env.AI_GATEWAY_ID, skipCache: true } },
          );
        } catch (cause) {
          const detail = cause instanceof Error ? cause.message : '';
          console.error('KNOWLEDGE_SELECTOR_FAILURE', {
            name: cause instanceof Error ? cause.name : 'UnknownError',
            codes: detail.match(/\b\d{3,5}\b/gu)?.slice(0, 3) ?? [],
          });
          const response = error('PROVIDER_UNAVAILABLE', 502);
          const codes = detail.match(/\b\d{3,5}\b/gu)?.slice(0, 3) ?? [];
          if (codes.length)
            response.headers.set('x-provider-error-codes', codes.join(','));
          return response;
        }
        try {
          if (JSON.stringify(output).length > MAX_TEXT_BYTES)
            return error('INVALID_PROVIDER_OUTPUT', 502);
          // The third-party binding returns a Cloudflare result envelope,
          // while documented direct native responses are already unwrapped.
          if (
            output &&
            typeof output === 'object' &&
            Object.hasOwn(output, 'result')
          )
            output = z
              .object({
                result: z.unknown(),
                success: z.literal(true).optional(),
                errors: z.array(z.unknown()).length(0).optional(),
                messages: z.array(z.unknown()).length(0).optional(),
              })
              .parse(output).result;
          // Keep the native probabilities and measured usage for the caller's
          // experiment report. Selection never executes a tool or grants access.
          parseKnowledgeSelectionResponse(output, selectionRequest);
          return Response.json(output, { headers: PRIVATE_HEADERS });
        } catch {
          const response = error('INVALID_PROVIDER_OUTPUT', 502);
          response.headers.set('x-provider-output-shape', outputShape(output));
          return response;
        }
      }
      const generationRequest = path === '/v1/experiments/chat/completions';
      if (generationRequest && env.GENERATION_EXPERIMENTS_ENABLED !== 'true')
        return error('GENERATION_EXPERIMENTS_DISABLED', 503);
      let input: z.infer<typeof generationCompletion>;
      try {
        input = (generationRequest ? generationCompletion : completion).parse(
          JSON.parse(
            new TextDecoder().decode(
              await readBytes(request.body, MAX_TEXT_BYTES),
            ),
          ),
        );
      } catch {
        return error('INVALID_INPUT', 400);
      }
      const selectedModel = reviewedTextModel(input.model);
      const judgeRequest = path === '/v1/judge/chat/completions';
      const runtimeRequest = path === '/v1/runtime/chat/completions';
      if (
        selectedModel.usage !== (judgeRequest ? 'judge' : 'answer') ||
        (generationRequest && selectedModel.key !== 'gemma4-26b') ||
        (runtimeRequest && selectedModel.key !== RUNTIME_ANSWER_MODEL_KEY) ||
        ((judgeRequest || generationRequest) &&
          (input.tools?.length ||
            input.tool_choice === 'required' ||
            input.messages.some(
              (entry) => entry.role === 'tool' || entry.tool_calls?.length,
            )))
      )
        return error('INVALID_INPUT', 400);
      // All reviewed models retain the same paid-work bound, even when the
      // provider offers a larger context. Bytes conservatively bound tokens.
      // SDK reasoning echoes are discarded, not counted as active prompt text.
      const nativeMessages = input.messages.map(
        ({ reasoning_content, content, ...value }) => {
          void reasoning_content;
          return { ...value, content: content ?? '' };
        },
      );
      if (
        new TextEncoder().encode(
          JSON.stringify({ messages: nativeMessages, tools: input.tools }),
        ).byteLength > MAX_PROMPT_BYTES
      )
        return error('INVALID_INPUT', 400);
      try {
        // Catalog roles restrict stronger models to private evaluation work.
        // Reviewed answer models use OpenAI function envelopes.
        // The binding performs inference only, never executes tool handlers.
        const output = await env.AI.run(
          selectedModel.nativeId,
          {
            // AI SDK echoes Qwen's reasoning output on a tool continuation.
            // Native input does not define that field; forward final content
            // and tool correlation only, never hidden reasoning history.
            // Tool-only assistant turns use null in the SDK; native input
            // receives the normalized empty string and original correlation.
            messages: nativeMessages,
            stream: false,
            max_tokens: input.max_tokens ?? 1200,
            ...(generationRequest && input.chat_template_kwargs
              ? { chat_template_kwargs: input.chat_template_kwargs }
              : {}),
            ...(input.temperature === undefined
              ? {}
              : { temperature: input.temperature }),
            ...(input.tools
              ? {
                  tools: input.tools,
                }
              : {}),
            ...(input.tool_choice ? { tool_choice: input.tool_choice } : {}),
          },
          { gateway: { id: env.AI_GATEWAY_ID, skipCache: true } },
        );
        if (JSON.stringify(output).length > 100_000)
          return error('INVALID_PROVIDER_OUTPUT', 502);
        return Response.json(normalizeCompletion(output, selectedModel), {
          headers: PRIVATE_HEADERS,
        });
      } catch (cause) {
        // Diagnostics contain only classification, never prompts, responses or credentials.
        const detail = cause instanceof Error ? cause.message : '';
        console.error('AI_PROVIDER_FAILURE', {
          name: cause instanceof Error ? cause.name : 'UnknownError',
          codes: detail.match(/\b\d{3,5}\b/gu)?.slice(0, 3) ?? [],
          hints: [
            'tool',
            'function',
            'type',
            'required',
            'permission',
            'unauthorized',
            'schema',
            'format',
            'json',
            'request',
            'limit',
            'token',
            'gateway',
            'cost',
            'input',
            'array',
            'valid',
            'disabled',
            'busy',
            'parse',
            'content',
            'message',
            'choice',
          ].filter((word) => detail.toLowerCase().includes(word)),
        });
        const response = error('PROVIDER_UNAVAILABLE', 502);
        const codes = detail.match(/\b\d{3,5}\b/gu)?.slice(0, 3) ?? [];
        if (codes.length)
          response.headers.set('x-provider-error-codes', codes.join(','));
        return response;
      }
    }
    try {
      const bytes = await readBytes(request.body, MAX_FILE_BYTES);
      const input = inspectRaster(bytes);
      if (
        request.headers.get('content-type')?.split(';')[0]?.trim() !==
        input.type
      )
        return error('INVALID_RASTER_TYPE', 400);
      const result = await env.IMAGES.input(new Blob([bytes]).stream())
        .transform({ width: 1600, height: 1600, fit: 'scale-down' })
        .output({ format: input.type, anim: false });
      const rewritten = result.response({ headers: PRIVATE_HEADERS });
      if (!rewritten.ok) return error('RASTER_CONVERSION_FAILED', 502);
      const preview = await readBytes(rewritten.body, MAX_FILE_BYTES);
      const actual = inspectRaster(preview);
      if (
        actual.type !== input.type ||
        actual.width > 1600 ||
        actual.height > 1600
      )
        return error('INVALID_RASTER_OUTPUT', 502);
      return new Response(preview, {
        headers: { ...PRIVATE_HEADERS, 'content-type': actual.type },
      });
    } catch {
      return error('RASTER_CONVERSION_FAILED', 400);
    }
  },
};
