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
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
type TestBackend = TestConvex<typeof schema>;

function configuration(
  accountPolicy: Partial<CustomerAuthConfiguration['accountPolicy']> = {},
): CustomerAuthConfiguration {
  return {
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
      webOrigins: ['https://example.tofler.app'],
      sessionAdapterBaseUrl: 'https://example-backend.convex.site',
      defaultPostLoginPath: '/',
    },
    sessionPolicy: DEFAULT_SESSION_POLICY,
    accountPolicy: {
      ...DEFAULT_BUSINESS_ACCOUNT_POLICY,
      ...accountPolicy,
    },
    accountDefaults: DEFAULT_ACCOUNT_POLICY,
  };
}

async function createConfiguredEnvironment(
  t: TestBackend,
  key: string,
  customerConfiguration = configuration(),
) {
  await t.mutation(internal.businessEnvironments.create, {
    key,
    businessName: 'Example',
    environmentName: key,
  });
  await t.mutation(internal.businessEnvironments.configureCustomerAuth, {
    key,
    expectedRevision: 0,
    configuration: customerConfiguration,
  });
}

function bootstrapArgs(
  environmentKey: string,
  subject: string,
  suffix: string,
) {
  return {
    environmentKey,
    provider: 'google' as const,
    issuer: 'https://accounts.google.com',
    subject,
    profile: {
      verifiedEmail: `${subject}@example.com`,
      displayName: `User ${subject}`,
      pictureUrl: `https://images.example.com/${subject}.png`,
    },
    candidates: {
      userPublicId: `user_${suffix.padStart(16, '0')}`,
      accountPublicId: `account_${suffix.padStart(16, '0')}`,
      membershipPublicId: `membership_${suffix.padStart(16, '0')}`,
    },
    now: 1_000,
  };
}

describe('customer identity and first-sign-in bootstrap', () => {
  it('allows only the live Owner to rename a workspace within its environment', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    await createConfiguredEnvironment(t, 'example-development');
    await createConfiguredEnvironment(t, 'other-development');
    await t.mutation(
      internal.customerAuth.bootstrapCustomer,
      bootstrapArgs('example-development', 'owner', '41'),
    );
    await t.mutation(
      internal.customerAuth.bootstrapCustomer,
      bootstrapArgs('example-development', 'outsider', '42'),
    );
    const args = {
      environmentKey: 'example-development',
      accountPublicId: 'account_0000000000000041',
      actorUserPublicId: 'user_0000000000000041',
      displayName: '  Autumn Studio  ',
      now: 2_000,
    };
    expect(await t.mutation(internal.accounts.rename, args)).toMatchObject({
      displayName: 'Autumn Studio',
      updatedAt: 2_000,
    });
    await expect(
      t.mutation(internal.accounts.rename, {
        ...args,
        actorUserPublicId: 'user_0000000000000042',
      }),
    ).rejects.toThrow(/FORBIDDEN/u);
    await expect(
      t.mutation(internal.accounts.rename, {
        ...args,
        environmentKey: 'other-development',
      }),
    ).rejects.toThrow(/NOT_FOUND/u);
    await expect(
      t.mutation(internal.accounts.rename, { ...args, displayName: ' ' }),
    ).rejects.toThrow();
    await expect(
      t.mutation(internal.accounts.rename, {
        ...args,
        displayName: 'x'.repeat(121),
      }),
    ).rejects.toThrow();
    expect(
      await t.run(async (ctx) => {
        const environment = await ctx.db
          .query('businessEnvironments')
          .withIndex('by_key', (q) => q.eq('key', args.environmentKey))
          .unique();
        return (
          await ctx.db
            .query('accounts')
            .withIndex('by_environment_public_id', (q) =>
              q
                .eq('environmentId', environment!._id)
                .eq('publicId', args.accountPublicId),
            )
            .unique()
        )?.displayName;
      }),
    ).toBe('Autumn Studio');
  });
  it('reuses the same identity, local user, account, and Owner membership', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    await createConfiguredEnvironment(t, 'example-development');

    const first = await t.mutation(
      internal.customerAuth.bootstrapCustomer,
      bootstrapArgs('example-development', 'google-123', '1'),
    );
    const second = await t.mutation(internal.customerAuth.bootstrapCustomer, {
      ...bootstrapArgs('example-development', 'google-123', '2'),
      profile: {
        verifiedEmail: 'updated@example.com',
        displayName: 'Updated User',
      },
      now: 2_000,
    });

    expect(first.kind).toBe('ok');
    expect(second).toMatchObject({
      kind: 'ok',
      customer: {
        user: {
          id: 'user_0000000000000001',
          verifiedEmail: 'updated@example.com',
          displayName: 'Updated User',
        },
        accounts: [
          {
            id: 'account_0000000000000001',
            membership: {
              id: 'membership_0000000000000001',
              role: 'owner',
            },
          },
        ],
      },
    });

    expect(
      await t.run(async (ctx) => ({
        principals: (await ctx.db.query('authPrincipals').collect()).length,
        identities: (await ctx.db.query('authIdentities').collect()).length,
        users: (await ctx.db.query('businessUsers').collect()).length,
        accounts: (await ctx.db.query('accounts').collect()).length,
        memberships: (await ctx.db.query('memberships').collect()).length,
      })),
    ).toEqual({
      principals: 1,
      identities: 1,
      users: 1,
      accounts: 1,
      memberships: 1,
    });
  });

  it('keeps equal emails separate when provider subjects differ', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    await createConfiguredEnvironment(t, 'example-development');
    const sharedProfile = {
      verifiedEmail: 'shared@example.com',
      displayName: 'Shared Email',
    };

    await t.mutation(internal.customerAuth.bootstrapCustomer, {
      ...bootstrapArgs('example-development', 'subject-one', '1'),
      profile: sharedProfile,
    });
    await t.mutation(internal.customerAuth.bootstrapCustomer, {
      ...bootstrapArgs('example-development', 'subject-two', '2'),
      profile: sharedProfile,
    });

    expect(
      await t.run(async (ctx) => ({
        principals: (await ctx.db.query('authPrincipals').collect()).length,
        users: (await ctx.db.query('businessUsers').collect()).length,
      })),
    ).toEqual({ principals: 2, users: 2 });
  });

  it('supports onboarding without creating a temporary account', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    await createConfiguredEnvironment(
      t,
      'managed-development',
      configuration({ createAccountOnFirstSignIn: false }),
    );

    const first = await t.mutation(
      internal.customerAuth.bootstrapCustomer,
      bootstrapArgs('managed-development', 'managed-user', '1'),
    );
    expect(first).toMatchObject({ kind: 'ok', customer: { accounts: [] } });

    const nextConfiguration = configuration({
      createAccountOnFirstSignIn: true,
    });
    const preflight = await t.action(
      internal.customerOperations.previewCustomerConfiguration,
      {
        key: 'managed-development',
        configuration: nextConfiguration,
      },
    );
    await t.mutation(internal.businessEnvironments.configureCustomerAuth, {
      key: 'managed-development',
      expectedRevision: preflight.currentRevision,
      expectedAccountPolicyStateRevision: preflight.accountPolicyStateRevision,
      preflightId: preflight.preflightId,
      configuration: nextConfiguration,
    });
    const repeated = await t.mutation(
      internal.customerAuth.bootstrapCustomer,
      bootstrapArgs('managed-development', 'managed-user', '2'),
    );
    expect(repeated).toMatchObject({
      kind: 'ok',
      customer: { accounts: [] },
    });
  });

  it('converges repeated first-login requests and isolates environments', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    await createConfiguredEnvironment(t, 'one-development');
    await createConfiguredEnvironment(t, 'two-development');

    const [one, repeated] = await Promise.all([
      t.mutation(
        internal.customerAuth.bootstrapCustomer,
        bootstrapArgs('one-development', 'same-subject', '1'),
      ),
      t.mutation(
        internal.customerAuth.bootstrapCustomer,
        bootstrapArgs('one-development', 'same-subject', '2'),
      ),
    ]);
    const two = await t.mutation(
      internal.customerAuth.bootstrapCustomer,
      bootstrapArgs('two-development', 'same-subject', '3'),
    );

    expect(one.kind).toBe('ok');
    expect(repeated).toMatchObject({
      kind: 'ok',
      customer: { user: { id: 'user_0000000000000001' } },
    });
    expect(two).toMatchObject({
      kind: 'ok',
      customer: { user: { id: 'user_0000000000000003' } },
    });
    expect(
      await t.run(async (ctx) => ({
        principals: (await ctx.db.query('authPrincipals').collect()).length,
        identities: (await ctx.db.query('authIdentities').collect()).length,
        users: (await ctx.db.query('businessUsers').collect()).length,
      })),
    ).toEqual({ principals: 1, identities: 1, users: 2 });
  });

  it('returns a retryable collision without materializing an identity', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    await createConfiguredEnvironment(t, 'example-development');
    await t.mutation(
      internal.customerAuth.bootstrapCustomer,
      bootstrapArgs('example-development', 'first-subject', '1'),
    );

    const result = await t.mutation(internal.customerAuth.bootstrapCustomer, {
      ...bootstrapArgs('example-development', 'second-subject', '2'),
      candidates: {
        ...bootstrapArgs('example-development', 'second-subject', '2')
          .candidates,
        accountPublicId: 'account_0000000000000001',
      },
    });
    expect(result).toEqual({
      kind: 'collision',
      field: 'accountPublicId',
    });
    expect(
      await t.run(async (ctx) => ({
        principals: (await ctx.db.query('authPrincipals').collect()).length,
        identities: (await ctx.db.query('authIdentities').collect()).length,
      })),
    ).toEqual({ principals: 1, identities: 1 });
  });

  it('rejects login for an environment without customer configuration', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    await t.mutation(internal.businessEnvironments.create, {
      key: 'disabled-development',
      businessName: 'Disabled',
      environmentName: 'Development',
    });

    await expect(
      t.mutation(
        internal.customerAuth.bootstrapCustomer,
        bootstrapArgs('disabled-development', 'subject', '1'),
      ),
    ).rejects.toThrow(/CONFIGURATION_ERROR|not configured/);
  });
});
