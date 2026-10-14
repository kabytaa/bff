import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { z } from 'zod';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  isStepCount,
} from 'ai';
import type {
  ModelMessage,
  PrepareStepFunction,
  StepResult,
  ToolSet,
} from 'ai';
import { assistantLimits } from './protocol';
import {
  fitAssistantHistory,
  prepareAssistantKnowledge,
  type AssistantAssignedSkill,
  type AssistantKnowledgePreparation,
} from './instructions';
import {
  KNOWLEDGE_SELECTION_MODEL,
  KNOWLEDGE_SELECTION_LIMITS,
  buildKnowledgeSelectionInput,
  parseKnowledgeSelectionRequest,
  parseKnowledgeSelectionResponse,
  type KnowledgeSelectionRequest,
  type KnowledgeSelectionResult,
} from './knowledge-selection';
import {
  reviewedAnswerModel,
  reviewedJudgeModel,
  RUNTIME_ANSWER_MODEL_KEY,
  type AnswerModelKey,
  type JudgeModelKey,
} from './models';

export {
  ASSISTANT_INSTRUCTIONS_VERSION,
  ASSISTANT_INLINE_KNOWLEDGE_MAX_BYTES,
  composeAssistantInstructions,
  prepareAssistantKnowledge,
  fitAssistantHistory,
  type AssistantInstructionOptions,
  type AssistantSkillDescriptor,
  type AssistantAssignedSkill,
  type AssistantSuppliedKnowledge,
  type AssistantKnowledgeMode,
  type AssistantKnowledgePreparation,
} from './instructions';

export const assistantModel = reviewedAnswerModel(
  RUNTIME_ANSWER_MODEL_KEY,
).nativeId;
export interface AssistantProvider {
  /** Private bridge origin, without /v1. Never accepted from a browser. */
  baseUrl: string;
  secret: string;
  capsVerified: boolean;
}
export interface AssistantTurnOptions {
  mode: 'mock' | 'live';
  provider?: AssistantProvider;
  /** Server/operator-owned choice from the reviewed allowlist, never browser input. */
  modelKey?: AnswerModelKey | JudgeModelKey;
  purpose?: 'answer' | 'judge' | 'runtime-answer';
  instructions: string;
  messages: ModelMessage[];
  tools?: ToolSet;
  /** Require an authorized knowledge read before answering; never used by a judge. */
  requireInitialKnowledge?: boolean;
  maxSteps?: number;
  maxOutputTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}
export interface AssistantTurn {
  text: string;
  toolCalls: Array<{ toolCallId: string; toolName: string; input: unknown }>;
  /** Executed backend reads only; unresolved browser calls remain in toolCalls. */
  toolUsage: string[];
  messages: ModelMessage[];
  usage: { inputTokens?: number; outputTokens?: number };
  modelCalls: number;
  model: string;
  finishReason: string;
  mocked: boolean;
}

export const RUNTIME_KNOWLEDGE_SELECTION_TIMEOUT_MS = 10_000;
export interface AssistantSelectedKnowledge extends AssistantKnowledgePreparation {
  selection: {
    requestedModel: typeof KNOWLEDGE_SELECTION_MODEL;
    model?: string;
    selectedKeys: string[];
    effectiveKeys: string[];
    mandatoryKeys: string[];
    fallback: boolean;
    fallbackReason?:
      | KnowledgeSelectionResult['fallbackReason']
      | 'provider-error'
      | 'invalid-response'
      | 'input-bounds'
      | 'mock-not-run';
    usage: KnowledgeSelectionResult['usage'];
    modelCalls: 0 | 1;
    mocked: boolean;
  };
}
export interface AssistantKnowledgeSelectionOptions {
  mode: 'mock' | 'live';
  provider?: AssistantProvider;
  kind: 'helper' | 'support';
  question: string;
  recentMessages?: KnowledgeSelectionRequest['recentMessages'];
  /** Already authorized assignments; metadata is sent, content never is. */
  skills: readonly AssistantAssignedSkill[];
  /** Business-owned trusted configuration, never customer/model-provided keys. */
  mandatorySkillKeys?: readonly string[];
  signal?: AbortSignal;
}

const customerSelectionProjection = z
  .object({
    question: z
      .string()
      .min(1)
      .max(assistantLimits.maxInputCharacters)
      .refine((value) => Boolean(value.trim())),
    recentMessages: z
      .array(
        z
          .object({
            role: z.enum(['user', 'assistant']),
            content: z
              .string()
              .min(1)
              .max(assistantLimits.maxInputCharacters)
              .refine((value) => Boolean(value.trim())),
          })
          .strict(),
      )
      .max(assistantLimits.maxMessages)
      .optional(),
  })
  .strict();

function privateProviderOrigin(config?: AssistantProvider): string {
  if (!config?.capsVerified)
    throw new Error('Live assistant disabled: provider caps unverified');
  const url = new URL(config.baseUrl);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    config.secret.length < 32
  )
    throw new Error('Invalid private assistant provider configuration');
  return url.origin;
}

async function boundedSelectorResponse(response: Response): Promise<unknown> {
  if (!response.body) throw new Error('Missing selector output');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 100_000) throw new Error('Selector output exceeds bounds');
      chunks.push(chunk.value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** One bounded selector call. It cannot load unassigned content or grant tool authority. */
export async function selectAssistantKnowledge(
  options: AssistantKnowledgeSelectionOptions,
): Promise<AssistantSelectedKnowledge> {
  if (
    !['mock', 'live'].includes(options.mode) ||
    !['helper', 'support'].includes(options.kind)
  )
    throw new Error('Invalid assistant knowledge selection mode or role');
  // Validate the complete fallback before paying for a selector. Oversize knowledge
  // remains an explicit configuration failure, never silent fact truncation.
  const complete = prepareAssistantKnowledge(options.skills, 'inline');
  const assignedKeys = options.skills.map(({ key }) => key);
  const mandatoryKeys = [...(options.mandatorySkillKeys ?? [])];
  if (
    mandatoryKeys.length > 16 ||
    new Set(mandatoryKeys).size !== mandatoryKeys.length ||
    mandatoryKeys.some((key) => !assignedKeys.includes(key))
  )
    throw new Error('Mandatory assistant knowledge must be assigned');
  const projection = customerSelectionProjection.parse({
    question: options.question,
    ...(options.recentMessages
      ? { recentMessages: options.recentMessages }
      : {}),
  });
  // Assignments are configuration, not customer projection. Validate descriptor
  // limits even when a long legitimate question cannot use the selector.
  if (options.skills.length)
    parseKnowledgeSelectionRequest({
      question: 'Validate assigned descriptors.',
      skills: complete.skillCatalog,
    });
  let inputBounds =
    projection.question.length >
      KNOWLEDGE_SELECTION_LIMITS.questionCharacters ||
    (projection.recentMessages?.length ?? 0) >
      KNOWLEDGE_SELECTION_LIMITS.recentMessages ||
    Boolean(
      projection.recentMessages?.some(
        ({ content }) =>
          content.length > KNOWLEDGE_SELECTION_LIMITS.messageCharacters,
      ),
    );
  const request =
    options.skills.length && !inputBounds
      ? parseKnowledgeSelectionRequest({
          ...projection,
          skills: complete.skillCatalog,
        })
      : undefined;
  if (request) {
    try {
      buildKnowledgeSelectionInput(request);
    } catch {
      inputBounds = true;
    }
  }
  const origin =
    options.mode === 'live'
      ? privateProviderOrigin(options.provider)
      : undefined;
  if (options.signal?.aborted)
    throw new Error('Assistant knowledge selection cancelled');
  if (!request || inputBounds || options.mode === 'mock')
    return {
      ...complete,
      selection: {
        requestedModel: KNOWLEDGE_SELECTION_MODEL,
        selectedKeys: [],
        effectiveKeys: assignedKeys,
        mandatoryKeys,
        fallback: options.mode === 'mock' || inputBounds,
        ...(inputBounds
          ? { fallbackReason: 'input-bounds' as const }
          : options.mode === 'mock'
            ? { fallbackReason: 'mock-not-run' as const }
            : {}),
        usage: {},
        modelCalls: 0,
        mocked: options.mode === 'mock',
      },
    };
  const signal = AbortSignal.any([
    AbortSignal.timeout(RUNTIME_KNOWLEDGE_SELECTION_TIMEOUT_MS),
    ...(options.signal ? [options.signal] : []),
  ]);
  let selected: KnowledgeSelectionResult | undefined;
  let failure: 'provider-error' | 'invalid-response' = 'provider-error';
  try {
    const response = await fetch(`${origin}/v1/runtime/knowledge-selection`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${options.provider!.secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ kind: options.kind, ...request }),
      signal,
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error('Selector unavailable');
    }
    failure = 'invalid-response';
    selected = parseKnowledgeSelectionResponse(
      await boundedSelectorResponse(response),
      request,
    );
  } catch {
    if (options.signal?.aborted)
      throw new Error('Assistant knowledge selection cancelled');
    // Retry/fallback models are deliberately absent. Only the same authorized
    // knowledge is supplied when a relevance decision cannot be trusted.
  }
  if (options.signal?.aborted)
    throw new Error('Assistant knowledge selection cancelled');
  const fallback = !selected || selected.fallback;
  const effectiveKeys = fallback
    ? assignedKeys
    : assignedKeys.filter(
        (key) =>
          mandatoryKeys.includes(key) || selected!.selectedKeys.includes(key),
      );
  const knowledge = fallback
    ? complete
    : prepareAssistantKnowledge(
        options.skills.filter(({ key }) => effectiveKeys.includes(key)),
        'inline',
      );
  return {
    ...knowledge,
    selection: {
      requestedModel: KNOWLEDGE_SELECTION_MODEL,
      ...(selected ? { model: selected.model } : {}),
      selectedKeys: selected?.selectedKeys ?? [],
      effectiveKeys,
      mandatoryKeys,
      fallback,
      ...(fallback
        ? { fallbackReason: selected?.fallbackReason ?? failure }
        : {}),
      usage: selected?.usage ?? {},
      modelCalls: 1,
      mocked: false,
    },
  };
}

/** Emit the saved turn through the SDK UI protocol; this does not imply token streaming. */
export function createAssistantUIResponse(options: {
  text: string;
  toolCalls: AssistantTurn['toolCalls'];
  messageId: string;
  mocked: boolean;
  session: { conversationId: string; capability?: string };
  headers?: HeadersInit;
}): Response {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: 'start', messageId: options.messageId });
      writer.write({
        type: 'data-session',
        data: { ...options.session, mocked: options.mocked },
        transient: true,
      });
      if (options.text) {
        writer.write({ type: 'text-start', id: options.messageId });
        writer.write({
          type: 'text-delta',
          id: options.messageId,
          delta: options.text,
        });
        writer.write({ type: 'text-end', id: options.messageId });
      }
      for (const call of options.toolCalls)
        writer.write({ type: 'tool-input-available', ...call });
      writer.write({
        type: 'finish',
        finishReason: options.toolCalls.length ? 'tool-calls' : 'stop',
      });
    },
  });
  return createUIMessageStreamResponse({ stream, headers: options.headers });
}

function boundedInteger(value: number, maximum: number): number {
  if (!Number.isInteger(value) || value < 1 || value > maximum)
    throw new Error('Invalid assistant generation bound');
  return value;
}

/** Stateless model work. Storage, tool authority and exact Send belong to the caller. */
export async function generateAssistantTurn(
  options: AssistantTurnOptions,
): Promise<AssistantTurn> {
  const selectedModel =
    options.purpose === 'judge'
      ? reviewedJudgeModel(options.modelKey)
      : reviewedAnswerModel(
          options.purpose === 'runtime-answer'
            ? RUNTIME_ANSWER_MODEL_KEY
            : options.modelKey,
        );
  if (
    options.purpose === 'runtime-answer' &&
    options.modelKey !== undefined &&
    options.modelKey !== RUNTIME_ANSWER_MODEL_KEY
  )
    throw new Error('Unreviewed runtime assistant answer model');
  if (
    options.purpose === 'judge' &&
    (options.tools || options.requireInitialKnowledge || options.maxSteps !== 1)
  )
    throw new Error('The evaluation judge cannot use tools or multiple steps');
  const maxSteps = boundedInteger(
    options.maxSteps ?? assistantLimits.maxSteps,
    assistantLimits.maxSteps,
  );
  const maxOutputTokens = boundedInteger(
    options.maxOutputTokens ?? assistantLimits.maxOutputTokens,
    assistantLimits.maxOutputTokens,
  );
  if (
    options.temperature !== undefined &&
    (!Number.isFinite(options.temperature) ||
      options.temperature < 0 ||
      options.temperature > 1)
  )
    throw new Error('Invalid assistant temperature');
  if (
    options.messages.length > assistantLimits.maxMessages ||
    JSON.stringify(options.messages).length + options.instructions.length >
      assistantLimits.maxInputCharacters
  )
    throw new Error('Assistant context too large');
  if (
    options.requireInitialKnowledge &&
    typeof options.tools?.loadSkill?.execute !== 'function'
  )
    throw new Error('Required assistant knowledge tool is unavailable');
  if (options.requireInitialKnowledge && maxSteps < 2)
    throw new Error('A knowledge-grounded answer requires at least two steps');
  if (options.mode === 'mock') {
    const text =
      '[Development mock] Your message has been recorded. A person can review it and help with the next step.';
    return {
      text,
      toolCalls: [],
      toolUsage: [],
      messages: [{ role: 'assistant', content: text }],
      usage: {},
      modelCalls: 0,
      model: 'development-mock',
      finishReason: 'stop',
      mocked: true,
    };
  }
  const origin = privateProviderOrigin(options.provider);
  const provider = createOpenAICompatible({
    name: 'bff-workers-ai',
    baseURL: `${origin}/v1${options.purpose === 'judge' ? '/judge' : options.purpose === 'runtime-answer' ? '/runtime' : ''}`,
    apiKey: options.provider!.secret,
  });
  const initialKnowledgeLoaded = (steps: Array<StepResult<ToolSet>>) =>
    steps[0]?.toolResults.some(({ toolName }) => toolName === 'loadSkill');
  const prepareStep: PrepareStepFunction<ToolSet> = async ({
    stepNumber,
    steps,
    messages,
  }) => {
    const boundedMessages = await fitAssistantHistory(
      options.instructions,
      messages,
      options.tools ?? {},
    );
    if (options.requireInitialKnowledge) {
      if (stepNumber === 0)
        return {
          messages: boundedMessages,
          activeTools: ['loadSkill'],
          toolChoice: 'required',
        };
      if (!initialKnowledgeLoaded(steps))
        throw new Error('Required assistant knowledge could not be loaded');
    }
    return { messages: boundedMessages, toolChoice: 'auto' };
  };
  const result = await generateText({
    model: provider(selectedModel.nativeId),
    instructions: options.instructions,
    messages: options.messages,
    tools: options.tools,
    prepareStep,
    stopWhen: isStepCount(maxSteps),
    maxOutputTokens,
    ...(options.temperature === undefined
      ? {}
      : { temperature: options.temperature }),
    maxRetries: 0,
    timeout: { totalMs: options.purpose === 'judge' ? 45_000 : 25_000 },
    abortSignal: options.signal,
  });
  if (options.requireInitialKnowledge && !initialKnowledgeLoaded(result.steps))
    throw new Error('Required assistant knowledge could not be loaded');
  // SDK 7 aggregates calls across steps, including reads already executed.
  // Only unresolved calls belong in a browser continuation.
  const completedToolCallIds = new Set(
    result.steps.flatMap((step) =>
      step.toolResults.map(({ toolCallId }) => toolCallId),
    ),
  );
  return {
    text: result.text,
    toolCalls: result.toolCalls
      .filter(({ toolCallId }) => !completedToolCallIds.has(toolCallId))
      .map(({ toolCallId, toolName, input }) => ({
        toolCallId,
        toolName,
        input,
      })),
    toolUsage: [
      ...new Set(
        result.steps.flatMap((step) =>
          step.toolResults.map(({ toolName }) => toolName),
        ),
      ),
    ],
    messages: result.response.messages,
    usage: {
      inputTokens: result.totalUsage.inputTokens,
      outputTokens: result.totalUsage.outputTokens,
    },
    modelCalls: result.steps.length,
    model: selectedModel.nativeId,
    finishReason: result.finishReason,
    mocked: false,
  };
}
