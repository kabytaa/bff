import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import {
  CUSTOMER_AUTH_CONFIGURATION_VERSION,
  DEFAULT_ACCOUNT_POLICY,
  DEFAULT_SESSION_POLICY,
  type CustomerAuthConfiguration,
} from '@bff/contracts';
import { BACKOFFICE_OPERATOR_EMAILS } from '@bff/static-config';
import { api, internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const operatorIdentity = {
  issuer: 'https://accounts.google.com',
  subject: 'operator-customer-operations',
  tokenIdentifier: 'https://accounts.google.com|operator-customer-operations',
  email: BACKOFFICE_OPERATOR_EMAILS[0],
  emailVerified: true,
};

const configuration: CustomerAuthConfiguration = {
  version: CUSTOMER_AUTH_CONFIGURATION_VERSION,
  definitionRevision: 1,
  definitionFingerprint: 'fnv1a64:0000000000000000',
  presentation: {
    productName: 'Example',
    theme: 'system',
    accentColor: '#314EC6',
  },
  enabledProviders: ['google'],
  developmentAutomationEnabled: true,
  transport: {
    webOrigins: ['https://example-dev.tofler.app'],
    sessionAdapterBaseUrl: 'https://example-backend.convex.site',
    defaultPostLoginPath: '/',
  },
  sessionPolicy: DEFAULT_SESSION_POLICY,
  accountPolicy: {
    createAccountOnFirstSignIn: false,
    userAccountCreationEnabled: false,
    maxAccountMembershipsPerUser: 2,
    maxOwnedAccountsPerUser: 2,
    ownershipTransferEnabled: false,
  },
  accountDefaults: DEFAULT_ACCOUNT_POLICY,
};

async function configuredFixture() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.businessEnvironments.create, {
    key: 'example-development',
    businessName: 'Example',
    environmentName: 'Development',
  });
  await t.mutation(internal.businessEnvironments.configureCustomerAuth, {
    key: 'example-development',
    expectedRevision: 0,
    configuration,
  });
  const seeded = await t.run(async (ctx) => {
    const environment = await ctx.db
      .query('businessEnvironments')
      .withIndex('by_key', (query) => query.eq('key', 'example-development'))
      .unique();
    if (!environment) throw new Error('environment missing');
    const principalId = await ctx.db.insert('authPrincipals', {
      createdAt: 1_000,
    });
    const userId = await ctx.db.insert('businessUsers', {
      environmentId: environment._id,
      principalId,
      publicId: 'user_customeroperations01',
      verifiedEmail: 'customer@example.invalid',
      displayName: 'Customer Example',
      firstSignInProvisioningCompletedAt: 1_000,
      activeMembershipCount: 0,
      ownedAccountCount: 0,
      createdAt: 1_000,
      updatedAt: 1_000,
    });
    return { environmentId: environment._id, userId };
  });
  return { t, ...seeded };
}

async function provisionFirstAccount(
  t: Awaited<ReturnType<typeof configuredFixture>>['t'],
) {
  return await t.mutation(internal.customerOperations.provisionManagedAccount, {
    environmentKey: 'example-development',
    userPublicId: 'user_customeroperations01',
    displayName: 'Managed account',
    accountPublicId: 'account_customeroperations01',
    membershipPublicId: 'membership_customerops001',
    now: 2_000,
  });
}

describe('customer operator lifecycle', () => {
  it('provisions managed and development fixture accounts within configured caps', async () => {
    const { t } = await configuredFixture();
    const first = await provisionFirstAccount(t);
    const second = await t.mutation(
      internal.customerOperations.provisionDevelopmentFixtureAccount,
      {
        environmentKey: 'example-development',
        userPublicId: 'user_customeroperations01',
        displayName: 'Second-tab fixture',
        accountPublicId: 'account_customeroperations02',
        membershipPublicId: 'membership_customerops002',
        now: 3_000,
      },
    );

    expect(first.membership.role).toBe('owner');
    expect(second.displayName).toBe('Second-tab fixture');
    await expect(
      t.mutation(internal.customerOperations.provisionManagedAccount, {
        environmentKey: 'example-development',
        userPublicId: 'user_customeroperations01',
        accountPublicId: 'account_customeroperations03',
        membershipPublicId: 'membership_customerops003',
        now: 4_000,
      }),
    ).rejects.toThrow(/CAPACITY_CONFLICT|capacity is full/u);
  });

  it('preflights every user/account and refuses incompatible or stale configuration', async () => {
    const { t } = await configuredFixture();
    await provisionFirstAccount(t);
    await t.mutation(
      internal.customerOperations.provisionDevelopmentFixtureAccount,
      {
        environmentKey: 'example-development',
        userPublicId: 'user_customeroperations01',
        accountPublicId: 'account_customeroperations02',
        membershipPublicId: 'membership_customerops002',
        now: 3_000,
      },
    );

    const incompatible = await t.action(
      internal.customerOperations.previewCustomerConfiguration,
      {
        key: 'example-development',
        configuration: {
          ...configuration,
          accountPolicy: {
            ...configuration.accountPolicy,
            maxAccountMembershipsPerUser: 1,
            maxOwnedAccountsPerUser: 1,
          },
        },
      },
    );
    expect(incompatible.compatible).toBe(false);
    expect(incompatible.conflicts.join(' ')).toMatch(
      /maxAccountMembershipsPerUser|maxOwnedAccountsPerUser/u,
    );
    await expect(
      t.mutation(internal.businessEnvironments.configureCustomerAuth, {
        key: 'example-development',
        expectedRevision: incompatible.currentRevision,
        expectedAccountPolicyStateRevision:
          incompatible.accountPolicyStateRevision,
        preflightId: incompatible.preflightId,
        configuration: {
          ...configuration,
          accountPolicy: {
            ...configuration.accountPolicy,
            maxAccountMembershipsPerUser: 1,
            maxOwnedAccountsPerUser: 1,
          },
        },
      }),
    ).rejects.toThrow(/CONFLICT|incompatible/u);

    const compatible = await t.action(
      internal.customerOperations.previewCustomerConfiguration,
      { key: 'example-development', configuration },
    );
    expect(compatible.compatible).toBe(true);
    await t.mutation(internal.customerOperations.updateAccountPolicy, {
      environmentKey: 'example-development',
      accountPublicId: 'account_customeroperations01',
      policyOverrides: { seatLimit: 2 },
      now: 5_000,
    });
    await expect(
      t.mutation(internal.businessEnvironments.configureCustomerAuth, {
        key: 'example-development',
        expectedRevision: compatible.currentRevision,
        expectedAccountPolicyStateRevision:
          compatible.accountPolicyStateRevision,
        preflightId: compatible.preflightId,
        configuration,
      }),
    ).rejects.toThrow(/CONFLICT|state changed/u);
  });

  it('applies one compatible preflight exactly once', async () => {
    const { t } = await configuredFixture();
    const nextConfiguration = {
      ...configuration,
      sessionPolicy: {
        ...configuration.sessionPolicy,
        idleSeconds: 24 * 60 * 60,
      },
    };
    const preview = await t.action(
      internal.customerOperations.previewCustomerConfiguration,
      { key: 'example-development', configuration: nextConfiguration },
    );
    const applied = await t.mutation(
      internal.businessEnvironments.configureCustomerAuth,
      {
        key: 'example-development',
        expectedRevision: preview.currentRevision,
        expectedAccountPolicyStateRevision: preview.accountPolicyStateRevision,
        preflightId: preview.preflightId,
        configuration: nextConfiguration,
      },
    );
    expect(applied.customerAuth?.sessionPolicy.idleSeconds).toBe(86_400);
    await expect(
      t.mutation(internal.businessEnvironments.configureCustomerAuth, {
        key: 'example-development',
        expectedRevision: preview.currentRevision,
        expectedAccountPolicyStateRevision: preview.accountPolicyStateRevision,
        preflightId: preview.preflightId,
        configuration: nextConfiguration,
      }),
    ).rejects.toThrow(/CONFLICT|preview it again/u);
  });

  it('exposes bounded safe operator views and denies customer identities', async () => {
    const { t } = await configuredFixture();
    await provisionFirstAccount(t);
    await t.run(async (ctx) => {
      const environment = await ctx.db
        .query('businessEnvironments')
        .withIndex('by_key', (query) => query.eq('key', 'example-development'))
        .unique();
      if (!environment) throw new Error('environment missing');
      const user = await ctx.db
        .query('businessUsers')
        .withIndex('by_environment_public_id', (query) =>
          query
            .eq('environmentId', environment._id)
            .eq('publicId', 'user_customeroperations01'),
        )
        .unique();
      if (!user) throw new Error('fixture missing');
      await ctx.db.insert('businessSessions', {
        environmentId: environment._id,
        userId: user._id,
        publicId: 'session_customeroperations',
        handleHash: 'h'.repeat(43),
        provider: 'google',
        providerAuthenticatedAt: 1_000,
        createdAt: 1_000,
        lastSeenAt: 1_000,
        idleExpiresAt: 100_000,
        absoluteExpiresAt: 200_000,
        cleanupAt: 300_000,
      });
      const secondPrincipalId = await ctx.db.insert('authPrincipals', {
        createdAt: 1_001,
      });
      await ctx.db.insert('businessUsers', {
        environmentId: environment._id,
        principalId: secondPrincipalId,
        publicId: 'user_customeroperations02',
        verifiedEmail: 'customer@example.invalid',
        displayName: 'Second customer',
        firstSignInProvisioningCompletedAt: 1_001,
        activeMembershipCount: 0,
        ownedAccountCount: 0,
        createdAt: 1_001,
        updatedAt: 1_001,
      });
    });

    const operator = t.withIdentity(operatorIdentity);
    const users = await operator.query(api.customerBackoffice.users, {
      environmentKey: 'example-development',
      paginationOpts: { cursor: null, numItems: 10 },
    });
    const sessions = await operator.query(api.customerBackoffice.sessions, {
      environmentKey: 'example-development',
      paginationOpts: { cursor: null, numItems: 10 },
    });
    const emailMatches = await operator.query(
      api.customerBackoffice.userLookup,
      {
        environmentKey: 'example-development',
        exact: 'CUSTOMER@EXAMPLE.INVALID',
      },
    );
    const idMatches = await operator.query(api.customerBackoffice.userLookup, {
      environmentKey: 'example-development',
      exact: 'user_customeroperations01',
    });
    expect(users.page[0]).toMatchObject({
      id: 'user_customeroperations01',
      verifiedEmail: 'customer@example.invalid',
    });
    expect(sessions.page[0]).toMatchObject({
      id: 'session_customeroperations',
      userId: 'user_customeroperations01',
      userDisplayName: 'Customer Example',
    });
    expect(sessions.page[0]).not.toHaveProperty('handleHash');
    expect(emailMatches).toHaveLength(2);
    expect(idMatches.map((user) => user.id)).toEqual([
      'user_customeroperations01',
    ]);

    const customer = t.withIdentity({
      issuer: 'https://auth-dev.tofler.app',
      subject: 'user_customeroperations01',
      tokenIdentifier: 'customer|user_customeroperations01',
    });
    await expect(
      customer.query(api.customerBackoffice.users, {
        environmentKey: 'example-development',
        paginationOpts: { cursor: null, numItems: 10 },
      }),
    ).rejects.toThrow(/FORBIDDEN|Operator access/u);
  });

  it('revokes a session without exposing its durable handle', async () => {
    const { t, environmentId, userId } = await configuredFixture();
    await t.run(async (ctx) => {
      await ctx.db.insert('businessSessions', {
        environmentId,
        userId,
        publicId: 'session_customeroperations',
        handleHash: 's'.repeat(43),
        provider: 'google',
        providerAuthenticatedAt: 1_000,
        createdAt: 1_000,
        lastSeenAt: 1_000,
        idleExpiresAt: 100_000,
        absoluteExpiresAt: 200_000,
        cleanupAt: 300_000,
      });
    });
    const revoked = await t.mutation(
      internal.customerOperations.revokeSession,
      {
        environmentKey: 'example-development',
        sessionPublicId: 'session_customeroperations',
        now: 5_000,
      },
    );
    expect(revoked).toMatchObject({
      id: 'session_customeroperations',
      revokedAt: 5_000,
      revocationReason: 'operator_revoked',
    });
    expect(revoked).not.toHaveProperty('handleHash');
    const events = await t.query(
      internal.customerOperations.listSecurityEvents,
      {
        environmentKey: 'example-development',
        paginationOpts: { cursor: null, numItems: 10 },
      },
    );
    expect(events.page[0]).toMatchObject({
      type: 'customer_session_revoked',
      sessionId: 'session_customeroperations',
    });
  });
});
