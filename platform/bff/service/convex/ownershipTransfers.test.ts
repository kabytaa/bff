import { convexTest, type TestConvex } from 'convex-test';
import { describe, expect, it } from 'vitest';

import {
  CUSTOMER_AUTH_CONFIGURATION_VERSION,
  DEFAULT_ACCOUNT_POLICY,
  DEFAULT_BUSINESS_ACCOUNT_POLICY,
  DEFAULT_SESSION_POLICY,
  type CustomerAuthConfiguration,
} from '@bff/contracts';
import { internal } from './_generated/api';
import { pkceS256Challenge, sha256Base64Url } from './lib/customerCrypto';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
type TestBackend = TestConvex<typeof schema>;
const callbackUrl = 'https://example-backend.convex.site/_tofler/auth/callback';
const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const baseTime = 10_000_000;

function configuration(
  ownershipTransferEnabled = true,
): CustomerAuthConfiguration {
  return {
    version: CUSTOMER_AUTH_CONFIGURATION_VERSION,
    enabledProviders: ['google'],
    developmentAutomationEnabled: true,
    transport: {
      webOrigins: ['https://example.tofler.app'],
      sessionAdapterBaseUrl: 'https://example-backend.convex.site',
      defaultPostLoginPath: '/',
    },
    sessionPolicy: DEFAULT_SESSION_POLICY,
    accountPolicy: {
      ...DEFAULT_BUSINESS_ACCOUNT_POLICY,
      createAccountOnFirstSignIn: false,
      userAccountCreationEnabled: true,
      maxAccountMembershipsPerUser: 3,
      maxOwnedAccountsPerUser: 2,
      ownershipTransferEnabled,
    },
    accountDefaults: {
      ...DEFAULT_ACCOUNT_POLICY,
      seatLimit: 3,
      adminRoleEnabled: true,
      memberInvitationsEnabled: true,
    },
  };
}

async function configure(t: TestBackend, transferEnabled = true) {
  await t.mutation(internal.businessEnvironments.create, {
    key: 'example-development',
    businessName: 'Example',
    environmentName: 'Development',
  });
  await t.mutation(internal.businessEnvironments.configureCustomerAuth, {
    key: 'example-development',
    expectedRevision: 0,
    configuration: configuration(transferEnabled),
  });
}

async function bootstrap(t: TestBackend, suffix: string, email: string) {
  const padded = suffix.padStart(16, '0');
  const result = await t.mutation(internal.customerAuth.bootstrapCustomer, {
    environmentKey: 'example-development',
    provider: 'google',
    issuer: 'https://accounts.google.com',
    subject: `google-${suffix}`,
    profile: { verifiedEmail: email, displayName: `User ${suffix}` },
    candidates: {
      userPublicId: `user_${padded}`,
      accountPublicId: `unused_account_${padded}`,
      membershipPublicId: `unused_membership_${padded}`,
    },
    now: baseTime - 10_000,
  });
  expect(result.kind).toBe('ok');
  return `user_${padded}`;
}

async function setupTeam(t: TestBackend) {
  const ownerUserId = await bootstrap(t, 'owner', 'owner@example.com');
  const targetUserId = await bootstrap(t, 'target', 'target@example.com');
  const created = await t.mutation(internal.accounts.createForUser, {
    environmentKey: 'example-development',
    userPublicId: ownerUserId,
    displayName: 'Transfer Team',
    accountPublicId: 'account_transfer_0001',
    membershipPublicId: 'membership_owner_0001',
    now: baseTime - 8_000,
  });
  expect(created.kind).toBe('ok');

  const invitationToken =
    'transfer-invitation-token-abcdefghijklmnopqrstuvwxyz';
  await t.mutation(internal.invitations.create, {
    environmentKey: 'example-development',
    accountPublicId: 'account_transfer_0001',
    actorUserPublicId: ownerUserId,
    recipientEmail: 'target@example.com',
    publicId: 'invitation_target_0001',
    tokenHash: await sha256Base64Url(invitationToken),
    now: baseTime - 7_000,
  });
  const accepted = await t.mutation(internal.invitations.accept, {
    environmentKey: 'example-development',
    userPublicId: targetUserId,
    tokenHash: await sha256Base64Url(invitationToken),
    membershipPublicId: 'membership_target_0001',
    now: baseTime - 6_000,
  });
  expect(accepted.kind).toBe('ok');

  const handleHash = await sha256Base64Url('owner-session-handle');
  await t.run(async (ctx) => {
    const environment = await ctx.db
      .query('businessEnvironments')
      .withIndex('by_key', (query) => query.eq('key', 'example-development'))
      .unique();
    const owner = environment
      ? await ctx.db
          .query('businessUsers')
          .withIndex('by_environment_public_id', (query) =>
            query
              .eq('environmentId', environment._id)
              .eq('publicId', ownerUserId),
          )
          .unique()
      : null;
    if (!environment || !owner) throw new Error('Fixture setup failed');
    await ctx.db.insert('businessSessions', {
      environmentId: environment._id,
      userId: owner._id,
      publicId: 'session_transfer_0001',
      handleHash,
      provider: 'google',
      providerAuthenticatedAt: Math.floor((baseTime - 10_000) / 1_000),
      createdAt: baseTime - 5_000,
      lastSeenAt: baseTime - 5_000,
      idleExpiresAt: baseTime + 3_600_000,
      absoluteExpiresAt: baseTime + 86_400_000,
      cleanupAt: baseTime + 100_000_000,
    });
  });
  return { ownerUserId, targetUserId, handleHash };
}

async function startConfirmation(t: TestBackend, handleHash: string) {
  const pkceChallenge = await pkceS256Challenge(verifier);
  const result = await t.mutation(internal.ownershipTransfers.start, {
    environmentKey: 'example-development',
    handleHash,
    accountPublicId: 'account_transfer_0001',
    targetMembershipPublicId: 'membership_target_0001',
    reference: 'transfer_reference_0001',
    state: 'state_abcdefghijklmnopqrstuvwxyz012345',
    providerNonce: 'nonce_abcdefghijklmnopqrstuvwxyz012345',
    pkceChallenge,
    callbackUrl,
    webOrigin: 'https://example.tofler.app',
    returnPath: '/settings/members',
    now: baseTime,
  });
  expect(result.kind).toBe('ok');
  return pkceChallenge;
}

describe('provider-confirmed ownership transfer', () => {
  it('requires the same principal, transfers atomically, and returns an idempotent result', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    await configure(t);
    const { ownerUserId, targetUserId, handleHash } = await setupTeam(t);
    const pkceChallenge = await startConfirmation(t, handleHash);
    const handoffCode = 'transfer-handoff-code-abcdefghijklmnopqrstuvwxyz';
    const handoffCodeHash = await sha256Base64Url(handoffCode);

    await expect(
      t.mutation(internal.ownershipTransfers.completeProvider, {
        environmentKey: 'example-development',
        reference: 'transfer_reference_0001',
        providerNonce: 'nonce_abcdefghijklmnopqrstuvwxyz012345',
        provider: 'google',
        issuer: 'https://accounts.google.com',
        subject: 'google-target',
        authenticatedAt: Math.floor((baseTime + 1_000) / 1_000),
        handoffCodeHash,
        now: baseTime + 1_000,
      }),
    ).rejects.toThrow(/UNAUTHENTICATED|match the Owner/u);

    expect(
      await t.mutation(internal.ownershipTransfers.completeProvider, {
        environmentKey: 'example-development',
        reference: 'transfer_reference_0001',
        providerNonce: 'nonce_abcdefghijklmnopqrstuvwxyz012345',
        provider: 'google',
        issuer: 'https://accounts.google.com',
        subject: 'google-owner',
        authenticatedAt: Math.floor((baseTime + 2_000) / 1_000),
        handoffCodeHash,
        now: baseTime + 2_000,
      }),
    ).toMatchObject({ kind: 'ok', callbackUrl });

    const proof = 'ownership-proof-abcdefghijklmnopqrstuvwxyz012345';
    expect(
      await t.mutation(internal.ownershipTransfers.exchangeProof, {
        environmentKey: 'example-development',
        handoffCodeHash,
        pkceChallenge,
        callbackUrl,
        proofHash: await sha256Base64Url(proof),
        proofPublicId: 'transfer_proof_000001',
        now: baseTime + 3_000,
      }),
    ).toMatchObject({ kind: 'ok', proofPublicId: 'transfer_proof_000001' });

    const transferred = await t.mutation(internal.ownershipTransfers.transfer, {
      environmentKey: 'example-development',
      proofHash: await sha256Base64Url(proof),
      now: baseTime + 4_000,
    });
    expect(transferred).toEqual({
      accountId: 'account_transfer_0001',
      previousOwnerUserId: ownerUserId,
      newOwnerUserId: targetUserId,
      completedAt: baseTime + 4_000,
      replayed: false,
    });
    await expect(
      t.mutation(internal.ownershipTransfers.transfer, {
        environmentKey: 'example-development',
        proofHash: await sha256Base64Url(proof),
        now: baseTime + 5_000,
      }),
    ).resolves.toMatchObject({ replayed: true });

    expect(
      await t.run(async (ctx) => {
        const memberships = await ctx.db.query('memberships').collect();
        const users = await ctx.db.query('businessUsers').collect();
        return {
          roles: Object.fromEntries(
            memberships.map((membership) => [
              membership.publicId,
              membership.role,
            ]),
          ),
          owned: Object.fromEntries(
            users.map((user) => [user.publicId, user.ownedAccountCount]),
          ),
          auditCount: (await ctx.db.query('ownershipTransferAudits').collect())
            .length,
          transferEventCount: (
            await ctx.db
              .query('securityEvents')
              .filter((query) =>
                query.eq(query.field('type'), 'ownership_transferred'),
              )
              .collect()
          ).length,
        };
      }),
    ).toEqual({
      roles: {
        membership_owner_0001: 'member',
        membership_target_0001: 'owner',
      },
      owned: { [ownerUserId]: 0, [targetUserId]: 1 },
      auditCount: 1,
      transferEventCount: 1,
    });
  });

  it('rejects disabled transfers and expired proofs without changing ownership', async () => {
    const disabled = convexTest({ schema, modules, transactionLimits: true });
    await configure(disabled, false);
    const disabledFixture = await setupTeam(disabled);
    await expect(
      startConfirmation(disabled, disabledFixture.handleHash),
    ).rejects.toThrow(/FORBIDDEN|not enabled/u);

    const t = convexTest({ schema, modules, transactionLimits: true });
    await configure(t);
    const { ownerUserId, handleHash } = await setupTeam(t);
    const pkceChallenge = await startConfirmation(t, handleHash);
    const handoffCodeHash = await sha256Base64Url(
      'expiring-transfer-handoff-abcdefghijklmnopqrstuvwxyz',
    );
    await t.mutation(internal.ownershipTransfers.completeProvider, {
      environmentKey: 'example-development',
      reference: 'transfer_reference_0001',
      providerNonce: 'nonce_abcdefghijklmnopqrstuvwxyz012345',
      provider: 'google',
      issuer: 'https://accounts.google.com',
      subject: 'google-owner',
      authenticatedAt: Math.floor((baseTime + 1_000) / 1_000),
      handoffCodeHash,
      now: baseTime + 1_000,
    });
    const proof = 'expiring-ownership-proof-abcdefghijklmnopqrstuvwxyz';
    await t.mutation(internal.ownershipTransfers.exchangeProof, {
      environmentKey: 'example-development',
      handoffCodeHash,
      pkceChallenge,
      callbackUrl,
      proofHash: await sha256Base64Url(proof),
      proofPublicId: 'transfer_proof_expired1',
      now: baseTime + 2_000,
    });

    await expect(
      t.mutation(internal.ownershipTransfers.transfer, {
        environmentKey: 'example-development',
        proofHash: await sha256Base64Url(proof),
        now: baseTime + 2_000 + 301_000,
      }),
    ).rejects.toThrow(/UNAUTHENTICATED|expired/u);
    expect(
      await t.run(async (ctx) => {
        const account = (await ctx.db.query('accounts').collect()).find(
          (candidate) => candidate.publicId === 'account_transfer_0001',
        );
        const owner = account ? await ctx.db.get(account.ownerUserId) : null;
        return owner?.publicId;
      }),
    ).toBe(ownerUserId);
  });
});
