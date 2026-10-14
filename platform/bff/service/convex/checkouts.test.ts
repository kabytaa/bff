import { convexTest, type TestConvex } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CUSTOMER_AUTH_CONFIGURATION_VERSION,
  DEFAULT_ACCOUNT_POLICY,
  DEFAULT_BUSINESS_ACCOUNT_POLICY,
  DEFAULT_SESSION_POLICY,
  type CustomerAuthConfiguration,
} from '@bff/contracts';
import { api, internal } from './_generated/api';
import { sha256Base64Url } from './lib/customerCrypto';
import { BACKOFFICE_OPERATOR_EMAILS } from '@bff/static-config';
import {
  CHECKOUT_SERVICE_AUTH_ENVIRONMENT,
  verifyCheckoutServiceAuthorization,
} from './checkoutServiceAuth';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
type TestBackend = TestConvex<typeof schema>;
const operatorIdentity = {
  issuer: 'https://accounts.google.com',
  subject: 'test-user-operator',
  email: BACKOFFICE_OPERATOR_EMAILS[0],
  emailVerified: true,
};

async function recordState(
  t: TestBackend,
  context: Awaited<ReturnType<typeof fixture>>,
) {
  return t.run(async (ctx) => {
    const environment = (await ctx.db
      .query('businessEnvironments')
      .withIndex('by_key', (q) => q.eq('key', context.environmentKey))
      .unique())!;
    const user = (await ctx.db
      .query('businessUsers')
      .withIndex('by_environment_public_id', (q) =>
        q
          .eq('environmentId', environment._id)
          .eq('publicId', context.userPublicId),
      )
      .unique())!;
    const account = (await ctx.db
      .query('accounts')
      .withIndex('by_environment_public_id', (q) =>
        q
          .eq('environmentId', environment._id)
          .eq('publicId', context.accountPublicId),
      )
      .unique())!;
    const grant = await ctx.db
      .query('accountAccessGrants')
      .withIndex('by_environment_account', (q) =>
        q.eq('environmentId', environment._id).eq('accountId', account._id),
      )
      .unique();
    return { environment, user, account, grant };
  });
}
async function changeTestStatus(
  t: TestBackend,
  context: Awaited<ReturnType<typeof fixture>>,
  isTestUser: boolean,
) {
  const { user } = await recordState(t, context);
  return t
    .withIdentity(operatorIdentity)
    .mutation(api.customerBackoffice.setTestUser, {
      environmentKey: context.environmentKey,
      userPublicId: user.publicId,
      expectedIsTestUser: user.isTestUser === true,
      isTestUser,
    });
}

async function fixture(
  t: TestBackend,
  testUser = true,
  environmentKey = 'tablecards-development',
) {
  const configuration: CustomerAuthConfiguration = {
    version: CUSTOMER_AUTH_CONFIGURATION_VERSION,
    definitionRevision: 1,
    definitionFingerprint: 'fnv1a64:0000000000000000',
    presentation: {
      productName: 'TableCards',
      theme: 'system',
      accentColor: '#D3573C',
    },
    enabledProviders: ['google'],
    developmentAutomationEnabled: environmentKey.endsWith('-development'),
    transport: {
      webOrigins: ['https://tablecards-dev.tofler.app'],
      sessionAdapterBaseUrl: 'https://tablecards-api.invalid',
      defaultPostLoginPath: '/',
    },
    sessionPolicy: DEFAULT_SESSION_POLICY,
    accountPolicy: {
      ...DEFAULT_BUSINESS_ACCOUNT_POLICY,
      maxAccountMembershipsPerUser: 2,
    },
    accountDefaults: DEFAULT_ACCOUNT_POLICY,
  };
  await t.mutation(internal.businessEnvironments.create, {
    key: environmentKey,
    businessName: 'TableCards',
    environmentName: 'Development',
  });
  await t.mutation(internal.businessEnvironments.configureCustomerAuth, {
    key: environmentKey,
    expectedRevision: 0,
    configuration,
  });
  const result = await t.mutation(internal.customerAuth.bootstrapCustomer, {
    environmentKey,
    provider: 'google',
    issuer: 'https://accounts.google.com',
    subject: 'checkout-owner',
    profile: {
      verifiedEmail: 'owner@example.com',
      displayName: 'Owner',
    },
    candidates: {
      userPublicId: 'user_checkout_owner_0001',
      accountPublicId: 'account_checkout_000001',
      membershipPublicId: 'membership_checkout_0001',
    },
    now: 1_000,
  });
  if (result.kind !== 'ok' || !result.customer.accounts[0]) {
    throw new Error('Fixture failed');
  }
  const account = result.customer.accounts[0];
  if (testUser)
    await t
      .withIdentity({
        issuer: 'https://accounts.google.com',
        subject: 'operator',
        email: BACKOFFICE_OPERATOR_EMAILS[0],
        emailVerified: true,
      })
      .mutation(api.customerBackoffice.setTestUser, {
        environmentKey,
        userPublicId: result.customer.user.id,
        isTestUser: true,
        expectedIsTestUser: false,
      });
  return {
    environmentKey,
    userPublicId: result.customer.user.id,
    accountPublicId: account.id,
    membershipPublicId: account.membership.id,
  };
}

function checkoutArgs(context: Awaited<ReturnType<typeof fixture>>) {
  return {
    ...context,
    idempotencyKey: 'checkout_request_0000000001',
    requestFingerprint: 'studio-v1',
    publicReference: 'checkout_reference_000001',
    offer: {
      key: 'studio',
      revision: 1,
      displayName: 'Studio',
      priceUsdCents: 1900,
      billing: 'monthly' as const,
    },
    grant: {
      offerKey: 'studio',
      offerRevision: 1,
      featureFlags: [{ key: 'team_access', enabled: true }],
      numericLimits: [{ key: 'maximum_active_projects', value: 100 }],
      unitGrants: [
        {
          unitType: 'ai_background_batch',
          allowance: 30,
          allocation: { kind: 'monthly' as const },
        },
      ],
    },
    accountPolicy: {
      seatLimit: 5,
      adminRoleEnabled: true,
      memberInvitationsEnabled: true,
    },
    returnUrl: 'https://tablecards-dev.tofler.app/settings',
    now: 2_000,
  };
}

afterEach(() => vi.unstubAllEnvs());

describe('shared mock checkout', () => {
  it('scopes test status to one Business environment', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    const dev = await fixture(t, true);
    const production = await fixture(t, false, 'tablecards-production');
    expect(await t.query(internal.checkouts.availability, dev)).toEqual({
      available: true,
    });
    expect(await t.query(internal.checkouts.availability, production)).toEqual({
      available: false,
    });
  });
  it('prevents normal users from joining a test workspace and allows a designated test teammate', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    const context = await fixture(t);
    const input = checkoutArgs(context);
    await t.mutation(internal.checkouts.createForAccount, input);
    await t.mutation(internal.checkouts.complete, {
      environmentKey: context.environmentKey,
      reference: input.publicReference,
      now: 3_000,
    });
    await t.mutation(internal.customerAuth.bootstrapCustomer, {
      environmentKey: context.environmentKey,
      provider: 'google',
      issuer: 'https://accounts.google.com',
      subject: 'test-checkout-recipient',
      profile: {
        verifiedEmail: 'recipient@example.invalid',
        displayName: 'Recipient',
      },
      candidates: {
        userPublicId: 'user_test_recipient_0001',
        accountPublicId: 'account_test_recipient001',
        membershipPublicId: 'membership_test_recipient01',
      },
      now: 3_100,
    });
    const tokenHash = await sha256Base64Url(
      'synthetic-test-workspace-invitation',
    );
    await t.mutation(internal.invitations.create, {
      environmentKey: context.environmentKey,
      accountPublicId: context.accountPublicId,
      actorUserPublicId: context.userPublicId,
      recipientEmail: 'recipient@example.invalid',
      publicId: 'invitation_test_recipient01',
      tokenHash,
      now: 3_200,
    });
    const join = {
      environmentKey: context.environmentKey,
      userPublicId: 'user_test_recipient_0001',
      tokenHash,
      membershipPublicId: 'membership_test_join_0001',
      now: 3_300,
    };
    await expect(
      t.mutation(internal.invitations.accept, join),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    expect((await recordState(t, context)).account.activeMembershipCount).toBe(
      1,
    );
    await t
      .withIdentity(operatorIdentity)
      .mutation(api.customerBackoffice.setTestUser, {
        environmentKey: context.environmentKey,
        userPublicId: join.userPublicId,
        expectedIsTestUser: false,
        isTestUser: true,
      });
    await expect(
      t.mutation(internal.invitations.accept, join),
    ).resolves.toMatchObject({ kind: 'ok' });
    expect((await recordState(t, context)).account.activeMembershipCount).toBe(
      2,
    );
    expect(await t.query(internal.checkouts.availability, context)).toEqual({
      available: true,
    });
    await t
      .withIdentity(operatorIdentity)
      .mutation(api.customerBackoffice.setTestUser, {
        environmentKey: context.environmentKey,
        userPublicId: join.userPublicId,
        expectedIsTestUser: true,
        isTestUser: false,
      });
    expect(await t.query(internal.checkouts.availability, context)).toEqual({
      available: false,
    });
    await expect(
      t.mutation(internal.checkouts.createForAccount, {
        ...input,
        idempotencyKey: 'mixed_workspace_mock_00001',
      }),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });
  it('uses the operator-owned user marker in a production-named environment without a deployment mock switch', async () => {
    vi.stubEnv('BFF_MOCK_CHECKOUT_ENABLED', 'disabled');
    const t = convexTest({ schema, modules, transactionLimits: true });
    const context = await fixture(t, true, 'tablecards-production');
    expect(await t.query(internal.checkouts.availability, context)).toEqual({
      available: true,
    });
    const input = checkoutArgs(context);
    await t.mutation(internal.checkouts.createForAccount, input);
    await t.mutation(internal.checkouts.complete, {
      environmentKey: context.environmentKey,
      reference: input.publicReference,
      now: 3_000,
    });
    expect((await recordState(t, context)).grant?.source).toBe('test_mock');
  });
  it('allows only an admitted operator to change the marker with current scope and state', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    const context = await fixture(t, false);
    const input = {
      environmentKey: context.environmentKey,
      userPublicId: context.userPublicId,
      isTestUser: true,
      expectedIsTestUser: false,
    };
    await expect(
      t.mutation(api.customerBackoffice.setTestUser, input),
    ).rejects.toMatchObject({ data: { code: 'UNAUTHENTICATED' } });
    await expect(
      t
        .withIdentity({
          issuer: 'https://accounts.google.com',
          subject: 'customer',
          email: 'owner@example.com',
          emailVerified: true,
        })
        .mutation(api.customerBackoffice.setTestUser, input),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    await expect(
      t
        .withIdentity(operatorIdentity)
        .mutation(api.customerBackoffice.setTestUser, {
          ...input,
          environmentKey: 'missing-environment',
        }),
    ).rejects.toMatchObject({ data: { code: 'NOT_FOUND' } });
    await t
      .withIdentity(operatorIdentity)
      .mutation(api.customerBackoffice.setTestUser, input);
    await expect(
      t
        .withIdentity(operatorIdentity)
        .mutation(api.customerBackoffice.setTestUser, input),
    ).rejects.toMatchObject({ data: { code: 'CONFLICT' } });
    const view = await t
      .withIdentity(operatorIdentity)
      .query(api.customerBackoffice.userLookup, {
        environmentKey: context.environmentKey,
        exact: context.userPublicId,
      });
    expect(view[0]?.isTestUser).toBe(true);
  });
  it('rechecks revocation on completion and keeps already-completed test access when disabled', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    const context = await fixture(t);
    const input = checkoutArgs(context);
    await t.mutation(internal.checkouts.createForAccount, input);
    await changeTestStatus(t, context, false);
    await expect(
      t.mutation(internal.checkouts.complete, {
        environmentKey: context.environmentKey,
        reference: input.publicReference,
        now: 3_000,
      }),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    expect((await recordState(t, context)).grant).toBeNull();
    await changeTestStatus(t, context, true);
    await t.mutation(internal.checkouts.complete, {
      environmentKey: context.environmentKey,
      reference: input.publicReference,
      now: 3_001,
    });
    const before = await recordState(t, context);
    vi.stubEnv('BFF_DEVELOPMENT_PRODUCT_ACCESS_ENABLED', 'enabled');
    expect(before.environment.customerAuth?.developmentAutomationEnabled).toBe(
      true,
    );
    await expect(
      t.mutation(internal.productAccess.setDevelopmentForAccount, {
        ...context,
        ...input.grant,
        now: 3_002,
      }),
    ).rejects.toMatchObject({
      data: {
        code: 'FORBIDDEN',
        message: 'Development grants cannot remove test-workspace isolation',
      },
    });
    await changeTestStatus(t, context, false);
    const after = await recordState(t, context);
    expect(after.grant).toEqual(before.grant);
    expect(after.account).toEqual(before.account);
    expect(await t.query(internal.checkouts.availability, context)).toEqual({
      available: false,
    });
    await expect(
      t.mutation(internal.checkouts.createForAccount, {
        ...input,
        idempotencyKey: 'disabled_test_purchase_0001',
      }),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });
  it('cannot replace paid access, including when it changes after test checkout creation', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    const context = await fixture(t);
    const input = checkoutArgs(context);
    await t.mutation(internal.checkouts.createForAccount, input);
    await t.mutation(internal.checkouts.complete, {
      environmentKey: context.environmentKey,
      reference: input.publicReference,
      now: 3_000,
    });
    const next = {
      ...input,
      idempotencyKey: 'second_test_checkout_00001',
      publicReference: 'checkout_second_test_00001',
    };
    await t.mutation(internal.checkouts.createForAccount, next);
    const state = await recordState(t, context);
    await t.run((ctx) =>
      ctx.db.patch(state.grant!._id, { source: 'provider' }),
    );
    const paid = await recordState(t, context);
    await expect(
      t.mutation(internal.checkouts.complete, {
        environmentKey: context.environmentKey,
        reference: next.publicReference,
        now: 4_000,
      }),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    await expect(
      t.mutation(internal.checkouts.createForAccount, {
        ...next,
        idempotencyKey: 'third_test_checkout_00001',
      }),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    vi.stubEnv('BFF_DEVELOPMENT_PRODUCT_ACCESS_ENABLED', 'enabled');
    await expect(
      t.mutation(internal.productAccess.setDevelopmentForAccount, {
        ...context,
        ...input.grant,
        now: 4_001,
      }),
    ).rejects.toMatchObject({
      data: {
        code: 'FORBIDDEN',
        message: 'Test access cannot replace paid provider access',
      },
    });
    expect((await recordState(t, context)).grant).toEqual(paid.grant);
    expect((await recordState(t, context)).account).toEqual(paid.account);
  });
  it('requires the environment-specific Business server credential', async () => {
    const secret = 'checkout_service_secret_000000000001';
    vi.stubEnv(
      CHECKOUT_SERVICE_AUTH_ENVIRONMENT.secretsJson,
      JSON.stringify({ 'tablecards-development': secret }),
    );
    await expect(
      verifyCheckoutServiceAuthorization(
        'tablecards-development',
        `Bearer ${secret}`,
      ),
    ).resolves.toBe(true);
    await expect(
      verifyCheckoutServiceAuthorization(
        'tablecards-development',
        'Bearer checkout_service_secret_wrong00001',
      ),
    ).resolves.toBe(false);
    await expect(
      verifyCheckoutServiceAuthorization(
        'another-environment',
        `Bearer ${secret}`,
      ),
    ).resolves.toBe(false);
  });

  it('denies unmarked users even when the obsolete deployment switch is enabled', async () => {
    vi.stubEnv('BFF_MOCK_CHECKOUT_ENABLED', 'enabled');
    const t = convexTest({ schema, modules, transactionLimits: true });
    const context = await fixture(t, false);
    await expect(
      t.mutation(internal.checkouts.createForAccount, checkoutArgs(context)),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });

  it('idempotently completes Studio access and team policy in one transaction', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    const context = await fixture(t);
    const input = checkoutArgs(context);
    const created = await t.mutation(
      internal.checkouts.createForAccount,
      input,
    );
    expect(created).toMatchObject({
      kind: 'ok',
      reference: input.publicReference,
    });
    expect(
      await t.mutation(internal.checkouts.createForAccount, {
        ...input,
        publicReference: 'checkout_reference_ignored',
      }),
    ).toEqual(created);

    const challenge = await t.query(internal.checkouts.readChallenge, {
      environmentKey: context.environmentKey,
      reference: input.publicReference,
      now: 2_001,
    });
    expect(challenge).toMatchObject({
      state: 'pending',
      presentation: { productName: 'TableCards' },
      offer: { key: 'studio' },
    });

    await expect(
      t.mutation(internal.checkouts.complete, {
        environmentKey: context.environmentKey,
        reference: input.publicReference,
        now: 3_000,
      }),
    ).resolves.toEqual({
      redirectUrl:
        'https://tablecards-dev.tofler.app/settings?checkout=success&offer=studio',
    });
    expect(
      await t.query(internal.productAccess.currentForAccount, {
        ...context,
        now: 3_001,
      }),
    ).toMatchObject({ offerKey: 'studio', source: 'test_mock' });
    const stored = await t.run(async (ctx) => {
      const environment = await ctx.db
        .query('businessEnvironments')
        .withIndex('by_key', (query) => query.eq('key', context.environmentKey))
        .unique();
      if (!environment) throw new Error('Missing environment');
      return await ctx.db
        .query('accounts')
        .withIndex('by_environment_public_id', (query) =>
          query
            .eq('environmentId', environment._id)
            .eq('publicId', context.accountPublicId),
        )
        .unique();
    });
    expect(stored?.policyOverrides).toEqual(input.accountPolicy);
    await expect(
      t.mutation(internal.checkouts.complete, {
        environmentKey: context.environmentKey,
        reference: input.publicReference,
        now: 3_100,
      }),
    ).rejects.toMatchObject({ data: { code: 'CONFLICT' } });

    await t.run(async (ctx) => {
      const environment = await ctx.db
        .query('businessEnvironments')
        .withIndex('by_key', (query) => query.eq('key', context.environmentKey))
        .unique();
      if (!environment) throw new Error('Missing environment');
      const storedAccount = await ctx.db
        .query('accounts')
        .withIndex('by_environment_public_id', (query) =>
          query
            .eq('environmentId', environment._id)
            .eq('publicId', context.accountPublicId),
        )
        .unique();
      if (!storedAccount) throw new Error('Missing account');
      const principalId = await ctx.db.insert('authPrincipals', {
        createdAt: 3_500,
      });
      const secondUser = await ctx.db.insert('businessUsers', {
        environmentId: environment._id,
        principalId,
        publicId: 'user_test_checkout_member01',
        verifiedEmail: 'test-member@example.invalid',
        displayName: 'Test member',
        isTestUser: true,
        firstSignInProvisioningCompletedAt: 3_500,
        activeMembershipCount: 1,
        ownedAccountCount: 0,
        createdAt: 3_500,
        updatedAt: 3_500,
      });
      await ctx.db.insert('memberships', {
        environmentId: environment._id,
        accountId: storedAccount._id,
        userId: secondUser,
        publicId: 'membership_checkout_member01',
        role: 'member',
        createdAt: 3_500,
        updatedAt: 3_500,
      });
      await ctx.db.patch(storedAccount._id, { activeMembershipCount: 2 });
    });
    const downgrade = {
      ...input,
      idempotencyKey: 'checkout_request_downgrade01',
      requestFingerprint: 'event-pass-v1',
      publicReference: 'checkout_reference_downgrade1',
      offer: {
        key: 'event_pass',
        revision: 1,
        displayName: 'Event Pass',
        priceUsdCents: 500,
        billing: 'one_time' as const,
      },
      grant: {
        offerKey: 'event_pass',
        offerRevision: 1,
        featureFlags: [{ key: 'team_access', enabled: false }],
        numericLimits: [{ key: 'maximum_active_projects', value: 1 }],
        unitGrants: [
          {
            unitType: 'ai_background_batch',
            allowance: 2,
            allocation: { kind: 'fixed' as const, key: 'event-pass-v1' },
          },
        ],
      },
      accountPolicy: {
        seatLimit: 1,
        adminRoleEnabled: false,
        memberInvitationsEnabled: false,
      },
      now: 4_000,
    };
    await t.mutation(internal.checkouts.createForAccount, downgrade);
    await expect(
      t.mutation(internal.checkouts.complete, {
        environmentKey: context.environmentKey,
        reference: downgrade.publicReference,
        now: 4_100,
      }),
    ).rejects.toMatchObject({ data: { code: 'CAPACITY_CONFLICT' } });
    expect(
      await t.query(internal.productAccess.currentForAccount, {
        ...context,
        now: 4_101,
      }),
    ).toMatchObject({ offerKey: 'studio' });
  });

  it('cancels without granting and rejects expired, conflicting, or non-Owner attempts', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    const context = await fixture(t);
    const input = checkoutArgs(context);

    await expect(
      t.mutation(internal.checkouts.createForAccount, {
        ...input,
        returnUrl: 'https://attacker.invalid/settings',
      }),
    ).rejects.toMatchObject({ data: { code: 'VALIDATION_ERROR' } });

    await t.mutation(internal.checkouts.createForAccount, input);
    await expect(
      t.mutation(internal.checkouts.createForAccount, {
        ...input,
        requestFingerprint: 'different-request',
      }),
    ).rejects.toMatchObject({ data: { code: 'CONFLICT' } });
    await expect(
      t.mutation(internal.checkouts.cancel, {
        environmentKey: context.environmentKey,
        reference: input.publicReference,
        now: 2_100,
      }),
    ).resolves.toEqual({
      redirectUrl:
        'https://tablecards-dev.tofler.app/settings?checkout=cancelled&offer=studio',
    });
    expect(
      await t.query(internal.productAccess.currentForAccount, {
        ...context,
        now: 2_101,
      }),
    ).toMatchObject({ offerKey: 'free', source: 'default' });

    const expired = {
      ...input,
      idempotencyKey: 'checkout_request_0000000002',
      requestFingerprint: 'expired-request',
      publicReference: 'checkout_reference_expired1',
      now: 3_000,
    };
    await t.mutation(internal.checkouts.createForAccount, expired);
    await expect(
      t.query(internal.checkouts.readChallenge, {
        environmentKey: context.environmentKey,
        reference: expired.publicReference,
        now: 3_000 + 15 * 60 * 1_000,
      }),
    ).rejects.toMatchObject({ data: { code: 'NOT_FOUND' } });

    await t.run(async (ctx) => {
      const environment = await ctx.db
        .query('businessEnvironments')
        .withIndex('by_key', (query) => query.eq('key', context.environmentKey))
        .unique();
      if (!environment) throw new Error('Missing environment');
      const membership = await ctx.db
        .query('memberships')
        .withIndex('by_environment_public_id', (query) =>
          query
            .eq('environmentId', environment._id)
            .eq('publicId', context.membershipPublicId),
        )
        .unique();
      if (!membership) throw new Error('Missing membership');
      await ctx.db.patch(membership._id, { role: 'member' });
    });
    await expect(
      t.mutation(internal.checkouts.createForAccount, {
        ...input,
        idempotencyKey: 'checkout_request_0000000003',
        requestFingerprint: 'member-request',
        publicReference: 'checkout_reference_member01',
      }),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });
});
