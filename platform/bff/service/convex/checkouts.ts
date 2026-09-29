import {
  CHECKOUT_VERSION,
  MOCK_CHECKOUT_TTL_SECONDS,
  createCheckoutRequestSchema,
  publicIdentifierSchema,
  type CreateCheckoutRequest,
} from '@bff/contracts';
import { v } from 'convex/values';

import { applyAccountPolicyOverrides } from './accounts';
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from './_generated/server';
import { fail } from './lib/errors';
import { mockCheckoutEnabled } from './mockCheckout';
import {
  accountContextArgs,
  developmentProductUnitGrantValidator,
  productFeatureFlagValidator,
  productNumericLimitValidator,
  resolveAccountContext,
  storeDevelopmentAccess,
} from './productAccess';

const checkoutOfferValidator = v.object({
  key: v.string(),
  revision: v.number(),
  displayName: v.string(),
  priceUsdCents: v.number(),
  billing: v.union(v.literal('one_time'), v.literal('monthly')),
});

const checkoutGrantValidator = v.object({
  offerKey: v.string(),
  offerRevision: v.number(),
  featureFlags: v.array(productFeatureFlagValidator),
  numericLimits: v.array(productNumericLimitValidator),
  unitGrants: v.array(developmentProductUnitGrantValidator),
});

const checkoutPolicyValidator = v.object({
  seatLimit: v.number(),
  adminRoleEnabled: v.boolean(),
  memberInvitationsEnabled: v.boolean(),
});

const checkoutStateValidator = v.union(
  v.literal('pending'),
  v.literal('completed'),
  v.literal('cancelled'),
);

export const checkoutChallengeValidator = v.object({
  version: v.literal(CHECKOUT_VERSION),
  environmentKey: v.string(),
  reference: v.string(),
  presentation: v.object({
    productName: v.string(),
    theme: v.union(v.literal('light'), v.literal('dark'), v.literal('system')),
    accentColor: v.string(),
  }),
  offer: checkoutOfferValidator,
  state: checkoutStateValidator,
  expiresAt: v.number(),
});

const createResultValidator = v.union(
  v.object({ kind: v.literal('collision') }),
  v.object({
    kind: v.literal('ok'),
    reference: v.string(),
    expiresAt: v.number(),
  }),
);

function returnUrlFor(
  returnUrl: string,
  state: 'success' | 'cancelled',
  offerKey: string,
) {
  const url = new URL(returnUrl);
  url.searchParams.set('checkout', state);
  url.searchParams.set('offer', offerKey);
  return url.href;
}

function inputFromArgs(args: {
  idempotencyKey: string;
  offer: CreateCheckoutRequest['offer'];
  grant: CreateCheckoutRequest['grant'];
  accountPolicy: CreateCheckoutRequest['accountPolicy'];
  returnUrl: string;
}) {
  return createCheckoutRequestSchema.parse({
    idempotencyKey: args.idempotencyKey,
    offer: args.offer,
    grant: args.grant,
    accountPolicy: args.accountPolicy,
    returnUrl: args.returnUrl,
  });
}

export const createForAccount = internalMutation({
  args: {
    ...accountContextArgs,
    idempotencyKey: v.string(),
    requestFingerprint: v.string(),
    publicReference: v.string(),
    offer: checkoutOfferValidator,
    grant: checkoutGrantValidator,
    accountPolicy: checkoutPolicyValidator,
    returnUrl: v.string(),
    now: v.number(),
  },
  returns: createResultValidator,
  handler: async (ctx, args) => {
    if (!mockCheckoutEnabled()) {
      return fail('FORBIDDEN', 'Mock checkout is disabled');
    }
    const input = inputFromArgs(args);
    const context = await resolveAccountContext(ctx, args);
    if (context.membership.role !== 'owner') {
      return fail('FORBIDDEN', 'Only the Owner can start checkout');
    }
    const returnOrigin = new URL(input.returnUrl).origin;
    if (
      !context.environment.customerAuth?.transport.webOrigins.includes(
        returnOrigin,
      )
    ) {
      return fail('VALIDATION_ERROR', 'Checkout return URL is not registered');
    }
    const existing = await ctx.db
      .query('checkoutAttempts')
      .withIndex('by_environment_account_idempotency', (query) =>
        query
          .eq('environmentId', context.environment._id)
          .eq('accountId', context.account._id)
          .eq('idempotencyKey', input.idempotencyKey),
      )
      .unique();
    if (existing) {
      if (existing.requestFingerprint !== args.requestFingerprint) {
        return fail('CONFLICT', 'Checkout idempotency key was already used');
      }
      return {
        kind: 'ok' as const,
        reference: existing.publicReference,
        expiresAt: existing.expiresAt,
      };
    }
    const reference = publicIdentifierSchema.parse(args.publicReference);
    const collision = await ctx.db
      .query('checkoutAttempts')
      .withIndex('by_environment_reference', (query) =>
        query
          .eq('environmentId', context.environment._id)
          .eq('publicReference', reference),
      )
      .unique();
    if (collision) return { kind: 'collision' as const };
    const expiresAt = args.now + MOCK_CHECKOUT_TTL_SECONDS * 1_000;
    await ctx.db.insert('checkoutAttempts', {
      environmentId: context.environment._id,
      accountId: context.account._id,
      userId: context.user._id,
      publicReference: reference,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint: args.requestFingerprint,
      status: 'pending',
      returnUrl: input.returnUrl,
      offer: input.offer,
      grant: input.grant,
      accountPolicy: input.accountPolicy,
      createdAt: args.now,
      expiresAt,
      cleanupAt: expiresAt + 24 * 60 * 60 * 1_000,
    });
    return { kind: 'ok' as const, reference, expiresAt };
  },
});

async function findAttempt(
  ctx: MutationCtx,
  environmentKey: string,
  reference: string,
) {
  const environment = await ctx.db
    .query('businessEnvironments')
    .withIndex('by_key', (query) => query.eq('key', environmentKey))
    .unique();
  if (!environment?.customerAuth)
    return fail('NOT_FOUND', 'Checkout was not found');
  const attempt = await ctx.db
    .query('checkoutAttempts')
    .withIndex('by_environment_reference', (query) =>
      query
        .eq('environmentId', environment._id)
        .eq('publicReference', publicIdentifierSchema.parse(reference)),
    )
    .unique();
  if (!attempt) return fail('NOT_FOUND', 'Checkout was not found');
  return { environment, attempt };
}

export const readChallenge = internalQuery({
  args: { environmentKey: v.string(), reference: v.string(), now: v.number() },
  returns: checkoutChallengeValidator,
  handler: async (ctx, args) => {
    const environment = await ctx.db
      .query('businessEnvironments')
      .withIndex('by_key', (query) => query.eq('key', args.environmentKey))
      .unique();
    if (!environment?.customerAuth)
      return fail('NOT_FOUND', 'Checkout was not found');
    const attempt = await ctx.db
      .query('checkoutAttempts')
      .withIndex('by_environment_reference', (query) =>
        query
          .eq('environmentId', environment._id)
          .eq('publicReference', publicIdentifierSchema.parse(args.reference)),
      )
      .unique();
    if (!attempt || attempt.expiresAt <= args.now) {
      return fail('NOT_FOUND', 'Checkout was not found');
    }
    const presentation =
      'presentation' in environment.customerAuth
        ? environment.customerAuth.presentation
        : {
            productName: environment.businessName,
            theme: 'system' as const,
            accentColor: '#314EC6',
          };
    return {
      version: CHECKOUT_VERSION,
      environmentKey: environment.key,
      reference: attempt.publicReference,
      presentation,
      offer: attempt.offer,
      state: attempt.status,
      expiresAt: attempt.expiresAt,
    };
  },
});

export const complete = internalMutation({
  args: { environmentKey: v.string(), reference: v.string(), now: v.number() },
  returns: v.object({ redirectUrl: v.string() }),
  handler: async (ctx, args) => {
    if (!mockCheckoutEnabled())
      return fail('FORBIDDEN', 'Mock checkout is disabled');
    const { environment, attempt } = await findAttempt(
      ctx,
      args.environmentKey,
      args.reference,
    );
    if (attempt.expiresAt <= args.now)
      return fail('NOT_FOUND', 'Checkout was not found');
    if (attempt.status !== 'pending')
      return fail('CONFLICT', 'Checkout is already finished');
    const [account, user] = await Promise.all([
      ctx.db.get(attempt.accountId),
      ctx.db.get(attempt.userId),
    ]);
    if (!account || !user) return fail('NOT_FOUND', 'Checkout was not found');
    const membership = await ctx.db
      .query('memberships')
      .withIndex('by_environment_account_user', (query) =>
        query
          .eq('environmentId', environment._id)
          .eq('accountId', account._id)
          .eq('userId', user._id),
      )
      .unique();
    if (membership?.role !== 'owner')
      return fail('FORBIDDEN', 'Only the Owner can complete checkout');

    await applyAccountPolicyOverrides(ctx, {
      environmentKey: environment.key,
      accountPublicId: account.publicId,
      actorUserPublicId: user.publicId,
      policyOverrides: attempt.accountPolicy,
      now: args.now,
    });
    await storeDevelopmentAccess(ctx, {
      environmentKey: environment.key,
      userPublicId: user.publicId,
      accountPublicId: account.publicId,
      membershipPublicId: membership.publicId,
      ...attempt.grant,
      now: args.now,
    });
    await ctx.db.patch(attempt._id, {
      status: 'completed',
      completedAt: args.now,
    });
    return {
      redirectUrl: returnUrlFor(
        attempt.returnUrl,
        'success',
        attempt.offer.key,
      ),
    };
  },
});

export const cancel = internalMutation({
  args: { environmentKey: v.string(), reference: v.string(), now: v.number() },
  returns: v.object({ redirectUrl: v.string() }),
  handler: async (ctx, args) => {
    const { attempt } = await findAttempt(
      ctx,
      args.environmentKey,
      args.reference,
    );
    if (attempt.expiresAt <= args.now)
      return fail('NOT_FOUND', 'Checkout was not found');
    if (attempt.status !== 'pending')
      return fail('CONFLICT', 'Checkout is already finished');
    await ctx.db.patch(attempt._id, {
      status: 'cancelled',
      cancelledAt: args.now,
    });
    return {
      redirectUrl: returnUrlFor(
        attempt.returnUrl,
        'cancelled',
        attempt.offer.key,
      ),
    };
  },
});
