import rateLimiterTest from '@convex-dev/rate-limiter/test';
import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  composeAssistantInstructions,
  prepareAssistantKnowledge,
} from '@bff/assistant/server';

import {
  CUSTOMER_AUTH_CONFIGURATION_VERSION,
  DEFAULT_ACCOUNT_POLICY,
  DEFAULT_SESSION_POLICY,
  type CustomerAuthConfiguration,
  type OperatorWorkConfiguration,
} from '@bff/contracts';
import { api, internal } from './_generated/api';
import schema from './schema';
import { sha256Base64Url } from './lib/customerCrypto';

const modules = import.meta.glob('./**/*.ts');
const environmentKey = 'example-development';
const origin = 'https://example-dev.tofler.app';
const configuration: OperatorWorkConfiguration = {
  version: 1,
  enabled: true,
  presentation: {
    productName: 'Example',
    helpUrl: `${origin}/support/feedback`,
    contactEmail: 'help@example.invalid',
  },
  support: {
    botKey: 'support',
    fromEmail: 'help@example.invalid',
    fromName: 'Example',
    receivingAddress: 'help@example.invalid',
    replyDomain: 'example.invalid',
    receiptText: 'Your message is saved.',
    surveyQuestion: 'Did you get the help you needed?',
  },
  bots: [
    {
      key: 'helper',
      name: 'Example help',
      kind: 'helper',
      version: 1,
      model: 'qwen3-30b',
      instructions: 'Give documented help only.',
      skillKeys: [],
    },
    {
      key: 'support',
      name: 'Example support',
      kind: 'support',
      version: 1,
      model: 'qwen3-30b',
      instructions: 'Draft help only.',
      skillKeys: [],
    },
  ],
  skills: [],
  events: [],
  pageCapabilities: [],
};
const auth: CustomerAuthConfiguration = {
  version: CUSTOMER_AUTH_CONFIGURATION_VERSION,
  definitionRevision: 1,
  definitionFingerprint: 'fnv1a64:0000000000000000',
  presentation: {
    productName: 'Example',
    theme: 'system',
    accentColor: '#314EC6',
  },
  enabledProviders: ['google'],
  developmentAutomationEnabled: true,
  transport: {
    webOrigins: [origin],
    sessionAdapterBaseUrl: 'https://example-backend.convex.site',
    defaultPostLoginPath: '/',
  },
  sessionPolicy: DEFAULT_SESSION_POLICY,
  accountPolicy: {
    createAccountOnFirstSignIn: false,
    userAccountCreationEnabled: false,
    maxAccountMembershipsPerUser: 2,
    maxOwnedAccountsPerUser: 2,
    ownershipTransferEnabled: false,
  },
  accountDefaults: DEFAULT_ACCOUNT_POLICY,
};
afterEach(() => vi.unstubAllEnvs());
async function fixture() {
  vi.stubEnv('BFF_DEVELOPMENT_OPERATOR_WORK_ENABLED', 'enabled');
  vi.stubEnv('BFF_OPERATIONS_AI_MODE', 'mock');
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  await t.mutation(internal.businessEnvironments.create, {
    key: environmentKey,
    businessName: 'Example',
    environmentName: 'Development',
  });
  await t.mutation(internal.businessEnvironments.configureCustomerAuth, {
    key: environmentKey,
    expectedRevision: 0,
    configuration: auth,
  });
  await t.mutation(internal.operations.configure, {
    environmentKey,
    expectedRevision: 0,
    configuration,
  });
  return t;
}
function headers(extra?: Record<string, string>) {
  return {
    origin,
    'x-tofler-environment': environmentKey,
    'content-type': 'application/json',
    ...extra,
  };
}
function turn(id = 'question_http_synthetic01') {
  return {
    environmentKey,
    page: { key: '/' },
    message: { id, text: 'How do I print my cards?' },
  };
}
function streamData(text: string): Array<Record<string, unknown>> {
  return text
    .split('\n')
    .filter((line) => line.startsWith('data: ') && !line.includes('[DONE]'))
    .map((line) => JSON.parse(line.slice(6)) as Record<string, unknown>);
}

describe('guarded Operator HTTP workflows', () => {
  it('exposes only safe public settings and registered CORS origins', async () => {
    const t = await fixture();
    const response = await t.fetch('/v1/operations/config', {
      headers: headers(),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe(origin);
    expect(await response.json()).toEqual({
      enabled: true,
      productName: 'Example',
      contactEmail: 'help@example.invalid',
    });
    expect(
      (
        await t.fetch('/v1/operations/config', {
          headers: headers({ origin: 'https://attacker.invalid' }),
        })
      ).status,
    ).toBe(403);
    const preflight = await t.fetch('/v1/operations/helper', {
      method: 'OPTIONS',
      headers: headers(),
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('cache-control')).toContain('no-store');
    expect(preflight.headers.get('x-content-type-options')).toBe('nosniff');
  });
  it('saves an anonymous helper answer through current UI protocol and capability-scoped feedback', async () => {
    const t = await fixture();
    const response = await t.fetch('/v1/operations/helper', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(turn()),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    const parts = streamData(await response.text());
    const session = parts.find((part) => part.type === 'data-session')
      ?.data as { conversationId: string; capability: string; mocked: boolean };
    expect(session.mocked).toBe(true);
    expect(session.capability).toHaveLength(43);
    const answer = String(
      parts.find((part) => part.type === 'start')?.messageId,
    );
    const body = {
      environmentKey,
      ...session,
      answerEntryId: answer,
      choice: 'partly',
    };
    expect(
      (
        await t.fetch('/v1/operations/feedback', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify(body),
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await t.fetch('/v1/operations/feedback', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ ...body, capability: 'x'.repeat(43) }),
        })
      ).status,
    ).toBe(403);
    const rows = await t.run(
      async (ctx) => await ctx.db.query('feedbackRecords').take(10),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.rating).toBe('partly');
  });
  it.each(['inline', 'lazy'] as const)(
    'uses shared behavior with automatic %s assigned knowledge in the actual run',
    async (strategy) => {
      const t = await fixture();
      const skill = {
        key: 'example.basics',
        name: 'Example basics',
        whenToUse: 'Questions about Example',
        version: 1,
        content:
          'Reviewed Example facts for the current product.' +
          (strategy === 'lazy' ? 'x'.repeat(10_001) : ''),
      };
      await t.mutation(internal.operations.configure, {
        environmentKey,
        expectedRevision: 1,
        configuration: {
          ...configuration,
          skills: [skill],
          bots: configuration.bots.map((bot) => ({
            ...bot,
            skillKeys: [skill.key],
          })),
        },
      });
      vi.stubEnv('BFF_OPERATIONS_AI_MODE', 'live');
      vi.stubEnv('BFF_OPERATIONS_CAPS_VERIFIED', 'verified');
      vi.stubEnv('BFF_OPERATIONS_PROVIDER_BASE_URL', 'https://private.example');
      vi.stubEnv(
        'BFF_OPERATIONS_PROVIDER_SECRET',
        'synthetic-private-provider-secret-for-test',
      );
      const requests: Array<{
        messages: Array<{ role: string; content: string | null }>;
        tools: Array<{ function: { name: string } }>;
        tool_choice: string;
      }> = [];
      const fetcher = vi.fn(async (_input: unknown, init?: RequestInit) => {
        requests.push(JSON.parse(String(init?.body)));
        const selecting = strategy === 'lazy' && requests.length === 1;
        return Response.json({
          id: `step-${requests.length}`,
          object: 'chat.completion',
          created: 0,
          model: '@cf/qwen/qwen3-30b-a3b-fp8',
          choices: [
            {
              index: 0,
              finish_reason: selecting ? 'tool_calls' : 'stop',
              message: {
                role: 'assistant',
                content: selecting ? null : 'A useful suggested answer.',
                ...(selecting
                  ? {
                      tool_calls: [
                        {
                          id: 'assigned-read',
                          type: 'function',
                          function: {
                            name: 'loadSkill',
                            arguments: '{"key":"example.basics"}',
                          },
                        },
                      ],
                    }
                  : {}),
              },
            },
          ],
        });
      });
      vi.stubGlobal('fetch', fetcher);
      try {
        const response = await t.fetch('/v1/operations/helper', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify(turn('shared_behavior_synthetic01')),
        });
        expect(response.status).toBe(200);
        expect(await response.text()).toContain('A useful suggested answer.');
        expect(fetcher).toHaveBeenCalledTimes(strategy === 'inline' ? 1 : 2);
        expect(
          requests[0]?.messages.find(({ role }) => role === 'system')?.content,
        ).toBe(
          composeAssistantInstructions({
            kind: 'helper',
            businessInstructions: configuration.bots[0]!.instructions,
            ...prepareAssistantKnowledge([skill]),
            pageContext: { key: '/' },
          }),
        );
        expect(requests[0]?.tools.map(({ function: fn }) => fn.name)).toEqual([
          ...(strategy === 'lazy'
            ? ['loadSkill']
            : ['getCurrentCustomerContext']),
        ]);
        expect(requests[0]?.tool_choice).toBe(
          strategy === 'inline' ? 'auto' : 'required',
        );
        expect(
          requests[strategy === 'inline' ? 0 : 1]?.messages.some(
            ({ content }) =>
              typeof content === 'string' && content.includes(skill.content),
          ),
        ).toBe(true);
        const runs = await t.run(
          async (ctx) => await ctx.db.query('botRuns').take(10),
        );
        expect(runs[0]?.state).toBe('completed');
        expect(runs[0]?.toolUsage).toEqual(
          strategy === 'inline' ? [] : ['loadSkill'],
        );
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );
  it('keeps truncated non-empty answers failed rather than saving a successful bot reply', async () => {
    const t = await fixture();
    vi.stubEnv('BFF_OPERATIONS_AI_MODE', 'live');
    vi.stubEnv('BFF_OPERATIONS_CAPS_VERIFIED', 'verified');
    vi.stubEnv('BFF_OPERATIONS_PROVIDER_BASE_URL', 'https://private.example');
    vi.stubEnv(
      'BFF_OPERATIONS_PROVIDER_SECRET',
      'synthetic-private-provider-secret-for-test',
    );
    const fetcher = vi.fn(async () =>
      Response.json({
        id: 'truncated-run',
        object: 'chat.completion',
        created: 0,
        model: '@cf/qwen/qwen3-30b-a3b-fp8',
        choices: [
          {
            index: 0,
            finish_reason: 'length',
            message: {
              role: 'assistant',
              content: 'An unfinished answer that must not pass.',
            },
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetcher);
    try {
      const response = await t.fetch('/v1/operations/helper', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(turn('truncated_answer_synthetic01')),
      });
      expect(response.status).toBe(503);
      expect(fetcher).toHaveBeenCalledTimes(1);
      const runs = await t.run(
        async (ctx) => await ctx.db.query('botRuns').take(10),
      );
      expect(runs[0]?.state).toBe('failed');
      const entries = await t.run(
        async (ctx) => await ctx.db.query('conversationEntries').take(10),
      );
      expect(entries.some(({ kind }) => kind === 'customer_message')).toBe(
        true,
      );
      expect(entries.some(({ kind }) => kind === 'bot_answer')).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('does not downgrade invalid authentication into anonymous access or allow signed-out contact', async () => {
    const t = await fixture();
    expect(
      (
        await t.fetch('/v1/operations/helper', {
          method: 'POST',
          headers: headers({ authorization: 'Bearer invalid-token' }),
          body: JSON.stringify(turn()),
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await t.fetch('/v1/operations/contact', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            environmentKey,
            kind: 'problem',
            subject: 'Printing',
            message: 'Need help',
            idempotencyKey: 'contact_http_synthetic01',
          }),
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await t.fetch('/v1/operations/helper', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            ...turn(),
            environmentKey: 'other-development',
          }),
        })
      ).status,
    ).toBe(403);
  });
  it('resumes a saved browser tool with a short opaque provider call ID, and rejects replay', async () => {
    const t = await fixture();
    await t.mutation(internal.operations.configure, {
      environmentKey,
      expectedRevision: 1,
      configuration: {
        ...configuration,
        pageCapabilities: [
          {
            name: 'read_page',
            description: 'Read current page',
            arguments: [],
            result: [{ name: 'count', type: 'number', required: true }],
          },
        ],
      },
    });
    const capability = 'b'.repeat(43);
    const anonymousHandleHash = await sha256Base64Url(capability);
    const turn = await t.mutation(internal.operationsState.helperTurn, {
      environmentKey,
      anonymousHandleHash,
      text: 'What is here?',
      idempotencyKey: 'browser_http_synthetic01',
      pageContext: { key: '/' },
    });
    const claim = await t.mutation(internal.operationsState.claimRun, {
      runId: turn.runId!,
      provider: 'development-mock',
    });
    const pageContextFingerprint = await sha256Base64Url(
      JSON.stringify({ key: '/' }),
    );
    expect(
      await t.mutation(internal.operationsState.pauseClientTool, {
        runId: turn.runId!,
        attemptId: claim!.attemptId,
        callId: 'call_1',
        name: 'read_page',
        arguments: {},
        pageContextFingerprint,
      }),
    ).toBe(true);
    const body = JSON.stringify({
      environmentKey,
      conversationId: turn.publicId,
      capability,
      page: { key: '/' },
      toolResults: [
        {
          toolCallId: 'call_1',
          toolName: 'read_page',
          output: { count: 3 },
          contextKey: '/',
        },
      ],
    });
    expect(
      (
        await t.fetch('/v1/operations/helper', {
          method: 'POST',
          headers: headers(),
          body,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await t.fetch('/v1/operations/helper', {
          method: 'POST',
          headers: headers(),
          body,
        })
      ).status,
    ).toBe(409);
  });
  it('never accepts unsigned callbacks or unauthenticated Business event reporting', async () => {
    const t = await fixture();
    expect(
      (
        await t.fetch('/v1/operations/resend', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await t.fetch('/v1/operations/events', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            environmentKey,
            deduplicationId: 'synthetic_event',
            name: 'project.saved',
            version: 1,
            occurredAt: Date.now(),
            properties: {},
          }),
        })
      ).status,
    ).toBe(403);
    const receipts = await t.run(
      async (ctx) => await ctx.db.query('emailWebhookReceipts').take(10),
    );
    expect(receipts).toHaveLength(0);
  });
  it('records a visible failed run when AI is disabled without calling a provider', async () => {
    const t = await fixture();
    vi.stubEnv('BFF_OPERATIONS_AI_MODE', 'disabled');
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    try {
      const response = await t.fetch('/v1/operations/helper', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(turn('disabled_http_synthetic01')),
      });
      expect(response.status).toBe(503);
      expect(fetcher).not.toHaveBeenCalled();
      const runs = await t.run(
        async (ctx) => await ctx.db.query('botRuns').take(10),
      );
      expect(runs).toHaveLength(1);
      expect(runs[0]?.state).toBe('failed');
      expect(runs[0]?.error).toContain('temporarily unavailable');
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('keeps GET survey read-only and fails closed for unknown capabilities', async () => {
    const t = await fixture();
    const token = 'a'.repeat(43);
    expect(
      await (
        await t.fetch(`/v1/operations/survey?token=${token}`, {
          headers: headers(),
        })
      ).json(),
    ).toEqual({ active: false });
    expect(
      (
        await t.fetch('/v1/operations/survey', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ token, choice: 'yes' }),
        })
      ).status,
    ).toBe(403);
    expect(
      await t.run(
        async (ctx) => await ctx.db.query('feedbackRecords').take(10),
      ),
    ).toHaveLength(0);
  });
  it('does not expose a private screenshot to unauthenticated callers', async () => {
    const t = await fixture();
    const attachmentId = await t.run(async (ctx) => {
      const environment = await ctx.db
        .query('businessEnvironments')
        .withIndex('by_key', (index) => index.eq('key', environmentKey))
        .unique();
      if (!environment) throw new Error('Fixture environment missing');
      const conversationId = await ctx.db.insert('conversations', {
        environmentId: environment._id,
        publicId: 'conversation_screenshot01',
        kind: 'support',
        botKey: 'support',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const entryId = await ctx.db.insert('conversationEntries', {
        environmentId: environment._id,
        conversationId,
        publicId: 'entry_screenshot001',
        kind: 'customer_message',
        visibility: 'customer',
        actor: { kind: 'customer', label: 'Synthetic' },
        actorKey: 'synthetic',
        text: 'Screenshot',
        createdAt: Date.now(),
      });
      return await ctx.db.insert('supportAttachments', {
        environmentId: environment._id,
        conversationId,
        entryId,
        providerAttachmentId: 'file_synthetic',
        claimedName: 'Screenshot.png',
        claimedType: 'image/png',
        claimedBytes: 1,
        state: 'blocked',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    await expect(
      t.action(api.operationsAttachments.readPreview, {
        environmentKey,
        attachmentId,
      }),
    ).rejects.toThrow(/UNAUTHENTICATED|Authentication/u);
  });
});
