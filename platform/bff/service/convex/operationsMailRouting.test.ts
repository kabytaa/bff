import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OperatorWorkConfiguration } from '@bff/contracts';
import { internal } from './_generated/api';
import schema from './schema';
import { sha256Base64Url } from './lib/customerCrypto';

const modules = import.meta.glob('./**/*.ts');
const sender = 'customer@example.invalid';
const localMailbox = 'help-dev@example.invalid';
const foreignMailbox = 'help@example.invalid';
const replyToken = 'b'.repeat(32);
const replyAddress = `reply+${replyToken}@reply-dev.example.invalid`;
const configuration: OperatorWorkConfiguration = {
  version: 1,
  enabled: true,
  presentation: {
    productName: 'Example',
    helpUrl: 'https://example.invalid/help',
    contactEmail: localMailbox,
  },
  support: {
    botKey: 'support',
    fromEmail: localMailbox,
    fromName: 'Example support',
    receivingAddress: localMailbox,
    replyDomain: 'reply-dev.example.invalid',
    receiptText: 'Received.',
    surveyQuestion: 'Did this help?',
  },
  bots: [],
  skills: [],
  events: [],
  pageCapabilities: [],
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function fixture() {
  const t = convexTest(schema, modules);
  const records = await t.run(async (ctx) => {
    const now = Date.now();
    const environmentId = await ctx.db.insert('businessEnvironments', {
      key: 'example-development',
      businessName: 'Example',
      environmentName: 'Development',
      operatorWork: configuration,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert('conversations', {
      environmentId,
      publicId: 'conversation_routing_fixture',
      kind: 'support',
      botKey: 'support',
      subject: 'Help',
      contactEmail: sender,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    });
    const entryId = await ctx.db.insert('conversationEntries', {
      environmentId,
      conversationId,
      publicId: 'entry_routing_fixture',
      kind: 'outgoing_reply',
      visibility: 'customer',
      actor: { kind: 'system', label: 'System' },
      actorKey: 'system',
      text: 'A reviewed reply.',
      createdAt: now,
      envelope: {
        from: `Example support <${localMailbox}>`,
        to: sender,
        replyTo: replyAddress,
        subject: 'Re: Help',
        text: 'A reviewed reply.',
        headers: [],
        attachmentIds: [],
      },
    });
    const deliveryId = await ctx.db.insert('emailDeliveries', {
      environmentId,
      conversationId,
      entryId,
      provider: 'resend',
      providerMessageId: 'message_local_fixture',
      purpose: 'reply',
      payloadFingerprint: 'synthetic-fingerprint',
      idempotencyKey: 'mail_routing_fixture',
      state: 'accepted',
      attemptCount: 1,
      approver: { kind: 'system', label: 'System' },
      approvedAt: now,
      replyTokenHash: await sha256Base64Url(replyToken),
      createdAt: now,
      updatedAt: now,
    });
    return { environmentId, conversationId, deliveryId };
  });
  return { t, ...records };
}

async function signedWebhook(input: {
  eventType: string;
  providerMessageId?: string;
  from: string;
  to: string[];
}) {
  const secret = new Uint8Array(32).fill(7);
  vi.stubEnv(
    'BFF_OPERATIONS_RESEND_WEBHOOK_SECRET',
    `whsec_${btoa(String.fromCharCode(...secret))}`,
  );
  const timestamp = String(Math.floor(Date.now() / 1_000));
  const eventId = 'event_routing_fixture';
  const body = JSON.stringify({
    type: input.eventType,
    created_at: new Date().toISOString(),
    data: {
      email_id: input.providerMessageId ?? 'message_foreign_fixture',
      from: input.from,
      to: input.to,
    },
  });
  const key = await crypto.subtle.importKey(
    'raw',
    secret,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${eventId}.${timestamp}.${body}`),
    ),
  );
  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'svix-id': eventId,
      'svix-timestamp': timestamp,
      'svix-signature': `v1,${btoa(String.fromCharCode(...signature))}`,
    },
    body,
  };
}

describe('deployment-local support mail routing', () => {
  it.each([
    { eventType: 'email.received', from: sender, to: [foreignMailbox] },
    {
      eventType: 'email.received',
      from: sender,
      to: [localMailbox, foreignMailbox],
    },
    {
      eventType: 'email.received',
      from: sender,
      to: [replyAddress.replace('reply-dev.', 'reply.')],
    },
    {
      eventType: 'email.received',
      from: 'other@example.invalid',
      to: [replyAddress],
    },
    { eventType: 'email.delivered', from: foreignMailbox, to: [sender] },
  ])(
    'acknowledges foreign or ambiguous $eventType without persisting or downloading it ($to)',
    async (input) => {
      const { t } = await fixture();
      const fetcher = vi.fn<typeof fetch>();
      vi.stubGlobal('fetch', fetcher);
      const response = await t.fetch(
        '/v1/operations/resend',
        await signedWebhook(input),
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true, ignored: true });
      expect(
        await t.run((ctx) => ctx.db.query('emailWebhookReceipts').take(10)),
      ).toEqual([]);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it.each([
    { address: 'mailbox', route: 'direct' },
    { address: 'from', route: 'direct' },
    { address: 'mailbox', route: 'correlated' },
    { address: 'from', route: 'correlated' },
  ])(
    'ignores its own $address sender on a $route route before receipt storage or download',
    async ({ address, route }) => {
      const { t, environmentId, conversationId } = await fixture();
      const fromEmail = 'send-dev@example.invalid';
      const selfSender = address === 'from' ? fromEmail : localMailbox;
      await t.run(async (ctx) => {
        await ctx.db.patch(environmentId, {
          operatorWork: {
            ...configuration,
            support: { ...configuration.support, fromEmail },
          },
        });
        // A legacy self-addressed case must not make its reply token routable.
        await ctx.db.patch(conversationId, { contactEmail: selfSender });
      });
      const fetcher = vi.fn<typeof fetch>();
      vi.stubGlobal('fetch', fetcher);
      const response = await t.fetch(
        '/v1/operations/resend',
        await signedWebhook({
          eventType: 'email.received',
          from: `Support <${selfSender.toUpperCase()}>`,
          to: [route === 'direct' ? localMailbox : replyAddress],
        }),
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true, ignored: true });
      expect(
        await t.run((ctx) => ctx.db.query('emailWebhookReceipts').take(10)),
      ).toEqual([]);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it('accepts only one exact local mailbox or a sender-bound frozen reply address', async () => {
    const { t } = await fixture();
    const accepts = (recipients: string[], from = sender) =>
      t.query(internal.lib.operationsMailRouting.acceptsWebhook, {
        eventType: 'email.received',
        providerMessageId: 'incoming_fixture',
        sender: from,
        recipients,
      });
    expect(await accepts([localMailbox.toUpperCase()])).toBe(true);
    expect(await accepts([localMailbox, localMailbox])).toBe(true);
    expect(
      await accepts(
        [replyAddress.toUpperCase()],
        `Customer <${sender.toUpperCase()}>`,
      ),
    ).toBe(true);
    expect(await accepts([foreignMailbox])).toBe(false);
    expect(await accepts([localMailbox, 'unknown@example.invalid'])).toBe(
      false,
    );
    expect(
      await accepts([replyAddress.replace(replyToken, 'x'.repeat(32))]),
    ).toBe(false);
    expect(await accepts([`reply+short@reply-dev.example.invalid`])).toBe(
      false,
    );
    await t.run((ctx) =>
      ctx.db.insert('businessEnvironments', {
        key: 'other-development',
        businessName: 'Other',
        environmentName: 'Development',
        operatorWork: configuration,
        updatedAt: Date.now(),
      }),
    );
    expect(await accepts([localMailbox])).toBe(false);
  });

  it('retains a local outgoing callback that races the send response and reconciles it later', async () => {
    const { t, deliveryId } = await fixture();
    await t.run((ctx) =>
      ctx.db.patch(deliveryId, {
        state: 'dispatching',
        providerMessageId: undefined,
      }),
    );
    const response = await t.fetch(
      '/v1/operations/resend',
      await signedWebhook({
        eventType: 'email.delivered',
        providerMessageId: 'racing_local_message',
        from: `Example <${localMailbox}>`,
        to: [sender],
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, duplicate: false });
    const receipts = await t.run((ctx) =>
      ctx.db.query('emailWebhookReceipts').take(10),
    );
    expect(receipts).toHaveLength(1);
    await t.mutation(internal.operationsState.processDeliveryWebhook, {
      receiptId: receipts[0]!._id,
    });
    await t.mutation(internal.operationsState.recordDeliveryResult, {
      deliveryId,
      attemptCount: 1,
      state: 'accepted',
      providerMessageId: 'racing_local_message',
    });
    expect((await t.run((ctx) => ctx.db.get(deliveryId)))?.state).toBe(
      'delivered',
    );
  });

  it('bounds unbound outgoing sender lookup while preserving the indexed message-ID path', async () => {
    const { t } = await fixture();
    const input = {
      eventType: 'email.sent',
      providerMessageId: 'unknown_message',
      sender: localMailbox,
      recipients: [sender],
    };
    expect(
      await t.query(internal.lib.operationsMailRouting.acceptsWebhook, input),
    ).toBe(true);
    await t.run(async (ctx) => {
      for (let index = 0; index < 100; index++)
        await ctx.db.insert('businessEnvironments', {
          key: `unrelated-${index}`,
          businessName: 'Unrelated',
          environmentName: 'Development',
          updatedAt: Date.now(),
        });
    });
    expect(
      await t.query(internal.lib.operationsMailRouting.acceptsWebhook, input),
    ).toBe(false);
    expect(
      await t.query(internal.lib.operationsMailRouting.acceptsWebhook, {
        ...input,
        providerMessageId: 'message_local_fixture',
        sender: foreignMailbox,
      }),
    ).toBe(true);
  });

  it.each(['foreign', 'changed', 'self'] as const)(
    'does not fetch a queued %s inbound route',
    async (route) => {
      const { t, environmentId } = await fixture();
      const receipt = await t.mutation(internal.operationsState.recordWebhook, {
        eventId: 'queued_routing_fixture',
        eventType: 'email.received',
        occurredAt: Date.now(),
        providerMessageId: 'queued_incoming_fixture',
        sender: route === 'self' ? localMailbox : sender,
        recipients: [route === 'foreign' ? foreignMailbox : localMailbox],
        threadIds: [],
      });
      if (route === 'changed')
        await t.run((ctx) =>
          ctx.db.patch(environmentId, {
            operatorWork: { ...configuration, enabled: false },
          }),
        );
      const fetcher = vi.fn<typeof fetch>();
      vi.stubGlobal('fetch', fetcher);
      await t.action(internal.operationsMail.processWebhook, {
        receiptId: receipt.receiptId,
      });
      expect(fetcher).not.toHaveBeenCalled();
      expect((await t.run((ctx) => ctx.db.get(receipt.receiptId)))?.state).toBe(
        'failed',
      );
      expect(
        await t.run((ctx) => ctx.db.query('supportAttachments').take(10)),
      ).toEqual([]);
    },
  );
});
