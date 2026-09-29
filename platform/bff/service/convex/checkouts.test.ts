import { convexTest, type TestConvex } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CUSTOMER_AUTH_CONFIGURATION_VERSION,
  DEFAULT_ACCOUNT_POLICY,
  DEFAULT_BUSINESS_ACCOUNT_POLICY,
  DEFAULT_SESSION_POLICY,
  type CustomerAuthConfiguration,
} from '@bff/contracts';
import { internal } from './_generated/api';
import {
  CHECKOUT_SERVICE_AUTH_ENVIRONMENT,
  verifyCheckoutServiceAuthorization,
} from './checkoutServiceAuth';
import { MOCK_CHECKOUT_ENVIRONMENT } from './mockCheckout';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
type TestBackend = TestConvex<typeof schema>;

async function fixture(t: TestBackend) {
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
    developmentAutomationEnabled: true,
    transport: {
      webOrigins: ['https://tablecards-dev.tofler.app'],
      sessionAdapterBaseUrl: 'https://tablecards-api.invalid',
      defaultPostLoginPath: '/',
    },
    sessionPolicy: DEFAULT_SESSION_POLICY,
    accountPolicy: DEFAULT_BUSINESS_ACCOUNT_POLICY,
    accountDefaults: DEFAULT_ACCOUNT_POLICY,
  };
  await t.mutation(internal.businessEnvironments.create, {
    key: 'tablecards-development',
    businessName: 'TableCards',
    environmentName: 'Development',
  });
  await t.mutation(internal.businessEnvironments.configureCustomerAuth, {
    key: 'tablecards-development',
    expectedRevision: 0,
    configuration,
  });
  const result = await t.mutation(internal.customerAuth.bootstrapCustomer, {
    environmentKey: 'tablecards-development',
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
  return {
    environmentKey: 'tablecards-development',
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

  it('is disabled by default', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    const context = await fixture(t);
    await expect(
      t.mutation(internal.checkouts.createForAccount, checkoutArgs(context)),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });

  it('idempotently completes Studio access and team policy in one transaction', async () => {
    vi.stubEnv(MOCK_CHECKOUT_ENVIRONMENT.enabled, 'enabled');
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
    ).toMatchObject({ offerKey: 'studio', source: 'development_mock' });
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
    vi.stubEnv(MOCK_CHECKOUT_ENVIRONMENT.enabled, 'enabled');
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
