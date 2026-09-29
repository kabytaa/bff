import { z } from 'zod';
import { v } from 'convex/values';

import {
  accountPolicyOverridesSchema,
  publicIdentifierSchema,
} from '@bff/contracts';
import type { Doc, Id } from './_generated/dataModel';
import {
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server';
import { validateBusinessEnvironmentKey } from './lib/businessEnvironment';
import { fail } from './lib/errors';
import {
  findMembershipByPublicId,
  membershipViewValidator,
  toMembershipView,
} from './memberships';

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

const createAccountResultValidator = v.union(
  v.object({
    kind: v.literal('collision'),
    field: v.union(
      v.literal('accountPublicId'),
      v.literal('membershipPublicId'),
    ),
  }),
  v.object({ kind: v.literal('ok'), account: accountSummaryValidator }),
);

const accountPolicyOverridesValidator = v.object({
  seatLimit: v.optional(v.number()),
  adminRoleEnabled: v.optional(v.boolean()),
  memberInvitationsEnabled: v.optional(v.boolean()),
});

const displayNameSchema = z.string().trim().min(1).max(120);

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

export const createForUser = internalMutation({
  args: {
    environmentKey: v.string(),
    userPublicId: v.string(),
    displayName: v.optional(v.string()),
    accountPublicId: v.string(),
    membershipPublicId: v.string(),
    now: v.number(),
  },
  returns: createAccountResultValidator,
  handler: async (ctx, args) => {
    const environmentKey = validateBusinessEnvironmentKey(args.environmentKey);
    const userPublicId = publicIdentifierSchema.parse(args.userPublicId);
    const accountPublicId = publicIdentifierSchema.parse(args.accountPublicId);
    const membershipPublicId = publicIdentifierSchema.parse(
      args.membershipPublicId,
    );
    const displayName =
      args.displayName === undefined
        ? undefined
        : displayNameSchema.parse(args.displayName);
    const environment = await ctx.db
      .query('businessEnvironments')
      .withIndex('by_key', (query) => query.eq('key', environmentKey))
      .unique();
    if (!environment?.customerAuth) {
      return fail('CONFIGURATION_ERROR', 'Customer login is not configured');
    }
    if (!environment.customerAuth.accountPolicy.userAccountCreationEnabled) {
      return fail('FORBIDDEN', 'User account creation is not enabled');
    }
    const user = await ctx.db
      .query('businessUsers')
      .withIndex('by_environment_public_id', (query) =>
        query.eq('environmentId', environment._id).eq('publicId', userPublicId),
      )
      .unique();
    if (!user) return fail('NOT_FOUND', 'Customer user was not found');
    const policy = environment.customerAuth.accountPolicy;
    if (
      user.activeMembershipCount >= policy.maxAccountMembershipsPerUser ||
      user.ownedAccountCount >= policy.maxOwnedAccountsPerUser
    ) {
      return fail('CAPACITY_CONFLICT', 'Account ownership capacity is full');
    }
    if (await findAccountByPublicId(ctx, environment._id, accountPublicId)) {
      return {
        kind: 'collision' as const,
        field: 'accountPublicId' as const,
      };
    }
    if (
      await findMembershipByPublicId(ctx, environment._id, membershipPublicId)
    ) {
      return {
        kind: 'collision' as const,
        field: 'membershipPublicId' as const,
      };
    }

    const accountId = await ctx.db.insert('accounts', {
      environmentId: environment._id,
      publicId: accountPublicId,
      ...(displayName === undefined ? {} : { displayName }),
      ownerUserId: user._id,
      activeMembershipCount: 1,
      pendingInvitationCount: 0,
      createdAt: args.now,
      updatedAt: args.now,
    });
    const membershipId = await ctx.db.insert('memberships', {
      environmentId: environment._id,
      accountId,
      userId: user._id,
      publicId: membershipPublicId,
      role: 'owner',
      createdAt: args.now,
      updatedAt: args.now,
    });
    await ctx.db.patch(user._id, {
      activeMembershipCount: user.activeMembershipCount + 1,
      ownedAccountCount: user.ownedAccountCount + 1,
      updatedAt: args.now,
    });
    await ctx.db.patch(environment._id, {
      accountPolicyStateRevision:
        (environment.accountPolicyStateRevision ?? 0) + 1,
    });
    const [account, membership, updatedUser] = await Promise.all([
      ctx.db.get(accountId),
      ctx.db.get(membershipId),
      ctx.db.get(user._id),
    ]);
    if (!account || !membership || !updatedUser) {
      return fail('CONFIGURATION_ERROR', 'Account creation failed');
    }
    return {
      kind: 'ok' as const,
      account: toAccountSummary(environment, account, membership, updatedUser),
    };
  },
});

export async function applyAccountPolicyOverrides(
  ctx: MutationCtx,
  args: {
    readonly environmentKey: string;
    readonly accountPublicId: string;
    readonly actorUserPublicId: string;
    readonly policyOverrides: {
      readonly seatLimit?: number;
      readonly adminRoleEnabled?: boolean;
      readonly memberInvitationsEnabled?: boolean;
    };
    readonly now: number;
  },
) {
  const environmentKey = validateBusinessEnvironmentKey(args.environmentKey);
  const accountPublicId = publicIdentifierSchema.parse(args.accountPublicId);
  const actorUserPublicId = publicIdentifierSchema.parse(
    args.actorUserPublicId,
  );
  const policyOverrides = accountPolicyOverridesSchema.parse(
    args.policyOverrides,
  );
  const environment = await ctx.db
    .query('businessEnvironments')
    .withIndex('by_key', (query) => query.eq('key', environmentKey))
    .unique();
  if (!environment?.customerAuth) {
    return fail('CONFIGURATION_ERROR', 'Customer login is not configured');
  }
  const account = await findAccountByPublicId(
    ctx,
    environment._id,
    accountPublicId,
  );
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
  const actorMembership = await ctx.db
    .query('memberships')
    .withIndex('by_environment_account_user', (query) =>
      query
        .eq('environmentId', environment._id)
        .eq('accountId', account._id)
        .eq('userId', actor._id),
    )
    .unique();
  if (actorMembership?.role !== 'owner') {
    return fail('FORBIDDEN', 'Only the Owner can change account policy');
  }

  const effectiveSeatLimit =
    policyOverrides.seatLimit ??
    environment.customerAuth.accountDefaults.seatLimit;
  if (
    effectiveSeatLimit <
    account.activeMembershipCount + account.pendingInvitationCount
  ) {
    return fail(
      'CAPACITY_CONFLICT',
      'Account usage exceeds the requested seat limit',
    );
  }
  const effectiveAdminRoleEnabled =
    policyOverrides.adminRoleEnabled ??
    environment.customerAuth.accountDefaults.adminRoleEnabled;
  if (!effectiveAdminRoleEnabled) {
    const existingAdmin = await ctx.db
      .query('memberships')
      .withIndex('by_environment_account_role', (query) =>
        query
          .eq('environmentId', environment._id)
          .eq('accountId', account._id)
          .eq('role', 'admin'),
      )
      .first();
    if (existingAdmin) {
      return fail(
        'CONFLICT',
        'Remove all Admin roles before disabling the Admin role',
      );
    }
  }
  const effectiveInvitationsEnabled =
    policyOverrides.memberInvitationsEnabled ??
    environment.customerAuth.accountDefaults.memberInvitationsEnabled;
  if (!effectiveInvitationsEnabled && account.pendingInvitationCount > 0) {
    return fail(
      'CONFLICT',
      'Revoke pending invitations before disabling invitations',
    );
  }

  const storedOverrides =
    Object.keys(policyOverrides).length === 0 ? undefined : policyOverrides;
  await ctx.db.patch(account._id, {
    policyOverrides: storedOverrides,
    updatedAt: args.now,
  });
  await ctx.db.patch(environment._id, {
    accountPolicyStateRevision:
      (environment.accountPolicyStateRevision ?? 0) + 1,
  });
  const updated = await ctx.db.get(account._id);
  if (!updated) {
    return fail('CONFIGURATION_ERROR', 'Account policy update failed');
  }
  return toAccountSummary(environment, updated, actorMembership, actor);
}

export const updatePolicyOverrides = internalMutation({
  args: {
    environmentKey: v.string(),
    accountPublicId: v.string(),
    actorUserPublicId: v.string(),
    policyOverrides: accountPolicyOverridesValidator,
    now: v.number(),
  },
  returns: accountSummaryValidator,
  handler: async (ctx, args) => {
    return await applyAccountPolicyOverrides(ctx, args);
  },
});
