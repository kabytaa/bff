import { v } from 'convex/values';

import { withBffAccountQuery } from '@tofler/bff-auth/convex/server';
import type { Id } from './_generated/dataModel';
import { internalMutation, query } from './_generated/server';
import { tablecardsCustomerAuth } from './environment';
import { fail } from './lib/productErrors';
import { createPublicId } from './lib/publicIds';

const batchState = v.union(
  v.literal('queued'),
  v.literal('generating'),
  v.literal('ready'),
  v.literal('failed'),
);
type BatchState = 'failed' | 'generating' | 'queued' | 'ready';

export const start = internalMutation({
  args: {
    accountId: v.string(),
    userId: v.string(),
    projectId: v.optional(v.string()),
    prompt: v.string(),
    idempotencyKey: v.string(),
  },
  returns: v.object({
    publicId: v.string(),
    status: batchState,
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('aiBatches')
      .withIndex('by_account_idempotency_key', (queryBuilder) =>
        queryBuilder
          .eq('accountId', args.accountId)
          .eq('idempotencyKey', args.idempotencyKey),
      )
      .unique();
    if (existing) {
      if (existing.prompt !== args.prompt) {
        fail('CONFLICT', 'The idempotency key was used for another prompt');
      }
      return {
        publicId: existing.publicId,
        status: existing.status as BatchState,
        created: false,
      };
    }
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
      if (!project) fail('NOT_FOUND', 'The project was not found');
      projectId = project._id;
    }
    const now = Date.now();
    const publicId = createPublicId('ai_batch');
    await ctx.db.insert('aiBatches', {
      publicId,
      accountId: args.accountId,
      projectId,
      requestedByUserId: args.userId,
      idempotencyKey: args.idempotencyKey,
      prompt: args.prompt,
      status: 'queued',
      assetIds: [],
      createdAt: now,
      updatedAt: now,
    });
    return { publicId, status: 'queued' as const, created: true };
  },
});

export const markGenerating = internalMutation({
  args: {
    accountId: v.string(),
    batchId: v.string(),
    reservationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query('aiBatches')
      .withIndex('by_account_public_id', (queryBuilder) =>
        queryBuilder
          .eq('accountId', args.accountId)
          .eq('publicId', args.batchId),
      )
      .unique();
    if (!batch) fail('NOT_FOUND', 'The AI batch was not found');
    if (batch.status !== 'queued') {
      fail('CONFLICT', 'The AI batch cannot begin again');
    }
    await ctx.db.patch(batch._id, {
      status: 'generating',
      unitReservationId: args.reservationId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const complete = internalMutation({
  args: {
    accountId: v.string(),
    userId: v.string(),
    batchId: v.string(),
    assets: v.array(
      v.object({
        storageId: v.id('_storage'),
        mimeType: v.union(v.literal('image/png'), v.literal('image/jpeg')),
        width: v.number(),
        height: v.number(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.assets.length !== 4) {
      fail('INVALID_INPUT', 'An AI batch must contain exactly four images');
    }
    const batch = await ctx.db
      .query('aiBatches')
      .withIndex('by_account_public_id', (queryBuilder) =>
        queryBuilder
          .eq('accountId', args.accountId)
          .eq('publicId', args.batchId),
      )
      .unique();
    if (!batch) fail('NOT_FOUND', 'The AI batch was not found');
    if (batch.status !== 'generating') {
      fail('CONFLICT', 'The AI batch is not generating');
    }
    const now = Date.now();
    const assetIds: Id<'designAssets'>[] = [];
    for (const asset of args.assets) {
      assetIds.push(
        await ctx.db.insert('designAssets', {
          publicId: createPublicId('asset'),
          accountId: args.accountId,
          projectId: batch.projectId,
          createdByUserId: args.userId,
          source: 'ai',
          storageId: asset.storageId,
          mimeType: asset.mimeType,
          width: asset.width,
          height: asset.height,
          createdAt: now,
        }),
      );
    }
    await ctx.db.patch(batch._id, {
      status: 'ready',
      assetIds,
      updatedAt: now,
    });
    return null;
  },
});

export const markFailed = internalMutation({
  args: {
    accountId: v.string(),
    batchId: v.string(),
    errorCode: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query('aiBatches')
      .withIndex('by_account_public_id', (queryBuilder) =>
        queryBuilder
          .eq('accountId', args.accountId)
          .eq('publicId', args.batchId),
      )
      .unique();
    if (!batch) return null;
    if (batch.status === 'ready') return null;
    await ctx.db.patch(batch._id, {
      status: 'failed',
      errorCode: args.errorCode,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const get = query({
  args: { batchId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      publicId: v.string(),
      status: batchState,
      errorCode: v.optional(v.string()),
      choices: v.array(
        v.object({ publicId: v.string(), url: v.union(v.null(), v.string()) }),
      ),
    }),
  ),
  handler: withBffAccountQuery(
    tablecardsCustomerAuth,
    async (ctx, args: { batchId: string }, auth) => {
      const batch = await ctx.db
        .query('aiBatches')
        .withIndex('by_account_public_id', (queryBuilder) =>
          queryBuilder
            .eq('accountId', auth.accountId)
            .eq('publicId', args.batchId),
        )
        .unique();
      if (!batch) return null;
      const choices = await Promise.all(
        batch.assetIds.map(async (assetId) => {
          const asset = await ctx.db.get(assetId);
          if (!asset || asset.accountId !== auth.accountId) {
            fail('NOT_FOUND', 'An AI background is unavailable');
          }
          return {
            publicId: asset.publicId,
            url: await ctx.storage.getUrl(asset.storageId),
          };
        }),
      );
      return {
        publicId: batch.publicId,
        status: batch.status,
        ...(batch.errorCode === undefined
          ? {}
          : { errorCode: batch.errorCode }),
        choices,
      };
    },
  ),
});
