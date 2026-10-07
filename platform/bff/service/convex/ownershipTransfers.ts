import { z } from 'zod';
import { v } from 'convex/values';

import {
  HANDOFF_CODE_TTL_SECONDS,
  LOGIN_TRANSACTION_TTL_SECONDS,
  OWNERSHIP_TRANSFER_PROOF_TTL_SECONDS,
  publicIdentifierSchema,
  relativeApplicationPathSchema,
} from '@bff/contracts';
import type { Doc } from './_generated/dataModel';
import { internalMutation, type MutationCtx } from './_generated/server';
import { validateBusinessEnvironmentKey } from './lib/businessEnvironment';
import { fail } from './lib/errors';
import { findMembershipByPublicId } from './memberships';
import { recordSecurityEvent } from './securityEvents';

const DAY_MILLISECONDS = 24 * 60 * 60 * 1_000;
const LOGIN_TRANSACTION_TTL_MILLISECONDS =
  LOGIN_TRANSACTION_TTL_SECONDS * 1_000;
const HANDOFF_CODE_TTL_MILLISECONDS = HANDOFF_CODE_TTL_SECONDS * 1_000;
const TRANSFER_PROOF_TTL_MILLISECONDS =
  OWNERSHIP_TRANSFER_PROOF_TTL_SECONDS * 1_000;
const browserBindingSchema = z
  .string()
  .min(32)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u);
const pkceChallengeSchema = z
  .string()
  .length(43)
  .regex(/^[A-Za-z0-9_-]+$/u);
const sha256HashSchema = z
  .string()
  .length(43)
  .regex(/^[A-Za-z0-9_-]+$/u);

const startResultValidator = v.union(
  v.object({ kind: v.literal('collision') }),
  v.object({
    kind: v.literal('ok'),
    reference: v.string(),
    expiresAt: v.number(),
  }),
);

const providerCompletionResultValidator = v.union(
  v.object({
    kind: v.literal('collision'),
    field: v.literal('handoffCodeHash'),
  }),
  v.object({
    kind: v.literal('ok'),
    callbackUrl: v.string(),
    webOrigin: v.string(),
    returnPath: v.string(),
    state: v.string(),
    handoffCodeExpiresAt: v.number(),
  }),
);

const proofExchangeResultValidator = v.union(
  v.object({
    kind: v.literal('collision'),
    field: v.union(v.literal('proofHash'), v.literal('proofPublicId')),
  }),
  v.object({
    kind: v.literal('ok'),
    proofPublicId: v.string(),
    webOrigin: v.string(),
    returnPath: v.string(),
    expiresAt: v.number(),
  }),
);

const transferResultValidator = v.object({
  accountId: v.string(),
  previousOwnerUserId: v.string(),
  newOwnerUserId: v.string(),
  completedAt: v.number(),
  replayed: v.boolean(),
});

function requireConfiguredEnvironment(
  environment: Doc<'businessEnvironments'> | null,
): Doc<'businessEnvironments'> & {
  customerAuth: NonNullable<Doc<'businessEnvironments'>['customerAuth']>;
} {
  if (!environment?.customerAuth) {
    return fail('CONFIGURATION_ERROR', 'Customer login is not configured');
  }
  return environment as Doc<'businessEnvironments'> & {
    customerAuth: NonNullable<Doc<'businessEnvironments'>['customerAuth']>;
  };
}

async function findEnvironment(ctx: MutationCtx, environmentKey: string) {
  return await ctx.db
    .query('businessEnvironments')
    .withIndex('by_key', (query) => query.eq('key', environmentKey))
    .unique();
}

async function findTransaction(
  ctx: MutationCtx,
  environment: Doc<'businessEnvironments'>,
  reference: string,
) {
  return await ctx.db
    .query('loginTransactions')
    .withIndex('by_environment_reference', (query) =>
      query
        .eq('environmentId', environment._id)
        .eq('publicReference', reference),
    )
    .unique();
}

function activeSession(session: Doc<'businessSessions'>, now: number) {
  return (
    session.revokedAt === undefined &&
    session.idleExpiresAt > now &&
    session.absoluteExpiresAt > now
  );
}

async function requireTransferActors(
  ctx: MutationCtx,
  environment: Doc<'businessEnvironments'> & {
    customerAuth: NonNullable<Doc<'businessEnvironments'>['customerAuth']>;
  },
  session: Doc<'businessSessions'>,
  accountPublicId: string,
  targetMembershipPublicId: string,
) {
  const account = await ctx.db
    .query('accounts')
    .withIndex('by_environment_public_id', (query) =>
      query
        .eq('environmentId', environment._id)
        .eq('publicId', accountPublicId),
    )
    .unique();
  const targetMembership = await findMembershipByPublicId(
    ctx,
    environment._id,
    targetMembershipPublicId,
  );
  if (
    !account ||
    !targetMembership ||
    targetMembership.accountId !== account._id
  ) {
    return fail('NOT_FOUND', 'Ownership transfer target was not found');
  }
  const ownerMembership = await ctx.db
    .query('memberships')
    .withIndex('by_environment_account_user', (query) =>
      query
        .eq('environmentId', environment._id)
        .eq('accountId', account._id)
        .eq('userId', session.userId),
    )
    .unique();
  if (
    ownerMembership?.role !== 'owner' ||
    account.ownerUserId !== session.userId ||
    targetMembership.role === 'owner'
  ) {
    return fail('FORBIDDEN', 'Only the current Owner can transfer ownership');
  }
  return { account, ownerMembership, targetMembership };
}

export const start = internalMutation({
  args: {
    environmentKey: v.string(),
    handleHash: v.string(),
    accountPublicId: v.string(),
    targetMembershipPublicId: v.string(),
    reference: v.string(),
    state: v.string(),
    providerNonce: v.string(),
    pkceChallenge: v.string(),
    callbackUrl: v.string(),
    webOrigin: v.string(),
    returnPath: v.string(),
    now: v.number(),
  },
  returns: startResultValidator,
  handler: async (ctx, args) => {
    const environmentKey = validateBusinessEnvironmentKey(args.environmentKey);
    const handleHash = sha256HashSchema.parse(args.handleHash);
    const accountPublicId = publicIdentifierSchema.parse(args.accountPublicId);
    const targetMembershipPublicId = publicIdentifierSchema.parse(
      args.targetMembershipPublicId,
    );
    const reference = publicIdentifierSchema.parse(args.reference);
    const state = browserBindingSchema.parse(args.state);
    const providerNonce = browserBindingSchema.parse(args.providerNonce);
    const pkceChallenge = pkceChallengeSchema.parse(args.pkceChallenge);
    const returnPath = relativeApplicationPathSchema.parse(args.returnPath);
    const environment = requireConfiguredEnvironment(
      await findEnvironment(ctx, environmentKey),
    );
    if (!environment.customerAuth.accountPolicy.ownershipTransferEnabled) {
      return fail('FORBIDDEN', 'Ownership transfer is not enabled');
    }
    if (args.callbackUrl !== environment.customerAuth.callbackUrl) {
      return fail(
        'VALIDATION_ERROR',
        'Authentication callback is not registered',
      );
    }
    if (
      !environment.customerAuth.transport.webOrigins.includes(args.webOrigin)
    ) {
      return fail('VALIDATION_ERROR', 'Web origin is not registered');
    }
    const session = await ctx.db
      .query('businessSessions')
      .withIndex('by_handle_hash', (query) =>
        query.eq('handleHash', handleHash),
      )
      .unique();
    if (
      !session ||
      session.environmentId !== environment._id ||
      !activeSession(session, args.now)
    ) {
      return fail('UNAUTHENTICATED', 'Customer session is unavailable');
    }
    const actors = await requireTransferActors(
      ctx,
      environment,
      session,
      accountPublicId,
      targetMembershipPublicId,
    );
    if (await findTransaction(ctx, environment, reference)) {
      return { kind: 'collision' as const };
    }

    const expiresAt = args.now + LOGIN_TRANSACTION_TTL_MILLISECONDS;
    await ctx.db.insert('loginTransactions', {
      environmentId: environment._id,
      publicReference: reference,
      purpose: 'ownership_transfer',
      status: 'pending_provider',
      callbackUrl: environment.customerAuth.callbackUrl,
      webOrigin: args.webOrigin,
      returnPath,
      state,
      providerNonce,
      pkceChallenge,
      transferBinding: {
        sessionId: session._id,
        accountId: actors.account._id,
        targetMembershipId: actors.targetMembership._id,
      },
      createdAt: args.now,
      expiresAt,
      cleanupAt: expiresAt + DAY_MILLISECONDS,
    });
    return { kind: 'ok' as const, reference, expiresAt };
  },
});

export const completeProvider = internalMutation({
  args: {
    environmentKey: v.string(),
    reference: v.string(),
    providerNonce: v.string(),
    provider: v.union(v.literal('google'), v.literal('development')),
    issuer: v.string(),
    subject: v.string(),
    authenticatedAt: v.number(),
    handoffCodeHash: v.string(),
    now: v.number(),
  },
  returns: providerCompletionResultValidator,
  handler: async (ctx, args) => {
    const environmentKey = validateBusinessEnvironmentKey(args.environmentKey);
    const reference = publicIdentifierSchema.parse(args.reference);
    const providerNonce = browserBindingSchema.parse(args.providerNonce);
    const handoffCodeHash = sha256HashSchema.parse(args.handoffCodeHash);
    const environment = requireConfiguredEnvironment(
      await findEnvironment(ctx, environmentKey),
    );
    const transaction = await findTransaction(ctx, environment, reference);
    if (
      !transaction ||
      transaction.purpose !== 'ownership_transfer' ||
      transaction.status !== 'pending_provider' ||
      transaction.expiresAt <= args.now ||
      transaction.providerNonce !== providerNonce ||
      transaction.transferBinding === undefined
    ) {
      return fail('CONFLICT', 'Ownership confirmation cannot be completed');
    }
    if (
      (args.provider === 'google' &&
        !environment.customerAuth.enabledProviders.includes('google')) ||
      (args.provider === 'development' &&
        !environment.customerAuth.developmentAutomationEnabled)
    ) {
      return fail('FORBIDDEN', 'Identity provider is not enabled');
    }
    if (
      args.authenticatedAt > Math.floor(args.now / 1_000) + 60 ||
      args.authenticatedAt <
        Math.floor(args.now / 1_000) - OWNERSHIP_TRANSFER_PROOF_TTL_SECONDS
    ) {
      return fail('UNAUTHENTICATED', 'Fresh authentication is required');
    }
    const session = await ctx.db.get(transaction.transferBinding.sessionId);
    if (
      !session ||
      session.environmentId !== environment._id ||
      !activeSession(session, args.now)
    ) {
      return fail('UNAUTHENTICATED', 'Customer session is unavailable');
    }
    const ownerUser = await ctx.db.get(session.userId);
    if (!ownerUser || ownerUser.environmentId !== environment._id) {
      return fail('CONFIGURATION_ERROR', 'Customer session is invalid');
    }
    const identity = await ctx.db
      .query('authIdentities')
      .withIndex('by_provider_issuer_subject', (query) =>
        query
          .eq('provider', args.provider)
          .eq('issuer', args.issuer)
          .eq('subject', args.subject),
      )
      .unique();
    if (!identity || identity.principalId !== ownerUser.principalId) {
      return fail('UNAUTHENTICATED', 'Authentication must match the Owner');
    }
    const existingCode = await ctx.db
      .query('loginTransactions')
      .withIndex('by_environment_code_hash', (query) =>
        query
          .eq('environmentId', environment._id)
          .eq('handoffCodeHash', handoffCodeHash),
      )
      .unique();
    if (existingCode) {
      return { kind: 'collision' as const, field: 'handoffCodeHash' as const };
    }

    const handoffCodeExpiresAt = args.now + HANDOFF_CODE_TTL_MILLISECONDS;
    await ctx.db.patch(transaction._id, {
      status: 'provider_completed',
      verifiedProvider: args.provider,
      verifiedPrincipalId: ownerUser.principalId,
      verifiedUserId: ownerUser._id,
      providerAuthenticatedAt: args.authenticatedAt,
      handoffCodeHash,
      handoffCodeExpiresAt,
      providerCompletedAt: args.now,
      cleanupAt:
        Math.max(transaction.expiresAt, handoffCodeExpiresAt) +
        DAY_MILLISECONDS,
    });
    return {
      kind: 'ok' as const,
      callbackUrl: transaction.callbackUrl,
      webOrigin:
        transaction.webOrigin ??
        fail('CONFIGURATION_ERROR', 'Transfer origin is missing'),
      returnPath: transaction.returnPath,
      state: transaction.state,
      handoffCodeExpiresAt,
    };
  },
});

export const completeDevelopmentProvider = internalMutation({
  args: {
    environmentKey: v.string(),
    reference: v.string(),
    userPublicId: v.string(),
    grantHash: v.string(),
    grantIdHash: v.string(),
    authenticatedAt: v.number(),
    handoffCodeHash: v.string(),
    now: v.number(),
  },
  returns: providerCompletionResultValidator,
  handler: async (ctx, args) => {
    const environmentKey = validateBusinessEnvironmentKey(args.environmentKey);
    const reference = publicIdentifierSchema.parse(args.reference);
    const userPublicId = publicIdentifierSchema.parse(args.userPublicId);
    const grantHash = sha256HashSchema.parse(args.grantHash);
    const grantIdHash = sha256HashSchema.parse(args.grantIdHash);
    const handoffCodeHash = sha256HashSchema.parse(args.handoffCodeHash);
    const environment = requireConfiguredEnvironment(
      await findEnvironment(ctx, environmentKey),
    );
    if (!environment.customerAuth.developmentAutomationEnabled) {
      return fail('FORBIDDEN', 'Development automation is not enabled');
    }
    const transaction = await findTransaction(ctx, environment, reference);
    if (
      !transaction ||
      transaction.purpose !== 'ownership_transfer' ||
      transaction.status !== 'pending_provider' ||
      transaction.expiresAt <= args.now ||
      transaction.transferBinding === undefined
    ) {
      return fail('CONFLICT', 'Ownership confirmation cannot be completed');
    }
    if (
      args.authenticatedAt > Math.floor(args.now / 1_000) + 60 ||
      args.authenticatedAt <
        Math.floor(args.now / 1_000) - OWNERSHIP_TRANSFER_PROOF_TTL_SECONDS
    ) {
      return fail('UNAUTHENTICATED', 'Fresh authentication is required');
    }
    if (
      await ctx.db
        .query('loginTransactions')
        .withIndex('by_development_grant_hash', (query) =>
          query.eq('developmentGrantHash', grantHash),
        )
        .unique()
    ) {
      return fail('CONFLICT', 'Development grant was already used');
    }
    const session = await ctx.db.get(transaction.transferBinding.sessionId);
    if (
      !session ||
      session.environmentId !== environment._id ||
      !activeSession(session, args.now)
    ) {
      return fail('UNAUTHENTICATED', 'Customer session is unavailable');
    }
    const ownerUser = await ctx.db.get(session.userId);
    if (
      !ownerUser ||
      ownerUser.environmentId !== environment._id ||
      ownerUser.publicId !== userPublicId
    ) {
      return fail('UNAUTHENTICATED', 'Authentication must match the Owner');
    }
    const existingCode = await ctx.db
      .query('loginTransactions')
      .withIndex('by_environment_code_hash', (query) =>
        query
          .eq('environmentId', environment._id)
          .eq('handoffCodeHash', handoffCodeHash),
      )
      .unique();
    if (existingCode) {
      return { kind: 'collision' as const, field: 'handoffCodeHash' as const };
    }

    const handoffCodeExpiresAt = args.now + HANDOFF_CODE_TTL_MILLISECONDS;
    await ctx.db.patch(transaction._id, {
      status: 'provider_completed',
      verifiedProvider: 'development',
      verifiedPrincipalId: ownerUser.principalId,
      verifiedUserId: ownerUser._id,
      providerAuthenticatedAt: args.authenticatedAt,
      handoffCodeHash,
      handoffCodeExpiresAt,
      providerCompletedAt: args.now,
      developmentGrantHash: grantHash,
      cleanupAt:
        Math.max(transaction.expiresAt, handoffCodeExpiresAt) +
        DAY_MILLISECONDS,
    });
    await recordSecurityEvent(ctx, {
      environmentId: environment._id,
      userId: ownerUser._id,
      accountId: transaction.transferBinding.accountId,
      sessionId: session._id,
      type: 'development_automation_used',
      automationCapability: 'ownership_transfer',
      automationTarget: ownerUser.publicId,
      grantIdHash,
      correlationId: reference,
      occurredAt: args.now,
    });
    return {
      kind: 'ok' as const,
      callbackUrl: transaction.callbackUrl,
      webOrigin:
        transaction.webOrigin ??
        fail('CONFIGURATION_ERROR', 'Transfer origin is missing'),
      returnPath: transaction.returnPath,
      state: transaction.state,
      handoffCodeExpiresAt,
    };
  },
});

export const exchangeProof = internalMutation({
  args: {
    environmentKey: v.string(),
    handoffCodeHash: v.string(),
    pkceChallenge: v.string(),
    callbackUrl: v.string(),
    proofHash: v.string(),
    proofPublicId: v.string(),
    now: v.number(),
  },
  returns: proofExchangeResultValidator,
  handler: async (ctx, args) => {
    const environmentKey = validateBusinessEnvironmentKey(args.environmentKey);
    const handoffCodeHash = sha256HashSchema.parse(args.handoffCodeHash);
    const pkceChallenge = pkceChallengeSchema.parse(args.pkceChallenge);
    const proofHash = sha256HashSchema.parse(args.proofHash);
    const proofPublicId = publicIdentifierSchema.parse(args.proofPublicId);
    const environment = requireConfiguredEnvironment(
      await findEnvironment(ctx, environmentKey),
    );
    const transaction = await ctx.db
      .query('loginTransactions')
      .withIndex('by_environment_code_hash', (query) =>
        query
          .eq('environmentId', environment._id)
          .eq('handoffCodeHash', handoffCodeHash),
      )
      .unique();
    if (
      !transaction ||
      transaction.purpose !== 'ownership_transfer' ||
      transaction.status !== 'provider_completed' ||
      transaction.expiresAt <= args.now ||
      transaction.handoffCodeExpiresAt === undefined ||
      transaction.handoffCodeExpiresAt <= args.now ||
      transaction.pkceChallenge !== pkceChallenge ||
      transaction.callbackUrl !== args.callbackUrl ||
      args.callbackUrl !== environment.customerAuth.callbackUrl ||
      transaction.transferBinding === undefined ||
      transaction.verifiedUserId === undefined
    ) {
      return fail('UNAUTHENTICATED', 'Ownership confirmation was rejected');
    }
    const transferBinding = transaction.transferBinding;
    const verifiedUserId = transaction.verifiedUserId;
    if (
      await ctx.db
        .query('ownershipTransferProofs')
        .withIndex('by_environment_proof_hash', (query) =>
          query.eq('environmentId', environment._id).eq('proofHash', proofHash),
        )
        .unique()
    ) {
      return { kind: 'collision' as const, field: 'proofHash' as const };
    }
    if (
      await ctx.db
        .query('ownershipTransferProofs')
        .withIndex('by_environment_public_id', (query) =>
          query
            .eq('environmentId', environment._id)
            .eq('publicId', proofPublicId),
        )
        .unique()
    ) {
      return { kind: 'collision' as const, field: 'proofPublicId' as const };
    }

    const expiresAt = Math.min(
      args.now + TRANSFER_PROOF_TTL_MILLISECONDS,
      transaction.expiresAt,
    );
    const currentOwnerMembership = await ctx.db
      .query('memberships')
      .withIndex('by_environment_account_user', (query) =>
        query
          .eq('environmentId', environment._id)
          .eq('accountId', transferBinding.accountId)
          .eq('userId', verifiedUserId),
      )
      .unique();
    if (currentOwnerMembership?.role !== 'owner') {
      return fail('CONFLICT', 'Ownership changed during confirmation');
    }
    await ctx.db.insert('ownershipTransferProofs', {
      environmentId: environment._id,
      accountId: transferBinding.accountId,
      sessionId: transferBinding.sessionId,
      currentOwnerMembershipId: currentOwnerMembership._id,
      targetMembershipId: transferBinding.targetMembershipId,
      publicId: proofPublicId,
      proofHash,
      expiresAt,
      createdAt: args.now,
      cleanupAt: expiresAt + DAY_MILLISECONDS,
    });
    await ctx.db.patch(transaction._id, {
      status: 'exchanged',
      consumedAt: args.now,
    });
    return {
      kind: 'ok' as const,
      proofPublicId,
      webOrigin:
        transaction.webOrigin ??
        fail('CONFIGURATION_ERROR', 'Transfer origin is missing'),
      returnPath: transaction.returnPath,
      expiresAt,
    };
  },
});

async function replayedTransferResult(
  ctx: MutationCtx,
  proof: Doc<'ownershipTransferProofs'>,
) {
  if (proof.auditId === undefined) {
    return fail('CONFLICT', 'Ownership transfer proof is invalid');
  }
  const audit = await ctx.db.get(proof.auditId);
  if (!audit) return fail('CONFIGURATION_ERROR', 'Transfer audit is missing');
  return {
    accountId: audit.accountPublicId,
    previousOwnerUserId: audit.previousOwnerUserPublicId,
    newOwnerUserId: audit.newOwnerUserPublicId,
    completedAt: audit.occurredAt,
    replayed: true,
  };
}

export const transfer = internalMutation({
  args: {
    environmentKey: v.string(),
    proofHash: v.string(),
    now: v.number(),
  },
  returns: transferResultValidator,
  handler: async (ctx, args) => {
    const environmentKey = validateBusinessEnvironmentKey(args.environmentKey);
    const proofHash = sha256HashSchema.parse(args.proofHash);
    const environment = requireConfiguredEnvironment(
      await findEnvironment(ctx, environmentKey),
    );
    const proof = await ctx.db
      .query('ownershipTransferProofs')
      .withIndex('by_environment_proof_hash', (query) =>
        query.eq('environmentId', environment._id).eq('proofHash', proofHash),
      )
      .unique();
    if (!proof) return fail('UNAUTHENTICATED', 'Transfer proof is invalid');
    if (proof.consumedAt !== undefined) {
      return await replayedTransferResult(ctx, proof);
    }
    if (proof.expiresAt <= args.now) {
      return fail('UNAUTHENTICATED', 'Transfer proof expired');
    }
    if (!environment.customerAuth.accountPolicy.ownershipTransferEnabled) {
      return fail('FORBIDDEN', 'Ownership transfer is not enabled');
    }
    const [session, account, previousOwnerMembership, newOwnerMembership] =
      await Promise.all([
        ctx.db.get(proof.sessionId),
        ctx.db.get(proof.accountId),
        ctx.db.get(proof.currentOwnerMembershipId),
        ctx.db.get(proof.targetMembershipId),
      ]);
    if (
      !session ||
      !account ||
      !previousOwnerMembership ||
      !newOwnerMembership ||
      session.environmentId !== environment._id ||
      account.environmentId !== environment._id ||
      !activeSession(session, args.now) ||
      account.ownerUserId !== previousOwnerMembership.userId ||
      previousOwnerMembership.userId !== session.userId ||
      previousOwnerMembership.accountId !== account._id ||
      previousOwnerMembership.role !== 'owner' ||
      newOwnerMembership.accountId !== account._id ||
      newOwnerMembership.role === 'owner'
    ) {
      return fail('CONFLICT', 'Ownership changed during confirmation');
    }
    const [previousOwner, newOwner] = await Promise.all([
      ctx.db.get(previousOwnerMembership.userId),
      ctx.db.get(newOwnerMembership.userId),
    ]);
    if (
      !previousOwner ||
      !newOwner ||
      previousOwner.ownedAccountCount < 1 ||
      newOwner.ownedAccountCount >=
        environment.customerAuth.accountPolicy.maxOwnedAccountsPerUser
    ) {
      return fail('CAPACITY_CONFLICT', 'New Owner capacity is full');
    }

    const previousOwnerRole =
      (account.policyOverrides?.adminRoleEnabled ??
      environment.customerAuth.accountDefaults.adminRoleEnabled)
        ? ('admin' as const)
        : ('member' as const);
    await ctx.db.patch(previousOwnerMembership._id, {
      role: previousOwnerRole,
      updatedAt: args.now,
    });
    await ctx.db.patch(newOwnerMembership._id, {
      role: 'owner',
      updatedAt: args.now,
    });
    await ctx.db.patch(account._id, {
      ownerUserId: newOwner._id,
      updatedAt: args.now,
    });
    await ctx.db.patch(previousOwner._id, {
      ownedAccountCount: previousOwner.ownedAccountCount - 1,
      updatedAt: args.now,
    });
    await ctx.db.patch(newOwner._id, {
      ownedAccountCount: newOwner.ownedAccountCount + 1,
      updatedAt: args.now,
    });
    const auditId = await ctx.db.insert('ownershipTransferAudits', {
      environmentId: environment._id,
      accountId: account._id,
      sessionId: session._id,
      proofId: proof._id,
      previousOwnerUserId: previousOwner._id,
      newOwnerUserId: newOwner._id,
      previousOwnerMembershipId: previousOwnerMembership._id,
      newOwnerMembershipId: newOwnerMembership._id,
      accountPublicId: account.publicId,
      sessionPublicId: session.publicId,
      proofPublicId: proof.publicId,
      previousOwnerUserPublicId: previousOwner.publicId,
      newOwnerUserPublicId: newOwner.publicId,
      previousOwnerMembershipPublicId: previousOwnerMembership.publicId,
      newOwnerMembershipPublicId: newOwnerMembership.publicId,
      occurredAt: args.now,
    });
    await ctx.db.patch(proof._id, { consumedAt: args.now, auditId });
    await ctx.db.patch(environment._id, {
      accountPolicyStateRevision:
        (environment.accountPolicyStateRevision ?? 0) + 1,
    });
    await recordSecurityEvent(ctx, {
      environmentId: environment._id,
      userId: newOwner._id,
      accountId: account._id,
      sessionId: session._id,
      type: 'ownership_transferred',
      correlationId: proof.publicId,
      occurredAt: args.now,
    });
    return {
      accountId: account.publicId,
      previousOwnerUserId: previousOwner.publicId,
      newOwnerUserId: newOwner.publicId,
      completedAt: args.now,
      replayed: false,
    };
  },
});
