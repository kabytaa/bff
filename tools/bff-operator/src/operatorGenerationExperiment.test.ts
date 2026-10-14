import { describe, expect, it, vi } from 'vitest';
import { reviewedAnswerModel } from '@bff/assistant/models';
import type { OperatorWorkConfiguration } from '@bff/contracts';
import {
  createGenerationExperimentReviewBatches,
  GENERATION_EXPERIMENT_MODES,
  runGenerationControlExperiment,
} from './operatorGenerationExperiment';

const config: OperatorWorkConfiguration = {
  version: 1,
  enabled: false,
  presentation: {
    productName: 'Fixture',
    helpUrl: 'https://example.invalid/help',
    contactEmail: 'help@example.invalid',
  },
  support: {
    botKey: 'support',
    fromEmail: 'help@example.invalid',
    fromName: 'Support',
    receivingAddress: 'help@example.invalid',
    replyDomain: 'reply.example.invalid',
    receiptText: 'Received.',
    surveyQuestion: 'Helpful?',
  },
  bots: ['helper', 'support'].map((kind) => ({
    key: kind,
    name: kind,
    version: 1,
    kind: kind as 'helper' | 'support',
    instructions: 'Use the reviewed facts.',
    model: 'qwen3-30b' as const,
    skillKeys: ['tablecards.basics', 'tablecards.policies'],
  })),
  skills: [
    {
      key: 'tablecards.basics',
      version: 1,
      name: 'Basics',
      whenToUse: 'Basic facts.',
      content: 'An approved fact.',
    },
    {
      key: 'tablecards.policies',
      version: 1,
      name: 'Policies',
      whenToUse: 'Policy facts.',
      content: 'An approved policy.',
    },
  ],
  events: [],
  pageCapabilities: [],
};
const compact: OperatorWorkConfiguration = {
  ...config,
  skills: config.skills.map((skill) => ({
    ...skill,
    version: 2,
    content: 'Compact approved fact.',
  })),
};
const cases = Array.from({ length: 7 }, (_, index) => ({
  id: `diagnostic.case-${index + 1}`,
  cohort: index % 2 ? ('support' as const) : ('helper' as const),
  split: 'tuning' as const,
  prompt: `Question ${index + 1}?`,
  expected: {},
  tags: ['diagnostic'],
  referenceKeys: ['tablecards.basics'],
  expectedBehavior: ['Answer using approved facts.'],
}));
const provider = {
  baseUrl: 'https://provider.example.invalid',
  secret: 's'.repeat(40),
  capsVerified: true as const,
  enabled: true as const,
};
const response = (
  content = 'A concise answer.',
  usage: Record<string, unknown> = {
    prompt_tokens: 8,
    completion_tokens: 5,
    total_tokens: 13,
  },
  options: { model?: string | null; finishReason?: string | null } = {},
) =>
  new Response(
    JSON.stringify({
      ...(options.model === null
        ? {}
        : {
            model: options.model ?? reviewedAnswerModel('gemma4-26b').nativeId,
          }),
      choices: [
        {
          message: { content },
          ...(options.finishReason === null
            ? {}
            : { finish_reason: options.finishReason ?? 'stop' }),
        },
      ],
      usage,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
const run = (
  overrides: Partial<Parameters<typeof runGenerationControlExperiment>[0]> = {},
) =>
  runGenerationControlExperiment({
    cases,
    fullConfiguration: config,
    compactConfiguration: compact,
    provider,
    orderSeed: 'seed-1',
    now: new Date('2026-10-11T00:00:00.000Z'),
    ...overrides,
  });

describe('generation control experiment', () => {
  it('refuses malformed config and non-Gemma models before the provider callback', async () => {
    const post = vi.fn(async () => response());
    await expect(
      run({
        provider: { ...provider, baseUrl: 'http://provider.example.invalid' },
        post,
      }),
    ).rejects.toThrow();
    await expect(run({ answerModelKey: 'qwen3-30b', post })).rejects.toThrow(
      /Gemma/,
    );
    await expect(run({ fullConfiguration: {}, post })).rejects.toThrow();
    expect(post).not.toHaveBeenCalled();
  });

  it('preflights all requests and refuses oversized UTF-8 input before any callback', async () => {
    const post = vi.fn(async () => response());
    await expect(
      run({
        cases: cases.map((item, i) =>
          i === 0 ? { ...item, prompt: '界'.repeat(9_000) } : item,
        ),
        post,
      }),
    ).rejects.toThrow();
    await expect(run({ cases: cases.slice(1), post })).rejects.toThrow(
      /seven diagnostic/,
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('makes exactly 42 bounded attempts in stable randomized paired order with no expectation leakage', async () => {
    const bodies: Array<{
      body: Record<string, unknown>;
      signal?: AbortSignal;
    }> = [];
    const post = vi.fn(async (_url: string, init: RequestInit) => {
      bodies.push({
        body: JSON.parse(String(init.body)),
        signal: init.signal as AbortSignal,
      });
      return response();
    });
    const report = await run({
      cases: cases.map((item, index) =>
        index === 0
          ? {
              ...item,
              recentMessages: [
                { role: 'user' as const, content: 'Earlier context.' },
              ],
            }
          : item,
      ),
      post,
    });
    const again = await run({ post: async () => response() });
    expect(report.attempts).toHaveLength(42);
    expect(report.usage.attemptedCalls).toBe(42);
    expect(report.limits.conservativeCostBoundUsd).toBeLessThanOrEqual(2);
    expect(
      report.attempts.map(({ originalCaseId, repetition, mode }) => [
        originalCaseId,
        repetition,
        mode,
      ]),
    ).toEqual(
      again.attempts.map(({ originalCaseId, repetition, mode }) => [
        originalCaseId,
        repetition,
        mode,
      ]),
    );
    expect(post).toHaveBeenCalledTimes(42);
    expect(new Set(report.attempts.map(({ mode }) => mode))).toEqual(
      new Set(GENERATION_EXPERIMENT_MODES),
    );
    expect(
      report.attempts.every(({ requestBytes }) => requestBytes <= 24_000),
    ).toBe(true);
    for (const { body, signal } of bodies) {
      expect(body).toMatchObject({
        model: reviewedAnswerModel('gemma4-26b').nativeId,
        max_tokens: 1200,
      });
      expect(JSON.stringify(body)).not.toContain('expectedBehavior');
      expect(JSON.stringify(body)).not.toContain('Answer using approved facts');
      if (JSON.stringify(body).includes('Question 1?'))
        expect(body.messages).toContainEqual({
          role: 'user',
          content: 'Earlier context.',
        });
      if (Object.hasOwn(body, 'chat_template_kwargs'))
        expect(body.chat_template_kwargs).toEqual({ enable_thinking: false });
      else expect(body).not.toHaveProperty('chat_template_kwargs');
      expect(signal).toBeInstanceOf(AbortSignal);
    }
    expect(report.compactKnowledgeSnapshot).toEqual(
      compact.skills.map(({ key, version, content }) => ({
        key,
        version,
        content,
      })),
    );
    const reviewBatches = createGenerationExperimentReviewBatches(
      report,
      cases.map((item, index) =>
        index === 0
          ? {
              ...item,
              recentMessages: [
                { role: 'user' as const, content: 'Earlier context.' },
              ],
            }
          : item,
      ),
      config,
      compact,
    );
    const pairedReviewItem = reviewBatches
      .flatMap(({ mapping }) => mapping.items)
      .find(({ sourceId }) => sourceId.startsWith('diagnostic.case-1:'))!;
    expect(pairedReviewItem.input.question).toContain('Earlier context.');
    expect(pairedReviewItem.input.references).toHaveLength(2);
  });

  it('captures blank/overlong responses with measured costs and only raw measured reasoning usage', async () => {
    let index = 0;
    const report = await run({
      post: async () => {
        const current = index++;
        if (current === 0) return response('   ');
        if (current === 1) return response('x'.repeat(12_001));
        if (current === 2)
          return response('A', {
            prompt_tokens: 8,
            completion_tokens: 5,
            total_tokens: 13,
            completionTokensDetails: {
              reasoningTokens: 0,
              reasoning: 'do not retain',
            },
          });
        if (current === 3)
          return response('No finish', undefined, { finishReason: null });
        return response('A', {
          prompt_tokens: 8,
          completion_tokens: 5,
          total_tokens: 13,
          completion_tokens_details: { reasoning_tokens: 0 },
        });
      },
    });
    expect(report.attempts.slice(0, 5).map(({ status }) => status)).toEqual([
      'blank-answer',
      'answer-too-long',
      'completed',
      'invalid-response',
      'completed',
    ]);
    expect(report.attempts[0]!.answer).toBe('   ');
    expect(report.attempts[1]!.answer).toHaveLength(12_001);
    expect(report.attempts[2]!.reasoningTokens).toBeNull();
    expect(report.attempts[3]!.captureError).toBe('missing-finish-reason');
    expect(report.attempts[4]!.reasoningTokens).toBe(0);
    expect(report.attempts[0]!.estimatedCostUsd).not.toBeNull();
    expect(report.attempts[1]!.estimatedCostUsd).not.toBeNull();
    expect(report.usage.totalEstimatedCostUsd).not.toBeNull();
    expect(JSON.stringify(report.attempts[2]!.detailedUsage)).not.toContain(
      'do not retain',
    );
    expect(report.attempts[2]!.detailedUsage).toEqual({
      promptTokens: 8,
      completionTokens: 5,
      totalTokens: 13,
      reasoningTokens: null,
    });
  });

  it('marks truncated, missing-model and mismatched-model answers failed while retaining answer, usage and cost', async () => {
    let index = 0;
    const report = await run({
      post: async () => {
        const current = index++;
        if (current === 0)
          return response('Partial text', undefined, {
            finishReason: 'length',
          });
        if (current === 1)
          return response('Model missing', undefined, { model: null });
        if (current === 2)
          return response('Wrong model', undefined, {
            model: '@cf/google/other',
          });
        if (current === 3)
          return response('No finish', undefined, { finishReason: null });
        return response();
      },
    });
    expect(report.attempts[0]!.status).toBe('truncated-answer');
    expect(report.attempts[0]!.answer).toBe('Partial text');
    expect(report.attempts[0]!.estimatedCostUsd).not.toBeNull();
    expect(report.attempts[1]!.status).toBe('invalid-response');
    expect(report.attempts[1]!.captureError).toBe('response-model-mismatch');
    expect(report.attempts[1]!.answer).toBe('Model missing');
    expect(report.attempts[2]!.status).toBe('invalid-response');
    expect(report.attempts[2]!.responseModel).toBe('@cf/google/other');
    expect(report.attempts[3]!.status).toBe('invalid-response');
    expect(report.attempts[3]!.captureError).toBe('missing-finish-reason');
  });

  it('counts failed requests in denominator and creates blinded packets without strategy identity', async () => {
    let count = 0;
    const report = await run({
      post: async () => {
        count++;
        if (count === 1) {
          const timeout = new Error('not necessarily a timeout message');
          timeout.name = 'TimeoutError';
          throw timeout;
        }
        if (count === 2) throw new Error('private provider detail');
        return response();
      },
    });
    expect(report.attempts).toHaveLength(42);
    expect(report.attempts[0]!.status).toBe('timeout');
    expect(report.attempts[1]!.status).toBe('provider-error');
    expect(report.usage.failedCalls).toBe(2);
    expect(report.usage.unknownCostCalls).toBe(2);
    expect(report.usage.totalEstimatedCostUsd).toBeNull();
    expect(JSON.stringify(report)).not.toContain('private provider detail');
    const batches = createGenerationExperimentReviewBatches(
      report,
      cases,
      config,
      compact,
    );
    const packetText = JSON.stringify(batches.map(({ packet }) => packet));
    expect(packetText).not.toContain('provider-default');
    expect(packetText).not.toContain('thinking-disabled');
    expect(packetText).not.toContain('repetition');
    expect(packetText).not.toContain('originalCaseId');
    expect(batches.flatMap(({ packet }) => packet.items)).toHaveLength(40);
    expect(batches.every(({ packet }) => packet.items.length <= 8)).toBe(true);
    expect(batches[0]!.mapping.items[0]!.input.references).toHaveLength(2);
    expect(batches[0]!.mapping.items[0]!.checks).toEqual([
      { dimension: 'capture.nonempty', passed: true },
      { dimension: 'capture.finish', passed: true },
      { dimension: 'capture.model', passed: true },
    ]);
    expect(() =>
      createGenerationExperimentReviewBatches(
        { ...report, caseVersion: 'wrong' },
        cases,
        config,
        compact,
      ),
    ).toThrow(/versions/);
  });
});
