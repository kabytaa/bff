import { z } from 'zod';
import { v } from 'convex/values';

import { publicIdentifierSchema } from '@bff/contracts';
import {
  accountSummaryValidator,
  findAccountByPublicId,
  toAccountSummary,
} from './accounts';
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { validateBusinessEnvironmentKey } from './lib/businessEnvironment';
import { fail } from './lib/errors';
import {
  findMembershipByPublicId,
  listMembershipsForUser,
} from './memberships';

const providerValidator = v.union(
  v.literal('google'),
  v.literal('development'),
);

const businessUserViewValidator = v.object({
  id: v.string(),
  environmentKey: v.string(),
  verifiedEmail: v.string(),
  displayName: v.string(),
  pictureUrl: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const currentCustomerViewValidator = v.object({
  user: businessUserViewValidator,
  accounts: v.array(accountSummaryValidator),
});

const bootstrapResultValidator = v.union(
  v.object({
    kind: v.literal('collision'),
    field: v.union(
      v.literal('userPublicId'),
      v.literal('accountPublicId'),
      v.literal('membershipPublicId'),
    ),
  }),
  v.object({
    kind: v.literal('ok'),
    customer: currentCustomerViewValidator,
  }),
);

const providerProfileSchema = z
  .object({
    verifiedEmail: z.string().trim().toLowerCase().email().max(320),
    displayName: z.string().trim().min(1).max(120),
    pictureUrl: z.string().url().max(2048).optional(),
  })
  .strict();

async function findEnvironment(ctx: QueryCtx | MutationCtx, key: string) {
  return await ctx.db
    .query('businessEnvironments')
    .withIndex('by_key', (query) => query.eq('key', key))
    .unique();
}

async function findIdentity(
  ctx: MutationCtx,
  provider: 'google' | 'development',
  issuer: string,
  subject: string,
) {
  return await ctx.db
    .query('authIdentities')
    .withIndex('by_provider_issuer_subject', (query) =>
      query
        .eq('provider', provider)
        .eq('issuer', issuer)
        .eq('subject', subject),
    )
    .unique();
}

async function findBusinessUser(
  ctx: MutationCtx,
  environmentId: Id<'businessEnvironments'>,
  principalId: Id<'authPrincipals'>,
) {
  return await ctx.db
    .query('businessUsers')
    .withIndex('by_environment_principal', (query) =>
      query.eq('environmentId', environmentId).eq('principalId', principalId),
    )
    .unique();
}

async function findBusinessUserByPublicId(
  ctx: MutationCtx,
  environmentId: Id<'businessEnvironments'>,
  publicId: string,
) {
  return await ctx.db
    .query('businessUsers')
    .withIndex('by_environment_public_id', (query) =>
      query.eq('environmentId', environmentId).eq('publicId', publicId),
    )
    .unique();
}

export async function buildCurrentCustomer(
  ctx: QueryCtx | MutationCtx,
  environment: Doc<'businessEnvironments'>,
  user: Doc<'businessUsers'>,
) {
  if (!environment.customerAuth) {
    return fail('CONFIGURATION_ERROR', 'Customer login is not configured');
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

  const accounts = [];
  for (const membership of memberships) {
    const account = await ctx.db.get(membership.accountId);
    if (!account || account.environmentId !== environment._id) {
      return fail('CONFIGURATION_ERROR', 'Customer membership is invalid');
    }
    accounts.push(toAccountSummary(environment, account, membership, user));
  }

  return {
    user: {
      id: user.publicId,
      environmentKey: environment.key,
      verifiedEmail: user.verifiedEmail,
      displayName: user.displayName,
      ...(user.pictureUrl === undefined ? {} : { pictureUrl: user.pictureUrl }),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    accounts,
  };
}

export interface BootstrapCustomerInput {
  environmentKey: string;
  provider: 'google' | 'development';
  issuer: string;
  subject: string;
  profile: {
    verifiedEmail: string;
    displayName: string;
    pictureUrl?: string;
  };
  candidates: {
    userPublicId: string;
    accountPublicId: string;
    membershipPublicId: string;
  };
  now: number;
}

export async function bootstrapCustomerInMutation(
  ctx: MutationCtx,
  args: BootstrapCustomerInput,
) {
  const environmentKey = validateBusinessEnvironmentKey(args.environmentKey);
  const environment = await findEnvironment(ctx, environmentKey);
  if (!environment?.customerAuth) {
    return fail('CONFIGURATION_ERROR', 'Customer login is not configured');
  }
  if (
    args.provider === 'google' &&
    !environment.customerAuth.enabledProviders.includes('google')
  ) {
    return fail('FORBIDDEN', 'Identity provider is not enabled');
  }
  if (
    args.provider === 'development' &&
    !environment.customerAuth.developmentAutomationEnabled
  ) {
    return fail('FORBIDDEN', 'Development automation is not enabled');
  }

  const profile = providerProfileSchema.parse(args.profile);
  const userPublicId = publicIdentifierSchema.parse(
    args.candidates.userPublicId,
  );
  const accountPublicId = publicIdentifierSchema.parse(
    args.candidates.accountPublicId,
  );
  const membershipPublicId = publicIdentifierSchema.parse(
    args.candidates.membershipPublicId,
  );

  const shouldCreateAccount =
    environment.customerAuth.accountPolicy.createAccountOnFirstSignIn;
  const identity = await findIdentity(
    ctx,
    args.provider,
    args.issuer,
    args.subject,
  );
  let principalId = identity?.principalId;
  let user =
    principalId === undefined
      ? null
      : await findBusinessUser(ctx, environment._id, principalId);

  if (!user) {
    if (await findBusinessUserByPublicId(ctx, environment._id, userPublicId)) {
      return {
        kind: 'collision' as const,
        field: 'userPublicId' as const,
      };
    }
    if (
      shouldCreateAccount &&
      (await findAccountByPublicId(ctx, environment._id, accountPublicId))
    ) {
      return {
        kind: 'collision' as const,
        field: 'accountPublicId' as const,
      };
    }
    if (
      shouldCreateAccount &&
      (await findMembershipByPublicId(ctx, environment._id, membershipPublicId))
    ) {
      return {
        kind: 'collision' as const,
        field: 'membershipPublicId' as const,
      };
    }
  }

  if (identity) {
    await ctx.db.patch(identity._id, { lastAuthenticatedAt: args.now });
  } else {
    principalId = await ctx.db.insert('authPrincipals', {
      createdAt: args.now,
    });
    await ctx.db.insert('authIdentities', {
      principalId,
      provider: args.provider,
      issuer: args.issuer,
      subject: args.subject,
      createdAt: args.now,
      lastAuthenticatedAt: args.now,
    });
  }

  if (user) {
    await ctx.db.patch(user._id, {
      verifiedEmail: profile.verifiedEmail,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      updatedAt: args.now,
    });
    const refreshedUser = await ctx.db.get(user._id);
    if (!refreshedUser) {
      return fail('CONFIGURATION_ERROR', 'Customer profile update failed');
    }
    user = refreshedUser;
  } else {
    if (principalId === undefined) {
      return fail('CONFIGURATION_ERROR', 'Identity creation failed');
    }

    const userId = await ctx.db.insert('businessUsers', {
      environmentId: environment._id,
      principalId,
      publicId: userPublicId,
      verifiedEmail: profile.verifiedEmail,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      firstSignInProvisioningCompletedAt: args.now,
      activeMembershipCount: 0,
      ownedAccountCount: 0,
      createdAt: args.now,
      updatedAt: args.now,
    });

    if (shouldCreateAccount) {
      const accountId = await ctx.db.insert('accounts', {
        environmentId: environment._id,
        publicId: accountPublicId,
        ownerUserId: userId,
        activeMembershipCount: 1,
        pendingInvitationCount: 0,
        createdAt: args.now,
        updatedAt: args.now,
      });
      await ctx.db.insert('memberships', {
        environmentId: environment._id,
        accountId,
        userId,
        publicId: membershipPublicId,
        role: 'owner',
        createdAt: args.now,
        updatedAt: args.now,
      });
      await ctx.db.patch(userId, {
        activeMembershipCount: 1,
        ownedAccountCount: 1,
      });
      await ctx.db.patch(environment._id, {
        accountPolicyStateRevision:
          (environment.accountPolicyStateRevision ?? 0) + 1,
      });
    }

    const createdUser = await ctx.db.get(userId);
    if (!createdUser) {
      return fail('CONFIGURATION_ERROR', 'Customer creation failed');
    }
    user = createdUser;
  }

  if (principalId === undefined) {
    return fail('CONFIGURATION_ERROR', 'Identity resolution failed');
  }
  return {
    kind: 'ok' as const,
    customer: await buildCurrentCustomer(ctx, environment, user),
    principalId,
    userId: user._id,
  };
}

export const bootstrapCustomer = internalMutation({
  args: {
    environmentKey: v.string(),
    provider: providerValidator,
    issuer: v.string(),
    subject: v.string(),
    profile: v.object({
      verifiedEmail: v.string(),
      displayName: v.string(),
      pictureUrl: v.optional(v.string()),
    }),
    candidates: v.object({
      userPublicId: v.string(),
      accountPublicId: v.string(),
      membershipPublicId: v.string(),
    }),
    now: v.number(),
  },
  returns: bootstrapResultValidator,
  handler: async (ctx, args) => {
    const result = await bootstrapCustomerInMutation(ctx, args);
    return result.kind === 'collision'
      ? result
      : { kind: 'ok' as const, customer: result.customer };
  },
});

export const currentCustomerByPublicId = internalQuery({
  args: {
    environmentKey: v.string(),
    userPublicId: v.string(),
  },
  returns: currentCustomerViewValidator,
  handler: async (ctx, args) => {
    const environmentKey = validateBusinessEnvironmentKey(args.environmentKey);
    const userPublicId = publicIdentifierSchema.parse(args.userPublicId);
    const environment = await findEnvironment(ctx, environmentKey);
    if (!environment?.customerAuth) {
      return fail('CONFIGURATION_ERROR', 'Customer login is not configured');
    }
    const user = await ctx.db
      .query('businessUsers')
      .withIndex('by_environment_public_id', (query) =>
        query.eq('environmentId', environment._id).eq('publicId', userPublicId),
      )
      .unique();
    if (!user) {
      return fail('NOT_FOUND', 'Customer user was not found');
    }
    return await buildCurrentCustomer(ctx, environment, user);
  },
});
