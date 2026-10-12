'use node';

import { jsonSchema, tool, type ModelMessage, type ToolSet } from 'ai';
import { v, type Infer } from 'convex/values';
import { z } from 'zod';

import {
  composeAssistantInstructions,
  fitAssistantHistory,
  generateAssistantTurn,
  prepareAssistantKnowledge,
  selectAssistantKnowledge,
  type AssistantSelectedKnowledge,
} from '@bff/assistant/server';
import {
  safePropertiesSchema,
  type OperationPropertyDescriptor,
} from '@bff/contracts';
import { internal } from './_generated/api';
import { internalAction } from './_generated/server';
import { safePropertiesValidator } from './lib/operatorWorkConfiguration';

function descriptorSchema(descriptors: OperationPropertyDescriptor[]) {
  return jsonSchema<Record<string, string | number | boolean>>({
    type: 'object',
    additionalProperties: false,
    properties: Object.fromEntries(
      descriptors.map((field) => [
        field.name,
        {
          type: field.type,
          ...(field.maxLength ? { maxLength: field.maxLength } : {}),
          ...(field.allowedValues ? { enum: field.allowedValues } : {}),
        },
      ]),
    ),
    required: descriptors
      .filter((field) => field.required)
      .map((field) => field.name),
  });
}

const resultValidator = v.object({
  text: v.string(),
  messageId: v.string(),
  mocked: v.boolean(),
  toolCalls: v.array(
    v.object({
      toolCallId: v.string(),
      toolName: v.string(),
      input: safePropertiesValidator,
    }),
  ),
});

/** One bounded processing run, not a recurring poller. Sending is never a model tool. */
export const processRun = internalAction({
  args: { runId: v.id('botRuns') },
  returns: resultValidator,
  handler: async (ctx, args): Promise<Infer<typeof resultValidator>> => {
    const mode = process.env.BFF_OPERATIONS_AI_MODE;
    const mocked =
      mode === 'mock' &&
      process.env.BFF_DEVELOPMENT_OPERATOR_WORK_ENABLED === 'enabled';
    const claim = await ctx.runMutation(internal.operationsState.claimRun, {
      ...args,
      provider: mocked ? 'development-mock' : 'cloudflare',
    });
    if (!claim) throw new Error('This run is already handled or superseded.');
    try {
      const context = await ctx.runQuery(
        internal.operationsState.runContext,
        args,
      );
      if (
        (!mocked && mode !== 'live') ||
        (mocked && !context.environmentKey.endsWith('-development'))
      )
        throw new Error(
          'Assistant is unavailable; support contact remains available.',
        );
      if (!['qwen3-30b', 'gemma4-26b'].includes(context.model))
        throw new Error(
          'The configured model is not in the inexpensive runtime allowlist.',
        );
      const assignedSkills = await Promise.all(
        context.skills.map(async (descriptor) => ({
          ...descriptor,
          ...(await ctx.runQuery(internal.operationsState.assignedSkill, {
            ...args,
            key: descriptor.key,
          })),
        })),
      );
      const modelKey =
        context.model === 'gemma4-26b' ? 'gemma4-26b' : 'qwen3-30b';
      const provider = {
        baseUrl: process.env.BFF_OPERATIONS_PROVIDER_BASE_URL ?? '',
        secret: process.env.BFF_OPERATIONS_PROVIDER_SECRET ?? '',
        capsVerified: process.env.BFF_OPERATIONS_CAPS_VERIFIED === 'verified',
      };
      let knowledge = prepareAssistantKnowledge(
        assignedSkills,
        context.knowledgeSelection ? 'inline' : 'auto',
      );
      let selection: AssistantSelectedKnowledge['selection'] | undefined;
      const tools: ToolSet = {
        ...(knowledge.strategy === 'lazy'
          ? {
              loadSkill: tool({
                description:
                  'Load one assigned skill, using its key from the supplied skill catalog.',
                inputSchema: z.object({ key: z.string().max(80) }).strict(),
                execute: async ({ key }) =>
                  await ctx.runQuery(internal.operationsState.assignedSkill, {
                    ...args,
                    key,
                  }),
              }),
            }
          : {}),
        getCurrentCustomerContext: tool({
          description:
            'Read limited facts about the current verified customer and selected workspace. Anonymous mail cannot grant customer access.',
          inputSchema: z.object({}).strict(),
          execute: async () =>
            (await ctx.runQuery(internal.operationsState.runContext, args))
              .customerFacts,
        }),
      };
      for (const capability of context.capabilities) {
        if (
          ['loadSkill', 'getCurrentCustomerContext'].includes(
            capability.name,
          ) ||
          capability.name in tools
        )
          throw new Error('Reserved tool name collision.');
        tools[capability.name] = tool({
          description: [
            capability.description,
            ...(capability.destination
              ? [
                  `Registered customer-clicked destination: ${JSON.stringify(capability.destination)}. Use this exact path, never guess a domain or URL variant. Offer the link using this tool; do not navigate automatically.`,
                ]
              : []),
          ].join('\n'),
          inputSchema: descriptorSchema(capability.arguments),
        });
      }
      const messages: ModelMessage[] = [];
      for (const entry of context.entries) {
        messages.push({
          role: entry.kind === 'customer_message' ? 'user' : 'assistant',
          content: entry.text,
        });
      }
      if (context.pendingClientTool && context.clientToolResult) {
        messages.push({
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: context.pendingClientTool.callId,
              toolName: context.pendingClientTool.name,
              input: context.pendingClientTool.arguments,
            },
          ],
        });
        messages.push({
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: context.pendingClientTool.callId,
              toolName: context.pendingClientTool.name,
              output: { type: 'json', value: context.clientToolResult },
            },
          ],
        });
      }
      const instructionOptions = {
        kind: context.kind,
        businessInstructions: context.instructions,
        skillCatalog: knowledge.skillCatalog,
        suppliedKnowledge: knowledge.suppliedKnowledge,
        pageContext: context.pageContext,
      };
      // Check the complete authorized fallback and newest question before any
      // paid selector call. Selection never permits silent fact truncation.
      const fullInstructions = composeAssistantInstructions(instructionOptions);
      const fittedMessages = await fitAssistantHistory(
        fullInstructions,
        messages,
        tools,
      );
      if (context.knowledgeSelection?.strategy === 'jev') {
        const history = fittedMessages.flatMap(({ role, content }) =>
          (role === 'user' || role === 'assistant') &&
          typeof content === 'string'
            ? [{ role, content }]
            : [],
        );
        const questionIndex = history.findLastIndex(
          ({ role }) => role === 'user',
        );
        const selected = await selectAssistantKnowledge({
          mode: mocked ? 'mock' : 'live',
          provider,
          kind: context.kind,
          question: history[questionIndex]?.content ?? '',
          recentMessages: history.slice(
            Math.max(0, questionIndex - 4),
            questionIndex,
          ),
          skills: assignedSkills,
          mandatorySkillKeys: context.knowledgeSelection.mandatorySkillKeys,
        });
        knowledge = selected;
        selection = selected.selection;
      }
      const instructions = composeAssistantInstructions({
        ...instructionOptions,
        skillCatalog: knowledge.skillCatalog,
        suppliedKnowledge: knowledge.suppliedKnowledge,
      });
      const generated = await generateAssistantTurn({
        mode: mocked ? 'mock' : 'live',
        provider,
        modelKey,
        purpose: modelKey === 'gemma4-26b' ? 'runtime-answer' : 'answer',
        instructions,
        messages: await fitAssistantHistory(
          instructions,
          fittedMessages,
          tools,
        ),
        tools,
        requireInitialKnowledge: knowledge.requireInitialKnowledge,
      });
      if (
        !['stop', 'tool-calls'].includes(generated.finishReason) ||
        (!generated.toolCalls.length && generated.finishReason !== 'stop')
      )
        throw new Error('Assistant generation did not finish an answer.');
      // Answer-attempt token fields describe this configured answer model only.
      // Selector provenance stays separate; missing usage is never invented.
      const evidence = [
        ...(selection
          ? [
              `knowledge_selection:${selection.fallback ? 'fallback' : 'selected'}`,
              `selection_model:${(selection.model ?? selection.requestedModel).slice(0, 80)}`,
              ...((selection.model ?? selection.requestedModel).length > 80
                ? ['selection_model:truncated']
                : []),
              `selection_calls:${claim.attemptId}:${selection.modelCalls}`,
              ...(selection.fallbackReason
                ? [`selection_fallback:${selection.fallbackReason}`]
                : []),
              ...selection.effectiveKeys.map((key) => `knowledge:${key}`),
            ]
          : []),
        ...generated.toolUsage,
      ];
      const distinctEvidence = [...new Set(evidence)];
      const toolUsage =
        distinctEvidence.length > 30
          ? [...distinctEvidence.slice(0, 29), 'tool_usage:truncated']
          : distinctEvidence;
      if (generated.toolCalls.length) {
        if (
          context.kind !== 'helper' ||
          generated.toolCalls.length !== 1 ||
          !context.pageContextFingerprint
        )
          throw new Error('Unsupported browser-tool continuation.');
        const call = generated.toolCalls[0]!;
        const input = safePropertiesSchema.parse(call.input);
        const saved = await ctx.runMutation(
          internal.operationsState.pauseClientTool,
          {
            ...args,
            attemptId: claim.attemptId,
            callId: call.toolCallId,
            name: call.toolName,
            arguments: input,
            pageContextFingerprint: context.pageContextFingerprint,
            ...generated.usage,
            toolUsage,
          },
        );
        if (!saved)
          throw new Error('A newer message superseded the browser request.');
        return {
          text: generated.text,
          messageId: context.publicId,
          mocked,
          toolCalls: [{ ...call, input }],
        };
      }
      const saved = await ctx.runMutation(
        internal.operationsState.completeRun,
        {
          ...args,
          attemptId: claim.attemptId,
          text: generated.text,
          ...generated.usage,
          toolUsage,
        },
      );
      if (!saved.applied)
        throw new Error('New information superseded this answer.');
      return {
        text: generated.text,
        messageId: saved.entryPublicId ?? context.publicId,
        mocked,
        toolCalls: [],
      };
    } catch {
      await ctx.runMutation(internal.operationsState.failRun, {
        ...args,
        attemptId: claim.attemptId,
        error: mocked
          ? 'Development mock run could not complete.'
          : 'Assistant temporarily unavailable; the message is saved and support remains available.',
      });
      throw new Error(
        'Assistant temporarily unavailable; the message is preserved.',
      );
    }
  },
});
