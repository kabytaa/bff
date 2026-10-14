import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { action, internalQuery } from './_generated/server';
import { requireOperator } from './lib/authorization';
import { environmentByKey } from './lib/operationsCore';
import { fail } from './lib/errors';

const args = {
  environmentKey: v.string(),
  attachmentId: v.id('supportAttachments'),
};
const metadata = {
  contentType: v.union(v.literal('image/png'), v.literal('image/jpeg')),
  name: v.string(),
  width: v.number(),
  height: v.number(),
};

export const authorizedPreview = internalQuery({
  args,
  returns: v.object({ storageId: v.id('_storage'), ...metadata }),
  handler: async (
    ctx,
    input,
  ): Promise<{
    storageId: Id<'_storage'>;
    contentType: 'image/png' | 'image/jpeg';
    name: string;
    width: number;
    height: number;
  }> => {
    await requireOperator(ctx);
    const environment = await environmentByKey(ctx, input.environmentKey);
    const attachment = await ctx.db.get(input.attachmentId);
    if (!attachment || attachment.environmentId !== environment._id)
      return fail('NOT_FOUND', 'Screenshot was not found.');
    const conversation = await ctx.db.get(attachment.conversationId);
    const entry = await ctx.db.get(attachment.entryId);
    if (
      !conversation ||
      conversation.environmentId !== environment._id ||
      !entry ||
      entry.environmentId !== environment._id ||
      entry.conversationId !== conversation._id
    )
      return fail('FORBIDDEN', 'Screenshot scope is invalid.');
    if (
      attachment.state !== 'ready' ||
      !attachment.storageId ||
      !attachment.verifiedType ||
      !attachment.width ||
      !attachment.height
    )
      return fail('CONFLICT', 'No regenerated screenshot is available.');
    return {
      storageId: attachment.storageId,
      contentType: attachment.verifiedType,
      name: attachment.claimedName,
      width: attachment.width,
      height: attachment.height,
    };
  },
});

/** Return private rewritten bytes only after the same admitted operator check as cases. */
export const readPreview = action({
  args,
  returns: v.object({ bytes: v.bytes(), ...metadata }),
  handler: async (
    ctx,
    input,
  ): Promise<{
    bytes: ArrayBuffer;
    contentType: 'image/png' | 'image/jpeg';
    name: string;
    width: number;
    height: number;
  }> => {
    const preview = await ctx.runQuery(
      internal.operationsAttachments.authorizedPreview,
      input,
    );
    const blob = await ctx.storage.get(preview.storageId);
    if (
      !blob ||
      blob.size > 5 * 1024 * 1024 ||
      blob.type !== preview.contentType
    )
      return fail('NOT_FOUND', 'The private screenshot is unavailable.');
    return {
      bytes: await blob.arrayBuffer(),
      contentType: preview.contentType,
      name: preview.name,
      width: preview.width,
      height: preview.height,
    };
  },
});
