import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

export const membershipViewValidator = v.object({
  id: v.string(),
  accountId: v.string(),
  userId: v.string(),
  role: v.union(v.literal('owner'), v.literal('admin'), v.literal('member')),
  createdAt: v.number(),
  updatedAt: v.number(),
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
