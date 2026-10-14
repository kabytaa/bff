import { describe, expect, it, vi } from 'vitest';
import {
  createAssistantUIResponse,
  generateAssistantTurn,
  selectAssistantKnowledge,
  RUNTIME_KNOWLEDGE_SELECTION_TIMEOUT_MS,
  type AssistantTurnOptions,
} from './server';
import { acceptsAssistantToolResult } from './protocol';
import { jsonSchema, tool, type ModelMessage, type ToolSet } from 'ai';
import { z } from 'zod';

const runtimeProvider = {
  baseUrl: 'https://private.example',
  secret: 'synthetic-provider-secret-for-test-only',
  capsVerified: true,
};
const runtimeSkills = [
  {
    key: 'example.core',
    name: 'Core',
    whenToUse: 'Always-relevant scope facts',
    version: 1,
    content: 'Private core content.',
  },
  {
    key: 'example.printing',
    name: 'Printing',
    whenToUse: 'Printing and export questions',
    version: 2,
    content: 'Private printing content.',
  },
  {
    key: 'example.billing',
    name: 'Billing',
    whenToUse: 'Payment questions',
    version: 1,
    content: 'Private billing content.',
  },
];
function runtimeSelectionOutput(probabilities = [0.05, 0.95, 0.05]) {
  return {
    model: 'jev-1.13.0',
    answers: Object.fromEntries(
      probabilities.map((noul, index) => [
        `skill_${index}`,
        { type: 'noul', noul },
      ]),
    ),
    usage: { input_tokens: 100, output_tokens: 0 },
  };
}
const runtimeSelectionOptions = {
  mode: 'live' as const,
  provider: runtimeProvider,
  kind: 'helper' as const,
  question: 'How do I print?',
  skills: runtimeSkills,
  mandatorySkillKeys: ['example.core'],
};

describe('runtime knowledge selection', () => {
  it.each(['helper', 'support'] as const)(
    'selects only assigned metadata for %s and retains mandatory facts',
    async (kind) => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(Response.json(runtimeSelectionOutput()));
      try {
        const result = await selectAssistantKnowledge({
          ...runtimeSelectionOptions,
          kind,
        });
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(fetchSpy.mock.calls[0]?.[0]).toBe(
          'https://private.example/v1/runtime/knowledge-selection',
        );
        const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
        expect(body.kind).toBe(kind);
        expect(body.skills).toEqual(
          runtimeSkills.map(({ key, name, whenToUse }) => ({
            key,
            name,
            whenToUse,
          })),
        );
        expect(JSON.stringify(body)).not.toContain('Private');
        expect(JSON.stringify(body)).not.toContain('mandatory');
        expect(result.selection).toMatchObject({
          selectedKeys: ['example.printing'],
          effectiveKeys: ['example.core', 'example.printing'],
          mandatoryKeys: ['example.core'],
          fallback: false,
          modelCalls: 1,
          usage: { inputTokens: 100, outputTokens: 0 },
        });
        expect(result.skillCatalog.map(({ key }) => key)).toEqual([
          'example.core',
          'example.printing',
        ]);
        expect(result.suppliedKnowledge.map(({ content }) => content)).toEqual([
          'Private core content.',
          'Private printing content.',
        ]);
        expect(result.requireInitialKnowledge).toBe(false);
      } finally {
        fetchSpy.mockRestore();
      }
    },
  );
  it.each([
    {
      output: runtimeSelectionOutput([0.05, 0.5, 0.05]),
      reason: 'ambiguous-probabilities',
    },
    {
      output: runtimeSelectionOutput([0.05, 0.05, 0.05]),
      reason: 'no-selected-sections',
    },
    { output: runtimeSelectionOutput([1, 0]), reason: 'invalid-response' },
    {
      output: runtimeSelectionOutput([1, 0, 0, 1]),
      reason: 'invalid-response',
    },
    {
      output: {
        model: 'jev-1.13.0',
        answers: { unassigned: { type: 'noul', noul: 1 } },
      },
      reason: 'invalid-response',
    },
    { output: 'not a native selection', reason: 'invalid-response' },
  ])(
    'uses complete assigned fallback only for $reason',
    async ({ output, reason }) => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(Response.json(output));
      try {
        const result = await selectAssistantKnowledge(runtimeSelectionOptions);
        expect(result.selection.fallback).toBe(true);
        expect(result.selection.fallbackReason).toBe(reason);
        expect(result.selection.effectiveKeys).toEqual(
          runtimeSkills.map(({ key }) => key),
        );
        expect(result.suppliedKnowledge).toHaveLength(3);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
      } finally {
        fetchSpy.mockRestore();
      }
    },
  );
  it('falls back once on provider failure without retrying or persisting private errors', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('synthetic-private-error-and-secret'));
    try {
      const result = await selectAssistantKnowledge(runtimeSelectionOptions);
      expect(result.selection).toMatchObject({
        fallback: true,
        fallbackReason: 'provider-error',
        modelCalls: 1,
        usage: {},
      });
      expect(JSON.stringify(result)).not.toContain(
        'synthetic-private-error-and-secret',
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      fetchSpy.mockRestore();
    }
  });
  it.each([
    {
      response: () =>
        Response.json(
          { error: 'synthetic-private-provider-details' },
          { status: 503 },
        ),
      reason: 'provider-error',
    },
    {
      response: () => new Response('malformed JSON'),
      reason: 'invalid-response',
    },
    {
      response: () => new Response('x'.repeat(100_001)),
      reason: 'invalid-response',
    },
  ])(
    'bounds failed and malformed HTTP output with $reason and no retry',
    async ({ response, reason }) => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(async () => response());
      try {
        const result = await selectAssistantKnowledge(runtimeSelectionOptions);
        expect(result.selection.fallbackReason).toBe(reason);
        expect(result.selection.effectiveKeys).toEqual(
          runtimeSkills.map(({ key }) => key),
        );
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(result)).not.toContain(
          'synthetic-private-provider-details',
        );
      } finally {
        fetchSpy.mockRestore();
      }
    },
  );
  it('has a fixed network deadline and does not retry after its timeout', async () => {
    const controller = new AbortController();
    const deadline = vi
      .spyOn(AbortSignal, 'timeout')
      .mockReturnValue(controller.signal);
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (_url, init) => {
        controller.abort(new DOMException('Timeout', 'TimeoutError'));
        init?.signal?.throwIfAborted();
        throw new Error('Deadline did not abort');
      });
    try {
      const result = await selectAssistantKnowledge(runtimeSelectionOptions);
      expect(deadline).toHaveBeenCalledExactlyOnceWith(
        RUNTIME_KNOWLEDGE_SELECTION_TIMEOUT_MS,
      );
      expect(result.selection.fallbackReason).toBe('provider-error');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      fetchSpy.mockRestore();
      deadline.mockRestore();
    }
  });
  it('keeps explicit caller cancellation from starting an answer fallback', async () => {
    const controller = new AbortController();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => {
        controller.abort();
        throw new Error('Cancelled');
      });
    try {
      await expect(
        selectAssistantKnowledge({
          ...runtimeSelectionOptions,
          signal: controller.signal,
        }),
      ).rejects.toThrow('cancelled');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      fetchSpy.mockRestore();
    }
  });
  it('does not return selected knowledge after caller cancellation races a successful response', async () => {
    const controller = new AbortController();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => {
        controller.abort();
        return Response.json(runtimeSelectionOutput());
      });
    try {
      await expect(
        selectAssistantKnowledge({
          ...runtimeSelectionOptions,
          signal: controller.signal,
        }),
      ).rejects.toThrow('cancelled');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      fetchSpy.mockRestore();
    }
  });
  it('rejects invalid assignments, mandatory keys, metadata, history and full fallback before paid IO', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      for (const override of [
        { skills: [runtimeSkills[0]!, runtimeSkills[0]!] },
        { mandatorySkillKeys: ['unassigned'] },
        { mandatorySkillKeys: ['example.core', 'example.core'] },
        { question: '' },
        { question: 'q'.repeat(24_001) },
        { skills: [{ ...runtimeSkills[0]!, content: '字'.repeat(4000) }] },
        {
          skills: Array.from({ length: 17 }, (_, index) => ({
            ...runtimeSkills[0]!,
            key: `section_${index}`,
          })),
          mandatorySkillKeys: [],
        },
        { provider: { ...runtimeProvider, capsVerified: false } },
        { provider: { ...runtimeProvider, baseUrl: 'http://private.example' } },
      ])
        await expect(
          selectAssistantKnowledge({ ...runtimeSelectionOptions, ...override }),
        ).rejects.toThrow();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
  it.each([
    { question: 'q'.repeat(4001) },
    { recentMessages: [{ role: 'user' as const, content: 'q'.repeat(2001) }] },
    {
      recentMessages: Array.from({ length: 5 }, () => ({
        role: 'assistant' as const,
        content: 'Earlier reply',
      })),
    },
    {
      question: '日'.repeat(4000),
      recentMessages: Array.from({ length: 4 }, () => ({
        role: 'user' as const,
        content: '日'.repeat(2000),
      })),
    },
  ])(
    'falls back to all assigned knowledge without IO or projection truncation for selector input bounds',
    async (override) => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const input = { ...runtimeSelectionOptions, ...override };
      const before = JSON.stringify(input);
      try {
        const result = await selectAssistantKnowledge(input);
        expect(result.selection).toMatchObject({
          fallback: true,
          fallbackReason: 'input-bounds',
          modelCalls: 0,
          mocked: false,
        });
        expect(result.suppliedKnowledge).toHaveLength(3);
        expect(result.selection.effectiveKeys).toEqual(
          runtimeSkills.map(({ key }) => key),
        );
        expect(JSON.stringify(input)).toBe(before);
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        fetchSpy.mockRestore();
      }
    },
  );
  it('makes no provider request in mock mode and labels full assigned fallback', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const result = await selectAssistantKnowledge({
        ...runtimeSelectionOptions,
        mode: 'mock',
        provider: undefined,
      });
      expect(result.selection).toMatchObject({
        fallback: true,
        fallbackReason: 'mock-not-run',
        modelCalls: 0,
        mocked: true,
      });
      expect(result.suppliedKnowledge).toHaveLength(3);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

describe('assistant model authority boundary', () => {
  it('budgets actual SDK native envelopes before fetching with seven capabilities and escaped history', async () => {
    const tools: ToolSet = Object.fromEntries(
      Array.from({ length: 7 }, (_, index) => [
        `capability${index}`,
        tool({
          description: `Registered capability ${index}.`,
          inputSchema: jsonSchema({
            type: 'object',
            additionalProperties: false,
            properties: {
              key: {
                type: 'string',
                maxLength: 80,
                description: 'Bounded registered identifier. '.repeat(15),
              },
            },
          }),
          execute: vi.fn(async () => ({ unused: true })),
        }),
      ]),
    );
    const instructions = 'Reviewed facts:\n"quoted" \\ path. '.repeat(300);
    const messages: ModelMessage[] = [
      { role: 'user', content: 'a'.repeat(2000) },
      { role: 'assistant', content: 'b'.repeat(2000) },
      { role: 'user', content: 'c'.repeat(2000) },
      { role: 'assistant', content: 'd'.repeat(2000) },
      { role: 'user', content: 'q'.repeat(4000) },
    ];
    let nativeBytes = 0;
    let sentMessages: Array<{ role: string; content: string }> = [];
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (_url, init) => {
        const body = JSON.parse(String(init?.body));
        const normalized = body.messages.map(
          ({
            reasoning_content,
            content,
            ...entry
          }: {
            reasoning_content?: string;
            content?: string;
            role: string;
          }) => {
            void reasoning_content;
            return { ...entry, content: content ?? '' };
          },
        );
        nativeBytes = new TextEncoder().encode(
          JSON.stringify({ messages: normalized, tools: body.tools }),
        ).byteLength;
        sentMessages = normalized;
        return Response.json({
          id: 'bounded',
          object: 'chat.completion',
          created: 0,
          model: '@cf/google/gemma-4-26b-a4b-it',
          choices: [
            {
              index: 0,
              finish_reason: 'stop',
              message: { role: 'assistant', content: 'A bounded answer.' },
            },
          ],
        });
      });
    try {
      const result = await generateAssistantTurn({
        mode: 'live',
        purpose: 'runtime-answer',
        provider: runtimeProvider,
        instructions,
        messages,
        tools,
      });
      expect(result.text).toBe('A bounded answer.');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(nativeBytes).toBeLessThanOrEqual(24_000);
      expect(sentMessages.length).toBeLessThan(messages.length + 1);
      expect(sentMessages.slice(1)).toEqual(
        messages.slice(messages.length - (sentMessages.length - 1)),
      );
      expect(sentMessages[0]).toEqual({
        role: 'system',
        content: instructions,
      });
      expect(sentMessages.at(-1)).toEqual(messages.at(-1));
      for (const capability of Object.values(tools))
        expect(capability.execute).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
  it('locks runtime answers to Gemma on the separate customer route while experiments retain Qwen defaults', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        Response.json({
          id: 'runtime',
          object: 'chat.completion',
          created: 0,
          model: '@cf/google/gemma-4-26b-a4b-it',
          choices: [
            {
              index: 0,
              finish_reason: 'stop',
              message: { role: 'assistant', content: 'Reviewed answer.' },
            },
          ],
        }),
      );
    try {
      for (const modelKey of [undefined, 'gemma4-26b'] as const) {
        const result = await generateAssistantTurn({
          mode: 'live',
          purpose: 'runtime-answer',
          modelKey,
          provider: runtimeProvider,
          instructions: 'Scoped facts.',
          messages: [{ role: 'user', content: 'Question' }],
        });
        expect(result.model).toBe('@cf/google/gemma-4-26b-a4b-it');
      }
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(
        fetchSpy.mock.calls.every(
          ([url]) =>
            String(url) ===
            'https://private.example/v1/runtime/chat/completions',
        ),
      ).toBe(true);
      for (const modelKey of [
        'qwen3-30b',
        'glm-4.7-flash',
        'gpt-oss-120b',
        'typesafe/jev',
      ])
        await expect(
          generateAssistantTurn({
            mode: 'live',
            purpose: 'runtime-answer',
            modelKey: modelKey as AssistantTurnOptions['modelKey'],
            provider: runtimeProvider,
            instructions: 'Scoped facts.',
            messages: [{ role: 'user', content: 'Question' }],
          }),
        ).rejects.toThrow('Unreviewed runtime');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    } finally {
      fetchSpy.mockRestore();
    }
  });
  it('fails before a later paid call when the current question and knowledge result exceed the UTF-8 budget', async () => {
    const read = vi.fn(async () => ({ content: '字'.repeat(8_001) }));
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        Response.json({
          id: 'large-knowledge',
          object: 'chat.completion',
          created: 0,
          model: '@cf/qwen/qwen3-30b-a3b-fp8',
          choices: [
            {
              index: 0,
              finish_reason: 'tool_calls',
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'read-large',
                    type: 'function',
                    function: { name: 'loadSkill', arguments: '{}' },
                  },
                ],
              },
            },
          ],
        }),
      );
    try {
      await expect(
        generateAssistantTurn({
          mode: 'live',
          provider: {
            baseUrl: 'https://private.example',
            secret: 'synthetic-provider-secret-for-test-only',
            capsVerified: true,
          },
          instructions: 'Use reviewed facts.',
          messages: [
            { role: 'user', content: 'Current question that must remain.' },
          ],
          requireInitialKnowledge: true,
          tools: {
            loadSkill: tool({ inputSchema: z.object({}), execute: read }),
          },
        }),
      ).rejects.toThrow('Essential assistant context exceeds byte bounds');
      expect(read).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      fetchSpy.mockRestore();
    }
  });
  it('retains length termination and usage even when non-empty text was generated', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        Response.json({
          id: 'truncated-answer',
          object: 'chat.completion',
          created: 0,
          model: '@cf/qwen/qwen3-30b-a3b-fp8',
          choices: [
            {
              index: 0,
              finish_reason: 'length',
              message: {
                role: 'assistant',
                content: 'A partial answer that is not complete',
              },
            },
          ],
          usage: { prompt_tokens: 40, completion_tokens: 20, total_tokens: 60 },
        }),
      );
    try {
      const result = await generateAssistantTurn({
        mode: 'live',
        provider: {
          baseUrl: 'https://private.example',
          secret: 'synthetic-provider-secret-for-test-only',
          capsVerified: true,
        },
        instructions: 'Help.',
        messages: [{ role: 'user', content: 'Question' }],
      });
      expect(result.text).toContain('partial answer');
      expect(result.finishReason).toBe('length');
      expect(result.usage).toEqual({ inputTokens: 40, outputTokens: 20 });
      expect(result.modelCalls).toBe(1);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      fetchSpy.mockRestore();
    }
  });
  it.each([
    ['qwen3-30b', '@cf/qwen/qwen3-30b-a3b-fp8'],
    ['glm-4.7-flash', '@cf/zai-org/glm-4.7-flash'],
    ['gemma4-26b', '@cf/google/gemma-4-26b-a4b-it'],
  ] as const)(
    'uses only the explicitly selected reviewed answer model %s on the normal route',
    async (modelKey, nativeId) => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(async () =>
          Response.json({
            id: 'selected-answer',
            object: 'chat.completion',
            created: 0,
            model: nativeId,
            choices: [
              {
                index: 0,
                finish_reason: 'stop',
                message: { role: 'assistant', content: 'A reviewed answer.' },
              },
            ],
          }),
        );
      try {
        const result = await generateAssistantTurn({
          mode: 'live',
          modelKey,
          provider: {
            baseUrl: 'https://private.example',
            secret: 'synthetic-provider-secret-for-test-only',
            capsVerified: true,
          },
          instructions: 'Use reviewed facts.',
          messages: [{ role: 'user', content: 'Question' }],
        });
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
          'https://private.example/v1/chat/completions',
        );
        expect(
          JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)).model,
        ).toBe(nativeId);
        expect(result.model).toBe(nativeId);
        expect(result.text).toBe('A reviewed answer.');
        expect(result.modelCalls).toBe(1);
      } finally {
        fetchSpy.mockRestore();
      }
    },
  );

  it('keeps Qwen as the default without choosing a comparison model automatically', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        Response.json({
          id: 'default-answer',
          object: 'chat.completion',
          created: 0,
          model: '@cf/qwen/qwen3-30b-a3b-fp8',
          choices: [
            {
              index: 0,
              finish_reason: 'stop',
              message: { role: 'assistant', content: 'An answer.' },
            },
          ],
        }),
      );
    try {
      const result = await generateAssistantTurn({
        mode: 'live',
        provider: {
          baseUrl: 'https://private.example',
          secret: 'synthetic-provider-secret-for-test-only',
          capsVerified: true,
        },
        instructions: 'Help.',
        messages: [{ role: 'user', content: 'Question' }],
      });
      expect(JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)).model).toBe(
        '@cf/qwen/qwen3-30b-a3b-fp8',
      );
      expect(result.model).toBe('@cf/qwen/qwen3-30b-a3b-fp8');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('uses the reviewed evaluation judge only on its separate private route', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        Response.json({
          id: 'evaluation-judge',
          object: 'chat.completion',
          created: 0,
          model: '@cf/openai/gpt-oss-120b',
          choices: [
            {
              index: 0,
              finish_reason: 'stop',
              message: { role: 'assistant', content: '{"score":2}' },
            },
          ],
        }),
      );
    try {
      for (const modelKey of [undefined, 'gpt-oss-120b'] as const) {
        const result = await generateAssistantTurn({
          mode: 'live',
          purpose: 'judge',
          modelKey,
          maxSteps: 1,
          provider: {
            baseUrl: 'https://private.example',
            secret: 'synthetic-provider-secret-for-test-only',
            capsVerified: true,
          },
          instructions: 'Evaluate the answer against the rubric.',
          messages: [
            {
              role: 'user',
              content: 'Question, expected facts and candidate answer.',
            },
          ],
        });
        expect(result.model).toBe('@cf/openai/gpt-oss-120b');
        expect(result.modelCalls).toBe(1);
        expect(result.toolCalls).toEqual([]);
        expect(result.toolUsage).toEqual([]);
      }
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      for (const [input, init] of fetchSpy.mock.calls) {
        expect(String(input)).toBe(
          'https://private.example/v1/judge/chat/completions',
        );
        const body = JSON.parse(String(init?.body));
        expect(body.model).toBe('@cf/openai/gpt-oss-120b');
        expect(body.tools).toBeUndefined();
        expect(body.tool_choice).toBeUndefined();
      }
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('rejects cross-role or unknown models before any provider call', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      for (const changes of [
        { modelKey: 'gpt-oss-120b' },
        { modelKey: 'not-reviewed' },
        { modelKey: '@cf/qwen/qwen3-30b-a3b-fp8' },
        { purpose: 'judge', modelKey: 'qwen3-30b', maxSteps: 1 },
        { purpose: 'judge', modelKey: 'glm-4.7-flash', maxSteps: 1 },
        { purpose: 'judge', modelKey: 'gemma4-26b', maxSteps: 1 },
        { purpose: 'judge', modelKey: 'not-reviewed', maxSteps: 1 },
      ] as Array<Partial<AssistantTurnOptions>>) {
        await expect(
          generateAssistantTurn({
            mode: 'live',
            instructions: 'Help.',
            messages: [],
            provider: {
              baseUrl: 'https://private.example',
              secret: 'synthetic-provider-secret-for-test-only',
              capsVerified: true,
            },
            ...changes,
          }),
        ).rejects.toThrow(/Unreviewed/);
      }
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('rejects tools, retrieval and implicit or multiple judge steps without calling a provider', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      for (const changes of [
        { maxSteps: undefined },
        { maxSteps: 2 },
        { maxSteps: 4 },
        { tools: {} },
        {
          tools: {
            loadSkill: tool({
              inputSchema: z.object({}),
              execute: async () => ({ facts: true }),
            }),
          },
        },
        { requireInitialKnowledge: true },
      ] as Array<Partial<AssistantTurnOptions>>) {
        await expect(
          generateAssistantTurn({
            mode: 'live',
            purpose: 'judge',
            modelKey: 'gpt-oss-120b',
            maxSteps: 1,
            instructions: 'Use the rubric.',
            messages: [],
            provider: {
              baseUrl: 'https://private.example',
              secret: 'synthetic-provider-secret-for-test-only',
              capsVerified: true,
            },
            ...changes,
          }),
        ).rejects.toThrow('judge cannot use tools or multiple steps');
      }
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('requires only the knowledge tool first, then restores other reads and browser tools', async () => {
    const read = vi.fn(async () => ({ guidance: 'Reviewed product facts' }));
    const requests: Array<{
      tools: Array<{ function: { name: string } }>;
      tool_choice: string;
    }> = [];
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (_input, init) => {
        requests.push(JSON.parse(String(init?.body)));
        const first = requests.length === 1;
        return Response.json({
          id: `step-${requests.length}`,
          object: 'chat.completion',
          created: 0,
          model: '@cf/qwen/qwen3-30b-a3b-fp8',
          choices: [
            {
              index: 0,
              finish_reason: 'tool_calls',
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: `call-${requests.length}`,
                    type: 'function',
                    function: {
                      name: first ? 'loadSkill' : 'offerLink',
                      arguments: first ? '{"key":"example.basics"}' : '{}',
                    },
                  },
                ],
              },
            },
          ],
        });
      });
    try {
      const result = await generateAssistantTurn({
        mode: 'live',
        provider: {
          baseUrl: 'https://private.example',
          secret: 'synthetic-provider-secret-for-test-only',
          capsVerified: true,
        },
        instructions: 'Use reviewed facts.',
        messages: [{ role: 'user', content: 'How does this product work?' }],
        requireInitialKnowledge: true,
        tools: {
          loadSkill: tool({
            inputSchema: z.object({ key: z.string() }),
            execute: read,
          }),
          getCurrentCustomerContext: tool({
            inputSchema: z.object({}),
            execute: async () => ({ signedIn: false }),
          }),
          offerLink: tool({ inputSchema: z.object({}) }),
        },
      });
      expect(requests[0]?.tool_choice).toBe('required');
      expect(requests[0]?.tools.map(({ function: fn }) => fn.name)).toEqual([
        'loadSkill',
      ]);
      expect(requests[1]?.tool_choice).toBe('auto');
      expect(requests[1]?.tools.map(({ function: fn }) => fn.name)).toEqual([
        'loadSkill',
        'getCurrentCustomerContext',
        'offerLink',
      ]);
      expect(read).toHaveBeenCalledTimes(1);
      expect(result.toolUsage).toEqual(['loadSkill']);
      expect(result.toolCalls).toEqual([
        { toolCallId: 'call-2', toolName: 'offerLink', input: {} },
      ]);
      expect(result.modelCalls).toBe(2);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('fails closed if initial knowledge is required without an executable read or answer step', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      for (const tools of [
        undefined,
        { loadSkill: tool({ inputSchema: z.object({}) }) },
      ])
        await expect(
          generateAssistantTurn({
            mode: 'mock',
            instructions: 'Help',
            messages: [],
            requireInitialKnowledge: true,
            tools,
          }),
        ).rejects.toThrow('knowledge tool is unavailable');
      await expect(
        generateAssistantTurn({
          mode: 'mock',
          instructions: 'Help',
          messages: [],
          requireInitialKnowledge: true,
          maxSteps: 1,
          tools: {
            loadSkill: tool({
              inputSchema: z.object({}),
              execute: async () => ({}),
            }),
          },
        }),
      ).rejects.toThrow('at least two steps');
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('does not answer normally after a failed knowledge read', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        Response.json({
          id: 'read-step',
          object: 'chat.completion',
          created: 0,
          model: '@cf/qwen/qwen3-30b-a3b-fp8',
          choices: [
            {
              index: 0,
              finish_reason: 'tool_calls',
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'read-call',
                    type: 'function',
                    function: {
                      name: 'loadSkill',
                      arguments: '{"key":"unassigned"}',
                    },
                  },
                ],
              },
            },
          ],
        }),
      );
    try {
      await expect(
        generateAssistantTurn({
          mode: 'live',
          provider: {
            baseUrl: 'https://private.example',
            secret: 'synthetic-provider-secret-for-test-only',
            capsVerified: true,
          },
          instructions: 'Use reviewed facts.',
          messages: [{ role: 'user', content: 'How does this work?' }],
          requireInitialKnowledge: true,
          tools: {
            loadSkill: tool({
              inputSchema: z.object({ key: z.string() }),
              execute: async (): Promise<{ guidance: string }> => {
                throw new Error('Knowledge denied');
              },
            }),
          },
        }),
      ).rejects.toThrow('knowledge could not be loaded');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('does not accept a provider answer that ignores required initial knowledge', async () => {
    const read = vi.fn(async () => ({ guidance: 'Reviewed facts' }));
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        Response.json({
          id: 'ignored-read',
          object: 'chat.completion',
          created: 0,
          model: '@cf/qwen/qwen3-30b-a3b-fp8',
          choices: [
            {
              index: 0,
              finish_reason: 'stop',
              message: {
                role: 'assistant',
                content: 'An answer from generic guesses.',
              },
            },
          ],
        }),
      );
    try {
      await expect(
        generateAssistantTurn({
          mode: 'live',
          provider: {
            baseUrl: 'https://private.example',
            secret: 'synthetic-provider-secret-for-test-only',
            capsVerified: true,
          },
          instructions: 'Use reviewed facts.',
          messages: [{ role: 'user', content: 'How does this work?' }],
          requireInitialKnowledge: true,
          tools: {
            loadSkill: tool({ inputSchema: z.object({}), execute: read }),
          },
        }),
      ).rejects.toThrow();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(read).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('returns only unresolved browser calls, not completed backend reads from earlier steps', async () => {
    const read = vi.fn(async () => ({ guidance: 'Trusted generic guidance' }));
    let step = 0;
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => {
        const name = ++step === 1 ? 'loadSkill' : 'offerLink';
        return Response.json({
          id: `step-${step}`,
          object: 'chat.completion',
          created: 0,
          model: '@cf/qwen/qwen3-30b-a3b-fp8',
          choices: [
            {
              index: 0,
              finish_reason: 'tool_calls',
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: `call-${step}`,
                    type: 'function',
                    function: { name, arguments: '{}' },
                  },
                ],
              },
            },
          ],
        });
      });
    try {
      const result = await generateAssistantTurn({
        mode: 'live',
        provider: {
          baseUrl: 'https://private.example',
          secret: 'synthetic-provider-secret-for-test-only',
          capsVerified: true,
        },
        instructions: 'Use trusted guidance and offer a registered link.',
        messages: [{ role: 'user', content: 'Where is help?' }],
        tools: {
          loadSkill: tool({ inputSchema: z.object({}), execute: read }),
          offerLink: tool({ inputSchema: z.object({}) }),
        },
      });
      expect(read).toHaveBeenCalledTimes(1);
      expect(result.toolUsage).toEqual(['loadSkill']);
      expect(result.toolCalls).toEqual([
        { toolCallId: 'call-2', toolName: 'offerLink', input: {} },
      ]);
      expect(result.modelCalls).toBe(2);
    } finally {
      fetchSpy.mockRestore();
    }
  });
  it('encodes saved browser tool requests in the current SDK UI stream protocol', async () => {
    const response = createAssistantUIResponse({
      text: '',
      toolCalls: [
        { toolCallId: 'pending', toolName: 'getPageContext', input: {} },
      ],
      messageId: 'message',
      mocked: true,
      session: {
        conversationId: 'conversation',
        capability: 'synthetic-capability',
      },
    });
    expect(response.headers.get('x-vercel-ai-ui-message-stream')).toBe('v1');
    const stream = await response.text();
    expect(stream).toContain('"type":"tool-input-available"');
    expect(stream).toContain('"toolCallId":"pending"');
    expect(stream).toContain('"mocked":true');
    expect(stream).toContain('[DONE]');
  });
  it('mock mode never contacts a provider or executes tools', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await generateAssistantTurn({
      mode: 'mock',
      instructions: 'Scoped help',
      messages: [{ role: 'user', content: 'Help' }],
    });
    expect(result.mocked).toBe(true);
    expect(result.finishReason).toBe('stop');
    expect(result.toolCalls).toEqual([]);
    expect(result.modelCalls).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
  it('blocks unverified live caps and oversized context', async () => {
    await expect(
      generateAssistantTurn({ mode: 'live', instructions: '', messages: [] }),
    ).rejects.toThrow('caps unverified');
    await expect(
      generateAssistantTurn({
        mode: 'mock',
        instructions: 'x'.repeat(25_000),
        messages: [],
      }),
    ).rejects.toThrow('too large');
    await expect(
      generateAssistantTurn({
        mode: 'mock',
        instructions: '',
        messages: [],
        temperature: 2,
      }),
    ).rejects.toThrow('Invalid assistant temperature');
  });
  it('rejects browser results after account/page changes or for another pending call', () => {
    const context = { accountId: 'account-a', pageId: 'editor', revision: '1' };
    const pending = {
      toolCallId: 'pending',
      toolName: 'getPageContext',
      input: {},
      context,
    };
    expect(
      acceptsAssistantToolResult(
        pending,
        { toolCallId: 'pending', context, output: {} },
        context,
      ),
    ).toBe(true);
    expect(
      acceptsAssistantToolResult(
        pending,
        { toolCallId: 'other', context },
        context,
      ),
    ).toBe(false);
    expect(
      acceptsAssistantToolResult(
        pending,
        { toolCallId: 'pending', context },
        { ...context, accountId: 'account-b' },
      ),
    ).toBe(false);
    expect(
      acceptsAssistantToolResult(
        pending,
        { toolCallId: 'pending', context },
        { ...context, revision: '2' },
      ),
    ).toBe(false);
  });
});
