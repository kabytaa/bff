import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { tool } from 'ai';
import {
  generateAssistantTurn,
  composeAssistantInstructions,
  ASSISTANT_INSTRUCTIONS_VERSION,
  prepareAssistantKnowledge,
} from '@bff/assistant/server';
import {
  reviewedAnswerModel,
  reviewedJudgeModel,
  reviewedTextModel,
  estimatedModelCostUsd,
  type AnswerModelKey,
  type JudgeModelKey,
} from '@bff/assistant/models';
import type { AssistantTurnOptions } from '@bff/assistant/server';
import { operatorWorkConfigurationSchema } from '@bff/contracts';
import type { OperatorWorkConfiguration } from '@bff/contracts';
import { loadOperatorModule } from './operatorWorkConfiguration';
import {
  judgeCalibrationSchema,
  judgeDimensions,
  judgeInstructions,
  judgeData,
  judgeRubricVersion,
  parseJudgeScorecard,
  scorecardPasses,
} from './operatorEvaluationJudge';
import type {
  EvaluationReference,
  JudgeInput,
  JudgeScorecard,
} from './operatorEvaluationJudge';

const phrases = z.array(z.string().min(1).max(500)).max(30).optional();
export const evaluationCaseSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_.-]{1,100}$/u),
    cohort: z.enum(['helper', 'support']),
    split: z.enum(['tuning', 'held_out']),
    prompt: z.string().min(1).max(12_000),
    expected: z
      .object({
        requiredPhrases: phrases,
        forbiddenPhrases: phrases,
        requiredToolNames: phrases,
        forbiddenToolNames: phrases,
      })
      .strict(),
    tags: z.array(z.string().max(100)).max(20),
    referenceKeys: z.array(z.string().min(1).max(100)).max(30),
    expectedBehavior: z.array(z.string().min(1).max(1000)).max(20),
  })
  .strict();
const casesSchema = z
  .array(evaluationCaseSchema)
  .min(1)
  .max(160)
  .refine(
    (cases) => new Set(cases.map((item) => item.id)).size === cases.length,
    'Duplicate evaluation id',
  );
export type EvaluationCase = z.infer<typeof evaluationCaseSchema>;
export interface EvaluationObservation {
  text: string;
  toolNames: string[];
  mocked: boolean;
  toolTrace?: unknown[];
  model?: string;
  modelCalls?: number;
  latencyMs?: number;
  usage?: { inputTokens?: number; outputTokens?: number };
  estimatedCostUsd?: number;
  finishReason?: string;
}
type Mode = 'mock' | 'live';
export type EvaluationJudge = (
  input: JudgeInput,
) => Promise<EvaluationObservation>;
export type ReferenceResolver = (keys: string[]) => EvaluationReference[];
type JudgeRecord = {
  status: 'scored' | 'unsure' | 'judge_error' | 'not_run';
  reason?: string;
  scorecard?: JudgeScorecard;
  observation?: EvaluationObservation;
};
export interface EvaluationResult {
  id: string;
  cohort: EvaluationCase['cohort'];
  split: EvaluationCase['split'];
  tags: string[];
  question: string;
  expectedBehavior: string[];
  references: EvaluationReference[];
  caseVersion: string;
  observation?: EvaluationObservation;
  checks: Array<{ dimension: string; passed: boolean }>;
  /** Legacy phrases are diagnostics only; synonyms and negations need semantic grading. */
  phraseDiagnostics: Array<{ dimension: string; matched: boolean }>;
  judge: JudgeRecord;
  passed: boolean;
  error?: string;
}
interface CalibrationResult {
  id: string;
  question: string;
  answer: string;
  expectedPass: boolean;
  expectedCriticalCodes: string[];
  expectedFailingDimensions?: string[];
  references: EvaluationReference[];
  expectedBehavior: string[];
  judge: JudgeRecord;
  matched: boolean;
}
export interface JudgeCalibrationReport {
  mode: Mode;
  version: string;
  liveVerified: boolean;
  judgeModel: string;
  judgePromptVersion: string;
  rubricVersion: string;
  results: CalibrationResult[];
}
export interface EvaluationReport {
  version: 2;
  createdAt: string;
  mode: Mode;
  model: string;
  /** Explicit capture provenance: answer generation is not semantic grading. */
  captureOnly: boolean;
  judgeModel: string | null;
  rubricVersion: string;
  judgePromptVersion: string;
  sharedInstructionsVersion: number;
  knowledgeMode: 'auto' | 'inline' | 'lazy';
  configurationVersion?: string;
  knowledgeVersions: Array<{
    key: string;
    version: number;
    contentHash: string;
  }>;
  qualityVerified: false;
  manualReviewRequired: true;
  runtimeCoverage: 'isolated assigned knowledge; loadSkill only; no customer records or browser execution';
  calibration?: JudgeCalibrationReport;
  limits: {
    maximumCases: number;
    maximumModelCalls: number;
    maximumAnswerCallsPerCase: 4;
    maximumJudgeCallsPerCase: 0 | 1;
    maximumRetries: 0;
    maximumOutputTokensPerCall: 1200;
    conservativeCostBoundUsd: number;
    maximumCostUsd: 2;
  };
  results: EvaluationResult[];
  passedComparisons: number;
  failedComparisons: number;
  providerFailures: number;
  judgeErrors: number;
  unsure: number;
  criticalFailures: number;
  usage: {
    modelCalls: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
    answerEstimatedCostUsd: number;
    judgeEstimatedCostUsd: number;
    calibrationEstimatedCostUsd: number;
    /** Completed answer turns only; judging is never part of runtime message cost. */
    meanAnswerCostUsd: number | null;
    pricedAnswerTurns: number;
    estimatedQuestionsPerUsd: number | null;
    /** Requires complete selected-case cost coverage; includes spend on failed answers. */
    estimatedAcceptableAnswersPerUsd: number | null;
    missingUsageRecords: number;
    answerLatencyMs: { p50: number; p95: number };
    judgeLatencyMs: { p50: number; p95: number };
  };
}
function versionOf(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function observationCost(
  observation: Pick<EvaluationObservation, 'mocked' | 'usage' | 'model'>,
): number | undefined {
  if (observation.mocked) return 0;
  if (
    observation.usage?.inputTokens === undefined ||
    observation.usage.outputTokens === undefined
  )
    return undefined;
  return estimatedModelCostUsd(
    observation.model
      ? reviewedTextModel(observation.model)
      : reviewedAnswerModel(),
    observation.usage.inputTokens,
    observation.usage.outputTokens,
  );
}
/** Bridge bounds UTF-8 prompt bytes; 32,768 includes conservative template headroom. */
export function evaluationCostBound(
  caseCount: number,
  calibrationCount = 0,
  answerModelKey: AnswerModelKey = 'qwen3-30b',
  judgeModelKey: JudgeModelKey = 'gpt-oss-120b',
): number {
  return (
    evaluationCaptureCostBound(caseCount, answerModelKey) +
    (caseCount + calibrationCount) *
      estimatedModelCostUsd(reviewedJudgeModel(judgeModelKey), 32_768, 1200)
  );
}
/** Capture makes no judge/calibration calls; only bounded cheap answer work. */
export function evaluationCaptureCostBound(
  caseCount: number,
  answerModelKey: AnswerModelKey = 'qwen3-30b',
): number {
  return (
    caseCount *
    4 *
    estimatedModelCostUsd(reviewedAnswerModel(answerModelKey), 32_768, 1200)
  );
}
function resolveReferences(
  item: Pick<EvaluationCase, 'referenceKeys'>,
  resolver?: ReferenceResolver,
): EvaluationReference[] {
  return resolver?.(item.referenceKeys) ?? [];
}
function completeReferences(
  keys: string[],
  references: EvaluationReference[],
): boolean {
  return (
    keys.length > 0 &&
    keys.every((key) =>
      references.some(
        (item) =>
          item.key === key &&
          item.content.trim().length > 0 &&
          Number.isInteger(item.version),
      ),
    )
  );
}
export function compareObservation(
  item: EvaluationCase,
  observation: EvaluationObservation,
): EvaluationResult {
  const text = observation.text.toLowerCase();
  const checks = [
    {
      dimension: 'nonempty answer',
      passed: observation.text.trim().length > 0,
    },
    {
      dimension: 'completed answer generation',
      passed: !['length', 'content-filter', 'error', 'unknown'].includes(
        observation.finishReason ?? 'stop',
      ),
    },
    {
      dimension: 'isolated tool allowlist',
      passed: observation.toolNames.every((name) => name === 'loadSkill'),
    },
    {
      dimension: 'completed skill tool contracts',
      passed:
        (observation.toolTrace ?? []).every((entry) => {
          const parsed = z
            .object({
              toolName: z.literal('loadSkill'),
              status: z.literal('completed'),
              input: z.object({ key: z.string().min(1) }).strict(),
              output: z
                .object({
                  key: z.string().min(1),
                  version: z.number().int().positive(),
                  content: z.string().min(1),
                })
                .strict(),
            })
            .strict()
            .safeParse(entry);
          return (
            parsed.success && parsed.data.input.key === parsed.data.output.key
          );
        }) &&
        observation.toolNames.every((name) =>
          (observation.toolTrace ?? []).some(
            (entry) =>
              typeof entry === 'object' &&
              entry !== null &&
              'toolName' in entry &&
              entry.toolName === name,
          ),
        ),
    },
    ...(item.expected.requiredToolNames ?? []).map((name) => ({
      dimension: `required tool: ${name}`,
      passed: observation.toolNames.includes(name),
    })),
    ...(item.expected.forbiddenToolNames ?? []).map((name) => ({
      dimension: `forbidden tool: ${name}`,
      passed: !observation.toolNames.includes(name),
    })),
  ];
  return {
    id: item.id,
    cohort: item.cohort,
    split: item.split,
    tags: item.tags,
    question: item.prompt,
    expectedBehavior: item.expectedBehavior,
    references: [],
    caseVersion: versionOf(item),
    observation,
    checks,
    phraseDiagnostics: [
      ...(item.expected.requiredPhrases ?? []).map((phrase) => ({
        dimension: `required phrase: ${phrase}`,
        matched: text.includes(phrase.toLowerCase()),
      })),
      ...(item.expected.forbiddenPhrases ?? []).map((phrase) => ({
        dimension: `forbidden phrase: ${phrase}`,
        matched: text.includes(phrase.toLowerCase()),
      })),
    ],
    judge: { status: 'not_run', reason: 'Semantic judge has not run' },
    // Clean traces or absence of prohibited words are not proof of a useful answer.
    passed: false,
  };
}
async function judgeAnswer(
  input: JudgeInput,
  mode: Mode,
  judge?: EvaluationJudge,
  judgeModelKey?: JudgeModelKey,
): Promise<JudgeRecord> {
  if (!input.answer.trim())
    return {
      status: 'not_run',
      reason: 'Blank answer fails before a paid judge call',
    };
  if (!judge)
    return {
      status: 'not_run',
      reason: 'No semantic judge supplied; quality remains unverified',
    };
  let observation: EvaluationObservation | undefined;
  try {
    observation = await judge(input);
    observation.estimatedCostUsd = observationCost(observation);
    if (
      observation.mocked !== (mode === 'mock') ||
      observation.toolNames.length ||
      (observation.modelCalls ?? 1) > 1 ||
      ['length', 'content-filter', 'error', 'unknown'].includes(
        observation.finishReason ?? 'stop',
      ) ||
      (mode === 'live' &&
        observation.model !== reviewedJudgeModel(judgeModelKey).nativeId)
    )
      throw new Error('Judge mode/tool/call bound mismatch');
    const scorecard = parseJudgeScorecard(observation.text, input);
    return { status: scorecard.status, scorecard, observation };
  } catch {
    return {
      status: 'judge_error',
      reason:
        'Judge failed or returned invalid/unsupported evidence; never counted as passing',
      ...(observation ? { observation } : {}),
    };
  }
}
export async function runJudgeCalibration(input: {
  cases: unknown;
  mode: Mode;
  judge: EvaluationJudge;
  resolveReferences: ReferenceResolver;
  judgeModelKey?: JudgeModelKey;
}): Promise<JudgeCalibrationReport> {
  const cases = judgeCalibrationSchema.parse(input.cases);
  const results: CalibrationResult[] = [];
  for (const item of cases) {
    const references = resolveReferences(item, input.resolveReferences);
    const judge = completeReferences(item.referenceKeys, references)
      ? await judgeAnswer(
          {
            cohort: item.cohort,
            question: item.prompt,
            answer: item.answer,
            expectedBehavior: item.expectedBehavior,
            references,
            toolNames: [],
            toolTrace: [],
          },
          input.mode,
          input.judge,
          input.judgeModelKey,
        )
      : {
          status: 'unsure' as const,
          reason: 'Calibration reference is unresolved',
        };
    const blank = !item.answer.trim();
    const available = blank || judge.status === 'scored';
    const actualPass =
      !blank && !!judge.scorecard && scorecardPasses(judge.scorecard);
    const codes =
      judge.scorecard?.criticalFailures.map((failure) => failure.code) ?? [];
    results.push({
      id: item.id,
      question: item.prompt,
      answer: item.answer,
      references,
      expectedBehavior: item.expectedBehavior,
      expectedPass: item.expectedPass,
      expectedCriticalCodes: item.expectedCriticalCodes,
      ...(item.expectedFailingDimensions
        ? { expectedFailingDimensions: item.expectedFailingDimensions }
        : {}),
      judge,
      matched:
        available &&
        actualPass === item.expectedPass &&
        item.expectedCriticalCodes.every((code) => codes.includes(code)) &&
        (item.expectedFailingDimensions ?? []).every(
          (dimension) =>
            judge.scorecard?.scores !== null &&
            judge.scorecard?.scores?.[dimension] !== undefined &&
            judge.scorecard.scores[dimension] < 2,
        ),
    });
  }
  return {
    mode: input.mode,
    version: versionOf(cases),
    judgeModel: reviewedJudgeModel(input.judgeModelKey).nativeId,
    judgePromptVersion: versionOf(judgeInstructions),
    rubricVersion: judgeRubricVersion,
    results,
    liveVerified:
      input.mode === 'live' && results.every((item) => item.matched),
  };
}
function percentile(values: number[], quantile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length
    ? sorted[Math.max(0, Math.ceil(sorted.length * quantile) - 1)]!
    : 0;
}
export async function runEvaluationSuite(input: {
  cases: unknown;
  mode: Mode;
  evaluate: (
    item: Pick<EvaluationCase, 'id' | 'cohort' | 'prompt'>,
  ) => Promise<EvaluationObservation>;
  judge?: EvaluationJudge;
  resolveReferences?: ReferenceResolver;
  calibration?: JudgeCalibrationReport;
  configuration?: OperatorWorkConfiguration;
  answerModelKey?: AnswerModelKey;
  judgeModelKey?: JudgeModelKey;
  calibrationOnly?: boolean;
  captureOnly?: boolean;
  knowledgeMode?: 'auto' | 'inline' | 'lazy';
  now?: Date;
}): Promise<EvaluationReport> {
  if (input.captureOnly && input.calibrationOnly)
    throw new Error('Capture-only cannot run judge calibration');
  const cases = input.calibrationOnly ? [] : casesSchema.parse(input.cases);
  // A supplied historical API calibration cannot confer trust on a capture.
  const calibration = input.captureOnly ? undefined : input.calibration;
  const calibrationCount = calibration?.results.length ?? 0;
  const bound = input.captureOnly
    ? evaluationCaptureCostBound(cases.length, input.answerModelKey)
    : evaluationCostBound(
        cases.length,
        calibrationCount,
        input.answerModelKey,
        input.judgeModelKey,
      );
  if (input.mode === 'live' && bound > 2)
    throw new Error('Evaluation exceeds its intentional $2 cost bound');
  const results: EvaluationResult[] = [];
  for (const item of cases) {
    const base = {
      id: item.id,
      cohort: item.cohort,
      split: item.split,
      tags: item.tags,
      question: item.prompt,
      expectedBehavior: item.expectedBehavior,
      references: resolveReferences(item, input.resolveReferences),
      caseVersion: versionOf(item),
      checks: [],
      phraseDiagnostics: [],
      passed: false,
    };
    if (
      input.mode === 'live' &&
      !input.captureOnly &&
      (!calibration ||
        !calibration.liveVerified ||
        calibration.mode !== 'live' ||
        calibration.judgeModel !==
          reviewedJudgeModel(input.judgeModelKey).nativeId ||
        calibration.judgePromptVersion !== versionOf(judgeInstructions) ||
        calibration.rubricVersion !== judgeRubricVersion ||
        !input.resolveReferences ||
        calibration.results.some(
          (control) =>
            !control.matched ||
            versionOf(control.references) !==
              versionOf(
                resolveReferences(
                  {
                    referenceKeys: control.references.map(
                      (reference) => reference.key,
                    ),
                  },
                  input.resolveReferences,
                ),
              ),
        ))
    ) {
      results.push({
        ...base,
        judge: {
          status: 'judge_error',
          reason:
            'Live judge calibration is missing, stale or failed; answer suite was not run',
        },
      });
      continue;
    }
    try {
      // Expectations, references, tags and held-out labels never enter answer-model input.
      const observation = await input.evaluate({
        id: item.id,
        cohort: item.cohort,
        prompt: item.prompt,
      });
      observation.estimatedCostUsd = observationCost(observation);
      if (
        observation.mocked !== (input.mode === 'mock') ||
        (observation.modelCalls ?? 0) > 4 ||
        (input.captureOnly &&
          input.mode === 'live' &&
          observation.model !==
            reviewedAnswerModel(input.answerModelKey).nativeId)
      )
        throw new Error('Evaluation mode/call bound mismatch');
      const result = compareObservation(item, observation);
      result.references = base.references;
      // Grade against all approved knowledge accessible to this role, not a narrower
      // fixture topic. Resolve from trusted configuration, never arbitrary trace text.
      if (input.configuration) {
        const bot = input.configuration.bots.find(
          (bot) => bot.kind === item.cohort,
        );
        const assignedReferences = input.configuration.skills
          .filter((skill) => bot?.skillKeys.includes(skill.key))
          .map(({ key, version, content }) => ({ key, version, content }));
        result.references = [
          ...new Map(
            [...result.references, ...assignedReferences].map((reference) => [
              reference.key,
              reference,
            ]),
          ).values(),
        ];
      }
      if (input.captureOnly)
        result.judge = {
          status: 'not_run',
          reason:
            'Explicit UNJUDGED answer capture; semantic review has not run',
        };
      else if (!result.checks.every((check) => check.passed))
        result.judge = {
          status: 'not_run',
          reason: 'Deterministic answer/tool check failed; judge call skipped',
        };
      else if (
        !completeReferences(item.referenceKeys, result.references) ||
        !item.expectedBehavior.length
      )
        result.judge = {
          status: 'unsure',
          reason: 'Expected behavior or an approved reference is unresolved',
        };
      else
        result.judge = await judgeAnswer(
          {
            cohort: item.cohort,
            question: item.prompt,
            answer: observation.text,
            expectedBehavior: item.expectedBehavior,
            references: result.references,
            toolNames: observation.toolNames,
            toolTrace: observation.toolTrace ?? [],
          },
          input.mode,
          input.judge,
          input.judgeModelKey,
        );
      result.passed =
        result.checks.every((check) => check.passed) &&
        !!result.judge.scorecard &&
        scorecardPasses(result.judge.scorecard);
      results.push(result);
    } catch {
      results.push({
        ...base,
        judge: { status: 'not_run', reason: 'Answer generation failed' },
        error:
          'Answer evaluator failed; inspect scoped runtime without publishing private provider errors',
      });
    }
  }
  const observations = [
    ...results.flatMap((item) => [item.observation, item.judge.observation]),
    ...(calibration?.results.map((item) => item.judge.observation) ?? []),
  ].filter((item): item is EvaluationObservation => !!item);
  const inputTokens = observations.reduce(
    (sum, item) => sum + (item.usage?.inputTokens ?? 0),
    0,
  );
  const outputTokens = observations.reduce(
    (sum, item) => sum + (item.usage?.outputTokens ?? 0),
    0,
  );
  const answers = results.flatMap((item) =>
    item.observation?.latencyMs === undefined
      ? []
      : [item.observation.latencyMs],
  );
  const judges = results.flatMap((item) =>
    item.judge.observation?.latencyMs === undefined
      ? []
      : [item.judge.observation.latencyMs],
  );
  return {
    version: 2,
    createdAt: (input.now ?? new Date()).toISOString(),
    mode: input.mode,
    model:
      input.mode === 'mock'
        ? 'development-mock'
        : reviewedAnswerModel(input.answerModelKey).nativeId,
    captureOnly: input.captureOnly ?? false,
    judgeModel: input.captureOnly
      ? null
      : input.mode === 'mock'
        ? 'offline-stub-or-not-run'
        : reviewedJudgeModel(input.judgeModelKey).nativeId,
    rubricVersion: judgeRubricVersion,
    judgePromptVersion: versionOf(judgeInstructions),
    sharedInstructionsVersion: ASSISTANT_INSTRUCTIONS_VERSION,
    knowledgeMode: input.knowledgeMode ?? 'auto',
    ...(input.configuration
      ? { configurationVersion: versionOf(input.configuration) }
      : {}),
    knowledgeVersions: (input.configuration?.skills ?? []).map((skill) => ({
      key: skill.key,
      version: skill.version,
      contentHash: versionOf(skill.content),
    })),
    qualityVerified: false,
    manualReviewRequired: true,
    runtimeCoverage:
      'isolated assigned knowledge; loadSkill only; no customer records or browser execution',
    ...(calibration ? { calibration } : {}),
    limits: {
      maximumCases: cases.length,
      maximumModelCalls:
        cases.length * (input.captureOnly ? 4 : 5) + calibrationCount,
      maximumAnswerCallsPerCase: 4,
      maximumJudgeCallsPerCase: input.captureOnly ? 0 : 1,
      maximumRetries: 0,
      maximumOutputTokensPerCall: 1200,
      conservativeCostBoundUsd: input.mode === 'mock' ? 0 : bound,
      maximumCostUsd: 2,
    },
    results,
    passedComparisons: results.filter((item) => item.passed).length,
    failedComparisons: results.filter((item) => verdict(item) === 'fail')
      .length,
    providerFailures: results.filter((item) => item.error).length,
    judgeErrors: results.filter((item) => item.judge.status === 'judge_error')
      .length,
    unsure: results.filter((item) => item.judge.status === 'unsure').length,
    criticalFailures: results.filter(
      (item) =>
        !!item.judge.scorecard?.criticalFailures.length ||
        item.checks.some(
          (check) =>
            (check.dimension.startsWith('forbidden tool:') ||
              check.dimension === 'isolated tool allowlist') &&
            !check.passed,
        ),
    ).length,
    usage: {
      modelCalls: observations.reduce(
        (sum, item) => sum + (item.modelCalls ?? 0),
        0,
      ),
      inputTokens,
      outputTokens,
      estimatedCostUsd:
        input.mode === 'mock'
          ? 0
          : observations.reduce(
              (sum, observation) => sum + (observation.estimatedCostUsd ?? 0),
              0,
            ),
      answerEstimatedCostUsd: results.reduce(
        (sum, item) => sum + (item.observation?.estimatedCostUsd ?? 0),
        0,
      ),
      judgeEstimatedCostUsd: results.reduce(
        (sum, item) => sum + (item.judge.observation?.estimatedCostUsd ?? 0),
        0,
      ),
      calibrationEstimatedCostUsd: (calibration?.results ?? []).reduce(
        (sum, item) => sum + (item.judge.observation?.estimatedCostUsd ?? 0),
        0,
      ),
      meanAnswerCostUsd: results.filter(
        (item) => item.observation?.estimatedCostUsd !== undefined,
      ).length
        ? results.reduce(
            (sum, item) => sum + (item.observation?.estimatedCostUsd ?? 0),
            0,
          ) /
          results.filter(
            (item) => item.observation?.estimatedCostUsd !== undefined,
          ).length
        : null,
      pricedAnswerTurns: results.filter(
        (item) => item.observation?.estimatedCostUsd !== undefined,
      ).length,
      estimatedQuestionsPerUsd: results.some(
        (item) => (item.observation?.estimatedCostUsd ?? 0) > 0,
      )
        ? results.filter(
            (item) => item.observation?.estimatedCostUsd !== undefined,
          ).length /
          results.reduce(
            (sum, item) => sum + (item.observation?.estimatedCostUsd ?? 0),
            0,
          )
        : null,
      estimatedAcceptableAnswersPerUsd:
        !input.captureOnly &&
        results.length > 0 &&
        results.every(
          (item) => item.observation?.estimatedCostUsd !== undefined,
        ) &&
        results.some((item) => (item.observation?.estimatedCostUsd ?? 0) > 0)
          ? results.filter((item) => item.passed).length /
            results.reduce(
              (sum, item) => sum + (item.observation?.estimatedCostUsd ?? 0),
              0,
            )
          : null,
      missingUsageRecords: observations.filter(
        (item) =>
          !item.mocked &&
          (item.usage?.inputTokens === undefined ||
            item.usage.outputTokens === undefined),
      ).length,
      answerLatencyMs: {
        p50: percentile(answers, 0.5),
        p95: percentile(answers, 0.95),
      },
      judgeLatencyMs: {
        p50: percentile(judges, 0.5),
        p95: percentile(judges, 0.95),
      },
    },
  };
}
function cell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll(/\s+/gu, ' ');
}
function verdict(item: EvaluationResult): string {
  return item.error
    ? 'answer_error'
    : item.passed
      ? 'pass'
      : item.judge.status === 'scored' ||
          item.checks.some((check) => !check.passed)
        ? 'fail'
        : item.judge.status;
}
function issue(item: EvaluationResult): string {
  return (
    item.error ??
    item.checks.find((check) => !check.passed)?.dimension ??
    item.judge.scorecard?.criticalFailures[0]?.reason ??
    item.judge.scorecard?.reasons.find(
      (reason) => item.judge.scorecard!.scores?.[reason.dimension] !== 2,
    )?.reason ??
    item.judge.reason ??
    'Adequate in all five dimensions'
  );
}
/** Capture success means completed bounded generation, never quality acceptance. */
export function evaluationExitCode(report: EvaluationReport): 0 | 1 {
  if (report.captureOnly)
    return report.providerFailures ||
      report.results.some(
        (item) =>
          !item.observation || item.checks.some((check) => !check.passed),
      )
      ? 1
      : 0;
  return report.providerFailures ||
    (report.mode === 'live' &&
      (report.passedComparisons !== report.results.length ||
        !report.calibration?.liveVerified))
    ? 1
    : 0;
}
function captureMarkdown(report: EvaluationReport): string {
  const rows = report.results
    .map(
      (item) =>
        `| ${item.id} | ${item.cohort} | ${item.split} | ${item.error ? 'answer error' : item.checks.some((check) => !check.passed) ? 'deterministic failure' : 'captured; UNJUDGED'} | ${item.observation?.modelCalls ?? '—'} | ${item.observation?.usage?.inputTokens ?? '—'} / ${item.observation?.usage?.outputTokens ?? '—'} | ${item.observation?.estimatedCostUsd?.toFixed(6) ?? 'unavailable'} | ${item.observation?.latencyMs ?? '—'} |`,
    )
    .join('\n');
  return `# UNJUDGED answer capture

Created: ${report.createdAt}
Mode: ${report.mode}; captureOnly=true; answer model: ${report.model}; knowledge: ${report.knowledgeMode}; shared instructions v${report.sharedInstructionsVersion}.
Configuration hash: ${report.configurationVersion ?? 'not supplied'}.

${report.mode === 'mock' ? 'Offline mock capture only; no paid model calls occurred.' : 'Real bounded answer generation only.'} No API judge or calibration calls occurred. qualityVerified=false; independent semantic review is required. Zero graded passes is not a 0% answer-quality score. Capture success is not grading acceptance.

Selected: ${report.results.length}; captured: ${report.results.filter((item) => !!item.observation).length}; deterministic failures: ${report.failedComparisons}; answer errors: ${report.providerFailures}. All selected cases remain represented.
Coverage: ${report.runtimeCoverage}. No browser/account authorization or release-quality conclusion follows from this capture.

Completed answer calls: ${report.usage.modelCalls}; input/output tokens: ${report.usage.inputTokens}/${report.usage.outputTokens}; estimated answer cost: $${report.usage.answerEstimatedCostUsd.toFixed(6)} (${report.usage.missingUsageRecords} records missing provider usage). Failed requests may incur unreported usage; cost is not an invoice.
Mean runtime answer cost: ${report.usage.meanAnswerCostUsd === null ? 'unavailable' : `$${report.usage.meanAnswerCostUsd.toFixed(6)}`} (priced ${report.usage.pricedAnswerTurns}/${report.results.length}); estimated questions/$1: ${report.usage.estimatedQuestionsPerUsd?.toFixed(0) ?? 'unavailable'}; acceptable answers/$1: unavailable (unjudged, not zero).
Answer latency p50/p95: ${report.usage.answerLatencyMs.p50}/${report.usage.answerLatencyMs.p95} ms. Elapsed isolated sequential work is not a production load benchmark.
Conservative answer-only cost bound: $${report.limits.conservativeCostBoundUsd.toFixed(4)}; maximum intentional allowance $2; maximum answer calls per case=4; judge calls=0; retries=0; maximum output tokens per call=1200.

| Case | Role | Split | Capture status | Calls | Input / output tokens | Estimated answer USD | Latency ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows}

## Actual answers and independent-review context

${report.results
  .map(
    (item) =>
      `### ${item.id}\n\nCase hash: ${item.caseVersion}\n\nQuestion: ${item.question}\n\nAnswer: ${item.observation?.text ?? '(not generated)'}\n\nCapture checks: ${item.error ?? item.checks.find((check) => !check.passed)?.dimension ?? 'passed deterministic checks only; semantic quality UNJUDGED'}.\n\nExpected behavior (withheld from answerer):\n\n${item.expectedBehavior.map((text) => `- ${text}`).join('\n')}\n\nApproved reference facts (withheld as test expectations; assigned product knowledge remains available):\n\n${item.references.map((reference) => `- ${reference.key}@${reference.version}: ${reference.content}`).join('\n')}\n`,
  )
  .join('\n')}`;
}
export function evaluationMarkdown(report: EvaluationReport): string {
  if (report.captureOnly) return captureMarkdown(report);
  const summary = (['helper', 'support'] as const)
    .map((cohort) => {
      const cases = report.results.filter((item) => item.cohort === cohort);
      return `| ${cohort} | ${cases.length} | ${cases.filter((item) => item.passed).length} | ${cases.filter((item) => verdict(item) === 'fail').length} | ${cases.filter((item) => !!item.judge.scorecard?.criticalFailures.length || item.checks.some((check) => (check.dimension.startsWith('forbidden tool:') || check.dimension === 'isolated tool allowlist') && !check.passed)).length} | ${cases.filter((item) => item.judge.status === 'unsure').length} | ${cases.filter((item) => !!item.error || item.judge.status === 'judge_error').length} | ${cases.filter((item) => item.judge.status === 'not_run' && !item.error && item.checks.every((check) => check.passed)).length} |`;
    })
    .join('\n');
  const strata = (['helper', 'support'] as const)
    .flatMap((cohort) =>
      (['tuning', 'held_out'] as const).flatMap((split) => {
        const group = report.results.filter(
          (item) => item.cohort === cohort && item.split === split,
        );
        return [
          'all',
          ...new Set(
            group.flatMap((item) =>
              item.tags.filter((tag) =>
                ['normal', 'messy', 'adversarial', 'calibration'].includes(tag),
              ),
            ),
          ),
        ].map((style) => {
          const cases =
            style === 'all'
              ? group
              : group.filter((item) => item.tags.includes(style));
          return `| ${cohort} | ${split} | ${style} | ${cases.length} | ${cases.filter((item) => item.passed).length} |`;
        });
      }),
    )
    .join('\n');
  const rows = report.results
    .map(
      (item) =>
        `| ${cell(item.question.slice(0, 100))} | ${item.cohort} | ${judgeDimensions.map((name) => item.judge.scorecard?.scores?.[name] ?? '—').join(' | ')} | ${verdict(item)} | ${cell(issue(item))} |`,
    )
    .join('\n');
  const dimensions = (['helper', 'support'] as const)
    .map((cohort) => {
      const scored = report.results.filter(
        (item) =>
          item.cohort === cohort &&
          item.judge.scorecard?.status === 'scored' &&
          item.judge.scorecard.scores,
      );
      return `| ${cohort} | ${scored.length} | ${judgeDimensions.map((dimension) => (scored.length ? (scored.reduce((sum, item) => sum + item.judge.scorecard!.scores![dimension], 0) / scored.length).toFixed(2) : '—')).join(' | ')} |`;
    })
    .join('\n');
  let details =
    `## Quality dimensions\n\n| Role | Scored answers | Relevance /2 | Grounding /2 | Authority /2 | Clarity /2 | Language /2 |\n| --- | --- | --- | --- | --- | --- | --- |\n${dimensions}\n\nMeans describe scored answers only; errors/unjudged cases are still in the overall denominator. Averages cannot override a failed dimension or critical boundary.\n\n` +
    report.results
      .map(
        (item) =>
          `### ${item.id}\n\nQuestion: ${item.question}\n\nAnswer: ${item.observation?.text ?? '(not generated)'}\n\nVerdict: ${verdict(item)}. ${issue(item)}\n\nExpected behavior:\n\n${item.expectedBehavior.map((text) => `- ${text}`).join('\n')}\n\nReference facts:\n\n${item.references.map((reference) => `- ${reference.key}@${reference.version}: ${reference.content}`).join('\n')}\n\nJudge reasons:\n\n${item.judge.scorecard?.reasons.map((reason) => `- ${reason.dimension} (${item.judge.scorecard!.scores?.[reason.dimension] ?? 'unsure'}/2): ${reason.reason} Evidence (${reason.evidenceKind}): ${reason.evidence}`).join('\n') ?? item.judge.reason}\n\nCritical failures:\n\n${item.judge.scorecard?.criticalFailures.map((failure) => `- ${failure.code}: ${failure.reason} Evidence: ${failure.evidence}`).join('\n') || 'None reported; inspect deterministic checks in JSON.'}\n`,
      )
      .join('\n');
  const calibration = report.calibration?.results
    .map(
      (item) =>
        `| ${cell(item.question.slice(0, 100))} | ${item.expectedPass ? 'pass' : 'fail'} | ${item.judge.scorecard ? (scorecardPasses(item.judge.scorecard) ? 'pass' : item.judge.status === 'unsure' ? 'unsure' : 'fail') : !item.answer.trim() ? 'blank fail' : item.judge.status} | ${item.matched ? 'yes' : 'no'} | ${cell(item.judge.reason ?? item.judge.scorecard?.criticalFailures[0]?.reason ?? '')} |`,
    )
    .join('\n');
  if (calibration)
    details += `\n## Controlled judge calibration\n\n| Question | Expected | Observed | Agrees | Issue |\n| --- | --- | --- | --- | --- |\n${calibration}\n\nFull authored answers and grading evidence are in the JSON calibration records.\n`;
  if (report.calibration) {
    const controls = report.calibration.results;
    const falsePasses = controls.filter(
      (item) =>
        !item.expectedPass &&
        item.judge.scorecard &&
        scorecardPasses(item.judge.scorecard),
    ).length;
    const falseRejects = controls.filter(
      (item) =>
        item.expectedPass &&
        item.judge.status === 'scored' &&
        item.judge.scorecard &&
        !scorecardPasses(item.judge.scorecard),
    ).length;
    const taxonomyMisses = controls.filter(
      (item) =>
        item.judge.status === 'scored' &&
        item.expectedCriticalCodes.some(
          (code) =>
            !item.judge.scorecard?.criticalFailures.some(
              (failure) => failure.code === code,
            ),
        ),
    ).length;
    details += `\nCalibration diagnostics: ${falsePasses} bad answers falsely accepted; ${falseRejects} good answers falsely rejected; ${taxonomyMisses} controls missing required critical labels. Categories can overlap; invalid/unsure judgments remain blockers, not passes.\n`;
  }
  const usage = report.results
    .map((item) => {
      const answer = item.observation;
      const judge = item.judge.observation;
      const cost =
        answer?.estimatedCostUsd !== undefined &&
        judge?.estimatedCostUsd !== undefined
          ? (answer.estimatedCostUsd + judge.estimatedCostUsd).toFixed(6)
          : 'incomplete/not run';
      return `| ${item.id} | ${answer?.latencyMs ?? '—'} / ${judge?.latencyMs ?? '—'} | ${answer?.usage?.inputTokens ?? '—'} / ${answer?.usage?.outputTokens ?? '—'} | ${judge?.usage?.inputTokens ?? '—'} / ${judge?.usage?.outputTokens ?? '—'} | ${answer?.estimatedCostUsd?.toFixed(6) ?? '—'} | ${judge?.estimatedCostUsd?.toFixed(6) ?? '—'} | ${cost} |`;
    })
    .join('\n');
  details += `\n## Per-case completed-call usage\n\n| Case | Answer/judge ms | Answer input/output tokens | Judge input/output tokens | Answer USD | Judge USD | Combined estimated USD |\n| --- | --- | --- | --- | --- | --- | --- |\n${usage}\n\nLatency is elapsed sequential answer/judge work, including SDK, transport and any test-process pacing; it is not a production load or token-throughput benchmark.\nJudge prompt hash: ${report.judgePromptVersion}. Configuration hash: ${report.configurationVersion ?? 'not supplied'}.\n`;
  return `# Operator answer scorecard\n\nCreated: ${report.createdAt}\nMode: ${report.mode}; answer model: ${report.model}; judge: ${report.judgeModel}; rubric: ${report.rubricVersion}; knowledge: ${report.knowledgeMode}; shared instructions v${report.sharedInstructionsVersion}.\n\n${report.mode === 'mock' ? 'Offline mock/stub diagnostics only. No paid model calls occurred. Live model quality remains unverified.' : 'Live automated grading, not a release verdict. A stronger independent model grades the cheap answerer; judge mistakes remain possible. Independent manual review is still required.'}\n\n| Role | Selected cases | Pass | Fail | Critical (subset) | Unsure | Errors | Unjudged |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${summary}\n\nEvery selected case remains in the denominator, including unsure/errors/unjudged. Critical failures are a subset, not extra cases.\n\nCoverage: ${report.runtimeCoverage}. No browser/account authorization or release-quality conclusion follows from this suite.\nJudge calibration: ${report.calibration ? `${report.calibration.results.filter((item) => item.matched).length}/${report.calibration.results.length} controlled examples agree; live verified=${report.calibration.liveVerified}.` : 'not run; judge accuracy is unverified.'}\nActual completed model calls: ${report.usage.modelCalls}; input/output tokens: ${report.usage.inputTokens}/${report.usage.outputTokens}; combined answer/judge/calibration estimated cost: $${report.usage.estimatedCostUsd.toFixed(6)} (${report.usage.missingUsageRecords} records missing provider usage). Failed requests may incur unreported usage; cost is not an invoice.\nEstimated runtime answer cost: $${report.usage.answerEstimatedCostUsd.toFixed(6)} total; ${report.usage.meanAnswerCostUsd === null ? 'mean unavailable (no priced answer turns)' : `$${report.usage.meanAnswerCostUsd.toFixed(6)} mean per completed answer turn`} (priced ${report.usage.pricedAnswerTurns}/${report.results.length}; includes tool/model steps). Evaluation-only judge: $${report.usage.judgeEstimatedCostUsd.toFixed(6)}; calibration: $${report.usage.calibrationEstimatedCostUsd.toFixed(6)}.\nEstimated questions/$1: ${report.usage.estimatedQuestionsPerUsd?.toFixed(0) ?? 'unavailable'}; acceptable answers/$1 (all selected costs required): ${report.usage.estimatedAcceptableAnswersPerUsd?.toFixed(0) ?? 'unavailable'}. Judge/calibration are evaluation-only costs, not customer-message prices.\nAnswer latency p50/p95: ${report.usage.answerLatencyMs.p50}/${report.usage.answerLatencyMs.p95} ms; judge latency p50/p95: ${report.usage.judgeLatencyMs.p50}/${report.usage.judgeLatencyMs.p95} ms.\nConservative total cost bound: $${report.limits.conservativeCostBoundUsd.toFixed(4)}; maximum intentional allowance $2; retries=0.\n\n| Role | Split | Style | Selected | Pass |\n| --- | --- | --- | --- | --- |\n${strata}\n\nScores: 0=failed, 1=partial/uncertain, 2=adequate. Pass requires all five 2, no critical failure, and deterministic checks passing.\n\n| Question (shortened) | Role | Relevance | Grounding | Authority/privacy | Clarity | Language | Verdict | Main issue |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${rows}\n\n## Actual answers, expectations and evidence\n\n${details}`;
}
function evaluatorFor(
  configuration: OperatorWorkConfiguration,
  options: Pick<AssistantTurnOptions, 'mode' | 'provider' | 'modelKey'>,
  knowledgeMode: 'auto' | 'inline' | 'lazy' = 'auto',
) {
  return async (
    item: Pick<EvaluationCase, 'id' | 'cohort' | 'prompt'>,
  ): Promise<EvaluationObservation> => {
    const bot = configuration.bots.find(
      (candidate) => candidate.kind === item.cohort,
    );
    if (!bot) throw new Error('Cohort bot is not configured');
    const assigned = configuration.skills.filter((skill) =>
      bot.skillKeys.includes(skill.key),
    );
    const toolTrace: unknown[] = [];
    const knowledge = prepareAssistantKnowledge(assigned, knowledgeMode);
    const started = performance.now();
    const result = await generateAssistantTurn({
      ...options,
      instructions: composeAssistantInstructions({
        kind: item.cohort,
        businessInstructions: bot.instructions,
        skillCatalog: knowledge.skillCatalog,
        suppliedKnowledge: knowledge.suppliedKnowledge,
      }),
      requireInitialKnowledge: knowledge.requireInitialKnowledge,
      messages: [{ role: 'user', content: item.prompt }],
      tools:
        knowledge.strategy === 'inline'
          ? {}
          : {
              loadSkill: tool({
                inputSchema: z.object({ key: z.string() }).strict(),
                execute: async ({ key }) => {
                  const skill = assigned.find(
                    (candidate) => candidate.key === key,
                  );
                  if (!skill) {
                    toolTrace.push({
                      toolName: 'loadSkill',
                      input: { key },
                      status: 'denied',
                    });
                    throw new Error('Skill is not assigned');
                  }
                  const output = {
                    key: skill.key,
                    version: skill.version,
                    content: skill.content,
                  };
                  toolTrace.push({
                    toolName: 'loadSkill',
                    input: { key },
                    output,
                    status: 'completed',
                  });
                  return output;
                },
              }),
            },
    });
    return {
      text: result.text,
      toolNames: [
        ...result.toolUsage,
        ...result.toolCalls.map((call) => call.toolName),
      ],
      toolTrace: [
        ...toolTrace,
        ...result.toolCalls.map((call) => ({ ...call, status: 'unresolved' })),
      ],
      mocked: result.mocked,
      model: result.model,
      modelCalls: result.modelCalls,
      latencyMs: Math.round(performance.now() - started),
      usage: result.usage,
      finishReason: result.finishReason,
    };
  };
}
function judgeFor(
  options: Pick<AssistantTurnOptions, 'mode' | 'provider' | 'modelKey'>,
): EvaluationJudge {
  return async (input) => {
    const started = performance.now();
    const result = await generateAssistantTurn({
      ...options,
      purpose: 'judge',
      instructions: judgeInstructions,
      messages: [{ role: 'user', content: JSON.stringify(judgeData(input)) }],
      maxSteps: 1,
      maxOutputTokens: 1200,
      temperature: 0,
    });
    return {
      text: result.text,
      toolNames: [
        ...result.toolUsage,
        ...result.toolCalls.map((call) => call.toolName),
      ],
      mocked: result.mocked,
      model: result.model,
      modelCalls: result.modelCalls,
      latencyMs: Math.round(performance.now() - started),
      usage: result.usage,
      finishReason: result.finishReason,
      estimatedCostUsd: observationCost(result),
    };
  };
}
export async function runEvaluationCommand(
  argv: readonly string[],
  environment: NodeJS.ProcessEnv = process.env,
): Promise<{
  jsonPath: string;
  markdownPath: string;
  report: EvaluationReport;
}> {
  const { values } = parseArgs({
    args: [...argv],
    strict: true,
    options: {
      'fixture-module': { type: 'string' },
      'operator-defaults-module': { type: 'string' },
      'report-directory': { type: 'string' },
      'judge-calibration-module': { type: 'string' },
      'answer-model': { type: 'string', default: 'qwen3-30b' },
      'judge-model': { type: 'string', default: 'gpt-oss-120b' },
      'case-id': { type: 'string', multiple: true },
      offset: { type: 'string', default: '0' },
      limit: { type: 'string' },
      'calibration-only': { type: 'boolean', default: false },
      'capture-only': { type: 'boolean', default: false },
      'knowledge-mode': { type: 'string', default: 'auto' },
      live: { type: 'boolean', default: false },
      'confirm-model-cost': { type: 'boolean', default: false },
    },
  });
  if (
    values['capture-only'] &&
    (values['calibration-only'] ||
      values['judge-calibration-module'] ||
      argv.some(
        (arg) => arg === '--judge-model' || arg.startsWith('--judge-model='),
      ))
  )
    throw new Error(
      'Capture-only cannot include judge model or calibration options',
    );
  if (
    !values['fixture-module'] ||
    !values['operator-defaults-module'] ||
    !values['report-directory']
  )
    throw new Error(
      'Evaluation requires fixture/defaults modules and a Business-owned report directory',
    );
  const directory = resolve(values['report-directory']);
  if (
    !/^projects\/[a-z0-9-]+\/.+/u.test(
      relative(process.cwd(), directory).replaceAll('\\', '/'),
    )
  )
    throw new Error(
      'Evaluation reports must stay beside Business code under projects/<business>/',
    );
  if (
    values.live &&
    (!values['confirm-model-cost'] ||
      environment.BFF_EVALUATION_CAPS_VERIFIED !== 'verified' ||
      !environment.BFF_EVALUATION_PROVIDER_URL ||
      !environment.BFF_EVALUATION_PROVIDER_SECRET)
  )
    throw new Error(
      'Live evaluation requires explicit cost confirmation and independently verified capped provider configuration',
    );
  if (
    values.live &&
    !values['capture-only'] &&
    !values['judge-calibration-module']
  )
    throw new Error(
      'Live grading requires controlled Business-owned judge calibration examples',
    );
  const fixture = await loadOperatorModule(values['fixture-module']);
  const defaults = await loadOperatorModule(values['operator-defaults-module']);
  const configuration = operatorWorkConfigurationSchema.parse(
    defaults.default ?? defaults.operatorWorkDefaults,
  );
  const savedCases = casesSchema.parse(
    fixture.operatorEvaluations ?? fixture.default,
  );
  const offset = Number(values.offset);
  const limit =
    values.limit === undefined ? savedCases.length : Number(values.limit);
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 160
  )
    throw new Error('Invalid evaluation batch');
  if (
    values['case-id']?.some((id) => !savedCases.some((item) => item.id === id))
  )
    throw new Error('Unknown saved evaluation case');
  const selected = values['case-id']
    ? savedCases.filter((item) => values['case-id']!.includes(item.id))
    : savedCases;
  const cases = values['calibration-only']
    ? []
    : casesSchema.parse(selected.slice(offset, offset + limit));
  const answerModel = reviewedAnswerModel(values['answer-model']);
  const judgeModel = reviewedJudgeModel(values['judge-model']);
  const knowledgeMode = z
    .enum(['auto', 'inline', 'lazy'])
    .parse(values['knowledge-mode']);
  const mode = values.live ? 'live' : 'mock';
  const options: Pick<AssistantTurnOptions, 'mode' | 'provider' | 'modelKey'> =
    {
      mode,
      modelKey: answerModel.key,
      ...(mode === 'live'
        ? {
            provider: {
              baseUrl: environment.BFF_EVALUATION_PROVIDER_URL!,
              secret: environment.BFF_EVALUATION_PROVIDER_SECRET!,
              capsVerified: true,
            },
          }
        : {}),
    };
  const judgeOptions = { ...options, modelKey: judgeModel.key };
  const resolveReferences: ReferenceResolver = (keys) =>
    configuration.skills
      .filter((skill) => keys.includes(skill.key))
      .map((skill) => ({
        key: skill.key,
        version: skill.version,
        content: skill.content,
      }));
  let calibration: JudgeCalibrationReport | undefined;
  if (values['judge-calibration-module']) {
    const module = await loadOperatorModule(values['judge-calibration-module']);
    const calibrationCases = judgeCalibrationSchema.parse(
      module.judgeCalibrationCases ?? module.default,
    );
    if (
      mode === 'live' &&
      evaluationCostBound(
        cases.length,
        calibrationCases.length,
        answerModel.key,
        judgeModel.key,
      ) > 2
    )
      throw new Error(
        'Answer, judge and calibration calls exceed intentional $2 allowance',
      );
    // Offline CLI does not pretend its fixed mock answer is a calibrated semantic judge.
    if (mode === 'live')
      calibration = await runJudgeCalibration({
        cases: calibrationCases,
        mode,
        judge: judgeFor(judgeOptions),
        resolveReferences,
        judgeModelKey: judgeModel.key,
      });
  }
  const report = await runEvaluationSuite({
    cases,
    mode,
    configuration,
    answerModelKey: answerModel.key,
    judgeModelKey: judgeModel.key,
    calibrationOnly: values['calibration-only'],
    captureOnly: values['capture-only'],
    knowledgeMode,
    calibration,
    resolveReferences,
    evaluate: evaluatorFor(configuration, options, knowledgeMode),
    ...(mode === 'live' && !values['capture-only']
      ? { judge: judgeFor(judgeOptions) }
      : {}),
  });
  await mkdir(directory, { recursive: true });
  const stamp = report.createdAt
    .replaceAll(/[-:.]/gu, '')
    .replace('T', '-')
    .replace('Z', '');
  const jsonPath = resolve(directory, `${stamp}-operator-${mode}.json`);
  const markdownPath = resolve(directory, `${stamp}-operator-${mode}.md`);
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, {
    flag: 'wx',
  });
  await writeFile(markdownPath, evaluationMarkdown(report), { flag: 'wx' });
  return { jsonPath, markdownPath, report };
}
