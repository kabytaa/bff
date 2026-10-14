import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, isStepCount, tool } from 'ai';
import type { ModelMessage, ToolSet } from 'ai';
import { z } from 'zod';
import {
  composeAssistantInstructions,
  fitAssistantHistory,
  prepareAssistantKnowledge,
} from '@bff/assistant/server';
import type { AssistantProvider } from '@bff/assistant/server';
import {
  estimatedModelCostUsd,
  reviewedAnswerModel,
} from '@bff/assistant/models';
import type { AnswerModelKey } from '@bff/assistant/models';
import {
  buildKnowledgeSelectionInput,
  KNOWLEDGE_SELECTION_MODEL,
  KNOWLEDGE_SELECTION_PRICING,
  parseKnowledgeSelectionRequest,
  parseKnowledgeSelectionResponse,
} from '@bff/assistant/knowledge-selection';
import type {
  KnowledgeSelectionRequest,
  KnowledgeSelectionResult,
} from '@bff/assistant/knowledge-selection';
import { operatorWorkConfigurationSchema } from '@bff/contracts';
import type { OperatorWorkConfiguration } from '@bff/contracts';
import {
  evaluationCaseSchema,
  evaluationExitCode,
  evaluationMarkdown,
  runEvaluationSuite,
} from './operatorEvaluation';
import type {
  EvaluationCase,
  EvaluationObservation,
  EvaluationReport,
} from './operatorEvaluation';
import { createAgentReviewBatch } from './operatorAgentReview';
import { loadOperatorModule } from './operatorWorkConfiguration';

export const knowledgeExperimentArms = [
  'full-inline',
  'compact-inline',
  'compact-lazy',
  'jev-compact',
] as const;
export type KnowledgeExperimentArm = (typeof knowledgeExperimentArms)[number];
const recentMessageSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(2_000),
  })
  .strict();
/** Optional dependencies are a manually reviewed diagnostic, never a retrieval oracle. */
export const knowledgeExperimentCaseSchema = evaluationCaseSchema
  .extend({
    recentMessages: z.array(recentMessageSchema).max(4).optional(),
    necessaryKnowledgeKeys: z
      .array(z.string().min(1).max(80))
      .max(16)
      .optional(),
  })
  .strict();
type ExperimentCase = z.infer<typeof knowledgeExperimentCaseSchema>;
const experimentCasesSchema = z
  .array(knowledgeExperimentCaseSchema)
  .min(1)
  .max(160)
  .refine(
    (cases) => new Set(cases.map(({ id }) => id)).size === cases.length,
    'Duplicate experiment case',
  );
const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).byteLength;

export interface KnowledgeExperimentModelStep {
  index: number;
  status: 'completed' | 'failed';
  model: string;
  responseModel?: string;
  reasoningTokens?: number | null;
  text?: string;
  finishReason?: string;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
  toolCalls: Array<{ toolCallId: string; toolName: string; input: unknown }>;
}
export interface KnowledgeExperimentAnswerCapture {
  observation: EvaluationObservation;
  steps: KnowledgeExperimentModelStep[];
}
export interface KnowledgeExperimentAnswerRequest {
  instructions: string;
  messages: ModelMessage[];
  skills: OperatorWorkConfiguration['skills'];
  lazy: boolean;
  maxSteps: 1 | 4;
  maxOutputTokens: 1200;
  maxRetries: 0;
}
export type KnowledgeExperimentAnswerer = (
  input: KnowledgeExperimentAnswerRequest,
) => Promise<KnowledgeExperimentAnswerCapture>;
/** A trusted adapter must make exactly one native request and no retries/fallback. */
export type KnowledgeExperimentSelector = (
  input: KnowledgeSelectionRequest,
) => Promise<unknown>;
interface SelectorRecord {
  status: 'completed' | 'invalid-response' | 'provider-error' | 'mock-not-run';
  requestedModel: typeof KNOWLEDGE_SELECTION_MODEL;
  model: string | null;
  latencyMs: number;
  selectedKeys: string[];
  effectiveKeys: string[];
  mandatoryKeys: string[];
  mandatoryKeysAdded: string[];
  probabilities: KnowledgeSelectionResult['probabilities'];
  fallback: boolean;
  fallbackReason?:
    | KnowledgeSelectionResult['fallbackReason']
    | 'invalid-response'
    | 'provider-error'
    | 'mock-not-run';
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
  inputBytes: number;
}
export interface KnowledgeExperimentAttempt {
  id: string;
  arm: KnowledgeExperimentArm;
  order: number;
  selector?: SelectorRecord;
  steps: KnowledgeExperimentModelStep[];
  toolTrace: unknown[];
  endToEndLatencyMs: number;
  suppliedKeys: string[];
  loadedKeys: string[];
  /** Empty unless the caller supplied manually reviewed fact dependencies. */
  missingNecessaryKnowledgeKeys: string[];
  observation?: EvaluationObservation;
  error?: 'answer-generation-failed';
}
export interface KnowledgeExperimentReport {
  version: 1;
  createdAt: string;
  mode: 'mock' | 'live';
  answerModel: string;
  orderSeed: string;
  qualityVerified: false;
  captureOnly: true;
  mandatorySkillKeys: string[];
  caseVersion: string;
  fullConfigurationVersion: string;
  compactConfigurationVersion: string;
  limits: {
    maximumCostUsd: 2;
    conservativeCostBoundUsd: number;
    maximumSelectorCalls: number;
    maximumSelectorQuestionsPerCall: number;
    maximumAnswerCalls: number;
    maximumRetries: 0;
    maximumOutputTokensPerCall: 1200;
  };
  attempts: KnowledgeExperimentAttempt[];
  /** Existing reports remain compatible with the normal blinded-review tooling. */
  arms: Array<{ arm: KnowledgeExperimentArm; report: EvaluationReport }>;
  usage: {
    /** Null when an injected failed adapter did not return its attempted-call trace. */
    attemptedAnswerCalls: number | null;
    capturedAnswerCalls: number;
    unknownAnswerCallAttempts: number;
    attemptedSelectorCalls: number;
    knownInputTokens: number;
    knownOutputTokens: number;
    knownEstimatedCostUsd: number;
    unknownUsageCalls: number;
    totalEstimatedCostUsd: number | null;
    selectorFallbacks: number;
    selectorInvalidResponses: number;
    selectorProviderErrors: number;
  };
}

/** Full input headroom for every paid answer/selector call, including failed calls. */
export function knowledgeExperimentCostBound(
  caseCount: number,
  answerModelKey: AnswerModelKey = 'gemma4-26b',
  maximumSelectorSections = 16,
): number {
  if (!Number.isSafeInteger(caseCount) || caseCount < 1 || caseCount > 160)
    throw new Error('Invalid experiment case count');
  if (
    !Number.isSafeInteger(maximumSelectorSections) ||
    maximumSelectorSections < 1 ||
    maximumSelectorSections > 16
  )
    throw new Error('Invalid selector section bound');
  // Three one-step arms, one four-step lazy arm, and one Jev selection per case.
  return (
    caseCount *
    (7 *
      estimatedModelCostUsd(reviewedAnswerModel(answerModelKey), 32_768, 1200) +
      (maximumSelectorSections *
        32_768 *
        KNOWLEDGE_SELECTION_PRICING.inputUsdPerMillion) /
        1_000_000)
  );
}

class AnswerCaptureFailure extends Error {
  constructor(public readonly capture: KnowledgeExperimentAnswerCapture) {
    super('Answer generation failed; private provider details withheld');
  }
}
class InvalidSelectorResponse extends Error {
  constructor() {
    super('Private selector response failed validation');
  }
}
const measuredToken = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
function completeUsage(
  steps: KnowledgeExperimentModelStep[],
): EvaluationObservation['usage'] {
  return {
    ...(steps.every(({ inputTokens }) => inputTokens !== null)
      ? { inputTokens: steps.reduce((sum, step) => sum + step.inputTokens!, 0) }
      : {}),
    ...(steps.every(({ outputTokens }) => outputTokens !== null)
      ? {
          outputTokens: steps.reduce(
            (sum, step) => sum + step.outputTokens!,
            0,
          ),
        }
      : {}),
  };
}

/** Isolated adapter: shared prompts/bounds, actual SDK steps, and no browser/customer tools. */
export function createKnowledgeExperimentAnswerer(options: {
  mode: 'mock' | 'live';
  answerModelKey?: AnswerModelKey;
  provider?: AssistantProvider;
  /** Evaluation transport owns pacing and per-network timeout after scheduling. */
  fetch?: typeof globalThis.fetch;
}): KnowledgeExperimentAnswerer {
  const model = reviewedAnswerModel(options.answerModelKey ?? 'gemma4-26b');
  let provider: ReturnType<typeof createOpenAICompatible> | undefined;
  if (options.mode === 'live') {
    const config = options.provider;
    if (!config?.capsVerified || config.secret.length < 32)
      throw new Error(
        'Live experiment requires verified capped private provider',
      );
    const url = new URL(config.baseUrl);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    )
      throw new Error('Invalid private experiment provider configuration');
    provider = createOpenAICompatible({
      name: 'bff-knowledge-experiment',
      baseURL: `${url.origin}/v1`,
      apiKey: config.secret,
      ...(options.fetch ? { fetch: options.fetch } : {}),
    });
  }
  return async (input) => {
    if (
      input.maxRetries !== 0 ||
      input.maxOutputTokens !== 1200 ||
      input.maxSteps !== (input.lazy ? 4 : 1)
    )
      throw new Error('Invalid experiment generation bounds');
    fitAssistantHistory(input.instructions, input.messages);
    if (options.mode === 'mock')
      return {
        observation: {
          text: '[Development mock] Knowledge experiment wiring only.',
          toolNames: [],
          mocked: true,
          model: 'development-mock',
          modelCalls: 0,
          usage: {},
          latencyMs: 0,
          finishReason: 'stop',
        },
        steps: [],
      };
    const started = performance.now();
    const steps: KnowledgeExperimentModelStep[] = [];
    const toolTrace: Array<{
      toolName: string;
      input: { key: string };
      output?: { key: string; version: number; content: string };
      status: 'completed' | 'denied';
    }> = [];
    const tools: ToolSet = input.lazy
      ? {
          loadSkill: tool({
            inputSchema: z.object({ key: z.string() }).strict(),
            execute: async ({ key }) => {
              const skill = input.skills.find(
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
        }
      : {};
    const makeObservation = (
      text: string,
      finishReason: string,
    ): EvaluationObservation => ({
      text,
      finishReason,
      mocked: false,
      model: model.nativeId,
      modelCalls: steps.length,
      latencyMs: Math.round(performance.now() - started),
      usage: completeUsage(steps),
      toolNames: [...new Set(toolTrace.map(({ toolName }) => toolName))],
      toolTrace,
    });
    let stepStarted = started;
    try {
      const result = await generateText({
        model: provider!(model.nativeId),
        instructions: input.instructions,
        messages: input.messages,
        tools,
        maxOutputTokens: input.maxOutputTokens,
        maxRetries: 0,
        stopWhen: isStepCount(input.maxSteps),
        // A finite workflow bound includes pacing and every permitted tool step.
        // The paced transport starts its network clock only after a rate slot.
        timeout: options.fetch
          ? { totalMs: input.maxSteps * 70_000, stepMs: 70_000 }
          : { totalMs: input.maxSteps * 25_000, stepMs: 25_000 },
        prepareStep: ({ stepNumber, messages }) => {
          if (stepNumber >= input.maxSteps)
            throw new Error('Experiment call bound exceeded');
          if (
            input.lazy &&
            stepNumber > 0 &&
            !toolTrace.some((entry) => entry.status === 'completed')
          )
            throw new Error('Required knowledge was not loaded');
          return {
            messages: fitAssistantHistory(input.instructions, messages),
            ...(input.lazy && stepNumber === 0
              ? { activeTools: ['loadSkill'], toolChoice: 'required' as const }
              : {}),
          };
        },
        onLanguageModelCallStart: () => {
          if (steps.length >= input.maxSteps)
            throw new Error('Experiment call bound exceeded');
          stepStarted = performance.now();
          steps.push({
            index: steps.length,
            status: 'failed',
            model: model.nativeId,
            latencyMs: 0,
            inputTokens: null,
            outputTokens: null,
            estimatedCostUsd: null,
            toolCalls: [],
          });
        },
        onStepEnd: (step) => {
          const record = steps.at(-1)!;
          const inputTokens = measuredToken(step.usage.inputTokens);
          const outputTokens = measuredToken(step.usage.outputTokens);
          Object.assign(record, {
            status: 'completed',
            text: step.text,
            finishReason: step.finishReason,
            latencyMs: Math.round(performance.now() - stepStarted),
            inputTokens,
            outputTokens,
            reasoningTokens: measuredToken(
              step.usage.outputTokenDetails?.reasoningTokens,
            ),
            ...(typeof step.response?.modelId === 'string' &&
            step.response.modelId.length <= 200
              ? { responseModel: step.response.modelId }
              : {}),
            estimatedCostUsd:
              inputTokens !== null && outputTokens !== null
                ? estimatedModelCostUsd(model, inputTokens, outputTokens)
                : null,
            toolCalls: step.toolCalls.map(
              ({ toolCallId, toolName, input: arguments_ }) => ({
                toolCallId,
                toolName,
                input: arguments_,
              }),
            ),
          });
        },
      });
      if (
        input.lazy &&
        !toolTrace.some((entry) => entry.status === 'completed')
      )
        throw new Error('Required knowledge was not loaded');
      const observation = makeObservation(result.text, result.finishReason);
      observation.toolNames = [
        ...new Set([
          ...observation.toolNames,
          ...steps.flatMap((step) =>
            step.toolCalls.map(({ toolName }) => toolName),
          ),
        ]),
      ];
      return { observation, steps };
    } catch {
      if (steps.at(-1)?.status === 'failed')
        steps.at(-1)!.latencyMs = Math.round(performance.now() - stepStarted);
      throw new AnswerCaptureFailure({
        observation: makeObservation('', 'error'),
        steps,
      });
    }
  };
}

/** Uses the private evaluation-only route; never a Cloudflare setup credential. */
export function createKnowledgeExperimentSelector(
  provider: AssistantProvider,
  transportFetch?: typeof globalThis.fetch,
): KnowledgeExperimentSelector {
  const url = new URL(provider.baseUrl);
  if (
    !provider.capsVerified ||
    provider.secret.length < 32 ||
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error('Invalid capped private selector provider');
  return async (request) => {
    buildKnowledgeSelectionInput(request);
    const response = await (transportFetch ?? fetch)(
      `${url.origin}/v1/knowledge-selection`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${provider.secret}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(request),
        // A paced transport applies a fresh 25s network deadline after its queue.
        signal: AbortSignal.timeout(transportFetch ? 70_000 : 25_000),
      },
    );
    if (!response.ok) {
      // Only the bridge's fixed error code survives; never persist raw details.
      const failure = z
        .object({
          error: z
            .object({
              code: z.literal('INVALID_PROVIDER_OUTPUT'),
              message: z.literal('INVALID_PROVIDER_OUTPUT'),
              type: z.literal('provider_error'),
            })
            .strict(),
        })
        .strict()
        .safeParse(await response.json().catch(() => null));
      if (response.status === 502 && failure.success)
        throw new InvalidSelectorResponse();
      throw new Error('Private selector provider unavailable');
    }
    return (await response.json()) as unknown;
  };
}

function matchedConfigurations(fullInput: unknown, compactInput: unknown) {
  const full = operatorWorkConfigurationSchema.parse(fullInput);
  const compact = operatorWorkConfigurationSchema.parse(compactInput);
  const definitions = (configuration: OperatorWorkConfiguration) => ({
    ...configuration,
    skills: configuration.skills.map(({ key, name, whenToUse }) => ({
      key,
      name,
      whenToUse,
    })),
  });
  if (hash(definitions(full)) !== hash(definitions(compact)))
    throw new Error(
      'Matched configurations may differ only in knowledge content/version',
    );
  return { full, compact };
}
function assigned(
  configuration: OperatorWorkConfiguration,
  cohort: EvaluationCase['cohort'],
) {
  const bot = configuration.bots.find((candidate) => candidate.kind === cohort);
  if (!bot) throw new Error('Cohort bot is not configured');
  return {
    bot,
    skills: configuration.skills.filter((skill) =>
      bot.skillKeys.includes(skill.key),
    ),
  };
}
function requestFor(
  item: ExperimentCase,
  skills: OperatorWorkConfiguration['skills'],
): KnowledgeSelectionRequest {
  return parseKnowledgeSelectionRequest({
    question: item.prompt,
    skills: skills.map(({ key, name, whenToUse }) => ({
      key,
      name,
      whenToUse,
    })),
    ...(item.recentMessages ? { recentMessages: item.recentMessages } : {}),
  });
}

export async function runKnowledgeExperiment(input: {
  cases: unknown;
  fullConfiguration: unknown;
  compactConfiguration: unknown;
  mandatorySkillKeys: readonly string[];
  mode?: 'mock' | 'live';
  answerModelKey?: AnswerModelKey;
  answer?: KnowledgeExperimentAnswerer;
  selectKnowledge?: KnowledgeExperimentSelector;
  liveAuthority?: { confirmModelCost: true; capsVerified: true };
  orderSeed?: string;
  now?: Date;
}): Promise<KnowledgeExperimentReport> {
  const mode = input.mode ?? 'mock';
  const model = reviewedAnswerModel(input.answerModelKey ?? 'gemma4-26b');
  const cases = experimentCasesSchema.parse(input.cases);
  const { full, compact } = matchedConfigurations(
    input.fullConfiguration,
    input.compactConfiguration,
  );
  const mandatory = z
    .array(z.string().min(1).max(80))
    .min(1)
    .max(16)
    .parse(input.mandatorySkillKeys);
  if (new Set(mandatory).size !== mandatory.length)
    throw new Error('Duplicate mandatory knowledge');
  const maximumSelectorSections = Math.max(
    ...cases.map((item) => assigned(compact, item.cohort).skills.length),
  );
  const bound = knowledgeExperimentCostBound(
    cases.length,
    model.key,
    maximumSelectorSections,
  );
  if (
    mode === 'live' &&
    (bound > 2 ||
      !input.liveAuthority?.confirmModelCost ||
      !input.liveAuthority.capsVerified ||
      !input.answer ||
      !input.selectKnowledge)
  )
    throw new Error(
      'Live experiment requires explicit capped authority/adapters within its combined $2 bound',
    );
  // Validate every full/compact/fallback payload before the first selector or answer callback.
  for (const item of cases) {
    for (const configuration of [full, compact]) {
      const { bot, skills } = assigned(configuration, item.cohort);
      if (mandatory.some((key) => !skills.some((skill) => skill.key === key)))
        throw new Error(
          'Mandatory knowledge must be assigned to every evaluated role',
        );
      if (
        item.necessaryKnowledgeKeys?.some(
          (key) => !skills.some((skill) => skill.key === key),
        )
      )
        throw new Error('Unknown manually reviewed fact dependency');
      const knowledge = prepareAssistantKnowledge(skills, 'inline');
      const instructions = composeAssistantInstructions({
        kind: item.cohort,
        businessInstructions: bot.instructions,
        skillCatalog: knowledge.skillCatalog,
        suppliedKnowledge: knowledge.suppliedKnowledge,
      });
      const messages: ModelMessage[] = [
        ...(item.recentMessages ?? []),
        { role: 'user', content: item.prompt },
      ];
      if (
        fitAssistantHistory(instructions, messages).length !== messages.length
      )
        throw new Error('Matched experiment history must fit without trimming');
    }
    buildKnowledgeSelectionInput(
      requestFor(item, assigned(compact, item.cohort).skills),
    );
  }
  const answer =
    input.answer ??
    createKnowledgeExperimentAnswerer({
      mode: 'mock',
      answerModelKey: model.key,
    });
  const now = input.now ?? new Date();
  const seed = input.orderSeed ?? hash(now.toISOString());
  const attempts: KnowledgeExperimentAttempt[] = [];
  for (const [caseIndex, item] of cases.entries()) {
    // Rotate a seeded arm order per case to avoid assigning every arm one time window.
    const initial = [...knowledgeExperimentArms].sort((a, b) =>
      hash([seed, a]).localeCompare(hash([seed, b])),
    );
    const shift = caseIndex % initial.length;
    const order = [...initial.slice(shift), ...initial.slice(0, shift)];
    for (const arm of order) {
      const started = performance.now();
      const { bot, skills: allSkills } = assigned(
        arm === 'full-inline' ? full : compact,
        item.cohort,
      );
      let skills = allSkills;
      let selector: SelectorRecord | undefined;
      if (arm === 'jev-compact') {
        const request = requestFor(item, allSkills);
        const nativeInput = buildKnowledgeSelectionInput(request);
        const selectorStarted = performance.now();
        let selected: KnowledgeSelectionResult | undefined;
        let status: SelectorRecord['status'] =
          mode === 'mock' ? 'mock-not-run' : 'provider-error';
        let usage: { inputTokens?: number; outputTokens?: number } = {};
        if (mode === 'live') {
          try {
            const raw = await input.selectKnowledge!(request);
            status = 'invalid-response';
            // Preserve valid measured tokens even if the relevance payload is rejected.
            if (
              typeof raw === 'object' &&
              raw !== null &&
              'usage' in raw &&
              typeof raw.usage === 'object' &&
              raw.usage !== null
            ) {
              const rawUsage = raw.usage as Record<string, unknown>;
              const inputTokens = measuredToken(rawUsage.input_tokens);
              const outputTokens = measuredToken(rawUsage.output_tokens);
              usage = {
                ...(inputTokens !== null ? { inputTokens } : {}),
                ...(outputTokens !== null ? { outputTokens } : {}),
              };
            }
            selected = parseKnowledgeSelectionResponse(raw, request);
            usage = selected.usage;
            status = 'completed';
          } catch (failure) {
            if (failure instanceof InvalidSelectorResponse)
              status = 'invalid-response';
            /* Safe full-compact fallback; private/raw errors are never persisted. */
          }
        }
        const fallback = !selected || selected.fallback;
        const selectedKeys = selected?.selectedKeys ?? [];
        const effectiveKeys = fallback
          ? allSkills.map(({ key }) => key)
          : allSkills
              .filter(
                ({ key }) =>
                  selectedKeys.includes(key) || mandatory.includes(key),
              )
              .map(({ key }) => key);
        skills = allSkills.filter(({ key }) => effectiveKeys.includes(key));
        selector = {
          status,
          requestedModel: KNOWLEDGE_SELECTION_MODEL,
          model: selected?.model ?? null,
          latencyMs: Math.round(performance.now() - selectorStarted),
          selectedKeys,
          effectiveKeys,
          mandatoryKeys: [...mandatory],
          mandatoryKeysAdded: mandatory.filter(
            (key) => !selectedKeys.includes(key),
          ),
          probabilities: selected?.probabilities ?? {},
          fallback,
          ...(fallback
            ? {
                fallbackReason:
                  selected?.fallbackReason ??
                  (status as
                    'invalid-response' | 'provider-error' | 'mock-not-run'),
              }
            : {}),
          inputTokens: usage.inputTokens ?? null,
          outputTokens: usage.outputTokens ?? null,
          estimatedCostUsd:
            usage.inputTokens !== undefined && usage.outputTokens !== undefined
              ? (usage.inputTokens *
                  KNOWLEDGE_SELECTION_PRICING.inputUsdPerMillion) /
                1_000_000
              : null,
          inputBytes: bytes(nativeInput),
        };
      }
      const lazy = arm === 'compact-lazy';
      const knowledge = prepareAssistantKnowledge(
        skills,
        lazy ? 'lazy' : 'inline',
      );
      const instructions = composeAssistantInstructions({
        kind: item.cohort,
        businessInstructions: bot.instructions,
        skillCatalog: knowledge.skillCatalog,
        suppliedKnowledge: knowledge.suppliedKnowledge,
      });
      let capture: KnowledgeExperimentAnswerCapture | undefined;
      let error: KnowledgeExperimentAttempt['error'];
      try {
        capture = await answer({
          instructions,
          messages: [
            ...(item.recentMessages ?? []),
            { role: 'user', content: item.prompt },
          ],
          skills,
          lazy,
          maxSteps: lazy ? 4 : 1,
          maxOutputTokens: 1200,
          maxRetries: 0,
        });
        if (
          capture.observation.mocked !== (mode === 'mock') ||
          (mode === 'live' && capture.steps.length < 1) ||
          capture.steps.length > (lazy ? 4 : 1) ||
          capture.observation.modelCalls !== capture.steps.length ||
          (mode === 'live' &&
            (capture.observation.model !== model.nativeId ||
              capture.steps.some((step) => step.model !== model.nativeId)))
        )
          throw new Error('Answer capture model/mode/call mismatch');
      } catch (failure) {
        capture =
          failure instanceof AnswerCaptureFailure ? failure.capture : undefined;
        error = 'answer-generation-failed';
      }
      const loadedKeys = (capture?.observation.toolTrace ?? []).flatMap(
        (entry) => {
          if (
            typeof entry !== 'object' ||
            entry === null ||
            !('status' in entry) ||
            entry.status !== 'completed' ||
            !('output' in entry) ||
            typeof entry.output !== 'object' ||
            entry.output === null ||
            !('key' in entry.output) ||
            typeof entry.output.key !== 'string'
          )
            return [];
          return [entry.output.key];
        },
      );
      const suppliedKeys = lazy ? [] : skills.map(({ key }) => key);
      attempts.push({
        id: item.id,
        arm,
        order: attempts.length,
        ...(selector ? { selector } : {}),
        steps: capture?.steps ?? [],
        toolTrace: capture?.observation.toolTrace ?? [],
        endToEndLatencyMs: Math.round(performance.now() - started),
        suppliedKeys,
        loadedKeys: [...new Set(loadedKeys)],
        missingNecessaryKnowledgeKeys: (
          item.necessaryKnowledgeKeys ?? []
        ).filter((key) => ![...suppliedKeys, ...loadedKeys].includes(key)),
        ...(capture && !error ? { observation: capture.observation } : {}),
        ...(error ? { error } : {}),
      });
    }
  }
  const plainCases = cases.map(
    ({
      id,
      cohort,
      split,
      prompt,
      expected,
      tags,
      referenceKeys,
      expectedBehavior,
    }) => ({
      id,
      cohort,
      split,
      prompt,
      expected,
      tags,
      referenceKeys,
      expectedBehavior,
    }),
  );
  const arms: KnowledgeExperimentReport['arms'] = [];
  for (const arm of knowledgeExperimentArms) {
    const report = await runEvaluationSuite({
      cases: plainCases,
      mode,
      captureOnly: true,
      configuration: full,
      answerModelKey: model.key,
      knowledgeMode: arm === 'compact-lazy' ? 'lazy' : 'inline',
      now,
      // The complete original approved corpus is the judge's truth in every arm.
      resolveReferences: () =>
        full.skills.map(({ key, version, content }) => ({
          key,
          version,
          content,
        })),
      evaluate: async ({ id }) => {
        const attempt = attempts.find(
          (candidate) => candidate.id === id && candidate.arm === arm,
        )!;
        if (!attempt.observation || attempt.error)
          throw new Error('Answer capture unavailable');
        return attempt.observation;
      },
    });
    for (const result of report.results) {
      const item = cases.find(({ id }) => id === result.id)!;
      if (item.recentMessages?.length)
        result.question = `Recent conversation (untrusted data): ${JSON.stringify(item.recentMessages)}\nCurrent customer question: ${item.prompt}`;
    }
    const sourceConfiguration = arm === 'full-inline' ? full : compact;
    report.configurationVersion = hash(sourceConfiguration);
    report.knowledgeVersions = sourceConfiguration.skills.map(
      ({ key, version, content }) => ({
        key,
        version,
        contentHash: hash(content),
      }),
    );
    arms.push({ arm, report });
  }
  const steps = attempts.flatMap(({ steps }) => steps);
  const selectors = attempts.flatMap(({ selector }) =>
    selector && selector.status !== 'mock-not-run' ? [selector] : [],
  );
  const usageRecords = [...steps, ...selectors];
  const unknownAnswerCallAttempts =
    mode === 'live'
      ? attempts.filter((attempt) => attempt.error && !attempt.steps.length)
          .length
      : 0;
  const unknownUsageCalls =
    usageRecords.filter(({ estimatedCostUsd }) => estimatedCostUsd === null)
      .length + unknownAnswerCallAttempts;
  const knownEstimatedCostUsd = usageRecords.reduce(
    (sum, record) => sum + (record.estimatedCostUsd ?? 0),
    0,
  );
  return {
    version: 1,
    createdAt: now.toISOString(),
    mode,
    answerModel: model.nativeId,
    orderSeed: seed,
    qualityVerified: false,
    captureOnly: true,
    mandatorySkillKeys: mandatory,
    caseVersion: hash(cases),
    fullConfigurationVersion: hash(full),
    compactConfigurationVersion: hash(compact),
    limits: {
      maximumCostUsd: 2,
      conservativeCostBoundUsd: mode === 'mock' ? 0 : bound,
      maximumSelectorCalls: cases.length,
      maximumSelectorQuestionsPerCall: maximumSelectorSections,
      maximumAnswerCalls: cases.length * 7,
      maximumRetries: 0,
      maximumOutputTokensPerCall: 1200,
    },
    attempts,
    arms,
    usage: {
      attemptedAnswerCalls: unknownAnswerCallAttempts ? null : steps.length,
      capturedAnswerCalls: steps.length,
      unknownAnswerCallAttempts,
      attemptedSelectorCalls: selectors.length,
      knownInputTokens: usageRecords.reduce(
        (sum, record) => sum + (record.inputTokens ?? 0),
        0,
      ),
      knownOutputTokens: usageRecords.reduce(
        (sum, record) => sum + (record.outputTokens ?? 0),
        0,
      ),
      knownEstimatedCostUsd,
      unknownUsageCalls,
      totalEstimatedCostUsd: unknownUsageCalls ? null : knownEstimatedCostUsd,
      selectorFallbacks: selectors.filter(({ fallback }) => fallback).length,
      selectorInvalidResponses: selectors.filter(
        ({ status }) => status === 'invalid-response',
      ).length,
      selectorProviderErrors: selectors.filter(
        ({ status }) => status === 'provider-error',
      ).length,
    },
  };
}

/** Randomized opaque packets use existing controls/rubric; context mode stays in mappings. */
export function createKnowledgeExperimentReviewBatches(
  report: KnowledgeExperimentReport,
  shuffleSalt: string,
  batchSize = 24,
) {
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 32)
    throw new Error('Invalid blinded review batch size');
  const isKnowledgeTrace = (value: unknown) =>
    typeof value === 'object' &&
    value !== null &&
    'toolName' in value &&
    value.toolName === 'loadSkill';
  const sources = report.arms
    .flatMap(({ arm, report: suite }) =>
      suite.results.flatMap((result) =>
        result.observation?.text.trim()
          ? [
              {
                sourceId: `${arm}:${result.id}`,
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
                    (trace) => !isKnowledgeTrace(trace),
                  ),
                },
                checks: result.checks,
                hiddenKnowledgeToolEvidence: {
                  toolNames: result.observation.toolNames.filter(
                    (name) => name === 'loadSkill',
                  ),
                  toolTrace: (result.observation.toolTrace ?? []).filter(
                    isKnowledgeTrace,
                  ),
                },
              },
            ]
          : [],
      ),
    )
    .sort((a, b) =>
      hash([shuffleSalt, a.sourceId]).localeCompare(
        hash([shuffleSalt, b.sourceId]),
      ),
    );
  const batches: ReturnType<typeof createAgentReviewBatch>[] = [];
  for (let offset = 0; offset < sources.length; offset += batchSize)
    batches.push(
      createAgentReviewBatch(
        sources.slice(offset, offset + batchSize),
        `knowledge-${hash([report.createdAt, offset]).slice(0, 16)}`,
        `${shuffleSalt}:${offset}`,
      ),
    );
  return batches;
}

/** Completed capture checks are required; semantic quality is still unjudged. */
export function knowledgeExperimentExitCode(
  report: KnowledgeExperimentReport,
): 0 | 1 {
  return report.usage.selectorProviderErrors ||
    report.usage.selectorInvalidResponses ||
    report.arms.some(({ report: suite }) => evaluationExitCode(suite))
    ? 1
    : 0;
}

export async function runKnowledgeExperimentCommand(
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
      'selector-module': { type: 'string' },
      'mandatory-skill': { type: 'string', multiple: true },
      'case-id': { type: 'string', multiple: true },
      'answer-model': { type: 'string', default: 'gemma4-26b' },
      'order-seed': { type: 'string' },
      live: { type: 'boolean', default: false },
      'confirm-model-cost': { type: 'boolean', default: false },
    },
  });
  if (
    !values['fixture-module'] ||
    !values['operator-defaults-module'] ||
    !values['compact-defaults-module'] ||
    !values['report-directory'] ||
    !values['mandatory-skill']?.length
  )
    throw new Error(
      'Experiment requires fixture/full/compact modules, mandatory skills and a Business report directory',
    );
  const directory = resolve(values['report-directory']);
  if (
    !/^projects\/[a-z0-9-]+\/.+/u.test(
      relative(process.cwd(), directory).replaceAll('\\', '/'),
    )
  )
    throw new Error('Experiment reports must stay beside Business code');
  const mode = values.live ? 'live' : 'mock';
  if (
    mode === 'live' &&
    (!values['confirm-model-cost'] ||
      environment.BFF_EVALUATION_CAPS_VERIFIED !== 'verified' ||
      !environment.BFF_EVALUATION_PROVIDER_URL ||
      !environment.BFF_EVALUATION_PROVIDER_SECRET)
  )
    throw new Error(
      'Live experiment requires explicit authority, capped private provider and a trusted selector adapter',
    );
  const fixture = await loadOperatorModule(values['fixture-module']);
  const full = await loadOperatorModule(values['operator-defaults-module']);
  const compact = await loadOperatorModule(values['compact-defaults-module']);
  const cases = experimentCasesSchema.parse(
    fixture.knowledgeExperimentCases ??
      fixture.operatorEvaluations ??
      fixture.default,
  );
  if (values['case-id']?.some((id) => !cases.some((item) => item.id === id)))
    throw new Error('Unknown experiment case');
  const selectedCases = values['case-id']
    ? cases.filter(({ id }) => values['case-id']!.includes(id))
    : cases;
  const answerModel = reviewedAnswerModel(values['answer-model']);
  const selectorModule =
    mode === 'live' && values['selector-module']
      ? await loadOperatorModule(values['selector-module'])
      : undefined;
  if (selectorModule && typeof selectorModule.selectKnowledge !== 'function')
    throw new Error('Selector adapter must export selectKnowledge');
  const provider =
    mode === 'live'
      ? {
          baseUrl: environment.BFF_EVALUATION_PROVIDER_URL!,
          secret: environment.BFF_EVALUATION_PROVIDER_SECRET!,
          capsVerified: true,
        }
      : undefined;
  const answer = createKnowledgeExperimentAnswerer({
    mode,
    answerModelKey: answerModel.key,
    ...(provider ? { provider } : {}),
  });
  const report = await runKnowledgeExperiment({
    cases: selectedCases,
    fullConfiguration: full.default ?? full.operatorWorkDefaults,
    compactConfiguration: compact.default ?? compact.operatorWorkDefaults,
    mandatorySkillKeys: values['mandatory-skill'],
    mode,
    answerModelKey: answerModel.key,
    answer,
    ...(provider
      ? {
          selectKnowledge: selectorModule
            ? (selectorModule.selectKnowledge as KnowledgeExperimentSelector)
            : createKnowledgeExperimentSelector(provider),
          liveAuthority: { confirmModelCost: true, capsVerified: true },
        }
      : {}),
    ...(values['order-seed'] ? { orderSeed: values['order-seed'] } : {}),
  });
  await mkdir(directory, { recursive: true });
  const stamp = report.createdAt
    .replaceAll(/[-:.]/gu, '')
    .replace('T', '-')
    .replace('Z', '');
  const jsonPath = resolve(directory, `${stamp}-knowledge-${mode}.json`);
  const markdownPath = resolve(directory, `${stamp}-knowledge-${mode}.md`);
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, {
    flag: 'wx',
  });
  await writeFile(
    markdownPath,
    `# Matched knowledge experiment\n\nCreated: ${report.createdAt}. Mode: ${mode}. UNJUDGED capture; quality remains unverified.\n\nMandatory server-owned sections: ${report.mandatorySkillKeys.join(', ')}. Judge references: unchanged full approved knowledge.\n\nConservative combined bound: $${report.limits.conservativeCostBoundUsd.toFixed(6)}; maximum $2, retries 0. Known measured estimate: $${report.usage.knownEstimatedCostUsd.toFixed(6)}; unknown usage calls: ${report.usage.unknownUsageCalls}. Complete estimate: ${report.usage.totalEstimatedCostUsd === null ? 'unknown' : `$${report.usage.totalEstimatedCostUsd.toFixed(6)}`}.\n\nSelector fallback/invalid/provider errors: ${report.usage.selectorFallbacks}/${report.usage.selectorInvalidResponses}/${report.usage.selectorProviderErrors}. Per-step usage, selector distributions and end-to-end latency are in JSON.\n\n${report.arms.map(({ arm, report: suite }) => `## ${arm}\n\n${evaluationMarkdown(suite)}`).join('\n')}`,
    { flag: 'wx' },
  );
  return { report, jsonPath, markdownPath };
}
