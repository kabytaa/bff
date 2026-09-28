import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';

import {
  TABLECARDS_OFFERS,
  getOfferDefinition,
  type OfferDefinition,
  type OfferId,
} from '@tablecards/core';
import { withBffAccountAction } from '@tofler/bff-auth/convex/server';
import { createBffProductAccessClient } from '@tofler/bff-auth/server';
import { action } from './_generated/server';
import {
  tablecardsCustomerAuth,
  tablecardsCustomerSession,
  tablecardsDevelopmentMocksEnabled,
} from './environment';
import { fail } from './lib/productErrors';

const client = createBffProductAccessClient({
  bffBaseUrl: tablecardsCustomerSession.bffBaseUrl,
  environmentKey: tablecardsCustomerAuth.environmentKey,
});

const offerId = v.union(
  v.literal('free'),
  v.literal('event_pass'),
  v.literal('planner_pro'),
  v.literal('studio'),
);
const offerView = v.object({
  id: offerId,
  name: v.string(),
  billing: v.union(
    v.literal('free'),
    v.literal('one_time'),
    v.literal('monthly'),
  ),
  priceUsd: v.number(),
  maximumCardsPerProject: v.number(),
  maximumActiveProjects: v.number(),
  customArtwork: v.boolean(),
  premiumDesigns: v.boolean(),
  aiBackgrounds: v.boolean(),
  reusablePresets: v.boolean(),
  teamAccess: v.boolean(),
  collaborationSeats: v.number(),
  aiAllowance: v.number(),
  aiBatchesRemaining: v.number(),
  aiAllocationLabel: v.union(
    v.literal('lifetime'),
    v.literal('event'),
    v.literal('current_billing_cycle'),
  ),
  source: v.union(
    v.literal('default'),
    v.literal('development_mock'),
    v.literal('provider'),
  ),
});

function isOfferId(value: string): value is OfferId {
  return value in TABLECARDS_OFFERS;
}

function fixedAllocationKey(offer: OfferDefinition): string {
  if (offer.aiUnitPolicy.period === 'event') return 'event-pass-v1';
  return 'welcome-lifetime-v1';
}

function developmentGrant(offer: OfferDefinition) {
  return {
    offerKey: offer.id,
    offerRevision: offer.offerRevision,
    featureFlags: Object.entries(offer.featureFlags).map(([key, enabled]) => ({
      key,
      enabled,
    })),
    numericLimits: Object.entries(offer.numericLimits).map(([key, value]) => ({
      key,
      value,
    })),
    unitGrants: [
      {
        unitType: offer.aiUnitPolicy.unitType,
        allowance: offer.aiUnitPolicy.allowance,
        allocation:
          offer.aiUnitPolicy.period === 'monthly'
            ? ({ kind: 'monthly' } as const)
            : ({
                kind: 'fixed',
                key: fixedAllocationKey(offer),
              } as const),
      },
    ],
  };
}

function view(
  offer: OfferDefinition,
  access: Awaited<ReturnType<typeof client.getAccess>>,
  balance: Awaited<ReturnType<typeof client.getUnitBalance>>,
) {
  return {
    id: offer.id,
    name: offer.name,
    billing: offer.billing,
    priceUsd: offer.priceUsd,
    maximumCardsPerProject: offer.numericLimits.maximum_cards_per_project,
    maximumActiveProjects: offer.numericLimits.maximum_active_projects,
    customArtwork: offer.featureFlags.custom_artwork,
    premiumDesigns: offer.designTier === 'premium',
    aiBackgrounds: offer.featureFlags.ai_backgrounds,
    reusablePresets: offer.featureFlags.reusable_presets,
    teamAccess: offer.featureFlags.team_access,
    collaborationSeats: offer.collaborationSeats,
    aiAllowance: offer.aiUnitPolicy.allowance,
    aiBatchesRemaining: balance.available,
    aiAllocationLabel:
      offer.aiUnitPolicy.period === 'monthly'
        ? ('current_billing_cycle' as const)
        : offer.aiUnitPolicy.period,
    source: access.source,
  };
}

async function effectiveOffer(accessToken: string, accountId: string) {
  let access = await client.getAccess({ contextToken: accessToken });
  if (access.accountId !== accountId) {
    fail('FORBIDDEN', 'The account context does not match');
  }
  if (!isOfferId(access.offerKey)) {
    fail('ENTITLEMENT_REQUIRED', 'The account offer is not supported');
  }
  const offer = getOfferDefinition(access.offerKey);
  if (access.source === 'default' && tablecardsDevelopmentMocksEnabled()) {
    access = await client.setDevelopmentAccess(
      { contextToken: accessToken },
      developmentGrant(offer),
    );
  }
  return { access, offer };
}

const saveAuthorizedReference = makeFunctionReference<
  'mutation',
  {
    accountId: string;
    userId: string;
    projectId?: string;
    title: string;
    guests: { name: string; table?: string; marker?: string }[];
    design: {
      kind: 'predefined' | 'uploaded' | 'ai';
      reference: string;
      nameStyle?: ProjectNameStyle;
    };
    maximumActiveProjects: number;
    maximumCards: number;
    allowUploadedDesigns: boolean;
    allowAiDesigns: boolean;
    allowPremiumDesigns: boolean;
  },
  {
    publicId: string;
    title: string;
    state: 'active' | 'archived';
    designKind: 'predefined' | 'uploaded' | 'ai';
    designReference: string;
    nameStyle?: ProjectNameStyle;
    guestCount: number;
    revision: number;
    createdAt: number;
    updatedAt: number;
  }
>('projects:saveAuthorized');

const loadForDuplicateReference = makeFunctionReference<
  'query',
  { accountId: string; projectId: string },
  {
    title: string;
    guests: { name: string; table?: string; marker?: string }[];
    design: {
      kind: 'predefined' | 'uploaded' | 'ai';
      reference: string;
      nameStyle?: ProjectNameStyle;
    };
  } | null
>('projects:loadForDuplicate');

const restoreAuthorizedReference = makeFunctionReference<
  'mutation',
  {
    accountId: string;
    projectId: string;
    maximumActiveProjects: number;
    maximumCards: number;
    allowPremiumDesigns: boolean;
    allowUploadedDesigns: boolean;
    allowAiDesigns: boolean;
  },
  {
    publicId: string;
    title: string;
    state: 'active' | 'archived';
    designKind: 'predefined' | 'uploaded' | 'ai';
    designReference: string;
    nameStyle?: ProjectNameStyle;
    guestCount: number;
    revision: number;
    createdAt: number;
    updatedAt: number;
  }
>('projects:restoreAuthorized');

type PresetStyle = {
  displayName: string;
  nameColor: string;
  namePosition: 'top' | 'center' | 'bottom';
  nameFont: 'sans' | 'serif';
  nameSize: 'small' | 'medium' | 'large';
};

type ProjectNameStyle = {
  color: string;
  position: 'top' | 'center' | 'bottom';
  font: 'sans' | 'serif';
  size: 'small' | 'medium' | 'large';
};

const projectNameStyle = v.object({
  color: v.string(),
  position: v.union(v.literal('top'), v.literal('center'), v.literal('bottom')),
  font: v.union(v.literal('sans'), v.literal('serif')),
  size: v.union(v.literal('small'), v.literal('medium'), v.literal('large')),
});

const createPresetAuthorizedReference = makeFunctionReference<
  'mutation',
  PresetStyle & {
    accountId: string;
    userId: string;
    assetPublicId: string;
  },
  string
>('designPresets:createAuthorized');
const updatePresetAuthorizedReference = makeFunctionReference<
  'mutation',
  PresetStyle & { accountId: string; presetId: string },
  null
>('designPresets:updateAuthorized');
const deletePresetAuthorizedReference = makeFunctionReference<
  'mutation',
  { accountId: string; presetId: string },
  null
>('designPresets:deleteAuthorized');

const presetStyleArgs = {
  displayName: v.string(),
  nameColor: v.string(),
  namePosition: v.union(
    v.literal('top'),
    v.literal('center'),
    v.literal('bottom'),
  ),
  nameFont: v.union(v.literal('sans'), v.literal('serif')),
  nameSize: v.union(
    v.literal('small'),
    v.literal('medium'),
    v.literal('large'),
  ),
};

export const current = action({
  args: { accessToken: v.string() },
  returns: offerView,
  handler: withBffAccountAction(
    tablecardsCustomerAuth,
    async (ctx, args: { accessToken: string }, auth) => {
      const { access, offer } = await effectiveOffer(
        args.accessToken,
        auth.accountId,
      );
      const balance = await client.getUnitBalance(
        { contextToken: args.accessToken },
        { unitType: offer.aiUnitPolicy.unitType },
      );
      return view(offer, access, balance);
    },
  ),
});

export const selectDevelopmentOffer = action({
  args: { accessToken: v.string(), offerKey: offerId },
  returns: offerView,
  handler: withBffAccountAction(
    tablecardsCustomerAuth,
    async (_ctx, args: { accessToken: string; offerKey: OfferId }, auth) => {
      if (!tablecardsDevelopmentMocksEnabled()) {
        fail('FORBIDDEN', 'Development commerce is disabled');
      }
      const offer = getOfferDefinition(args.offerKey);
      const access = await client.setDevelopmentAccess(
        { contextToken: args.accessToken },
        developmentGrant(offer),
      );
      if (access.accountId !== auth.accountId) {
        fail('FORBIDDEN', 'The account context does not match');
      }
      const balance = await client.getUnitBalance(
        { contextToken: args.accessToken },
        { unitType: offer.aiUnitPolicy.unitType },
      );
      return view(offer, access, balance);
    },
  ),
});

export const saveProject = action({
  args: {
    accessToken: v.string(),
    projectId: v.optional(v.string()),
    title: v.string(),
    guests: v.array(
      v.object({
        name: v.string(),
        table: v.optional(v.string()),
        marker: v.optional(v.string()),
      }),
    ),
    design: v.object({
      kind: v.union(
        v.literal('predefined'),
        v.literal('uploaded'),
        v.literal('ai'),
      ),
      reference: v.string(),
      nameStyle: v.optional(projectNameStyle),
    }),
  },
  returns: v.object({
    publicId: v.string(),
    title: v.string(),
    state: v.union(v.literal('active'), v.literal('archived')),
    designKind: v.union(
      v.literal('predefined'),
      v.literal('uploaded'),
      v.literal('ai'),
    ),
    designReference: v.string(),
    nameStyle: v.optional(projectNameStyle),
    guestCount: v.number(),
    revision: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  handler: withBffAccountAction(
    tablecardsCustomerAuth,
    async (
      ctx,
      args: {
        accessToken: string;
        projectId?: string;
        title: string;
        guests: { name: string; table?: string; marker?: string }[];
        design: {
          kind: 'predefined' | 'uploaded' | 'ai';
          reference: string;
          nameStyle?: ProjectNameStyle;
        };
      },
      auth,
    ) => {
      const { offer } = await effectiveOffer(args.accessToken, auth.accountId);
      return await ctx.runMutation(saveAuthorizedReference, {
        accountId: auth.accountId,
        userId: auth.userId,
        projectId: args.projectId,
        title: args.title,
        guests: args.guests,
        design: args.design,
        maximumActiveProjects: offer.numericLimits.maximum_active_projects,
        maximumCards: offer.numericLimits.maximum_cards_per_project,
        allowUploadedDesigns: offer.featureFlags.custom_artwork,
        allowAiDesigns: offer.featureFlags.ai_backgrounds,
        allowPremiumDesigns: offer.designTier === 'premium',
      });
    },
  ),
});

export const duplicateProject = action({
  args: { accessToken: v.string(), projectId: v.string() },
  returns: v.object({
    publicId: v.string(),
    title: v.string(),
    state: v.union(v.literal('active'), v.literal('archived')),
    designKind: v.union(
      v.literal('predefined'),
      v.literal('uploaded'),
      v.literal('ai'),
    ),
    designReference: v.string(),
    nameStyle: v.optional(projectNameStyle),
    guestCount: v.number(),
    revision: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  handler: withBffAccountAction(
    tablecardsCustomerAuth,
    async (ctx, args: { accessToken: string; projectId: string }, auth) => {
      const { offer } = await effectiveOffer(args.accessToken, auth.accountId);
      const source = await ctx.runQuery(loadForDuplicateReference, {
        accountId: auth.accountId,
        projectId: args.projectId,
      });
      if (!source) fail('NOT_FOUND', 'The project was not found');
      return await ctx.runMutation(saveAuthorizedReference, {
        accountId: auth.accountId,
        userId: auth.userId,
        title: `${source.title} copy`.slice(0, 120),
        guests: source.guests,
        design: source.design,
        maximumActiveProjects: offer.numericLimits.maximum_active_projects,
        maximumCards: offer.numericLimits.maximum_cards_per_project,
        allowUploadedDesigns: offer.featureFlags.custom_artwork,
        allowAiDesigns: offer.featureFlags.ai_backgrounds,
        allowPremiumDesigns: offer.designTier === 'premium',
      });
    },
  ),
});

export const restoreProject = action({
  args: { accessToken: v.string(), projectId: v.string() },
  returns: v.object({
    publicId: v.string(),
    title: v.string(),
    state: v.union(v.literal('active'), v.literal('archived')),
    designKind: v.union(
      v.literal('predefined'),
      v.literal('uploaded'),
      v.literal('ai'),
    ),
    designReference: v.string(),
    nameStyle: v.optional(projectNameStyle),
    guestCount: v.number(),
    revision: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  handler: withBffAccountAction(
    tablecardsCustomerAuth,
    async (ctx, args: { accessToken: string; projectId: string }, auth) => {
      const { offer } = await effectiveOffer(args.accessToken, auth.accountId);
      return await ctx.runMutation(restoreAuthorizedReference, {
        accountId: auth.accountId,
        projectId: args.projectId,
        maximumActiveProjects: offer.numericLimits.maximum_active_projects,
        maximumCards: offer.numericLimits.maximum_cards_per_project,
        allowPremiumDesigns: offer.designTier === 'premium',
        allowUploadedDesigns: offer.featureFlags.custom_artwork,
        allowAiDesigns: offer.featureFlags.ai_backgrounds,
      });
    },
  ),
});

export const createPreset = action({
  args: {
    accessToken: v.string(),
    assetPublicId: v.string(),
    ...presetStyleArgs,
  },
  returns: v.string(),
  handler: withBffAccountAction(
    tablecardsCustomerAuth,
    async (
      ctx,
      args: { accessToken: string; assetPublicId: string } & PresetStyle,
      auth,
    ) => {
      const { offer } = await effectiveOffer(args.accessToken, auth.accountId);
      if (!offer.featureFlags.reusable_presets) {
        fail('ENTITLEMENT_REQUIRED', 'Reusable presets require Planner Pro');
      }
      return await ctx.runMutation(createPresetAuthorizedReference, {
        accountId: auth.accountId,
        userId: auth.userId,
        assetPublicId: args.assetPublicId,
        displayName: args.displayName,
        nameColor: args.nameColor,
        namePosition: args.namePosition,
        nameFont: args.nameFont,
        nameSize: args.nameSize,
      });
    },
  ),
});

export const updatePreset = action({
  args: {
    accessToken: v.string(),
    presetId: v.string(),
    ...presetStyleArgs,
  },
  returns: v.null(),
  handler: withBffAccountAction(
    tablecardsCustomerAuth,
    async (
      ctx,
      args: { accessToken: string; presetId: string } & PresetStyle,
      auth,
    ) => {
      const { offer } = await effectiveOffer(args.accessToken, auth.accountId);
      if (!offer.featureFlags.reusable_presets) {
        fail('ENTITLEMENT_REQUIRED', 'Reusable presets require Planner Pro');
      }
      return await ctx.runMutation(updatePresetAuthorizedReference, {
        accountId: auth.accountId,
        presetId: args.presetId,
        displayName: args.displayName,
        nameColor: args.nameColor,
        namePosition: args.namePosition,
        nameFont: args.nameFont,
        nameSize: args.nameSize,
      });
    },
  ),
});

export const deletePreset = action({
  args: { accessToken: v.string(), presetId: v.string() },
  returns: v.null(),
  handler: withBffAccountAction(
    tablecardsCustomerAuth,
    async (ctx, args: { accessToken: string; presetId: string }, auth) => {
      const { offer } = await effectiveOffer(args.accessToken, auth.accountId);
      if (!offer.featureFlags.reusable_presets) {
        fail('ENTITLEMENT_REQUIRED', 'Reusable presets require Planner Pro');
      }
      return await ctx.runMutation(deletePresetAuthorizedReference, {
        accountId: auth.accountId,
        presetId: args.presetId,
      });
    },
  ),
});
