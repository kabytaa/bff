import { z } from 'zod';
import { v } from 'convex/values';

import { MAX_ACCOUNT_SEAT_LIMIT, publicIdentifierSchema } from '@bff/contracts';
import { accountSummaryValidator, toAccountSummary } from './accounts';
import type { Doc } from './_generated/dataModel';
import { internalMutation, type MutationCtx } from './_generated/server';
import { validateBusinessEnvironmentKey } from './lib/businessEnvironment';
import { fail } from './lib/errors';
import {
  authoritativeAccountContext,
  findMembershipByPublicId,
  findMembershipForAccountUser,
} from './memberships';

const INVITATION_TTL_MILLISECONDS = 7 * 24 * 60 * 60 * 1_000;
const RETENTION_MILLISECONDS = 90 * 24 * 60 * 60 * 1_000;
const emailSchema = z.string().trim().toLowerCase().email().max(320);
const sha256HashSchema = z
  .string()
  .length(43)
  .regex(/^[A-Za-z0-9_-]+$/u);

export const invitationViewValidator = v.object({
  id: v.string(),
  accountId: v.string(),
  recipientEmail: v.string(),
  state: v.union(
    v.literal('pending'),
    v.literal('accepted'),
    v.literal('revoked'),
    v.literal('expired'),
  ),
  expiresAt: v.number(),
  createdAt: v.number(),
});

const createInvitationResultValidator = v.union(
  v.object({
    kind: v.literal('collision'),
    field: v.union(v.literal('publicId'), v.literal('tokenHash')),
  }),
  v.object({
    kind: v.literal('ok'),
    invitation: invitationViewValidator,
  }),
);

const acceptInvitationResultValidator = v.union(
  v.object({ kind: v.literal('expired') }),
  v.object({
    kind: v.literal('collision'),
    field: v.literal('membershipPublicId'),
  }),
  v.object({
    kind: v.literal('ok'),
    account: accountSummaryValidator,
  }),
);

function toInvitationView(
  invitation: Doc<'accountInvitations'>,
  account: Doc<'accounts'>,
) {
  return {
    id: invitation.publicId,
    accountId: account.publicId,
    recipientEmail: invitation.recipientEmail,
    state: invitation.state,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
  };
}

function effectiveInvitationPolicy(
  environment: Doc<'businessEnvironments'> & {
    customerAuth: NonNullable<Doc<'businessEnvironments'>['customerAuth']>;
  },
  account: Doc<'accounts'>,
) {
  return {
    seatLimit:
      account.policyOverrides?.seatLimit ??
      environment.customerAuth.accountDefaults.seatLimit,
    memberInvitationsEnabled:
      account.policyOverrides?.memberInvitationsEnabled ??
      environment.customerAuth.accountDefaults.memberInvitationsEnabled,
  };
}

async function releaseExpiredReservations(
  ctx: MutationCtx,
  environment: Doc<'businessEnvironments'>,
  account: Doc<'accounts'>,
  now: number,
) {
  const expired = await ctx.db
    .query('accountInvitations')
    .withIndex('by_environment_account_state_expires_at', (query) =>
      query
        .eq('environmentId', environment._id)
        .eq('accountId', account._id)
        .eq('state', 'pending')
        .lte('expiresAt', now),
    )
    .take(MAX_ACCOUNT_SEAT_LIMIT);
  if (expired.length === 0) return account;
  if (account.pendingInvitationCount < expired.length) {
    return fail('CONFIGURATION_ERROR', 'Invitation counters are invalid');
  }
  for (const invitation of expired) {
    await ctx.db.patch(invitation._id, {
      state: 'expired',
      updatedAt: now,
      cleanupAt: now + RETENTION_MILLISECONDS,
    });
  }
  const pendingInvitationCount =
    account.pendingInvitationCount - expired.length;
  await ctx.db.patch(account._id, {
    pendingInvitationCount,
    updatedAt: now,
  });
  return { ...account, pendingInvitationCount, updatedAt: now };
}

export const create = internalMutation({
  args: {
    environmentKey: v.string(),
    accountPublicId: v.string(),
    actorUserPublicId: v.string(),
    recipientEmail: v.string(),
    publicId: v.string(),
    tokenHash: v.string(),
    now: v.number(),
  },
  returns: createInvitationResultValidator,
  handler: async (ctx, args) => {
    const environmentKey = validateBusinessEnvironmentKey(args.environmentKey);
    const accountPublicId = publicIdentifierSchema.parse(args.accountPublicId);
    const actorUserPublicId = publicIdentifierSchema.parse(
      args.actorUserPublicId,
    );
    const recipientEmail = emailSchema.parse(args.recipientEmail);
    const publicId = publicIdentifierSchema.parse(args.publicId);
    const tokenHash = sha256HashSchema.parse(args.tokenHash);
    const context = await authoritativeAccountContext(
      ctx,
      environmentKey,
      accountPublicId,
      actorUserPublicId,
    );
    if (
      context.actorMembership.role !== 'owner' &&
      context.actorMembership.role !== 'admin'
    ) {
      return fail('FORBIDDEN', 'Invitation management is not allowed');
    }
    let account = await releaseExpiredReservations(
      ctx,
      context.environment,
      context.account,
      args.now,
    );
    const policy = effectiveInvitationPolicy(context.environment, account);
    if (!policy.memberInvitationsEnabled) {
      return fail('FORBIDDEN', 'Member invitations are not enabled');
    }
    if (
      context.actorMembership.role === 'admin' &&
      !(
        account.policyOverrides?.adminRoleEnabled ??
        context.environment.customerAuth.accountDefaults.adminRoleEnabled
      )
    ) {
      return fail('FORBIDDEN', 'The Admin role is not enabled');
    }
    const existingToken = await ctx.db
      .query('accountInvitations')
      .withIndex('by_environment_token_hash', (query) =>
        query
          .eq('environmentId', context.environment._id)
          .eq('tokenHash', tokenHash),
      )
      .unique();
    if (existingToken) {
      return { kind: 'collision' as const, field: 'tokenHash' as const };
    }

    const existingPending = await ctx.db
      .query('accountInvitations')
      .withIndex('by_environment_account_recipient_state', (query) =>
        query
          .eq('environmentId', context.environment._id)
          .eq('accountId', account._id)
          .eq('recipientEmail', recipientEmail)
          .eq('state', 'pending'),
      )
      .unique();
    const expiresAt = args.now + INVITATION_TTL_MILLISECONDS;
    if (existingPending) {
      await ctx.db.patch(existingPending._id, {
        tokenHash,
        expiresAt,
        updatedAt: args.now,
        cleanupAt: expiresAt + RETENTION_MILLISECONDS,
      });
      const updated = await ctx.db.get(existingPending._id);
      if (!updated) {
        return fail('CONFIGURATION_ERROR', 'Invitation update failed');
      }
      return {
        kind: 'ok' as const,
        invitation: toInvitationView(updated, account),
      };
    }

    if (
      account.activeMembershipCount + account.pendingInvitationCount >=
      policy.seatLimit
    ) {
      return fail('CAPACITY_CONFLICT', 'Account seat capacity is full');
    }
    const existingPublicId = await ctx.db
      .query('accountInvitations')
      .withIndex('by_environment_public_id', (query) =>
        query
          .eq('environmentId', context.environment._id)
          .eq('publicId', publicId),
      )
      .unique();
    if (existingPublicId) {
      return { kind: 'collision' as const, field: 'publicId' as const };
    }

    const invitationId = await ctx.db.insert('accountInvitations', {
      environmentId: context.environment._id,
      accountId: account._id,
      inviterUserId: context.actor._id,
      publicId,
      tokenHash,
      recipientEmail,
      state: 'pending',
      expiresAt,
      createdAt: args.now,
      updatedAt: args.now,
      cleanupAt: expiresAt + RETENTION_MILLISECONDS,
    });
    await ctx.db.patch(account._id, {
      pendingInvitationCount: account.pendingInvitationCount + 1,
      updatedAt: args.now,
    });
    await ctx.db.patch(context.environment._id, {
      accountPolicyStateRevision:
        (context.environment.accountPolicyStateRevision ?? 0) + 1,
    });
    const invitation = await ctx.db.get(invitationId);
    account = {
      ...account,
      pendingInvitationCount: account.pendingInvitationCount + 1,
    };
    if (!invitation) {
      return fail('CONFIGURATION_ERROR', 'Invitation creation failed');
    }
    return {
      kind: 'ok' as const,
      invitation: toInvitationView(invitation, account),
    };
  },
});

export const accept = internalMutation({
  args: {
    environmentKey: v.string(),
    userPublicId: v.string(),
    tokenHash: v.string(),
    membershipPublicId: v.string(),
    now: v.number(),
  },
  returns: acceptInvitationResultValidator,
  handler: async (ctx, args) => {
    const environmentKey = validateBusinessEnvironmentKey(args.environmentKey);
    const userPublicId = publicIdentifierSchema.parse(args.userPublicId);
    const tokenHash = sha256HashSchema.parse(args.tokenHash);
    const membershipPublicId = publicIdentifierSchema.parse(
      args.membershipPublicId,
    );
    const environment = await ctx.db
      .query('businessEnvironments')
      .withIndex('by_key', (query) => query.eq('key', environmentKey))
      .unique();
    if (!environment?.customerAuth) {
      return fail('CONFIGURATION_ERROR', 'Customer login is not configured');
    }
    const invitation = await ctx.db
      .query('accountInvitations')
      .withIndex('by_environment_token_hash', (query) =>
        query.eq('environmentId', environment._id).eq('tokenHash', tokenHash),
      )
      .unique();
    if (!invitation) {
      return fail('UNAUTHENTICATED', 'Invitation is invalid');
    }
    const account = await ctx.db.get(invitation.accountId);
    if (!account || account.environmentId !== environment._id) {
      return fail('CONFIGURATION_ERROR', 'Invitation account is invalid');
    }
    if (invitation.state === 'accepted') {
      const [acceptedUser, acceptedMembership] = await Promise.all([
        invitation.acceptedUserId === undefined
          ? null
          : ctx.db.get(invitation.acceptedUserId),
        invitation.acceptedMembershipId === undefined
          ? null
          : ctx.db.get(invitation.acceptedMembershipId),
      ]);
      if (
        !acceptedUser ||
        !acceptedMembership ||
        acceptedUser.publicId !== userPublicId ||
        acceptedMembership.userId !== acceptedUser._id ||
        acceptedMembership.accountId !== account._id
      ) {
        return fail('UNAUTHENTICATED', 'Invitation is invalid');
      }
      return {
        kind: 'ok' as const,
        account: toAccountSummary(
          environment,
          account,
          acceptedMembership,
          acceptedUser,
        ),
      };
    }
    if (invitation.state !== 'pending') {
      return fail('UNAUTHENTICATED', 'Invitation is invalid');
    }
    if (invitation.expiresAt <= args.now) {
      if (account.pendingInvitationCount < 1) {
        return fail('CONFIGURATION_ERROR', 'Invitation counters are invalid');
      }
      await ctx.db.patch(invitation._id, {
        state: 'expired',
        updatedAt: args.now,
        cleanupAt: args.now + RETENTION_MILLISECONDS,
      });
      await ctx.db.patch(account._id, {
        pendingInvitationCount: account.pendingInvitationCount - 1,
        updatedAt: args.now,
      });
      await ctx.db.patch(environment._id, {
        accountPolicyStateRevision:
          (environment.accountPolicyStateRevision ?? 0) + 1,
      });
      return { kind: 'expired' as const };
    }
    const user = await ctx.db
      .query('businessUsers')
      .withIndex('by_environment_public_id', (query) =>
        query.eq('environmentId', environment._id).eq('publicId', userPublicId),
      )
      .unique();
    if (!user || user.verifiedEmail !== invitation.recipientEmail) {
      return fail('FORBIDDEN', 'Invitation recipient does not match');
    }
    const policy = effectiveInvitationPolicy(
      environment as Doc<'businessEnvironments'> & {
        customerAuth: NonNullable<Doc<'businessEnvironments'>['customerAuth']>;
      },
      account,
    );
    if (!policy.memberInvitationsEnabled) {
      return fail('FORBIDDEN', 'Member invitations are not enabled');
    }
    if (
      account.activeMembershipCount + account.pendingInvitationCount >
      policy.seatLimit
    ) {
      return fail('CAPACITY_CONFLICT', 'Account seat capacity is invalid');
    }
    if (
      user.activeMembershipCount >=
      environment.customerAuth.accountPolicy.maxAccountMembershipsPerUser
    ) {
      return fail('CAPACITY_CONFLICT', 'User membership capacity is full');
    }
    if (
      await findMembershipForAccountUser(
        ctx,
        environment._id,
        account._id,
        user._id,
      )
    ) {
      return fail('CONFLICT', 'User is already an account member');
    }
    if (
      await findMembershipByPublicId(ctx, environment._id, membershipPublicId)
    ) {
      return {
        kind: 'collision' as const,
        field: 'membershipPublicId' as const,
      };
    }
    if (account.pendingInvitationCount < 1) {
      return fail('CONFIGURATION_ERROR', 'Invitation counters are invalid');
    }

    const membershipId = await ctx.db.insert('memberships', {
      environmentId: environment._id,
      accountId: account._id,
      userId: user._id,
      publicId: membershipPublicId,
      role: 'member',
      createdAt: args.now,
      updatedAt: args.now,
    });
    await ctx.db.patch(invitation._id, {
      state: 'accepted',
      acceptedUserId: user._id,
      acceptedMembershipId: membershipId,
      updatedAt: args.now,
      cleanupAt: args.now + RETENTION_MILLISECONDS,
    });
    await ctx.db.patch(account._id, {
      activeMembershipCount: account.activeMembershipCount + 1,
      pendingInvitationCount: account.pendingInvitationCount - 1,
      updatedAt: args.now,
    });
    await ctx.db.patch(user._id, {
      activeMembershipCount: user.activeMembershipCount + 1,
      updatedAt: args.now,
    });
    await ctx.db.patch(environment._id, {
      accountPolicyStateRevision:
        (environment.accountPolicyStateRevision ?? 0) + 1,
    });
    const membership = await ctx.db.get(membershipId);
    if (!membership) {
      return fail('CONFIGURATION_ERROR', 'Membership creation failed');
    }
    return {
      kind: 'ok' as const,
      account: toAccountSummary(
        environment,
        {
          ...account,
          activeMembershipCount: account.activeMembershipCount + 1,
          pendingInvitationCount: account.pendingInvitationCount - 1,
          updatedAt: args.now,
        },
        membership,
        { ...user, activeMembershipCount: user.activeMembershipCount + 1 },
      ),
    };
  },
});

export const revoke = internalMutation({
  args: {
    environmentKey: v.string(),
    accountPublicId: v.string(),
    actorUserPublicId: v.string(),
    invitationPublicId: v.string(),
    now: v.number(),
  },
  returns: invitationViewValidator,
  handler: async (ctx, args) => {
    const environmentKey = validateBusinessEnvironmentKey(args.environmentKey);
    const accountPublicId = publicIdentifierSchema.parse(args.accountPublicId);
    const actorUserPublicId = publicIdentifierSchema.parse(
      args.actorUserPublicId,
    );
    const invitationPublicId = publicIdentifierSchema.parse(
      args.invitationPublicId,
    );
    const context = await authoritativeAccountContext(
      ctx,
      environmentKey,
      accountPublicId,
      actorUserPublicId,
    );
    if (
      context.actorMembership.role !== 'owner' &&
      context.actorMembership.role !== 'admin'
    ) {
      return fail('FORBIDDEN', 'Invitation management is not allowed');
    }
    if (
      context.actorMembership.role === 'admin' &&
      !(
        context.account.policyOverrides?.adminRoleEnabled ??
        context.environment.customerAuth.accountDefaults.adminRoleEnabled
      )
    ) {
      return fail('FORBIDDEN', 'The Admin role is not enabled');
    }
    const invitation = await ctx.db
      .query('accountInvitations')
      .withIndex('by_environment_public_id', (query) =>
        query
          .eq('environmentId', context.environment._id)
          .eq('publicId', invitationPublicId),
      )
      .unique();
    if (
      !invitation ||
      invitation.accountId !== context.account._id ||
      invitation.state !== 'pending'
    ) {
      return fail('NOT_FOUND', 'Pending invitation was not found');
    }
    if (context.account.pendingInvitationCount < 1) {
      return fail('CONFIGURATION_ERROR', 'Invitation counters are invalid');
    }
    const state = invitation.expiresAt <= args.now ? 'expired' : 'revoked';
    await ctx.db.patch(invitation._id, {
      state,
      updatedAt: args.now,
      cleanupAt: args.now + RETENTION_MILLISECONDS,
    });
    await ctx.db.patch(context.account._id, {
      pendingInvitationCount: context.account.pendingInvitationCount - 1,
      updatedAt: args.now,
    });
    await ctx.db.patch(context.environment._id, {
      accountPolicyStateRevision:
        (context.environment.accountPolicyStateRevision ?? 0) + 1,
    });
    return toInvitationView({ ...invitation, state }, context.account);
  },
});
