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

function configuration(
  developmentAutomationEnabled = true,
): CustomerAuthConfiguration {
  return {
    version: CUSTOMER_AUTH_CONFIGURATION_VERSION,
    enabledProviders: ['google'],
    developmentAutomationEnabled,
    transport: {
      webOrigins: ['https://example.tofler.app'],
      sessionAdapterBaseUrl: 'https://example-backend.convex.site',
      defaultPostLoginPath: '/',
    },
    sessionPolicy: DEFAULT_SESSION_POLICY,
    accountPolicy: DEFAULT_BUSINESS_ACCOUNT_POLICY,
    accountDefaults: DEFAULT_ACCOUNT_POLICY,
  };
}

async function configure(t: TestBackend, developmentAutomationEnabled = true) {
  await t.mutation(internal.businessEnvironments.create, {
    key: 'example-development',
    businessName: 'Example',
    environmentName: 'Development',
  });
  await t.mutation(internal.businessEnvironments.configureCustomerAuth, {
    key: 'example-development',
    expectedRevision: 0,
    configuration: configuration(developmentAutomationEnabled),
  });
}

async function start(t: TestBackend, reference: string, now: number) {
  await t.mutation(internal.loginTransactions.startLogin, {
    environmentKey: 'example-development',
    reference,
    state: 'state_abcdefghijklmnopqrstuvwxyz012345',
    providerNonce: 'nonce_abcdefghijklmnopqrstuvwxyz012345',
    pkceChallenge: await pkceS256Challenge(verifier),
    callbackUrl,
    webOrigin: 'https://example.tofler.app',
    returnPath: '/',
    now,
  });
}

function candidates(suffix: string) {
  return {
    userPublicId: `user_${suffix.padStart(16, '0')}`,
    accountPublicId: `account_${suffix.padStart(16, '0')}`,
    membershipPublicId: `membership_${suffix.padStart(16, '0')}`,
  };
}

describe('customer development provider', () => {
  it('does not register the development completion route without verifier configuration', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    const response = await t.fetch('/v1/auth/transactions/development', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://auth.tofler.app',
      },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(404);
  });

  it('creates or reuses a deterministic dummy persona and consumes a grant once', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    await configure(t);
    await start(t, 'login_development_001', 1_000_000);
    const grantHash = await sha256Base64Url('signed-development-grant-one');
    const grantIdHash = await sha256Base64Url('grant-id-one');
    const completed = await t.mutation(
      internal.loginTransactions.completeDevelopmentProvider,
      {
        environmentKey: 'example-development',
        reference: 'login_development_001',
        target: {
          capability: 'signup',
          personaId: 'alice-one',
          profile: {
            verifiedEmail: 'alice@example.invalid',
            displayName: 'Alice One',
          },
        },
        grantHash,
        grantIdHash,
        handoffCodeHash: await sha256Base64Url('handoff-one'),
        authenticatedAt: 1_001,
        candidates: candidates('one'),
        now: 1_001_000,
      },
    );
    expect(completed).toMatchObject({ kind: 'ok', callbackUrl });

    await start(t, 'login_development_002', 1_002_000);
    await expect(
      t.mutation(internal.loginTransactions.completeDevelopmentProvider, {
        environmentKey: 'example-development',
        reference: 'login_development_002',
        target: {
          capability: 'signup',
          personaId: 'alice-one',
          profile: {
            verifiedEmail: 'alice@example.invalid',
            displayName: 'Alice One',
          },
        },
        grantHash,
        grantIdHash,
        handoffCodeHash: await sha256Base64Url('handoff-two'),
        authenticatedAt: 1_002,
        candidates: candidates('two'),
        now: 1_003_000,
      }),
    ).rejects.toThrow(/CONFLICT|already used/u);

    await start(t, 'login_development_005', 1_004_000);
    await t.mutation(internal.loginTransactions.completeDevelopmentProvider, {
      environmentKey: 'example-development',
      reference: 'login_development_005',
      target: {
        capability: 'signup',
        personaId: 'alice-one',
        profile: {
          verifiedEmail: 'alice@example.invalid',
          displayName: 'Alice One',
        },
      },
      grantHash: await sha256Base64Url('new-grant-for-same-persona'),
      grantIdHash: await sha256Base64Url('new-grant-id-for-same-persona'),
      handoffCodeHash: await sha256Base64Url('handoff-five'),
      authenticatedAt: 1_004,
      candidates: candidates('five'),
      now: 1_005_000,
    });

    const result = await t.run(async (ctx) => ({
      users: await ctx.db
        .query('businessUsers')
        .withIndex('by_environment')
        .take(10),
      events: await ctx.db
        .query('securityEvents')
        .withIndex('by_environment_occurred_at')
        .take(10),
    }));
    expect(result.users).toHaveLength(1);
    expect(result.users[0]).toMatchObject({
      verifiedEmail: 'alice@example.invalid',
      displayName: 'Alice One',
    });
    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toMatchObject({
      type: 'development_automation_used',
      automationCapability: 'signup',
      automationTarget: 'alice-one',
      grantIdHash,
    });
  });

  it('logs in as an existing Google user without linking or rewriting identity data', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    await configure(t);
    const bootstrapped = await t.mutation(
      internal.customerAuth.bootstrapCustomer,
      {
        environmentKey: 'example-development',
        provider: 'google',
        issuer: 'https://accounts.google.com',
        subject: 'real-google-subject',
        profile: {
          verifiedEmail: 'real@example.com',
          displayName: 'Real Google User',
        },
        candidates: candidates('real'),
        now: 2_000_000,
      },
    );
    if (bootstrapped.kind !== 'ok') throw new Error('Bootstrap collided');
    await start(t, 'login_development_003', 2_001_000);
    await t.mutation(internal.loginTransactions.completeDevelopmentProvider, {
      environmentKey: 'example-development',
      reference: 'login_development_003',
      target: {
        capability: 'login_as',
        userPublicId: bootstrapped.customer.user.id,
      },
      grantHash: await sha256Base64Url('signed-login-as-grant'),
      grantIdHash: await sha256Base64Url('login-as-grant-id'),
      handoffCodeHash: await sha256Base64Url('login-as-handoff'),
      authenticatedAt: 2_001,
      candidates: candidates('unused'),
      now: 2_002_000,
    });

    expect(
      await t.run(async (ctx) => {
        const environment = await ctx.db
          .query('businessEnvironments')
          .withIndex('by_key', (query) =>
            query.eq('key', 'example-development'),
          )
          .unique();
        const user = environment
          ? await ctx.db
              .query('businessUsers')
              .withIndex('by_environment_public_id', (query) =>
                query
                  .eq('environmentId', environment._id)
                  .eq('publicId', bootstrapped.customer.user.id),
              )
              .unique()
          : null;
        if (!user) throw new Error('Bootstrapped user is missing');
        const identities = await ctx.db
          .query('authIdentities')
          .withIndex('by_principal', (query) =>
            query.eq('principalId', user.principalId),
          )
          .take(10);
        return { identities, user };
      }),
    ).toMatchObject({
      identities: [
        {
          provider: 'google',
          subject: 'real-google-subject',
          lastAuthenticatedAt: 2_000_000,
        },
      ],
      user: {
        verifiedEmail: 'real@example.com',
        displayName: 'Real Google User',
        updatedAt: 2_000_000,
      },
    });
  });

  it('rejects completion when the Business environment disables automation', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    await configure(t, false);
    await start(t, 'login_development_004', 3_000_000);
    await expect(
      t.mutation(internal.loginTransactions.completeDevelopmentProvider, {
        environmentKey: 'example-development',
        reference: 'login_development_004',
        target: {
          capability: 'signup',
          personaId: 'disabled-user',
          profile: {
            verifiedEmail: 'disabled@example.invalid',
            displayName: 'Disabled User',
          },
        },
        grantHash: await sha256Base64Url('disabled-grant'),
        grantIdHash: await sha256Base64Url('disabled-grant-id'),
        handoffCodeHash: await sha256Base64Url('disabled-handoff'),
        authenticatedAt: 3_001,
        candidates: candidates('disabled'),
        now: 3_001_000,
      }),
    ).rejects.toThrow(/FORBIDDEN|not enabled/u);
  });
});
