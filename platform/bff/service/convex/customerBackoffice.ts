import {
  paginationOptsValidator,
  paginationResultValidator,
} from 'convex/server';
import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { fail } from './lib/errors';
import type { Doc } from './_generated/dataModel';
import {
  operatorAccountViewValidator,
  operatorMembershipViewValidator,
  operatorSecurityEventViewValidator,
  operatorSessionViewValidator,
  operatorUserViewValidator,
  paginateCustomerAccounts,
  paginateCustomerMemberships,
  paginateCustomerSecurityEvents,
  paginateCustomerSessions,
  paginateCustomerUsers,
} from './customerOperations';
import { requireOperator } from './lib/authorization';

export const users = query({
  args: { environmentKey: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(operatorUserViewValidator),
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    return await paginateCustomerUsers(
      ctx,
      args.environmentKey,
      args.paginationOpts,
    );
  },
});

export const userLookup = query({
  args: { environmentKey: v.string(), exact: v.string() },
  returns: v.array(operatorUserViewValidator),
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    const environment = await ctx.db
      .query('businessEnvironments')
      .withIndex('by_key', (query) => query.eq('key', args.environmentKey))
      .unique();
    if (!environment?.customerAuth) return [];
    const exact = args.exact.trim();
    let users: Doc<'businessUsers'>[];
    if (exact.includes('@')) {
      users = await ctx.db
        .query('businessUsers')
        .withIndex('by_environment_verified_email', (query) =>
          query
            .eq('environmentId', environment._id)
            .eq('verifiedEmail', exact.toLowerCase()),
        )
        .take(10);
    } else {
      const user = await ctx.db
        .query('businessUsers')
        .withIndex('by_environment_public_id', (query) =>
          query.eq('environmentId', environment._id).eq('publicId', exact),
        )
        .unique();
      users = user ? [user] : [];
    }
    return users.map((user) => ({
      id: user.publicId,
      verifiedEmail: user.verifiedEmail,
      displayName: user.displayName,
      isTestUser: user.isTestUser === true,
      ...(user.pictureUrl === undefined ? {} : { pictureUrl: user.pictureUrl }),
      activeMembershipCount: user.activeMembershipCount,
      ownedAccountCount: user.ownedAccountCount,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  },
});

export const setTestUser = mutation({
  args: {
    environmentKey: v.string(),
    userPublicId: v.string(),
    isTestUser: v.boolean(),
    expectedIsTestUser: v.boolean(),
  },
  returns: v.object({ isTestUser: v.boolean() }),
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    const environment = await ctx.db
      .query('businessEnvironments')
      .withIndex('by_key', (q) => q.eq('key', args.environmentKey))
      .unique();
    if (!environment?.customerAuth)
      return fail('NOT_FOUND', 'Business environment was not found');
    const user = await ctx.db
      .query('businessUsers')
      .withIndex('by_environment_public_id', (q) =>
        q
          .eq('environmentId', environment._id)
          .eq('publicId', args.userPublicId),
      )
      .unique();
    if (!user)
      return fail(
        'NOT_FOUND',
        'Customer was not found in this Business environment',
      );
    if ((user.isTestUser === true) !== args.expectedIsTestUser)
      return fail(
        'CONFLICT',
        'Test-user status changed; review the current customer',
      );
    await ctx.db.patch(user._id, {
      isTestUser: args.isTestUser,
      updatedAt: Date.now(),
    });
    return { isTestUser: args.isTestUser };
  },
});

export const accounts = query({
  args: { environmentKey: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(operatorAccountViewValidator),
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    return await paginateCustomerAccounts(
      ctx,
      args.environmentKey,
      args.paginationOpts,
    );
  },
});

export const memberships = query({
  args: { environmentKey: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(operatorMembershipViewValidator),
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    return await paginateCustomerMemberships(
      ctx,
      args.environmentKey,
      args.paginationOpts,
    );
  },
});

export const sessions = query({
  args: { environmentKey: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(operatorSessionViewValidator),
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    return await paginateCustomerSessions(
      ctx,
      args.environmentKey,
      args.paginationOpts,
    );
  },
});

export const securityEvents = query({
  args: { environmentKey: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(operatorSecurityEventViewValidator),
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    return await paginateCustomerSecurityEvents(
      ctx,
      args.environmentKey,
      args.paginationOpts,
    );
  },
});
