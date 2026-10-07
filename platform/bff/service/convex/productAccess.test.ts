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
