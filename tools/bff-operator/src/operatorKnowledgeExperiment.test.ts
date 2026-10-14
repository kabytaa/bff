import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createKnowledgeExperimentAnswerer,
  createKnowledgeExperimentReviewBatches,
  createKnowledgeExperimentSelector,
  knowledgeExperimentCostBound,
  knowledgeExperimentExitCode,
  runKnowledgeExperimentCommand,
  runKnowledgeExperiment,
} from './operatorKnowledgeExperiment';
import type { KnowledgeExperimentAnswerer } from './operatorKnowledgeExperiment';
import { reviewedAnswerModel } from '@bff/assistant/models';
import { generateText } from 'ai';
import type * as Ai from 'ai';
import { writeFile } from 'node:fs/promises';
import type * as FileSystemPromises from 'node:fs/promises';
import * as operatorModules from './operatorWorkConfiguration';
import type { OperatorWorkConfiguration } from '@bff/contracts';

vi.mock('ai', async (importOriginal) => ({
  ...(await importOriginal<typeof Ai>()),
  generateText: vi.fn(),
}));
vi.mock('node:fs/promises', async (importOriginal) => ({
  ...(await importOriginal<typeof FileSystemPromises>()),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}));

const keys = [
  'example.basics',
  'example.contact',
  'example.printing',
  'example.teams',
];
const configuration: OperatorWorkConfiguration = {
  version: 1,
  enabled: false,
  presentation: {
    productName: 'Synthetic',
    helpUrl: 'https://example.invalid/help',
    contactEmail: 'support@example.invalid',
  },
  support: {
    botKey: 'support',
    fromEmail: 'support@example.invalid',
    fromName: 'Support',
    receivingAddress: 'inbound@example.invalid',
    replyDomain: 'reply.example.invalid',
    receiptText: 'Recorded.',
    surveyQuestion: 'Helpful?',
  },
  bots: ['helper', 'support'].map((kind) => ({
    key: kind,
    name: kind,
    version: 1,
    kind: kind as 'helper' | 'support',
    instructions: 'Approved product guidance only.',
    model: 'qwen3-30b',
    skillKeys: keys,
  })),
  skills: keys.map((key) => ({
    key,
    version: 1,
    name: key.split('.').at(-1)!,
    whenToUse: `Questions about ${key}.`,
    content: `Original approved facts for ${key}.`,
  })),
  events: [],
  pageCapabilities: [],
};
const compact = {
  ...configuration,
  skills: configuration.skills.map((skill) => ({
    ...skill,
    version: 1001,
    content: `Compact facts for ${skill.key}.`,
  })),
};
const item = {
  id: 'synthetic.multi-topic',
  cohort: 'helper' as const,
  split: 'tuning' as const,
  prompt: 'How do I print a team project?',
  expected: {},
  tags: ['multi-topic'],
  referenceKeys: ['example.printing'],
  expectedBehavior: ['SECRET EXPECTED BEHAVIOR'],
  necessaryKnowledgeKeys: ['example.printing', 'example.teams'],
  recentMessages: [
    { role: 'user' as const, content: 'My team project is ready.' },
    { role: 'assistant' as const, content: 'What would you like to do?' },
  ],
};
const base = {
  cases: [item],
  fullConfiguration: configuration,
  compactConfiguration: compact,
  mandatorySkillKeys: ['example.basics', 'example.contact'],
  orderSeed: 'stable',
};
const model = reviewedAnswerModel('gemma4-26b').nativeId;
const response = (
  values = [0.1, 0.1, 0.99, 0.99],
  usage: unknown = { input_tokens: 77, output_tokens: 0 },
) => ({
  model: 'jev-1.13.0',
  answers: Object.fromEntries(
    values.map((noul, index) => [`skill_${index}`, { type: 'noul', noul }]),
  ),
  ...(usage ? { usage } : {}),
});
const answer: KnowledgeExperimentAnswerer = async (request) => ({
  observation: {
    text: request.lazy
      ? 'Print the team project after reading.'
      : 'Print the team project.',
    toolNames: [],
    mocked: false,
    model,
    modelCalls: 1,
    usage: { inputTokens: 100, outputTokens: 10 },
    toolTrace: [],
    finishReason: 'stop',
  },
  steps: [
    {
      index: 0,
      status: 'completed',
      model,
      latencyMs: 3,
      inputTokens: 100,
      outputTokens: 10,
      estimatedCostUsd: 0.000013,
      toolCalls: [],
    },
  ],
});
const live = {
  mode: 'live' as const,
  answer,
  selectKnowledge: async () => response(),
  liveAuthority: {
    confirmModelCost: true as const,
    capsVerified: true as const,
  },
};
afterEach(() => vi.unstubAllGlobals());

describe('matched knowledge experiment', () => {
  it('runs every arm offline without calling any selector and retains unjudged full references', async () => {
    const selector = vi.fn();
    const report = await runKnowledgeExperiment({
      ...base,
      selectKnowledge: selector,
    });
    expect(selector).not.toHaveBeenCalled();
    expect(report.attempts).toHaveLength(4);
    expect(report.usage).toMatchObject({
      attemptedAnswerCalls: 0,
      attemptedSelectorCalls: 0,
      totalEstimatedCostUsd: 0,
    });
    expect(
      report.arms.every(
        ({ report }) => report.captureOnly && report.qualityVerified === false,
      ),
    ).toBe(true);
    expect(report.arms[3]!.report.results[0]!.references).toHaveLength(4);
    expect(report.arms[3]!.report.results[0]!.references[0]!.content).toContain(
      'Original approved',
    );
    expect(report.arms[3]!.report.results[0]!.references).toContainEqual({
      key: 'example.teams',
      version: 1,
      content: 'Original approved facts for example.teams.',
    });
  });

  it('selects multiple sections independently, force-adds mandatory sections, and withholds answer expectations', async () => {
    const inputs: unknown[] = [];
    const selectorInputs: unknown[] = [];
    const report = await runKnowledgeExperiment({
      ...base,
      ...live,
      answer: async (request) => {
        inputs.push(request);
        return answer(request);
      },
      selectKnowledge: async (request) => {
        selectorInputs.push(request);
        return response();
      },
    });
    expect(JSON.stringify(inputs)).not.toContain('SECRET EXPECTED');
    expect(JSON.stringify(inputs)).not.toContain('necessaryKnowledgeKeys');
    expect(JSON.stringify(selectorInputs)).not.toContain('Compact facts');
    expect(JSON.stringify(selectorInputs)).not.toContain('Original approved');
    expect(JSON.stringify(selectorInputs)).not.toContain('SECRET EXPECTED');
    expect(selectorInputs[0]).toMatchObject({
      recentMessages: item.recentMessages,
    });
    const attempt = report.attempts.find(({ arm }) => arm === 'jev-compact')!;
    expect(attempt.selector).toMatchObject({
      selectedKeys: ['example.printing', 'example.teams'],
      effectiveKeys: keys,
      mandatoryKeysAdded: ['example.basics', 'example.contact'],
      fallback: false,
      inputTokens: 77,
      outputTokens: 0,
    });
    expect(attempt.selector!.estimatedCostUsd).toBeCloseTo(
      (77 * 0.042) / 1_000_000,
    );
    expect(report.usage.attemptedAnswerCalls).toBe(4);
    expect(report.usage.attemptedSelectorCalls).toBe(1);
    expect(report.usage.unknownUsageCalls).toBe(0);
  });

  it.each([
    ['ambiguous-probabilities', () => response([0.1, 0.1, 0.5, 0.99])],
    ['no-selected-sections', () => response([0.1, 0.1, 0.1, 0.1])],
    [
      'invalid-response',
      () => ({
        model: 'jev',
        answers: {},
        usage: { input_tokens: 81, output_tokens: 0 },
      }),
    ],
    [
      'provider-error',
      () => {
        throw new Error('secret private error');
      },
    ],
  ])(
    'falls back visibly to the entire compact corpus for %s',
    async (reason, produce) => {
      const report = await runKnowledgeExperiment({
        ...base,
        ...live,
        selectKnowledge: async () => produce(),
      });
      const selector = report.attempts.find(
        ({ arm }) => arm === 'jev-compact',
      )!.selector!;
      expect(selector.effectiveKeys).toEqual(keys);
      expect(selector.fallbackReason).toBe(reason);
      expect(JSON.stringify(report)).not.toContain('secret private error');
      if (reason === 'invalid-response') expect(selector.inputTokens).toBe(81);
      expect(knowledgeExperimentExitCode(report)).toBe(
        reason === 'invalid-response' || reason === 'provider-error' ? 1 : 0,
      );
      if (reason === 'provider-error')
        expect(report.usage.totalEstimatedCostUsd).toBeNull();
    },
  );

  it('keeps unknown selector usage unknown even though selector output is priced at zero', async () => {
    const report = await runKnowledgeExperiment({
      ...base,
      ...live,
      selectKnowledge: async () => response(undefined, null),
    });
    const selector = report.attempts.find(
      ({ arm }) => arm === 'jev-compact',
    )!.selector!;
    expect(selector.inputTokens).toBeNull();
    expect(selector.outputTokens).toBeNull();
    expect(selector.estimatedCostUsd).toBeNull();
    expect(report.usage.unknownUsageCalls).toBe(1);
    expect(report.usage.totalEstimatedCostUsd).toBeNull();
  });

  it('reports manually reviewed missing dependencies separately from fixture reference keys', async () => {
    const report = await runKnowledgeExperiment({
      ...base,
      ...live,
      selectKnowledge: async () => response([0.1, 0.1, 0.99, 0.1]),
    });
    const attempt = report.attempts.find(({ arm }) => arm === 'jev-compact')!;
    expect(attempt.missingNecessaryKnowledgeKeys).toEqual(['example.teams']);
    expect(
      report.arms[3]!.report.results[0]!.references.map(({ key }) => key),
    ).toContain('example.teams');
  });

  it('refuses over-budget, changed-role, missing-mandatory and invalid-byte payloads before callbacks', async () => {
    const callback = vi.fn(answer);
    const selector = vi.fn(async () => response());
    expect(knowledgeExperimentCostBound(90)).toBeGreaterThan(2);
    await expect(
      runKnowledgeExperiment({
        ...base,
        ...live,
        answer: callback,
        selectKnowledge: selector,
        cases: Array.from({ length: 90 }, (_, index) => ({
          ...item,
          id: `synthetic.${index}`,
        })),
      }),
    ).rejects.toThrow('$2');
    await expect(
      runKnowledgeExperiment({
        ...base,
        ...live,
        answer: callback,
        selectKnowledge: selector,
        compactConfiguration: {
          ...compact,
          bots: compact.bots.map((bot) => ({
            ...bot,
            instructions: 'A changed prompt',
          })),
        },
      }),
    ).rejects.toThrow('only in knowledge');
    await expect(
      runKnowledgeExperiment({
        ...base,
        ...live,
        answer: callback,
        selectKnowledge: selector,
        mandatorySkillKeys: ['example.missing'],
      }),
    ).rejects.toThrow('Mandatory');
    await expect(
      runKnowledgeExperiment({
        ...base,
        ...live,
        answer: callback,
        selectKnowledge: selector,
        cases: [{ ...item, prompt: 'x'.repeat(4_001) }],
      }),
    ).rejects.toThrow();
    expect(callback).not.toHaveBeenCalled();
    expect(selector).not.toHaveBeenCalled();
  });

  it('requires live cost/cap authority and refuses an unreviewed expensive answer model', async () => {
    await expect(
      runKnowledgeExperiment({ ...base, ...live, liveAuthority: undefined }),
    ).rejects.toThrow('authority');
    await expect(
      runKnowledgeExperiment({
        ...base,
        answerModelKey: 'gpt-oss-120b' as 'gemma4-26b',
      }),
    ).rejects.toThrow('Unreviewed');
  });

  it('retains failures in every arm denominator and never treats missing paid usage as zero', async () => {
    const report = await runKnowledgeExperiment({
      ...base,
      ...live,
      answer: async () => {
        throw new Error('private credential');
      },
    });
    expect(
      report.arms.every(
        ({ report }) =>
          report.results.length === 1 && report.providerFailures === 1,
      ),
    ).toBe(true);
    expect(report.usage.unknownUsageCalls).toBe(4);
    expect(report.usage.totalEstimatedCostUsd).toBeNull();
    expect(JSON.stringify(report)).not.toContain('private credential');
  });

  it('reuses opaque blinded batches without context mode/model/price labels in reviewer data', async () => {
    const report = await runKnowledgeExperiment({
      ...base,
      ...live,
      answer: async (request) => {
        const capture = await answer(request);
        if (request.lazy) {
          capture.observation.toolNames = ['loadSkill'];
          capture.observation.toolTrace = [
            {
              toolName: 'loadSkill',
              status: 'completed',
              input: { key: 'example.printing' },
              output: {
                key: 'example.printing',
                version: 1001,
                content: 'Compact facts',
              },
            },
          ];
        }
        return capture;
      },
    });
    const batches = createKnowledgeExperimentReviewBatches(report, 'blind', 2);
    expect(batches).toHaveLength(2);
    expect(batches.flatMap(({ packet }) => packet.items)).toHaveLength(4);
    expect(JSON.stringify(batches.map(({ packet }) => packet))).not.toContain(
      'jev-compact',
    );
    expect(JSON.stringify(batches.map(({ packet }) => packet))).not.toContain(
      model,
    );
    expect(JSON.stringify(batches.map(({ packet }) => packet))).not.toContain(
      'estimatedCost',
    );
    expect(JSON.stringify(batches.map(({ packet }) => packet))).not.toContain(
      'loadSkill',
    );
    expect(JSON.stringify(batches.map(({ packet }) => packet))).not.toContain(
      '1001',
    );
    expect(
      report.attempts.find(({ arm }) => arm === 'compact-lazy')!.toolTrace,
    ).toHaveLength(1);
    expect(
      batches
        .flatMap(({ mapping }) => mapping.items)
        .find(({ sourceId }) => sourceId.startsWith('compact-lazy:'))!
        .hiddenKnowledgeToolEvidence?.toolTrace,
    ).toHaveLength(1);
    expect(
      batches
        .flatMap(({ mapping }) => mapping.items)
        .map(({ sourceId }) => sourceId),
    ).toContain('jev-compact:synthetic.multi-topic');
  });
});

describe('private selector adapter', () => {
  it.each([
    ['INVALID_PROVIDER_OUTPUT', 'invalid-response'],
    ['PROVIDER_UNAVAILABLE', 'provider-error'],
  ])(
    'distinguishes sanitized bridge %s failures without losing the original error category',
    async (code, reason) => {
      const fetchMock = vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: { code, message: code, type: 'provider_error' },
            }),
            { status: 502 },
          ),
      );
      vi.stubGlobal('fetch', fetchMock);
      const selector = createKnowledgeExperimentSelector({
        baseUrl: 'https://provider.example.invalid',
        secret: 'x'.repeat(32),
        capsVerified: true,
      });
      const report = await runKnowledgeExperiment({
        ...base,
        ...live,
        selectKnowledge: selector,
      });
      const recorded = report.attempts.find(
        ({ arm }) => arm === 'jev-compact',
      )!.selector!;
      expect(recorded.status).toBe(reason);
      expect(recorded.fallbackReason).toBe(reason);
      expect(recorded.inputTokens).toBeNull();
      expect(recorded.estimatedCostUsd).toBeNull();
      expect(recorded.effectiveKeys).toEqual(keys);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(knowledgeExperimentExitCode(report)).toBe(1);
    },
  );

  it('uses one bounded metadata-only request through the same capped private provider', async () => {
    const fetchMock = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        expect(input).toBeTruthy();
        expect(init?.method).toBe('POST');
        return new Response(JSON.stringify(response()), { status: 200 });
      },
    );
    vi.stubGlobal('fetch', fetchMock);
    const selector = createKnowledgeExperimentSelector({
      baseUrl: 'https://provider.example.invalid',
      secret: 'x'.repeat(32),
      capsVerified: true,
    });
    const request = {
      question: 'Print?',
      skills: configuration.skills.map(({ key, name, whenToUse }) => ({
        key,
        name,
        whenToUse,
      })),
    };
    await expect(selector(request)).resolves.toMatchObject({
      model: 'jev-1.13.0',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://provider.example.invalid/v1/knowledge-selection',
    );
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify(request),
    });
  });
});

describe('actual model-step capture adapter', () => {
  const provider = {
    baseUrl: 'https://provider.example.invalid',
    secret: 'x'.repeat(32),
    capsVerified: true,
  };
  it('captures lazy tool reads and every SDK model step with fixed zero-retry bounds', async () => {
    vi.mocked(generateText).mockImplementation(async (options) => {
      expect(options.maxRetries).toBe(0);
      expect(options.maxOutputTokens).toBe(1200);
      const lazy = !!options.tools?.loadSkill;
      expect(options.timeout).toEqual({
        totalMs: lazy ? 100_000 : 25_000,
        stepMs: 25_000,
      });
      await options.onLanguageModelCallStart?.({} as never);
      const firstTools = lazy
        ? [
            {
              toolCallId: 'load-1',
              toolName: 'loadSkill',
              input: { key: 'example.printing' },
            },
          ]
        : [];
      if (lazy)
        await options.tools!.loadSkill!.execute!(
          { key: 'example.printing' },
          {} as never,
        );
      await options.onStepEnd?.({
        text: lazy ? '' : 'Print the project.',
        finishReason: lazy ? 'tool-calls' : 'stop',
        usage: { inputTokens: 120, outputTokens: 20 },
        toolCalls: firstTools,
      } as never);
      if (lazy) {
        await options.onLanguageModelCallStart?.({} as never);
        await options.onStepEnd?.({
          text: 'Print the project.',
          finishReason: 'stop',
          usage: { inputTokens: 180, outputTokens: 15 },
          toolCalls: [],
        } as never);
      }
      return { text: 'Print the project.', finishReason: 'stop' } as never;
    });
    const report = await runKnowledgeExperiment({
      ...base,
      ...live,
      answer: createKnowledgeExperimentAnswerer({ mode: 'live', provider }),
    });
    const lazy = report.attempts.find(({ arm }) => arm === 'compact-lazy')!;
    expect(lazy.steps).toHaveLength(2);
    expect(lazy.loadedKeys).toEqual(['example.printing']);
    expect(lazy.observation!.usage).toEqual({
      inputTokens: 300,
      outputTokens: 35,
    });
    expect(lazy.toolTrace[0]).toMatchObject({
      status: 'completed',
      output: { key: 'example.printing', version: 1001 },
    });
    expect(report.usage.attemptedAnswerCalls).toBe(5);
  });

  it('preserves completed reads/usage before a failed continuation without exposing private errors', async () => {
    vi.mocked(generateText).mockImplementation(async (options) => {
      await options.onLanguageModelCallStart?.({} as never);
      if (options.tools?.loadSkill) {
        await options.tools.loadSkill.execute!(
          { key: 'example.printing' },
          {} as never,
        );
        await options.onStepEnd?.({
          text: '',
          finishReason: 'tool-calls',
          usage: { inputTokens: 120, outputTokens: 20 },
          toolCalls: [
            {
              toolCallId: 'load-1',
              toolName: 'loadSkill',
              input: { key: 'example.printing' },
            },
          ],
        } as never);
        await options.onLanguageModelCallStart?.({} as never);
      }
      throw new Error('Private setup-token value');
    });
    const report = await runKnowledgeExperiment({
      ...base,
      ...live,
      answer: createKnowledgeExperimentAnswerer({ mode: 'live', provider }),
    });
    const lazy = report.attempts.find(({ arm }) => arm === 'compact-lazy')!;
    expect(lazy.steps.map(({ status }) => status)).toEqual([
      'completed',
      'failed',
    ]);
    expect(lazy.toolTrace[0]).toMatchObject({ status: 'completed' });
    expect(lazy.steps[0]!.inputTokens).toBe(120);
    expect(lazy.steps[1]!.inputTokens).toBeNull();
    expect(report.usage.unknownUsageCalls).toBe(4);
    expect(report.usage.attemptedAnswerCalls).toBe(5);
    expect(report.usage.totalEstimatedCostUsd).toBeNull();
    expect(JSON.stringify(report)).not.toContain('Private setup-token value');
  });

  it('separates the finite workflow deadline from an injected paced transport deadline', async () => {
    const deadlines: unknown[] = [];
    vi.mocked(generateText).mockImplementation(async (options) => {
      deadlines.push(options.timeout);
      await options.onLanguageModelCallStart?.({} as never);
      if (options.tools?.loadSkill)
        await options.tools.loadSkill.execute!(
          { key: 'example.printing' },
          {} as never,
        );
      await options.onStepEnd?.({
        text: 'Print the project.',
        finishReason: 'stop',
        usage: { inputTokens: 100, outputTokens: 20 },
        toolCalls: [],
      } as never);
      return { text: 'Print the project.', finishReason: 'stop' } as never;
    });
    const network = vi.fn<typeof fetch>();
    await runKnowledgeExperiment({
      ...base,
      ...live,
      answer: createKnowledgeExperimentAnswerer({
        mode: 'live',
        provider,
        fetch: network,
      }),
    });
    expect(
      deadlines.filter(
        (value) =>
          JSON.stringify(value) ===
          JSON.stringify({ totalMs: 70_000, stepMs: 70_000 }),
      ),
    ).toHaveLength(3);
    expect(deadlines).toContainEqual({ totalMs: 280_000, stepMs: 70_000 });
    expect(network).not.toHaveBeenCalled();
  });
});

describe('knowledge experiment CLI', () => {
  it('loads Business-owned facts/cases, never loads a selector offline, and saves exclusive unjudged reports', async () => {
    const load = vi
      .spyOn(operatorModules, 'loadOperatorModule')
      .mockImplementation(async (path) => {
        if (path === 'full.ts') return { default: configuration };
        if (path === 'compact.ts') return { default: compact };
        if (path === 'cases.ts') return { knowledgeExperimentCases: [item] };
        throw new Error('Offline selector must not be loaded');
      });
    const result = await runKnowledgeExperimentCommand(
      [
        '--fixture-module',
        'cases.ts',
        '--operator-defaults-module',
        'full.ts',
        '--compact-defaults-module',
        'compact.ts',
        '--selector-module',
        'private.ts',
        '--mandatory-skill',
        'example.basics',
        '--mandatory-skill',
        'example.contact',
        '--case-id',
        item.id,
        '--report-directory',
        'projects/example/evaluation-results',
      ],
      {},
    );
    expect(load).toHaveBeenCalledTimes(3);
    expect(result.report.attempts).toHaveLength(4);
    expect(result.report.mode).toBe('mock');
    expect(writeFile).toHaveBeenCalledWith(
      result.jsonPath,
      expect.stringContaining('"qualityVerified": false'),
      { flag: 'wx' },
    );
    expect(writeFile).toHaveBeenCalledWith(
      result.markdownPath,
      expect.stringContaining('UNJUDGED'),
      { flag: 'wx' },
    );
    load.mockRestore();
  });
});
