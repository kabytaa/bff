import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  customerSigningKeyPaths,
  generateCustomerSigningKey,
  type CustomerSigningKeyPaths,
} from './customerSigningKey';

const directories: string[] = [];

async function paths(): Promise<CustomerSigningKeyPaths> {
  const directory = await mkdtemp(join(tmpdir(), 'bff-customer-signing-'));
  directories.push(directory);
  return {
    privateKey: join(directory, 'private.jwk'),
    publicJwks: join(directory, 'public.json'),
  };
}

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('customer context signing key', () => {
  it('keeps development and production key paths separate', () => {
    const development = customerSigningKeyPaths('/workspace', 'development');
    const production = customerSigningKeyPaths('/workspace', 'production');

    expect(development).not.toEqual(production);
    expect(production.privateKey).toContain('production-private.jwk');
    expect(production.publicJwks).toContain('production-jwks.json');
  });

  it('creates one matching ES256 pair with a protected private file', async () => {
    const output = await paths();
    expect(await generateCustomerSigningKey(output)).toEqual({ created: true });

    const privateJwk = JSON.parse(
      await readFile(output.privateKey, 'utf8'),
    ) as {
      d: string;
      kid: string;
      x: string;
      y: string;
    };
    const publicJwks = JSON.parse(
      await readFile(output.publicJwks, 'utf8'),
    ) as {
      keys: { d?: string; kid: string; x: string; y: string }[];
    };
    expect((await stat(output.privateKey)).mode & 0o777).toBe(0o600);
    expect(privateJwk.d).toBeTruthy();
    expect(publicJwks.keys).toHaveLength(1);
    expect(publicJwks.keys[0]).toMatchObject({
      kid: privateJwk.kid,
      x: privateJwk.x,
      y: privateJwk.y,
    });
    expect(publicJwks.keys[0]).not.toHaveProperty('d');
  });

  it('reuses a valid existing pair instead of rotating implicitly', async () => {
    const output = await paths();
    await generateCustomerSigningKey(output);
    const original = await readFile(output.privateKey, 'utf8');

    expect(await generateCustomerSigningKey(output)).toEqual({
      created: false,
    });
    expect(await readFile(output.privateKey, 'utf8')).toBe(original);
  });

  it('rejects an incomplete key setup', async () => {
    const output = await paths();
    await writeFile(output.privateKey, '{}', { mode: 0o600 });

    await expect(generateCustomerSigningKey(output)).rejects.toThrow(
      /incomplete/u,
    );
  });
});
