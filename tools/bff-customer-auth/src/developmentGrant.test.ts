import { chmod, mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createLocalJWKSet, jwtVerify } from 'jose';
import { describe, expect, it } from 'vitest';

import {
  CUSTOMER_DEVELOPMENT_GRANT_TTL_SECONDS,
  customerDevelopmentGrantClaimsSchema,
} from '@bff/contracts';
import {
  CUSTOMER_DEVELOPMENT_AUTOMATION_ISSUER,
  CUSTOMER_DEVELOPMENT_AUTOMATION_SUBJECT,
} from '@bff/static-config';
import {
  generateCustomerDevelopmentAuthKey,
  mintCustomerDevelopmentGrant,
  type CustomerDevelopmentAuthPaths,
} from './developmentGrant';

async function temporaryPaths(): Promise<CustomerDevelopmentAuthPaths> {
  const directory = await mkdtemp(join(tmpdir(), 'bff-customer-dev-auth-'));
  return {
    privateKey: join(directory, 'private.jwk'),
    publicJwks: join(directory, 'public.json'),
  };
}

async function decodedJwks(path: string) {
  return JSON.parse(await readFile(path, 'utf8')) as { keys: JsonWebKey[] };
}

describe('customer development authentication grants', () => {
  it('creates a restrictive matching pair and remains idempotent', async () => {
    const paths = await temporaryPaths();
    await expect(generateCustomerDevelopmentAuthKey(paths)).resolves.toEqual({
      created: true,
    });
    expect((await stat(paths.privateKey)).mode & 0o777).toBe(0o600);
    expect(await decodedJwks(paths.publicJwks)).toMatchObject({
      keys: [{ alg: 'ES256', crv: 'P-256', kty: 'EC', use: 'sig' }],
    });
    await expect(generateCustomerDevelopmentAuthKey(paths)).resolves.toEqual({
      created: false,
    });
  });

  it.each([
    {
      capability: 'signup' as const,
      personaId: 'alice-one',
      profile: {
        verifiedEmail: 'alice@example.invalid',
        displayName: 'Alice One',
      },
    },
    {
      capability: 'login_as' as const,
      userId: 'user_abcdefghijklmnop',
    },
    {
      capability: 'ownership_transfer' as const,
      userId: 'user_abcdefghijklmnop',
    },
  ])('mints a two-minute $capability grant', async (target) => {
    const paths = await temporaryPaths();
    const now = new Date('2026-09-27T12:00:00.000Z');
    const audience =
      'https://example.convex.site/v1/auth/transactions/development';
    await generateCustomerDevelopmentAuthKey(paths);
    const token = await mintCustomerDevelopmentGrant({
      bffSiteUrl: 'https://example.convex.site',
      environmentKey: 'example-development',
      transactionReference: 'login_abcdefghijklmnop',
      target,
      now,
      privateKeyPath: paths.privateKey,
    });
    const verified = await jwtVerify(
      token,
      createLocalJWKSet(await decodedJwks(paths.publicJwks)),
      {
        algorithms: ['ES256'],
        audience,
        issuer: CUSTOMER_DEVELOPMENT_AUTOMATION_ISSUER,
        subject: CUSTOMER_DEVELOPMENT_AUTOMATION_SUBJECT,
        currentDate: now,
      },
    );
    const claims = customerDevelopmentGrantClaimsSchema.parse(verified.payload);
    expect(claims).toMatchObject({
      capability: target.capability,
      environmentKey: 'example-development',
      transactionReference: 'login_abcdefghijklmnop',
      lane: 'development',
    });
    expect(claims.exp - claims.iat).toBe(
      CUSTOMER_DEVELOPMENT_GRANT_TTL_SECONDS,
    );
  });

  it('rejects a group-readable private key without reading its contents', async () => {
    const paths = await temporaryPaths();
    await generateCustomerDevelopmentAuthKey(paths);
    await chmod(paths.privateKey, 0o644);
    await expect(
      mintCustomerDevelopmentGrant({
        bffSiteUrl: 'https://example.convex.site',
        environmentKey: 'example-development',
        transactionReference: 'login_abcdefghijklmnop',
        target: {
          capability: 'login_as',
          userId: 'user_abcdefghijklmnop',
        },
        privateKeyPath: paths.privateKey,
      }),
    ).rejects.toThrow(/mode-0600/);
  });
});
