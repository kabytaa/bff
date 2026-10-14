import { v } from 'convex/values';

import { internalQuery } from '../_generated/server';
import { sha256Base64Url } from './customerCrypto';
import { extractOperationEmailAddress } from './operationsEmail';

const outgoingEvents = new Set([
  'email.sent',
  'email.delivered',
  'email.delivery_delayed',
  'email.failed',
  'email.bounced',
  'email.complained',
]);

/** Provider signatures authenticate an account, not this deployment's mailbox. */
export const acceptsWebhook = internalQuery({
  args: {
    eventType: v.string(),
    providerMessageId: v.optional(v.string()),
    sender: v.optional(v.string()),
    recipients: v.array(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    if (
      !args.providerMessageId ||
      !/^[A-Za-z0-9_-]{1,200}$/u.test(args.providerMessageId) ||
      args.recipients.length > 10
    )
      return false;

    if (outgoingEvents.has(args.eventType)) {
      const deliveries = await ctx.db
        .query('emailDeliveries')
        .withIndex('by_provider_message', (index) =>
          index
            .eq('provider', 'resend')
            .eq('providerMessageId', args.providerMessageId),
        )
        .take(2);
      if (deliveries.length) return deliveries.length === 1;
      const sender = args.sender
        ? extractOperationEmailAddress(args.sender)
        : null;
      if (!sender) return false;
      // A callback can precede the HTTP send response that binds its ID. The
      // registry has no sender index; deny this fallback above 100 environments.
      // Already-bound deliveries always use the indexed path above.
      const environments = await ctx.db
        .query('businessEnvironments')
        .withIndex('by_key')
        .take(101);
      if (environments.length > 100) return false;
      return (
        environments.filter(
          (environment) =>
            environment.operatorWork?.support.fromEmail === sender,
        ).length === 1
      );
    }

    if (args.eventType !== 'email.received') return false;
    const sender = args.sender
      ? extractOperationEmailAddress(args.sender)
      : null;
    if (!sender || !args.recipients.length) return false;
    const parsed = args.recipients.map(extractOperationEmailAddress);
    if (parsed.some((address) => address === null)) return false;
    const recipients = [...new Set(parsed)];
    // One unique To address gives one route. An additional unknown or foreign
    // To must not cause the same content to be handled by two deployments.
    if (recipients.length !== 1) return false;
    const recipient = recipients[0]!;
    if (recipient.startsWith('reply+')) {
      const token = /^reply\+([a-z0-9_-]{32,128})@[^@]+$/u.exec(recipient)?.[1];
      if (!token) return false;
      const tokenHash = await sha256Base64Url(token);
      const deliveries = await ctx.db
        .query('emailDeliveries')
        .withIndex('by_reply_token_hash', (index) =>
          index.eq('replyTokenHash', tokenHash),
        )
        .take(2);
      if (deliveries.length !== 1) return false;
      const delivery = deliveries[0]!;
      const [environment, conversation, entry] = await Promise.all([
        ctx.db.get(delivery.environmentId),
        ctx.db.get(delivery.conversationId),
        ctx.db.get(delivery.entryId),
      ]);
      return Boolean(
        environment?.operatorWork?.enabled &&
        conversation?.environmentId === environment._id &&
        conversation.contactEmail === sender &&
        entry?.environmentId === environment._id &&
        entry.conversationId === conversation._id &&
        entry.envelope?.replyTo.toLowerCase() === recipient,
      );
    }
    const environments = await ctx.db
      .query('businessEnvironments')
      .withIndex('by_support_receiving_address', (index) =>
        index.eq('operatorWork.support.receivingAddress', recipient),
      )
      .take(2);
    return (
      environments.length === 1 &&
      environments[0]?.operatorWork?.enabled === true
    );
  },
});
