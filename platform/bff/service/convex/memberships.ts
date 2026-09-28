import {
  paginationOptsValidator,
  paginationResultValidator,
} from 'convex/server';
import { v } from 'convex/values';

import { publicIdentifierSchema } from '@bff/contracts';
import type { Doc, Id } from './_generated/dataModel';
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server';
import { validateBusinessEnvironmentKey } from './lib/businessEnvironment';
import { fail } from './lib/errors';

export const membershipViewValidator = v.object({
  id: v.string(),
  accountId: v.string(),
  userId: v.string(),
  role: v.union(v.literal('owner'), v.literal('admin'), v.literal('member')),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const accountMemberViewValidator = v.object({
  membership: membershipViewValidator,
  displayName: v.string(),
  verifiedEmail: v.string(),
  pictureUrl: v.optional(v.string()),
});

export async function findMembershipByPublicId(
  ctx: QueryCtx | MutationCtx,
  environmentId: Id<'businessEnvironments'>,
  publicId: string,
) {
  return await ctx.db
    .query('memberships')
    .withIndex('by_environment_public_id', (query) =>
      query.eq('environmentId', environmentId).eq('publicId', publicId),
    )
    .unique();
}

export async function listMembershipsForUser(
  ctx: QueryCtx | MutationCtx,
  environmentId: Id<'businessEnvironments'>,
  userId: Id<'businessUsers'>,
  limit: number,
) {
  return await ctx.db
    .query('memberships')
    .withIndex('by_environment_user_account', (query) =>
      query.eq('environmentId', environmentId).eq('userId', userId),
    )
    .take(limit);
}

export async function findMembershipForAccountUser(
  ctx: QueryCtx | MutationCtx,
  environmentId: Id<'businessEnvironments'>,
  accountId: Id<'accounts'>,
  userId: Id<'businessUsers'>,
) {
  return await ctx.db
    .query('memberships')
    .withIndex('by_environment_account_user', (query) =>
      query
        .eq('environmentId', environmentId)
        .eq('accountId', accountId)
        .eq('userId', userId),
    )
    .unique();
}

export function toMembershipView(
  membership: Doc<'memberships'>,
  account: Doc<'accounts'>,
  user: Doc<'businessUsers'>,
) {
  return {
    id: membership.publicId,
    accountId: account.publicId,
    userId: user.publicId,
    role: membership.role,
    createdAt: membership.createdAt,
    updatedAt: membership.updatedAt,
  };
}

const removalResultValidator = v.object({
  removedMembershipId: v.string(),
  accountId: v.string(),
  userId: v.string(),
  activeMemberCount: v.number(),
});

export async function authoritativeAccountContext(
  ctx: QueryCtx | MutationCtx,
  environmentKey: string,
  accountPublicId: string,
  actorUserPublicId: string,
) {
  const environment = await ctx.db
    .query('businessEnvironments')
    .withIndex('by_key', (query) => query.eq('key', environmentKey))
    .unique();
  if (!environment?.customerAuth) {
    return fail('CONFIGURATION_ERROR', 'Customer login is not configured');
  }
  const configuredEnvironment = environment as Doc<'businessEnvironments'> & {
    customerAuth: NonNullable<Doc<'businessEnvironments'>['customerAuth']>;
  };
  const account = await ctx.db
    .query('accounts')
    .withIndex('by_environment_public_id', (query) =>
      query
        .eq('environmentId', environment._id)
        .eq('publicId', accountPublicId),
    )
    .unique();
  const actor = await ctx.db
    .query('businessUsers')
    .withIndex('by_environment_public_id', (query) =>
      query
        .eq('environmentId', environment._id)
        .eq('publicId', actorUserPublicId),
    )
    .unique();
  if (!account || !actor) {
    return fail('NOT_FOUND', 'Account membership was not found');
  }
  const actorMembership = await findMembershipForAccountUser(
    ctx,
    environment._id,
    account._id,
    actor._id,
  );
  if (!actorMembership) {
    return fail('FORBIDDEN', 'Account membership is required');
  }
  return {
    environment: configuredEnvironment,
    account,
    actor,
    actorMembership,
  };
}

export const listForAccount = internalQuery({
  args: {
    environmentKey: v.string(),
    accountPublicId: v.string(),
    actorUserPublicId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(accountMemberViewValidator),
  handler: async (ctx, args) => {
    const environmentKey = validateBusinessEnvironmentKey(args.environmentKey);
    const accountPublicId = publicIdentifierSchema.parse(args.accountPublicId);
    const actorUserPublicId = publicIdentifierSchema.parse(
      args.actorUserPublicId,
    );
    const context = await authoritativeAccountContext(
      ctx,
      environmentKey,
      accountPublicId,
      actorUserPublicId,
    );
    const page = await ctx.db
      .query('memberships')
      .withIndex('by_environment_account_role', (query) =>
        query
          .eq('environmentId', context.environment._id)
          .eq('accountId', context.account._id),
      )
      .paginate({
        numItems: Math.max(1, Math.min(50, args.paginationOpts.numItems)),
        cursor: args.paginationOpts.cursor,
      });
    const views = [];
    for (const membership of page.page) {
      const user = await ctx.db.get(membership.userId);
      if (!user || user.environmentId !== context.environment._id) {
        return fail('CONFIGURATION_ERROR', 'Membership user is invalid');
      }
      views.push({
        membership: toMembershipView(membership, context.account, user),
        displayName: user.displayName,
        verifiedEmail: user.verifiedEmail,
        ...(user.pictureUrl === undefined
          ? {}
          : { pictureUrl: user.pictureUrl }),
      });
    }
    return { ...page, page: views };
  },
});

export const changeRole = internalMutation({
  args: {
    environmentKey: v.string(),
    accountPublicId: v.string(),
    actorUserPublicId: v.string(),
    targetMembershipPublicId: v.string(),
    role: v.union(v.literal('admin'), v.literal('member')),
    now: v.number(),
  },
  returns: membershipViewValidator,
  handler: async (ctx, args) => {
    const environmentKey = validateBusinessEnvironmentKey(args.environmentKey);
    const accountPublicId = publicIdentifierSchema.parse(args.accountPublicId);
    const actorUserPublicId = publicIdentifierSchema.parse(
      args.actorUserPublicId,
    );
    const targetMembershipPublicId = publicIdentifierSchema.parse(
      args.targetMembershipPublicId,
    );
    const context = await authoritativeAccountContext(
      ctx,
      environmentKey,
      accountPublicId,
      actorUserPublicId,
    );
    if (context.actorMembership.role !== 'owner') {
      return fail('FORBIDDEN', 'Only the Owner can change member roles');
    }
    const target = await findMembershipByPublicId(
      ctx,
      context.environment._id,
      targetMembershipPublicId,
    );
    if (!target || target.accountId !== context.account._id) {
      return fail('NOT_FOUND', 'Target membership was not found');
    }
    if (target.role === 'owner') {
      return fail('FORBIDDEN', 'The Owner role changes only by transfer');
    }
    const adminRoleEnabled =
      context.account.policyOverrides?.adminRoleEnabled ??
      context.environment.customerAuth.accountDefaults.adminRoleEnabled;
    if (args.role === 'admin' && !adminRoleEnabled) {
      return fail('FORBIDDEN', 'The Admin role is not enabled');
    }

    if (target.role !== args.role) {
      await ctx.db.patch(target._id, { role: args.role, updatedAt: args.now });
      await ctx.db.patch(context.environment._id, {
        accountPolicyStateRevision:
          (context.environment.accountPolicyStateRevision ?? 0) + 1,
      });
    }
    const [updated, targetUser] = await Promise.all([
      ctx.db.get(target._id),
      ctx.db.get(target.userId),
    ]);
    if (!updated || !targetUser) {
      return fail('CONFIGURATION_ERROR', 'Membership update failed');
    }
    return toMembershipView(updated, context.account, targetUser);
  },
});

export const remove = internalMutation({
  args: {
    environmentKey: v.string(),
    accountPublicId: v.string(),
    actorUserPublicId: v.string(),
    targetMembershipPublicId: v.string(),
    now: v.number(),
  },
  returns: removalResultValidator,
  handler: async (ctx, args) => {
    const environmentKey = validateBusinessEnvironmentKey(args.environmentKey);
    const accountPublicId = publicIdentifierSchema.parse(args.accountPublicId);
    const actorUserPublicId = publicIdentifierSchema.parse(
      args.actorUserPublicId,
    );
    const targetMembershipPublicId = publicIdentifierSchema.parse(
      args.targetMembershipPublicId,
    );
    const context = await authoritativeAccountContext(
      ctx,
      environmentKey,
      accountPublicId,
      actorUserPublicId,
    );
    const target = await findMembershipByPublicId(
      ctx,
      context.environment._id,
      targetMembershipPublicId,
    );
    if (!target || target.accountId !== context.account._id) {
      return fail('NOT_FOUND', 'Target membership was not found');
    }
    if (target.role === 'owner') {
      return fail('FORBIDDEN', 'Transfer ownership before removing the Owner');
    }
    const removingSelf = target.userId === context.actor._id;
    const authorized =
      removingSelf ||
      context.actorMembership.role === 'owner' ||
      (context.actorMembership.role === 'admin' && target.role === 'member');
    if (!authorized) {
      return fail('FORBIDDEN', 'Membership removal is not allowed');
    }
    const targetUser = await ctx.db.get(target.userId);
    if (
      !targetUser ||
      targetUser.environmentId !== context.environment._id ||
      targetUser.activeMembershipCount < 1 ||
      context.account.activeMembershipCount < 2
    ) {
      return fail('CONFIGURATION_ERROR', 'Membership counters are invalid');
    }

    await ctx.db.delete(target._id);
    await ctx.db.patch(targetUser._id, {
      activeMembershipCount: targetUser.activeMembershipCount - 1,
      updatedAt: args.now,
    });
    await ctx.db.patch(context.account._id, {
      activeMembershipCount: context.account.activeMembershipCount - 1,
      updatedAt: args.now,
    });
    await ctx.db.patch(context.environment._id, {
      accountPolicyStateRevision:
        (context.environment.accountPolicyStateRevision ?? 0) + 1,
    });
    return {
      removedMembershipId: target.publicId,
      accountId: context.account.publicId,
      userId: targetUser.publicId,
      activeMemberCount: context.account.activeMembershipCount - 1,
    };
  },
});
