'use node';

import { v } from 'convex/values';

import { internal } from './_generated/api';
import { internalAction } from './_generated/server';
import { sha256Base64Url } from './lib/customerCrypto';
import {
  extractOperationEmailAddress,
  receiveOperationAttachmentMetadata,
  receiveOperationEmail,
  sendOperationEmail,
} from './lib/operationsEmail';
import {
  boundedBytes,
  inspectOperationScreenshot,
  OperationTransportError,
  retrieveOperationAttachment,
} from './lib/operationsTransport';

export const processDelivery = internalAction({
  args: { deliveryId: v.id('emailDeliveries') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const delivery = await ctx.runMutation(
      internal.operationsState.claimDelivery,
      args,
    );
    if (!delivery) return null;
    const mocked =
      process.env.BFF_OPERATIONS_MAIL_MODE === 'mock' &&
      process.env.BFF_DEVELOPMENT_OPERATOR_WORK_ENABLED === 'enabled' &&
      delivery.environmentKey.endsWith('-development');
    if (mocked) {
      await ctx.runMutation(internal.operationsState.recordDeliveryResult, {
        ...args,
        attemptCount: delivery.attemptCount,
        state: 'accepted',
        providerMessageId: `mock_${delivery.idempotencyKey}`,
        mocked: true,
        retryable: false,
        error: 'Development mock: this email was not sent to the customer.',
      });
      return null;
    }
    if (process.env.BFF_OPERATIONS_MAIL_MODE !== 'live') {
      await ctx.runMutation(internal.operationsState.recordDeliveryResult, {
        ...args,
        attemptCount: delivery.attemptCount,
        state: 'failed',
        retryable: false,
        error: 'Live email is disabled; the case and reply are saved.',
      });
      return null;
    }
    const outcome = await sendOperationEmail(
      process.env.BFF_OPERATIONS_RESEND_API_KEY ?? '',
      delivery.envelope,
      delivery.idempotencyKey,
    );
    await ctx.runMutation(internal.operationsState.recordDeliveryResult, {
      ...args,
      attemptCount: delivery.attemptCount,
      ...outcome,
      mocked: false,
      ...(outcome.state === 'accepted' ? { retryable: false } : {}),
    });
    return null;
  },
});

export const processWebhook = internalAction({
  args: { receiptId: v.id('emailWebhookReceipts') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const receipt = await ctx.runQuery(
      internal.operationsState.webhookContext,
      args,
    );
    if (receipt.state === 'processed') return null;
    if (receipt.eventType !== 'email.received') {
      await ctx.runMutation(
        internal.operationsState.processDeliveryWebhook,
        args,
      );
      return null;
    }
    try {
      if (
        !(await ctx.runQuery(
          internal.lib.operationsMailRouting.acceptsWebhook,
          {
            eventType: receipt.eventType,
            ...(receipt.providerMessageId
              ? { providerMessageId: receipt.providerMessageId }
              : {}),
            ...(receipt.sender ? { sender: receipt.sender } : {}),
            recipients: receipt.recipients,
          },
        ))
      ) {
        await ctx.runMutation(internal.operationsState.markWebhookFailure, {
          ...args,
          retryable: false,
          error:
            'Incoming webhook is outside the currently registered local mailbox routes.',
        });
        return null;
      }
      if (!receipt.providerMessageId)
        throw new Error('Missing provider message ID');
      const content = await receiveOperationEmail(
        process.env.BFF_OPERATIONS_RESEND_API_KEY ?? '',
        receipt.providerMessageId,
      );
      const sender = extractOperationEmailAddress(content.from);
      const recipients = content.to.map(extractOperationEmailAddress);
      if (!sender || recipients.some((address) => !address))
        throw new Error('Invalid provider mail addresses');
      const addresses = recipients as string[];
      const replyTokens = addresses.flatMap(
        (address) =>
          /^reply\+([A-Za-z0-9_-]{32,128})@/u.exec(address)?.[1] ?? [],
      );
      if (replyTokens.length > 1) throw new Error('Ambiguous reply token');
      const headers = Object.fromEntries(
        Object.entries(content.headers ?? {}).map(([name, value]) => [
          name.toLowerCase(),
          value,
        ]),
      );
      const automated =
        Boolean(
          headers['auto-submitted'] && headers['auto-submitted'] !== 'no',
        ) ||
        /^(?:bulk|list|junk)$/iu.test(headers['precedence'] ?? '') ||
        sender.startsWith('mailer-daemon@') ||
        sender.startsWith('postmaster@');
      await ctx.runMutation(internal.operationsState.receiveEmail, {
        ...args,
        providerInboundMessageId: receipt.providerMessageId,
        ...(content.message_id
          ? { internetMessageId: content.message_id }
          : {}),
        sender,
        recipients: addresses,
        subject: content.subject.trim().slice(0, 200) || '(No subject)',
        text: content.text,
        ...(replyTokens[0]
          ? { replyTokenHash: await sha256Base64Url(replyTokens[0]) }
          : {}),
        automated,
        attachments: content.attachments.slice(0, 20).map((file) => ({
          providerAttachmentId: file.id,
          name: (file.filename ?? 'Screenshot').slice(0, 200),
          contentType: file.content_type.slice(0, 100),
          byteSize: file.size ?? 0,
        })),
      });
    } catch {
      await ctx.runMutation(internal.operationsState.markWebhookFailure, {
        ...args,
        error:
          'Incoming content could not be retrieved or safely processed; provider evidence is retained for review.',
      });
    }
    return null;
  },
});

export const processAttachment = internalAction({
  args: { attachmentId: v.id('supportAttachments') },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (
      !(await ctx.runMutation(internal.operationsState.claimAttachment, args))
    )
      return null;
    let storageId;
    try {
      const metadata = await ctx.runQuery(
        internal.operationsState.attachmentContext,
        args,
      );
      const file = await receiveOperationAttachmentMetadata(
        process.env.BFF_OPERATIONS_RESEND_API_KEY ?? '',
        metadata.providerInboundMessageId,
        metadata.providerAttachmentId,
      );
      const original = await retrieveOperationAttachment(file.download_url);
      const inspected = inspectOperationScreenshot(
        original,
        metadata.claimedType,
      );
      const provider = new URL(
        process.env.BFF_OPERATIONS_PROVIDER_BASE_URL ?? '',
      );
      const secret = process.env.BFF_OPERATIONS_PROVIDER_SECRET ?? '';
      if (
        provider.protocol !== 'https:' ||
        provider.pathname !== '/' ||
        provider.username ||
        provider.password ||
        secret.length < 32
      )
        throw new Error('Private conversion is unavailable');
      const response = await fetch(`${provider.origin}/raster-preview`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${secret}`,
          'content-type': inspected.mime,
        },
        body: new Uint8Array(original),
        signal: AbortSignal.timeout(25_000),
        redirect: 'error',
      });
      if (!response.ok) throw new Error('Private conversion failed');
      const bytes = await boundedBytes(response.body, 5 * 1024 * 1024);
      const mime = response.headers.get('content-type')?.split(';')[0];
      const preview = inspectOperationScreenshot(bytes, mime);
      if (
        Math.max(preview.width, preview.height) > 1600 ||
        !['image/png', 'image/jpeg'].includes(preview.mime)
      )
        throw new Error('Preview exceeded bounds');
      storageId = await ctx.storage.store(
        new Blob([new Uint8Array(bytes)], { type: preview.mime }),
      );
      await ctx.runMutation(internal.operationsState.completeAttachment, {
        ...args,
        storageId,
        verifiedType: preview.mime as 'image/png' | 'image/jpeg',
        byteSize: bytes.length,
        width: preview.width,
        height: preview.height,
      });
    } catch (error) {
      if (storageId) await ctx.storage.delete(storageId);
      await ctx.runMutation(internal.operationsState.completeAttachment, {
        ...args,
        blockReason:
          error instanceof OperationTransportError
            ? error.message
            : 'Screenshot conversion unavailable or invalid; the original file is never exposed.',
      });
    }
    return null;
  },
});
