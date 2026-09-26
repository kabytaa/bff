import { chmod, mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createLocalJWKSet, jwtVerify } from 'jose';
import { describe, expect, it } from 'vitest';

import {
  BACKOFFICE_DEVELOPMENT_AUTOMATION_ISSUER,
  BACKOFFICE_DEVELOPMENT_AUTOMATION_SUBJECT,
} from '@bff/static-config';
import {
  generateDevelopmentAuthKey,
  mintDevelopmentAuthToken,
  type DevelopmentAuthPaths,
} from './developmentAuth';

async function temporaryPaths(): Promise<DevelopmentAuthPaths> {
  const directory = await mkdtemp(join(tmpdir(), 'bff-development-auth-'));
  return {
    privateKey: join(directory, 'private.jwk'),
    publicJwks: join(directory, 'public.txt'),
  };
}

async function decodedJwks(path: string) {
  const value = (await readFile(path, 'utf8')).trim();
  const prefix = 'data:application/json;base64,';
  return JSON.parse(
    Buffer.from(value.slice(prefix.length), 'base64').toString('utf8'),
  ) as { keys: JsonWebKey[] };
}

describe('development authentication keys', () => {
  it('creates a restrictive matching pair and then remains idempotent', async () => {
    const paths = await temporaryPaths();

    await expect(generateDevelopmentAuthKey(paths)).resolves.toEqual({
      created: true,
    });
    expect((await stat(paths.privateKey)).mode & 0o777).toBe(0o600);
    expect(await decodedJwks(paths.publicJwks)).toMatchObject({
      keys: [{ alg: 'ES256', crv: 'P-256', kty: 'EC', use: 'sig' }],
    });
    await expect(generateDevelopmentAuthKey(paths)).resolves.toEqual({
      created: false,
    });
  });

  it('mints a two-minute audience-bound automation token', async () => {
    const paths = await temporaryPaths();
    const now = new Date('2026-09-26T12:00:00.000Z');
    const audience = 'https://ops-dev.tofler.tech/';
    await generateDevelopmentAuthKey(paths);

    const token = await mintDevelopmentAuthToken({
      audience,
      now,
      privateKeyPath: paths.privateKey,
    });
    const jwks = await decodedJwks(paths.publicJwks);
    const verified = await jwtVerify(token, createLocalJWKSet(jwks), {
      algorithms: ['ES256'],
      audience,
      issuer: BACKOFFICE_DEVELOPMENT_AUTOMATION_ISSUER,
      currentDate: now,
    });

    expect(verified.payload).toMatchObject({
      iss: BACKOFFICE_DEVELOPMENT_AUTOMATION_ISSUER,
      sub: BACKOFFICE_DEVELOPMENT_AUTOMATION_SUBJECT,
      aud: audience,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(now.getTime() / 1000) + 120,
    });
    expect(verified.payload).not.toHaveProperty('email');
    expect(verified.protectedHeader).toMatchObject({
      alg: 'ES256',
      typ: 'JWT',
    });
  });

  it('rejects a group-readable private key without exposing its contents', async () => {
    const paths = await temporaryPaths();
    await generateDevelopmentAuthKey(paths);
    await chmod(paths.privateKey, 0o644);

    await expect(
      mintDevelopmentAuthToken({
        audience: 'https://ops-dev.tofler.tech/',
        privateKeyPath: paths.privateKey,
      }),
    ).rejects.toThrow(/mode-0600/);
  });
});
