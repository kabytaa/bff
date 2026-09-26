import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { membershipViewValidator, toMembershipView } from './memberships';

const policySourceValidator = v.union(
  v.literal('business_default'),
  v.literal('account_override'),
);

export const accountSummaryValidator = v.object({
  id: v.string(),
  displayName: v.optional(v.string()),
  membership: membershipViewValidator,
  policy: v.object({
    values: v.object({
      seatLimit: v.number(),
      adminRoleEnabled: v.boolean(),
      memberInvitationsEnabled: v.boolean(),
    }),
    sources: v.object({
      seatLimit: policySourceValidator,
      adminRoleEnabled: policySourceValidator,
      memberInvitationsEnabled: policySourceValidator,
    }),
  }),
  activeMemberCount: v.number(),
  reservedInvitationCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export async function findAccountByPublicId(
  ctx: QueryCtx | MutationCtx,
  environmentId: Id<'businessEnvironments'>,
  publicId: string,
) {
  return await ctx.db
    .query('accounts')
    .withIndex('by_environment_public_id', (query) =>
      query.eq('environmentId', environmentId).eq('publicId', publicId),
    )
    .unique();
}

export function toAccountSummary(
  environment: Doc<'businessEnvironments'>,
  account: Doc<'accounts'>,
  membership: Doc<'memberships'>,
  user: Doc<'businessUsers'>,
) {
  if (!environment.customerAuth) {
    throw new Error('Customer authentication is not configured');
  }

  const defaults = environment.customerAuth.accountDefaults;
  const overrides = account.policyOverrides;
  return {
    id: account.publicId,
    ...(account.displayName === undefined
      ? {}
      : { displayName: account.displayName }),
    membership: toMembershipView(membership, account, user),
    policy: {
      values: {
        seatLimit: overrides?.seatLimit ?? defaults.seatLimit,
        adminRoleEnabled:
          overrides?.adminRoleEnabled ?? defaults.adminRoleEnabled,
        memberInvitationsEnabled:
          overrides?.memberInvitationsEnabled ??
          defaults.memberInvitationsEnabled,
      },
      sources: {
        seatLimit:
          overrides?.seatLimit === undefined
            ? ('business_default' as const)
            : ('account_override' as const),
        adminRoleEnabled:
          overrides?.adminRoleEnabled === undefined
            ? ('business_default' as const)
            : ('account_override' as const),
        memberInvitationsEnabled:
          overrides?.memberInvitationsEnabled === undefined
            ? ('business_default' as const)
            : ('account_override' as const),
      },
    },
    activeMemberCount: account.activeMembershipCount,
    reservedInvitationCount: account.pendingInvitationCount,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}
