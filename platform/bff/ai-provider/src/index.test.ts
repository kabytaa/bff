import { describe, expect, it, vi } from 'vitest';
import worker, { inspectRaster, normalizeCompletion } from './index';
import type { Environment } from './index';
import {
  composeAssistantInstructions,
  generateAssistantTurn,
  selectAssistantKnowledge,
} from '@bff/assistant/server';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, isStepCount, tool } from 'ai';
import {
  REVIEWED_TEXT_MODELS,
  reviewedAnswerModel,
  reviewedJudgeModel,
} from '@bff/assistant/models';
import { z } from 'zod';
import { encode } from 'jpeg-js';

const secret = 'synthetic-provider-secret-for-test-only';
const png = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRz8AAAAASUVORK5CYII=',
    'base64',
  ),
);
function environment(): Environment {
  const images = {
    transform: vi.fn(() => images),
    output: vi.fn(async () => ({
      response: () =>
        new Response(png, { headers: { 'content-type': 'image/png' } }),
    })),
  };
  return {
    PROVIDER_SECRET: secret,
    LIVE_TEXT_ENABLED: 'false',
    CAPS_VERIFIED: 'false',
    AI_GATEWAY_ID: 'operator-dev',
    AI: {
      run: vi.fn(async () => ({
        id: 'completion',
        object: 'chat.completion',
        created: 0,
        model: '@cf/qwen/qwen3-30b-a3b-fp8',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Hello' },
            finish_reason: 'stop',
          },
        ],
      })),
    },
    IMAGES: { input: vi.fn(() => images) },
  };
}
function request(
  path: string,
  body: string | Uint8Array,
  contentType = 'application/json',
): Request {
  return new Request(`https://private.example${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, 'content-type': contentType },
    body: typeof body === 'string' ? body : new Uint8Array(body),
  });
}
describe('private provider bridge', () => {
  it('runs runtime Jev then Gemma through the actual SDK without exposing knowledge to the selector or executing a browser tool', async () => {
    const env = environment();
    env.LIVE_TEXT_ENABLED = 'true';
    env.CAPS_VERIFIED = 'true';
    env.RUNTIME_KNOWLEDGE_SELECTION_ENABLED = 'true';
    const skills = [
      {
        key: 'example.core',
        name: 'Core',
        whenToUse: 'Scope and routes',
        version: 1,
        content: 'Mandatory scoped facts.',
      },
      {
        key: 'example.help',
        name: 'Help',
        whenToUse: 'How to use this product',
        version: 1,
        content: 'Reviewed help content.',
      },
      {
        key: 'example.payment',
        name: 'Payment',
        whenToUse: 'Payment questions',
        version: 1,
        content: 'Private unused payment facts.',
      },
    ];
    let calls = 0;
    const read = vi.fn(async () => ({ signedIn: false }));
    env.AI.run = vi.fn(async () => {
      const step = ++calls;
      if (step === 1)
        return {
          model: 'jev-1.13.0',
          answers: {
            skill_0: { type: 'noul', noul: 0.05 },
            skill_1: { type: 'noul', noul: 0.95 },
            skill_2: { type: 'noul', noul: 0.05 },
          },
        };
      return {
        tool_calls: [
          {
            name: step === 2 ? 'getCurrentCustomerContext' : 'offerLink',
            arguments: {},
          },
        ],
      };
    });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) =>
        worker.fetch(new Request(input, init), env),
      );
    try {
      const provider = {
        baseUrl: 'https://private.example',
        secret,
        capsVerified: true,
      };
      const knowledge = await selectAssistantKnowledge({
        mode: 'live',
        provider,
        kind: 'helper',
        question: 'Where is help?',
        skills,
        mandatorySkillKeys: ['example.core'],
      });
      const result = await generateAssistantTurn({
        mode: 'live',
        purpose: 'runtime-answer',
        provider,
        instructions: composeAssistantInstructions({
          kind: 'helper',
          businessInstructions: 'Use current reviewed facts.',
          ...knowledge,
        }),
        messages: [{ role: 'user', content: 'Where is help?' }],
        tools: {
          getCurrentCustomerContext: tool({
            inputSchema: z.object({}),
            execute: read,
          }),
          offerLink: tool({ inputSchema: z.object({}) }),
        },
      });
      expect(env.AI.run).toHaveBeenCalledTimes(3);
      const nativeCalls = vi.mocked(env.AI.run).mock.calls;
      expect(nativeCalls.map(([model]) => model)).toEqual([
        'typesafe/jev',
        reviewedAnswerModel('gemma4-26b').nativeId,
        reviewedAnswerModel('gemma4-26b').nativeId,
      ]);
      expect(JSON.stringify(nativeCalls[0]![1])).not.toContain(
        'Mandatory scoped facts',
      );
      expect(JSON.stringify(nativeCalls[0]![1])).not.toContain(
        'Reviewed help content',
      );
      expect(JSON.stringify(nativeCalls[1]![1])).toContain(
        'Mandatory scoped facts',
      );
      expect(JSON.stringify(nativeCalls[1]![1])).toContain(
        'Reviewed help content',
      );
      expect(JSON.stringify(nativeCalls[1]![1])).not.toContain(
        'Private unused payment facts',
      );
      expect(read).toHaveBeenCalledTimes(1);
      expect(result.toolUsage).toEqual(['getCurrentCustomerContext']);
      expect(result.toolCalls).toEqual([
        expect.objectContaining({ toolName: 'offerLink', input: {} }),
      ]);
      expect(result.modelCalls).toBe(2);
    } finally {
      fetchSpy.mockRestore();
    }
  });
  it('locks the separate runtime answer route to Gemma and preserves private cap gates', async () => {
    const env = environment();
    const path = '/v1/runtime/chat/completions';
    const body = {
      model: reviewedAnswerModel('gemma4-26b').nativeId,
      messages: [{ role: 'user', content: 'Synthetic scoped question' }],
    };
    expect(
      (await worker.fetch(request(path, JSON.stringify(body)), env)).status,
    ).toBe(503);
    env.LIVE_TEXT_ENABLED = 'true';
    expect(
      (await worker.fetch(request(path, JSON.stringify(body)), env)).status,
    ).toBe(503);
    env.CAPS_VERIFIED = 'true';
    expect(
      (
        await worker.fetch(
          new Request(`https://private.example${path}`, {
            method: 'POST',
            body: JSON.stringify(body),
          }),
          env,
        )
      ).status,
    ).toBe(401);
    for (const model of REVIEWED_TEXT_MODELS.filter(
      ({ key }) => key !== 'gemma4-26b',
    ))
      expect(
        (
          await worker.fetch(
            request(path, JSON.stringify({ ...body, model: model.nativeId })),
            env,
          )
        ).status,
      ).toBe(400);
    for (const override of [
      { model: 'typesafe/jev' },
      { modelKey: 'gemma4-26b' },
      { max_tokens: 1201 },
      { gateway: 'uncapped' },
      { chat_template_kwargs: { enable_thinking: false } },
    ])
      expect(
        (
          await worker.fetch(
            request(path, JSON.stringify({ ...body, ...override })),
            env,
          )
        ).status,
      ).toBe(400);
    expect(env.AI.run).not.toHaveBeenCalled();
    expect(
      (await worker.fetch(request(path, JSON.stringify(body)), env)).status,
    ).toBe(200);
    expect(env.AI.run).toHaveBeenCalledExactlyOnceWith(
      body.model,
      expect.objectContaining({ max_tokens: 1200, stream: false }),
      { gateway: { id: 'operator-dev', skipCache: true } },
    );
  });
  it('preserves measured reasoning counts without synthesizing absent usage', () => {
    const model = reviewedAnswerModel('gemma4-26b');
    const observed = normalizeCompletion(
      {
        response: 'A grounded answer.',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          completion_tokens_details: { reasoning_tokens: 35 },
        },
      },
      model,
    );
    expect(observed).toMatchObject({
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
        completion_tokens_details: { reasoning_tokens: 35 },
      },
    });
    expect(
      normalizeCompletion(
        {
          response: 'No measurement.',
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        },
        model,
      ),
    ).not.toHaveProperty('usage.completion_tokens_details');
    for (const reasoning_tokens of [-1, 51]) {
      expect(() =>
        normalizeCompletion(
          {
            response: 'Bad measurement.',
            usage: {
              input_tokens: 100,
              output_tokens: 50,
              completion_tokens_details: { reasoning_tokens },
            },
          },
          model,
        ),
      ).toThrow();
    }
  });
  it('isolates documented Gemma thinking controls behind the private experiment gate', async () => {
    const env = environment();
    env.LIVE_TEXT_ENABLED = 'true';
    env.CAPS_VERIFIED = 'true';
    const body = {
      model: reviewedAnswerModel('gemma4-26b').nativeId,
      messages: [{ role: 'user', content: 'A synthetic question.' }],
      max_tokens: 1200,
    };
    const path = '/v1/experiments/chat/completions';
    expect(
      (await worker.fetch(request(path, JSON.stringify(body)), env)).status,
    ).toBe(503);
    expect(env.AI.run).not.toHaveBeenCalled();
    Object.assign(env, { GENERATION_EXPERIMENTS_ENABLED: 'true' });
    for (const kwargs of [undefined, { enable_thinking: false }]) {
      const requestBody = {
        ...body,
        ...(kwargs ? { chat_template_kwargs: kwargs } : {}),
      };
      const response = await worker.fetch(
        request(path, JSON.stringify(requestBody)),
        env,
      );
      expect(response.status).toBe(200);
      const nativeInput = vi.mocked(env.AI.run).mock.calls.at(-1)![1];
      expect(nativeInput.max_tokens).toBe(1200);
      if (kwargs) expect(nativeInput.chat_template_kwargs).toEqual(kwargs);
      else expect(nativeInput).not.toHaveProperty('chat_template_kwargs');
      expect(vi.mocked(env.AI.run).mock.calls.at(-1)![2]).toEqual({
        gateway: { id: 'operator-dev', skipCache: true },
      });
    }
    for (const override of [
      { model: reviewedAnswerModel('qwen3-30b').nativeId },
      { max_tokens: 1201 },
      { gateway: 'uncapped' },
      { chat_template_kwargs: { enable_thinking: false, arbitrary: true } },
      { chat_template_kwargs: { enable_thinking: 'false' } },
      { chat_template_kwargs: { enable_thinking: true } },
      {
        tools: [
          { type: 'function', function: { name: 'read', parameters: {} } },
        ],
      },
      { messages: [{ role: 'tool', content: '{}', tool_call_id: 'call' }] },
      { messages: [{ role: 'user', content: '語'.repeat(8000) }] },
    ]) {
      expect(
        (
          await worker.fetch(
            request(path, JSON.stringify({ ...body, ...override })),
            env,
          )
        ).status,
      ).toBe(400);
    }
    expect(env.AI.run).toHaveBeenCalledTimes(2);
    expect(
      (
        await worker.fetch(
          request(
            '/v1/chat/completions',
            JSON.stringify({
              ...body,
              chat_template_kwargs: { enable_thinking: false },
            }),
          ),
          env,
        )
      ).status,
    ).toBe(400);
    expect(env.AI.run).toHaveBeenCalledTimes(2);
    expect(
      (
        await worker.fetch(
          new Request(`https://private.example${path}`, {
            method: 'POST',
            body: JSON.stringify(body),
          }),
          env,
        )
      ).status,
    ).toBe(401);
    env.CAPS_VERIFIED = 'false';
    expect(
      (await worker.fetch(request(path, JSON.stringify(body)), env)).status,
    ).toBe(503);
    expect(env.AI.run).toHaveBeenCalledTimes(2);
  });
  it.each(REVIEWED_TEXT_MODELS.filter(({ usage }) => usage === 'answer'))(
    'accepts only the reviewed $key answer candidate on the same gateway',
    async (model) => {
      const env = environment();
      env.LIVE_TEXT_ENABLED = 'true';
      env.CAPS_VERIFIED = 'true';
      env.AI.run = vi.fn(async () => ({
        response: 'A synthetic grounded answer.',
        usage: { input_tokens: 12, output_tokens: 8 },
      }));
      const response = await worker.fetch(
        request(
          '/v1/chat/completions',
          JSON.stringify({
            model: model.nativeId,
            messages: [{ role: 'user', content: 'Help' }],
          }),
        ),
        env,
      );
      expect(response.status).toBe(200);
      expect(env.AI.run).toHaveBeenCalledWith(
        model.nativeId,
        expect.objectContaining({ max_tokens: 1200, stream: false }),
        { gateway: { id: 'operator-dev', skipCache: true } },
      );
      expect(await response.json()).toMatchObject({
        model: model.nativeId,
        usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
      });
    },
  );
  it.each(REVIEWED_TEXT_MODELS.filter(({ usage }) => usage === 'judge'))(
    'isolates the $key evaluation judge from answers without bypassing shared caps',
    async (judge) => {
      const env = environment();
      env.LIVE_TEXT_ENABLED = 'true';
      env.CAPS_VERIFIED = 'true';
      const body = {
        model: judge.nativeId,
        messages: [{ role: 'user', content: 'Score this synthetic answer.' }],
        max_tokens: 600,
        temperature: 0,
      };
      expect(
        (
          await worker.fetch(
            request('/v1/chat/completions', JSON.stringify(body)),
            env,
          )
        ).status,
      ).toBe(400);
      expect(env.AI.run).not.toHaveBeenCalled();
      env.AI.run = vi.fn(async () => ({
        id: 'synthetic-grade',
        object: 'chat.completion',
        created: 0,
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: '{"pass":true}' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
      }));
      const accepted = await worker.fetch(
        request('/v1/judge/chat/completions', JSON.stringify(body)),
        env,
      );
      expect(accepted.status).toBe(200);
      expect(env.AI.run).toHaveBeenCalledWith(
        judge.nativeId,
        expect.objectContaining({ max_tokens: 600, temperature: 0 }),
        { gateway: { id: 'operator-dev', skipCache: true } },
      );
      expect(await accepted.json()).toMatchObject({
        model: judge.nativeId,
        choices: [
          { message: { content: '{"pass":true}' }, finish_reason: 'stop' },
        ],
        usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
      });
      for (const override of [
        { model: reviewedAnswerModel().nativeId },
        { model: '@cf/openai/gpt-oss-20b' },
        { model: '@cf/moonshotai/kimi-k2.5' },
        { model: '@cf/zai-org/glm-5.3' },
        { model: 'gpt-6.1-sol' },
        { max_tokens: 1201 },
        { reasoning_effort: 'high' },
        { gateway: 'uncapped' },
        {
          tools: [
            { type: 'function', function: { name: 'read', parameters: {} } },
          ],
        },
        { tool_choice: 'required' },
        { messages: [{ role: 'tool', content: '{}', tool_call_id: 'tool' }] },
        {
          messages: [
            {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'unexpected-tool',
                  type: 'function',
                  function: { name: 'read', arguments: '{}' },
                },
              ],
            },
          ],
        },
      ]) {
        expect(
          (
            await worker.fetch(
              request(
                '/v1/judge/chat/completions',
                JSON.stringify({ ...body, ...override }),
              ),
              env,
            )
          ).status,
        ).toBe(400);
      }
      expect(env.AI.run).toHaveBeenCalledTimes(1);
      const disabled = environment();
      expect(
        (
          await worker.fetch(
            request('/v1/judge/chat/completions', JSON.stringify(body)),
            disabled,
          )
        ).status,
      ).toBe(503);
      expect(disabled.AI.run).not.toHaveBeenCalled();
      const unverified = environment();
      unverified.LIVE_TEXT_ENABLED = 'true';
      expect(
        (
          await worker.fetch(
            request('/v1/judge/chat/completions', JSON.stringify(body)),
            unverified,
          )
        ).status,
      ).toBe(503);
      expect(unverified.AI.run).not.toHaveBeenCalled();
      const unauthorized = await worker.fetch(
        new Request('https://private.example/v1/judge/chat/completions', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
        env,
      );
      expect(unauthorized.status).toBe(401);
      expect(env.AI.run).toHaveBeenCalledTimes(1);
    },
  );
  it('normalizes documented native and OpenAI envelopes without inventing usage', () => {
    const model = reviewedJudgeModel();
    expect(
      normalizeCompletion({ response: 'A synthetic grade.' }, model),
    ).toMatchObject({ model: model.nativeId });
    expect(
      normalizeCompletion({ response: 'A synthetic grade.' }, model),
    ).not.toHaveProperty('usage');
    expect(
      normalizeCompletion(
        {
          id: 'recorded',
          choices: [
            {
              message: { role: 'assistant', content: 'A synthetic grade.' },
              finish_reason: 'stop',
              index: 0,
            },
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
        },
        model,
      ),
    ).toMatchObject({
      id: 'recorded',
      model: model.nativeId,
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    });
    expect(() => normalizeCompletion({ choices: [] }, model)).toThrow(
      'Invalid provider output',
    );
    expect(() =>
      normalizeCompletion(
        { response: 'Invalid usage', usage: { input_tokens: -1 } },
        model,
      ),
    ).toThrow();
  });
  it('bounds the actual UTF-8 prompt for answer and judge models before paid work', async () => {
    const env = environment();
    env.LIVE_TEXT_ENABLED = 'true';
    env.CAPS_VERIFIED = 'true';
    for (const model of REVIEWED_TEXT_MODELS) {
      const path =
        model.usage === 'judge'
          ? '/v1/judge/chat/completions'
          : '/v1/chat/completions';
      const response = await worker.fetch(
        request(
          path,
          JSON.stringify({
            model: model.nativeId,
            // Character count fits the existing 24K per-message schema,
            // but three-byte characters exceed the paid-work byte bound.
            messages: [{ role: 'user', content: '語'.repeat(8000) }],
          }),
        ),
        env,
      );
      expect(response.status).toBe(400);
    }
    expect(env.AI.run).not.toHaveBeenCalled();
    const tools = [
      {
        type: 'function',
        function: {
          name: 'loadSkill',
          parameters: { type: 'object', description: 'x'.repeat(23_000) },
        },
      },
    ];
    expect(
      (
        await worker.fetch(
          request(
            '/v1/chat/completions',
            JSON.stringify({
              model: reviewedAnswerModel().nativeId,
              messages: [{ role: 'user', content: 'x'.repeat(1000) }],
              tools,
            }),
          ),
          env,
        )
      ).status,
    ).toBe(400);
    expect(env.AI.run).not.toHaveBeenCalled();
  });
  it.each(['glm-4.7-flash', 'gemma4-26b'])(
    'preserves the actual SDK tool continuation for %s using mock native bindings',
    async (key) => {
      const model = reviewedAnswerModel(key);
      const env = environment();
      env.LIVE_TEXT_ENABLED = 'true';
      env.CAPS_VERIFIED = 'true';
      const read = vi.fn(async () => ({ help: 'Use actual size.' }));
      env.AI.run = vi
        .fn()
        .mockResolvedValueOnce({
          id: 'read-step',
          object: 'chat.completion',
          created: 0,
          model: model.nativeId,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'read-printing',
                    type: 'function',
                    function: {
                      name: 'loadSkill',
                      arguments: JSON.stringify({ key: 'printing' }),
                    },
                  },
                ],
              },
              finish_reason: 'tool_calls',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        })
        .mockResolvedValueOnce({
          response: 'Use actual size.',
          usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
        });
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(async (input, init) =>
          worker.fetch(new Request(input, init), env),
        );
      try {
        const provider = createOpenAICompatible({
          name: 'bff-reviewed-model-test',
          baseURL: 'https://private.example/v1',
          apiKey: secret,
        });
        const result = await generateText({
          model: provider(model.nativeId),
          instructions: 'Load permitted printing help, then answer.',
          messages: [{ role: 'user', content: 'How do I print?' }],
          tools: {
            loadSkill: tool({
              inputSchema: z.object({ key: z.string() }),
              execute: read,
            }),
          },
          stopWhen: isStepCount(2),
          maxOutputTokens: 1200,
          maxRetries: 0,
        });
        expect(result.text).toBe('Use actual size.');
        expect(read).toHaveBeenCalledTimes(1);
        expect(env.AI.run).toHaveBeenCalledTimes(2);
        const continuation = vi.mocked(env.AI.run).mock.calls[1]!;
        expect(continuation[0]).toBe(model.nativeId);
        expect(continuation[1].messages).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              role: 'assistant',
              content: '',
              tool_calls: [expect.objectContaining({ id: 'read-printing' })],
            }),
            expect.objectContaining({
              role: 'tool',
              tool_call_id: 'read-printing',
            }),
          ]),
        );
        expect(continuation[1].tools).toEqual([
          expect.objectContaining({
            type: 'function',
            function: expect.objectContaining({ name: 'loadSkill' }),
          }),
        ]);
        expect(result.totalUsage.inputTokens).toBe(30);
        expect(result.totalUsage.outputTokens).toBe(15);
      } finally {
        fetchSpy.mockRestore();
      }
    },
  );
  it('fails closed when the deployment secret is absent', async () => {
    const env = environment();
    Reflect.deleteProperty(env, 'PROVIDER_SECRET');
    const response = await worker.fetch(
      request('/raster-preview', png, 'image/png'),
      env,
    );
    expect(response.status).toBe(401);
    expect(env.IMAGES.input).not.toHaveBeenCalled();
  });
  it('runs the actual SDK read-tool loop through the private Worker using mock bindings', async () => {
    const env = environment();
    env.LIVE_TEXT_ENABLED = 'true';
    env.CAPS_VERIFIED = 'true';
    const read = vi.fn(async () => ({ help: 'Public instructions' }));
    let calls = 0;
    env.AI.run = vi.fn(async () =>
      ++calls === 1
        ? {
            tool_calls: [{ name: 'loadSkill', arguments: { skillId: 'help' } }],
          }
        : {
            response: 'Use the public instructions.',
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          },
    );
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) =>
        worker.fetch(new Request(input, init), env),
      );
    try {
      const result = await generateAssistantTurn({
        mode: 'live',
        provider: {
          baseUrl: 'https://private.example',
          secret,
          capsVerified: true,
        },
        instructions: 'Public help only',
        messages: [{ role: 'user', content: 'How do I start?' }],
        tools: {
          loadSkill: tool({
            inputSchema: z.object({ skillId: z.string() }),
            execute: read,
          }),
        },
      });
      expect(result.text).toBe('Use the public instructions.');
      expect(result.toolCalls).toEqual([]);
      expect(read).toHaveBeenCalledTimes(1);
      expect(result.toolUsage).toEqual(['loadSkill']);
      expect(env.AI.run).toHaveBeenCalledTimes(2);
      expect(result.modelCalls).toBe(2);
      expect(result.usage.outputTokens).toBe(5);
    } finally {
      fetchSpy.mockRestore();
    }
  });
  it('denies unauthenticated access before consuming provider work', async () => {
    const env = environment();
    const response = await worker.fetch(
      new Request('https://private.example/raster-preview', { method: 'POST' }),
      env,
    );
    expect(response.status).toBe(401);
    expect(env.IMAGES.input).not.toHaveBeenCalled();
    expect(env.AI.run).not.toHaveBeenCalled();
  });
  it('accepts the SDK reasoning echo during a Qwen tool continuation without forwarding it', async () => {
    const env = environment();
    env.LIVE_TEXT_ENABLED = 'true';
    env.CAPS_VERIFIED = 'true';
    const reasoning = 'Synthetic transient reasoning, not an operator record.';
    const read = vi.fn(async () => ({ help: 'Print at actual size.' }));
    const model = '@cf/qwen/qwen3-30b-a3b-fp8';
    env.AI.run = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'qwen-tool',
        object: 'chat.completion',
        created: 0,
        model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              reasoning_content: reasoning,
              tool_calls: [
                {
                  id: 'read-printing',
                  type: 'function',
                  function: {
                    name: 'loadSkill',
                    arguments: JSON.stringify({ key: 'printing' }),
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      })
      .mockResolvedValueOnce({ response: 'Print at actual size.' });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) =>
        worker.fetch(new Request(input, init), env),
      );
    try {
      const result = await generateAssistantTurn({
        mode: 'live',
        provider: {
          baseUrl: 'https://private.example',
          secret,
          capsVerified: true,
        },
        instructions: 'Load printing help, then answer.',
        messages: [{ role: 'user', content: 'How should I print?' }],
        tools: {
          loadSkill: tool({
            inputSchema: z.object({ key: z.string() }),
            execute: read,
          }),
        },
      });
      expect(result.text).toBe('Print at actual size.');
      expect(result.toolCalls).toEqual([]);
      expect(read).toHaveBeenCalledTimes(1);
      expect(result.toolUsage).toEqual(['loadSkill']);
      expect(env.AI.run).toHaveBeenCalledTimes(2);
      expect(result.modelCalls).toBe(2);
      const continuation = vi.mocked(env.AI.run).mock.calls[1]![1];
      expect(continuation.messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'assistant',
            content: '',
            tool_calls: [expect.objectContaining({ id: 'read-printing' })],
          }),
          expect.objectContaining({
            role: 'tool',
            tool_call_id: 'read-printing',
          }),
        ]),
      );
      expect(JSON.stringify(continuation.messages)).not.toContain(reasoning);
      expect(JSON.stringify(continuation.messages)).not.toContain(
        'reasoning_content',
      );
    } finally {
      fetchSpy.mockRestore();
    }
  });
  it('fails closed until live text and cap proof are enabled', async () => {
    const env = environment();
    expect(
      (await worker.fetch(request('/v1/chat/completions', '{}'), env)).status,
    ).toBe(503);
    expect(env.AI.run).not.toHaveBeenCalled();
  });
  it('classifies provider failures without logging prompts or credential-like details', async () => {
    const env = environment();
    env.LIVE_TEXT_ENABLED = 'true';
    env.CAPS_VERIFIED = 'true';
    const privateDetail = 'synthetic-private-prompt-and-credential';
    env.AI.run = vi
      .fn()
      .mockRejectedValue(
        new Error(`5006: required message content ${privateDetail}`),
      );
    const diagnostic = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      const response = await worker.fetch(
        request(
          '/v1/chat/completions',
          JSON.stringify({
            model: '@cf/qwen/qwen3-30b-a3b-fp8',
            messages: [{ role: 'user', content: privateDetail }],
          }),
        ),
        env,
      );
      expect(response.status).toBe(502);
      expect(response.headers.get('x-provider-error-codes')).toBe('5006');
      expect(diagnostic).toHaveBeenCalledWith('AI_PROVIDER_FAILURE', {
        name: 'Error',
        codes: ['5006'],
        hints: ['required', 'content', 'message'],
      });
      expect(JSON.stringify(diagnostic.mock.calls)).not.toContain(
        privateDetail,
      );
      expect(await response.text()).not.toContain(privateDetail);
    } finally {
      diagnostic.mockRestore();
    }
  });
  it('enforces the reviewed model/fixed gateway and preserves Qwen OpenAI tool envelopes', async () => {
    const env = environment();
    env.LIVE_TEXT_ENABLED = 'true';
    env.CAPS_VERIFIED = 'true';
    const body = {
      model: '@cf/qwen/qwen3-30b-a3b-fp8',
      messages: [{ role: 'user', content: 'Help' }],
      tools: [
        {
          type: 'function',
          function: { name: 'loadSkill', parameters: { type: 'object' } },
        },
      ],
    };
    const response = await worker.fetch(
      request('/v1/chat/completions', JSON.stringify(body)),
      env,
    );
    expect(response.status).toBe(200);
    expect(env.AI.run).toHaveBeenCalledWith(
      body.model,
      expect.objectContaining({
        max_tokens: 1200,
        stream: false,
        tools: [
          {
            type: 'function',
            function: { name: 'loadSkill', parameters: { type: 'object' } },
          },
        ],
      }),
      { gateway: { id: 'operator-dev', skipCache: true } },
    );
    expect(
      (
        await worker.fetch(
          request(
            '/v1/chat/completions',
            JSON.stringify({ ...body, gateway: 'bypass' }),
          ),
          env,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await worker.fetch(
          request(
            '/v1/chat/completions',
            JSON.stringify({ ...body, model: 'expensive' }),
          ),
          env,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await worker.fetch(
          request(
            '/v1/chat/completions',
            JSON.stringify({ ...body, max_tokens: 1201 }),
          ),
          env,
        )
      ).status,
    ).toBe(400);
    for (const echo of [
      { role: 'user', content: 'Help', reasoning_content: 'Untrusted echo' },
      {
        role: 'assistant',
        content: null,
        reasoning_content: 'x'.repeat(24_001),
      },
    ]) {
      expect(
        (
          await worker.fetch(
            request(
              '/v1/chat/completions',
              JSON.stringify({ ...body, messages: [echo] }),
            ),
            env,
          )
        ).status,
      ).toBe(400);
    }
  });
  it('rewrites private PNG bytes with bounded dimensions and never fetches arbitrary URLs', async () => {
    const env = environment();
    const response = await worker.fetch(
      request('/raster-preview', png, 'image/png'),
      env,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(env.IMAGES.input).toHaveBeenCalledTimes(1);
    expect(
      inspectRaster(new Uint8Array(await response.arrayBuffer())),
    ).toMatchObject({ type: 'image/png', width: 1, height: 1 });
  });
  it('accepts real encoded JPEG input and returns only rewritten JPEG bytes', async () => {
    const env = environment();
    const jpeg = new Uint8Array(
      encode(
        { width: 1, height: 1, data: new Uint8Array([255, 255, 255, 255]) },
        80,
      ).data,
    );
    const output = vi.fn(async () => ({
      response: () =>
        new Response(jpeg, { headers: { 'content-type': 'image/jpeg' } }),
    }));
    env.IMAGES.input = () => ({
      transform() {
        return this;
      },
      output,
    });
    const response = await worker.fetch(
      request('/raster-preview', jpeg, 'image/jpeg'),
      env,
    );
    expect(response.status).toBe(200);
    expect(output).toHaveBeenCalledWith({ format: 'image/jpeg', anim: false });
    expect(
      inspectRaster(new Uint8Array(await response.arrayBuffer())),
    ).toMatchObject({ type: 'image/jpeg', width: 1, height: 1 });
  });
  it('blocks unsupported/spoofed/large input without original fallback', async () => {
    const env = environment();
    expect(
      (
        await worker.fetch(
          request('/raster-preview', '<svg/>', 'image/png'),
          env,
        )
      ).status,
    ).toBe(400);
    expect(
      (await worker.fetch(request('/raster-preview', png, 'image/jpeg'), env))
        .status,
    ).toBe(400);
    expect(
      (
        await worker.fetch(
          request(
            '/raster-preview',
            new Uint8Array(5 * 1024 * 1024 + 1),
            'image/png',
          ),
          env,
        )
      ).status,
    ).toBe(400);
    expect(env.IMAGES.input).not.toHaveBeenCalled();
    const huge = png.slice();
    new DataView(huge.buffer).setUint32(16, 10001);
    expect(() => inspectRaster(huge)).toThrow('dimensions');
  });
  it('rejects a conversion returning oversized or wrong raster output', async () => {
    const env = environment();
    env.IMAGES.input = () => ({
      transform() {
        return this;
      },
      output: async () => ({ response: () => new Response('<svg/>') }),
    });
    const response = await worker.fetch(
      request('/raster-preview', png, 'image/png'),
      env,
    );
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain('<svg');
  });
});
