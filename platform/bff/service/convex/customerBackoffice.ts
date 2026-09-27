import {
  paginationOptsValidator,
  paginationResultValidator,
} from 'convex/server';
import { v } from 'convex/values';

import { query } from './_generated/server';
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
