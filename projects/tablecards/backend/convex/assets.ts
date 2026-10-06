import { v } from 'convex/values';

import {
  withBffAccountAction,
  withBffAccountQuery,
} from '@tofler/bff-auth/convex/server';
import type { Id } from './_generated/dataModel';
import { action, internalMutation, query } from './_generated/server';
import { tablecardsCustomerAuth } from './environment';
import { assetFileAddress } from './lib/fileAddresses';
import { fail } from './lib/productErrors';
import { createPublicId } from './lib/publicIds';

// Older clients must fail without allocating, reading, attaching or deleting
// a caller-supplied file. Uploads now use the authenticated HTTP byte transport.
export const generateUploadUrl = action({
  args: { accessToken: v.string() },
  returns: v.string(),
  handler: withBffAccountAction(tablecardsCustomerAuth, async () =>
    fail('INVALID_INPUT', 'Refresh TableCards before uploading artwork'),
  ),
});

export const finalize = action({
  args: {
    accessToken: v.string(),
    storageId: v.id('_storage'),
    projectId: v.optional(v.string()),
  },
  returns: v.object({
    publicId: v.string(),
    mimeType: v.union(v.literal('image/png'), v.literal('image/jpeg')),
    width: v.number(),
    height: v.number(),
  }),
  handler: withBffAccountAction(tablecardsCustomerAuth, async () =>
    fail('INVALID_INPUT', 'Refresh TableCards before uploading artwork'),
  ),
});

export const recordValidated = internalMutation({
  args: {
    accountId: v.string(),
    userId: v.string(),
    storageId: v.id('_storage'),
    projectId: v.optional(v.string()),
    mimeType: v.union(v.literal('image/png'), v.literal('image/jpeg')),
    width: v.number(),
    height: v.number(),
    source: v.union(v.literal('uploaded'), v.literal('ai')),
  },
  returns: v.object({
    publicId: v.string(),
    mimeType: v.union(v.literal('image/png'), v.literal('image/jpeg')),
    width: v.number(),
    height: v.number(),
  }),
  handler: async (ctx, args) => {
    let projectId: Id<'projects'> | undefined;
    const requestedProjectId = args.projectId;
    if (requestedProjectId) {
      const project = await ctx.db
        .query('projects')
        .withIndex('by_account_public_id', (queryBuilder) =>
          queryBuilder
            .eq('accountId', args.accountId)
            .eq('publicId', requestedProjectId),
        )
        .unique();
      if (!project || project.state !== 'active')
        fail('NOT_FOUND', 'The active project was not found');
      projectId = project._id;
    }
    const publicId = createPublicId('asset');
    await ctx.db.insert('designAssets', {
      publicId,
      accountId: args.accountId,
      projectId,
      createdByUserId: args.userId,
      source: args.source,
      storageId: args.storageId,
      mimeType: args.mimeType,
      width: args.width,
      height: args.height,
      createdAt: Date.now(),
    });
    return {
      publicId,
      mimeType: args.mimeType,
      width: args.width,
      height: args.height,
    };
  },
});

// Used only for a server-created upload whose attachment failed or returned
// an uncertain result. The indexed transaction protects committed attachments.
export const cleanupUnattached = internalMutation({
  args: { storageId: v.id('_storage') },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const attached = await ctx.db
      .query('designAssets')
      .withIndex('by_storage_id', (q) => q.eq('storageId', args.storageId))
      .first();
    if (attached) return false;
    await ctx.storage.delete(args.storageId);
    return true;
  },
});

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      publicId: v.string(),
      source: v.union(v.literal('uploaded'), v.literal('ai')),
      mimeType: v.union(v.literal('image/png'), v.literal('image/jpeg')),
      width: v.number(),
      height: v.number(),
      reusable: v.boolean(),
      url: v.union(v.null(), v.string()),
      createdAt: v.number(),
    }),
  ),
  handler: withBffAccountQuery(
    tablecardsCustomerAuth,
    async (ctx, _args, auth) => {
      const assets = await ctx.db
        .query('designAssets')
        .withIndex('by_account_project', (queryBuilder) =>
          queryBuilder.eq('accountId', auth.accountId),
        )
        .take(128);
      return assets.map((asset) => ({
        publicId: asset.publicId,
        source: asset.source,
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
        reusable: asset.projectId === undefined,
        url: assetFileAddress(asset.publicId),
        createdAt: asset.createdAt,
      }));
    },
  ),
});
