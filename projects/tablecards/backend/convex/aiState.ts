import { v } from 'convex/values';

import { withBffAccountQuery } from '@tofler/bff-auth/convex/server';
import type { Id } from './_generated/dataModel';
import { internalMutation, query } from './_generated/server';
import { tablecardsCustomerAuth } from './environment';
import { dailyAiBatchLimit } from './lib/aiBudget';
import { assetFileAddress } from './lib/fileAddresses';
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
    referenceDigest: v.optional(v.string()),
    provider: v.optional(
      v.union(v.literal('cloudflare'), v.literal('development')),
    ),
  },
  returns: v.object({
    publicId: v.string(),
    status: batchState,
    created: v.boolean(),
    reservationId: v.optional(v.string()),
    generatedAssetsPersisted: v.boolean(),
    unitCommitConfirmed: v.boolean(),
    unitCommitRejected: v.boolean(),
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
      if (
        args.referenceDigest !== undefined &&
        existing.referenceDigest !== args.referenceDigest
      ) {
        fail(
          'CONFLICT',
          'The idempotency key was used for another reference image',
        );
      }
      if (
        args.provider !== undefined &&
        existing.provider !== undefined &&
        args.provider !== existing.provider
      ) {
        fail(
          'CONFLICT',
          'The idempotency key was used for another image provider',
        );
      }
      const existingProject = existing.projectId
        ? await ctx.db.get(existing.projectId)
        : null;
      if ((existingProject?.publicId ?? undefined) !== args.projectId) {
        fail('CONFLICT', 'The idempotency key was used for another event');
      }
      if (
        existing.status !== 'ready' &&
        existing.requestedByUserId !== args.userId
      ) {
        fail(
          'FORBIDDEN',
          'Only the original requester can retry this AI batch',
        );
      }
      return {
        publicId: existing.publicId,
        status: existing.status as BatchState,
        created: false,
        ...(existing.unitReservationId === undefined
          ? {}
          : { reservationId: existing.unitReservationId }),
        generatedAssetsPersisted: existing.generatedAssets?.length === 4,
        unitCommitConfirmed: existing.unitCommitConfirmed === true,
        unitCommitRejected: existing.unitCommitRejected === true,
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
    const providerBudgetDay =
      args.provider === 'cloudflare'
        ? new Date(now).toISOString().slice(0, 10)
        : undefined;
    if (providerBudgetDay) {
      const dailyBatchLimit = dailyAiBatchLimit();
      if (dailyBatchLimit === 0)
        fail(
          'LIMIT_EXCEEDED',
          'AI generation is paused by the site safety budget; your remaining batches are unchanged.',
        );
      // Deployment budget converted into conservative four-image admissions.
      // Failed/interrupted batches still count: a provider may have billed them.
      // Atomic insertion + indexed read prevents simultaneous callers overspending.
      const dailyBatches = await ctx.db
        .query('aiBatches')
        .withIndex('by_provider_budget_day', (q) =>
          q
            .eq('provider', 'cloudflare')
            .eq('providerBudgetDay', providerBudgetDay),
        )
        .take(dailyBatchLimit);
      if (dailyBatches.length >= dailyBatchLimit)
        fail(
          'LIMIT_EXCEEDED',
          'The daily AI safety limit has been reached. Try tomorrow; your remaining batches are unchanged.',
        );
    }
    const publicId = createPublicId('ai_batch');
    await ctx.db.insert('aiBatches', {
      publicId,
      accountId: args.accountId,
      projectId,
      requestedByUserId: args.userId,
      idempotencyKey: args.idempotencyKey,
      prompt: args.prompt,
      ...(args.referenceDigest === undefined
        ? {}
        : { referenceDigest: args.referenceDigest }),
      ...(args.provider === undefined ? {} : { provider: args.provider }),
      ...(providerBudgetDay === undefined ? {} : { providerBudgetDay }),
      status: 'queued',
      assetIds: [],
      createdAt: now,
      updatedAt: now,
    });
    return {
      publicId,
      status: 'queued' as const,
      created: true,
      generatedAssetsPersisted: false,
      unitCommitConfirmed: false,
      unitCommitRejected: false,
    };
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
    if (
      batch.status === 'generating' &&
      batch.unitReservationId === args.reservationId
    ) {
      return null;
    }
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

export const recordGenerated = internalMutation({
  args: {
    accountId: v.string(),
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
    if (batch.generatedAssets !== undefined) {
      if (
        batch.generatedAssets.length !== args.assets.length ||
        batch.generatedAssets.some((asset, index) => {
          const requested = args.assets[index];
          return (
            requested === undefined ||
            asset.storageId !== requested.storageId ||
            asset.mimeType !== requested.mimeType ||
            asset.width !== requested.width ||
            asset.height !== requested.height
          );
        })
      ) {
        fail('CONFLICT', 'The AI batch already has different generated images');
      }
      return null;
    }
    if (batch.status !== 'generating') {
      fail('CONFLICT', 'The AI batch is not generating');
    }
    await ctx.db.patch(batch._id, {
      generatedAssets: args.assets,
      outputsPersisted: true,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const confirmUnitCommit = internalMutation({
  args: { accountId: v.string(), batchId: v.string() },
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
    if (!batch.unitReservationId || batch.generatedAssets?.length !== 4) {
      fail('CONFLICT', 'The generated AI batch is not persisted');
    }
    await ctx.db.patch(batch._id, {
      unitCommitConfirmed: true,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const complete = internalMutation({
  args: { accountId: v.string(), batchId: v.string() },
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
    if (batch.status === 'ready') return null;
    if (
      batch.generatedAssets?.length !== 4 ||
      batch.unitCommitConfirmed !== true
    ) {
      fail('CONFLICT', 'The AI batch completion is not confirmed');
    }
    const now = Date.now();
    const assetIds: Id<'designAssets'>[] = [];
    for (const asset of batch.generatedAssets) {
      assetIds.push(
        await ctx.db.insert('designAssets', {
          publicId: createPublicId('asset'),
          accountId: args.accountId,
          projectId: batch.projectId,
          createdByUserId: batch.requestedByUserId,
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
      errorCode: undefined,
      updatedAt: now,
    });
    return null;
  },
});

export const rejectUnitCommit = internalMutation({
  args: { accountId: v.string(), batchId: v.string() },
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
    if (batch.status === 'ready' || batch.unitCommitConfirmed === true)
      return null;
    await ctx.db.patch(batch._id, {
      unitCommitRejected: true,
      status: 'failed',
      errorCode: 'AI_UNIT_UNAVAILABLE',
      updatedAt: Date.now(),
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
    if (batch.unitCommitRejected === true) return null;
    await ctx.db.patch(batch._id, {
      status: batch.generatedAssets?.length === 4 ? 'generating' : 'failed',
      errorCode:
        batch.generatedAssets?.length === 4
          ? 'AI_COMPLETION_PENDING'
          : args.errorCode,
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
        (batch.status === 'ready' ? batch.assetIds : []).map(
          async (assetId) => {
            const asset = await ctx.db.get(assetId);
            if (!asset || asset.accountId !== auth.accountId) {
              fail('NOT_FOUND', 'An AI background is unavailable');
            }
            return {
              publicId: asset.publicId,
              url: assetFileAddress(asset.publicId),
            };
          },
        ),
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

export const pendingForCaller = query({
  args: { projectId: v.optional(v.string()) },
  returns: v.union(
    v.null(),
    v.object({
      prompt: v.string(),
      idempotencyKey: v.string(),
      batchId: v.string(),
      projectId: v.optional(v.string()),
      developmentMock: v.optional(v.boolean()),
    }),
  ),
  handler: withBffAccountQuery(
    tablecardsCustomerAuth,
    async (ctx, args: { projectId?: string }, auth) => {
      let projectId: Id<'projects'> | undefined;
      const requestedProjectId = args.projectId;
      if (requestedProjectId !== undefined) {
        const project = await ctx.db
          .query('projects')
          .withIndex('by_account_public_id', (q) =>
            q
              .eq('accountId', auth.accountId)
              .eq('publicId', requestedProjectId),
          )
          .unique();
        if (!project) return null;
        projectId = project._id;
      }
      const batch = await ctx.db
        .query('aiBatches')
        .withIndex('by_account_user_project_pending', (q) =>
          q
            .eq('accountId', auth.accountId)
            .eq('requestedByUserId', auth.userId)
            .eq('projectId', projectId)
            .eq('status', 'generating')
            .eq('outputsPersisted', true),
        )
        .order('desc')
        .first();
      if (
        !batch ||
        batch.generatedAssets?.length !== 4 ||
        !batch.unitReservationId
      )
        return null;
      return {
        prompt: batch.prompt,
        idempotencyKey: batch.idempotencyKey,
        batchId: batch.publicId,
        ...(batch.provider === 'development' ? { developmentMock: true } : {}),
        ...(args.projectId === undefined ? {} : { projectId: args.projectId }),
      };
    },
  ),
});
