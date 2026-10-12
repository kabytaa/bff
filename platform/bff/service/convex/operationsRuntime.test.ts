import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AssistantServer from '@bff/assistant/server';
import {
  composeAssistantInstructions,
  fitAssistantHistory,
  prepareAssistantKnowledge,
  type AssistantSelectedKnowledge,
  type AssistantTurn,
} from '@bff/assistant/server';
import {
  operatorWorkConfigurationSchema,
  type OperatorWorkConfiguration,
} from '@bff/contracts';
import { internal } from './_generated/api';
import schema from './schema';

const assistantMocks = vi.hoisted(() => ({
  select: vi.fn<typeof AssistantServer.selectAssistantKnowledge>(),
  generate: vi.fn<typeof AssistantServer.generateAssistantTurn>(),
}));

vi.mock('@bff/assistant/server', async (importOriginal) => ({
  ...(await importOriginal<typeof AssistantServer>()),
  selectAssistantKnowledge: assistantMocks.select,
  generateAssistantTurn: assistantMocks.generate,
}));

const modules = import.meta.glob('./**/*.ts');
const anonymousHandleHash = 'synthetic-runtime-anonymous-capability-hash';
const question = 'Can you explain the current page?';
const privateNote = 'Private operator note that must not reach the selector.';
const privateAccountName = 'Private verified workspace';
const configuration: OperatorWorkConfiguration = {
  version: 1,
  enabled: true,
  presentation: {
    productName: 'Example',
    helpUrl: 'https://example.invalid/help',
    contactEmail: 'help@example.invalid',
  },
  support: {
    botKey: 'support',
    fromEmail: 'help@example.invalid',
    fromName: 'Example support',
    receivingAddress: 'help@receive.example.invalid',
    replyDomain: 'receive.example.invalid',
    receiptText: 'We received your message.',
    surveyQuestion: 'Did this help?',
  },
  bots: (['helper', 'support'] as const).map((kind) => ({
    key: kind,
    name: `Example ${kind}`,
    version: 6,
    kind,
    instructions: 'Answer using reviewed Example facts.',
    skillKeys: ['example.core', 'example.page'],
    model: 'gemma4-26b',
    knowledgeSelection: {
      strategy: 'jev',
      mandatorySkillKeys: ['example.core'],
    },
  })),
  skills: [
    {
      key: 'example.core',
      name: 'Core facts',
      version: 2,
      whenToUse: 'For current product boundaries.',
      content: 'Example is a no-charge preview.',
    },
    {
      key: 'example.page',
      name: 'Page facts',
      version: 3,
      whenToUse: 'For help interpreting a permitted page summary.',
      content: 'The page summary reports the visible item count.',
    },
    {
      key: 'example.unassigned',
      name: 'Unassigned facts',
      version: 1,
      whenToUse: 'For a different bot only.',
      content: 'UNASSIGNED_CONTENT_MUST_NOT_REACH_THIS_BOT',
    },
  ],
  events: [],
  pageCapabilities: [
    {
      name: 'read_page',
      description: 'Read the current permitted page summary.',
      arguments: [],
      result: [{ name: 'count', type: 'number', required: true }],
    },
  ],
};

async function fixture(
  options: {
    kind?: 'helper' | 'support';
    verified?: boolean;
    configuration?: OperatorWorkConfiguration;
    question?: string;
  } = {},
) {
  const t = convexTest(schema, modules);
  const config = operatorWorkConfigurationSchema.parse(
    options.configuration ?? configuration,
  );
  const kind = options.kind ?? 'helper';
  const bot = config.bots.find((item) => item.kind === kind)!;
  const seeded = await t.run(async (ctx) => {
    const now = Date.now();
    const environmentId = await ctx.db.insert('businessEnvironments', {
      key: 'example-development',
      businessName: 'Example',
      environmentName: 'Development',
      operatorWork: config,
      operatorWorkConfigurationRevision: 1,
      updatedAt: now,
    });
    let userId;
    let accountId;
    if (options.verified) {
      const principalId = await ctx.db.insert('authPrincipals', {
        createdAt: now,
      });
      userId = await ctx.db.insert('businessUsers', {
        environmentId,
        principalId,
        publicId: 'user_runtimefixture01',
        verifiedEmail: 'verified@example.invalid',
        displayName: 'Private verified customer',
        firstSignInProvisioningCompletedAt: now,
        activeMembershipCount: 1,
        ownedAccountCount: 1,
        createdAt: now,
        updatedAt: now,
      });
      accountId = await ctx.db.insert('accounts', {
        environmentId,
        publicId: 'account_runtimefixture01',
        displayName: privateAccountName,
        ownerUserId: userId,
        activeMembershipCount: 1,
        pendingInvitationCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert('memberships', {
        environmentId,
        accountId,
        userId,
        publicId: 'membership_runtimefixture01',
        role: 'owner',
        createdAt: now,
        updatedAt: now,
      });
    }
    const conversationId = await ctx.db.insert('conversations', {
      environmentId,
      publicId: 'conversation_runtimefixture01',
      kind,
      botKey: bot.key,
      ...(userId ? { userId, accountId } : { anonymousHandleHash }),
      ...(kind === 'support'
        ? {
            subject: 'A page question',
            contactEmail: 'verified@example.invalid',
            status: 'open' as const,
          }
        : {}),
      createdAt: now,
      updatedAt: now,
    });
    const entryId = await ctx.db.insert('conversationEntries', {
      environmentId,
      conversationId,
      publicId: 'entry_runtimefixture01',
      kind: 'customer_message',
      visibility: 'customer',
      actor: { kind: 'customer', label: 'Customer' },
      actorKey: 'customer:fixture',
      text: options.question ?? question,
      createdAt: now,
    });
    await ctx.db.insert('conversationEntries', {
      environmentId,
      conversationId,
      publicId: 'entry_runtimeprivatenote01',
      kind: 'operator_note',
      visibility: 'internal',
      actor: { kind: 'operator', label: 'Operator' },
      actorKey: 'operator:fixture',
      text: privateNote,
      createdAt: now + 1,
    });
    const runId = await ctx.db.insert('botRuns', {
      environmentId,
      conversationId,
      triggerEntryId: entryId,
      publicId: 'run_runtimefixture01',
      botKey: bot.key,
      botVersion: bot.version,
      configurationRevision: 1,
      skillVersions: config.skills
        .filter((skill) => bot.skillKeys.includes(skill.key))
        .map(({ key, version }) => ({ key, version })),
      model: bot.model,
      state: 'queued',
      pageContext: { key: 'items' },
      pageContextFingerprint: 'page-context-runtime-fixture',
      attempts: [],
      startedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(conversationId, {
      activeRunId: runId,
      latestCustomerEntryId: entryId,
    });
    return { environmentId, conversationId, entryId, runId };
  });
  return { t, config, ...seeded };
}

function selectedKnowledge(
  options: {
    fallback?: boolean;
  } = {},
): AssistantSelectedKnowledge {
  const skills = configuration.skills.filter(({ key }) =>
    configuration.bots[0]!.skillKeys.includes(key),
  );
  return {
    ...prepareAssistantKnowledge(skills, 'inline'),
    selection: {
      requestedModel: 'typesafe/jev',
      model: 'typesafe/jev:v1.13.0',
      selectedKeys: options.fallback ? [] : ['example.page'],
      effectiveKeys: skills.map(({ key }) => key),
      mandatoryKeys: ['example.core'],
      fallback: Boolean(options.fallback),
      ...(options.fallback
        ? { fallbackReason: 'provider-error' as const }
        : {}),
      usage: { inputTokens: 70, outputTokens: 5 },
      modelCalls: 1,
      mocked: false,
    },
  };
}

function answer(overrides: Partial<AssistantTurn> = {}): AssistantTurn {
  return {
    text: 'The reviewed page summary explains the visible item count.',
    toolCalls: [],
    toolUsage: ['getCurrentCustomerContext'],
    messages: [],
    usage: { inputTokens: 100, outputTokens: 20 },
    modelCalls: 1,
    model: '@cf/google/gemma-4-26b-a4b-it',
    finishReason: 'stop',
    mocked: false,
    ...overrides,
  };
}

describe('Gemma/Jev stored runtime integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-12T12:00:00Z'));
    vi.stubEnv('BFF_OPERATIONS_AI_MODE', 'live');
    vi.stubEnv('BFF_OPERATIONS_CAPS_VERIFIED', 'verified');
    vi.stubEnv('BFF_OPERATIONS_PROVIDER_BASE_URL', 'https://private.example');
    vi.stubEnv(
      'BFF_OPERATIONS_PROVIDER_SECRET',
      'synthetic-private-provider-secret-for-test',
    );
    assistantMocks.select.mockReset().mockResolvedValue(selectedKnowledge());
    assistantMocks.generate.mockReset().mockResolvedValue(answer());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('propagates trusted settings, scopes selection input and saves only a support suggestion', async () => {
    const state = await fixture({ kind: 'support', verified: true });
    const context = await state.t.query(internal.operationsState.runContext, {
      runId: state.runId,
    });
    expect(context.knowledgeSelection).toEqual({
      strategy: 'jev',
      mandatorySkillKeys: ['example.core'],
    });
    expect(context.customerFacts).toMatchObject({
      accountName: privateAccountName,
    });
    expect(context.entries).toEqual([
      { kind: 'customer_message', text: question, actorLabel: 'Customer' },
    ]);
    await expect(
      state.t.query(internal.operationsState.assignedSkill, {
        runId: state.runId,
        key: 'example.unassigned',
      }),
    ).rejects.toThrow(/FORBIDDEN|assigned/);

    const result = await state.t.action(internal.operationsRuntime.processRun, {
      runId: state.runId,
    });
    expect(result.toolCalls).toEqual([]);
    const selection = assistantMocks.select.mock.calls[0]![0];
    expect(selection).toMatchObject({
      mode: 'live',
      kind: 'support',
      question,
      recentMessages: [],
      mandatorySkillKeys: ['example.core'],
    });
    expect(selection.skills).toEqual(configuration.skills.slice(0, 2));
    const serializedSelection = JSON.stringify(selection);
    expect(serializedSelection).not.toContain(privateNote);
    expect(serializedSelection).not.toContain(privateAccountName);
    expect(serializedSelection).not.toContain('Private verified customer');
    expect(serializedSelection).not.toContain('customerFacts');
    expect(serializedSelection).not.toContain('UNASSIGNED_CONTENT');

    const generation = assistantMocks.generate.mock.calls[0]![0];
    expect(generation).toMatchObject({
      modelKey: 'gemma4-26b',
      purpose: 'runtime-answer',
      requireInitialKnowledge: false,
    });
    expect(Object.keys(generation.tools!)).toEqual([
      'getCurrentCustomerContext',
    ]);
    expect(generation.instructions).not.toContain(privateNote);
    expect(generation.instructions).not.toContain('UNASSIGNED_CONTENT');
    const saved = await state.t.run(async (ctx) => ({
      conversation: await ctx.db.get(state.conversationId),
      run: await ctx.db.get(state.runId),
      deliveries: await ctx.db
        .query('emailDeliveries')
        .withIndex('by_conversation_created_at', (index) =>
          index.eq('conversationId', state.conversationId),
        )
        .take(10),
      entries: await ctx.db
        .query('conversationEntries')
        .withIndex('by_conversation_created_at', (index) =>
          index.eq('conversationId', state.conversationId),
        )
        .take(10),
    }));
    expect(saved.conversation?.currentDraft).toMatchObject({
      text: answer().text,
      state: 'ready',
      editor: { kind: 'bot' },
      sourceRunId: state.runId,
    });
    expect(saved.deliveries).toEqual([]);
    expect(saved.entries.some((entry) => entry.kind === 'outgoing_reply')).toBe(
      false,
    );
    expect(saved.run?.state).toBe('completed');
    expect(saved.run?.attempts[0]).toMatchObject({
      model: 'gemma4-26b',
      inputTokens: 100,
      outputTokens: 20,
      outcome: 'completed',
    });
    expect(saved.run?.toolUsage).toEqual(
      expect.arrayContaining([
        'knowledge_selection:selected',
        'selection_model:typesafe/jev:v1.13.0',
        `selection_calls:${saved.run!.attempts[0]!.id}:1`,
        'knowledge:example.core',
        'knowledge:example.page',
        'getCurrentCustomerContext',
      ]),
    );
  });

  it('supplies the exact registered destination only to helper browser tools without automatic navigation', async () => {
    const config: OperatorWorkConfiguration = {
      ...configuration,
      pageCapabilities: [
        {
          name: 'open_help',
          description: 'Offer the reviewed help page to the customer.',
          arguments: [],
          result: [],
          destination: '/#help',
        },
      ],
    };
    const helper = await fixture({ configuration: config });
    await helper.t.action(internal.operationsRuntime.processRun, {
      runId: helper.runId,
    });
    const helperTools = assistantMocks.generate.mock.calls[0]![0].tools!;
    expect(helperTools.open_help?.description).toContain(
      'Registered customer-clicked destination: "/#help".',
    );
    expect(helperTools.open_help?.description).toContain(
      'Use this exact path, never guess a domain or URL variant.',
    );
    expect(helperTools.open_help?.description).toContain(
      'Offer the link using this tool; do not navigate automatically.',
    );
    expect(helperTools.open_help?.execute).toBeUndefined();

    const support = await fixture({ kind: 'support', configuration: config });
    await support.t.action(internal.operationsRuntime.processRun, {
      runId: support.runId,
    });
    const supportTools = assistantMocks.generate.mock.calls[1]![0].tools!;
    expect(Object.keys(supportTools)).toEqual(['getCurrentCustomerContext']);
    expect(supportTools.open_help).toBeUndefined();
  });

  it('preserves answer-only usage and both selection phases across an authorized browser continuation', async () => {
    const state = await fixture();
    assistantMocks.generate.mockResolvedValueOnce(
      answer({
        text: '',
        finishReason: 'tool-calls',
        toolCalls: [
          { toolCallId: 'browser-call-1', toolName: 'read_page', input: {} },
        ],
      }),
    );
    const pending = await state.t.action(
      internal.operationsRuntime.processRun,
      { runId: state.runId },
    );
    expect(pending.toolCalls).toEqual([
      { toolCallId: 'browser-call-1', toolName: 'read_page', input: {} },
    ]);
    const paused = await state.t.run(
      async (ctx) => await ctx.db.get(state.runId),
    );
    expect(paused?.state).toBe('waiting_for_client');
    expect(paused?.attempts[0]).toMatchObject({
      outcome: 'completed',
      inputTokens: 100,
      outputTokens: 20,
    });
    expect(paused?.toolUsage).toContain('knowledge_selection:selected');
    expect(paused?.toolUsage).toContain('selection_model:typesafe/jev:v1.13.0');

    const resumeArgs = {
      environmentKey: 'example-development',
      conversationPublicId: 'conversation_runtimefixture01',
      anonymousHandleHash,
      runPublicId: 'run_runtimefixture01',
      callId: 'browser-call-1',
      name: 'read_page',
      pageContextFingerprint: 'page-context-runtime-fixture',
      result: { count: 3 },
    };
    await expect(
      state.t.mutation(internal.operationsState.resumeClientTool, {
        ...resumeArgs,
        anonymousHandleHash: 'different-customer-capability',
      }),
    ).rejects.toThrow(/FORBIDDEN|capability/);
    const resumed = await state.t.mutation(
      internal.operationsState.resumeClientTool,
      resumeArgs,
    );
    expect(resumed).toBe(state.runId);
    assistantMocks.select.mockResolvedValueOnce(
      selectedKnowledge({ fallback: true }),
    );
    assistantMocks.generate.mockResolvedValueOnce(
      answer({ usage: { inputTokens: 150, outputTokens: 30 }, toolUsage: [] }),
    );
    await state.t.action(internal.operationsRuntime.processRun, {
      runId: resumed,
    });
    const generation = assistantMocks.generate.mock.calls[1]![0];
    expect(generation.messages.slice(-2)).toEqual([
      {
        role: 'assistant',
        content: [
          {
            type: 'tool-call',
            toolCallId: 'browser-call-1',
            toolName: 'read_page',
            input: {},
          },
        ],
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'browser-call-1',
            toolName: 'read_page',
            output: { type: 'json', value: { count: 3 } },
          },
        ],
      },
    ]);
    expect(assistantMocks.select.mock.calls[1]![0].question).toBe(question);
    expect(assistantMocks.select.mock.calls[1]![0].recentMessages).toEqual([]);
    const completed = await state.t.run(
      async (ctx) => await ctx.db.get(state.runId),
    );
    expect(completed?.state).toBe('completed');
    expect(
      completed?.attempts.map(({ inputTokens, outputTokens }) => ({
        inputTokens,
        outputTokens,
      })),
    ).toEqual([
      { inputTokens: 100, outputTokens: 20 },
      { inputTokens: 150, outputTokens: 30 },
    ]);
    expect(completed?.toolUsage).toEqual(
      expect.arrayContaining([
        'knowledge_selection:selected',
        'knowledge_selection:fallback',
        'selection_fallback:provider-error',
        'selection_model:typesafe/jev:v1.13.0',
        ...completed!.attempts.map(({ id }) => `selection_calls:${id}:1`),
        'getCurrentCustomerContext',
      ]),
    );
    expect(new Set(completed?.toolUsage).size).toBe(
      completed?.toolUsage?.length,
    );
    await expect(
      state.t.mutation(internal.operationsState.resumeClientTool, resumeArgs),
    ).rejects.toThrow(/CONFLICT|checkpoint/);
  });

  it('refuses a completed answer after its configuration revision changes', async () => {
    const state = await fixture({ kind: 'support' });
    assistantMocks.generate.mockImplementationOnce(async () => {
      await state.t.run(async (ctx) => {
        await ctx.db.patch(state.environmentId, {
          operatorWorkConfigurationRevision: 2,
        });
      });
      return answer();
    });
    await expect(
      state.t.action(internal.operationsRuntime.processRun, {
        runId: state.runId,
      }),
    ).rejects.toThrow(/temporarily unavailable|preserved/);
    const saved = await state.t.run(async (ctx) => ({
      conversation: await ctx.db.get(state.conversationId),
      run: await ctx.db.get(state.runId),
    }));
    expect(saved.run?.state).toBe('stale');
    expect(saved.conversation?.currentDraft).toBeUndefined();
    expect(saved.conversation?.activeRunId).toBeUndefined();
  });

  it('checks the complete fallback with tool schemas before paying for selection or generation', async () => {
    const config: OperatorWorkConfiguration = {
      ...configuration,
      pageCapabilities: Array.from({ length: 20 }, (_, index) => ({
        name: `read_page_${index}`,
        description: `Read registered page ${index}: ${'x'.repeat(970)}`,
        arguments: [],
        result: [],
      })),
    };
    const knowledge = prepareAssistantKnowledge(
      config.skills.slice(0, 2),
      'inline',
    );
    const instructions = composeAssistantInstructions({
      kind: 'helper',
      businessInstructions: config.bots[0]!.instructions,
      ...knowledge,
      pageContext: { key: 'items' },
    });
    // The previous strings-only preflight fits; native function schemas make the
    // essential payload too large even with no older turns available to trim.
    expect(
      fitAssistantHistory(instructions, [{ role: 'user', content: question }]),
    ).toHaveLength(1);
    const state = await fixture({ configuration: config });
    await expect(
      state.t.action(internal.operationsRuntime.processRun, {
        runId: state.runId,
      }),
    ).rejects.toThrow(/temporarily unavailable|preserved/);
    expect(assistantMocks.select).not.toHaveBeenCalled();
    expect(assistantMocks.generate).not.toHaveBeenCalled();
    const saved = await state.t.run(
      async (ctx) => await ctx.db.get(state.runId),
    );
    expect(saved?.state).toBe('failed');
    expect(saved?.attempts[0]?.outcome).toBe('failed');
    expect(saved?.resultEntryId).toBeUndefined();
  });

  it('does not invent missing answer usage from known selector usage', async () => {
    const state = await fixture();
    assistantMocks.generate.mockResolvedValueOnce(answer({ usage: {} }));
    await state.t.action(internal.operationsRuntime.processRun, {
      runId: state.runId,
    });
    const saved = await state.t.run(
      async (ctx) => await ctx.db.get(state.runId),
    );
    expect(saved?.attempts[0]?.inputTokens).toBeUndefined();
    expect(saved?.attempts[0]?.outputTokens).toBeUndefined();
    expect(saved?.toolUsage).toContain(
      `selection_calls:${saved!.attempts[0]!.id}:1`,
    );
  });

  it('bounds a long selector model label without dropping its phase call count', async () => {
    const state = await fixture();
    const knowledge = selectedKnowledge();
    const model = `typesafe/jev:${'v'.repeat(188)}`;
    assistantMocks.select.mockResolvedValueOnce({
      ...knowledge,
      selection: { ...knowledge.selection, model },
    });
    await state.t.action(internal.operationsRuntime.processRun, {
      runId: state.runId,
    });
    const saved = await state.t.run(
      async (ctx) => await ctx.db.get(state.runId),
    );
    expect(saved?.state).toBe('completed');
    expect(saved?.toolUsage).toContain(`selection_model:${model.slice(0, 80)}`);
    expect(saved?.toolUsage).toContain('selection_model:truncated');
    expect(saved?.toolUsage).toContain(
      `selection_calls:${saved!.attempts[0]!.id}:1`,
    );
    expect(saved?.toolUsage?.every((label) => label.length <= 100)).toBe(true);
  });

  it('rejects invalid usage at a browser pause without consuming the checkpoint', async () => {
    const state = await fixture();
    const claimed = await state.t.mutation(internal.operationsState.claimRun, {
      runId: state.runId,
      provider: 'cloudflare',
    });
    const pause = {
      runId: state.runId,
      attemptId: claimed!.attemptId,
      callId: 'browser-usage-bounds',
      name: 'read_page',
      arguments: {},
      pageContextFingerprint: 'page-context-runtime-fixture',
    };
    for (const evidence of [
      { inputTokens: -1 },
      { outputTokens: 1.5 },
      { inputTokens: 1_000_001 },
      { toolUsage: ['x'.repeat(101)] },
      { toolUsage: Array.from({ length: 31 }, (_, index) => `tool_${index}`) },
    ]) {
      await expect(
        state.t.mutation(internal.operationsState.pauseClientTool, {
          ...pause,
          ...evidence,
        }),
      ).rejects.toThrow(/VALIDATION_ERROR|usage/);
    }
    const unchanged = await state.t.run(
      async (ctx) => await ctx.db.get(state.runId),
    );
    expect(unchanged?.state).toBe('running');
    expect(unchanged?.attempts[0]?.outcome).toBe('running');
    expect(unchanged?.pendingClientTool).toBeUndefined();
    expect(
      await state.t.mutation(internal.operationsState.pauseClientTool, {
        ...pause,
        inputTokens: 1_000_000,
        outputTokens: 0,
        toolUsage: ['getCurrentCustomerContext'],
      }),
    ).toBe(true);
  });

  it('retains distinct selector call counts when merged diagnostic evidence reaches its limit', async () => {
    const state = await fixture();
    const first = await state.t.mutation(internal.operationsState.claimRun, {
      runId: state.runId,
      provider: 'cloudflare',
    });
    await state.t.mutation(internal.operationsState.pauseClientTool, {
      runId: state.runId,
      attemptId: first!.attemptId,
      callId: 'browser-evidence-bounds',
      name: 'read_page',
      arguments: {},
      pageContextFingerprint: 'page-context-runtime-fixture',
      toolUsage: [
        ...Array.from({ length: 29 }, (_, index) => `phase_one_${index}`),
        `selection_calls:${first!.attemptId}:1`,
      ],
    });
    await state.t.mutation(internal.operationsState.resumeClientTool, {
      environmentKey: 'example-development',
      conversationPublicId: 'conversation_runtimefixture01',
      anonymousHandleHash,
      runPublicId: 'run_runtimefixture01',
      callId: 'browser-evidence-bounds',
      name: 'read_page',
      pageContextFingerprint: 'page-context-runtime-fixture',
      result: { count: 3 },
    });
    const second = await state.t.mutation(internal.operationsState.claimRun, {
      runId: state.runId,
      provider: 'cloudflare',
    });
    await state.t.mutation(internal.operationsState.completeRun, {
      runId: state.runId,
      attemptId: second!.attemptId,
      text: answer().text,
      toolUsage: [
        ...Array.from({ length: 29 }, (_, index) => `phase_two_${index}`),
        `selection_calls:${second!.attemptId}:1`,
      ],
    });
    const saved = await state.t.run(
      async (ctx) => await ctx.db.get(state.runId),
    );
    expect(saved?.state).toBe('completed');
    expect(saved?.toolUsage).toHaveLength(30);
    expect(saved?.toolUsage).toEqual(
      expect.arrayContaining([
        `selection_calls:${first!.attemptId}:1`,
        `selection_calls:${second!.attemptId}:1`,
        'tool_usage:truncated',
      ]),
    );
  });
});
