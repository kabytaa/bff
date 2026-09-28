import {
  PRODUCT_ACCESS_VERSION,
  developmentProductAccessGrantRequestSchema,
  productAccessKeySchema,
  productAccessPeriodKeySchema,
  type DevelopmentProductAccessGrantRequest,
} from '@bff/contracts';
import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server';
import { developmentProductAccessRouteEnabled } from './developmentProductAccess';
import { fail } from './lib/errors';

export const productFeatureFlagValidator = v.object({
  key: v.string(),
  enabled: v.boolean(),
});

export const productNumericLimitValidator = v.object({
  key: v.string(),
  value: v.number(),
});

const developmentProductUnitGrantValidator = v.object({
  unitType: v.string(),
  allowance: v.number(),
  allocation: v.union(
    v.object({ kind: v.literal('monthly') }),
    v.object({ kind: v.literal('fixed'), key: v.string() }),
  ),
});

export const productUnitGrantValidator = v.object({
  unitType: v.string(),
  periodKey: v.string(),
  allowance: v.number(),
  renewal: v.optional(
    v.object({ cadence: v.literal('monthly'), anchorAt: v.number() }),
  ),
});

export const productAccessProjectionValidator = v.object({
  version: v.literal(PRODUCT_ACCESS_VERSION),
  accountId: v.string(),
  offerKey: v.string(),
  offerRevision: v.number(),
  source: v.union(
    v.literal('default'),
    v.literal('development_mock'),
    v.literal('provider'),
  ),
  featureFlags: v.array(productFeatureFlagValidator),
  numericLimits: v.array(productNumericLimitValidator),
  unitGrants: v.array(productUnitGrantValidator),
  effectiveAt: v.number(),
  updatedAt: v.number(),
});

export const accountContextArgs = {
  environmentKey: v.string(),
  userPublicId: v.string(),
  accountPublicId: v.string(),
  membershipPublicId: v.string(),
} as const;

export interface ResolvedAccountContext {
  readonly environment: Doc<'businessEnvironments'>;
  readonly account: Doc<'accounts'>;
  readonly user: Doc<'businessUsers'>;
  readonly membership: Doc<'memberships'>;
}

export async function resolveAccountContext(
  ctx: QueryCtx | MutationCtx,
  args: {
    readonly environmentKey: string;
    readonly userPublicId: string;
    readonly accountPublicId: string;
    readonly membershipPublicId: string;
  },
): Promise<ResolvedAccountContext> {
  const environment = await ctx.db
    .query('businessEnvironments')
    .withIndex('by_key', (query) => query.eq('key', args.environmentKey))
    .unique();
  if (!environment?.customerAuth) {
    return fail('CONFIGURATION_ERROR', 'Business environment is unavailable');
  }
  const [account, user] = await Promise.all([
    ctx.db
      .query('accounts')
      .withIndex('by_environment_public_id', (query) =>
        query
          .eq('environmentId', environment._id)
          .eq('publicId', args.accountPublicId),
      )
      .unique(),
    ctx.db
      .query('businessUsers')
      .withIndex('by_environment_public_id', (query) =>
        query
          .eq('environmentId', environment._id)
          .eq('publicId', args.userPublicId),
      )
      .unique(),
  ]);
  if (!account || !user) {
    return fail('FORBIDDEN', 'Account access is unavailable');
  }
  const membership = await ctx.db
    .query('memberships')
    .withIndex('by_environment_account_user', (query) =>
      query
        .eq('environmentId', environment._id)
        .eq('accountId', account._id)
        .eq('userId', user._id),
    )
    .unique();
  if (!membership || membership.publicId !== args.membershipPublicId) {
    return fail('FORBIDDEN', 'Account access is unavailable');
  }
  return { environment, account, user, membership };
}

export async function findAccessGrant(
  ctx: QueryCtx | MutationCtx,
  environmentId: Id<'businessEnvironments'>,
  accountId: Id<'accounts'>,
) {
  return await ctx.db
    .query('accountAccessGrants')
    .withIndex('by_environment_account', (query) =>
      query.eq('environmentId', environmentId).eq('accountId', accountId),
    )
    .unique();
}

function utcMonthStartAtOffset(anchorAt: number, offset: number): number {
  const anchor = new Date(anchorAt);
  const targetMonth = new Date(
    Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth() + offset,
      1,
      anchor.getUTCHours(),
      anchor.getUTCMinutes(),
      anchor.getUTCSeconds(),
      anchor.getUTCMilliseconds(),
    ),
  );
  const lastDay = new Date(
    Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0),
  ).getUTCDate();
  targetMonth.setUTCDate(Math.min(anchor.getUTCDate(), lastDay));
  return targetMonth.getTime();
}

function monthlyPeriodKey(anchorAt: number, now: number): string {
  const anchor = new Date(anchorAt);
  const current = new Date(Math.max(now, anchorAt));
  let offset =
    (current.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
    current.getUTCMonth() -
    anchor.getUTCMonth();
  let startsAt = utcMonthStartAtOffset(anchorAt, offset);
  if (startsAt > current.getTime() && offset > 0) {
    offset -= 1;
    startsAt = utcMonthStartAtOffset(anchorAt, offset);
  }
  let endsAt = utcMonthStartAtOffset(anchorAt, offset + 1);
  while (current.getTime() >= endsAt) {
    offset += 1;
    startsAt = endsAt;
    endsAt = utcMonthStartAtOffset(anchorAt, offset + 1);
  }
  return productAccessPeriodKeySchema.parse(
    `billing-cycle:${startsAt}:${endsAt}`,
  );
}

export function resolveUnitGrantPeriod(
  grant: Doc<'accountAccessGrants'>['unitGrants'][number],
  now: number,
  legacyDevelopmentAnchorAt?: number,
) {
  const monthlyAnchorAt =
    grant.renewal?.anchorAt ??
    (grant.periodKey.startsWith('mock-month:')
      ? legacyDevelopmentAnchorAt
      : undefined);
  return {
    unitType: grant.unitType,
    periodKey:
      monthlyAnchorAt === undefined
        ? grant.periodKey
        : monthlyPeriodKey(monthlyAnchorAt, now),
    allowance: grant.allowance,
  };
}

function projection(
  context: ResolvedAccountContext,
  grant: Doc<'accountAccessGrants'> | null,
  now: number,
) {
  if (!grant) {
    return {
      version: PRODUCT_ACCESS_VERSION,
      accountId: context.account.publicId,
      offerKey: 'free',
      offerRevision: 1,
      source: 'default' as const,
      featureFlags: [],
      numericLimits: [],
      unitGrants: [],
      effectiveAt: context.account.createdAt,
      updatedAt: context.account.updatedAt,
    };
  }
  return {
    version: PRODUCT_ACCESS_VERSION,
    accountId: context.account.publicId,
    offerKey: grant.offerKey,
    offerRevision: grant.offerRevision,
    source: grant.source,
    featureFlags: grant.featureFlags,
    numericLimits: grant.numericLimits,
    unitGrants: grant.unitGrants.map((unitGrant) =>
      resolveUnitGrantPeriod(unitGrant, now, grant.effectiveAt),
    ),
    effectiveAt: grant.effectiveAt,
    updatedAt: grant.updatedAt,
  };
}

export const currentForAccount = internalQuery({
  args: { ...accountContextArgs, now: v.number() },
  returns: productAccessProjectionValidator,
  handler: async (ctx, args) => {
    const context = await resolveAccountContext(ctx, args);
    return projection(
      context,
      await findAccessGrant(ctx, context.environment._id, context.account._id),
      args.now,
    );
  },
});

const developmentGrantArgs = {
  ...accountContextArgs,
  offerKey: v.string(),
  offerRevision: v.number(),
  featureFlags: v.array(productFeatureFlagValidator),
  numericLimits: v.array(productNumericLimitValidator),
  unitGrants: v.array(developmentProductUnitGrantValidator),
  now: v.number(),
} as const;

export const setDevelopmentForAccount = internalMutation({
  args: developmentGrantArgs,
  returns: productAccessProjectionValidator,
  handler: async (ctx, args) => {
    if (!developmentProductAccessRouteEnabled()) {
      return fail('FORBIDDEN', 'Development product access is disabled');
    }
    const context = await resolveAccountContext(ctx, args);
    if (!context.environment.customerAuth?.developmentAutomationEnabled) {
      return fail(
        'FORBIDDEN',
        'Development product access is disabled for this environment',
      );
    }
    const input: DevelopmentProductAccessGrantRequest =
      developmentProductAccessGrantRequestSchema.parse({
        offerKey: args.offerKey,
        offerRevision: args.offerRevision,
        featureFlags: args.featureFlags,
        numericLimits: args.numericLimits,
        unitGrants: args.unitGrants,
      });
    const existing = await findAccessGrant(
      ctx,
      context.environment._id,
      context.account._id,
    );
    const value = {
      offerKey: productAccessKeySchema.parse(input.offerKey),
      offerRevision: input.offerRevision,
      source: 'development_mock' as const,
      featureFlags: input.featureFlags,
      numericLimits: input.numericLimits,
      unitGrants: input.unitGrants.map((grant) => {
        const unitType = productAccessKeySchema.parse(grant.unitType);
        if (grant.allocation.kind === 'monthly') {
          // The development mock deliberately simulates a successful renewal
          // every cycle. Build 4's real payment writer must advance monthly
          // access only from verified provider paid-through state; this mock
          // policy must never become the production renewal authority.
          const renewal = { cadence: 'monthly' as const, anchorAt: args.now };
          return {
            unitType,
            periodKey: monthlyPeriodKey(renewal.anchorAt, args.now),
            allowance: grant.allowance,
            renewal,
          };
        }
        return {
          unitType,
          periodKey: productAccessPeriodKeySchema.parse(grant.allocation.key),
          allowance: grant.allowance,
        };
      }),
      updatedByUserId: context.user._id,
      effectiveAt: args.now,
      updatedAt: args.now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, value);
    } else {
      await ctx.db.insert('accountAccessGrants', {
        environmentId: context.environment._id,
        accountId: context.account._id,
        ...value,
        createdAt: args.now,
      });
    }
    const stored = await findAccessGrant(
      ctx,
      context.environment._id,
      context.account._id,
    );
    if (!stored) {
      return fail('CONFIGURATION_ERROR', 'Product access was not stored');
    }
    return projection(context, stored, args.now);
  },
});
