'use node';

import { createHash } from 'node:crypto';

import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';

import {
  PRINT_LAYOUTS,
  getDesignDefinition,
  getOfferDefinition,
  renderTableCardsPdf,
  type DesignId,
  type PrintLayoutId,
} from '@tablecards/core';
import { withBffAccountAction } from '@tofler/bff-auth/convex/server';
import { createBffProductAccessClient } from '@tofler/bff-auth/server';
import type { Id } from './_generated/dataModel';
import { action, internalAction } from './_generated/server';
import {
  tablecardsCustomerAuth,
  tablecardsCustomerSession,
} from './environment';
import { fail } from './lib/productErrors';

type ExportStatus = 'failed' | 'generating' | 'queued' | 'ready';
type ExportInput = {
  projectId: string;
  title: string;
  designKind: 'ai' | 'predefined' | 'uploaded';
  designReference: string;
  nameStyle?: {
    color: string;
    position: 'top' | 'center' | 'bottom';
    font: 'sans' | 'serif';
    size: 'small' | 'medium' | 'large';
  };
  layoutId: PrintLayoutId;
  guests: { name: string; table?: string; marker?: string }[];
  backgroundStorageId?: Id<'_storage'>;
  backgroundMimeType?: 'image/jpeg' | 'image/png';
};

const createReference = makeFunctionReference<
  'mutation',
  {
    accountId: string;
    userId: string;
    projectId: string;
    maximumCards: number;
    premiumDesigns: boolean;
    allowUploadedDesigns: boolean;
    allowAiDesigns: boolean;
    layoutId: PrintLayoutId;
  },
  { publicId: string; status: ExportStatus; created: boolean }
>('exportState:create');
const loadReference = makeFunctionReference<
  'mutation',
  { accountId: string; exportId: string },
  ExportInput
>('exportState:load');
const completeReference = makeFunctionReference<
  'mutation',
  {
    accountId: string;
    exportId: string;
    storageId: Id<'_storage'>;
    pageCount: number;
  },
  null
>('exportState:complete');
const failReference = makeFunctionReference<
  'mutation',
  { accountId: string; exportId: string; errorCode: string },
  null
>('exportState:failExport');
const renderReference = makeFunctionReference<
  'action',
  { accountId: string; exportId: string },
  null
>('exports:render');

const client = createBffProductAccessClient({
  bffBaseUrl: tablecardsCustomerSession.bffBaseUrl,
  environmentKey: tablecardsCustomerAuth.environmentKey,
});

const MAX_PREDEFINED_ARTWORK_BYTES = 1_000_000;

async function loadPredefinedArtwork(designId: DesignId): Promise<{
  bytes: Uint8Array;
  mimeType: 'image/jpeg';
}> {
  const design = getDesignDefinition(designId);
  const webOrigin = tablecardsCustomerSession.transport.webOrigins[0];
  if (webOrigin === undefined) {
    fail('PROVIDER_UNAVAILABLE', 'The TableCards web origin is unavailable');
  }
  const artworkUrl = new URL(design.artwork.publicPath, `${webOrigin}/`);
  const response = await fetch(artworkUrl, {
    headers: { accept: design.artwork.mimeType },
    redirect: 'error',
  });
  if (!response.ok) {
    fail('PROVIDER_UNAVAILABLE', 'The predefined artwork is unavailable');
  }
  const contentType = response.headers.get('content-type')?.split(';')[0];
  if (contentType !== design.artwork.mimeType) {
    fail(
      'PROVIDER_UNAVAILABLE',
      'The predefined artwork has an invalid content type',
    );
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_PREDEFINED_ARTWORK_BYTES) {
    fail('PROVIDER_UNAVAILABLE', 'The predefined artwork has an invalid size');
  }
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== design.artwork.sha256) {
    fail(
      'PROVIDER_UNAVAILABLE',
      'The predefined artwork does not match the catalog',
    );
  }
  return { bytes, mimeType: design.artwork.mimeType };
}

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

function numericLimit(
  access: {
    readonly numericLimits: readonly { key: string; value: number }[];
  },
  key: string,
): number {
  const limit = access.numericLimits.find((entry) => entry.key === key)?.value;
  if (limit === undefined) {
    fail('ENTITLEMENT_REQUIRED', 'The current offer is incomplete');
  }
  return limit;
}

export const request = action({
  args: {
    accessToken: v.string(),
    projectId: v.string(),
    layoutId: v.union(v.literal('portrait_4'), v.literal('landscape_6')),
  },
  returns: v.object({
    exportId: v.string(),
    status: v.union(
      v.literal('queued'),
      v.literal('generating'),
      v.literal('ready'),
      v.literal('failed'),
    ),
  }),
  handler: withBffAccountAction(
    tablecardsCustomerAuth,
    async (
      ctx,
      args: {
        accessToken: string;
        projectId: string;
        layoutId: PrintLayoutId;
      },
      auth,
    ) => {
      const access = await client.getAccess({
        contextToken: args.accessToken,
      });
      if (access.accountId !== auth.accountId) {
        fail('FORBIDDEN', 'The account context does not match');
      }
      const offer = getOfferDefinition(access.offerKey);
      const created = await ctx.runMutation(createReference, {
        accountId: auth.accountId,
        userId: auth.userId,
        projectId: args.projectId,
        maximumCards: numericLimit(access, 'maximum_cards_per_project'),
        premiumDesigns: offer.designTier === 'premium',
        allowUploadedDesigns: featureEnabled(access, 'custom_artwork'),
        allowAiDesigns: featureEnabled(access, 'ai_backgrounds'),
        layoutId: args.layoutId,
      });
      if (created.created) {
        await ctx.scheduler.runAfter(0, renderReference, {
          accountId: auth.accountId,
          exportId: created.publicId,
        });
      }
      return { exportId: created.publicId, status: created.status };
    },
  ),
});

export const render = internalAction({
  args: { accountId: v.string(), exportId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    let storedPdf: Id<'_storage'> | undefined;
    try {
      const input = await ctx.runMutation(loadReference, args);
      let backgroundImage:
        { bytes: Uint8Array; mimeType: 'image/jpeg' | 'image/png' } | undefined;
      if (input.backgroundStorageId && input.backgroundMimeType) {
        const background = await ctx.storage.get(input.backgroundStorageId);
        if (!background) {
          fail('NOT_FOUND', 'The background artwork is unavailable');
        }
        backgroundImage = {
          bytes: new Uint8Array(await background.arrayBuffer()),
          mimeType: input.backgroundMimeType,
        };
      } else if (input.designKind === 'predefined') {
        const design = getDesignDefinition(input.designReference);
        backgroundImage = await loadPredefinedArtwork(design.id);
      }
      const designId =
        input.designKind === 'predefined'
          ? getDesignDefinition(input.designReference).id
          : ('minimal-ivory' as const);
      const pdf = await renderTableCardsPdf(
        {
          guests: input.guests,
          designId,
          title: input.title,
          layoutId: input.layoutId,
          ...(input.nameStyle === undefined
            ? {}
            : { nameStyle: input.nameStyle }),
        },
        backgroundImage === undefined ? {} : { backgroundImage },
      );
      storedPdf = await ctx.storage.store(
        new Blob([Uint8Array.from(pdf).buffer], {
          type: 'application/pdf',
        }),
      );
      await ctx.runMutation(completeReference, {
        ...args,
        storageId: storedPdf,
        pageCount:
          Math.ceil(
            input.guests.length / PRINT_LAYOUTS[input.layoutId].cardsPerSheet,
          ) + 1,
      });
      return null;
    } catch (error) {
      if (storedPdf) await ctx.storage.delete(storedPdf);
      await ctx.runMutation(failReference, {
        ...args,
        errorCode: 'EXPORT_FAILED',
      });
      throw error;
    }
  },
});
