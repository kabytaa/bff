import { ConvexError, v } from 'convex/values';

import {
  requireBffConvexAccountScope,
  requireBffConvexUserScope,
  withBffAccountQuery,
} from '@tofler/bff-auth/convex/server';
import { query, type QueryCtx } from './_generated/server';
import { exampleCustomerAuth } from './environment';

const contextResult = v.object({
  userId: v.string(),
  sessionId: v.string(),
  accountId: v.string(),
  membershipId: v.string(),
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
});

export const currentContext = query({
  args: {},
  returns: contextResult,
  handler: withBffAccountQuery(
    exampleCustomerAuth,
    async (_ctx, _args, auth) => ({
      userId: auth.userId,
      sessionId: auth.sessionId,
      accountId: auth.accountId,
      membershipId: auth.membershipId,
      role: auth.role,
      permissions: [...auth.permissions],
    }),
  ),
});

export const requireExactScope = query({
  args: {
    userId: v.string(),
    accountId: v.string(),
  },
  returns: contextResult,
  handler: withBffAccountQuery(
    exampleCustomerAuth,
    async (
      _ctx: QueryCtx,
      args: { userId: string; accountId: string },
      auth,
    ) => {
      requireBffConvexUserScope(auth, args.userId);
      requireBffConvexAccountScope(auth, args.accountId);
      if (!auth.permissions.includes('account:read')) {
        throw new ConvexError({
          code: 'FORBIDDEN',
          message: 'Account read permission is required',
        });
      }
      return {
        userId: auth.userId,
        sessionId: auth.sessionId,
        accountId: auth.accountId,
        membershipId: auth.membershipId,
        role: auth.role,
        permissions: [...auth.permissions],
      };
    },
  ),
});
