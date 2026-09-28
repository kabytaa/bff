import { imageSize } from 'image-size';
import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';

import {
  withBffAccountAction,
  withBffAccountQuery,
} from '@tofler/bff-auth/convex/server';
import { createBffProductAccessClient } from '@tofler/bff-auth/server';
import type { Id } from './_generated/dataModel';
import { action, internalMutation, query } from './_generated/server';
import {
  tablecardsCustomerAuth,
  tablecardsCustomerSession,
} from './environment';
import { fail } from './lib/productErrors';
import { createPublicId } from './lib/publicIds';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MINIMUM_WIDTH = 1050;
const MINIMUM_HEIGHT = 600;
const TARGET_RATIO = 7 / 4;
const RATIO_TOLERANCE = 0.01;

const recordValidatedReference = makeFunctionReference<
  'mutation',
  {
    accountId: string;
    userId: string;
    storageId: Id<'_storage'>;
    projectId?: string;
    mimeType: 'image/png' | 'image/jpeg';
    width: number;
    height: number;
    source: 'uploaded' | 'ai';
  },
  {
    publicId: string;
    mimeType: 'image/png' | 'image/jpeg';
    width: number;
    height: number;
  }
>('assets:recordValidated');

const client = createBffProductAccessClient({
  bffBaseUrl: tablecardsCustomerSession.bffBaseUrl,
  environmentKey: tablecardsCustomerAuth.environmentKey,
});

function featureEnabled(
  access: {
    readonly featureFlags: readonly { key: string; enabled: boolean }[];
  },
  key: string,
): boolean {
  return access.featureFlags.some(
    (feature) => feature.key === key && feature.enabled,
  );
}

function contentType(blob: Blob): 'image/jpeg' | 'image/png' {
  if (blob.type === 'image/png') return 'image/png';
  if (blob.type === 'image/jpeg') return 'image/jpeg';
  return fail('INVALID_INPUT', 'Only PNG and JPEG artwork is supported');
}

export const generateUploadUrl = action({
  args: { accessToken: v.string() },
  returns: v.string(),
  handler: withBffAccountAction(
    tablecardsCustomerAuth,
    async (ctx, args: { accessToken: string }, auth) => {
      const access = await client.getAccess({ contextToken: args.accessToken });
      if (
        access.accountId !== auth.accountId ||
        !featureEnabled(access, 'custom_artwork')
      ) {
        fail('ENTITLEMENT_REQUIRED', 'Uploaded artwork requires a paid offer');
      }
      return await ctx.storage.generateUploadUrl();
    },
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
  handler: withBffAccountAction(
    tablecardsCustomerAuth,
    async (
      ctx,
      args: {
        accessToken: string;
        storageId: Id<'_storage'>;
        projectId?: string;
      },
      auth,
    ) => {
      try {
        const access = await client.getAccess({
          contextToken: args.accessToken,
        });
        if (
          access.accountId !== auth.accountId ||
          !featureEnabled(access, 'custom_artwork')
        ) {
          fail(
            'ENTITLEMENT_REQUIRED',
            'Uploaded artwork requires a paid offer',
          );
        }
        const blob = await ctx.storage.get(args.storageId);
        if (!blob || blob.size === 0 || blob.size > MAX_UPLOAD_BYTES) {
          fail('INVALID_INPUT', 'Artwork is missing or too large');
        }
        const mimeType = contentType(blob);
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const dimensions = imageSize(bytes);
        if (
          dimensions.type !== (mimeType === 'image/png' ? 'png' : 'jpg') ||
          dimensions.width < MINIMUM_WIDTH ||
          dimensions.height < MINIMUM_HEIGHT ||
          Math.abs(dimensions.width / dimensions.height - TARGET_RATIO) >
            RATIO_TOLERANCE ||
          (dimensions.orientation !== undefined && dimensions.orientation !== 1)
        ) {
          fail(
            'INVALID_INPUT',
            'Artwork must be an unrotated 7:4 image at least 1050 by 600 pixels',
          );
        }
        return await ctx.runMutation(recordValidatedReference, {
          accountId: auth.accountId,
          userId: auth.userId,
          storageId: args.storageId,
          projectId: args.projectId,
          mimeType,
          width: dimensions.width,
          height: dimensions.height,
          source: 'uploaded',
        });
      } catch (error) {
        await ctx.storage.delete(args.storageId);
        throw error;
      }
    },
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
      if (!project) fail('NOT_FOUND', 'The project was not found');
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

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      publicId: v.string(),
      source: v.union(v.literal('uploaded'), v.literal('ai')),
      mimeType: v.union(v.literal('image/png'), v.literal('image/jpeg')),
      width: v.number(),
      height: v.number(),
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
      return await Promise.all(
        assets.map(async (asset) => ({
          publicId: asset.publicId,
          source: asset.source,
          mimeType: asset.mimeType,
          width: asset.width,
          height: asset.height,
          url: await ctx.storage.getUrl(asset.storageId),
          createdAt: asset.createdAt,
        })),
      );
    },
  ),
});
