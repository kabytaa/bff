import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { reviewedAnswerModel } from '@bff/assistant/models';
import { knowledgeExperimentArms } from './operatorKnowledgeExperiment';
import {
  inspectKnowledgeMatrix,
  saveKnowledgeMatrixSummary,
} from './operatorKnowledgeMatrixReport';

const stem = 'knowledge-matrix-test';
let directory: string;
afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});

const partialScores = {
  relevance: 2,
  grounding: 1,
  authority: 2,
  clarity: 2,
  language: 1,
};

describe('knowledge matrix aggregate reader', () => {
  it('merges only identity-matched recovery evidence and exposes lost calls and coverage', async () => {
    directory = await mkdtemp(
      join(tmpdir(), 'knowledge-matrix-recovery-report-'),
    );
    const recoveredStem = 'knowledge-matrix-recovered';
    const identity = {
      fullConfigurationVersion: 'full-frozen',
      compactConfigurationVersion: 'compact-frozen',
      caseVersion: 'cases-frozen',
      orderSeed: 'same-seed',
      modelKeys: ['qwen3-30b', 'gemma4-26b', 'glm-4.7-flash'],
      cases: [
        { id: 'case', cohort: 'helper', split: 'tuning', language: 'en' },
      ],
      files: [],
    };
    await writeFile(
      join(directory, `${stem}-progress.json`),
      JSON.stringify(identity),
    );
    const recovered = {
      ...identity,
      resume: {
        originalStem: stem,
        interruptedJobIndices: [2],
        interruptedJobs: [
          { index: 2, caseId: 'case', modelKey: 'glm-4.7-flash' },
        ],
      },
      transport: {
        actualNetworkStarts: 8,
        unrecordedNetworkStartsUpperBound: 8,
        knownCostUsd: 0.01,
        unknownReservedCostUsd: 0.03,
        totalEstimatedCostUsd: null,
        records: [],
      },
    };
    await writeFile(
      join(directory, `${recoveredStem}-progress.json`),
      JSON.stringify(recovered),
    );
    const capture = (modelKey: string) => ({
      caseId: 'case',
      captures: [
        {
          modelKey,
          report: {
            attempts: knowledgeExperimentArms.map((arm) => ({
              id: 'case',
              arm,
              observation: { text: 'answer', finishReason: 'stop' },
              steps: [],
            })),
          },
          networkRecordIndices: [],
        },
      ],
    });
    await writeFile(
      join(directory, `${stem}-capture-000.json`),
      JSON.stringify(capture('qwen3-30b')),
    );
    await writeFile(
      join(directory, `${recoveredStem}-capture-001.json`),
      JSON.stringify(capture('gemma4-26b')),
    );
    const grade = (model: string) => ({
      results: knowledgeExperimentArms.map((arm) => ({
        sourceId: `${model}:${arm}:case`,
        status: 'reviewed',
        passed: true,
        scorecard: {
          status: 'scored',
          scores: {
            relevance: 2,
            grounding: 2,
            authority: 2,
            clarity: 2,
            language: 2,
          },
          criticalFailures: [],
        },
      })),
    });
    await writeFile(
      join(directory, `${stem}-review-000-validation.json`),
      JSON.stringify(grade('qwen3-30b')),
    );
    await writeFile(
      join(directory, `${recoveredStem}-review-000-validation.json`),
      JSON.stringify(grade('gemma4-26b')),
    );
    const { aggregate, markdown } = await inspectKnowledgeMatrix(
      recoveredStem,
      directory,
    );
    expect(aggregate.sourceStems).toEqual([recoveredStem, stem]);
    expect(aggregate.capturedAnswerAttempts).toBe(8);
    expect(aggregate.grades.reviewed).toBe(8);
    expect(aggregate.interruptedAnswerAttempts).toBe(4);
    expect(aggregate.unstartedAnswerAttempts).toBe(0);
    expect(aggregate.unstartedWorkflows).toBe(0);
    expect(aggregate.endToEndAcceptedPerPlannedAttempt).toBeCloseTo(2 / 3);
    expect(aggregate.transport.actualNetworkStarts).toBe(8);
    expect(aggregate.transport.unrecordedNetworkStartsUpperBound).toBe(8);
    expect(markdown).toContain('not silently rerun');
    await writeFile(
      join(directory, `${recoveredStem}-capture-002.json`),
      JSON.stringify(capture('qwen3-30b')),
    );
    await expect(
      inspectKnowledgeMatrix(recoveredStem, directory),
    ).rejects.toThrow('Duplicate recovered workflow');
    await writeFile(
      join(directory, `${recoveredStem}-progress.json`),
      JSON.stringify({ ...recovered, caseVersion: 'changed' }),
    );
    await expect(
      inspectKnowledgeMatrix(recoveredStem, directory),
    ).rejects.toThrow('identity mismatch');
  });

  it('keeps capture, SDK attempts, local refusals, grades and unstarted work distinct', async () => {
    directory = await mkdtemp(join(tmpdir(), 'knowledge-matrix-report-'));
    const modelKeys = ['qwen3-30b', 'gemma4-26b', 'glm-4.7-flash'] as const;
    const cases = [
      {
        id: 'fresh.case.one',
        cohort: 'helper',
        split: 'held_out',
        language: 'fr',
        style: 'messy',
        fresh: true,
      },
      {
        id: 'seen.case.two',
        cohort: 'support',
        split: 'held_out',
        language: 'en',
        style: 'normal',
        fresh: false,
      },
      {
        id: 'unstarted.case.three',
        cohort: 'helper',
        split: 'tuning',
        language: 'en',
        style: 'normal',
        fresh: false,
      },
    ];
    const records: Array<Record<string, unknown>> = [];
    const progressFiles = [`${stem}-snapshots.json`];
    const validatedResults: Array<Record<string, unknown>> = [];
    let recordIndex = 0;
    for (const [modelIndex, modelKey] of modelKeys.entries()) {
      const native = reviewedAnswerModel(modelKey).nativeId;
      const captures = cases.slice(0, 2).map((caseItem, caseIndex) => {
        const indices: number[] = [];
        const attempts = knowledgeExperimentArms.map((arm, armIndex) => {
          recordIndex += 1;
          indices.push(recordIndex);
          records.push({
            index: recordIndex,
            model: native,
            kind: 'answer',
            status: 'completed',
          });
          const selector = arm === 'jev-compact';
          if (selector) {
            recordIndex += 1;
            indices.push(recordIndex);
            records.push({
              index: recordIndex,
              model: 'typesafe/jev',
              kind: 'knowledge-selection',
              status: 'completed',
            });
          }
          const reason =
            caseIndex === 0 &&
            modelKey === 'gemma4-26b' &&
            arm === 'compact-lazy'
              ? 'length'
              : 'stop';
          const unknownUsage =
            caseIndex === 0 &&
            modelKey === 'qwen3-30b' &&
            arm === 'compact-inline';
          const emptyFailure = unknownUsage;
          const answerAttempt = {
            id: caseItem.id,
            arm,
            endToEndLatencyMs: 1_000 + armIndex * 100,
            steps: [
              {
                status: emptyFailure ? 'failed' : 'completed',
                finishReason: emptyFailure ? undefined : reason,
                inputTokens: unknownUsage ? null : 100,
                outputTokens: unknownUsage ? null : 30,
                estimatedCostUsd: unknownUsage ? null : 0.01,
              },
            ],
            ...(selector
              ? {
                  selector: {
                    status: 'completed',
                    fallback: true,
                    inputTokens: 20,
                    outputTokens: 0,
                    estimatedCostUsd: 0.001,
                  },
                }
              : {}),
            ...(emptyFailure
              ? { error: 'answer-generation-failed' }
              : {
                  observation: {
                    text: 'captured answer',
                    finishReason: reason,
                    toolTrace: [],
                  },
                }),
          };
          if (
            !emptyFailure &&
            !(
              modelKey === 'glm-4.7-flash' &&
              arm === 'compact-lazy' &&
              caseIndex === 1
            )
          ) {
            const fullyAdequate =
              modelKey === 'qwen3-30b' &&
              arm === 'full-inline' &&
              caseIndex === 0;
            validatedResults.push({
              sourceId: `${modelKey}:${arm}:${caseItem.id}`,
              status: 'reviewed',
              checksPassed: !fullyAdequate,
              passed: false,
              scorecard: {
                status: 'scored',
                scores: fullyAdequate
                  ? {
                      relevance: 2,
                      grounding: 2,
                      authority: 2,
                      clarity: 2,
                      language: 2,
                    }
                  : partialScores,
                criticalFailures: [],
              },
            });
          }
          return answerAttempt;
        });
        return {
          modelKey,
          networkRecordIndices: indices,
          report: { attempts },
        };
      });
      const captureName = `${stem}-capture-${String(modelIndex).padStart(3, '0')}.json`;
      progressFiles.push(captureName);
      await writeFile(
        join(directory, captureName),
        JSON.stringify({
          version: 1,
          caseId: cases[0]!.id,
          captures,
        }),
      );
    }
    records.push({
      index: ++recordIndex,
      model: reviewedAnswerModel('qwen3-30b').nativeId,
      kind: 'answer',
      status: 'queue_deadline',
    });
    const progress = {
      createdAt: '2026-10-11T00:00:00.000Z',
      updatedAt: '2026-10-11T00:01:00.000Z',
      modelKeys,
      cases,
      files: progressFiles,
      transport: {
        actualNetworkStarts: records.filter(
          (item) =>
            !['cost_boundary', 'queue_deadline'].includes(String(item.status)),
        ).length,
        localRefusals: records.filter((item) =>
          ['cost_boundary', 'queue_deadline'].includes(String(item.status)),
        ).length,
        knownCostUsd: 0.1,
        unknownReservedCostUsd: 0,
        totalEstimatedCostUsd: 0.1,
        queuePacingWaitMs: 1_000,
        records,
      },
    };
    await writeFile(
      join(directory, `${stem}-progress.json`),
      JSON.stringify(progress),
    );
    await writeFile(
      join(directory, `${stem}-review-000-validation.json`),
      JSON.stringify({ results: validatedResults }),
    );

    const { aggregate, markdown } = await inspectKnowledgeMatrix(
      stem,
      directory,
    );
    expect(aggregate.arms).toHaveLength(12);
    expect(aggregate.arms[0]).toMatchObject({
      plannedAttempts: 3,
      capturedAttempts: 2,
      unstartedAttempts: 1,
      sdkAnswerCallStarts: 2,
      nonemptyAnswers: 2,
      endToEndAccepted: 0,
      semanticAdequate: 1,
      reviewedNonempty: 2,
      endToEndAcceptanceRate: 0,
      transportNetworkStarts: null,
      transportLocalRefusals: null,
    });
    expect(
      aggregate.models.find((item) => item.modelKey === 'qwen3-30b'),
    ).toMatchObject({
      capturedWorkflows: 2,
      unstartedWorkflows: 1,
      localRefusals: 1,
    });
    expect(aggregate.sharedCases).toMatchObject({
      allTwelveCompleteVariants: 1,
      historicalHeldOutCases: 1,
      freshCaseCount: 0,
      freshCasesPlanned: 1,
    });
    expect(
      aggregate.sharedCases.armComparison.find(
        (item) =>
          item.modelKey === 'glm-4.7-flash' && item.arm === 'compact-lazy',
      ),
    ).toMatchObject({
      variants: 1,
      finalGrades: 0,
      reviewed: 0,
      semanticAdequate: 0,
      semanticRate: null,
      endToEndAccepted: 0,
      endToEndRate: null,
    });
    expect(aggregate.strata).toHaveLength(36);
    expect(aggregate.strata.find((item) => item.fresh)).toMatchObject({
      cohort: 'helper',
      language: 'fr',
      style: 'messy',
      fresh: true,
    });
    expect(
      aggregate.arms.find(
        (item) => item.arm === 'jev-compact' && item.modelKey === 'gemma4-26b',
      ),
    ).toMatchObject({
      selectorFallbacks: 2,
      selectorAttempts: 2,
      knownInputTokens: 240,
      knownEstimatedCostUsd: 0.022,
      completeUsageResponses: 2,
      meanKnownCostPerCompleteResponseUsd: 0.011,
    });
    expect(
      aggregate.arms.find(
        (item) =>
          item.modelKey === 'qwen3-30b' && item.arm === 'compact-inline',
      )?.completeUsageResponses,
    ).toBe(1);
    expect(aggregate.quality).toMatchObject({
      endToEndAccepted: 0,
      capturedAttempts: 24,
      endToEndAcceptanceRate: null,
      semanticAdequate: 1,
      reviewedNonempty: 22,
      ungradedNonempty: 1,
      partial: true,
    });
    expect(
      aggregate.arms.find(
        (item) => item.modelKey === 'gemma4-26b' && item.arm === 'compact-lazy',
      )?.finishReasonCounts,
    ).toMatchObject({ length: 1, stop: 1 });
    expect(markdown).toContain('not reported accuracy');
    expect(markdown).toContain('intentionally unassigned');
    expect(markdown).not.toContain('captured answer');

    const validationPath = join(
      directory,
      `${stem}-review-000-validation.json`,
    );
    const originalValidation = await readFile(validationPath, 'utf8');
    await writeFile(join(directory, `${stem}-summary.json`), 'old summary');
    const saved = await saveKnowledgeMatrixSummary(stem, directory);
    expect(saved.aggregate.summaryGeneratedAt).toMatch(/^202\d-/u);
    expect(await readFile(saved.jsonPath, 'utf8')).toContain(
      'summaryGeneratedAt',
    );
    expect(await readFile(saved.markdownPath, 'utf8')).toContain(
      'Summary generated',
    );
    expect(await readFile(validationPath, 'utf8')).toBe(originalValidation);
  });
});
