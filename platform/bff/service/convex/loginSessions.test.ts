import { convexTest, type TestConvex } from 'convex-test';
import { exportJWK, generateKeyPair } from 'jose';
import { describe, expect, it, vi } from 'vitest';

import {
  CUSTOMER_AUTH_CONFIGURATION_VERSION,
  DEFAULT_ACCOUNT_POLICY,
  DEFAULT_BUSINESS_ACCOUNT_POLICY,
  DEFAULT_SESSION_POLICY,
  type CustomerAuthConfiguration,
} from '@bff/contracts';
import { internal } from './_generated/api';
import {
  CUSTOMER_SIGNING_ENVIRONMENT,
  pkceS256Challenge,
  sha256Base64Url,
} from './lib/customerCrypto';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
type TestBackend = TestConvex<typeof schema>;
const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const callbackUrl = 'https://example-backend.convex.site/_tofler/auth/callback';

function configuration({
  createAccountOnFirstSignIn = true,
  sessionPolicy = DEFAULT_SESSION_POLICY,
}: {
  createAccountOnFirstSignIn?: boolean;
  sessionPolicy?: CustomerAuthConfiguration['sessionPolicy'];
} = {}): CustomerAuthConfiguration {
  return {
    version: CUSTOMER_AUTH_CONFIGURATION_VERSION,
    enabledProviders: ['google'],
    developmentAutomationEnabled: true,
    transport: {
      webOrigins: ['https://example.tofler.app'],
      sessionAdapterBaseUrl: 'https://example-backend.convex.site',
      defaultPostLoginPath: '/',
    },
    sessionPolicy,
    accountPolicy: {
      ...DEFAULT_BUSINESS_ACCOUNT_POLICY,
      createAccountOnFirstSignIn,
    },
    accountDefaults: DEFAULT_ACCOUNT_POLICY,
  };
}

async function configure(
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

async function startAndComplete(
  t: TestBackend,
  {
    environmentKey = 'example-development',
    suffix = '1',
    now = 1_000_000,
    nonce = 'nonce_abcdefghijklmnopqrstuvwxyz012345',
  }: {
    environmentKey?: string;
    suffix?: string;
    now?: number;
    nonce?: string;
  } = {},
) {
  const reference = `login_${suffix.padStart(16, '0')}`;
  const pkceChallenge = await pkceS256Challenge(verifier);
  const handoffCode = `handoff-${suffix}-abcdefghijklmnopqrstuvwxyz`;
  const handoffCodeHash = await sha256Base64Url(handoffCode);
  const started = await t.mutation(internal.loginTransactions.startLogin, {
    environmentKey,
    reference,
    state: 'state_abcdefghijklmnopqrstuvwxyz012345',
    providerNonce: nonce,
    pkceChallenge,
    callbackUrl,
    webOrigin: 'https://example.tofler.app',
    returnPath: '/cards?table=one',
    now,
  });
  expect(started.kind).toBe('ok');

  const completed = await t.mutation(
    internal.loginTransactions.completeProvider,
    {
      environmentKey,
      reference,
      providerNonce: nonce,
      provider: 'google',
      issuer: 'https://accounts.google.com',
      subject: `google-subject-${suffix}`,
      profile: {
        verifiedEmail: `customer-${suffix}@example.com`,
        displayName: `Customer ${suffix}`,
      },
      authenticatedAt: Math.floor(now / 1_000),
      candidates: {
        userPublicId: `user_${suffix.padStart(16, '0')}`,
        accountPublicId: `account_${suffix.padStart(16, '0')}`,
        membershipPublicId: `membership_${suffix.padStart(16, '0')}`,
      },
      handoffCodeHash,
      now: now + 1_000,
    },
  );
  expect(completed).toMatchObject({
    kind: 'ok',
    callbackUrl,
    returnPath: '/cards?table=one',
  });
  return {
    reference,
    pkceChallenge,
    handoffCode,
    handoffCodeHash,
    now: now + 2_000,
  };
}

async function exchange(
  t: TestBackend,
  completed: Awaited<ReturnType<typeof startAndComplete>>,
  {
    environmentKey = 'example-development',
    suffix = '1',
  }: { environmentKey?: string; suffix?: string } = {},
) {
  const sessionHandle = `session-handle-${suffix}-abcdefghijklmnopqrstuvwxyz`;
  const handleHash = await sha256Base64Url(sessionHandle);
  const result = await t.mutation(internal.sessions.exchangeForSession, {
    environmentKey,
    handoffCodeHash: completed.handoffCodeHash,
    pkceChallenge: completed.pkceChallenge,
    callbackUrl,
    handleHash,
    sessionPublicId: `session_${suffix.padStart(16, '0')}`,
    now: completed.now,
  });
  return { result, sessionHandle, handleHash };
}

async function installTestSigningConfiguration() {
  const { privateKey, publicKey } = await generateKeyPair('ES256', {
    extractable: true,
  });
  const kid = 'http-test-key';
  vi.stubEnv(
    CUSTOMER_SIGNING_ENVIRONMENT.issuer,
    'https://auth-dev.tofler.app',
  );
  vi.stubEnv(
    CUSTOMER_SIGNING_ENVIRONMENT.privateJwk,
    JSON.stringify({
      ...(await exportJWK(privateKey)),
      alg: 'ES256',
      kid,
      use: 'sig',
    }),
  );
  vi.stubEnv(
    CUSTOMER_SIGNING_ENVIRONMENT.publicJwks,
    JSON.stringify({
      keys: [
        {
          ...(await exportJWK(publicKey)),
          alg: 'ES256',
          kid,
          use: 'sig',
        },
      ],
    }),
  );
}

describe('bound login and durable sessions', () => {
  it('exchanges once, keeps one stable handle, issues account context, and logs out', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    await configure(t, 'example-development');
    const completed = await startAndComplete(t);
    const established = await exchange(t, completed);
    expect(established.result).toMatchObject({
      kind: 'ok',
      sessionPublicId: 'session_0000000000000001',
    });

    const firstContext = await t.mutation(internal.sessions.issueContext, {
      environmentKey: 'example-development',
      handleHash: established.handleHash,
      tokenPublicId: 'token_0000000000000001',
      now: completed.now + 1_000,
    });
    const secondContext = await t.mutation(internal.sessions.issueContext, {
      environmentKey: 'example-development',
      handleHash: established.handleHash,
      accountPublicId: 'account_0000000000000001',
      tokenPublicId: 'token_0000000000000002',
      now: completed.now + 2_000,
    });
    expect(firstContext).toMatchObject({
      kind: 'authorized',
      issuance: {
        contextType: 'account',
        accountPublicId: 'account_0000000000000001',
        role: 'owner',
      },
    });
    expect(secondContext).toMatchObject({
      kind: 'authorized',
      issuance: { tokenPublicId: 'token_0000000000000002' },
    });
    expect(
      await t.run(
        async (ctx) =>
          (await ctx.db.query('businessSessions').collect()).length,
      ),
    ).toBe(1);

    await expect(
      t.mutation(internal.sessions.exchangeForSession, {
        environmentKey: 'example-development',
        handoffCodeHash: completed.handoffCodeHash,
        pkceChallenge: completed.pkceChallenge,
        callbackUrl,
        handleHash: await sha256Base64Url('another-session-handle'),
        sessionPublicId: 'session_0000000000000002',
        now: completed.now + 3_000,
      }),
    ).rejects.toThrow(/UNAUTHENTICATED|rejected/);

    expect(
      await t.mutation(internal.sessions.logout, {
        environmentKey: 'example-development',
        handleHash: established.handleHash,
        now: completed.now + 4_000,
      }),
    ).toEqual({ revoked: true });
    expect(
      await t.mutation(internal.sessions.issueContext, {
        environmentKey: 'example-development',
        handleHash: established.handleHash,
        tokenPublicId: 'token_0000000000000003',
        now: completed.now + 5_000,
      }),
    ).toEqual({ kind: 'session_unavailable' });
  });

  it('rejects nonce, verifier, callback, environment, and expiry substitution', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    await configure(t, 'example-development');
    await configure(t, 'other-development');
    const now = 2_000_000;
    const nonce = 'nonce_abcdefghijklmnopqrstuvwxyz012345';
    const reference = 'login_0000000000000099';
    const pkceChallenge = await pkceS256Challenge(verifier);
    await t.mutation(internal.loginTransactions.startLogin, {
      environmentKey: 'example-development',
      reference,
      state: 'state_abcdefghijklmnopqrstuvwxyz012345',
      providerNonce: nonce,
      pkceChallenge,
      callbackUrl,
      webOrigin: 'https://example.tofler.app',
      returnPath: '/',
      now,
    });
    await expect(
      t.mutation(internal.loginTransactions.completeProvider, {
        environmentKey: 'example-development',
        reference,
        providerNonce: 'nonce_wrong_abcdefghijklmnopqrstuvwxyz',
        provider: 'google',
        issuer: 'https://accounts.google.com',
        subject: 'subject',
        profile: {
          verifiedEmail: 'customer@example.com',
          displayName: 'Customer',
        },
        authenticatedAt: 2_000,
        candidates: {
          userPublicId: 'user_0000000000000099',
          accountPublicId: 'account_0000000000000099',
          membershipPublicId: 'membership_0000000000000099',
        },
        handoffCodeHash: await sha256Base64Url('handoff-99'),
        now: now + 1_000,
      }),
    ).rejects.toThrow(/CONFLICT|cannot be completed/);

    const completed = await startAndComplete(t, { suffix: '2', now });
    for (const exchangeArgs of [
      {
        environmentKey: 'other-development',
        pkceChallenge: completed.pkceChallenge,
        callbackUrl,
        now: completed.now,
      },
      {
        environmentKey: 'example-development',
        pkceChallenge: await pkceS256Challenge(
          'wrong-verifier-abcdefghijklmnopqrstuvwxyz012345',
        ),
        callbackUrl,
        now: completed.now,
      },
      {
        environmentKey: 'example-development',
        pkceChallenge: completed.pkceChallenge,
        callbackUrl: 'https://attacker.example/_tofler/auth/callback',
        now: completed.now,
      },
      {
        environmentKey: 'example-development',
        pkceChallenge: completed.pkceChallenge,
        callbackUrl,
        now: completed.now + 61_000,
      },
    ]) {
      await expect(
        t.mutation(internal.sessions.exchangeForSession, {
          ...exchangeArgs,
          handoffCodeHash: completed.handoffCodeHash,
          handleHash: await sha256Base64Url(
            `handle-${exchangeArgs.callbackUrl}`,
          ),
          sessionPublicId: 'session_0000000000000099',
        }),
      ).rejects.toThrow(/UNAUTHENTICATED|rejected/);
    }
  });

  it('issues onboarding context when first signup creates no account', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    await configure(
      t,
      'managed-development',
      configuration({ createAccountOnFirstSignIn: false }),
    );
    const completed = await startAndComplete(t, {
      environmentKey: 'managed-development',
    });
    const established = await exchange(t, completed, {
      environmentKey: 'managed-development',
    });
    expect(established.result.kind).toBe('ok');

    expect(
      await t.mutation(internal.sessions.issueContext, {
        environmentKey: 'managed-development',
        handleHash: established.handleHash,
        tokenPublicId: 'token_0000000000000001',
        now: completed.now + 1_000,
      }),
    ).toMatchObject({
      kind: 'authorized',
      customer: { accounts: [] },
      issuance: { contextType: 'onboarding' },
    });
  });

  it('expires by idle policy and never accepts a handle across environments', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    await configure(
      t,
      'example-development',
      configuration({
        sessionPolicy: { idleSeconds: 15 * 60, absoluteSeconds: 60 * 60 },
      }),
    );
    await configure(t, 'other-development');
    const completed = await startAndComplete(t);
    const established = await exchange(t, completed);

    expect(
      await t.mutation(internal.sessions.issueContext, {
        environmentKey: 'other-development',
        handleHash: established.handleHash,
        tokenPublicId: 'token_0000000000000001',
        now: completed.now + 1_000,
      }),
    ).toEqual({ kind: 'session_unavailable' });
    expect(
      await t.mutation(internal.sessions.issueContext, {
        environmentKey: 'example-development',
        handleHash: established.handleHash,
        tokenPublicId: 'token_0000000000000002',
        now: completed.now + 15 * 60 * 1_000 + 1,
      }),
    ).toEqual({ kind: 'session_unavailable' });
  });

  it('uses the HTTP exchange, context, me, and logout contract without exposing the handle in URLs', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    await configure(t, 'example-development');
    await installTestSigningConfiguration();

    try {
      const pkceChallenge = await pkceS256Challenge(verifier);
      const startResponse = await t.fetch('/v1/auth/transactions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          environmentKey: 'example-development',
          state: 'state_abcdefghijklmnopqrstuvwxyz012345',
          pkceChallenge,
          callbackUrl,
          webOrigin: 'https://example.tofler.app',
          returnPath: '/',
        }),
      });
      expect(startResponse.status).toBe(201);
      const started = (await startResponse.json()) as {
        reference: string;
        authorizationUrl: string;
      };
      expect(started.authorizationUrl).toContain(
        'https://auth-dev.tofler.app/',
      );
      expect(started.authorizationUrl).not.toContain('state_');

      const challenge = await t.query(
        internal.loginTransactions.readChallenge,
        {
          environmentKey: 'example-development',
          reference: started.reference,
          now: Date.now(),
        },
      );
      const rawCode = 'http-handoff-code-abcdefghijklmnopqrstuvwxyz';
      await t.mutation(internal.loginTransactions.completeProvider, {
        environmentKey: 'example-development',
        reference: started.reference,
        providerNonce: challenge.providerNonce,
        provider: 'google',
        issuer: 'https://accounts.google.com',
        subject: 'http-google-subject',
        profile: {
          verifiedEmail: 'http-customer@example.com',
          displayName: 'HTTP Customer',
        },
        authenticatedAt: Math.floor(Date.now() / 1_000),
        candidates: {
          userPublicId: 'user_httpabcdefghijkl',
          accountPublicId: 'account_httpabcdefghijkl',
          membershipPublicId: 'membership_httpabcdefghijkl',
        },
        handoffCodeHash: await sha256Base64Url(rawCode),
        now: Date.now(),
      });

      const exchangeResponse = await t.fetch('/v1/auth/exchange', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          environmentKey: 'example-development',
          code: rawCode,
          verifier,
          callbackUrl,
        }),
      });
      expect(exchangeResponse.status).toBe(200);
      const exchanged = (await exchangeResponse.json()) as {
        sessionHandle: string;
      };
      expect(exchanged.sessionHandle).toMatch(/^[A-Za-z0-9_-]{43}$/u);

      const contextResponse = await t.fetch('/v1/auth/session/context', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          environmentKey: 'example-development',
          sessionHandle: exchanged.sessionHandle,
        }),
      });
      expect(contextResponse.status).toBe(200);
      const context = (await contextResponse.json()) as { token: string };
      expect(context.token.split('.')).toHaveLength(3);

      const meResponse = await t.fetch('/v1/me', {
        headers: {
          authorization: `Bearer ${context.token}`,
          'x-tofler-environment': 'example-development',
        },
      });
      expect(meResponse.status).toBe(200);
      await expect(meResponse.json()).resolves.toMatchObject({
        customer: { user: { id: 'user_httpabcdefghijkl' } },
        context: { accountId: 'account_httpabcdefghijkl' },
      });

      const logoutResponse = await t.fetch('/v1/auth/session/logout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          environmentKey: 'example-development',
          sessionHandle: exchanged.sessionHandle,
        }),
      });
      expect(logoutResponse.status).toBe(200);
      const afterLogout = await t.fetch('/v1/auth/session/context', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          environmentKey: 'example-development',
          sessionHandle: exchanged.sessionHandle,
        }),
      });
      expect(afterLogout.status).toBe(401);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
