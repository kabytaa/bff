import { paginationOptsValidator, type PaginationOptions } from 'convex/server';
import { v } from 'convex/values';

import { withBffAccountQuery } from '@tofler/bff-auth/convex/server';
import type { Doc } from './_generated/dataModel';
import { internalMutation, query, type QueryCtx } from './_generated/server';
import { tablecardsCustomerAuth } from './environment';
import { assetFileAddress } from './lib/fileAddresses';
import { fail } from './lib/productErrors';
import { createPublicId } from './lib/publicIds';

const namePosition = v.union(
  v.literal('top'),
  v.literal('center'),
  v.literal('bottom'),
);
const nameFont = v.union(v.literal('sans'), v.literal('serif'));
const nameSize = v.union(
  v.literal('small'),
  v.literal('medium'),
  v.literal('large'),
);
const presetView = v.object({
  publicId: v.string(),
  assetPublicId: v.string(),
  assetSource: v.union(v.literal('uploaded'), v.literal('ai')),
  artworkUrl: v.union(v.null(), v.string()),
  displayName: v.string(),
  nameColor: v.string(),
  namePosition,
  nameFont,
  nameSize,
  createdAt: v.number(),
  updatedAt: v.number(),
});

async function presetProjection(ctx: QueryCtx, preset: Doc<'designPresets'>) {
  const asset = await ctx.db.get(preset.assetId);
  if (!asset || asset.accountId !== preset.accountId) {
    fail('NOT_FOUND', 'Preset artwork is unavailable');
  }
  return {
    publicId: preset.publicId,
    assetPublicId: asset.publicId,
    assetSource: asset.source,
    artworkUrl: assetFileAddress(asset.publicId),
    displayName: preset.displayName,
    nameColor: preset.nameColor,
    namePosition: preset.namePosition,
    nameFont: preset.nameFont ?? ('sans' as const),
    nameSize: preset.nameSize ?? ('medium' as const),
    createdAt: preset.createdAt,
    updatedAt: preset.updatedAt,
  };
}

function validateStyle(args: { displayName: string; nameColor: string }): void {
  const displayName = args.displayName.trim();
  if (displayName.length === 0 || displayName.length > 80) {
    fail('INVALID_INPUT', 'Preset name must be between 1 and 80 characters');
  }
  if (!/^#[0-9a-f]{6}$/iu.test(args.nameColor)) {
    fail('INVALID_INPUT', 'Name color must be a six-digit hex color');
  }
}

export const list = query({
  args: {},
  returns: v.array(presetView),
  handler: withBffAccountQuery(
    tablecardsCustomerAuth,
    async (ctx, _args, auth) => {
      const presets = await ctx.db
        .query('designPresets')
        .withIndex('by_account_updated_at', (queryBuilder) =>
          queryBuilder.eq('accountId', auth.accountId),
        )
        .order('desc')
        .take(101);
      return await Promise.all(
        presets.map((preset) => presetProjection(ctx, preset)),
      );
    },
  ),
});

export const page = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(presetView),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: withBffAccountQuery(
    tablecardsCustomerAuth,
    async (ctx, args: { paginationOpts: PaginationOptions }, auth) => {
      const result = await ctx.db
        .query('designPresets')
        .withIndex('by_account_updated_at', (q) =>
          q.eq('accountId', auth.accountId),
        )
        .order('desc')
        .paginate({ cursor: args.paginationOpts.cursor, numItems: 24 });
      return {
        page: await Promise.all(
          result.page.map((preset) => presetProjection(ctx, preset)),
        ),
        isDone: result.isDone,
        continueCursor: result.continueCursor,
      };
    },
  ),
});

export const createAuthorized = internalMutation({
  args: {
    accountId: v.string(),
    userId: v.string(),
    assetPublicId: v.string(),
    displayName: v.string(),
    nameColor: v.string(),
    namePosition,
    nameFont,
    nameSize,
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    validateStyle(args);
    const asset = await ctx.db
      .query('designAssets')
      .withIndex('by_account_public_id', (queryBuilder) =>
        queryBuilder
          .eq('accountId', args.accountId)
          .eq('publicId', args.assetPublicId),
      )
      .unique();
    if (!asset || asset.projectId !== undefined) {
      fail('NOT_FOUND', 'Reusable preset artwork was not found');
    }
    const publicId = createPublicId('preset');
    const now = Date.now();
    await ctx.db.insert('designPresets', {
      publicId,
      accountId: args.accountId,
      createdByUserId: args.userId,
      assetId: asset._id,
      displayName: args.displayName.trim(),
      nameColor: args.nameColor.toLowerCase(),
      namePosition: args.namePosition,
      nameFont: args.nameFont,
      nameSize: args.nameSize,
      createdAt: now,
      updatedAt: now,
    });
    return publicId;
  },
});

export const updateAuthorized = internalMutation({
  args: {
    accountId: v.string(),
    presetId: v.string(),
    displayName: v.string(),
    nameColor: v.string(),
    namePosition,
    nameFont,
    nameSize,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    validateStyle(args);
    const preset = await ctx.db
      .query('designPresets')
      .withIndex('by_account_public_id', (queryBuilder) =>
        queryBuilder
          .eq('accountId', args.accountId)
          .eq('publicId', args.presetId),
      )
      .unique();
    if (!preset) fail('NOT_FOUND', 'The preset was not found');
    await ctx.db.patch(preset._id, {
      displayName: args.displayName.trim(),
      nameColor: args.nameColor.toLowerCase(),
      namePosition: args.namePosition,
      nameFont: args.nameFont,
      nameSize: args.nameSize,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const deleteAuthorized = internalMutation({
  args: { accountId: v.string(), presetId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const preset = await ctx.db
      .query('designPresets')
      .withIndex('by_account_public_id', (queryBuilder) =>
        queryBuilder
          .eq('accountId', args.accountId)
          .eq('publicId', args.presetId),
      )
      .unique();
    if (!preset) fail('NOT_FOUND', 'The preset was not found');
    await ctx.db.delete(preset._id);
    return null;
  },
});
