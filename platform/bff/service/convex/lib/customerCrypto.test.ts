import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWK,
} from 'jose';
import { convexTest } from 'convex-test';
import { describe, expect, it, vi } from 'vitest';

import { CUSTOMER_GOOGLE_CLIENT_ID } from '@bff/static-config';
import {
  createCustomerContextClaims,
  CUSTOMER_SIGNING_ENVIRONMENT,
  customerEnvironmentAudience,
  parseCustomerSigningConfiguration,
  pkceS256Challenge,
  randomOpaqueSecret,
  randomPublicIdentifier,
  sha256Base64Url,
  signCustomerContextToken,
  verifyCustomerContextToken,
  verifyGoogleIdentityToken,
  type CustomerSigningConfiguration,
} from './customerCrypto';
import schema from '../schema';

const modules = import.meta.glob('../**/*.ts');

async function signingConfiguration(): Promise<{
  configuration: CustomerSigningConfiguration;
  privateJwk: string;
  publicJwks: string;
}> {
  const { privateKey, publicKey } = await generateKeyPair('ES256', {
    extractable: true,
  });
  const kid = 'customer-key-1';
  const privateJwk = {
    ...(await exportJWK(privateKey)),
    alg: 'ES256',
    kid,
    use: 'sig',
  };
  const publicJwk = {
    ...(await exportJWK(publicKey)),
    alg: 'ES256',
    kid,
    use: 'sig',
  };
  const privateJson = JSON.stringify(privateJwk);
  const publicJson = JSON.stringify({ keys: [publicJwk] });
  return {
    configuration: parseCustomerSigningConfiguration({
      issuer: 'https://auth-dev.tofler.app',
      privateJwk: privateJson,
      publicJwks: publicJson,
    }),
    privateJwk: privateJson,
    publicJwks: publicJson,
  };
}

async function googleFixture() {
  const { privateKey, publicKey } = await generateKeyPair('RS256', {
    extractable: true,
  });
  const kid = 'google-key-1';
  const publicJwk: JWK = {
    ...(await exportJWK(publicKey)),
    alg: 'RS256',
    kid,
    use: 'sig',
  };
  const keySet = createLocalJWKSet({ keys: [publicJwk] });
  const now = 2_000_000_000;

  const mint = async ({
    audience = CUSTOMER_GOOGLE_CLIENT_ID,
    issuer = 'https://accounts.google.com',
    nonce = 'nonce-1',
    expiresAt = now + 300,
    emailVerified = true,
  }: {
    audience?: string;
    issuer?: string;
    nonce?: string;
    expiresAt?: number;
    emailVerified?: boolean;
  } = {}) =>
    await new SignJWT({
      nonce,
      email: 'Customer@Example.com',
      email_verified: emailVerified,
      name: 'Customer Name',
      picture: 'https://images.example.com/customer.png',
    })
      .setProtectedHeader({ alg: 'RS256', kid, typ: 'JWT' })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject('google-subject-1')
      .setIssuedAt(now)
      .setExpirationTime(expiresAt)
      .sign(privateKey);

  return { keySet, mint, now };
}

describe('customer cryptography', () => {
  it('generates opaque values and the RFC 7636 S256 challenge', async () => {
    expect(randomOpaqueSecret()).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(randomPublicIdentifier('session')).toMatch(
      /^session_[A-Za-z0-9_-]{24}$/u,
    );
    await expect(sha256Base64Url('same')).resolves.toBe(
      await sha256Base64Url('same'),
    );
    await expect(
      pkceS256Challenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
    ).resolves.toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('accepts only a matching ES256 key pair and canonical issuer', async () => {
    const fixture = await signingConfiguration();
    expect(fixture.configuration.issuer).toBe('https://auth-dev.tofler.app');
    expect(fixture.configuration.publicJwks.keys[0]).not.toHaveProperty('d');

    const other = await signingConfiguration();
    expect(() =>
      parseCustomerSigningConfiguration({
        issuer: 'https://auth-dev.tofler.app',
        privateJwk: fixture.privateJwk,
        publicJwks: other.publicJwks,
      }),
    ).toThrow(/does not match/);
    expect(() =>
      parseCustomerSigningConfiguration({
        issuer: 'http://auth-dev.tofler.app',
        privateJwk: fixture.privateJwk,
        publicJwks: fixture.publicJwks,
      }),
    ).toThrow(/canonical HTTPS origin/);
  });

  it.each(['https://accounts.google.com', 'accounts.google.com'])(
    'verifies the documented Google issuer form %s',
    async (issuer) => {
      const { keySet, mint, now } = await googleFixture();
      const verified = await verifyGoogleIdentityToken({
        token: await mint({ issuer }),
        expectedNonce: 'nonce-1',
        keySet,
        currentDate: new Date(now * 1000),
      });

      expect(verified).toEqual({
        provider: 'google',
        issuer: 'https://accounts.google.com',
        subject: 'google-subject-1',
        verifiedEmail: 'customer@example.com',
        displayName: 'Customer Name',
        pictureUrl: 'https://images.example.com/customer.png',
        authenticatedAt: now,
      });
    },
  );

  it('rejects wrong Google audience, nonce, expiry, and email proof', async () => {
    const { keySet, mint, now } = await googleFixture();

    await expect(
      verifyGoogleIdentityToken({
        token: await mint({ audience: 'wrong-audience' }),
        expectedNonce: 'nonce-1',
        keySet,
        currentDate: new Date(now * 1000),
      }),
    ).rejects.toThrow();
    await expect(
      verifyGoogleIdentityToken({
        token: await mint(),
        expectedNonce: 'wrong-nonce',
        keySet,
        currentDate: new Date(now * 1000),
      }),
    ).rejects.toThrow(/invalid/);
    await expect(
      verifyGoogleIdentityToken({
        token: await mint({ expiresAt: now - 60 }),
        expectedNonce: 'nonce-1',
        keySet,
        currentDate: new Date(now * 1000),
      }),
    ).rejects.toThrow();
    await expect(
      verifyGoogleIdentityToken({
        token: await mint({ emailVerified: false }),
        expectedNonce: 'nonce-1',
        keySet,
        currentDate: new Date(now * 1000),
      }),
    ).rejects.toThrow(/invalid/);
  });

  it('signs and verifies one environment/account context for at most ten minutes', async () => {
    const { configuration } = await signingConfiguration();
    const issuance = {
      contextType: 'account' as const,
      environmentKey: 'example-development',
      userPublicId: 'user_abcdefghijklmnop',
      sessionPublicId: 'session_abcdefghijklmnop',
      tokenPublicId: 'token_abcdefghijklmnop',
      accountPublicId: 'account_abcdefghijklmnop',
      membershipPublicId: 'membership_abcdefghijklmnop',
      role: 'owner' as const,
      permissions: ['account:read', 'ownership:transfer'] as const,
      authorizedAt: 2_000_000_000,
      expiresAt: 2_000_100_000,
    };
    expect(createCustomerContextClaims(configuration, issuance).exp).toBe(
      issuance.authorizedAt + 600,
    );

    const token = await signCustomerContextToken(configuration, issuance);
    await expect(
      verifyCustomerContextToken({
        configuration,
        environmentKey: 'example-development',
        token,
        currentDate: new Date(issuance.authorizedAt * 1000),
      }),
    ).resolves.toMatchObject({
      contextType: 'account',
      sub: issuance.userPublicId,
      accountId: issuance.accountPublicId,
      role: 'owner',
    });
    await expect(
      verifyCustomerContextToken({
        configuration,
        environmentKey: 'other-development',
        token,
        currentDate: new Date(issuance.authorizedAt * 1000),
      }),
    ).rejects.toThrow();
    expect(
      customerEnvironmentAudience(configuration.issuer, 'example-development'),
    ).toBe('https://auth-dev.tofler.app/environments/example-development');
  });

  it('publishes only the configured public JWKS with bounded caching', async () => {
    const fixture = await signingConfiguration();
    vi.stubEnv(
      CUSTOMER_SIGNING_ENVIRONMENT.issuer,
      fixture.configuration.issuer,
    );
    vi.stubEnv(CUSTOMER_SIGNING_ENVIRONMENT.privateJwk, fixture.privateJwk);
    vi.stubEnv(CUSTOMER_SIGNING_ENVIRONMENT.publicJwks, fixture.publicJwks);

    try {
      const response = await convexTest({
        schema,
        modules,
        transactionLimits: true,
      }).fetch('/v1/auth/jwks');
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toContain('max-age=300');
      const body = (await response.json()) as {
        keys: Array<Record<string, unknown>>;
      };
      expect(body.keys).toHaveLength(1);
      expect(body.keys[0]).not.toHaveProperty('d');
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
