import { createHash } from 'node:crypto';
import { mkdir, open, readFile, readdir, rename } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { z } from 'zod';
import { operatorWorkConfigurationSchema } from '@bff/contracts';
import type { AssistantProvider } from '@bff/assistant/server';
import { reviewedAnswerModel } from '@bff/assistant/models';
import type { AnswerModelKey } from '@bff/assistant/models';
import { createAgentReviewBatch } from './operatorAgentReview';
import type { AgentReviewSource } from './operatorAgentReview';
import {
  createKnowledgeExperimentAnswerer,
  createKnowledgeExperimentSelector,
  knowledgeExperimentCaseSchema,
  knowledgeExperimentCostBound,
  knowledgeExperimentArms,
  runKnowledgeExperiment,
} from './operatorKnowledgeExperiment';
import type { KnowledgeExperimentReport } from './operatorKnowledgeExperiment';
import { createExperimentTransport } from './operatorExperimentTransport';
import type {
  ExperimentTransportJournalEntry,
  ExperimentTransportSnapshot,
} from './operatorExperimentTransport';

const digest = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

type MatrixCapture = {
  modelKey: AnswerModelKey;
  report: KnowledgeExperimentReport;
  networkRecordIndices: number[];
};
type MatrixCase = ReturnType<typeof balancedKnowledgeCases>[number];
const matrixStemPattern = /^knowledge-matrix-\d{4}-\d{2}-\d{2}T\d{6}-\d{3}Z$/u;

function matrixJobs(
  cases: readonly MatrixCase[],
  modelKeys: readonly AnswerModelKey[],
  orderSeed: string,
) {
  return cases.flatMap((item) =>
    [...modelKeys]
      .sort((a, b) =>
        digest([orderSeed, item.id, a]).localeCompare(
          digest([orderSeed, item.id, b]),
        ),
      )
      .map((modelKey) => ({ item, modelKey })),
  );
}

const recoveryCheckpointSchema = z
  .object({
    version: z.literal(1),
    modelKeys: z.array(z.string()).min(1).max(3),
    fullConfigurationVersion: z.string().length(64),
    compactConfigurationVersion: z.string().length(64),
    caseVersion: z.string().length(64),
    orderSeed: z.string(),
    plannedQuestions: z.number().int().positive(),
    completedWorkflows: z.number().int().nonnegative(),
    capturedAnswerAttempts: z.number().int().nonnegative(),
    plannedAnswerAttempts: z.number().int().positive(),
    transport: z.custom<ExperimentTransportSnapshot>((value) => {
      if (!value || typeof value !== 'object') return false;
      const state = value as ExperimentTransportSnapshot;
      return (
        Array.isArray(state.records) &&
        state.records.every(
          (record) =>
            record &&
            typeof record.model === 'string' &&
            Array.isArray(record.providerCodes) &&
            record.providerCodes.every((code) => /^\d{3,5}$/u.test(code)),
        )
      );
    }),
    resume: z.unknown().optional(),
  })
  .passthrough();

/** Pure recovery preflight; completed paid workflows are never rerun. */
export function prepareKnowledgeMatrixRecovery(input: {
  originalStem: string;
  checkpoint: unknown;
  snapshots: unknown;
  indexedCaptures: readonly { index: number; value: unknown }[];
  cases: readonly unknown[];
  fullConfiguration: unknown;
  compactConfiguration: unknown;
  modelKeys: readonly AnswerModelKey[];
  mandatorySkillKeys: readonly string[];
  orderSeed: string;
}) {
  if (!matrixStemPattern.test(input.originalStem))
    throw new Error('Invalid matrix recovery stem');
  const checkpoint = recoveryCheckpointSchema.parse(input.checkpoint);
  if (checkpoint.resume !== undefined)
    throw new Error('Legacy recovery cannot silently resume a recovery run');
  const full = operatorWorkConfigurationSchema.parse(input.fullConfiguration);
  const compact = operatorWorkConfigurationSchema.parse(
    input.compactConfiguration,
  );
  const snapshots = z
    .object({
      full: operatorWorkConfigurationSchema,
      compact: operatorWorkConfigurationSchema,
    })
    .strict()
    .parse(input.snapshots);
  const cases = balancedKnowledgeCases(input.cases, input.orderSeed);
  if (
    checkpoint.fullConfigurationVersion !== digest(full) ||
    checkpoint.compactConfigurationVersion !== digest(compact) ||
    digest(snapshots.full) !== digest(full) ||
    digest(snapshots.compact) !== digest(compact) ||
    checkpoint.caseVersion !== digest(cases) ||
    checkpoint.orderSeed !== input.orderSeed ||
    digest(checkpoint.modelKeys) !== digest(input.modelKeys) ||
    checkpoint.plannedQuestions !== cases.length ||
    checkpoint.plannedAnswerAttempts !==
      cases.length * input.modelKeys.length * 4
  )
    throw new Error('Matrix recovery source/configuration/order hashes differ');
  const jobs = matrixJobs(cases, input.modelKeys, input.orderSeed);
  const captures = new Map<number, MatrixCapture>();
  for (const { index, value } of input.indexedCaptures) {
    if (
      !Number.isSafeInteger(index) ||
      index < 0 ||
      index >= jobs.length ||
      captures.has(index)
    )
      throw new Error('Invalid or repeated recovery capture index');
    const file = z
      .object({
        version: z.literal(1),
        caseId: z.string(),
        captures: z.array(z.custom<MatrixCapture>()).length(1),
      })
      .strict()
      .parse(value);
    const capture = file.captures[0]!;
    const job = jobs[index]!;
    const report = capture?.report;
    if (
      file.caseId !== job.item.id ||
      capture?.modelKey !== job.modelKey ||
      !report ||
      report.version !== 1 ||
      report.mode !== 'live' ||
      report.answerModel !== reviewedAnswerModel(job.modelKey).nativeId ||
      report.orderSeed !==
        `${input.orderSeed}:${job.item.id}:${job.modelKey}` ||
      report.caseVersion !== digest([job.item]) ||
      report.fullConfigurationVersion !== digest(full) ||
      report.compactConfigurationVersion !== digest(compact) ||
      digest(report.mandatorySkillKeys) !== digest(input.mandatorySkillKeys) ||
      !Array.isArray(report.attempts) ||
      report.attempts.length !== 4 ||
      report.attempts.some(
        ({ id, arm }) =>
          id !== job.item.id || !knowledgeExperimentArms.includes(arm),
      ) ||
      new Set(report.attempts.map(({ arm }) => arm)).size !== 4 ||
      !Array.isArray(report.arms) ||
      report.arms.length !== 4 ||
      report.arms.some(
        ({ arm, report: suite }) =>
          !knowledgeExperimentArms.includes(arm) ||
          suite.results.length !== 1 ||
          suite.results[0]?.id !== job.item.id,
      ) ||
      report.limits.maximumRetries !== 0 ||
      report.limits.maximumOutputTokensPerCall !== 1200 ||
      report.limits.maximumAnswerCalls !== 7 ||
      report.limits.maximumSelectorCalls !== 1 ||
      !Array.isArray(capture.networkRecordIndices) ||
      capture.networkRecordIndices.some(
        (value) => !Number.isSafeInteger(value) || value < 1,
      )
    )
      throw new Error('Recovery capture does not match its frozen workflow');
    captures.set(index, capture);
  }
  if (
    !captures.size ||
    captures.size !== checkpoint.completedWorkflows ||
    captures.size * 4 !== checkpoint.capturedAnswerAttempts
  )
    throw new Error('Recovery checkpoint/capture counts are inconsistent');

  // Original workers claim jobs monotonically and await durable workflow
  // persistence before claiming another. With three workers, at most three
  // claimed-but-uncaptured jobs exist: gaps plus the next unclaimed-looking tail.
  const maximumCompleted = Math.max(...captures.keys());
  const holes = Array.from(
    { length: maximumCompleted + 1 },
    (_, index) => index,
  ).filter((index) => !captures.has(index));
  if (holes.length > 3)
    throw new Error('Legacy recovery exceeds the original three-worker bound');
  const interruptedJobIndices = [...holes];
  for (
    let index = maximumCompleted + 1;
    interruptedJobIndices.length < 3 && index < jobs.length;
    index++
  )
    interruptedJobIndices.push(index);
  const unpersistedReservedCostUsd = interruptedJobIndices.reduce(
    (sum, index) =>
      sum +
      knowledgeExperimentCostBound(
        1,
        jobs[index]!.modelKey,
        compact.skills.length,
      ),
    0,
  );
  const unpersistedMaximumCalls = interruptedJobIndices.length * 8;
  const recovery = {
    snapshot: checkpoint.transport,
    additionalUnknownReservedCostUsd: unpersistedReservedCostUsd,
    unrecordedNetworkStartsUpperBound: unpersistedMaximumCalls,
  };
  // Reuse transport's guarded seed validation before returning a runnable plan.
  createExperimentTransport({
    baseUrl: 'https://recovery-preflight.example',
    recovery,
  });
  const resume = {
    originalStem: input.originalStem,
    interruptedJobIndices,
    interruptedJobs: interruptedJobIndices.map((index) => ({
      index,
      caseId: jobs[index]!.item.id,
      modelKey: jobs[index]!.modelKey,
    })),
    interruptedAnswerAttempts: interruptedJobIndices.length * 4,
    preservedCaptureJobIndices: [...captures.keys()].sort((a, b) => a - b),
    preservedCapturesHash: digest(
      [...captures.entries()].sort(([a], [b]) => a - b),
    ),
    baselineActualNetworkStarts: checkpoint.transport.actualNetworkStarts,
    unpersistedMaximumCalls,
    unpersistedReservedCostUsd,
    originalKnownCostUsd: checkpoint.transport.knownCostUsd,
    originalUnknownReservedCostUsd: checkpoint.transport.unknownReservedCostUsd,
    originalInFlightReservedCostUsd:
      checkpoint.transport.inFlightReservedCostUsd,
    interruptionPolicy:
      'Not retried; unknown calls retain a full workflow reserve, even where this double-counts recorded or in-flight work.',
  };
  const interrupted = new Set(interruptedJobIndices);
  return {
    resume,
    recovery,
    captures,
    remainingJobIndices: jobs
      .map((_, index) => index)
      .filter((index) => !captures.has(index) && !interrupted.has(index)),
  };
}

/** Read-only preparation is independently usable before launching paid work. */
export async function inspectKnowledgeMatrixRecovery(
  input: Omit<
    Parameters<typeof prepareKnowledgeMatrixRecovery>[0],
    'checkpoint' | 'snapshots' | 'indexedCaptures'
  > & { reportDirectory: string },
) {
  if (!matrixStemPattern.test(input.originalStem))
    throw new Error('Invalid matrix recovery stem');
  const directory = resolve(input.reportDirectory);
  const names = await readdir(directory);
  if (names.includes(`${input.originalStem}-manifest.json`))
    throw new Error('Matrix already has a final manifest');
  const prefix = `${input.originalStem}-capture-`;
  const indexedCaptures = await Promise.all(
    names
      .filter(
        (name) =>
          name.startsWith(prefix) &&
          /^\d{3}\.json$/u.test(name.slice(prefix.length)),
      )
      .map(async (name) => ({
        index: Number(name.slice(prefix.length, -5)),
        value: JSON.parse(
          await readFile(resolve(directory, name), 'utf8'),
        ) as unknown,
      })),
  );
  return prepareKnowledgeMatrixRecovery({
    ...input,
    checkpoint: JSON.parse(
      await readFile(
        resolve(directory, `${input.originalStem}-progress.json`),
        'utf8',
      ),
    ) as unknown,
    snapshots: JSON.parse(
      await readFile(
        resolve(directory, `${input.originalStem}-snapshots.json`),
        'utf8',
      ),
    ) as unknown,
    indexedCaptures,
  });
}

/** Saved labels describe test strata, not a representative production population. */
export function knowledgeMatrixStratum(tags: readonly string[]) {
  const language =
    tags.find((tag) => tag.startsWith('language:'))?.slice(9) ??
    (tags.includes('hebrew')
      ? 'he'
      : tags.includes('russian')
        ? 'ru'
        : tags.includes('spanish')
          ? 'es'
          : tags.includes('french')
            ? 'fr'
            : 'en');
  const style =
    ['adversarial', 'messy', 'normal'].find((value) => tags.includes(value)) ??
    'regression-or-tuning';
  return { language, style, fresh: tags.includes('fresh') };
}

/** Rotate role/language/style buckets so an interrupted run is not helper-only. */
export function balancedKnowledgeCases(
  inputs: readonly unknown[],
  seed: string,
) {
  const cases = inputs.map((input) =>
    knowledgeExperimentCaseSchema.parse(input),
  );
  if (
    !cases.length ||
    cases.length > 200 ||
    new Set(cases.map((item) => item.id)).size !== cases.length
  )
    throw new Error('Matrix requires 1–200 unique validated cases');
  const buckets = new Map<string, typeof cases>();
  for (const item of cases) {
    const { language, style, fresh } = knowledgeMatrixStratum(item.tags);
    const key = `${item.cohort}:${language}:${style}:${fresh}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(item);
    buckets.set(key, bucket);
  }
  for (const bucket of buckets.values())
    bucket.sort((a, b) =>
      digest([seed, a.id]).localeCompare(digest([seed, b.id])),
    );
  const keys = [...buckets.keys()].sort((a, b) =>
    digest([seed, a]).localeCompare(digest([seed, b])),
  );
  const balanced: typeof cases = [];
  while (balanced.length < cases.length)
    for (const key of keys) {
      const item = buckets.get(key)!.shift();
      if (item) balanced.push(item);
    }
  return balanced;
}

/** No retrieval/model labels or old grades reach the subscription reviewer. */
export function matrixReviewSources(
  modelKey: AnswerModelKey,
  report: KnowledgeExperimentReport,
): AgentReviewSource[] {
  return report.arms.flatMap(({ arm, report: suite }) =>
    suite.results.flatMap((result) =>
      result.observation?.text.trim()
        ? [
            {
              sourceId: `${modelKey}:${arm}:${result.id}`,
              input: {
                cohort: result.cohort,
                question: result.question,
                answer: result.observation.text,
                expectedBehavior: result.expectedBehavior,
                references: result.references,
                toolNames: result.observation.toolNames.filter(
                  (name) => name !== 'loadSkill',
                ),
                toolTrace: (result.observation.toolTrace ?? []).filter(
                  (trace) =>
                    typeof trace !== 'object' ||
                    trace === null ||
                    !('toolName' in trace) ||
                    trace.toolName !== 'loadSkill',
                ),
              },
              checks: result.checks,
              hiddenKnowledgeToolEvidence: {
                toolNames: result.observation.toolNames,
                toolTrace: result.observation.toolTrace ?? [],
              },
            },
          ]
        : [],
    ),
  );
}

/**
 * Broad development-only capture. One shared budget/rate queue owns every actual
 * request. Each one-case workflow retains the existing conservative $2 preflight;
 * unknown paid calls retain their outer maximum reservation. No retry, API judge,
 * cap mutation, configuration apply or customer/account/browser action occurs.
 */
export async function runKnowledgeMatrix(input: {
  cases: readonly unknown[];
  fullConfiguration: unknown;
  compactConfiguration: unknown;
  provider: AssistantProvider;
  modelKeys: readonly AnswerModelKey[];
  mandatorySkillKeys: readonly string[];
  reportDirectory: string;
  confirmModelCost: true;
  orderSeed: string;
  /** Only an explicitly checked legacy stem; never restart completed cases. */
  resumeFromStem?: string;
  minimumIntervalMs?: number;
  workerCount?: number;
}) {
  if (!input.confirmModelCost || !input.provider.capsVerified)
    throw new Error(
      'Matrix requires explicit cost authority and verified caps',
    );
  const directory = resolve(input.reportDirectory);
  if (
    !/^projects\/[a-z0-9-]+\/.+/u.test(
      relative(process.cwd(), directory).replaceAll('\\', '/'),
    )
  )
    throw new Error('Matrix reports must remain beside Business code');
  if (
    !input.modelKeys.length ||
    input.modelKeys.length > 3 ||
    new Set(input.modelKeys).size !== input.modelKeys.length
  )
    throw new Error('Matrix requires unique reviewed cheap model candidates');
  input.modelKeys.forEach((key) => reviewedAnswerModel(key));
  const full = operatorWorkConfigurationSchema.parse(input.fullConfiguration);
  const compact = operatorWorkConfigurationSchema.parse(
    input.compactConfiguration,
  );
  const cases = balancedKnowledgeCases(input.cases, input.orderSeed);
  const minimumIntervalMs =
    input.minimumIntervalMs ?? (input.resumeFromStem ? 400 : 3_500);
  const workerCount = input.workerCount ?? (input.resumeFromStem ? 8 : 3);
  if (
    !Number.isSafeInteger(minimumIntervalMs) ||
    minimumIntervalMs < 400 ||
    !Number.isSafeInteger(workerCount) ||
    workerCount < 1 ||
    workerCount > 8
  )
    throw new Error('Invalid reviewed matrix pacing/concurrency');
  const recovered = input.resumeFromStem
    ? await inspectKnowledgeMatrixRecovery({
        ...input,
        originalStem: input.resumeFromStem,
      })
    : undefined;
  // Validate every case/model/context combination offline before the first call.
  for (const item of cases)
    for (const modelKey of input.modelKeys)
      await runKnowledgeExperiment({
        cases: [item],
        fullConfiguration: full,
        compactConfiguration: compact,
        mandatorySkillKeys: input.mandatorySkillKeys,
        answerModelKey: modelKey,
        orderSeed: input.orderSeed,
      });

  const createdAt = new Date().toISOString();
  const stem = `knowledge-matrix-${createdAt.replaceAll(':', '').replace('.', '-')}`;
  await mkdir(directory, { recursive: true });
  const ledger = await open(
    resolve(directory, `${stem}-transport-ledger.jsonl`),
    'wx',
  );
  const appendLedger = async (entry: ExperimentTransportJournalEntry) => {
    await ledger.appendFile(`${JSON.stringify(entry)}\n`);
    await ledger.sync();
  };
  const transport = createExperimentTransport({
    baseUrl: input.provider.baseUrl,
    minimumIntervalMs,
    recovery: recovered?.recovery,
    journal: appendLedger,
  });
  const captures: MatrixCapture[] = recovered
    ? [...recovered.captures.values()]
    : [];
  const files: string[] = [];
  const reviewSources: AgentReviewSource[] = [];
  let nextBatch = 0;
  let completedQuestions = 0;
  const save = async (name: string, value: unknown) => {
    const file = await open(resolve(directory, name), 'wx');
    try {
      await file.writeFile(`${JSON.stringify(value, null, 2)}\n`);
      await file.sync();
    } finally {
      await file.close();
    }
    files.push(name);
  };
  await save(`${stem}-snapshots.json`, { full, compact });
  if (recovered) await save(`${stem}-resume.json`, recovered.resume);
  const flushReview = async (final = false) => {
    while (reviewSources.length >= 24 || (final && reviewSources.length)) {
      const sources = reviewSources.splice(0, 24);
      const batch = createAgentReviewBatch(
        sources,
        `${stem}-review-${String(nextBatch).padStart(3, '0')}`,
        `${input.orderSeed}:${nextBatch}`,
      );
      const prefix = `${stem}-review-${String(nextBatch++).padStart(3, '0')}`;
      await save(`${prefix}-packet.json`, batch.packet);
      await save(`${prefix}-mapping.json`, batch.mapping);
      process.stdout.write(
        `${JSON.stringify({ event: 'review-batch-ready', prefix, items: sources.length })}\n`,
      );
    }
  };
  const progress = () => ({
    version: 1,
    createdAt,
    updatedAt: new Date().toISOString(),
    captureOnly: true,
    qualityVerified: false,
    plannedQuestions: cases.length,
    completedQuestions,
    completedWorkflows: captures.length,
    plannedAnswerAttempts: cases.length * input.modelKeys.length * 4,
    capturedAnswerAttempts: captures.reduce(
      (n, item) => n + item.report.attempts.length,
      0,
    ),
    modelKeys: input.modelKeys,
    fullConfigurationVersion: digest(full),
    compactConfigurationVersion: digest(compact),
    caseVersion: digest(cases),
    orderSeed: input.orderSeed,
    ...(recovered ? { resume: recovered.resume } : {}),
    execution: {
      minimumIntervalMs,
      workerCount,
      requestTimeoutMs: 25_000,
      maximumCalls: 4_000,
      maximumCostUsd: 2,
      durableTransportLedger: `${stem}-transport-ledger.jsonl`,
      originalWorkflowIndices: true,
    },
    generation:
      'Provider defaults; 1200 output tokens; max four lazy steps; no retries/cache.',
    transport: transport.snapshot(),
    files,
    cases: cases.map(({ id, cohort, tags, split }) => ({
      id,
      cohort,
      tags,
      split,
      ...knowledgeMatrixStratum(tags),
    })),
  });
  const updateProgress = async () => {
    const path = resolve(directory, `${stem}-progress.json`);
    const pending = await open(`${path}.tmp`, 'w');
    try {
      await pending.writeFile(`${JSON.stringify(progress(), null, 2)}\n`);
      await pending.sync();
    } finally {
      await pending.close();
    }
    await rename(`${path}.tmp`, path);
  };
  process.stdout.write(
    `${JSON.stringify({ event: 'matrix-started', stem, questions: cases.length, models: input.modelKeys, plannedAnswerAttempts: cases.length * input.modelKeys.length * 4, maximumCostUsd: 2 })}\n`,
  );
  const jobs = matrixJobs(cases, input.modelKeys, input.orderSeed);
  const remainingJobIndices =
    recovered?.remainingJobIndices ?? jobs.map((_, index) => index);
  let nextJob = 0;
  let halted = false;
  let persistence: Promise<void> = Promise.resolve();
  const completedModelsByCase = new Map<string, number>();
  for (const capture of captures) {
    const caseId = capture.report.attempts[0]!.id;
    completedModelsByCase.set(
      caseId,
      (completedModelsByCase.get(caseId) ?? 0) + 1,
    );
  }
  completedQuestions = [...completedModelsByCase.values()].filter(
    (count) => count === input.modelKeys.length,
  ).length;
  await updateProgress();
  const worker = async () => {
    while (!halted && nextJob < remainingJobIndices.length) {
      const state = transport.snapshot();
      if (state.stopped) return;
      if (state.cooldownUntil > Date.now())
        await new Promise((done) =>
          setTimeout(done, state.cooldownUntil - Date.now()),
        );
      if (
        halted ||
        transport.snapshot().stopped ||
        nextJob >= remainingJobIndices.length
      )
        return;
      const index = remainingJobIndices[nextJob++]!;
      const { item, modelKey } = jobs[index]!;
      // A durable claim identifies unfinished workflows if the process exits.
      // It is immutable, contains no credentials and precedes every paid call.
      await save(`${stem}-job-${String(index).padStart(3, '0')}-claim.json`, {
        version: 1,
        index,
        caseId: item.id,
        modelKey,
        claimedAt: new Date().toISOString(),
      });
      const networkRecordIndices: number[] = [];
      const fetch: typeof globalThis.fetch = async (...args) => {
        const response = await transport.fetch(...args);
        const recordIndex = Number(
          response.headers.get('x-bff-experiment-record-index'),
        );
        if (Number.isSafeInteger(recordIndex) && recordIndex > 0)
          networkRecordIndices.push(recordIndex);
        return response;
      };
      const report = await runKnowledgeExperiment({
        cases: [item],
        fullConfiguration: full,
        compactConfiguration: compact,
        mandatorySkillKeys: input.mandatorySkillKeys,
        mode: 'live',
        answerModelKey: modelKey,
        liveAuthority: { confirmModelCost: true, capsVerified: true },
        answer: createKnowledgeExperimentAnswerer({
          mode: 'live',
          answerModelKey: modelKey,
          provider: input.provider,
          fetch,
        }),
        selectKnowledge: createKnowledgeExperimentSelector(
          input.provider,
          fetch,
        ),
        orderSeed: `${input.orderSeed}:${item.id}:${modelKey}`,
      });
      const capture = { modelKey, report, networkRecordIndices };
      persistence = persistence.then(async () => {
        captures.push(capture);
        const completedModels = (completedModelsByCase.get(item.id) ?? 0) + 1;
        completedModelsByCase.set(item.id, completedModels);
        if (completedModels === input.modelKeys.length) completedQuestions++;
        const name = `${stem}-capture-${String(index).padStart(3, '0')}.json`;
        await save(name, { version: 1, caseId: item.id, captures: [capture] });
        reviewSources.push(...matrixReviewSources(modelKey, report));
        await flushReview();
        await updateProgress();
        const latest = transport.snapshot();
        process.stdout.write(
          `${JSON.stringify({ event: 'workflow-completed', completedQuestions, completedWorkflows: captures.length, plannedWorkflows: jobs.length, caseId: item.id, modelKey, actualNetworkCalls: latest.actualNetworkStarts, knownEstimatedCostUsd: latest.knownCostUsd, unknownReservedCostUsd: latest.unknownReservedCostUsd, reviewBatches: nextBatch, stopped: latest.stopped })}\n`,
        );
      });
      await persistence;
    }
  };
  // Keep slower models from leaving two slots idle at a per-question barrier.
  // The single transport still caps all starts and all in-flight reservations.
  try {
    const outcomes = await Promise.allSettled(
      Array.from(
        { length: Math.min(workerCount, remainingJobIndices.length) },
        () =>
          worker().catch((error: unknown) => {
            halted = true;
            throw error;
          }),
      ),
    );
    if (outcomes.some(({ status }) => status === 'rejected'))
      throw new Error(
        'Matrix capture stopped after a durable persistence/workflow failure',
      );
  } finally {
    await ledger.close();
  }
  await flushReview(true);
  await updateProgress();
  const result = {
    ...progress(),
    completeCapture: completedQuestions === cases.length,
    remainingScheduledWorkflows: remainingJobIndices.length - nextJob,
    allRecoverableWorkflowsCaptured:
      captures.length +
        (recovered?.resume.interruptedJobIndices.length ?? 0) ===
      jobs.length,
    reviewBatches: nextBatch,
    oneCaseWorstBoundsUsd: input.modelKeys.map((key) => ({
      modelKey: key,
      bound: knowledgeExperimentCostBound(1, key, full.skills.length),
    })),
  };
  await save(`${stem}-manifest.json`, result);
  process.stdout.write(
    `${JSON.stringify({ event: 'matrix-finished', stem, completeCapture: result.completeCapture, completedQuestions, reviewBatches: nextBatch })}\n`,
  );
  return result;
}
