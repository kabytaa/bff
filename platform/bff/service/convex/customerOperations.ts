import {
  paginationOptsValidator,
  paginationResultValidator,
  type PaginationOptions,
  type PaginationResult,
} from 'convex/server';
import { v } from 'convex/values';

import {
  accountPolicyOverridesSchema,
  publicIdentifierSchema,
} from '@bff/contracts';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import {
  internalAction,
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server';
import {
  accountSummaryValidator,
  findAccountByPublicId,
  toAccountSummary,
} from './accounts';
import {
  accountPolicyValuesValidator,
  customerAuthConfigurationValidator,
  storedCustomerAuthConfigurationValidator,
  validateCustomerAuthConfiguration,
} from './lib/customerConfiguration';
import { randomPublicIdentifier } from './lib/customerCrypto';
import { validateBusinessEnvironmentKey } from './lib/businessEnvironment';
import { fail } from './lib/errors';
import { findMembershipByPublicId } from './memberships';
import { recordSecurityEvent } from './securityEvents';

const PAGE_SIZE = 50;
const PREFLIGHT_TTL_MILLISECONDS = 15 * 60 * 1_000;
const PREFLIGHT_RETENTION_MILLISECONDS = 24 * 60 * 60 * 1_000;
const SESSION_RETENTION_MILLISECONDS = 90 * 24 * 60 * 60 * 1_000;

type StoredCustomerConfiguration = ReturnType<
  typeof validateCustomerAuthConfiguration
>;

interface CustomerConfigurationPreflight {
  readonly key: string;
  readonly preflightId: string;
  readonly configuration: StoredCustomerConfiguration;
  readonly currentRevision: number;
  readonly nextRevision: number;
  readonly accountPolicyStateRevision: number;
  readonly compatible: boolean;
  readonly conflicts: string[];
  readonly expiresAt: number;
}

const accountRoleValidator = v.union(
  v.literal('owner'),
  v.literal('admin'),
  v.literal('member'),
);

const accountPolicyOverridesValidator = v.object({
  seatLimit: v.optional(v.number()),
  adminRoleEnabled: v.optional(v.boolean()),
  memberInvitationsEnabled: v.optional(v.boolean()),
});

const accountPolicySourceValidator = v.union(
  v.literal('business_default'),
  v.literal('account_override'),
);

export const operatorUserViewValidator = v.object({
  id: v.string(),
  verifiedEmail: v.string(),
  displayName: v.string(),
  pictureUrl: v.optional(v.string()),
  activeMembershipCount: v.number(),
  ownedAccountCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const operatorAccountViewValidator = v.object({
  id: v.string(),
  displayName: v.optional(v.string()),
  ownerUserId: v.string(),
  policyOverrides: v.optional(accountPolicyOverridesValidator),
  effectivePolicy: accountPolicyValuesValidator,
  policySources: v.object({
    seatLimit: accountPolicySourceValidator,
    adminRoleEnabled: accountPolicySourceValidator,
    memberInvitationsEnabled: accountPolicySourceValidator,
  }),
  activeMemberCount: v.number(),
  reservedInvitationCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const operatorMembershipViewValidator = v.object({
  id: v.string(),
  accountId: v.string(),
  userId: v.string(),
  role: accountRoleValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const operatorSessionViewValidator = v.object({
  id: v.string(),
  userId: v.string(),
  provider: v.union(v.literal('google'), v.literal('development')),
  createdAt: v.number(),
  lastSeenAt: v.number(),
  idleExpiresAt: v.number(),
  absoluteExpiresAt: v.number(),
  revokedAt: v.optional(v.number()),
  revocationReason: v.optional(v.string()),
});

export const operatorSecurityEventViewValidator = v.object({
  type: v.union(
    v.literal('customer_login_succeeded'),
    v.literal('customer_logout'),
    v.literal('ownership_transferred'),
    v.literal('development_automation_used'),
    v.literal('customer_session_revoked'),
  ),
  userId: v.optional(v.string()),
  accountId: v.optional(v.string()),
  sessionId: v.optional(v.string()),
  automationCapability: v.optional(
    v.union(
      v.literal('signup'),
      v.literal('login_as'),
      v.literal('ownership_transfer'),
    ),
  ),
  correlationId: v.string(),
  occurredAt: v.number(),
});

const configurationConflictPageValidator = paginationResultValidator(
  v.string(),
);

export const customerConfigurationPreflightValidator = v.object({
  key: v.string(),
  preflightId: v.string(),
  configuration: storedCustomerAuthConfigurationValidator,
  currentRevision: v.number(),
  nextRevision: v.number(),
  accountPolicyStateRevision: v.number(),
  compatible: v.boolean(),
  conflicts: v.array(v.string()),
  expiresAt: v.number(),
});

function boundedPagination(options: PaginationOptions): PaginationOptions {
  return {
    ...options,
    numItems: Math.max(1, Math.min(PAGE_SIZE, options.numItems)),
  };
}

async function configuredEnvironment(
  ctx: QueryCtx | MutationCtx,
  environmentKey: string,
) {
  const key = validateBusinessEnvironmentKey(environmentKey);
  const environment = await ctx.db
    .query('businessEnvironments')
    .withIndex('by_key', (query) => query.eq('key', key))
    .unique();
  if (!environment?.customerAuth) {
    return fail('CONFIGURATION_ERROR', 'Customer login is not configured');
  }
  return environment as Doc<'businessEnvironments'> & {
    customerAuth: NonNullable<Doc<'businessEnvironments'>['customerAuth']>;
  };
}

async function environmentForConfiguration(
  ctx: QueryCtx | MutationCtx,
  environmentKey: string,
) {
  const key = validateBusinessEnvironmentKey(environmentKey);
  const environment = await ctx.db
    .query('businessEnvironments')
    .withIndex('by_key', (query) => query.eq('key', key))
    .unique();
  if (!environment) {
    return fail('NOT_FOUND', `Business environment ${key} was not found`);
  }
  return environment;
}

function operatorAccountView(
  environment: Doc<'businessEnvironments'> & {
    customerAuth: NonNullable<Doc<'businessEnvironments'>['customerAuth']>;
  },
  account: Doc<'accounts'>,
  owner: Doc<'businessUsers'>,
) {
  const defaults = environment.customerAuth.accountDefaults;
  return {
    id: account.publicId,
    ...(account.displayName === undefined
      ? {}
      : { displayName: account.displayName }),
    ownerUserId: owner.publicId,
    ...(account.policyOverrides === undefined
      ? {}
      : { policyOverrides: account.policyOverrides }),
    effectivePolicy: {
      seatLimit: account.policyOverrides?.seatLimit ?? defaults.seatLimit,
      adminRoleEnabled:
        account.policyOverrides?.adminRoleEnabled ?? defaults.adminRoleEnabled,
      memberInvitationsEnabled:
        account.policyOverrides?.memberInvitationsEnabled ??
        defaults.memberInvitationsEnabled,
    },
    policySources: {
      seatLimit:
        account.policyOverrides?.seatLimit === undefined
          ? ('business_default' as const)
          : ('account_override' as const),
      adminRoleEnabled:
        account.policyOverrides?.adminRoleEnabled === undefined
          ? ('business_default' as const)
          : ('account_override' as const),
      memberInvitationsEnabled:
        account.policyOverrides?.memberInvitationsEnabled === undefined
          ? ('business_default' as const)
          : ('account_override' as const),
    },
    activeMemberCount: account.activeMembershipCount,
    reservedInvitationCount: account.pendingInvitationCount,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

async function createManagedAccount(
  ctx: MutationCtx,
  args: {
    environmentKey: string;
    userPublicId: string;
    displayName?: string;
    accountPublicId: string;
    membershipPublicId: string;
    developmentOnly: boolean;
    now: number;
  },
) {
  const environment = await configuredEnvironment(ctx, args.environmentKey);
  if (
    args.developmentOnly &&
    !environment.customerAuth.developmentAutomationEnabled
  ) {
    return fail(
      'FORBIDDEN',
      'Development fixture operations are not enabled for this environment',
    );
  }
  const userPublicId = publicIdentifierSchema.parse(args.userPublicId);
  const accountPublicId = publicIdentifierSchema.parse(args.accountPublicId);
  const membershipPublicId = publicIdentifierSchema.parse(
    args.membershipPublicId,
  );
  const displayName = args.displayName?.trim();
  if (
    displayName !== undefined &&
    (displayName.length < 1 || displayName.length > 120)
  ) {
    return fail('VALIDATION_ERROR', 'Account display name is invalid');
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
    return fail('CONFLICT', 'Account public identifier already exists');
  }
  if (
    await findMembershipByPublicId(ctx, environment._id, membershipPublicId)
  ) {
    return fail('CONFLICT', 'Membership public identifier already exists');
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
    return fail('CONFIGURATION_ERROR', 'Managed account creation failed');
  }
  return toAccountSummary(environment, account, membership, updatedUser);
}

const managedAccountArgs = {
  environmentKey: v.string(),
  userPublicId: v.string(),
  displayName: v.optional(v.string()),
  accountPublicId: v.string(),
  membershipPublicId: v.string(),
  now: v.number(),
};

export const provisionManagedAccount = internalMutation({
  args: managedAccountArgs,
  returns: accountSummaryValidator,
  handler: async (ctx, args) =>
    await createManagedAccount(ctx, { ...args, developmentOnly: false }),
});

export const provisionDevelopmentFixtureAccount = internalMutation({
  args: managedAccountArgs,
  returns: accountSummaryValidator,
  handler: async (ctx, args) =>
    await createManagedAccount(ctx, { ...args, developmentOnly: true }),
});

export const updateAccountPolicy = internalMutation({
  args: {
    environmentKey: v.string(),
    accountPublicId: v.string(),
    policyOverrides: accountPolicyOverridesValidator,
    now: v.number(),
  },
  returns: operatorAccountViewValidator,
  handler: async (ctx, args) => {
    const environment = await configuredEnvironment(ctx, args.environmentKey);
    const accountPublicId = publicIdentifierSchema.parse(args.accountPublicId);
    const policyOverrides = accountPolicyOverridesSchema.parse(
      args.policyOverrides,
    );
    const account = await findAccountByPublicId(
      ctx,
      environment._id,
      accountPublicId,
    );
    if (!account) return fail('NOT_FOUND', 'Account was not found');
    const owner = await ctx.db.get(account.ownerUserId);
    if (!owner || owner.environmentId !== environment._id) {
      return fail('CONFIGURATION_ERROR', 'Account owner is invalid');
    }
    const defaults = environment.customerAuth.accountDefaults;
    const seatLimit = policyOverrides.seatLimit ?? defaults.seatLimit;
    if (
      account.activeMembershipCount + account.pendingInvitationCount >
      seatLimit
    ) {
      return fail(
        'CAPACITY_CONFLICT',
        'Account usage exceeds the requested seat limit',
      );
    }
    const adminRoleEnabled =
      policyOverrides.adminRoleEnabled ?? defaults.adminRoleEnabled;
    if (!adminRoleEnabled) {
      const admin = await ctx.db
        .query('memberships')
        .withIndex('by_environment_account_role', (query) =>
          query
            .eq('environmentId', environment._id)
            .eq('accountId', account._id)
            .eq('role', 'admin'),
        )
        .first();
      if (admin) {
        return fail(
          'CONFLICT',
          'Remove all Admin roles before disabling the Admin role',
        );
      }
    }
    const invitationsEnabled =
      policyOverrides.memberInvitationsEnabled ??
      defaults.memberInvitationsEnabled;
    if (!invitationsEnabled && account.pendingInvitationCount > 0) {
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
    return operatorAccountView(environment, updated, owner);
  },
});

export const revokeSession = internalMutation({
  args: {
    environmentKey: v.string(),
    sessionPublicId: v.string(),
    now: v.number(),
  },
  returns: operatorSessionViewValidator,
  handler: async (ctx, args) => {
    const environment = await configuredEnvironment(ctx, args.environmentKey);
    const sessionPublicId = publicIdentifierSchema.parse(args.sessionPublicId);
    const session = await ctx.db
      .query('businessSessions')
      .withIndex('by_environment_public_id', (query) =>
        query
          .eq('environmentId', environment._id)
          .eq('publicId', sessionPublicId),
      )
      .unique();
    if (!session) return fail('NOT_FOUND', 'Customer session was not found');
    const user = await ctx.db.get(session.userId);
    if (!user || user.environmentId !== environment._id) {
      return fail('CONFIGURATION_ERROR', 'Customer session user is invalid');
    }
    if (session.revokedAt === undefined) {
      await ctx.db.patch(session._id, {
        revokedAt: args.now,
        revocationReason: 'operator_revoked',
        cleanupAt: args.now + SESSION_RETENTION_MILLISECONDS,
      });
      await recordSecurityEvent(ctx, {
        environmentId: environment._id,
        userId: user._id,
        sessionId: session._id,
        type: 'customer_session_revoked',
        correlationId: session.publicId,
        occurredAt: args.now,
      });
    }
    return {
      id: session.publicId,
      userId: user.publicId,
      provider: session.provider,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      idleExpiresAt: session.idleExpiresAt,
      absoluteExpiresAt: session.absoluteExpiresAt,
      revokedAt: session.revokedAt ?? args.now,
      revocationReason: session.revocationReason ?? 'operator_revoked',
    };
  },
});

export const checkConfigurationUsersPage = internalQuery({
  args: {
    key: v.string(),
    configuration: customerAuthConfigurationValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: configurationConflictPageValidator,
  handler: async (ctx, args) => {
    const environment = await environmentForConfiguration(ctx, args.key);
    const configuration = validateCustomerAuthConfiguration(args.configuration);
    const page = await ctx.db
      .query('businessUsers')
      .withIndex('by_environment', (query) =>
        query.eq('environmentId', environment._id),
      )
      .paginate(boundedPagination(args.paginationOpts));
    const conflicts: string[] = [];
    for (const user of page.page) {
      if (
        user.activeMembershipCount >
        configuration.accountPolicy.maxAccountMembershipsPerUser
      ) {
        conflicts.push(
          `User ${user.publicId} exceeds maxAccountMembershipsPerUser`,
        );
      }
      if (
        user.ownedAccountCount >
        configuration.accountPolicy.maxOwnedAccountsPerUser
      ) {
        conflicts.push(`User ${user.publicId} exceeds maxOwnedAccountsPerUser`);
      }
    }
    return { ...page, page: conflicts };
  },
});

export const checkConfigurationAccountsPage = internalQuery({
  args: {
    key: v.string(),
    configuration: customerAuthConfigurationValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: configurationConflictPageValidator,
  handler: async (ctx, args) => {
    const environment = await environmentForConfiguration(ctx, args.key);
    const configuration = validateCustomerAuthConfiguration(args.configuration);
    const page = await ctx.db
      .query('accounts')
      .withIndex('by_environment', (query) =>
        query.eq('environmentId', environment._id),
      )
      .paginate(boundedPagination(args.paginationOpts));
    const conflicts: string[] = [];
    for (const account of page.page) {
      const seatLimit =
        account.policyOverrides?.seatLimit ??
        configuration.accountDefaults.seatLimit;
      if (
        account.activeMembershipCount + account.pendingInvitationCount >
        seatLimit
      ) {
        conflicts.push(`Account ${account.publicId} exceeds its seat limit`);
      }
      const adminRoleEnabled =
        account.policyOverrides?.adminRoleEnabled ??
        configuration.accountDefaults.adminRoleEnabled;
      if (!adminRoleEnabled) {
        const admin = await ctx.db
          .query('memberships')
          .withIndex('by_environment_account_role', (query) =>
            query
              .eq('environmentId', environment._id)
              .eq('accountId', account._id)
              .eq('role', 'admin'),
          )
          .first();
        if (admin) {
          conflicts.push(`Account ${account.publicId} still has an Admin`);
        }
      }
      const invitationsEnabled =
        account.policyOverrides?.memberInvitationsEnabled ??
        configuration.accountDefaults.memberInvitationsEnabled;
      if (!invitationsEnabled && account.pendingInvitationCount > 0) {
        conflicts.push(
          `Account ${account.publicId} still has pending invitations`,
        );
      }
    }
    return { ...page, page: conflicts };
  },
});

export const recordConfigurationPreflight = internalMutation({
  args: {
    key: v.string(),
    preflightId: v.string(),
    configuration: customerAuthConfigurationValidator,
    expectedConfigurationRevision: v.number(),
    expectedAccountPolicyStateRevision: v.number(),
    conflicts: v.array(v.string()),
    now: v.number(),
  },
  returns: customerConfigurationPreflightValidator,
  handler: async (ctx, args) => {
    const environment = await environmentForConfiguration(ctx, args.key);
    const configuration = validateCustomerAuthConfiguration(args.configuration);
    const preflightId = publicIdentifierSchema.parse(args.preflightId);
    const configurationRevision =
      environment.customerAuthConfigurationRevision ?? 0;
    const policyRevision = environment.accountPolicyStateRevision ?? 0;
    if (
      configurationRevision !== args.expectedConfigurationRevision ||
      policyRevision !== args.expectedAccountPolicyStateRevision
    ) {
      return fail(
        'CONFLICT',
        'Customer account state changed during configuration preflight',
      );
    }
    const existing = await ctx.db
      .query('customerConfigurationPreflights')
      .withIndex('by_environment_public_id', (query) =>
        query.eq('environmentId', environment._id).eq('publicId', preflightId),
      )
      .unique();
    if (existing) return fail('CONFLICT', 'Configuration preflight collided');
    const conflicts = args.conflicts.slice(0, 100);
    const expiresAt = args.now + PREFLIGHT_TTL_MILLISECONDS;
    await ctx.db.insert('customerConfigurationPreflights', {
      environmentId: environment._id,
      publicId: preflightId,
      configuration,
      expectedConfigurationRevision: configurationRevision,
      expectedAccountPolicyStateRevision: policyRevision,
      compatible: args.conflicts.length === 0,
      conflicts,
      createdAt: args.now,
      expiresAt,
      cleanupAt: expiresAt + PREFLIGHT_RETENTION_MILLISECONDS,
    });
    return {
      key: environment.key,
      preflightId,
      configuration,
      currentRevision: configurationRevision,
      nextRevision: configurationRevision + 1,
      accountPolicyStateRevision: policyRevision,
      compatible: args.conflicts.length === 0,
      conflicts,
      expiresAt,
    };
  },
});

export const previewCustomerConfiguration = internalAction({
  args: {
    key: v.string(),
    configuration: customerAuthConfigurationValidator,
  },
  returns: customerConfigurationPreflightValidator,
  handler: async (ctx, args): Promise<CustomerConfigurationPreflight> => {
    const state: {
      configurationRevision: number;
      accountPolicyStateRevision: number;
    } = await ctx.runQuery(
      internal.customerOperations.configurationRevisionState,
      { key: args.key },
    );
    const conflicts: string[] = [];
    for (const functionReference of [
      internal.customerOperations.checkConfigurationUsersPage,
      internal.customerOperations.checkConfigurationAccountsPage,
    ]) {
      let cursor: string | null = null;
      let done = false;
      while (!done) {
        const page: PaginationResult<string> = await ctx.runQuery(
          functionReference,
          {
            key: args.key,
            configuration: args.configuration,
            paginationOpts: { cursor, numItems: PAGE_SIZE },
          },
        );
        if (conflicts.length < 100) {
          conflicts.push(...page.page.slice(0, 100 - conflicts.length));
        }
        cursor = page.continueCursor;
        done = page.isDone;
      }
    }
    return await ctx.runMutation(
      internal.customerOperations.recordConfigurationPreflight,
      {
        key: args.key,
        preflightId: randomPublicIdentifier('preflight'),
        configuration: args.configuration,
        expectedConfigurationRevision: state.configurationRevision,
        expectedAccountPolicyStateRevision: state.accountPolicyStateRevision,
        conflicts,
        now: Date.now(),
      },
    );
  },
});

export const configurationRevisionState = internalQuery({
  args: { key: v.string() },
  returns: v.object({
    configurationRevision: v.number(),
    accountPolicyStateRevision: v.number(),
  }),
  handler: async (ctx, args) => {
    const environment = await environmentForConfiguration(ctx, args.key);
    return {
      configurationRevision: environment.customerAuthConfigurationRevision ?? 0,
      accountPolicyStateRevision: environment.accountPolicyStateRevision ?? 0,
    };
  },
});

export async function paginateCustomerUsers(
  ctx: QueryCtx,
  environmentKey: string,
  paginationOpts: PaginationOptions,
) {
  const environment = await configuredEnvironment(ctx, environmentKey);
  const page = await ctx.db
    .query('businessUsers')
    .withIndex('by_environment', (query) =>
      query.eq('environmentId', environment._id),
    )
    .paginate(boundedPagination(paginationOpts));
  return {
    ...page,
    page: page.page.map((user) => ({
      id: user.publicId,
      verifiedEmail: user.verifiedEmail,
      displayName: user.displayName,
      ...(user.pictureUrl === undefined ? {} : { pictureUrl: user.pictureUrl }),
      activeMembershipCount: user.activeMembershipCount,
      ownedAccountCount: user.ownedAccountCount,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })),
  };
}

export async function paginateCustomerAccounts(
  ctx: QueryCtx,
  environmentKey: string,
  paginationOpts: PaginationOptions,
) {
  const environment = await configuredEnvironment(ctx, environmentKey);
  const page = await ctx.db
    .query('accounts')
    .withIndex('by_environment', (query) =>
      query.eq('environmentId', environment._id),
    )
    .paginate(boundedPagination(paginationOpts));
  const views = [];
  for (const account of page.page) {
    const owner = await ctx.db.get(account.ownerUserId);
    if (!owner || owner.environmentId !== environment._id) {
      return fail('CONFIGURATION_ERROR', 'Account owner is invalid');
    }
    views.push(operatorAccountView(environment, account, owner));
  }
  return { ...page, page: views };
}

export async function paginateCustomerMemberships(
  ctx: QueryCtx,
  environmentKey: string,
  paginationOpts: PaginationOptions,
) {
  const environment = await configuredEnvironment(ctx, environmentKey);
  const page = await ctx.db
    .query('memberships')
    .withIndex('by_environment_account_user', (query) =>
      query.eq('environmentId', environment._id),
    )
    .paginate(boundedPagination(paginationOpts));
  const views = [];
  for (const membership of page.page) {
    const [account, user] = await Promise.all([
      ctx.db.get(membership.accountId),
      ctx.db.get(membership.userId),
    ]);
    if (
      !account ||
      !user ||
      account.environmentId !== environment._id ||
      user.environmentId !== environment._id
    ) {
      return fail('CONFIGURATION_ERROR', 'Membership references are invalid');
    }
    views.push({
      id: membership.publicId,
      accountId: account.publicId,
      userId: user.publicId,
      role: membership.role,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
    });
  }
  return { ...page, page: views };
}

export async function paginateCustomerSessions(
  ctx: QueryCtx,
  environmentKey: string,
  paginationOpts: PaginationOptions,
) {
  const environment = await configuredEnvironment(ctx, environmentKey);
  const page = await ctx.db
    .query('businessSessions')
    .withIndex('by_environment_user_created_at', (query) =>
      query.eq('environmentId', environment._id),
    )
    .paginate(boundedPagination(paginationOpts));
  const views = [];
  for (const session of page.page) {
    const user = await ctx.db.get(session.userId);
    if (!user || user.environmentId !== environment._id) {
      return fail('CONFIGURATION_ERROR', 'Customer session user is invalid');
    }
    views.push({
      id: session.publicId,
      userId: user.publicId,
      provider: session.provider,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      idleExpiresAt: session.idleExpiresAt,
      absoluteExpiresAt: session.absoluteExpiresAt,
      ...(session.revokedAt === undefined
        ? {}
        : { revokedAt: session.revokedAt }),
      ...(session.revocationReason === undefined
        ? {}
        : { revocationReason: session.revocationReason }),
    });
  }
  return { ...page, page: views };
}

async function publicIdForOptionalReference<
  TableName extends 'businessUsers' | 'accounts' | 'businessSessions',
>(ctx: QueryCtx, id: Id<TableName> | undefined): Promise<string | undefined> {
  if (id === undefined) return undefined;
  const document = await ctx.db.get(id);
  return document?.publicId;
}

export async function paginateCustomerSecurityEvents(
  ctx: QueryCtx,
  environmentKey: string,
  paginationOpts: PaginationOptions,
) {
  const environment = await configuredEnvironment(ctx, environmentKey);
  const page = await ctx.db
    .query('securityEvents')
    .withIndex('by_environment_occurred_at', (query) =>
      query.eq('environmentId', environment._id),
    )
    .order('desc')
    .paginate(boundedPagination(paginationOpts));
  const views = [];
  for (const event of page.page) {
    const [userId, accountId, sessionId] = await Promise.all([
      publicIdForOptionalReference(ctx, event.userId),
      publicIdForOptionalReference(ctx, event.accountId),
      publicIdForOptionalReference(ctx, event.sessionId),
    ]);
    views.push({
      type: event.type,
      ...(userId === undefined ? {} : { userId }),
      ...(accountId === undefined ? {} : { accountId }),
      ...(sessionId === undefined ? {} : { sessionId }),
      ...(event.automationCapability === undefined
        ? {}
        : { automationCapability: event.automationCapability }),
      correlationId: event.correlationId,
      occurredAt: event.occurredAt,
    });
  }
  return { ...page, page: views };
}

export const listUsers = internalQuery({
  args: { environmentKey: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(operatorUserViewValidator),
  handler: async (ctx, args) =>
    await paginateCustomerUsers(ctx, args.environmentKey, args.paginationOpts),
});

export const listAccounts = internalQuery({
  args: { environmentKey: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(operatorAccountViewValidator),
  handler: async (ctx, args) =>
    await paginateCustomerAccounts(
      ctx,
      args.environmentKey,
      args.paginationOpts,
    ),
});

export const listMemberships = internalQuery({
  args: { environmentKey: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(operatorMembershipViewValidator),
  handler: async (ctx, args) =>
    await paginateCustomerMemberships(
      ctx,
      args.environmentKey,
      args.paginationOpts,
    ),
});

export const listSessions = internalQuery({
  args: { environmentKey: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(operatorSessionViewValidator),
  handler: async (ctx, args) =>
    await paginateCustomerSessions(
      ctx,
      args.environmentKey,
      args.paginationOpts,
    ),
});

export const listSecurityEvents = internalQuery({
  args: { environmentKey: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(operatorSecurityEventViewValidator),
  handler: async (ctx, args) =>
    await paginateCustomerSecurityEvents(
      ctx,
      args.environmentKey,
      args.paginationOpts,
    ),
});
