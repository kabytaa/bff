import { v } from 'convex/values';

import { withBffAccountQuery } from '@tofler/bff-auth/convex/server';
import { query } from './_generated/server';
import { exampleCustomerAuth } from './environment';

const contextResult = v.object({
  userId: v.string(),
  accountId: v.string(),
  role: v.union(v.literal('owner'), v.literal('admin'), v.literal('member')),
});

export const currentContext = query({
  args: {},
  returns: contextResult,
  handler: withBffAccountQuery(
    exampleCustomerAuth,
    async (_ctx, _args, auth) => ({
      userId: auth.userId,
      accountId: auth.accountId,
      role: auth.role,
    }),
  ),
});
