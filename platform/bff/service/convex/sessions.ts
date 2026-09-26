import { z } from 'zod';
import { v } from 'convex/values';

import { permissionsForRole, publicIdentifierSchema } from '@bff/contracts';
import { findAccountByPublicId } from './accounts';
import type { Doc } from './_generated/dataModel';
import { internalMutation, type MutationCtx } from './_generated/server';
import {
  buildCurrentCustomer,
  currentCustomerViewValidator,
} from './customerAuth';
import { validateBusinessEnvironmentKey } from './lib/businessEnvironment';
import { fail } from './lib/errors';
import { requireExchangeableLoginTransaction } from './loginTransactions';
import {
  findMembershipForAccountUser,
  listMembershipsForUser,
} from './memberships';

const RETENTION_MILLISECONDS = 90 * 24 * 60 * 60 * 1_000;
const sha256HashSchema = z
  .string()
  .length(43)
  .regex(/^[A-Za-z0-9_-]+$/u);

const establishSessionResultValidator = v.union(
  v.object({
    kind: v.literal('collision'),
    field: v.union(v.literal('handleHash'), v.literal('sessionPublicId')),
  }),
  v.object({
    kind: v.literal('ok'),
    sessionPublicId: v.string(),
    absoluteExpiresAt: v.number(),
    idleExpiresAt: v.number(),
  }),
);

const contextIssuanceValidator = v.union(
  v.object({
    contextType: v.literal('onboarding'),
    environmentKey: v.string(),
    userPublicId: v.string(),
    sessionPublicId: v.string(),
    tokenPublicId: v.string(),
    authorizedAt: v.number(),
    expiresAt: v.number(),
  }),
  v.object({
    contextType: v.literal('account'),
    environmentKey: v.string(),
    userPublicId: v.string(),
    sessionPublicId: v.string(),
    tokenPublicId: v.string(),
    accountPublicId: v.string(),
    membershipPublicId: v.string(),
    role: v.union(v.literal('owner'), v.literal('admin'), v.literal('member')),
    permissions: v.array(
      v.union(
        v.literal('account:read'),
        v.literal('account:update'),
        v.literal('members:read'),
        v.literal('members:manage'),
        v.literal('invitations:manage'),
        v.literal('ownership:transfer'),
      ),
    ),
    authorizedAt: v.number(),
    expiresAt: v.number(),
  }),
);

const issueContextResultValidator = v.union(
  v.object({ kind: v.literal('session_unavailable') }),
  v.object({
    kind: v.literal('selection_required'),
    customer: currentCustomerViewValidator,
  }),
  v.object({
    kind: v.literal('authorized'),
    customer: currentCustomerViewValidator,
    issuance: contextIssuanceValidator,
  }),
);

async function findEnvironment(ctx: MutationCtx, environmentKey: string) {
  return await ctx.db
    .query('businessEnvironments')
    .withIndex('by_key', (query) => query.eq('key', environmentKey))
    .unique();
}

function requireConfiguredEnvironment(
  environment: Doc<'businessEnvironments'> | null,
): Doc<'businessEnvironments'> & {
  customerAuth: NonNullable<Doc<'businessEnvironments'>['customerAuth']>;
} {
  if (!environment?.customerAuth) {
    return fail('CONFIGURATION_ERROR', 'Customer login is not configured');
  }
  return environment as Doc<'businessEnvironments'> & {
    customerAuth: NonNullable<Doc<'businessEnvironments'>['customerAuth']>;
  };
}

async function findSessionByHandleHash(ctx: MutationCtx, handleHash: string) {
  return await ctx.db
    .query('businessSessions')
    .withIndex('by_handle_hash', (query) => query.eq('handleHash', handleHash))
    .unique();
}

export const exchangeForSession = internalMutation({
  args: {
    environmentKey: v.string(),
    handoffCodeHash: v.string(),
    pkceChallenge: v.string(),
    callbackUrl: v.string(),
    handleHash: v.string(),
    sessionPublicId: v.string(),
    now: v.number(),
  },
  returns: establishSessionResultValidator,
  handler: async (ctx, args) => {
    const handleHash = sha256HashSchema.parse(args.handleHash);
    const sessionPublicId = publicIdentifierSchema.parse(args.sessionPublicId);
    const exchange = await requireExchangeableLoginTransaction(ctx, args);
    if (await findSessionByHandleHash(ctx, handleHash)) {
      return { kind: 'collision' as const, field: 'handleHash' as const };
    }
    const existingPublicId = await ctx.db
      .query('businessSessions')
      .withIndex('by_environment_public_id', (query) =>
        query
          .eq('environmentId', exchange.environment._id)
          .eq('publicId', sessionPublicId),
      )
      .unique();
    if (existingPublicId) {
      return {
        kind: 'collision' as const,
        field: 'sessionPublicId' as const,
      };
    }

    const transaction = exchange.transaction;
    if (
      transaction.verifiedUserId === undefined ||
      transaction.verifiedProvider === undefined ||
      transaction.providerAuthenticatedAt === undefined
    ) {
      return fail('UNAUTHENTICATED', 'Login exchange was rejected');
    }
    const user = await ctx.db.get(transaction.verifiedUserId);
    if (!user || user.environmentId !== exchange.environment._id) {
      return fail('UNAUTHENTICATED', 'Login exchange was rejected');
    }

    const absoluteExpiresAt =
      args.now +
      exchange.environment.customerAuth.sessionPolicy.absoluteSeconds * 1_000;
    const idleExpiresAt = Math.min(
      absoluteExpiresAt,
      args.now +
        exchange.environment.customerAuth.sessionPolicy.idleSeconds * 1_000,
    );
    await ctx.db.insert('businessSessions', {
      environmentId: exchange.environment._id,
      userId: user._id,
      publicId: sessionPublicId,
      handleHash,
      provider: transaction.verifiedProvider,
      providerAuthenticatedAt: transaction.providerAuthenticatedAt,
      createdAt: args.now,
      lastSeenAt: args.now,
      idleExpiresAt,
      absoluteExpiresAt,
      cleanupAt: absoluteExpiresAt + RETENTION_MILLISECONDS,
    });
    await ctx.db.patch(transaction._id, {
      status: 'exchanged',
      consumedAt: args.now,
    });

    return {
      kind: 'ok' as const,
      sessionPublicId,
      absoluteExpiresAt,
      idleExpiresAt,
    };
  },
});

export const issueContext = internalMutation({
  args: {
    environmentKey: v.string(),
    handleHash: v.string(),
    accountPublicId: v.optional(v.string()),
    tokenPublicId: v.string(),
    now: v.number(),
  },
  returns: issueContextResultValidator,
  handler: async (ctx, args) => {
    const environmentKey = validateBusinessEnvironmentKey(args.environmentKey);
    const handleHash = sha256HashSchema.parse(args.handleHash);
    const tokenPublicId = publicIdentifierSchema.parse(args.tokenPublicId);
    const accountPublicId =
      args.accountPublicId === undefined
        ? undefined
        : publicIdentifierSchema.parse(args.accountPublicId);
    const environment = requireConfiguredEnvironment(
      await findEnvironment(ctx, environmentKey),
    );
    const session = await findSessionByHandleHash(ctx, handleHash);
    if (!session || session.environmentId !== environment._id) {
      return { kind: 'session_unavailable' as const };
    }
    if (
      session.revokedAt !== undefined ||
      session.idleExpiresAt <= args.now ||
      session.absoluteExpiresAt <= args.now
    ) {
      if (session.revokedAt === undefined) {
        await ctx.db.patch(session._id, {
          revokedAt: args.now,
          revocationReason: 'expired',
          cleanupAt: args.now + RETENTION_MILLISECONDS,
        });
      }
      return { kind: 'session_unavailable' as const };
    }

    const user = await ctx.db.get(session.userId);
    if (!user || user.environmentId !== environment._id) {
      return fail('CONFIGURATION_ERROR', 'Customer session is invalid');
    }
    const membershipLimit =
      environment.customerAuth.accountPolicy.maxAccountMembershipsPerUser;
    const memberships = await listMembershipsForUser(
      ctx,
      environment._id,
      user._id,
      membershipLimit + 1,
    );
    if (memberships.length > membershipLimit) {
      return fail('CONFIGURATION_ERROR', 'Customer membership cap is invalid');
    }

    const customer = await buildCurrentCustomer(ctx, environment, user);
    const nextIdleExpiresAt = Math.min(
      session.absoluteExpiresAt,
      args.now + environment.customerAuth.sessionPolicy.idleSeconds * 1_000,
    );
    await ctx.db.patch(session._id, {
      lastSeenAt: args.now,
      idleExpiresAt: nextIdleExpiresAt,
    });

    if (memberships.length === 0) {
      return {
        kind: 'authorized' as const,
        customer,
        issuance: {
          contextType: 'onboarding' as const,
          environmentKey,
          userPublicId: user.publicId,
          sessionPublicId: session.publicId,
          tokenPublicId,
          authorizedAt: Math.floor(args.now / 1_000),
          expiresAt: Math.min(
            Math.floor(session.absoluteExpiresAt / 1_000),
            Math.floor(nextIdleExpiresAt / 1_000),
          ),
        },
      };
    }
    if (accountPublicId === undefined && memberships.length > 1) {
      return { kind: 'selection_required' as const, customer };
    }

    let account: Doc<'accounts'> | null;
    let membership: Doc<'memberships'> | null;
    if (accountPublicId === undefined) {
      const [onlyMembership] = memberships;
      if (!onlyMembership) {
        return fail('CONFIGURATION_ERROR', 'Customer membership is invalid');
      }
      membership = onlyMembership;
      account = await ctx.db.get(onlyMembership.accountId);
    } else {
      account = await findAccountByPublicId(
        ctx,
        environment._id,
        accountPublicId,
      );
      membership =
        account === null
          ? null
          : await findMembershipForAccountUser(
              ctx,
              environment._id,
              account._id,
              user._id,
            );
    }
    if (!account || account.environmentId !== environment._id || !membership) {
      return fail('FORBIDDEN', 'Account membership is required');
    }
    if (
      membership.role === 'admin' &&
      !(
        account.policyOverrides?.adminRoleEnabled ??
        environment.customerAuth.accountDefaults.adminRoleEnabled
      )
    ) {
      return fail('CONFIGURATION_ERROR', 'Account role is not enabled');
    }

    return {
      kind: 'authorized' as const,
      customer,
      issuance: {
        contextType: 'account' as const,
        environmentKey,
        userPublicId: user.publicId,
        sessionPublicId: session.publicId,
        tokenPublicId,
        accountPublicId: account.publicId,
        membershipPublicId: membership.publicId,
        role: membership.role,
        permissions: [...permissionsForRole(membership.role)],
        authorizedAt: Math.floor(args.now / 1_000),
        expiresAt: Math.min(
          Math.floor(session.absoluteExpiresAt / 1_000),
          Math.floor(nextIdleExpiresAt / 1_000),
        ),
      },
    };
  },
});

export const logout = internalMutation({
  args: {
    environmentKey: v.string(),
    handleHash: v.string(),
    now: v.number(),
  },
  returns: v.object({ revoked: v.boolean() }),
  handler: async (ctx, args) => {
    const environmentKey = validateBusinessEnvironmentKey(args.environmentKey);
    const handleHash = sha256HashSchema.parse(args.handleHash);
    const environment = await findEnvironment(ctx, environmentKey);
    const session = await findSessionByHandleHash(ctx, handleHash);
    if (!environment || !session || session.environmentId !== environment._id) {
      return { revoked: false };
    }
    if (session.revokedAt === undefined) {
      await ctx.db.patch(session._id, {
        revokedAt: args.now,
        revocationReason: 'logout',
        cleanupAt: args.now + RETENTION_MILLISECONDS,
      });
    }
    return { revoked: true };
  },
});
