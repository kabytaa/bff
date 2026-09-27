import { z } from 'zod';
import { v } from 'convex/values';

import {
  HANDOFF_CODE_TTL_SECONDS,
  LOGIN_TRANSACTION_TTL_SECONDS,
  publicIdentifierSchema,
  relativeApplicationPathSchema,
} from '@bff/contracts';
import { CUSTOMER_DEVELOPMENT_AUTOMATION_ISSUER } from '@bff/static-config';
import type { Doc } from './_generated/dataModel';
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server';
import {
  bootstrapCustomerInMutation,
  type BootstrapCustomerInput,
} from './customerAuth';
import { validateBusinessEnvironmentKey } from './lib/businessEnvironment';
import { fail } from './lib/errors';
import { recordSecurityEvent } from './securityEvents';

const DAY_MILLISECONDS = 24 * 60 * 60 * 1_000;
const LOGIN_TRANSACTION_TTL_MILLISECONDS =
  LOGIN_TRANSACTION_TTL_SECONDS * 1_000;
const HANDOFF_CODE_TTL_MILLISECONDS = HANDOFF_CODE_TTL_SECONDS * 1_000;

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

const transactionChallengeValidator = v.object({
  reference: v.string(),
  environmentKey: v.string(),
  purpose: v.union(v.literal('login'), v.literal('ownership_transfer')),
  enabledProviders: v.array(v.literal('google')),
  providerNonce: v.string(),
  callbackUrl: v.string(),
  expiresAt: v.number(),
});

const completionResultValidator = v.union(
  v.object({
    kind: v.literal('collision'),
    field: v.union(
      v.literal('userPublicId'),
      v.literal('accountPublicId'),
      v.literal('membershipPublicId'),
      v.literal('handoffCodeHash'),
    ),
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

const developmentCompletionTargetValidator = v.union(
  v.object({
    capability: v.literal('signup'),
    personaId: v.string(),
    profile: v.object({
      verifiedEmail: v.string(),
      displayName: v.string(),
      pictureUrl: v.optional(v.string()),
    }),
  }),
  v.object({
    capability: v.literal('login_as'),
    userPublicId: v.string(),
  }),
);

async function findEnvironment(
  ctx: QueryCtx | MutationCtx,
  environmentKey: string,
) {
  return await ctx.db
    .query('businessEnvironments')
    .withIndex('by_key', (query) => query.eq('key', environmentKey))
    .unique();
}

async function findByReference(
  ctx: QueryCtx | MutationCtx,
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

export const startLogin = internalMutation({
  args: {
    environmentKey: v.string(),
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
    const environment = requireConfiguredEnvironment(
      await findEnvironment(ctx, environmentKey),
    );
    const reference = publicIdentifierSchema.parse(args.reference);
    const state = browserBindingSchema.parse(args.state);
    const providerNonce = browserBindingSchema.parse(args.providerNonce);
    const pkceChallenge = pkceChallengeSchema.parse(args.pkceChallenge);
    const returnPath = relativeApplicationPathSchema.parse(args.returnPath);
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
    if (await findByReference(ctx, environment, reference)) {
      return { kind: 'collision' as const };
    }

    const expiresAt = args.now + LOGIN_TRANSACTION_TTL_MILLISECONDS;
    await ctx.db.insert('loginTransactions', {
      environmentId: environment._id,
      publicReference: reference,
      purpose: 'login',
      status: 'pending_provider',
      callbackUrl: environment.customerAuth.callbackUrl,
      webOrigin: args.webOrigin,
      returnPath,
      state,
      providerNonce,
      pkceChallenge,
      createdAt: args.now,
      expiresAt,
      cleanupAt: expiresAt + DAY_MILLISECONDS,
    });
    return { kind: 'ok' as const, reference, expiresAt };
  },
});

export const readChallenge = internalQuery({
  args: {
    environmentKey: v.string(),
    reference: v.string(),
    now: v.number(),
  },
  returns: transactionChallengeValidator,
  handler: async (ctx, args) => {
    const environmentKey = validateBusinessEnvironmentKey(args.environmentKey);
    const environment = requireConfiguredEnvironment(
      await findEnvironment(ctx, environmentKey),
    );
    const reference = publicIdentifierSchema.parse(args.reference);
    const transaction = await findByReference(ctx, environment, reference);
    if (
      !transaction ||
      transaction.status !== 'pending_provider' ||
      transaction.expiresAt <= args.now
    ) {
      return fail('NOT_FOUND', 'Login transaction was not found');
    }

    return {
      reference,
      environmentKey,
      purpose: transaction.purpose,
      enabledProviders: environment.customerAuth.enabledProviders,
      providerNonce: transaction.providerNonce,
      callbackUrl: transaction.callbackUrl,
      expiresAt: transaction.expiresAt,
    };
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
    profile: v.object({
      verifiedEmail: v.string(),
      displayName: v.string(),
      pictureUrl: v.optional(v.string()),
    }),
    authenticatedAt: v.number(),
    candidates: v.object({
      userPublicId: v.string(),
      accountPublicId: v.string(),
      membershipPublicId: v.string(),
    }),
    handoffCodeHash: v.string(),
    now: v.number(),
  },
  returns: completionResultValidator,
  handler: async (ctx, args) => {
    const environmentKey = validateBusinessEnvironmentKey(args.environmentKey);
    const environment = requireConfiguredEnvironment(
      await findEnvironment(ctx, environmentKey),
    );
    const reference = publicIdentifierSchema.parse(args.reference);
    const providerNonce = browserBindingSchema.parse(args.providerNonce);
    const handoffCodeHash = sha256HashSchema.parse(args.handoffCodeHash);
    const transaction = await findByReference(ctx, environment, reference);
    if (
      !transaction ||
      transaction.purpose !== 'login' ||
      transaction.status !== 'pending_provider' ||
      transaction.expiresAt <= args.now ||
      transaction.providerNonce !== providerNonce ||
      transaction.callbackUrl !== environment.customerAuth.callbackUrl
    ) {
      return fail('CONFLICT', 'Login transaction cannot be completed');
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
      return {
        kind: 'collision' as const,
        field: 'handoffCodeHash' as const,
      };
    }

    const bootstrapInput: BootstrapCustomerInput = {
      environmentKey,
      provider: args.provider,
      issuer: args.issuer,
      subject: args.subject,
      profile: args.profile,
      candidates: args.candidates,
      now: args.now,
    };
    const bootstrap = await bootstrapCustomerInMutation(ctx, bootstrapInput);
    if (bootstrap.kind === 'collision') return bootstrap;

    const handoffCodeExpiresAt = args.now + HANDOFF_CODE_TTL_MILLISECONDS;
    await ctx.db.patch(transaction._id, {
      status: 'provider_completed',
      verifiedProvider: args.provider,
      verifiedPrincipalId: bootstrap.principalId,
      verifiedUserId: bootstrap.userId,
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
        fail('CONFIGURATION_ERROR', 'Login transaction origin is missing'),
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
    target: developmentCompletionTargetValidator,
    grantHash: v.string(),
    grantIdHash: v.string(),
    handoffCodeHash: v.string(),
    authenticatedAt: v.number(),
    candidates: v.object({
      userPublicId: v.string(),
      accountPublicId: v.string(),
      membershipPublicId: v.string(),
    }),
    now: v.number(),
  },
  returns: completionResultValidator,
  handler: async (ctx, args) => {
    const environmentKey = validateBusinessEnvironmentKey(args.environmentKey);
    const environment = requireConfiguredEnvironment(
      await findEnvironment(ctx, environmentKey),
    );
    if (!environment.customerAuth.developmentAutomationEnabled) {
      return fail('FORBIDDEN', 'Development automation is not enabled');
    }
    const reference = publicIdentifierSchema.parse(args.reference);
    const grantHash = sha256HashSchema.parse(args.grantHash);
    const grantIdHash = sha256HashSchema.parse(args.grantIdHash);
    const handoffCodeHash = sha256HashSchema.parse(args.handoffCodeHash);
    const transaction = await findByReference(ctx, environment, reference);
    if (
      !transaction ||
      transaction.purpose !== 'login' ||
      transaction.status !== 'pending_provider' ||
      transaction.expiresAt <= args.now ||
      transaction.callbackUrl !== environment.customerAuth.callbackUrl
    ) {
      return fail('CONFLICT', 'Login transaction cannot be completed');
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
    const existingCode = await ctx.db
      .query('loginTransactions')
      .withIndex('by_environment_code_hash', (query) =>
        query
          .eq('environmentId', environment._id)
          .eq('handoffCodeHash', handoffCodeHash),
      )
      .unique();
    if (existingCode) {
      return {
        kind: 'collision' as const,
        field: 'handoffCodeHash' as const,
      };
    }

    let principalId: Doc<'businessUsers'>['principalId'];
    let userId: Doc<'businessUsers'>['_id'];
    let automationTarget: string;
    if (args.target.capability === 'signup') {
      const bootstrap = await bootstrapCustomerInMutation(ctx, {
        environmentKey,
        provider: 'development',
        issuer: CUSTOMER_DEVELOPMENT_AUTOMATION_ISSUER,
        subject: `persona:${args.target.personaId}`,
        profile: args.target.profile,
        candidates: args.candidates,
        now: args.now,
      });
      if (bootstrap.kind === 'collision') return bootstrap;
      principalId = bootstrap.principalId;
      userId = bootstrap.userId;
      automationTarget = args.target.personaId;
    } else {
      const userPublicId = publicIdentifierSchema.parse(
        args.target.userPublicId,
      );
      const user = await ctx.db
        .query('businessUsers')
        .withIndex('by_environment_public_id', (query) =>
          query
            .eq('environmentId', environment._id)
            .eq('publicId', userPublicId),
        )
        .unique();
      if (!user)
        return fail('NOT_FOUND', 'Development login target is missing');
      principalId = user.principalId;
      userId = user._id;
      automationTarget = user.publicId;
    }

    const handoffCodeExpiresAt = args.now + HANDOFF_CODE_TTL_MILLISECONDS;
    await ctx.db.patch(transaction._id, {
      status: 'provider_completed',
      verifiedProvider: 'development',
      verifiedPrincipalId: principalId,
      verifiedUserId: userId,
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
      userId,
      type: 'development_automation_used',
      automationCapability: args.target.capability,
      automationTarget,
      grantIdHash,
      correlationId: reference,
      occurredAt: args.now,
    });
    return {
      kind: 'ok' as const,
      callbackUrl: transaction.callbackUrl,
      webOrigin:
        transaction.webOrigin ??
        fail('CONFIGURATION_ERROR', 'Login transaction origin is missing'),
      returnPath: transaction.returnPath,
      state: transaction.state,
      handoffCodeExpiresAt,
    };
  },
});

export interface LoginExchangeInput {
  environmentKey: string;
  handoffCodeHash: string;
  pkceChallenge: string;
  callbackUrl: string;
  now: number;
}

export async function requireExchangeableLoginTransaction(
  ctx: MutationCtx,
  input: LoginExchangeInput,
) {
  const environmentKey = validateBusinessEnvironmentKey(input.environmentKey);
  const environment = requireConfiguredEnvironment(
    await findEnvironment(ctx, environmentKey),
  );
  const handoffCodeHash = sha256HashSchema.parse(input.handoffCodeHash);
  const pkceChallenge = pkceChallengeSchema.parse(input.pkceChallenge);
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
    transaction.purpose !== 'login' ||
    transaction.status !== 'provider_completed' ||
    transaction.handoffCodeExpiresAt === undefined ||
    transaction.handoffCodeExpiresAt <= input.now ||
    transaction.pkceChallenge !== pkceChallenge ||
    transaction.callbackUrl !== input.callbackUrl ||
    input.callbackUrl !== environment.customerAuth.callbackUrl ||
    transaction.verifiedProvider === undefined ||
    transaction.verifiedUserId === undefined ||
    transaction.verifiedPrincipalId === undefined ||
    transaction.providerAuthenticatedAt === undefined
  ) {
    return fail('UNAUTHENTICATED', 'Login exchange was rejected');
  }
  return { environment, transaction };
}
