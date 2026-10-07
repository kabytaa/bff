import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';

import { getDesignDefinition } from '@tablecards/core';
import { withBffAccountQuery } from '@tofler/bff-auth/convex/server';
import { internalMutation, query } from './_generated/server';
import { tablecardsCustomerAuth } from './environment';
import { exportFileAddress } from './lib/fileAddresses';
import { fail } from './lib/productErrors';
import { createPublicId } from './lib/publicIds';

const exportStatus = v.union(
  v.literal('queued'),
  v.literal('generating'),
  v.literal('ready'),
  v.literal('failed'),
);
const nameStyle = v.object({
  color: v.string(),
  position: v.union(v.literal('top'), v.literal('center'), v.literal('bottom')),
  font: v.union(v.literal('sans'), v.literal('serif')),
  size: v.union(v.literal('small'), v.literal('medium'), v.literal('large')),
});
const renderReference = makeFunctionReference<
  'action',
  { accountId: string; exportId: string },
  null
>('exports:render');

// Invalidate single-line PDF caches without rewriting existing exports.
const CURRENT_RENDER_VERSION = 3;

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
    const contents = await ctx.db
      .query('projectContents')
      .withIndex('by_project_id', (queryBuilder) =>
        queryBuilder.eq('projectId', project._id),
      )
      .unique();
    if (!contents || contents.accountId !== args.accountId) {
      fail('NOT_FOUND', 'The project contents were not found');
    }
    if (
      contents.revision !== project.revision ||
      contents.guests.length !== project.guestCount
    ) {
      fail('CONFLICT', 'The saved project revision is inconsistent');
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
      if (
        !asset ||
        asset.source !== project.designKind ||
        (asset.projectId !== undefined && asset.projectId !== project._id)
      ) {
        fail('NOT_FOUND', 'The background artwork was not found');
      }
      backgroundStorageId = asset.storageId;
      backgroundMimeType = asset.mimeType;
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
      previous.renderVersion === CURRENT_RENDER_VERSION &&
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
      renderVersion: CURRENT_RENDER_VERSION,
      snapshot: {
        projectId: project.publicId,
        title: project.title,
        designKind: project.designKind,
        designReference: project.designReference,
        ...(project.nameStyle === undefined
          ? {}
          : { nameStyle: project.nameStyle }),
        guests: contents.guests,
        ...(backgroundStorageId === undefined
          ? {}
          : { backgroundStorageId, backgroundMimeType }),
      },
      layoutId: args.layoutId,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, renderReference, {
      accountId: args.accountId,
      exportId: publicId,
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
    nameStyle: v.optional(nameStyle),
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
    if (exportJob.snapshot !== undefined) {
      await ctx.db.patch(exportJob._id, {
        status: 'generating',
        updatedAt: Date.now(),
      });
      return {
        ...exportJob.snapshot,
        layoutId: exportJob.layoutId ?? 'portrait_4',
      };
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
    // Rows queued before snapshots were introduced can render only the exact
    // revision authorized by their original request.
    if (
      project.revision !== exportJob.projectRevision ||
      contents.revision !== exportJob.projectRevision
    ) {
      fail('CONFLICT', 'The export revision is stale; request a new PDF');
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
      ...(project.nameStyle === undefined
        ? {}
        : { nameStyle: project.nameStyle }),
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
    if (
      exportJob.status === 'ready' &&
      exportJob.storageId === args.storageId &&
      exportJob.pageCount === args.pageCount
    ) {
      return null;
    }
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

export const cleanupUnattached = internalMutation({
  args: {
    accountId: v.string(),
    exportId: v.string(),
    storageId: v.id('_storage'),
  },
  returns: exportStatus,
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
    if (exportJob.status === 'ready') return exportJob.status;
    const linkedExport = await ctx.db
      .query('projectExports')
      .withIndex('by_storage_id', (queryBuilder) =>
        queryBuilder.eq('storageId', args.storageId),
      )
      .first();
    const linkedAsset = await ctx.db
      .query('designAssets')
      .withIndex('by_storage_id', (queryBuilder) =>
        queryBuilder.eq('storageId', args.storageId),
      )
      .first();
    if (!linkedExport && !linkedAsset) await ctx.storage.delete(args.storageId);
    return exportJob.status;
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
        downloadUrl:
          exportJob.status === 'ready' && exportJob.storageId
            ? exportFileAddress(exportJob.publicId)
            : null,
      };
    },
  ),
});

export const latestForProject = query({
  args: { projectId: v.string() },
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
    async (ctx, args: { projectId: string }, auth) => {
      const project = await ctx.db
        .query('projects')
        .withIndex('by_account_public_id', (queryBuilder) =>
          queryBuilder
            .eq('accountId', auth.accountId)
            .eq('publicId', args.projectId),
        )
        .unique();
      if (!project) return null;
      const exportJob = await ctx.db
        .query('projectExports')
        .withIndex('by_project_created_at', (queryBuilder) =>
          queryBuilder.eq('projectId', project._id),
        )
        .order('desc')
        .first();
      if (
        !exportJob ||
        exportJob.accountId !== auth.accountId ||
        exportJob.projectRevision !== project.revision ||
        exportJob.renderVersion !== CURRENT_RENDER_VERSION
      ) {
        return null;
      }
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
        downloadUrl:
          exportJob.status === 'ready' && exportJob.storageId
            ? exportFileAddress(exportJob.publicId)
            : null,
      };
    },
  ),
});
