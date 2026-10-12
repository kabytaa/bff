import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import type { ModelMessage } from 'ai';
import {
  ASSISTANT_INSTRUCTIONS_VERSION,
  composeAssistantInstructions,
  fitAssistantHistory,
  prepareAssistantKnowledge,
} from '@bff/assistant/server';
import {
  estimatedModelCostUsd,
  reviewedAnswerModel,
} from '@bff/assistant/models';
import { operatorWorkConfigurationSchema } from '@bff/contracts';
import type { OperatorWorkConfiguration } from '@bff/contracts';
import { evaluationCaseSchema } from './operatorEvaluation';
import type { EvaluationCase } from './operatorEvaluation';
import { createAgentReviewBatch } from './operatorAgentReview';
import type { AgentReviewSource } from './operatorAgentReview';
import { loadOperatorModule } from './operatorWorkConfiguration';

export const GENERATION_EXPERIMENT_CASES = 7;
export const GENERATION_EXPERIMENT_REPETITIONS = 3;
export const GENERATION_EXPERIMENT_MODES = [
  'provider-default',
  'thinking-disabled',
] as const;
export const GENERATION_EXPERIMENT_MAX_REQUEST_BYTES = 24_000;
const MAX_OUTPUT_TOKENS = 1_200;
const MAX_ANSWER_CHARS = 12_000;
const MAX_RESPONSE_BYTES = 128_000;
const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const utf8Bytes = (value: string) => new TextEncoder().encode(value).byteLength;

const caseSchema = evaluationCaseSchema
  .extend({
    recentMessages: z
      .array(
        z
          .object({
            role: z.enum(['user', 'assistant']),
            content: z.string().min(1).max(2_000),
          })
          .strict(),
      )
      .max(4)
      .optional(),
    necessaryKnowledgeKeys: z
      .array(z.string().min(1).max(80))
      .max(16)
      .optional(),
  })
  .strict();
type GenerationCase = z.infer<typeof caseSchema>;
const casesSchema = z
  .array(caseSchema)
  .min(1)
  .max(100)
  .refine(
    (items) => new Set(items.map(({ id }) => id)).size === items.length,
    'Duplicate evaluation case',
  );

export interface GenerationExperimentProvider {
  baseUrl: string;
  secret: string;
  capsVerified: true;
  enabled: true;
}
export interface GenerationExperimentAttempt {
  order: number;
  originalCaseId: string;
  cohort: EvaluationCase['cohort'];
  repetition: number;
  mode: (typeof GENERATION_EXPERIMENT_MODES)[number];
  status:
    | 'completed'
    | 'provider-error'
    | 'timeout'
    | 'invalid-response'
    | 'blank-answer'
    | 'answer-too-long'
    | 'truncated-answer';
  latencyMs: number;
  requestedModel: string;
  responseModel: string | null;
  answer: string | null;
  finishReason: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  reasoningTokens: number | null;
  detailedUsage: {
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
    reasoningTokens: number | null;
  } | null;
  estimatedCostUsd: number | null;
  captureError: string | null;
  requestBytes: number;
}
export interface GenerationExperimentReport {
  version: 1;
  createdAt: string;
  mode: 'live';
  answerModel: string;
  orderSeed: string;
  cohort: 'generation-control';
  qualityVerified: false;
  captureOnly: true;
  caseVersion: string;
  fullConfigurationVersion: string;
  compactConfigurationVersion: string;
  sharedInstructionsVersion: number;
  compactKnowledgeSnapshot: Array<{
    key: string;
    version: number;
    content: string;
  }>;
  inputSnapshotHashes: Array<{
    originalCaseId: string;
    promptHash: string;
    instructionHash: string;
    compactKnowledgeHash: string;
  }>;
  limits: {
    calls: 42;
    maximumCostUsd: 2;
    conservativeCostBoundUsd: number;
    maximumRetries: 0;
    maximumOutputTokensPerCall: 1200;
    maximumRequestBytes: 24000;
    deadlineMs: 25000;
  };
  attempts: GenerationExperimentAttempt[];
  usage: {
    attemptedCalls: number;
    completedCalls: number;
    failedCalls: number;
    unknownCostCalls: number;
    knownCostSubtotalUsd: number;
    totalEstimatedCostUsd: number | null;
  };
}
export interface GenerationExperimentInput {
  cases: unknown;
  fullConfiguration: unknown;
  compactConfiguration: unknown;
  provider: GenerationExperimentProvider;
  answerModelKey?: string;
  orderSeed: string;
  now?: Date;
  post?: (url: string, init: RequestInit) => Promise<Response>;
}

function validateProvider(provider: GenerationExperimentProvider) {
  const url = new URL(provider.baseUrl);
  if (
    provider.enabled !== true ||
    provider.capsVerified !== true ||
    provider.secret.length < 32 ||
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !['', '/'].includes(url.pathname)
  )
    throw new Error(
      'Generation experiment requires verified enabled HTTPS provider configuration',
    );
  return url.origin;
}
function matchedConfigurations(fullInput: unknown, compactInput: unknown) {
  const full = operatorWorkConfigurationSchema.parse(fullInput);
  const compact = operatorWorkConfigurationSchema.parse(compactInput);
  const descriptors = (config: OperatorWorkConfiguration) => ({
    ...config,
    skills: config.skills.map(({ key, name, whenToUse }) => ({
      key,
      name,
      whenToUse,
    })),
  });
  if (hash(descriptors(full)) !== hash(descriptors(compact)))
    throw new Error(
      'Matched configurations may differ only in knowledge content/version',
    );
  return { full, compact };
}
function assigned(
  config: OperatorWorkConfiguration,
  cohort: EvaluationCase['cohort'],
) {
  const bot = config.bots.find((candidate) => candidate.kind === cohort);
  if (!bot) throw new Error('Cohort bot is not configured');
  const skills = config.skills.filter((skill) =>
    bot.skillKeys.includes(skill.key),
  );
  const prepared = prepareAssistantKnowledge(skills, 'inline');
  const instructions = composeAssistantInstructions({
    kind: cohort,
    businessInstructions: bot.instructions,
    skillCatalog: prepared.skillCatalog,
    suppliedKnowledge: prepared.suppliedKnowledge,
  });
  return { bot, skills, instructions };
}
function bodyFor(
  item: GenerationCase,
  config: OperatorWorkConfiguration,
  mode: GenerationExperimentAttempt['mode'],
) {
  const { instructions } = assigned(config, item.cohort);
  const originalMessages: ModelMessage[] = [
    ...(item.recentMessages ?? []),
    { role: 'user', content: item.prompt },
  ];
  const messages = fitAssistantHistory(instructions, originalMessages);
  if (messages.length !== originalMessages.length)
    throw new Error('Matched experiment history must fit without trimming');
  const body = {
    model: reviewedAnswerModel('gemma4-26b').nativeId,
    messages: [{ role: 'system', content: instructions }, ...messages],
    max_tokens: MAX_OUTPUT_TOKENS,
    ...(mode === 'thinking-disabled'
      ? { chat_template_kwargs: { enable_thinking: false } }
      : {}),
  };
  const serialized = JSON.stringify(body);
  const requestBytes = utf8Bytes(serialized);
  if (requestBytes > GENERATION_EXPERIMENT_MAX_REQUEST_BYTES)
    throw new Error(
      `Generation request exceeds ${GENERATION_EXPERIMENT_MAX_REQUEST_BYTES} UTF-8 bytes`,
    );
  return { body, serialized, requestBytes };
}
function callOrder(seed: string, cases: EvaluationCase[]) {
  const pairs = cases.flatMap((item) =>
    Array.from(
      { length: GENERATION_EXPERIMENT_REPETITIONS },
      (_, repetition) => ({ item, repetition: repetition + 1 }),
    ),
  );
  pairs.sort((a, b) =>
    hash([seed, a.item.id, a.repetition]).localeCompare(
      hash([seed, b.item.id, b.repetition]),
    ),
  );
  return pairs.flatMap(({ item, repetition }) => {
    const modes = [...GENERATION_EXPERIMENT_MODES].sort((a, b) =>
      hash([seed, item.id, repetition, a]).localeCompare(
        hash([seed, item.id, repetition, b]),
      ),
    );
    return modes.map((mode) => ({ item, repetition, mode }));
  });
}
const nullableCount = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
function parseResponse(raw: unknown) {
  if (!raw || typeof raw !== 'object') throw new Error('invalid');
  const response = raw as Record<string, unknown>;
  const choices = response.choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object')
    throw new Error('invalid');
  const choice = choices[0] as Record<string, unknown>;
  const message = choice.message;
  if (
    !message ||
    typeof message !== 'object' ||
    typeof (message as Record<string, unknown>).content !== 'string'
  )
    throw new Error('invalid');
  const usage =
    response.usage && typeof response.usage === 'object'
      ? (response.usage as Record<string, unknown>)
      : {};
  const details =
    usage.completion_tokens_details &&
    typeof usage.completion_tokens_details === 'object'
      ? (usage.completion_tokens_details as Record<string, unknown>)
      : null;
  const outputTokens = nullableCount(usage.completion_tokens);
  const rawReasoning = nullableCount(details?.reasoning_tokens);
  return {
    answer: (message as Record<string, unknown>).content as string,
    finishReason:
      typeof choice.finish_reason === 'string' ? choice.finish_reason : null,
    responseModel: typeof response.model === 'string' ? response.model : null,
    inputTokens: nullableCount(usage.prompt_tokens),
    outputTokens,
    totalTokens: nullableCount(usage.total_tokens),
    reasoningTokens:
      rawReasoning !== null &&
      (outputTokens === null || rawReasoning <= outputTokens)
        ? rawReasoning
        : null,
    detailedUsage:
      Object.keys(usage).length > 0
        ? {
            promptTokens: nullableCount(usage.prompt_tokens),
            completionTokens: outputTokens,
            totalTokens: nullableCount(usage.total_tokens),
            reasoningTokens:
              rawReasoning !== null &&
              (outputTokens === null || rawReasoning <= outputTokens)
                ? rawReasoning
                : null,
          }
        : null,
  };
}
async function boundedResponseText(response: Response): Promise<string> {
  if (!response.body) throw new Error('invalid-response');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error('invalid-response');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(merged);
}

/** Validate every request and the full 42-call bound before invoking the paid callback. */
export async function runGenerationControlExperiment(
  input: GenerationExperimentInput,
): Promise<GenerationExperimentReport> {
  const origin = validateProvider(input.provider);
  if (
    input.answerModelKey !== undefined &&
    input.answerModelKey !== 'gemma4-26b'
  )
    throw new Error('Only reviewed Gemma 4 is supported');
  const { full, compact } = matchedConfigurations(
    input.fullConfiguration,
    input.compactConfiguration,
  );
  const allCases = casesSchema.parse(input.cases);
  const cases = allCases.filter(({ id }) => id.startsWith('diagnostic.'));
  if (cases.length !== GENERATION_EXPERIMENT_CASES)
    throw new Error(
      'Generation experiment requires exactly seven diagnostic cases',
    );
  const exactCalls = cases.length * GENERATION_EXPERIMENT_REPETITIONS * 2;
  const bound =
    exactCalls *
    estimatedModelCostUsd(
      reviewedAnswerModel('gemma4-26b'),
      32_768,
      MAX_OUTPUT_TOKENS,
    );
  if (exactCalls !== 42 || bound > 2)
    throw new Error(
      'Generation experiment exceeds its combined capped-provider allowance',
    );
  // Full request preflight covers both conditions before any transport callback can run.
  const inputSnapshotHashes = cases.map((item) => {
    const { instructions, skills } = assigned(compact, item.cohort);
    const originalSkills = assigned(full, item.cohort).skills;
    if (
      !item.referenceKeys.length ||
      !originalSkills.length ||
      item.referenceKeys.some(
        (key) =>
          !originalSkills.some(
            (skill) => skill.key === key && skill.content.trim(),
          ),
      )
    )
      throw new Error('Every diagnostic requires complete approved references');
    return {
      originalCaseId: item.id,
      promptHash: hash({
        recentMessages: item.recentMessages ?? [],
        currentPrompt: item.prompt,
      }),
      instructionHash: hash(instructions),
      compactKnowledgeHash: hash(
        skills.map(({ key, version, content }) => ({ key, version, content })),
      ),
    };
  });
  for (const item of cases)
    for (const mode of GENERATION_EXPERIMENT_MODES)
      bodyFor(item, compact, mode);
  const plan = callOrder(input.orderSeed, cases);
  const post = input.post ?? fetch;
  const attempts: GenerationExperimentAttempt[] = [];
  for (const [index, planned] of plan.entries()) {
    const { item, mode, repetition } = planned;
    const { serialized, requestBytes } = bodyFor(item, compact, mode);
    const started = Date.now();
    const base: GenerationExperimentAttempt = {
      order: index + 1,
      originalCaseId: item.id,
      cohort: item.cohort,
      repetition,
      mode,
      status: 'provider-error',
      latencyMs: 0,
      requestedModel: reviewedAnswerModel('gemma4-26b').nativeId,
      responseModel: null,
      answer: null,
      finishReason: null,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      reasoningTokens: null,
      detailedUsage: null,
      estimatedCostUsd: null,
      captureError: null,
      requestBytes,
    };
    let signal: AbortSignal | undefined;
    try {
      signal = AbortSignal.timeout(25_000);
      const response = await post(`${origin}/v1/experiments/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${input.provider.secret}`,
          'content-type': 'application/json',
        },
        body: serialized,
        signal,
      });
      if (!response.ok) throw new Error('provider-error');
      const text = await boundedResponseText(response);
      let parsed: ReturnType<typeof parseResponse>;
      try {
        parsed = parseResponse(JSON.parse(text));
      } catch {
        throw new Error('invalid-response');
      }
      base.answer = parsed.answer;
      base.finishReason = parsed.finishReason;
      base.responseModel = parsed.responseModel;
      base.inputTokens = parsed.inputTokens;
      base.outputTokens = parsed.outputTokens;
      base.totalTokens = parsed.totalTokens;
      base.reasoningTokens = parsed.reasoningTokens;
      base.detailedUsage = parsed.detailedUsage;
      if (base.inputTokens !== null && base.outputTokens !== null)
        base.estimatedCostUsd = estimatedModelCostUsd(
          reviewedAnswerModel('gemma4-26b'),
          base.inputTokens,
          base.outputTokens,
        );
      if (parsed.responseModel !== reviewedAnswerModel('gemma4-26b').nativeId) {
        base.status = 'invalid-response';
        base.captureError = 'response-model-mismatch';
      } else if (!parsed.finishReason) {
        base.status = 'invalid-response';
        base.captureError = 'missing-finish-reason';
      } else if (parsed.finishReason === 'length') {
        base.status = 'truncated-answer';
        base.captureError = 'truncated-answer';
      } else if (parsed.finishReason !== 'stop') {
        base.status = 'invalid-response';
        base.captureError = 'unexpected-finish-reason';
      } else if (!parsed.answer.trim()) {
        base.status = 'blank-answer';
        base.captureError = 'blank-answer';
      } else if (parsed.answer.length > MAX_ANSWER_CHARS) {
        base.status = 'answer-too-long';
        base.captureError = 'answer-too-long';
      } else base.status = 'completed';
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      const sanitizedFailure = error instanceof Error ? error.message : '';
      base.status =
        name === 'TimeoutError' || name === 'AbortError' || signal?.aborted
          ? 'timeout'
          : sanitizedFailure === 'invalid-response'
            ? 'invalid-response'
            : 'provider-error';
      base.captureError = base.status;
    }
    base.latencyMs = Date.now() - started;
    attempts.push(base);
  }
  const unknownCostCalls = attempts.filter(
    ({ estimatedCostUsd }) => estimatedCostUsd === null,
  ).length;
  const knownCostSubtotalUsd = attempts.reduce(
    (sum, attempt) => sum + (attempt.estimatedCostUsd ?? 0),
    0,
  );
  return {
    version: 1,
    createdAt: (input.now ?? new Date()).toISOString(),
    mode: 'live',
    answerModel: reviewedAnswerModel('gemma4-26b').nativeId,
    orderSeed: input.orderSeed,
    cohort: 'generation-control',
    qualityVerified: false,
    captureOnly: true,
    caseVersion: hash(cases),
    fullConfigurationVersion: hash(full),
    compactConfigurationVersion: hash(compact),
    sharedInstructionsVersion: ASSISTANT_INSTRUCTIONS_VERSION,
    compactKnowledgeSnapshot: compact.skills.map(
      ({ key, version, content }) => ({ key, version, content }),
    ),
    inputSnapshotHashes,
    limits: {
      calls: 42,
      maximumCostUsd: 2,
      conservativeCostBoundUsd: bound,
      maximumRetries: 0,
      maximumOutputTokensPerCall: MAX_OUTPUT_TOKENS,
      maximumRequestBytes: GENERATION_EXPERIMENT_MAX_REQUEST_BYTES,
      deadlineMs: 25_000,
    },
    attempts,
    usage: {
      attemptedCalls: attempts.length,
      completedCalls: attempts.filter(({ status }) => status === 'completed')
        .length,
      failedCalls: attempts.filter(({ status }) => status !== 'completed')
        .length,
      unknownCostCalls,
      knownCostSubtotalUsd,
      totalEstimatedCostUsd: unknownCostCalls ? null : knownCostSubtotalUsd,
    },
  };
}

export function createGenerationExperimentReviewBatches(
  report: GenerationExperimentReport,
  casesInput: unknown,
  fullConfigurationInput: unknown,
  compactConfigurationInput: unknown,
) {
  const cases = casesSchema
    .parse(casesInput)
    .filter(({ id }) => id.startsWith('diagnostic.'));
  const full = operatorWorkConfigurationSchema.parse(fullConfigurationInput);
  const compact = operatorWorkConfigurationSchema.parse(
    compactConfigurationInput,
  );
  matchedConfigurations(full, compact);
  const byId = new Map(cases.map((item) => [item.id, item]));
  const expectedModel = reviewedAnswerModel('gemma4-26b').nativeId;
  const expectedAttempts = new Set(
    cases.flatMap(({ id }) =>
      Array.from({ length: GENERATION_EXPERIMENT_REPETITIONS }, (_, index) =>
        GENERATION_EXPERIMENT_MODES.map((mode) => `${id}:${index + 1}:${mode}`),
      ).flat(),
    ),
  );
  const actualAttempts = new Set<string>();
  if (
    cases.length !== GENERATION_EXPERIMENT_CASES ||
    report.mode !== 'live' ||
    report.answerModel !== expectedModel ||
    report.caseVersion !== hash(cases) ||
    report.fullConfigurationVersion !== hash(full) ||
    report.compactConfigurationVersion !== hash(compact) ||
    report.attempts.length !== 42 ||
    report.usage.attemptedCalls !== 42
  )
    throw new Error('Generation report does not match reviewed input versions');
  for (const [index, attempt] of report.attempts.entries()) {
    const item = byId.get(attempt.originalCaseId);
    const identity = `${attempt.originalCaseId}:${attempt.repetition}:${attempt.mode}`;
    if (
      !item ||
      !expectedAttempts.has(identity) ||
      actualAttempts.has(identity) ||
      attempt.order !== index + 1 ||
      attempt.cohort !== item.cohort ||
      attempt.requestedModel !== expectedModel ||
      (attempt.responseModel !== null &&
        attempt.responseModel !== expectedModel &&
        attempt.status !== 'invalid-response') ||
      (attempt.status === 'completed' &&
        (!attempt.answer?.trim() ||
          attempt.finishReason !== 'stop' ||
          attempt.responseModel !== expectedModel ||
          attempt.answer.length > MAX_ANSWER_CHARS))
    )
      throw new Error(
        'Generation report attempts failed identity or capture checks',
      );
    actualAttempts.add(identity);
  }
  if (actualAttempts.size !== expectedAttempts.size)
    throw new Error('Generation report is missing paired attempts');
  const sources: AgentReviewSource[] = report.attempts.flatMap((attempt) => {
    if (attempt.status !== 'completed') return [];
    const item = byId.get(attempt.originalCaseId)!;
    const originalSkills = assigned(full, item.cohort).skills;
    const question = item.recentMessages?.length
      ? `Recent conversation (untrusted data): ${JSON.stringify(item.recentMessages)}\nCurrent customer question: ${item.prompt}`
      : item.prompt;
    return [
      {
        sourceId: `${attempt.originalCaseId}:${attempt.repetition}:${attempt.mode}`,
        input: {
          cohort: item.cohort,
          question,
          answer: attempt.answer!,
          expectedBehavior: item.expectedBehavior,
          references: originalSkills.map(({ key, version, content }) => ({
            key,
            version,
            content,
          })),
          toolNames: [],
          toolTrace: [],
        },
        checks: [
          {
            dimension: 'capture.nonempty',
            passed: Boolean(attempt.answer?.trim()),
          },
          {
            dimension: 'capture.finish',
            passed: attempt.finishReason === 'stop',
          },
          {
            dimension: 'capture.model',
            passed: attempt.responseModel === expectedModel,
          },
        ],
      },
    ];
  });
  const salt = report.orderSeed;
  const batches: ReturnType<typeof createAgentReviewBatch>[] = [];
  for (let offset = 0; offset < sources.length; offset += 8)
    batches.push(
      createAgentReviewBatch(
        sources.slice(offset, offset + 8),
        `generation-${hash([report.createdAt, offset]).slice(0, 16)}`,
        `${salt}:${offset}`,
      ),
    );
  return batches;
}

export async function runGenerationControlExperimentCommand(
  argv: readonly string[],
  environment: NodeJS.ProcessEnv = process.env,
) {
  const { values } = parseArgs({
    args: [...argv],
    strict: true,
    options: {
      'fixture-module': { type: 'string' },
      'operator-defaults-module': { type: 'string' },
      'compact-defaults-module': { type: 'string' },
      'report-directory': { type: 'string' },
      'answer-model': { type: 'string', default: 'gemma4-26b' },
      'order-seed': { type: 'string' },
      live: { type: 'boolean', default: false },
      'confirm-model-cost': { type: 'boolean', default: false },
    },
  });
  const directory = values['report-directory']
    ? resolve(values['report-directory'])
    : '';
  if (
    !values['fixture-module'] ||
    !values['operator-defaults-module'] ||
    !values['compact-defaults-module'] ||
    !directory ||
    !/^projects\/[a-z0-9-]+\/.+/u.test(
      relative(process.cwd(), directory).replaceAll('\\', '/'),
    ) ||
    !values.live ||
    !values['confirm-model-cost'] ||
    values['answer-model'] !== 'gemma4-26b' ||
    environment.GENERATION_EXPERIMENTS_ENABLED !== 'true' ||
    environment.BFF_EVALUATION_CAPS_VERIFIED !== 'verified' ||
    !environment.BFF_EVALUATION_PROVIDER_URL ||
    !environment.BFF_EVALUATION_PROVIDER_SECRET
  )
    throw new Error(
      'Generation experiment requires exact Gemma, explicit authority, enabled development route and verified capped provider',
    );
  const [fixture, fullModule, compactModule] = await Promise.all([
    loadOperatorModule(values['fixture-module']),
    loadOperatorModule(values['operator-defaults-module']),
    loadOperatorModule(values['compact-defaults-module']),
  ]);
  const cases =
    fixture.knowledgeExperimentCases ??
    fixture.operatorEvaluations ??
    fixture.default;
  const report = await runGenerationControlExperiment({
    cases,
    fullConfiguration: fullModule.default ?? fullModule.operatorWorkDefaults,
    compactConfiguration:
      compactModule.default ?? compactModule.operatorWorkDefaults,
    provider: {
      baseUrl: environment.BFF_EVALUATION_PROVIDER_URL,
      secret: environment.BFF_EVALUATION_PROVIDER_SECRET,
      capsVerified: true,
      enabled: true,
    },
    answerModelKey: values['answer-model'],
    orderSeed: values['order-seed'] ?? hash(Date.now()),
  });
  const batches = createGenerationExperimentReviewBatches(
    report,
    cases,
    fullModule.default ?? fullModule.operatorWorkDefaults,
    compactModule.default ?? compactModule.operatorWorkDefaults,
  );
  await mkdir(directory, { recursive: true });
  const stem = `generation-control-${report.createdAt.replaceAll(':', '').replaceAll('.', '-')}`;
  const jsonPath = resolve(directory, `${stem}.json`);
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, {
    mode: 0o600,
    flag: 'wx',
  });
  const batchPaths: string[] = [];
  for (const [index, batch] of batches.entries()) {
    const packetPath = resolve(directory, `${stem}-review-${index + 1}.json`);
    const mappingPath = resolve(
      directory,
      `${stem}-review-${index + 1}-mapping.json`,
    );
    await writeFile(packetPath, `${JSON.stringify(batch.packet, null, 2)}\n`, {
      mode: 0o600,
      flag: 'wx',
    });
    const mappingWithContext = {
      ...batch.mapping,
      items: batch.mapping.items.map((entry) => {
        const [originalCaseId, repetition, mode] = entry.sourceId.split(':');
        return {
          ...entry,
          originalCaseId,
          repetition: Number(repetition),
          mode,
        };
      }),
    };
    await writeFile(
      mappingPath,
      `${JSON.stringify(mappingWithContext, null, 2)}\n`,
      { mode: 0o600, flag: 'wx' },
    );
    batchPaths.push(packetPath);
  }
  return { report, jsonPath, batchPaths };
}
