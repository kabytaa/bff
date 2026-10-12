import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CUSTOMER_AUTH_CONFIGURATION_VERSION,
  DEFAULT_ACCOUNT_POLICY,
  DEFAULT_BUSINESS_ACCOUNT_POLICY,
  DEFAULT_SESSION_POLICY,
  type OperatorWorkConfiguration,
} from '@bff/contracts';
import { BACKOFFICE_OPERATOR_EMAILS } from '@bff/static-config';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { sha256Base64Url } from './lib/customerCrypto';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const operatorIdentity = {
  issuer: 'https://accounts.google.com',
  subject: 'operations-operator',
  tokenIdentifier: 'https://accounts.google.com|operations-operator',
  email: BACKOFFICE_OPERATOR_EMAILS[0],
  emailVerified: true,
};
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
  bots: [
    {
      key: 'support',
      name: 'Support',
      version: 1,
      kind: 'support',
      instructions: 'Suggest a useful reply.',
      skillKeys: ['help'],
      model: 'qwen3-30b',
    },
    {
      key: 'helper',
      name: 'Helper',
      version: 1,
      kind: 'helper',
      instructions: 'Answer reviewed product questions.',
      skillKeys: ['help'],
      model: 'qwen3-30b',
    },
  ],
  skills: [
    {
      key: 'help',
      name: 'Help',
      version: 1,
      whenToUse: 'When answering product questions.',
      content: 'Reviewed product facts.',
    },
  ],
  events: [
    {
      name: 'item.saved',
      version: 1,
      label: 'Item saved',
      properties: [{ name: 'count', type: 'number', required: true }],
    },
  ],
  pageCapabilities: [
    {
      name: 'read_page',
      description: 'Read the current permitted page summary',
      arguments: [],
      result: [{ name: 'count', type: 'number', required: true }],
    },
  ],
};
const customerArgs = {
  userPublicId: 'user_operationsfixture01',
  accountPublicId: 'account_operationsfixture01',
  membershipPublicId: 'membership_operationsfixture01',
};

describe('Business overview KPIs', () => {
  it('counts scoped seven-day activity and unique verified customers, not anonymous or lifetime usage', async () => {
    const state = await fixture();
    const kpis = [
      {
        key: 'saves',
        label: 'Item saves',
        description: 'Recorded saves.',
        measure: 'event_count' as const,
        eventNames: ['item.saved'],
      },
      {
        key: 'active',
        label: 'Active customers',
        description: 'Known customers in recorded activity.',
        measure: 'active_customers' as const,
        eventNames: ['item.saved'],
      },
    ];
    await state.t.mutation(internal.operations.configure, {
      environmentKey: state.environment.key,
      expectedRevision: 1,
      configuration: { ...configuration, kpis },
    });
    const other = await state.t.mutation(internal.businessEnvironments.create, {
      key: 'other-development',
      businessName: 'Other',
      environmentName: 'Development',
    });
    await state.t.run(async (ctx) => {
      const now = Date.now();
      for (const [index, event] of [
        {
          environmentId: state.environment.id,
          occurredAt: now - 1000,
          userId: state.userId,
        },
        {
          environmentId: state.environment.id,
          occurredAt: now - 2000,
          userId: state.userId,
        },
        { environmentId: state.environment.id, occurredAt: now - 3000 },
        {
          environmentId: state.environment.id,
          occurredAt: now - 8 * 86400000,
          userId: state.userId,
        },
        {
          environmentId: state.environment.id,
          occurredAt: now + 86400000,
          userId: state.userId,
        },
        { environmentId: other.id, occurredAt: now - 1000 },
      ].entries())
        await ctx.db.insert('businessEvents', {
          ...event,
          deduplicationId: `kpi-${index}`,
          name: 'item.saved',
          version: 1,
          receivedAt: now,
          properties: {},
        });
    });
    const result = await state.operator.query(api.operations.overview, {
      environmentKey: state.environment.key,
    });
    expect(result.businessKpis).toHaveLength(1);
    expect(
      result.businessKpis[0]!.metrics.map((metric) => metric.value),
    ).toEqual([3, 1]);
    expect(result.businessKpis[0]!.complete).toBe(true);
    expect(
      (
        await state.operator.query(api.operations.overview, {})
      ).businessKpis[0]!.metrics.map((metric) => metric.value),
    ).toEqual([3, 1]);
    await expect(state.t.query(api.operations.overview, {})).rejects.toThrow();
  });

  it('qualifies a bounded activity sample and preserves old configuration without KPIs', async () => {
    const state = await fixture();
    expect(
      (await state.operator.query(api.operations.overview, {})).businessKpis,
    ).toEqual([]);
    await state.t.mutation(internal.operations.configure, {
      environmentKey: state.environment.key,
      expectedRevision: 1,
      configuration: {
        ...configuration,
        kpis: [
          {
            key: 'saves',
            label: 'Item saves',
            description: 'Recorded saves.',
            measure: 'event_count',
            eventNames: ['item.saved'],
          },
        ],
      },
    });
    await state.t.run(async (ctx) => {
      for (let index = 0; index < 501; index++)
        await ctx.db.insert('businessEvents', {
          environmentId: state.environment.id,
          deduplicationId: `bounded-${index}`,
          name: 'item.saved',
          version: 1,
          occurredAt: Date.now() - index,
          receivedAt: Date.now(),
          properties: {},
        });
    });
    const result = await state.operator.query(api.operations.overview, {
      environmentKey: state.environment.key,
    });
    expect(result.businessKpis[0]!.metrics[0]!.value).toBe(500);
    expect(result.businessKpis[0]!.complete).toBe(false);
  });
});

async function fixture() {
  const t = convexTest(schema, modules);
  const environment = await t.mutation(internal.businessEnvironments.create, {
    key: 'example-development',
    businessName: 'Example',
    environmentName: 'Development',
  });
  await t.mutation(internal.businessEnvironments.configureCustomerAuth, {
    key: environment.key,
    expectedRevision: 0,
    configuration: {
      version: CUSTOMER_AUTH_CONFIGURATION_VERSION,
      definitionRevision: 1,
      definitionFingerprint: 'fnv1a64:0000000000000000',
      presentation: {
        productName: 'Example',
        theme: 'system',
        accentColor: '#112233',
      },
      enabledProviders: ['google'],
      developmentAutomationEnabled: true,
      transport: {
        webOrigins: ['https://example.invalid'],
        sessionAdapterBaseUrl: 'https://session.example.invalid',
        defaultPostLoginPath: '/',
      },
      sessionPolicy: DEFAULT_SESSION_POLICY,
      accountPolicy: DEFAULT_BUSINESS_ACCOUNT_POLICY,
      accountDefaults: DEFAULT_ACCOUNT_POLICY,
    },
  });
  await t.mutation(internal.operations.configure, {
    environmentKey: environment.key,
    expectedRevision: 0,
    configuration,
  });
  const identities = await t.run(async (ctx) => {
    const principalId = await ctx.db.insert('authPrincipals', {
      createdAt: Date.now(),
    });
    const userId = await ctx.db.insert('businessUsers', {
      environmentId: environment.id,
      principalId,
      publicId: customerArgs.userPublicId,
      verifiedEmail: 'verified@example.invalid',
      displayName: 'Verified customer',
      firstSignInProvisioningCompletedAt: Date.now(),
      activeMembershipCount: 1,
      ownedAccountCount: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const accountId = await ctx.db.insert('accounts', {
      environmentId: environment.id,
      publicId: customerArgs.accountPublicId,
      displayName: 'Private workspace',
      ownerUserId: userId,
      activeMembershipCount: 1,
      pendingInvitationCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const membershipId = await ctx.db.insert('memberships', {
      environmentId: environment.id,
      userId,
      accountId,
      publicId: customerArgs.membershipPublicId,
      role: 'owner',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { userId, accountId, membershipId };
  });
  const operator = t.withIdentity(operatorIdentity);
  const contact = await t.mutation(internal.operationsState.intakeContact, {
    environmentKey: environment.key,
    ...customerArgs,
    subject: 'Need help',
    text: 'A saved item does not look right.',
    idempotencyKey: 'contact_operationsfixture01',
  });
  const scope = {
    environmentKey: environment.key,
    conversationId: contact.conversationId,
  };
  return { t, operator, environment, ...identities, contact, scope };
}

async function preparedReply(
  state: Awaited<ReturnType<typeof fixture>>,
  closing = false,
) {
  const current = await state.operator.query(
    api.operations.caseDetail,
    state.scope,
  );
  const draft = await state.operator.mutation(api.operations.saveDraft, {
    ...state.scope,
    ...(current.draft ? { pendingId: current.draft.pendingId } : {}),
    text: 'Here is the reviewed answer.',
  });
  return await state.operator.mutation(api.operations.prepareReply, {
    ...state.scope,
    pendingId: draft.pendingId,
    closing,
  });
}

async function incomingReply(
  state: Awaited<ReturnType<typeof fixture>>,
  deliveryId: Id<'emailDeliveries'>,
  messageId = 'provider-followup-1',
) {
  const delivery = await state.t.run(
    async (ctx) => await ctx.db.get(deliveryId),
  );
  if (!delivery) throw new Error('missing delivery');
  const context = await state.t.query(
    internal.operationsState.deliveryContext,
    { deliveryId },
  );
  const webhook = await state.t.mutation(
    internal.operationsState.recordWebhook,
    {
      eventId: `received-${messageId}`,
      eventType: 'email.received',
      occurredAt: Date.now(),
      providerMessageId: messageId,
      sender: 'verified@example.invalid',
      recipients: [context.envelope.replyTo],
      threadIds: [],
    },
  );
  return await state.t.mutation(internal.operationsState.receiveEmail, {
    receiptId: webhook.receiptId,
    providerInboundMessageId: messageId,
    sender: 'verified@example.invalid',
    recipients: [context.envelope.replyTo],
    subject: 'Re: Need help',
    text: 'Here is new information.',
    replyTokenHash: delivery.replyTokenHash,
  });
}

describe('transactional operator work', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T12:00:00Z'));
    vi.stubEnv('BFF_DEVELOPMENT_OPERATOR_WORK_ENABLED', 'enabled');
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each(['receipt', 'reply'] as const)(
    'correlates a provider webhook after the %s reply address is normalized',
    async (purpose) => {
      const originalRandomValues = crypto.getRandomValues.bind(crypto);
      vi.spyOn(crypto, 'getRandomValues').mockImplementation((bytes) => {
        const result = originalRandomValues(bytes);
        // A zero first byte guarantees the original base64url candidate starts
        // with uppercase A, so this fails deterministically without normalization.
        if (bytes instanceof Uint8Array && bytes.length === 24) bytes[0] = 0;
        return result;
      });
      const state = await fixture();
      const deliveryId =
        purpose === 'receipt'
          ? state.contact.receiptDeliveryId!
          : (
              await state.operator.mutation(api.operations.sendReply, {
                ...state.scope,
                pendingId: (await preparedReply(state)).pendingId,
              })
            ).deliveryId;
      const delivery = await state.t.query(
        internal.operationsState.deliveryContext,
        { deliveryId },
      );
      const replyToken = /^reply\+([^@]+)@/u.exec(
        delivery.envelope.replyTo,
      )![1]!;
      expect(replyToken).toMatch(/^[a-z0-9_-]{32}$/u);
      expect(replyToken.startsWith('a')).toBe(true);
      expect(
        (await state.t.run(async (ctx) => await ctx.db.get(deliveryId)))
          ?.replyTokenHash,
      ).toBe(await sha256Base64Url(replyToken));

      const providerMessageId = `normalized-${purpose}-reply`;
      const recipient = delivery.envelope.replyTo.toUpperCase();
      vi.stubEnv(
        'BFF_OPERATIONS_RESEND_API_KEY',
        'synthetic-mail-key-for-tests-only',
      );
      const fetcher = vi.fn(async (url: string | URL | Request) => {
        const target = String(url);
        if (
          target ===
          `https://api.resend.com/emails/receiving/${providerMessageId}?html_format=cid`
        )
          return Response.json({
            from: 'Verified Customer <VERIFIED@EXAMPLE.INVALID>',
            to: [recipient],
            subject: 'Re: Need help',
            text: 'A real provider follow-up after address normalization.',
            message_id: `<${providerMessageId}@example.invalid>`,
          });
        if (
          target ===
          `https://api.resend.com/emails/receiving/${providerMessageId}/attachments`
        )
          return Response.json({ data: [] });
        throw new Error('Unexpected provider request');
      });
      vi.stubGlobal('fetch', fetcher);
      const webhook = await state.t.mutation(
        internal.operationsState.recordWebhook,
        {
          eventId: `received-${providerMessageId}`,
          eventType: 'email.received',
          occurredAt: Date.now(),
          providerMessageId,
          sender: 'VERIFIED@EXAMPLE.INVALID',
          recipients: [recipient],
          threadIds: [],
        },
      );
      await state.t.action(internal.operationsMail.processWebhook, {
        receiptId: webhook.receiptId,
      });
      const evidence = await state.t.run(async (ctx) => ({
        receipt: await ctx.db.get(webhook.receiptId),
        entry: await ctx.db
          .query('conversationEntries')
          .withIndex('by_environment_inbound_message', (index) =>
            index
              .eq('environmentId', state.environment.id)
              .eq('providerInboundMessageId', providerMessageId),
          )
          .unique(),
      }));
      expect(evidence.receipt?.state).toBe('processed');
      expect(evidence.receipt?.conversationId).toBe(
        state.contact.conversationId,
      );
      expect(evidence.entry).toMatchObject({
        conversationId: state.contact.conversationId,
        kind: 'customer_message',
        text: 'A real provider follow-up after address normalization.',
        internetMessageId: `<${providerMessageId}@example.invalid>`,
      });
      // Reprocessing retained provider evidence must not create a second entry.
      await state.t.action(internal.operationsMail.processWebhook, {
        receiptId: webhook.receiptId,
      });
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );

  it('keeps old environments compatible and validates revision and mailbox collisions', async () => {
    const { t, operator, environment } = await fixture();
    await t.mutation(internal.businessEnvironments.create, {
      key: 'other-development',
      businessName: 'Other',
      environmentName: 'Development',
    });
    expect(
      await t.query(internal.operationsState.publicConfiguration, {
        environmentKey: 'other-development',
      }),
    ).toEqual({ enabled: false, productName: 'Other', contactEmail: null });
    await expect(
      t.mutation(internal.operations.configure, {
        environmentKey: 'other-development',
        expectedRevision: 0,
        configuration,
      }),
    ).rejects.toThrow(/Mailbox|CONFLICT/);
    await expect(
      t.mutation(internal.operations.configure, {
        environmentKey: environment.key,
        expectedRevision: 0,
        configuration,
      }),
    ).rejects.toThrow(/Configuration changed|CONFLICT/);
    const overview = await operator.query(api.operations.overview, {});
    expect(overview.environments).toHaveLength(2);
    expect(overview.counts.open).toBe(1);
    expect(overview.longestWaiting?.waitingSince).toBe(Date.now());
  });

  it('requires an admitted operator and refuses cross-environment notes/drafts', async () => {
    const state = await fixture();
    await expect(
      state.t.query(api.operations.caseDetail, state.scope),
    ).rejects.toThrow(/UNAUTHENTICATED|Authentication/);
    await expect(
      state.t
        .withIdentity({
          ...operatorIdentity,
          email: 'outsider@example.invalid',
        })
        .query(api.operations.overview, {}),
    ).rejects.toThrow(/FORBIDDEN|Operator/);
    await state.t.mutation(internal.businessEnvironments.create, {
      key: 'other-development',
      businessName: 'Other',
      environmentName: 'Development',
    });
    await expect(
      state.operator.mutation(api.operations.addNote, {
        ...state.scope,
        environmentKey: 'other-development',
        text: 'Private note',
      }),
    ).rejects.toThrow(/NOT_FOUND|not found/);
    await state.operator.mutation(api.operations.addNote, {
      ...state.scope,
      text: 'Operator-only sensitive note',
    });
    const context = await state.t.query(internal.operationsState.runContext, {
      runId: state.contact.runId!,
    });
    expect(
      context.entries.some((entry) => entry.text.includes('sensitive')),
    ).toBe(false);
  });

  it('deduplicates contact intake and attributes the verified email rather than caller-supplied identity', async () => {
    const state = await fixture();
    const duplicate = await state.t.mutation(
      internal.operationsState.intakeContact,
      {
        environmentKey: state.environment.key,
        ...customerArgs,
        subject: 'Need help',
        text: 'A saved item does not look right.',
        idempotencyKey: 'contact_operationsfixture01',
      },
    );
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.conversationId).toBe(state.contact.conversationId);
    expect(
      (await state.operator.query(api.operations.caseDetail, state.scope))
        .conversation.contactEmail,
    ).toBe('verified@example.invalid');
    await expect(
      state.t.mutation(internal.operationsState.intakeContact, {
        environmentKey: state.environment.key,
        ...customerArgs,
        subject: 'Need help',
        text: 'Different payload',
        idempotencyKey: 'contact_operationsfixture01',
      }),
    ).rejects.toThrow(/CONFLICT|different/);
    await state.t.run(async (ctx) => {
      await ctx.db.delete(state.membershipId);
    });
    await expect(
      state.t.mutation(internal.operationsState.intakeContact, {
        environmentKey: state.environment.key,
        ...customerArgs,
        subject: 'New help',
        text: 'No longer a member',
        idempotencyKey: 'contact_operationsfixture02',
      }),
    ).rejects.toThrow(/FORBIDDEN|Account/);
  });

  it('requires exact complete preview, rejects duplicate Send and freezes immutable envelope', async () => {
    const state = await fixture();
    const draft = await state.operator.mutation(api.operations.saveDraft, {
      ...state.scope,
      text: 'Reviewed answer',
    });
    await expect(
      state.operator.mutation(api.operations.sendReply, {
        ...state.scope,
        pendingId: draft.pendingId,
      }),
    ).rejects.toThrow(/Preview|CONFLICT/);
    const preview = await state.operator.mutation(api.operations.prepareReply, {
      ...state.scope,
      pendingId: draft.pendingId,
      closing: true,
    });
    expect(preview.envelope?.text).toContain('/support/feedback?token=');
    await expect(
      state.operator.mutation(api.operations.sendReply, {
        ...state.scope,
        pendingId: preview.pendingId,
        closing: false,
      }),
    ).rejects.toThrow(/Preview|CONFLICT/);
    const sent = await state.operator.mutation(api.operations.sendReply, {
      ...state.scope,
      pendingId: preview.pendingId,
      closing: true,
    });
    await expect(
      state.operator.mutation(api.operations.sendReply, {
        ...state.scope,
        pendingId: preview.pendingId,
        closing: true,
      }),
    ).rejects.toThrow(/already|CONFLICT/);
    const context = await state.t.query(
      internal.operationsState.deliveryContext,
      { deliveryId: sent.deliveryId },
    );
    expect(context.envelope).toEqual(preview.envelope);
    const record = await state.t.run(
      async (ctx) => await ctx.db.get(sent.deliveryId),
    );
    expect(record?.approver.email).toBe(operatorIdentity.email);
    expect(record?.approver.kind).toBe('operator');
    expect(
      (await state.operator.query(api.operations.caseDetail, state.scope))
        .conversation.status,
    ).toBe('open');
  });

  it('atomically revokes unstarted Send on a genuine reply even at the same timestamp and retains edited body', async () => {
    const state = await fixture();
    const draft = await preparedReply(state);
    const sent = await state.operator.mutation(api.operations.sendReply, {
      ...state.scope,
      pendingId: draft.pendingId,
    });
    await state.operator.mutation(api.operations.setStatus, {
      ...state.scope,
      status: 'resolved',
    });
    const reply = await incomingReply(state, sent.deliveryId);
    expect(reply.conversationId).toBe(state.contact.conversationId);
    expect(reply.receiptDeliveryId).toBeNull();
    expect(
      await state.t.mutation(internal.operationsState.claimDelivery, {
        deliveryId: sent.deliveryId,
      }),
    ).toBeNull();
    const detail = await state.operator.query(
      api.operations.caseDetail,
      state.scope,
    );
    expect(detail.conversation.status).toBe('open');
    expect(detail.draft?.text).toBe(draft.text);
    expect(detail.draft?.pendingId).not.toBe(draft.pendingId);
    expect(detail.draft?.state).toBe('needs_review');
    await expect(
      state.operator.mutation(api.operations.sendReply, {
        ...state.scope,
        pendingId: draft.pendingId,
      }),
    ).rejects.toThrow(/already|CONFLICT/);
  });

  it('preserves the operator draft and does not automatically regenerate it after a follow-up', async () => {
    const state = await fixture();
    const draft = await preparedReply(state);
    const sent = await state.operator.mutation(api.operations.sendReply, {
      ...state.scope,
      pendingId: draft.pendingId,
    });
    const reply = await incomingReply(state, sent.deliveryId);
    expect(reply.runId).toBeNull();
    const conversation = await state.t.run(
      async (ctx) => await ctx.db.get(state.contact.conversationId),
    );
    expect(conversation?.latestCustomerEntryId).toBe(reply.entryId);
    expect(conversation?.currentDraft?.text).toBe(draft.text);
    expect(conversation?.currentDraft?.state).toBe('needs_review');
    expect(conversation?.activeRunId).toBeUndefined();
  });

  it('reconciles verified callbacks that arrive before the outgoing provider ID is saved', async () => {
    for (const eventType of ['email.delivered', 'email.bounced']) {
      const state = await fixture();
      const draft = await preparedReply(state);
      const sent = await state.operator.mutation(api.operations.sendReply, {
        ...state.scope,
        pendingId: draft.pendingId,
      });
      await state.t.mutation(internal.operationsState.claimDelivery, {
        deliveryId: sent.deliveryId,
      });
      const callback = await state.t.mutation(
        internal.operationsState.recordWebhook,
        {
          eventId: `early-${eventType}`,
          eventType,
          occurredAt: Date.now(),
          providerMessageId: 'fast-id',
          recipients: [],
          threadIds: [],
        },
      );
      expect(
        (
          await state.t.mutation(
            internal.operationsState.processDeliveryWebhook,
            { receiptId: callback.receiptId },
          )
        ).matched,
      ).toBe(false);
      await state.t.mutation(internal.operationsState.recordDeliveryResult, {
        deliveryId: sent.deliveryId,
        attemptCount: 1,
        state: 'accepted',
        providerMessageId: 'fast-id',
      });
      const evidence = await state.t.run(async (ctx) => ({
        delivery: await ctx.db.get(sent.deliveryId),
        receipt: await ctx.db.get(callback.receiptId),
        conversation: await ctx.db.get(state.contact.conversationId),
      }));
      expect(evidence.delivery?.state).toBe(
        eventType === 'email.bounced' ? 'bounced' : 'delivered',
      );
      expect(evidence.receipt?.state).toBe('processed');
      if (eventType === 'email.bounced')
        expect(evidence.conversation?.sendingProhibitedAt).toBeDefined();
    }
  });

  it('records a later permanent provider failure after acceptance and revokes survey availability', async () => {
    const state = await fixture();
    const draft = await preparedReply(state, true);
    const sent = await state.operator.mutation(api.operations.sendReply, {
      ...state.scope,
      pendingId: draft.pendingId,
      closing: true,
    });
    await state.t.mutation(internal.operationsState.claimDelivery, {
      deliveryId: sent.deliveryId,
    });
    await state.t.mutation(internal.operationsState.recordDeliveryResult, {
      deliveryId: sent.deliveryId,
      attemptCount: 1,
      state: 'accepted',
      providerMessageId: 'later-failure',
    });
    const callback = await state.t.mutation(
      internal.operationsState.recordWebhook,
      {
        eventId: 'permanent-failure',
        eventType: 'email.failed',
        occurredAt: Date.now() + 100,
        providerMessageId: 'later-failure',
        recipients: [],
        threadIds: [],
      },
    );
    await state.t.mutation(internal.operationsState.processDeliveryWebhook, {
      receiptId: callback.receiptId,
    });
    const delivery = await state.t.run(
      async (ctx) => await ctx.db.get(sent.deliveryId),
    );
    expect(delivery?.state).toBe('failed');
    expect(delivery?.retryable).toBe(false);
    const token = new URL(draft.envelope!.feedbackUrl!).searchParams.get(
      'token',
    )!;
    expect(
      await state.t.query(internal.operationsState.survey, {
        environmentKey: state.environment.key,
        tokenHash: await sha256Base64Url(token),
      }),
    ).toBeNull();
  });

  it('does not recall an already-claimed send or overwrite a newer operator edit with model output', async () => {
    const state = await fixture();
    const claim = await state.t.mutation(internal.operationsState.claimRun, {
      runId: state.contact.runId!,
      provider: 'mock',
    });
    expect(claim).not.toBeNull();
    const draft = await preparedReply(state);
    const completed = await state.t.mutation(
      internal.operationsState.completeRun,
      {
        runId: state.contact.runId!,
        attemptId: claim!.attemptId,
        text: 'A stale bot suggestion',
      },
    );
    expect(completed.applied).toBe(false);
    expect(
      (await state.operator.query(api.operations.caseDetail, state.scope)).draft
        ?.text,
    ).toBe(draft.text);
    const sent = await state.operator.mutation(api.operations.sendReply, {
      ...state.scope,
      pendingId: draft.pendingId,
    });
    expect(
      await state.t.mutation(internal.operationsState.claimDelivery, {
        deliveryId: sent.deliveryId,
      }),
    ).not.toBeNull();
    await incomingReply(state, sent.deliveryId);
    await state.t.mutation(internal.operationsState.recordDeliveryResult, {
      deliveryId: sent.deliveryId,
      attemptCount: 1,
      state: 'accepted',
      providerMessageId: 'provider-send-1',
    });
    expect(
      (
        await state.t.query(internal.operationsState.deliveryContext, {
          deliveryId: sent.deliveryId,
        })
      ).state,
    ).toBe('accepted');
  });

  it('keeps anonymous helpers scoped by capability and suppresses private history from customer projections', async () => {
    const state = await fixture();
    const anonymousHandleHash = await sha256Base64Url(
      'a-private-opaque-helper-capability',
    );
    const helper = await state.t.mutation(internal.operationsState.helperTurn, {
      environmentKey: state.environment.key,
      anonymousHandleHash,
      text: 'What can this product do?',
      idempotencyKey: 'helper_operationsfixture01',
    });
    const access = {
      environmentKey: state.environment.key,
      conversationPublicId: helper.publicId,
      anonymousHandleHash,
    };
    await expect(
      state.t.query(internal.operationsState.helperHistory, {
        ...access,
        anonymousHandleHash: await sha256Base64Url('different-capability'),
      }),
    ).rejects.toThrow(/FORBIDDEN|capability/);
    await expect(
      state.t.query(internal.operationsState.helperHistory, {
        ...access,
        ...customerArgs,
      }),
    ).rejects.toThrow(/FORBIDDEN|capability/);
    const claim = await state.t.mutation(internal.operationsState.claimRun, {
      runId: helper.runId!,
      provider: 'mock',
    });
    const result = await state.t.mutation(
      internal.operationsState.completeRun,
      {
        runId: helper.runId!,
        attemptId: claim!.attemptId,
        text: 'Here is the documented answer.',
        toolUsage: ['loadSkill'],
      },
    );
    expect(result.entryPublicId).toBeTruthy();
    expect(
      (
        await state.t.query(internal.operationsState.helperHistory, access)
      ).entries.map((entry) => entry.text),
    ).toEqual(['What can this product do?', 'Here is the documented answer.']);
    await state.t.mutation(internal.operationsState.submitHelperFeedback, {
      ...access,
      answerPublicId: result.entryPublicId!,
      rating: 'yes',
    });
    const context = await state.t.query(internal.operationsState.runContext, {
      runId: helper.runId!,
    });
    expect(context.customerFacts).toEqual({
      signedIn: false,
      accountSelected: false,
    });
  });

  it('authorizes one registered client-tool checkpoint and rejects replays and removed membership', async () => {
    const state = await fixture();
    const helper = await state.t.mutation(internal.operationsState.helperTurn, {
      environmentKey: state.environment.key,
      ...customerArgs,
      text: 'Read this page please',
      idempotencyKey: 'helper_operationsfixture02',
      pageContext: { key: 'projects' },
    });
    const claim = await state.t.mutation(internal.operationsState.claimRun, {
      runId: helper.runId!,
      provider: 'mock',
    });
    const context = await state.t.query(internal.operationsState.runContext, {
      runId: helper.runId!,
    });
    await expect(
      state.t.mutation(internal.operationsState.pauseClientTool, {
        runId: helper.runId!,
        attemptId: claim!.attemptId,
        callId: 'tool_operationsfixture01',
        name: 'unregistered',
        arguments: {},
        pageContextFingerprint: context.pageContextFingerprint!,
      }),
    ).rejects.toThrow(/FORBIDDEN|registered/);
    expect(
      await state.t.mutation(internal.operationsState.pauseClientTool, {
        runId: helper.runId!,
        attemptId: claim!.attemptId,
        callId: 'tool_operationsfixture01',
        name: 'read_page',
        arguments: {},
        pageContextFingerprint: context.pageContextFingerprint!,
      }),
    ).toBe(true);
    const resultArgs = {
      environmentKey: state.environment.key,
      conversationPublicId: helper.publicId,
      ...customerArgs,
      runPublicId: context.publicId,
      callId: 'tool_operationsfixture01',
      name: 'read_page',
      pageContextFingerprint: context.pageContextFingerprint!,
      result: { count: 3 },
    };
    await expect(
      state.t.mutation(internal.operationsState.resumeClientTool, {
        ...resultArgs,
        result: { count: 'wrong type' },
      }),
    ).rejects.toThrow(/VALIDATION_ERROR|invalid/);
    await state.t.run(async (ctx) => {
      await ctx.db.delete(state.membershipId);
    });
    expect(
      (
        await state.t.query(internal.operationsState.runContext, {
          runId: helper.runId!,
        })
      ).customerFacts,
    ).toEqual({
      signedIn: true,
      accountSelected: false,
      displayName: 'Verified customer',
    });
    await expect(
      state.t.mutation(internal.operationsState.resumeClientTool, resultArgs),
    ).rejects.toThrow(/FORBIDDEN|Account/);
  });

  it('retains delivery occurrence ordering, blocks complaint sends and activates survey only after actual send evidence', async () => {
    const state = await fixture();
    const preview = await preparedReply(state, true);
    const sent = await state.operator.mutation(api.operations.sendReply, {
      ...state.scope,
      pendingId: preview.pendingId,
      closing: true,
    });
    const token = new URL(preview.envelope!.feedbackUrl!).searchParams.get(
      'token',
    )!;
    const tokenHash = await sha256Base64Url(token);
    expect(
      await state.t.query(internal.operationsState.survey, {
        environmentKey: state.environment.key,
        tokenHash,
      }),
    ).toBeNull();
    await state.t.mutation(internal.operationsState.claimDelivery, {
      deliveryId: sent.deliveryId,
    });
    await state.t.mutation(internal.operationsState.recordDeliveryResult, {
      deliveryId: sent.deliveryId,
      attemptCount: 1,
      state: 'accepted',
      providerMessageId: 'provider-message-1',
    });
    expect(
      (
        await state.t.query(internal.operationsState.survey, {
          environmentKey: state.environment.key,
          tokenHash,
        })
      )?.submitted,
    ).toBe(false);
    await state.t.mutation(internal.businessEnvironments.create, {
      key: 'survey-other-development',
      businessName: 'Other',
      environmentName: 'Development',
    });
    expect(
      await state.t.query(internal.operationsState.survey, {
        environmentKey: 'survey-other-development',
        tokenHash,
      }),
    ).toBeNull();
    await expect(
      state.t.mutation(internal.operationsState.submitSurvey, {
        environmentKey: 'survey-other-development',
        tokenHash,
        rating: 'yes',
      }),
    ).rejects.toThrow(/FORBIDDEN|active/);
    const delivered = await state.t.mutation(
      internal.operationsState.recordWebhook,
      {
        eventId: 'event-delivered',
        eventType: 'email.delivered',
        occurredAt: Date.now() + 100,
        providerMessageId: 'provider-message-1',
        recipients: [],
        threadIds: [],
      },
    );
    await state.t.mutation(internal.operationsState.processDeliveryWebhook, {
      receiptId: delivered.receiptId,
    });
    const old = await state.t.mutation(internal.operationsState.recordWebhook, {
      eventId: 'event-old',
      eventType: 'email.sent',
      occurredAt: Date.now(),
      providerMessageId: 'provider-message-1',
      recipients: [],
      threadIds: [],
    });
    await state.t.mutation(internal.operationsState.processDeliveryWebhook, {
      receiptId: old.receiptId,
    });
    expect(
      (
        await state.t.query(internal.operationsState.deliveryContext, {
          deliveryId: sent.deliveryId,
        })
      ).state,
    ).toBe('delivered');
    const complaint = await state.t.mutation(
      internal.operationsState.recordWebhook,
      {
        eventId: 'event-complaint',
        eventType: 'email.complained',
        occurredAt: Date.now() + 200,
        providerMessageId: 'provider-message-1',
        recipients: [],
        threadIds: [],
      },
    );
    await state.t.mutation(internal.operationsState.processDeliveryWebhook, {
      receiptId: complaint.receiptId,
    });
    const replacement = await preparedReply(state);
    await expect(
      state.operator.mutation(api.operations.sendReply, {
        ...state.scope,
        pendingId: replacement.pendingId,
      }),
    ).rejects.toThrow(/FORBIDDEN|prohibited/);
  });

  it('keeps uncertain sends non-retryable and cancels definite-rejection retries on newer customer information', async () => {
    const state = await fixture();
    const preview = await preparedReply(state);
    const sent = await state.operator.mutation(api.operations.sendReply, {
      ...state.scope,
      pendingId: preview.pendingId,
    });
    await state.t.mutation(internal.operationsState.claimDelivery, {
      deliveryId: sent.deliveryId,
    });
    await state.t.mutation(internal.operationsState.recordDeliveryResult, {
      deliveryId: sent.deliveryId,
      attemptCount: 1,
      state: 'uncertain',
      error: 'Provider outcome could not be established',
    });
    await expect(
      state.operator.mutation(api.operations.retryDelivery, {
        ...state.scope,
        deliveryId: sent.deliveryId,
      }),
    ).rejects.toThrow(/CONFLICT|safely/);
    expect(
      (
        await state.operator.query(api.operations.caseDetail, state.scope)
      ).deliveries.find((item) => item.id === sent.deliveryId)?.retryEligible,
    ).toBe(false);
    const rejected = await fixture();
    const reviewed = await preparedReply(rejected);
    const rejectedSend = await rejected.operator.mutation(
      api.operations.sendReply,
      { ...rejected.scope, pendingId: reviewed.pendingId },
    );
    await rejected.t.mutation(internal.operationsState.claimDelivery, {
      deliveryId: rejectedSend.deliveryId,
    });
    await rejected.t.mutation(internal.operationsState.recordDeliveryResult, {
      deliveryId: rejectedSend.deliveryId,
      attemptCount: 1,
      state: 'failed',
      retryable: true,
      error: 'Definite provider rate-limit rejection',
    });
    expect(
      (
        await rejected.t.query(internal.operationsState.deliveryContext, {
          deliveryId: rejectedSend.deliveryId,
        })
      ).state,
    ).toBe('queued');
    await incomingReply(
      rejected,
      rejectedSend.deliveryId,
      'followup-before-retry',
    );
    vi.setSystemTime(new Date(Date.now() + 31_000));
    expect(
      await rejected.t.mutation(internal.operationsState.claimDelivery, {
        deliveryId: rejectedSend.deliveryId,
      }),
    ).toBeNull();
    expect(
      (
        await rejected.t.query(internal.operationsState.deliveryContext, {
          deliveryId: rejectedSend.deliveryId,
        })
      ).state,
    ).toBe('cancelled');
  });

  it('blocks unsupported/oversize screenshots and keeps regenerated preview storage private', async () => {
    const state = await fixture();
    const attachments = await state.t.mutation(
      internal.operationsState.registerAttachments,
      {
        entryId: state.contact.entryId,
        attachments: [
          {
            providerAttachmentId: 'pdf-1',
            name: 'original.pdf',
            contentType: 'application/pdf',
            byteSize: 10,
          },
          {
            providerAttachmentId: 'large-1',
            name: 'large.png',
            contentType: 'image/png',
            byteSize: 6 * 1024 * 1024,
          },
          {
            providerAttachmentId: 'png-1',
            name: 'screenshot.png',
            contentType: 'image/png',
            byteSize: 100,
          },
        ],
      },
    );
    const detail = await state.operator.query(
      api.operations.caseDetail,
      state.scope,
    );
    expect(
      detail.attachments.filter((attachment) => attachment.state === 'blocked'),
    ).toHaveLength(2);
    expect(JSON.stringify(detail.attachments)).not.toContain('storageId');
    expect(
      await state.t.mutation(internal.operationsState.claimAttachment, {
        attachmentId: attachments[0]!,
      }),
    ).toBe(false);
    expect(
      await state.t.mutation(internal.operationsState.claimAttachment, {
        attachmentId: attachments[2]!,
      }),
    ).toBe(true);
    await state.t.mutation(internal.operationsState.completeAttachment, {
      attachmentId: attachments[2]!,
      blockReason: 'Decoder rejected the actual bytes',
    });
  });

  it('atomically registers incoming screenshots and permits safe replay after metadata failure', async () => {
    const state = await fixture();
    const callback = await state.t.mutation(
      internal.operationsState.recordWebhook,
      {
        eventId: 'incoming-atomic',
        eventType: 'email.received',
        occurredAt: Date.now(),
        providerMessageId: 'incoming-atomic',
        sender: 'someone@example.invalid',
        recipients: [configuration.support.receivingAddress],
        threadIds: [],
      },
    );
    const input = {
      receiptId: callback.receiptId,
      providerInboundMessageId: 'incoming-atomic',
      internetMessageId: '<actual-smtp-id@example.invalid>',
      sender: 'someone@example.invalid',
      recipients: [configuration.support.receivingAddress],
      subject: 'Screenshot question',
      text: 'Please inspect the attached screenshot.',
      attachments: [
        {
          providerAttachmentId: 'file-1',
          name: 'screen.png',
          contentType: 'image/png',
          byteSize: -1,
        },
      ],
    };
    await expect(
      state.t.mutation(internal.operationsState.receiveEmail, input),
    ).rejects.toThrow(/VALIDATION_ERROR|invalid/);
    expect(
      (
        await state.t.query(internal.operationsState.webhookContext, {
          receiptId: callback.receiptId,
        })
      ).state,
    ).toBe('pending');
    const result = await state.t.mutation(
      internal.operationsState.receiveEmail,
      { ...input, attachments: [{ ...input.attachments[0]!, byteSize: 100 }] },
    );
    expect(result.entryId).toBeTruthy();
    expect(
      (
        await state.t.query(internal.operationsState.webhookContext, {
          receiptId: callback.receiptId,
        })
      ).state,
    ).toBe('processed');
    const attachments = await state.t.run(
      async (ctx) =>
        await ctx.db
          .query('supportAttachments')
          .withIndex('by_conversation_entry', (index) =>
            index
              .eq('conversationId', result.conversationId!)
              .eq('entryId', result.entryId!),
          )
          .take(4),
    );
    expect(attachments).toHaveLength(1);
    expect(attachments[0]?.state).toBe('pending');
    const scope = {
      environmentKey: state.environment.key,
      conversationId: result.conversationId!,
    };
    const draft = await state.operator.mutation(api.operations.saveDraft, {
      ...scope,
      text: 'Reviewed response',
    });
    const preview = await state.operator.mutation(api.operations.prepareReply, {
      ...scope,
      pendingId: draft.pendingId,
    });
    expect(preview.envelope?.headers).toEqual([
      { name: 'In-Reply-To', value: input.internetMessageId },
      { name: 'References', value: input.internetMessageId },
    ]);
    expect(JSON.stringify(preview.envelope?.headers)).not.toContain(
      'incoming-atomic',
    );
    expect(
      (
        await state.t.mutation(internal.operationsState.receiveEmail, {
          ...input,
          attachments: [{ ...input.attachments[0]!, byteSize: 100 }],
        })
      ).duplicate,
    ).toBe(true);
  });

  it('restricts paginated bot investigation to operators and explicit conversation scope', async () => {
    const state = await fixture();
    const paginationOpts = { cursor: null, numItems: 10 };
    await expect(
      state.t.query(api.operations.runs, { paginationOpts }),
    ).rejects.toThrow(/UNAUTHENTICATED|identity|operator/i);
    const scoped = await state.operator.query(api.operations.runs, {
      ...state.scope,
      paginationOpts,
    });
    expect(scoped.page).toHaveLength(1);
    expect(scoped.page[0]).toMatchObject({
      id: state.contact.runId,
      environmentKey: state.environment.key,
      state: 'queued',
      attempts: [],
      toolUsage: [],
    });
    await expect(
      state.operator.query(api.operations.runs, {
        conversationId: state.contact.conversationId,
        paginationOpts,
      }),
    ).rejects.toThrow(/explicit|VALIDATION_ERROR/);
    await state.t.mutation(internal.businessEnvironments.create, {
      key: 'other-runs-development',
      businessName: 'Other',
      environmentName: 'Development',
    });
    await expect(
      state.operator.query(api.operations.runs, {
        ...state.scope,
        environmentKey: 'other-runs-development',
        paginationOpts,
      }),
    ).rejects.toThrow(/NOT_FOUND|scope/);
    expect(
      (
        await state.operator.query(api.operations.runs, {
          environmentKey: 'other-runs-development',
          paginationOpts,
        })
      ).page,
    ).toHaveLength(0);
    await state.t.run(async (ctx) => await ctx.db.delete(state.membershipId));
    await expect(
      state.t.mutation(internal.operationsState.ingestEvent, {
        environmentKey: state.environment.key,
        name: 'item.saved',
        version: 1,
        occurredAt: Date.now(),
        properties: { count: 1 },
        deduplicationId: 'removed-membership',
        userPublicId: customerArgs.userPublicId,
        accountPublicId: customerArgs.accountPublicId,
      }),
    ).rejects.toThrow(/FORBIDDEN|membership/);
  });

  it('validates registered Business events and seeds development without sending or erasing unrelated records', async () => {
    const state = await fixture();
    const eventArgs = {
      environmentKey: state.environment.key,
      deduplicationId: 'save-operation-1',
      name: 'item.saved',
      version: 1,
      occurredAt: Date.now(),
      properties: { count: 4 },
      ...customerArgs,
    };
    expect(
      (await state.t.mutation(internal.operationsState.ingestEvent, eventArgs))
        .duplicate,
    ).toBe(false);
    expect(
      (await state.t.mutation(internal.operationsState.ingestEvent, eventArgs))
        .duplicate,
    ).toBe(true);
    expect(
      (
        await state.t.mutation(internal.operationsState.ingestEvent, {
          ...eventArgs,
          membershipPublicId: undefined,
          deduplicationId: 'server-job-current-membership',
        })
      ).duplicate,
    ).toBe(false);
    await expect(
      state.t.mutation(internal.operationsState.ingestEvent, {
        ...eventArgs,
        properties: { count: 4, secret: 'unregistered' },
      }),
    ).rejects.toThrow(/VALIDATION_ERROR|invalid/);
    const payload = JSON.stringify({
      cases: [
        {
          key: 'sample.case',
          subject: 'Synthetic question',
          contactEmail: 'synthetic@example.invalid',
          status: 'open',
          createdAt: Date.now() - 1_000,
          entries: [
            {
              kind: 'customer_message',
              text: 'A realistic synthetic question',
              actorLabel: 'Synthetic person',
              createdAt: Date.now() - 1_000,
            },
          ],
          draft: 'Suggested answer for review.',
        },
      ],
    });
    expect(
      await state.t.mutation(internal.operations.seedDevelopment, {
        environmentKey: state.environment.key,
        payload,
      }),
    ).toEqual({ created: 1, existing: 0 });
    expect(
      await state.t.mutation(internal.operations.seedDevelopment, {
        environmentKey: state.environment.key,
        payload,
      }),
    ).toEqual({ created: 0, existing: 1 });
    const overview = await state.operator.query(api.operations.overview, {
      environmentKey: state.environment.key,
    });
    expect(overview.counts.open).toBe(2);
    expect(overview.longestWaiting?.subject).toBe('Synthetic question');
    vi.stubEnv('BFF_DEVELOPMENT_OPERATOR_WORK_ENABLED', 'disabled');
    await expect(
      state.t.mutation(internal.operations.seedDevelopment, {
        environmentKey: state.environment.key,
        payload,
      }),
    ).rejects.toThrow(/FORBIDDEN|development-only/);
  });
});
