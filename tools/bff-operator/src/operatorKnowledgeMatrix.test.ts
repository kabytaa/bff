import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { operatorWorkConfigurationSchema } from '@bff/contracts';
import { reviewedAnswerModel } from '@bff/assistant/models';
import {
  balancedKnowledgeCases,
  knowledgeMatrixStratum,
  matrixReviewSources,
  prepareKnowledgeMatrixRecovery,
} from './operatorKnowledgeMatrix';
import {
  knowledgeExperimentCostBound,
  runKnowledgeExperiment,
} from './operatorKnowledgeExperiment';
import type { KnowledgeExperimentReport } from './operatorKnowledgeExperiment';

const cases = ['helper', 'support'].flatMap((cohort) =>
  ['normal', 'messy', 'adversarial'].map((style) => ({
    id: `example.${cohort}.${style}`,
    cohort,
    split: 'held_out',
    prompt: `Synthetic ${cohort} ${style} question`,
    expected: {},
    tags: ['synthetic', style],
    referenceKeys: ['example.basics'],
    expectedBehavior: ['Answer the actual question from approved facts.'],
  })),
);

describe('broad knowledge matrix preparation', () => {
  const hash = (value: unknown) =>
    createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const full = operatorWorkConfigurationSchema.parse({
    version: 1,
    enabled: false,
    presentation: {
      productName: 'Example',
      helpUrl: 'https://example.invalid/help',
      contactEmail: 'support@example.invalid',
    },
    support: {
      botKey: 'support',
      fromEmail: 'support@example.invalid',
      fromName: 'Support',
      receivingAddress: 'inbound@example.invalid',
      replyDomain: 'reply.example.invalid',
      receiptText: 'Received.',
      surveyQuestion: 'Helpful?',
    },
    bots: ['helper', 'support'].map((kind) => ({
      key: kind,
      kind,
      name: kind,
      version: 1,
      instructions: 'Approved guidance.',
      model: 'qwen3-30b',
      skillKeys: ['example.basics'],
    })),
    skills: [
      {
        key: 'example.basics',
        version: 1,
        name: 'Basics',
        whenToUse: 'Product questions',
        content: 'Approved facts.',
      },
    ],
    events: [],
    pageCapabilities: [],
  });
  const compact = {
    ...full,
    skills: [{ ...full.skills[0]!, version: 2, content: 'Facts.' }],
  };
  const recoveryFixture = async () => {
    const ordered = balancedKnowledgeCases(cases, 'fixed');
    const indexedCaptures = await Promise.all(
      [0, 2].map(async (index) => {
        const item = ordered[index]!;
        const report = await runKnowledgeExperiment({
          cases: [item],
          fullConfiguration: full,
          compactConfiguration: compact,
          mandatorySkillKeys: ['example.basics'],
          answerModelKey: 'qwen3-30b',
          orderSeed: `fixed:${item.id}:qwen3-30b`,
          mode: 'live',
          liveAuthority: { confirmModelCost: true, capsVerified: true },
          answer: async () => ({
            observation: {
              text: 'Answer from approved facts.',
              toolNames: [],
              model: reviewedAnswerModel('qwen3-30b').nativeId,
              mocked: false,
              finishReason: 'stop',
            },
            steps: [],
          }),
          selectKnowledge: async () => ({
            model: 'jev-test',
            answers: { skill_0: { type: 'noul', noul: 1 } },
          }),
        });
        return {
          index,
          value: {
            version: 1,
            caseId: item.id,
            captures: [
              { modelKey: 'qwen3-30b', report, networkRecordIndices: [] },
            ],
          },
        };
      }),
    );
    return {
      originalStem: 'knowledge-matrix-2026-10-11T184003-864Z',
      cases,
      fullConfiguration: full,
      compactConfiguration: compact,
      modelKeys: ['qwen3-30b'] as const,
      mandatorySkillKeys: ['example.basics'],
      orderSeed: 'fixed',
      snapshots: { full, compact },
      indexedCaptures,
      checkpoint: {
        version: 1,
        modelKeys: ['qwen3-30b'],
        fullConfigurationVersion: hash(full),
        compactConfigurationVersion: hash(compact),
        caseVersion: hash(ordered),
        orderSeed: 'fixed',
        plannedQuestions: 6,
        completedWorkflows: 2,
        capturedAnswerAttempts: 8,
        plannedAnswerAttempts: 24,
        transport: {
          stopped: false,
          actualNetworkStarts: 5,
          localRefusals: 0,
          knownCostUsd: 0.1,
          unknownReservedCostUsd: 0.02,
          inFlightReservedCostUsd: 0.003,
          queuePacingWaitMs: 0,
          totalEstimatedCostUsd: null,
          nextStartAt: 0,
          cooldownUntil: 0,
          records: [],
        },
      },
    };
  };

  it('preserves completed workflows, marks interrupted gaps/tail without retry and bounds all missing calls', async () => {
    const result = prepareKnowledgeMatrixRecovery(await recoveryFixture());
    expect(result.resume.preservedCaptureJobIndices).toEqual([0, 2]);
    expect(result.resume.interruptedJobIndices).toEqual([1, 3, 4]);
    expect(result.remainingJobIndices).toEqual([5]);
    expect(result.resume.interruptedAnswerAttempts).toBe(12);
    expect(result.resume.unpersistedMaximumCalls).toBe(24);
    expect(result.resume.unpersistedReservedCostUsd).toBeCloseTo(
      3 * knowledgeExperimentCostBound(1, 'qwen3-30b', 1),
    );
    expect(result.recovery.snapshot.inFlightReservedCostUsd).toBe(0.003);
    expect(result.resume.interruptedJobs).toHaveLength(3);
  });

  it('refuses changed snapshots/cases/order before any provider access', async () => {
    const fixture = await recoveryFixture();
    expect(() =>
      prepareKnowledgeMatrixRecovery({ ...fixture, orderSeed: 'different' }),
    ).toThrow('hashes differ');
    expect(() =>
      prepareKnowledgeMatrixRecovery({
        ...fixture,
        cases: [{ ...cases[0], prompt: 'Altered question' }, ...cases.slice(1)],
      }),
    ).toThrow('hashes differ');
    expect(() =>
      prepareKnowledgeMatrixRecovery({
        ...fixture,
        snapshots: { full, compact: full },
      }),
    ).toThrow('hashes differ');
  });

  it('refuses duplicated or misplaced captures and checkpoint count mismatches', async () => {
    const fixture = await recoveryFixture();
    expect(() =>
      prepareKnowledgeMatrixRecovery({
        ...fixture,
        indexedCaptures: [
          ...fixture.indexedCaptures,
          fixture.indexedCaptures[0]!,
        ],
      }),
    ).toThrow('repeated');
    expect(() =>
      prepareKnowledgeMatrixRecovery({
        ...fixture,
        indexedCaptures: fixture.indexedCaptures.map((item, index) =>
          index ? item : { ...item, index: 1 },
        ),
      }),
    ).toThrow('frozen workflow');
    expect(() =>
      prepareKnowledgeMatrixRecovery({
        ...fixture,
        checkpoint: { ...fixture.checkpoint, completedWorkflows: 3 },
      }),
    ).toThrow('counts');
  });

  it('balances every original case without relabelling or losing cases', () => {
    const ordered = balancedKnowledgeCases(cases, 'fixed');
    expect(new Set(ordered.map((item) => item.id))).toEqual(
      new Set(cases.map((item) => item.id)),
    );
    expect(ordered).toHaveLength(6);
    expect(balancedKnowledgeCases(cases, 'fixed')).toEqual(ordered);
    expect(ordered.every((item) => item.split === 'held_out')).toBe(true);
    expect(() => balancedKnowledgeCases([...cases, cases[0]], 'fixed')).toThrow(
      'unique',
    );
  });

  it('preserves language and fresh/style strata independently of old held-out labels', () => {
    expect(knowledgeMatrixStratum(['fresh', 'language:fr', 'messy'])).toEqual({
      language: 'fr',
      style: 'messy',
      fresh: true,
    });
    expect(knowledgeMatrixStratum(['hebrew', 'regression'])).toEqual({
      language: 'he',
      style: 'regression-or-tuning',
      fresh: false,
    });
    expect(knowledgeMatrixStratum(['normal'])).toEqual({
      language: 'en',
      style: 'normal',
      fresh: false,
    });
  });

  it('keeps final text and full approved facts but hides retrieval/model provenance from judging', () => {
    const report = {
      arms: [
        {
          arm: 'compact-lazy',
          report: {
            results: [
              {
                id: 'example.helper.normal',
                cohort: 'helper',
                question: 'Question',
                expectedBehavior: ['Essential answer'],
                references: [
                  {
                    key: 'example.basics',
                    version: 1,
                    content: 'Approved facts',
                  },
                ],
                checks: [
                  { dimension: 'completed answer generation', passed: true },
                ],
                observation: {
                  text: 'Answer',
                  toolNames: ['loadSkill'],
                  toolTrace: [
                    {
                      toolName: 'loadSkill',
                      input: { key: 'example.basics' },
                      status: 'completed',
                    },
                  ],
                },
              },
              { id: 'empty', observation: { text: '' } },
            ],
          },
        },
      ],
    } as unknown as KnowledgeExperimentReport;
    const sources = matrixReviewSources('gemma4-26b', report);
    expect(sources).toHaveLength(1);
    expect(sources[0]!.sourceId).toBe(
      'gemma4-26b:compact-lazy:example.helper.normal',
    );
    expect(sources[0]!.input).toMatchObject({
      answer: 'Answer',
      toolNames: [],
      toolTrace: [],
      references: [{ content: 'Approved facts' }],
    });
    expect(JSON.stringify(sources[0]!.input)).not.toContain('compact-lazy');
    expect(sources[0]!.hiddenKnowledgeToolEvidence!.toolTrace).toHaveLength(1);
  });
});
