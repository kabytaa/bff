import { convexTest, type TestConvex } from 'convex-test';
import { exportJWK, generateKeyPair } from 'jose';
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
  DEVELOPMENT_PRODUCT_ACCESS_ENVIRONMENT,
  developmentProductAccessRouteEnabled,
} from './developmentProductAccess';
import {
  CUSTOMER_SIGNING_ENVIRONMENT,
  parseCustomerSigningConfiguration,
  signCustomerContextToken,
} from './lib/customerCrypto';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
type TestBackend = TestConvex<typeof schema>;
const BILLING_CYCLE_START = Date.UTC(2026, 8, 10, 12);
const freeDefaultGrant = {
  offerKey: 'free',
  offerRevision: 1,
  featureFlags: [{ key: 'ai_backgrounds', enabled: true }],
  numericLimits: [{ key: 'maximum_active_projects', value: 1 }],
  unitGrants: [
    {
      unitType: 'ai_background_batch',
      periodKey: 'welcome-lifetime-v1',
      allowance: 1,
    },
  ],
};

function configuration(
  developmentAutomationEnabled = true,
): CustomerAuthConfiguration {
  return {
    version: CUSTOMER_AUTH_CONFIGURATION_VERSION,
    definitionRevision: 1,
    definitionFingerprint: 'fnv1a64:0000000000000000',
    presentation: {
      productName: 'TableCards',
      theme: 'system',
      accentColor: '#314EC6',
    },
    enabledProviders: ['google'],
    developmentAutomationEnabled,
    transport: {
      webOrigins: ['https://tablecards-dev.tofler.app'],
      sessionAdapterBaseUrl: 'https://api.tablecards-dev.tofler.app',
      defaultPostLoginPath: '/',
    },
    sessionPolicy: DEFAULT_SESSION_POLICY,
    accountPolicy: DEFAULT_BUSINESS_ACCOUNT_POLICY,
    accountDefaults: DEFAULT_ACCOUNT_POLICY,
  };
}

async function fixture(t: TestBackend, developmentAutomationEnabled = true) {
  await t.mutation(internal.businessEnvironments.create, {
    key: 'tablecards-development',
    businessName: 'TableCards',
    environmentName: 'Development',
  });
  await t.mutation(internal.businessEnvironments.configureCustomerAuth, {
    key: 'tablecards-development',
    expectedRevision: 0,
    configuration: configuration(developmentAutomationEnabled),
  });
  const bootstrapped = await t.mutation(
    internal.customerAuth.bootstrapCustomer,
    {
      environmentKey: 'tablecards-development',
      provider: 'google',
      issuer: 'https://accounts.google.com',
      subject: 'product-access-test-user',
      profile: {
        verifiedEmail: 'planner@example.com',
        displayName: 'Planner',
      },
      candidates: {
        userPublicId: 'user_product_access01',
        accountPublicId: 'account_product_access01',
        membershipPublicId: 'membership_product01',
      },
      now: 1_000,
    },
  );
  if (bootstrapped.kind !== 'ok' || !bootstrapped.customer.accounts[0]) {
    throw new Error('Fixture bootstrap failed');
  }
  const account = bootstrapped.customer.accounts[0];
  await t.run(async (ctx) => {
    const environment = await ctx.db
      .query('businessEnvironments')
      .withIndex('by_key', (q) => q.eq('key', 'tablecards-development'))
      .unique();
    const user =
      environment &&
      (await ctx.db
        .query('businessUsers')
        .withIndex('by_environment_public_id', (q) =>
          q
            .eq('environmentId', environment._id)
            .eq('publicId', bootstrapped.customer.user.id),
        )
        .unique());
    if (!environment || !user) throw new Error('Fixture session scope missing');
    await ctx.db.insert('businessSessions', {
      environmentId: environment._id,
      userId: user._id,
      publicId: 'session_product_access1',
      handleHash: 'a'.repeat(43),
      provider: 'google',
      providerAuthenticatedAt: 1_000,
      createdAt: 1_000,
      lastSeenAt: 1_000,
      idleExpiresAt: Date.now() + 600_000,
      absoluteExpiresAt: Date.now() + 1_200_000,
      cleanupAt: Date.now() + 2_000_000,
    });
  });
  return {
    environmentKey: 'tablecards-development',
    userPublicId: bootstrapped.customer.user.id,
    accountPublicId: account.id,
    membershipPublicId: account.membership.id,
  };
}

async function installSigningConfiguration() {
  const { privateKey, publicKey } = await generateKeyPair('ES256', {
    extractable: true,
  });
  const kid = 'product-access-test-key';
  const privateJwk = {
    ...(await exportJWK(privateKey)),
    alg: 'ES256',
    kid,
    use: 'sig',
  };
  const publicJwks = {
    keys: [
      {
        ...(await exportJWK(publicKey)),
        alg: 'ES256',
        kid,
        use: 'sig',
      },
    ],
  };
  const signing = parseCustomerSigningConfiguration({
    issuer: 'https://auth-dev.tofler.app',
    privateJwk: JSON.stringify(privateJwk),
    publicJwks: JSON.stringify(publicJwks),
  });
  vi.stubEnv(CUSTOMER_SIGNING_ENVIRONMENT.issuer, signing.issuer);
  vi.stubEnv(
    CUSTOMER_SIGNING_ENVIRONMENT.privateJwk,
    JSON.stringify(privateJwk),
  );
  vi.stubEnv(
    CUSTOMER_SIGNING_ENVIRONMENT.publicJwks,
    JSON.stringify(publicJwks),
  );
  return signing;
}

function grantArgs(context: Awaited<ReturnType<typeof fixture>>) {
  return {
    ...context,
    offerKey: 'planner-pro',
    offerRevision: 1,
    featureFlags: [{ key: 'premium_designs', enabled: true }],
    numericLimits: [{ key: 'active_projects', value: 25 }],
    unitGrants: [
      {
        unitType: 'ai_background_batch',
        allowance: 2,
        allocation: { kind: 'monthly' as const },
      },
    ],
    now: BILLING_CYCLE_START,
  };
}

afterEach(() => vi.unstubAllEnvs());

describe('product access projection and unit ledger', () => {
  it('grants Free exactly once, releases failed usage and never replenishes a consumed lifetime batch', async () => {
    vi.stubEnv(DEVELOPMENT_PRODUCT_ACCESS_ENVIRONMENT.enabled, 'disabled');
    const t = convexTest({ schema, modules, transactionLimits: true });
    const context = await fixture(t, false);
    const input = { ...context, ...freeDefaultGrant, now: BILLING_CYCLE_START };
    const [first, concurrent] = await Promise.all([
      t.mutation(internal.productAccess.ensureDefaultForAccount, input),
      t.mutation(internal.productAccess.ensureDefaultForAccount, input),
    ]);
    expect(first).toEqual(concurrent);
    expect(first).toMatchObject({
      source: 'default',
      unitGrants: freeDefaultGrant.unitGrants,
    });
    const balance = () =>
      t.query(internal.unitLedger.balanceForAccount, {
        ...context,
        unitType: 'ai_background_batch',
        now: BILLING_CYCLE_START,
      });
    await expect(balance()).resolves.toMatchObject({
      allowance: 1,
      available: 1,
    });
    await t.run(async (ctx) => {
      expect(await ctx.db.query('accountAccessGrants').take(2)).toHaveLength(1);
      expect(await ctx.db.query('accountUnitBuckets').take(1)).toEqual([]);
    });
    const request = {
      ...context,
      unitType: 'ai_background_batch',
      amount: 1,
      idempotencyKey: 'welcome_default_request01',
      reservationPublicId: 'unit_reservation_welcome01',
      now: BILLING_CYCLE_START,
    };
    const held = await t.mutation(
      internal.unitLedger.reserveForAccount,
      request,
    );
    if (held.kind !== 'ok') throw new Error('Expected welcome reservation');
    await expect(
      t.mutation(internal.unitLedger.reserveForAccount, {
        ...request,
        idempotencyKey: 'welcome_default_request02',
        reservationPublicId: 'unit_reservation_welcome02',
      }),
    ).rejects.toThrow('UNIT_EXHAUSTED');
    const release = {
      ...context,
      reservationId: held.result.reservation.id,
      idempotencyKey: request.idempotencyKey,
      now: request.now,
    };
    await expect(
      t.mutation(internal.unitLedger.releaseForAccount, release),
    ).resolves.toMatchObject({ balance: { available: 1 } });
    await expect(
      t.mutation(internal.unitLedger.releaseForAccount, release),
    ).resolves.toMatchObject({ balance: { available: 1 } });
    const spent = await t.mutation(internal.unitLedger.reserveForAccount, {
      ...request,
      idempotencyKey: 'welcome_default_request03',
      reservationPublicId: 'unit_reservation_welcome03',
    });
    if (spent.kind !== 'ok') throw new Error('Expected welcome reservation');
    const commit = {
      ...context,
      reservationId: spent.result.reservation.id,
      idempotencyKey: 'welcome_default_request03',
      now: request.now,
    };
    await t.mutation(internal.unitLedger.commitForAccount, commit);
    await t.mutation(internal.unitLedger.commitForAccount, commit);
    await expect(
      t.mutation(internal.productAccess.ensureDefaultForAccount, {
        ...input,
        now: BILLING_CYCLE_START + 40 * 86_400_000,
      }),
    ).resolves.toEqual(first);
    await expect(balance()).resolves.toMatchObject({
      allowance: 1,
      consumed: 1,
      reserved: 0,
      available: 0,
    });
    await expect(
      t.mutation(internal.unitLedger.reserveForAccount, {
        ...request,
        idempotencyKey: 'welcome_default_request04',
        reservationPublicId: 'unit_reservation_welcome04',
      }),
    ).rejects.toThrow('UNIT_EXHAUSTED');
  });

  it.each(['provider', 'development_mock'] as const)(
    'never replaces existing %s access with a Free grant',
    async (source) => {
      const t = convexTest({ schema, modules, transactionLimits: true });
      const context = await fixture(t, false);
      await t.mutation(internal.productAccess.ensureDefaultForAccount, {
        ...context,
        ...freeDefaultGrant,
        now: BILLING_CYCLE_START,
      });
      const before = await t.run(async (ctx) => {
        const row = await ctx.db.query('accountAccessGrants').take(1);
        await ctx.db.patch(row[0]!._id, {
          source,
          offerKey: 'studio',
          offerRevision: 2,
          unitGrants: [
            {
              unitType: 'ai_background_batch',
              allowance: 30,
              periodKey: 'billing-cycle:1:2',
            },
          ],
        });
        return await ctx.db.get(row[0]!._id);
      });
      await expect(
        t.mutation(internal.productAccess.ensureDefaultForAccount, {
          ...context,
          ...freeDefaultGrant,
          now: BILLING_CYCLE_START + 1,
        }),
      ).resolves.toMatchObject({
        source,
        offerKey: 'studio',
        offerRevision: 2,
        unitGrants: [{ allowance: 30 }],
      });
      await t.run(async (ctx) => {
        expect(await ctx.db.get(before!._id)).toEqual(before);
      });
    },
  );

  it('preserves a legacy lifetime bucket even if its access grant is missing', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    const context = await fixture(t, false);
    await t.run(async (ctx) => {
      const environment = await ctx.db
        .query('businessEnvironments')
        .withIndex('by_key', (q) => q.eq('key', context.environmentKey))
        .unique();
      const account = await ctx.db
        .query('accounts')
        .withIndex('by_environment_public_id', (q) =>
          q
            .eq('environmentId', environment!._id)
            .eq('publicId', context.accountPublicId),
        )
        .unique();
      await ctx.db.insert('accountUnitBuckets', {
        environmentId: environment!._id,
        accountId: account!._id,
        unitType: 'ai_background_batch',
        periodKey: 'welcome-lifetime-v1',
        allowance: 1,
        reserved: 0,
        consumed: 1,
        createdAt: 1,
        updatedAt: 2,
      });
    });
    await t.mutation(internal.productAccess.ensureDefaultForAccount, {
      ...context,
      ...freeDefaultGrant,
      now: BILLING_CYCLE_START,
    });
    await expect(
      t.query(internal.unitLedger.balanceForAccount, {
        ...context,
        unitType: 'ai_background_batch',
        now: BILLING_CYCLE_START,
      }),
    ).resolves.toMatchObject({ consumed: 1, available: 0, updatedAt: 2 });
  });

  it('requires the live customer context and matching Business service credential for default initialization', async () => {
    vi.stubEnv(DEVELOPMENT_PRODUCT_ACCESS_ENVIRONMENT.enabled, 'disabled');
    const t = convexTest({ schema, modules, transactionLimits: true });
    const context = await fixture(t, false);
    const signing = await installSigningConfiguration();
    const now = Math.floor(Date.now() / 1_000);
    const claims = {
      contextType: 'account' as const,
      ...context,
      sessionPublicId: 'session_product_access1',
      tokenPublicId: 'token_default_access001',
      role: 'owner' as const,
      permissions: ['account:read'] as const,
      authorizedAt: now,
      expiresAt: now + 600,
    };
    const token = await signCustomerContextToken(signing, claims);
    const service = 'synthetic_default_service_secret_001';
    vi.stubEnv(
      'BFF_CHECKOUT_SERVICE_SECRETS_JSON',
      JSON.stringify({ [context.environmentKey]: service }),
    );
    const post = (
      bearer: string,
      credential?: string,
      body: unknown = freeDefaultGrant,
    ) =>
      t.fetch('/v1/product-access/default', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${bearer}`,
          'x-tofler-environment': context.environmentKey,
          'content-type': 'application/json',
          ...(credential === undefined
            ? {}
            : { 'x-tofler-service-authorization': `Bearer ${credential}` }),
        },
        body: JSON.stringify(body),
      });
    expect((await post('', service)).status).toBe(401);
    expect((await post(token)).status).toBe(401);
    expect((await post(token, 'wrong_service_secret_00000000001')).status).toBe(
      401,
    );
    vi.stubEnv(
      'BFF_CHECKOUT_SERVICE_SECRETS_JSON',
      JSON.stringify({ 'tablecards-production': service }),
    );
    expect((await post(token, service)).status).toBe(401);
    vi.stubEnv(
      'BFF_CHECKOUT_SERVICE_SECRETS_JSON',
      JSON.stringify({ [context.environmentKey]: service }),
    );
    expect(
      (
        await post(token, service, {
          ...freeDefaultGrant,
          accountPublicId: 'account_other_customer01',
        })
      ).status,
    ).toBe(400);
    const wrongMember = await signCustomerContextToken(signing, {
      ...claims,
      membershipPublicId: 'membership_other_user01',
    });
    expect((await post(wrongMember, service)).status).toBe(403);
    const second = await t.mutation(internal.customerAuth.bootstrapCustomer, {
      environmentKey: context.environmentKey,
      provider: 'google',
      issuer: 'https://accounts.google.com',
      subject: 'other-default-test-user',
      profile: {
        verifiedEmail: 'other-planner@example.com',
        displayName: 'Other planner',
      },
      candidates: {
        userPublicId: 'user_default_other001',
        accountPublicId: 'account_default_other001',
        membershipPublicId: 'membership_default_other01',
      },
      now: Date.now(),
    });
    if (second.kind !== 'ok') throw new Error('Expected second customer');
    const wrongAccount = await signCustomerContextToken(signing, {
      ...claims,
      accountPublicId: second.customer.accounts[0]!.id,
    });
    expect((await post(wrongAccount, service)).status).toBe(403);
    await t.run(async (ctx) => {
      expect(await ctx.db.query('accountAccessGrants').take(1)).toEqual([]);
    });
    const success = await post(token, service);
    expect(success.status).toBe(200);
    expect(await success.json()).toMatchObject({
      source: 'default',
      accountId: context.accountPublicId,
      unitGrants: freeDefaultGrant.unitGrants,
    });
    await t.run(async (ctx) => {
      expect(await ctx.db.query('accountAccessGrants').take(2)).toHaveLength(1);
    });
    await t.mutation(internal.sessions.logout, {
      environmentKey: context.environmentKey,
      handleHash: 'a'.repeat(43),
      now: Date.now(),
    });
    expect((await post(token, service)).status).toBe(401);
  });

  it('loads a fresh Free account with no allocation while still refusing unit spending', async () => {
    vi.stubEnv(DEVELOPMENT_PRODUCT_ACCESS_ENVIRONMENT.enabled, 'disabled');
    const t = convexTest({ schema, modules, transactionLimits: true });
    const context = await fixture(t, false);
    const access = await t.query(internal.productAccess.currentForAccount, {
      ...context,
      now: BILLING_CYCLE_START,
    });
    expect(access).toMatchObject({
      offerKey: 'free',
      source: 'default',
      unitGrants: [],
    });
    await expect(
      t.query(internal.unitLedger.balanceForAccount, {
        ...context,
        unitType: 'ai_background_batch',
        now: BILLING_CYCLE_START,
      }),
    ).resolves.toMatchObject({
      accountId: context.accountPublicId,
      unitType: 'ai_background_batch',
      periodKey: 'unallocated',
      allowance: 0,
      reserved: 0,
      consumed: 0,
      available: 0,
    });
    const signing = await installSigningConfiguration();
    const now = Math.floor(Date.now() / 1_000);
    const token = await signCustomerContextToken(signing, {
      contextType: 'account',
      environmentKey: context.environmentKey,
      userPublicId: context.userPublicId,
      sessionPublicId: 'session_product_access1',
      tokenPublicId: 'token_fresh_free_read01',
      accountPublicId: context.accountPublicId,
      membershipPublicId: context.membershipPublicId,
      role: 'owner',
      permissions: ['account:read'],
      authorizedAt: now,
      expiresAt: now + 600,
    });
    const response = await t.fetch(
      '/v1/product-access/units?unitType=ai_background_batch',
      {
        headers: {
          authorization: `Bearer ${token}`,
          origin: 'https://tablecards-dev.tofler.app',
          'x-tofler-environment': context.environmentKey,
        },
      },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      allowance: 0,
      available: 0,
      periodKey: 'unallocated',
    });
    expect(
      (await t.fetch('/v1/product-access/units?unitType=ai_background_batch'))
        .status,
    ).toBe(401);
    await expect(
      t.mutation(internal.unitLedger.reserveForAccount, {
        ...context,
        unitType: 'ai_background_batch',
        amount: 1,
        idempotencyKey: 'fresh_account_reserve_01',
        reservationPublicId: 'unit_reservation_fresh01',
        now: BILLING_CYCLE_START,
      }),
    ).rejects.toThrow('UNIT_EXHAUSTED');
    await expect(
      t.query(internal.unitLedger.balanceForAccount, {
        ...context,
        membershipPublicId: 'membership_other_user01',
        unitType: 'ai_background_batch',
        now: BILLING_CYCLE_START,
      }),
    ).rejects.toThrow('FORBIDDEN');
    await t.run(async (ctx) => {
      expect(await ctx.db.query('accountAccessGrants').take(1)).toEqual([]);
      expect(await ctx.db.query('accountUnitBuckets').take(1)).toEqual([]);
      expect(await ctx.db.query('accountUnitReservations').take(1)).toEqual([]);
    });
  });

  it('resolves missing access to Free and exposes it through the authenticated route', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    const context = await fixture(t);
    expect(
      await t.query(internal.productAccess.currentForAccount, {
        ...context,
        now: BILLING_CYCLE_START,
      }),
    ).toMatchObject({
      version: 1,
      accountId: context.accountPublicId,
      offerKey: 'free',
      offerRevision: 1,
      source: 'default',
      featureFlags: [],
      numericLimits: [],
      unitGrants: [],
    });

    const signing = await installSigningConfiguration();
    const now = Math.floor(Date.now() / 1_000);
    const token = await signCustomerContextToken(signing, {
      contextType: 'account',
      environmentKey: context.environmentKey,
      userPublicId: context.userPublicId,
      sessionPublicId: 'session_product_access1',
      tokenPublicId: 'token_product_access001',
      accountPublicId: context.accountPublicId,
      membershipPublicId: context.membershipPublicId,
      role: 'owner',
      permissions: ['account:read'],
      authorizedAt: now,
      expiresAt: now + 600,
    });
    const response = await t.fetch('/v1/product-access', {
      headers: {
        authorization: `Bearer ${token}`,
        origin: 'https://tablecards-dev.tofler.app',
        'x-tofler-environment': context.environmentKey,
      },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      offerKey: 'free',
      accountId: context.accountPublicId,
    });
  });

  it('fails closed unless deployment and Business development gates are enabled', async () => {
    expect(developmentProductAccessRouteEnabled({})).toBe(false);
    expect(
      developmentProductAccessRouteEnabled({
        [DEVELOPMENT_PRODUCT_ACCESS_ENVIRONMENT.enabled]: 'true',
      }),
    ).toBe(false);
    const t = convexTest({ schema, modules, transactionLimits: true });
    const context = await fixture(t);
    await expect(
      t.mutation(
        internal.productAccess.setDevelopmentForAccount,
        grantArgs(context),
      ),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });

    vi.stubEnv(DEVELOPMENT_PRODUCT_ACCESS_ENVIRONMENT.enabled, 'enabled');
    const disabledBusiness = convexTest({
      schema,
      modules,
      transactionLimits: true,
    });
    const disabledContext = await fixture(disabledBusiness, false);
    await expect(
      disabledBusiness.mutation(
        internal.productAccess.setDevelopmentForAccount,
        grantArgs(disabledContext),
      ),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });

  it('rechecks live session and membership when an unexpired token requests private-resource access', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    const context = await fixture(t);
    const signing = await installSigningConfiguration();
    const now = Math.floor(Date.now() / 1_000);
    const token = await signCustomerContextToken(signing, {
      contextType: 'account',
      ...context,
      sessionPublicId: 'session_product_access1',
      tokenPublicId: 'token_product_access002',
      role: 'owner',
      permissions: ['account:read'],
      authorizedAt: now,
      expiresAt: now + 600,
    });
    const request = () =>
      t.fetch('/v1/product-access', {
        headers: {
          authorization: `Bearer ${token}`,
          'x-tofler-environment': context.environmentKey,
        },
      });
    expect((await request()).status).toBe(200);
    const sessionId = await t.run(async (ctx) => {
      const environment = await ctx.db
        .query('businessEnvironments')
        .withIndex('by_key', (q) => q.eq('key', context.environmentKey))
        .unique();
      if (!environment) throw new Error('Missing fixture environment');
      const session = await ctx.db
        .query('businessSessions')
        .withIndex('by_environment_public_id', (q) =>
          q
            .eq('environmentId', environment._id)
            .eq('publicId', 'session_product_access1'),
        )
        .unique();
      if (!session) throw new Error('Missing fixture session');
      return session._id;
    });
    await t.mutation(internal.sessions.logout, {
      environmentKey: context.environmentKey,
      handleHash: 'a'.repeat(43),
      now: Date.now(),
    });
    expect((await request()).status).toBe(401);
    await t.run(async (ctx) =>
      ctx.db.patch(sessionId, {
        revokedAt: undefined,
        idleExpiresAt: Date.now() - 1,
      }),
    );
    expect((await request()).status).toBe(401);
    await t.run(async (ctx) =>
      ctx.db.patch(sessionId, {
        idleExpiresAt: Date.now() + 600_000,
        absoluteExpiresAt: Date.now() - 1,
      }),
    );
    expect((await request()).status).toBe(401);
    await t.run(async (ctx) =>
      ctx.db.patch(sessionId, { absoluteExpiresAt: Date.now() + 600_000 }),
    );
    await expect(
      t.query(internal.sessions.validateContext, {
        environmentKey: context.environmentKey,
        userPublicId: 'user_other_customer01',
        sessionPublicId: 'session_product_access1',
        now: Date.now(),
      }),
    ).rejects.toMatchObject({ data: { code: 'UNAUTHENTICATED' } });
    await expect(
      t.query(internal.sessions.validateContext, {
        environmentKey: 'tablecards-production',
        userPublicId: context.userPublicId,
        sessionPublicId: 'session_product_access1',
        now: Date.now(),
      }),
    ).rejects.toMatchObject({ data: { code: 'UNAUTHENTICATED' } });
    await t.run(async (ctx) => {
      const session = await ctx.db.get(sessionId);
      if (!session) throw new Error('Missing fixture session');
      const membership = await ctx.db
        .query('memberships')
        .withIndex('by_environment_public_id', (q) =>
          q
            .eq('environmentId', session.environmentId)
            .eq('publicId', context.membershipPublicId),
        )
        .unique();
      if (!membership) throw new Error('Missing fixture membership');
      await ctx.db.delete(membership._id);
    });
    expect((await request()).status).toBe(403);
  });

  it('stores a bounded mock projection and keeps reserve/commit/release idempotent', async () => {
    vi.stubEnv(DEVELOPMENT_PRODUCT_ACCESS_ENVIRONMENT.enabled, 'enabled');
    const t = convexTest({ schema, modules, transactionLimits: true });
    const context = await fixture(t);
    const access = await t.mutation(
      internal.productAccess.setDevelopmentForAccount,
      grantArgs(context),
    );
    expect(access).toMatchObject({
      offerKey: 'planner-pro',
      source: 'development_mock',
      unitGrants: [{ allowance: 2 }],
    });
    expect(
      await t.run(
        async (ctx) => await ctx.db.query('accountUnitBuckets').take(10),
      ),
    ).toHaveLength(0);

    const reserve = {
      ...context,
      unitType: 'ai_background_batch',
      amount: 1,
      idempotencyKey: 'request_product_access_0001',
      reservationPublicId: 'unit_reservation_00000001',
      now: BILLING_CYCLE_START + 1_000,
    };
    const first = await t.mutation(
      internal.unitLedger.reserveForAccount,
      reserve,
    );
    expect(first).toMatchObject({
      kind: 'ok',
      result: {
        reservation: { state: 'reserved' },
        balance: { allowance: 2, reserved: 1, available: 1 },
      },
    });
    const replay = await t.mutation(internal.unitLedger.reserveForAccount, {
      ...reserve,
      reservationPublicId: 'unit_reservation_ignored01',
    });
    expect(replay).toEqual(first);
    await expect(
      t.mutation(internal.unitLedger.reserveForAccount, {
        ...reserve,
        amount: 2,
      }),
    ).rejects.toMatchObject({ data: { code: 'CONFLICT' } });

    if (first.kind !== 'ok') throw new Error('Expected reservation');
    const transition = {
      ...context,
      reservationId: first.result.reservation.id,
      idempotencyKey: reserve.idempotencyKey,
      now: BILLING_CYCLE_START + 2_000,
    };
    const committed = await t.mutation(
      internal.unitLedger.commitForAccount,
      transition,
    );
    expect(committed).toMatchObject({
      reservation: { state: 'committed' },
      balance: { reserved: 0, consumed: 1, available: 1 },
    });
    expect(
      await t.mutation(internal.unitLedger.commitForAccount, transition),
    ).toEqual(committed);
    expect(
      await t.mutation(internal.unitLedger.releaseForAccount, transition),
    ).toEqual(committed);
  });

  it('prevents overdraw and returns expired reservations exactly once', async () => {
    vi.stubEnv(DEVELOPMENT_PRODUCT_ACCESS_ENVIRONMENT.enabled, 'enabled');
    const t = convexTest({ schema, modules, transactionLimits: true });
    const context = await fixture(t);
    await t.mutation(
      internal.productAccess.setDevelopmentForAccount,
      grantArgs(context),
    );
    const common = {
      ...context,
      unitType: 'ai_background_batch',
      amount: 2,
      idempotencyKey: 'request_product_access_0002',
      reservationPublicId: 'unit_reservation_00000002',
      now: BILLING_CYCLE_START + 10_000,
    };
    const reservation = await t.mutation(
      internal.unitLedger.reserveForAccount,
      common,
    );
    expect(reservation).toMatchObject({
      kind: 'ok',
      result: { balance: { available: 0 } },
    });
    await expect(
      t.mutation(internal.unitLedger.reserveForAccount, {
        ...common,
        amount: 1,
        idempotencyKey: 'request_product_access_0003',
        reservationPublicId: 'unit_reservation_00000003',
      }),
    ).rejects.toMatchObject({ data: { code: 'UNIT_EXHAUSTED' } });

    const expiry = BILLING_CYCLE_START + 10_000 + 15 * 60 * 1_000;
    expect(
      await t.mutation(internal.unitLedger.expireReservations, {
        now: expiry,
      }),
    ).toEqual({ expired: 1 });
    expect(
      await t.mutation(internal.unitLedger.expireReservations, {
        now: expiry + 1,
      }),
    ).toEqual({ expired: 0 });
    expect(
      await t.query(internal.unitLedger.balanceForAccount, {
        ...context,
        unitType: common.unitType,
        now: expiry + 1,
      }),
    ).toMatchObject({ reserved: 0, consumed: 0, available: 2 });
  });

  it('rejects a token context after its authoritative membership is removed', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    const context = await fixture(t);
    await t.run(async (ctx) => {
      const environment = await ctx.db
        .query('businessEnvironments')
        .withIndex('by_key', (query) => query.eq('key', context.environmentKey))
        .unique();
      const membership = environment
        ? await ctx.db
            .query('memberships')
            .withIndex('by_environment_public_id', (query) =>
              query
                .eq('environmentId', environment._id)
                .eq('publicId', context.membershipPublicId),
            )
            .unique()
        : null;
      if (!membership) throw new Error('Membership fixture is missing');
      await ctx.db.delete(membership._id);
    });
    await expect(
      t.query(internal.productAccess.currentForAccount, {
        ...context,
        now: BILLING_CYCLE_START,
      }),
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });

  it('rolls monthly allocations from their activation anniversary and preserves history', async () => {
    vi.stubEnv(DEVELOPMENT_PRODUCT_ACCESS_ENVIRONMENT.enabled, 'enabled');
    const t = convexTest({ schema, modules, transactionLimits: true });
    const context = await fixture(t);
    await t.mutation(
      internal.productAccess.setDevelopmentForAccount,
      grantArgs(context),
    );

    const first = await t.mutation(internal.unitLedger.reserveForAccount, {
      ...context,
      unitType: 'ai_background_batch',
      amount: 1,
      idempotencyKey: 'request_product_access_rollover_01',
      reservationPublicId: 'unit_reservation_rollover01',
      now: BILLING_CYCLE_START + 1_000,
    });
    if (first.kind !== 'ok') throw new Error('Expected reservation');
    await t.mutation(internal.unitLedger.commitForAccount, {
      ...context,
      reservationId: first.result.reservation.id,
      idempotencyKey: 'request_product_access_rollover_01',
      now: BILLING_CYCLE_START + 2_000,
    });

    const nextCycle = Date.UTC(2026, 9, 10, 12);
    const nextBalance = await t.query(internal.unitLedger.balanceForAccount, {
      ...context,
      unitType: 'ai_background_batch',
      now: nextCycle,
    });
    expect(nextBalance).toMatchObject({
      allowance: 2,
      reserved: 0,
      consumed: 0,
      available: 2,
    });
    expect(nextBalance.periodKey).not.toBe(first.result.balance.periodKey);

    const second = await t.mutation(internal.unitLedger.reserveForAccount, {
      ...context,
      unitType: 'ai_background_batch',
      amount: 1,
      idempotencyKey: 'request_product_access_rollover_02',
      reservationPublicId: 'unit_reservation_rollover02',
      now: nextCycle,
    });
    expect(second).toMatchObject({
      kind: 'ok',
      result: { balance: { reserved: 1, consumed: 0, available: 1 } },
    });

    const buckets = await t.run(
      async (ctx) => await ctx.db.query('accountUnitBuckets').take(10),
    );
    expect(buckets).toHaveLength(2);
    expect(buckets.map((bucket) => bucket.consumed).sort()).toEqual([0, 1]);
  });
});
