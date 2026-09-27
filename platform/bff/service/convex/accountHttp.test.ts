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
  CUSTOMER_SIGNING_ENVIRONMENT,
  parseCustomerSigningConfiguration,
  pkceS256Challenge,
  sha256Base64Url,
  signCustomerContextToken,
  type CustomerSigningConfiguration,
} from './lib/customerCrypto';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
type TestBackend = TestConvex<typeof schema>;
const callbackUrl = 'https://example-backend.convex.site/_tofler/auth/callback';
const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';

function configuration(): CustomerAuthConfiguration {
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
      maxAccountMembershipsPerUser: 2,
      ownershipTransferEnabled: true,
    },
    accountDefaults: {
      ...DEFAULT_ACCOUNT_POLICY,
      seatLimit: 3,
      adminRoleEnabled: true,
      memberInvitationsEnabled: true,
    },
  };
}

async function installSigningConfiguration(): Promise<CustomerSigningConfiguration> {
  const { privateKey, publicKey } = await generateKeyPair('ES256', {
    extractable: true,
  });
  const kid = 'account-http-test-key';
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
  const configuration = parseCustomerSigningConfiguration({
    issuer: 'https://auth-dev.tofler.app',
    privateJwk: JSON.stringify(privateJwk),
    publicJwks: JSON.stringify(publicJwks),
  });
  vi.stubEnv(CUSTOMER_SIGNING_ENVIRONMENT.issuer, configuration.issuer);
  vi.stubEnv(
    CUSTOMER_SIGNING_ENVIRONMENT.privateJwk,
    JSON.stringify(privateJwk),
  );
  vi.stubEnv(
    CUSTOMER_SIGNING_ENVIRONMENT.publicJwks,
    JSON.stringify(publicJwks),
  );
  return configuration;
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
    now: Date.now(),
  });
  if (result.kind !== 'ok') throw new Error('Fixture bootstrap collided');
  return result.customer.user.id;
}

async function onboardingToken(
  signing: CustomerSigningConfiguration,
  userPublicId: string,
  suffix: string,
) {
  const now = Math.floor(Date.now() / 1_000);
  return await signCustomerContextToken(signing, {
    contextType: 'onboarding',
    environmentKey: 'example-development',
    userPublicId,
    sessionPublicId: `session_${suffix.padStart(16, '0')}`,
    tokenPublicId: `token_${suffix.padStart(16, '0')}`,
    authorizedAt: now,
    expiresAt: now + 600,
  });
}

async function accountToken(
  signing: CustomerSigningConfiguration,
  userPublicId: string,
  accountId: string,
  membershipId: string,
) {
  const now = Math.floor(Date.now() / 1_000);
  return await signCustomerContextToken(signing, {
    contextType: 'account',
    environmentKey: 'example-development',
    userPublicId,
    sessionPublicId: 'session_owner_http01',
    tokenPublicId: 'token_owner_http0001',
    accountPublicId: accountId,
    membershipPublicId: membershipId,
    role: 'owner',
    permissions: [
      'account:read',
      'account:update',
      'members:read',
      'members:manage',
      'invitations:manage',
      'ownership:transfer',
    ],
    authorizedAt: now,
    expiresAt: now + 600,
  });
}

function authenticatedHeaders(token: string) {
  return {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    origin: 'https://example.tofler.app',
    'x-tofler-environment': 'example-development',
  };
}

afterEach(() => vi.unstubAllEnvs());

describe('versioned account and transfer HTTP operations', () => {
  it('uses signed contexts while every state change rechecks authoritative account state', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    await t.mutation(internal.businessEnvironments.create, {
      key: 'example-development',
      businessName: 'Example',
      environmentName: 'Development',
    });
    await t.mutation(internal.businessEnvironments.configureCustomerAuth, {
      key: 'example-development',
      expectedRevision: 0,
      configuration: configuration(),
    });

    const preflight = await t.fetch(
      '/v1/accounts?environment=example-development',
      {
        method: 'OPTIONS',
        headers: {
          origin: 'https://example.tofler.app',
        },
      },
    );
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe(
      'https://example.tofler.app',
    );
    expect(preflight.headers.get('access-control-allow-headers')).toContain(
      'Authorization',
    );
    const rejectedPreflight = await t.fetch(
      '/v1/accounts?environment=example-development',
      {
        method: 'OPTIONS',
        headers: {
          origin: 'https://attacker.invalid',
        },
      },
    );
    expect(rejectedPreflight.status).toBe(403);
    expect(rejectedPreflight.headers.get('access-control-allow-origin')).toBe(
      null,
    );
    const missingEnvironmentPreflight = await t.fetch('/v1/accounts', {
      method: 'OPTIONS',
      headers: { origin: 'https://example.tofler.app' },
    });
    expect(missingEnvironmentPreflight.status).toBe(400);

    const signing = await installSigningConfiguration();
    const invalidToken = await t.fetch('/v1/me', {
      headers: authenticatedHeaders('not-a-valid-token'),
    });
    expect(invalidToken.status).toBe(401);
    expect(invalidToken.headers.get('access-control-allow-origin')).toBe(
      'https://example.tofler.app',
    );
    const ownerUserId = await bootstrap(t, 'owner', 'owner@example.com');
    const targetUserId = await bootstrap(t, 'target', 'target@example.com');
    const ownerOnboardingToken = await onboardingToken(
      signing,
      ownerUserId,
      'owner',
    );

    const createAccountResponse = await t.fetch('/v1/accounts', {
      method: 'POST',
      headers: authenticatedHeaders(ownerOnboardingToken),
      body: JSON.stringify({ displayName: 'HTTP Team' }),
    });
    expect(createAccountResponse.status).toBe(201);
    expect(
      createAccountResponse.headers.get('access-control-allow-origin'),
    ).toBe('https://example.tofler.app');
    const account = (await createAccountResponse.json()) as {
      id: string;
      membership: { id: string };
    };
    const ownerToken = await accountToken(
      signing,
      ownerUserId,
      account.id,
      account.membership.id,
    );
    const wrongOrigin = await t.fetch('/v1/me', {
      headers: {
        ...authenticatedHeaders(ownerToken),
        origin: 'https://attacker.invalid',
      },
    });
    expect(wrongOrigin.status).toBe(403);
    expect(wrongOrigin.headers.get('access-control-allow-origin')).toBeNull();

    const invitationResponse = await t.fetch('/v1/accounts/invitations', {
      method: 'POST',
      headers: authenticatedHeaders(ownerToken),
      body: JSON.stringify({
        accountId: account.id,
        recipientEmail: 'target@example.com',
      }),
    });
    expect(invitationResponse.status).toBe(201);
    const invitation = (await invitationResponse.json()) as {
      invitationToken: string;
    };
    expect(invitation.invitationToken).toMatch(/^[A-Za-z0-9_-]{43}$/u);

    const targetToken = await onboardingToken(signing, targetUserId, 'target');
    const acceptResponse = await t.fetch('/v1/accounts/invitations/accept', {
      method: 'POST',
      headers: authenticatedHeaders(targetToken),
      body: JSON.stringify({ invitationToken: invitation.invitationToken }),
    });
    expect(acceptResponse.status).toBe(200);
    const targetAccount = (await acceptResponse.json()) as {
      membership: { id: string };
    };

    const membersResponse = await t.fetch('/v1/accounts/members?limit=10', {
      headers: authenticatedHeaders(ownerToken),
    });
    expect(membersResponse.status).toBe(200);
    const members = (await membersResponse.json()) as {
      page: Array<{ role: string }>;
      isDone: boolean;
    };
    expect(members.isDone).toBe(true);
    expect(members.page.map(({ role }) => role).sort()).toEqual([
      'member',
      'owner',
    ]);

    const tooSmallPolicy = await t.fetch('/v1/accounts/policy', {
      method: 'POST',
      headers: authenticatedHeaders(ownerToken),
      body: JSON.stringify({ policyOverrides: { seatLimit: 1 } }),
    });
    expect(tooSmallPolicy.status).toBe(409);

    const sessionHandle =
      'http-transfer-session-handle-abcdefghijklmnopqrstuvwxyz';
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
      const now = Date.now();
      await ctx.db.insert('businessSessions', {
        environmentId: environment._id,
        userId: owner._id,
        publicId: 'session_http_transfer1',
        handleHash: await sha256Base64Url(sessionHandle),
        provider: 'google',
        providerAuthenticatedAt: Math.floor(now / 1_000),
        createdAt: now,
        lastSeenAt: now,
        idleExpiresAt: now + 3_600_000,
        absoluteExpiresAt: now + 86_400_000,
        cleanupAt: now + 100_000_000,
      });
    });
    const pkceChallenge = await pkceS256Challenge(verifier);
    const transferStart = await t.fetch('/v1/auth/transfer/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        environmentKey: 'example-development',
        sessionHandle,
        accountId: account.id,
        targetMembershipId: targetAccount.membership.id,
        state: 'state_abcdefghijklmnopqrstuvwxyz012345',
        pkceChallenge,
        callbackUrl,
        webOrigin: 'https://example.tofler.app',
        returnPath: '/settings/members',
      }),
    });
    expect(transferStart.status).toBe(201);
    const started = (await transferStart.json()) as { reference: string };
    const challenge = await t.query(internal.loginTransactions.readChallenge, {
      environmentKey: 'example-development',
      reference: started.reference,
      now: Date.now(),
    });
    const handoffCode = 'http-transfer-handoff-abcdefghijklmnopqrstuvwxyz';
    await t.mutation(internal.ownershipTransfers.completeProvider, {
      environmentKey: 'example-development',
      reference: started.reference,
      providerNonce: challenge.providerNonce,
      provider: 'google',
      issuer: 'https://accounts.google.com',
      subject: 'google-owner',
      authenticatedAt: Math.floor(Date.now() / 1_000),
      handoffCodeHash: await sha256Base64Url(handoffCode),
      now: Date.now(),
    });
    const proofResponse = await t.fetch('/v1/auth/transfer/exchange', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        environmentKey: 'example-development',
        code: handoffCode,
        verifier,
        callbackUrl,
      }),
    });
    expect(proofResponse.status).toBe(200);
    const proof = (await proofResponse.json()) as { transferProof: string };
    const transferResponse = await t.fetch('/v1/auth/transfer/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        environmentKey: 'example-development',
        transferProof: proof.transferProof,
      }),
    });
    expect(transferResponse.status).toBe(200);
    await expect(transferResponse.json()).resolves.toMatchObject({
      accountId: account.id,
      previousOwnerUserId: ownerUserId,
      newOwnerUserId: targetUserId,
      replayed: false,
    });

    const staleOwnerMutation = await t.fetch('/v1/accounts/members/role', {
      method: 'POST',
      headers: authenticatedHeaders(ownerToken),
      body: JSON.stringify({
        membershipId: targetAccount.membership.id,
        role: 'member',
      }),
    });
    expect(staleOwnerMutation.status).toBe(403);
  });
});
