import {
  UNIT_RESERVATION_TTL_SECONDS,
  publicIdentifierSchema,
  reserveUnitsRequestSchema,
  transitionUnitReservationRequestSchema,
  unitBalanceRequestSchema,
} from '@bff/contracts';
import { v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server';
import {
  accountContextArgs,
  findAccessGrant,
  resolveAccountContext,
  resolveUnitGrantPeriod,
  type ResolvedAccountContext,
} from './productAccess';
import { fail } from './lib/errors';

export const unitBalanceValidator = v.object({
  accountId: v.string(),
  unitType: v.string(),
  periodKey: v.string(),
  allowance: v.number(),
  reserved: v.number(),
  consumed: v.number(),
  available: v.number(),
  updatedAt: v.number(),
});

export const unitReservationValidator = v.object({
  id: v.string(),
  unitType: v.string(),
  periodKey: v.string(),
  amount: v.number(),
  state: v.union(
    v.literal('reserved'),
    v.literal('committed'),
    v.literal('released'),
    v.literal('expired'),
  ),
  expiresAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const unitReservationResultValidator = v.object({
  reservation: unitReservationValidator,
  balance: unitBalanceValidator,
});

const reserveResultValidator = v.union(
  v.object({ kind: v.literal('collision') }),
  v.object({ kind: v.literal('ok'), result: unitReservationResultValidator }),
);

async function bucketFor(
  ctx: QueryCtx | MutationCtx,
  context: ResolvedAccountContext,
  unitType: string,
  periodKey: string,
) {
  return await ctx.db
    .query('accountUnitBuckets')
    .withIndex('by_environment_account_unit_period', (query) =>
      query
        .eq('environmentId', context.environment._id)
        .eq('accountId', context.account._id)
        .eq('unitType', unitType)
        .eq('periodKey', periodKey),
    )
    .unique();
}

async function currentUnitGrant(
  ctx: QueryCtx | MutationCtx,
  context: ResolvedAccountContext,
  unitType: string,
  now: number,
) {
  const access = await findAccessGrant(
    ctx,
    context.environment._id,
    context.account._id,
  );
  const matches =
    access?.unitGrants.filter((grant) => grant.unitType === unitType) ?? [];
  if (matches.length > 1) {
    return fail('CONFIGURATION_ERROR', 'Unit allocation is ambiguous');
  }
  return matches[0]
    ? resolveUnitGrantPeriod(matches[0], now, access?.effectiveAt)
    : null;
}

function balanceView(
  context: ResolvedAccountContext,
  unitType: string,
  periodKey: string,
  allowance: number,
  bucket: Doc<'accountUnitBuckets'> | null,
) {
  const reserved = bucket?.reserved ?? 0;
  const consumed = bucket?.consumed ?? 0;
  return {
    accountId: context.account.publicId,
    unitType,
    periodKey,
    allowance,
    reserved,
    consumed,
    available: Math.max(0, allowance - reserved - consumed),
    updatedAt: bucket?.updatedAt ?? context.account.updatedAt,
  };
}

function reservationView(reservation: Doc<'accountUnitReservations'>) {
  return {
    id: reservation.publicId,
    unitType: reservation.unitType,
    periodKey: reservation.periodKey,
    amount: reservation.amount,
    state: reservation.state,
    expiresAt: reservation.expiresAt,
    createdAt: reservation.createdAt,
    updatedAt: reservation.updatedAt,
  };
}

async function resultFor(
  ctx: QueryCtx | MutationCtx,
  context: ResolvedAccountContext,
  reservation: Doc<'accountUnitReservations'>,
) {
  const bucket = await bucketFor(
    ctx,
    context,
    reservation.unitType,
    reservation.periodKey,
  );
  if (!bucket) {
    return fail('CONFIGURATION_ERROR', 'Unit reservation bucket is missing');
  }
  return {
    reservation: reservationView(reservation),
    balance: balanceView(
      context,
      reservation.unitType,
      reservation.periodKey,
      bucket.allowance,
      bucket,
    ),
  };
}

async function expireReserved(
  ctx: MutationCtx,
  reservation: Doc<'accountUnitReservations'>,
  now: number,
) {
  if (reservation.state !== 'reserved') return reservation;
  const bucket = await ctx.db
    .query('accountUnitBuckets')
    .withIndex('by_environment_account_unit_period', (query) =>
      query
        .eq('environmentId', reservation.environmentId)
        .eq('accountId', reservation.accountId)
        .eq('unitType', reservation.unitType)
        .eq('periodKey', reservation.periodKey),
    )
    .unique();
  if (!bucket || bucket.reserved < reservation.amount) {
    return fail('CONFIGURATION_ERROR', 'Unit reservation counters are invalid');
  }
  await ctx.db.patch(bucket._id, {
    reserved: bucket.reserved - reservation.amount,
    updatedAt: now,
  });
  await ctx.db.patch(reservation._id, { state: 'expired', updatedAt: now });
  const updated = await ctx.db.get(reservation._id);
  if (!updated) {
    return fail('CONFIGURATION_ERROR', 'Unit reservation disappeared');
  }
  return updated;
}

export const balanceForAccount = internalQuery({
  args: {
    ...accountContextArgs,
    unitType: v.string(),
    now: v.number(),
  },
  returns: unitBalanceValidator,
  handler: async (ctx, args) => {
    const input = unitBalanceRequestSchema.parse({
      unitType: args.unitType,
    });
    const context = await resolveAccountContext(ctx, args);
    const grant = await currentUnitGrant(
      ctx,
      context,
      input.unitType,
      args.now,
    );
    if (!grant) {
      return fail('UNIT_EXHAUSTED', 'No unit allocation is available');
    }
    const bucket = await bucketFor(
      ctx,
      context,
      input.unitType,
      grant.periodKey,
    );
    return balanceView(
      context,
      input.unitType,
      grant.periodKey,
      grant.allowance,
      bucket,
    );
  },
});

export const reserveForAccount = internalMutation({
  args: {
    ...accountContextArgs,
    unitType: v.string(),
    amount: v.number(),
    idempotencyKey: v.string(),
    reservationPublicId: v.string(),
    now: v.number(),
  },
  returns: reserveResultValidator,
  handler: async (ctx, args) => {
    const input = reserveUnitsRequestSchema.parse({
      unitType: args.unitType,
      amount: args.amount,
      idempotencyKey: args.idempotencyKey,
    });
    const reservationPublicId = publicIdentifierSchema.parse(
      args.reservationPublicId,
    );
    const context = await resolveAccountContext(ctx, args);
    const existing = await ctx.db
      .query('accountUnitReservations')
      .withIndex('by_environment_account_idempotency', (query) =>
        query
          .eq('environmentId', context.environment._id)
          .eq('accountId', context.account._id)
          .eq('idempotencyKey', input.idempotencyKey),
      )
      .unique();
    if (existing) {
      if (
        existing.userId !== context.user._id ||
        existing.unitType !== input.unitType ||
        existing.amount !== input.amount
      ) {
        return fail('CONFLICT', 'Idempotency key was reused with new input');
      }
      const current =
        existing.state === 'reserved' && existing.expiresAt <= args.now
          ? await expireReserved(ctx, existing, args.now)
          : existing;
      return {
        kind: 'ok' as const,
        result: await resultFor(ctx, context, current),
      };
    }
    const publicIdCollision = await ctx.db
      .query('accountUnitReservations')
      .withIndex('by_environment_public_id', (query) =>
        query
          .eq('environmentId', context.environment._id)
          .eq('publicId', reservationPublicId),
      )
      .unique();
    if (publicIdCollision) return { kind: 'collision' as const };

    const grant = await currentUnitGrant(
      ctx,
      context,
      input.unitType,
      args.now,
    );
    if (!grant) {
      return fail('UNIT_EXHAUSTED', 'No unit allocation is available');
    }
    let bucket = await bucketFor(ctx, context, input.unitType, grant.periodKey);
    const reserved = bucket?.reserved ?? 0;
    const consumed = bucket?.consumed ?? 0;
    if (grant.allowance - reserved - consumed < input.amount) {
      return fail('UNIT_EXHAUSTED', 'The unit allowance is exhausted');
    }
    if (!bucket) {
      const bucketId = await ctx.db.insert('accountUnitBuckets', {
        environmentId: context.environment._id,
        accountId: context.account._id,
        unitType: input.unitType,
        periodKey: grant.periodKey,
        allowance: grant.allowance,
        reserved: input.amount,
        consumed: 0,
        createdAt: args.now,
        updatedAt: args.now,
      });
      bucket = await ctx.db.get(bucketId);
    } else {
      await ctx.db.patch(bucket._id, {
        allowance: grant.allowance,
        reserved: bucket.reserved + input.amount,
        updatedAt: args.now,
      });
      bucket = await ctx.db.get(bucket._id);
    }
    if (!bucket) return fail('CONFIGURATION_ERROR', 'Unit bucket disappeared');
    const reservationId = await ctx.db.insert('accountUnitReservations', {
      environmentId: context.environment._id,
      accountId: context.account._id,
      userId: context.user._id,
      publicId: reservationPublicId,
      idempotencyKey: input.idempotencyKey,
      unitType: input.unitType,
      periodKey: grant.periodKey,
      amount: input.amount,
      state: 'reserved',
      expiresAt: args.now + UNIT_RESERVATION_TTL_SECONDS * 1_000,
      createdAt: args.now,
      updatedAt: args.now,
    });
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) {
      return fail('CONFIGURATION_ERROR', 'Unit reservation disappeared');
    }
    return {
      kind: 'ok' as const,
      result: {
        reservation: reservationView(reservation),
        balance: balanceView(
          context,
          input.unitType,
          grant.periodKey,
          grant.allowance,
          bucket,
        ),
      },
    };
  },
});

async function findOwnedReservation(
  ctx: MutationCtx,
  context: ResolvedAccountContext,
  request: { readonly reservationId: string; readonly idempotencyKey: string },
) {
  const reservation = await ctx.db
    .query('accountUnitReservations')
    .withIndex('by_environment_public_id', (query) =>
      query
        .eq('environmentId', context.environment._id)
        .eq('publicId', request.reservationId),
    )
    .unique();
  if (
    !reservation ||
    reservation.accountId !== context.account._id ||
    reservation.userId !== context.user._id
  ) {
    return fail('NOT_FOUND', 'Unit reservation was not found');
  }
  if (reservation.idempotencyKey !== request.idempotencyKey) {
    return fail('CONFLICT', 'Reservation idempotency key does not match');
  }
  return reservation;
}

const transitionArgs = {
  ...accountContextArgs,
  reservationId: v.string(),
  idempotencyKey: v.string(),
  now: v.number(),
} as const;

export const commitForAccount = internalMutation({
  args: transitionArgs,
  returns: unitReservationResultValidator,
  handler: async (ctx, args) => {
    const input = transitionUnitReservationRequestSchema.parse({
      reservationId: args.reservationId,
      idempotencyKey: args.idempotencyKey,
    });
    const context = await resolveAccountContext(ctx, args);
    let reservation = await findOwnedReservation(ctx, context, input);
    if (reservation.state === 'reserved' && reservation.expiresAt <= args.now) {
      reservation = await expireReserved(ctx, reservation, args.now);
    } else if (reservation.state === 'reserved') {
      const bucket = await bucketFor(
        ctx,
        context,
        reservation.unitType,
        reservation.periodKey,
      );
      if (!bucket || bucket.reserved < reservation.amount) {
        return fail(
          'CONFIGURATION_ERROR',
          'Unit reservation counters are invalid',
        );
      }
      await ctx.db.patch(bucket._id, {
        reserved: bucket.reserved - reservation.amount,
        consumed: bucket.consumed + reservation.amount,
        updatedAt: args.now,
      });
      await ctx.db.patch(reservation._id, {
        state: 'committed',
        updatedAt: args.now,
      });
      const updated = await ctx.db.get(reservation._id);
      if (!updated) {
        return fail('CONFIGURATION_ERROR', 'Unit reservation disappeared');
      }
      reservation = updated;
    }
    return await resultFor(ctx, context, reservation);
  },
});

export const releaseForAccount = internalMutation({
  args: transitionArgs,
  returns: unitReservationResultValidator,
  handler: async (ctx, args) => {
    const input = transitionUnitReservationRequestSchema.parse({
      reservationId: args.reservationId,
      idempotencyKey: args.idempotencyKey,
    });
    const context = await resolveAccountContext(ctx, args);
    let reservation = await findOwnedReservation(ctx, context, input);
    if (reservation.state === 'reserved') {
      if (reservation.expiresAt <= args.now) {
        reservation = await expireReserved(ctx, reservation, args.now);
      } else {
        const bucket = await bucketFor(
          ctx,
          context,
          reservation.unitType,
          reservation.periodKey,
        );
        if (!bucket || bucket.reserved < reservation.amount) {
          return fail(
            'CONFIGURATION_ERROR',
            'Unit reservation counters are invalid',
          );
        }
        await ctx.db.patch(bucket._id, {
          reserved: bucket.reserved - reservation.amount,
          updatedAt: args.now,
        });
        await ctx.db.patch(reservation._id, {
          state: 'released',
          updatedAt: args.now,
        });
        const updated = await ctx.db.get(reservation._id);
        if (!updated) {
          return fail('CONFIGURATION_ERROR', 'Unit reservation disappeared');
        }
        reservation = updated;
      }
    }
    return await resultFor(ctx, context, reservation);
  },
});

export const expireReservations = internalMutation({
  args: { now: v.optional(v.number()) },
  returns: v.object({ expired: v.number() }),
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const reservations = await ctx.db
      .query('accountUnitReservations')
      .withIndex('by_state_expires_at', (query) =>
        query.eq('state', 'reserved').lte('expiresAt', now),
      )
      .take(100);
    for (const reservation of reservations) {
      await expireReserved(ctx, reservation, now);
    }
    return { expired: reservations.length };
  },
});
