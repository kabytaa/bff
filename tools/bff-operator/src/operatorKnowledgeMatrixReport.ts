import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { reviewedAnswerModel } from '@bff/assistant/models';
import type { AnswerModelKey } from '@bff/assistant/models';
import { knowledgeExperimentArms } from './operatorKnowledgeExperiment';

type Arm = (typeof knowledgeExperimentArms)[number];
type JsonObject = Record<string, unknown>;
const answerKeys: AnswerModelKey[] = [
  'qwen3-30b',
  'gemma4-26b',
  'glm-4.7-flash',
];
const qualityDimensions = [
  'relevance',
  'grounding',
  'authority',
  'clarity',
  'language',
] as const;
const localStatuses = new Set([
  'queue_deadline',
  'cost_boundary',
  'stopped',
  'invalid_request',
]);

const object = (value: unknown): JsonObject | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
const array = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];
const finite = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const text = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

interface MatrixCase {
  id: string;
  cohort: 'helper' | 'support';
  split: 'tuning' | 'held_out';
  language: string;
  style: string;
  fresh: boolean;
}

interface ArmAggregate {
  modelKey: AnswerModelKey;
  arm: Arm;
  plannedAttempts: number;
  capturedAttempts: number;
  unstartedAttempts: number;
  interruptedAttempts: number;
  sdkAnswerCallStarts: number;
  selectorTraceAttempts: number;
  nonemptyAnswers: number;
  endToEndAccepted: number;
  endToEndAcceptanceRate: number | null;
  endToEndAcceptedLowerBoundPerCapturedAttempt: number | null;
  semanticAdequate: number;
  judgeFlaggedCriticalResponses: number;
  judgeFlaggedGroundingZeroResponses: number;
  judgeFlaggedIncompleteOnlyResponses: number;
  judgeFlaggedLanguageWeakResponses: number;
  semanticAdequacyAmongReviewedNonempty: number | null;
  reviewedNonempty: number;
  ungradedNonempty: number;
  semanticPartial: boolean;
  kpis: Record<(typeof qualityDimensions)[number], number | null>;
  finishReasonCounts: Record<string, number>;
  failedSdkAnswerSteps: number;
  providerTimeoutAttribution: 'workflow-level-unattributed';
  meanEndToEndLatencyMs: number | null;
  knownInputTokens: number;
  knownOutputTokens: number;
  knownEstimatedCostUsd: number;
  completeUsageResponses: number;
  meanKnownCostPerCompleteResponseUsd: number | null;
  completeResponsesPerDollar: number | null;
  unknownUsageStepOrSelectorRecords: number;
  selectorFallbacks: number;
  selectorAttempts: number;
  transportNetworkStarts: null;
  transportLocalRefusals: null;
}

export interface KnowledgeMatrixAggregate {
  stem: string;
  sourceStems: string[];
  interruptedWorkflows: number;
  interruptedAnswerAttempts: number;
  endToEndAcceptedPerPlannedAttempt: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  plannedCases: number;
  plannedWorkflows: number;
  capturedWorkflows: number;
  unstartedWorkflows: number;
  plannedAnswerAttempts: number;
  capturedAnswerAttempts: number;
  unstartedAnswerAttempts: number;
  arms: ArmAggregate[];
  strata: Array<{
    cohort: 'helper' | 'support';
    language: string;
    style: string;
    fresh: boolean;
    modelKey: AnswerModelKey;
    arm: Arm;
    cases: number;
    plannedAttempts: number;
    capturedAttempts: number;
    unstartedAttempts: number;
    interruptedAttempts: number;
    nonemptyAnswers: number;
    endToEndAccepted: number;
    semanticAdequate: number;
    reviewedNonempty: number;
    ungradedNonempty: number;
    semanticPartial: boolean;
    endToEndAcceptanceRate: number | null;
  }>;
  models: Array<{
    modelKey: AnswerModelKey;
    plannedWorkflows: number;
    capturedWorkflows: number;
    unstartedWorkflows: number;
    interruptedWorkflows: number;
    actualNetworkStarts: number;
    selectorActualNetworkStarts: number;
    localRefusals: number;
    selectorLocalRefusals: number;
    unknownTransportRecords: number;
    knownEstimatedCostUsd: number;
    unknownReservedCostUsd: number;
    totalEstimatedCostUsd: number | null;
  }>;
  transport: {
    actualNetworkStarts: number;
    unrecordedNetworkStartsUpperBound: number;
    localRefusals: number;
    unattributedSelectorNetworkStarts: number;
    unattributedSelectorLocalRefusals: number;
    knownEstimatedCostUsd: number;
    unknownReservedCostUsd: number;
    totalEstimatedCostUsd: number | null;
    queuePacingWaitMs: number | null;
  };
  quality: {
    endToEndAccepted: number;
    capturedAttempts: number;
    endToEndAcceptanceRate: number | null;
    endToEndAcceptedLowerBoundPerCapturedAttempt: number | null;
    semanticAdequate: number;
    semanticAdequacyAmongReviewedNonempty: number | null;
    reviewedNonempty: number;
    ungradedNonempty: number;
    partial: boolean;
    semanticPartial: boolean;
    kpis: Record<(typeof qualityDimensions)[number], number | null>;
  };
  sharedCases: {
    allTwelveCompleteVariants: number;
    cases: Array<{
      caseId: string;
      split: 'tuning' | 'held_out';
      fresh: boolean;
      variants: 12;
    }>;
    armComparison: Array<{
      modelKey: AnswerModelKey;
      arm: Arm;
      variants: number;
      finalGrades: number;
      reviewed: number;
      semanticAdequate: number;
      semanticRate: number | null;
      endToEndAccepted: number;
      endToEndRate: number | null;
    }>;
    historicalHeldOutCases: number;
    freshCaseCount: number;
    freshCasesPlanned: number;
    note: string;
  };
  grades: {
    filesRead: number;
    reviewed: number;
    unsure: number;
    invalid: number;
  };
  warnings: string[];
}

function average(values: number[]): number | null {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator ? numerator / denominator : null;
}

function gradeIsSemanticAdequate(grade: JsonObject | undefined): boolean {
  const scorecard = object(grade?.scorecard);
  const scores = object(scorecard?.scores);
  return (
    grade?.status === 'reviewed' &&
    scorecard?.status === 'scored' &&
    !!scores &&
    qualityDimensions.every((dimension) => scores[dimension] === 2) &&
    Array.isArray(scorecard.criticalFailures) &&
    scorecard.criticalFailures.length === 0
  );
}

function gradeIsReviewed(grade: JsonObject | undefined): boolean {
  const scorecard = object(grade?.scorecard);
  return (
    grade?.status === 'reviewed' &&
    scorecard?.status === 'scored' &&
    !!object(scorecard.scores)
  );
}

function finishReason(attempt: JsonObject): string {
  const observationReason = text(object(attempt.observation)?.finishReason);
  const steps = array(attempt.steps)
    .map(object)
    .filter((step) => !!step);
  const reason = observationReason ?? text(steps.at(-1)?.finishReason);
  return reason &&
    [
      'stop',
      'length',
      'tool-calls',
      'content-filter',
      'error',
      'other',
      'unknown',
    ].includes(reason)
    ? reason
    : 'unreported';
}

function gradeSourceKey(
  sourceId: string,
): { modelKey: AnswerModelKey; arm: Arm; caseId: string } | undefined {
  for (const modelKey of answerKeys)
    for (const arm of knowledgeExperimentArms) {
      const prefix = `${modelKey}:${arm}:`;
      if (sourceId.startsWith(prefix))
        return { modelKey, arm, caseId: sourceId.slice(prefix.length) };
    }
  return undefined;
}

/**
 * Read-only aggregate for one matrix run. Transport records remain workflow/model
 * scoped: four arm calls share one networkRecordIndices list, so they are never
 * allocated to arms by sequence or timing.
 */
export async function inspectKnowledgeMatrix(
  stem: string,
  directory: string,
): Promise<{ aggregate: KnowledgeMatrixAggregate; markdown: string }> {
  if (!/^[a-zA-Z0-9T._-]+$/u.test(stem) || basename(stem) !== stem)
    throw new Error('Invalid matrix stem');
  const root = resolve(directory);
  const names = await readdir(root);
  const sourceStems = [stem];
  const readJson = async (name: string): Promise<unknown> => {
    if (
      basename(name) !== name ||
      !sourceStems.some((source) => name.startsWith(`${source}-`))
    )
      throw new Error('Matrix file is outside the selected run');
    return JSON.parse(await readFile(resolve(root, name), 'utf8')) as unknown;
  };
  const progressName = `${stem}-progress.json`;
  const manifestName = `${stem}-manifest.json`;
  const progress = names.includes(progressName)
    ? object(await readJson(progressName))
    : names.includes(manifestName)
      ? object(await readJson(manifestName))
      : undefined;
  if (!progress) throw new Error('Matrix progress or manifest is missing');
  const resume = object(progress.resume);
  const originalStem = text(resume?.originalStem);
  if (originalStem) {
    if (
      !/^knowledge-matrix-[a-zA-Z0-9T._-]+$/u.test(originalStem) ||
      originalStem === stem
    )
      throw new Error('Invalid matrix recovery source');
    sourceStems.push(originalStem);
    const original = object(await readJson(`${originalStem}-progress.json`));
    if (
      !original ||
      object(original.resume) ||
      [
        'fullConfigurationVersion',
        'compactConfigurationVersion',
        'caseVersion',
        'orderSeed',
      ].some(
        (key) =>
          typeof progress[key] !== 'string' || progress[key] !== original[key],
      ) ||
      JSON.stringify(progress.modelKeys) !== JSON.stringify(original.modelKeys)
    )
      throw new Error(
        'Recovery source configuration or case identity mismatch',
      );
  }

  const warnings: string[] = [];
  const interruptedJobs = array(resume?.interruptedJobs)
    .map(object)
    .filter((item): item is JsonObject => !!item);
  const cases: MatrixCase[] = array(progress.cases).flatMap((raw) => {
    const item = object(raw);
    if (
      !item ||
      typeof item.id !== 'string' ||
      (item.cohort !== 'helper' && item.cohort !== 'support') ||
      (item.split !== 'tuning' && item.split !== 'held_out')
    )
      return [];
    return [
      {
        id: item.id,
        cohort: item.cohort,
        split: item.split,
        language: text(item.language) ?? 'unknown',
        style: text(item.style) ?? 'unknown',
        fresh: item.fresh === true,
      },
    ];
  });
  const modelKeys = array(progress.modelKeys).filter(
    (key): key is AnswerModelKey =>
      typeof key === 'string' && answerKeys.includes(key as AnswerModelKey),
  );
  if (modelKeys.length !== 3)
    warnings.push(
      `Expected three reviewed models; progress contains ${modelKeys.length}`,
    );
  const capturesByModel = new Map<AnswerModelKey, Map<string, JsonObject>>();
  for (const key of modelKeys) capturesByModel.set(key, new Map());
  const captureNames = new Set<string>(
    array(progress.files).filter(
      (value): value is string =>
        typeof value === 'string' &&
        /^knowledge-matrix-.*-capture-\d+\.json$/u.test(value),
    ),
  );
  for (const name of names)
    if (
      sourceStems.some((source) =>
        new RegExp(
          `^${source.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}-capture-\\d+\\.json$`,
          'u',
        ).test(name),
      )
    )
      captureNames.add(name);
  for (const name of captureNames) {
    try {
      const file = object(await readJson(name));
      for (const rawCapture of array(file?.captures)) {
        const capture = object(rawCapture);
        const modelKey = text(capture?.modelKey) as AnswerModelKey | undefined;
        const report = object(capture?.report);
        const caseId =
          text(
            report?.attempts &&
              array(report.attempts)[0] &&
              object(array(report.attempts)[0])?.id,
          ) ?? text(file?.caseId);
        if (modelKey && modelKeys.includes(modelKey) && caseId && report) {
          if (capturesByModel.get(modelKey)!.has(caseId))
            throw new Error(
              `Duplicate recovered workflow: ${modelKey}:${caseId}`,
            );
          capturesByModel.get(modelKey)!.set(caseId, capture!);
        }
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith('Duplicate recovered workflow:')
      )
        throw error;
      warnings.push(`Unreadable capture file: ${name}`);
    }
  }

  const gradeByVariant = new Map<string, JsonObject>();
  let gradeFilesRead = 0;
  const gradeNames = names.filter(
    (name) =>
      sourceStems.some((source) => name.startsWith(`${source}-review-`)) &&
      name.endsWith('-validation.json'),
  );
  for (const name of gradeNames) {
    try {
      const validation = object(await readJson(name));
      if (!validation || !Array.isArray(validation.results)) {
        warnings.push(`Validation file has no results array: ${name}`);
        continue;
      }
      gradeFilesRead += 1;
      for (const rawResult of validation.results) {
        const result = object(rawResult);
        const sourceId = text(result?.sourceId);
        const parsed = sourceId ? gradeSourceKey(sourceId) : undefined;
        if (parsed && result)
          gradeByVariant.set(
            `${parsed.modelKey}:${parsed.arm}:${parsed.caseId}`,
            result,
          );
      }
    } catch {
      warnings.push(`Unreadable validation file: ${name}`);
    }
  }

  const transport = object(progress.transport) ?? {};
  const transportRecords = array(transport.records)
    .map(object)
    .filter((item): item is JsonObject => !!item);
  const transportByIndex = new Map(
    transportRecords.flatMap((item) => {
      const index = finite(item.index);
      return index === undefined ? [] : [[index, item] as const];
    }),
  );
  const captureIndexSets = new Map<AnswerModelKey, Set<number>>();
  for (const key of modelKeys) {
    const indices = new Set<number>();
    for (const capture of capturesByModel.get(key)!.values())
      for (const value of array(capture.networkRecordIndices))
        if (typeof value === 'number' && Number.isSafeInteger(value))
          indices.add(value);
    captureIndexSets.set(key, indices);
  }
  const modelSummaries = modelKeys.map((modelKey) => {
    const indices = captureIndexSets.get(modelKey)!;
    const allModelRecords = transportRecords.filter((record) => {
      try {
        return record.model === reviewedAnswerModel(modelKey).nativeId;
      } catch {
        return false;
      }
    });
    for (const index of indices)
      if (!transportByIndex.has(index))
        warnings.push(
          `Missing transport record index ${index} for ${modelKey}`,
        );
    const actual = allModelRecords.filter(
      (record) => !localStatuses.has(String(record.status)),
    );
    const local = allModelRecords.filter((record) =>
      localStatuses.has(String(record.status)),
    );
    const modelCaptures = capturesByModel.get(modelKey)!;
    const workflowRecords = [...indices].flatMap((index) => {
      const record = transportByIndex.get(index);
      return record ? [record] : [];
    });
    const selectorRecords = workflowRecords.filter(
      (record) => record.model === 'typesafe/jev',
    );
    const selectorActual = selectorRecords.filter(
      (record) => !localStatuses.has(String(record.status)),
    );
    const selectorLocal = selectorRecords.filter((record) =>
      localStatuses.has(String(record.status)),
    );
    const modelTransportRecords = [...allModelRecords, ...selectorRecords];
    const knownCost = [...modelCaptures.values()].reduce((sum, capture) => {
      const report = object(capture.report);
      return sum + (finite(object(report?.usage)?.knownEstimatedCostUsd) ?? 0);
    }, 0);
    return {
      modelKey,
      plannedWorkflows: cases.length,
      capturedWorkflows: modelCaptures.size,
      interruptedWorkflows: interruptedJobs.filter(
        (item) => item.modelKey === modelKey,
      ).length,
      unstartedWorkflows: Math.max(
        0,
        cases.length -
          modelCaptures.size -
          interruptedJobs.filter((item) => item.modelKey === modelKey).length,
      ),
      actualNetworkStarts: actual.length + selectorActual.length,
      selectorActualNetworkStarts: selectorActual.length,
      localRefusals: local.length,
      selectorLocalRefusals: selectorLocal.length,
      unknownTransportRecords:
        allModelRecords.filter(
          (record) =>
            record.status === 'provider_timeout' ||
            record.status === 'provider_error',
        ).length +
        selectorRecords.filter(
          (record) =>
            record.status === 'provider_timeout' ||
            record.status === 'provider_error',
        ).length,
      knownEstimatedCostUsd: knownCost,
      unknownReservedCostUsd:
        allModelRecords.reduce(
          (sum, record) => sum + (finite(record.reservedUnknownCostUsd) ?? 0),
          0,
        ) +
        selectorRecords.reduce(
          (sum, record) => sum + (finite(record.reservedUnknownCostUsd) ?? 0),
          0,
        ),
      totalEstimatedCostUsd: modelTransportRecords.some(
        (record) => finite(record.reservedUnknownCostUsd) !== undefined,
      )
        ? null
        : knownCost,
    };
  });
  const mappedRecordIndices = new Set(
    [...captureIndexSets.values()].flatMap((indices) => [...indices]),
  );
  const unassignedSelectorRecords = transportRecords.filter(
    (record) =>
      record.model === 'typesafe/jev' &&
      !mappedRecordIndices.has(finite(record.index) ?? -1),
  );

  const arms: ArmAggregate[] = [];
  const completedVariantsByCase = new Map<string, Set<string>>();
  for (const modelKey of modelKeys) {
    const modelCaptures = capturesByModel.get(modelKey)!;
    for (const arm of knowledgeExperimentArms) {
      const attempts: Array<{ attempt: JsonObject; capture: JsonObject }> = [];
      for (const capture of modelCaptures.values()) {
        const report = object(capture.report);
        for (const rawAttempt of array(report?.attempts)) {
          const attempt = object(rawAttempt);
          if (attempt?.arm === arm && typeof attempt.id === 'string')
            attempts.push({ attempt, capture });
        }
      }
      const stepRecords = attempts.flatMap(({ attempt }) =>
        array(attempt.steps)
          .map(object)
          .filter((step): step is JsonObject => !!step),
      );
      const selectorRecords = attempts.flatMap(({ attempt }) =>
        object(attempt.selector) ? [object(attempt.selector)!] : [],
      );
      const answered = attempts.filter(({ attempt }) => {
        const obs = object(attempt.observation);
        return (text(obs?.text) ?? '').trim().length > 0;
      });
      const endToEndAccepted = attempts.filter(({ attempt }) => {
        const grade = gradeByVariant.get(
          `${modelKey}:${arm}:${String(attempt.id)}`,
        );
        return grade?.status === 'reviewed' && grade.passed === true;
      }).length;
      const reviewedGrades = answered.flatMap(({ attempt }) => {
        const grade = gradeByVariant.get(
          `${modelKey}:${arm}:${String(attempt.id)}`,
        );
        const scorecard = object(grade?.scorecard);
        const scores = object(scorecard?.scores);
        if (!gradeIsReviewed(grade) || !scores) return [];
        return [{ grade, scores }];
      });
      const semanticAdequate = answered.filter(({ attempt }) =>
        gradeIsSemanticAdequate(
          gradeByVariant.get(`${modelKey}:${arm}:${String(attempt.id)}`),
        ),
      ).length;
      const ungradedNonempty = answered.filter(({ attempt }) => {
        const grade = gradeByVariant.get(
          `${modelKey}:${arm}:${String(attempt.id)}`,
        );
        return (
          !grade ||
          !['reviewed', 'unsure', 'invalid'].includes(String(grade.status))
        );
      }).length;
      const kpis = Object.fromEntries(
        qualityDimensions.map((dimension) => [
          dimension,
          average(
            reviewedGrades.flatMap(({ scores }) => {
              const value = finite(scores[dimension]);
              return value === undefined ? [] : [value];
            }),
          ),
        ]),
      ) as ArmAggregate['kpis'];
      const knownInputTokens =
        stepRecords.reduce(
          (sum, step) => sum + (finite(step.inputTokens) ?? 0),
          0,
        ) +
        selectorRecords.reduce(
          (sum, selector) => sum + (finite(selector.inputTokens) ?? 0),
          0,
        );
      const knownOutputTokens =
        stepRecords.reduce(
          (sum, step) => sum + (finite(step.outputTokens) ?? 0),
          0,
        ) +
        selectorRecords.reduce(
          (sum, selector) => sum + (finite(selector.outputTokens) ?? 0),
          0,
        );
      const knownEstimatedCostUsd =
        stepRecords.reduce(
          (sum, step) => sum + (finite(step.estimatedCostUsd) ?? 0),
          0,
        ) +
        selectorRecords.reduce(
          (sum, selector) => sum + (finite(selector.estimatedCostUsd) ?? 0),
          0,
        );
      const unknownUsageStepOrSelectorRecords =
        stepRecords.filter(
          (step) => finite(step.estimatedCostUsd) === undefined,
        ).length +
        selectorRecords.filter(
          (selector) => finite(selector.estimatedCostUsd) === undefined,
        ).length;
      const fullyCostedCompleteResponses = attempts.flatMap(({ attempt }) => {
        if (
          !text(object(attempt.observation)?.text)?.trim() ||
          finishReason(attempt) !== 'stop'
        )
          return [];
        const costs = array(attempt.steps).map(object);
        const selector = object(attempt.selector);
        if (selector) costs.push(selector);
        if (
          !costs.length ||
          costs.some((record) => finite(record?.estimatedCostUsd) === undefined)
        )
          return [];
        return [
          costs.reduce(
            (sum, record) => sum + finite(record?.estimatedCostUsd)!,
            0,
          ),
        ];
      });
      const meanKnownCostPerCompleteResponseUsd = average(
        fullyCostedCompleteResponses,
      );
      for (const { attempt } of answered.filter(
        ({ attempt }) => finishReason(attempt) === 'stop',
      )) {
        const caseId = String(attempt.id);
        const variants =
          completedVariantsByCase.get(caseId) ?? new Set<string>();
        variants.add(`${modelKey}:${arm}`);
        completedVariantsByCase.set(caseId, variants);
      }
      arms.push({
        modelKey,
        arm,
        plannedAttempts: cases.length,
        capturedAttempts: attempts.length,
        interruptedAttempts: interruptedJobs.filter(
          (item) => item.modelKey === modelKey,
        ).length,
        unstartedAttempts: Math.max(
          0,
          cases.length -
            attempts.length -
            interruptedJobs.filter((item) => item.modelKey === modelKey).length,
        ),
        sdkAnswerCallStarts: stepRecords.length,
        selectorTraceAttempts: selectorRecords.length,
        nonemptyAnswers: answered.length,
        endToEndAccepted,
        endToEndAcceptanceRate:
          ungradedNonempty === 0
            ? ratio(endToEndAccepted, attempts.length)
            : null,
        endToEndAcceptedLowerBoundPerCapturedAttempt: ratio(
          endToEndAccepted,
          attempts.length,
        ),
        semanticAdequate,
        judgeFlaggedCriticalResponses: reviewedGrades.filter(
          ({ grade }) =>
            array(object(grade?.scorecard)?.criticalFailures).length > 0,
        ).length,
        judgeFlaggedGroundingZeroResponses: reviewedGrades.filter(
          ({ scores }) => scores.grounding === 0,
        ).length,
        judgeFlaggedIncompleteOnlyResponses: reviewedGrades.filter(
          ({ grade, scores }) =>
            scores.relevance === 1 &&
            qualityDimensions
              .filter((d) => d !== 'relevance')
              .every((d) => scores[d] === 2) &&
            array(object(grade?.scorecard)?.criticalFailures).length === 0,
        ).length,
        judgeFlaggedLanguageWeakResponses: reviewedGrades.filter(
          ({ scores }) => (finite(scores.language) ?? 2) < 2,
        ).length,
        semanticAdequacyAmongReviewedNonempty: ratio(
          semanticAdequate,
          reviewedGrades.length,
        ),
        reviewedNonempty: reviewedGrades.length,
        ungradedNonempty,
        semanticPartial: reviewedGrades.length < answered.length,
        kpis,
        finishReasonCounts: Object.fromEntries(
          [
            ...new Set(attempts.map(({ attempt }) => finishReason(attempt))),
          ].map((reason) => [
            reason,
            attempts.filter(({ attempt }) => finishReason(attempt) === reason)
              .length,
          ]),
        ),
        failedSdkAnswerSteps: stepRecords.filter(
          (step) => step.status === 'failed',
        ).length,
        providerTimeoutAttribution: 'workflow-level-unattributed',
        meanEndToEndLatencyMs: average(
          attempts.flatMap(
            ({ attempt }) => finite(attempt.endToEndLatencyMs) ?? [],
          ),
        ),
        knownInputTokens,
        knownOutputTokens,
        knownEstimatedCostUsd,
        completeUsageResponses: fullyCostedCompleteResponses.length,
        meanKnownCostPerCompleteResponseUsd,
        completeResponsesPerDollar: meanKnownCostPerCompleteResponseUsd
          ? 1 / meanKnownCostPerCompleteResponseUsd
          : null,
        unknownUsageStepOrSelectorRecords,
        selectorFallbacks: selectorRecords.filter(
          (selector) => selector.fallback === true,
        ).length,
        selectorAttempts: selectorRecords.length,
        transportNetworkStarts: null,
        transportLocalRefusals: null,
      });
    }
  }

  const strataMap = new Map<
    string,
    KnowledgeMatrixAggregate['strata'][number]
  >();
  for (const item of cases) {
    for (const modelKey of modelKeys) {
      for (const arm of knowledgeExperimentArms) {
        const key = `${item.cohort}:${item.language}:${item.style}:${item.fresh}:${modelKey}:${arm}`;
        const row = strataMap.get(key) ?? {
          cohort: item.cohort,
          language: item.language,
          style: item.style,
          fresh: item.fresh,
          modelKey,
          arm,
          cases: 0,
          plannedAttempts: 0,
          capturedAttempts: 0,
          unstartedAttempts: 0,
          interruptedAttempts: 0,
          nonemptyAnswers: 0,
          endToEndAccepted: 0,
          semanticAdequate: 0,
          reviewedNonempty: 0,
          ungradedNonempty: 0,
          semanticPartial: false,
          endToEndAcceptanceRate: null,
        };
        row.cases += 1;
        row.plannedAttempts += 1;
        const capture = capturesByModel.get(modelKey)!.get(item.id);
        const report = object(capture?.report);
        const attempt = array(report?.attempts)
          .map(object)
          .find((value) => value?.id === item.id && value.arm === arm);
        if (!attempt) {
          if (
            interruptedJobs.some(
              (job) => job.caseId === item.id && job.modelKey === modelKey,
            )
          )
            row.interruptedAttempts += 1;
          else row.unstartedAttempts += 1;
        } else {
          row.capturedAttempts += 1;
          const nonempty =
            (text(object(attempt.observation)?.text) ?? '').trim().length > 0;
          if (nonempty) {
            row.nonemptyAnswers += 1;
            const grade = gradeByVariant.get(`${modelKey}:${arm}:${item.id}`);
            if (grade?.status === 'reviewed' && grade.passed === true)
              row.endToEndAccepted += 1;
            if (gradeIsSemanticAdequate(grade)) row.semanticAdequate += 1;
            if (gradeIsReviewed(grade)) row.reviewedNonempty += 1;
            if (
              !grade ||
              !['reviewed', 'unsure', 'invalid'].includes(String(grade.status))
            )
              row.ungradedNonempty += 1;
          }
        }
        row.endToEndAcceptanceRate =
          row.ungradedNonempty === 0
            ? ratio(row.endToEndAccepted, row.capturedAttempts)
            : null;
        row.semanticPartial = row.reviewedNonempty < row.nonemptyAnswers;
        strataMap.set(key, row);
      }
    }
  }
  const strata = [...strataMap.values()];

  const allAttempts = arms.reduce((sum, arm) => sum + arm.capturedAttempts, 0);
  const allAccepted = arms.reduce((sum, arm) => sum + arm.endToEndAccepted, 0);
  const allSemanticAdequate = arms.reduce(
    (sum, arm) => sum + arm.semanticAdequate,
    0,
  );
  const allUngradedNonempty = arms.reduce(
    (sum, arm) => sum + arm.ungradedNonempty,
    0,
  );
  const allNonempty = arms.reduce((sum, arm) => sum + arm.nonemptyAnswers, 0);
  const reviewedTotal = arms.reduce(
    (sum, arm) => sum + arm.reviewedNonempty,
    0,
  );
  const kpis = Object.fromEntries(
    qualityDimensions.map((dimension) => {
      const values = arms.flatMap((arm) => {
        const value = arm.kpis[dimension];
        return value === null
          ? []
          : Array.from({ length: arm.reviewedNonempty }, () => value);
      });
      return [dimension, average(values)];
    }),
  ) as KnowledgeMatrixAggregate['quality']['kpis'];
  const shared =
    modelKeys.length === 3
      ? cases.filter(
          (item) => completedVariantsByCase.get(item.id)?.size === 12,
        )
      : [];
  const overallActual = modelSummaries.reduce(
    (sum, item) => sum + item.actualNetworkStarts,
    0,
  );
  const overallLocal = modelSummaries.reduce(
    (sum, item) => sum + item.localRefusals,
    0,
  );
  const knownCost = modelSummaries.reduce(
    (sum, item) => sum + item.knownEstimatedCostUsd,
    0,
  );
  const totalEstimated =
    transport.totalEstimatedCostUsd === null ||
    transport.totalEstimatedCostUsd === undefined
      ? null
      : (finite(transport.totalEstimatedCostUsd) ?? null);
  const gradeResults = [...gradeByVariant.values()];
  const sharedIds = new Set(shared.map(({ id }) => id));
  const sharedArmComparison = modelKeys.flatMap((modelKey) =>
    knowledgeExperimentArms.map((arm) => {
      const relevantAttempts = [...sharedIds].flatMap((caseId) => {
        const capture = capturesByModel.get(modelKey)!.get(caseId);
        const report = object(capture?.report);
        const attempt = array(report?.attempts)
          .map(object)
          .find(
            (candidate) => candidate?.id === caseId && candidate.arm === arm,
          );
        return attempt ? [{ caseId, attempt }] : [];
      });
      const grades = relevantAttempts.map(({ caseId }) =>
        gradeByVariant.get(`${modelKey}:${arm}:${caseId}`),
      );
      const finalGrades = grades.filter(
        (grade) =>
          grade &&
          ['reviewed', 'unsure', 'invalid'].includes(String(grade.status)),
      ).length;
      const reviewed = grades.filter((grade) => gradeIsReviewed(grade)).length;
      const semanticAdequate = grades.filter((grade) =>
        gradeIsSemanticAdequate(grade),
      ).length;
      const endToEndAccepted = grades.filter(
        (grade) => grade?.status === 'reviewed' && grade.passed === true,
      ).length;
      return {
        modelKey,
        arm,
        variants: shared.length,
        finalGrades,
        reviewed,
        semanticAdequate,
        semanticRate:
          shared.length > 0 && reviewed === shared.length
            ? semanticAdequate / shared.length
            : null,
        endToEndAccepted,
        endToEndRate:
          shared.length > 0 && finalGrades === shared.length
            ? endToEndAccepted / shared.length
            : null,
      };
    }),
  );
  const aggregate: KnowledgeMatrixAggregate = {
    stem,
    sourceStems,
    interruptedWorkflows: array(resume?.interruptedJobIndices).length,
    interruptedAnswerAttempts:
      array(resume?.interruptedJobIndices).length *
      knowledgeExperimentArms.length,
    endToEndAcceptedPerPlannedAttempt:
      allUngradedNonempty === 0
        ? ratio(
            allAccepted,
            cases.length * modelKeys.length * knowledgeExperimentArms.length,
          )
        : null,
    createdAt: text(progress.createdAt) ?? null,
    updatedAt: text(progress.updatedAt) ?? null,
    plannedCases: cases.length,
    plannedWorkflows: cases.length * modelKeys.length,
    capturedWorkflows: modelSummaries.reduce(
      (sum, item) => sum + item.capturedWorkflows,
      0,
    ),
    unstartedWorkflows: modelSummaries.reduce(
      (sum, item) => sum + item.unstartedWorkflows,
      0,
    ),
    plannedAnswerAttempts:
      cases.length * modelKeys.length * knowledgeExperimentArms.length,
    capturedAnswerAttempts: allAttempts,
    unstartedAnswerAttempts: Math.max(
      0,
      cases.length * modelKeys.length * knowledgeExperimentArms.length -
        allAttempts -
        array(resume?.interruptedJobIndices).length *
          knowledgeExperimentArms.length,
    ),
    arms,
    strata,
    models: modelSummaries,
    transport: {
      actualNetworkStarts:
        finite(transport.actualNetworkStarts) ?? overallActual,
      unrecordedNetworkStartsUpperBound:
        finite(transport.unrecordedNetworkStartsUpperBound) ?? 0,
      localRefusals: finite(transport.localRefusals) ?? overallLocal,
      unattributedSelectorNetworkStarts: unassignedSelectorRecords.filter(
        (record) => !localStatuses.has(String(record.status)),
      ).length,
      unattributedSelectorLocalRefusals: unassignedSelectorRecords.filter(
        (record) => localStatuses.has(String(record.status)),
      ).length,
      knownEstimatedCostUsd: finite(transport.knownCostUsd) ?? knownCost,
      unknownReservedCostUsd: finite(transport.unknownReservedCostUsd) ?? 0,
      totalEstimatedCostUsd: totalEstimated,
      queuePacingWaitMs: finite(transport.queuePacingWaitMs) ?? null,
    },
    quality: {
      endToEndAccepted: allAccepted,
      capturedAttempts: allAttempts,
      endToEndAcceptanceRate:
        allUngradedNonempty === 0 ? ratio(allAccepted, allAttempts) : null,
      endToEndAcceptedLowerBoundPerCapturedAttempt: ratio(
        allAccepted,
        allAttempts,
      ),
      semanticAdequate: allSemanticAdequate,
      semanticAdequacyAmongReviewedNonempty: ratio(
        allSemanticAdequate,
        reviewedTotal,
      ),
      reviewedNonempty: reviewedTotal,
      ungradedNonempty: allUngradedNonempty,
      partial: allUngradedNonempty > 0,
      semanticPartial: reviewedTotal < allNonempty,
      kpis,
    },
    sharedCases: {
      allTwelveCompleteVariants: shared.length,
      cases: shared.map(({ id, split, fresh }) => ({
        caseId: id,
        split,
        fresh,
        variants: 12 as const,
      })),
      armComparison: sharedArmComparison,
      historicalHeldOutCases: shared.filter(
        (item) => item.split === 'held_out' && !item.fresh,
      ).length,
      freshCaseCount: shared.filter((item) => item.fresh).length,
      freshCasesPlanned: cases.filter((item) => item.fresh).length,
      note: 'Held-out labels include previously seen cases and are historical, not fresh evidence. The fresh subset is small and not representative.',
    },
    grades: {
      filesRead: gradeFilesRead,
      reviewed: gradeResults.filter((item) => item.status === 'reviewed')
        .length,
      unsure: gradeResults.filter((item) => item.status === 'unsure').length,
      invalid: gradeResults.filter((item) => item.status === 'invalid').length,
    },
    warnings,
  };
  return { aggregate, markdown: knowledgeMatrixMarkdown(aggregate) };
}

/** Write the explicitly mutable aggregate outputs; captures and grades are read-only inputs. */
export async function saveKnowledgeMatrixSummary(
  stem: string,
  directory: string,
): Promise<{
  aggregate: KnowledgeMatrixAggregate & { summaryGeneratedAt: string };
  markdown: string;
  jsonPath: string;
  markdownPath: string;
}> {
  const { aggregate, markdown } = await inspectKnowledgeMatrix(stem, directory);
  const summaryGeneratedAt = new Date().toISOString();
  const summary = { ...aggregate, summaryGeneratedAt };
  const root = resolve(directory);
  const jsonPath = resolve(root, `${stem}-summary.json`);
  const markdownPath = resolve(root, `${stem}-summary.md`);
  const summaryMarkdown = `${markdown}\n\nSummary generated ${summaryGeneratedAt}; source progress last updated ${aggregate.updatedAt ?? 'unknown'}.\n`;
  await writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(markdownPath, summaryMarkdown);
  return {
    aggregate: summary,
    markdown: summaryMarkdown,
    jsonPath,
    markdownPath,
  };
}

export function knowledgeMatrixMarkdown(
  report: KnowledgeMatrixAggregate,
): string {
  const strataGroups = new Map<
    string,
    { cases: number; planned: number; captured: number; nonempty: number }
  >();
  for (const item of report.strata) {
    const key = `${item.cohort}/${item.language}/${item.style}/${item.fresh ? 'fresh' : 'seen'}`;
    const group = strataGroups.get(key) ?? {
      cases: 0,
      planned: 0,
      captured: 0,
      nonempty: 0,
    };
    group.planned += item.plannedAttempts;
    group.captured += item.capturedAttempts;
    group.nonempty += item.nonemptyAnswers;
    strataGroups.set(key, group);
  }
  for (const group of strataGroups.values())
    group.cases =
      group.planned /
      Math.max(1, report.models.length * knowledgeExperimentArms.length);
  const lines = [
    `# Knowledge matrix aggregate: ${report.stem}`,
    '',
    `Created ${report.createdAt ?? 'unknown'}; updated ${report.updatedAt ?? 'unknown'}. Capture is observational; supervised grades are not ground truth.`,
    '',
    `Planned cases ${report.plannedCases}; model-workflows planned/captured/interrupted/unstarted ${report.plannedWorkflows}/${report.capturedWorkflows}/${report.interruptedWorkflows}/${report.unstartedWorkflows}. Planned arm attempts ${report.plannedAnswerAttempts}; captured attempts ${report.capturedAnswerAttempts}; interrupted attempts ${report.interruptedAnswerAttempts}; unstarted attempts ${report.unstartedAnswerAttempts}.`,
    `Recovery sources: ${report.sourceStems.join(', ')}. ${report.interruptedWorkflows} interrupted workflows (${report.interruptedAnswerAttempts} answer attempts) are not silently rerun; missing coverage is not a successful answer. Acceptance over ALL planned attempts: ${report.endToEndAcceptedPerPlannedAttempt === null ? 'pending grading' : `${(report.endToEndAcceptedPerPlannedAttempt * 100).toFixed(1)}%`}. Up to ${report.transport.unrecordedNetworkStartsUpperBound} additional unrecorded provider starts are conservatively reserved, not claimed as measured starts.`,
    `Transport: ${report.transport.actualNetworkStarts} actual network starts, ${report.transport.localRefusals} local refusals; known estimate $${report.transport.knownEstimatedCostUsd.toFixed(6)}, unknown worst-case reserve $${report.transport.unknownReservedCostUsd.toFixed(6)}, total ${report.transport.totalEstimatedCostUsd === null ? 'unknown' : `$${report.transport.totalEstimatedCostUsd.toFixed(6)}`}. Queue pacing wait ${report.transport.queuePacingWaitMs === null ? 'unknown' : `${(report.transport.queuePacingWaitMs / 1000).toFixed(1)}s`}. Unattributed Jev selector calls: ${report.transport.unattributedSelectorNetworkStarts} network, ${report.transport.unattributedSelectorLocalRefusals} locally refused.`,
    '',
    '| Model | Arm | Planned | Captured | Unstarted | SDK answer-call starts | Nonempty | End-to-end accepted / captured | Semantic adequate / reviewed | R / G / A / C / L | Finish reasons | Failed SDK steps | Mean end-to-end | Known USD | Unknown SDK usage | Jev fallback / traces |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|',
    ...report.arms.map(
      (item) =>
        `| ${item.modelKey} | ${item.arm} | ${item.plannedAttempts} | ${item.capturedAttempts} | ${item.unstartedAttempts} | ${item.sdkAnswerCallStarts} | ${item.nonemptyAnswers} | ${item.endToEndAccepted}/${item.capturedAttempts} | ${item.semanticAdequate}/${item.reviewedNonempty} | ${qualityDimensions.map((dimension) => (item.kpis[dimension] === null ? '—' : item.kpis[dimension]!.toFixed(2))).join(' / ')} | ${Object.entries(
          item.finishReasonCounts,
        )
          .map(([reason, count]) => `${reason}:${count}`)
          .join(
            ', ',
          )} | ${item.failedSdkAnswerSteps} | ${item.meanEndToEndLatencyMs === null ? '—' : `${(item.meanEndToEndLatencyMs / 1000).toFixed(1)}s`} | $${item.knownEstimatedCostUsd.toFixed(6)} | ${item.unknownUsageStepOrSelectorRecords} | ${item.selectorFallbacks}/${item.selectorAttempts} |`,
    ),
    '',
    `End-to-end acceptance: ${report.quality.endToEndAcceptanceRate === null ? 'unknown/incomplete' : `${(report.quality.endToEndAcceptanceRate * 100).toFixed(1)}%`} (${report.quality.endToEndAccepted}/${report.quality.capturedAttempts} captured attempts; empty/failed captures remain in denominator). ${report.quality.ungradedNonempty} nonempty answers ungraded; lower bound ${(report.quality.endToEndAcceptedLowerBoundPerCapturedAttempt === null ? 0 : report.quality.endToEndAcceptedLowerBoundPerCapturedAttempt * 100).toFixed(1)}% is not reported accuracy. Semantic adequacy is ${report.quality.semanticAdequate}/${report.quality.reviewedNonempty} reviewed nonempty answers (${report.quality.semanticAdequacyAmongReviewedNonempty === null ? '—' : `${(report.quality.semanticAdequacyAmongReviewedNonempty * 100).toFixed(1)}%`}; partial=${report.quality.partial}). ` +
      qualityDimensions
        .map(
          (dimension) =>
            `${dimension} ${report.quality.kpis[dimension] === null ? '—' : report.quality.kpis[dimension]!.toFixed(2)}/2`,
        )
        .join(', ') +
      `; semantic KPI coverage partial=${report.quality.semanticPartial}.`,
    '',
    `Shared comparison: ${report.sharedCases.allTwelveCompleteVariants} cases have all 12 model×arm variants nonempty with finishReason=stop (${report.sharedCases.historicalHeldOutCases} historically labelled held-out, ${report.sharedCases.freshCaseCount} fresh complete; ${report.sharedCases.freshCasesPlanned} fresh planned). ${report.sharedCases.note}`,
    '',
    'Judge-flagged failure types are non-exclusive and subject to the independent audit; a rejected omission is not automatically wrong advice.',
    '',
    '| Model | Arm | Critical flagged | Grounding 0 | Incomplete-only | Language below 2 |',
    '|---|---|---:|---:|---:|---:|',
    ...report.arms.map(
      (item) =>
        `| ${item.modelKey} | ${item.arm} | ${item.judgeFlaggedCriticalResponses} | ${item.judgeFlaggedGroundingZeroResponses} | ${item.judgeFlaggedIncompleteOnlyResponses} | ${item.judgeFlaggedLanguageWeakResponses} |`,
    ),
    '',
    'Measured inference-cost estimates below include answer/tool/selector steps for nonempty, normally completed responses with complete usage only. Failed or usage-unknown calls are excluded, NOT free; these are not invoice totals or guaranteed future prices. Subscription judging is separate and unmetered here.',
    '',
    '| Model | Arm | Fully costed complete responses | Mean USD / response | Responses / USD |',
    '|---|---|---:|---:|---:|',
    ...report.arms.map(
      (item) =>
        `| ${item.modelKey} | ${item.arm} | ${item.completeUsageResponses} | ${item.meanKnownCostPerCompleteResponseUsd === null ? '—' : `$${item.meanKnownCostPerCompleteResponseUsd.toFixed(7)}`} | ${item.completeResponsesPerDollar === null ? '—' : item.completeResponsesPerDollar.toFixed(0)} |`,
    ),
    '',
    '| Shared cases: model | Arm | Complete variants | Final grades | Semantic adequate / reviewed | End-to-end accepted / final grades |',
    '|---|---|---:|---:|---:|---:|',
    ...report.sharedCases.armComparison.map(
      (item) =>
        `| ${item.modelKey} | ${item.arm} | ${item.variants} | ${item.finalGrades} | ${item.semanticAdequate}/${item.reviewed} (${item.semanticRate === null ? '—' : `${(item.semanticRate * 100).toFixed(1)}%`}) | ${item.endToEndAccepted}/${item.finalGrades} (${item.endToEndRate === null ? '—' : `${(item.endToEndRate * 100).toFixed(1)}%`}) |`,
    ),
    '',
    'Strata coverage by role/language/style/freshness (model×arm detail is in JSON):',
    '',
    '| Role / language / style / freshness | Cases | Planned variants | Captured variants | Nonempty answers |',
    '|---|---:|---:|---:|---:|',
    ...[...strataGroups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, group]) =>
          `| ${key} | ${group.cases} | ${group.planned} | ${group.captured} | ${group.nonempty} |`,
      ),
    '',
    'Arm-level actual network starts/local refusals and transport timing are intentionally unassigned: each workflow stores one record-index list spanning all four arms. Provider timeouts can only be reported at workflow/model level. SDK-call starts and unknown SDK usage records may include local refusals; they are not proof of billable provider starts. Local refusals are not included in unknown paid reserves. End-to-end latency includes the observed workflow/pacing interval.',
  ];
  if (report.warnings.length)
    lines.push(
      '',
      'Warnings:',
      ...report.warnings.map((warning) => `- ${warning}`),
    );
  return lines.join('\n');
}
