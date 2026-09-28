import { v } from 'convex/values';

import { getDesignDefinition } from '@tablecards/core';
import { withBffAccountQuery } from '@tofler/bff-auth/convex/server';
import { internalMutation, query } from './_generated/server';
import { tablecardsCustomerAuth } from './environment';
import { fail } from './lib/productErrors';
import { createPublicId } from './lib/publicIds';

const exportStatus = v.union(
  v.literal('queued'),
  v.literal('generating'),
  v.literal('ready'),
  v.literal('failed'),
);

export const create = internalMutation({
  args: {
    accountId: v.string(),
    userId: v.string(),
    projectId: v.string(),
    maximumCards: v.number(),
    premiumDesigns: v.boolean(),
    allowUploadedDesigns: v.boolean(),
    allowAiDesigns: v.boolean(),
    layoutId: v.union(v.literal('portrait_4'), v.literal('landscape_6')),
  },
  returns: v.object({
    publicId: v.string(),
    status: exportStatus,
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const project = await ctx.db
      .query('projects')
      .withIndex('by_account_public_id', (queryBuilder) =>
        queryBuilder
          .eq('accountId', args.accountId)
          .eq('publicId', args.projectId),
      )
      .unique();
    if (!project || project.state !== 'active') {
      fail('NOT_FOUND', 'The active project was not found');
    }
    if (project.guestCount > args.maximumCards) {
      fail('LIMIT_EXCEEDED', 'This offer does not support that many cards');
    }
    if (
      project.designKind === 'predefined' &&
      getDesignDefinition(project.designReference).tier === 'premium' &&
      !args.premiumDesigns
    ) {
      fail('ENTITLEMENT_REQUIRED', 'The selected design requires a paid offer');
    }
    if (project.designKind === 'uploaded' && !args.allowUploadedDesigns) {
      fail('ENTITLEMENT_REQUIRED', 'Uploaded artwork requires a paid offer');
    }
    if (project.designKind === 'ai' && !args.allowAiDesigns) {
      fail('ENTITLEMENT_REQUIRED', 'AI artwork is not available');
    }
    const previous = await ctx.db
      .query('projectExports')
      .withIndex('by_project_created_at', (queryBuilder) =>
        queryBuilder.eq('projectId', project._id),
      )
      .order('desc')
      .first();
    if (
      previous?.projectRevision === project.revision &&
      (previous.layoutId ?? 'portrait_4') === args.layoutId &&
      previous.status !== 'failed'
    ) {
      return {
        publicId: previous.publicId,
        status: previous.status,
        created: false,
      };
    }
    const now = Date.now();
    const publicId = createPublicId('export');
    await ctx.db.insert('projectExports', {
      publicId,
      accountId: args.accountId,
      projectId: project._id,
      requestedByUserId: args.userId,
      projectRevision: project.revision,
      layoutId: args.layoutId,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
    });
    return { publicId, status: 'queued' as const, created: true };
  },
});

export const load = internalMutation({
  args: { accountId: v.string(), exportId: v.string() },
  returns: v.object({
    projectId: v.string(),
    title: v.string(),
    designKind: v.union(
      v.literal('predefined'),
      v.literal('uploaded'),
      v.literal('ai'),
    ),
    designReference: v.string(),
    layoutId: v.union(v.literal('portrait_4'), v.literal('landscape_6')),
    guests: v.array(
      v.object({
        name: v.string(),
        table: v.optional(v.string()),
        marker: v.optional(v.string()),
      }),
    ),
    backgroundStorageId: v.optional(v.id('_storage')),
    backgroundMimeType: v.optional(
      v.union(v.literal('image/png'), v.literal('image/jpeg')),
    ),
  }),
  handler: async (ctx, args) => {
    const exportJob = await ctx.db
      .query('projectExports')
      .withIndex('by_account_public_id', (queryBuilder) =>
        queryBuilder
          .eq('accountId', args.accountId)
          .eq('publicId', args.exportId),
      )
      .unique();
    if (!exportJob) fail('NOT_FOUND', 'The export was not found');
    if (exportJob.status === 'ready') {
      fail('CONFLICT', 'The export is already complete');
    }
    const project = await ctx.db.get(exportJob.projectId);
    if (!project || project.accountId !== args.accountId) {
      fail('NOT_FOUND', 'The project was not found');
    }
    const contents = await ctx.db
      .query('projectContents')
      .withIndex('by_project_id', (queryBuilder) =>
        queryBuilder.eq('projectId', project._id),
      )
      .unique();
    if (!contents || contents.accountId !== args.accountId) {
      fail('NOT_FOUND', 'The project contents were not found');
    }
    let backgroundStorageId;
    let backgroundMimeType;
    if (project.designKind !== 'predefined') {
      const asset = await ctx.db
        .query('designAssets')
        .withIndex('by_account_public_id', (queryBuilder) =>
          queryBuilder
            .eq('accountId', args.accountId)
            .eq('publicId', project.designReference),
        )
        .unique();
      if (!asset) fail('NOT_FOUND', 'The background artwork was not found');
      backgroundStorageId = asset.storageId;
      backgroundMimeType = asset.mimeType;
    }
    await ctx.db.patch(exportJob._id, {
      status: 'generating',
      updatedAt: Date.now(),
    });
    return {
      projectId: project.publicId,
      title: project.title,
      designKind: project.designKind,
      designReference: project.designReference,
      layoutId: exportJob.layoutId ?? 'portrait_4',
      guests: contents.guests,
      ...(backgroundStorageId === undefined
        ? {}
        : { backgroundStorageId, backgroundMimeType }),
    };
  },
});

export const complete = internalMutation({
  args: {
    accountId: v.string(),
    exportId: v.string(),
    storageId: v.id('_storage'),
    pageCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const exportJob = await ctx.db
      .query('projectExports')
      .withIndex('by_account_public_id', (queryBuilder) =>
        queryBuilder
          .eq('accountId', args.accountId)
          .eq('publicId', args.exportId),
      )
      .unique();
    if (!exportJob) fail('NOT_FOUND', 'The export was not found');
    if (exportJob.status !== 'generating') {
      fail('CONFLICT', 'The export is not generating');
    }
    await ctx.db.patch(exportJob._id, {
      status: 'ready',
      storageId: args.storageId,
      pageCount: args.pageCount,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const failExport = internalMutation({
  args: { accountId: v.string(), exportId: v.string(), errorCode: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const exportJob = await ctx.db
      .query('projectExports')
      .withIndex('by_account_public_id', (queryBuilder) =>
        queryBuilder
          .eq('accountId', args.accountId)
          .eq('publicId', args.exportId),
      )
      .unique();
    if (!exportJob || exportJob.status === 'ready') return null;
    await ctx.db.patch(exportJob._id, {
      status: 'failed',
      errorCode: args.errorCode,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const get = query({
  args: { exportId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      publicId: v.string(),
      projectId: v.string(),
      status: exportStatus,
      pageCount: v.optional(v.number()),
      errorCode: v.optional(v.string()),
      downloadUrl: v.union(v.null(), v.string()),
    }),
  ),
  handler: withBffAccountQuery(
    tablecardsCustomerAuth,
    async (ctx, args: { exportId: string }, auth) => {
      const exportJob = await ctx.db
        .query('projectExports')
        .withIndex('by_account_public_id', (queryBuilder) =>
          queryBuilder
            .eq('accountId', auth.accountId)
            .eq('publicId', args.exportId),
        )
        .unique();
      if (!exportJob) return null;
      const project = await ctx.db.get(exportJob.projectId);
      if (!project || project.accountId !== auth.accountId) return null;
      return {
        publicId: exportJob.publicId,
        projectId: project.publicId,
        status: exportJob.status,
        ...(exportJob.pageCount === undefined
          ? {}
          : { pageCount: exportJob.pageCount }),
        ...(exportJob.errorCode === undefined
          ? {}
          : { errorCode: exportJob.errorCode }),
        downloadUrl: exportJob.storageId
          ? await ctx.storage.getUrl(exportJob.storageId)
          : null,
      };
    },
  ),
});
