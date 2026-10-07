import { paginationOptsValidator, type PaginationOptions } from 'convex/server';
import { v } from 'convex/values';

import {
  withBffAccountAction,
  withBffAccountQuery,
} from '@tofler/bff-auth/convex/server';
import type { Doc, Id } from './_generated/dataModel';
import { action, internalMutation, query } from './_generated/server';
import { tablecardsCustomerAuth } from './environment';
import { assetFileAddress } from './lib/fileAddresses';
import { fail } from './lib/productErrors';
import { createPublicId } from './lib/publicIds';

const assetProjection = v.object({
  publicId: v.string(),
  source: v.union(v.literal('uploaded'), v.literal('ai')),
  mimeType: v.union(v.literal('image/png'), v.literal('image/jpeg')),
  width: v.number(),
  height: v.number(),
  reusable: v.boolean(),
  url: v.union(v.null(), v.string()),
  createdAt: v.number(),
});

function assetView(asset: Doc<'designAssets'>) {
  return {
    publicId: asset.publicId,
    source: asset.source,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    reusable: asset.projectId === undefined,
    url: assetFileAddress(asset.publicId),
    createdAt: asset.createdAt,
  };
}

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
  returns: v.array(assetProjection),
  handler: withBffAccountQuery(
    tablecardsCustomerAuth,
    async (ctx, _args, auth) => {
      const assets = await ctx.db
        .query('designAssets')
        .withIndex('by_account_project', (queryBuilder) =>
          queryBuilder.eq('accountId', auth.accountId),
        )
        .take(128);
      return assets.map(assetView);
    },
  ),
});

export const get = query({
  args: { publicId: v.string() },
  returns: v.union(v.null(), assetProjection),
  handler: withBffAccountQuery(
    tablecardsCustomerAuth,
    async (ctx, args: { publicId: string }, auth) => {
      const asset = await ctx.db
        .query('designAssets')
        .withIndex('by_account_public_id', (q) =>
          q.eq('accountId', auth.accountId).eq('publicId', args.publicId),
        )
        .unique();
      if (!asset) return null;
      if (asset.projectId) {
        const project = await ctx.db.get(asset.projectId);
        if (!project || project.accountId !== auth.accountId) return null;
      }
      return assetView(asset);
    },
  ),
});

export const page = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(assetProjection),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: withBffAccountQuery(
    tablecardsCustomerAuth,
    async (ctx, args: { paginationOpts: PaginationOptions }, auth) => {
      const result = await ctx.db
        .query('designAssets')
        .withIndex('by_account_created_at', (q) =>
          q.eq('accountId', auth.accountId),
        )
        .order('desc')
        // This explicit-load-more API always reads one small metadata page;
        // caller-provided size/end-cursor options cannot turn it into a scan.
        .paginate({ cursor: args.paginationOpts.cursor, numItems: 24 });
      return {
        page: result.page.map(assetView),
        isDone: result.isDone,
        continueCursor: result.continueCursor,
      };
    },
  ),
});
